"""Generated media for the node canvas: a model list, a job table and a free mock provider.
Rows only grow: a finished (done or failed) row is never changed, and a new try is a new row.
Files live in <media>/<ideaId>/gen/<genId>.<ext>. Only signed-in staff reach these routes."""

import hashlib
import json
import os
import queue
import random
import secrets
import threading
import time
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse

import cutting
import storyboard

SCHEMA = (
    "CREATE TABLE IF NOT EXISTS generations (id TEXT PRIMARY KEY, idea_id TEXT NOT NULL, node_id TEXT NOT NULL, "
    "kind TEXT NOT NULL, model TEXT NOT NULL, inputs TEXT NOT NULL, input_hash TEXT NOT NULL, "
    "status TEXT NOT NULL, est_usd REAL NOT NULL, actual_usd REAL, file TEXT, source_url TEXT, error TEXT, "
    "created_at INTEGER NOT NULL, finished_at INTEGER)",
    "CREATE INDEX IF NOT EXISTS generations_by_node ON generations (idea_id, node_id)",
)

MODELS_FILE = Path(__file__).parent / "gen_models.json"
MOCK_DELAY_S = float(os.environ.get("MOCK_GEN_DELAY_S", 2))
RESTARTED = "The server restarted before this finished. Try again."
MOCK_FAILED = "Mock failure (the prompt asked for one)."
COLUMNS = ("id, idea_id, node_id, kind, model, inputs, input_hash, status, est_usd, actual_usd, file, "
           "source_url, error, created_at, finished_at")
MAX_PROMPT = 4000
CSP = {"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'"}
FILE_TYPES = {"svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "mp4": "video/mp4",
              "mp3": "audio/mpeg"}


def load_models() -> list[dict]:
    return json.loads(MODELS_FILE.read_text())["models"]


def estimate_usd(model: dict, duration: Optional[float]) -> float:
    price = model.get("price") or {}
    usd = float(price.get("usd", 0))
    return round(usd * (duration or 0) if price.get("per") == "second" else usd, 4)


def to_json(row) -> dict:
    (gid, idea_id, node_id, kind, model, inputs, _hash, status, est, actual, file, source_url, err,
     created, finished) = row
    url = source_url or (f"/api/ideas/{idea_id}/gen/{gid}/file" if file and status == "done" else None)
    return {"id": gid, "ideaId": idea_id, "nodeId": node_id, "kind": kind, "model": model,
            "inputs": json.loads(inputs), "status": status, "estUsd": est, "actualUsd": actual, "url": url,
            "error": err, "createdAt": created, "finishedAt": finished}


def insert_done(conn, idea_id: str, node_id: str, kind: str, model: str, *,
                file: Optional[str] = None, source_url: Optional[str] = None) -> dict:
    """A finished row made without a job: an upload, or an image brought over from an older plan."""
    now = int(time.time() * 1000)
    gid = secrets.token_urlsafe(9)
    row = (gid, idea_id, node_id, kind, model, "{}", "", "done", 0, None, file, source_url, None, now, now)
    conn.execute(f"INSERT INTO generations ({COLUMNS}) VALUES ({', '.join('?' * 15)})", row)
    return to_json(row)


def fail_unfinished(db) -> None:
    """After a restart no worker is running, so queued and running rows can never finish."""
    with db() as conn:
        conn.execute("UPDATE generations SET status = 'failed', error = ?, finished_at = ? "
                     "WHERE status IN ('queued', 'running')", (RESTARTED, int(time.time() * 1000)))


def gen_folder(media: Path, idea_id: str) -> Optional[Path]:
    """<media>/<idea_id>/gen, or None when the id would lead out of the media folder."""
    if not idea_id or idea_id.startswith("."):
        return None
    root = media.resolve()
    folder = (root / idea_id).resolve()
    return folder / "gen" if folder.parent == root else None


def input_hash(model: str, prompt: str, start, ref, duration) -> str:
    text = json.dumps({"model": model, "prompt": prompt, "startFrame": start, "reference": ref,
                       "duration": duration}, sort_keys=True)
    return hashlib.sha256(text.encode()).hexdigest()


class GenJobs:
    """One worker thread runs jobs in order."""

    def __init__(self, db, media_dir: Callable[[], Path]):
        self._db, self._media = db, media_dir
        self._q: queue.Queue = queue.Queue()
        threading.Thread(target=self._work, name="gen-worker", daemon=True).start()

    def submit(self, gen_id: str) -> None:
        self._q.put(gen_id)

    def _work(self) -> None:
        while True:
            gen_id = self._q.get()
            try:
                self.run(gen_id)
            except Exception as e:  # never let the worker thread die
                print(f"[gen] {gen_id} worker error: {e}", flush=True)

    def _finish(self, gen_id: str, status: str, **fields) -> None:
        names = "".join(f", {k} = ?" for k in fields)
        with self._db() as conn:
            conn.execute(f"UPDATE generations SET status = ?, finished_at = ?{names} WHERE id = ?",
                         (status, int(time.time() * 1000), *fields.values(), gen_id))

    def run(self, gen_id: str) -> None:
        """Make one row's media. Called by the worker thread, and directly by tests."""
        with self._db() as conn:
            row = conn.execute("SELECT idea_id, model, inputs FROM generations WHERE id = ? AND status = 'queued'",
                               (gen_id,)).fetchone()
            if row is None:
                return
            conn.execute("UPDATE generations SET status = 'running' WHERE id = ?", (gen_id,))
        idea_id, model_id, raw = row
        inputs = json.loads(raw)
        try:
            model = next(m for m in load_models() if m["id"] == model_id)
            folder = gen_folder(self._media(), idea_id)
            if folder is None:
                raise cutting.CutError("That plan doesn't exist.")
            if model["provider"] != "mock":
                raise cutting.CutError("This model isn't available yet.")
            name = self._mock(gen_id, model, inputs, folder)
            self._finish(gen_id, "done", file=name, actual_usd=0)
        except cutting.CutError as e:
            self._finish(gen_id, "failed", error=str(e))
        except Exception as e:
            print(f"[gen] {gen_id} failed: {e}", flush=True)
            self._finish(gen_id, "failed", error="The generation failed. Try again.")

    def _mock(self, gen_id: str, model: dict, inputs: dict, folder: Path) -> str:
        time.sleep(MOCK_DELAY_S)
        prompt = inputs.get("prompt") or ""
        rate = float(os.environ.get("MOCK_GEN_FAIL_RATE", 0) or 0)
        if "#fail" in prompt or (rate > 0 and random.random() < rate):
            raise cutting.CutError(MOCK_FAILED)
        folder.mkdir(parents=True, exist_ok=True)
        if model["kind"] == "image":
            name = f"{gen_id}.svg"
            (folder / name).write_text(storyboard.placeholder_svg("body", prompt, "", 0))
            return name
        name = f"{gen_id}.mp4"
        part = folder / f"{gen_id}.part.mp4"
        duration = inputs.get("duration") or model["durations"][0]
        r = cutting.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30",
                         "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", str(duration),
                         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-g", "30", "-keyint_min", "30",
                         "-sc_threshold", "0", "-c:a", "aac", "-b:a", "128k", "-shortest",
                         "-movflags", "+faststart", str(part)])
        if r.returncode != 0:
            part.unlink(missing_ok=True)
            raise cutting.CutError(f"The mock video failed: {r.stderr.strip()[-200:]}")
        os.replace(part, folder / name)
        return name


def error(status: int, message: str) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=status)


def make_router(db, load, media_dir: Callable[[], Path]) -> APIRouter:
    router = APIRouter()
    router.jobs = GenJobs(db, media_dir)  # server.py keeps it as gen_jobs

    def find_idea(idea_id: str):
        return next((i for i in load("ideas") or [] if i["id"] == idea_id), None)

    def one(idea_id: str, gen_id: str):
        with db() as conn:
            return conn.execute(f"SELECT {COLUMNS} FROM generations WHERE id = ? AND idea_id = ?",
                                (gen_id, idea_id)).fetchone()

    @router.get("/api/gen/models")
    def models():
        return {"models": load_models()}

    @router.post("/api/ideas/{idea_id}/gen")
    async def create(idea_id: str, request: Request):
        try:
            body = await request.json()
        except ValueError:
            body = None
        if not isinstance(body, dict):
            return error(422, "Send the node, the model and a prompt.")
        found = find_idea(idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if found["status"] != "approved":
            return error(409, "Only an approved plan can generate.")
        node_id, prompt = body.get("nodeId"), body.get("prompt", "")
        start, ref, duration = body.get("startFrame"), body.get("reference"), body.get("duration")
        if not isinstance(node_id, str) or not node_id or not isinstance(prompt, str) or len(prompt) > MAX_PROMPT:
            return error(422, "Send the node, the model and a prompt.")
        model = next((m for m in load_models() if m["id"] == body.get("model")), None)
        if model is None:
            return error(422, "That model doesn't exist.")
        if model["provider"] != "mock":
            return error(422, "This model isn't available yet.")
        if duration is not None:
            if model["kind"] != "video" or duration not in model.get("durations", []):
                return error(422, "That duration isn't available for this model.")
        elif model["kind"] == "video":
            duration = model["durations"][0]
        for ref_id in (start, ref):
            if ref_id is not None and (not isinstance(ref_id, str) or one(idea_id, ref_id) is None):
                return error(422, "An input image must be one generated for this plan.")
        now = int(time.time() * 1000)
        gid = secrets.token_urlsafe(9)
        inputs = {"prompt": prompt, "startFrame": start, "reference": ref, "duration": duration}
        row = (gid, idea_id, node_id, model["kind"], model["id"], json.dumps(inputs),
               input_hash(model["id"], prompt, start, ref, duration), "queued", estimate_usd(model, duration),
               None, None, None, None, now, None)
        with db() as conn:
            conn.execute(f"INSERT INTO generations ({COLUMNS}) VALUES ({', '.join('?' * 15)})", row)
        out = to_json(row)
        router.jobs.submit(gid)
        return JSONResponse(out, status_code=201)

    @router.get("/api/ideas/{idea_id}/gen")
    def listing(idea_id: str):
        with db() as conn:
            rows = conn.execute(f"SELECT {COLUMNS} FROM generations WHERE idea_id = ? ORDER BY created_at, rowid",
                                (idea_id,)).fetchall()
        return [to_json(r) for r in rows]

    @router.get("/api/ideas/{idea_id}/gen/{gen_id}")
    def get_one(idea_id: str, gen_id: str):
        row = one(idea_id, gen_id)
        return to_json(row) if row else error(404, "That generation doesn't exist.")

    @router.get("/api/ideas/{idea_id}/gen/{gen_id}/file")
    def file(idea_id: str, gen_id: str):
        folder = gen_folder(media_dir(), idea_id)
        row = one(idea_id, gen_id)
        name = row[10] if row else None
        path = folder / name if folder and name else None
        if path is None or row[7] != "done" or not path.is_file():
            return error(404, "That file doesn't exist.")
        ext = path.suffix.lstrip(".")
        return FileResponse(path, media_type=FILE_TYPES.get(ext, "application/octet-stream"),
                            headers=CSP if ext == "svg" else None)

    return router

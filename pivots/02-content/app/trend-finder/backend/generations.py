"""Generated media for the node canvas: a model list, a job table and a free mock provider.
Rows only grow: a finished (done or failed) row is never changed, and a new try is a new row.
Files live in <media>/<ideaId>/gen/<genId>.<ext>. Only signed-in staff reach these routes."""

import hashlib
import json
import os
import queue
import secrets
import threading
import time
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse

import cutting
import gen_providers

SCHEMA = (
    "CREATE TABLE IF NOT EXISTS generations (id TEXT PRIMARY KEY, idea_id TEXT NOT NULL, node_id TEXT NOT NULL, "
    "kind TEXT NOT NULL, model TEXT NOT NULL, inputs TEXT NOT NULL, input_hash TEXT NOT NULL, "
    "status TEXT NOT NULL, est_usd REAL NOT NULL, actual_usd REAL, file TEXT, source_url TEXT, error TEXT, "
    "created_at INTEGER NOT NULL, finished_at INTEGER, provider_request_id TEXT, after TEXT)",
    "CREATE INDEX IF NOT EXISTS generations_by_node ON generations (idea_id, node_id)",
)

MODELS_FILE = Path(__file__).parent / "gen_models.json"
RESTARTED = "The server restarted before this finished. Try again."
# status: waiting (for an upstream row), queued, running, done, failed, unknown (the provider may have charged)
COLUMNS = ("id, idea_id, node_id, kind, model, inputs, input_hash, status, est_usd, actual_usd, file, "
           "source_url, error, created_at, finished_at, after")
NCOLUMNS = COLUMNS.count(",") + 1
GEN_POLL_S = float(os.environ.get("GEN_POLL_S", 5))
MOCK_POLL_S = 0.2
GEN_TIMEOUT_S = {"image": 180, "video": 900}
LOST = "The provider didn't answer in time. It may have charged."
FILE_LOST = "The model finished but its file couldn't be saved. It may have charged."
FAILED = "The generation failed. Try again."
MAX_PROMPT = 4000
CSP = {"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'"}
NODE_FOR_KIND = {"image": "storyboard", "video": "video"}  # the canvas node type each model kind fills
FILE_TYPES = {"svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "webp": "image/webp",
              "mp4": "video/mp4", "mp3": "audio/mpeg"}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
UPLOAD_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
NOT_IMAGE = "Upload a PNG, JPEG or WebP image."
UPLOAD_LIMIT = "The image is over the 20 MB limit."


def image_header_ok(ext: str, head: bytes) -> bool:
    if ext == "png":
        return head.startswith(b"\x89PNG")
    if ext == "jpg":
        return head.startswith(b"\xff\xd8\xff")
    return head[:4] == b"RIFF" and head[8:12] == b"WEBP"


KEY_ENV = {"fal": "FAL_KEY", "gemini": "GEMINI_API_KEY"}


def migrate(conn) -> None:
    have = {r[1] for r in conn.execute("PRAGMA table_info(generations)")}
    for column in ("provider_request_id", "after"):
        if column not in have:
            conn.execute(f"ALTER TABLE generations ADD COLUMN {column} TEXT")


def load_models() -> list[dict]:
    """Every model, retired ones too, so older rows can still be looked up."""
    return json.loads(MODELS_FILE.read_text())["models"]


def is_available(model: dict) -> bool:
    provider = model.get("provider")
    return provider == "mock" or bool(os.environ.get(KEY_ENV.get(provider, ""), ""))


def menu_models() -> list[dict]:
    """The models a new generation can pick: retired ones removed, `available` set from the provider's key."""
    return [{**m, "available": is_available(m)} for m in load_models() if not m.get("retired")]


def validate_models(models: list[dict]) -> list[str]:
    errors, seen = [], set()
    for m in models:
        mid = m.get("id")
        if mid in seen:
            errors.append(f"{mid}: duplicate id")
        seen.add(mid)
        if m.get("provider") not in ("mock", "fal", "gemini"):
            errors.append(f"{mid}: unknown provider {m.get('provider')!r}")
        if m.get("kind") == "video" and "9:16" not in m.get("aspects", []):
            errors.append(f"{mid}: video model without 9:16")
    return errors


def estimate_usd(model: dict, duration: Optional[float]) -> float:
    price = model.get("price") or {}
    usd = float(price.get("usd", 0))
    return round(usd * (duration or 0) if price.get("per") == "second" else usd, 4)


def to_json(row) -> dict:
    (gid, idea_id, node_id, kind, model, inputs, _hash, status, est, actual, file, source_url, err,
     created, finished, after) = row
    url = source_url or (f"/api/ideas/{idea_id}/gen/{gid}/file" if file and status == "done" else None)
    return {"id": gid, "ideaId": idea_id, "nodeId": node_id, "kind": kind, "model": model,
            "inputs": json.loads(inputs), "status": status, "estUsd": est, "actualUsd": actual, "url": url,
            "error": err, "createdAt": created, "finishedAt": finished, "after": after}


def insert_done(conn, idea_id: str, node_id: str, kind: str, model: str, *,
                file: Optional[str] = None, source_url: Optional[str] = None) -> dict:
    """A finished row made without a job: an upload, or an image brought over from an older plan."""
    now = int(time.time() * 1000)
    gid = secrets.token_urlsafe(9)
    row = (gid, idea_id, node_id, kind, model, "{}", "", "done", 0, None, file, source_url, None, now, now, None)
    conn.execute(f"INSERT INTO generations ({COLUMNS}) VALUES ({', '.join('?' * NCOLUMNS)})", row)
    return to_json(row)


def recover(db, jobs) -> None:
    """After a restart no worker is running. A queued row, or a running one that never called submit, can never
    finish: fail it and refund. A running row that was inside submit may have been charged: unknown, no refund.
    A running row with a request id goes back to its worker to keep polling."""
    with db() as conn:
        rows = conn.execute("SELECT id, kind, est_usd, status, provider_request_id FROM generations "
                            "WHERE status IN ('queued', 'running')").fetchall()
    now = int(time.time() * 1000)
    for gid, kind, est, status, request_id in rows:
        if status == "running" and request_id and request_id != SUBMITTING:
            jobs.submit(gid)
            continue
        lost = request_id == SUBMITTING
        with db() as conn:
            changed = conn.execute("UPDATE generations SET status = ?, error = ?, finished_at = ? "
                                   "WHERE id = ? AND status IN ('queued', 'running')",
                                   ("unknown" if lost else "failed", LOST if lost else RESTARTED, now, gid)).rowcount
        if changed and not lost:
            jobs.refund(kind, est)


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


SUBMITTING = "!submitting"  # provider_request_id while adapter.submit runs: a restart now must not refund


class GenJobs:
    """One worker thread per kind (images, videos) runs jobs in order, so a long video poll never holds up
    images. `refund(kind, usd)` gives a failed job's estimate back."""

    def __init__(self, db, media_dir: Callable[[], Path], refund: Callable[[str, float], None] = lambda k, u: None):
        self._db, self._media, self.refund = db, media_dir, refund
        self._queues = {kind: queue.Queue() for kind in ("image", "video")}
        for kind, q in self._queues.items():
            threading.Thread(target=self._work, args=(q,), name=f"gen-worker-{kind}", daemon=True).start()

    def submit(self, gen_id: str) -> None:
        with self._db() as conn:
            row = conn.execute("SELECT kind FROM generations WHERE id = ?", (gen_id,)).fetchone()
        self._queues[row[0] if row and row[0] in self._queues else "image"].put(gen_id)

    def _work(self, q: queue.Queue) -> None:
        while True:
            gen_id = q.get()
            try:
                self.run(gen_id)
            except Exception as e:  # never let the worker thread die
                print(f"[gen] {gen_id} worker error: {e}", flush=True)

    def _finish(self, gen_id: str, status: str, **fields) -> bool:
        """Close a running row; True when this call did it (so only one caller refunds)."""
        names = "".join(f", {k} = ?" for k in fields)
        with self._db() as conn:
            return conn.execute(f"UPDATE generations SET status = ?, finished_at = ?{names} "
                                "WHERE id = ? AND status = 'running'",
                                (status, int(time.time() * 1000), *fields.values(), gen_id)).rowcount > 0

    def _fail(self, gen_id: str, kind: str, est: float, message: str, refund: bool) -> None:
        if self._finish(gen_id, "failed", error=message) and refund:
            self.refund(kind, est)

    def _input_path(self, folder: Path, idea_id: str, ref_id) -> Optional[Path]:
        if not ref_id:
            return None
        with self._db() as conn:
            row = conn.execute("SELECT file FROM generations WHERE id = ? AND idea_id = ?",
                               (ref_id, idea_id)).fetchone()
        path = folder / row[0] if row and row[0] else None
        if path is None or not path.is_file():
            raise cutting.CutError("An input image is missing.")
        return path

    def run(self, gen_id: str) -> None:
        """Make one row's media. Called by the worker thread, and directly by tests. A queued row is claimed and
        submitted; a running row with a request id (resumed after a restart) is only polled.
        Money: once submit has been called the provider may have charged, so from then on only an explicit
        `Poll(failed)` refunds; losing track of the request makes the row `unknown`."""
        with self._db() as conn:
            row = conn.execute("SELECT idea_id, model, inputs, kind, est_usd, status, provider_request_id "
                               "FROM generations WHERE id = ?", (gen_id,)).fetchone()
            if row is None:
                return
            resumed = row[5] == "running" and bool(row[6]) and row[6] != SUBMITTING
            if row[5] != "queued" and not resumed:
                return
            if row[5] == "queued":
                conn.execute("UPDATE generations SET status = 'running' WHERE id = ?", (gen_id,))
        idea_id, model_id, raw, kind, est, _status, request_id = row
        phase = "poll" if resumed else "prepare"  # prepare: nothing sent; submit: may be sent; poll: sent
        try:
            model = next(m for m in load_models() if m["id"] == model_id)
            folder = gen_folder(self._media(), idea_id)
            inputs = json.loads(raw)
            if resumed:  # polling needs only the request id, not the input files
                job = gen_providers.Job(model, inputs.get("prompt") or "", None, [], inputs.get("duration"),
                                        scratch=folder)
            else:
                if folder is None:
                    raise cutting.CutError("That plan doesn't exist.")
                ref = self._input_path(folder, idea_id, inputs.get("reference"))
                start = self._input_path(folder, idea_id, inputs.get("startFrame"))
                job = gen_providers.Job(model, inputs.get("prompt") or "", start, [ref] if ref else [],
                                        inputs.get("duration"), scratch=folder)
            adapter = gen_providers.adapter_for(model["provider"])
            if not resumed:
                self._set_request_id(gen_id, SUBMITTING)
                phase = "submit"
                request_id = adapter.submit(job)
                phase = "poll"
                self._set_request_id(gen_id, request_id)
            result = self._poll(adapter, job, request_id, kind, model["provider"])
            if result is None:
                self._finish(gen_id, "unknown", error=LOST)  # no refund: the provider may have charged
                return
            if result.state == "failed":
                self._fail(gen_id, kind, est, result.error or FAILED, refund=True)
                return
            try:
                if folder is None:
                    raise OSError("no media folder")
                name = self._save(gen_id, folder, result)
            except OSError as e:  # the provider finished; only our disk failed
                print(f"[gen] {gen_id} could not save the file: {e}", flush=True)
                self._fail(gen_id, kind, est, FILE_LOST, refund=False)
                return
            self._finish(gen_id, "done", file=name, actual_usd=est)
        except gen_providers.ResultLost as e:
            print(f"[gen] {gen_id} result lost: {e}", flush=True)
            self._finish(gen_id, "unknown", error=LOST)
        except gen_providers.FileUnusable as e:
            print(f"[gen] {gen_id} file unusable: {e}", flush=True)
            self._fail(gen_id, kind, est, FILE_LOST, refund=False)
        except (cutting.CutError, gen_providers.ProviderError) as e:
            if phase == "poll":  # a request was sent and we can't say the provider failed it
                print(f"[gen] {gen_id} error after the request was sent: {e}", flush=True)
                self._finish(gen_id, "unknown", error=LOST)
            else:  # nothing usable was sent, or the provider refused it
                self._fail(gen_id, kind, est, str(e), refund=True)
        except Exception as e:
            print(f"[gen] {gen_id} failed: {e}", flush=True)
            if phase == "prepare":
                self._fail(gen_id, kind, est, FAILED, refund=True)
            else:  # we lost track of a request that may have been charged
                self._finish(gen_id, "unknown", error=LOST)

    def _set_request_id(self, gen_id: str, request_id: str) -> None:
        with self._db() as conn:
            conn.execute("UPDATE generations SET provider_request_id = ? WHERE id = ?", (request_id, gen_id))

    def _poll(self, adapter, job, request_id: str, kind: str, provider: str):
        """Poll until done or failed; None when GEN_TIMEOUT_S passes first."""
        interval = MOCK_POLL_S if provider == "mock" else GEN_POLL_S
        deadline = time.monotonic() + GEN_TIMEOUT_S[kind]
        while True:
            result = adapter.poll(job, request_id)
            if result.state != "running":
                return result
            if time.monotonic() >= deadline:
                return None
            time.sleep(interval)

    @staticmethod
    def _save(gen_id: str, folder: Path, result) -> str:
        folder.mkdir(parents=True, exist_ok=True)
        name = f"{gen_id}.{result.ext}"
        part = folder / f"{gen_id}.part.{result.ext}"
        try:
            part.write_bytes(result.data)
            os.replace(part, folder / name)
        finally:
            part.unlink(missing_ok=True)
        return name


def error(status: int, message: str) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=status)


def make_router(db, load, media_dir: Callable[[], Path], budget=lambda kind, usd: None, refund=lambda kind, usd: None,
                remaining=lambda: {"image": {"spent": 0, "cap": 0}, "video": {"spent": 0, "cap": 0}}) -> APIRouter:
    router = APIRouter()
    router.budget, router.refund, router.remaining = budget, refund, remaining  # used by the generate routes
    router.jobs = GenJobs(db, media_dir, refund)  # server.py keeps it as gen_jobs

    def find_idea(idea_id: str):
        return next((i for i in load("ideas") or [] if i["id"] == idea_id), None)

    def one(idea_id: str, gen_id: str):
        with db() as conn:
            return conn.execute(f"SELECT {COLUMNS} FROM generations WHERE id = ? AND idea_id = ?",
                                (gen_id, idea_id)).fetchone()

    @router.get("/api/gen/models")
    def models():
        return {"models": menu_models()}

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
        if model is None or model.get("retired"):
            return error(422, "That model doesn't exist.")
        if not is_available(model):
            return error(422, "This model isn't set up yet.")
        with db() as conn:
            canvas_row = conn.execute("SELECT doc FROM canvases WHERE idea_id = ?", (idea_id,)).fetchone()
        nodes = json.loads(canvas_row[0])["nodes"] if canvas_row else []
        target = next((n for n in nodes if n.get("id") == node_id), None)
        if target is None:
            return error(422, "That node isn't on this plan's canvas.")
        if NODE_FOR_KIND.get(model["kind"]) != target.get("type"):
            return error(422, "That model can't make this kind of node.")
        if duration is not None:
            if model["kind"] != "video" or duration not in model.get("durations", []):
                return error(422, "That duration isn't available for this model.")
        elif model["kind"] == "video":
            duration = model["durations"][0]
        for ref_id in (start, ref):
            if ref_id is None:
                continue
            source = one(idea_id, ref_id) if isinstance(ref_id, str) else None
            if source is None or source[3] != "image" or source[7] != "done":  # kind, status columns
                return error(422, "An input image must be a finished image generated for this plan.")
        for field, given, what in (("startFrame", start, "a start frame"), ("reference", ref, "a reference image")):
            rule = (model.get("inputs") or {}).get(field, "none")
            if rule == "required" and given is None:
                return error(422, f"This model needs {what}.")
            if rule == "none" and given is not None:
                return error(422, f"This model doesn't take {what}.")
        est = estimate_usd(model, duration)
        blocked = router.budget(model["kind"], est)  # spends the estimate; a failed job gives it back
        if blocked is not None:
            return blocked
        now = int(time.time() * 1000)
        gid = secrets.token_urlsafe(9)
        inputs = {"prompt": prompt, "startFrame": start, "reference": ref, "duration": duration}
        row = (gid, idea_id, node_id, model["kind"], model["id"], json.dumps(inputs),
               input_hash(model["id"], prompt, start, ref, duration), "queued", est,
               None, None, None, None, now, None, None)
        try:
            with db() as conn:
                conn.execute(f"INSERT INTO generations ({COLUMNS}) VALUES ({', '.join('?' * NCOLUMNS)})", row)
        except Exception:
            router.refund(model["kind"], est)
            raise
        out = to_json(row)
        router.jobs.submit(gid)
        return JSONResponse(out, status_code=201)

    @router.post("/api/ideas/{idea_id}/gen/upload")
    async def upload(idea_id: str, request: Request, nodeId: str = ""):
        found = find_idea(idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if found["status"] != "approved":
            return error(409, "Only an approved plan can take uploads.")
        with db() as conn:
            canvas_row = conn.execute("SELECT doc FROM canvases WHERE idea_id = ?", (idea_id,)).fetchone()
        nodes = json.loads(canvas_row[0])["nodes"] if canvas_row else []
        if not any(n.get("id") == nodeId and n.get("type") == "upload" for n in nodes):
            return error(422, "That node isn't an upload node on this plan's canvas.")
        ext = UPLOAD_TYPES.get(request.headers.get("content-type", "").split(";")[0].strip().lower())
        if ext is None:
            return error(415, NOT_IMAGE)
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > MAX_UPLOAD_BYTES:
            return error(413, UPLOAD_LIMIT)
        folder = gen_folder(media_dir(), idea_id)
        if folder is None:
            return error(404, "That plan doesn't exist.")
        folder.mkdir(parents=True, exist_ok=True)
        name = f"up_{secrets.token_urlsafe(9)}.{ext}"
        part = folder / f".{name}.part"
        size = 0
        try:
            with part.open("wb") as f:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > MAX_UPLOAD_BYTES:
                        break
                    f.write(chunk)
            if size > MAX_UPLOAD_BYTES:
                part.unlink(missing_ok=True)
                return error(413, UPLOAD_LIMIT)
            with part.open("rb") as f:
                head = f.read(12)
            if not image_header_ok(ext, head):
                part.unlink(missing_ok=True)
                return error(415, NOT_IMAGE)
            os.replace(part, folder / name)
        except BaseException:
            part.unlink(missing_ok=True)
            raise
        with db() as conn:
            return insert_done(conn, idea_id, nodeId, "image", "upload", file=name)

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

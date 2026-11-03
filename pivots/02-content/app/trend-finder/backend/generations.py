"""Generated media for the node canvas: a model list, a job table and three providers (mock, fal, Gemini).
Rows only grow: a row that has finished (done, failed or unknown) is never changed, and a new try is a new row.
Files live in <media>/<ideaId>/gen/<genId>.<ext>. Only signed-in staff reach these routes."""

import hashlib
import json
import os
import queue
import secrets
import shutil
import threading
import time
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, UnidentifiedImageError

import cutting
import gen_providers
import subtitles

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
GEN_TIMEOUT_S = {"image": 180, "video": 900, "voice": 120}
LOST = "The provider didn't answer in time. It may have charged."
FILE_LOST = "The model finished but its file couldn't be saved. It may have charged."
FAILED = "The generation failed. Try again."
START_FRAME_LOST = "The start frame wasn't made, so the video didn't run."
BAD_REFS = "The reference images aren't valid."
PROMPT_TOO_LONG = "The prompt and the kit notes are too long together. Shorten the prompt."
PENDING = "!pending"  # a chained video's startFrame in validation: the image isn't made yet
MAX_PROMPT = 4000
CSP = {"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'"}
NODE_FOR_KIND = {"image": "storyboard", "video": "video", "voice": None}  # the canvas node type each model kind fills; voice has none
VOICE_NODE = "editor-voice"  # the node_id of every voiceover row: it belongs to the editor, not the canvas
MAX_VOICE_CHARS = 1000
MAX_VOICE_UNITS = 480  # width units (a CJK character is 2): the mock speaks 0.25 s per unit, so 120 s at most
BAD_VOICE_TEXT = "Type the words to say: 1 to 1000 characters, and short enough for 2 minutes of speech."
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


KEY_ENV = {"fal": "FAL_KEY", "gemini": "GEMINI_API_KEY", "elevenlabs": "ELEVENLABS_API_KEY"}


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
    if provider == "elevenlabs" and not gen_providers.ElevenLabsAdapter.voice_id(model):
        return False  # the voice comes from the model entry or ELEVENLABS_VOICE_ID
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
        if m.get("provider") not in ("mock", "fal", "gemini", "elevenlabs"):
            errors.append(f"{mid}: unknown provider {m.get('provider')!r}")
        if m.get("kind") == "video" and "9:16" not in m.get("aspects", []):
            errors.append(f"{mid}: video model without 9:16")
        if (m.get("price") or {}).get("perRefUsd") is not None:
            errors.append(f"{mid}: perRefUsd is not supported yet")
    return errors


def estimate_usd(model: dict, duration: Optional[float], chars: int = 0) -> float:
    price = model.get("price") or {}
    usd = float(price.get("usd", 0))
    if price.get("per") == "1k_chars":
        return round(usd * chars / 1000, 4)
    return round(usd * (duration or 0) if price.get("per") == "second" else usd, 4)


def voice_text_ok(text) -> bool:
    return isinstance(text, str) and 1 <= len(text) <= MAX_VOICE_CHARS and bool(text.strip()) \
        and subtitles.width_units(text) <= MAX_VOICE_UNITS


def enqueue(conn, idea_id: str, node_id: str, kind: str, model: str, inputs: dict, est: float) -> dict:
    """Insert a queued row and return it. The caller has already spent `est` (and refunds it if this raises),
    and starts the job afterwards."""
    now = int(time.time() * 1000)
    gid = secrets.token_urlsafe(9)
    row = (gid, idea_id, node_id, kind, model, json.dumps(inputs),
           input_hash(model, inputs.get("sentPrompt") or inputs.get("prompt"), inputs.get("startFrame"),
                      inputs.get("references") or [], inputs.get("duration")), "queued", est, None, None, None, None, now, None, None)
    conn.execute(f"INSERT INTO generations ({COLUMNS}) VALUES ({', '.join('?' * NCOLUMNS)})", row)
    return to_json(row)


def stored_inputs(raw: str) -> dict:
    return read_inputs(json.loads(raw))


def read_inputs(inputs: dict) -> dict:
    """A row's inputs. A row from before references existed has one `reference`: it reads as a list of one."""
    legacy = inputs.pop("reference", None)
    if legacy and "references" not in inputs:
        inputs["references"] = [{"source": "gen", "genId": legacy}]
    return inputs


def to_json(row) -> dict:
    (gid, idea_id, node_id, kind, model, inputs, _hash, status, est, actual, file, source_url, err,
     created, finished, after) = row
    url = source_url or (f"/api/ideas/{idea_id}/gen/{gid}/file" if file and status == "done" else None)
    return {"id": gid, "ideaId": idea_id, "nodeId": node_id, "kind": kind, "model": model,
            "inputs": stored_inputs(inputs), "status": status, "estUsd": est, "actualUsd": actual, "url": url,
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
        if changed:
            jobs.release(gid, "unknown" if lost else "failed")
    with db() as conn:  # a waiting row whose upstream already ended (or never existed) can be settled now
        waiting = conn.execute("SELECT DISTINCT g.after, u.status FROM generations g "
                               "LEFT JOIN generations u ON u.id = g.after "
                               "WHERE g.status = 'waiting'").fetchall()
    for upstream, status in waiting:
        if upstream is None:  # waits for nothing: it can never start
            jobs.fail_orphans()
        elif status in (None, "done", "failed", "unknown"):
            jobs.release(upstream, status or "failed")


def gen_folder(media: Path, idea_id: str) -> Optional[Path]:
    """<media>/<idea_id>/gen, or None when the id would lead out of the media folder."""
    if not idea_id or idea_id.startswith("."):
        return None
    root = media.resolve()
    folder = (root / idea_id).resolve()
    return folder / "gen" if folder.parent == root else None


def with_prefix(kit, prompt: str, items: list) -> Optional[str]:
    """The prompt with the kit prefix in front. Too long: cut each note to 60 characters, then drop the notes;
    None when it still doesn't fit."""
    for cut in (None, 60, 0):
        shown = items if cut is None else [(i.model_copy(update={"note": i.note[:cut]}), n) for i, n in items]
        text = kit.kit_prefix(shown) + prompt
        if len(text) <= MAX_PROMPT:
            return text
    return None


KIT_MAX_EDGE = 1536  # long edge of a kit image sent to a provider: phone photos would blow the request size


def _write_shrunk(source: Path, part: Path) -> None:
    """Write `source` to `part`, shrunk to KIT_MAX_EDGE on the long edge (never enlarged, format and alpha kept).
    A file Pillow can't read, or one that is small enough already, is copied byte for byte."""
    try:
        with Image.open(source) as im:
            fmt = im.format
            if max(im.size) <= KIT_MAX_EDGE or fmt not in ("JPEG", "PNG", "WEBP"):
                raise ValueError("copy as is")
            im.thumbnail((KIT_MAX_EDGE, KIT_MAX_EDGE))
            if fmt == "JPEG" and im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            im.save(part, format=fmt, **({"quality": 90} if fmt != "PNG" else {}))
    except (ValueError, UnidentifiedImageError, Image.DecompressionBombError):
        shutil.copyfile(source, part)


def copy_kit_images(kit, media: Path, client_id: str, idea_id: str, stored: list) -> None:
    """Copy the kit images a generation uses into the plan's gen folder, so deleting the kit item later leaves
    this generation (and a re-run of it) its own files. Raises OSError when a file is gone."""
    source, folder = kit.kit_folder(media, client_id), gen_folder(media, idea_id)
    for ref in stored:
        if ref["source"] != "kit" or "file" not in ref:  # a text-only kit ref has no file
            continue
        folder.mkdir(parents=True, exist_ok=True)
        part = folder / f".{ref['file']}.{secrets.token_hex(4)}.part"  # unique: copies may run at once
        try:
            _write_shrunk(source / ref["image"], part)
            os.replace(part, folder / ref["file"])
        finally:
            part.unlink(missing_ok=True)


def input_hash(model: str, prompt: str, start, refs: list, duration) -> str:
    """`refs` are sorted first, so the order they were picked in doesn't change the hash."""
    keys = ("source", "genId", "itemId", "image")
    ordered = sorted(json.dumps({k: r[k] for k in keys if k in r}, sort_keys=True) for r in refs or [])
    text = json.dumps({"model": model, "prompt": prompt, "startFrame": start, "references": ordered,
                       "duration": duration}, sort_keys=True)
    return hashlib.sha256(text.encode()).hexdigest()


SUBMITTING = "!submitting"  # provider_request_id while adapter.submit runs: a restart now must not refund


class GenJobs:
    """One worker thread per kind (images, videos, voices) runs jobs in order, so a long video poll never holds up
    images. `refund(kind, usd)` gives a failed job's estimate back."""

    def __init__(self, db, media_dir: Callable[[], Path], refund: Callable[[str, float], None] = lambda k, u: None):
        self._db, self._media, self.refund = db, media_dir, refund
        self._queues = {kind: queue.Queue() for kind in ("image", "video", "voice")}
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
            closed = conn.execute(f"UPDATE generations SET status = ?, finished_at = ?{names} "
                                  "WHERE id = ? AND status = 'running'",
                                  (status, int(time.time() * 1000), *fields.values(), gen_id)).rowcount > 0
        if closed:
            self.release(gen_id, status)
        return closed

    def fail_orphans(self) -> None:
        """Waiting rows with no upstream id were never sent: fail them and give the estimate back."""
        with self._db() as conn:
            rows = conn.execute("SELECT id, kind, est_usd FROM generations "
                                "WHERE status = 'waiting' AND after IS NULL").fetchall()
        for gid, kind, est in rows:
            with self._db() as conn:
                moved = conn.execute("UPDATE generations SET status = 'failed', error = ?, finished_at = ? "
                                     "WHERE id = ? AND status = 'waiting'",
                                     (START_FRAME_LOST, int(time.time() * 1000), gid)).rowcount > 0
            if moved:
                self.refund(kind, est)

    def release(self, upstream_id: str, status: str) -> None:
        """A row has closed: start the waiting rows that follow it (done), or fail them and give their estimate
        back (failed, unknown; their request was never sent). Only the call that moves a row out of `waiting` acts."""
        with self._db() as conn:
            rows = conn.execute("SELECT id, kind, est_usd FROM generations WHERE after = ? AND status = 'waiting'",
                                (upstream_id,)).fetchall()
        for gid, kind, est in rows:
            ok = status == "done"
            with self._db() as conn:
                moved = conn.execute("UPDATE generations SET status = ?, error = ?, finished_at = ? "
                                     "WHERE id = ? AND status = 'waiting'",
                                     ("queued" if ok else "failed", None if ok else START_FRAME_LOST,
                                      None if ok else int(time.time() * 1000), gid)).rowcount > 0
            if not moved:
                continue
            if ok:
                self.submit(gid)
            else:
                self.refund(kind, est)
                self.release(gid, "failed")

    def _fail(self, gen_id: str, kind: str, est: float, message: str, refund: bool) -> None:
        if self._finish(gen_id, "failed", error=message) and refund:
            self.refund(kind, est)

    def _ref_paths(self, folder: Path, idea_id: str, inputs: dict) -> list[Path]:
        """The files of a row's reference images, in order. A kit image was copied into the gen folder."""
        paths = []
        for ref in read_inputs(dict(inputs)).get("references") or []:
            if ref.get("source") == "kit" and "image" not in ref:
                continue  # text-only: it only adds a line to the prompt
            if ref.get("source") == "kit":
                name = ref.get("file") or ""
                path = folder / name if name and Path(name).name == name else None
                if path is None or not path.is_file():
                    raise cutting.CutError("An input image is missing.")
            else:
                path = self._input_path(folder, idea_id, ref.get("genId"))
            if path is not None:
                paths.append(path)
        return paths

    def _input_path(self, folder: Path, idea_id: str, ref_id) -> Optional[Path]:
        if not ref_id:
            return None
        with self._db() as conn:
            row = conn.execute("SELECT file, source_url FROM generations WHERE id = ? AND idea_id = ?",
                               (ref_id, idea_id)).fetchone()
        path = None
        if row and row[0]:
            path = folder / row[0]
        elif row and row[1]:  # an image imported from the Plan page lives in the plan's frames folder
            path = self._frame_path(folder.parent / "frames", idea_id, row[1])
        if path is None or not path.is_file():
            raise cutting.CutError("An input image is missing.")
        return path

    @staticmethod
    def _frame_path(frames: Path, idea_id: str, source_url: str) -> Optional[Path]:
        import storyboard  # lazily: storyboard imports this module
        prefix = f"/api/ideas/{idea_id}/frames/"
        name = source_url[len(prefix):] if source_url.startswith(prefix) else ""
        if not storyboard.FRAME_NAME.match(name):
            return None
        path = (frames / name).resolve()
        return path if path.parent == frames.resolve() else None

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
            if row[5] == "queued":  # claim it; another caller may have taken it since the SELECT
                claimed = conn.execute("UPDATE generations SET status = 'running' WHERE id = ? AND status = 'queued'",
                                       (gen_id,)).rowcount
                if claimed == 0:
                    return
        idea_id, model_id, raw, kind, est, _status, request_id = row
        phase = "poll" if resumed else "prepare"  # prepare: nothing sent; submit: may be sent; poll: sent
        try:
            model = next(m for m in load_models() if m["id"] == model_id)
            folder = gen_folder(self._media(), idea_id)
            inputs = json.loads(raw)
            if resumed:  # polling needs only the request id, not the input files
                job = gen_providers.Job(model, inputs.get("sentPrompt") or inputs.get("prompt") or "", None, [],
                                        inputs.get("duration"), scratch=folder)
            else:
                if folder is None:
                    raise cutting.CutError("That plan doesn't exist.")
                refs = self._ref_paths(folder, idea_id, inputs)
                start = self._input_path(folder, idea_id, inputs.get("startFrame"))
                job = gen_providers.Job(model, inputs.get("sentPrompt") or inputs.get("prompt") or "", start, refs,
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
                remaining=lambda: {"image": {"spent": 0, "cap": 0}, "video": {"spent": 0, "cap": 0},
                                   "voice": {"spent": 0, "cap": 0}}) -> APIRouter:
    import kit  # here, not at the top: kit imports this module

    router = APIRouter()
    router.budget, router.refund, router.remaining = budget, refund, remaining  # used by the generate routes
    router.jobs = GenJobs(db, media_dir, refund)  # server.py keeps it as gen_jobs

    def find_idea(idea_id: str):
        return next((i for i in load("ideas") or [] if i["id"] == idea_id), None)

    def one(idea_id: str, gen_id: str):
        with db() as conn:
            return conn.execute(f"SELECT {COLUMNS} FROM generations WHERE id = ? AND idea_id = ?",
                                (gen_id, idea_id)).fetchone()

    router.check = None  # set below, once defined: the editor's TTS route runs the same rules

    @router.get("/api/gen/models")
    def models():
        return {"models": menu_models()}

    def check_ref(idea_id: str, ref):
        """The error for one reference image, or None when it can be used."""
        if not isinstance(ref, dict):
            return error(422, BAD_REFS)
        if ref.get("source") == "gen":
            gen_id = ref.get("genId")
            source = one(idea_id, gen_id) if isinstance(gen_id, str) else None
            if source is None or source[3] != "image" or source[7] != "done":  # kind, status columns
                return error(422, "An input image must be a finished image generated for this plan.")
            return None
        if ref.get("source") != "kit":
            return error(422, BAD_REFS)
        client_id = (find_idea(idea_id) or {}).get("clientId")
        item_id, image = ref.get("itemId"), ref.get("image")
        item = kit.find_item(load, client_id, item_id) if client_id and isinstance(item_id, str) else None
        if item is not None and "image" not in ref:  # text-only: for an item with no images
            return error(422, "A kit item with images must send an image.") if item.images else None
        if item is None or not isinstance(image, str) or image not in item.images:
            return error(422, "That kit image isn't in this plan's client kit.")
        folder = kit.kit_folder(media_dir(), client_id)
        if folder is None or not (folder / image).is_file():
            return error(422, "An input image is missing.")
        return None

    def check(idea_id: str, nodes: list, node_id, model_id, prompt, start, refs, duration, pending_start=False,
              voice=False):
        """The rules every generation follows. `refs` is a list of references (plan generations or kit images), or
        None. Returns (model, duration, None), or (None, None, the error)."""
        refs = refs or []
        files = [r for r in refs if not (isinstance(r, dict) and r.get("source") == "kit" and "image" not in r)]
        if not isinstance(node_id, str) or not node_id or not isinstance(prompt, str) or len(prompt) > MAX_PROMPT:
            return None, None, error(422, "Send the node, the model and a prompt.")
        model = next((m for m in load_models() if m["id"] == model_id), None)
        if model is None or model.get("retired"):
            return None, None, error(422, "That model doesn't exist.")
        if not is_available(model):
            return None, None, error(422, "This model isn't set up yet.")
        if voice != (model["kind"] == "voice"):  # voice rows come from the editor's TTS route only
            return None, None, error(422, "That model can't make this kind of node.")
        if voice:  # a voiceover belongs to the editor, not to a canvas node
            if not voice_text_ok(prompt):
                return None, None, error(422, BAD_VOICE_TEXT)
            return model, None, None
        target = next((n for n in nodes if n.get("id") == node_id), None)
        if target is None:
            return None, None, error(422, "That node isn't on this plan's canvas.")
        if NODE_FOR_KIND.get(model["kind"]) != target.get("type"):
            return None, None, error(422, "That model can't make this kind of node.")
        if duration is not None:
            if model["kind"] != "video" or duration not in model.get("durations", []):
                return None, None, error(422, "That duration isn't available for this model.")
        elif model["kind"] == "video":
            duration = model["durations"][0]
        if start is not None:
            source = one(idea_id, start) if isinstance(start, str) else None
            if source is None or source[3] != "image" or source[7] != "done":  # kind, status columns
                return None, None, error(422, "An input image must be a finished image generated for this plan.")
        for ref in refs:
            bad = check_ref(idea_id, ref)
            if bad is not None:
                return None, None, bad
        if pending_start:  # a chained video: its start frame is the image being made now
            start = PENDING
        if (model.get("inputs") or {}).get("text") == "required" and not prompt.strip():
            return None, None, error(422, "This model needs a prompt.")
        for field, given, what in (("startFrame", start is not None, "a start frame"),
                                   ("reference", bool(files), "a reference image")):
            rule = (model.get("inputs") or {}).get(field, "none")
            if rule == "required" and not given:
                return None, None, error(422, f"This model needs {what}.")
            if rule == "none" and given:
                return None, None, error(422, f"This model doesn't take {what}.")
        cap = model.get("maxRefs", 1)  # a model that doesn't say takes one
        if len(files) > cap:  # text-only kit refs are not images
            return None, None, error(422, f"The reference images are over this model's limit of {cap}.")
        return model, duration, None

    router.check = check

    def canvas_doc(idea_id: str) -> dict:
        with db() as conn:
            canvas_row = conn.execute("SELECT doc FROM canvases WHERE idea_id = ?", (idea_id,)).fetchone()
        return json.loads(canvas_row[0]) if canvas_row else {"nodes": [], "edges": []}

    def prepare_refs(found: dict, idea_id: str, prompt: str, refs, copy: bool = True):
        """What a generation stores for its references: (the inputs `references`, `kitStamp` and `sentPrompt`, None),
        or (None, the error). Everything that can fail with 422 happens here, before any money is spent. `copy` false
        (a quote) checks the same things but leaves the kit files where they are."""
        stored, stamp, used, n = [], {}, {}, 0
        for ref in refs or []:
            if ref["source"] == "gen":
                n += 1
                stored.append({"source": "gen", "genId": ref["genId"]})
                continue
            item = kit.find_item(load, found.get("clientId"), ref["itemId"])
            if item is not None and "image" not in ref and not item.images:
                stored.append({"source": "kit", "itemId": item.id, "name": item.name, "kind": item.kind})
                stamp[item.id] = item.updatedAt
                used.setdefault(item.id, (item, []))
                continue
            if item is None or ref.get("image") not in item.images:  # removed since check ran
                return None, error(422, "That kit image isn't in this plan's client kit.")
            n += 1
            stored.append({"source": "kit", "itemId": item.id, "image": ref["image"], "name": item.name,
                           "kind": item.kind, "file": f"kit-{ref['image']}"})
            stamp[item.id] = item.updatedAt
            used.setdefault(item.id, (item, []))[1].append(n)
        sent = with_prefix(kit, prompt, list(used.values()))
        if sent is None:
            return None, error(422, PROMPT_TOO_LONG)
        if copy:
            try:
                copy_kit_images(kit, media_dir(), found["clientId"], idea_id, stored)
            except OSError:
                return None, error(422, "An input image is missing.")
        return {"references": stored, "kitStamp": stamp, "sentPrompt": sent}, None

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
        start, duration = body.get("startFrame"), body.get("duration")
        refs = body.get("references")
        if refs is None and body.get("reference") is not None:  # the old single-image field
            refs = [{"source": "gen", "genId": body["reference"]}]
        if refs is not None and not isinstance(refs, list):
            return error(422, BAD_REFS)
        model, duration, bad = check(idea_id, canvas_doc(idea_id)["nodes"], node_id, body.get("model"), prompt,
                                     start, refs, duration)
        if bad is not None:
            return bad
        part, bad = prepare_refs(found, idea_id, prompt, refs)
        if bad is not None:
            return bad
        est = estimate_usd(model, duration)
        blocked = router.budget(model["kind"], est)  # spends the estimate; a failed job gives it back
        if blocked is not None:
            return blocked
        inputs = {"prompt": prompt, "startFrame": start, "duration": duration, **part}
        try:
            with db() as conn:
                out = enqueue(conn, idea_id, node_id, model["kind"], model["id"], inputs, est)
        except Exception:
            router.refund(model["kind"], est)
            raise
        router.jobs.submit(out["id"])
        return JSONResponse(out, status_code=201)

    def left(kind: str) -> float:
        wallet = router.remaining()[kind]
        return round(max(0.0, wallet["cap"] - wallet["spent"]), 4)

    @router.post("/api/ideas/{idea_id}/gen/chain")
    async def chain(idea_id: str, request: Request):
        """Quote (confirm false) or run (confirm true) a storyboard image and a video that starts from it."""
        try:
            body = await request.json()
        except ValueError:
            body = None
        if not isinstance(body, dict):
            return error(422, "Send the two nodes, the two models and a prompt.")
        found = find_idea(idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if found["status"] != "approved":
            return error(409, "Only an approved plan can generate.")
        if body.get("reference") is not None or body.get("videoReference") is not None:
            return error(422, "Run the whole shot doesn't send reference images yet. Use Generate on each node.")
        refs = body.get("references")  # for the storyboard image only; the video starts from that image
        if refs is not None and not isinstance(refs, list):
            return error(422, BAD_REFS)
        prompt, video_prompt = body.get("prompt", ""), body.get("videoPrompt")
        if not isinstance(video_prompt, str) or not video_prompt.strip():
            video_prompt = prompt
        image_node, video_node = body.get("imageNodeId"), body.get("videoNodeId")
        doc = canvas_doc(idea_id)
        image_model, _, bad = check(idea_id, doc["nodes"], image_node, body.get("imageModel"), prompt,
                                    None, refs, None)
        if bad is not None:
            return bad
        video_model, duration, bad = check(idea_id, doc["nodes"], video_node, body.get("videoModel"), video_prompt,
                                           None, [], body.get("duration"), pending_start=True)
        if bad is not None:
            return bad
        if image_model["kind"] != "image" or video_model["kind"] != "video":
            return error(422, "Pick an image model for the storyboard and a video model for the video.")
        types = {n.get("id"): n.get("type") for n in doc["nodes"]}
        if types.get(image_node) != "storyboard" or types.get(video_node) != "video":
            return error(422, "The first node must be a storyboard and the second a video.")
        if not any(e.get("source") == image_node and e.get("target") == video_node
                   and e.get("targetHandle") == "in:start" for e in doc["edges"]):
            return error(422, "Connect the storyboard to the video's start frame first.")
        part, bad = prepare_refs(found, idea_id, prompt, refs, copy=False)  # copies come after the budget checks
        if bad is not None:
            return bad
        image_usd, video_usd = estimate_usd(image_model, None), estimate_usd(video_model, duration)
        remaining = {"image": left("image"), "video": left("video")}
        if body.get("confirm") is not True:
            return {"total": round(image_usd + video_usd, 4), "remaining": remaining,
                    "items": [{"nodeId": image_node, "model": image_model["id"], "usd": image_usd},
                              {"nodeId": video_node, "model": video_model["id"], "usd": video_usd}]}
        if image_usd > remaining["image"] or video_usd > remaining["video"]:  # check both before charging either
            return error(429, f"Today's budget has US${remaining['image']:.2f} left for images and "
                              f"US${remaining['video']:.2f} for videos, and this shot needs US${image_usd:.2f} and "
                              f"US${video_usd:.2f}. Nothing was started. The budget resets at midnight.")
        try:  # the last thing that can fail with 422, so it runs before any money is spent
            copy_kit_images(kit, media_dir(), found["clientId"], idea_id, part["references"])
        except OSError:
            return error(422, "An input image is missing.")
        blocked = router.budget("image", image_usd)
        if blocked is not None:
            return blocked
        blocked = router.budget("video", video_usd)
        if blocked is not None:
            router.refund("image", image_usd)
            return blocked
        now = int(time.time() * 1000)
        image_id, video_id = secrets.token_urlsafe(9), secrets.token_urlsafe(9)
        image_inputs = {"prompt": prompt, "startFrame": None, "duration": None, **part}
        video_inputs = {"prompt": video_prompt, "startFrame": image_id, "references": [], "duration": duration}
        rows = [(image_id, idea_id, image_node, "image", image_model["id"], json.dumps(image_inputs),
                 input_hash(image_model["id"], part["sentPrompt"], None, part["references"], None), "queued", image_usd,
                 None, None, None, None, now, None, None),
                (video_id, idea_id, video_node, "video", video_model["id"], json.dumps(video_inputs),
                 input_hash(video_model["id"], video_prompt, image_id, [], duration), "waiting", video_usd,
                 None, None, None, None, now, None, image_id)]
        try:
            with db() as conn:
                for row in rows:
                    conn.execute(f"INSERT INTO generations ({COLUMNS}) VALUES ({', '.join('?' * NCOLUMNS)})", row)
        except Exception:
            router.refund("image", image_usd)
            router.refund("video", video_usd)
            raise
        out = {"image": to_json(rows[0]), "video": to_json(rows[1])}
        router.jobs.submit(image_id)
        return JSONResponse(out, status_code=201)

    @router.get("/api/gen/budget")
    def gen_budget_left():
        return router.remaining()

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

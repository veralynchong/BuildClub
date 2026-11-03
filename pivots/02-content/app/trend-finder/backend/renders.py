"""The finished video of a plan: the work rows of the editor's export, and the routes that show, download, send for
review and publish it. out_source 'auto' marks a row left by the pre-P4 auto-cut pipeline; such a video can still be
watched, sent for review and checked for staleness, but nothing makes a new one. Only signed-in staff reach these
routes (they sit under /api/ideas/), so the approver's review link never sees them."""

import hashlib
import json
import os
import queue
import secrets
import shutil
import sqlite3
import threading
import time
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import unquote

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse

import takes
from cutting import CutError

# Job columns describe the latest run; the out_* columns describe the video on disk and are written only
# when a run succeeds, so a failed rerun leaves the old video and its details alone.
SCHEMA = (
    "CREATE TABLE IF NOT EXISTS renders (idea_id TEXT PRIMARY KEY, status TEXT NOT NULL, progress REAL NOT NULL, "
    "step TEXT NOT NULL, error TEXT, speed REAL NOT NULL, shots INTEGER NOT NULL DEFAULT 1, "
    "signature TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER, "
    "out_size INTEGER, out_duration REAL, out_signature TEXT, out_speed REAL, out_shots INTEGER)",
    "CREATE TABLE IF NOT EXISTS cut_music (idea_id TEXT PRIMARY KEY, id TEXT NOT NULL, ext TEXT NOT NULL, "
    "name TEXT NOT NULL, size INTEGER NOT NULL, licensed_at INTEGER NOT NULL)",
    # One row per plan: the cut that was sent to the client's approver, the version of final.mp4 it was
    # sent as, and the answer. status is waiting | approved | rejected.
    "CREATE TABLE IF NOT EXISTS cut_reviews (idea_id TEXT PRIMARY KEY, version INTEGER NOT NULL, "
    "status TEXT NOT NULL, sent_at INTEGER NOT NULL, decided_at INTEGER, reason TEXT)",
)

def migrate(conn) -> None:
    """source: what the latest job is (auto | editor). out_source: what made the video on disk."""
    have = {r[1] for r in conn.execute("PRAGMA table_info(renders)")}
    if "source" not in have:
        conn.execute("ALTER TABLE renders ADD COLUMN source TEXT NOT NULL DEFAULT 'auto'")
    if "out_source" not in have:
        conn.execute("ALTER TABLE renders ADD COLUMN out_source TEXT")
        conn.execute("UPDATE renders SET out_source = 'auto' WHERE out_size IS NOT NULL")


MAX_MUSIC_BYTES = 30 * 1024 * 1024
MUSIC_TYPES = {"audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav", "audio/x-wav": "wav"}
MAX_NAME = 200
DEFAULT_SPEED = 1.1
DISK_FACTOR = 4

LIMIT_TEXT = "The music file is over the 30 MB limit."
NOT_AUDIO = "Upload an .mp3, .m4a or .wav audio file."
NO_LICENSE = "Confirm you own this music or have the license to use it."
NOT_APPROVED = "Only an approved plan can be cut."
BUSY = "A cut is already being made for this plan."
NO_DISK = "There isn't enough free disk space to make the cut."
RESTARTED = "The server restarted while this was being made. Make it again."
NO_CUT = "Make the video in the editor first."
STALE_CUT = "The takes or music changed after this was made. Make it again before sending it."
CUTTING = "Wait for the cut to finish before sending it."
NO_LINK = "This client's review link is turned off. Make a new one on the Shortlist first."
ALREADY_APPROVED = "This video is already approved."
NOT_WAITING = "This video isn't waiting for review."
REPLACED = "This video was replaced while you were watching. Here is the new one."
NEED_REASON = "Say what to change."
GENERIC = "Something went wrong while making the cut."
EDIT_STALE = "The edit changed after this was exported. Export it again before sending it."

ACTIVE = ("queued", "running")

def run_editor(*args, **kwargs):
    """The editor export (editing.render_project), looked up when a job runs so tests can swap it.
    editing imports this module, so it is imported here and not at the top."""
    import editing
    return editing.render_project(*args, **kwargs)

# Starting a cut and changing the music take turns (the start itself is also one DB transaction).
render_lock = threading.Lock()

# make_router remembers where the media lives so recover(db) can clear half-made work.
_media_dir: Optional[Callable[[], Path]] = None

COLUMNS = ("status, progress, step, error, speed, out_size, out_duration, out_signature, out_speed, out_shots, out_source")


def signature(take_ids: list[str], speed: float, music_id: Optional[str]) -> str:
    """A fingerprint of what a cut was made from: the chosen takes in shot order, the speed and the music."""
    text = "|".join([",".join(take_ids), f"{speed:.2f}", music_id or ""])
    return hashlib.sha1(text.encode()).hexdigest()[:16]


def error(status: int, message: str) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=status)


def cut_folder(root: Path, idea_id: str) -> Optional[Path]:
    """The cut folder of a plan, or None when the id points outside `root` (which is already resolved)."""
    folder = (root / idea_id).resolve()
    return folder / "cut" if folder.parent == root else None


def final_version(folder: Optional[Path]) -> Optional[int]:
    """The version of the finished video: it changes with every new final.mp4."""
    path = folder / "final.mp4" if folder else None
    return path.stat().st_mtime_ns if path is not None and path.is_file() else None


def review_row(conn, idea_id: str) -> Optional[tuple]:
    """(version, status, sent_at, decided_at, reason) of the plan's review, or None."""
    return conn.execute("SELECT version, status, sent_at, decided_at, reason FROM cut_reviews WHERE idea_id = ?",
                        (idea_id,)).fetchone()


def has_review_link(conn, client_id: str) -> bool:
    """Whether the client has an active review link (same lookup as share.keys_of)."""
    rows = conn.execute("SELECT value FROM store WHERE key LIKE 'share:%'").fetchall()
    return any(json.loads(v).get("clientId") == client_id for (v,) in rows)


def chosen_ids(conn, idea_id: str, shots: int) -> list[tuple[str, str]]:
    """(take id, ext) of the chosen take of each shot below `shots`, in shot order; shots with none are skipped."""
    return [(r[0], r[3]) for r, _ in takes.chosen_takes(conn, idea_id, shots)]


def music_row(conn, idea_id: str):
    return conn.execute("SELECT id, ext, name, size FROM cut_music WHERE idea_id = ?", (idea_id,)).fetchone()


def shot_count(idea: dict) -> Optional[int]:
    """How many shots the plan lists itself, or None when it lists none (format shot lists are the page's to know)."""
    return len(idea["shots"]) if idea.get("shots") else None


def is_stale(conn, idea_id: str, shots: Optional[int] = None) -> bool:
    """Whether the cut was made from other takes, other music or another shot count than the plan has now."""
    row = conn.execute("SELECT out_signature, out_speed, out_shots, out_source FROM renders "
                       "WHERE idea_id = ? AND out_size IS NOT NULL", (idea_id,)).fetchone()
    if row is None:
        return False
    out_sig, out_speed, out_shots, out_source = row
    if out_source == "editor":  # the edit project is what it was made from; the plan's shot count doesn't matter
        import editing
        project = conn.execute("SELECT doc FROM edit_projects WHERE idea_id = ?", (idea_id,)).fetchone()
        project = json.loads(project[0]) if project else editing.empty_project()
        return editing.signature(conn, _media_dir().resolve(), {"id": idea_id}, project) != out_sig
    music = music_row(conn, idea_id)
    # The speed is part of the fingerprint, but it is the one the video was made at, so it never differs.
    current = signature([t[0] for t in chosen_ids(conn, idea_id, out_shots)], out_speed, music[0] if music else None)
    # The page sends the plan's current shot count; a plan that gained or lost a shot needs a new cut.
    return current != out_sig or (shots is not None and shots != out_shots)


def clear_work(root: Path, idea_id: str) -> None:
    shutil.rmtree(root / idea_id / "cut" / "work", ignore_errors=True)


def recover(db, media_dir: Optional[Callable[[], Path]] = None) -> None:
    """After a restart no worker is running: mark unfinished jobs failed and remove their work folders."""
    media_dir = media_dir or _media_dir
    with db() as conn:
        ids = [r[0] for r in conn.execute("SELECT idea_id FROM renders WHERE status IN ('queued', 'running')")]
        conn.execute("UPDATE renders SET status = 'failed', error = ?, finished_at = ? "
                     "WHERE status IN ('queued', 'running')", (RESTARTED, int(time.time() * 1000)))
    if media_dir is not None:
        for idea_id in ids:
            folder = cut_folder(media_dir().resolve(), idea_id)
            if folder is not None:
                import editing
                editing.kill_orphan(folder / "render.pid")  # a render the old server started may still run
            clear_work(media_dir(), idea_id)


class RenderJobs:
    """One worker thread runs cuts in order (whisper and x264 each use every core)."""

    def __init__(self, db, media_dir: Callable[[], Path]):
        self._db, self._media = db, media_dir
        self._q: queue.Queue = queue.Queue()
        threading.Thread(target=self._work, name="render-worker", daemon=True).start()

    def submit(self, idea_id: str) -> None:
        self._q.put(idea_id)

    def _set(self, idea_id: str, **fields) -> None:
        names = ", ".join(f"{k} = ?" for k in fields)
        with self._db() as conn:
            conn.execute(f"UPDATE renders SET {names} WHERE idea_id = ?", (*fields.values(), idea_id))

    def _work(self) -> None:
        while True:
            idea_id = self._q.get()
            try:
                self._run(idea_id)
            except Exception as e:  # never let the worker thread die
                print(f"[render] {idea_id} worker error: {e}", flush=True)

    def _run_editor(self, idea_id: str, folder: Path, work: Path) -> None:
        """Export the edit project. final.mp4 is replaced only once the new video is whole."""
        shutil.rmtree(work, ignore_errors=True)
        work.mkdir(parents=True)
        nxt = work / "next.mp4"

        def step(progress: float, text: str) -> None:
            self._set(idea_id, progress=progress, step=text)

        result = run_editor(self._db, self._media().resolve(), idea_id, work, nxt, step)
        os.replace(nxt, folder / "final.mp4")
        with self._db() as conn:
            conn.execute(
                "UPDATE renders SET status = 'done', progress = 1.0, step = 'Done', error = NULL, finished_at = ?, "
                "out_size = ?, out_duration = ?, out_speed = 1.0, out_shots = ?, out_signature = ?, "
                "out_source = 'editor' WHERE idea_id = ?",
                (int(time.time() * 1000), result["size"], result["durationSec"], result["clips"],
                 result["signature"], idea_id))
            conn.execute("DELETE FROM cut_reviews WHERE idea_id = ?", (idea_id,))

    def _run(self, idea_id: str) -> None:
        folder = self._media().resolve() / idea_id / "cut"
        work = folder / "work"
        try:
            with self._db() as conn:
                row = conn.execute("SELECT source FROM renders WHERE idea_id = ?", (idea_id,)).fetchone()
            if row is None:
                return
            self._set(idea_id, status="running", progress=0.0, step="Starting")
            if row[0] != "editor":  # only the editor export makes videos now
                raise RuntimeError(f"unsupported render source {row[0]!r}")
            self._run_editor(idea_id, folder, work)
        except CutError as e:
            print(f"[render] {idea_id} failed: {e}", flush=True)
            self._set(idea_id, status="failed", error=str(e), finished_at=int(time.time() * 1000))
        except Exception as e:
            print(f"[render] {idea_id} failed: {e!r}", flush=True)
            self._set(idea_id, status="failed", error=GENERIC, finished_at=int(time.time() * 1000))
        finally:
            shutil.rmtree(work, ignore_errors=True)


def make_router(db, load, media_dir: Callable[[], Path]) -> APIRouter:
    global _media_dir
    _media_dir = media_dir
    router = APIRouter()
    jobs = RenderJobs(db, media_dir)

    def find_idea(idea_id: str):
        return next((i for i in load("ideas") or [] if i["id"] == idea_id), None)

    def folder_of(idea_id: str) -> Optional[Path]:
        return cut_folder(media_dir().resolve(), idea_id)

    def state_of(idea_id: str, shots: Optional[int] = None) -> dict:
        with db() as conn:
            row = conn.execute(f"SELECT {COLUMNS} FROM renders WHERE idea_id = ?", (idea_id,)).fetchone()
            music = music_row(conn, idea_id)
            out = {"status": "none", "progress": 0, "step": "", "speed": DEFAULT_SPEED, "stale": False,
                   "music": {"name": music[2], "size": music[3]} if music else None, "review": None}
            if row is None:
                return out
            status, progress, step, err, speed, size, duration, out_sig, out_speed, out_shots, out_source = row
            out.update(status=status, progress=progress, step=step, speed=speed, source=out_source or "auto")
            if err:
                out["error"] = err
            folder = folder_of(idea_id)
            if size is not None and folder is not None and (folder / "final.mp4").is_file():
                # The version changes with every new final.mp4, so a preview player reloads after a re-cut.
                version = (folder / "final.mp4").stat().st_mtime_ns
                out["output"] = {"url": f"/api/ideas/{idea_id}/cut/file?v={version}", "size": size,
                                 "durationSec": duration}
                out["stale"] = is_stale(conn, idea_id, shots)
                sent = review_row(conn, idea_id)
                if sent is not None and sent[0] == version:  # a record of another video is not shown
                    out["review"] = {"status": sent[1], "sentAt": sent[2]}
                    if sent[3] is not None:
                        out["review"]["decidedAt"] = sent[3]
                    if sent[4]:
                        out["review"]["reason"] = sent[4]
        return out

    def editable(idea_id: str):
        """The error to return when the plan can't be changed, else None."""
        found = find_idea(idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if found["status"] != "approved":
            return error(409, NOT_APPROVED)
        return None

    def is_busy(conn, idea_id: str) -> bool:
        row = conn.execute("SELECT status FROM renders WHERE idea_id = ?", (idea_id,)).fetchone()
        return row is not None and row[0] in ACTIVE

    @router.get("/api/ideas/{idea_id}/cut")
    def get_cut(idea_id: str, shots: Optional[int] = None):
        if find_idea(idea_id) is None:
            return error(404, "That plan doesn't exist.")
        return state_of(idea_id, shots)

    @router.get("/api/ideas/{idea_id}/cut/music/file")
    def get_music_file(idea_id: str):
        folder = folder_of(idea_id)
        with db() as conn:
            music = music_row(conn, idea_id)
        path = folder / f"music-{music[0]}.{music[1]}" if folder and music else None
        if path is None or not path.is_file():
            return error(404, "There is no music for this plan.")
        return FileResponse(path, media_type={"mp3": "audio/mpeg", "m4a": "audio/mp4", "wav": "audio/wav"}[music[1]])

    @router.get("/api/ideas/{idea_id}/cut/file")
    def get_file(idea_id: str, download: int = 0):
        folder = folder_of(idea_id)
        with db() as conn:
            row = conn.execute("SELECT out_size FROM renders WHERE idea_id = ?", (idea_id,)).fetchone()
        path = folder / "final.mp4" if folder else None
        if path is None or row is None or row[0] is None or not path.is_file():
            return error(404, "There is no cut for this plan yet.")
        if download:
            return FileResponse(path, media_type="video/mp4", filename=f"remake-{idea_id}.mp4",
                                content_disposition_type="attachment")
        return FileResponse(path, media_type="video/mp4")

    @router.post("/api/ideas/{idea_id}/cut/review")
    def send_for_review(idea_id: str):
        found = find_idea(idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if found["status"] != "approved":
            return error(409, NOT_APPROVED)
        with render_lock:
            conn = db()
            try:
                conn.execute("BEGIN IMMEDIATE")
                refused = None
                version = final_version(folder_of(idea_id))
                have = conn.execute("SELECT out_size, out_source FROM renders WHERE idea_id = ?", (idea_id,)).fetchone()
                if is_busy(conn, idea_id):
                    refused = error(409, CUTTING)
                elif version is None or have is None or have[0] is None:
                    refused = error(409, NO_CUT)
                elif is_stale(conn, idea_id, shot_count(found)):
                    refused = error(409, EDIT_STALE if have[1] == "editor" else STALE_CUT)
                elif not has_review_link(conn, found["clientId"]):
                    refused = error(409, NO_LINK)
                else:
                    sent = review_row(conn, idea_id)
                    if sent is not None and sent[1] == "approved" and sent[0] == version:
                        refused = error(409, ALREADY_APPROVED)
                if refused:
                    conn.rollback()
                    return refused
                conn.execute(
                    "INSERT INTO cut_reviews (idea_id, version, status, sent_at) VALUES (?, ?, 'waiting', ?) "
                    "ON CONFLICT(idea_id) DO UPDATE SET version = excluded.version, status = 'waiting', "
                    "sent_at = excluded.sent_at, decided_at = NULL, reason = NULL",
                    (idea_id, version, int(time.time() * 1000)))
                conn.commit()
            except sqlite3.Error:
                conn.rollback()
                raise
            finally:
                conn.close()
        return state_of(idea_id)

    async def receive(request: Request, part: Path) -> int:
        """Stream the body to `part`; the size, or -1 once it passes the cap. `part` is removed on any failure."""
        size = 0
        try:
            with part.open("wb") as f:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > MAX_MUSIC_BYTES:
                        break
                    f.write(chunk)
        except BaseException:
            part.unlink(missing_ok=True)
            raise
        if size > MAX_MUSIC_BYTES:
            part.unlink(missing_ok=True)
            return -1
        return size

    def magic_ok(ext: str, head: bytes) -> bool:
        if ext == "mp3":
            return head[:3] == b"ID3" or (len(head) >= 2 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0)
        if ext == "m4a":
            return head[4:8] == b"ftyp"
        return head[:4] == b"RIFF" and head[8:12] == b"WAVE"

    @router.put("/api/ideas/{idea_id}/cut/music")
    async def put_music(idea_id: str, request: Request):
        refused = editable(idea_id)
        if refused:
            return refused
        ext = MUSIC_TYPES.get(request.headers.get("content-type", "").split(";")[0].strip().lower())
        if ext is None:
            return error(415, NOT_AUDIO)
        if request.headers.get("x-license-confirmed", "").strip().lower() != "yes":
            return error(422, NO_LICENSE)
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > MAX_MUSIC_BYTES:
            return error(413, LIMIT_TEXT)
        folder = folder_of(idea_id)
        if folder is None:
            return error(404, "That plan doesn't exist.")
        folder.mkdir(parents=True, exist_ok=True)
        music_id = secrets.token_urlsafe(9)
        part = folder / f".{music_id}.part"
        size = await receive(request, part)
        if size < 0:
            return error(413, LIMIT_TEXT)
        with part.open("rb") as f:
            head = f.read(12)
        if not magic_ok(ext, head):
            part.unlink(missing_ok=True)
            return error(415, NOT_AUDIO)

        name = unquote(request.headers.get("x-filename", ""))[:MAX_NAME].strip() or f"music.{ext}"
        with render_lock:
            refused = editable(idea_id)  # the plan may have changed while the body was arriving
            with db() as conn:
                if refused is None and is_busy(conn, idea_id):
                    refused = error(409, BUSY)
                if refused:
                    part.unlink(missing_ok=True)
                    return refused
                old = music_row(conn, idea_id)
                os.replace(part, folder / f"music-{music_id}.{ext}")
                conn.execute("INSERT OR REPLACE INTO cut_music (idea_id, id, ext, name, size, licensed_at) "
                             "VALUES (?, ?, ?, ?, ?, ?)", (idea_id, music_id, ext, name, size, int(time.time() * 1000)))
            if old:
                (folder / f"music-{old[0]}.{old[1]}").unlink(missing_ok=True)
        return state_of(idea_id)

    @router.delete("/api/ideas/{idea_id}/cut/music")
    def delete_music(idea_id: str):
        refused = editable(idea_id)
        if refused:
            return refused
        with render_lock, db() as conn:
            if is_busy(conn, idea_id):
                return error(409, BUSY)
            old = music_row(conn, idea_id)
            conn.execute("DELETE FROM cut_music WHERE idea_id = ?", (idea_id,))
        folder = folder_of(idea_id)
        if old and folder:
            (folder / f"music-{old[0]}.{old[1]}").unlink(missing_ok=True)
        return state_of(idea_id)

    @router.post("/api/ideas/{idea_id}/edit/export", status_code=202)
    def export_edit(idea_id: str):
        import editing  # editing imports this module
        refused = editable(idea_id)
        if refused:
            return refused
        missing = editing.missing_render_tools()
        if missing:
            return error(503, missing)
        with db() as conn:
            row = conn.execute("SELECT doc FROM edit_projects WHERE idea_id = ?", (idea_id,)).fetchone()
            project = json.loads(row[0]) if row else editing.empty_project()
            sources = {s["key"]: s for s in editing.list_sources(conn, media_dir(), idea_id)}
        if not project["clips"]:
            return error(409, editing.EMPTY)
        if editing.missing_sources(project, sources):
            return error(409, editing.MISSING_SOURCE)
        for c in project["clips"]:
            if c["out"] > sources[editing.source_key(c["source"])]["duration"] + editing.EPS:
                return error(400, editing.CLIP_PAST_END)
        used = {editing.source_key(c["source"]) for c in project["clips"]}
        total_bytes = sum(Path(sources[k]["path"]).stat().st_size for k in used)
        if shutil.disk_usage(media_dir()).free < DISK_FACTOR * total_bytes:
            return error(409, NO_DISK)
        now = int(time.time() * 1000)
        with render_lock:
            conn = db()
            try:
                conn.execute("BEGIN IMMEDIATE")
                if is_busy(conn, idea_id):
                    conn.rollback()
                    return error(409, BUSY)
                current = find_idea(idea_id)
                if current is None or current["status"] != "approved":
                    conn.rollback()
                    return error(409, NOT_APPROVED)
                conn.execute(
                    "INSERT INTO renders (idea_id, status, progress, step, speed, shots, signature, started_at, source) "
                    "VALUES (?, 'queued', 0, 'Waiting to start', 1.0, ?, '', ?, 'editor') "
                    "ON CONFLICT(idea_id) DO UPDATE SET source = 'editor', status = 'queued', progress = 0, "
                    "step = 'Waiting to start', error = NULL, speed = 1.0, shots = excluded.shots, signature = '', "
                    "started_at = excluded.started_at, finished_at = NULL",
                    (idea_id, len(project["clips"]), now))
                conn.commit()
            except sqlite3.Error:
                conn.rollback()
                raise
            finally:
                conn.close()
        jobs.submit(idea_id)
        return JSONResponse(state_of(idea_id), status_code=202)

    return router

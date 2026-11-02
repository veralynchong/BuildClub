"""The edit project of one plan: a JSON document per plan with a version number (a stale write is a 409),
plus the list of footage the editor can cut from. Only signed-in staff reach these routes."""

import collections
import hashlib
import json
import math
import os
import re
import shutil
import signal
import subprocess
import threading
import time
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

import cutting
import generations
import renders
import takes
from canvas import ID_RE

SCHEMA = (
    "CREATE TABLE IF NOT EXISTS edit_projects (idea_id TEXT PRIMARY KEY, version INTEGER NOT NULL, "
    "doc TEXT NOT NULL, updated_at INTEGER NOT NULL)",
)

STALE = "The edit changed somewhere else. Reload it."
MAX_TOTAL_S, MAX_CLIPS, MAX_TEXTS, MAX_VOICE, MAX_TEXT_CHARS = 180, 100, 30, 20, 120
MIN_CLIP_S = 0.2
EPS = 1e-6  # the client rounds to 1/30 s, so a 0.2 s clip can arrive as 0.1999999
MAX_BYTES = 512 * 1024

edit_lock = threading.Lock()

# The export runs Remotion (render/render-reel.mjs) as a child process. The tests swap spawn_render.
APP_DIR = Path(os.environ.get("REMOTION_APP_DIR") or Path(__file__).resolve().parents[1])
NODE = os.environ.get("REMOTION_NODE") or shutil.which("node")
RENDER_TIMEOUT_S = 600
LENGTH_GUARD_S = 0.2  # a hard guard only; the export's acceptance bar is 0.1 s and is tested by the smoke script

MISSING_SOURCE = "A clip's video was deleted. Remove it from the timeline first."
CLIP_PAST_END = "A clip runs past the end of its video. Trim it on the timeline first."
EMPTY = "Put at least one clip on the timeline first."
EDIT_STALE = "The edit changed after this was exported. Export it again before sending it."
BAD_OUTPUT = "The exported video doesn't look right. Export it again."


def empty_project() -> dict:
    return {"fps": 30, "width": 1080, "height": 1920, "clips": [], "texts": [], "captions": {"enabled": False},
            "music": None, "voiceover": [], "primaries": {}, "showLogo": False}


def source_key(src: dict) -> str:
    return f"{src['kind']}:{src['id']}"


def _num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def _id(v) -> bool:
    return isinstance(v, str) and bool(ID_RE.match(v))


def _check_clip(c, seen: set) -> Optional[str]:
    if not isinstance(c, dict) or not _id(c.get("id")):
        return "Every clip needs an id."
    if c["id"] in seen:
        return "Two clips share an id."
    seen.add(c["id"])
    src = c.get("source")
    if not isinstance(src, dict) or src.get("kind") not in ("generation", "take") or not _id(src.get("id")):
        return "Every clip needs a generation or take as its source."
    for k in ("nodeId", "shotId"):
        if k in src and not _id(src[k]):
            return f"The clip source has a bad {k}."
    if not _num(c.get("in")) or not _num(c.get("out")):
        return "Clip times must be finite numbers."
    if not 0 <= c["in"] < c["out"]:
        return "A clip must start at 0 or later and end after it starts."
    if c["out"] - c["in"] < MIN_CLIP_S - EPS:
        return "A clip must be at least 0.2 seconds long."
    if not _num(c.get("volume")) or not 0 <= c["volume"] <= 2:
        return "Clip volume must be between 0 and 2."
    if not isinstance(c.get("muted"), bool):
        return "A clip's muted must be true or false."
    if "caption" in c and not isinstance(c["caption"], str):
        return "A clip caption must be text."
    return None


def check_project(doc) -> Optional[str]:
    """One sentence about the first problem, or None. P3b fields are accepted when their type is right."""
    if not isinstance(doc, dict):
        return "Send the edit project."
    if len(json.dumps(doc, allow_nan=True)) > MAX_BYTES:
        return "The edit project is too big."
    if doc.get("fps") != 30 or doc.get("width") != 1080 or doc.get("height") != 1920:
        return "The video must be 1080x1920 at 30 fps."
    clips, texts, voice = doc.get("clips"), doc.get("texts"), doc.get("voiceover")
    if not isinstance(clips, list) or not isinstance(texts, list) or not isinstance(voice, list):
        return "Clips, texts and voiceover must be lists."
    if len(clips) > MAX_CLIPS:
        return f"At most {MAX_CLIPS} clips."
    if len(texts) > MAX_TEXTS:
        return f"At most {MAX_TEXTS} texts."
    if len(voice) > MAX_VOICE:
        return f"At most {MAX_VOICE} voiceover clips."
    for t in texts:
        if not isinstance(t, dict):
            return "Every text must be an object."
        if "text" in t and (not isinstance(t["text"], str) or len(t["text"]) > MAX_TEXT_CHARS):
            return f"A text can be at most {MAX_TEXT_CHARS} characters."
    if not isinstance(doc.get("captions"), dict) or not isinstance(doc["captions"].get("enabled"), bool):
        return "Captions need an enabled flag."
    if doc.get("music") is not None and not isinstance(doc["music"], dict):
        return "Music must be an object or null."
    if not isinstance(doc.get("primaries"), dict) or not all(
            _id(k) and isinstance(v, dict) and v.get("kind") in ("generation", "take") and _id(v.get("id"))
            for k, v in doc["primaries"].items()):
        return "Primaries must map a shot id to a source."
    if not isinstance(doc.get("showLogo"), bool):
        return "showLogo must be true or false."
    seen: set = set()
    total = 0.0
    for c in clips:
        problem = _check_clip(c, seen)
        if problem:
            return problem
        total += c["out"] - c["in"]
    if total > MAX_TOTAL_S + EPS:
        return f"The timeline can be at most {MAX_TOTAL_S} seconds long."
    return None


# Probing runs ffprobe, so a file is read once per (path, mtime).
_probe_cache: dict = {}


def _probe(path: Path) -> Optional[dict]:
    try:
        key = (str(path), path.stat().st_mtime_ns)
    except OSError:
        return None
    if key not in _probe_cache:
        try:
            _probe_cache[key] = cutting.probe(path)
        except Exception:
            _probe_cache[key] = None
    return _probe_cache[key]


def _entry(key, kind, sid, url, path, info, node_id=None, shot_id=None) -> dict:
    out = {"key": key, "kind": kind, "id": sid, "url": url, "duration": info["duration"],
           "hasAudio": info["hasAudio"], "width": info["width"], "height": info["height"], "path": str(path)}
    if node_id:
        out["nodeId"] = node_id
    if shot_id:
        out["shotId"] = shot_id
    return out


def list_sources(conn, media: Path, idea_id: str) -> list[dict]:
    """Finished video generations, then every take, that can be probed. `path` is for the backend only."""
    out = []
    folder = generations.gen_folder(media, idea_id)
    if folder is not None:
        rows = conn.execute(f"SELECT {generations.COLUMNS} FROM generations WHERE idea_id = ? AND kind = 'video' "
                            "AND status = 'done' ORDER BY created_at, rowid", (idea_id,)).fetchall()
        for row in rows:
            g = generations.to_json(row)
            path = folder / row[10] if row[10] else None
            info = _probe(path) if path else None
            if info and g["url"]:
                out.append(_entry(f"generation:{g['id']}", "generation", g["id"], g["url"], path, info,
                                  node_id=g["nodeId"]))
    for row, _index in takes.rows_of(conn, idea_id):
        path = media / idea_id / f"{row[0]}.{row[3]}"
        info = _probe(path)
        if info:
            t = takes.to_json(row, _index)
            out.append(_entry(f"take:{t['id']}", "take", t["id"], t["url"], path, info, shot_id=t["shotId"]))
    return out


def missing_render_tools() -> Optional[str]:
    if not NODE:
        return "Node.js isn't installed on this computer, so the video can't be exported."
    if not (APP_DIR / "node_modules" / "@remotion" / "renderer").is_dir():
        return "The video export tools aren't installed. Run npm ci in the app folder."
    return None


def missing_sources(project: dict, sources: dict) -> list[str]:
    """Ids of the clips whose source video is gone."""
    return [c["id"] for c in project["clips"] if source_key(c["source"]) not in sources]


def _source_files(conn, media: Path, idea_id: str) -> dict[str, Path]:
    """key -> file of every generation and take of the plan, without probing."""
    out: dict[str, Path] = {}
    folder = generations.gen_folder(media, idea_id)
    if folder is not None:
        for row in conn.execute(f"SELECT {generations.COLUMNS} FROM generations WHERE idea_id = ? AND kind = 'video' "
                                "AND status = 'done'", (idea_id,)):
            if row[10]:
                out[f"generation:{row[0]}"] = folder / row[10]
    for row, _index in takes.rows_of(conn, idea_id):
        out[f"take:{row[0]}"] = media / idea_id / f"{row[0]}.{row[3]}"
    return out


# The project fields that change the rendered video. P3b adds texts, music and voice. Anything else in the
# project (such as the pinned primaries) does not make an export stale.
RENDER_FIELDS = ("clips",)


def signature(conn, media: Path, idea: dict, project: dict) -> str:
    """A fingerprint of what an export was made from: the render-relevant project fields and the modified time
    of each footage file. Music, brand, lines and voiceover join it in P3b."""
    files = _source_files(conn, media, idea["id"])
    stamps = {}
    for c in project["clips"]:
        key = source_key(c["source"])
        try:
            stamps[key] = files[key].stat().st_mtime_ns
        except (KeyError, OSError):
            stamps[key] = 0
    relevant = {k: project.get(k) for k in RENDER_FIELDS}
    text = json.dumps([relevant, sorted(stamps.items())], sort_keys=True)
    return hashlib.sha1(text.encode()).hexdigest()[:16]


def render_input(conn, media: Path, idea: dict, project: dict, sources: dict) -> tuple[dict, dict[str, Path]]:
    """The ReelInput for the renderer, and {file name in mediaDir: source file} for the links to make."""
    urls: dict[str, str] = {}
    files: dict[str, Path] = {}
    for c in project["clips"]:
        key = source_key(c["source"])
        if key in urls:
            continue
        path = Path(sources[key]["path"])
        name = f"{hashlib.sha1(key.encode()).hexdigest()[:16]}{path.suffix}"
        urls[key] = name
        files[name] = path
    reel = {"project": project, "urls": urls, "lines": {}, "musicUrl": None, "voice": [],
            "brand": {"font": "Noto Sans TC", "color": None, "logoUrl": None}, "fontUrl": ""}
    return reel, files


# Two or more path parts; a path inside a user or system root may also contain spaces, so it goes to the end of the line.
PATH_RE = re.compile(r"(?:/(?:Users|private|var|tmp|home|Volumes)/[^\n]*)|(?:/[\w.@~+-]+){2,}")
MAX_ERROR_CHARS = 200


_active: set = set()  # live render processes, so a shutdown can kill their groups


def kill_active() -> None:
    for proc in list(_active):
        _kill_group(proc)


def spawn_render(cmd: list, on_progress: Callable[[float], None], timeout: float,
                 pid_file: Optional[Path] = None) -> None:
    """Run the renderer in its own process group. stdout lines `progress 0.4` feed on_progress. A run past
    `timeout` is killed with everything it started; a failure reports the last stderr line without paths."""
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace",
                            start_new_session=True, cwd=APP_DIR if APP_DIR.is_dir() else None)
    _active.add(proc)
    if pid_file is not None:  # outside work/, so a restart can find and kill an orphaned render
        pid_file.write_text(str(proc.pid))
    tail: collections.deque = collections.deque(maxlen=20)

    def read_out() -> None:
        for line in proc.stdout:
            word, _, value = line.strip().partition(" ")
            if word == "progress":
                try:
                    on_progress(float(value))
                except Exception:  # a bad line or a failing callback must not stop the pipe being drained
                    pass

    def read_err() -> None:
        for line in proc.stderr:
            if line.strip():
                tail.append(line.strip())

    readers = [threading.Thread(target=read_out, daemon=True), threading.Thread(target=read_err, daemon=True)]
    for r in readers:
        r.start()
    try:
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            _kill_group(proc)
            raise cutting.CutError("The export took too long, so it was stopped.")
    finally:
        _kill_group(proc)  # also whatever the renderer left running (Chrome)
        _active.discard(proc)
        if pid_file is not None:
            pid_file.unlink(missing_ok=True)
        for r in readers:
            r.join(5)
    if proc.returncode != 0:
        last = PATH_RE.sub("<path>", tail[-1])[:MAX_ERROR_CHARS] if tail else ""
        raise cutting.CutError(f"The export failed: {last}" if last else "The export failed.")


def _kill_group(proc) -> None:
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass
    proc.wait()


def kill_orphan(pid_file: Path) -> None:
    """After a restart: kill the render group a dead server left behind, then forget it. Only a process that
    leads its own group (as spawn_render makes it) is touched."""
    try:
        pid = int(pid_file.read_text().strip())
        if pid > 1 and os.getpgid(pid) == pid and _is_render(pid):
            os.killpg(pid, signal.SIGKILL)
    except (OSError, ValueError):
        pass
    pid_file.unlink(missing_ok=True)


def _is_render(pid: int) -> bool:
    """True when the pid's command line is the render script (a reused pid belongs to something else)."""
    try:
        out = subprocess.run(["ps", "-o", "command=", "-p", str(pid)], capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return False
    return out.returncode == 0 and "render-reel.mjs" in out.stdout


def render_project(db, media_dir: Path, idea_id: str, work: Path, out: Path, step: Callable) -> dict:
    """Export the plan's edit project to `out`. The project is read once; the signature comes from that
    snapshot, so an edit made during the render reads as stale afterwards."""
    tools = missing_render_tools()
    if tools:
        raise cutting.CutError(tools)
    media = Path(media_dir)
    with db() as conn:
        row = conn.execute("SELECT doc FROM edit_projects WHERE idea_id = ?", (idea_id,)).fetchone()
        project = json.loads(row[0]) if row else empty_project()
        sources = {s["key"]: s for s in list_sources(conn, media, idea_id)}
        idea = {"id": idea_id}
        sig = signature(conn, media, idea, project)
        if not project["clips"]:
            raise cutting.CutError(EMPTY)
        if missing_sources(project, sources):
            raise cutting.CutError(MISSING_SOURCE)
        reel, files = render_input(conn, media, idea, project, sources)
    linked = work / "media"
    linked.mkdir(parents=True, exist_ok=True)
    for name, path in files.items():
        try:
            os.link(path, linked / name)
        except OSError:  # another disk
            os.symlink(path, linked / name)
    job = work / "job.json"
    job.write_text(json.dumps({"input": reel, "mediaDir": str(linked), "out": str(out),
                               "cacheDir": str(APP_DIR / ".remotion-bundle")}))
    spawn_render([NODE, str(APP_DIR / "render" / "render-reel.mjs"), str(job)],
                 lambda p: step(0.05 + 0.9 * p, "Exporting"), RENDER_TIMEOUT_S, work.parent / "render.pid")
    try:
        info = cutting.probe(out)
    except cutting.CutError:  # its message names a folder
        raise cutting.CutError(BAD_OUTPUT)
    total = sum(c["out"] - c["in"] for c in project["clips"])
    if (info.get("width"), info.get("height")) != (1080, 1920) or not info.get("hasAudio") \
            or abs(info["duration"] - total) > LENGTH_GUARD_S:
        raise cutting.CutError(BAD_OUTPUT)
    return {"size": out.stat().st_size, "durationSec": info["duration"], "signature": sig,
            "clips": len(project["clips"])}


def prewarm_bundle() -> Optional[threading.Thread]:
    """Build the Remotion bundle in the background so the first export doesn't wait for it. Never raises
    and never blocks the caller; returns the thread, or None when the tools are missing."""
    if missing_render_tools():
        return None

    def run() -> None:
        try:
            subprocess.run([NODE, str(APP_DIR / "render" / "render-reel.mjs"), "--bundle",
                            str(APP_DIR / ".remotion-bundle")], cwd=APP_DIR, capture_output=True,
                           timeout=RENDER_TIMEOUT_S, check=False)
        except Exception as e:
            print(f"[editing] bundle pre-warm skipped: {e!r}", flush=True)

    thread = threading.Thread(target=run, name="remotion-prewarm", daemon=True)
    thread.start()
    return thread


def error(status: int, message: str, **extra) -> JSONResponse:
    return JSONResponse({"error": message, **extra}, status_code=status)


def make_router(db, load, media_dir: Callable[[], Path]) -> APIRouter:
    router = APIRouter()

    def gate(idea_id: str):
        found = next((i for i in load("ideas") or [] if i["id"] == idea_id), None)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if found["status"] != "approved":
            return error(409, renders.NOT_APPROVED)
        return None

    def read(conn, idea_id: str):
        row = conn.execute("SELECT version, doc FROM edit_projects WHERE idea_id = ?", (idea_id,)).fetchone()
        return (row[0], json.loads(row[1])) if row else (0, empty_project())

    @router.get("/api/ideas/{idea_id}/edit")
    def get_edit(idea_id: str):
        refused = gate(idea_id)
        if refused:
            return refused
        with db() as conn:
            version, project = read(conn, idea_id)
        return {"version": version, "project": project}

    @router.put("/api/ideas/{idea_id}/edit")
    async def put_edit(idea_id: str, request: Request):
        try:
            body = await request.json()
        except ValueError:
            body = None
        refused = gate(idea_id)
        if refused:
            return refused
        if not isinstance(body, dict) or type(body.get("version")) is not int:
            return error(422, "Send the version and the project.")
        with edit_lock, db() as conn:
            version, _current = read(conn, idea_id)
            if body["version"] != version:
                return error(409, STALE, version=version)
            problem = check_project(body.get("project"))
            if problem:
                return error(422, problem)
            conn.execute("INSERT OR REPLACE INTO edit_projects (idea_id, version, doc, updated_at) VALUES (?, ?, ?, ?)",
                         (idea_id, version + 1, json.dumps(body["project"]), int(time.time() * 1000)))
        return {"version": version + 1}

    @router.get("/api/ideas/{idea_id}/edit/sources")
    def get_sources(idea_id: str):
        refused = gate(idea_id)
        if refused:
            return refused
        with db() as conn:
            sources = list_sources(conn, media_dir(), idea_id)
        return {"sources": [{k: v for k, v in s.items() if k != "path"} for s in sources]}

    return router

"""The edit project of one plan: a JSON document per plan with a version number (a stale write is a 409),
plus the list of footage the editor can cut from. Only signed-in staff reach these routes."""

import json
import math
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

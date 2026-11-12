"""The edit project of one plan: a JSON document per plan with a version number (a stale write is a 409),
plus the list of footage the editor can cut from. Only signed-in staff reach these routes."""

import collections
import hashlib
import json
import math
import os
import re
import secrets
import shutil
import signal
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from urllib.parse import quote
from typing import Callable, Optional

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.concurrency import run_in_threadpool

import cutting
import generations
import workspaces
import renders
import takes
from canvas import ID_RE
from models import Shot, fill_shot_ids

SCHEMA = (
    "CREATE TABLE IF NOT EXISTS edit_projects (idea_id TEXT PRIMARY KEY, version INTEGER NOT NULL, "
    "doc TEXT NOT NULL, updated_at INTEGER NOT NULL)",
)

STALE = "The edit changed somewhere else. Reload it."
MAX_TOTAL_S, MAX_CLIPS, MAX_TEXTS, MAX_VOICE, MAX_TEXT_CHARS = 180, 100, 30, 20, 120
MIN_CLIP_S = 0.2
MAX_SPEECH_CAPTIONS = 400
MAX_CAPTION_WORDS = 40  # words of one speech caption line (suggest.py makes at most 4)
MAX_FIXES = 2000  # words corrected in the transcript
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
MISSING_VOICE = "A voiceover file was deleted. Remove it from the timeline first."

# Voiceover files: <media>/<ideaId>/edit/voice/<vid>.<ext>, and <vid>.words.json beside it.
MAX_VOICE_BYTES = 20 * 1024 * 1024
MAX_VOICE_S = 120
VOICE_TYPES = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav"}
VOICE_MIME = {ext: mime for mime, ext in VOICE_TYPES.items()}
VOICE_SOURCES = ("tts", "recording", "upload")
NOT_AUDIO = "Upload an audio recording: WebM, Ogg, MP3, M4A or WAV."
VOICE_TOO_BIG = "The audio is over the 20 MB limit."
VOICE_IN_USE = "Remove this voiceover from the timeline first."
VOICE_ALREADY_ADDED = "That voiceover was already added to the plan."
VOICE_TOO_LONG = f"The audio is longer than {MAX_VOICE_S} seconds."


EXPORT_PRESETS = ("tiktok", "reels", "shorts")  # the export popover's platforms; they only change the warnings shown
LOGO_SIZES = ("small", "medium", "large")
LOGO_CORNERS = ("top-left", "top-right", "bottom-left", "bottom-right")
# What a project without the logo fields looks like: the logo as it was drawn before they existed.
LOGO_DEFAULTS = {"logoSize": "medium", "logoCorner": "top-right"}


def empty_project() -> dict:
    return {"fps": 30, "width": 1080, "height": 1920, "clips": [], "texts": [], "captions": {"enabled": False},
            "music": None, "voiceover": [], "primaries": {}, "showLogo": False, **LOGO_DEFAULTS}


def loudnorm_on(project: dict) -> bool:
    return (project.get("export") or {}).get("loudnorm", True)


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
    if "fit" in c and c["fit"] not in ("fill", "fit"):
        return "A clip's fit must be fill or fit."
    return None


TEXT_POSITIONS = ("top", "middle", "bottom")
TEXT_COLORS = ("brand", "white", "black")


def _check_text(t: dict, seen: set) -> Optional[str]:
    if not _id(t.get("id")):
        return "Every text needs an id."
    if t["id"] in seen:
        return "Two texts share an id."
    seen.add(t["id"])
    if not isinstance(t.get("text"), str) or not t["text"].strip():
        return "A text can't be empty."
    if len(t["text"]) > MAX_TEXT_CHARS:
        return f"A text can be at most {MAX_TEXT_CHARS} characters."
    if not _num(t.get("start")) or not _num(t.get("end")) or t["start"] < 0 or t["end"] <= t["start"]:
        return "A text must start at 0 or later and end after it starts."
    if t.get("position") not in TEXT_POSITIONS:
        return "A text's position must be top, middle or bottom."
    if t.get("color") not in TEXT_COLORS:
        return "A text's colour must be brand, white or black."
    return None


def _check_voice(v, voice_ids: Optional[set]) -> Optional[str]:
    if not isinstance(v, dict) or not _id(v.get("id")):
        return "Every voiceover needs an id."
    if voice_ids is not None and v["id"] not in voice_ids:
        return "A voiceover's audio file is missing."
    if v.get("source") not in VOICE_SOURCES:
        return "A voiceover's source must be tts, recording or upload."
    if not _num(v.get("start")) or v["start"] < 0:
        return "A voiceover must start at 0 or later."
    if not _num(v.get("volume")) or not 0 <= v["volume"] <= 2:
        return "Voiceover volume must be between 0 and 2."
    edits = v.get("edits", {})
    if not isinstance(edits, dict) or not all(isinstance(k, str) and isinstance(t, str) and len(t) <= MAX_TEXT_CHARS
                                              for k, t in edits.items()):
        return "A voiceover's line edits must map a page to text."
    return None


def _check_captions(cap: dict) -> Optional[str]:
    """The optional "from speech" fields of the captions: where the captions come from, and the timed lines made
    from the takes' speech (each is also editable text)."""
    if cap.get("source", "lines") not in ("lines", "speech"):
        return "The caption source must be lines or speech."
    if "speechKey" in cap and not (isinstance(cap["speechKey"], str) and len(cap["speechKey"]) <= 64):
        return "The caption speech key must be short text."
    speech = cap.get("speech")
    if speech is None:
        return None
    if not isinstance(speech, list) or len(speech) > MAX_SPEECH_CAPTIONS:
        return f"At most {MAX_SPEECH_CAPTIONS} speech captions."
    seen: set = set()
    for e in speech:
        if not isinstance(e, dict) or not _id(e.get("id")) or e["id"] in seen:
            return "Every speech caption needs its own id."
        seen.add(e["id"])
        if not isinstance(e.get("text"), str) or len(e["text"]) > MAX_TEXT_CHARS:
            return f"A speech caption can be at most {MAX_TEXT_CHARS} characters."
        if not _num(e.get("start")) or not _num(e.get("end")) or e["start"] < 0 or e["end"] <= e["start"]:
            return "A speech caption must start at 0 or later and end after it starts."
        words = e.get("words")
        if words is not None and not (isinstance(words, list) and len(words) <= MAX_CAPTION_WORDS and all(
                isinstance(w, dict) and isinstance(w.get("text"), str) and len(w["text"]) <= MAX_TEXT_CHARS
                and _num(w.get("start")) and _num(w.get("end")) and 0 <= w["start"] <= w["end"]
                and (w.get("key") is None or (isinstance(w["key"], str) and len(w["key"]) <= 80)) for w in words)):
            return "A speech caption's words need text and times."
    return None


def _check_fixes(fixes) -> Optional[str]:
    """Words corrected in the transcript: a word's key ("<take>:<ms>") to the text shown instead."""
    if not isinstance(fixes, dict) or len(fixes) > MAX_FIXES or not all(
            isinstance(k, str) and 0 < len(k) <= 80 and isinstance(v, str) and len(v) <= MAX_TEXT_CHARS for k, v in fixes.items()):
        return f"Transcript corrections must map a word to its text (at most {MAX_FIXES})."
    return None


LANES = ("text", "captions", "video", "voice", "music")


def _lanes_ok(lanes) -> bool:
    """The tracks switched off in the editor's track headers (the reel leaves them out of the export too)."""
    return isinstance(lanes, dict) and set(lanes) == {"hidden", "muted"} and all(
        isinstance(v, list) and len(v) <= len(LANES) and all(x in LANES for x in v) for v in lanes.values())


def check_project(doc, voice_ids: Optional[set] = None) -> Optional[str]:
    """One sentence about the first problem, or None. P3b fields are accepted when their type is right.
    With `voice_ids` (the ids in the plan's voice folder) every voiceover must point at one of them."""
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
    text_ids: set = set()
    for t in texts:
        if not isinstance(t, dict):
            return "Every text must be an object."
        problem = _check_text(t, text_ids)
        if problem:
            return problem
    if not isinstance(doc.get("captions"), dict) or not isinstance(doc["captions"].get("enabled"), bool):
        return "Captions need an enabled flag."
    problem = _check_captions(doc["captions"])
    if problem:
        return problem
    if "transcriptFixes" in doc:
        problem = _check_fixes(doc["transcriptFixes"])
        if problem:
            return problem
    if "lanes" in doc and not _lanes_ok(doc["lanes"]):
        return "Track switches must list hidden and muted tracks."
    music = doc.get("music")
    if music is not None and (not isinstance(music, dict) or not _num(music.get("volume"))
                              or not 0 <= music["volume"] <= 1):
        return "Music must be null or have a volume between 0 and 1."
    if music is not None and not isinstance(music.get("duck", True), bool):
        return "Music ducking must be true or false."
    exp = doc.get("export")
    if exp is not None and (not isinstance(exp, dict) or exp.get("preset", "tiktok") not in EXPORT_PRESETS
                            or not isinstance(exp.get("loudnorm", True), bool)):
        return "The export settings need a platform preset and a loudness switch."
    if not isinstance(doc.get("primaries"), dict) or not all(
            _id(k) and isinstance(v, dict) and v.get("kind") in ("generation", "take") and _id(v.get("id"))
            for k, v in doc["primaries"].items()):
        return "Primaries must map a shot id to a source."
    if not isinstance(doc.get("showLogo"), bool):
        return "showLogo must be true or false."
    if doc.get("logoSize", "medium") not in LOGO_SIZES:
        return "The logo size must be small, medium or large."
    if doc.get("logoCorner", "top-right") not in LOGO_CORNERS:
        return "The logo corner must be top-left, top-right, bottom-left or bottom-right."
    for v in voice:
        problem = _check_voice(v, voice_ids)
        if problem:
            return problem
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


# The project fields that change the rendered video. Anything else in the
# project (such as the pinned primaries) does not make an export stale.
RENDER_FIELDS = ("clips", "showLogo", "voiceover", "texts", "music", "captions")


def voice_folder(media: Path, idea_id: str) -> Optional[Path]:
    """<media>/<idea_id>/edit/voice, or None when the id would lead out of the media folder."""
    gen = generations.gen_folder(Path(media), idea_id)
    return gen.parent / "edit" / "voice" if gen is not None else None


def voice_file(media: Path, idea_id: str, vid) -> Optional[Path]:
    """The audio file of a voiceover, or None."""
    folder = voice_folder(media, idea_id)
    if folder is None or not _id(vid):
        return None
    return next((p for ext in VOICE_MIME if (p := folder / f"{vid}.{ext}").is_file()), None)


def voice_ids(media: Path, idea_id: str) -> set:
    folder = voice_folder(media, idea_id)
    found = set()
    if folder is not None and folder.is_dir():
        for p in folder.iterdir():
            if p.suffix.lstrip(".") in VOICE_MIME and not p.name.startswith("."):
                found.add(p.stem)
    return found


def voice_words(path: Path) -> Optional[list]:
    """The word timings saved beside a voice file, or None when there are none."""
    try:
        words = json.loads(path.with_name(f"{path.stem}.words.json").read_text())
    except (OSError, ValueError):
        return None
    return words if isinstance(words, list) else None


def transcribe_voice(path: Path, work: Path) -> list[dict]:
    """Word timings of a voice file: 16 kHz mono wav, then whisper.cpp. Raises cutting.CutError (with
    cutting.NO_WHISPER when whisper.cpp is not installed)."""
    wav = Path(work) / "voice.wav"
    cutting._ffmpeg(["-i", str(path), "-vn", "-ac", "1", "-ar", "16000", str(wav)], "Reading the voiceover")
    words = cutting.transcribe_words(wav, Path(work))
    total = cutting.probe(wav)["duration"]
    silences = cutting.find_silences(wav, total)
    if cutting.is_silent(silences, total):  # whisper writes "Thank you." for silence
        return []
    words = cutting.fit_to_silences(words, silences)
    return [{"text": text, "start": start, "end": end} for start, end, text in words]


def plan_client(conn, idea_id: str) -> dict:
    """The client record the plan belongs to ({} when there is none)."""
    if conn is None:
        return {}

    def stored(key):
        row = conn.execute("SELECT value FROM store WHERE key = ?", (key,)).fetchone()
        return json.loads(row[0]) if row else []

    idea = workspaces.workspace(conn, idea_id) or next((i for i in stored("ideas") if i.get("id") == idea_id), None)
    return next((c for c in stored("clients") if idea and c.get("id") == idea.get("clientId")), {})


def shot_lines(conn, idea_id: str) -> dict:
    """{shot id: the shot's script line} for the plan's shots that have a line. The captions read these, so a
    changed line makes an export stale."""
    if conn is None:
        return {}
    row = conn.execute("SELECT value FROM store WHERE key = 'ideas'").fetchone()
    idea = next((i for i in json.loads(row[0]) if i.get("id") == idea_id), None) if row else None
    shots = []
    for x in (idea.get("shots") or []) if idea else []:
        try:
            shots.append(Shot.model_validate(x))
        except ValueError:  # one bad shot must not break the export
            shots.append(Shot(time="", shot=""))
    return {s.id: s.line for s in fill_shot_ids(shots) if s.line and s.line.strip()}


def client_brand(conn, idea_id: str) -> dict:
    return plan_client(conn, idea_id).get("brand") or {}


def signature(conn, media: Path, idea: dict, project: dict) -> str:
    """A fingerprint of what an export was made from: the render-relevant project fields and the modified time
    of each footage file, voiceover file and the music file, and the client's brand kit (with the logo file name)."""
    files = _source_files(conn, media, idea["id"])
    stamps = {}
    for c in project["clips"]:
        key = source_key(c["source"])
        try:
            stamps[key] = files[key].stat().st_mtime_ns
        except (KeyError, OSError):
            stamps[key] = 0
    for v in project.get("voiceover") or []:
        path = voice_file(media, idea["id"], v.get("id")) if isinstance(v, dict) else None
        try:
            stamps[f"voice:{v.get('id')}"] = path.stat().st_mtime_ns if path else 0
        except OSError:
            stamps[f"voice:{v.get('id')}"] = 0
    if project.get("music"):  # a swapped music file (new id, or the same one rewritten) makes the export stale
        row = conn.execute("SELECT id, ext FROM cut_music WHERE idea_id = ?", (idea["id"],)).fetchone() if conn else None
        folder = renders.cut_folder(Path(media).resolve(), idea["id"])
        path = folder / f"music-{row[0]}.{row[1]}" if row and folder is not None else None
        try:
            stamps["music"] = f"{row[0]}:{path.stat().st_mtime_ns}" if path else 0
        except OSError:
            stamps["music"] = f"{row[0]}:0"
    relevant = {k: project.get(k) for k in RENDER_FIELDS}
    # Only a changed logo size or corner counts, so an export made before these fields existed stays current.
    relevant.update({k: project[k] for k, v in LOGO_DEFAULTS.items() if project.get(k, v) != v})
    if not loudnorm_on(project):  # on is the default, so an export made before the switch existed stays current
        relevant["loudnorm"] = False
    text = json.dumps([relevant, sorted(stamps.items()), client_brand(conn, idea["id"]),
                       shot_lines(conn, idea["id"]) if (project.get("captions") or {}).get("enabled") else {}],
                      sort_keys=True)
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
    client = plan_client(conn, idea["id"])
    kit = client.get("brand") or {}
    logo = kit.get("logo")
    logo_path = Path(media) / "brand" / client.get("id", "") / logo if logo else None
    if logo_path is not None and logo_path.is_file():
        files[logo] = logo_path
    else:
        logo = None
    music_url = None
    if project.get("music") and conn is not None:
        row = conn.execute("SELECT id, ext FROM cut_music WHERE idea_id = ?", (idea["id"],)).fetchone()
        folder = renders.cut_folder(Path(media).resolve(), idea["id"])
        if row and folder is not None and (folder / f"music-{row[0]}.{row[1]}").is_file():
            music_url = f"music-{row[0]}.{row[1]}"
            files[music_url] = folder / music_url
    voice = []
    for v in project.get("voiceover") or []:
        path = voice_file(media, idea["id"], v.get("id"))
        if path is not None:
            name = f"voice-{v['id']}{path.suffix}"
            files[name] = path
            voice.append({"id": v["id"], "url": name, "words": voice_words(path)})
    import finishing  # finishing imports this module
    duck = []
    if music_url and project["music"].get("duck", True):  # the music goes down under speech
        clips = project["clips"]
        starts = {v["id"]: v["start"] for v in project.get("voiceover") or []}
        spoken = [{"start": starts[v["id"]], "words": v["words"]} for v in voice]
        duck = finishing.duck_ranges(clips, finishing.duck_inputs(conn, idea["id"], clips), spoken)
    reel = {"project": project, "urls": urls, "lines": shot_lines(conn, idea["id"]), "musicUrl": music_url, "voice": voice,
            "duck": duck, "brand": {"font": kit.get("font", "Noto Sans TC"), "color": kit.get("color"), "logoUrl": logo},
            "fontUrl": ""}
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
        if workspaces.stale_project(conn, idea_id, project, workspaces.stored_load(conn)):
            raise cutting.CutError(renders.EDIT_STALE)
        sig = signature(conn, media, idea, project)
        if not project["clips"]:
            raise cutting.CutError(EMPTY)
        if missing_sources(project, sources):
            raise cutting.CutError(MISSING_SOURCE)
        if any(voice_file(media, idea_id, v.get("id")) is None for v in project.get("voiceover") or []):
            raise cutting.CutError(MISSING_VOICE)
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
                               "cacheDir": os.environ.get("REMOTION_CACHE_DIR", str(APP_DIR / ".remotion-bundle"))}))
    spawn_render([NODE, str(APP_DIR / "render" / "render-reel.mjs"), str(job)],
                 lambda p: step(0.05 + 0.9 * p, "Exporting"), RENDER_TIMEOUT_S, work.parent / "render.pid")
    if loudnorm_on(project):
        import finishing  # finishing imports this module
        step(0.96, "Setting the sound level")
        if not finishing.normalise(out, work):
            print("[editing] loudness pass skipped: nothing to measure, or ffmpeg failed", flush=True)
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


def make_router(db, load, media_dir: Callable[[], Path], gens) -> APIRouter:
    """`gens` is the generations router: the voiceover jobs use its budget, refund and job queue."""
    router = APIRouter()

    def gate(idea_id: str):
        found = workspaces.resolve(db, load, idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if not workspaces.editable(found):
            return error(409, renders.NOT_APPROVED)
        return None

    def read(conn, idea_id: str):
        row = conn.execute("SELECT version, doc FROM edit_projects WHERE idea_id = ?", (idea_id,)).fetchone()
        return (row[0], {**LOGO_DEFAULTS, **json.loads(row[1])}) if row else (0, empty_project())

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
            problem = check_project(body.get("project"), voice_ids(media_dir(), idea_id))
            if problem:
                return error(422, problem)
            if workspaces.workspace(conn, idea_id):
                available = _source_files(conn, media_dir(), idea_id)
                if any(source_key(c['source']) not in available for c in body['project']['clips']):
                    return error(422, "A clip's video was deleted. Remove it from the timeline first.")
                if body['project'].get('primaries'):
                    return error(422, 'Send the version and the project.')
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

    def voice_response(idea_id: str, vid: str, path: Path, duration: float) -> dict:
        """Transcribe the saved voice file (a sync step: the callers run it in the threadpool) and describe it.
        Without whisper.cpp the file is kept and `words` is null."""
        out = {"id": vid, "url": f"/api/{'workspaces' if idea_id.startswith('ws_') else 'ideas'}/{quote(idea_id, safe='')}/edit/voice/{quote(vid, safe='')}/file", "duration": duration, "words": None}
        try:
            with tempfile.TemporaryDirectory() as work:
                words = transcribe_voice(path, Path(work))
            path.with_name(f"{vid}.words.json").write_text(json.dumps(words))
            out["words"] = words
        except cutting.CutError as e:
            msg = str(e)  # our own NO_WHISPER sentence stays whole; anything else may quote ffmpeg, so scrub paths
            out["wordsError"] = msg if msg == cutting.NO_WHISPER else PATH_RE.sub("<path>", msg)[:MAX_ERROR_CHARS]
        return out

    def store_voice(idea_id: str, source: Path, ext: str):
        """Move `source` into the plan's voice folder under a new id: (vid, final path), or an error response."""
        folder = voice_folder(media_dir(), idea_id)
        if folder is None:
            return error(404, "That plan doesn't exist.")
        folder.mkdir(parents=True, exist_ok=True)
        vid = secrets.token_urlsafe(9)
        final = folder / f"{vid}.{ext}"
        os.replace(source, final)
        return vid, final

    def discard_voice(path):
        # These paths belong to the new voice id allocated by this request, never its source.
        for owned in (path, path.with_name(f'{path.stem}.words.json'), path.with_suffix('.gen')):
            owned.unlink(missing_ok=True)

    def finish_upload(idea_id: str, part: Path, ext: str, node_id=None, gen_id=None):
        try:
            info = cutting.probe(part)
            if info.get("hasAudio") and not info["duration"] > 0:
                # MediaRecorder streams WebM without a duration: copy the audio into a fresh container, which has one
                fixed = part.with_name(f"{part.name}.remux.{ext}")
                try:
                    cutting._ffmpeg(["-i", str(part), "-c", "copy", str(fixed)], "Reading the recording")
                    info = cutting.probe(fixed)
                    if not info["duration"] > 0:
                        raise cutting.CutError(NOT_AUDIO)
                    os.replace(fixed, part)
                finally:
                    fixed.unlink(missing_ok=True)
        except cutting.CutError:
            part.unlink(missing_ok=True)
            return error(415, NOT_AUDIO)
        if not info.get("hasAudio") or info["duration"] <= 0:
            part.unlink(missing_ok=True)
            return error(415, NOT_AUDIO)
        if info["duration"] > MAX_VOICE_S:
            part.unlink(missing_ok=True)
            return error(422, VOICE_TOO_LONG)
        stored = store_voice(idea_id, part, ext)
        if isinstance(stored, JSONResponse):
            part.unlink(missing_ok=True)
            return stored
        try:
            out = voice_response(idea_id, stored[0], stored[1], info["duration"])
            return attach_voice(idea_id, node_id, out, stored[1], gen_id) if node_id is not None else out
        except BaseException:
            discard_voice(stored[1])
            raise

    def voice_node(idea_id, node_id, conn=None):
        if conn is None:
            with db() as connection:
                return voice_node(idea_id, node_id, connection)
        if workspaces.workspace(conn, idea_id) is None:
            return None
        _, doc = workspaces.graph(conn, idea_id)
        if not any(n['id'] == node_id and (n['type'] == 'voice' or
                   (n['type'] == 'upload' and workspaces.media(n) == 'audio')) for n in doc['nodes']):
            return error(422, 'Send the node, the model and a prompt.')
        return None

    def attach_voice(idea_id, node_id, out, path, gen_id=None):
        copied, committed = None, False
        try:
            with db() as conn:
                conn.execute('BEGIN IMMEDIATE')
                if workspaces.workspace(conn, idea_id) is None:
                    if idea_id.startswith('ws_'):
                        return error(404, "That plan doesn't exist.")
                    committed = True  # legacy voice imports keep their existing response and markers
                    return out
                bad = voice_node(idea_id, node_id, conn)
                if bad:
                    return bad
                if gen_id is not None:
                    row = conn.execute(f'SELECT {generations.COLUMNS} FROM generations WHERE id=? AND idea_id=?',
                                       (gen_id, idea_id)).fetchone()
                    if row is None or row[2] != node_id or row[3] != 'voice' or row[7] != 'done' or \
                            workspaces.generation_stale(conn, idea_id, generations.to_json(row), workspaces.stored_load(conn)):
                        return error(409, renders.EDIT_STALE)
                    path.with_suffix('.gen').write_text(gen_id)
                else:
                    folder = generations.gen_folder(media_dir(), idea_id)
                    folder.mkdir(parents=True, exist_ok=True)
                    copied = folder / ('voice-' + out['id'] + path.suffix)
                    shutil.copyfile(path, copied)
                    gen = generations.insert_done(conn, idea_id, node_id, 'voice', 'upload', file=copied.name)
                    gen_id = gen['id']
                conn.execute('INSERT INTO workspace_voices VALUES (?,?,?,?)', (idea_id, out['id'], node_id, gen_id))
            committed = True
            return {**out, 'voiceId': out['id'], 'nodeId': node_id, 'genId': gen_id}
        finally:
            if not committed:
                discard_voice(path)
                if copied is not None:
                    copied.unlink(missing_ok=True)

    @router.put("/api/ideas/{idea_id}/edit/voice")
    async def put_voice(idea_id: str, request: Request, source: str = "", nodeId: str = ""):
        refused = gate(idea_id)
        if refused:
            return refused
        bad = voice_node(idea_id, nodeId)
        if bad:
            return bad
        if source not in ("recording", "upload"):
            return error(422, "Say whether this is a recording or an upload.")
        ext = VOICE_TYPES.get(request.headers.get("content-type", "").split(";")[0].strip().lower())
        if ext is None:
            return error(415, NOT_AUDIO)
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > MAX_VOICE_BYTES:
            return error(413, VOICE_TOO_BIG)
        folder = voice_folder(media_dir(), idea_id)
        if folder is None:
            return error(404, "That plan doesn't exist.")
        folder.mkdir(parents=True, exist_ok=True)
        part = folder / f".{secrets.token_urlsafe(9)}.part.{ext}"
        size = 0
        try:
            with part.open("wb") as f:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > MAX_VOICE_BYTES:
                        break
                    f.write(chunk)
            if size > MAX_VOICE_BYTES:
                part.unlink(missing_ok=True)
                return error(413, VOICE_TOO_BIG)
            return await run_in_threadpool(finish_upload, idea_id, part, ext, nodeId)
        except BaseException:
            part.unlink(missing_ok=True)
            raise

    @router.post("/api/ideas/{idea_id}/edit/voice/tts")
    async def voice_tts(idea_id: str, request: Request):
        independent = request.url.path.startswith('/api/workspaces/')
        try:
            body = await request.json()
        except ValueError:
            body = None
        refused = gate(idea_id)
        if refused:
            return refused
        if not isinstance(body, dict):
            return error(422, "Send the text, the model and confirm.")
        node_id = body.get('nodeId', generations.VOICE_NODE)
        bad = voice_node(idea_id, node_id)
        if bad:
            return bad
        stamp, version = None, None
        with db() as conn:
            if independent:
                if workspaces.workspace(conn, idea_id) is None:
                    return error(404, "That plan doesn't exist.")
                try:
                    version, resolved, stamp = workspaces.inputs(conn, idea_id, node_id, load)
                except ValueError as e:
                    return error(422, str(e))
                if type(body.get('canvasVersion')) is not int:
                    return error(422, 'Send the version and the canvas.')
                if body['canvasVersion'] != version:
                    return error(409, 'The canvas changed somewhere else. Reload it.')
                body = {**body, 'text': resolved['prompt'], 'model': resolved['model']}
        text, model_id = body.get("text"), body.get("model")
        model, _, bad = gens.check(idea_id, [], generations.VOICE_NODE, model_id, text, None, None, None, voice=True)
        if bad is not None:
            return bad
        usd = generations.estimate_usd(model, None, chars=len(text))
        wallet = gens.remaining()["voice"]
        left = round(max(0.0, wallet["cap"] - wallet["spent"]), 4)
        if body.get("confirm") is not True:  # a quote: nothing is spent
            return {"usd": usd, "remaining": left, **({'canvasVersion': version, 'inputStamp': stamp} if stamp else {})}
        if stamp:
            if body.get('inputStamp') != stamp:
                return error(409, 'The canvas changed somewhere else. Reload it.')
            return gens.confirm_workspace(idea_id, node_id, version, stamp, model,
                                          {'prompt': text, 'inputStamp': stamp, 'canvasVersion': version}, usd)
        blocked = gens.budget("voice", usd)  # spends the estimate; a failed job gives it back
        if blocked is not None:
            return blocked
        try:
            with db() as conn:
                out = generations.enqueue(conn, idea_id, node_id, "voice", model["id"],
                                          {'prompt': text, **({'inputStamp': stamp, 'canvasVersion': version} if stamp else {})}, usd)
        except Exception:
            gens.refund("voice", usd)
            raise
        gens.jobs.submit(out["id"])
        return JSONResponse(out, status_code=201)

    @router.post("/api/ideas/{idea_id}/edit/voice/from-gen/{gen_id}")
    async def voice_from_gen(idea_id: str, gen_id: str, request: Request, nodeId: str = ""):
        independent = request.url.path.startswith('/api/workspaces/')
        refused = gate(idea_id)
        if refused:
            return refused
        with db() as conn:
            row = conn.execute("SELECT kind, status, file FROM generations WHERE id = ? AND idea_id = ?",
                               (gen_id, idea_id)).fetchone()
        if row is None or row[0] != "voice":
            return error(404, "That voiceover doesn't exist.")
        try:
            body = await request.json()
        except ValueError:
            body = {}
        node_id = (body.get('nodeId') if isinstance(body, dict) else None) or nodeId
        bad = voice_node(idea_id, node_id)
        if bad:
            return bad
        with db() as conn:
            if independent:
                if workspaces.workspace(conn, idea_id) is None:
                    return error(404, "That plan doesn't exist.")
                grow = conn.execute(f'SELECT {generations.COLUMNS} FROM generations WHERE id=? AND idea_id=?', (gen_id, idea_id)).fetchone()
                if grow is None or grow[2] != node_id or workspaces.generation_stale(conn, idea_id, generations.to_json(grow), load):
                    return error(409, renders.EDIT_STALE)
        gen = generations.gen_folder(media_dir(), idea_id)
        source = gen / row[2] if gen is not None and row[1] == "done" and row[2] else None
        if source is None:
            return error(409, "That voiceover isn't ready yet.")
        if not source.is_file():
            return error(404, "That voiceover's file is gone.")
        return await run_in_threadpool(import_generated, idea_id, source, gen_id, node_id if independent else None)

    def import_generated(idea_id: str, source: Path, gen_id: str, node_id=None):
        folder = voice_folder(media_dir(), idea_id)
        if folder is None:
            return error(404, "That plan doesn't exist.")
        folder.mkdir(parents=True, exist_ok=True)
        claim = folder / f"{gen_id}.claim"
        try:  # one import per job: whoever creates the claim first copies, the other gets a 409
            os.close(os.open(claim, os.O_CREAT | os.O_EXCL | os.O_WRONLY))
        except FileExistsError:
            return error(409, VOICE_ALREADY_ADDED)
        done = False
        part = None
        try:
            ext = source.suffix.lstrip(".") or "mp3"
            part = folder / f".{secrets.token_urlsafe(9)}.part.{ext}"
            try:
                shutil.copyfile(source, part)
            except OSError:
                return error(404, "That voiceover's file is gone.")
            out = finish_upload(idea_id, part, ext, node_id, gen_id)  # includes transactional workspace attach
            if isinstance(out, dict):
                if node_id is None:  # legacy imports record their marker here; workspace attach did so atomically
                    (folder / f"{out['id']}.gen").write_text(gen_id)
                done = True
            return out
        finally:
            if part is not None:
                part.unlink(missing_ok=True)
            if not done:  # a failed import gives the job back, so it can be retried
                claim.unlink(missing_ok=True)

    @router.get("/api/ideas/{idea_id}/edit/voice/pending")
    def pending_voice(idea_id: str):
        """AI voice jobs of this plan that were never imported (the editor was left while one ran): finished ones
        and the ones still queued or running, each with its status."""
        refused = gate(idea_id)
        if refused:
            return refused
        folder = voice_folder(media_dir(), idea_id)
        taken = set()
        if folder is not None and folder.is_dir():
            taken = {p.read_text().strip() for p in folder.glob("*.gen")} | {p.stem for p in folder.glob("*.claim")}
        gen = generations.gen_folder(media_dir(), idea_id)
        with db() as conn:
            rows = conn.execute("SELECT id, file, created_at, status FROM generations WHERE idea_id = ? "
                                "AND kind = 'voice' AND status IN ('queued', 'running', 'done') "
                                "ORDER BY created_at, rowid", (idea_id,)).fetchall()
        return {"pending": [{"id": r[0], "createdAt": r[2], "status": r[3]} for r in rows
                            if r[0] not in taken
                            and (r[3] != "done" or (r[1] and gen is not None and (gen / r[1]).is_file()))]}

    @router.get("/api/ideas/{idea_id}/edit/voice")
    def list_voice(idea_id: str):
        """Every voiceover file of the plan with its length and word times, so a reloaded editor can play and caption them."""
        refused = gate(idea_id)
        if refused:
            return refused
        out = []
        for vid in sorted(voice_ids(media_dir(), idea_id)):
            path = voice_file(media_dir(), idea_id, vid)
            info = _probe(path) if path else None
            if path is None or info is None:
                continue
            out.append({"id": vid, "url": f"/api/{'workspaces' if idea_id.startswith('ws_') else 'ideas'}/{quote(idea_id, safe='')}/edit/voice/{quote(vid, safe='')}/file", "duration": info["duration"],
                        "words": voice_words(path)})
        with db() as conn:
            if workspaces.workspace(conn, idea_id):
                mapped = {r[0]: r[1:] for r in conn.execute('SELECT voice_id,node_id,gen_id FROM workspace_voices WHERE idea_id=?', (idea_id,))}
                out = [{**v, 'voiceId': v['id'], 'nodeId': mapped[v['id']][0], 'genId': mapped[v['id']][1]}
                       for v in out if v['id'] in mapped]
        return {"voices": out}

    @router.get("/api/ideas/{idea_id}/edit/voice/{vid}/file")
    def get_voice(idea_id: str, vid: str):
        refused = gate(idea_id)
        if refused:
            return refused
        path = voice_file(media_dir(), idea_id, vid)
        if path is None:
            return error(404, "That voiceover doesn't exist.")
        return FileResponse(path, media_type=VOICE_MIME[path.suffix.lstrip(".")])

    @router.delete("/api/ideas/{idea_id}/edit/voice/{vid}")
    def delete_voice(idea_id: str, vid: str):
        refused = gate(idea_id)
        if refused:
            return refused
        path = voice_file(media_dir(), idea_id, vid)
        if path is None:
            return error(404, "That voiceover doesn't exist.")
        # Read, check and unlink under the lock so a save from another tab cannot add the voice in between.
        with edit_lock:
            with db() as conn:
                saved = read(conn, idea_id)[1]
            if any(isinstance(v, dict) and v.get("id") == vid for v in saved.get("voiceover") or []):
                return error(409, VOICE_IN_USE)
            path.unlink(missing_ok=True)
            path.with_name(f"{vid}.words.json").unlink(missing_ok=True)
        return {"ok": True}

    return workspaces.aliases(router, db)

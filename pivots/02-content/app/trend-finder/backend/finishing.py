"""What happens to the sound and the hand-off of an edit: where the music is ducked under speech, the loudness pass on
the exported MP4 (-14 LUFS, -1 dBTP) and the EDL / OTIO files for Premiere and DaVinci Resolve. The first half is pure;
make_router at the end reads the saved edit project."""

import json
import math
import re
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

import analysis
import cutting
import editing
import renders
import suggest
import takes
import workspaces

FPS = 30
TARGET_LUFS, TARGET_TP, TARGET_LRA = -14.0, -1.0, 11.0
DUCK_JOIN_S = 0.4            # speech spans closer than this are one span, so the music does not pump between words
DUCK_MIN_S = 0.15            # a shorter blip of sound is not speech
AAC_RATE, AAC_BITRATE = "48000", "192k"

NOT_APPROVED = renders.NOT_APPROVED
BAD_DUCK = "Send the timeline clips and the voiceover."
NO_CLIPS = "Put at least one clip on the timeline first."


# ---- music ducking ----

def merge_spans(spans: list[list[float]], join: float = DUCK_JOIN_S, minimum: float = DUCK_MIN_S) -> list[list[float]]:
    out: list[list[float]] = []
    for s, e in sorted(spans):
        if out and s - out[-1][1] <= join:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return [[round(s, 3), round(e, 3)] for s, e in out if e - s >= minimum]


def clip_speech(results: dict, lo: float, hi: float) -> list[list[float]]:
    """Where someone speaks in [lo, hi] of a take, in take seconds. The words say so when there are any; with no speech
    recognition the sound itself does (everything that is not a pause); a take with no speech at all has none."""
    tr = results.get("transcript") or {}
    status = tr.get("status")
    if status == "ok":
        return [[w["start"], w["end"]] for w in suggest.in_range(tr.get("words") or [], lo, hi)]
    if status == "unavailable":
        spans, at = [], lo
        for s, e in sorted(results.get("silences") or []):
            if e <= lo or s >= hi:
                continue
            if s > at:
                spans.append([at, s])
            at = max(at, e)
        if at < hi:
            spans.append([at, hi])
        return spans
    return []


def duck_ranges(clips: list[dict], results_by_take: dict, voice: Optional[list[dict]] = None) -> list[list[float]]:
    """The timeline seconds [start, end] in which the music goes down: where the clips' speech is (a muted clip is not
    heard, so it does not count) and where a voiceover speaks. `voice` is [{start, words}] with the words' times
    relative to the voiceover file."""
    spans, at = [], 0.0
    for c in clips:
        length = c["out"] - c["in"]
        src = c.get("source") or {}
        if src.get("kind") == "take" and not c.get("muted") and (c.get("volume") or 0) > 0 and src.get("id") in results_by_take:
            for s, e in clip_speech(results_by_take[src["id"]], c["in"], c["out"]):
                s, e = max(s, c["in"]), min(e, c["out"])
                if e > s:
                    spans.append([at + s - c["in"], at + e - c["in"]])
        at += length
    for v in voice or []:
        for w in v.get("words") or []:
            spans.append([v["start"] + w["start"], v["start"] + w["end"]])
    return merge_spans(spans)


# ---- loudness ----

def loudnorm_filter(measured: Optional[dict] = None) -> str:
    """The loudnorm filter. With the numbers of a first pass it is the exact second pass (linear, no pumping)."""
    f = f"loudnorm=I={TARGET_LUFS:g}:TP={TARGET_TP:g}:LRA={TARGET_LRA:g}"
    if measured:
        f += (f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:measured_LRA={measured['input_lra']}"
              f":measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:linear=true:print_format=summary")
    else:
        f += ":print_format=json"
    return f


def measure_command(src: Path) -> list[str]:
    return ["ffmpeg", "-hide_banner", "-nostdin", "-nostats", "-i", str(src), "-vn", "-af", loudnorm_filter(), "-f", "null", "-"]


def apply_command(src: Path, dst: Path, measured: dict) -> list[str]:
    """Second pass: the picture is copied untouched, only the sound is encoded again."""
    return ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(src), "-map", "0:v", "-map", "0:a", "-c:v", "copy",
            "-af", loudnorm_filter(measured), "-c:a", "aac", "-b:a", AAC_BITRATE, "-ar", AAC_RATE,
            "-movflags", "+faststart", str(dst)]


def parse_measured(stderr: str) -> Optional[dict]:
    """The numbers loudnorm prints after the first pass; None for silence (-inf) or when there is no block."""
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", stderr or "", re.S)
    if not m:
        return None
    try:
        raw = json.loads(m.group(0))
        out = {k: float(raw[k]) for k in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")}
    except (ValueError, KeyError):
        return None
    return out if all(math.isfinite(v) for v in out.values()) else None


def normalise(path: Path, work: Path, run: Callable = cutting.run) -> bool:
    """Set the exported MP4 to -14 LUFS integrated with a -1 dBTP ceiling, in place. True when it was changed; False when
    the video has no level to measure (silence) or the run failed, in which case the file is left as it was."""
    first = run(measure_command(path))
    measured = parse_measured(first.stderr) if first.returncode == 0 else None
    if measured is None:
        return False
    out = work / "levelled.mp4"
    out.unlink(missing_ok=True)
    second = run(apply_command(path, out, measured))
    if second.returncode != 0 or not out.is_file() or out.stat().st_size == 0:
        out.unlink(missing_ok=True)
        return False
    out.replace(path)
    return True


# ---- EDL / OTIO ----

def timecode(frames: int, fps: int = FPS) -> str:
    """Non-drop-frame HH:MM:SS:FF."""
    frames = max(0, int(frames))
    ff = frames % fps
    s = frames // fps
    return f"{s // 3600:02d}:{s // 60 % 60:02d}:{s % 60:02d}:{ff:02d}"


REEL_START = 3600 * FPS  # records begin at 01:00:00:00, the usual start of an edit timeline


def reel_names(names: dict[str, str]) -> dict[str, str]:
    """source key -> a reel name made from the file name: letters, digits, - and _ only, and unique."""
    out, used = {}, set()
    for key, name in names.items():
        stem = re.sub(r"[^A-Za-z0-9_-]+", "_", Path(name).stem).strip("_")[:32] or "CLIP"
        reel, k = stem, 2
        while reel in used:
            reel, k = f"{stem[:29]}_{k}", k + 1
        used.add(reel)
        out[key] = reel
    return out


def edl_events(clips: list[dict], names: dict[str, str], fps: int = FPS) -> list[dict]:
    """One event per clip: reel, source in/out and record in/out in frames (the record starts at 01:00:00:00)."""
    reels = reel_names(names)
    out, at = [], 0
    for i, c in enumerate(clips, 1):
        key = editing.source_key(c["source"])
        a, b = round(c["in"] * fps), round(c["out"] * fps)
        n = max(1, b - a)
        out.append({"n": i, "reel": reels.get(key, "CLIP"), "name": names.get(key, key), "src_in": a, "src_out": a + n,
                    "rec_in": REEL_START + at, "rec_out": REEL_START + at + n, "audio": not c.get("muted")})
        at += n
    return out


def edl_text(title: str, events: list[dict], fps: int = FPS) -> str:
    """A CMX3600 EDL (non-drop-frame), video and audio on one event unless the clip is muted."""
    safe = re.sub(r"[\r\n]+", " ", title or "BuildClub edit").strip()[:60]
    lines = [f"TITLE: {safe}", "FCM: NON-DROP FRAME", ""]
    for e in events:
        track = "AA/V" if e["audio"] else "V"
        lines.append(f"{e['n']:03d}  {e['reel']:<8s} {track:<5s} C        {timecode(e['src_in'], fps)} {timecode(e['src_out'], fps)} "
                     f"{timecode(e['rec_in'], fps)} {timecode(e['rec_out'], fps)}")
        lines.append(f"* FROM CLIP NAME: {e['name']}")
    return "\n".join(lines) + "\n"


def otio_doc(title: str, events: list[dict], fps: int = FPS) -> dict:
    """A minimal OpenTimelineIO JSON (Timeline.1 with one video track); each clip points at its media by file name."""
    def rt(frames):
        return {"OTIO_SCHEMA": "RationalTime.1", "rate": fps, "value": frames}

    def tr(start, frames):
        return {"OTIO_SCHEMA": "TimeRange.1", "start_time": rt(start), "duration": rt(frames)}

    clips = [{"OTIO_SCHEMA": "Clip.1", "name": e["name"], "source_range": tr(e["src_in"], e["src_out"] - e["src_in"]),
              "media_reference": {"OTIO_SCHEMA": "ExternalReference.1", "target_url": e["name"], "name": e["reel"]},
              "metadata": {"reel": e["reel"], "audio": e["audio"]}} for e in events]
    return {"OTIO_SCHEMA": "Timeline.1", "name": title, "global_start_time": rt(REEL_START),
            "tracks": {"OTIO_SCHEMA": "Stack.1", "name": "tracks", "children": [
                {"OTIO_SCHEMA": "Track.1", "name": "Video 1", "kind": "Video", "children": clips}]}}


# ---- routes ----

def make_router(db, load, media_dir: Callable[[], Path]) -> APIRouter:
    router = APIRouter()

    def error(code: int, message: str, **extra) -> JSONResponse:
        return JSONResponse({"error": message, **extra}, status_code=code)

    def gate(idea_id: str):
        found = workspaces.resolve(db, load, idea_id)
        if found is None:
            return error(404, suggest.NO_PLAN)
        return None if workspaces.editable(found) else error(409, NOT_APPROVED)

    @router.get("/api/ideas/{idea_id}/edit/edl")
    def edl(idea_id: str, format: str = "edl"):
        """The saved timeline as a CMX3600 EDL (or OTIO JSON with ?format=otio) for Premiere or DaVinci Resolve."""
        refused = gate(idea_id)
        if refused:
            return refused
        with db() as conn:
            row = conn.execute("SELECT doc FROM edit_projects WHERE idea_id = ?", (idea_id,)).fetchone()
            project = json.loads(row[0]) if row else editing.empty_project()
            names = {f"take:{r[0]}": r[5] for r, _ in takes.rows_of(conn, idea_id)}
        if not project["clips"]:
            return error(409, NO_CLIPS)
        for c in project["clips"]:
            key = editing.source_key(c["source"])
            names.setdefault(key, f"{c['source']['kind']}-{c['source']['id']}.mp4")
        title = f"BuildClub {idea_id}"
        events = edl_events(project["clips"], {editing.source_key(c["source"]): names[editing.source_key(c["source"])] for c in project["clips"]})
        if format == "otio":
            return Response(json.dumps(otio_doc(title, events), indent=2), media_type="application/json",
                            headers={"Content-Disposition": 'attachment; filename="timeline.otio"'})
        return Response(edl_text(title, events), media_type="text/plain; charset=utf-8",
                        headers={"Content-Disposition": 'attachment; filename="timeline.edl"'})

    @router.post("/api/ideas/{idea_id}/edit/duck")
    async def duck(idea_id: str, request: Request):
        """Where the music goes down for the timeline sent (the editor's preview asks; the export works it out itself)."""
        try:
            body = await request.json()
        except ValueError:
            body = None
        refused = gate(idea_id)
        if refused:
            return refused
        clips = body.get("clips") if isinstance(body, dict) else None
        voice = body.get("voiceover") if isinstance(body, dict) else []
        if not isinstance(clips, list) or len(clips) > editing.MAX_CLIPS or not isinstance(voice, list):
            return error(422, BAD_DUCK)
        try:
            clean = [{"source": {"kind": c["source"]["kind"], "id": c["source"]["id"]}, "in": float(c["in"]), "out": float(c["out"]),
                      "volume": float(c.get("volume", 1)), "muted": bool(c.get("muted"))} for c in clips]
        except (KeyError, TypeError, ValueError):
            return error(422, BAD_DUCK)
        with db() as conn:
            results = duck_inputs(conn, idea_id, clean)
        return {"ranges": duck_ranges(clean, results, voice_words(media_dir(), idea_id, voice))}

    return router


def duck_inputs(conn, idea_id: str, clips: list[dict]) -> dict:
    """take id -> its stored analysis results, for the takes the clips use (a take not yet analysed is left out)."""
    out = {}
    for c in clips:
        src = c["source"]
        if src["kind"] == "take" and src["id"] not in out:
            got = analysis.full(conn, src["id"])
            if got and got["status"] == "done" and got["results"]:
                out[src["id"]] = got["results"]
    return out


def voice_words(media: Path, idea_id: str, voice: list) -> list[dict]:
    """[{start, words}] of the voiceover segments, for duck_ranges."""
    out = []
    for v in voice:
        if not isinstance(v, dict) or not isinstance(v.get("start"), (int, float)):
            continue
        path = editing.voice_file(media, idea_id, v.get("id"))
        words = editing.voice_words(path) if path else None
        if words:
            out.append({"start": float(v["start"]), "words": words})
    return out

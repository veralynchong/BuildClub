"""Clean a real take: cut its filler words and long pauses and save the result as a new take, which becomes
the shot's chosen one. The original stays. Only real takes are cleaned, never AI clips."""

import os
import secrets
import shutil
import threading
import time
from pathlib import Path
from typing import Callable

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

import cutting
import takes
from cutting import CutError
from editing import MAX_ERROR_CHARS, PATH_RE

MAX_CLEAN_S = 180
MIN_CUT_S = 0.1   # less than this removed and there is nothing worth a new take
MIN_KEEP_S = 1.0  # less than this left and the copy would be useless

NO_AUDIO = "This take has no sound, so there is nothing to clean."
NO_SPEECH = "No speech was found in this take, so nothing was cut."
NOTHING = "This take has no fillers or long pauses to cut."
TOO_SHORT = "Less than a second would be left after cleaning, so nothing was made."
TOO_LONG = f"This take is longer than {MAX_CLEAN_S // 60} minutes, so it can't be cleaned."
ALREADY_CLEAN = "This take is already cleaned."
HAS_CLEAN = "This take already has a cleaned copy."
CLEANING = "This take is already being cleaned."
NOT_APPROVED = "Only an approved plan can take footage."
CONTENT_ERRORS = {NO_AUDIO, NO_SPEECH, NOTHING, TOO_SHORT, TOO_LONG}

words_fn = cutting.transcribe_words  # looked up at call time, so a test can swap it

_cleaning: set[str] = set()
_cleaning_lock = threading.Lock()


def clean_take(src: Path, work: Path, out: Path) -> dict:
    """Write a cleaned copy of `src` to `out` (mp4); raises CutError with a one-sentence reason."""
    info = cutting.probe(src)
    if not info["hasAudio"]:
        raise CutError(NO_AUDIO)
    total = info["duration"]
    if total > MAX_CLEAN_S:
        raise CutError(TOO_LONG)
    wav = work / "audio.wav"
    cutting._ffmpeg(["-i", str(src), "-vn", "-ac", "1", "-ar", "16000", str(wav)], "Reading the sound")
    silences = cutting.find_silences(wav, total)
    if cutting.is_silent(silences, total):
        raise CutError(NO_SPEECH)
    words = words_fn(wav, work)
    if not words:
        raise CutError(NO_SPEECH)
    keeps = cutting.keep_intervals(words, silences, total)
    kept = sum(b - a for a, b in keeps)
    if total - kept < MIN_CUT_S:
        raise CutError(NOTHING)
    if kept < MIN_KEEP_S:
        raise CutError(TOO_SHORT)
    graph = work / "clean.txt"
    graph.write_text(cutting.build_clean_graph(keeps), encoding="utf-8")
    part = out.with_suffix(".part")
    try:
        cutting._ffmpeg(["-i", str(src), "-/filter_complex", str(graph), "-map", "[v]", "-map", "[a]",
                         "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
                         "-f", "mp4", str(part)], "Cutting the take")
        os.replace(part, out)
    finally:
        part.unlink(missing_ok=True)
    trims = [{k: v for k, v in t.items() if k != "shot"}
             for t in cutting.describe_trims(keeps, words, [total], total)]
    return {"originalSec": total, "cleanSec": cutting.probe(out)["duration"], "trims": trims}


def error(status: int, message: str) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=status)


def make_router(db, load, media_dir: Callable[[], Path]) -> APIRouter:
    router = APIRouter()

    def find_idea(idea_id: str):
        return next((i for i in load("ideas") or [] if i["id"] == idea_id), None)

    def check(conn, idea_id: str, take_id: str):
        """(take row, shot id list) when the take can be cleaned now, else the error response."""
        found = find_idea(idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if found["status"] != "approved":
            return error(409, NOT_APPROVED)
        ids = takes.shot_ids_of(conn, idea_id)
        takes.backfill(conn, idea_id, ids)
        row = conn.execute(f"SELECT {takes.COLUMNS} FROM takes WHERE id = ? AND idea_id = ?",
                           (take_id, idea_id)).fetchone()
        if row is None:
            return error(404, "That take doesn't exist.")
        if row[9]:
            return error(409, ALREADY_CLEAN)
        if conn.execute("SELECT 1 FROM takes WHERE cleaned_from = ?", (take_id,)).fetchone():
            return error(409, HAS_CLEAN)
        where, args = takes.same_shot(row[8], row[2])
        count = conn.execute(f"SELECT COUNT(*) FROM takes WHERE idea_id = ? AND {where}", (idea_id, *args)).fetchone()[0]
        if count >= takes.MAX_TAKES_PER_SHOT:
            return error(409, f"This shot has the most takes it can hold ({takes.MAX_TAKES_PER_SHOT}).")
        return row, ids

    def failed(idea_id: str, e: CutError) -> JSONResponse:
        message = str(e)
        if message in (cutting.NO_FFMPEG, cutting.NO_WHISPER):
            return error(503, message)
        if message in CONTENT_ERRORS:
            return error(422, message)
        print(f"[clean] {idea_id} failed: {message}", flush=True)  # the full text stays in the log
        return error(422, PATH_RE.sub("<path>", message)[:MAX_ERROR_CHARS])

    @router.post("/api/ideas/{idea_id}/takes/{take_id}/clean")
    async def clean(idea_id: str, take_id: str):
        with db() as conn:
            got = check(conn, idea_id, take_id)
        if isinstance(got, JSONResponse):
            return got
        row = got[0]
        missing = cutting.missing_tools()
        if missing:
            return error(503, missing)
        root = media_dir().resolve()
        folder = (root / idea_id).resolve()
        if folder.parent != root:
            return error(404, "That plan doesn't exist.")
        with _cleaning_lock:
            if take_id in _cleaning:
                return error(409, CLEANING)
            _cleaning.add(take_id)
        work = folder / f".clean-{take_id}"
        saved = False
        new_id = secrets.token_urlsafe(9)
        out = folder / f"{new_id}.mp4"
        try:
            work.mkdir(parents=True, exist_ok=True)
            try:
                result = await run_in_threadpool(clean_take, folder / f"{take_id}.{row[3]}", work, out)
            except CutError as e:
                return failed(idea_id, e)
            with takes.takes_lock, db() as conn:
                again = check(conn, idea_id, take_id)  # the plan or the take may have changed meanwhile
                if isinstance(again, JSONResponse):
                    out.unlink(missing_ok=True)
                    return again
                old, ids = again
                where, args = takes.same_shot(old[8], old[2])
                conn.execute(f"UPDATE takes SET chosen = 0 WHERE idea_id = ? AND {where}", (idea_id, *args))
                new = (new_id, idea_id, old[2], "mp4", out.stat().st_size, old[5], 1, int(time.time() * 1000),
                       old[8], take_id)
                conn.execute(f"INSERT INTO takes ({takes.COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", new)
                listed = [takes.to_json(r, i) for r, i in takes.rows_of(conn, idea_id)]
                mine = takes.to_json(new, takes.current_index(new, ids))
            saved = True
            return JSONResponse({"take": mine, "takes": listed, **result}, status_code=201)
        finally:
            shutil.rmtree(work, ignore_errors=True)
            if not saved:
                out.unlink(missing_ok=True)
                out.with_suffix(".part").unlink(missing_ok=True)
            with _cleaning_lock:
                _cleaning.discard(take_id)

    return router

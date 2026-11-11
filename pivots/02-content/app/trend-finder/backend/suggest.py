"""AI edit suggestions for the editor, worked out from what analysis.py stored for a take (words with times,
silences, loudness). Nothing here looks at the video again and nothing is applied: every function returns a
proposal that a person accepts item by item. The first half is pure (lists in, lists out); make_router at the
end reads the stored analysis and adds the routes."""

import difflib
import json
import math
import re
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

import analysis
import cutting
import editing
import renders
import takes
import workspaces

FPS = 30
PAD_DEFAULT, PAD_MAX = 4, 10     # frames of air kept around a cut (research: 3 to 6 frames, default 4 at 30 fps)
MIN_KEEP = 0.2                   # seconds; the editor cannot hold a clip shorter than this
START_SILENCE_MIN = 0.3         # dead air before the first word is offered sooner; padding must not leak the next word's attack into it
SILENCE_ITEM_MIN = 0.6           # a pause shorter than this is natural speech, so it is not offered
LONG_PAUSE = 1.0                 # a pause in the middle of a take this long counts against the take when ranking
CAPTION_MAX_WORDS, CAPTION_MAX_S, CAPTION_PAUSE = 4, 1.2, 0.35
MAX_CAPTIONS = editing.MAX_SPEECH_CAPTIONS
RETAKE_WORDS = 3                 # a phrase whose first 3 words come again later is a false start
RETAKE_REACH = 30                # ... when the repeat is within this many words
TARGET_LUFS = -14.0
LIKE = "like"                    # a filler only when whisper set it off with a comma

NOT_READY = "The analysis of this video isn't ready yet. Try again in a moment."
ANALYSIS_FAILED = "This video couldn't be analysed, so there are no suggestions for it."
NO_TAKE = "That take doesn't exist."
NO_PLAN = "That plan doesn't exist."
BAD_RANGE = "Send a valid in and out for the clip."
BAD_REMOVALS = "Send the parts to remove as start and end times."
NOTHING_LEFT = "Nothing would be left of the clip."
BAD_CLIPS = "Send the timeline clips to caption."

PUNCT_END = re.compile(r"[.!?。！？]$")
COMMA_END = re.compile(r"[,;:，；：、]$")


# ---- words ----

def norm(text: str) -> str:
    """A word for comparing: lower case, no punctuation or apostrophes."""
    return re.sub(r"[\W_]+", "", text.lower().replace("'", "").replace("’", ""))


def script_tokens(line: str) -> list[tuple[str, str]]:
    """(as written, normalised) for each word of a script line; a Chinese character is a word of its own,
    like the word list whisper gives for Chinese."""
    out = []
    for piece in (line or "").split():
        if cutting.CJK_RE.search(piece):
            out += [(ch, norm(ch)) for ch in piece if norm(ch)]
        elif norm(piece):
            out.append((piece, norm(piece)))
    return out


def in_range(words: list[dict], lo: float, hi: float) -> list[dict]:
    """The words whose middle falls inside [lo, hi]."""
    return [w for w in words if lo <= (w["start"] + w["end"]) / 2 <= hi]


def is_filler(words: list[dict], i: int) -> bool:
    text = words[i]["text"]
    if cutting.is_filler(text):
        return True
    if norm(text) != LIKE:
        return False
    # "I was, like, tired" is a filler; "things like this" is not.
    return bool(COMMA_END.search(text.strip())) or (i > 0 and bool(COMMA_END.search(words[i - 1]["text"].strip())))


# ---- 1. captions from speech ----

def caption_chunks(words: list[dict]) -> list[dict]:
    """Short caption lines from timed words: at most 4 words and 1.2 s each, and a line ends at a sentence mark,
    at a comma once it holds two words, and at a pause. Filler words are left out of the text."""
    spoken = [w for i, w in enumerate(words) if not is_filler(words, i) and norm(w["text"])]
    out, cur = [], []

    def flush():
        if cur:
            out.append({"start": cur[0]["start"], "end": cur[-1]["end"], "text": " ".join(w["text"].strip() for w in cur)})
            cur.clear()

    for w in spoken:
        if cur and (w["start"] - cur[-1]["end"] > CAPTION_PAUSE or w["end"] - cur[0]["start"] > CAPTION_MAX_S + 1e-6):
            flush()
        cur.append(w)
        text = w["text"].strip()
        if len(cur) >= CAPTION_MAX_WORDS or PUNCT_END.search(text) or (COMMA_END.search(text) and len(cur) >= 2):
            flush()
    flush()
    return out


def timeline_captions(clips: list[dict], words_by_take: dict[str, list[dict]]) -> list[dict]:
    """Caption entries on the timeline. `clips` are the timeline clips in order ({source: {kind, id}, in, out});
    each take clip shows the words of its take that fall inside its in/out, moved to the clip's place."""
    out, at = [], 0.0
    for c in clips:
        length = c["out"] - c["in"]
        src = c.get("source") or {}
        if src.get("kind") == "take":
            for ch in caption_chunks(in_range(words_by_take.get(src.get("id"), []), c["in"], c["out"])):
                start = at + max(0.0, ch["start"] - c["in"])
                end = at + min(length, ch["end"] - c["in"])
                if end - start > 0.05:
                    out.append({"start": round(start, 3), "end": round(end, 3), "text": ch["text"]})
        at += length
    out = out[:MAX_CAPTIONS]
    return [{"id": f"sp{i + 1}", **e} for i, e in enumerate(out)]


# ---- 2. clean-cut suggestions ----

def silence_items(silences: list, lo: float, hi: float, min_len: float = SILENCE_ITEM_MIN) -> list[dict]:
    out = []
    for s, e in silences:
        s, e = max(s, lo), min(e, hi)
        where = "start" if s <= lo + 0.05 else "end" if e >= hi - 0.05 else "middle"
        if e - s < (min(min_len, START_SILENCE_MIN) if where == "start" else min_len):
            continue
        out.append({"id": f"s{round(s * 1000)}", "type": "silence", "start": round(s, 3), "end": round(e, 3), "where": where,
                    "label": f"Silence {e - s:.1f} s", "reason": f"No one speaks for {e - s:.1f} seconds."})
    return out


def filler_items(words: list[dict]) -> list[dict]:
    return [{"id": f"f{round(w['start'] * 1000)}", "type": "filler", "start": round(w["start"], 3), "end": round(w["end"], 3),
             "text": w["text"].strip(" ,.;:!?"), "label": f"“{w['text'].strip(' ,.;:!?')}”",
             "reason": "A filler word the viewer does not need."}
            for i, w in enumerate(words) if is_filler(words, i)]


def retake_items(words: list[dict]) -> list[dict]:
    """The earlier try of a phrase said again: when the first 3 words of a phrase come again within 30 words, everything
    from the first try up to the second is offered for removal."""
    ws = [w for w in words if norm(w["text"])]
    keys = [norm(w["text"]) for w in ws]
    out, i = [], 0
    while i + RETAKE_WORDS <= len(ws):
        key = keys[i:i + RETAKE_WORDS]
        j = next((j for j in range(i + RETAKE_WORDS, min(len(ws) - RETAKE_WORDS + 1, i + RETAKE_REACH))
                  if keys[j:j + RETAKE_WORDS] == key), None)
        if j is None:
            i += 1
            continue
        said = " ".join(w["text"].strip() for w in ws[i:j])
        out.append({"id": f"r{round(ws[i]['start'] * 1000)}", "type": "retake", "start": round(ws[i]["start"], 3),
                    "end": round(ws[j]["start"], 3), "text": said, "label": f"Retake: “{said}”",
                    "reason": f"This phrase is said again at {ws[j]['start']:.1f} s; the first try can go."})
        i = j
    return out


def cleanup_items(results: dict, lo: float, hi: float) -> list[dict]:
    """Everything the clean-up could remove from [lo, hi] of a take, by time. Silences come from the pause map
    (which needs no speech recognition); fillers and retakes need the words."""
    tr = results.get("transcript") or {}
    words = in_range(tr.get("words") or [], lo, hi) if tr.get("status") == "ok" else []
    items = silence_items(results.get("silences") or [], lo, hi) + filler_items(words) + retake_items(words)
    return sorted(items, key=lambda x: (x["start"], x["end"]))


def _frame(sec: float) -> float:
    return round(sec * FPS) / FPS


def keep_ranges(lo: float, hi: float, removals: list, pad_frames: int = PAD_DEFAULT) -> list[list[float]]:
    """The parts of [lo, hi] left after the removals, as [start, end] seconds on whole frames. Each part grows by the
    padding into the cut beside it, so the word before a cut keeps its tail and the word after keeps its attack. A cut
    that the padding closes (shorter than 0.2 s, or than twice the padding) is undone, and a part shorter than the
    editor's 0.2 s minimum is dropped."""
    pad = min(max(int(pad_frames), 0), PAD_MAX) / FPS
    cuts = sorted([max(lo, min(r[0], r[1])), min(hi, max(r[0], r[1]))] for r in removals)
    cuts = [c for c in cuts if c[1] > c[0]]
    merged: list[list[float]] = []
    for s, e in cuts:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    keeps, at = [], lo
    for s, e in merged:
        if s > at:
            keeps.append([at, s])
        at = max(at, e)
    if at < hi:
        keeps.append([at, hi])
    keeps = [[max(lo, k[0] - pad) if k[0] > lo else k[0], min(hi, k[1] + pad) if k[1] < hi else k[1]] for k in keeps]
    joined: list[list[float]] = []
    for k in keeps:
        if joined and (k[0] - joined[-1][1]) < MIN_KEEP:  # a cut under 0.2 s is not worth a seam
            joined[-1][1] = max(joined[-1][1], k[1])
        else:
            joined.append(k)
    framed = [[_frame(k[0]), _frame(k[1])] for k in joined]
    return [k for k in framed if k[1] - k[0] >= MIN_KEEP - 1e-6]


# ---- 3. script alignment ----

def align_script(words: list[dict], line: Optional[str], duration: float, pad_frames: int = PAD_DEFAULT) -> dict:
    """Where the shot's script line is spoken in the take, by difflib on normalised words: the in/out run from the first
    to the last matched word plus the padding, with the share of the line that was found and the phrases that were not."""
    script = script_tokens(line or "")
    if not script:
        return {"status": "manual"}  # no spoken line (B-roll): the person trims it by hand
    spoken = [w for w in words if norm(w["text"])]
    tries = retake_items(spoken)  # a line said twice is taken from the last try: the earlier one is the retake's
    spoken = [w for w in spoken if not any(r["start"] - 1e-6 <= w["start"] and w["end"] <= r["end"] + 1e-6 for r in tries)]
    if not spoken:
        return {"status": "ok", "coverage": 0.0, "matched": 0, "total": len(script), "in": None, "out": None,
                "missing": [" ".join(raw for raw, _ in script)]}
    sm = difflib.SequenceMatcher(None, [n for _, n in script], [norm(w["text"]) for w in spoken], autojunk=False)
    least = 2 if len(script) >= 4 else 1  # a lone matching word in a longer line is chance, not the line
    blocks = [b for b in sm.get_matching_blocks() if b.size >= least]
    hit = {b.a + k for b in blocks for k in range(b.size)}
    missing, run = [], []
    for k, (raw, _) in enumerate(script):
        if k in hit:
            if run:
                missing.append(" ".join(run))
            run = []
        else:
            run.append(raw)
    if run:
        missing.append(" ".join(run))
    out = {"status": "ok", "coverage": round(len(hit) / len(script), 3), "matched": len(hit), "total": len(script),
           "in": None, "out": None, "missing": missing}
    if blocks:
        pad = min(max(int(pad_frames), 0), PAD_MAX) / FPS
        first, last = spoken[blocks[0].b], spoken[blocks[-1].b + blocks[-1].size - 1]
        out["in"] = _frame(max(0.0, first["start"] - pad))
        out["out"] = _frame(min(duration, last["end"] + pad)) if duration else _frame(last["end"] + pad)
    return out


# ---- 4. take ranking ----

WEIGHTS = {"coverage": 60, "fillers": 12, "silences": 10, "retakes": 10, "loudness": 8}


def take_metrics(results: dict, line: Optional[str], pad_frames: int = PAD_DEFAULT) -> dict:
    tr = results.get("transcript") or {}
    speech = tr.get("status") or "none"
    words = tr.get("words") or [] if speech == "ok" else []
    duration = results.get("duration") or 0.0
    align = align_script(words, line, duration, pad_frames)
    fillers = len(filler_items(words))
    retakes = len(retake_items(words))
    pauses = len([s for s in silence_items(results.get("silences") or [], 0.0, duration, LONG_PAUSE) if s["where"] == "middle"])
    lufs = (results.get("loudness") or {}).get("integratedLufs")
    coverage = align.get("coverage") if align["status"] == "ok" else None
    if coverage is not None and speech == "unavailable":
        coverage = None  # no speech recognition: nothing to compare the line with
    return {"speech": speech, "coverage": coverage, "fillers": fillers, "longPauses": pauses, "retakes": retakes,
            "lufs": lufs, "in": align.get("in"), "out": align.get("out"), "missing": align.get("missing") or [],
            "words": len(words)}


def score_take(m: dict) -> float:
    """0 to 100. The script line counts most; a take with no line to compare keeps the other four parts, scaled up."""
    parts = {"fillers": 1 - min(m["fillers"], 4) / 4, "silences": 1 - min(m["longPauses"], 3) / 3,
             "retakes": 1 - min(m["retakes"], 2) / 2,
             "loudness": 0.5 if m["lufs"] is None else 1 - min(abs(m["lufs"] - TARGET_LUFS), 14) / 14}
    if m["coverage"] is not None:
        parts["coverage"] = m["coverage"]
    got = sum(WEIGHTS[k] * v for k, v in parts.items())
    return round(100 * got / sum(WEIGHTS[k] for k in parts), 1)


def reason_of(m: dict) -> str:
    bits = []
    if m["coverage"] is not None:
        bits.append(f"covers {round(m['coverage'] * 100)}% of the line")
    elif m["speech"] == "unavailable":
        bits.append("speech couldn't be read")
    else:
        bits.append("no script line to compare")
    bits.append(f"{m['fillers']} {'filler' if m['fillers'] == 1 else 'fillers'}")
    if m["longPauses"]:
        bits.append(f"{m['longPauses']} long {'pause' if m['longPauses'] == 1 else 'pauses'}")
    if m["retakes"]:
        bits.append(f"{m['retakes']} {'retake' if m['retakes'] == 1 else 'retakes'}")
    return ", ".join(bits)


def rank_takes(candidates: list[dict], line: Optional[str], limit: int = 3) -> list[dict]:
    """`candidates` are {id, name, chosen, results}. The best `limit`, each with its score, metrics and a one-line reason.
    Ties keep the older take first."""
    scored = []
    for c in candidates:
        m = take_metrics(c["results"], line)
        scored.append({"takeId": c["id"], "name": c["name"], "chosen": c.get("chosen", False), "duration": c["results"].get("duration"),
                       "score": score_take(m), "reason": reason_of(m), **m})
    return sorted(scored, key=lambda x: -x["score"])[:limit]


# ---- routes ----

def make_router(db, load, media_dir: Callable[[], Path]) -> APIRouter:
    router = APIRouter()

    def error(code: int, message: str, **extra) -> JSONResponse:
        return JSONResponse({"error": message, **extra}, status_code=code)

    def gate(idea_id: str):
        found = workspaces.resolve(db, load, idea_id)
        if found is None:
            return error(404, NO_PLAN)
        return None if workspaces.editable(found) else error(409, renders.NOT_APPROVED)

    def shot_of(conn, idea_id: str, row, index) -> Optional[str]:
        ids = takes.shot_ids_of(conn, idea_id)
        return ids[index] if index is not None and ids and index < len(ids) else row[8]

    def take_row(conn, idea_id: str, take_id: str):
        """(row, current shot id) of the plan's own take, else None."""
        for row, index in takes.rows_of(conn, idea_id):
            if row[0] == take_id:
                return row, shot_of(conn, idea_id, row, index)
        return None

    def results_of(conn, take_id: str):
        """(results, None) once the take is analysed, else (None, the 409 response)."""
        got = analysis.full(conn, take_id)
        if got is None or got["status"] in ("queued", "running"):
            return None, error(409, NOT_READY, status=(got or {"status": "queued"})["status"])
        if got["status"] != "done" or not got["results"]:
            return None, error(409, ANALYSIS_FAILED, status="failed")
        return got["results"], None

    def number(raw, default):
        try:
            v = float(raw) if raw is not None else default
        except ValueError:
            return None
        return v if math.isfinite(v) else None

    @router.get("/api/ideas/{idea_id}/edit/suggest/clip")
    def clip_suggestions(idea_id: str, take: str, request: Request):
        """Clean-up items and script alignment for the part [in, out] of one take."""
        refused = gate(idea_id)
        if refused:
            return refused
        with db() as conn:
            found = take_row(conn, idea_id, take)
            if found is None:
                return error(404, NO_TAKE)
            results, wait = results_of(conn, take)
            line = editing.shot_lines(conn, idea_id).get(found[1]) if found[1] else None
        if wait:
            return wait
        q = request.query_params
        lo, hi = number(q.get("in"), 0.0), number(q.get("out"), results.get("duration") or 0.0)
        pad = number(q.get("padding"), PAD_DEFAULT)
        if lo is None or hi is None or pad is None or not 0 <= lo < hi:
            return error(422, BAD_RANGE)
        tr = results.get("transcript") or {}
        words = tr.get("words") or [] if tr.get("status") == "ok" else []
        return {"takeId": take, "shotId": found[1], "status": "ready", "speech": tr.get("status") or "none",
                "speechError": tr.get("reason"), "duration": results.get("duration"), "line": line,
                "alignment": align_script(words, line, results.get("duration") or 0.0, int(pad)),
                "cleanup": cleanup_items(results, lo, hi)}

    @router.get("/api/ideas/{idea_id}/edit/suggest/takes")
    def take_ranking(idea_id: str, shot: str):
        """The best three takes of one shot. Takes still being analysed are listed in `pending`."""
        refused = gate(idea_id)
        if refused:
            return refused
        with db() as conn:
            rows = [(r, s) for r, i in takes.rows_of(conn, idea_id) for s in [shot_of(conn, idea_id, r, i)] if s == shot]
            line = editing.shot_lines(conn, idea_id).get(shot)
            ready, pending = [], []
            for r, _ in rows:
                got = analysis.full(conn, r[0])
                if got and got["status"] == "done" and got["results"]:
                    ready.append({"id": r[0], "name": r[5], "chosen": bool(r[6]), "results": got["results"]})
                elif not got or got["status"] in ("queued", "running"):
                    pending.append(r[0])
        return {"shotId": shot, "line": line, "count": len(rows), "pending": pending,
                "ranking": rank_takes(ready, line) if len(ready) >= 2 else []}

    @router.post("/api/ideas/{idea_id}/edit/suggest/keeps")
    async def keeps(idea_id: str, request: Request):
        """What is left of [in, out] once the chosen items are removed, padded: the ranges the clip is cut into."""
        try:
            body = await request.json()
        except ValueError:
            body = None
        refused = gate(idea_id)
        if refused:
            return refused
        body = body if isinstance(body, dict) else {}
        lo, hi, pad = number(body.get("in"), None), number(body.get("out"), None), number(body.get("paddingFrames"), PAD_DEFAULT)
        if lo is None or hi is None or pad is None or not 0 <= lo < hi:
            return error(422, BAD_RANGE)
        cuts = body.get("removals")
        if not isinstance(cuts, list) or not all(isinstance(c, list) and len(c) == 2 and all(
                isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) for x in c) for c in cuts):
            return error(422, BAD_REMOVALS)
        kept = keep_ranges(lo, hi, cuts, int(pad))
        if not kept:
            return error(422, NOTHING_LEFT)
        return {"keeps": kept, "seconds": round(sum(k[1] - k[0] for k in kept), 3)}

    @router.post("/api/ideas/{idea_id}/edit/suggest/captions")
    async def captions(idea_id: str, request: Request):
        """Caption entries from the speech of the takes on the timeline."""
        try:
            body = await request.json()
        except ValueError:
            body = None
        refused = gate(idea_id)
        if refused:
            return refused
        clips = body.get("clips") if isinstance(body, dict) else None
        if not isinstance(clips, list) or len(clips) > editing.MAX_CLIPS or not all(
                isinstance(c, dict) and isinstance(c.get("source"), dict) and all(
                    isinstance(c.get(k), (int, float)) and not isinstance(c.get(k), bool) and math.isfinite(c[k]) for k in ("in", "out"))
                and c["in"] < c["out"] for c in clips):
            return error(422, BAD_CLIPS)
        ids = {c["source"].get("id") for c in clips if c["source"].get("kind") == "take"}
        words, status = {}, {}
        with db() as conn:
            for tid in ids:
                if not isinstance(tid, str) or take_row(conn, idea_id, tid) is None:
                    return error(404, NO_TAKE)
                results, wait = results_of(conn, tid)
                if wait:
                    return wait
                tr = results.get("transcript") or {}
                status[tid] = tr.get("status") or "none"
                words[tid] = tr.get("words") or [] if status[tid] == "ok" else []
        entries = timeline_captions(clips, words)
        speech = "ok" if entries else "unavailable" if "unavailable" in status.values() else "none"
        return {"status": speech, "entries": entries}

    return router

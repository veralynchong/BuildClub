"""Small ffmpeg / whisper tools and the pause-cutting rules (used to clean up a take)."""

import json
import logging
import re
import shutil
import string
import subprocess
from pathlib import Path
from typing import Optional

import analyze

log = logging.getLogger(__name__)

Word = tuple[float, float, str]  # start, end, text (seconds)

FILLERS = {"um", "umm", "uh", "uhh", "er", "erm", "hm", "hmm"}  # English only; Chinese fillers are unverified
MIN_FRAGMENT = 0.08  # seconds; shorter keep intervals are dropped
FADE = 0.012         # seconds of fade at every seam
WHISPER_TIMEOUT = 900
DTW_PRESET = "large.v3.turbo"  # alignment heads of analyze.MODEL; DTW needs flash attention off (-nfa)
DTW_EARLY = 0.2  # seconds; a DTW start (the previous word's end) can sit this far before a silence it swallowed
FFMPEG_TIMEOUT = 1800  # seconds; any single ffmpeg/ffprobe call, so a hung process can't stall the worker

NO_FFMPEG = ("ffmpeg isn't installed on this computer, so the cut can't be made. "
             "Install it (brew install ffmpeg) and try again.")
NO_WHISPER = ("whisper.cpp or its model wasn't found (looked for /opt/homebrew/bin/whisper-cli "
              "and ~/models/ggml-large-v3-turbo-q5_0.bin), so the cut can't be made.")


def num(x: float) -> str:
    """A short, stable decimal for filtergraph strings."""
    return f"{x:.3f}".rstrip("0").rstrip(".") or "0"


def parse_words(data: dict) -> list[Word]:
    """whisper-cli JSON (one word per segment, offsets in ms) to sorted (start, end, text) in seconds.
    With -dtw each token has t_dtw (10 ms units, about where the token ends): a word then runs from the
    previous token's t_dtw to its own last token's (a trailing comma's time is where the next word
    starts). The segment offsets drift badly after a pause, so they are only the fallback (and the
    first word's start)."""
    words, prev = [], None
    for seg in data.get("transcription", []):
        text = seg.get("text", "").strip()
        start, end = seg["offsets"]["from"] / 1000, seg["offsets"]["to"] / 1000
        toks = [t for t in seg.get("tokens", []) if t.get("t_dtw", -1) >= 0 and not t["text"].startswith("[_")]
        begin = prev if prev is not None else start
        if toks:
            end = toks[-1]["t_dtw"] / 100
            start = min(begin, end)
            prev = end
        if not text or (text[0], text[-1]) in {("[", "]"), ("(", ")")}:
            continue
        if text[0] == "*" or text[-1] == "*":  # a sound note such as "*phone rings*", split per word
            continue
        if not any(c.isalnum() for c in text):  # "." or a music note: whisper's guess at noise, not speech
            continue
        if toks and CJK_RE.search(text):
            words.extend(_token_words(toks, begin))  # no spaces in Chinese: the whole sentence is one segment
            continue
        words.append((start, end, text))
    return sorted(words, key=lambda w: w[0])


CJK_RE = re.compile("[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff]")


def _token_words(toks: list[dict], begin: float) -> list[Word]:
    """One word per token of a segment that has no spaces to split on. A token runs from the previous
    one's t_dtw to its own; punctuation joins the word before it and adds no time of its own."""
    out: list[Word] = []
    for tok in toks:
        text = tok["text"].strip()
        end = max(begin, tok["t_dtw"] / 100)
        if not any(c.isalnum() for c in text):
            if out and text:
                out[-1] = (out[-1][0], out[-1][1], out[-1][2] + text)
            continue
        out.append((begin, end, text))
        begin = end
    return out


def is_filler(text: str) -> bool:
    return text.strip().lower().strip(string.punctuation + " ") in FILLERS


def _effective_ends(words: list[Word], silences: list[tuple[float, float]]) -> list[float]:
    """whisper's word end can swallow the silence after it; trust the earliest silence that starts
    inside the word and runs to (or past) its end."""
    ends = []
    for i, (start, end, _) in enumerate(words):
        starts = [s for s, e in silences if start < s < end and e >= end]
        nxt = words[i + 1][0] if i + 1 < len(words) else end
        ends.append(min(starts) if starts else min(end, nxt))
    return ends


def _effective_starts(words: list[Word], silences: list[tuple[float, float]]) -> list[float]:
    """A DTW word start is the previous word's end (often a little early), so it can swallow the silence
    before it; start after a silence that ends inside the word and begins at (or just after) its start.
    A silence beginning later is a pause inside the word and leaves the start alone."""
    return [max([e for s, e in silences if start < e < end and s <= start + DTW_EARLY], default=start)
            for start, end, _ in words]


def fit_to_silences(words: list[Word], silences: list[tuple[float, float]]) -> list[Word]:
    """Sorted word times moved off the silences around them (the same rule the clean-up cut uses), so a
    word after a pause starts when it is spoken."""
    words = sorted(words, key=lambda w: w[0])
    return [(s, max(s, e), w[2]) for s, e, w in
            zip(_effective_starts(words, silences), _effective_ends(words, silences), words)]


def keep_intervals(words: list[Word], silences: list[tuple[float, float]], total: float,
                   *, keep: float = 0.12, min_gap: float = 0.4,
                   protected: list[tuple[float, float]] = ()) -> list[tuple[float, float]]:
    """Sorted, disjoint intervals of [0, total] to keep: fillers and gaps longer than min_gap are cut,
    leaving `keep` seconds of air beside each real word. Nothing inside a `protected` span is ever cut."""
    if not words:
        return [(0.0, total)]
    words = sorted(words, key=lambda w: w[0])
    ends = _effective_ends(words, silences)
    starts = _effective_starts(words, silences)
    removals = []
    for (_, _, text), start, end in zip(words, starts, ends):
        if is_filler(text):
            removals.append((start, end))
    # gaps: head, between words, tail; each side next to a filler gets no keep (the filler goes whole)
    edges = [(0.0, starts[0], False, is_filler(words[0][2]))]
    for i in range(len(words) - 1):
        edges.append((ends[i], starts[i + 1], is_filler(words[i][2]), is_filler(words[i + 1][2])))
    edges.append((ends[-1], total, is_filler(words[-1][2]), False))
    for lo, hi, left_filler, right_filler in edges:
        if hi - lo > min_gap:
            a = lo if left_filler else lo + keep
            b = hi if right_filler else hi - keep
            if b > a:
                removals.append((a, b))
    merged = []
    for a, b in sorted(removals):
        a, b = max(a, 0.0), min(b, total)
        if b <= a:
            continue
        if merged and a <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
        else:
            merged.append((a, b))
    for pa, pb in sorted(protected):
        cut_up = []
        for a, b in merged:
            if b <= pa or a >= pb:
                cut_up.append((a, b))
                continue
            if a < pa:
                cut_up.append((a, pa))
            if b > pb:
                cut_up.append((pb, b))
        merged = cut_up
    keeps, cursor = [], 0.0
    for a, b in merged + [(total, total)]:
        if a - cursor >= MIN_FRAGMENT:
            keeps.append((cursor, a))
        cursor = b
    return keeps


def build_clean_graph(keeps: list[tuple[float, float]], *, video_label: str = "v") -> str:
    """filter_complex joining the kept intervals of input 0 (the take itself) into [v] and [a]. Audio gets a
    short fade at every seam; the picture keeps its size and frame rate."""
    parts = []
    for i, (a, b) in enumerate(keeps):
        fade = f"afade=t=in:d={num(FADE)},afade=t=out:st={num(b - a - FADE)}:d={num(FADE)}"
        parts.append(f"[0:v]trim=start={num(a)}:end={num(b)},setpts=PTS-STARTPTS[v{i}]")
        parts.append(f"[0:a]atrim=start={num(a)}:end={num(b)},asetpts=PTS-STARTPTS,{fade}[a{i}]")
    joined = "".join(f"[v{i}][a{i}]" for i in range(len(keeps)))
    parts.append(f"{joined}concat=n={len(keeps)}:v=1:a=1[{video_label}][a]")
    return ";\n".join(parts)


def describe_trims(keeps: list[tuple[float, float]], words: list[Word], durations: list[float],
                   total: float) -> list[dict]:
    """What the auto-cut removed, per take: [{shot, kind: 'pause'|'filler', start, end}] with start/end in
    seconds inside that take. A removed stretch that overlaps a filler word counts as a filler."""
    removed, cursor = [], 0.0
    for a, b in list(keeps) + [(total, total)]:
        if a > cursor:
            removed.append((cursor, a))
        cursor = b
    fillers = [(w[0], w[1]) for w in words if is_filler(w[2])]
    bounds, offset = [], 0.0
    for d in durations:
        bounds.append((offset, offset + d))
        offset += d
    out = []
    for a, b in removed:
        kind = "filler" if any(fs < b and fe > a for fs, fe in fillers) else "pause"
        for shot, (lo, hi) in enumerate(bounds):
            s, e = max(a, lo), min(b, hi)
            if e - s > 0.01:
                out.append({"shot": shot, "kind": kind, "start": round(s - lo, 2), "end": round(e - lo, 2)})
    return out


def find_silences(wav: Path, total: float) -> list[tuple[float, float]]:
    """The pauses in a wav: silencedetect at -35 dB for 0.15 s or longer."""
    found = _ffmpeg(["-i", str(wav), "-af", "silencedetect=n=-35dB:d=0.15", "-f", "null", "-"],
                    "Finding the pauses", quiet=False)
    return parse_silences(found.stderr, total)


def is_silent(silences: list[tuple[float, float]], total: float) -> bool:
    """True when the pauses cover the whole file. whisper invents text ("Thank you.") for such audio."""
    return total > 0 and sum(e - s for s, e in silences) >= total * 0.98


def parse_silences(stderr: str, total: float) -> list[tuple[float, float]]:
    """silencedetect lines to (start, end); a silence still open at the end runs to total."""
    out, start = [], None
    for m in re.finditer(r"silence_(start|end): (-?[\d.]+)", stderr):
        if m.group(1) == "start":
            start = float(m.group(2))
        elif start is not None:
            out.append((start, float(m.group(2))))
            start = None
    if start is not None:
        out.append((start, total))
    return out


def missing_tools() -> str | None:
    """The 503 sentence for the first missing program, else None. Reads analyze's paths at call time."""
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        return NO_FFMPEG
    if not (Path(analyze.WHISPER).is_file() and Path(analyze.MODEL).is_file()):
        return NO_WHISPER
    return None


class CutError(Exception):
    """A one-sentence, human-readable reason the cut could not be made."""


def run(cmd: list[str], *, timeout: float | None = FFMPEG_TIMEOUT) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=timeout)
    except FileNotFoundError:
        raise CutError(NO_WHISPER if cmd[0] == analyze.WHISPER else NO_FFMPEG)
    except subprocess.TimeoutExpired:
        raise CutError(f"{Path(cmd[0]).name} took too long, so the cut was stopped.")


def _ffmpeg(args: list[str], what: str, *, quiet: bool = True, binary: str = "ffmpeg") -> subprocess.CompletedProcess:
    """Run ffmpeg (or `binary`); a failure becomes a CutError carrying the tail of stderr."""
    r = run([binary, "-y", "-nostdin", "-v", "error" if quiet else "info", *args])
    if r.returncode != 0:
        raise CutError(f"{what} failed: {r.stderr.strip()[-200:]}")
    return r


def probe(path: Path) -> dict:
    r = run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)])
    if r.returncode != 0:
        raise CutError(f"Could not read {Path(path).name}: {r.stderr.strip()[-200:]}")
    data = json.loads(r.stdout or "{}")
    streams = data.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), {})
    a = next((s for s in streams if s.get("codec_type") == "audio"), {})
    fps = 0.0
    if v.get("avg_frame_rate", "0/0") not in ("0/0", "0"):
        n, d = v["avg_frame_rate"].split("/")
        fps = round(float(n) / float(d), 3) if float(d) else 0.0
    return {"duration": float(data.get("format", {}).get("duration") or 0),
            "width": v.get("width"), "height": v.get("height"), "fps": fps, "hasAudio": bool(a),
            "vcodec": v.get("codec_name"), "color_transfer": v.get("color_transfer"), "acodec": a.get("codec_name"), "pix_fmt": v.get("pix_fmt"),
            "sample_rate": int(a["sample_rate"]) if a.get("sample_rate") else None}


def transcribe_words(wav: Path, work: Path, prompt: Optional[str] = None) -> list[Word]:
    """Word timings from whisper.cpp. A missing tool or a failed run is an error, never an empty list.
    `prompt` is text whisper takes as what came before: a line with "um" and "uh" in it makes it write the fillers
    it would otherwise leave out."""
    if not (Path(analyze.WHISPER).is_file() and Path(analyze.MODEL).is_file()):
        raise CutError(NO_WHISPER)
    base = Path(work) / "words"
    base.with_suffix(".json").unlink(missing_ok=True)
    cmd = [analyze.WHISPER, "-m", str(analyze.MODEL), "-f", str(wav), "-l", "auto", "-ml", "1", "-sow",
           "-ojf", "-of", str(base), "-np"]
    if prompt:
        cmd += ["--prompt", prompt]
    r = run(cmd[:1] + ["-dtw", DTW_PRESET, "-nfa"] + cmd[1:], timeout=WHISPER_TIMEOUT)
    if r.returncode == 0 and not base.with_suffix(".json").is_file():
        log.warning("whisper-cli wrote no JSON with -dtw/-nfa (an older build?); running it again without -dtw, "
                    "so word times after a pause will drift")
        r = run(cmd, timeout=WHISPER_TIMEOUT)
    if r.returncode != 0:
        raise CutError(f"Finding the words failed: {r.stderr.strip()[-200:]}")
    try:
        return parse_words(json.loads(base.with_suffix(".json").read_text(encoding="utf-8", errors="replace")))
    except (OSError, ValueError):
        raise CutError("Finding the words failed: whisper.cpp produced no readable result.")

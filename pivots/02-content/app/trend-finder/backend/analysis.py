"""What is in a take, worked out once in the background after upload: the words with times (whisper.cpp),
the pauses, the picture cuts, the loudness, the sound's peaks for the timeline's waveform and a strip of small thumbnails. Phase 2 and 3 of the editor's AI
edit read these results instead of looking at the video again. Rows live in take_analysis, thumbnails in
<media>/<ideaId>/<takeId>.film/. Everything is local and free; no step needs the network."""

import json
import logging
import sys
from array import array
import queue
import re
import shutil
import tempfile
import threading
import time
from pathlib import Path
from typing import Callable, Optional

import analyze
import cutting
from cutting import CutError

log = logging.getLogger(__name__)

SCHEMA = (
    "CREATE TABLE IF NOT EXISTS take_analysis (take_id TEXT PRIMARY KEY, idea_id TEXT NOT NULL, status TEXT NOT NULL, "
    "error TEXT, results TEXT, updated_at INTEGER NOT NULL)",
)

SILENCE_MIN = 0.3        # seconds; shorter pauses are not reported
SCENE_THRESHOLD = 10     # scdet score (0-100) a frame must pass to count as a cut
FILM_MAX = 12            # thumbnails per take
FILM_HEIGHT = 120
PEAK_RATE = 50           # waveform buckets per second
PEAK_MAX = 6000          # at most this many buckets (2 minutes at 50 a second); longer takes get fewer a second
PEAK_SAMPLE_RATE = 8000  # the sound is read this coarsely for the peaks
MAX_ERROR = 300
# Whisper drops "um" and "uh" unless the text before the audio has them; the clean-up lists them for removal.
FILLER_PROMPT = "Umm, uh, so, like, you know, I mean, erm."
GENERIC = "Couldn't analyse this video."

_NUM = r"(-?[\d.]+|-?inf)"
SCDET_RE = re.compile(r"lavfi\.scd\.score:\s*([\d.]+),\s*lavfi\.scd\.time:\s*([\d.]+)")


def film_dir(folder: Path, take_id: str) -> Path:
    return folder / f"{take_id}.film"


def parse_cuts(stderr: str) -> list[dict]:
    """scdet log lines to [{t, score}] in seconds."""
    return [{"t": round(float(t), 3), "score": round(float(s), 1)} for s, t in SCDET_RE.findall(stderr)]


def parse_loudness(stderr: str) -> Optional[dict]:
    """The JSON block loudnorm prints at the end of a run; None when there is no audio level to report."""
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", stderr, re.S)
    if not m:
        return None
    try:
        raw = json.loads(m.group(0))
    except ValueError:
        return None

    def val(key):
        try:
            x = float(raw[key])
        except (KeyError, ValueError):
            return None
        return round(x, 1) if x == x and abs(x) != float("inf") else None
    out = {"integratedLufs": val("input_i"), "truePeakDb": val("input_tp"), "lra": val("input_lra")}
    return out if out["integratedLufs"] is not None else None


def transcript_of(path: Path, work: Path, total: float, silences: list[tuple[float, float]], wav: Path) -> dict:
    """Word timings of the take's speech. A missing whisper.cpp or model is "unavailable", not a failed analysis."""
    if cutting.is_silent(silences, total):  # whisper writes "Thank you." for silence
        return {"status": "none", "words": []}
    try:
        words = cutting.transcribe_words(wav, work, prompt=FILLER_PROMPT)
    except CutError as e:
        if str(e) == cutting.NO_WHISPER:
            return {"status": "unavailable", "reason": cutting.NO_WHISPER, "words": []}
        log.warning("transcribe failed: %s", e)
        return {"status": "unavailable", "reason": str(e)[:MAX_ERROR], "words": []}
    words = cutting.fit_to_silences(words, silences)
    return {"status": "ok", "words": [{"text": w[2], "start": round(w[0], 3), "end": round(w[1], 3)} for w in words]}


def peak_rate(total: float) -> int:
    """Buckets a second for a take this long, so the list stays under PEAK_MAX."""
    return PEAK_RATE if total * PEAK_RATE <= PEAK_MAX else max(1, int(PEAK_MAX / max(total, 1e-6)))


def peaks_of(samples, sample_rate: int, rate: int) -> list[float]:
    """The loudest sample of each 1/rate second bucket of 16-bit samples, 0 to 1 on two decimals."""
    size = max(1, sample_rate // rate)
    out = []
    for i in range(0, len(samples), size):
        chunk = samples[i:i + size]
        out.append(round(min(1.0, max(max(chunk), -min(chunk)) / 32768), 2))
    return out


def audio_peaks(wav: Path, work: Path, total: float) -> dict:
    """{rate, values}: the waveform the timeline draws under a clip, read from the take's mono wav."""
    raw = work / "peaks.raw"
    cutting._ffmpeg(["-i", str(wav), "-ac", "1", "-ar", str(PEAK_SAMPLE_RATE), "-f", "s16le", str(raw)], "Reading the peaks")
    samples = array("h")
    samples.frombytes(raw.read_bytes()[: (raw.stat().st_size // 2) * 2])
    if sys.byteorder != "little":
        samples.byteswap()
    rate = peak_rate(total)
    return {"rate": rate, "values": peaks_of(samples, PEAK_SAMPLE_RATE, rate)}


def make_filmstrip(path: Path, dest: Path, total: float) -> list[float]:
    """Up to FILM_MAX JPEGs (one a second when the take is short, else spread over it); the times they show."""
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    count = max(1, min(FILM_MAX, int(total) or 1))
    step = total / count if total > 0 else 1.0
    times = []
    for i in range(count):
        at = min(max(total - 0.05, 0.0), step * (i + 0.5)) if count > 1 else min(0.5, total / 2)
        cutting._ffmpeg(["-ss", cutting.num(at), "-i", str(path), "-frames:v", "1", "-an", "-vf", f"scale=-2:{FILM_HEIGHT}",
                         "-q:v", "5", str(dest / f"{i:02d}.jpg")], "Making thumbnails")
        if (dest / f"{i:02d}.jpg").is_file():
            times.append(round(at, 2))
    return times


def analyse(path: Path, film: Path) -> dict:
    """All results for one video file. Raises CutError when the file cannot be read at all."""
    info = cutting.probe(path)
    if not info.get("width"):
        raise CutError("That file has no video in it.")
    total = info["duration"]
    out = {"duration": round(total, 3), "fps": info["fps"], "width": info["width"], "height": info["height"],
           "hasAudio": info["hasAudio"], "transcript": {"status": "none", "words": []}, "silences": [], "loudness": None,
           "peaks": None}
    if info["hasAudio"]:
        with tempfile.TemporaryDirectory(prefix="analysis-") as tmp:
            work = Path(tmp)
            wav = work / "audio.wav"
            cutting._ffmpeg(["-i", str(path), "-vn", "-ac", "1", "-ar", "16000", str(wav)], "Reading the sound")
            fine = cutting.find_silences(wav, total)
            out["silences"] = [[round(s, 3), round(e, 3)] for s, e in fine if e - s >= SILENCE_MIN]
            out["transcript"] = transcript_of(path, work, total, fine, wav)
            r = cutting._ffmpeg(["-i", str(wav), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                                "Measuring the loudness", quiet=False)
            out["loudness"] = parse_loudness(r.stderr)
            out["peaks"] = audio_peaks(wav, work, total)
    r = cutting._ffmpeg(["-i", str(path), "-an", "-vf", f"scale=320:-2,scdet=t={SCENE_THRESHOLD}:s=1", "-f", "null", "-"],
                        "Finding the cuts", quiet=False)
    out["cuts"] = parse_cuts(r.stderr)
    out["filmstrip"] = {"height": FILM_HEIGHT, "times": make_filmstrip(path, film, total)}
    return out


def summary_of(status: str, error: Optional[str], results: Optional[dict], updated_at: Optional[int] = None) -> dict:
    """The small form that rides along in the takes list. `updatedAt` changes with every run, so the editor can tell
    when what it fetched for a take is out of date."""
    out = {"status": status, "error": error, "updatedAt": updated_at}
    if results:
        tr = results.get("transcript") or {}
        out["summary"] = {"duration": results.get("duration"), "words": len(tr.get("words") or []),
                          "speech": tr.get("status"), "silences": len(results.get("silences") or []),
                          "cuts": len(results.get("cuts") or [])}
    return out


def states(conn, idea_id: str) -> dict:
    """take id -> summary for every analysed take of the plan."""
    return {tid: summary_of(status, error, json.loads(results) if results else None, updated)
            for tid, status, error, results, updated in conn.execute(
                "SELECT take_id, status, error, results, updated_at FROM take_analysis WHERE idea_id = ?", (idea_id,))}


def full(conn, take_id: str) -> Optional[dict]:
    row = conn.execute("SELECT status, error, results FROM take_analysis WHERE take_id = ?", (take_id,)).fetchone()
    if row is None:
        return None
    return {"status": row[0], "error": row[1], "results": json.loads(row[2]) if row[2] else None}


def remove(conn, folder: Path, take_id: str) -> None:
    conn.execute("DELETE FROM take_analysis WHERE take_id = ?", (take_id,))
    shutil.rmtree(film_dir(folder, take_id), ignore_errors=True)


class AnalysisJobs:
    """One worker thread analyses takes in order (whisper uses every core)."""

    def __init__(self, db, media_dir: Callable[[], Path], run: Optional[Callable] = None):
        self._db, self._media, self._run = db, media_dir, run or (lambda path, film: analyse(path, film))
        self._q: queue.Queue = queue.Queue()
        self._pending: set[str] = set()
        self._lock = threading.Lock()
        threading.Thread(target=self._work, name="analysis-worker", daemon=True).start()

    def submit(self, idea_id: str, take_id: str) -> None:
        """Mark the take queued and hand it to the worker; a take already waiting is not queued twice."""
        with self._db() as conn:
            conn.execute("INSERT OR REPLACE INTO take_analysis (take_id, idea_id, status, error, results, updated_at) "
                         "VALUES (?, ?, 'queued', NULL, NULL, ?)", (take_id, idea_id, int(time.time() * 1000)))
        self._enqueue(idea_id, take_id)

    def _enqueue(self, idea_id: str, take_id: str) -> None:
        with self._lock:
            if take_id in self._pending:
                return
            self._pending.add(take_id)
        self._q.put((idea_id, take_id))

    def resume(self) -> None:
        """After a restart: unfinished rows go again, and takes that were never analysed get their turn."""
        with self._db() as conn:
            todo = [(r[0], r[1]) for r in conn.execute(
                "SELECT t.idea_id, t.id FROM takes t LEFT JOIN take_analysis a ON a.take_id = t.id "
                "WHERE a.take_id IS NULL OR a.status IN ('queued', 'running') ORDER BY t.created_at")]
        for idea_id, take_id in todo:
            self.submit(idea_id, take_id)

    def _set(self, take_id: str, status: str, error: Optional[str] = None, results: Optional[dict] = None) -> bool:
        """False when the take was deleted meanwhile (nothing is written then)."""
        with self._db() as conn:
            cur = conn.execute("UPDATE take_analysis SET status = ?, error = ?, results = ?, updated_at = ? WHERE take_id = ?",
                               (status, error, json.dumps(results) if results is not None else None,
                                int(time.time() * 1000), take_id))
            return cur.rowcount > 0

    def _work(self) -> None:
        while True:
            idea_id, take_id = self._q.get()
            try:
                self._one(idea_id, take_id)
            except Exception as e:  # never let the worker thread die
                print(f"[analysis] {take_id} worker error: {e!r}", flush=True)
            finally:
                with self._lock:
                    self._pending.discard(take_id)

    def _one(self, idea_id: str, take_id: str) -> None:
        with self._db() as conn:
            row = conn.execute("SELECT ext FROM takes WHERE id = ? AND idea_id = ?", (take_id, idea_id)).fetchone()
        if row is None or not self._set(take_id, "running"):
            return
        folder = self._media().resolve() / idea_id
        try:
            results = self._run(folder / f"{take_id}.{row[0]}", film_dir(folder, take_id))
        except CutError as e:
            self._finish(folder, take_id, "failed", str(e)[:MAX_ERROR])
        except Exception as e:
            print(f"[analysis] {take_id} failed: {e!r}", flush=True)
            self._finish(folder, take_id, "failed", GENERIC)
        else:
            self._finish(folder, take_id, "done", None, results)

    def _finish(self, folder: Path, take_id: str, status: str, error: Optional[str], results: Optional[dict] = None) -> None:
        if not self._set(take_id, status, error, results):  # deleted while it ran: no thumbnails left behind
            shutil.rmtree(film_dir(folder, take_id), ignore_errors=True)

"""Compare viral videos: finds what 2-5 videos have in common.

Each video goes through the existing breakdown job (analyze.Jobs), so a video that was broken down
before is reused and costs nothing. One more AI call then reads the breakdowns together and writes
the shared format, structure, length and hook pattern. A finished comparison is saved to
jobs/compare-<id>/compare.json, so it survives a restart and a page refresh.
"""

import hashlib
import json
import threading
import time

import anthropic

import analyze
from analyze import AI_MODEL, Jobs, job_id_for
from models import CompareJob, CompareOut, CompareVideo

AI_MAX_TOKENS = 8000  # one synthesis; the answer itself is under 1,500 tokens
MIN_VIDEOS = 2
POLL_SECONDS = 1.0

PROMPT = """You are helping a social media manager work out what a few viral videos have in
common, so their client can film a video built the same way. Below is a breakdown of each video.
Find what they share. Do not write a new script.

- commonFormat: what kind of video they all are, in one short sentence.
- structure: the beats they share, in order. Each beat has a short name, what happens in it, and
  its typical timing as a range like "0-8s". 3 to 6 beats. Only list a beat the videos mostly share.
- typicalLength: the usual length, e.g. "about 20-30 seconds".
- hookPattern.pattern: how the videos open, in one or two short sentences. hookPattern.hookTypes:
  the hookType values that most of the videos share (from: visual, question_or_text, rage_bait,
  informative, challenge, other); empty if they do not share one.
- emotionPattern: the main feeling they trigger, and how.
- whatToCopy: 3 to 5 short, concrete bullets a creator can follow.
- whatDiffers: short bullets on where the videos differ, so the creator knows what is free to change.
- confidence: one short sentence on how strong the pattern is. Mention the number of videos; with
  only 2 or 3, or if the videos differ a lot, say the pattern is weak.

Only use what the breakdowns say. Write plain English with short, simple sentences."""


def compare_id_for(urls: list[str]) -> str:
    """The same set of links, in any order, is the same comparison."""
    return hashlib.sha1("\n".join(sorted(urls)).encode()).hexdigest()[:12]


def summary_of(url: str, breakdown) -> dict:
    """What the AI reads about one video: the parts of its breakdown that describe its shape."""
    why = breakdown.why
    prepared = analyze.JOBS_DIR / job_id_for(url) / "prepared.json"
    try:
        length = json.loads(prepared.read_text(encoding="utf-8")).get("lengthSec")
    except (OSError, ValueError):
        length = None
    return {
        "url": url,
        "lengthSec": length,
        "concept": why.concept,
        "hookType": why.hookType,
        "emotion": why.emotion,
        "hook": why.hook,
        "first3s": why.first3s,
        "shotList": [{"time": s.time, "shot": s.shot, "text": s.text} for s in breakdown.shotList],
        "lines": [{"time": l.time, "text": l.text, "role": l.role} for l in breakdown.lines],
    }


def synthesize(items: list[dict]) -> CompareOut:
    """One AI call over the breakdowns of every video."""
    text = "\n\n".join(f"Video {n}:\n{json.dumps(item, ensure_ascii=False, indent=1)}" for n, item in enumerate(items, 1))
    response = anthropic.Anthropic().beta.messages.parse(
        model=AI_MODEL,
        max_tokens=AI_MAX_TOKENS,
        thinking={"type": "adaptive"},
        output_config={"effort": "high"},
        output_format=CompareOut,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": f"{text}\n\n{PROMPT}"}],
    )
    u = response.usage
    print(f"[compare] {response.model} videos={len(items)} in={u.input_tokens} out={u.output_tokens} "
          f"stop={response.stop_reason}", flush=True)
    if response.stop_reason == "refusal":
        raise RuntimeError("The AI declined to compare these videos.")
    if response.stop_reason == "max_tokens" or response.parsed_output is None:
        raise RuntimeError(f"The AI answer was incomplete ({response.stop_reason}).")
    return response.parsed_output


class CompareJobs:
    """One thread per comparison; the breakdowns themselves still run one at a time in `analyses`."""

    def __init__(self, analyses: Jobs):
        self._analyses = analyses
        self._jobs: dict[str, CompareJob] = {}
        self._lock = threading.Lock()

    def submit(self, urls: list[str]) -> str:
        job_id = compare_id_for(urls)
        with self._lock:
            current = self.get(job_id)
            if current and current.status != "failed":
                return job_id
            self._jobs[job_id] = CompareJob(
                job=job_id, status="queued", progress=0, step="Waiting to start",
                videos=[CompareVideo(url=u, job=job_id_for(u), status="queued") for u in urls])
        threading.Thread(target=self._work, args=(job_id, urls), name=f"compare-{job_id}", daemon=True).start()
        return job_id

    def get(self, job_id: str):
        if job_id in self._jobs:
            return self._jobs[job_id]
        saved = analyze.JOBS_DIR / f"compare-{job_id}" / "compare.json"
        if saved.exists():
            return CompareJob.model_validate_json(saved.read_text(encoding="utf-8"))
        return None

    def _set(self, job_id: str, **fields) -> None:
        with self._lock:
            self._jobs[job_id] = self._jobs[job_id].model_copy(update=fields)

    def _videos(self, urls: list[str]) -> list[CompareVideo]:
        out = []
        for u in urls:
            job = self._analyses.get(job_id_for(u))
            if not job:
                out.append(CompareVideo(url=u, job=job_id_for(u), status="queued"))
                continue
            why = job.result.why if job.result else None
            out.append(CompareVideo(url=u, job=job.job, status=job.status, progress=job.progress, step=job.step,
                                    error=job.error, concept=why.concept if why else None))
        return out

    def _work(self, job_id: str, urls: list[str]) -> None:
        try:
            self._set(job_id, status="running", step="Breaking the videos down")
            for u in urls:
                self._analyses.submit(u)
            while True:
                videos = self._videos(urls)
                done = sum(v.progress for v in videos) / len(videos)
                self._set(job_id, videos=videos, progress=round(done * 0.9, 3),
                          step=f"Breaking the videos down ({sum(v.status == 'done' for v in videos)} of {len(videos)} done)")
                if all(v.status in ("done", "failed") for v in videos):
                    break
                time.sleep(POLL_SECONDS)
            good = [v for v in videos if v.status == "done"]
            if len(good) < MIN_VIDEOS:
                reasons = "; ".join(v.error for v in videos if v.error)
                raise RuntimeError(f"Only {len(good)} of {len(videos)} videos could be broken down, and a comparison "
                                   f"needs at least {MIN_VIDEOS}. {reasons}".strip())
            self._set(job_id, step="Finding what they share", progress=0.92)
            items = [summary_of(v.url, self._analyses.get(v.job).result) for v in good]
            for item, v in zip(items, good):
                v.lengthSec = item["lengthSec"]
            result = synthesize(items)
            self._set(job_id, status="done", progress=1, step="Done", videos=videos, result=result)
            folder = analyze.JOBS_DIR / f"compare-{job_id}"
            folder.mkdir(parents=True, exist_ok=True)
            (folder / "compare.json").write_text(self._jobs[job_id].model_dump_json(indent=2), encoding="utf-8")
        except Exception as e:
            print(f"[compare] {job_id} failed: {e}", flush=True)
            self._set(job_id, status="failed", error=str(e))

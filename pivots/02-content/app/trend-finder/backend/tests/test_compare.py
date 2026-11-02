import json
import time

import pytest

import analyze
import compare
from models import BreakdownOut, CompareOut

URLS = ["https://www.tiktok.com/@a/video/1", "https://www.tiktok.com/@b/video/2", "https://www.tiktok.com/@c/video/3"]


def why(n):
    return {"hook": "h", "first3s": "f", "length": "l", "format": "fo", "sound": "s", "concept": f"Street interview {n}",
            "hookType": "question_or_text", "scrollStopper": "s", "emotion": "curious", "saveReason": "r"}


def breakdown(n=1):
    return BreakdownOut.model_validate({
        "shotList": [{"time": "0-2s", "shot": "interview", "framing": "medium", "angle": "eye_level", "movement": "static"}], "why": why(n), "props": [], "editorNotes": "e",
        "lines": [{"time": "0-1s", "text": "No", "role": "hook"}]})


ANSWER = CompareOut.model_validate({
    "commonFormat": "Street interview", "typicalLength": "about 25 seconds",
    "structure": [{"beat": "No, no, no", "what": "Three people say no", "timing": "0-15s"},
                  {"beat": "Yes", "what": "The fourth says yes", "timing": "15-25s"}],
    "hookPattern": {"pattern": "A question on screen", "hookTypes": ["question_or_text"]},
    "emotionPattern": "Curiosity", "whatToCopy": ["a", "b", "c"], "whatDiffers": ["music"],
    "confidence": "Only 3 videos; fairly weak pattern."})


def wait(jobs, job_id, timeout=5):
    end = time.time() + timeout
    while time.time() < end:
        job = jobs.get(job_id)
        if job.status in ("done", "failed"):
            return job
        time.sleep(0.02)
    raise AssertionError("compare did not finish")


@pytest.fixture
def fast(monkeypatch):
    monkeypatch.setattr(compare, "POLL_SECONDS", 0.01)
    calls = {"prepare": [], "synth": []}

    def fake_prepare(url, work, step):
        calls["prepare"].append(url)
        prepared = {"url": url, "lengthSec": 25, "shots": [], "frames": [], "speech": []}
        (work / "prepared.json").write_text(json.dumps(prepared), encoding="utf-8")  # as the real prepare does
        return prepared

    monkeypatch.setattr(analyze, "prepare", fake_prepare)
    monkeypatch.setattr(analyze, "breakdown", lambda prepared, work, vocab=None: breakdown())

    def fake_synth(items):
        calls["synth"].append(items)
        return ANSWER

    monkeypatch.setattr(compare, "synthesize", fake_synth)
    return calls


def test_compare_runs_each_video_then_one_synthesis(fast):
    analyses = analyze.Jobs()
    jobs = compare.CompareJobs(analyses)
    job = wait(jobs, jobs.submit(URLS))
    assert job.status == "done" and job.progress == 1 and job.result == ANSWER
    assert sorted(fast["prepare"]) == URLS and len(fast["synth"]) == 1
    item = fast["synth"][0][0]
    assert item["lengthSec"] == 25 and item["hookType"] == "question_or_text" and item["concept"].startswith("Street")
    assert [v.status for v in job.videos] == ["done"] * 3 and job.videos[0].lengthSec == 25


def test_compare_reuses_finished_breakdowns_and_the_same_set_in_any_order(fast):
    analyses = analyze.Jobs()
    wait(analyses, analyses.submit(URLS[0]))
    jobs = compare.CompareJobs(analyses)
    first = jobs.submit(URLS)
    wait(jobs, first)
    assert fast["prepare"].count(URLS[0]) == 1  # the earlier breakdown was not paid for again
    assert jobs.submit(list(reversed(URLS))) == first and len(fast["synth"]) == 1


def test_finished_comparison_survives_a_restart(fast):
    jobs = compare.CompareJobs(analyze.Jobs())
    job_id = jobs.submit(URLS)
    wait(jobs, job_id)
    restarted = compare.CompareJobs(analyze.Jobs()).get(job_id)
    assert restarted.status == "done" and restarted.result == ANSWER


def test_compare_skips_a_failed_video_when_two_remain(fast, monkeypatch):
    def breakdown_or_fail(prepared, work, vocab=None):
        if prepared["url"] == URLS[1]:
            raise RuntimeError("Could not download the video")
        return breakdown()

    monkeypatch.setattr(analyze, "breakdown", breakdown_or_fail)
    jobs = compare.CompareJobs(analyze.Jobs())
    job = wait(jobs, jobs.submit(URLS))
    assert job.status == "done"
    assert [v.status for v in job.videos] == ["done", "failed", "done"]
    assert len(fast["synth"][0]) == 2


def test_compare_fails_with_fewer_than_two_videos(fast, monkeypatch):
    def only_first(prepared, work, vocab=None):
        if prepared["url"] != URLS[0]:
            raise RuntimeError("no luck")
        return breakdown()

    monkeypatch.setattr(analyze, "breakdown", only_first)
    jobs = compare.CompareJobs(analyze.Jobs())
    job = wait(jobs, jobs.submit(URLS))
    assert job.status == "failed" and "Only 1 of 3" in job.error and fast["synth"] == []


def test_compare_reports_a_synthesis_failure(fast, monkeypatch):
    def broken(items):
        raise RuntimeError("The AI answer was incomplete (max_tokens).")

    monkeypatch.setattr(compare, "synthesize", broken)
    jobs = compare.CompareJobs(analyze.Jobs())
    job = wait(jobs, jobs.submit(URLS))
    assert job.status == "failed" and "incomplete" in job.error


def test_synthesis_answer_is_validated():
    with pytest.raises(ValueError):  # fewer than 3 things to copy
        CompareOut.model_validate({**ANSWER.model_dump(), "whatToCopy": ["only one"]})
    with pytest.raises(ValueError):  # a hook type outside the shared list
        CompareOut.model_validate({**ANSWER.model_dump(), "hookPattern": {"pattern": "p", "hookTypes": ["clickbait"]}})


# ---- API ----------------------------------------------------------------------------------------

def test_api_rejects_bad_requests(client):
    assert client.post("/api/compare", json={"urls": [URLS[0]]}).status_code == 422  # model: min 2
    assert client.post("/api/compare", json={"urls": [URLS[0], URLS[0]]}).json()["code"] == "few"
    assert client.post("/api/compare", json={"urls": URLS + URLS[:1] + ["https://www.tiktok.com/@d/video/4",
                                                                        "https://www.tiktok.com/@e/video/5",
                                                                        "https://www.tiktok.com/@f/video/6"]}).status_code == 422
    r = client.post("/api/compare", json={"urls": [URLS[0], "https://example.com/x"]})
    assert r.status_code == 400 and r.json()["code"] == "link"
    assert client.get("/api/compare/nope").status_code == 404


def test_api_charges_only_for_videos_not_analysed_yet(client, monkeypatch):
    import server
    charged = []
    monkeypatch.setattr(server, "spend", lambda wallet, usd, cap: charged.append(round(usd, 2)) or True)
    monkeypatch.setattr(server.compares, "submit", lambda urls: "c1")
    done = analyze.AnalyzeJob(job="x", status="done", progress=1)
    monkeypatch.setattr(server.jobs, "get", lambda job_id: done if job_id == server.job_id_for(URLS[0]) else None)
    assert client.post("/api/compare", json={"urls": URLS}).json() == {"job": "c1"}
    assert charged == [round(0.08 * 2 + 0.05, 2)]


def test_api_over_budget_starts_nothing(client, monkeypatch):
    import server
    started = []
    monkeypatch.setattr(server, "spend", lambda wallet, usd, cap: False)
    monkeypatch.setattr(server.compares, "submit", lambda urls: started.append(urls))
    assert client.post("/api/compare", json={"urls": URLS}).status_code == 429 and started == []


def test_api_returns_a_finished_comparison(client, fast):
    import server
    server.compares = compare.CompareJobs(analyze.Jobs())
    job = client.post("/api/compare", json={"urls": URLS}).json()["job"]
    end = time.time() + 5
    body = {}
    while time.time() < end:
        body = client.get(f"/api/compare/{job}").json()
        if body["status"] in ("done", "failed"):
            break
        time.sleep(0.05)
    assert body["status"] == "done" and body["result"]["commonFormat"] == "Street interview"
    assert len(body["videos"]) == 3

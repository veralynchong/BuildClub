import json
import shutil
import subprocess
import time
from types import SimpleNamespace

import httpx
import pytest

import analyze
from models import Breakdown, BreakdownOut

URL = "https://www.tiktok.com/@a/video/1"
NEW_WHY = {"concept": "Close-up of tofu being fried", "hookType": "visual", "scrollStopper": "Golden crust in frame one",
           "emotion": "craving", "saveReason": "Easy recipe to try later"}
RESULT = BreakdownOut.model_validate({
    "shotList": [{"time": "0-2s", "shot": "close-up of tofu", "framing": "close_up", "angle": "eye_level",
                  "movement": "static"}],
    "why": {"hook": "h", "first3s": "f", "length": "l", "format": "fo", "sound": "s", **NEW_WHY},
    "props": ["tofu"],
    "editorNotes": "cut fast",
    "lines": [{"time": "0-1s", "text": "look", "role": "hook"}],
})


def wait(jobs, job_id, timeout=5):
    end = time.time() + timeout
    while time.time() < end:
        job = jobs.get(job_id)
        if job.status in ("done", "failed"):
            return job
        time.sleep(0.02)
    raise AssertionError("job did not finish")


def fake_prepare(url, work, step):
    step("Downloading the video", 0.1)
    return {"url": url, "lengthSec": 2, "shots": [], "frames": [], "speech": []}


@pytest.mark.parametrize("url", ["", "https://youtube.com/watch?v=1", "http://www.tiktok.com/@a/video/1"])
def test_analyze_needs_a_tiktok_or_instagram_link(client, url):
    assert client.post("/api/analyze", json={"url": url}).status_code == 400


@pytest.mark.parametrize("url", ["https://www.youtube.com/shorts/abc123", "https://youtube.com/shorts/abc123"])
def test_analyze_takes_a_youtube_shorts_link(client, monkeypatch, url):
    import server
    queued = []
    monkeypatch.setattr(server.jobs, "submit", lambda u: queued.append(u) or "job1")  # no real download
    r = client.post("/api/analyze", json={"url": url})
    assert (r.status_code, queued) == (200, [url])


def test_unknown_job_is_404(client):
    assert client.get("/api/analyze/nope").status_code == 404


def test_job_finishes_and_survives_restart(monkeypatch):
    monkeypatch.setattr(analyze, "prepare", fake_prepare)
    monkeypatch.setattr(analyze, "breakdown", lambda prepared, work, vocab=None: RESULT)
    jobs = analyze.Jobs()
    job_id = jobs.submit(URL)
    job = wait(jobs, job_id)
    assert job.status == "done" and job.progress == 1 and job.result == RESULT
    assert jobs.submit(URL) == job_id  # same link reuses the job

    restarted = analyze.Jobs()
    assert restarted.get(job_id).result.model_dump() == RESULT.model_dump()


def test_failed_job_reports_the_error(monkeypatch):
    monkeypatch.setattr(analyze, "prepare", fake_prepare)

    def broken(prepared, work, vocab=None):
        raise RuntimeError("The AI declined to analyse this video.")

    monkeypatch.setattr(analyze, "breakdown", broken)
    jobs = analyze.Jobs()
    job = wait(jobs, jobs.submit(URL))
    assert job.status == "failed"
    assert job.error == "The AI declined to analyse this video."
    assert analyze.Jobs().get(job.job) is None  # nothing saved, so a retry starts again


def test_job_over_http(client, monkeypatch):
    import server
    monkeypatch.setattr(analyze, "prepare", fake_prepare)
    monkeypatch.setattr(analyze, "breakdown", lambda prepared, work, vocab=None: RESULT)
    monkeypatch.setattr(server, "jobs", analyze.Jobs())
    job_id = client.post("/api/analyze", json={"url": URL}).json()["job"]
    wait(server.jobs, job_id)
    body = client.get(f"/api/analyze/{job_id}").json()
    assert body["status"] == "done"
    assert body["result"]["props"] == ["tofu"]


class FakeAnthropic:
    """Stands in for anthropic.Anthropic(); records the request and returns a canned answer."""
    sent = {}
    stop_reason = "end_turn"
    answer = RESULT
    constructors = []
    parse_calls = 0
    transport_error = None

    def __init__(self, **kwargs):
        FakeAnthropic.constructors.append(kwargs)
        self.beta = SimpleNamespace(messages=SimpleNamespace(parse=self.parse))

    def parse(self, **kwargs):
        FakeAnthropic.parse_calls += 1
        FakeAnthropic.sent = kwargs
        if self.transport_error is not None:
            raise self.transport_error
        parsed = FakeAnthropic.answer if self.stop_reason == "end_turn" else None
        return SimpleNamespace(model="claude-opus-5-5", stop_reason=self.stop_reason, parsed_output=parsed,
                               usage=SimpleNamespace(input_tokens=10, output_tokens=20))


@pytest.fixture
def prepared(tmp_path, monkeypatch):
    monkeypatch.setattr(analyze.anthropic, "Anthropic", FakeAnthropic)
    monkeypatch.setattr(FakeAnthropic, "constructors", [])
    monkeypatch.setattr(FakeAnthropic, "parse_calls", 0)
    monkeypatch.setattr(FakeAnthropic, "sent", {})
    (tmp_path / "frames").mkdir()
    (tmp_path / "frames" / "00.jpg").write_bytes(b"jpg")
    return {"lengthSec": 2, "shots": [{"start": 0, "end": 2}], "frames": [{"t": 0.5, "file": "frames/00.jpg"}],
            "speech": [{"start": 0, "end": 1.5, "text": "hello"}]}


def test_breakdown_sends_frames_and_transcript(prepared, tmp_path, monkeypatch):
    monkeypatch.setattr(FakeAnthropic, "stop_reason", "end_turn")
    result = analyze.breakdown(prepared, tmp_path)
    assert result == RESULT
    assert result.why.hookType == "visual"
    sent = FakeAnthropic.sent
    assert sent["model"] == analyze.AI_MODEL
    assert sent["max_tokens"] == analyze.AI_MAX_TOKENS
    assert sent["output_format"] is BreakdownOut
    assert sent["output_config"] == {"effort": "high"}
    content = sent["messages"][0]["content"]
    assert [c["type"] for c in content] == ["text", "text", "image", "text"]
    assert "[0.0-1.5s] hello" in content[-1]["text"]
    assert json.loads((tmp_path / "usage.json").read_text())["output"] == 20


def test_breakdown_disables_client_retries(prepared, tmp_path):
    analyze.breakdown(prepared, tmp_path)
    assert FakeAnthropic.constructors == [{"max_retries": 0}]
    assert FakeAnthropic.parse_calls == 1


def test_breakdown_sends_no_fallback_configuration(prepared, tmp_path):
    analyze.breakdown(prepared, tmp_path)
    assert "betas" not in FakeAnthropic.sent
    assert "fallbacks" not in FakeAnthropic.sent
    assert FakeAnthropic.parse_calls == 1
    assert len(FakeAnthropic.constructors) == 1


def test_breakdown_surfaces_transport_failure_without_retry(prepared, tmp_path, monkeypatch):
    error = analyze.anthropic.APIConnectionError(request=httpx.Request("POST", "https://example.invalid/messages"))
    monkeypatch.setattr(FakeAnthropic, "transport_error", error)
    with pytest.raises(analyze.anthropic.APIConnectionError) as raised:
        analyze.breakdown(prepared, tmp_path)
    assert raised.value is error
    assert FakeAnthropic.parse_calls == 1
    assert FakeAnthropic.constructors == [{"max_retries": 0}]
    assert not (tmp_path / "usage.json").exists()


@pytest.mark.parametrize("stop", ["refusal", "max_tokens"])
def test_breakdown_raises_when_the_answer_is_unusable(prepared, tmp_path, monkeypatch, stop):
    monkeypatch.setattr(FakeAnthropic, "stop_reason", stop)
    with pytest.raises(RuntimeError):
        analyze.breakdown(prepared, tmp_path)


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="needs ffmpeg")
def test_shots_and_frames_on_a_generated_video(tmp_path):
    video = tmp_path / "video.mp4"
    inputs = []
    for color in ("red", "blue", "green"):
        inputs += ["-f", "lavfi", "-i", f"color=c={color}:s=320x240:d=1:r=25"]
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", "concat=n=3:v=1:a=0",
                    "-pix_fmt", "yuv420p", str(video)], check=True)
    total, has_audio = analyze.probe(video)
    assert total == pytest.approx(3, abs=0.1) and not has_audio
    cuts = analyze.shots(video, total)
    assert [round(a) for a, _ in cuts] == [0, 1, 2]
    picked = analyze.frames(video, cuts, tmp_path)
    assert [f["t"] for f in picked] == [0.5, 0.5, 1.5, 2.5]
    assert all((tmp_path / f["file"]).stat().st_size > 0 for f in picked)


def test_breakdown_needs_are_limited_to_the_vocabulary(prepared, tmp_path, monkeypatch):
    monkeypatch.setattr(FakeAnthropic, "answer", RESULT.model_copy(update={"needs": ["A kitchen", "A drone"]}))
    result = analyze.breakdown(prepared, tmp_path, ["A kitchen"])
    assert result.needs == ["A kitchen"]
    text = FakeAnthropic.sent["messages"][0]["content"][-1]["text"]
    assert "A kitchen" in text and "A drone" not in text


def test_old_breakdown_without_needs_loads(client, tmp_path):
    saved = tmp_path / "jobs" / "old1"
    saved.mkdir(parents=True)
    old = json.loads(RESULT.model_dump_json())
    del old["needs"]
    (saved / "breakdown.json").write_text(json.dumps(old))
    r = client.get("/api/analyze/old1")
    assert r.status_code == 200
    assert r.json()["result"]["needs"] == []


def test_ai_answer_must_carry_the_new_why_fields():
    old_why = {"hook": "h", "first3s": "f", "length": "l", "format": "fo", "sound": "s"}
    body = {"shotList": [], "why": old_why, "props": [], "editorNotes": "", "lines": []}
    with pytest.raises(Exception):
        BreakdownOut.model_validate(body)
    with pytest.raises(Exception):
        BreakdownOut.model_validate({**body, "why": {**old_why, **NEW_WHY, "hookType": "nonsense"}})
    with pytest.raises(Exception):
        BreakdownOut.model_validate({**body, "why": {**old_why, **NEW_WHY, "emotion": "sad"}})
    assert BreakdownOut.model_validate({**body, "why": {**old_why, **NEW_WHY}}).why.emotion == "craving"


def test_prompt_lists_every_choice():
    for word in ("visual", "question_or_text", "rage_bait", "informative", "challenge", "other",
                 "curious", "excited", "craving", "funny", "angry_comment", "relatable"):
        assert word in analyze.PROMPT


def test_old_breakdown_without_new_why_fields_loads(client, tmp_path):
    saved = tmp_path / "jobs" / "old2"
    saved.mkdir(parents=True)
    old = json.loads(RESULT.model_dump_json())
    for k in NEW_WHY:
        del old["why"][k]
    (saved / "breakdown.json").write_text(json.dumps(old))
    r = client.get("/api/analyze/old2")
    assert r.status_code == 200
    assert r.json()["result"]["why"]["hook"] == "h"
    assert "hookType" not in r.json()["result"]["why"]


def test_library_keeps_the_new_why_fields(client):
    why = {"hook": "h", "first3s": "f", "length": "l", "format": "fo", "sound": "s", **NEW_WHY}
    lib = {"videos": [], "formats": [{"id": "f1", "why": why}]}
    assert client.put("/api/library", json=lib).status_code == 200
    assert client.get("/api/library").json()["formats"][0]["why"] == why


def test_ai_answer_must_carry_camera_fields_but_old_breakdowns_load():
    why = {"hook": "h", "first3s": "f", "length": "l", "format": "fo", "sound": "s", **NEW_WHY}
    body = {"shotList": [{"time": "0-2s", "shot": "tofu"}], "why": why, "props": [], "editorNotes": "", "lines": []}
    with pytest.raises(Exception):
        BreakdownOut.model_validate(body)  # camera fields missing
    with pytest.raises(Exception):
        BreakdownOut.model_validate({**body, "shotList": [{"time": "0-2s", "shot": "tofu", "framing": "huge",
                                                            "angle": "low", "movement": "static"}]})
    cam = {"framing": "close_up", "angle": "low", "movement": "push_in", "tip": "Hold steady"}
    ok = BreakdownOut.model_validate({**body, "shotList": [{"time": "0-2s", "shot": "tofu", **cam}]})
    assert ok.shotList[0].framing == "close_up" and ok.shotList[0].tip == "Hold steady"
    # A breakdown saved before the fields existed still reads, with no camera fields.
    old = Breakdown.model_validate(body)
    assert old.shotList[0].framing is None and old.shotList[0].movement is None


def test_prompt_asks_for_camera_fields():
    for word in ("framing", "angle", "movement", "close_up", "extreme_close_up", "top_down", "push_in", "tracking"):
        assert word in analyze.PROMPT
    # The hook/emotion change stays in the prompt.
    assert "why.scrollStopper" in analyze.PROMPT and "why.emotion" in analyze.PROMPT


def old_breakdown():
    """A breakdown saved before hook/emotion and shot framing existed."""
    old = json.loads(RESULT.model_dump_json())
    for k in NEW_WHY:
        del old["why"][k]
    old["shotList"] = [{"time": "0-2s", "shot": "tofu"}]
    return old


def save_old(tmp_path, url=URL):
    work = tmp_path / "jobs" / analyze.job_id_for(url)
    work.mkdir(parents=True)
    (work / "breakdown.json").write_text(json.dumps(old_breakdown()))
    (work / "prepared.json").write_text(json.dumps({"url": url, "lengthSec": 2, "shots": [], "frames": [], "speech": []}))
    return work


def no_download(url, work, step):
    raise AssertionError("a re-analysis must reuse the saved frames and transcript")


def test_force_reruns_the_ai_step_only_and_replaces_the_result(client, tmp_path, monkeypatch):
    import server
    work = save_old(tmp_path)
    runs = []
    monkeypatch.setattr(analyze, "prepare", no_download)
    monkeypatch.setattr(analyze, "breakdown", lambda prepared, work, vocab=None: runs.append(1) or RESULT)
    monkeypatch.setattr(server, "jobs", analyze.Jobs())
    job_id = analyze.job_id_for(URL)
    assert client.get(f"/api/analyze/{job_id}").json()["result"]["why"].get("hookType") is None
    # Without force the saved result is returned and nothing runs.
    assert client.post("/api/analyze", json={"url": URL}).json() == {"job": job_id}
    assert runs == []
    assert client.post("/api/analyze", json={"url": URL, "force": True}).json() == {"job": job_id}
    wait(server.jobs, job_id)
    body = client.get(f"/api/analyze/{job_id}").json()
    assert runs == [1] and body["status"] == "done"
    assert body["result"]["why"]["hookType"] == "visual" and body["result"]["shotList"][0]["framing"] == "close_up"
    assert json.loads((work / "breakdown.json").read_text())["why"]["emotion"] == "craving"  # saved copy replaced


def test_failed_force_keeps_the_old_result(client, tmp_path, monkeypatch):
    import server
    work = save_old(tmp_path)

    def broken(prepared, work, vocab=None):
        raise RuntimeError("The AI declined to analyse this video.")

    monkeypatch.setattr(analyze, "prepare", no_download)
    monkeypatch.setattr(analyze, "breakdown", broken)
    monkeypatch.setattr(server, "jobs", analyze.Jobs())
    job_id = client.post("/api/analyze", json={"url": URL, "force": True}).json()["job"]
    job = wait(server.jobs, job_id)
    assert job.status == "failed" and "declined" in job.error
    assert json.loads((work / "breakdown.json").read_text()) == old_breakdown()  # untouched on disk
    assert job.result is not None and job.result.why.hook == "h"
    # Asking again without force goes back to the saved result and costs nothing.
    assert client.post("/api/analyze", json={"url": URL}).json() == {"job": job_id}
    assert client.get(f"/api/analyze/{job_id}").json()["status"] == "done"


def test_force_respects_the_daily_claude_budget(client, tmp_path, monkeypatch):
    import server
    save_old(tmp_path)
    runs = []
    monkeypatch.setattr(analyze, "prepare", no_download)
    monkeypatch.setattr(analyze, "breakdown", lambda prepared, work, vocab=None: runs.append(1) or RESULT)
    monkeypatch.setattr(server, "jobs", analyze.Jobs())
    monkeypatch.setattr(server, "DAILY_CLAUDE_USD", server.ANALYZE_USD / 2)
    r = client.post("/api/analyze", json={"url": URL, "force": True})
    assert r.status_code == 429
    time.sleep(0.2)
    assert runs == []
    assert client.get(f"/api/analyze/{analyze.job_id_for(URL)}").json()["result"]["why"]["hook"] == "h"


def test_force_is_not_charged_twice_while_running(client, tmp_path, monkeypatch):
    import server
    save_old(tmp_path)
    spent = []
    monkeypatch.setattr(server, "spend", lambda *a: spent.append(a) or True)
    monkeypatch.setattr(server, "jobs", analyze.Jobs())
    monkeypatch.setattr(server.jobs, "_q", __import__("queue").Queue())  # keep the job queued, run nothing
    client.post("/api/analyze", json={"url": URL, "force": True})
    client.post("/api/analyze", json={"url": URL, "force": True})
    assert len(spent) == 1

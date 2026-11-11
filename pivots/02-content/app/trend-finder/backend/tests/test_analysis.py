"""Background analysis of a take: silences, picture cuts, loudness, thumbnails, words (whisper faked)."""

import subprocess
from array import array

import pytest

import analysis
import cutting
import server
import takes
from test_cutting_media import FAKE_WORDS, GAP_CLIP, make_clip, need_ffmpeg
from test_takes import MP4, A, idea, store_ideas, up


@pytest.fixture
def setup(client):
    client.put("/api/clients", json=[A])
    store_ideas(idea("ia"), idea("ib"))


@pytest.fixture
def fake_whisper(monkeypatch):
    monkeypatch.setattr(cutting, "transcribe_words", lambda wav, work, prompt=None: FAKE_WORDS)
    monkeypatch.setattr(analysis.analyze, "WHISPER", __file__)  # only its existence is checked by callers


def colour_cut_clip(path):
    """2 s red then 2 s blue: one hard cut at 2.0 s."""
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=320x240:r=24:d=2",
           "-f", "lavfi", "-i", "color=c=blue:s=320x240:r=24:d=2", "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]",
           "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(path)]
    assert subprocess.run(cmd, capture_output=True, stdin=subprocess.DEVNULL).returncode == 0
    return path


@need_ffmpeg
def test_analyse_finds_words_silence_loudness_and_thumbs(tmp_path, fake_whisper):
    clip = make_clip(tmp_path / "gap.mp4", GAP_CLIP)
    out = analysis.analyse(clip, tmp_path / "film")
    assert out["duration"] == pytest.approx(3.5, abs=0.1) and out["width"] == 640 and out["height"] == 360
    assert out["fps"] == 24 and out["hasAudio"] is True
    assert [w["text"] for w in out["transcript"]["words"]] == ["hello", "world"]
    assert out["transcript"]["status"] == "ok"
    assert len(out["silences"]) == 1
    s, e = out["silences"][0]
    assert s == pytest.approx(1.0, abs=0.1) and e == pytest.approx(2.5, abs=0.1)
    assert out["loudness"]["integratedLufs"] < 0 and out["loudness"]["lra"] is not None
    assert len(out["filmstrip"]["times"]) == 3
    assert len(list((tmp_path / "film").glob("*.jpg"))) == 3
    assert out["peaks"]["rate"] == 50 and len(out["peaks"]["values"]) == pytest.approx(175, abs=2)
    assert max(out["peaks"]["values"][60:115]) < 0.02 < max(out["peaks"]["values"][5:45])


def sine_and_silence_wav(path):
    """1 s of a 440 Hz sine at full scale, 1.5 s of silence, then 1 s of the sine at half scale: mono 16 kHz."""
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "sine=f=440:d=1:r=16000", "-f", "lavfi", "-t", "1.5",
           "-i", "anullsrc=r=16000:cl=mono", "-f", "lavfi", "-i", "sine=f=440:d=1:r=16000",
           "-filter_complex", "[0:a]volume=8[a0];[2:a]volume=4[a2];[a0][1:a][a2]concat=n=3:v=0:a=1,aformat=channel_layouts=mono[a]",
           "-map", "[a]", "-ar", "16000", "-ac", "1", str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    assert r.returncode == 0, r.stderr
    return path


@need_ffmpeg
def test_peaks_are_high_in_tone_and_low_in_silence(tmp_path):
    wav = sine_and_silence_wav(tmp_path / "tone.wav")
    got = analysis.audio_peaks(wav, tmp_path, 3.5)
    assert got["rate"] == 50
    v = got["values"]
    assert len(v) == pytest.approx(175, abs=2)
    assert all(0 <= x <= 1 for x in v) and all(x == round(x, 2) for x in v)
    tone, quiet, half = v[5:45], v[60:115], v[130:170]  # away from the joins
    assert min(tone) > 0.5 and max(quiet) < 0.02 and 0.2 < min(half) and max(half) < max(tone)


def test_peaks_of_and_rate():
    assert analysis.peaks_of(array("h", [0, 16384, -32768, 100, 0, 0]), 4, 2) == [0.5, 1.0, 0.0]
    assert analysis.peaks_of(array("h", [8192, -16384, 3]), 2, 1) == [0.5, 0.0]
    assert analysis.peak_rate(60) == 50 and analysis.peak_rate(120) == 50
    assert analysis.peak_rate(300) == 20 and analysis.peak_rate(300) * 300 <= analysis.PEAK_MAX


@need_ffmpeg
def test_whisper_missing_is_unavailable_not_failed(tmp_path, monkeypatch):
    def gone(wav, work, prompt=None):
        raise cutting.CutError(cutting.NO_WHISPER)
    monkeypatch.setattr(cutting, "transcribe_words", gone)
    out = analysis.analyse(make_clip(tmp_path / "gap.mp4", GAP_CLIP), tmp_path / "film")
    assert out["transcript"]["status"] == "unavailable" and out["transcript"]["words"] == []
    assert len(out["silences"]) == 1


@need_ffmpeg
def test_hard_colour_cut_is_found(tmp_path):
    out = analysis.analyse(colour_cut_clip(tmp_path / "cut.mp4"), tmp_path / "film")
    assert out["hasAudio"] is False and out["loudness"] is None and out["peaks"] is None and out["transcript"]["status"] == "none"
    assert len(out["cuts"]) == 1 and out["cuts"][0]["t"] == pytest.approx(2.0, abs=0.1)


def test_parsers():
    assert analysis.parse_cuts("x lavfi.scd.score: 15.40, lavfi.scd.time: 2.0833\n") == [{"t": 2.083, "score": 15.4}]
    assert analysis.parse_loudness('{"input_i" : "-inf", "input_tp": "-inf", "input_lra": "0.00"}') is None
    got = analysis.parse_loudness('noise {\n"input_i" : "-20.31",\n"input_tp" : "-3.10",\n"input_lra" : "4.20"\n}')
    assert got == {"integratedLufs": -20.3, "truePeakDb": -3.1, "lra": 4.2}


def jobs_with(run):
    return analysis.AnalysisJobs(server.db, lambda: server.MEDIA_DIR, run)


def test_upload_marks_unreadable_file_failed(client, setup):
    t = up(client).json()  # MP4 stub bytes: ffprobe cannot read them
    assert t["analysis"]["status"] == "failed" and "read" in t["analysis"]["error"]
    assert client.get("/api/ideas/ia/takes").json()[0]["analysis"]["status"] == "failed"


def test_job_runs_and_results_are_served(client, setup):
    tid = up(client).json()["id"]
    jobs = jobs_with(lambda path, film: {"duration": 1.0, "transcript": {"status": "ok", "words": [{"text": "hi"}]},
                                         "silences": [[0.1, 0.5]], "cuts": []})
    jobs.submit("ia", tid)
    assert client.get(f"/api/ideas/ia/takes/{tid}/analysis").json()["status"] == "queued"
    jobs._one("ia", tid)
    got = client.get(f"/api/ideas/ia/takes/{tid}/analysis").json()
    assert got["status"] == "done" and got["results"]["silences"] == [[0.1, 0.5]]
    listed = client.get("/api/ideas/ia/takes").json()[0]["analysis"]
    assert listed["status"] == "done" and listed["summary"]["words"] == 1 and listed["summary"]["silences"] == 1
    assert isinstance(listed["updatedAt"], int) and listed["updatedAt"] > 0


def test_failed_job_then_retry(client, setup):
    tid = up(client).json()["id"]

    def boom(path, film):
        raise cutting.CutError("Reading the sound failed: nope")
    jobs = jobs_with(boom)
    jobs.submit("ia", tid)
    jobs._one("ia", tid)
    got = client.get(f"/api/ideas/ia/takes/{tid}/analysis").json()
    assert got["status"] == "failed" and "nope" in got["error"]
    r = client.post(f"/api/ideas/ia/takes/{tid}/analysis/retry")
    assert r.status_code == 200 and r.json()["status"] == "queued"
    assert client.get(f"/api/ideas/ia/takes/{tid}/analysis").json()["status"] == "queued"


def test_old_take_without_analysis_is_queued_on_get(client, setup):
    tid = up(client).json()["id"]
    with server.db() as conn:
        conn.execute("DELETE FROM take_analysis")
    assert client.get(f"/api/ideas/ia/takes/{tid}/analysis").json()["status"] == "queued"


def test_resume_queues_unanalysed_takes(client, setup):
    tid = up(client).json()["id"]
    with server.db() as conn:
        conn.execute("DELETE FROM take_analysis")
    seen = []
    jobs = jobs_with(None)
    jobs._enqueue = lambda idea_id, take_id: seen.append(take_id)
    jobs.resume()
    assert seen == [tid]


def test_delete_removes_analysis_and_thumbnails(client, setup):
    tid = up(client).json()["id"]
    film = analysis.film_dir(server.MEDIA_DIR / "ia", tid)
    film.mkdir(parents=True)
    (film / "00.jpg").write_bytes(b"\xff\xd8jpg")
    assert client.get(f"/api/ideas/ia/takes/{tid}/analysis/thumbs/0").content == b"\xff\xd8jpg"
    client.delete(f"/api/ideas/ia/takes/{tid}")
    assert not film.exists()
    with server.db() as conn:
        assert conn.execute("SELECT COUNT(*) FROM take_analysis").fetchone()[0] == 0
    assert client.get(f"/api/ideas/ia/takes/{tid}/analysis").status_code == 404


def test_job_for_deleted_take_leaves_nothing(client, setup):
    tid = up(client).json()["id"]
    film = analysis.film_dir(server.MEDIA_DIR / "ia", tid)

    def make(path, f):
        f.mkdir(parents=True)
        (f / "00.jpg").write_bytes(b"x")
        client.delete(f"/api/ideas/ia/takes/{tid}")  # deleted while the job runs
        return {"duration": 1}
    jobs = jobs_with(make)
    jobs.submit("ia", tid)
    jobs._one("ia", tid)
    assert not film.exists()
    with server.db() as conn:
        assert conn.execute("SELECT COUNT(*) FROM take_analysis").fetchone()[0] == 0


def test_other_plans_take_is_not_reachable(client, setup):
    tid = up(client, idea="ia").json()["id"]
    for method, path in (("get", f"/api/ideas/ib/takes/{tid}/analysis"), ("post", f"/api/ideas/ib/takes/{tid}/analysis/retry"),
                         ("get", f"/api/ideas/ib/takes/{tid}/analysis/thumbs/0"), ("get", f"/api/ideas/zz/takes/{tid}/analysis")):
        assert getattr(client, method)(path).status_code == 404


def test_analysis_needs_sign_in(client, setup):
    from fastapi.testclient import TestClient
    from test_auth import add_user, login
    tid = up(client).json()["id"]
    add_user()
    anon = TestClient(server.app)
    for method, path in (("get", f"/api/ideas/ia/takes/{tid}/analysis"), ("post", f"/api/ideas/ia/takes/{tid}/analysis/retry"),
                         ("get", f"/api/ideas/ia/takes/{tid}/analysis/thumbs/0")):
        assert getattr(anon, method)(path).status_code == 401
    assert login(anon).status_code == 200
    assert anon.get(f"/api/ideas/ia/takes/{tid}/analysis").status_code == 200

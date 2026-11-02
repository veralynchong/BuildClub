"""Generation jobs with the free mock provider: models, submit, poll, files, restart recovery."""

import json
import shutil
import subprocess

import pytest

import generations
import server
from test_takes import idea, store_ideas


@pytest.fixture
def gen(client, monkeypatch):
    monkeypatch.setattr(generations, "MOCK_DELAY_S", 0)
    monkeypatch.setattr(server.gen_jobs, "submit", server.gen_jobs.run)  # run inline, no worker thread
    store_ideas(idea("ia"), idea("ib"), idea("iw", "waiting"))
    return client


def post(client, idea_id="ia", **body):
    body = {"nodeId": "n1", "model": "mock-image", "prompt": "a tofu bar", **body}
    return client.post(f"/api/ideas/{idea_id}/gen", json=body)


def test_models_file_shape(client):
    models = generations.load_models()
    assert models
    for m in models:
        assert m["kind"] in ("image", "video", "voice") and m["tier"] in ("cheap", "balanced", "best")
        assert set(m["inputs"].values()) <= {"required", "optional", "none"}
        assert "9:16" in m["aspects"]
    assert client.get("/api/gen/models").json() == {"models": models}


def test_mock_image_done(gen):
    r = post(gen)
    assert r.status_code == 201 and r.json()["status"] == "queued"
    gid = r.json()["id"]
    row = gen.get(f"/api/ideas/ia/gen/{gid}").json()
    assert row["status"] == "done" and row["estUsd"] == 0 and row["nodeId"] == "n1" and row["kind"] == "image"
    assert row["url"] == f"/api/ideas/ia/gen/{gid}/file"
    f = gen.get(row["url"])
    assert f.status_code == 200 and f.headers["content-type"].startswith("image/svg+xml")
    assert "default-src 'none'" in f.headers["content-security-policy"]


def test_mock_failure_on_prompt(gen):
    gid = post(gen, prompt="x #fail").json()["id"]
    row = gen.get(f"/api/ideas/ia/gen/{gid}").json()
    assert row["status"] == "failed" and row["error"] == "Mock failure (the prompt asked for one)."
    assert row["url"] is None


def test_rows_are_append_only(gen):
    first = post(gen).json()["id"]
    before = gen.get(f"/api/ideas/ia/gen/{first}").json()
    post(gen, prompt="another")
    rows = gen.get("/api/ideas/ia/gen").json()
    assert len(rows) == 2 and rows[0] == before


def test_unknown_model_422(gen):
    assert post(gen, model="nope").status_code == 422


def test_unavailable_provider_422(gen, monkeypatch):
    monkeypatch.setattr(generations, "load_models", lambda: [
        {"id": "x", "kind": "image", "provider": "other", "tier": "best", "price": {"per": "image", "usd": 1},
         "inputs": {"text": "required"}, "aspects": ["9:16"]}])
    r = post(gen, model="x")
    assert r.status_code == 422 and r.json()["error"] == "This model isn't available yet."


def test_plan_not_approved_409(gen):
    r = post(gen, idea_id="iw")
    assert r.status_code == 409 and r.json()["error"] == "Only an approved plan can generate."


def test_missing_plan_404(gen):
    assert post(gen, idea_id="nope").status_code == 404


def test_input_from_other_plan_422(gen):
    other = post(gen, idea_id="ib").json()["id"]
    assert post(gen, startFrame=other).status_code == 422
    mine = post(gen).json()["id"]
    assert post(gen, reference=mine).status_code == 201


def test_bad_duration_422(gen):
    assert post(gen, model="mock-video", duration=5).status_code == 422


def test_restart_fails_unfinished_jobs(gen):
    with server.db() as conn:
        conn.execute("INSERT INTO generations (id, idea_id, node_id, kind, model, inputs, input_hash, status, "
                     "est_usd, created_at) VALUES ('r1','ia','n1','image','mock-image','{}','h','running',0,1)")
    generations.fail_unfinished(server.db)
    row = gen.get("/api/ideas/ia/gen/r1").json()
    assert row["status"] == "failed" and row["error"] == "The server restarted before this finished. Try again."


def test_insert_done(gen):
    with server.db() as conn:
        row = generations.insert_done(conn, "ia", "n1", "image", "imported", source_url="https://x/y.png")
    assert row["url"] == "https://x/y.png" and row["status"] == "done" and row["model"] == "imported"


def test_file_path_cannot_escape(gen):
    assert gen.get("/api/ideas/../gen/x/file").status_code == 404
    assert gen.get("/api/ideas/%2e%2e/gen/x/file").status_code == 404


def test_estimate_usd():
    assert generations.estimate_usd({"price": {"per": "second", "usd": 0.5}}, 4) == 2.0
    assert generations.estimate_usd({"price": {"per": "image", "usd": 0.04}}, None) == 0.04


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="needs ffmpeg")
def test_mock_video_spec(gen):
    gid = post(gen, model="mock-video", duration=4).json()["id"]
    row = gen.get(f"/api/ideas/ia/gen/{gid}").json()
    assert row["status"] == "done", row
    path = server.MEDIA_DIR / "ia" / "gen" / f"{gid}.mp4"
    out = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True).stdout)
    v = next(s for s in out["streams"] if s["codec_type"] == "video")
    a = next(s for s in out["streams"] if s["codec_type"] == "audio")
    assert (v["codec_name"], v["width"], v["height"], v["r_frame_rate"]) == ("h264", 1080, 1920, "30/1")
    assert a["codec_name"] == "aac"
    assert abs(float(out["format"]["duration"]) - 4) < 0.1

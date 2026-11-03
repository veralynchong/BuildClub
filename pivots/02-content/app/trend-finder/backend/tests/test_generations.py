"""Generation jobs with the free mock provider: models, submit, poll, files, restart recovery."""

import json
import os
from pathlib import Path
import shutil
import subprocess

import pytest

import gen_providers
import generations
import server
from test_canvas import plan
from test_takes import A, store_ideas


@pytest.fixture
def gen(client, monkeypatch):
    monkeypatch.setattr(gen_providers, "MOCK_DELAY_S", 0)
    monkeypatch.setattr(server.gen_jobs, "submit", server.gen_jobs.run)  # run inline, no worker thread
    store_ideas(plan("ia"), plan("ib"), plan("iw", "waiting"))
    for i in ("ia", "ib", "iw"):
        client.get(f"/api/ideas/{i}/canvas")  # builds the canvas the nodes live on
    return client


def post(client, idea_id="ia", **body):
    body = {"nodeId": "n_sb_s1", "model": "mock-image", "prompt": "a tofu bar", **body}
    return client.post(f"/api/ideas/{idea_id}/gen", json=body)


def test_models_file_shape(client):
    models = generations.load_models()
    assert models
    for m in models:
        assert m["kind"] in ("image", "video", "voice") and m["tier"] in ("cheap", "balanced", "best")
        assert set(m["inputs"].values()) <= {"required", "optional", "none"}
        assert m["kind"] == "voice" or "9:16" in m["aspects"]  # a voice has no frame shape
    assert client.get("/api/gen/models").json() == {"models": generations.menu_models()}


def test_models_file_valid():
    assert generations.validate_models(generations.load_models()) == []


def test_validate_models_catches_errors():
    ok = {"id": "a", "kind": "image", "provider": "mock", "aspects": ["9:16"]}
    assert generations.validate_models([ok]) == []
    errs = generations.validate_models([
        ok, {**ok},
        {"id": "v", "kind": "video", "provider": "mock", "aspects": ["16:9"]},
        {"id": "p", "kind": "image", "provider": "other", "aspects": ["9:16"]}])
    assert len(errs) == 3


def fake_models(monkeypatch, *extra):
    base = {"kind": "image", "tier": "best", "price": {"per": "image", "usd": 1}, "endpoint": "e",
            "priceCheckedAt": "2026-11-03", "inputs": {"text": "required"}, "aspects": ["9:16"]}
    monkeypatch.setattr(generations, "load_models", lambda: [{**base, **m} for m in extra])


def test_retired_model_hidden_but_rows_still_load(gen, monkeypatch):
    fake_models(monkeypatch, {"id": "old", "provider": "mock", "retired": True},
                {"id": "new", "provider": "mock"})
    ids = [m["id"] for m in gen.get("/api/gen/models").json()["models"]]
    assert ids == ["new"]
    with server.db() as conn:
        gid = generations.insert_done(conn, "ia", "n_sb_s1", "image", "old")["id"]
    assert gen.get(f"/api/ideas/ia/gen/{gid}").status_code == 200
    assert post(gen, model="old").status_code == 422


def test_available_follows_keys(gen, monkeypatch):
    fake_models(monkeypatch, {"id": "f", "provider": "fal"}, {"id": "g", "provider": "gemini"},
                {"id": "m", "provider": "mock"})
    monkeypatch.delenv("FAL_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    got = {m["id"]: m["available"] for m in gen.get("/api/gen/models").json()["models"]}
    assert got == {"f": False, "g": False, "m": True}
    monkeypatch.setenv("FAL_KEY", "x")
    got = {m["id"]: m["available"] for m in gen.get("/api/gen/models").json()["models"]}
    assert got == {"f": True, "g": False, "m": True}


def test_mock_image_done(gen):
    r = post(gen)
    assert r.status_code == 201 and r.json()["status"] == "queued"
    gid = r.json()["id"]
    row = gen.get(f"/api/ideas/ia/gen/{gid}").json()
    assert row["status"] == "done" and row["estUsd"] == 0 and row["nodeId"] == "n_sb_s1" and row["kind"] == "image"
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


def test_gen_node_must_exist(gen):
    assert post(gen, nodeId="nope").status_code == 422
    assert post(gen, nodeId="n_shot_s1").status_code == 422


def test_kind_mismatch_422(gen):
    assert post(gen, model="mock-video").status_code == 422  # a storyboard node takes images
    with server.db() as conn:
        conn.execute("UPDATE canvases SET doc = replace(doc, '\"type\": \"storyboard\"', '\"type\": \"video\"') "
                     "WHERE idea_id = 'ia'")
    assert post(gen, model="mock-video").status_code == 201
    assert post(gen).status_code == 422


def test_unknown_model_422(gen):
    assert post(gen, model="nope").status_code == 422


def test_create_rejects_unavailable_model(gen, monkeypatch):
    fake_models(monkeypatch, {"id": "x", "provider": "fal"})
    monkeypatch.delenv("FAL_KEY", raising=False)
    r = post(gen, model="x")
    assert r.status_code == 422 and r.json()["error"] == "This model isn't set up yet."


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
    generations.recover(server.db, server.gen_jobs)
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
    c = gen.get("/api/ideas/ia/canvas").json()
    c["doc"]["nodes"].append({"id": "n_vid", "type": "video", "position": {"x": 0, "y": 0}, "data": {}})
    assert gen.put("/api/ideas/ia/canvas", json={"version": c["version"], "doc": c["doc"]}).status_code == 200
    gid = post(gen, nodeId="n_vid", model="mock-video", duration=4).json()["id"]
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


PNG = b"\x89PNG\r\n\x1a\n" + b"\0" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\0" * 32
WEBP = b"RIFF\0\0\0\0WEBP" + b"\0" * 32


def upload_node(client, idea_id="ia", node_id="n_up"):
    c = client.get(f"/api/ideas/{idea_id}/canvas").json()
    c["doc"]["nodes"].append({"id": node_id, "type": "upload", "position": {"x": 0, "y": 0}, "data": {}})
    assert client.put(f"/api/ideas/{idea_id}/canvas", json={"version": c["version"], "doc": c["doc"]}).status_code == 200


def up_img(client, body=PNG, ctype="image/png", idea_id="ia", node="n_up"):
    return client.post(f"/api/ideas/{idea_id}/gen/upload?nodeId={node}", content=body, headers={"content-type": ctype})


def test_upload_image(gen):
    upload_node(gen)
    for body, ctype, ext in ((PNG, "image/png", "png"), (JPG, "image/jpeg", "jpg"), (WEBP, "image/webp", "webp")):
        r = up_img(gen, body, ctype)
        assert r.status_code == 200, r.text
        row = r.json()
        assert row["model"] == "upload" and row["status"] == "done" and row["kind"] == "image" and row["nodeId"] == "n_up"
        f = gen.get(row["url"])
        assert f.status_code == 200 and f.headers["content-type"] == ctype and f.content == body
        assert (server.MEDIA_DIR / "ia" / "gen" / f"{row['id']}.{ext}").is_file() or any(
            (server.MEDIA_DIR / "ia" / "gen").glob(f"*.{ext}"))
    listed = gen.get("/api/ideas/ia/gen").json()
    assert [g["model"] for g in listed] == ["upload"] * 3


def test_upload_rejects_wrong_type_or_header(gen):
    upload_node(gen)
    assert up_img(gen, PNG, "text/plain").status_code == 415
    assert up_img(gen, PNG, "image/svg+xml").status_code == 415
    assert up_img(gen, b"not a png at all", "image/png").status_code == 415
    assert up_img(gen, PNG, "image/jpeg").status_code == 415  # header must match the declared type
    assert gen.get("/api/ideas/ia/gen").json() == []
    assert not list((server.MEDIA_DIR / "ia" / "gen").glob("*")) if (server.MEDIA_DIR / "ia" / "gen").exists() else True


def test_upload_too_big(gen, monkeypatch):
    upload_node(gen)
    monkeypatch.setattr(generations, "MAX_UPLOAD_BYTES", 100)
    assert up_img(gen, PNG + b"\0" * 200).status_code == 413
    assert gen.get("/api/ideas/ia/gen").json() == []
    assert not list((server.MEDIA_DIR / "ia" / "gen").glob("*")) if (server.MEDIA_DIR / "ia" / "gen").exists() else True


def test_upload_needs_upload_node(gen):
    assert up_img(gen, node="n_sb_s1").status_code == 422  # a storyboard node
    assert up_img(gen, node="nope").status_code == 422
    assert gen.post("/api/ideas/ia/gen/upload", content=PNG, headers={"content-type": "image/png"}).status_code == 422


def test_upload_needs_approved_plan(gen):
    assert up_img(gen, idea_id="iw").status_code == 409
    assert up_img(gen, idea_id="nope").status_code == 404


def test_upload_path_safety(gen):
    assert up_img(gen, idea_id="%2e%2e").status_code in (404, 405, 422)
    assert not (server.MEDIA_DIR.parent / "gen").exists()


def test_input_must_be_a_finished_image_of_the_plan(gen):
    failed = post(gen, prompt="x #fail").json()["id"]
    assert gen.get(f"/api/ideas/ia/gen/{failed}").json()["status"] == "failed"
    assert post(gen, startFrame=failed).status_code == 422
    with server.db() as conn:
        conn.execute("INSERT INTO generations (id, idea_id, node_id, kind, model, inputs, input_hash, status, "
                     "est_usd, created_at) VALUES ('q1','ia','n_sb_s1','image','mock-image','{}','h','queued',0,1)")
        conn.execute("INSERT INTO generations (id, idea_id, node_id, kind, model, inputs, input_hash, status, "
                     "est_usd, created_at) VALUES ('v1','ia','n_vid','video','mock-video','{}','h','done',0,1)")
    assert post(gen, reference="q1").status_code == 422
    assert post(gen, reference="v1").status_code == 422
    assert post(gen, startFrame="q1").status_code == 422


def test_finish_only_updates_a_running_row(gen):
    gid = post(gen).json()["id"]
    before = gen.get(f"/api/ideas/ia/gen/{gid}").json()
    assert before["status"] == "done"
    server.gen_jobs._finish(gid, "failed", error="late")
    assert gen.get(f"/api/ideas/ia/gen/{gid}").json() == before


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="needs ffmpeg")
def test_mock_video_failure_hides_ffmpeg_output_and_cleans_up(gen, monkeypatch):
    c = gen.get("/api/ideas/ia/canvas").json()
    c["doc"]["nodes"].append({"id": "n_vid", "type": "video", "position": {"x": 0, "y": 0}, "data": {}})
    assert gen.put("/api/ideas/ia/canvas", json={"version": c["version"], "doc": c["doc"]}).status_code == 200

    def broken(cmd, **kw):
        folder = server.MEDIA_DIR / "ia" / "gen"
        (folder / f"{cmd[-1].split('/')[-1]}").write_bytes(b"half")
        return subprocess.CompletedProcess(cmd, 1, "", "/secret/path: Invalid argument")

    monkeypatch.setattr(generations.cutting, "run", broken)
    gid = post(gen, nodeId="n_vid", model="mock-video", duration=4).json()["id"]
    row = gen.get(f"/api/ideas/ia/gen/{gid}").json()
    assert row["status"] == "failed" and row["error"] == "The mock video failed. Try again."
    assert "secret" not in row["error"]
    assert list((server.MEDIA_DIR / "ia" / "gen").glob("*.part*")) == []


# --- real providers behind a fake adapter: spend, refund, unknown, resume, input rules ---

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\0" * 32


class FakeAdapter:
    """submit returns `rid` (or raises); poll walks `polls` (a Poll, an exception, or a list of them)."""

    def __init__(self, rid="req-1", submit_error=None, polls=None):
        self.rid, self.submit_error = rid, submit_error
        self.polls = list(polls if polls is not None else [gen_providers.Poll("done", data=PNG_BYTES, ext="png")])
        self.submits, self.poll_ids, self.jobs = 0, [], []

    def submit(self, job):
        self.submits += 1
        self.jobs.append(job)
        if self.submit_error:
            raise self.submit_error
        return self.rid

    def poll(self, job, request_id):
        self.poll_ids.append(request_id)
        step = self.polls.pop(0) if len(self.polls) > 1 else self.polls[0]
        if isinstance(step, Exception):
            raise step
        return step


@pytest.fixture
def real(gen, monkeypatch):
    """fal-backed models with a fake adapter; spends and refunds are recorded, not charged."""
    monkeypatch.setenv("FAL_KEY", "k")
    monkeypatch.setattr(generations, "GEN_POLL_S", 0)
    monkeypatch.setattr(generations, "MOCK_POLL_S", 0)
    gen.spent, gen.refunds, gen.adapter = [], [], FakeAdapter()
    monkeypatch.setattr(server.gen_router, "budget", lambda kind, usd: gen.spent.append((kind, usd)))
    monkeypatch.setattr(server.gen_jobs, "refund", lambda kind, usd: gen.refunds.append((kind, usd)))
    monkeypatch.setattr(gen_providers, "adapter_for", lambda provider, *a, **k: gen.adapter)
    return gen


def row_of(client, gid, idea_id="ia"):
    return client.get(f"/api/ideas/{idea_id}/gen/{gid}").json()


def request_id(gid):
    with server.db() as conn:
        return conn.execute("SELECT provider_request_id FROM generations WHERE id = ?", (gid,)).fetchone()[0]


def test_create_spends_estimate(real):
    r = post(real, model="seedream-4.5")
    assert r.status_code == 201
    assert real.spent == [("image", 0.04)]
    row = row_of(real, r.json()["id"])
    assert row["status"] == "done" and row["actualUsd"] == 0.04 and row["estUsd"] == 0.04
    assert row["after"] is None and real.refunds == []
    assert request_id(row["id"]) == "req-1"


def test_over_budget_429_writes_no_row(real, monkeypatch):
    monkeypatch.setattr(server.gen_router, "budget",
                        lambda kind, usd: generations.error(429, "Today's image generation budget has US$0.01 left."))
    r = post(real, model="seedream-4.5")
    assert r.status_code == 429 and "US$0.01 left" in r.json()["error"]
    assert real.get("/api/ideas/ia/gen").json() == []
    assert real.adapter.submits == 0


def test_invalid_request_spends_nothing(real):
    assert post(real, model="seedream-4.5", prompt="x" * 5000).status_code == 422
    assert post(real, model="nope").status_code == 422
    assert real.spent == []


def test_provider_error_fails_and_refunds(real):
    real.adapter = FakeAdapter(submit_error=gen_providers.ProviderError("The model provider didn't accept this request."))
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "failed" and row["error"] == "The model provider didn't accept this request."
    assert real.refunds == [("image", 0.04)]
    real.adapter = FakeAdapter(polls=[gen_providers.Poll("failed", error="The model reported a failure.")])
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "failed" and row["error"] == "The model reported a failure."
    assert real.refunds == [("image", 0.04)] * 2


def test_result_lost_is_unknown_without_refund(real):
    msg = "The provider didn't answer in time. It may have charged."
    real.adapter = FakeAdapter(submit_error=gen_providers.ResultLost("x"))
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "unknown" and row["error"] == msg and row["url"] is None
    real.adapter = FakeAdapter(polls=[gen_providers.ResultLost("gone")])
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "unknown" and row["error"] == msg
    assert real.refunds == []


def test_poll_timeout_marks_unknown_no_refund(real, monkeypatch):
    monkeypatch.setattr(generations, "GEN_TIMEOUT_S", {"image": 0.05, "video": 0.05})
    real.adapter = FakeAdapter(polls=[gen_providers.Poll("running")])
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "unknown" and row["error"] == "The provider didn't answer in time. It may have charged."
    assert real.refunds == [] and len(real.adapter.poll_ids) >= 2


def test_default_timeouts():
    assert generations.GEN_TIMEOUT_S == {"image": 180, "video": 900, "voice": 120}
    assert generations.GEN_POLL_S == 5 and generations.MOCK_POLL_S == 0.2


def test_unusable_file_after_success_fails_without_refund(real):
    real.adapter = FakeAdapter(polls=[gen_providers.FileUnusable("bad")])
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "failed" and row["url"] is None
    assert row["error"] == "The model finished but its file couldn't be saved. It may have charged."
    assert real.refunds == []


def test_unexpected_error_after_submit_is_unknown(real):
    real.adapter = FakeAdapter(polls=[RuntimeError("boom")])
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "unknown" and real.refunds == []


def test_unexpected_error_inside_submit_is_unknown(real):
    real.adapter = FakeAdapter(submit_error=RuntimeError("boom"))  # the request may have gone out
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "unknown" and real.refunds == []


def test_error_before_anything_is_sent_refunds(real, monkeypatch):
    def broken(self, folder, idea_id, ref_id):
        raise OSError("disk read failed")  # e.g. reading an input image
    monkeypatch.setattr(generations.GenJobs, "_input_path", broken)
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "failed" and row["error"] == "The generation failed. Try again."
    assert real.refunds == [("image", 0.04)] and real.adapter.submits == 0


def test_missing_input_file_before_send_fails_and_refunds(real):
    a = post(real, model="seedream-4.5").json()["id"]
    (server.MEDIA_DIR / "ia" / "gen" / f"{a}.png").unlink()
    real.refunds.clear()
    row = row_of(real, post(real, model="seedream-4.5", reference=a).json()["id"])
    assert row["status"] == "failed" and row["error"] == "An input image is missing."
    assert real.refunds == [("image", 0.04)]


def test_error_from_poll_after_send_is_unknown(real):
    real.adapter = FakeAdapter(polls=[gen_providers.ProviderError("odd")])
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "unknown" and real.refunds == []


def test_resumed_row_does_not_resolve_inputs(real):
    # the start frame is gone, but polling needs only the request id: it finishes, no refund
    with server.db() as conn:
        conn.execute("INSERT INTO generations (id, idea_id, node_id, kind, model, inputs, input_hash, status, "
                     "est_usd, created_at, provider_request_id) VALUES ('r9','ia','n_sb_s1','image','seedream-4.5',"
                     "?, 'h','running',0.04,1,'req-9')", (json.dumps({"prompt": "p", "startFrame": "gone"}),))
    generations.recover(server.db, server.gen_jobs)
    assert row_of(real, "r9")["status"] == "done" and real.refunds == []
    assert real.adapter.poll_ids == ["req-9"]


def test_restart_during_submit_is_unknown(real):
    insert_row("s1", "running", request_id=generations.SUBMITTING)
    insert_row("s2", "running")  # never reached submit
    generations.recover(server.db, server.gen_jobs)
    assert row_of(real, "s1")["status"] == "unknown" and row_of(real, "s1")["error"] == generations.LOST
    assert row_of(real, "s2")["status"] == "failed"
    assert real.refunds == [("image", 0.04)]  # only s2
    assert real.adapter.poll_ids == []
    server.gen_jobs.run("s1")  # a sentinel row is never polled
    assert real.adapter.poll_ids == []


def test_request_id_is_marked_before_submit(real):
    seen = []

    def submit(job):
        with server.db() as conn:
            seen.append(conn.execute("SELECT provider_request_id FROM generations").fetchone()[0])
        return "req-x"

    real.adapter.submit = submit
    gid = post(real, model="seedream-4.5").json()["id"]
    assert seen == [generations.SUBMITTING] and request_id(gid) == "req-x"


def test_done_writes_file_atomically(real):
    real.adapter = FakeAdapter(polls=[RuntimeError("boom")])
    post(real, model="seedream-4.5")
    folder = server.MEDIA_DIR / "ia" / "gen"
    assert not folder.exists() or list(folder.iterdir()) == []
    real.adapter = FakeAdapter()
    gid = post(real, model="seedream-4.5").json()["id"]
    assert sorted(p.name for p in folder.iterdir()) == [f"{gid}.png"]
    assert (folder / f"{gid}.png").read_bytes() == PNG_BYTES
    assert real.get(f"/api/ideas/ia/gen/{gid}/file").headers["content-type"] == "image/png"


def insert_row(gid, status, request_id=None, model="seedream-4.5", est=0.04, kind="image"):
    with server.db() as conn:
        conn.execute("INSERT INTO generations (id, idea_id, node_id, kind, model, inputs, input_hash, status, "
                     "est_usd, created_at, provider_request_id) VALUES (?,'ia','n_sb_s1',?,?,?,'h',?,?,1,?)",
                     (gid, kind, model, json.dumps({"prompt": "p"}), status, est, request_id))


def test_restart_resumes_polling_rows_with_request_id(real):
    insert_row("r1", "running", request_id="req-old")
    generations.recover(server.db, server.gen_jobs)  # the test fixture runs queued ids inline
    row = row_of(real, "r1")
    assert row["status"] == "done" and row["actualUsd"] == 0.04
    assert real.adapter.submits == 0 and real.adapter.poll_ids == ["req-old"]  # polled, never re-submitted
    assert real.refunds == []


def test_restart_fails_and_refunds_unsubmitted(real):
    insert_row("q1", "queued")
    insert_row("r2", "running")  # no request id: never reached the provider
    insert_row("v1", "running", model="mock-video", est=0.0, kind="video")
    generations.recover(server.db, server.gen_jobs)
    for gid in ("q1", "r2", "v1"):
        row = row_of(real, gid)
        assert row["status"] == "failed" and row["error"] == generations.RESTARTED
    assert sorted(real.refunds) == [("image", 0.04), ("image", 0.04), ("video", 0.0)]
    assert real.adapter.submits == 0


def test_restart_does_not_touch_finished_or_unknown_rows(real):
    insert_row("d1", "done", request_id="x")
    insert_row("u1", "unknown", request_id="x")
    generations.recover(server.db, server.gen_jobs)
    assert row_of(real, "d1")["status"] == "done" and row_of(real, "u1")["status"] == "unknown"
    assert real.refunds == []


def test_resumed_gemini_row_without_result_is_unknown(real):
    real.adapter = FakeAdapter(polls=[gen_providers.ResultLost("The image is no longer in memory.")])
    insert_row("g1", "running", request_id="gemini-1")
    generations.recover(server.db, server.gen_jobs)
    assert row_of(real, "g1")["status"] == "unknown" and real.refunds == []


def test_model_input_rules_enforced(real):
    a = post(real, model="seedream-4.5").json()["id"]  # a finished image to use as an input
    real.spent.clear()
    c = real.get("/api/ideas/ia/canvas").json()
    c["doc"]["nodes"].append({"id": "n_vid", "type": "video", "position": {"x": 0, "y": 0}, "data": {}})
    assert real.put("/api/ideas/ia/canvas", json={"version": c["version"], "doc": c["doc"]}).status_code == 200
    # hailuo needs a start frame and takes no reference image
    r = post(real, nodeId="n_vid", model="hailuo-2.3-fast", duration=6)
    assert r.status_code == 422 and r.json()["error"] == "This model needs a start frame."
    r = post(real, nodeId="n_vid", model="hailuo-2.3-fast", duration=6, startFrame=a, reference=a)
    assert r.status_code == 422 and r.json()["error"] == "This model doesn't take a reference image."
    # seedream (image) takes no start frame; a reference is fine
    r = post(real, model="seedream-4.5", startFrame=a)
    assert r.status_code == 422 and r.json()["error"] == "This model doesn't take a start frame."
    assert post(real, model="seedream-4.5", reference=a).status_code == 201
    assert real.spent == [("image", 0.04)]  # rejected requests spent nothing
    ok = post(real, nodeId="n_vid", model="hailuo-2.3-fast", duration=6, startFrame=a)
    assert ok.status_code == 201
    assert real.spent[-1] == ("video", round(0.032 * 6, 4))


def test_worker_passes_input_files_to_the_adapter(real):
    a = post(real, model="seedream-4.5").json()["id"]
    gid = post(real, model="seedream-4.5", reference=a).json()["id"]
    job = real.adapter.jobs[-1]
    assert job.references == [server.MEDIA_DIR / "ia" / "gen" / f"{a}.png"] and job.start is None
    assert row_of(real, gid)["status"] == "done"


def test_waiting_status_and_after_column(real):
    insert_row("w1", "waiting")
    with server.db() as conn:
        conn.execute("UPDATE generations SET after = 'a1' WHERE id = 'w1'")
    assert row_of(real, "w1")["after"] == "a1"
    generations.recover(server.db, server.gen_jobs)
    assert row_of(real, "w1")["status"] == "failed"  # its image row doesn't exist: the video can never start


def test_migrate_adds_columns_to_an_old_table():
    import sqlite3
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE generations (id TEXT PRIMARY KEY, status TEXT)")
    generations.migrate(conn)
    generations.migrate(conn)  # twice is fine
    assert {"provider_request_id", "after"} <= {r[1] for r in conn.execute("PRAGMA table_info(generations)")}


def test_failed_write_leaves_no_part_or_final_file(real, monkeypatch):
    folder = server.MEDIA_DIR / "ia" / "gen"

    def broken_write(self, data):
        self.open("wb").write(data[:4])  # a half-written .part
        raise OSError("disk full")

    monkeypatch.setattr(generations.Path, "write_bytes", broken_write)
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "failed" and row["error"] == generations.FILE_LOST and row["url"] is None
    assert real.refunds == [] and list(folder.iterdir()) == []


def test_failed_replace_leaves_no_part_or_final_file(real, monkeypatch):
    def broken_replace(*a):
        raise OSError("nope")

    monkeypatch.setattr(generations.os, "replace", broken_replace)
    row = row_of(real, post(real, model="seedream-4.5").json()["id"])
    assert row["status"] == "failed" and row["error"] == generations.FILE_LOST and real.refunds == []
    assert list((server.MEDIA_DIR / "ia" / "gen").iterdir()) == []


def test_image_finishes_while_a_video_is_still_polling(real, monkeypatch):
    import threading
    release = threading.Event()

    class Slow:
        def submit(self, job):
            return "req-" + job.model["kind"]

        def poll(self, job, request_id):
            if job.model["kind"] == "video" and not release.is_set():
                return gen_providers.Poll("running")
            return gen_providers.Poll("done", data=PNG_BYTES if job.model["kind"] == "image"
                                      else b"\0\0\0\x18ftypmp42" + b"\0" * 8,
                                      ext="png" if job.model["kind"] == "image" else "mp4")

    real.adapter = Slow()
    monkeypatch.setattr(generations, "GEN_POLL_S", 0.01)
    jobs = generations.GenJobs(server.db, lambda: server.MEDIA_DIR)
    insert_row("vid1", "queued", model="hailuo-2.3-fast", est=0.19, kind="video")
    insert_row("img1", "queued")
    try:
        jobs.submit("vid1")
        jobs.submit("img1")
        import time as _t
        for _ in range(200):
            if row_of(real, "img1")["status"] == "done":
                break
            _t.sleep(0.02)
        assert row_of(real, "img1")["status"] == "done"
        assert row_of(real, "vid1")["status"] == "running"
        release.set()
        for _ in range(200):
            if row_of(real, "vid1")["status"] == "done":
                break
            _t.sleep(0.02)
        assert row_of(real, "vid1")["status"] == "done"
    finally:
        release.set()


def chain_canvas(edge=True):
    """Add a video node (and an image -> video start edge) to plan ia's canvas."""
    with server.db() as conn:
        doc = json.loads(conn.execute("SELECT doc FROM canvases WHERE idea_id = 'ia'").fetchone()[0])
        doc["nodes"].append({"id": "n_vid", "type": "video", "position": {"x": 0, "y": 0}, "data": {}})
        if edge:
            doc["edges"].append({"id": "e_start", "source": "n_sb_s1", "sourceHandle": "out",
                                 "target": "n_vid", "targetHandle": "in:start"})
        conn.execute("UPDATE canvases SET doc = ? WHERE idea_id = 'ia'", (json.dumps(doc),))


def chain(client, idea_id="ia", **body):
    body = {"imageNodeId": "n_sb_s1", "videoNodeId": "n_vid", "imageModel": "seedream-4.5",
            "videoModel": "hailuo-2.3-fast", "prompt": "a tofu bar", "duration": 6, "confirm": True, **body}
    return client.post(f"/api/ideas/{idea_id}/gen/chain", json=body)


def test_chain_quote_spends_nothing(real):
    chain_canvas()
    r = chain(real, confirm=False)
    assert r.status_code == 200
    out = r.json()
    assert out["items"] == [{"nodeId": "n_sb_s1", "model": "seedream-4.5", "usd": 0.04},
                            {"nodeId": "n_vid", "model": "hailuo-2.3-fast", "usd": 0.192}]
    assert out["total"] == 0.232 and set(out["remaining"]) == {"image", "video"}
    assert real.spent == [] and real.get("/api/ideas/ia/gen").json() == []


def test_chain_needs_start_edge(real):
    chain_canvas(edge=False)
    for confirm in (False, True):
        r = chain(real, confirm=confirm)
        assert r.status_code == 422 and r.json()["error"] == "Connect the storyboard to the video's start frame first."
    assert real.spent == []


def test_chain_validates_like_create(real):
    chain_canvas()
    assert chain(real, videoModel="seedream-4.5").status_code == 422  # wrong kind for the video node
    assert chain(real, imageNodeId="n_vid").status_code == 422
    assert chain(real, duration=7).status_code == 422
    assert chain(real, videoNodeId="nope").status_code == 422
    assert chain(real, idea_id="iw").status_code == 409
    assert chain(real, idea_id="zz").status_code == 404
    assert real.spent == []


def test_chain_over_budget_starts_nothing(real, monkeypatch):
    chain_canvas()
    monkeypatch.setattr(server.gen_router, "remaining", lambda: {"image": {"spent": 0, "cap": 1},
                                                                  "video": {"spent": 0, "cap": 0.1}})
    r = chain(real)
    assert r.status_code == 429 and "0.10" in r.json()["error"] and "1.00" in r.json()["error"]
    assert real.spent == [] and real.refunds == [] and real.adapter.submits == 0
    assert real.get("/api/ideas/ia/gen").json() == []


def test_chain_second_spend_failure_refunds_the_first(real, monkeypatch):
    chain_canvas()
    monkeypatch.setattr(server.gen_router, "remaining", lambda: {"image": {"spent": 0, "cap": 1},
                                                                  "video": {"spent": 0, "cap": 1}})
    monkeypatch.setattr(server.gen_router, "budget", lambda kind, usd: (
        generations.error(429, "video wallet empty") if kind == "video" else real.spent.append((kind, usd))))
    monkeypatch.setattr(server.gen_router, "refund", lambda kind, usd: real.refunds.append((kind, usd)))
    r = chain(real)
    assert r.status_code == 429
    assert real.refunds == [("image", 0.04)] and real.get("/api/ideas/ia/gen").json() == []


def test_chain_runs_video_after_image(real, monkeypatch):
    chain_canvas()
    queued = []
    monkeypatch.setattr(server.gen_jobs, "submit", queued.append)  # hold the worker to see the waiting row
    r = chain(real)
    assert r.status_code == 201
    img, vid = r.json()["image"], r.json()["video"]
    assert img["status"] == "queued" and vid["status"] == "waiting" and vid["after"] == img["id"]
    assert vid["inputs"]["startFrame"] == img["id"] and vid["inputs"]["duration"] == 6
    assert real.spent == [("image", 0.04), ("video", 0.192)] and queued == [img["id"]]
    monkeypatch.setattr(server.gen_jobs, "submit", server.gen_jobs.run)
    server.gen_jobs.run(img["id"])
    assert row_of(real, img["id"])["status"] == "done"
    assert row_of(real, vid["id"])["status"] == "done"
    assert real.adapter.jobs[1].start == server.MEDIA_DIR / "ia" / "gen" / f"{img['id']}.png"
    assert real.refunds == []


def test_chain_image_failure_fails_and_refunds_video(real):
    chain_canvas()
    real.adapter.submit_error = gen_providers.ProviderError("nope")
    r = chain(real)
    assert r.status_code == 201
    img, vid = r.json()["image"], r.json()["video"]
    assert row_of(real, img["id"])["status"] == "failed"
    got = row_of(real, vid["id"])
    assert got["status"] == "failed" and got["error"] == "The start frame wasn't made, so the video didn't run."
    assert sorted(real.refunds) == [("image", 0.04), ("video", 0.192)]
    assert real.adapter.submits == 1  # the video was never sent


def test_chain_image_unknown_fails_video_and_refunds_only_video(real):
    chain_canvas()
    real.adapter.submit_error = gen_providers.ResultLost("timeout")
    r = chain(real)
    assert row_of(real, r.json()["image"]["id"])["status"] == "unknown"
    assert row_of(real, r.json()["video"]["id"])["status"] == "failed"
    assert real.refunds == [("video", 0.192)]


def test_waiting_row_is_released_once(real, monkeypatch):
    chain_canvas()
    submitted = []
    monkeypatch.setattr(server.gen_jobs, "submit", submitted.append)
    r = chain(real)
    img, vid = r.json()["image"]["id"], r.json()["video"]["id"]
    server.gen_jobs.run(img)
    server.gen_jobs.release(img, "done")  # a second call must not queue or submit it again
    assert submitted == [img, vid]
    assert row_of(real, vid)["status"] == "queued"


def insert_waiting(gid, after, kind="video", model="hailuo-2.3-fast", est=0.192):
    insert_row(gid, "waiting", model=model, est=est, kind=kind)
    with server.db() as conn:
        conn.execute("UPDATE generations SET after = ?, inputs = ? WHERE id = ?",
                     (after, json.dumps({"prompt": "p", "startFrame": after, "duration": 6}), gid))


def test_recover_handles_orphan_waiting(real, monkeypatch):
    insert_row("up_done", "done")
    with server.db() as conn:
        conn.execute("UPDATE generations SET file = 'up_done.png' WHERE id = 'up_done'")
    (server.MEDIA_DIR / "ia" / "gen").mkdir(parents=True, exist_ok=True)
    (server.MEDIA_DIR / "ia" / "gen" / "up_done.png").write_bytes(PNG_BYTES)
    insert_row("up_failed", "failed")
    insert_row("up_run", "running", request_id="req-x")
    insert_waiting("w_done", "up_done")
    insert_waiting("w_failed", "up_failed")
    insert_waiting("w_gone", "no-such-row")
    insert_waiting("w_run", "up_run")
    submitted = []
    monkeypatch.setattr(server.gen_jobs, "submit", submitted.append)
    generations.recover(server.db, server.gen_jobs)
    assert row_of(real, "w_done")["status"] == "queued" and "w_done" in submitted
    for gid in ("w_failed", "w_gone"):
        got = row_of(real, gid)
        assert got["status"] == "failed" and got["error"] == generations.START_FRAME_LOST
    assert real.refunds == [("video", 0.192), ("video", 0.192)]
    assert row_of(real, "w_run")["status"] == "waiting"  # the upstream will release it
    server.gen_jobs.release("up_failed", "failed")  # the row is already settled: no second refund
    assert len(real.refunds) == 2 and submitted.count("w_done") == 1


def test_recover_failing_upstream_also_fails_its_waiting_row(real):
    insert_row("up_q", "queued")
    insert_waiting("w1", "up_q")
    generations.recover(server.db, server.gen_jobs)
    assert row_of(real, "up_q")["status"] == "failed" and row_of(real, "w1")["status"] == "failed"
    assert sorted(real.refunds) == [("image", 0.04), ("video", 0.192)]


def test_budget_endpoint(client):
    r = client.get("/api/gen/budget")
    assert r.status_code == 200 and r.json() == server.gen_remaining()
    assert set(r.json()) == {"image", "video", "voice"} and set(r.json()["image"]) == {"spent", "cap"}


def test_chain_image_step_must_be_an_image_model_on_a_storyboard(real, monkeypatch):
    chain_canvas()
    with server.db() as conn:  # a second video node wired as if it were the storyboard
        doc = json.loads(conn.execute("SELECT doc FROM canvases WHERE idea_id = 'ia'").fetchone()[0])
        doc["nodes"].append({"id": "n_vid2", "type": "video", "position": {"x": 0, "y": 0}, "data": {}})
        doc["edges"].append({"id": "e2", "source": "n_vid2", "sourceHandle": "out", "target": "n_vid",
                             "targetHandle": "in:start"})
        conn.execute("UPDATE canvases SET doc = ? WHERE idea_id = 'ia'", (json.dumps(doc),))
    r = chain(real, imageNodeId="n_vid2", imageModel="mock-video", videoModel="mock-video", duration=4)
    assert r.status_code == 422 and "image model" in r.json()["error"]
    r = chain(real, imageNodeId="n_vid2", imageModel="seedream-4.5")  # right kind, wrong node type
    assert r.status_code == 422
    assert real.spent == [] and real.get("/api/ideas/ia/gen").json() == []


def test_create_rejects_the_pending_sentinel(real):
    r = post(real, model="seedream-4.5", startFrame=generations.PENDING)
    assert r.status_code == 422 and real.spent == []
    chain_canvas()
    r = post(real, nodeId="n_vid", model="hailuo-2.3-fast", startFrame=generations.PENDING, duration=6)
    assert r.status_code == 422 and real.spent == []


def test_recover_fails_waiting_row_without_upstream(real):
    insert_row("w_null", "waiting", model="hailuo-2.3-fast", est=0.192, kind="video")
    generations.recover(server.db, server.gen_jobs)
    got = row_of(real, "w_null")
    assert got["status"] == "failed" and got["error"] == generations.START_FRAME_LOST
    generations.recover(server.db, server.gen_jobs)
    assert real.refunds == [("video", 0.192)]


# --- final review fixes: imported frames as inputs (I1), required prompt (I3), rejected references (I2) ---

def video_node(client):
    c = client.get("/api/ideas/ia/canvas").json()
    c["doc"]["nodes"].append({"id": "n_vid", "type": "video", "position": {"x": 0, "y": 0}, "data": {}})
    assert client.put("/api/ideas/ia/canvas", json={"version": c["version"], "doc": c["doc"]}).status_code == 200


def imported_row(gid, source_url, idea_id="ia"):
    with server.db() as conn:
        conn.execute("INSERT INTO generations (id, idea_id, node_id, kind, model, inputs, input_hash, status, "
                     "est_usd, source_url, created_at) VALUES (?,?,'n_sb_s1','image','imported','{}','','done',0,?,1)",
                     (gid, idea_id, source_url))


def put_frame(idea_id="ia", name="1-abcdefgh.png"):
    folder = server.MEDIA_DIR / idea_id / "frames"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(PNG_BYTES)


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="needs ffmpeg")
def test_imported_frame_can_start_a_video(gen):
    video_node(gen)
    put_frame()
    imported_row("imp1", "/api/ideas/ia/frames/1-abcdefgh.png")
    gid = post(gen, nodeId="n_vid", model="mock-video", duration=4, startFrame="imp1").json()["id"]
    assert row_of_gen(gen, gid)["status"] == "done"


def row_of_gen(client, gid, idea_id="ia"):
    return client.get(f"/api/ideas/{idea_id}/gen/{gid}").json()


def test_imported_frame_path_reaches_the_adapter(real):
    put_frame()
    imported_row("imp1", "/api/ideas/ia/frames/1-abcdefgh.png")
    gid = post(real, model="seedream-4.5", reference="imp1").json()["id"]
    assert row_of(real, gid)["status"] == "done"
    assert real.adapter.jobs[-1].references == [server.MEDIA_DIR / "ia" / "frames" / "1-abcdefgh.png"]


@pytest.mark.parametrize("url", [
    "/api/ideas/ib/frames/1-abcdefgh.png",          # another plan's frame
    "/api/ideas/ia/frames/..%2Fx.png",              # bad name
    "/api/ideas/ia/frames/../gen/x.png",
    "/api/ideas/ia/frames/bad.png",
    "https://example.com/api/ideas/ia/frames/1-abcdefgh.png",
    "/api/ideas/ia/frames/1-abcdefgh.png/extra",
])
def test_imported_frame_from_elsewhere_or_bad_name_fails(real, url):
    put_frame()
    put_frame("ib")
    imported_row("imp1", url)
    row = row_of(real, post(real, model="seedream-4.5", reference="imp1").json()["id"])
    assert row["status"] == "failed" and row["error"] == "An input image is missing."
    assert real.adapter.submits == 0


def test_text_required_model_rejects_a_blank_prompt(real):
    for blank in ("", "   \n"):
        r = post(real, model="seedream-4.5", prompt=blank)
        assert r.status_code == 422 and r.json()["error"] == "This model needs a prompt."
    r = post(real, model="mock-image", prompt=" ")
    assert r.status_code == 422 and r.json()["error"] == "This model needs a prompt."
    assert real.spent == []


def test_text_optional_model_takes_a_blank_prompt(gen):
    video_node(gen)
    assert post(gen, nodeId="n_vid", model="mock-video", duration=4, prompt="").status_code == 201


def test_chain_blank_video_prompt_falls_back_to_the_image_prompt(real):
    chain_canvas()
    for blank in ("", "  "):
        r = chain(real, videoPrompt=blank)
        assert r.status_code == 201
        assert json.loads(json.dumps(r.json()["video"]["inputs"]))["prompt"] == "a tofu bar"


def test_chain_blank_image_prompt_is_rejected(real):
    chain_canvas()
    r = chain(real, prompt=" ", videoPrompt="move")
    assert r.status_code == 422 and r.json()["error"] == "This model needs a prompt."
    assert real.spent == []


def test_chain_rejects_references(real):
    chain_canvas()
    a = post(real, model="seedream-4.5").json()["id"]
    real.spent.clear()
    for field in ("reference", "videoReference"):
        r = chain(real, **{field: a})
        assert r.status_code == 422 and "reference" in r.json()["error"]
    assert chain(real, reference=None, videoReference=None).status_code == 201
    assert len(real.spent) == 2


# --- voiceover (TTS) jobs: the routes live in editing.py, the rules and the job in this module ---

import cutting  # noqa: E402

TTS = "/api/ideas/ia/edit/voice/tts"


def tts(client, **body):
    return client.post(TTS, json={"text": "hello", "model": "elevenlabs-multilingual-v2", "confirm": False, **body})


@pytest.fixture
def paid_voice(monkeypatch):
    """The ElevenLabs entry counts as set up (no real key is set, and no request is ever made)."""
    monkeypatch.setattr(generations, "is_available", lambda m: True)


def test_tts_quote_spends_nothing(gen, paid_voice):
    r = tts(gen, text="a" * 400)
    assert r.status_code == 200 and r.json() == {"usd": 0.032, "remaining": server.DAILY_GEN_VOICE_USD}
    assert server.gen_remaining()["voice"]["spent"] == 0
    assert gen.get("/api/ideas/ia/gen").json() == []


def test_tts_over_budget_429(gen, paid_voice, monkeypatch):
    monkeypatch.setattr(server, "DAILY_GEN_VOICE_USD", 0)
    r = tts(gen, confirm=True)
    assert r.status_code == 429 and "left" in r.json()["error"]
    assert gen.get("/api/ideas/ia/gen").json() == []


def test_tts_charges_the_voice_wallet_and_queues_a_row(gen, paid_voice, monkeypatch):
    monkeypatch.setattr(server.gen_jobs, "submit", lambda gid: None)  # no job: look at the queued row
    r = tts(gen, confirm=True)
    row = r.json()
    assert r.status_code == 201 and row["status"] == "queued" and row["kind"] == "voice"
    assert row["nodeId"] == "editor-voice" and row["inputs"]["prompt"] == "hello" and row["estUsd"] == 0.0004
    assert server.gen_remaining()["voice"]["spent"] == 0.0004 and server.gen_remaining()["image"]["spent"] == 0


@pytest.mark.parametrize("body", [
    {"text": ""}, {"text": "   "}, {"text": "a" * 1001}, {"text": "字" * 241},
    {"text": 5}, {"model": "mock-image"}, {"model": "nope"},
], ids=["empty", "blank", "1001-chars", "over-120s", "not-text", "image-model", "unknown-model"])
def test_tts_rejects_bad_requests(gen, paid_voice, body):
    r = tts(gen, **body)
    assert r.status_code == 422 and "error" in r.json()


def test_tts_needs_an_approved_plan_and_a_set_up_model(gen):
    assert gen.post("/api/ideas/iw/edit/voice/tts", json={"text": "hi", "model": "mock-voice"}).status_code == 409
    assert tts(gen).status_code == 422  # ElevenLabs has no key here


def test_voice_model_cannot_be_made_through_the_canvas_route(gen):
    assert post(gen, model="mock-voice", nodeId="editor-voice").status_code == 422
    assert post(gen, model="mock-voice").status_code == 422


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"), reason="needs ffmpeg")
def test_tts_mock_runs_and_imports(gen, monkeypatch):
    monkeypatch.setattr(cutting, "transcribe_words", lambda wav, work: [(0.0, 0.5, "hi"), (0.5, 1.0, "you")])
    r = gen.post(TTS, json={"text": "hello world", "model": "mock-voice", "confirm": True})
    assert r.status_code == 201
    gid = r.json()["id"]
    done = gen.get(f"/api/ideas/ia/gen/{gid}").json()
    assert done["status"] == "done" and done["url"] == f"/api/ideas/ia/gen/{gid}/file"
    assert gen.get(done["url"]).headers["content-type"] == "audio/mpeg"
    imported = gen.post(f"/api/ideas/ia/edit/voice/from-gen/{gid}")
    assert imported.status_code == 200
    got = imported.json()
    assert got["words"] == [{"text": "hi", "start": 0.0, "end": 0.5}, {"text": "you", "start": 0.5, "end": 1.0}]
    assert abs(got["duration"] - 2.75) < 0.3  # 11 width units x 0.25 s
    f = gen.get(got["url"])
    assert f.status_code == 200 and f.headers["content-type"] == "audio/mpeg"
    assert gen_providers.sniff(f.content[:16]) == ("voice", "mp3")
    assert gen.delete(f"/api/ideas/ia/edit/voice/{got['id']}").status_code == 200
    assert gen.get(got["url"]).status_code == 404


def test_from_gen_needs_a_finished_voice_row(gen):
    with server.db() as conn:
        queued = generations.enqueue(conn, "ia", "editor-voice", "voice", "mock-voice", {"prompt": "hi"}, 0)
        image = generations.insert_done(conn, "ia", "n_sb_s1", "image", "mock-image", file="x.png")
    assert gen.post(f"/api/ideas/ia/edit/voice/from-gen/{queued['id']}").status_code == 409
    assert gen.post(f"/api/ideas/ia/edit/voice/from-gen/{image['id']}").status_code == 404
    assert gen.post("/api/ideas/ia/edit/voice/from-gen/nope").status_code == 404
    assert gen.post(f"/api/ideas/ib/edit/voice/from-gen/{queued['id']}").status_code == 404  # another plan's row


def test_voice_file_and_delete_of_a_missing_voice_are_404(gen):
    assert gen.get("/api/ideas/ia/edit/voice/nope/file").status_code == 404
    assert gen.delete("/api/ideas/ia/edit/voice/nope").status_code == 404
    assert gen.get("/api/ideas/ia/edit/voice/..%2F..%2Fx/file").status_code == 404


def test_estimate_usd_per_1k_chars():
    model = {"price": {"per": "1k_chars", "usd": 0.08}}
    assert generations.estimate_usd(model, None, chars=500) == 0.04  # 500 chars (the route caps by width)
    assert generations.estimate_usd(model, 9) == 0


def test_elevenlabs_is_available_only_with_key_and_voice(monkeypatch):
    model = next(m for m in generations.load_models() if m["provider"] == "elevenlabs")
    assert model["endpoint"] == "eleven_multilingual_v2" and model["params"]["voiceId"] == ""
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.delenv("ELEVENLABS_VOICE_ID", raising=False)
    assert not generations.is_available(model)
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    assert not generations.is_available(model)
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "v")
    assert generations.is_available(model)


# --- P2.5: N references (plan generations and kit images) and the kit prompt prefix ---

B = {**A, "id": "b", "name": "Other Shop"}


def kit_item(client, name="Mia", kind="character", note="short bob", images=1, cid="a", write_files=True):
    """A kit item of client `cid` with `images` real files; returns the item as the kit route reports it."""
    client.put("/api/clients", json=[A, B])
    made = client.post(f"/api/clients/{cid}/kit/items", json={"kind": kind, "name": name, "note": note}).json()
    for _ in range(images):
        made = client.put(f"/api/clients/{cid}/kit/items/{made['id']}/images", content=PNG_BYTES,
                          headers={"content-type": "image/png"}).json()
    return made


def kref(item, n=0):
    return {"source": "kit", "itemId": item["id"], "image": item["images"][n]}


def test_refs_kit_item_ok_and_copied(gen):
    mia = kit_item(gen)
    r = post(gen, references=[kref(mia)])
    assert r.status_code == 201
    inputs = r.json()["inputs"]
    ref = inputs["references"][0]
    assert ref["source"] == "kit" and ref["name"] == "Mia" and ref["kind"] == "character"
    assert (server.MEDIA_DIR / "ia" / "gen" / ref["file"]).is_file()
    assert inputs["kitStamp"] == {mia["id"]: mia["updatedAt"]}
    assert inputs["prompt"] == "a tofu bar" and inputs["sentPrompt"].startswith("Reference images:")
    assert inputs["sentPrompt"].endswith("a tofu bar")


def test_no_kit_refs_sent_prompt_equals_prompt(gen):
    mine = post(gen).json()["id"]
    inputs = post(gen, references=[{"source": "gen", "genId": mine}]).json()["inputs"]
    assert inputs["sentPrompt"] == inputs["prompt"] and inputs["kitStamp"] == {}
    assert inputs["references"] == [{"source": "gen", "genId": mine}]


def test_kit_ref_other_client_422(gen):
    theirs = kit_item(gen, cid="b")
    assert post(gen, references=[kref(theirs)]).status_code == 422
    mia = kit_item(gen, name="Mia")
    assert post(gen, references=[{**kref(mia), "image": "ka_nope.png"}]).status_code == 422  # not this item's image
    assert post(gen, references=[{"source": "kit", "itemId": "k_nope", "image": "x.png"}]).status_code == 422


def test_kit_ref_deleted_file_422(real):
    mia = kit_item(real)
    (server.MEDIA_DIR / "kit" / "a" / mia["images"][0]).unlink()
    real.spent.clear()
    r = post(real, model="seedream-4.5", references=[kref(mia)])
    assert r.status_code == 422 and r.json()["error"] == "An input image is missing."
    assert real.spent == []


def test_refs_over_max_422(gen):
    mia = kit_item(gen, images=4)
    ok = [kref(mia, n) for n in range(4)] * 3 + [kref(mia, 0), kref(mia, 1)]
    assert len(ok) == 14 and post(gen, references=ok).status_code == 201
    assert post(gen, references=ok + [kref(mia, 2)]).status_code == 422


def test_refs_on_none_model_422(gen, monkeypatch):
    fake_models(monkeypatch, {"id": "n", "provider": "mock", "inputs": {"text": "required", "reference": "none"},
                              "maxRefs": 5})
    mia = kit_item(gen)
    r = post(gen, model="n", references=[kref(mia)])
    assert r.status_code == 422 and r.json()["error"] == "This model doesn't take a reference image."


def test_missing_maxrefs_means_one(gen, monkeypatch):
    fake_models(monkeypatch, {"id": "m", "provider": "mock", "price": {"per": "image", "usd": 0},
                              "inputs": {"text": "required", "reference": "optional"}})
    mia = kit_item(gen, images=2)
    assert post(gen, model="m", references=[kref(mia, 0), kref(mia, 1)]).status_code == 422
    assert post(gen, model="m", references=[kref(mia, 0)]).status_code == 201


def test_legacy_reference_field_still_works(gen):
    mine = post(gen).json()["id"]
    r = post(gen, reference=mine)
    assert r.status_code == 201 and r.json()["inputs"]["references"] == [{"source": "gen", "genId": mine}]
    both = post(gen, reference="nope", references=[{"source": "gen", "genId": mine}])  # references wins
    assert both.status_code == 201


def test_legacy_row_reads_as_references(gen):
    with server.db() as conn:
        conn.execute("INSERT INTO generations (id, idea_id, node_id, kind, model, inputs, input_hash, status, "
                     "est_usd, created_at) VALUES ('old1','ia','n_sb_s1','image','mock-image',?,'h','done',0,1)",
                     (json.dumps({"prompt": "p", "reference": "g_7"}),))
    inputs = gen.get("/api/ideas/ia/gen/old1").json()["inputs"]
    assert inputs["references"] == [{"source": "gen", "genId": "g_7"}] and "reference" not in inputs


def test_input_hash_order_independent():
    a, b = {"source": "gen", "genId": "g1"}, {"source": "kit", "itemId": "k1", "image": "x.png"}
    h = generations.input_hash
    assert h("m", "p", None, [a, b], None) == h("m", "p", None, [b, a], None)
    assert h("m", "p", None, [a], None) != h("m", "p", None, [a, b], None)


def test_prefix_too_long_shortens_notes(gen):
    long_note = "n" * 200
    mia = kit_item(gen, note=long_note)
    cup = kit_item(gen, name="Cup", kind="product", note=long_note)
    # room for the prefix only once the notes are cut to 60 characters
    r = post(gen, prompt="p" * 3560, references=[kref(mia), kref(cup)])
    assert r.status_code == 201
    sent = r.json()["inputs"]["sentPrompt"]
    assert len(sent) <= generations.MAX_PROMPT and "n" * 60 in sent and "n" * 61 not in sent
    # with no room for notes at all they are dropped
    r = post(gen, prompt="p" * 3750, references=[kref(mia), kref(cup)])
    assert r.status_code == 201 and "nnn" not in r.json()["inputs"]["sentPrompt"]
    # nothing fits
    assert post(gen, prompt="p" * 3990, references=[kref(mia), kref(cup)]).status_code == 422


def test_mock_image_shows_ref_count(gen):
    mia = kit_item(gen, images=3)
    gid = post(gen, references=[kref(mia, n) for n in range(3)]).json()["id"]
    assert "3 refs" in gen.get(f"/api/ideas/ia/gen/{gid}/file").text


def test_chain_with_kit_refs(real):
    chain_canvas()
    mia = kit_item(real)
    r = chain(real, references=[kref(mia)])
    assert r.status_code == 201
    image, video = r.json()["image"]["inputs"], r.json()["video"]["inputs"]
    ref = image["references"][0]
    assert ref["source"] == "kit" and ref["name"] == "Mia"
    assert (server.MEDIA_DIR / "ia" / "gen" / ref["file"]).is_file()
    assert image["kitStamp"] == {mia["id"]: mia["updatedAt"]}
    assert image["sentPrompt"].startswith("Reference images:") and image["sentPrompt"].endswith("a tofu bar")
    assert video["references"] == []
    assert chain(real, references=[kref(mia)], videoReference="x").status_code == 422
    assert chain(real, references=[kref(mia)], reference="x").status_code == 422


def test_chain_quote_unchanged_by_refs(real):
    chain_canvas()
    mia = kit_item(real)
    plain = chain(real, confirm=False).json()
    with_refs = chain(real, confirm=False, references=[kref(mia)]).json()
    assert plain["total"] == with_refs["total"] and plain["items"] == with_refs["items"]
    assert real.spent == []
    assert not (server.MEDIA_DIR / "ia" / "gen").exists() or not list((server.MEDIA_DIR / "ia" / "gen").glob("kit-*"))


def test_chain_refs_over_max_422(real):
    chain_canvas()
    mia = kit_item(real, images=4)
    real.spent.clear()
    too_many = [kref(mia, n) for n in range(4)] * 3  # 12 > seedream-4.5's maxRefs of 10
    for confirm in (False, True):
        r = chain(real, confirm=confirm, references=too_many)
        assert r.status_code == 422
    assert real.spent == []


def test_worker_sends_kit_files_and_full_prompt(real):
    mia = kit_item(real)
    a = post(real, model="seedream-4.5").json()["id"]
    gid = post(real, model="seedream-4.5", references=[{"source": "gen", "genId": a}, kref(mia)]).json()["id"]
    job = real.adapter.jobs[-1]
    copy = server.MEDIA_DIR / "ia" / "gen" / row_of(real, gid)["inputs"]["references"][1]["file"]
    assert job.references == [server.MEDIA_DIR / "ia" / "gen" / f"{a}.png", copy]
    assert job.prompt.startswith("Reference images: image 2 is the character") and job.prompt.endswith("a tofu bar")


def test_kit_copies_of_one_image_use_separate_temp_files(gen, monkeypatch):
    mia = kit_item(gen)
    stored = [{"source": "kit", "image": mia["images"][0], "file": f"kit-{mia['images'][0]}"}]
    import kit
    seen = []
    real_replace = os.replace

    def spy(src, dst):
        seen.append(Path(src).name)
        real_replace(src, dst)

    monkeypatch.setattr(generations.os, "replace", spy)
    for _ in range(2):
        generations.copy_kit_images(kit, server.MEDIA_DIR, "a", "ia", stored)
    assert len(seen) == 2 and seen[0] != seen[1]
    folder = server.MEDIA_DIR / "ia" / "gen"
    assert (folder / stored[0]["file"]).read_bytes() == PNG_BYTES
    assert not [p for p in folder.iterdir() if p.name.endswith(".part")]


def test_kit_copy_shrinks_big_image_and_keeps_small_one(gen):
    from PIL import Image
    import kit
    folder = kit.kit_folder(server.MEDIA_DIR, "a")
    folder.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", (3000, 2000), (200, 10, 10, 128)).save(folder / "ka_big.png")
    Image.new("RGB", (800, 600), (1, 2, 3)).save(folder / "ka_small.png")
    stored = [{"source": "kit", "image": n, "file": f"kit-{n}"} for n in ("ka_big.png", "ka_small.png")]
    generations.copy_kit_images(kit, server.MEDIA_DIR, "a", "ia", stored)
    out = server.MEDIA_DIR / "ia" / "gen"
    with Image.open(out / "kit-ka_big.png") as big:
        assert max(big.size) == 1536 and big.mode == "RGBA"
    assert (out / "kit-ka_small.png").read_bytes() == (folder / "ka_small.png").read_bytes()  # never touched
    with Image.open(folder / "ka_big.png") as original:
        assert original.size == (3000, 2000)
    assert not [p for p in out.iterdir() if p.name.endswith(".part")]


def test_models_with_per_ref_price_are_rejected():
    errors = generations.validate_models([{"id": "m", "provider": "mock", "kind": "image", "price": {"usd": 1, "perRefUsd": 0.1}}])
    assert any("perRefUsd" in e for e in errors)


def test_text_only_style_ref_adds_style_line(real):
    film = kit_item(real, name="Warm film", kind="style", note="", images=0)
    mia = kit_item(real)
    text_only = {"source": "kit", "itemId": film["id"]}
    r = post(real, model="seedream-4.5", references=[kref(mia), text_only])
    assert r.status_code == 201
    inputs = row_of(real, r.json()["id"])["inputs"]
    assert "Style: Warm film" in inputs["sentPrompt"] and inputs["sentPrompt"].startswith("Reference images: image 1 is")
    assert inputs["kitStamp"][film["id"]] == film["updatedAt"]
    assert inputs["references"][1] == {"source": "kit", "itemId": film["id"], "name": "Warm film", "kind": "style"}
    assert len(real.adapter.jobs[-1].references) == 1  # the style ref is not a file
    # not counted against maxRefs: seedream-4.5 takes 10 images, plus the text-only one
    ten = [kref(mia)] * 10
    assert post(real, model="seedream-4.5", references=ten + [text_only]).status_code == 201


def test_kit_ref_without_image_for_item_with_images_422(gen):
    mia = kit_item(gen)
    r = post(gen, references=[{"source": "kit", "itemId": mia["id"]}])
    assert r.status_code == 422 and r.json()["error"] == "A kit item with images must send an image."

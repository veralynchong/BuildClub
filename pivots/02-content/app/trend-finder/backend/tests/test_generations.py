"""Generation jobs with the free mock provider: models, submit, poll, files, restart recovery."""

import json
import shutil
import subprocess

import pytest

import generations
import server
from test_canvas import plan
from test_takes import store_ideas


@pytest.fixture
def gen(client, monkeypatch):
    monkeypatch.setattr(generations, "MOCK_DELAY_S", 0)
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
        assert "9:16" in m["aspects"]
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

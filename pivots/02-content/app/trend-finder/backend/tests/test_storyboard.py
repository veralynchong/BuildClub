"""Per-shot script lines and storyboard frames: model back-compat, generate all / one, `edited`, fake and
model-made frame images, path traversal. No test reaches Claude or a model provider."""

import json

import pytest

import gen_providers
import server
import storyboard
from models import SavedIdea, Shot

A = {"id": "a", "name": "Tofu Bar", "niche": "food", "audience": "students",
     "monthlyTarget": 8, "examples": [], "cannot": ["no swearing"]}
SHOTS = [{"time": "0-3s", "shot": "Close-up of tofu sizzling"},
         {"time": "3-8s", "shot": "Pour the sauce", "text": "Sauce"},
         {"time": "8-12s", "shot": "Plate and smile to camera"}]


def put(*ideas):
    server.save("ideas", [SavedIdea(**i) for i in ideas])


def idea(id="i1", shots=SHOTS, status="saved"):
    return {"id": id, "videoId": "v", "clientId": "a", "status": status, "dueDate": "2026-11-02",
            "notes": "crispy", "shots": shots}


@pytest.fixture(autouse=True)
def demo_mode(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("FRAME_IMAGE_MODEL", raising=False)

    def no_claude(*a, **k):
        raise AssertionError("Claude called in demo mode")
    monkeypatch.setattr(storyboard.assist, "call_claude", no_claude)


@pytest.fixture
def setup(client):
    client.put("/api/clients", json=[A])
    put(idea(), idea("i2"))


# ---- data model -------------------------------------------------------------------------------

def test_old_shots_load_without_new_fields():
    s = Shot(**{"time": "0-3s", "shot": "x"})
    assert s.line is None and s.purpose is None and s.options is None and s.edited is None
    assert s.frameImage is None and s.palette is None


def test_old_saved_plans_still_load(client, setup):
    got = client.get("/api/ideas").json()
    assert got[0]["shots"][0] == {"id": "s1", "time": "0-3s", "shot": "Close-up of tofu sizzling"}


def test_new_fields_round_trip_through_put(client, setup):
    shot = {**SHOTS[0], "id": "s1", "line": "Hi", "purpose": "hook", "options": ["a", "b", "c"], "edited": True,
            "frameImage": "/api/ideas/i1/frames/0-abc.svg", "palette": ["#112233", "#AABBCC"]}
    r = client.put("/api/ideas", json=[idea(shots=[shot])])
    assert r.status_code == 200
    assert client.get("/api/ideas").json()[0]["shots"][0] == shot


@pytest.mark.parametrize("bad", [{"purpose": "intro"}, {"options": ["a", "b", "c", "d"]},
                                 {"palette": ["red"]}, {"palette": ["#12345"]},
                                 {"palette": ["#000000"] * 9}, {"frameImage": "javascript:alert(1)"}])
def test_shot_validation(bad):
    with pytest.raises(Exception):
        Shot(time="0", shot="x", **bad)


# ---- script ------------------------------------------------------------------------------------

def test_generate_script_demo_is_deterministic(client, setup):
    a = client.post("/api/ideas/i1/script", json={})
    b = client.post("/api/ideas/i1/script", json={})
    assert a.status_code == 200 and a.json() == b.json()
    body = a.json()
    assert body["source"] == "demo"
    shots = body["shots"]
    assert [s["purpose"] for s in shots] == ["hook", "body", "cta"]
    assert all(s["line"] and len(s["options"]) == 3 for s in shots)
    assert shots[0]["shot"] == SHOTS[0]["shot"]  # the plan's own text is untouched


def test_generate_script_does_not_write_the_store(client, setup):
    client.post("/api/ideas/i1/script", json={})
    assert "line" not in client.get("/api/ideas").json()[0]["shots"][0]


def test_generate_script_keeps_edited_shot_unless_forced(client, setup):
    shots = [dict(SHOTS[0]), {**SHOTS[1], "line": "MY WORDS", "edited": True, "purpose": "body"}, dict(SHOTS[2])]
    put(idea(shots=shots))
    kept = client.post("/api/ideas/i1/script", json={}).json()["shots"]
    assert kept[1]["line"] == "MY WORDS" and kept[1]["edited"] is True
    assert kept[0]["line"] and kept[2]["line"]
    forced = client.post("/api/ideas/i1/script", json={"force": True}).json()["shots"]
    assert forced[1]["line"] != "MY WORDS" and forced[1]["edited"] is False


def test_regenerate_one_shot_returns_only_that_shot(client, setup):
    r = client.post("/api/ideas/i1/shots/1/script", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["index"] == 1 and body["purpose"] == "body" and body["line"] and len(body["options"]) == 3
    assert "shots" not in body
    assert client.get("/api/ideas").json()[0]["shots"] == [{**sh, "id": f"s{n + 1}"} for n, sh in enumerate(SHOTS)]  # nothing touched, ids filled


def test_regenerate_one_matches_the_full_script_for_that_shot(client, setup):
    full = client.post("/api/ideas/i1/script", json={}).json()["shots"]
    one = client.post("/api/ideas/i1/shots/2/script", json={}).json()
    assert one["line"] == full[2]["line"] and one["options"] == full[2]["options"]


def test_regenerate_one_refuses_an_edited_shot_unless_forced(client, setup):
    put(idea(shots=[{**SHOTS[0], "line": "mine", "edited": True}, SHOTS[1]]))
    assert client.post("/api/ideas/i1/shots/0/script", json={}).status_code == 409
    assert client.post("/api/ideas/i1/shots/0/script", json={"force": True}).status_code == 200


def test_script_errors(client, setup):
    assert client.post("/api/ideas/nope/script", json={}).status_code == 404
    assert client.post("/api/ideas/i1/shots/3/script", json={}).status_code == 404
    assert client.post("/api/ideas/i1/shots/-1/script", json={}).status_code == 404
    put(idea("i3", shots=None))
    assert client.post("/api/ideas/i3/script", json={}).status_code == 409


def test_claude_path_uses_assist_and_the_budget(client, setup, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "k")
    seen = []

    def fake(model, system, content, max_tokens):
        seen.append(content[0]["text"])
        return json.dumps({"shots": [{"line": f"L{n}", "options": [f"a{n}", f"b{n}", f"c{n}", "extra"]}
                                     for n in range(3)]})
    monkeypatch.setattr(storyboard.assist, "call_claude", fake)
    body = client.post("/api/ideas/i1/script", json={}).json()
    assert body["source"] == "claude"
    assert [s["line"] for s in body["shots"]] == ["L0", "L1", "L2"]
    assert body["shots"][0]["options"] == ["a0", "b0", "c0"]
    assert "Tofu Bar" in seen[0] and "no swearing" in seen[0]
    assert server.load(f"spend:{server.today()}")["claude"] > 0


def test_claude_garbage_is_a_502(client, setup, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "k")
    monkeypatch.setattr(storyboard.assist, "call_claude", lambda *a, **k: "sorry, no")
    assert client.post("/api/ideas/i1/script", json={}).status_code == 502


def test_claude_over_budget_is_429(client, setup, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "k")
    monkeypatch.setattr(server, "DAILY_CLAUDE_USD", 0)
    assert client.post("/api/ideas/i1/script", json={}).status_code == 429


# ---- frames ------------------------------------------------------------------------------------

def test_fake_frame_is_a_free_svg(client, setup):
    r = client.post("/api/ideas/i1/shots/0/frame", json={"line": "Look <at> this & that"})
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "fake" and body["frameImage"].startswith("/api/ideas/i1/frames/0-")
    f = client.get(body["frameImage"])
    assert f.status_code == 200 and f.headers["content-type"].startswith("image/svg+xml")
    assert "Look &lt;at&gt; this &amp; that" in f.text and "HOOK" in f.text
    assert (server.MEDIA_DIR / "i1" / "frames").is_dir()
    assert server.load(f"spend:{server.today()}") is None  # zero cost


def test_frame_uses_stored_line_and_does_not_touch_ideas(client, setup):
    put(idea(shots=[{**SHOTS[0], "line": "Stored line", "purpose": "cta"}]))
    body = client.post("/api/ideas/i1/shots/0/frame", json={}).json()
    text = client.get(body["frameImage"]).text
    assert "Stored line" in text and "CTA" in text
    assert "frameImage" not in client.get("/api/ideas").json()[0]["shots"][0]


def test_frame_errors(client, setup):
    assert client.post("/api/ideas/nope/shots/0/frame", json={}).status_code == 404
    assert client.post("/api/ideas/i1/shots/9/frame", json={}).status_code == 404


def test_frame_path_traversal_rejected(client, setup, tmp_path):
    (server.MEDIA_DIR).mkdir(parents=True, exist_ok=True)
    secret = server.MEDIA_DIR.parent / "secret.svg"
    secret.write_text("<svg/>")
    for bad in ("..", "%2e%2e", ".", "a%2f..%2f..", "..%5c"):
        # The HTTP client may fold ".." into the path before sending, so the app can answer 404 or 405.
        assert client.post(f"/api/ideas/{bad}/shots/0/frame", json={}).status_code in (404, 405)
        assert client.get(f"/api/ideas/{bad}/frames/secret.svg").status_code in (404, 405)
        assert not any(server.MEDIA_DIR.parent.glob("frames*"))
    for name in ("..%2fsecret.svg", "%2e%2e%2fsecret.svg", ".hidden.svg", "x.txt", "a%00.svg"):
        assert client.get(f"/api/ideas/i1/frames/{name}").status_code == 404
    assert storyboard.frames_dir(server.MEDIA_DIR, "..") is None
    assert storyboard.frames_dir(server.MEDIA_DIR, "i1") is not None


PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 20


class FakeAdapter:
    """submit returns an id (or raises); poll walks `polls` (a Poll, an exception, or a list of them)."""

    def __init__(self, polls=None, submit_error=None):
        self.polls = list(polls if polls is not None else [gen_providers.Poll("done", data=PNG, ext="png")])
        self.submit_error, self.jobs, self.polled = submit_error, [], 0

    def submit(self, job):
        self.jobs.append(job)
        if self.submit_error:
            raise self.submit_error
        return "req-1"

    def poll(self, job, request_id):
        self.polled += 1
        step = self.polls.pop(0) if len(self.polls) > 1 else self.polls[0]
        if isinstance(step, Exception):
            raise step
        return step


@pytest.fixture
def frame_model(monkeypatch):
    """FRAME_IMAGE_MODEL set to a fal image model (priced 0.04) behind a fake adapter; no network."""
    monkeypatch.setenv("FRAME_IMAGE_MODEL", "seedream-4.5")
    monkeypatch.setenv("FAL_KEY", "k")
    monkeypatch.setattr(storyboard, "FRAME_POLL_S", 0)
    adapter = FakeAdapter()
    monkeypatch.setattr(gen_providers, "adapter_for", lambda provider, *a, **k: adapter)
    return adapter


def spent(wallet="gen_image"):
    return (server.load(f"spend:{server.today()}") or {}).get(wallet, 0)


def frames_on_disk():
    return [p for p in server.MEDIA_DIR.rglob("*") if p.is_file() and "frames" in p.parts]


def test_frame_uses_frame_image_model(client, setup, frame_model):
    body = client.post("/api/ideas/i1/shots/1/frame", json={"line": "Pour it"}).json()
    assert body["provider"] == "seedream-4.5" and body["frameImage"].endswith(".png")
    got = client.get(body["frameImage"])
    assert got.content == PNG and got.headers["content-type"] == "image/png"
    job = frame_model.jobs[0]
    assert job.model["id"] == "seedream-4.5" and "Pour the sauce" in job.prompt and "Pour it" in job.prompt
    assert spent() == 0.04 and spent("image") == 0  # the generation wallet pays; the old wallet is gone


def test_frame_default_is_free_svg(client, setup, monkeypatch):
    monkeypatch.delenv("FRAME_IMAGE_MODEL", raising=False)
    monkeypatch.setattr(gen_providers, "adapter_for", lambda *a, **k: pytest.fail("adapter used"))
    body = client.post("/api/ideas/i1/shots/0/frame", json={}).json()
    assert body["provider"] == "fake" and body["frameImage"].endswith(".svg")
    assert spent() == 0


@pytest.mark.parametrize("env", ["", "no-such-model", "mock-video", "seedream-4.5"])
def test_frame_unusable_model_falls_back_to_free_svg(client, setup, monkeypatch, env):
    monkeypatch.setenv("FRAME_IMAGE_MODEL", env)
    monkeypatch.delenv("FAL_KEY", raising=False)  # seedream without its key is not available
    monkeypatch.setattr(gen_providers, "adapter_for", lambda *a, **k: pytest.fail("adapter used"))
    assert client.post("/api/ideas/i1/shots/0/frame", json={}).json()["provider"] == "fake"


def test_frame_provider_error_refunds(client, setup, frame_model):
    frame_model.submit_error = gen_providers.ProviderError("refused")
    r = client.post("/api/ideas/i1/shots/0/frame", json={})
    assert r.status_code == 502 and r.json()["error"] == "Could not make the image. Try again."
    assert spent() == 0 and frames_on_disk() == []


def test_frame_poll_failed_refunds(client, setup, frame_model):
    frame_model.polls = [gen_providers.Poll("failed", error="The model reported a failure.")]
    r = client.post("/api/ideas/i1/shots/0/frame", json={})
    assert r.status_code == 502 and r.json()["error"] == "Could not make the image. Try again."
    assert spent() == 0 and frames_on_disk() == []


@pytest.mark.parametrize("failure", [gen_providers.ResultLost("gone"), gen_providers.FileUnusable("bad file"),
                                     gen_providers.ProviderError("after accept"), RuntimeError("boom")])
def test_frame_lost_after_submit_may_have_charged_no_refund(client, setup, frame_model, failure):
    frame_model.polls = [failure]
    r = client.post("/api/ideas/i1/shots/0/frame", json={})
    assert r.status_code == 502 and "may have charged" in r.json()["error"]
    assert spent() == 0.04 and frames_on_disk() == []


def test_frame_submit_without_answer_may_have_charged(client, setup, frame_model):
    frame_model.submit_error = gen_providers.ResultLost("no answer")
    r = client.post("/api/ideas/i1/shots/0/frame", json={})
    assert r.status_code == 502 and "may have charged" in r.json()["error"] and spent() == 0.04


def test_frame_timeout_may_have_charged_no_refund(client, setup, frame_model, monkeypatch):
    frame_model.polls = [gen_providers.Poll("running")]
    monkeypatch.setattr(storyboard, "FRAME_TIMEOUT_S", 0)
    r = client.post("/api/ideas/i1/shots/0/frame", json={})
    assert r.status_code == 502 and "may have charged" in r.json()["error"]
    assert spent() == 0.04 and frame_model.polled == 1 and frames_on_disk() == []


def test_frame_polls_until_done(client, setup, frame_model):
    frame_model.polls = [gen_providers.Poll("running"), gen_providers.Poll("running"),
                         gen_providers.Poll("done", data=PNG, ext="png")]
    assert client.post("/api/ideas/i1/shots/0/frame", json={}).status_code == 200
    assert frame_model.polled == 3


def test_frame_over_budget_is_429_and_adapter_not_called(client, setup, frame_model, monkeypatch):
    monkeypatch.setattr(server, "DAILY_GEN_IMAGE_USD", 0.03)
    r = client.post("/api/ideas/i1/shots/0/frame", json={})
    assert r.status_code == 429 and frame_model.jobs == [] and spent() == 0


def test_frame_save_failure_leaves_no_file_and_keeps_spend(client, setup, frame_model, monkeypatch):
    def broken(src, dst):
        raise OSError("disk full")
    monkeypatch.setattr(storyboard.os, "replace", broken)
    r = client.post("/api/ideas/i1/shots/0/frame", json={})
    assert r.status_code == 502 and spent() == 0.04 and frames_on_disk() == []


def test_frame_jpg_and_webp_are_served(client, setup, frame_model):
    frame_model.polls = [gen_providers.Poll("done", data=b"\xff\xd8\xff" + b"0" * 20, ext="jpg")]
    url = client.post("/api/ideas/i1/shots/0/frame", json={}).json()["frameImage"]
    assert url.endswith(".jpg") and client.get(url).headers["content-type"] == "image/jpeg"


def test_camera_fields_round_trip_and_old_plans_have_none(client, setup):
    cam = {"framing": "wide", "angle": "high", "movement": "pan", "tip": "Walk slowly"}
    r = client.put("/api/ideas", json=[idea("c1", [{**SHOTS[0], **cam}, SHOTS[1]])])
    assert r.status_code == 200
    got = client.get("/api/ideas").json()[0]["shots"]
    assert got[0]["framing"] == "wide" and got[0]["angle"] == "high" and got[0]["movement"] == "pan"
    assert got[0]["tip"] == "Walk slowly"
    assert "framing" not in got[1]


def test_bad_camera_value_is_rejected(client, setup):
    r = client.put("/api/ideas", json=[idea("c2", [{**SHOTS[0], "framing": "giant"}])])
    assert r.status_code == 422

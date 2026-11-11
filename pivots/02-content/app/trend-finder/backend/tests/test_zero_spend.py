"""Zero-budget paid entry points: in-process requests, no credentials or providers."""
import base64
import json
import socket
from unittest.mock import Mock

import pytest

import agent
import analyze
import assist
import channels
import gen_providers
import generations
import server
import shotlist
import storyboard
from test_analyze import RESULT
from test_canvas import plan
from test_storyboard import A
from test_takes import store_ideas

URL = "https://www.tiktok.com/@offline/video/1"
CAPS = ("DAILY_APIFY_USD", "DAILY_CLAUDE_USD", "DAILY_GEN_IMAGE_USD", "DAILY_GEN_VIDEO_USD",
        "DAILY_GEN_VOICE_USD", "DAILY_JEV_USD", "DAILY_SCRAPECREATORS_CREDITS")


@pytest.fixture(autouse=True)
def zero_spend(offline, client, monkeypatch):
    for name in CAPS:
        monkeypatch.setattr(server, name, 0)
    monkeypatch.setattr(server, "CHANNEL_CAPS", {"claude": 0, "jev": 0, "scrapecreators": 0})
    for name in {*generations.KEY_ENV.values(), "ANTHROPIC_API_KEY", "TYPESAFE_API_KEY", "SCRAPECREATORS_API_KEY"}:
        monkeypatch.delenv(name, raising=False)
    # The shared fixture's token is an inert test placeholder, never an account credential.
    denied = Mock(side_effect=AssertionError("Unexpected provider or outbound network call"))
    for obj, name in ((server, "run_actor"), (assist, "call_claude"), (agent, "ask_claude"),
                      (shotlist, "ask_claude"), (analyze, "prepare"), (analyze, "breakdown"),
                      (channels, "ask_claude"), (gen_providers, "adapter_for"),
                      (socket.socket, "connect"), (socket, "create_connection")):
        monkeypatch.setattr(obj, name, denied)
    monkeypatch.setattr(channels.subprocess, "run", denied)
    client.put("/api/clients", json=[A])
    store_ideas(plan("ia"))
    yield denied
    assert denied.call_count == 0, "A paid/provider/network path was reached"
    assert not (server.load(f"spend:{server.today()}") or {})


@pytest.mark.parametrize("platform", ["tiktok", "instagram", "reddit", "x"])
def test_paid_search_rejected_at_zero(client, platform):
    assert client.get("/api/search", params={"q": "uncached-zero-spend", "platform": platform, "fresh": "1"}).status_code == 429


@pytest.mark.parametrize("route,body", [
    ("/api/analyze", {"url": URL}),
    ("/api/like", {"url": URL}),
    ("/api/compare", {"urls": [URL, URL[:-1] + "2"]}),
    ("/api/like-image", {"image": base64.b64encode(b"offline-image").decode(), "mediaType": "image/png"}),
    ("/api/answer", {"query": "tofu", "videos": []}),
])
def test_analysis_and_search_assistants_rejected_at_zero(client, route, body):
    assert client.post(route, json=body).status_code == 429


def test_content_classification_rejected_at_zero(client, monkeypatch):
    monkeypatch.setattr(server, "read_cache", lambda *args: {"fetchedAt": 1, "videos": [{}]})
    assert client.get("/api/search/types", params={"q": "tofu"}).status_code == 429


def test_legacy_needs_analysis_rejected_at_zero(client):
    folder = analyze.JOBS_DIR / analyze.job_id_for(URL)
    folder.mkdir(parents=True)
    old = RESULT.model_dump()
    old.pop("needs", None)
    (folder / "breakdown.json").write_text(json.dumps(old))
    assert client.post("/api/needs", json={"url": URL}).status_code == 429


def test_finished_breakdown_keyword_assistant_rejected_at_zero(client, monkeypatch):
    from types import SimpleNamespace
    monkeypatch.setattr(server.jobs, "get", lambda _: SimpleNamespace(status="done", result=RESULT))
    assert client.get("/api/like/offline-job").status_code == 429


@pytest.mark.parametrize("route,body", [
    ("/api/ideas/ia/agent/plan", {"shotId": "s1"}),
    ("/api/ideas/ia/script", {"force": True}),
    ("/api/ideas/ia/shots/0/script", {"force": True}),
    ("/api/shots/from-script", {"script": "Show the tofu. Plate and serve."}),
])
def test_paid_planning_branches_rejected_without_loading_credentials(client, monkeypatch, route, body):
    # Exercise the paid branch with a fake availability decision, not an API key.
    monkeypatch.setattr(storyboard, "use_claude", lambda: True)
    monkeypatch.setattr(shotlist, "use_claude", lambda: True)
    assert client.post(route, json=body).status_code == 429


def fake_models(monkeypatch):
    models = [dict(id="offline-" + kind, provider="mock", kind=kind, tier="cheap", endpoint="offline",
                   price={"per": "second" if kind == "video" else "image", "usd": 0.1},
                   inputs={"text": "required", **({"startFrame": "optional"} if kind == "video" else {})}, aspects=["9:16"], durations=[6], typicalSeconds=1)
              for kind in ("image", "video", "voice")]
    monkeypatch.setattr(generations, "load_models", lambda: models)
    return models


def test_storyboard_image_rejected_at_zero(client, monkeypatch):
    model = fake_models(monkeypatch)[0]
    monkeypatch.setattr(storyboard, "frame_model", lambda: model)
    assert client.post("/api/ideas/ia/shots/0/frame", json={}).status_code == 429


@pytest.mark.parametrize("kind,node", [("image", "n_sb_s1"), ("video", "n_vid_s1")])
def test_generation_rejected_at_zero(client, monkeypatch, kind, node):
    fake_models(monkeypatch)
    add_video(client)
    body = {"nodeId": node, "model": "offline-" + kind, "prompt": "Offline budget check"}
    if kind == "video":
        body["duration"] = 6
    assert client.post("/api/ideas/ia/gen", json=body).status_code == 429


def test_voiceover_rejected_at_zero(client, monkeypatch):
    fake_models(monkeypatch)
    response = client.post("/api/ideas/ia/edit/voice/tts", json={"text": "Offline budget check", "model": "offline-voice", "confirm": True})
    assert response.status_code == 429


@pytest.mark.parametrize("platform", ["youtube", "instagram", "tiktok"])
def test_channel_paid_steps_rejected_at_zero(client, monkeypatch, platform):
    # No credentials: skip only key availability to reach the real zero-wallet guard.
    monkeypatch.setattr(server.channel_jobs, "_check_keys", lambda *args: None)
    assert client.post("/api/channel", json={"platform": platform, "handle": "@offline", "maxVideos": 3}).status_code == 429


def test_real_generation_models_unavailable_without_credentials():
    assert all(not generations.is_available(m) for m in generations.load_models() if m["provider"] != "mock")


def add_video(client):
    state = client.get("/api/ideas/ia/canvas").json()
    state["doc"]["nodes"].append({"id": "n_vid_s1", "type": "video", "shotId": "s1",
                                   "position": {"x": 720, "y": 0}, "data": {}})
    state["doc"]["edges"].append({"id": "offline-start", "source": "n_sb_s1", "sourceHandle": "out",
                                   "target": "n_vid_s1", "targetHandle": "in:start"})
    assert client.put("/api/ideas/ia/canvas", json=state).status_code == 200


def test_image_video_chain_rejected_at_zero(client, monkeypatch):
    fake_models(monkeypatch)
    add_video(client)
    body = {"imageNodeId": "n_sb_s1", "videoNodeId": "n_vid_s1", "imageModel": "offline-image",
            "videoModel": "offline-video", "prompt": "Offline chain", "duration": 6, "confirm": True}
    assert client.post("/api/ideas/ia/gen/chain", json=body).status_code == 429


@pytest.mark.parametrize("wallet", ["apify", "claude", "gen_image", "gen_video", "gen_voice", "jev", "scrapecreators"])
def test_each_wallet_rejects_a_positive_charge_at_zero(wallet):
    assert server.spend(wallet, 0.01, 0) is False

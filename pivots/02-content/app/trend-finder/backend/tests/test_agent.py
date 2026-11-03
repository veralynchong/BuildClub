"""The agent's planning route: demo answer, mocked Claude answer checked against the menu, wallet, errors, and that
the canvas is never written. No test reaches Claude: agent.ask_claude is replaced in every test."""

import pytest

import agent
import generations
import server
from models import Shot, SavedIdea
from test_takes import A, store_ideas

good = agent.AgentOut(storyboardPrompt="a", storyboardModel="mock-image", videoPrompt="b", videoModel="mock-video", duration=4)


def idea(id, status="approved"):
    shots = [Shot(id="s1", time="0:00", shot="pour", line="Fresh tofu daily"), Shot(id="s2", time="0:05", shot="plate")]
    return SavedIdea(id=id, videoId=f"v-{id}", clientId="a", status=status, dueDate="2026-11-02", notes="", shots=shots)


@pytest.fixture(autouse=True)
def setup(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    def no_claude(*a, **k):
        raise AssertionError("Claude called in demo mode")
    monkeypatch.setattr(agent, "ask_claude", no_claude)
    client.put("/api/clients", json=[A])
    store_ideas(idea("ia"), idea("iw", "waiting"))


def plan_for(client, shot="s1"):
    return client.post("/api/ideas/ia/agent/plan", json={"shotId": shot})


def claude_on(monkeypatch, answer):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.delenv("REMAKE_DEMO", raising=False)
    calls = []

    def fake(context, menu):
        calls.append(context)
        return answer
    monkeypatch.setattr(agent, "ask_claude", fake)
    return calls


def spent(wallet):
    return (server.load(f"spend:{server.today()}") or {}).get(wallet, 0)


def test_agent_demo_plan_without_key(client):
    r = plan_for(client)
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "demo" and body["shotId"] == "s1" and body["planUsd"] == 0
    assert body["storyboard"]["model"] == "mock-image" and body["video"]["model"] == "mock-video" and body["video"]["duration"] == 4


def test_agent_plans_a_shot_of_a_plan_saved_without_ids(client):
    old = idea("io")
    old.shots = [Shot(time="0:00", shot="pour", line="Fresh tofu daily"), Shot(time="0:05", shot="plate")]
    store_ideas(old)
    assert all(not s.id for s in old.shots)
    r = client.post("/api/ideas/io/agent/plan", json={"shotId": "s2"})
    assert r.status_code == 200 and r.json()["shotId"] == "s2"


def test_agent_uses_shot_line_in_demo_prompts(client):
    body = plan_for(client).json()
    assert "Fresh tofu daily" in body["storyboard"]["prompt"] and "Fresh tofu daily" in body["video"]["prompt"]


def test_agent_claude_plan_charges_the_wallet(client, monkeypatch):
    calls = claude_on(monkeypatch, good)
    before = spent("claude")
    body = plan_for(client).json()
    assert body["source"] == "claude" and body["planUsd"] == agent.AGENT_USD and len(calls) == 1
    assert spent("claude") == pytest.approx(before + agent.AGENT_USD)


def test_agent_rejects_unknown_model(client, monkeypatch):
    claude_on(monkeypatch, good.model_copy(update={"videoModel": "gpt-x"}))
    v = client.get("/api/ideas/ia/canvas").json()["version"]
    r = plan_for(client)
    assert r.status_code == 502 and r.json()["error"] == "Couldn't plan this shot. Try again."
    assert client.get("/api/ideas/ia/canvas").json()["version"] == v


def test_agent_rejects_bad_duration(client, monkeypatch):
    claude_on(monkeypatch, good.model_copy(update={"duration": 7}))
    assert plan_for(client).status_code == 502


def test_agent_rejects_video_model_without_start_frame(client, monkeypatch):
    menu = [{**m, "inputs": {**m["inputs"], "startFrame": "none"}} if m["kind"] == "video" else m for m in generations.menu_models()]
    monkeypatch.setattr(generations, "menu_models", lambda: menu)
    claude_on(monkeypatch, good)
    assert plan_for(client).status_code == 502
    assert agent.check_plan(good, generations.menu_models()) is not None


def test_agent_over_budget_429_no_call(client, monkeypatch):
    calls = claude_on(monkeypatch, good)
    monkeypatch.setattr(server, "DAILY_CLAUDE_USD", 0.0)
    assert plan_for(client).status_code == 429 and calls == []


def test_agent_missing_plan_or_shot_404(client):
    r = client.post("/api/ideas/nope/agent/plan", json={"shotId": "s1"})
    assert r.status_code == 404 and r.json()["error"] == "That plan doesn't exist."
    r = plan_for(client, shot="s9")
    assert r.status_code == 404 and r.json()["error"] == "That shot isn't in this plan."


def test_agent_not_approved_409(client):
    r = client.post("/api/ideas/iw/agent/plan", json={"shotId": "s1"})
    assert r.status_code == 409 and r.json()["error"] == "Approve the plan before building shots."


def test_agent_never_writes_the_canvas(client, monkeypatch):
    before = client.get("/api/ideas/ia/canvas").json()
    assert plan_for(client).status_code == 200
    claude_on(monkeypatch, good)
    assert plan_for(client).status_code == 200
    assert client.get("/api/ideas/ia/canvas").json() == before

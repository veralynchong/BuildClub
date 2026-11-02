"""Script to shot list: input checks, demo answer, mocked Claude answer validated by pydantic, interview shape,
budget, and that no plan is ever written. No test reaches Claude."""

import pytest
from pydantic import ValidationError

import server
import shotlist

SCRIPT = "Everyone says noodles come from Italy. We asked people on the street. Their answer shocked us."
CAM = {"framing": "close_up", "angle": "low", "movement": "push_in", "tip": "Keep the bowl in focus."}


@pytest.fixture(autouse=True)
def demo_mode(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    def no_claude(*a, **k):
        raise AssertionError("Claude called in demo mode")
    monkeypatch.setattr(shotlist, "ask_claude", no_claude)


def claude_on(monkeypatch, answer):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.delenv("REMAKE_DEMO", raising=False)
    calls = []

    def fake(script, interview):
        calls.append((script, interview))
        if isinstance(answer, Exception):
            raise answer
        return answer
    monkeypatch.setattr(shotlist, "ask_claude", fake)
    return calls


def test_empty_and_long_scripts_are_turned_back(client):
    assert client.post("/api/shots/from-script", json={"script": "   "}).status_code == 400
    r = client.post("/api/shots/from-script", json={"script": "x" * (shotlist.MAX_SCRIPT + 1)})
    assert r.status_code == 400


def test_demo_answer_has_camera_fields_and_is_deterministic(client):
    a = client.post("/api/shots/from-script", json={"script": SCRIPT}).json()
    b = client.post("/api/shots/from-script", json={"script": SCRIPT}).json()
    assert a == b and a["source"] == "demo"
    assert len(a["shots"]) == 3
    assert all(s["framing"] and s["angle"] and s["movement"] and s["tip"] for s in a["shots"])
    assert a["shots"][0]["time"].startswith("0-")
    assert len({s["framing"] for s in a["shots"]}) > 1


def test_claude_answer_comes_back_as_plan_shots(client, monkeypatch):
    answer = shotlist.ShotListOut(shots=[shotlist.DraftShot(time="0-3s", shot="Bowl of noodles", text="Italy?", **CAM)])
    calls = claude_on(monkeypatch, answer)
    r = client.post("/api/shots/from-script", json={"script": SCRIPT}).json()
    assert calls == [(SCRIPT, False)]
    assert r["source"] == "claude"
    assert r["shots"] == [{"time": "0-3s", "shot": "Bowl of noodles", "text": "Italy?", **CAM}]  # unset fields left out


def test_interview_returns_questions_with_the_reaction(client, monkeypatch):
    answer = shotlist.ShotListOut(shots=[shotlist.DraftShot(
        time="0-5s", shot="Host asks, passer-by answers", question="Where do noodles come from?",
        reaction="Confident wrong answer", **CAM)])
    calls = claude_on(monkeypatch, answer)
    r = client.post("/api/shots/from-script", json={"script": "Where do noodles come from?", "interview": True}).json()
    assert calls[0][1] is True and r["interview"] is True
    assert r["shots"][0]["question"] == "Where do noodles come from?"
    assert r["shots"][0]["reaction"] == "Confident wrong answer"


def test_demo_interview_maps_each_question_to_a_shot(client):
    r = client.post("/api/shots/from-script", json={"script": "Where are noodles from?\nWho invented them?", "interview": True}).json()
    assert [s["question"] for s in r["shots"]] == ["Where are noodles from?", "Who invented them?"]
    assert all(s["reaction"] and s["shot"] for s in r["shots"])


def test_bad_ai_answers_do_not_validate():
    ok = {"time": "0-3s", "shot": "x", **CAM}
    shotlist.DraftShot(**ok)
    with pytest.raises(ValidationError):
        shotlist.DraftShot(**{**ok, "framing": "huge"})
    with pytest.raises(ValidationError):
        shotlist.DraftShot(**{k: v for k, v in ok.items() if k != "movement"})
    with pytest.raises(ValidationError):
        shotlist.ShotListOut(shots=[])


def test_ai_failure_is_a_502_and_nothing_is_saved(client, monkeypatch):
    claude_on(monkeypatch, RuntimeError("The AI answer was incomplete (max_tokens)."))
    r = client.post("/api/shots/from-script", json={"script": SCRIPT})
    assert r.status_code == 502 and "Try again" in r.json()["error"]
    assert (client.get("/api/ideas").json() or []) == []


def test_budget_stops_the_paid_call(client, monkeypatch):
    calls = claude_on(monkeypatch, None)
    monkeypatch.setattr(server, "DAILY_CLAUDE_USD", 0.0)
    r = client.post("/api/shots/from-script", json={"script": SCRIPT})
    assert r.status_code == 429 and calls == []


def test_prompts_name_every_choice():
    for word in ("wide", "medium", "close_up", "extreme_close_up", "overhead", "pov", "eye_level", "high", "low",
                 "top_down", "static", "pan", "tilt", "push_in", "handheld", "tracking"):
        assert word in shotlist.SYSTEM
    assert "question" in shotlist.INTERVIEW_SYSTEM and "reaction" in shotlist.INTERVIEW_SYSTEM

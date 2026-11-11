"""The editor's writing helpers (hook check, caption rewrite, title and hashtags, client notes to tasks). No test reaches
Claude: editor_ai.ask is replaced by a fake, and without a key the rules answer."""

import pytest

import editor_ai
import server
from models import Comment, Shot, SavedIdea
from test_auth import add_user, login
from test_takes import A, store_ideas

SHOTS = [Shot(id="s1", time="0:00", shot="pour", line="Fresh tofu in five minutes", purpose="hook"),
         Shot(id="s2", time="0:05", shot="plate", line="Press it, crisp it, done"),
         Shot(id="s3", time="0:10", shot="cta", line="Order from Tofu Bar today", purpose="cta")]


def idea(id, status="approved"):
    return SavedIdea(id=id, videoId=f"v-{id}", clientId="a", status=status, dueDate="2026-11-02", notes="", shots=SHOTS)


@pytest.fixture(autouse=True)
def setup(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("REMAKE_DEMO", raising=False)

    def no_claude(*a, **k):
        raise AssertionError("Claude called without a key")
    monkeypatch.setattr(editor_ai, "ask", no_claude)
    client.put("/api/clients", json=[A])
    store_ideas(idea("ia"), idea("iw", "waiting"))


def claude_on(monkeypatch, answer):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    calls = []

    def fake(out_cls, system, payload, tag):
        calls.append((tag, payload))
        return answer(payload) if callable(answer) else answer
    monkeypatch.setattr(editor_ai, "ask", fake)
    return calls


def cap(id, start, end, text):
    return {"id": id, "start": start, "end": end, "text": text}


def url(path, idea="ia"):
    return f"/api/ideas/{idea}/edit/ai/{path}"


def spent():
    return (server.load(f"spend:{server.today()}") or {}).get("claude", 0)


# ---- hook check ----

def test_hook_rules_flag_a_late_start_missing_hook_and_long_first_caption(client):
    body = {"captions": [cap("c1", 1.2, 2.5, "so today I want to show you something really quite interesting about cooking"),
                         cap("c2", 4.0, 5.0, "Fresh tofu in five minutes")], "texts": []}
    r = client.post(url("hook-check"), json=body).json()
    assert r["source"] == "rules" and 1 <= r["score"] <= 5 and r["score"] <= 2
    assert len(r["fixes"]) <= 3
    joined = " ".join(r["fixes"])
    assert "1.2 s pause" in joined and "0:04" in joined and "Shorten the first caption" in joined


def test_hook_rules_give_five_for_a_clean_start(client):
    body = {"captions": [cap("c1", 0.1, 1.5, "Fresh tofu in five minutes")], "texts": []}
    r = client.post(url("hook-check"), json=body).json()
    assert r["score"] == 5 and r["fixes"] == []


def test_hook_rules_with_no_speech_in_three_seconds(client):
    r = client.post(url("hook-check"), json={"captions": [cap("c1", 5, 6, "hi")], "texts": [{"start": 0.5, "end": 2, "text": "Fresh tofu in five minutes"}]}).json()
    assert r["score"] <= 3 and "No one speaks" in r["fixes"][0]


def test_hook_check_uses_claude_when_a_key_is_set_and_limits_its_answer(client, monkeypatch):
    long = "x" * 400
    calls = claude_on(monkeypatch, editor_ai.HookOut(score=9, verdict=long, fixes=["a", "b", "c", "d", "e"]))
    r = client.post(url("hook-check"), json={"captions": [cap("c1", 0.2, 1, "Hello")], "texts": []})
    body = r.json()
    assert r.status_code == 200 and body["source"] == "ai" and body["score"] == 5
    assert len(body["verdict"]) <= 160 and body["fixes"] == ["a", "b", "c"]
    tag, payload = calls[0]
    assert tag == "hook" and payload["hook"] == "Fresh tofu in five minutes" and payload["firstWordAt"] == 0.2
    assert spent() == editor_ai.CALL_USD


def test_hook_check_demo_flag_keeps_rules(client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "k")
    monkeypatch.setenv("REMAKE_DEMO", "1")
    assert client.post(url("hook-check"), json={"captions": [], "texts": []}).json()["source"] == "rules"


def test_hook_check_rejects_bad_bodies(client):
    for body in ({}, {"captions": "x", "texts": []}, {"captions": [{"start": "a"}], "texts": []},
                 {"captions": [cap("c", 3, 1, "back")], "texts": []}, {"captions": [], "texts": [{"start": 0, "end": 1}]}):
        assert client.post(url("hook-check"), json=body).status_code == 422, body


def test_hook_check_ai_failure_is_502_and_budget_is_429(client, monkeypatch):
    def boom(*a):
        raise RuntimeError("down")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "k")
    monkeypatch.setattr(editor_ai, "ask", boom)
    ok = {"captions": [], "texts": []}
    assert client.post(url("hook-check"), json=ok).status_code == 502
    monkeypatch.setattr(server, "DAILY_CLAUDE_USD", 0.0)
    assert client.post(url("hook-check"), json=ok).status_code == 429


# ---- caption rewrite ----

def test_rewrite_rules_drop_fillers_and_repeated_words_only(client):
    body = {"captions": [cap("c1", 0, 1, "so um the the tofu is crispy"), cap("c2", 1, 2, "Already tight"), cap("c3", 2, 3, "um")]}
    r = client.post(url("rewrite-captions"), json=body).json()
    assert r["source"] == "rules"
    assert r["items"] == [{"id": "c1", "before": "so um the the tofu is crispy", "after": "so the tofu is crispy"}]


def test_rewrite_with_claude_keeps_only_real_shorter_lines(client, monkeypatch):
    calls = claude_on(monkeypatch, editor_ai.RewriteOut(captions=[
        editor_ai.Rewrite(id="c1", text="Crispy tofu 🔥 fast"),          # emoji removed, shorter: kept
        editor_ai.Rewrite(id="c2", text="This is a much longer line than before"),  # longer: dropped
        editor_ai.Rewrite(id="zz", text="unknown id"),                    # not asked for: dropped
        editor_ai.Rewrite(id="c3", text="  "),                            # empty: dropped
    ]))
    body = {"captions": [cap("c1", 0, 1, "It is really very crispy tofu and fast"), cap("c2", 1, 2, "Short one"), cap("c3", 2, 3, "Third line here")]}
    r = client.post(url("rewrite-captions"), json=body).json()
    assert r["source"] == "ai" and r["items"] == [{"id": "c1", "before": "It is really very crispy tofu and fast", "after": "Crispy tofu fast"}]
    assert calls[0][0] == "rewrite" and [c["id"] for c in calls[0][1]["captions"]] == ["c1", "c2", "c3"]


def test_rewrite_sends_at_most_the_cap_and_needs_ids(client, monkeypatch):
    calls = claude_on(monkeypatch, editor_ai.RewriteOut(captions=[]))
    many = [cap(f"c{i}", i, i + 1, f"line {i}") for i in range(editor_ai.MAX_REWRITE + 20)]
    assert client.post(url("rewrite-captions"), json={"captions": many}).status_code == 200
    assert len(calls[0][1]["captions"]) == editor_ai.MAX_REWRITE
    assert client.post(url("rewrite-captions"), json={"captions": [{"start": 0, "end": 1, "text": "no id"}]}).status_code == 422
    assert client.post(url("rewrite-captions"), json={}).status_code == 422


# ---- title, caption, hashtags ----

def test_copy_rules_use_hook_and_client(client):
    r = client.post(url("copy"), json={"preset": "reels"}).json()
    assert r["source"] == "rules" and r["preset"] == "reels"
    assert r["title"] == "Fresh tofu in five minutes" and len(r["title"]) <= 60
    assert "Tofu Bar" in r["caption"] and len(r["caption"]) <= 150
    assert 3 <= len(r["hashtags"]) <= 5 and all(h.startswith("#") and " " not in h for h in r["hashtags"])
    assert "#reels" in [h.lower() for h in r["hashtags"]]
    assert client.post(url("copy"), json={"preset": "myspace"}).status_code == 422


def test_copy_with_claude_is_cut_to_length(client, monkeypatch):
    claude_on(monkeypatch, editor_ai.CopyOut(title="T" * 100 + " end", caption="Great tofu #ad " + "word " * 60,
                                             hashtags=["tofu", "#Crispy Tofu", "#tofu", "#a", "#b", "#c", "#d", "#e"]))
    r = client.post(url("copy"), json={"preset": "tiktok"}).json()
    assert r["source"] == "ai" and len(r["title"]) <= 60 and len(r["caption"]) <= 150 and "#" not in r["caption"]
    assert 3 <= len(r["hashtags"]) <= 5 and len({h.lower() for h in r["hashtags"]}) == len(r["hashtags"])


def test_copy_with_claude_too_few_tags_are_topped_up(client, monkeypatch):
    claude_on(monkeypatch, editor_ai.CopyOut(title="Crispy tofu", caption="Five minutes.", hashtags=["#tofu"]))
    r = client.post(url("copy"), json={"preset": "shorts"}).json()
    assert 3 <= len(r["hashtags"]) <= 5 and r["hashtags"][0] == "#Tofu"


def test_copy_empty_ai_answer_is_502(client, monkeypatch):
    claude_on(monkeypatch, editor_ai.CopyOut(title=" ", caption="x", hashtags=[]))
    assert client.post(url("copy"), json={"preset": "tiktok"}).status_code == 502


# ---- client notes and tasks ----

def add_notes(idea_id="ia", reason=None):
    server.save(f"comments:{idea_id}", [
        Comment(id="n2", ideaId=idea_id, videoId=f"v-{idea_id}", atSec=9.0, text="Music is too loud here", author="Annie", createdAt=2, source="review"),
        Comment(id="n1", ideaId=idea_id, videoId=f"v-{idea_id}", atSec=2.5, text="Use the other take of shot 2", author="Annie", createdAt=1, source="review"),
    ])
    if reason is not None:
        with server.db() as conn:
            conn.execute("INSERT INTO cut_reviews (idea_id, version, status, sent_at, decided_at, reason) VALUES (?, 1, 'rejected', 10, 20, ?)", (idea_id, reason))


def test_client_notes_empty_when_nothing_was_shared(client):
    r = client.get(url("client-notes")).json()
    assert r == {"shared": False, "cut": None, "notes": [], "tasks": []}


def test_client_notes_list_comments_in_time_order_with_the_cut_reason(client):
    add_notes(reason="Too slow overall")
    r = client.get(url("client-notes")).json()
    assert r["shared"] is True and r["cut"]["status"] == "rejected"
    assert [n["id"] for n in r["notes"]] == ["n1", "n2", "cut-reason"]
    assert r["notes"][2]["atSec"] is None and r["notes"][0]["atSec"] == 2.5


def test_comments_still_load_without_a_shared_cut(client):
    add_notes()
    r = client.get(url("client-notes")).json()
    assert r["shared"] is False and len(r["notes"]) == 2


def test_tasks_from_rules_persist_and_can_be_ticked(client):
    add_notes(reason="Too slow overall")
    made = client.post(url("client-notes/tasks")).json()
    assert made["source"] == "rules" and [t["commentId"] for t in made["tasks"]] == ["n1", "n2", "cut-reason"]
    assert made["tasks"][0]["type"] == "other" and made["tasks"][0]["action"] == "Use the other take of shot 2"
    assert made["tasks"][0]["target"] == "0:02" and made["tasks"][2]["target"] == "Whole video"
    done = client.patch(url("client-notes/tasks/n1"), json={"done": True}).json()
    assert [t["done"] for t in done["tasks"]] == [True, False, False]
    # survives a reload, and making tasks again neither duplicates nor un-ticks them
    again = client.post(url("client-notes/tasks")).json()["tasks"]
    assert len(again) == 3 and again[0]["done"] is True
    assert client.get(url("client-notes")).json()["tasks"][0]["done"] is True
    assert client.patch(url("client-notes/tasks/n1"), json={"done": False}).json()["tasks"][0]["done"] is False
    assert client.patch(url("client-notes/tasks/n1"), json={"done": "yes"}).status_code == 422
    assert client.patch(url("client-notes/tasks/nope"), json={"done": True}).status_code == 404


def test_tasks_with_claude_are_mapped_and_checked(client, monkeypatch):
    add_notes()
    calls = claude_on(monkeypatch, editor_ai.TasksOut(tasks=[
        editor_ai.TaskOut(commentId="n1", type="swap_take", target="Shot 2", action="Swap to the second take of Shot 2."),
        editor_ai.TaskOut(commentId="n2", type="volume", target="", action="Lower the music under the voice."),   # bad type -> other
        editor_ai.TaskOut(commentId="ghost", type="trim", target="x", action="not a note"),
    ]))
    r = client.post(url("client-notes/tasks")).json()
    assert r["source"] == "ai" and calls[0][0] == "tasks"
    by = {t["commentId"]: t for t in r["tasks"]}
    assert set(by) == {"n1", "n2"} and by["n1"]["type"] == "swap_take" and by["n1"]["target"] == "Shot 2"
    assert by["n2"]["type"] == "other" and by["n2"]["target"] == "0:09" and by["n2"]["source"] == "ai"


def test_tasks_skipped_by_claude_fall_back_to_the_note(client, monkeypatch):
    add_notes()
    claude_on(monkeypatch, editor_ai.TasksOut(tasks=[]))
    r = client.post(url("client-notes/tasks")).json()
    assert r["source"] == "rules" and all(t["type"] == "other" for t in r["tasks"])


def test_no_notes_means_no_call(client, monkeypatch):
    calls = claude_on(monkeypatch, editor_ai.TasksOut(tasks=[]))
    assert client.post(url("client-notes/tasks")).json() == {"source": "rules", "tasks": []}
    assert calls == [] and spent() == 0


# ---- gating and auth ----

def test_routes_check_the_plan(client):
    for method, path in [("post", "hook-check"), ("post", "rewrite-captions"), ("post", "copy"), ("get", "client-notes"),
                         ("post", "client-notes/tasks"), ("patch", "client-notes/tasks/n1")]:
        assert getattr(client, method)(url(path, "nope"), **({} if method == "get" else {"json": {}})).status_code == 404, path
        assert getattr(client, method)(url(path, "iw"), **({} if method == "get" else {"json": {}})).status_code == 409, path


def test_routes_need_a_session_once_users_exist(client):
    add_user()
    for method, path in [("post", "hook-check"), ("post", "rewrite-captions"), ("post", "copy"), ("get", "client-notes"),
                         ("post", "client-notes/tasks"), ("patch", "client-notes/tasks/n1")]:
        assert getattr(client, method)(url(path)).status_code == 401, path
    assert login(client).status_code == 200
    assert client.get(url("client-notes")).status_code == 200


def test_pure_helpers():
    assert editor_ai.clean("Hello 🔥  world", 60) == "Hello world"
    assert len(editor_ai.clean("word " * 50, 30)) <= 30
    assert editor_ai.tighten_rules("Um, the the cat") == "the cat"
    assert editor_ai.tag_of("crispy tofu") == "#CrispyTofu"

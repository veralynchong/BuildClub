import json
import sqlite3
import time
from pathlib import Path

import pytest

import assist
import server
from conftest import item, median_search
from models import SearchResult


def write_search(folder, query, fetched_at, videos):
    folder.mkdir(parents=True, exist_ok=True)
    payload = {"query": query, "platform": "tiktok", "fetchedAt": fetched_at, "videos": videos}
    (folder / server.cache_name(query)).write_text(json.dumps(payload))


def test_pinned_search_loads_without_network(client):
    video = server.trim(item(1, "a", 500))
    write_search(server.PINNED_DIR, "tofu", 0, [video])  # fetchedAt 0: pins never expire
    r = client.get("/api/search", params={"q": " tofu "})
    assert r.status_code == 200
    assert r.json()["cached"] is True
    assert r.json()["videos"][0]["ratio"] == 5
    assert r.json()["videos"][0]["medianViews"] is None  # saved before medians existed


def test_expired_cache_goes_live(client):
    write_search(server.CACHE_DIR, "tofu", 0, [])
    r = client.get("/api/search", params={"q": "tofu"})
    assert r.status_code == 502  # the offline fixture makes every Apify call fail


def test_empty_search_is_rejected(client):
    assert client.get("/api/search", params={"q": "   "}).status_code == 400


def test_search_without_token_is_off(client, monkeypatch):
    monkeypatch.setattr(server, "TOKEN", "")
    assert client.get("/api/search", params={"q": "tofu"}).status_code == 503


def test_live_search_adds_account_medians(client, monkeypatch):
    calls = []

    def fake_actor(payload, max_items, actor=None, max_usd=None):
        calls.append((payload, max_items))
        if "searchQueries" in payload:
            return [item(1, "small", 9000, fans=10), item(2, "big", 1000, fans=1000), {"id": 3}]
        # small posts five videos with a median of 300; big posts only two
        return [item(10 + n, "small", v) for n, v in enumerate([100, 200, 300, 400, 500])] + \
               [item(20, "big", 10), item(21, "big", 20)]

    monkeypatch.setattr(server, "run_actor", fake_actor)
    r = client.get("/api/search", params={"q": "tofu", "fresh": "1"})
    assert r.status_code == 200
    assert r.json()["mediansPending"] is True
    r = client.get("/api/search", params={"q": "tofu"})  # the cache now holds the medians
    assert r.json()["mediansPending"] is False
    small, big = r.json()["videos"]  # sorted by views ÷ followers; the item without a URL is dropped
    assert (small["medianViews"], small["outlier"]) == (300, 30)
    assert (big["medianViews"], big["outlier"]) == (None, None)
    profiles, max_items = calls[1]
    assert profiles["profiles"] == ["small", "big"] and max_items == 2 * server.VIDEOS_PER_AUTHOR
    assert SearchResult.model_validate(json.loads((server.CACHE_DIR / server.cache_name("tofu")).read_text())
                                       | {"cached": False})


def test_failed_medians_keep_the_search(client, monkeypatch):
    def fake_actor(payload, max_items, actor=None, max_usd=None):
        if "profiles" in payload:
            raise RuntimeError("Apify returned 402")
        return [item(1, "a", 500)]

    monkeypatch.setattr(server, "run_actor", fake_actor)
    r = client.get("/api/search", params={"q": "tofu", "fresh": "1"})
    assert r.status_code == 200
    assert r.json()["videos"][0]["outlier"] is None


def test_median_needs_five_videos():
    assert server.account_baselines([item(n, "a", n) for n in range(4)]) == {}
    five = server.account_baselines([item(n, "a", n) for n in range(5)])
    assert five["a"]["median"] == 2
    assert five["a"]["n"] == 5


def test_baseline_records_count_and_date_range():
    first = 1790812800  # 2026-10-01 UTC
    items = [item(n, "a", n, created=first + (n - 1) * 86400) for n in range(1, 7)]
    assert server.account_baselines(items)["a"] == {
        "median": 3.5, "n": 6, "from": "2026-10-01", "to": "2026-10-06"}


def test_saved_pins_still_match_the_contract():
    for pin in (Path(server.__file__).parent / "pinned").glob("*.json"):
        SearchResult.model_validate(json.loads(pin.read_text()) | {"cached": True})


def test_trim_keeps_the_ratio():
    video = server.trim(item(7, "a", 1000, fans=10))
    assert video["id"] == "7"
    assert video["ratio"] == 100
    assert video["createTime"] == "2025-10-27T00:00:00.000Z"


FIXTURE = Path(__file__).parent / "fixtures" / "instagram_tofu.json"  # a real search, 2026-10-27


def test_instagram_search_from_a_real_result(client, monkeypatch):
    calls = []

    def fake_actor(payload, max_items, actor=None, max_usd=None):
        calls.append((payload, actor))
        return json.loads(FIXTURE.read_text()) if actor == server.IG_ACTOR else []

    monkeypatch.setattr(server, "run_actor", fake_actor)
    r = client.get("/api/search", params={"q": "tofu", "platform": "instagram"})
    assert r.status_code == 200
    body = r.json()
    assert body["platform"] == "instagram" and len(body["videos"]) == 12
    plays = [v["plays"] for v in body["videos"]]
    assert plays == sorted(plays, reverse=True) and plays[0] == 6492169
    top = body["videos"][0]
    assert top["author"] == "thaotamto" and top["url"].startswith("https://www.instagram.com/")
    assert top["followers"] is None and top["ratio"] is None and top["medianViews"] is None
    assert [actor for _, actor in calls] == [server.IG_ACTOR, server.instagram.PROFILE_ACTOR, server.instagram.REEL_ACTOR]  # then followers, then the accounts' reels
    assert calls[0][0]["keywordSearch"] is True

    # the second search comes from the cache, kept apart from TikTok's
    assert client.get("/api/search", params={"q": "tofu", "platform": "instagram"}).json()["cached"] is True
    client.get("/api/search", params={"q": "tofu"})
    assert "searchQueries" in calls[-1][0]  # TikTok went to its own actor, not the Instagram cache


def test_unknown_platform_is_rejected(client):
    assert client.get("/api/search", params={"q": "tofu", "platform": "linkedin"}).status_code == 400


def test_tiktok_cache_names_did_not_change():
    assert server.cache_name("tofu") == server.cache_name("tofu", "tiktok") != server.cache_name("tofu", "instagram")


def fetched(calls):
    return [c["profiles"] for c in calls if "profiles" in c]


def test_account_medians_run_gets_its_own_charge_cap(client, monkeypatch):
    caps = []
    search = median_search([], ["a"])

    def fake_actor(payload, max_items, actor=None, max_usd=None):
        caps.append(("profiles" in payload, max_usd))
        return search(payload, max_items)
    monkeypatch.setattr(server, "run_actor", fake_actor)
    client.get("/api/search", params={"q": "tofu"})
    assert caps == [(False, None), (True, server.MAX_USD_PER_MEDIANS)]  # the search keeps the default cap
    assert server.MAX_USD_PER_MEDIANS > server.AUTHORS_PER_SEARCH * server.VIDEOS_PER_AUTHOR * server.APIFY_USD_PER_VIDEO


def test_account_medians_are_reused_for_a_week(client, monkeypatch):
    calls = []
    monkeypatch.setattr(server, "run_actor", median_search(calls, ["a", "b"]))
    client.get("/api/search", params={"q": "tofu"})
    monkeypatch.setattr(server, "run_actor", median_search(calls, ["b", "c"]))
    r = client.get("/api/search", params={"q": "miso"})
    assert fetched(calls) == [["a", "b"], ["c"]]  # b came from the saved medians
    assert [v["outlier"] for v in r.json()["videos"]] == [10, None]  # b scored at once, c later
    assert [v["outlier"] for v in client.get("/api/search", params={"q": "miso"}).json()["videos"]] == [10, 10]

    with server.db() as conn:  # a week later every account is fetched again
        conn.execute("UPDATE medians SET fetched_at = fetched_at - ?", (server.MEDIAN_DAYS * 86400 + 1,))
    client.get("/api/search", params={"q": "miso", "fresh": "1"})
    assert fetched(calls)[-1] == ["b", "c"]


def test_accounts_with_few_videos_are_not_fetched_again(client, monkeypatch):
    calls = []

    def fake_actor(payload, max_items, actor=None, max_usd=None):
        calls.append(payload)
        return [item(1, "new", 1000)] if "searchQueries" in payload else [item(2, "new", 10)]

    monkeypatch.setattr(server, "run_actor", fake_actor)
    for q in ("tofu", "miso"):
        assert client.get("/api/search", params={"q": q}).json()["videos"][0]["medianViews"] is None
    assert fetched(calls) == [["new"]]


def test_failed_medians_are_not_saved(client, monkeypatch):
    calls = []

    def failing(payload, max_items, actor=None, max_usd=None):
        calls.append(payload)
        if "profiles" in payload:
            raise RuntimeError("Apify returned 402")
        return [item(1, "a", 500)]

    monkeypatch.setattr(server, "run_actor", failing)
    client.get("/api/search", params={"q": "tofu"})
    client.get("/api/search", params={"q": "miso"})
    assert fetched(calls) == [["a"], ["a"]]


def test_results_come_back_before_account_medians(client, monkeypatch):
    import threading
    release, filled = threading.Event(), threading.Event()

    def slow_actor(payload, max_items, actor=None, max_usd=None):
        if "searchQueries" in payload:
            return [item(1, "a", 1000)]
        release.wait(5)
        return [item(10 + n, "a", 100) for n in range(5)]

    def real_thread(fill):
        threading.Thread(target=lambda: (fill(), filled.set()), daemon=True).start()

    monkeypatch.setattr(server, "run_actor", slow_actor)
    monkeypatch.setattr(server, "in_background", real_thread)
    r = client.get("/api/search", params={"q": "tofu"})
    assert r.json()["mediansPending"] is True
    assert r.json()["videos"][0]["medianViews"] is None
    assert client.get("/api/search", params={"q": "tofu"}).json()["mediansPending"] is True  # still filling
    release.set()
    assert filled.wait(5)
    r = client.get("/api/search", params={"q": "tofu"})
    assert r.json()["mediansPending"] is False
    assert r.json()["videos"][0]["outlier"] == 10


def test_saved_medians_need_no_waiting(client, monkeypatch):
    calls = []
    monkeypatch.setattr(server, "run_actor", median_search(calls, ["a"]))
    server.save_medians({"a": {"median": 100, "n": 5, "from": "2026-10-01", "to": "2026-10-05"}})
    r = client.get("/api/search", params={"q": "tofu"})
    assert r.json()["mediansPending"] is False
    assert r.json()["videos"][0]["outlier"] == 10
    assert fetched(calls) == []


def test_a_fill_lost_to_a_restart_is_not_waited_on(client):
    payload = {"query": "tofu", "platform": "tiktok", "fetchedAt": int(server.time.time() * 1000),
               "videos": [server.trim(item(1, "a", 500))], "mediansPending": True}
    server.CACHE_DIR.mkdir(parents=True)
    (server.CACHE_DIR / server.cache_name("tofu")).write_text(json.dumps(payload))
    assert client.get("/api/search", params={"q": "tofu"}).json()["mediansPending"] is False


def test_instagram_with_no_results_has_no_medians_to_wait_for(client, monkeypatch):
    monkeypatch.setattr(server, "run_actor", lambda payload, max_items, actor=None, max_usd=None: [])
    r = client.get("/api/search", params={"q": "tofu", "platform": "instagram"})
    assert r.json()["mediansPending"] is False


def test_a_poll_for_scores_never_searches_live(client):
    r = client.get("/api/search", params={"q": "tofu", "cachedOnly": "1"})
    assert r.status_code == 404  # the offline fixture would fail the test if Apify were called


def test_live_search_returns_baseline_details(client, monkeypatch):
    monkeypatch.setattr(server, "run_actor", median_search([], ["a"]))
    client.get("/api/search", params={"q": "tofu"})
    video = client.get("/api/search", params={"q": "tofu"}).json()["videos"][0]
    assert video["medianN"] == 5
    assert video["baselineFrom"] and video["baselineTo"]
    assert isinstance(video["medianFetchedAt"], int)
    assert abs(video["medianFetchedAt"] - server.time.time() * 1000) < 5000
    assert video["denominator"] == "median"


def test_unscored_account_falls_back_to_followers(client, monkeypatch):
    def fake_actor(payload, max_items, actor=None, max_usd=None):
        if "searchQueries" in payload:
            return [item(1, "new", 1000), item(2, "nofans", 1000, fans=0)]
        return []

    monkeypatch.setattr(server, "run_actor", fake_actor)
    client.get("/api/search", params={"q": "tofu"})
    videos = {v["author"]: v for v in client.get("/api/search", params={"q": "tofu"}).json()["videos"]}
    new, nofans = videos["new"], videos["nofans"]
    assert new["denominator"] == "followers"
    assert new["medianN"] is None
    assert nofans["denominator"] is None


def test_old_median_rows_load_without_details(client, monkeypatch):
    now = server.time.time()
    conn = sqlite3.connect(server.DB_PATH)  # the schema before n and the dates were added
    conn.execute("CREATE TABLE medians (author TEXT PRIMARY KEY, median REAL, fetched_at REAL NOT NULL)")
    conn.execute("INSERT INTO medians VALUES ('a', 100, ?)", (now,))
    conn.commit()
    conn.close()

    def search_only(payload, max_items, actor=None, max_usd=None):
        assert "searchQueries" in payload, "account medians were fetched again"
        return [item(1, "a", 1000)]

    monkeypatch.setattr(server, "run_actor", search_only)
    video = client.get("/api/search", params={"q": "tofu"}).json()["videos"][0]
    assert video["medianViews"] == 100
    assert video["medianN"] is None
    assert video["baselineFrom"] is None
    assert video["medianFetchedAt"] == int(now * 1000)
    assert video["denominator"] == "median"


# --- content types (GET /api/search/types) ---

def two_videos():
    return [server.trim(item(1, "a", 500)), server.trim(item(2, "b", 900))]


def fake_classifier(monkeypatch, answer):
    calls = []

    def fake(model, system, content, max_tokens):
        calls.append((model, content[0]["text"]))
        return answer

    monkeypatch.setattr(assist, "call_claude", fake)
    return calls


def test_types_are_sorted_once_then_free(client, monkeypatch):
    videos = two_videos()
    write_search(server.CACHE_DIR, "tofu", int(time.time() * 1000), videos)
    calls = fake_classifier(monkeypatch, 'Here: {"types": {"0": "recipe_cooking", "1": "street_interview"}}')
    for _ in range(2):
        r = client.get("/api/search/types", params={"q": "tofu"})
        assert (r.status_code, r.json()) == (200, {"types": {videos[0]["id"]: "recipe_cooking", videos[1]["id"]: "street_interview"}})
    assert [c[0] for c in calls] == [assist.CHEAP_MODEL]  # the second ask came from the saved types
    sent = json.loads(calls[0][1])
    assert set(sent[0]) == {"n", "caption", "hashtags", "author", "sound"}  # text only: no cover, url or counts


def test_pinned_search_types_are_sorted_on_demand(client, monkeypatch):
    videos = two_videos()
    write_search(server.PINNED_DIR, "tofu", 0, videos)
    fake_classifier(monkeypatch, '{"types": {"0": "challenge", "1": "other"}}')
    assert client.get("/api/search/types", params={"q": "tofu"}).json()["types"][videos[0]["id"]] == "challenge"
    assert not list(server.PINNED_DIR.glob("*.types"))  # the pinned folder is in git: nothing is written there
    assert list(server.CACHE_DIR.glob("*.types"))


def test_pinned_types_file_is_used_without_a_call(client, monkeypatch):
    videos = two_videos()
    write_search(server.PINNED_DIR, "tofu", 0, videos)
    (server.PINNED_DIR / server.types_file("tofu", "tiktok")).write_text(json.dumps({"fetchedAt": 0, "types": {videos[0]["id"]: "skit_comedy"}}))
    calls = fake_classifier(monkeypatch, "{}")
    assert client.get("/api/search/types", params={"q": "tofu"}).json() == {"types": {videos[0]["id"]: "skit_comedy"}}
    assert calls == []


def test_unknown_type_becomes_other_and_missing_ones_are_left_out(client, monkeypatch):
    videos = two_videos()
    write_search(server.CACHE_DIR, "tofu", int(time.time() * 1000), videos)
    fake_classifier(monkeypatch, '{"types": {"0": "cooking show", "7": "challenge", "x": "challenge"}}')
    assert client.get("/api/search/types", params={"q": "tofu"}).json() == {"types": {videos[0]["id"]: "other"}}


def test_types_of_an_older_fetch_are_not_reused(client, monkeypatch):
    videos = two_videos()
    now = int(time.time() * 1000)
    write_search(server.CACHE_DIR, "tofu", now, videos)
    (server.CACHE_DIR / server.types_file("tofu", "tiktok")).write_text(json.dumps({"fetchedAt": now - 5, "types": {videos[0]["id"]: "skit_comedy"}}))
    calls = fake_classifier(monkeypatch, '{"types": {"0": "tutorial_tips"}}')
    assert client.get("/api/search/types", params={"q": "tofu"}).json() == {"types": {videos[0]["id"]: "tutorial_tips"}}
    assert len(calls) == 1


@pytest.mark.parametrize("answer", ["no json at all", '{"types": ["recipe_cooking"]}', '{"nope": 1}'])
def test_unusable_answer_is_a_502_and_not_saved(client, monkeypatch, answer):
    write_search(server.CACHE_DIR, "tofu", int(time.time() * 1000), two_videos())
    fake_classifier(monkeypatch, answer)
    assert client.get("/api/search/types", params={"q": "tofu"}).status_code == 502
    assert not list(server.CACHE_DIR.glob("*.types"))


def test_failed_call_is_a_502(client, monkeypatch):
    write_search(server.CACHE_DIR, "tofu", int(time.time() * 1000), two_videos())

    def boom(*a, **k):
        raise RuntimeError("api down")

    monkeypatch.setattr(assist, "call_claude", boom)
    assert client.get("/api/search/types", params={"q": "tofu"}).status_code == 502


def test_types_need_a_saved_search_and_never_search(client, monkeypatch):
    calls = fake_classifier(monkeypatch, "{}")
    assert client.get("/api/search/types", params={"q": "tofu"}).status_code == 404  # run_actor would fail the test if called
    assert client.get("/api/search/types", params={"q": ""}).status_code == 400
    assert calls == []


def test_types_respect_the_claude_budget(client, monkeypatch):
    write_search(server.CACHE_DIR, "tofu", int(time.time() * 1000), two_videos())
    calls = fake_classifier(monkeypatch, "{}")
    monkeypatch.setattr(server, "DAILY_CLAUDE_USD", 0)
    assert client.get("/api/search/types", params={"q": "tofu"}).status_code == 429
    assert calls == []


def test_types_files_are_not_read_as_searches(client):
    write_search(server.CACHE_DIR, "tofu", 0, [])
    (server.CACHE_DIR / server.types_file("tofu", "tiktok")).write_text("{}")
    assert [name for name, _, _ in server.saved_files()] == [server.cache_name("tofu")]

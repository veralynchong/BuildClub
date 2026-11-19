import json

import server

MESSAGE = ("The beta budget for this workspace is used up. Saved work still opens; "
           "new AI analysis is paused. Contact the Remake team to add more.")


def put(day, spent):
    with server.db() as conn:
        conn.execute("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)", (f"spend:{day}", json.dumps(spent)))


def nearly_full(monkeypatch, limit=12.0):
    monkeypatch.setattr(server, "BETA_TOTAL_USD", limit, raising=False)
    put("2026-11-01", {"claude": 7.0, "apify": 1.0})
    put("2026-11-02", {"claude": 3.9})  # 11.9 in total over two days


def test_spend_over_the_total_is_refused_and_not_recorded(monkeypatch):
    nearly_full(monkeypatch)
    assert server.spend("claude", 0.2, 1.0) is False
    assert server.total_spent_usd() == 11.9


def test_spend_within_the_total_goes_through(monkeypatch):
    nearly_full(monkeypatch)
    assert server.spend("claude", 0.05, 1.0) is True
    assert server.total_spent_usd() == 11.95


def test_scrapecreators_credits_do_not_count(monkeypatch):
    nearly_full(monkeypatch)
    put("2026-11-03", {"scrapecreators": 500})
    assert server.total_spent_usd() == 11.9
    assert server.spend("scrapecreators", 100, 1000) is True


def test_unset_total_means_unlimited(monkeypatch):
    monkeypatch.setattr(server, "BETA_TOTAL_USD", None, raising=False)
    put("2026-11-01", {"claude": 500.0})
    assert server.spend("claude", 0.5, 1.0) is True


def test_gen_budget_with_a_connection_respects_the_total(monkeypatch):
    nearly_full(monkeypatch)
    put("2026-11-02", {"claude": 3.95})  # 11.95 in total
    with server.budget_lock, server.db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        r = server.gen_budget("image", 0.1, conn)
        assert r is not None and r.status_code == 429
        assert json.loads(r.body)["error"] == MESSAGE
        assert server.gen_budget("image", 0.05, conn) is None


def test_refund_lowers_the_total(monkeypatch):
    nearly_full(monkeypatch)
    server.spend("claude", 0.05, 1.0)
    server.refund("claude", 0.05)
    assert server.total_spent_usd() == 11.9


def test_endpoint_rejected_by_the_total_returns_the_beta_message(client, monkeypatch):
    monkeypatch.setattr(server, "BETA_TOTAL_USD", 0.05, raising=False)
    r = client.get("/api/search", params={"q": "tofu", "fresh": "1"})
    assert r.status_code == 429
    assert r.json()["error"] == MESSAGE

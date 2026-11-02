import json
import subprocess

import pytest
from fastapi.testclient import TestClient

import recheck
import server

TIKTOK = "https://www.tiktok.com/@a/video/1"
OLD = {"views": 1000, "likes": 50, "comments": 5, "followers": 300}


def fake_run(info=None, code=0, stderr="", raises=None, calls=None):
    def run(cmd, **kwargs):
        if calls is not None:
            calls.append(cmd)
        if raises:
            raise raises
        return subprocess.CompletedProcess(cmd, code, json.dumps(info) if info is not None else "", stderr)
    return run


@pytest.fixture
def api(monkeypatch):
    c = TestClient(server.app)

    def use(run):
        monkeypatch.setattr(recheck.subprocess, "run", run)
    return c, use


def post(c, **over):
    body = {"platform": "tiktok", "id": "tt-1", "url": TIKTOK, "old": OLD, **over}
    return c.post("/api/recheck", json=body)


def test_fetch_counts_reads_ytdlp_json_and_uses_the_safe_command():
    calls = []
    got = recheck.fetch_counts(TIKTOK, "tiktok", fake_run({"view_count": 2000, "like_count": 90, "comment_count": 7,
                                                           "channel_follower_count": 321}, calls=calls))
    assert got.model_dump() == {"views": 2000, "likes": 90, "comments": 7, "followers": 321}
    cmd = calls[0]
    assert cmd[:3] == ["yt-dlp", "--dump-json", "--skip-download"] and cmd[-2:] == ["--", TIKTOK]


def test_fetch_counts_missing_fields_are_none():
    got = recheck.fetch_counts(TIKTOK, "tiktok", fake_run({"view_count": 5}))
    assert got.likes is None and got.followers is None


def test_fetch_counts_nothing_returned_is_an_error():
    with pytest.raises(recheck.RecheckError, match="no view"):
        recheck.fetch_counts(TIKTOK, "tiktok", fake_run({"title": "x"}))


def test_instagram_login_wall_gets_a_clear_message():
    run = fake_run(code=1, stderr="ERROR: [Instagram] X: Requested content is not available, rate-limit reached or login required")
    with pytest.raises(recheck.RecheckError, match="Instagram wants a login"):
        recheck.fetch_counts("https://www.instagram.com/p/x/", "instagram", run)


def test_other_failures_timeouts_and_missing_ytdlp():
    with pytest.raises(recheck.RecheckError, match="couldn't read"):
        recheck.fetch_counts(TIKTOK, "tiktok", fake_run(code=1, stderr="ERROR: Video unavailable"))
    with pytest.raises(recheck.RecheckError, match="too long"):
        recheck.fetch_counts(TIKTOK, "tiktok", fake_run(raises=subprocess.TimeoutExpired("yt-dlp", 60)))
    with pytest.raises(recheck.RecheckError, match="isn't installed"):
        recheck.fetch_counts(TIKTOK, "tiktok", fake_run(raises=FileNotFoundError()))


def test_post_stores_old_and_new_and_get_returns_it_later(api):
    c, use = api
    assert c.get("/api/recheck", params={"platform": "tiktok", "id": "tt-1"}).json() == {"result": None}
    use(fake_run({"view_count": 2000, "like_count": 90, "comment_count": 7}))
    r = post(c)
    assert r.status_code == 200
    result = r.json()["result"]
    assert result["old"] == OLD
    assert result["new"] == {"views": 2000, "likes": 90, "comments": 7, "followers": 300}  # old followers kept
    assert result["followersKept"] is True and result["checkedAt"] > 0
    assert c.get("/api/recheck", params={"platform": "tiktok", "id": "tt-1"}).json()["result"] == result


def test_post_uses_new_followers_when_ytdlp_has_them(api):
    c, use = api
    use(fake_run({"view_count": 1, "channel_follower_count": 999}))
    result = post(c).json()["result"]
    assert result["new"]["followers"] == 999 and result["followersKept"] is False


def test_a_failed_recheck_is_a_502_with_a_message_and_keeps_the_old_result(api):
    c, use = api
    use(fake_run({"view_count": 2000}))
    first = post(c).json()["result"]
    use(fake_run(code=1, stderr="login required"))
    r = post(c)
    assert r.status_code == 502 and "login" in r.json()["error"]
    assert c.get("/api/recheck", params={"platform": "tiktok", "id": "tt-1"}).json()["result"] == first


def test_post_rejects_bad_input_without_running_ytdlp(api):
    c, use = api
    calls = []
    use(fake_run({"view_count": 1}, calls=calls))
    assert post(c, url="--exec=boom").status_code == 400
    assert post(c, url="https://example.com/v").status_code == 400
    assert post(c, platform="reddit", url="https://www.reddit.com/r/x/comments/1").status_code == 400
    assert post(c, platform="nope").status_code == 400
    assert calls == []

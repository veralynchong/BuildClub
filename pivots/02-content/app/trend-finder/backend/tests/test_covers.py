import json

import covers
import server


def payload(platform="tiktok", **extra):
    return {"query": "tofu", "platform": platform, "fetchedAt": 1, "videos": [
        {"id": "111", "cover": "https://cdn.example/a.jpg?x-expires=1", **extra},
        {"id": "222", "cover": "https://cdn.example/b.jpg"}]}


def test_write_cache_saves_covers_and_rewrites_urls(monkeypatch):
    monkeypatch.setattr(covers, "download", lambda url: b"\xff\xd8img-" + url.encode())
    server.write_cache(payload())
    saved = json.loads((server.CACHE_DIR / server.cache_name("tofu")).read_text())
    assert [v["cover"] for v in saved["videos"]] == ["/api/cover/tiktok-111.jpg", "/api/cover/tiktok-222.jpg"]
    assert (server.COVERS_DIR / "tiktok-111.jpg").read_bytes().startswith(b"\xff\xd8img-https://cdn.example/a.jpg")


def test_failed_download_keeps_original_url(tmp_path):
    p = payload()
    saved = covers.localize(p, tmp_path, fetch=lambda url: None if "a.jpg" in url else b"x")
    assert saved == 1
    assert p["videos"][0]["cover"].startswith("https://cdn.example/a.jpg")
    assert p["videos"][1]["cover"] == "/api/cover/tiktok-222.jpg"


def test_localize_is_idempotent_and_reuses_files(tmp_path):
    p = payload()
    covers.localize(p, tmp_path, fetch=lambda url: b"x")
    again = covers.localize(p, tmp_path, fetch=lambda url: (_ for _ in ()).throw(AssertionError("refetched")))
    assert again == 0
    fresh = payload()  # a new search of the same videos: files exist, so no download
    assert covers.localize(fresh, tmp_path, fetch=lambda url: (_ for _ in ()).throw(AssertionError("refetched"))) == 0
    assert fresh["videos"][0]["cover"] == "/api/cover/tiktok-111.jpg"


def test_all_platforms_and_missing_ids(tmp_path):
    for platform in ("tiktok", "instagram", "x", "youtube", "reddit"):
        p = payload(platform)
        covers.localize(p, tmp_path, fetch=lambda url: b"x")
        assert p["videos"][0]["cover"] == f"/api/cover/{platform}-111.jpg"
    p = {"platform": "tiktok", "videos": [{"id": "", "cover": "https://cdn.example/c.jpg"}, {"id": "../x", "cover": "https://cdn.example/d.jpg"}]}
    assert covers.localize(p, tmp_path, fetch=lambda url: b"x") == 0
    assert p["videos"][0]["cover"].startswith("https://")


def test_cover_endpoint_serves_and_validates():
    from fastapi.testclient import TestClient
    server.COVERS_DIR.mkdir(parents=True, exist_ok=True)
    server.PINNED_COVERS_DIR.mkdir(parents=True, exist_ok=True)
    (server.COVERS_DIR / "tiktok-1.jpg").write_bytes(b"\xff\xd8cache")
    (server.PINNED_COVERS_DIR / "x-2.jpg").write_bytes(b"\x89PNG....")
    c = TestClient(server.app)
    assert c.get("/api/cover/tiktok-1.jpg").content == b"\xff\xd8cache"
    assert c.get("/api/cover/x-2.jpg").headers["content-type"] == "image/png"
    assert c.get("/api/cover/tiktok-9.jpg").status_code == 404
    assert c.get("/api/cover/..%2Fdata.db").status_code == 404
    assert c.get("/api/cover/other-1.jpg").status_code == 404


def test_localize_pins_rewrites_pin_files(monkeypatch, capsys):
    server.PINNED_DIR.mkdir()
    pin = server.PINNED_DIR / server.cache_name("tofu")
    pin.write_text(json.dumps(payload()))
    monkeypatch.setattr(covers, "download", lambda url: None if "a.jpg" in url else b"img")
    server.localize_pins()
    saved = json.loads(pin.read_text())
    assert saved["videos"][1]["cover"] == "/api/cover/tiktok-222.jpg"
    assert saved["videos"][0]["cover"].startswith("https://")
    assert (server.PINNED_DIR / "covers" / "tiktok-222.jpg").exists()
    assert "saved 1 new covers, 1 still remote" in capsys.readouterr().out

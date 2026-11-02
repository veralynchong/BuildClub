"""The client brand kit: kept across client-list saves, the logo upload rules, and the music file route."""

import pytest

import server
from test_takes import A, setup  # noqa: F401  (setup puts client "a" and the plans in the store)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 32
SVG = b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"


def logo(client, body=PNG, ctype="image/png", cid="a"):
    return client.put(f"/api/clients/{cid}/brand/logo", content=body, headers={"content-type": ctype})


def brand_files():
    folder = server.MEDIA_DIR / "brand" / "a"
    return sorted(p.name for p in folder.iterdir()) if folder.exists() else []


def test_put_clients_keeps_brand(client, setup):
    logo(client)
    client.put("/api/clients/a/brand", json={"font": "Noto Sans TC", "color": "#112233"})
    kept = client.get("/api/clients").json()[0]["brand"]
    assert kept["color"] == "#112233" and kept["logo"]
    r = client.put("/api/clients", json=[A])  # the app saves the list without the brand
    assert r.json()[0]["brand"] == kept
    assert client.get("/api/clients").json()[0]["brand"] == kept


def test_brand_update_keeps_logo(client, setup):
    first = logo(client).json()
    r = client.put("/api/clients/a/brand", json={"font": "Noto Sans TC", "color": "#aabbcc"})
    assert r.status_code == 200 and r.json()["logo"] == first["logo"] and r.json()["color"] == "#aabbcc"
    assert client.put("/api/clients/a/brand", json={"font": "Comic Sans", "color": None}).status_code == 422
    assert client.put("/api/clients/a/brand", json={"font": "Noto Sans TC", "color": "red"}).status_code == 422


def test_logo_upload_rejects_svg_and_fake_png(client, setup):
    assert logo(client, SVG, "image/svg+xml").status_code == 415
    assert logo(client, SVG, "image/png").status_code == 415  # a PNG label on other bytes
    assert logo(client, PNG + b"0" * (5 * 1024 * 1024)).status_code == 413
    assert brand_files() == []
    assert client.get("/api/clients").json()[0].get("brand") is None


def test_logo_get_and_delete(client, setup):
    assert client.get("/api/clients/a/brand/logo").status_code == 404
    name = logo(client, JPG, "image/jpeg").json()["logo"]
    assert name.endswith(".jpg")
    r = client.get("/api/clients/a/brand/logo")
    assert r.status_code == 200 and r.content == JPG and r.headers["content-type"] == "image/jpeg"
    d = client.delete("/api/clients/a/brand/logo")
    assert d.status_code == 200 and d.json()["logo"] is None
    assert brand_files() == [] and client.get("/api/clients/a/brand/logo").status_code == 404


def test_logo_replace_removes_old_file(client, setup):
    one = logo(client).json()["logo"]
    two = logo(client, JPG, "image/jpeg").json()["logo"]
    assert one != two and brand_files() == [two]


def test_unknown_client_404(client, setup):
    assert logo(client, cid="nope").status_code == 404
    assert client.put("/api/clients/nope/brand", json={"font": "Noto Sans TC"}).status_code == 404
    assert client.get("/api/clients/nope/brand/logo").status_code == 404
    assert client.delete("/api/clients/nope/brand/logo").status_code == 404


def test_music_file_route(client, setup):
    assert client.get("/api/ideas/ia/cut/music/file").status_code == 404
    body = b"ID3" + b"\x00" * 40
    r = client.put("/api/ideas/ia/cut/music", content=body,
                   headers={"content-type": "audio/mpeg", "x-license-confirmed": "yes", "x-filename": "a.mp3"})
    assert r.status_code == 200
    got = client.get("/api/ideas/ia/cut/music/file")
    assert got.status_code == 200 and got.content == body and got.headers["content-type"] == "audio/mpeg"
    client.delete("/api/ideas/ia/cut/music")
    assert client.get("/api/ideas/ia/cut/music/file").status_code == 404

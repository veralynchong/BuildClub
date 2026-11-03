"""The per-client consistency kit: item rules, image upload rules, file route, and persistence across client saves."""

import server
from test_takes import A, setup  # noqa: F401  (setup puts client "a" and the plans in the store)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 32
SVG = b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"
BASE = "/api/clients/a/kit"


def item(client, name="Mia", kind="character", **extra):
    return client.post(f"{BASE}/items", json={"kind": kind, "name": name, **extra})


def img(client, iid, body=PNG, ctype="image/png"):
    return client.put(f"{BASE}/items/{iid}/images", content=body, headers={"content-type": ctype})


def kit_files():
    folder = server.MEDIA_DIR / "kit" / "a"
    return sorted(p.name for p in folder.iterdir()) if folder.exists() else []


def test_create_item_and_list(client, setup):
    r = item(client, note="short black bob")
    assert r.status_code == 201 and r.json()["id"].startswith("k_") and r.json()["images"] == []
    assert isinstance(r.json()["updatedAt"], int)
    assert [i["name"] for i in client.get(BASE).json()["items"]] == ["Mia"]


def test_name_rules(client, setup):
    assert item(client).status_code == 201
    assert item(client, name="mia").status_code == 422  # duplicate, case-insensitive
    assert item(client, name="").status_code == 422
    assert item(client, name="x" * 41).status_code == 422
    assert item(client, name="x" * 40).status_code == 201
    assert item(client, name="Bob", kind="vehicle").status_code == 422
    assert "error" in item(client, name="mia").json()
    mia = client.get(BASE).json()["items"][0]["id"]
    other = item(client, name="Zed").json()["id"]
    assert client.patch(f"{BASE}/items/{other}", json={"name": "MIA"}).status_code == 422
    assert client.patch(f"{BASE}/items/{mia}", json={"name": "MIA"}).status_code == 200  # itself is fine


def test_item_limit_20(client, setup):
    for n in range(20):
        assert item(client, name=f"n{n}").status_code == 201
    assert item(client, name="n20").status_code == 422


def test_note_over_200_422(client, setup):
    assert item(client, note="x" * 201).status_code == 422
    assert item(client, note="x" * 200).status_code == 201


def test_patch_updates_item(client, setup):
    first = item(client).json()
    r = client.patch(f"{BASE}/items/{first['id']}", json={"note": "new", "kind": "place"})
    assert r.status_code == 200 and r.json()["note"] == "new" and r.json()["kind"] == "place"
    assert r.json()["name"] == "Mia" and r.json()["updatedAt"] > first["updatedAt"]


def test_image_upload_and_limit_4(client, setup):
    iid = item(client).json()["id"]
    last = client.get(BASE).json()["items"][0]["updatedAt"]
    for _ in range(4):
        r = img(client, iid)
        assert r.status_code == 200
        assert r.json()["updatedAt"] > last
        last = r.json()["updatedAt"]
    assert len(r.json()["images"]) == 4 and all(n.startswith("ka_") and n.endswith(".png") for n in r.json()["images"])
    assert img(client, iid).status_code == 422
    assert len(kit_files()) == 4
    assert img(client, iid, JPG, "image/jpeg").status_code == 422


def test_kit_image_rejects_fake_png(client, setup):
    iid = item(client).json()["id"]
    assert img(client, iid, SVG, "image/png").status_code == 415
    assert img(client, iid, SVG, "image/svg+xml").status_code == 415
    assert kit_files() == []


def test_image_over_10mb_413(client, setup):
    iid = item(client).json()["id"]
    assert img(client, iid, PNG + b"0" * (10 * 1024 * 1024)).status_code == 413
    assert kit_files() == []


def test_delete_image_and_item_removes_files(client, setup):
    iid = item(client).json()["id"]
    a = img(client, iid).json()
    b = img(client, iid, JPG, "image/jpeg").json()
    before = b["updatedAt"]
    r = client.delete(f"{BASE}/items/{iid}/images/{b['images'][1]}")
    assert r.status_code == 200 and r.json()["images"] == a["images"] and r.json()["updatedAt"] > before
    assert len(kit_files()) == 1
    assert client.delete(f"{BASE}/items/{iid}/images/ka_nope.png").status_code == 404
    d = client.delete(f"{BASE}/items/{iid}")
    assert d.status_code == 200 and d.json() == {"items": []}
    assert kit_files() == []
    assert client.delete(f"{BASE}/items/{iid}").status_code == 404


def test_file_route_only_serves_registered_names(client, setup):
    iid = item(client).json()["id"]
    name = img(client, iid).json()["images"][0]
    r = client.get(f"{BASE}/files/{name}")
    assert r.status_code == 200 and r.content == PNG and r.headers["content-type"] == "image/png"
    assert client.get(f"{BASE}/files/ka_unknown.png").status_code == 404
    assert client.get(f"{BASE}/files/..%2Fx").status_code == 404
    assert client.get(f"{BASE}/files/../x").status_code == 404


def test_put_clients_keeps_kit(client, setup):
    created = item(client).json()
    r = client.put("/api/clients", json=[A])
    assert r.status_code == 200
    assert client.get(BASE).json()["items"][0]["id"] == created["id"]


def test_unknown_client_404(client, setup):
    assert client.get("/api/clients/zz/kit").status_code == 404
    assert client.post("/api/clients/zz/kit/items", json={"kind": "place", "name": "x"}).status_code == 404
    assert client.get("/api/clients/zz/kit/files/ka_x.png").status_code == 404
    assert client.get(BASE).json() == {"items": []}

"""The edit project store: empty default, versioned writes, the limits, and the list of sources."""

import pytest

import cutting
import editing
import generations
import server
from test_takes import A, MP4, idea, store_ideas, up


@pytest.fixture
def setup(client):
    client.put("/api/clients", json=[A])
    store_ideas(idea("ia"), idea("iw", "waiting"))


def clip(id="c1", a=0.0, b=2.0, **extra):
    return {"id": id, "source": {"kind": "take", "id": "t1"}, "in": a, "out": b, "volume": 1, "muted": False, **extra}


def project(*clips):
    return {**editing.empty_project(), "clips": list(clips)}


def test_get_empty_project(client, setup):
    r = client.get("/api/ideas/ia/edit")
    assert r.status_code == 200 and r.json() == {"version": 0, "project": editing.empty_project()}


def test_put_then_get_roundtrip(client, setup):
    p = project(clip())
    r = client.put("/api/ideas/ia/edit", json={"version": 0, "project": p})
    assert r.status_code == 200 and r.json() == {"version": 1}
    assert client.get("/api/ideas/ia/edit").json() == {"version": 1, "project": p}


def test_put_stale_version_409(client, setup):
    client.put("/api/ideas/ia/edit", json={"version": 0, "project": project(clip())})
    r = client.put("/api/ideas/ia/edit", json={"version": 0, "project": project()})
    assert r.status_code == 409
    assert r.json() == {"error": "The edit changed somewhere else. Reload it.", "version": 1}


def bad(mutate):
    p = project(clip())
    mutate(p)
    return p


@pytest.mark.parametrize("doc", [
    project(clip(a=2.0, b=2.0)),
    project(clip(a=0.0, b=0.1)),
    project(clip(volume=3)),
    project(clip(b=100.0), clip("c2", 0, 81.0)),
    project(*[clip(f"c{i}", 0, 1) for i in range(101)]),
    bad(lambda p: p["clips"][0]["source"].update(kind="upload")),
    project(clip(b=float("nan"))),
], ids=["in>=out", "under-0.2s", "volume-3", "total-181s", "101-clips", "unknown-kind", "nan"])
def test_check_project_rejects(doc):
    assert editing.check_project(doc)


def test_check_project_accepts_drift_and_empty():
    assert editing.check_project(editing.empty_project()) is None
    assert editing.check_project(project(clip(a=1.0, b=1.2 - 1e-7))) is None
    assert editing.check_project(project(clip(b=90.0), clip("c2", 0, 90.0))) is None


def test_put_invalid_422(client, setup):
    r = client.put("/api/ideas/ia/edit", json={"version": 0, "project": project(clip(a=2, b=1))})
    assert r.status_code == 422 and "error" in r.json()


def fake_probe(monkeypatch, audio=None):
    audio = audio or {}

    def probe(path):
        if path.name.startswith("broken"):
            raise cutting.CutError("bad")
        return {"duration": 4.5, "width": 720, "height": 1280, "hasAudio": audio.get(path.name, True)}
    monkeypatch.setattr(cutting, "probe", probe)
    editing._probe_cache.clear()


def test_sources_lists_done_videos_and_takes(client, setup, monkeypatch):
    fake_probe(monkeypatch, {"clip.mp4": False})
    take = up(client).json()
    folder = server.MEDIA_DIR / "ia" / "gen"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "clip.mp4").write_bytes(MP4)
    (folder / "img.png").write_bytes(MP4)
    (folder / "broken.mp4").write_bytes(MP4)
    with server.db() as conn:
        good = generations.insert_done(conn, "ia", "n_vid_s1", "video", "mock-video", file="clip.mp4")
        generations.insert_done(conn, "ia", "n_sb_s1", "image", "mock-image", file="img.png")
        generations.insert_done(conn, "ia", "n_vid_s2", "video", "mock-video", file="broken.mp4")
        failed = generations.insert_done(conn, "ia", "n_vid_s3", "video", "mock-video", file="clip.mp4")
        conn.execute("UPDATE generations SET status = 'failed' WHERE id = ?", (failed["id"],))
    r = client.get("/api/ideas/ia/edit/sources")
    assert r.status_code == 200
    srcs = r.json()["sources"]
    assert [s["key"] for s in srcs] == [f"generation:{good['id']}", f"take:{take['id']}"]
    assert srcs[0] == {"key": f"generation:{good['id']}", "kind": "generation", "id": good["id"],
                       "nodeId": "n_vid_s1", "url": good["url"], "duration": 4.5, "hasAudio": False,
                       "width": 720, "height": 1280}
    assert srcs[1]["kind"] == "take" and "shotId" not in srcs[1] and srcs[1]["hasAudio"] is True
    assert all("path" not in s for s in srcs)


def test_probe_is_cached_by_mtime(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(cutting, "probe", lambda p: calls.append(p) or {"duration": 1, "width": 1, "height": 1, "hasAudio": True})
    editing._probe_cache.clear()
    f = tmp_path / "a.mp4"
    f.write_bytes(b"x")
    editing._probe(f)
    editing._probe(f)
    assert len(calls) == 1


def test_source_key():
    assert editing.source_key({"kind": "take", "id": "t1"}) == "take:t1"
    assert editing.source_key({"kind": "generation", "id": "g"}) == "generation:g"


def test_edit_needs_approved_plan(client, setup):
    for method, path in (("get", "/api/ideas/{}/edit"), ("get", "/api/ideas/{}/edit/sources")):
        assert getattr(client, method)(path.format("nope")).status_code == 404
        r = getattr(client, method)(path.format("iw"))
        assert r.status_code == 409 and r.json()["error"] == "Only an approved plan can be cut."
    assert client.put("/api/ideas/nope/edit", json={"version": 0, "project": project()}).status_code == 404
    assert client.put("/api/ideas/iw/edit", json={"version": 0, "project": project()}).status_code == 409

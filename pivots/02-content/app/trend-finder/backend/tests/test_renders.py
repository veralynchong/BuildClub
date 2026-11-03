"""The finished video: music upload, the editor export job, restart handling, stale detection, serving the MP4
and sending it for review. legacy_cut() stands in for a video the pre-P4 auto-cut pipeline left behind."""

import json
import os
import shutil
import threading
import time
from collections import namedtuple
from urllib.parse import quote

import pytest

import cutting
import editing
import publishing
import renders
import server
from models import Shot
from cutting import CutError
from test_auth import add_user
from test_takes import MP4, idea, store_ideas, up

from models import SavedIdea  # noqa: F401  (idea() builds one)

A = {"id": "a", "name": "Tofu Bar", "niche": "food", "audience": "students",
     "monthlyTarget": 8, "examples": [], "cannot": []}
MP3 = b"ID3\x03\x00\x00\x00\x00\x00\x00" + b"\x00" * 64
M4A = b"\x00\x00\x00\x18ftypM4A " + b"\x00" * 64
WAV = b"RIFF\x24\x00\x00\x00WAVEfmt " + b"\x00" * 32
FINAL = b"fake-cut-output" * 100


@pytest.fixture
def setup(client, monkeypatch):
    client.put("/api/clients", json=[A])
    store_ideas(idea("ia"), idea("ib"), idea("iw", "waiting"))
    monkeypatch.setattr(cutting, "missing_tools", lambda: None)
    monkeypatch.setattr(cutting, "probe", lambda path: {"duration": 10.0})


def usage(free):
    return namedtuple("usage", "total used free")(0, 0, free)


def wait_for(client, idea_id="ia", timeout=5):
    end = time.time() + timeout
    while time.time() < end:
        state = client.get(f"/api/ideas/{idea_id}/cut").json()
        if state["status"] in ("done", "failed"):
            return state
        time.sleep(0.02)
    raise AssertionError("cut did not finish")


def with_take(client, shot=0, idea_id="ia"):
    return up(client, idea=idea_id, shot=shot).json()


def put_music(client, body=MP3, ctype="audio/mpeg", licensed="yes", name="song.mp3", idea_id="ia"):
    headers = {"content-type": ctype, "x-filename": quote(name)}
    if licensed:
        headers["x-license-confirmed"] = licensed
    return client.put(f"/api/ideas/{idea_id}/cut/music", content=body, headers=headers)


def cut_dir(idea_id="ia"):
    return server.MEDIA_DIR / idea_id / "cut"


EDIT_STALE = "The edit changed after this was exported. Export it again before sending it."


def project_of(take_id, *spans):
    clips = [{"id": f"c{i}", "source": {"kind": "take", "id": take_id}, "in": a, "out": b, "volume": 1, "muted": False}
             for i, (a, b) in enumerate(spans or [(0.0, 2.0)])]
    return {**editing.empty_project(), "clips": clips}


def put_project(client, take_id, *spans, idea_id="ia"):
    version = client.get(f"/api/ideas/{idea_id}/edit").json()["version"]
    r = client.put(f"/api/ideas/{idea_id}/edit", json={"version": version, "project": project_of(take_id, *spans)})
    assert r.status_code == 200, r.text


def export(client, idea_id="ia"):
    return client.post(f"/api/ideas/{idea_id}/edit/export")


def saved_project(conn, idea_id):
    row = conn.execute("SELECT doc FROM edit_projects WHERE idea_id = ?", (idea_id,)).fetchone()
    return json.loads(row[0]) if row else editing.empty_project()


def fake_editor_ok(monkeypatch):
    def run(db, media, idea_id, work, out, step):
        step(0.5, "Exporting")
        out.write_bytes(FINAL)
        with db() as conn:
            sig = editing.signature(conn, media, {"id": idea_id}, saved_project(conn, idea_id))
        return {"size": len(FINAL), "durationSec": 2.0, "signature": sig, "clips": 1}

    monkeypatch.setattr(renders, "run_editor", run)


@pytest.fixture
def slow_editor(monkeypatch):
    release, started = threading.Event(), threading.Event()

    def run(db, media, idea_id, work, out, step):
        started.set()
        release.wait(5)
        out.write_bytes(FINAL)
        return {"size": len(FINAL), "durationSec": 2.0, "signature": "x", "clips": 1}

    monkeypatch.setattr(renders, "run_editor", run)
    yield started, release
    release.set()


@pytest.fixture
def editor(client, setup, monkeypatch):
    """A plan with one uploaded take, an edit project that uses it, and fake render tools and ffprobe."""
    monkeypatch.setattr(editing, "missing_render_tools", lambda: None)
    monkeypatch.setattr(cutting, "probe", lambda path: {"duration": 4.5, "width": 720, "height": 1280, "hasAudio": True})
    editing._probe_cache.clear()
    take = with_take(client)
    put_project(client, take["id"])
    return take

@pytest.fixture
def fake_export(client, setup, monkeypatch):
    """The editor's export with fake render tools: an export finishes at once and writes FINAL."""
    monkeypatch.setattr(editing, "missing_render_tools", lambda: None)
    monkeypatch.setattr(cutting, "probe", lambda path: {"duration": 4.5, "width": 720, "height": 1280, "hasAudio": True})
    editing._probe_cache.clear()
    fake_editor_ok(monkeypatch)


def finished_cut(client):
    """A plan with one take and a finished editor export (needs the fake_export fixture); returns the cut state."""
    take = with_take(client)
    put_project(client, take["id"])
    assert export(client).status_code == 202
    return wait_for(client)


def legacy_cut(idea_id="ia", take_ids=(), music_id=None, shots=1):
    """A video left by the pre-P4 auto-cut pipeline: final.mp4 plus a renders row with out_source 'auto'."""
    folder = cut_dir(idea_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "final.mp4").write_bytes(FINAL)
    with server.db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO renders (idea_id, status, progress, step, speed, shots, signature, started_at, "
            "finished_at, source, out_size, out_duration, out_signature, out_speed, out_shots, out_source) "
            "VALUES (?, 'done', 1, 'Done', 1.1, ?, 's', 1, 2, 'auto', ?, 12.5, ?, 1.1, ?, 'auto')",
            (idea_id, shots, len(FINAL), renders.signature(list(take_ids), 1.1, music_id), shots))
    return folder



def test_no_cut_yet(client, setup):
    assert client.get("/api/ideas/ia/cut").json() == {
        "status": "none", "progress": 0, "step": "", "speed": 1.1, "stale": False, "music": None,
        "review": None}
    assert client.get("/api/ideas/nope/cut").status_code == 404


def test_download_has_attachment_header(client, fake_export):
    finished_cut(client)
    f = client.get("/api/ideas/ia/cut/file?download=1")
    assert f.status_code == 200
    assert f.headers["content-disposition"] == 'attachment; filename="remake-ia.mp4"'
    assert client.get("/api/ideas/ib/cut/file").status_code == 404


def test_restart_marks_running_failed(client, setup):
    with_take(client)
    folder = cut_dir() / "work"
    folder.mkdir(parents=True)
    (folder / "joined.mkv").write_bytes(b"x")
    with server.db() as conn:
        conn.execute("INSERT INTO renders (idea_id, status, progress, step, speed, signature, started_at) "
                     "VALUES ('ia', 'running', 0.4, 'Rendering', 1.1, 's', 1)")
        conn.execute("INSERT INTO renders (idea_id, status, progress, step, speed, signature, started_at) "
                     "VALUES ('ib', 'queued', 0, 'Waiting', 1.1, 's', 1)")
    renders.recover(server.db)
    for i in ("ia", "ib"):
        state = client.get(f"/api/ideas/{i}/cut").json()
        assert state["status"] == "failed"
        assert state["error"] == "The server restarted while this was being made. Make it again."
    assert not folder.exists()


def test_lifespan_recovers_on_startup(client, setup):
    from fastapi.testclient import TestClient
    with server.db() as conn:
        conn.execute("INSERT INTO renders (idea_id, status, progress, step, speed, signature, started_at) "
                     "VALUES ('ia', 'running', 0.4, 'Rendering', 1.1, 's', 1)")
    with TestClient(server.app) as c:
        assert c.get("/api/ideas/ia/cut").json()["status"] == "failed"


def test_survives_restart_when_done(client, fake_export):
    from fastapi.testclient import TestClient
    first = finished_cut(client)
    again = TestClient(server.app).get("/api/ideas/ia/cut").json()
    assert again["status"] == "done" and again["output"] == first["output"]


def test_stale_after_choosing_another_take(client, setup):
    first = with_take(client)
    legacy_cut(take_ids=[first["id"]])
    assert client.get("/api/ideas/ia/cut").json()["stale"] is False
    other = with_take(client)
    assert client.get("/api/ideas/ia/cut").json()["stale"] is False  # an unchosen extra take changes nothing
    client.post(f"/api/ideas/ia/takes/{other['id']}/choose")
    assert client.get("/api/ideas/ia/cut").json()["stale"] is True


def test_stale_after_music_change_but_not_speed(client, setup):
    first = with_take(client)
    legacy_cut(take_ids=[first["id"]])
    assert client.get("/api/ideas/ia/cut").json()["stale"] is False
    put_music(client)
    assert client.get("/api/ideas/ia/cut").json()["stale"] is True


def test_stale_ignores_takes_beyond_the_shot_count(client, setup):
    first = with_take(client, shot=0)
    legacy_cut(take_ids=[first["id"]], shots=1)
    with_take(client, shot=3)
    assert client.get("/api/ideas/ia/cut").json()["stale"] is False
    assert client.get("/api/ideas/ia/cut?shots=1").json()["stale"] is False


def test_music_upload_rules(client, setup, monkeypatch):
    r = put_music(client, licensed=None)
    assert r.status_code == 422 and r.json()["error"] == "Confirm you own this music or have the license to use it."
    assert put_music(client, licensed="no").status_code == 422
    r = put_music(client, ctype="video/mp4")
    assert r.status_code == 415 and r.json()["error"] == "Upload an .mp3, .m4a or .wav audio file."
    assert put_music(client, body=b"not audio at all", ctype="audio/mpeg").status_code == 415
    assert put_music(client, body=MP3, ctype="audio/wav").status_code == 415
    assert not list(cut_dir().glob("*")) if cut_dir().exists() else True

    ok = put_music(client)
    assert ok.status_code == 200 and ok.json()["music"] == {"name": "song.mp3", "size": len(MP3)}
    with server.db() as conn:
        music_id, ext, licensed_at = conn.execute("SELECT id, ext, licensed_at FROM cut_music").fetchone()
    assert licensed_at > 0
    old = cut_dir() / f"music-{music_id}.{ext}"
    assert old.read_bytes() == MP3

    again = put_music(client, body=M4A, ctype="audio/mp4", name="new.m4a")
    assert again.json()["music"] == {"name": "new.m4a", "size": len(M4A)}
    assert not old.exists() and len(list(cut_dir().glob("music-*"))) == 1
    assert put_music(client, body=WAV, ctype="audio/x-wav", name="w.wav").status_code == 200
    mask = put_music(client, body=b"\xff\xfb\x90\x00" + b"\x00" * 20)
    assert mask.status_code == 200

    monkeypatch.setattr(renders, "MAX_MUSIC_BYTES", 10)
    big = put_music(client)
    assert big.status_code == 413 and big.json()["error"] == "The music file is over the 30 MB limit."
    assert client.get("/api/ideas/ia/cut").json()["music"] is not None  # a refused upload keeps the old file

    gone = client.delete("/api/ideas/ia/cut/music")
    assert gone.status_code == 200 and gone.json()["music"] is None
    assert not list(cut_dir().glob("music-*"))
    with server.db() as conn:
        assert conn.execute("SELECT COUNT(*) FROM cut_music").fetchone()[0] == 0
    assert not list(cut_dir().glob(".*"))


def test_music_needs_an_approved_plan(client, setup):
    assert put_music(client, idea_id="iw").status_code == 409
    assert client.delete("/api/ideas/iw/cut/music").status_code == 409
    assert put_music(client, idea_id="nope").status_code == 404


def test_cut_routes_need_sign_in(client, fake_export):
    finished_cut(client)
    add_user()
    for r in (client.get("/api/ideas/ia/cut"), client.get("/api/ideas/ia/cut/file"), export(client),
              put_music(client), client.delete("/api/ideas/ia/cut/music")):
        assert r.status_code == 401


def test_review_link_shows_no_cut(client, fake_export):
    finished_cut(client)
    store_ideas(idea("ia", "waiting"), idea("ib"))
    token = client.post("/api/share", json={"clientId": "a"}).json()["token"]
    body = client.get(f"/api/review/{token}").text
    assert "/cut/file" not in body and "remake-" not in body


def test_reopened_plan_keeps_output_read_only(client, fake_export):
    finished_cut(client)
    store_ideas(idea("ia", "waiting"), idea("ib"))
    state = client.get("/api/ideas/ia/cut").json()
    assert state["status"] == "done" and state["output"]["size"] == len(FINAL)
    assert client.get(state["output"]["url"]).status_code == 200
    assert export(client).status_code == 409
    assert put_music(client).status_code == 409
    assert client.delete("/api/ideas/ia/cut/music").status_code == 409


def test_stale_when_the_number_of_picked_shots_changes(client, setup):
    first = with_take(client, shot=0)
    legacy_cut(take_ids=[first["id"]], shots=1)
    assert client.get("/api/ideas/ia/cut").json()["stale"] is False
    with_take(client, shot=1)
    assert client.get("/api/ideas/ia/cut?shots=2").json()["stale"] is True  # the plan gained a shot
    assert client.get("/api/ideas/ia/cut?shots=1").json()["stale"] is False  # orphan takes don't count


# --- sending a finished cut for approval -------------------------------------------------------------------

def review_link(client):
    assert client.post("/api/share", json={"clientId": "a"}).status_code in (200, 201)


def send(client, idea_id="ia"):
    return client.post(f"/api/ideas/{idea_id}/cut/review")


def review_rows():
    with server.db() as conn:
        return conn.execute("SELECT idea_id, status FROM cut_reviews").fetchall()


def test_send_for_review_sets_waiting(client, fake_export):
    finished_cut(client)
    review_link(client)
    r = send(client)
    assert r.status_code == 200
    review = r.json()["review"]
    assert review["status"] == "waiting" and isinstance(review["sentAt"], int)
    assert client.get("/api/ideas/ia/cut").json()["review"] == review


def test_send_needs_a_cut_409(client, fake_export):
    review_link(client)
    r = send(client)
    assert r.status_code == 409 and r.json()["error"] == "Make the video in the editor first."


def test_send_stale_cut_409(client, setup):
    first = with_take(client)
    legacy_cut(take_ids=[first["id"]])
    review_link(client)
    other = with_take(client)
    client.post(f"/api/ideas/ia/takes/{other['id']}/choose")
    r = send(client)
    assert r.status_code == 409
    assert r.json()["error"] == "The takes or music changed after this was made. Make it again before sending it."


def test_send_while_cutting_409(client, editor, slow_editor):
    started, _ = slow_editor
    review_link(client)
    assert export(client).status_code == 202
    assert started.wait(5)
    r = send(client)
    assert r.status_code == 409 and r.json()["error"] == "Wait for the cut to finish before sending it."


def test_send_needs_review_link_409(client, fake_export):
    finished_cut(client)
    r = send(client)
    assert r.status_code == 409
    assert r.json()["error"] == renders.NO_LINK == "This client's review link is turned off. Use Get review link on the Plans board, then try again."
    assert "Shortlist" not in r.json()["error"]


def test_send_not_approved_409(client, fake_export):
    review_link(client)
    r = send(client, "iw")
    assert r.status_code == 409 and r.json()["error"] == renders.NOT_APPROVED
    assert send(client, "nope").status_code == 404


def test_send_already_approved_409(client, fake_export):
    finished_cut(client)
    review_link(client)
    assert send(client).status_code == 200
    with server.db() as conn:
        conn.execute("UPDATE cut_reviews SET status = 'approved', decided_at = 1 WHERE idea_id = 'ia'")
    r = send(client)
    assert r.status_code == 409 and r.json()["error"] == "This video is already approved."


def test_recut_clears_review(client, fake_export):
    finished_cut(client)
    review_link(client)
    send(client)
    assert export(client).status_code == 202
    assert wait_for(client)["review"] is None
    assert review_rows() == []


def test_failed_recut_keeps_review(client, fake_export, monkeypatch):
    finished_cut(client)
    review_link(client)
    send(client)

    def boom(*a, **k):
        raise CutError("nope")

    monkeypatch.setattr(renders, "run_editor", boom)
    assert export(client).status_code == 202
    state = wait_for(client)
    assert state["status"] == "failed" and state["review"]["status"] == "waiting"


def test_review_survives_restart(client, fake_export):
    finished_cut(client)
    review_link(client)
    send(client)
    renders.recover(server.db)
    assert client.get("/api/ideas/ia/cut").json()["review"]["status"] == "waiting"


def test_send_stale_shot_count_409(client, setup):
    first = with_take(client)
    legacy_cut(take_ids=[first["id"]], shots=1)  # made for 1 shot
    review_link(client)
    shots = [Shot(time="0-3s", shot="a"), Shot(time="3-6s", shot="b")]
    server.save("ideas", [idea("ia").model_copy(update={"shots": shots}), idea("ib")])
    r = send(client)
    assert r.status_code == 409
    assert r.json()["error"] == "The takes or music changed after this was made. Make it again before sending it."


# ---- the editor export (renders.run_editor is swapped for a fake) ----


def test_export_writes_final_and_cut_row(client, editor, monkeypatch):
    fake_editor_ok(monkeypatch)
    r = export(client)
    assert r.status_code == 202
    state = wait_for(client)
    assert state["status"] == "done" and state["source"] == "editor" and state["output"]["url"]
    assert (cut_dir() / "final.mp4").read_bytes() == FINAL
    assert not list(cut_dir().glob("*.part")) and not (cut_dir() / "work").exists()  # F33
    with server.db() as conn:
        row = conn.execute("SELECT out_shots, out_speed, out_source FROM renders WHERE idea_id = 'ia'").fetchone()
    assert row == (1, 1.0, "editor")


def test_export_returns_202_while_render_blocks(client, editor, slow_editor):
    started, release = slow_editor
    r = export(client)
    assert r.status_code == 202 and r.json()["status"] in ("queued", "running")
    assert started.wait(5)
    assert client.get("/api/ideas/ia/cut").json()["status"] == "running"
    release.set()
    assert wait_for(client)["status"] == "done"


def test_export_refuses_empty_project(client, setup, monkeypatch):
    monkeypatch.setattr(editing, "missing_render_tools", lambda: None)
    r = export(client)
    assert r.status_code == 409 and r.json()["error"] == "Put at least one clip on the timeline first."


def test_export_refuses_missing_source(client, editor):
    assert client.delete(f"/api/ideas/ia/takes/{editor['id']}").status_code in (200, 204)
    r = export(client)
    assert r.status_code == 409 and r.json()["error"] == "A clip's video was deleted. Remove it from the timeline first."


def test_export_rejects_a_clip_past_the_end_of_its_source(client, editor):
    put_project(client, editor["id"], (0.0, 5.0))  # the source is 4.5 s long
    r = export(client)
    assert r.status_code == 400 and r.json()["error"] == editing.CLIP_PAST_END


def test_export_503_without_render_tools(client, editor, monkeypatch):
    monkeypatch.setattr(editing, "missing_render_tools", lambda: "no node")
    r = export(client)
    assert r.status_code == 503 and r.json()["error"] == "no node"


def test_export_needs_approved_plan(client, editor):
    assert export(client, "iw").status_code == 409
    assert export(client, "nope").status_code == 404


def test_export_refuses_when_disk_is_full(client, editor, monkeypatch):
    monkeypatch.setattr(shutil, "disk_usage", lambda p: usage(1))
    r = export(client)
    assert r.status_code == 409 and r.json()["error"] == "There isn't enough free disk space to make the cut."


def test_failed_editor_render_keeps_old_final(client, editor, monkeypatch):
    cut_dir().mkdir(parents=True, exist_ok=True)
    (cut_dir() / "final.mp4").write_bytes(b"old-video")
    with server.db() as conn:
        conn.execute("INSERT INTO renders (idea_id, status, progress, step, speed, signature, started_at, "
                     "out_size, out_duration, out_signature, out_speed, out_shots) "
                     "VALUES ('ia', 'done', 1, 'Done', 1.0, 's', 1, 9, 1.0, 's', 1.0, 1)")

    def boom(db, media, idea_id, work, out, step):
        out.write_bytes(b"half")
        raise CutError("The export failed: boom")

    monkeypatch.setattr(renders, "run_editor", boom)
    assert export(client).status_code == 202
    state = wait_for(client)
    assert state["status"] == "failed" and state["error"] == "The export failed: boom"
    assert (cut_dir() / "final.mp4").read_bytes() == b"old-video"
    assert not (cut_dir() / "work").exists() and not list(cut_dir().glob("*.part"))


def test_editor_cut_goes_stale_after_project_change(client, editor, monkeypatch):
    fake_editor_ok(monkeypatch)
    export(client)
    assert wait_for(client)["stale"] is False
    put_project(client, editor["id"], (0.0, 1.0))
    assert client.get("/api/ideas/ia/cut").json()["stale"] is True
    review_link(client)
    r = send(client)
    assert r.status_code == 409 and r.json()["error"] == EDIT_STALE


def test_editor_cut_stale_after_source_swapped(client, editor, monkeypatch):  # F34
    fake_editor_ok(monkeypatch)
    export(client)
    assert wait_for(client)["stale"] is False
    path = next(server.MEDIA_DIR.glob(f"ia/{editor['id']}.*"))
    path.write_bytes(MP4 + b"changed")
    os.utime(path, ns=(1, 1))
    assert client.get("/api/ideas/ia/cut").json()["stale"] is True


def test_editor_cut_ignores_shot_count(client, editor, monkeypatch):
    fake_editor_ok(monkeypatch)
    export(client)
    wait_for(client)
    assert client.get("/api/ideas/ia/cut", params={"shots": 7}).json()["stale"] is False


def test_editor_cut_review_and_publish_path(client, editor, monkeypatch):  # F32
    fake_editor_ok(monkeypatch)
    export(client)
    wait_for(client)
    review_link(client)
    r = send(client)
    assert r.status_code == 200 and r.json()["review"]["status"] == "waiting"
    with server.db() as conn:
        conn.execute("UPDATE cut_reviews SET status = 'approved' WHERE idea_id = 'ia'")
        path = publishing.approved_cut(conn, server.load, server.MEDIA_DIR.resolve(), "ia")
    assert path is not None and path.name == "final.mp4"  # the publish gate accepts the unchanged editor cut
    put_project(client, editor["id"], (0.0, 1.0))
    with server.db() as conn:
        assert publishing.approved_cut(conn, server.load, server.MEDIA_DIR.resolve(), "ia") is None


def test_recover_fails_running_editor_render(client, editor, slow_editor):
    started, release = slow_editor
    export(client)
    assert started.wait(5)
    renders.recover(server.db)
    state = client.get("/api/ideas/ia/cut").json()
    assert state["status"] == "failed" and state["error"] == renders.RESTARTED
    release.set()


def test_old_database_gets_source_columns():
    import sqlite3
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE renders (idea_id TEXT PRIMARY KEY, status TEXT NOT NULL, progress REAL NOT NULL, "
                 "step TEXT NOT NULL, error TEXT, speed REAL NOT NULL, shots INTEGER NOT NULL DEFAULT 1, "
                 "signature TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER, "
                 "out_size INTEGER, out_duration REAL, out_signature TEXT, out_speed REAL, out_shots INTEGER)")
    conn.execute("INSERT INTO renders (idea_id, status, progress, step, speed, signature, started_at, out_size) "
                 "VALUES ('x', 'done', 1, 's', 1.1, 's', 1, 5)")
    renders.migrate(conn)
    renders.migrate(conn)  # twice is fine
    assert conn.execute("SELECT source, out_source FROM renders").fetchone() == ("auto", "auto")


def test_edit_during_export_reads_stale(client, editor, monkeypatch, tmp_path):  # F13 through the real job
    monkeypatch.setattr(cutting, "probe", lambda path: {"duration": 2.0, "width": 1080, "height": 1920, "hasAudio": True})
    editing._probe_cache.clear()
    monkeypatch.setattr(editing, "NODE", "node")

    def spawn(cmd, on_progress, timeout, pid_file=None):
        put_project(client, editor["id"], (0.0, 1.0))  # the user edits while it renders
        out = json.loads(open(cmd[2]).read())["out"]
        open(out, "wb").write(FINAL)

    monkeypatch.setattr(editing, "spawn_render", spawn)
    assert export(client).status_code == 202
    state = wait_for(client)
    assert state["status"] == "done" and state["stale"] is True


# ---- the old auto-cut pipeline is gone; its finished videos still work ----

def test_old_cut_route_is_gone(client, setup):
    with_take(client)
    assert client.post("/api/ideas/ia/cut", json={"shotCount": 1, "speed": 1.1}).status_code == 405


def test_grade_and_cue_routes_are_gone(client, setup):
    for path in ("/api/cut/grades", "/api/ideas/ia/cut/subtitles", "/api/ideas/ia/cut/subtitles.srt"):
        assert client.get(path).status_code == 404


def test_cut_state_has_no_grade_or_autocut(client, fake_export):
    finished_cut(client)
    state = client.get("/api/ideas/ia/cut").json()
    assert "options" not in state and "autoCut" not in state and state["source"] == "editor"


def test_legacy_auto_cut_is_served_and_sendable(client, setup):
    first = with_take(client)
    legacy_cut(take_ids=[first["id"]])
    review_link(client)
    state = client.get("/api/ideas/ia/cut").json()
    assert state["status"] == "done" and state["source"] == "auto" and state["stale"] is False
    assert state["output"]["url"].startswith("/api/ideas/ia/cut/file?v=")
    assert "options" not in state and "autoCut" not in state
    assert client.get("/api/ideas/ia/cut/file").content == FINAL
    sent = send(client)
    assert sent.status_code == 200 and sent.json()["review"]["status"] == "waiting"


def test_legacy_auto_cut_goes_stale_when_takes_change(client, setup):
    first = with_take(client)
    legacy_cut(take_ids=[first["id"]])
    review_link(client)
    other = with_take(client)
    client.post(f"/api/ideas/ia/takes/{other['id']}/choose")
    assert client.get("/api/ideas/ia/cut").json()["stale"] is True
    r = send(client)
    assert r.status_code == 409 and r.json()["error"] == renders.STALE_CUT


def test_editor_export_replaces_legacy_auto_cut(client, fake_export):
    first = with_take(client)
    put_project(client, first["id"])
    legacy_cut(take_ids=[first["id"]])
    review_link(client)
    assert send(client).status_code == 200
    assert export(client).status_code == 202
    state = wait_for(client)
    assert state["source"] == "editor" and state["review"] is None
    with server.db() as conn:
        assert conn.execute("SELECT out_source FROM renders WHERE idea_id = 'ia'").fetchone() == ("editor",)
    assert review_rows() == []


def test_a_job_that_is_not_an_editor_export_fails(client, setup):
    with_take(client)
    with server.db() as conn:
        conn.execute("INSERT INTO renders (idea_id, status, progress, step, speed, signature, started_at, source) "
                     "VALUES ('ia', 'queued', 0, 'Waiting', 1.1, 's', 1, 'auto')")
    jobs = renders.RenderJobs(server.db, lambda: server.MEDIA_DIR)
    jobs.submit("ia")
    state = wait_for(client)
    assert state["status"] == "failed" and state["error"] == renders.GENERIC

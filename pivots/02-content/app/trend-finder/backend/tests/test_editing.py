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


# ---- the export job: helpers, the subprocess and render_project ----

REAL_PREWARM = editing.prewarm_bundle  # conftest replaces editing.prewarm_bundle for every test

import json  # noqa: E402
import os  # noqa: E402
import subprocess  # noqa: E402
import sys  # noqa: E402
import threading  # noqa: E402
import time  # noqa: E402
from pathlib import Path  # noqa: E402


def src(key, path, **extra):
    kind, sid = key.split(":")
    return {"key": key, "kind": kind, "id": sid, "path": str(path), "duration": 4.0, "hasAudio": True,
            "width": 720, "height": 1280, **extra}


def test_missing_sources_lists_clip_ids():
    p = project(clip("c1"), clip("c2"))
    p["clips"][1]["source"] = {"kind": "generation", "id": "g9"}
    assert editing.missing_sources(p, {"take:t1": {}}) == ["c2"]
    assert editing.missing_sources(p, {"take:t1": {}, "generation:g9": {}}) == []


def test_missing_render_tools_messages(monkeypatch, tmp_path):
    monkeypatch.setattr(editing, "NODE", None)
    assert editing.missing_render_tools() == "Node.js isn't installed on this computer, so the video can't be exported."
    monkeypatch.setattr(editing, "NODE", sys.executable)
    monkeypatch.setattr(editing, "APP_DIR", tmp_path)
    assert editing.missing_render_tools() == "The video export tools aren't installed. Run npm ci in the app folder."
    (tmp_path / "node_modules" / "@remotion" / "renderer").mkdir(parents=True)
    assert editing.missing_render_tools() is None


def test_signature_is_stable_and_follows_project_and_source(client, setup, monkeypatch):
    fake_probe(monkeypatch)
    t = up(client).json()
    f = next(server.MEDIA_DIR.glob(f"ia/{t['id']}.*"))
    p = project(clip())
    p["clips"][0]["source"]["id"] = t["id"]
    q = project(clip(b=1.5))
    q["clips"][0]["source"]["id"] = t["id"]
    media = server.MEDIA_DIR
    with server.db() as conn:
        one = editing.signature(conn, media, {"id": "ia"}, p)
        assert one == editing.signature(conn, media, {"id": "ia"}, project(*p["clips"]))
        assert len(one) == 16
        assert one != editing.signature(conn, media, {"id": "ia"}, q)
        os.utime(f, ns=(5, 5))
        changed = editing.signature(conn, media, {"id": "ia"}, p)
        assert one != changed  # a swapped file changes it
        # the cut_music id is not part of the P3a signature (F14)
        conn.execute("INSERT INTO cut_music (idea_id, id, ext, name, size, licensed_at) VALUES ('ia','m1','mp3','n',1,1)")
        conn.execute("UPDATE cut_music SET id = 'm2'")
        assert changed == editing.signature(conn, media, {"id": "ia"}, p)


def test_signature_ignores_primaries_but_follows_clips(client, setup, monkeypatch):
    fake_probe(monkeypatch)
    t = up(client).json()
    p = project(clip())
    p["clips"][0]["source"]["id"] = t["id"]
    with server.db() as conn:
        one = editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, p)
        pinned = {**p, "primaries": {"s1": {"kind": "take", "id": t["id"]}}}
        assert one == editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, pinned)
        q = project(clip(b=1.5))
        q["clips"][0]["source"]["id"] = t["id"]
        assert one != editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, q)


def test_render_input_names_files_by_key_hash(setup, tmp_path):
    f = tmp_path / "whatever.MOV"
    f.write_bytes(b"x")
    s = {"take:t1": src("take:t1", f)}
    inp, files = editing.render_input(None, tmp_path, {"id": "ia"}, project(clip(), clip("c2")), s)
    name = inp["urls"]["take:t1"]
    assert name.endswith(".MOV") and "/" not in name and name != "whatever.MOV"
    assert files == {name: f}
    assert inp["lines"] == {} and inp["musicUrl"] is None and inp["voice"] == []
    assert inp["project"]["clips"][0]["id"] == "c1" and inp["fontUrl"] == ""


def test_spawn_render_reports_progress():
    seen = []
    code = "import sys\nfor p in (0.1, 0.5, 1.0): print('progress', p, flush=True)\nprint('other noise')"
    editing.spawn_render([sys.executable, "-c", code], seen.append, 10)
    assert seen == [0.1, 0.5, 1.0]


GRANDCHILD = ("import os, subprocess, sys, time\n"
              "g = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])\n"
              "open({pids!r}, 'w').write(f'{{os.getpid()}} {{g.pid}}')\n"
              "time.sleep(60)")


def gone(pid):
    for _ in range(50):
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return True
        except PermissionError:
            return False
        time.sleep(0.1)
    return False


def read_pids(path):
    for _ in range(100):
        if path.exists() and len(path.read_text().split()) == 2:
            return [int(x) for x in path.read_text().split()]
        time.sleep(0.05)
    raise AssertionError("render never started")


def test_render_timeout_kills_process(tmp_path):
    pidfile = tmp_path / "pids"
    code = GRANDCHILD.format(pids=str(pidfile))
    t0 = time.time()
    with pytest.raises(cutting.CutError) as e:
        editing.spawn_render([sys.executable, "-c", code], lambda p: None, 0.5)
    assert str(e.value) == "The export took too long, so it was stopped."
    assert time.time() - t0 < 10
    child, grandchild = read_pids(pidfile)
    assert gone(child) and gone(grandchild)  # the whole group, not just the first process


def test_spawn_render_failure_message_has_no_paths():
    code = ("import sys\nprint('first', file=sys.stderr)\n"
            "print('Error: cannot open /Users/tommy/secret/dir/file.mp4 now', file=sys.stderr)\nsys.exit(3)")
    with pytest.raises(cutting.CutError) as e:
        editing.spawn_render([sys.executable, "-c", code], lambda p: None, 10)
    msg = str(e.value)
    assert msg == "The export failed: Error: cannot open <path>"
    assert "/Users" not in msg


def test_spawn_render_failure_message_is_capped():
    code = "import sys\nprint('x' * 900, file=sys.stderr)\nsys.exit(1)"
    with pytest.raises(cutting.CutError) as e:
        editing.spawn_render([sys.executable, "-c", code], lambda p: None, 10)
    assert len(str(e.value)) <= len("The export failed: ") + 200


def fake_tools(monkeypatch, tmp_path, probe_info=None):
    monkeypatch.setattr(editing, "missing_render_tools", lambda: None)
    monkeypatch.setattr(editing, "NODE", "node")
    monkeypatch.setattr(editing, "APP_DIR", tmp_path / "app")
    info = {"duration": 2.0, "width": 1080, "height": 1920, "hasAudio": True}
    info.update(probe_info or {})
    monkeypatch.setattr(cutting, "probe", lambda path: info)
    editing._probe_cache.clear()


def seed_take(client):
    return up(client).json()


def put(client, take_id, *spans):
    clips = [clip(f"c{i}", a, b) for i, (a, b) in enumerate(spans)]
    for c in clips:
        c["source"]["id"] = take_id
    v = client.get("/api/ideas/ia/edit").json()["version"]
    assert client.put("/api/ideas/ia/edit", json={"version": v, "project": project(*clips)}).status_code == 200


def test_render_project_builds_job_and_returns_facts(client, setup, monkeypatch, tmp_path):
    fake_tools(monkeypatch, tmp_path)
    t = seed_take(client)
    put(client, t["id"], (0.0, 1.0), (1.0, 2.0))
    seen = {}

    def spawn(cmd, on_progress, timeout, pid_file=None):
        import json
        seen["cmd"], seen["timeout"] = cmd, timeout
        job = json.loads(Path(cmd[2]).read_text())
        seen["job"] = job
        seen["linked"] = sorted(p.name for p in Path(job["mediaDir"]).iterdir())
        on_progress(0.5)
        Path(job["out"]).write_bytes(b"mp4")

    monkeypatch.setattr(editing, "spawn_render", spawn)
    steps = []
    work = tmp_path / "work"
    work.mkdir()
    result = editing.render_project(server.db, server.MEDIA_DIR, "ia", work, work / "next.mp4",
                                    lambda p, text: steps.append((p, text)))
    assert seen["cmd"][0] == "node" and seen["cmd"][1].endswith("render/render-reel.mjs")
    assert seen["timeout"] == editing.RENDER_TIMEOUT_S
    job = seen["job"]
    assert job["out"] == str(work / "next.mp4") and job["mediaDir"] == str(work / "media")
    assert job["cacheDir"] == str(tmp_path / "app" / ".remotion-bundle")
    assert len(seen["linked"]) == 1 and list(job["input"]["urls"].values()) == seen["linked"]
    assert steps == [(0.05 + 0.9 * 0.5, "Exporting")]
    assert result["size"] == 3 and result["clips"] == 2 and len(result["signature"]) == 16
    assert result["durationSec"] == 2.0


def test_render_project_refuses_empty_and_missing(client, setup, monkeypatch, tmp_path):
    fake_tools(monkeypatch, tmp_path)
    monkeypatch.setattr(editing, "spawn_render", lambda *a, **k: pytest.fail("must not run"))
    with pytest.raises(cutting.CutError, match="at least one clip"):
        editing.render_project(server.db, server.MEDIA_DIR, "ia", tmp_path, tmp_path / "o.mp4", lambda *a: None)
    t = seed_take(client)
    put(client, t["id"], (0.0, 1.0))
    client.delete(f"/api/ideas/ia/takes/{t['id']}")
    editing._probe_cache.clear()
    with pytest.raises(cutting.CutError, match="video was deleted"):
        editing.render_project(server.db, server.MEDIA_DIR, "ia", tmp_path, tmp_path / "o.mp4", lambda *a: None)


@pytest.mark.parametrize("info", [{"width": 720}, {"hasAudio": False}, {"duration": 2.5}],
                         ids=["size", "no-audio", "length"])
def test_render_project_rejects_bad_output(client, setup, monkeypatch, tmp_path, info):
    fake_tools(monkeypatch, tmp_path)
    t = seed_take(client)
    put(client, t["id"], (0.0, 1.0), (1.0, 2.0))
    real_probe = cutting.probe
    out = tmp_path / "w" / "next.mp4"
    out.parent.mkdir()

    def spawn(cmd, on_progress, timeout, pid_file=None):
        out.write_bytes(b"mp4")
        # the checks read the output; sources probe fine, the output probe is the bad one
        monkeypatch.setattr(cutting, "probe", lambda path: {"duration": 2.0, "width": 1080, "height": 1920,
                                                             "hasAudio": True, **info})

    monkeypatch.setattr(editing, "spawn_render", spawn)
    with pytest.raises(cutting.CutError):
        editing.render_project(server.db, server.MEDIA_DIR, "ia", out.parent, out, lambda *a: None)
    assert real_probe


def test_prewarm_never_blocks_and_runs_the_bundle_command(monkeypatch, tmp_path):
    monkeypatch.setattr(editing, "missing_render_tools", lambda: None)
    monkeypatch.setattr(editing, "NODE", "node")
    monkeypatch.setattr(editing, "APP_DIR", tmp_path)
    gate, ran = threading.Event(), []

    def slow(cmd, **kw):
        ran.append(cmd)
        gate.wait(5)

    monkeypatch.setattr(editing.subprocess, "run", slow)
    t0 = time.time()
    thread = REAL_PREWARM()
    assert time.time() - t0 < 1  # returned while the "bundle" is still running
    time.sleep(0.2)
    assert ran and ran[0][0] == "node" and "--bundle" in ran[0]
    gate.set()
    thread.join(5)


def test_prewarm_swallows_failures_and_skips_without_tools(monkeypatch):
    monkeypatch.setattr(editing, "missing_render_tools", lambda: "nope")
    assert REAL_PREWARM() is None
    monkeypatch.setattr(editing, "missing_render_tools", lambda: None)
    monkeypatch.setattr(editing, "NODE", "node")

    def boom(cmd, **kw):
        raise OSError("x")

    monkeypatch.setattr(editing.subprocess, "run", boom)
    thread = REAL_PREWARM()
    thread.join(5)
    assert not thread.is_alive()


def test_spawn_render_kills_leftovers_after_failure(tmp_path):
    pidfile = tmp_path / "pids"
    code = ("import os, subprocess, sys\n"
            "g = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])\n"
            f"open({str(pidfile)!r}, 'w').write(f'{{os.getpid()}} {{g.pid}}')\n"
            "sys.exit(2)")
    with pytest.raises(cutting.CutError):
        editing.spawn_render([sys.executable, "-c", code], lambda p: None, 10)
    child, grandchild = read_pids(pidfile)
    assert gone(child) and gone(grandchild)


def test_spawn_render_survives_a_failing_progress_callback():
    def bad(p):
        raise RuntimeError("x")

    code = "for i in range(2000): print('progress', i / 2000, flush=True)"
    editing.spawn_render([sys.executable, "-c", code], bad, 20)  # would hang on a full pipe if the reader died


def test_pid_file_written_then_removed(tmp_path):
    pf = tmp_path / "render.pid"
    seen = []
    code = "import time\nprint('progress 0.5', flush=True)\ntime.sleep(0.3)"
    editing.spawn_render([sys.executable, "-c", code], lambda p: seen.append(pf.exists()), 10, pf)
    assert seen == [True] and not pf.exists()


def test_recover_kills_orphaned_render_group(client, setup, tmp_path):
    import renders
    pidfile = tmp_path / "pids"
    cut = server.MEDIA_DIR / "ia" / "cut"
    (cut / "work").mkdir(parents=True)
    proc = subprocess.Popen([sys.executable, "-c", GRANDCHILD.format(pids=str(pidfile)), "render-reel.mjs"],
                            start_new_session=True)
    child, grandchild = read_pids(pidfile)
    (cut / "render.pid").write_text(str(proc.pid))
    with server.db() as conn:
        conn.execute("INSERT INTO renders (idea_id, status, progress, step, speed, signature, started_at, source) "
                     "VALUES ('ia', 'running', 0.4, 'Exporting', 1.0, '', 1, 'editor')")
    renders.recover(server.db)
    proc.wait(10)  # reaped here; the grandchild has no parent to reap it
    assert gone(child) and gone(grandchild)
    assert not (cut / "render.pid").exists() and not (cut / "work").exists()


def test_kill_orphan_ignores_junk_and_foreign_pids(tmp_path):
    f = tmp_path / "render.pid"
    f.write_text("not a number")
    editing.kill_orphan(f)
    assert not f.exists()
    f.write_text(str(os.getpid()))  # this test process does not lead its own group: must survive
    editing.kill_orphan(f)
    assert not f.exists()
    editing.kill_orphan(tmp_path / "missing.pid")


def test_kill_orphan_spares_a_group_leader_that_is_not_a_render(tmp_path):
    proc = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"], start_new_session=True)
    try:
        f = tmp_path / "render.pid"
        f.write_text(str(proc.pid))  # leads its own group, but is not render-reel.mjs: a reused pid
        editing.kill_orphan(f)
        assert not f.exists()
        assert proc.poll() is None
    finally:
        proc.kill()
        proc.wait(10)


def test_export_signature_is_from_the_job_start_snapshot(client, setup, monkeypatch, tmp_path):  # F13
    fake_tools(monkeypatch, tmp_path)
    t = seed_take(client)
    put(client, t["id"], (0.0, 1.0), (1.0, 2.0))
    with server.db() as conn:
        before = editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, json.loads(
            conn.execute("SELECT doc FROM edit_projects WHERE idea_id = 'ia'").fetchone()[0]))

    def spawn(cmd, on_progress, timeout, pid_file=None):
        v = client.get("/api/ideas/ia/edit").json()["version"]
        edited = project(*[clip(f"c{i}", a, b) for i, (a, b) in enumerate([(0.0, 0.5)])])
        edited["clips"][0]["source"]["id"] = t["id"]
        assert client.put("/api/ideas/ia/edit", json={"version": v, "project": edited}).status_code == 200
        Path(json.loads(Path(cmd[2]).read_text())["out"]).write_bytes(b"mp4")

    monkeypatch.setattr(editing, "spawn_render", spawn)
    work = tmp_path / "work"
    work.mkdir()
    result = editing.render_project(server.db, server.MEDIA_DIR, "ia", work, work / "n.mp4", lambda *a: None)
    assert result["signature"] == before
    with server.db() as conn:
        assert editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, json.loads(
            conn.execute("SELECT doc FROM edit_projects WHERE idea_id = 'ia'").fetchone()[0])) != before


def test_render_project_hides_probe_paths(client, setup, monkeypatch, tmp_path):
    fake_tools(monkeypatch, tmp_path)
    t = seed_take(client)
    put(client, t["id"], (0.0, 1.0), (1.0, 2.0))

    def spawn(cmd, on_progress, timeout, pid_file=None):
        monkeypatch.setattr(cutting, "probe", lambda p: (_ for _ in ()).throw(cutting.CutError("Could not read /Users/x/y.mp4")))

    monkeypatch.setattr(editing, "spawn_render", spawn)
    with pytest.raises(cutting.CutError) as e:
        editing.render_project(server.db, server.MEDIA_DIR, "ia", tmp_path, tmp_path / "n.mp4", lambda *a: None)
    assert str(e.value) == editing.BAD_OUTPUT

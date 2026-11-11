"""The edit project store: empty default, versioned writes, the limits, and the list of sources."""

import json

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
    project(clip(fit="stretch")),
    project(clip(b=100.0), clip("c2", 0, 81.0)),
    project(*[clip(f"c{i}", 0, 1) for i in range(101)]),
    bad(lambda p: p["clips"][0]["source"].update(kind="upload")),
    project(clip(b=float("nan"))),
], ids=["in>=out", "under-0.2s", "volume-3", "bad-fit", "total-181s", "101-clips", "unknown-kind", "nan"])
def test_check_project_rejects(doc):
    assert editing.check_project(doc)


def test_clip_fit_is_accepted_and_kept(client, setup):
    p = project(clip(fit="fit"), clip("c2", fit="fill"), clip("c3"))
    assert editing.check_project(p) is None
    assert client.put("/api/ideas/ia/edit", json={"version": 0, "project": p}).status_code == 200
    assert client.get("/api/ideas/ia/edit").json()["project"] == p


def test_check_project_accepts_drift_and_empty():
    assert editing.check_project(editing.empty_project()) is None
    assert editing.check_project(project(clip(a=1.0, b=1.2 - 1e-7))) is None
    assert editing.check_project(project(clip(b=90.0), clip("c2", 0, 90.0))) is None


def text(**extra):
    return {"id": "x1", "text": "hello", "start": 0, "end": 1, "position": "bottom", "color": "white", **extra}


@pytest.mark.parametrize("bad_text", [
    text(position="left"), text(color="red"), text(text=""), text(text="  "), text(text="a" * 121),
    text(start=2, end=2), text(start=3, end=1), text(start=-1), text(id="bad id!"), text(end=float("nan")),
], ids=["position", "colour", "empty", "blank", "121-chars", "end==start", "end<start", "negative", "id", "nan"])
def test_check_project_texts(bad_text):
    assert editing.check_project({**project(clip()), "texts": [bad_text]})


def test_check_project_texts_and_music_accepted_and_limited():
    assert editing.check_project({**project(clip()), "texts": [text(text="中" * 120), text(id="x2", color="black")],
                                  "music": {"volume": 0.5}}) is None
    assert editing.check_project({**project(clip()), "texts": [text(), text()]})  # shared id
    for music in ({}, {"volume": 2}, {"volume": -0.1}, {"volume": "loud"}, "mp3"):
        assert editing.check_project({**project(clip()), "music": music}), music


@pytest.mark.parametrize("field,value", [("logoSize", "huge"), ("logoSize", 3), ("logoCorner", "middle"), ("logoCorner", None)])
def test_check_project_rejects_bad_logo_fields(field, value):
    assert editing.check_project({**project(clip()), field: value})


def test_logo_fields_default_when_missing_and_are_accepted():
    old = project(clip())
    del old["logoSize"], old["logoCorner"]  # a project saved before the fields existed
    assert editing.check_project(old) is None
    assert editing.check_project({**project(clip()), "logoSize": "large", "logoCorner": "bottom-left"}) is None
    assert editing.empty_project()["logoSize"] == "medium" and editing.empty_project()["logoCorner"] == "top-right"


def test_old_project_loads_with_logo_defaults_and_keeps_its_signature(client, setup, monkeypatch):
    fake_probe(monkeypatch)
    t = up(client).json()
    old = project(clip())
    old["clips"][0]["source"]["id"] = t["id"]
    del old["logoSize"], old["logoCorner"]
    with server.db() as conn:
        conn.execute("INSERT INTO edit_projects (idea_id, version, doc, updated_at) VALUES ('ia', 1, ?, 0)", (json.dumps(old),))
    got = client.get("/api/ideas/ia/edit").json()["project"]
    assert got["logoSize"] == "medium" and got["logoCorner"] == "top-right"

    def sig(p):
        with server.db() as conn:
            return editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, p)

    assert sig(old) == sig(got)  # the default look is the old look, so an earlier export is not out of date
    assert sig({**got, "logoSize": "large"}) != sig(got)
    assert sig({**got, "logoCorner": "top-left"}) != sig(got)


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
import signal  # noqa: E402
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


def test_brand_change_makes_editor_cut_stale(client, setup, monkeypatch):
    fake_probe(monkeypatch)
    t = up(client).json()
    p = project(clip())
    p["clips"][0]["source"]["id"] = t["id"]

    def sig():
        with server.db() as conn:
            return editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, p)

    one = sig()
    client.put("/api/clients/a/brand", json={"font": "Noto Sans TC", "color": "#112233"})
    colour = sig()
    assert colour != one
    client.put("/api/clients/a/brand/logo", content=b"\x89PNG" + b"\0" * 16, headers={"content-type": "image/png"})
    with_logo = sig()
    assert with_logo != colour
    p["showLogo"] = True
    assert sig() != with_logo
    # render_input links the logo into the media dir and names it for the renderer
    with server.db() as conn:
        reel, files = editing.render_input(conn, server.MEDIA_DIR, {"id": "ia"}, p, {
            f"take:{t['id']}": src(f"take:{t['id']}", next(server.MEDIA_DIR.glob(f"ia/{t['id']}.*")))})
    name = reel["brand"]["logoUrl"]
    assert name.startswith("logo-") and files[name].is_file() and reel["brand"]["color"] == "#112233"


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
    assert steps == [(0.05 + 0.9 * 0.5, "Exporting"), (0.96, "Setting the sound level")]  # then the loudness pass
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


def test_recover_kills_orphaned_render_group(client, setup, tmp_path, monkeypatch):
    import renders
    pidfile = tmp_path / "pids"
    cut = server.MEDIA_DIR / "ia" / "cut"
    (cut / "work").mkdir(parents=True)
    proc = subprocess.Popen([sys.executable, "-c", GRANDCHILD.format(pids=str(pidfile)), "render-reel.mjs"],
                            start_new_session=True)
    try:
        child, grandchild = read_pids(pidfile)
        # macOS sandbox refuses setuid ps; identity is covered at its subprocess boundary below.
        monkeypatch.setattr(editing, "_is_render", lambda pid: pid == proc.pid)
        (cut / "render.pid").write_text(str(proc.pid))
        with server.db() as conn:
            conn.execute("INSERT INTO renders (idea_id, status, progress, step, speed, signature, started_at, source) "
                         "VALUES ('ia', 'running', 0.4, 'Exporting', 1.0, '', 1, 'editor')")
        renders.recover(server.db)
        proc.wait(10)  # reaped here; the grandchild has no parent to reap it
        assert gone(child) and gone(grandchild)
        assert not (cut / "render.pid").exists() and not (cut / "work").exists()
    finally:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait(10)


@pytest.mark.parametrize("code,command,expected", [
    (0, "node render-reel.mjs", True),
    (0, "python foreign-script.py", False),
    (1, "node render-reel.mjs", False),
])
def test_is_render_checks_command_and_exit(monkeypatch, code, command, expected):
    def run(args, **kwargs):
        assert args == ["ps", "-o", "command=", "-p", "12345"]
        return subprocess.CompletedProcess(args, code, command)
    monkeypatch.setattr(editing.subprocess, "run", run)
    assert editing._is_render(12345) is expected


@pytest.mark.parametrize("error", [OSError("denied"), subprocess.TimeoutExpired("ps", 5)])
def test_is_render_fails_closed(monkeypatch, error):
    def run(*args, **kwargs):
        raise error
    monkeypatch.setattr(editing.subprocess, "run", run)
    assert editing._is_render(12345) is False


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


# --- voiceover files ---

WEBM = {"content-type": "audio/webm;codecs=opus"}
WORDS = [(0.0, 0.4, "hello"), (0.5, 0.9, "there")]


@pytest.fixture
def voice_env(client, setup, monkeypatch):
    """Probing and converting are faked (they need real audio); whisper returns fixed words."""
    info = {"duration": 3.0, "width": None, "height": None, "hasAudio": True}
    monkeypatch.setattr(cutting, "probe", lambda path: dict(info))
    monkeypatch.setattr(cutting, "_ffmpeg", lambda *a, **k: None)
    monkeypatch.setattr(cutting, "transcribe_words", lambda wav, work: list(WORDS))
    monkeypatch.setattr(cutting, "find_silences", lambda wav, total: [])
    editing._probe_cache.clear()
    return info


def put_voice(client, body=b"audio-bytes", headers=WEBM, source="recording", idea="ia"):
    return client.put(f"/api/ideas/{idea}/edit/voice?source={source}", content=body, headers=headers)


def voiced(vid, **extra):
    return {"id": vid, "source": "recording", "start": 0.0, "volume": 1.0, "edits": {}, **extra}


def test_voice_upload_transcribes(client, voice_env):
    r = put_voice(client)
    assert r.status_code == 200
    got = r.json()
    assert got["duration"] == 3.0 and "wordsError" not in got
    assert got["words"] == [{"text": "hello", "start": 0.0, "end": 0.4}, {"text": "there", "start": 0.5, "end": 0.9}]
    assert got["url"] == f"/api/ideas/ia/edit/voice/{got['id']}/file"
    folder = server.MEDIA_DIR / "ia" / "edit" / "voice"
    assert sorted(p.name for p in folder.iterdir()) == [f"{got['id']}.webm", f"{got['id']}.words.json"]
    f = client.get(got["url"])
    assert f.status_code == 200 and f.content == b"audio-bytes" and f.headers["content-type"] == "audio/webm"


def test_voice_upload_without_whisper_keeps_file(client, voice_env, monkeypatch):
    def no_whisper(wav, work):
        raise cutting.CutError(cutting.NO_WHISPER)
    monkeypatch.setattr(cutting, "transcribe_words", no_whisper)
    got = put_voice(client, source="upload", headers={"content-type": "audio/mpeg"}).json()
    assert got["words"] is None and got["wordsError"] == cutting.NO_WHISPER
    folder = server.MEDIA_DIR / "ia" / "edit" / "voice"
    assert [p.name for p in folder.iterdir()] == [f"{got['id']}.mp3"]  # the file stays, no words file
    assert client.get(got["url"]).status_code == 200


def test_transcribe_voice_starts_a_word_after_the_pause(tmp_path, monkeypatch):
    # Real DTW words: "of" starts where "test" ended (1.84), across the 1.9-3.6 s pause; a caption must not
    # show it during the pause. Silences are what silencedetect finds on the same audio.
    import json
    from test_cutting import FIXTURES
    data = json.loads((FIXTURES / "whisper_words_dtw.json").read_text())
    monkeypatch.setattr(cutting, "_ffmpeg", lambda *a, **k: None)
    monkeypatch.setattr(cutting, "probe", lambda path: {"duration": 5.584})
    monkeypatch.setattr(cutting, "transcribe_words", lambda wav, work: cutting.parse_words(data))
    monkeypatch.setattr(cutting, "find_silences", lambda wav, total: [(0.0, 0.53), (1.908, 3.617), (4.881, 5.584)])
    words = {w["text"]: w for w in editing.transcribe_voice(tmp_path / "v.webm", tmp_path)}
    assert words["of"]["start"] == pytest.approx(3.617) and words["of"]["end"] == pytest.approx(3.72)
    assert words["test"]["end"] == pytest.approx(1.84) and words["tool"]["end"] == pytest.approx(4.68)


def test_transcribe_voice_of_silence_has_no_words(tmp_path, monkeypatch):
    # whisper hears "Thank you." in digital silence; a silent voiceover must not become a caption
    monkeypatch.setattr(cutting, "_ffmpeg", lambda *a, **k: None)
    monkeypatch.setattr(cutting, "probe", lambda path: {"duration": 8.0})
    monkeypatch.setattr(cutting, "find_silences", lambda wav, total: [(0.0, 8.0)])
    monkeypatch.setattr(cutting, "transcribe_words", lambda wav, work: [(0.0, 0.26, "Thank"), (0.26, 0.4, "you.")])
    assert editing.transcribe_voice(tmp_path / "v.wav", tmp_path) == []


def test_transcribe_voice_without_whisper_installed(tmp_path, monkeypatch):
    import analyze
    monkeypatch.setattr(cutting, "_ffmpeg", lambda *a, **k: None)
    monkeypatch.setattr(analyze, "WHISPER", str(tmp_path / "missing-whisper"))
    with pytest.raises(cutting.CutError) as e:
        editing.transcribe_voice(tmp_path / "a.mp3", tmp_path)
    assert str(e.value) == cutting.NO_WHISPER


def test_voice_upload_rejects_non_audio_and_long_files(client, voice_env, monkeypatch):
    assert put_voice(client, headers={"content-type": "video/mp4"}).status_code == 415
    assert put_voice(client, headers={"content-type": "text/plain"}).status_code == 415
    assert put_voice(client, source="other").status_code == 422
    voice_env["duration"] = 120.5
    r = put_voice(client)
    assert r.status_code == 422 and "120" in r.json()["error"]
    voice_env["duration"], voice_env["hasAudio"] = 3.0, False
    assert put_voice(client).status_code == 415  # no audio track
    voice_env["hasAudio"] = True

    def unreadable(path):
        raise cutting.CutError("bad")
    monkeypatch.setattr(cutting, "probe", unreadable)
    assert put_voice(client).status_code == 415  # the right content type, but not audio
    monkeypatch.setattr(editing, "MAX_VOICE_BYTES", 5)
    assert put_voice(client).status_code == 413
    folder = server.MEDIA_DIR / "ia" / "edit" / "voice"
    assert list(folder.iterdir()) == []  # nothing left behind, not even a part file


def test_voice_upload_needs_an_approved_plan(client, voice_env):
    assert put_voice(client, idea="iw").status_code == 409


def test_delete_voice_takes_the_edit_lock(client, voice_env):
    import threading

    got = put_voice(client).json()
    folder = server.MEDIA_DIR / "ia" / "edit" / "voice"
    result = {}
    worker = threading.Thread(target=lambda: result.update(r=client.delete(f"/api/ideas/ia/edit/voice/{got['id']}")))
    with editing.edit_lock:
        worker.start()
        worker.join(0.3)
        assert worker.is_alive() and "r" not in result  # still waiting for the lock
        assert any(folder.iterdir())
    worker.join(5)
    assert result["r"].status_code == 200
    assert list(folder.iterdir()) == []


def test_voice_delete_removes_both_files(client, voice_env):
    got = put_voice(client).json()
    assert client.delete(f"/api/ideas/ia/edit/voice/{got['id']}").status_code == 200
    assert list((server.MEDIA_DIR / "ia" / "edit" / "voice").iterdir()) == []
    assert client.get(got["url"]).status_code == 404
    assert client.delete(f"/api/ideas/ia/edit/voice/{got['id']}").status_code == 404


@pytest.mark.parametrize("voice", [
    {"source": "tts"}, {"id": "x", "source": "mic"}, {"id": "x", "source": "tts", "start": -1},
    {"id": "x", "source": "tts", "start": 0, "volume": 3}, {"id": "x", "source": "tts", "start": 0, "volume": 1, "edits": {"0": 5}},
], ids=["no-id", "bad-source", "negative-start", "volume-3", "edit-not-text"])
def test_check_project_rejects_bad_voiceover(voice):
    assert editing.check_project({**project(), "voiceover": [voice]})


def test_voiceover_id_must_exist_in_the_voice_folder(client, voice_env):
    p = {**project(clip()), "voiceover": [voiced("ghost")]}
    r = client.put("/api/ideas/ia/edit", json={"version": 0, "project": p})
    assert r.status_code == 422 and "missing" in r.json()["error"]
    vid = put_voice(client).json()["id"]
    p["voiceover"] = [voiced(vid, start=1.5, edits={"0": "hi"})]
    assert client.put("/api/ideas/ia/edit", json={"version": 0, "project": p}).status_code == 200
    store_ideas(idea("ia"), idea("ib"), idea("iw", "waiting"))
    other = client.put("/api/ideas/ib/edit", json={"version": 0, "project": p})  # another plan's folder
    assert other.status_code == 422


def test_signature_follows_voiceover_and_its_file(client, voice_env):
    vid = put_voice(client).json()["id"]
    p = {**project(), "voiceover": [voiced(vid)]}
    path = next((server.MEDIA_DIR / "ia" / "edit" / "voice").glob(f"{vid}.webm"))
    with server.db() as conn:
        sig = lambda proj: editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, proj)  # noqa: E731
        one = sig(p)
        assert one != sig(project())  # adding a voiceover makes the cut stale
        assert one != sig({**p, "voiceover": [voiced(vid, start=2.0)]})
        assert one != sig({**p, "voiceover": [voiced(vid, volume=0.5)]})
        os.utime(path, ns=(7, 7))
        assert one != sig(p)  # a swapped file changes it


def test_render_input_links_voice_files_with_words(client, voice_env):
    vid = put_voice(client).json()["id"]
    p = {**project(clip()), "voiceover": [voiced(vid)]}
    with server.db() as conn:
        reel, files = editing.render_input(conn, server.MEDIA_DIR, {"id": "ia"}, p, {
            "take:t1": src("take:t1", server.MEDIA_DIR / "x.mp4")})
    item = reel["voice"][0]
    assert item["id"] == vid and item["url"] == f"voice-{vid}.webm" and item["words"][0]["text"] == "hello"
    assert files[item["url"]].name == f"{vid}.webm"


def test_render_project_refuses_a_deleted_voice_file(client, voice_env, monkeypatch, tmp_path):
    fake_tools(monkeypatch, tmp_path)
    t = seed_take(client)["id"]
    vid = put_voice(client).json()["id"]
    put(client, t, (0, 2))
    doc = client.get("/api/ideas/ia/edit").json()
    doc["project"]["voiceover"] = [voiced(vid)]
    assert client.put("/api/ideas/ia/edit", json={"version": doc["version"], "project": doc["project"]}).status_code == 200
    voice_file = editing.voice_file(server.MEDIA_DIR, "ia", vid)
    voice_file.unlink()  # the DELETE route refuses while the project uses it
    with pytest.raises(cutting.CutError, match="voiceover file was deleted"):
        editing.render_project(server.db, server.MEDIA_DIR, "ia", tmp_path / "w", tmp_path / "o.mp4", lambda *a: None)


# --- fix round 1 ---

import shutil  # noqa: E402
import subprocess  # noqa: E402


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"), reason="needs ffmpeg")
def test_live_webm_recording_without_duration_is_accepted(client, setup, monkeypatch, tmp_path):
    monkeypatch.setattr(cutting, "transcribe_words", lambda wav, work: [])
    live = tmp_path / "live.webm"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "sine=d=3", "-c:a", "libopus", "-live", "1",
                    "-f", "webm", str(live)], check=True)
    r = put_voice(client, body=live.read_bytes())
    assert r.status_code == 200, r.text
    got = r.json()
    assert abs(got["duration"] - 3) < 0.3
    stored = next((server.MEDIA_DIR / "ia" / "edit" / "voice").glob(f"{got['id']}.webm"))
    assert cutting.probe(stored)["duration"] > 2.5  # the stored file has a duration for the renderer
    assert [p.name for p in stored.parent.iterdir() if p.name.startswith(".")] == []


def test_no_duration_after_remux_stays_415(client, voice_env):
    voice_env["duration"] = 0
    assert put_voice(client).status_code == 415


def seed_voice_gen(client, duration=3.0):
    folder = server.MEDIA_DIR / "ia" / "gen"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "v.mp3").write_bytes(b"ID3" + b"\0" * 20)
    with server.db() as conn:
        return generations.insert_done(conn, "ia", "editor-voice", "voice", "mock-voice", file="v.mp3")["id"]


def test_from_gen_applies_the_upload_checks(client, voice_env):
    gid = seed_voice_gen(client)
    ok = client.post(f"/api/ideas/ia/edit/voice/from-gen/{gid}")
    assert ok.status_code == 200 and ok.json()["words"][0]["text"] == "hello"
    voice_env["duration"] = 121
    assert client.post(f"/api/ideas/ia/edit/voice/from-gen/{seed_voice_gen(client)}").status_code == 422
    voice_env["duration"], voice_env["hasAudio"] = 3.0, False
    assert client.post(f"/api/ideas/ia/edit/voice/from-gen/{seed_voice_gen(client)}").status_code == 415
    folder = server.MEDIA_DIR / "ia" / "edit" / "voice"
    assert len([p for p in folder.iterdir()]) == 4  # only the one good import (audio, words, job note, claim); no part files


def test_words_error_is_scrubbed_and_capped(client, voice_env, monkeypatch):
    def boom(wav, work):
        raise cutting.CutError("Finding the words failed: cannot open /Users/x/secret/a.wav " + "z" * 400)
    monkeypatch.setattr(cutting, "transcribe_words", boom)
    err = put_voice(client).json()["wordsError"]
    assert "/Users" not in err and "<path>" in err and len(err) <= editing.MAX_ERROR_CHARS


def test_delete_voice_in_use_is_409(client, voice_env):
    vid = put_voice(client).json()["id"]
    p = {**project(clip()), "voiceover": [voiced(vid)]}
    assert client.put("/api/ideas/ia/edit", json={"version": 0, "project": p}).status_code == 200
    r = client.delete(f"/api/ideas/ia/edit/voice/{vid}")
    assert r.status_code == 409 and r.json()["error"] == editing.VOICE_IN_USE
    assert client.get(f"/api/ideas/ia/edit/voice/{vid}/file").status_code == 200
    assert client.put("/api/ideas/ia/edit", json={"version": 1, "project": project(clip())}).status_code == 200
    assert client.delete(f"/api/ideas/ia/edit/voice/{vid}").status_code == 200


def test_signature_follows_texts_music_and_the_music_file(client, setup, monkeypatch):
    fake_probe(monkeypatch)
    t = up(client).json()
    p = project(clip())
    p["clips"][0]["source"]["id"] = t["id"]
    folder = server.MEDIA_DIR / "ia" / "cut"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "music-m1.mp3").write_bytes(b"one")
    (folder / "music-m2.mp3").write_bytes(b"two")
    with server.db() as conn:
        conn.execute("INSERT INTO cut_music (idea_id, id, ext, name, size, licensed_at) VALUES ('ia','m1','mp3','n',3,1)")
        sig = lambda proj: editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, proj)  # noqa: E731
        base = sig(p)
        assert base != sig({**p, "texts": [text()]})
        assert base == sig({**p, "texts": []})
        withm = {**p, "music": {"volume": 0.5}}
        one = sig(withm)
        assert one != base and one != sig({**p, "music": {"volume": 0.8}})
        os.utime(folder / "music-m1.mp3", ns=(9, 9))
        rewritten = sig(withm)
        assert rewritten != one  # the same track rewritten
        conn.execute("UPDATE cut_music SET id = 'm2'")
        assert sig(withm) not in (one, rewritten)  # a swapped track
        conn.execute("UPDATE cut_music SET id = 'm1'")
        assert sig(p) == base  # music off: the file is ignored


def test_render_input_passes_music_url_only_when_music_is_on(client, setup, tmp_path):
    folder = server.MEDIA_DIR / "ia" / "cut"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "music-m1.mp3").write_bytes(b"x")
    f = tmp_path / "a.mp4"
    f.write_bytes(b"x")
    s = {"take:t1": src("take:t1", f)}
    with server.db() as conn:
        conn.execute("INSERT INTO cut_music (idea_id, id, ext, name, size, licensed_at) VALUES ('ia','m1','mp3','n',1,1)")
        off, _ = editing.render_input(conn, server.MEDIA_DIR, {"id": "ia"}, project(clip()), s)
        on, files = editing.render_input(conn, server.MEDIA_DIR, {"id": "ia"},
                                         {**project(clip()), "music": {"volume": 0.3}}, s)
    assert off["musicUrl"] is None
    assert on["musicUrl"] == "music-m1.mp3" and files["music-m1.mp3"].is_file()
    assert on["project"]["music"] == {"volume": 0.3}


# --- Task 11: captions read the shots' lines ---

def with_lines(**lines):
    from models import SavedIdea
    shots = [{"id": sid, "time": "0-3s", "shot": f"shot {sid}", "line": line} for sid, line in lines.items()]
    store_ideas(SavedIdea(id="ia", videoId="v-ia", clientId="a", status="approved", dueDate="2026-11-02", notes="",
                          shots=shots), idea("iw", "waiting"))


def test_signature_changes_when_shot_line_changes(client, setup):
    p = {**project(clip()), "captions": {"enabled": True}}
    p["clips"][0]["source"]["shotId"] = "s1"

    def sig(proj=p):
        with server.db() as conn:
            return editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, proj)

    with_lines(s1="three days")
    one = sig()
    assert one == sig()
    with_lines(s1="four days")
    two = sig()
    assert one != two  # a changed line makes the export stale
    with_lines(s1="four days", s2="more")
    assert two != sig()
    assert sig({**p, "captions": {"enabled": False}}) != sig()


def test_render_input_fills_lines_from_the_shots(client, setup, tmp_path):
    with_lines(s1="第一句", s2="  ", s3="third")
    f = tmp_path / "a.mp4"
    f.write_bytes(b"x")
    with server.db() as conn:
        reel, _ = editing.render_input(conn, server.MEDIA_DIR, {"id": "ia"}, project(clip()), {"take:t1": src("take:t1", f)})
        assert reel["lines"] == {"s1": "第一句", "s3": "third"}
        assert editing.render_input(None, tmp_path, {"id": "ia"}, project(clip()), {"take:t1": src("take:t1", f)})[0]["lines"] == {}


def test_list_voice_returns_files_with_words(client, voice_env):
    assert client.get("/api/ideas/ia/edit/voice").json() == {"voices": []}
    vid = put_voice(client).json()["id"]
    got = client.get("/api/ideas/ia/edit/voice").json()["voices"]
    assert [v["id"] for v in got] == [vid] and got[0]["duration"] == 3.0 and got[0]["words"][0]["text"] == "hello"
    assert client.get("/api/ideas/iw/edit/voice").status_code == 409


# --- Task 11 fix round 1 ---

def test_pending_voice_lists_done_jobs_not_yet_imported(client, voice_env):
    assert client.get("/api/ideas/ia/edit/voice/pending").json() == {"pending": []}
    gid = seed_voice_gen(client)
    assert [g["id"] for g in client.get("/api/ideas/ia/edit/voice/pending").json()["pending"]] == [gid]
    assert client.post(f"/api/ideas/ia/edit/voice/from-gen/{gid}").status_code == 200
    assert client.get("/api/ideas/ia/edit/voice/pending").json() == {"pending": []}
    assert client.get("/api/ideas/iw/edit/voice/pending").status_code == 409


def test_signature_ignores_shot_lines_while_captions_are_off(client, setup):
    p = project(clip())
    p["clips"][0]["source"]["shotId"] = "s1"

    def sig():
        with server.db() as conn:
            return editing.signature(conn, server.MEDIA_DIR, {"id": "ia"}, p)

    with_lines(s1="one")
    a = sig()
    with_lines(s1="two")
    assert a == sig()  # captions are off: the line is not in the video


def test_shot_lines_skips_a_bad_shot(client, setup):
    from models import SavedIdea
    good = {"id": "s2", "time": "0-3s", "shot": "x", "line": "ok"}
    store_ideas(SavedIdea(id="ia", videoId="v-ia", clientId="a", status="approved", dueDate="2026-11-02", notes="",
                          shots=[good]))
    with server.db() as conn:
        row = conn.execute("SELECT value FROM store WHERE key = 'ideas'").fetchone()
        import json
        ideas = json.loads(row[0])
        ideas[0]["shots"] = [{"id": "bad id!", "time": "0", "shot": "x", "line": "no"}, good]
        conn.execute("UPDATE store SET value = ? WHERE key = 'ideas'", (json.dumps(ideas),))
    with server.db() as conn:
        assert editing.shot_lines(conn, "ia") == {"s2": "ok"}


# --- Final review fixes ---

def test_second_import_of_a_job_is_refused(client, voice_env):
    gid = seed_voice_gen(client)
    assert client.post(f"/api/ideas/ia/edit/voice/from-gen/{gid}").status_code == 200
    again = client.post(f"/api/ideas/ia/edit/voice/from-gen/{gid}")
    assert again.status_code == 409 and again.json()["error"] == editing.VOICE_ALREADY_ADDED
    assert len(editing.voice_ids(server.MEDIA_DIR, "ia")) == 1


def test_failed_import_leaves_the_job_pending(client, voice_env):
    gid = seed_voice_gen(client)
    voice_env["duration"] = 121
    assert client.post(f"/api/ideas/ia/edit/voice/from-gen/{gid}").status_code == 422
    assert [g["id"] for g in client.get("/api/ideas/ia/edit/voice/pending").json()["pending"]] == [gid]
    voice_env["duration"] = 3.0
    assert client.post(f"/api/ideas/ia/edit/voice/from-gen/{gid}").status_code == 200
    assert client.get("/api/ideas/ia/edit/voice/pending").json() == {"pending": []}


def test_pending_lists_running_jobs_with_status(client, voice_env):
    with server.db() as conn:
        gid = generations.insert_done(conn, "ia", "editor-voice", "voice", "mock-voice", file="v.mp3")["id"]
        conn.execute("UPDATE generations SET status = 'running', file = NULL WHERE id = ?", (gid,))
    got = client.get("/api/ideas/ia/edit/voice/pending").json()["pending"]
    assert [(g["id"], g["status"]) for g in got] == [(gid, "running")]

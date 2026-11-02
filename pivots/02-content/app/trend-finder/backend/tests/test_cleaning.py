"""Cleaning a real take: fillers and long pauses are cut into a new, chosen take; the original stays."""

import sqlite3
import threading

import pytest

import cleaning
import cutting
import server
import takes
from models import SavedIdea, Shot
from test_auth import add_user
from test_cutting_media import FAKE_WORDS, GAP_CLIP, make_clip, need_ffmpeg
from test_takes import A, MP4, idea, media_files, store_ideas, up

pytestmark = need_ffmpeg


@pytest.fixture
def setup(client, monkeypatch):
    client.put("/api/clients", json=[A])
    store_ideas(idea("ia"), idea("ib"), idea("iw", "waiting"))
    monkeypatch.setattr(cutting, "missing_tools", lambda: None)
    monkeypatch.setattr(cleaning, "words_fn", lambda wav, work: FAKE_WORDS)


def upload_clip(client, tmp_path, parts=GAP_CLIP, idea_id="ia", shot=0, **kw):
    path = make_clip(tmp_path / "src.mp4", parts, **kw)
    return up(client, idea=idea_id, shot=shot, body=path.read_bytes())


def clean(client, take_id, idea_id="ia"):
    return client.post(f"/api/ideas/{idea_id}/takes/{take_id}/clean")


def folder():
    return server.MEDIA_DIR / "ia"


def test_clean_take_makes_a_chosen_cleaned_copy(client, setup, tmp_path):
    original = upload_clip(client, tmp_path).json()
    r = clean(client, original["id"])
    assert r.status_code == 201, r.text
    body = r.json()
    new = body["take"]
    assert new["cleanedFrom"] == original["id"] and new["chosen"] is True and new["id"] != original["id"]
    assert new["name"] == original["name"]
    by_id = {t["id"]: t for t in body["takes"]}
    assert by_id[original["id"]]["chosen"] is False and by_id[new["id"]]["chosen"] is True
    assert body["takes"] == client.get("/api/ideas/ia/takes").json()
    assert body["cleanSec"] <= body["originalSec"] - 0.9 and body["cleanSec"] >= 1.0
    assert [t["kind"] for t in body["trims"]] == ["pause"] and "shot" not in body["trims"][0]
    assert (folder() / f"{new['id']}.mp4").is_file() and (folder() / f"{original['id']}.mp4").is_file()
    assert not [p for p in folder().rglob("*") if p.name.startswith(".clean-") or p.suffix == ".part"]
    assert not any(p.name.startswith(".clean-") for p in folder().iterdir())


def test_filler_is_cut(client, setup, tmp_path, monkeypatch):
    monkeypatch.setattr(cleaning, "words_fn", lambda wav, work: [(0.0, 1.0, "hello"), (1.0, 1.4, "um"), (2.5, 3.5, "world")])
    r = clean(client, upload_clip(client, tmp_path).json()["id"])
    assert r.status_code == 201, r.text
    assert "filler" in {t["kind"] for t in r.json()["trims"]}


def test_no_audio_422(client, setup, tmp_path):
    t = upload_clip(client, tmp_path, with_audio=False).json()
    r = clean(client, t["id"])
    assert r.status_code == 422 and r.json()["error"] == cleaning.NO_AUDIO


def test_no_speech_422_and_nothing_saved(client, setup, tmp_path, monkeypatch):
    monkeypatch.setattr(cleaning, "words_fn", lambda wav, work: [])
    t = upload_clip(client, tmp_path).json()
    files = sorted(media_files())
    r = clean(client, t["id"])
    assert r.status_code == 422 and r.json()["error"] == cleaning.NO_SPEECH
    assert len(client.get("/api/ideas/ia/takes").json()) == 1 and sorted(media_files()) == files
    assert not any(p.name.startswith(".clean-") for p in folder().iterdir())


def test_nothing_to_clean_422(client, setup, tmp_path, monkeypatch):
    monkeypatch.setattr(cleaning, "words_fn", lambda wav, work: [(0.0, 1.75, "hello"), (1.75, 3.5, "world")])
    t = upload_clip(client, tmp_path, [("tone", 440, 3.5)]).json()  # no silence to trust over the word times
    r = clean(client, t["id"])
    assert r.status_code == 422 and r.json()["error"] == cleaning.NOTHING


def test_too_short_422(client, setup, tmp_path, monkeypatch):
    # only 0.9 s of speech is left once the long silence around it goes
    monkeypatch.setattr(cleaning, "words_fn", lambda wav, work: [(1.0, 1.1, "hi")])
    t = upload_clip(client, tmp_path, [("tone", 440, 1.0), ("quiet", None, 1.0), ("tone", 440, 1.0)]).json()
    r = clean(client, t["id"])
    assert r.status_code == 422 and r.json()["error"] == cleaning.TOO_SHORT


def test_too_long_422(client, setup, tmp_path, monkeypatch):
    monkeypatch.setattr(cleaning, "MAX_CLEAN_S", 2)
    r = clean(client, upload_clip(client, tmp_path).json()["id"])
    assert r.status_code == 422 and r.json()["error"] == cleaning.TOO_LONG


def test_cleaned_take_cannot_be_cleaned_again_409(client, setup, tmp_path):
    new = clean(client, upload_clip(client, tmp_path).json()["id"]).json()["take"]
    r = clean(client, new["id"])
    assert r.status_code == 409 and r.json()["error"] == cleaning.ALREADY_CLEAN


def test_second_clean_of_same_take_409(client, setup, tmp_path):
    original = upload_clip(client, tmp_path).json()
    assert clean(client, original["id"]).status_code == 201
    r = clean(client, original["id"])
    assert r.status_code == 409 and r.json()["error"] == cleaning.HAS_CLEAN


def test_clean_while_cleaning_409(client, setup, tmp_path, monkeypatch):
    started, release = threading.Event(), threading.Event()

    def slow(wav, work):
        started.set()
        assert release.wait(30)
        return FAKE_WORDS

    monkeypatch.setattr(cleaning, "words_fn", slow)
    original = upload_clip(client, tmp_path).json()
    first = {}
    t = threading.Thread(target=lambda: first.update(r=clean(client, original["id"])))
    t.start()
    try:
        assert started.wait(30)
        r = clean(client, original["id"])
        assert r.status_code == 409 and r.json()["error"] == cleaning.CLEANING
    finally:
        release.set()
        t.join(60)
    assert first["r"].status_code == 201


def test_plan_reopened_during_clean_keeps_nothing(client, setup, tmp_path, monkeypatch):
    def reopen(wav, work):
        store_ideas(idea("ia", "waiting"), idea("iw", "waiting"))
        return FAKE_WORDS

    monkeypatch.setattr(cleaning, "words_fn", reopen)
    original = upload_clip(client, tmp_path).json()
    files = sorted(media_files())
    r = clean(client, original["id"])
    assert r.status_code == 409 and r.json()["error"] == "Only an approved plan can take footage."
    assert sorted(media_files()) == files
    assert [t["id"] for t in client.get("/api/ideas/ia/takes").json()] == [original["id"]]


def test_clean_needs_tools_503(client, setup, tmp_path, monkeypatch):
    original = upload_clip(client, tmp_path).json()
    monkeypatch.setattr(cutting, "missing_tools", lambda: cutting.NO_FFMPEG)
    r = clean(client, original["id"])
    assert r.status_code == 503 and r.json()["error"] == cutting.NO_FFMPEG


def test_clean_needs_approved_plan_409(client, setup):
    r = clean(client, "whatever", "iw")
    assert r.status_code == 409 and r.json()["error"] == "Only an approved plan can take footage."
    r = clean(client, "whatever", "nope")
    assert r.status_code == 404 and r.json()["error"] == "That plan doesn't exist."


def test_clean_unknown_take_404(client, setup, tmp_path):
    other = up(client, idea="ib").json()  # a take of another plan is not this plan's
    for tid in ("nope", other["id"]):
        r = clean(client, tid)
        assert r.status_code == 404 and r.json()["error"] == "That take doesn't exist."


def test_clean_route_needs_sign_in(client, setup, tmp_path):
    original = upload_clip(client, tmp_path).json()
    add_user()
    assert clean(client, original["id"]).status_code == 401


def test_clean_take_shot_full_409(client, setup, tmp_path):
    original = upload_clip(client, tmp_path).json()
    for _ in range(takes.MAX_TAKES_PER_SHOT - 1):
        assert up(client).status_code == 200
    r = clean(client, original["id"])
    assert r.status_code == 409 and r.json()["error"] == f"This shot has the most takes it can hold ({takes.MAX_TAKES_PER_SHOT})."


def test_cleaned_take_is_an_editor_source(client, setup, tmp_path):
    shots = [Shot(time="0-3", shot="a"), Shot(time="3-6", shot="b")]
    store_ideas(SavedIdea(id="ia", videoId="v-ia", clientId="a", status="approved", dueDate="2026-11-02", notes="",
                          shots=shots))
    original = upload_clip(client, tmp_path, shot=1).json()
    assert original["shotId"]
    new = clean(client, original["id"]).json()["take"]
    sources = {s["key"]: s for s in client.get("/api/ideas/ia/edit/sources").json()["sources"]}
    assert sources[f"take:{new['id']}"]["shotId"] == original["shotId"]


def test_takes_list_has_cleaned_from(client, setup, tmp_path):
    assert up(client).json()["cleanedFrom"] is None
    assert client.get("/api/ideas/ia/takes").json()[0]["cleanedFrom"] is None


def test_migrate_adds_cleaned_from_to_an_old_table():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE takes (id TEXT PRIMARY KEY, idea_id TEXT NOT NULL, shot INTEGER NOT NULL, "
                 "ext TEXT NOT NULL, size INTEGER NOT NULL, name TEXT NOT NULL, chosen INTEGER NOT NULL DEFAULT 0, "
                 "created_at INTEGER NOT NULL, shot_id TEXT)")
    conn.execute("INSERT INTO takes VALUES ('t', 'ia', 0, 'mp4', 1, 'n', 1, 1, NULL)")
    takes.migrate(conn)
    row = conn.execute(f"SELECT {takes.COLUMNS} FROM takes").fetchone()
    assert takes.to_json(row, 0)["cleanedFrom"] is None

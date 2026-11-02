"""Stable shot ids: every shot of a plan carries one, and old plans get them filled in on load."""

import server
from models import SavedIdea, Shot, fill_shot_ids

A = {"id": "a", "name": "Tofu Bar", "niche": "food", "audience": "students",
     "monthlyTarget": 8, "examples": [], "cannot": []}


def test_old_shots_get_index_ids():
    assert [s.id for s in fill_shot_ids([Shot(time="0-3", shot="a"), Shot(time="3-6", shot="b")])] == ["s1", "s2"]


def test_existing_ids_kept_and_duplicates_renamed():
    shots = [Shot(time="", shot="a", id="s2"), Shot(time="", shot="b"), Shot(time="", shot="c", id="s2")]
    assert [s.id for s in fill_shot_ids(shots)] == ["s2", "s2-2", "s3"]


def test_ids_are_deterministic():
    shots = [Shot(time="", shot="a"), Shot(time="", shot="b", id="sh_x")]
    assert [s.id for s in fill_shot_ids(shots)] == [s.id for s in fill_shot_ids(shots)] == ["s1", "sh_x"]


def test_get_ideas_returns_ids_for_old_plans(client):
    # model_construct skips the validator, so this is stored the way a plan saved before ids existed is.
    old = SavedIdea.model_construct(id="ia", videoId="v", clientId="a", status="saved", dueDate="2026-11-02", notes="",
                                    shots=[Shot(time="0-3", shot="a"), Shot(time="3-6", shot="b")])
    server.save("ideas", [old])
    assert [s["id"] for s in client.get("/api/ideas").json()[0]["shots"]] == ["s1", "s2"]


def test_bad_id_rejected(client):
    idea = {"id": "ia", "videoId": "v", "clientId": "a", "status": "saved", "dueDate": "2026-11-02", "notes": "",
            "shots": [{"time": "", "shot": "a", "id": "a b"}]}
    assert client.put("/api/ideas", json=[idea]).status_code == 422

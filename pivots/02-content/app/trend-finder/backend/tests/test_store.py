CLIENT = {"id": "c1", "name": "Tofu Bar", "niche": "food", "audience": "students",
          "monthlyTarget": 8, "examples": [], "cannot": ["alcohol"]}
IDEA = {"id": "i1", "videoId": "v1", "clientId": "c1", "status": "saved", "dueDate": "2026-11-02",
        "notes": "", "shots": [{"time": "0-2s", "shot": "close-up"}]}


def test_lists_are_null_until_saved(client):
    assert client.get("/api/clients").json() is None
    assert client.get("/api/ideas").json() is None


def test_clients_round_trip(client):
    assert client.put("/api/clients", json=[CLIENT]).status_code == 200
    assert client.get("/api/clients").json() == [CLIENT]


def test_ideas_round_trip(client):
    assert client.put("/api/ideas", json=[IDEA]).status_code == 200
    got = client.get("/api/ideas").json()
    # the server adds updatedAt, and fills a missing shot id
    expected = {**IDEA, "shots": [{**sh, "id": f"s{n + 1}"} for n, sh in enumerate(IDEA["shots"])]}
    assert [{k: v for k, v in i.items() if k != "updatedAt"} for i in got] == [expected]


def test_plan_script_and_board_layout_round_trip(client):
    script = {"lines": [{"say": "Edited narration", "onScreen": "Fresh today"}],
              "basedOn": "original shot list", "writtenAt": 1793880000000, "edited": True}
    layout = [{"x": -48.5, "y": 120}]
    idea = {**IDEA, "script": script, "boardLayout": layout}
    response = client.put("/api/ideas", json=[idea])
    assert response.status_code == 200
    for saved in (response.json()[0], client.get("/api/ideas").json()[0]):
        assert saved["script"] == script
        assert saved["boardLayout"] == layout


def test_planning_board_footage_round_trips(client):
    image = {"key": "image-1", "kind": "image", "name": "reference.png",
             "src": "data:image/png;base64,iVBORw0KGgo="}
    video = {"key": "video-1", "kind": "video", "name": "take.mp4", "deviceOnly": True}
    idea = {**IDEA, "shots": [{**IDEA["shots"][0], "footage": image},
                              {"time": "2-4s", "shot": "wide", "footage": video}]}
    response = client.put("/api/ideas", json=[idea])
    assert response.status_code == 200
    for saved in (response.json()[0], client.get("/api/ideas").json()[0]):
        assert [shot["footage"] for shot in saved["shots"]] == [image, video]


def test_plan_script_and_layout_can_be_cleared(client):
    idea = {**IDEA, "script": {"lines": [], "basedOn": "", "writtenAt": 1},
            "boardLayout": []}
    assert client.put("/api/ideas", json=[idea]).status_code == 200
    response = client.put("/api/ideas", json=[{**IDEA, "script": None, "boardLayout": None}])
    assert response.status_code == 200
    saved = client.get("/api/ideas").json()[0]
    assert saved.get("script") is None
    assert saved.get("boardLayout") is None


def test_bad_idea_status_is_rejected(client):
    assert client.put("/api/ideas", json=[{**IDEA, "status": "maybe"}]).status_code == 422


LIBRARY = {"videos": [{"id": "tt-1", "live": True, "url": "https://www.tiktok.com/@a/video/1"}],
           "formats": [{"id": "live-1", "shotList": [{"time": "0-2s", "shot": "close-up"}]}]}


def test_library_is_null_until_saved(client):
    assert client.get("/api/library").json() is None


def test_library_round_trip(client):
    assert client.put("/api/library", json=LIBRARY).status_code == 200
    assert client.get("/api/library").json() == LIBRARY


def test_library_needs_both_lists(client):
    assert client.put("/api/library", json={"videos": []}).status_code == 422


def test_added_client_round_trips(client):
    added = {"id": "acme-bakery", "name": "Acme Bakery", "niche": "bakery", "audience": "locals",
             "monthlyTarget": 8, "examples": [], "topics": ["sourdough", "cake decorating"], "cannot": []}
    assert client.put("/api/clients", json=[CLIENT, added]).status_code == 200
    saved = client.get("/api/clients").json()
    assert [c["id"] for c in saved] == ["c1", "acme-bakery"]
    assert saved[1]["topics"] == ["sourdough", "cake decorating"]


def test_explicit_live_pick_round_trips_without_marking_old_ideas(client):
    old = {**IDEA, "id": "old"}
    picked = {**IDEA, "savedInLive": True}
    response = client.put("/api/ideas", json=[old, picked])
    assert response.status_code == 200
    assert response.json()[1]["savedInLive"] is True
    saved = client.get("/api/ideas").json()
    assert "savedInLive" not in saved[0]
    assert saved[1]["savedInLive"] is True
    assert saved[1]["id"] == IDEA["id"]
    assert saved[1]["status"] == IDEA["status"]

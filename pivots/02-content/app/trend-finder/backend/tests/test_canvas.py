"""The node canvas store: reconcile with the shot list, versioned writes, legacy frame import."""

import copy

import pytest

import canvas
import generations
import server
from models import Shot, SavedIdea
from test_takes import store_ideas, up


def shots(*ids, frame=None):
    return [Shot(id=i, time="0:00", shot=f"shot {i}", frameImage=(frame or {}).get(i)) for i in ids]


def node(doc, node_id):
    return next(n for n in doc["nodes"] if n["id"] == node_id)


def plan(id="ia", status="approved", ids=("s1", "s2"), frame=None):
    return SavedIdea(id=id, videoId=f"v-{id}", clientId="a", status=status, dueDate="2026-11-02", notes="",
                     shots=shots(*ids, frame=frame))


def test_first_build_rows():
    doc, imports = canvas.reconcile(None, shots("s1", "s2", "s3"), {1}, [])
    shot_nodes = [n for n in doc["nodes"] if n["type"] == "shot"]
    assert [n["position"]["y"] for n in shot_nodes] == [0, 400, 800]
    assert [n["id"] for n in doc["nodes"] if n["type"] == "storyboard"] == ["n_sb_s1", "n_sb_s2", "n_sb_s3"]
    assert all(n["data"]["primary"] for n in doc["nodes"] if n["type"] == "storyboard")
    assert [n["shotId"] for n in doc["nodes"] if n["type"] == "footage"] == ["s2"]
    assert len(doc["edges"]) == 4 and imports == []
    assert doc["edges"][0] == {"id": "e_n_shot_s1_n_sb_s1", "source": "n_shot_s1", "sourceHandle": "out",
                               "target": "n_sb_s1", "targetHandle": "in:text"}
    assert doc["viewport"] == {"x": 0, "y": 0, "zoom": 1}


def test_new_shot_appends_row():
    first, _ = canvas.reconcile(None, shots("s1", "s2"), set(), [])
    doc, _ = canvas.reconcile(first, shots("s1", "sh_new", "s2"), set(), [])
    assert node(doc, "n_shot_sh_new")["position"]["y"] == 800
    for n in first["nodes"]:
        assert node(doc, n["id"])["position"] == n["position"]


def test_removed_shot_keeps_nodes():
    first, _ = canvas.reconcile(None, shots("s1", "s2"), set(), [])
    doc, _ = canvas.reconcile(first, shots("s1"), set(), [])
    assert node(doc, "n_shot_s2")["data"]["removed"] is True
    assert node(doc, "n_sb_s2") and len(doc["edges"]) == len(first["edges"])
    assert node(doc, "n_shot_s1")["data"]["removed"] is False
    back, _ = canvas.reconcile(doc, shots("s1", "s2"), set(), [])
    assert node(back, "n_shot_s2")["data"]["removed"] is False


def test_reconcile_input_is_not_changed():
    first, _ = canvas.reconcile(None, shots("s1"), set(), [])
    before = copy.deepcopy(first)
    canvas.reconcile(first, shots(), set(), [])
    assert first == before


def test_frame_image_imported_once():
    s = shots("s1", frame={"s1": "/api/frame/a.svg"})
    _, imports = canvas.reconcile(None, s, set(), [])
    assert imports == [("n_sb_s1", "/api/frame/a.svg")]
    gens = [{"nodeId": "n_sb_s1", "url": "/api/frame/a.svg"}]
    assert canvas.reconcile(None, s, set(), gens)[1] == []


def test_reconcile_is_idempotent():
    s = shots("s1", "s2", frame={"s1": "/api/frame/a.svg"})
    doc1, imports = canvas.reconcile(None, s, {0}, [])
    gens = [{"nodeId": n, "url": u} for n, u in imports]
    doc2, imports2 = canvas.reconcile(doc1, s, {0}, gens)
    assert doc2 == doc1 and imports2 == []


def put(client, version, doc, idea_id="ia"):
    return client.put(f"/api/ideas/{idea_id}/canvas", json={"version": version, "doc": doc})


@pytest.fixture
def cv(client):
    store_ideas(plan("ia", frame={"s1": "/api/frame/a.svg"}), plan("iw", "waiting"), plan("ne", ids=()))
    return client


def test_get_canvas_imports_legacy_frame(cv):
    r = cv.get("/api/ideas/ia/canvas").json()
    imported = [g for g in r["generations"] if g["model"] == "imported"]
    assert len(imported) == 1 and imported[0]["url"] == "/api/frame/a.svg" and imported[0]["nodeId"] == "n_sb_s1"
    assert r["version"] == 1
    again = cv.get("/api/ideas/ia/canvas").json()
    assert len(again["generations"]) == 1 and again["version"] == 1 and again["doc"] == r["doc"]


def test_get_canvas_lists_takes(cv):
    t = up(cv, shot=1).json()
    r = cv.get("/api/ideas/ia/canvas").json()
    assert r["takes"] == [t]
    assert [n["shotId"] for n in r["doc"]["nodes"] if n["type"] == "footage"] == ["s2"]


def test_get_waiting_plan_is_readable(cv):
    assert cv.get("/api/ideas/iw/canvas").status_code == 200
    assert cv.get("/api/ideas/missing/canvas").status_code == 404


def test_put_with_old_version_is_rejected(cv):
    r = cv.get("/api/ideas/ia/canvas").json()
    doc = r["doc"]
    doc["viewport"]["zoom"] = 2
    assert put(cv, 1, doc).json() == {"version": 2}
    stale = put(cv, 1, doc)
    assert stale.status_code == 409
    assert stale.json()["version"] == 2 and stale.json()["doc"] == doc
    assert cv.get("/api/ideas/ia/canvas").json()["version"] == 2


def test_put_cannot_drop_shot_node(cv):
    doc = cv.get("/api/ideas/ia/canvas").json()["doc"]
    doc["nodes"] = [n for n in doc["nodes"] if n["id"] != "n_shot_s2"]
    doc["edges"] = [e for e in doc["edges"] if "n_shot_s2" not in e["id"]]
    r = put(cv, 1, doc)
    assert r.status_code == 422 and r.json()["error"] == "Shot nodes can't be deleted."


def test_put_rejects_dangling_edge(cv):
    doc = cv.get("/api/ideas/ia/canvas").json()["doc"]
    doc["edges"].append({"id": "e_x", "source": "n_shot_s1", "target": "nope"})
    assert put(cv, 1, doc).status_code == 422


def test_put_rejects_bad_ids_and_size(cv):
    doc = cv.get("/api/ideas/ia/canvas").json()["doc"]
    bad = copy.deepcopy(doc)
    bad["nodes"].append({"id": "no spaces", "type": "prompt", "position": {"x": 0, "y": 0}, "data": {}})
    assert put(cv, 1, bad).status_code == 422
    big = copy.deepcopy(doc)
    big["nodes"].append({"id": "p1", "type": "prompt", "position": {"x": 0, "y": 0}, "data": {"t": "x" * 600000}})
    assert put(cv, 1, big).status_code == 422


def test_put_needs_approved_plan(cv):
    doc = cv.get("/api/ideas/iw/canvas").json()["doc"]
    r = put(cv, 1, doc, "iw")
    assert r.status_code == 409 and r.json()["error"] == "Only an approved plan can change the canvas."


def test_no_shots_409(cv):
    r = cv.get("/api/ideas/ne/canvas")
    assert r.status_code == 409 and r.json() == {"error": "Save the shot list first.", "code": "no-shots"}


def test_put_rejects_unhashable_type_and_endpoints(cv):
    doc = cv.get("/api/ideas/ia/canvas").json()["doc"]
    bad = copy.deepcopy(doc)
    bad["nodes"][0]["type"] = ["shot"]
    assert put(cv, 1, bad).status_code == 422
    bad = copy.deepcopy(doc)
    bad["edges"][0]["source"] = {"a": 1}
    assert put(cv, 1, bad).status_code == 422


def test_legacy_shots_without_ids(client):
    old = SavedIdea.model_construct(id="il", videoId="v", clientId="a", status="approved", dueDate="2026-11-02",
                                    notes="", shots=[Shot(time="0-3", shot="a"), Shot(time="3-6", shot="b"),
                                                     Shot(time="6-9", shot="c")])
    server.save("ideas", [old])
    r = client.get("/api/ideas/il/canvas").json()
    assert [n["id"] for n in r["doc"]["nodes"] if n["type"] == "shot"] == ["n_shot_s1", "n_shot_s2", "n_shot_s3"]
    assert [n["position"]["y"] for n in r["doc"]["nodes"] if n["type"] == "shot"] == [0, 400, 800]
    assert put(client, r["version"], r["doc"], "il").json() == {"version": 2}


def test_shot_list_change_after_canvas_exists(cv):
    cv.get("/api/ideas/ia/canvas")  # imports s1's frame as a generation
    with server.db() as conn:
        kept = generations.insert_done(conn, "ia", "n_sb_s2", "image", "mock-image", source_url="/x.svg")
    store_ideas(plan("ia", ids=("s1", "s3"), frame={"s1": "/api/frame/a.svg"}), plan("iw", "waiting"))
    r = cv.get("/api/ideas/ia/canvas").json()
    by_id = {n["id"]: n for n in r["doc"]["nodes"]}
    assert by_id["n_shot_s3"]["position"]["y"] == 800
    assert by_id["n_shot_s2"]["data"]["removed"] is True and "n_sb_s2" in by_id
    assert by_id["n_shot_s1"]["data"]["removed"] is False
    assert len([g for g in r["generations"] if g["model"] == "imported"]) == 1 and r["version"] == 2
    assert kept["id"] in [g["id"] for g in r["generations"]]

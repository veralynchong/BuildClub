"""The node canvas of one plan: a JSON document per plan with a version number (a stale write is a 409),
kept in step with the shot list. Nodes and edges are never deleted here; a shot taken out of the list only
marks its Shot node removed. Only signed-in staff reach these routes."""

import copy
import json
import re
import threading
import time
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

import generations
import takes
from models import Shot, fill_shot_ids

SCHEMA = (
    "CREATE TABLE IF NOT EXISTS canvases (idea_id TEXT PRIMARY KEY, version INTEGER NOT NULL, "
    "doc TEXT NOT NULL, updated_at INTEGER NOT NULL)",
)

ROW_H = 400
LAYOUT = {"ROW_H": ROW_H, "x": {"shot": 0, "storyboard": 360, "footage": 720}}
NODE_TYPES = {"shot", "prompt", "storyboard", "video", "upload", "footage"}
ID_RE = re.compile(r"^[A-Za-z0-9_:-]{1,200}$")
MAX_NODES, MAX_EDGES, MAX_BYTES = 500, 1000, 512 * 1024
STALE = "The canvas changed somewhere else. Reload it."

# Reading, reconciling and writing a canvas take turns, so two requests cannot both import the same image.
canvas_lock = threading.Lock()


def _edge(source: str, target: str) -> dict:
    return {"id": f"e_{source}_{target}", "source": source, "sourceHandle": "out",
            "target": target, "targetHandle": "in:text"}


def _row(shot_id: str, y: int, with_footage: bool) -> tuple[list[dict], list[dict]]:
    shot, sb, ft = f"n_shot_{shot_id}", f"n_sb_{shot_id}", f"n_ft_{shot_id}"
    nodes = [
        {"id": shot, "type": "shot", "shotId": shot_id, "position": {"x": LAYOUT["x"]["shot"], "y": y},
         "data": {"removed": False}},
        {"id": sb, "type": "storyboard", "shotId": shot_id, "position": {"x": LAYOUT["x"]["storyboard"], "y": y},
         "data": {"primary": True, "model": "mock-image", "prompt": "", "selected": None, "stale": False}},
    ]
    edges = [_edge(shot, sb)]
    if with_footage:
        nodes.append({"id": ft, "type": "footage", "shotId": shot_id,
                      "position": {"x": LAYOUT["x"]["footage"], "y": y}, "data": {}})
        edges.append(_edge(shot, ft))
    return nodes, edges


def reconcile(doc: Optional[dict], shots: list[Shot], take_shots: set[str],
              gens: list[dict]) -> tuple[dict, list[tuple[str, str]]]:
    """Bring a canvas in step with the shot list. Returns the new doc (the input is not changed) and the
    (node id, frameImage) pairs to import as generations."""
    out = copy.deepcopy(doc) if doc is not None else {"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}
    nodes, edges = out["nodes"], out["edges"]
    have = {n["shotId"]: n for n in nodes if n.get("type") == "shot"}
    ids = {s.id for s in shots}
    y = max((n["position"]["y"] for n in have.values()), default=-ROW_H)
    for s in shots:
        if s.id in have:
            have[s.id]["data"]["removed"] = False
            continue
        y += ROW_H
        new_nodes, new_edges = _row(s.id, y, s.id in take_shots)
        nodes.extend(new_nodes)
        edges.extend(new_edges)
    for shot_id, n in have.items():
        if shot_id not in ids:
            n["data"]["removed"] = True

    imports = []
    for s in shots:
        if not s.frameImage:
            continue
        node = next((n for n in nodes if n.get("type") == "storyboard" and n.get("shotId") == s.id
                     and n.get("data", {}).get("primary")), None)
        if node is None or any(g.get("nodeId") == node["id"] and g.get("url") == s.frameImage for g in gens):
            continue
        node["data"]["selected"] = None
        imports.append((node["id"], s.frameImage))
    return out, imports


def check_doc(doc, shot_ids: list[str]) -> Optional[str]:
    """None when the document may be stored, else the reason (an English sentence)."""
    if not isinstance(doc, dict) or not isinstance(doc.get("nodes"), list) or not isinstance(doc.get("edges"), list):
        return "Send the canvas as nodes and edges."
    if len(doc["nodes"]) > MAX_NODES:
        return f"A canvas can have up to {MAX_NODES} nodes."
    if len(doc["edges"]) > MAX_EDGES:
        return f"A canvas can have up to {MAX_EDGES} edges."
    if len(json.dumps(doc)) > MAX_BYTES:
        return "The canvas is over the 512 KB limit."
    if "viewport" in doc and not isinstance(doc["viewport"], dict):
        return "Send the canvas as nodes and edges."
    node_ids = set()
    for n in doc["nodes"]:
        if not isinstance(n, dict) or not isinstance(n.get("id"), str) or not ID_RE.match(n["id"]) \
                or n["id"] in node_ids or not isinstance(n.get("type"), str) or n["type"] not in NODE_TYPES:
            return "Every node needs a unique id and a known type."
        pos = n.get("position")
        if not isinstance(pos, dict) or not all(isinstance(pos.get(k), (int, float)) for k in ("x", "y")):
            return "Every node needs a position."
        if not isinstance(n.get("data"), dict) or not (n.get("shotId") is None or isinstance(n["shotId"], str)):
            return "Every node needs a data object."
        node_ids.add(n["id"])
    edge_ids = set()
    for e in doc["edges"]:
        if not isinstance(e, dict) or not isinstance(e.get("id"), str) or not ID_RE.match(e["id"]) \
                or e["id"] in edge_ids:
            return "Every edge needs a unique id."
        if not all(isinstance(e.get(k), str) and e[k] in node_ids for k in ("source", "target")):
            return "An edge must join two nodes on the canvas."
        edge_ids.add(e["id"])
    have = {n.get("shotId") for n in doc["nodes"] if n["type"] == "shot"}
    if any(s not in have for s in shot_ids):
        return "Shot nodes can't be deleted."
    return None


def shots_of(idea: dict) -> list[Shot]:
    """The plan's shots with ids filled in, as GET /api/ideas shows them (plans saved before ids existed have none)."""
    return fill_shot_ids([Shot.model_validate(s) for s in idea.get("shots") or []])


def error(status: int, message: str, **extra) -> JSONResponse:
    return JSONResponse({"error": message, **extra}, status_code=status)


def make_router(db, load) -> APIRouter:
    router = APIRouter()

    def find_idea(idea_id: str):
        return next((i for i in load("ideas") or [] if i["id"] == idea_id), None)

    def read(conn, idea_id: str):
        row = conn.execute("SELECT version, doc FROM canvases WHERE idea_id = ?", (idea_id,)).fetchone()
        return (row[0], json.loads(row[1])) if row else (0, None)

    def write(conn, idea_id: str, version: int, doc: dict) -> None:
        conn.execute("INSERT OR REPLACE INTO canvases (idea_id, version, doc, updated_at) VALUES (?, ?, ?, ?)",
                     (idea_id, version, json.dumps(doc), int(time.time() * 1000)))

    @router.get("/api/ideas/{idea_id}/canvas")
    def get_canvas(idea_id: str):
        found = find_idea(idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if not found.get("shots"):
            return error(409, "Save the shot list first.", code="no-shots")
        shots = shots_of(found)
        with canvas_lock, db() as conn:
            version, doc = read(conn, idea_id)
            take_rows = takes.rows_of(conn, idea_id)
            gen_rows = conn.execute(f"SELECT {generations.COLUMNS} FROM generations WHERE idea_id = ? "
                                    "ORDER BY created_at, rowid", (idea_id,)).fetchall()
            gens = [generations.to_json(r) for r in gen_rows]
            new, imports = reconcile(doc, shots, {r[8] for r, _ in take_rows if r[8]}, gens)
            for node_id, url in imports:
                gens.append(generations.insert_done(conn, idea_id, node_id, "image", "imported", source_url=url))
            if new != doc:
                version += 1
                write(conn, idea_id, version, new)
        return {"version": version, "doc": new, "generations": gens, "takes": [takes.to_json(r, i) for r, i in take_rows]}

    @router.put("/api/ideas/{idea_id}/canvas")
    async def put_canvas(idea_id: str, request: Request):
        try:
            body = await request.json()
        except ValueError:
            body = None
        if not isinstance(body, dict) or type(body.get("version")) is not int:
            return error(422, "Send the version and the canvas.")
        found = find_idea(idea_id)
        if found is None:
            return error(404, "That plan doesn't exist.")
        if found["status"] != "approved":
            return error(409, "Only an approved plan can change the canvas.")
        with canvas_lock, db() as conn:
            version, current = read(conn, idea_id)
            if body["version"] != version:
                return error(409, STALE, version=version, doc=current)
            problem = check_doc(body.get("doc"), [s.id for s in shots_of(found)])
            if problem:
                return error(422, problem)
            write(conn, idea_id, version + 1, body["doc"])
        return {"version": version + 1}

    return router

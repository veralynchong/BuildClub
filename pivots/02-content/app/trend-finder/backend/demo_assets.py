"""Demo footage for one approved plan: price it offline, then (only with --yes and a cap) run every shot through the
server's "run the whole shot" route, one shot at a time.

    python backend/demo_assets.py quote --idea ID --image-model M --video-model M [--duration S] [--db backend/data.db]
    python backend/demo_assets.py run   --idea ID --image-model M --video-model M [--duration S] [--db ...]
                                        --base URL --email E --password-stdin --cap USD --yes

quote reads the plan from the SQLite file (read-only) and gen_models.json; it opens no connection and reads no key.
run sends nothing until the local quote is under --cap and --yes is given, then compares the server's quote with
the local one before confirming anything. Keys and the daily wallet caps belong to the server, not to this script.
Exit codes: 0 done, 2 bad input, 3 refused (no --yes, or over the cap), 4 the server disagrees (quote or plan),
5 a shot did not finish."""

import argparse
import http.cookiejar
import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable, Optional

import generations
from models import Shot, fill_shot_ids

DEFAULT_DB = Path(__file__).parent / "data.db"
CAPS_DEFAULT = {"image": 0.50, "video": 1.00}  # the same defaults and variables as server.py
QUOTE_TOLERANCE = 0.005
POLL_S = 1.0
VIDEO_X = 720  # the footage column; a video node moves right until its place is free

Api = Callable[[str, str, Optional[dict]], tuple]


class Refused(Exception):
    """A reason to stop, and the exit code to stop with."""

    def __init__(self, message: str, code: int):
        super().__init__(message)
        self.code = code


def pick_duration(model: dict, duration: Optional[int]) -> int:
    durations = model.get("durations") or []
    if duration is None:
        if not durations:
            raise Refused(f"{model['id']} has no video lengths.", 2)
        return min(durations)
    if duration not in durations:
        raise Refused(f"{model['id']} makes {', '.join(str(d) for d in durations)} second videos, not {duration}.", 2)
    return duration


def plan_items(shots: list, image_model: dict, video_model: dict, seconds: int) -> list:
    image_usd = generations.estimate_usd(image_model, None)
    video_usd = generations.estimate_usd(video_model, seconds)
    return [{"shot": n, "shotId": s["id"], "imageModel": image_model["id"], "imageUsd": image_usd,
             "videoModel": video_model["id"], "seconds": seconds, "videoUsd": video_usd}
            for n, s in enumerate(shots, 1)]


def quote(items: list) -> dict:
    by_model: dict = {}
    for it in items:
        by_model[it["imageModel"]] = by_model.get(it["imageModel"], 0) + it["imageUsd"]
        by_model[it["videoModel"]] = by_model.get(it["videoModel"], 0) + it["videoUsd"]
    return {"items": items, "byModel": {k: round(v, 4) for k, v in by_model.items()},
            "total": round(sum(it["imageUsd"] + it["videoUsd"] for it in items), 4)}


def daily_caps() -> dict:
    return {"image": float(os.environ.get("DAILY_GEN_IMAGE_USD", CAPS_DEFAULT["image"])),
            "video": float(os.environ.get("DAILY_GEN_VIDEO_USD", CAPS_DEFAULT["video"]))}


def format_quote(q: dict, caps: dict) -> str:
    lines = []
    for it in q["items"]:
        lines.append(f"Shot {it['shot']} ({it['shotId']}): image {it['imageModel']} US${it['imageUsd']:.3f}, "
                     f"video {it['videoModel']} {it['seconds']}s US${it['videoUsd']:.3f}")
    for model_id, usd in q["byModel"].items():
        lines.append(f"{model_id}: US${usd:.3f}")
    lines.append(f"Total US${q['total']:.2f}")
    need = {"image": round(sum(it["imageUsd"] for it in q["items"]), 4),
            "video": round(sum(it["videoUsd"] for it in q["items"]), 4)}
    for kind in ("image", "video"):
        if need[kind] > caps[kind]:
            lines.append(f"Needs US${need[kind]:.2f} of the daily {kind} budget, but the cap is US${caps[kind]:.2f}. "
                         f"Raise DAILY_GEN_{kind.upper()}_USD for the run.")
    return "\n".join(lines)


def models_of(image_id: str, video_id: str) -> tuple:
    by_id = {m["id"]: m for m in json.loads(generations.MODELS_FILE.read_text())["models"]}
    image, video = by_id.get(image_id), by_id.get(video_id)
    if image is None or image.get("kind") != "image":
        raise Refused(f"{image_id} is not an image model.", 2)
    if video is None or video.get("kind") != "video":
        raise Refused(f"{video_id} is not a video model.", 2)
    return image, video


def approved_shots(db_path: str, idea_id: str) -> list:
    """The shots of an approved plan, read-only from the SQLite file."""
    path = Path(db_path)
    if not path.is_file():
        raise Refused(f"There is no database at {db_path}.", 2)
    conn = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    try:
        row = conn.execute("SELECT value FROM store WHERE key = 'ideas'").fetchone()
    except sqlite3.Error:
        row = None
    finally:
        conn.close()
    idea = next((i for i in json.loads(row[0]) if i.get("id") == idea_id), None) if row else None
    if idea is None:
        raise Refused(f"Plan {idea_id} doesn't exist.", 2)
    if idea.get("status") != "approved":
        raise Refused(f"Plan {idea_id} isn't approved.", 2)
    if not idea.get("shots"):
        raise Refused(f"Plan {idea_id} has no shots.", 2)
    shots = fill_shot_ids([Shot.model_validate(s) for s in idea["shots"]])
    return [{"id": s.id, "shot": s.shot, "line": s.line} for s in shots]


# ---- run -----------------------------------------------------------------------------------------------------

def http_api(base: str) -> Api:
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def api(method: str, path: str, body: Optional[dict]) -> tuple:
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(base.rstrip("/") + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"} if data else {})
        try:
            with opener.open(req, timeout=60) as resp:
                status, raw = resp.status, resp.read()
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read()
        try:
            return status, json.loads(raw or b"{}")
        except ValueError:
            return status, {}

    return api


def prompt_of(shot: dict) -> str:
    return (shot.get("line") or "").strip() or shot["shot"]


def message(body: dict) -> str:
    return str(body.get("error") or body)[:200] if isinstance(body, dict) else str(body)[:200]


def ensure_rows(doc: dict, shots: list, video_model: str) -> dict:
    """The canvas with, for every shot, a storyboard node, a video node and the storyboard -> video start line.
    Shapes follow addNode in src/lib/canvas/graph.ts and check_doc in canvas.py. The input is changed."""
    nodes, edges = doc["nodes"], doc["edges"]
    for s in shots:
        shot_node = next((n for n in nodes if n["type"] == "shot" and n.get("shotId") == s["id"]), None)
        board = next((n for n in nodes if n["type"] == "storyboard" and n.get("shotId") == s["id"]
                      and n["data"].get("primary")), None)
        if shot_node is None or board is None:
            raise Refused(f"The server's canvas has no row for shot {s['id']}. Is --db the server's database?", 4)
        wired = [e["target"] for e in edges if e["source"] == board["id"] and e.get("targetHandle") == "in:start"
                 and any(n["id"] == e["target"] and n["type"] == "video" for n in nodes)]
        if wired:
            continue
        video = next((n for n in nodes if n["type"] == "video" and n.get("shotId") == s["id"]), None)
        if video is None:
            x, y = VIDEO_X, shot_node["position"]["y"]
            while any(abs(n["position"]["y"] - y) < 280 and abs(n["position"]["x"] - x) < 288 for n in nodes):
                x += 360
            video = {"id": f"n_video_{s['id']}", "type": "video", "shotId": s["id"], "position": {"x": x, "y": y},
                     "data": {"model": video_model, "prompt": ""}}
            nodes.append(video)
            edges.append({"id": f"e_{shot_node['id']}_{video['id']}", "source": shot_node["id"],
                          "sourceHandle": "out", "target": video["id"], "targetHandle": "in:text"})
        edges.append({"id": f"e_{board['id']}_{video['id']}", "source": board["id"], "sourceHandle": "out",
                      "target": video["id"], "targetHandle": "in:start"})
    return doc


def pairs_of(doc: dict, shots: list) -> dict:
    """shot id -> (storyboard node id, video node id), found by the start line."""
    out = {}
    for s in shots:
        board = next(n for n in doc["nodes"] if n["type"] == "storyboard" and n.get("shotId") == s["id"]
                     and n["data"].get("primary"))
        edge = next(e for e in doc["edges"] if e["source"] == board["id"] and e.get("targetHandle") == "in:start"
                    and any(n["id"] == e["target"] and n["type"] == "video" for n in doc["nodes"]))
        out[s["id"]] = (board["id"], edge["target"])
    return out


def edit_canvas(api: Api, idea_id: str, change: Callable[[dict], None]) -> dict:
    """Read the canvas, apply `change` to its doc, PUT it with the version; a version clash re-reads once more."""
    for _ in range(3):
        status, body = api("GET", f"/api/ideas/{idea_id}/canvas", None)
        if status != 200:
            raise Refused(f"Couldn't read the canvas: {message(body)}", 4)
        change(body["doc"])
        status, put = api("PUT", f"/api/ideas/{idea_id}/canvas", {"version": body["version"], "doc": body["doc"]})
        if status == 200:
            return body["doc"]
        if status != 409:
            raise Refused(f"Couldn't save the canvas: {message(put)}", 4)
    raise Refused("The canvas kept changing, so it wasn't saved.", 4)


def wait_for(api: Api, idea_id: str, gen_id: str, kind: str, sleep, poll_s: float) -> dict:
    deadline = time.monotonic() + generations.GEN_TIMEOUT_S[kind]
    while True:
        status, row = api("GET", f"/api/ideas/{idea_id}/gen/{gen_id}", None)
        if status == 200 and row.get("status") in ("done", "failed", "unknown"):
            return row
        if time.monotonic() > deadline:
            return {"id": gen_id, "status": "unknown", "timedOut": True}
        sleep(poll_s)


def run(api: Api, idea_id: str, image_model: dict, video_model: dict, seconds: int, cap: float, yes: bool,
        email: str, password: str, out=print, *, shots: list, poll_s: float = POLL_S, sleep=time.sleep) -> int:
    items = plan_items(shots, image_model, video_model, seconds)
    local = quote(items)
    if not yes:
        out("Refused: add --yes to confirm. Nothing was sent.")
        return 3
    if local["total"] > cap:
        out(f"Refused: the quote is US${local['total']:.2f}, over the cap of US${cap:.2f}. Nothing was sent.")
        return 3
    confirmed, spent, flying = 0, 0.0, None  # shots confirmed (money committed), their local cost, the one in flight

    def committed() -> str:
        if not confirmed and flying is None:
            return ""
        tail = f" Shot {flying} may still be generating on the server." if flying is not None else ""
        return (f" {confirmed} of {len(shots)} shots were confirmed (about US${spent:.2f} committed)."
                f" Nothing further was sent.{tail}")

    try:
        status, body = api("POST", "/api/auth/login", {"email": email, "password": password})
        if status != 200:
            out(f"Login failed: {message(body)}")
            return 4
        doc = edit_canvas(api, idea_id, lambda d: ensure_rows(d, shots, video_model["id"]))
        pairs = pairs_of(doc, shots)
        sent, server_total, wallet = {}, 0.0, None
        for s in shots:
            image_node, video_node = pairs[s["id"]]
            sent[s["id"]] = {"imageNodeId": image_node, "videoNodeId": video_node, "imageModel": image_model["id"],
                             "videoModel": video_model["id"], "prompt": prompt_of(s), "duration": seconds}
            status, q = api("POST", f"/api/ideas/{idea_id}/gen/chain", {**sent[s["id"]], "confirm": False})
            if status != 200:
                out(f"The server wouldn't quote shot {s['id']}: {message(q)}")
                return 4
            server_total += q["total"]
            wallet = q.get("remaining")
        if abs(server_total - local["total"]) > QUOTE_TOLERANCE:
            out(f"The server quotes US${server_total:.2f} but the local quote is US${local['total']:.2f}. "
                "Nothing was started.")
            return 4
        if server_total > cap:
            out(f"Refused: the server quotes US${server_total:.2f}, over the cap of US${cap:.2f}. Nothing was started.")
            return 3
        need = {"image": sum(i["imageUsd"] for i in items), "video": sum(i["videoUsd"] for i in items)}
        if not isinstance(wallet, dict) or any(
                need[k] > float((wallet.get(k) or 0)) + 1e-9 for k in need):
            out(f"Refused: today's wallet doesn't cover the run (needs US${need['image']:.2f} of images and "
                f"US${need['video']:.2f} of videos; the server has {wallet}). Raise DAILY_GEN_IMAGE_USD / "
                "DAILY_GEN_VIDEO_USD or wait for midnight. Nothing was started.")
            return 3
        done = []
        for n, s in enumerate(shots, 1):
            status, made = api("POST", f"/api/ideas/{idea_id}/gen/chain", {**sent[s["id"]], "confirm": True})
            if status != 201:
                out(f"Shot {n} didn't start: {message(made)}{committed()}")
                return 5
            confirmed, spent, flying = n, spent + items[n - 1]["imageUsd"] + items[n - 1]["videoUsd"], n
            image_id, video_id = made["image"]["id"], made["video"]["id"]
            image_node, video_node = pairs[s["id"]]

            def mark(d: dict) -> None:
                for node in d["nodes"]:
                    if node["id"] == image_node:
                        node["data"]["awaiting"] = image_id
                    elif node["id"] == video_node:
                        node["data"]["awaiting"] = video_id

            edit_canvas(api, idea_id, mark)
            image = wait_for(api, idea_id, image_id, "image", sleep, poll_s)
            video = image if image["status"] != "done" else wait_for(api, idea_id, video_id, "video", sleep, poll_s)
            for label, row in (("image", image), ("video", video)):
                if row["status"] != "done":
                    why = "timed out" if row.get("timedOut") else f"{row['status']}: {row.get('error') or 'no reason given'}"
                    if row["status"] == "unknown":
                        why += " (it may have charged)"
                    if row["status"] == "failed":
                        flying = None  # it ended; nothing is still running
                    out(f"Shot {n} {label} {why}.{committed()}")
                    return 5
            flying = None
            done.append((n, image, video))
    except Refused as e:
        out(f"{e}{committed()}")
        return 5 if (confirmed or flying is not None) else e.code
    except (OSError, ValueError, KeyError, TypeError) as e:  # URLError and timeouts are OSError; bad bodies the rest
        out(f"The server didn't answer properly ({type(e).__name__}).{committed()}")
        return 5 if (confirmed or flying is not None) else 4
    for n, image, video in done:
        out(f"Shot {n}: image {image['id']} US${image.get('actualUsd') or image.get('estUsd') or 0:.3f}, "
            f"video {video['id']} US${video.get('actualUsd') or video.get('estUsd') or 0:.3f}")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("mode", choices=("quote", "run"))
    p.add_argument("--idea", required=True)
    p.add_argument("--image-model", required=True)
    p.add_argument("--video-model", required=True)
    p.add_argument("--duration", type=int)
    p.add_argument("--db", default=str(DEFAULT_DB))
    p.add_argument("--base")
    p.add_argument("--email")
    p.add_argument("--password-stdin", action="store_true")
    p.add_argument("--cap", type=float)
    p.add_argument("--yes", action="store_true")
    args = p.parse_args(argv)
    try:
        image, video = models_of(args.image_model, args.video_model)
        seconds = pick_duration(video, args.duration)
        shots = approved_shots(args.db, args.idea)
        if args.mode == "quote":
            print(format_quote(quote(plan_items(shots, image, video, seconds)), daily_caps()))
            return 0
        if not (args.base and args.email and args.password_stdin and args.cap is not None):
            raise Refused("run needs --base, --email, --password-stdin and --cap.", 2)
        password = sys.stdin.readline().rstrip("\n")
        return run(http_api(args.base), args.idea, image, video, seconds, args.cap, args.yes, args.email, password,
                   shots=shots)
    except Refused as e:
        print(str(e), file=sys.stderr)
        return e.code


if __name__ == "__main__":
    sys.exit(main())

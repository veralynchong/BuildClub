"""Per-shot script lines and storyboard frames for a plan. These routes only generate: they return
lines and image URLs and never write the plan, so the client merges them into its shots and saves
through PUT /api/ideas (which keeps the ETag and approval rules in one place).

Script: Claude when ANTHROPIC_API_KEY is set (and REMAKE_DEMO is not 1), otherwise deterministic sample
lines. A shot with edited=true is never overwritten unless the request says force.
Frames: a free SVG placeholder by default; with FRAME_IMAGE_MODEL set to an available image model of the
model list (gen_models.json) the frame is made by that model's adapter, paid from the gen_image wallet,
and waited for inside the request. Files live in <media>/<ideaId>/frames/ (git-ignored)."""

import json
import os
import re
import secrets
import textwrap
import time
from pathlib import Path
from typing import Callable, Optional
from xml.sax.saxutils import escape

import assist
import gen_providers
import generations
from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse
from models import Shot
from pydantic import BaseModel

SCRIPT_USD = 0.03  # one Claude call that writes every line of a plan
ONE_SHOT_USD = 0.01  # one Claude call for a single shot
FRAME_TIMEOUT_S = 120  # how long a frame request waits for the model
FRAME_POLL_S = 1.0
FRAME_NAME = re.compile(r"^[0-9]{1,3}-[A-Za-z0-9_-]{6,40}\.(svg|png|jpg|webp)$")
FRAME_TYPES = {"svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}
FRAME_FAILED = "Could not make the image. Try again."
FRAME_LOST = "The image didn't come back. The model may have charged. Check before trying again."

Budget = Callable[[str, float], Optional[JSONResponse]]  # None when the spend is allowed
Refund = Callable[[str, float], None]


class ScriptRequest(BaseModel):
    force: bool = False  # also rewrite shots the user edited
    expectedBasis: Optional[str] = None  # refuse an unsaved/stale client draft before generating


class FrameRequest(BaseModel):
    line: Optional[str] = None  # unsaved edit of the line, used instead of the stored one
    purpose: Optional[str] = None


def error(status: int, message: str, detail: str = "") -> JSONResponse:
    return JSONResponse({"error": message, **({"detail": detail} if detail else {})}, status_code=status)


# ---- script ------------------------------------------------------------------------------------

def purpose_for(index: int, total: int) -> str:
    return "hook" if index == 0 else "cta" if index == total - 1 else "body"


OPENERS = {
    "hook": ["Wait, watch this: {s}", "Nobody tells you this about {s}", "Stop scrolling, this is {s}"],
    "body": ["Here is the trick: {s}", "Next, {s}", "Then comes the good part: {s}"],
    "cta": ["Try it and tell us how it goes: {s}", "Save this for later, {s}", "Follow for more like this: {s}"],
}


def sample_lines(shots: list[Shot], index: int) -> tuple[str, list[str]]:
    """Deterministic demo lines for one shot: the same plan always gives the same words."""
    purpose = shots[index].purpose or purpose_for(index, len(shots))
    subject = (shots[index].shot or "this").strip().rstrip(".").lower()
    forms = OPENERS[purpose]
    lines = [forms[(index + k) % 3].format(s=subject) for k in range(4)]
    return lines[0], lines[1:]


def use_claude() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY")) and os.environ.get("REMAKE_DEMO") != "1"


SYSTEM = ("You write the spoken line for each shot of a short vertical video, for a small business. "
          "Each line is one or two short sentences a person can say in the shot's time. Match the "
          "shot's purpose (hook grabs in the first seconds, body shows or explains, cta asks for one "
          "action). Respect the client's 'cannot' list. Write in the language the shot descriptions "
          "use. For each requested shot also give 3 different alternative lines. Answer with JSON "
          'only: {"shots": [{"line": "...", "options": ["...", "...", "..."]}]}, one entry per requested '
          "shot, in the order requested.")


def parse_answer(answer: str, wanted: int) -> list[tuple[str, list[str]]]:
    found = re.search(r"\{.*\}", answer, re.S)
    try:
        data = json.loads(found.group(0)) if found else {}
    except ValueError:
        data = {}
    rows = data.get("shots") if isinstance(data, dict) else None
    if not isinstance(rows, list) or len(rows) != wanted:
        raise ValueError("the answer does not hold one entry per shot")
    out = []
    for row in rows:
        line = row.get("line") if isinstance(row, dict) else None
        if not isinstance(line, str) or not line.strip():
            raise ValueError("a shot has no line")
        raw = row.get("options")
        options = [o.strip()[:500] for o in raw if isinstance(o, str) and o.strip()][:3] if isinstance(raw, list) else []
        out.append((line.strip()[:500], options))
    return out


def claude_lines(client: Optional[dict], idea: dict, shots: list[Shot], targets: list[int]) -> list[tuple[str, list[str]]]:
    facts = {
        "client": {k: client.get(k) for k in ("name", "niche", "audience", "cannot")} if client else None,
        "notes": idea.get("notes", ""),
        "shots": [{"index": n, "time": s.time, "shot": s.shot, "text": s.text,
                   "purpose": s.purpose or purpose_for(n, len(shots)), "currentLine": s.line}
                  for n, s in enumerate(shots)],
        "writeLinesForShots": targets,
    }
    text = json.dumps(facts, ensure_ascii=False)
    return parse_answer(assist.call_claude(assist.CHEAP_MODEL, SYSTEM, [{"type": "text", "text": text}], 1500),
                        len(targets))


# ---- frames ------------------------------------------------------------------------------------

def frames_dir(media: Path, idea_id: str) -> Optional[Path]:
    """<media>/<idea_id>/frames, or None when the id would lead out of the media folder."""
    if not idea_id or idea_id.startswith("."):
        return None
    root = media.resolve()
    folder = (root / idea_id).resolve()
    return folder / "frames" if folder.parent == root else None


COLORS = {"hook": "#e4572e", "body": "#2e86ab", "cta": "#3f8f5f"}


def placeholder_svg(purpose: str, line: str, shot: str, index: int) -> str:
    """A 9:16 placeholder frame; free, and readable enough to judge a layout."""
    color = COLORS.get(purpose, "#888888")
    wrapped = textwrap.wrap(line or shot or "", width=22, break_long_words=True)[:8]
    lines = "".join(f'<text x="30" y="{330 + 34 * n}" font-size="24" fill="#222">{escape(t)}</text>'
                    for n, t in enumerate(wrapped))
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 640" width="360" height="640" '
        'font-family="sans-serif">'
        f'<rect width="360" height="640" fill="#f4f1ea"/><rect x="10" y="10" width="340" height="620" '
        f'fill="none" stroke="{color}" stroke-width="4"/>'
        f'<rect x="30" y="40" width="110" height="36" rx="18" fill="{color}"/>'
        f'<text x="85" y="65" font-size="18" fill="#fff" text-anchor="middle" font-weight="700">'
        f'{escape(purpose.upper())}</text>'
        f'<text x="320" y="65" font-size="18" fill="{color}" text-anchor="end">#{index + 1}</text>'
        f'<text x="30" y="150" font-size="20" fill="#555">{escape(textwrap.shorten(shot or "", 60))}</text>'
        f'{lines}</svg>'
    )


def frame_model() -> Optional[dict]:
    """The model FRAME_IMAGE_MODEL names, when it is an image model whose provider is set up; else None (free SVG)."""
    wanted = os.environ.get("FRAME_IMAGE_MODEL", "").strip()
    found = next((m for m in generations.load_models() if m["id"] == wanted), None) if wanted else None
    if found is None or found.get("kind") != "image" or found.get("retired") or not generations.is_available(found):
        return None
    return found


def model_frame(model: dict, prompt: str, usd: float, budget: Budget, refund: Refund):
    """Make one frame with `model` and wait for it. (bytes, ext) on success, else the error response.
    Money: nothing sent yet or the provider says it failed -> refund; once a request may have been sent and we
    lose track of it (or the file is unusable) the provider may have charged, so no refund."""
    over = budget("image", usd)
    if over is not None:
        return over
    phase = "prepare"  # prepare: nothing sent; submit: the request is going out; poll: it was accepted
    try:
        adapter = gen_providers.adapter_for(model["provider"])
        job = gen_providers.Job(model, prompt, None, [], None)
        deadline = time.monotonic() + FRAME_TIMEOUT_S  # counts the submit too, so the whole frame stays bounded
        phase = "submit"
        request_id = adapter.submit(job)
        phase = "poll"
        while True:
            result = adapter.poll(job, request_id)
            if result.state == "done":
                return result.data, result.ext
            if result.state == "failed":
                refund("image", usd)
                return error(502, FRAME_FAILED)
            if time.monotonic() >= deadline:
                return error(502, FRAME_LOST)
            time.sleep(FRAME_POLL_S)
    except (gen_providers.ResultLost, gen_providers.FileUnusable) as e:
        print(f"[frame] {model['id']} result not usable: {e}", flush=True)
        return error(502, FRAME_LOST)
    except Exception as e:  # ProviderError included: only an error before the request was accepted refunds
        print(f"[frame] {model['id']} failed in {phase}: {type(e).__name__}: {e}", flush=True)
        if phase == "poll":
            return error(502, FRAME_LOST)
        refund("image", usd)
        return error(502, FRAME_FAILED)


def camera_words(shot: Shot) -> str:
    """The shot's camera direction as a sentence for the image prompt; empty when none is set."""
    parts = [v.replace("_", " ") for v in (shot.framing, shot.angle, shot.movement) if v]
    return f" Camera: {', '.join(parts)}." if parts else ""


def frame_prompt(shot: Shot, purpose: str, line: str) -> str:
    return ("Storyboard frame for a vertical 9:16 video: a simple black-and-white pencil sketch of the "
            "scene, clear composition, no text, no captions, no watermark. "
            f"Shot: {shot.shot}.{camera_words(shot)} Purpose: {purpose}. The person says: {line or '(no line)'}")


# ---- routes ------------------------------------------------------------------------------------

def make_router(load, media_dir: Callable[[], Path], budget: Budget,
                refund: Refund = lambda wallet, usd: None) -> APIRouter:
    router = APIRouter()

    def find(idea_id: str) -> Optional[dict]:
        return next((i for i in load("ideas") or [] if i["id"] == idea_id), None)

    def client_of(idea: dict) -> Optional[dict]:
        return next((c for c in load("clients") or [] if c["id"] == idea.get("clientId")), None)

    def shots_of(idea: dict) -> list[Shot]:
        return [Shot(**s) for s in idea.get("shots") or []]

    def write(idea: dict, shots: list[Shot], targets: list[int], usd: float):
        """(source, {index: (line, options)}) for `targets`, or an error response."""
        if not use_claude():
            return "demo", {n: sample_lines(shots, n) for n in targets}
        over = budget("claude", usd)
        if over is not None:
            return None, over
        try:
            rows = claude_lines(client_of(idea), idea, shots, targets)
        except Exception as e:
            return None, error(502, "Could not write the script. Try again.", str(e))
        return "claude", dict(zip(targets, rows))

    @router.post("/api/ideas/{idea_id}/script")
    def script(idea_id: str, body: Optional[ScriptRequest] = None):
        """Every shot's line and 3 options. Edited shots come back unchanged unless force."""
        force = bool(body and body.force)
        idea = find(idea_id)
        if idea is None:
            return error(404, "That plan doesn't exist.")
        shots = shots_of(idea)
        if not shots:
            return error(409, "This plan has no shots to write for.")
        if body and body.expectedBasis is not None:
            try:
                expected = json.loads(body.expectedBasis)
            except ValueError:
                return error(400, "Invalid script draft.")
            current = [[re.sub(r"\s+", " ", value or "").strip() for value in (s.shot, s.line, s.text)] for s in shots]
            if expected != current:
                return error(409, "The shots changed. Wait for them to save, then write the script again.")
        targets = [n for n, s in enumerate(shots) if force or not s.edited]
        source, result = write(idea, shots, targets, SCRIPT_USD) if targets else ("demo", {})
        if source is None:
            return result
        out = []
        for n, s in enumerate(shots):
            s.purpose = s.purpose or purpose_for(n, len(shots))
            if n in result:
                s.line, s.options = result[n]
                s.edited = False
            out.append(s.model_dump(exclude_none=True))
        return {"source": source, "shots": out}

    @router.post("/api/ideas/{idea_id}/shots/{shot}/script")
    def script_one(idea_id: str, shot: int, body: Optional[ScriptRequest] = None):
        """New line and 3 options for one shot. Nothing else is touched or saved."""
        idea = find(idea_id)
        if idea is None:
            return error(404, "That plan doesn't exist.")
        shots = shots_of(idea)
        if not 0 <= shot < len(shots):
            return error(404, "That shot doesn't exist.")
        if shots[shot].edited and not (body and body.force):
            return error(409, "You edited this line. Send force to replace it.")
        source, result = write(idea, shots, [shot], ONE_SHOT_USD)
        if source is None:
            return result
        line, options = result[shot]
        return {"source": source, "index": shot, "line": line, "options": options,
                "purpose": shots[shot].purpose or purpose_for(shot, len(shots))}

    @router.post("/api/ideas/{idea_id}/shots/{shot}/frame")
    def frame(idea_id: str, shot: int, body: Optional[FrameRequest] = None):
        """Make a storyboard frame image for one shot; returns its URL for the client to store."""
        idea = find(idea_id)
        folder = frames_dir(media_dir(), idea_id) if idea else None
        if idea is None or folder is None:
            return error(404, "That plan doesn't exist.")
        shots = shots_of(idea)
        if not 0 <= shot < len(shots):
            return error(404, "That shot doesn't exist.")
        s = shots[shot]
        purpose = (body.purpose if body and body.purpose in COLORS else None) or s.purpose or purpose_for(shot, len(shots))
        line = (body.line if body and body.line is not None else s.line) or ""
        token = secrets.token_urlsafe(9)
        model = frame_model()
        if model is not None:
            made = model_frame(model, frame_prompt(s, purpose, line), generations.estimate_usd(model, None), budget, refund)
            if isinstance(made, JSONResponse):
                return made
            data, ext = made
        else:
            data, ext = placeholder_svg(purpose, line, s.shot, shot).encode(), "svg"
        name = f"{shot}-{token}.{ext}"
        folder.mkdir(parents=True, exist_ok=True)
        part = folder / f".{name}.part"
        try:
            part.write_bytes(data)
            os.replace(part, folder / name)
        except OSError as e:  # the model answered; only our disk failed, so the money stays spent
            print(f"[frame] could not save {name}: {e}", flush=True)
            return error(502, FRAME_LOST if model is not None else FRAME_FAILED)
        finally:
            part.unlink(missing_ok=True)
        return {"index": shot, "provider": model["id"] if model else "fake", "frameImage": f"/api/ideas/{idea_id}/frames/{name}"}

    @router.get("/api/ideas/{idea_id}/frames/{name}")
    def get_frame(idea_id: str, name: str):
        folder = frames_dir(media_dir(), idea_id)
        if folder is None or not FRAME_NAME.match(name) or find(idea_id) is None:
            return error(404, "That image doesn't exist.")
        path = folder / name
        if not path.is_file():
            return error(404, "That image doesn't exist.")
        return FileResponse(path, media_type=FRAME_TYPES[name.rsplit(".", 1)[1]],
                            headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'"})

    return router

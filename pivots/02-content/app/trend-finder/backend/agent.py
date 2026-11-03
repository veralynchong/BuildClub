"""The canvas agent's planning route. POST /api/ideas/{id}/agent/plan reads one shot of an approved plan and
answers which prompts, models and length its storyboard and video nodes should use. It only plans: the client
previews the answer and writes the canvas itself, so nothing is saved here.

Claude (assist.CHEAP_MODEL, one call) when ANTHROPIC_API_KEY is set and REMAKE_DEMO is not 1, otherwise a
deterministic sample. Every answer is checked against the generation menu before it goes back."""

import json
from typing import Annotated, Callable, Optional

import anthropic
import assist
import generations
import storyboard
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, StringConstraints

AGENT_USD = 0.01  # one small call, capped by AGENT_MAX_TOKENS
AGENT_MAX_TOKENS = 1500
MAX_AGENT_PROMPT = 1000

Prompt = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_AGENT_PROMPT)]


class AgentRequest(BaseModel):
    shotId: str


class AgentOut(BaseModel):
    storyboardPrompt: Prompt
    storyboardModel: str
    videoPrompt: Prompt
    videoModel: str
    duration: int


SYSTEM = """You plan one shot of a short vertical video for a small business. The shot becomes two nodes on a
canvas: a storyboard image (the opening frame) and a video made from that frame.

Write both prompts in English. The storyboard prompt describes the still frame: subject, setting, light, framing.
The video prompt describes the motion that follows from that frame. Keep the style and look consistent with the
other shots, and name any kit item (character, product, place, style) the shot should keep. Each prompt is under
{max_prompt} characters.

Pick the models only from this menu, by id. The storyboard model must be an image model. The video model must be a
video model that takes a start frame. The duration must be one of the video model's durations. Prefer a cheap
model unless the shot needs more.

Menu:
{menu}"""


def usable(menu: list[dict], kind: str) -> list[dict]:
    return [m for m in menu if m.get("kind") == kind and m.get("available")]


def menu_lines(menu: list[dict]) -> str:
    rows = []
    for m in menu:
        if not m.get("available") or m.get("kind") not in ("image", "video"):
            continue
        price = m.get("price") or {}
        row = {"id": m["id"], "kind": m["kind"], "tier": m.get("tier"), "price": f"US${price.get('usd', 0)} per {price.get('per')}"}
        if m["kind"] == "video":
            row["durations"] = m.get("durations", [])
            row["takesStartFrame"] = (m.get("inputs") or {}).get("startFrame", "none") != "none"
        rows.append(row)
    return "\n".join(json.dumps(r) for r in rows)


def sample_plan(shot: dict, menu: list[dict]) -> AgentOut:
    """Deterministic demo answer: prompts from the shot's line or description, the free mock models."""
    subject = (shot.get("line") or shot.get("shot") or "this shot").strip()[:400]
    video = next((m for m in menu if m.get("id") == "mock-video"), None)
    durations = (video or {}).get("durations") or [4]
    return AgentOut(storyboardPrompt=f"Opening frame of the shot: {subject}",
                    storyboardModel="mock-image",
                    videoPrompt=f"Camera and subject move naturally through the shot: {subject}",
                    videoModel="mock-video", duration=int(durations[0]))


def ask_claude(context: dict, menu: list[dict]) -> AgentOut:
    """The one paid call, shaped like shotlist.ask_claude."""
    response = anthropic.Anthropic().beta.messages.parse(
        model=assist.CHEAP_MODEL,
        max_tokens=AGENT_MAX_TOKENS,
        output_format=AgentOut,
        system=SYSTEM.format(max_prompt=MAX_AGENT_PROMPT, menu=menu_lines(menu)),
        messages=[{"role": "user", "content": json.dumps(context, ensure_ascii=False)}],
    )
    u = response.usage
    print(f"[agent] {response.model} in={u.input_tokens} out={u.output_tokens} stop={response.stop_reason}", flush=True)
    if response.stop_reason == "refusal":
        raise RuntimeError("The AI declined to plan this shot.")
    if response.stop_reason == "max_tokens" or response.parsed_output is None:
        raise RuntimeError(f"The AI answer was incomplete ({response.stop_reason}).")
    return response.parsed_output


def check_plan(out: AgentOut, menu: list[dict]) -> Optional[str]:
    """None when the plan only uses models on the menu, else why it can't be used."""
    if out.storyboardModel not in {m["id"] for m in usable(menu, "image")}:
        return f"{out.storyboardModel} is not an available image model."
    video = next((m for m in usable(menu, "video") if m["id"] == out.videoModel), None)
    if video is None:
        return f"{out.videoModel} is not an available video model."
    if (video.get("inputs") or {}).get("startFrame", "none") == "none":
        return f"{out.videoModel} does not take a start frame."
    if out.duration not in (video.get("durations") or []):
        return f"{out.videoModel} cannot make {out.duration} seconds."
    return None


def error(status: int, message: str, detail: str = "") -> JSONResponse:
    return JSONResponse({"error": message, **({"detail": detail} if detail else {})}, status_code=status)


def make_router(load: Callable[[str], object], budget: Callable[[str, float], Optional[JSONResponse]]) -> APIRouter:
    router = APIRouter()

    @router.post("/api/ideas/{idea_id}/agent/plan")
    def plan(idea_id: str, body: AgentRequest):
        idea = next((i for i in load("ideas") or [] if i["id"] == idea_id), None)
        if idea is None:
            return error(404, "That plan doesn't exist.")
        shots = idea.get("shots") or []
        shot = next((s for s in shots if s.get("id") == body.shotId), None)
        if shot is None:
            return error(404, "That shot isn't in this plan.")
        if idea.get("status") != "approved":
            return error(409, "Approve the plan before building shots.")
        menu = generations.menu_models()
        if not storyboard.use_claude():
            out, source, usd = sample_plan(shot, menu), "demo", 0
        else:
            over = budget("claude", AGENT_USD)
            if over is not None:
                return over
            client = next((c for c in load("clients") or [] if c.get("id") == idea.get("clientId")), None)
            kit = ((client or {}).get("kit") or {}).get("items") or []
            context = {"shot": {k: shot.get(k) for k in ("purpose", "time", "line", "shot")},
                       "otherShots": [s.get("line") for s in shots if s.get("id") != body.shotId and s.get("line")],
                       "kit": [{"name": i.get("name"), "kind": i.get("kind")} for i in kit]}
            try:
                out = ask_claude(context, menu)
                problem = check_plan(out, menu)
                if problem:
                    raise ValueError(problem)
            except Exception as e:
                return error(502, "Couldn't plan this shot. Try again.", str(e))
            source, usd = "claude", AGENT_USD
        return {"source": source, "shotId": body.shotId,
                "storyboard": {"prompt": out.storyboardPrompt, "model": out.storyboardModel},
                "video": {"prompt": out.videoPrompt, "model": out.videoModel, "duration": out.duration},
                "planUsd": usd}

    return router

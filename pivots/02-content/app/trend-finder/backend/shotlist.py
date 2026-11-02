"""Script to shot list. POST /api/shots/from-script takes a pasted script and returns a draft shot list with
camera directions (or, for a street interview, a question list with the reaction to capture, each mapped to a
shot). It only generates: the client previews the draft and the user chooses Replace or Append, so nothing in
a plan is written here.

Claude (analyze.AI_MODEL, one call) when ANTHROPIC_API_KEY is set and REMAKE_DEMO is not 1, otherwise
deterministic sample shots. The AI answer is validated with ShotListOut before it goes back."""

import re
from typing import Annotated, Callable, Optional

import analyze
import anthropic
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models import Angle, Framing, Movement
from pydantic import BaseModel, Field, StringConstraints

MAX_SCRIPT = 6000  # characters
MAX_SHOTS = 30
SHOTS_USD = 0.15  # one call, capped by SHOT_MAX_TOKENS
SHOT_MAX_TOKENS = 8000

Short = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]


class ScriptRequest(BaseModel):
    script: str
    # True for a street interview: the answer is a question list instead of a scene-by-scene shot list.
    interview: bool = False


class DraftShot(BaseModel):
    """One shot as the AI must answer it. question and reaction are set for interviews only."""
    time: Short
    shot: Short
    text: Optional[Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]] = None
    framing: Framing
    angle: Angle
    movement: Movement
    tip: Short
    question: Optional[Short] = None
    reaction: Optional[Short] = None


class ShotListOut(BaseModel):
    shots: list[DraftShot] = Field(min_length=1, max_length=MAX_SHOTS)


SYSTEM = """You turn a short-video script into a shot list a small business can film with a phone.
Write the shot descriptions, on-screen text and tips in the language of the script. The camera
fields use the fixed English codes given below.

For every shot give:
- time: a range like "0-3s". Estimate it from how long the words take to say; ranges follow on from
  each other, with no gaps.
- shot: what to film, one concrete sentence a non-professional can follow.
- text: the on-screen text for that shot, or leave it out when there is none.
- framing: wide, medium, close_up, extreme_close_up, overhead or pov.
- angle: eye_level, high, low or top_down.
- movement: static, pan, tilt, push_in, handheld or tracking.
- tip: one short line on how to film that shot well.

Be creative with the camera: do not use the same framing, angle and movement for every shot. Vary
them so the video does not feel flat, and choose each one to suit what the shot shows (a product is
a close_up or overhead, a place is wide, a reaction is a close_up at eye_level). Use between 3 and 12
shots unless the script clearly needs more. Only film what the script says; do not invent new content."""

INTERVIEW_SYSTEM = SYSTEM + """

This is a street interview. The people on camera are not actors and do not memorise lines, so the
script is a list of questions to ask. Return one shot per question, in the order asked. For each
shot also give question (the question to ask, short and natural to say out loud) and reaction (the
reaction or answer to capture, e.g. "surprise at the price"). Set shot to describe how to film the
moment, for example the host asking and the passer-by answering."""

SAMPLE_CAMERA = [
    ("wide", "eye_level", "static", "Start wide so the viewer knows where we are."),
    ("close_up", "eye_level", "push_in", "Push in slowly as the key point lands."),
    ("overhead", "top_down", "static", "Hold still and keep the frame clean."),
    ("medium", "low", "handheld", "Keep it loose; small shake feels real."),
    ("extreme_close_up", "eye_level", "static", "Fill the frame with the detail."),
    ("pov", "eye_level", "handheld", "Film as if through the viewer's eyes."),
]


def use_claude() -> bool:
    import storyboard
    return storyboard.use_claude()


def sample_shots(script: str, interview: bool) -> ShotListOut:
    """Deterministic demo answer: one shot per sentence (at most 8), cycling through camera choices."""
    parts = [p.strip() for p in re.split(r"(?<=[.!?。！？])\s*|\n+", script) if p.strip()][:8] or [script.strip()]
    shots, start = [], 0
    for n, part in enumerate(parts):
        end = start + max(2, min(6, len(part.split()) // 2 + 2))
        framing, angle, movement, tip = SAMPLE_CAMERA[n % len(SAMPLE_CAMERA)]
        item = {"time": f"{start}-{end}s", "shot": "Host asks the passer-by and films the answer." if interview else part[:200],
                "framing": framing, "angle": angle, "movement": movement, "tip": tip}
        if interview:
            item.update(question=part[:200], reaction="Their first honest reaction")
        shots.append(DraftShot(**item))
        start = end
    return ShotListOut(shots=shots)


def ask_claude(script: str, interview: bool) -> ShotListOut:
    """The one paid call (same client and model as analyze.breakdown)."""
    response = anthropic.Anthropic().beta.messages.parse(
        model=analyze.AI_MODEL,
        max_tokens=SHOT_MAX_TOKENS,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium"},
        output_format=ShotListOut,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=INTERVIEW_SYSTEM if interview else SYSTEM,
        messages=[{"role": "user", "content": f"Script:\n{script}"}],
    )
    u = response.usage
    print(f"[shotlist] {response.model} in={u.input_tokens} out={u.output_tokens} "
          f"stop={response.stop_reason}", flush=True)
    if response.stop_reason == "refusal":
        raise RuntimeError("The AI declined to write a shot list for this script.")
    if response.stop_reason == "max_tokens" or response.parsed_output is None:
        raise RuntimeError(f"The AI answer was incomplete ({response.stop_reason}).")
    return response.parsed_output


def as_shots(result: ShotListOut) -> list[dict]:
    """The draft as plain dicts (fields that are not set left out). For an interview each item also carries
    question and reaction; the client words the plan shot from them, in the screen's language."""
    return [d.model_dump(exclude_none=True) for d in result.shots]


def make_router(budget: Callable[[str, float], Optional[JSONResponse]]) -> APIRouter:
    router = APIRouter()

    def err(status: int, message: str, detail: str = "") -> JSONResponse:
        return JSONResponse({"error": message, **({"detail": detail} if detail else {})}, status_code=status)

    @router.post("/api/shots/from-script")
    def from_script(body: ScriptRequest):
        script = body.script.strip()
        if not script:
            return err(400, "Paste a script first.")
        if len(script) > MAX_SCRIPT:
            return err(400, f"That script is too long. Keep it under {MAX_SCRIPT} characters.")
        if not use_claude():
            return {"source": "demo", "interview": body.interview,
                    "shots": as_shots(sample_shots(script, body.interview))}
        over = budget("claude", SHOTS_USD)
        if over is not None:
            return over
        try:
            result = ask_claude(script, body.interview)
        except Exception as e:
            return err(502, "Could not write the shot list. Try again.", str(e))
        return {"source": "claude", "interview": body.interview, "shots": as_shots(result)}

    return router

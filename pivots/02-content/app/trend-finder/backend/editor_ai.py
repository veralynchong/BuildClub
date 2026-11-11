"""The editor's writing helpers: a hook check, tighter speech captions, a title with post caption and hashtags, and the
client's review notes turned into edit tasks. Each one proposes; a person accepts, and nothing here changes the edit.

Claude (assist.CHEAP_MODEL, one call per request) when ANTHROPIC_API_KEY is set and REMAKE_DEMO is not 1, counted
against the daily Claude budget; otherwise rules that need no model. Every answer says which one made it
(`source`: "ai" or "rules") so the page can label it. A Claude answer is checked and cut to length before it goes back."""

import json
import math
import re
import time
from typing import Callable, Literal, Optional

import anthropic
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import assist
import cutting
import editing
import renders
import storyboard
import workspaces

SCHEMA = (
    "CREATE TABLE IF NOT EXISTS edit_tasks (idea_id TEXT NOT NULL, comment_id TEXT NOT NULL, position INTEGER NOT NULL, "
    "type TEXT NOT NULL, target TEXT NOT NULL, action TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, "
    "source TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (idea_id, comment_id))",
)

CALL_USD = 0.005         # one small Haiku call, capped by MAX_TOKENS
MAX_TOKENS = 1500
HOOK_WINDOW = 3.0        # seconds of the edit the hook check looks at
MAX_FIXES = 3
TITLE_MAX, CAPTION_MAX = 60, 150
TAGS_MIN, TAGS_MAX = 3, 5
MAX_REWRITE = 80         # caption lines sent to Claude at once
MAX_TEXT = 300
MAX_NOTES = 40
TASK_TYPES = ("swap_take", "trim", "caption", "music", "other")
PRESET_TAG = {"tiktok": "fyp", "reels": "reels", "shorts": "shorts"}
FIRST_WORD_LATE = 0.5    # seconds of quiet before the first word that the rules call a slow start
FIRST_CAPTION_WORDS = 7

NO_PLAN = "That plan doesn't exist."
BAD_BODY = "Send the captions and on-screen text of the edit."
BAD_PRESET = "Pick TikTok, Reels or Shorts."
NO_TASK = "That note has no task yet."
BAD_DONE = "Send done as true or false."

Source = Literal["ai", "rules"]


# ---- the one paid call ----

def ask(out_cls, system: str, payload: dict, tag: str):
    """Claude's structured answer, shaped like agent.ask_claude. Tests replace this function."""
    response = anthropic.Anthropic().beta.messages.parse(
        model=assist.CHEAP_MODEL,
        max_tokens=MAX_TOKENS,
        output_format=out_cls,
        system=system,
        messages=[{"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
    )
    u = response.usage
    print(f"[editor_ai:{tag}] {response.model} in={u.input_tokens} out={u.output_tokens} stop={response.stop_reason}", flush=True)
    if response.stop_reason == "refusal":
        raise RuntimeError("The AI declined to do this.")
    if response.stop_reason == "max_tokens" or response.parsed_output is None:
        raise RuntimeError(f"The AI answer was incomplete ({response.stop_reason}).")
    return response.parsed_output


class HookOut(BaseModel):
    score: int
    verdict: str
    fixes: list[str]


class Rewrite(BaseModel):
    id: str
    text: str


class RewriteOut(BaseModel):
    captions: list[Rewrite]


class CopyOut(BaseModel):
    title: str
    caption: str
    hashtags: list[str]


class TaskOut(BaseModel):
    commentId: str
    type: str
    target: str
    action: str


class TasksOut(BaseModel):
    tasks: list[TaskOut]


hook_system = """You judge the first three seconds of a short vertical video made for a small business. You get the
speech captions and on-screen text that appear in those seconds (with start times), the hook the plan picked, and the
plan's shot lines in order. Score the hook 1 (viewers scroll past) to 5 (stops the scroll). Give a verdict of one
short sentence, and up to 3 concrete fixes a video editor can do in the edit, such as moving a shot's line first or
cutting the pause before the first word. Name times in seconds. Write Australian English. No flattery."""

rewrite_system = """You tighten the speech captions of a short vertical video. For each caption, return a shorter version
that keeps the meaning and the speaker's voice: drop filler, repeats and padding. Never add facts. No emoji. Keep the
same id, and leave a caption out of the answer if it is already tight. Write Australian English."""

copy_system = """You write the post for a short vertical video that a small business will publish on {platform}. Give a
title (at most 60 characters), a post caption (at most 150 characters, no hashtags in it) and 3 to 5 hashtags without
spaces, each starting with #. Use the hook, the lines of the video and the client's name; do not invent offers, prices
or claims. Write Australian English (e.g. colour, flavour). No emoji."""

tasks_system = """A client watched an edited short video and left notes, some pinned to a time. Turn each note into one
concrete edit task for the video editor. type is one of: swap_take (use another take of a shot), trim (cut or tighten
a clip), caption (change on-screen or caption text), music (music or sound level), other. target says where, such as
"Shot 2" or "0:07". action is one imperative sentence the editor can do. Return one task per note, with the note's
commentId. Write Australian English."""


# ---- shared helpers ----

EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️‍⭐⬆↔-↪]")
WORD = re.compile(r"[^\W_]+(?:['’][^\W_]+)?", re.UNICODE)


def clean(text: str, limit: int) -> str:
    """One line, no emoji, at most `limit` characters (cut at a word where it can be)."""
    text = re.sub(r"\s+", " ", EMOJI.sub("", text or "")).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit].rstrip()
    space = cut.rfind(" ")
    return (cut[:space] if space > limit * 0.6 else cut).rstrip(" ,;:-")


def words_of(text: str) -> list[str]:
    return [w.lower().replace("’", "'") for w in WORD.findall(text or "")]


def num(v) -> Optional[float]:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) else None


def timed(items, text_key="text", limit=400) -> Optional[list[dict]]:
    """Valid {start, end, text, id?} entries, or None when the list is malformed."""
    if not isinstance(items, list) or len(items) > limit:
        return None
    out = []
    for x in items:
        if not isinstance(x, dict) or not isinstance(x.get(text_key), str):
            return None
        s, e = num(x.get("start")), num(x.get("end"))
        if s is None or e is None or s < 0 or e < s or e > 86400:
            return None
        out.append({"id": str(x["id"]) if x.get("id") is not None else None, "start": s, "end": e, "text": x[text_key][:MAX_TEXT]})
    return sorted(out, key=lambda x: x["start"])


def stamp(sec: float) -> str:
    s = int(max(0, sec))
    return f"{s // 60}:{s % 60:02d}"


def overlap(a: list[str], b: list[str]) -> float:
    """Share of the words of `a` that appear in `b`."""
    if not a:
        return 0.0
    pool = set(b)
    return sum(1 for w in a if w in pool) / len(a)


def platform_name(preset: str) -> str:
    return {"tiktok": "TikTok", "reels": "Instagram Reels", "shorts": "YouTube Shorts"}[preset]


# ---- 1. hook check ----

def hook_rules(captions: list[dict], texts: list[dict], hook: str) -> dict:
    """Time to the first word, whether the plan's hook is in the first 3 s, and how long the first caption is."""
    early = [c for c in captions if c["start"] < HOOK_WINDOW]
    seen = words_of(" ".join(c["text"] for c in early + [t for t in texts if t["start"] < HOOK_WINDOW]))
    score, fixes = 5, []
    if not early:
        score -= 2
        later = captions[0]["start"] if captions else None
        fixes.append(f"No one speaks in the first {HOOK_WINDOW:.0f} seconds"
                     + (f"; the first word comes at {later:.1f} s, so cut the gap or start on that line." if later is not None else ". Add a spoken line or an on-screen hook."))
    elif early[0]["start"] > FIRST_WORD_LATE:
        score -= 1
        fixes.append(f"Cut the {early[0]['start']:.1f} s pause before the first word.")
    want = words_of(hook)
    if want and overlap(want, seen) < 0.5:
        score -= 1
        fix = f"Open with the hook line “{clean(hook, 60)}”: it isn't in the first {HOOK_WINDOW:.0f} seconds."
        later_hit = next((c for c in captions if c["start"] >= HOOK_WINDOW and overlap(want, words_of(c["text"])) >= 0.5), None)
        if later_hit:
            fix = f"Move the hook line (now at {stamp(later_hit['start'])}) to the start of the video."
        fixes.append(fix)
    if early and len(words_of(early[0]["text"])) > FIRST_CAPTION_WORDS:
        score -= 1
        fixes.append(f"Shorten the first caption to {FIRST_CAPTION_WORDS} words or fewer so it reads at a glance.")
    score = max(1, min(5, score))
    verdict = {5: "Strong start: speech comes in straight away and the hook line is in the first 3 seconds.",
               4: "Good start with one thing to tighten.",
               3: "An average start; a couple of fixes would help.",
               2: "A weak start; viewers may scroll past.",
               1: "The first seconds don't hook anyone yet."}[score]
    return {"score": score, "verdict": verdict, "fixes": fixes[:MAX_FIXES]}


def check_hook(out: HookOut) -> dict:
    fixes = [clean(f, 160) for f in out.fixes if isinstance(f, str) and clean(f, 160)][:MAX_FIXES]
    verdict = clean(out.verdict, 160)
    if not verdict:
        raise ValueError("The AI gave no verdict.")
    return {"score": max(1, min(5, int(out.score))), "verdict": verdict, "fixes": fixes}


# ---- 2. caption rewrite ----

def tighten_rules(text: str) -> str:
    """Filler words and a word said twice in a row taken out; nothing else changes."""
    kept, last = [], None
    for w in text.split():
        bare = " ".join(words_of(w))
        if cutting.is_filler(w) or (bare and bare == last):
            continue
        kept.append(w)
        last = bare or last
    return " ".join(kept)


def rewrite_items(entries: list[dict], rewritten: dict[str, str]) -> list[dict]:
    """Before/after for every caption whose new text is real: not empty, different and no longer than before."""
    out = []
    for e in entries:
        after = clean(rewritten.get(e["id"], ""), MAX_TEXT)
        if after and after != e["text"].strip() and len(after) <= len(e["text"].strip()):
            out.append({"id": e["id"], "before": e["text"], "after": after})
    return out


# ---- 3. title, post caption, hashtags ----

def tag_of(text: str) -> str:
    bare = "".join(w.capitalize() for w in WORD.findall(text or "") if w)
    return f"#{bare}" if 2 <= len(bare) <= 30 else ""


def clean_tags(tags: list[str], extra: list[str]) -> list[str]:
    out = []
    for t in [*tags, *extra]:
        tag = tag_of(str(t).lstrip("#"))
        if tag and tag.lower() not in {x.lower() for x in out}:
            out.append(tag)
    return out[:TAGS_MAX]


def copy_rules(ctx: dict, preset: str) -> dict:
    """From the plan's hook and title and the client's name: no model needed."""
    hook = clean(ctx["hook"] or ctx["title"] or ctx["client"] or "New video", TITLE_MAX)
    title = hook
    rest = clean(ctx["cta"] or "", 80)
    stop = lambda x: x if x[-1:] in ".!?" else f"{x}."
    caption = f"{stop(hook)} {stop(rest)}" if rest else stop(hook)
    if ctx["client"]:
        caption = f"{caption} From {ctx['client']}." if len(caption) + len(ctx["client"]) + 7 <= CAPTION_MAX else caption
    long_words = sorted({w for w in words_of(ctx["hook"] or ctx["title"]) if len(w) >= 5}, key=lambda w: -len(w))[:2]
    tags = clean_tags([], [ctx["client"], ctx["niche"], *long_words, PRESET_TAG[preset], "Australia"])
    return {"title": clean(title, TITLE_MAX), "caption": clean(caption, CAPTION_MAX), "hashtags": tags}


def check_copy(out: CopyOut, ctx: dict, preset: str) -> dict:
    title, caption = clean(out.title, TITLE_MAX), clean(re.sub(r"#\w+", "", out.caption), CAPTION_MAX)
    if not title or not caption:
        raise ValueError("The AI gave an empty title or caption.")
    tags = clean_tags([t for t in out.hashtags if isinstance(t, str)], [])
    if len(tags) < TAGS_MIN:
        tags = clean_tags(tags, copy_rules(ctx, preset)["hashtags"])
    return {"title": title, "caption": caption, "hashtags": tags}


# ---- 4. client notes -> tasks ----

def task_rules(note: dict) -> dict:
    return {"commentId": note["id"], "type": "other", "target": stamp(note["atSec"]) if note["atSec"] is not None else "Whole video",
            "action": clean(note["text"], 200)}


def check_tasks(out: TasksOut, notes: list[dict]) -> list[dict]:
    """One task per note, in the notes' order. A note Claude skipped or garbled gets the plain task."""
    by_id = {}
    for t in out.tasks:
        if t.commentId not in by_id:
            by_id[t.commentId] = t
    tasks = []
    for n in notes:
        t = by_id.get(n["id"])
        action = clean(t.action, 200) if t else ""
        if not action:
            tasks.append({**task_rules(n), "source": "rules"})
            continue
        target = clean(t.target, 40) or (stamp(n["atSec"]) if n["atSec"] is not None else "Whole video")
        tasks.append({"commentId": n["id"], "type": t.type if t.type in TASK_TYPES else "other", "target": target, "action": action, "source": "ai"})
    return tasks


# ---- routes ----

def make_router(db, load, budget: Callable[[str, float], Optional[JSONResponse]]) -> APIRouter:
    router = APIRouter()

    def error(code: int, message: str, **extra) -> JSONResponse:
        return JSONResponse({"error": message, **extra}, status_code=code)

    def gate(idea_id: str):
        found = workspaces.resolve(db, load, idea_id)
        if found is None:
            return None, error(404, NO_PLAN)
        return found, (None if workspaces.editable(found) else error(409, renders.NOT_APPROVED))

    async def body_of(request: Request) -> dict:
        try:
            body = await request.json()
        except ValueError:
            return {}
        return body if isinstance(body, dict) else {}

    def plan_context(idea_id: str, idea: dict) -> dict:
        """What the plan says about itself: the picked hook, the shot lines in order, the client and the reference title."""
        with db() as conn:
            client = editing.plan_client(conn, idea_id)
        shots = [s for s in (idea.get("shots") or []) if isinstance(s, dict)]
        lines = [(s.get("purpose"), (s.get("line") or "").strip()) for s in shots if (s.get("line") or "").strip()]
        hook = next((l for p, l in lines if p == "hook"), "") or (lines[0][1] if lines else "")
        cta = next((l for p, l in lines if p == "cta"), "")
        library = load("library") or {}
        video = next((v for v in library.get("videos", []) if v.get("id") == idea.get("videoId")), {}) if isinstance(library, dict) else {}
        return {"hook": hook or (video.get("hook") or ""), "cta": cta, "title": idea.get("title") or video.get("hook") or "",
                "client": client.get("name") or "", "niche": client.get("niche") or "", "shotLines": [l for _, l in lines][:12]}

    def ai_call(out_cls, system: str, payload: dict, tag: str, check: Callable):
        """(result, source, None) or (None, None, the response to send). Falls to the caller's rules when Claude is off."""
        over = budget("claude", CALL_USD)
        if over is not None:
            return None, None, over
        try:
            return check(ask(out_cls, system, payload, tag)), "ai", None
        except Exception as e:
            return None, None, error(502, "Couldn't get an AI answer. Try again.", detail=str(e))

    @router.post("/api/ideas/{idea_id}/edit/ai/hook-check")
    async def hook_check(idea_id: str, request: Request):
        idea, refused = gate(idea_id)
        if refused:
            return refused
        body = await body_of(request)
        captions, texts = timed(body.get("captions")), timed(body.get("texts"), "text", 200)
        if captions is None or texts is None:
            return error(422, BAD_BODY)
        ctx = plan_context(idea_id, idea)
        if not storyboard.use_claude():
            return {"source": "rules", **hook_rules(captions, texts, ctx["hook"])}
        window = lambda xs: [{"start": round(x["start"], 2), "text": x["text"]} for x in xs if x["start"] < HOOK_WINDOW][:12]
        payload = {"hook": ctx["hook"], "shotLines": ctx["shotLines"], "firstThreeSeconds": {"captions": window(captions), "onScreenText": window(texts)},
                   "firstWordAt": captions[0]["start"] if captions else None}
        result, source, bad = ai_call(HookOut, hook_system, payload, "hook", check_hook)
        return bad or {"source": source, **result}

    @router.post("/api/ideas/{idea_id}/edit/ai/rewrite-captions")
    async def rewrite_captions(idea_id: str, request: Request):
        _, refused = gate(idea_id)
        if refused:
            return refused
        entries = timed((await body_of(request)).get("captions"))
        if entries is None or any(not e["id"] for e in entries):
            return error(422, BAD_BODY)
        entries = [e for e in entries if e["text"].strip()][:MAX_REWRITE]
        if not storyboard.use_claude():
            return {"source": "rules", "items": rewrite_items(entries, {e["id"]: tighten_rules(e["text"]) for e in entries})}
        if not entries:
            return {"source": "ai", "items": []}
        payload = {"captions": [{"id": e["id"], "text": e["text"]} for e in entries]}
        result, source, bad = ai_call(RewriteOut, rewrite_system, payload, "rewrite",
                                      lambda out: rewrite_items(entries, {r.id: r.text for r in out.captions}))
        return bad or {"source": source, "items": result}

    @router.post("/api/ideas/{idea_id}/edit/ai/copy")
    async def copy(idea_id: str, request: Request):
        idea, refused = gate(idea_id)
        if refused:
            return refused
        preset = (await body_of(request)).get("preset")
        if preset not in PRESET_TAG:
            return error(422, BAD_PRESET)
        ctx = plan_context(idea_id, idea)
        if not storyboard.use_claude():
            return {"source": "rules", "preset": preset, **copy_rules(ctx, preset)}
        payload = {k: ctx[k] for k in ("hook", "shotLines", "client", "niche")} | {"referenceTitle": ctx["title"]}
        result, source, bad = ai_call(CopyOut, copy_system.format(platform=platform_name(preset)), payload, "copy", lambda out: check_copy(out, ctx, preset))
        return bad or {"source": source, "preset": preset, **result}

    def notes_of(conn, idea_id: str):
        """(cut, notes): the plan's latest sent cut and the client's notes on it, oldest time first. Comments come from the
        review link whether or not a cut was sent; a rejected cut's reason counts as a note on the whole video."""
        review = renders.review_row(conn, idea_id)
        row = conn.execute("SELECT value FROM store WHERE key = ?", (f"comments:{idea_id}",)).fetchone()
        comments = json.loads(row[0]) if row else []
        notes = [{"id": c["id"], "atSec": c["atSec"], "text": c["text"], "author": c["author"], "source": c.get("source") or "review"}
                 for c in comments if isinstance(c, dict) and "id" in c]
        notes.sort(key=lambda n: n["atSec"])
        cut = None
        if review:
            cut = {"status": review[1], "sentAt": review[2], "decidedAt": review[3]}
            if review[4] and review[1] == "rejected":
                notes.append({"id": "cut-reason", "atSec": None, "text": review[4], "author": "Client", "source": "review"})
        return cut, notes

    def tasks_of(conn, idea_id: str) -> list[dict]:
        rows = conn.execute("SELECT comment_id, type, target, action, done, source FROM edit_tasks WHERE idea_id = ? ORDER BY position, created_at",
                            (idea_id,)).fetchall()
        return [{"commentId": r[0], "type": r[1], "target": r[2], "action": r[3], "done": bool(r[4]), "source": r[5]} for r in rows]

    @router.get("/api/ideas/{idea_id}/edit/ai/client-notes")
    def client_notes(idea_id: str):
        _, refused = gate(idea_id)
        if refused:
            return refused
        with db() as conn:
            cut, notes = notes_of(conn, idea_id)
            return {"shared": cut is not None, "cut": cut, "notes": notes, "tasks": tasks_of(conn, idea_id)}

    @router.post("/api/ideas/{idea_id}/edit/ai/client-notes/tasks")
    def make_tasks(idea_id: str):
        """Tasks for the notes that have none yet; tasks already made (and ticked) are left as they are."""
        _, refused = gate(idea_id)
        if refused:
            return refused
        with db() as conn:
            _, notes = notes_of(conn, idea_id)
            have = {t["commentId"] for t in tasks_of(conn, idea_id)}
        todo = [n for n in notes if n["id"] not in have][:MAX_NOTES]
        source: Source = "rules"
        if todo:
            tasks = [{**task_rules(n), "source": "rules"} for n in todo]
            if storyboard.use_claude():
                payload = {"notes": [{"commentId": n["id"], "atSec": n["atSec"], "text": n["text"]} for n in todo]}
                result, _, bad = ai_call(TasksOut, tasks_system, payload, "tasks", lambda out: check_tasks(out, todo))
                if bad:
                    return bad
                tasks = result
            source = "ai" if any(t["source"] == "ai" for t in tasks) else "rules"
            now = int(time.time() * 1000)
            with db() as conn:
                first = conn.execute("SELECT COALESCE(MAX(position), -1) + 1 FROM edit_tasks WHERE idea_id = ?", (idea_id,)).fetchone()[0]
                for i, t in enumerate(tasks):
                    conn.execute("INSERT OR IGNORE INTO edit_tasks (idea_id, comment_id, position, type, target, action, done, source, created_at) "
                                 "VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)", (idea_id, t["commentId"], first + i, t["type"], t["target"], t["action"], t["source"], now))
        with db() as conn:
            return {"source": source, "tasks": tasks_of(conn, idea_id)}

    @router.patch("/api/ideas/{idea_id}/edit/ai/client-notes/tasks/{comment_id}")
    async def set_done(idea_id: str, comment_id: str, request: Request):
        _, refused = gate(idea_id)
        if refused:
            return refused
        done = (await body_of(request)).get("done")
        if not isinstance(done, bool):
            return error(422, BAD_DONE)
        with db() as conn:
            changed = conn.execute("UPDATE edit_tasks SET done = ? WHERE idea_id = ? AND comment_id = ?", (int(done), idea_id, comment_id)).rowcount
            if not changed:
                return error(404, NO_TASK)
            return {"tasks": tasks_of(conn, idea_id)}

    return router

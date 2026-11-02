"""Re-check one video's public numbers with yt-dlp (free, no Apify, no AI). The newest result per video is
kept in the database, so it is still there after a restart. server.py mounts the router and passes in the
link check; nothing here imports it."""

import json
import re
import subprocess
import time
from typing import Callable, Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

SCHEMA = (
    "CREATE TABLE IF NOT EXISTS rechecks (platform TEXT NOT NULL, video_id TEXT NOT NULL, result TEXT NOT NULL, "
    "PRIMARY KEY (platform, video_id))",
)

TIMEOUT = 60  # seconds for one yt-dlp call
NO_LINK = "This video has no link to check."
NO_REDDIT = "Reddit upvotes can't be re-checked for free yet."
NO_YTDLP = "yt-dlp isn't installed on this machine, so the numbers can't be re-checked."
TIMED_OUT = "yt-dlp took too long to answer. Try again in a minute."
NO_COUNTS = "yt-dlp found the post but returned no view, like or comment counts."
LOGIN = "{platform} wants a login before it shows this post, so the numbers can't be re-checked for free."
FAILED = "yt-dlp couldn't read this post. It may be removed or private, or {platform} blocked the request."
PLATFORM_NAMES = {"tiktok": "TikTok", "instagram": "Instagram", "youtube": "YouTube", "x": "X", "reddit": "Reddit"}


class RecheckError(Exception):
    pass


class Counts(BaseModel):
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    followers: Optional[int] = None


class RecheckRequest(BaseModel):
    platform: str
    id: str
    url: str
    old: Counts = Counts()


def count(value) -> Optional[int]:
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0 else None


def fetch_counts(url: str, platform: str, run: Optional[Callable] = None) -> Counts:
    """Fresh counts for one post. Raises RecheckError with a message fit to show to the user."""
    name = PLATFORM_NAMES.get(platform, "The site")
    try:
        r = (run or subprocess.run)(["yt-dlp", "--dump-json", "--skip-download", "--no-playlist", "--no-warnings", "--socket-timeout", "30",
                 "--", url], capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=TIMEOUT)
    except FileNotFoundError:
        raise RecheckError(NO_YTDLP)
    except subprocess.TimeoutExpired:
        raise RecheckError(TIMED_OUT)
    if r.returncode != 0 or not r.stdout.strip():
        if re.search(r"log ?in|cookies|authenticat|empty media response|rate-limit", r.stderr or "", re.I):
            raise RecheckError(LOGIN.format(platform=name))
        raise RecheckError(FAILED.format(platform=name))
    try:
        info = json.loads(r.stdout.strip().splitlines()[0])
    except (ValueError, IndexError):
        raise RecheckError(FAILED.format(platform=name))
    counts = Counts(views=count(info.get("view_count")), likes=count(info.get("like_count")),
                    comments=count(info.get("comment_count")), followers=count(info.get("channel_follower_count")))
    if counts.views is None and counts.likes is None and counts.comments is None:
        raise RecheckError(NO_COUNTS)
    return counts


def saved(db, platform: str, video_id: str) -> Optional[dict]:
    with db() as conn:
        row = conn.execute("SELECT result FROM rechecks WHERE platform = ? AND video_id = ?", (platform, video_id)).fetchone()
    return json.loads(row[0]) if row else None


def make_router(db, is_video_link: Callable[[str], bool]) -> APIRouter:
    router = APIRouter()

    @router.get("/api/recheck")
    def get_recheck(platform: str, id: str):
        return {"result": saved(db, platform, id)}

    @router.post("/api/recheck")
    def post_recheck(body: RecheckRequest):
        url = body.url.strip()
        if body.platform not in PLATFORM_NAMES or not body.id:
            return JSONResponse({"error": "Unknown video."}, status_code=400)
        if body.platform == "reddit":
            return JSONResponse({"error": NO_REDDIT}, status_code=400)
        if not url or not is_video_link(url):
            return JSONResponse({"error": NO_LINK}, status_code=400)
        try:
            new = fetch_counts(url, body.platform)
        except RecheckError as e:
            return JSONResponse({"error": str(e)}, status_code=502)
        # yt-dlp rarely knows the follower count (TikTok never does): keep the old one and say so.
        followers_kept = new.followers is None
        if followers_kept:
            new.followers = body.old.followers
        result = {"platform": body.platform, "id": body.id, "checkedAt": int(time.time() * 1000), "old": body.old.model_dump(),
                  "new": new.model_dump(), "followersKept": followers_kept}
        with db() as conn:
            conn.execute("INSERT OR REPLACE INTO rechecks (platform, video_id, result) VALUES (?, ?, ?)",
                         (body.platform, body.id, json.dumps(result)))
        return {"result": result}

    return router

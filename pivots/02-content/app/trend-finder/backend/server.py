"""Trend Finder API in Python. Replaces server/index.mjs with the same routes and response shape,
so the front end needs no change. Keeps the Apify token on this machine and caches each search on
disk, so repeating a search costs nothing.

Run (from trend-finder/):
    backend/.venv/bin/uvicorn server:app --app-dir backend --port 8787 --reload
Pin a cached search so it never expires (offline demos):
    backend/.venv/bin/python backend/server.py pin "tofu"            (add "instagram" for an Instagram search)
"""

import base64
import binascii
import contextlib
import copy
import getpass
import hashlib
import json
import os
import re
import secrets
import shutil
import sqlite3
import statistics
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, Request
from fastapi.responses import FileResponse, JSONResponse, Response

import assist
import brand
import kit
import canvas
import channels
import covers
import editing
import instagram
import reddit
import comments
import share
import x
import youtube
import analyze
import auth
import google_auth
import production
import publishing
import cut_review
import recheck
import generations
import renders
import agent
import workspaces
import shotlist
import storyboard
import cleaning
import suggest
import finishing
import takes
from analyze import DEFAULT_NEEDS, Jobs, job_id_for
from compare import CompareJobs, compare_id_for
from models import (AnalyzeJob, ContentTypes, AnswerRequest, AnswerResult, AnalyzeRequest, AnalyzeStarted, LikeImageRequest, LikeImageResult, LikeJob, LikeRequest, ChannelJob, ChannelRequest, ChannelStarted, Brand, Client, Kit,
                    CompareJob, CompareRequest, CompareStarted, Library, LoginRequest, Pulse, NeedsRequest, NeedsResult, SavedIdea, SearchResult)

HERE = Path(__file__).resolve().parent
CACHE_DIR = HERE / "cache"
PINNED_DIR = HERE / "pinned"  # searches saved for demos; never expire
COVERS_DIR = HERE / "covers"  # cover images of cached searches (not in git)
PINNED_COVERS_DIR = PINNED_DIR / "covers"  # cover images of pinned searches (in git, so demos work offline)
MEDIA_DIR = HERE / "media"  # uploaded takes, one folder per plan
DB_PATH = HERE / "data.db"  # clients and saved ideas
DIST_DIR = HERE.parent / "dist"  # the built front end (npm run build), so one address serves everything


def load_env(path: Path) -> None:
    """Read KEY=value lines from .env without overriding variables already set."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        key, sep, value = line.partition("=")
        key = key.strip()
        if sep and key and not key.startswith("#"):
            os.environ.setdefault(key, value.strip())


if os.environ.get("BUILDCLUB_OFFLINE_VERIFY") != "1":
    load_env(HERE.parent / ".env")

TOKEN = os.environ.get("APIFY_TOKEN", "").strip()
ACTOR = os.environ.get("APIFY_TIKTOK_ACTOR", "clockworks~tiktok-scraper")
IG_ACTOR = os.environ.get("APIFY_INSTAGRAM_ACTOR", "apify~instagram-hashtag-scraper")
X_ACTOR = os.environ.get("APIFY_X_ACTOR", "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest")
REDDIT_ACTOR = os.environ.get("APIFY_REDDIT_ACTOR", "clearpath~reddit-search-scraper")
REDDIT_SUB_ACTOR = os.environ.get("APIFY_REDDIT_SUB_ACTOR", "clearpath~reddit-subreddit-posts-scraper")
RESULTS_PER_SEARCH = int(os.environ.get("RESULTS_PER_SEARCH", 30))
CACHE_HOURS = float(os.environ.get("CACHE_HOURS", 24))
# Cost is held by maxItems: 30 results at ~$3.70/1,000 is about $0.11 (measured 0.112 on 2026-10-27).
# The charge cap is a backstop only; Apify refuses anything below $0.50.
MAX_USD_PER_SEARCH = float(os.environ.get("MAX_USD_PER_SEARCH", 0.50))
# Each account's usual views come from its latest videos: 15 accounts x 6 videos is about $0.33.
# At 10 videos (about $0.56) the 0.50 search cap stopped the run at 134 of 150, so that run has its own cap.
MAX_USD_PER_MEDIANS = float(os.environ.get("MAX_USD_PER_MEDIANS", 0.60))
AUTHORS_PER_SEARCH = int(os.environ.get("AUTHORS_PER_SEARCH", 15))
VIDEOS_PER_AUTHOR = int(os.environ.get("VIDEOS_PER_AUTHOR", 6))
MIN_VIDEOS = 5  # fewer recent videos than this and the median says little
MEDIAN_DAYS = 30  # an account's usual views are reused this long before they are fetched again
# Daily caps on estimated spend, so a loop or stray clicks can't run up the bill. Each paid call is
# counted before it runs; cached searches and finished breakdowns are free and never counted.
DAILY_APIFY_USD = float(os.environ.get("DAILY_APIFY_USD", 2.00))
DAILY_CLAUDE_USD = float(os.environ.get("DAILY_CLAUDE_USD", 1.00))
DAILY_GEN_IMAGE_USD = float(os.environ.get("DAILY_GEN_IMAGE_USD", 0.50))  # canvas image generations
DAILY_GEN_VIDEO_USD = float(os.environ.get("DAILY_GEN_VIDEO_USD", 1.00))  # canvas video generations
DAILY_GEN_VOICE_USD = float(os.environ.get("DAILY_GEN_VOICE_USD", 0.30))  # editor voiceover (text to speech)
# Channel summaries: Jev labelling in US$; ScrapeCreators (Instagram only) in credits, 1 per 12 reels.
DAILY_JEV_USD = float(os.environ.get("DAILY_JEV_USD", 0.50))
DAILY_SCRAPECREATORS_CREDITS = float(os.environ.get("DAILY_SCRAPECREATORS_CREDITS", 20))
# X: 30 tweets at ~US$0.25-0.40 per 1,000 is about 0.01; 0.02 leaves room for the actor's minimum charge.
# Reddit (clearpath actors) is ~US$1 per 1,000 posts: 30 search results about 0.03 (measured 0.031),
# a subreddit's 10 top posts about 0.02 (measured: 8 subreddits in one run cost 0.16).
SEARCH_USD = {"tiktok": 0.12, "instagram": 0.03, "reddit": 0.03, "x": 0.02}
X_USD_PER_TWEET = 0.0004  # the dearer of the two candidate actors; account medians cost this per tweet fetched
REDDIT_USD_PER_SUB = 0.02
APIFY_USD_PER_VIDEO = 0.0037  # TikTok actor; account medians cost this per video fetched (134 videos: 0.497)
ANALYZE_USD = 0.08  # one Claude breakdown
COMPARE_USD = 0.05  # one Claude call that compares finished breakdowns (text only, no images)
NEEDS_USD = 0.01  # one small Claude call that fills in a finished breakdown's needs
IMAGE_USD = 0.02  # one small Claude call that reads a screenshot
ASK_USD = 0.01  # one small Claude call that answers a search from its results
CLASSIFY_USD = 0.01  # one small Claude call that sorts a search's results into content types
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # decoded; the base64 request body is about a third bigger
LIKE_USD = 0.01  # one small Claude call that turns a finished breakdown into search keywords

# Set APP_PASSWORD when the app is shared through a tunnel: the browser then asks for it once.
APP_PASSWORD = os.environ.get("APP_PASSWORD", "").strip()

@contextlib.asynccontextmanager
async def lifespan(_app):
    generations.recover(db, gen_jobs)
    renders.recover(db)  # a cut that was running when the server stopped will never finish
    if takes.JOBS is not None:
        takes.JOBS.resume()  # analyse takes that were queued at shutdown or never analysed
    editing.prewarm_bundle()  # builds the Remotion bundle in a background thread; never blocks startup
    yield
    editing.kill_active()  # no render outlives the server


app = FastAPI(title="Trend Finder API", lifespan=lifespan)


def password_ok(header: str) -> bool:
    """Basic auth with any user name; only the password is checked."""
    scheme, _, encoded = header.partition(" ")
    try:
        password = base64.b64decode(encoded, validate=True).decode().partition(":")[2]
    except ValueError:
        return False
    return scheme.lower() == "basic" and secrets.compare_digest(password.encode(), APP_PASSWORD.encode())


# Once an account exists these need no session: the pages (every non-/api path, so the sign-in
# page and the approver's /review/<token> page can load), health, the landing-page stats, signing
# in, and the approver's own API. Everything else under /api needs one. Matching is exact, or on
# the "/api/review/" prefix with its trailing slash, so "/api/reviewX" is not let through.
PUBLIC_API = ("/api/health", "/api/stats", "/api/auth/login", "/api/auth/config",
              "/api/auth/google/start", "/api/auth/google/callback")
PUBLIC_API_PREFIX = ("/api/review/",)


DOC_PATHS = ("/docs", "/redoc", "/openapi.json", "/docs/oauth2-redirect")


def needs_session(path: str) -> bool:
    if path in DOC_PATHS:  # the API docs list every route, so they sit behind sign-in too
        return True
    if path != "/api" and not path.startswith("/api/"):
        return False
    return path not in PUBLIC_API and not path.startswith(PUBLIC_API_PREFIX)


@app.middleware("http")
async def require_password(request: Request, call_next):
    path = request.url.path
    if path.startswith('/api/ideas/ws_'):
        return JSONResponse({'error': "That plan doesn't exist."}, status_code=404)
    with contextlib.closing(db()) as conn:
        users = auth.has_users(conn)
        session = auth.session_user(conn, request.cookies.get(auth.COOKIE), time.time()) if users else None
        conn.commit()
    if users:  # accounts replace the shared password: no Basic from here on
        if needs_session(request.url.path) and session is None:
            return JSONResponse({"error": "Sign in to continue."}, status_code=401)
    elif APP_PASSWORD and not password_ok(request.headers.get("authorization", "")):
        return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="Trend Finder"'})
    return await call_next(request)


def error(status: int, message: str, detail: str = "", code: str = "") -> JSONResponse:
    """`code` is optional: a stable name the page can translate (the message stays English)."""
    body = {"error": message, **({"detail": detail} if detail else {}), **({"code": code} if code else {})}
    return JSONResponse(body, status_code=status)


def cache_name(query: str, platform: str = "tiktok") -> str:
    actor = {"instagram": IG_ACTOR, "youtube": "yt-dlp", "x": X_ACTOR, "reddit": REDDIT_ACTOR}.get(platform, ACTOR)  # TikTok keys stay as before, so pins still load
    return hashlib.sha1(f"{actor}|{RESULTS_PER_SEARCH}|{query}".encode()).hexdigest() + ".json"


def read_cache(query: str, platform: str = "tiktok"):
    pinned = PINNED_DIR / cache_name(query, platform)
    if pinned.exists():
        return json.loads(pinned.read_text())
    try:
        saved = json.loads((CACHE_DIR / cache_name(query, platform)).read_text())
    except (OSError, ValueError):
        return None
    # A fill that died with a restart left the flag on; nothing will clear it, so stop waiting.
    if saved.get("mediansPending") and cache_name(query, platform) not in filling:
        saved["mediansPending"] = False
    age_hours = (time.time() * 1000 - saved["fetchedAt"]) / 3_600_000
    return saved if age_hours < CACHE_HOURS else None


def created_iso(item: dict) -> Optional[str]:
    """When the raw TikTok item was posted, as an ISO string."""
    created = item.get("createTimeISO")
    if not created and item.get("createTime"):
        created = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(item["createTime"]))
    return created


def trim(item: dict) -> dict:
    """Only the fields the app uses, so the cache stays small."""
    meta = item.get("videoMeta") or {}
    author = item.get("authorMeta") or {}
    music = item.get("musicMeta")
    created = created_iso(item)
    plays = item.get("playCount") or 0
    followers = author.get("fans") or 0
    return {
        "id": str(item.get("id") or ""),
        "text": item.get("text") or "",
        "url": item.get("webVideoUrl") or "",
        "createTime": created,
        "plays": plays,
        "likes": item.get("diggCount") or 0,
        "comments": item.get("commentCount") or 0,
        "shares": item.get("shareCount") or 0,
        "saves": item.get("collectCount"),
        "duration": meta.get("duration") or 0,
        "cover": meta.get("coverUrl") or meta.get("originalCoverUrl") or "",
        "author": author.get("name") or "",
        "followers": followers,
        "music": f"{music.get('musicName') or ''} · {music.get('musicAuthor') or ''}".strip() if music else "",
        "musicOriginal": bool(music and music.get("musicOriginal")),
        "hashtags": [h["name"] for h in item.get("hashtags") or [] if h and h.get("name")],
        # Daphne's rule: views ÷ followers. A small account with huge views means the idea is good.
        "ratio": round(plays / max(followers, 1), 2),
    }


NO_DOWNLOADS = {
    "shouldDownloadVideos": False,
    "shouldDownloadCovers": False,
    "shouldDownloadSubtitles": False,
    "shouldDownloadSlideshowImages": False,
}


def run_actor(payload: dict, max_items: int, actor: str = ACTOR, max_usd: float = MAX_USD_PER_SEARCH) -> list:
    url = (f"https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items"
           f"?timeout=240&maxItems={max_items}&maxTotalChargeUsd={max_usd}")
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={
        "Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"})
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:  # never echo the URL or headers
        raise RuntimeError(f"Apify returned {e.code}: {e.read()[:300].decode(errors='replace')}")


def search_tiktok(query: str) -> list:
    items = run_actor({"searchQueries": [query], "resultsPerPage": RESULTS_PER_SEARCH, **NO_DOWNLOADS},
                      RESULTS_PER_SEARCH)
    videos = [trim(i) for i in items if i and i.get("playCount") is not None and i.get("webVideoUrl")]
    return sorted(videos, key=lambda v: v["ratio"], reverse=True)


def trim_instagram(item: dict) -> dict:
    """The same shape as trim(). The hashtag actor gives no follower counts, so followers and ratio start
    empty; search_ig fills them from the profile actor afterwards."""
    music = item.get("musicInfo") or {}
    return {
        "id": str(item.get("id") or item.get("shortCode") or ""),
        "text": item.get("caption") or "",
        "url": item.get("url") or "",
        "createTime": item.get("timestamp"),
        "plays": item.get("videoPlayCount") or item.get("videoViewCount") or 0,
        "likes": max(item.get("likesCount") or 0, 0),  # -1 when the owner hides likes
        "comments": item.get("commentsCount") or 0,
        "shares": item.get("sharesCount") or 0,
        "saves": None,
        "duration": item.get("videoDuration") or 0,
        "cover": item.get("displayUrl") or "",
        "author": item.get("ownerUsername") or "",
        "followers": None,
        "music": f"{music.get('song_name') or ''} · {music.get('artist_name') or ''}".strip(" ·"),
        "musicOriginal": bool(music.get("uses_original_audio")),
        "hashtags": item.get("hashtags") or [],
        "ratio": None,
    }


def search_instagram(query: str) -> list:
    items = run_actor({"hashtags": [query], "keywordSearch": True, "resultsType": "reels",
                       "resultsLimit": RESULTS_PER_SEARCH}, RESULTS_PER_SEARCH, actor=IG_ACTOR)
    videos = [trim_instagram(i) for i in items if i and not i.get("error") and i.get("url")
              and (i.get("videoPlayCount") or i.get("videoViewCount")) is not None]
    return sorted(videos, key=lambda v: v["plays"], reverse=True)


def account_baselines(items: list) -> dict:
    """Each account's usual views: the median over its recent videos (from reel-studio's
    research.py score()), with how many videos and which dates it covers. Accounts with
    fewer than MIN_VIDEOS videos are left out."""
    by_author = {}
    for i in items:
        name = (i.get("authorMeta") or {}).get("name")
        if name and i.get("playCount") is not None:
            by_author.setdefault(name, []).append(i)
    baselines = {}
    for name, videos in by_author.items():
        if len(videos) < MIN_VIDEOS:
            continue
        dates = sorted(d[:10] for d in map(created_iso, videos) if d)
        baselines[name] = {"median": statistics.median(v["playCount"] for v in videos), "n": len(videos),
                           "from": dates[0] if dates else None, "to": dates[-1] if dates else None}
    return baselines


def saved_medians(authors: list) -> dict:
    """Account baselines fetched in the last MEDIAN_DAYS, with fetchedAt in ms. None means the
    account had too few videos. Rows saved before n and the dates existed have those as None."""
    if not authors:
        return {}
    since = time.time() - MEDIAN_DAYS * 86400
    with db() as conn:
        rows = conn.execute(f"SELECT author, median, n, base_from, base_to, fetched_at FROM medians "
                            f"WHERE fetched_at > ? AND author IN ({','.join('?' * len(authors))})",
                            (since, *authors)).fetchall()
    return {a: None if m is None else {"median": m, "n": n, "from": f, "to": t, "fetchedAt": int(at * 1000)}
            for a, m, n, f, t, at in rows}


def save_medians(baselines: dict, now: Optional[float] = None) -> None:
    now = now or time.time()
    with db() as conn:
        conn.executemany("INSERT OR REPLACE INTO medians (author, median, n, base_from, base_to, fetched_at) "
                         "VALUES (?, ?, ?, ?, ?, ?)",
                         [(a, b and b["median"], b and b["n"], b and b["from"], b and b["to"], now)
                          for a, b in baselines.items()])


def apply_medians(videos: list, baselines: dict) -> None:
    """medianViews, outlier and the baseline details: views over the account's usual views."""
    for v in videos:
        b = baselines.get(v["author"])
        median = b and b["median"]
        v["medianViews"] = median
        v["outlier"] = round(v["plays"] / median, 2) if median else None
        v["medianN"] = b and b["n"]
        v["baselineFrom"] = b and b["from"]
        v["baselineTo"] = b and b["to"]
        v["medianFetchedAt"] = b and b["fetchedAt"]
        v["denominator"] = "median" if median else "followers" if (v.get("followers") or 0) > 0 else None


def fetch_medians(missing: list) -> dict:
    """Fetch and pay for accounts not seen in the last week. A failure only leaves them empty:
    the search result is still good without them."""
    if not spend("apify", round(len(missing) * VIDEOS_PER_AUTHOR * APIFY_USD_PER_VIDEO, 2), DAILY_APIFY_USD):
        print("[search] account medians skipped: today's Apify budget is used up", flush=True)
        return {}
    try:
        found = account_baselines(run_actor({
            "profiles": missing, "resultsPerPage": VIDEOS_PER_AUTHOR, "profileSorting": "latest",
            "excludePinnedPosts": True, **NO_DOWNLOADS}, len(missing) * VIDEOS_PER_AUTHOR, max_usd=MAX_USD_PER_MEDIANS))
    except Exception as e:
        print(f"[search] account medians failed: {e}", flush=True)
        return {}
    now = time.time()
    fresh = {a: found.get(a) for a in missing}
    save_medians(fresh, now)
    return {a: b and {**b, "fetchedAt": int(now * 1000)} for a, b in fresh.items()}


# Fetching account medians takes about 40 seconds, so the search returns first and the cache
# file is rewritten with the medians when they arrive. The front end polls the (free) cached search.
filling = set()  # cache file names still waiting for medians


def in_background(fill) -> None:
    threading.Thread(target=fill, daemon=True).start()


def write_cache(payload: dict) -> None:
    # Written whole and swapped in, so a poll never reads half a file and searches live (paid) instead.
    CACHE_DIR.mkdir(exist_ok=True)
    covers.localize(payload, COVERS_DIR)  # signed CDN links expire; a failed download keeps the original URL
    target = CACHE_DIR / cache_name(payload["query"], payload["platform"])
    partial = target.with_suffix(f".{threading.get_ident()}.tmp")
    partial.write_text(json.dumps(payload))
    os.replace(partial, target)


def fill_medians(payload: dict, medians: dict, missing: list) -> None:
    try:
        medians = {**medians, **fetch_medians(missing)}
        apply_medians(payload["videos"], medians)
        payload["mediansPending"] = False
        write_cache(payload)
        scored = sum(1 for v in payload["videos"] if v["outlier"] is not None)
        print(f'[search] tiktok "{payload["query"]}" → medians for {scored} videos', flush=True)
    finally:
        filling.discard(cache_name(payload["query"], payload["platform"]))


def search_youtube(query: str):
    """Free (yt-dlp), so nothing is counted against the daily caps. Channel scores are filled afterwards,
    the same way as TikTok's."""
    try:
        videos = youtube.search_shorts(query)
        channels = list(dict.fromkeys(v["channelId"] for v in videos if v["channelId"]))
        stats = youtube.saved(db, channels, MEDIAN_DAYS)
        youtube.apply(videos, stats)
    except Exception as e:
        print(f"[search] failed: {e}", flush=True)
        return error(502, "YouTube search failed. Check the API terminal for details.", str(e))
    missing = [c for c in channels if c not in stats]
    payload = {"query": query, "platform": "youtube", "fetchedAt": int(time.time() * 1000), "videos": videos,
               "mediansPending": bool(missing)}
    write_cache(payload)
    print(f'[search] youtube "{query}" → {len(videos)} videos', flush=True)
    if missing:
        filling.add(cache_name(query, "youtube"))
        background = copy.deepcopy(payload)

        def fill():
            try:
                found = youtube.fetch_channels(missing)
                youtube.save(db, found)
                youtube.apply(background["videos"], {**stats, **found})
                background["mediansPending"] = False
                write_cache(background)
                print(f'[search] youtube "{query}" → scores for {len(found)} of {len(missing)} channels', flush=True)
            finally:
                filling.discard(cache_name(query, "youtube"))

        in_background(fill)
    return {**payload, "cached": False}


def search_x(query: str):
    """Video tweets for the keyword. Account medians (one batched run) are filled afterwards, like TikTok's."""
    def run(payload, max_items):
        return run_actor(payload, max_items, actor=X_ACTOR)

    try:
        videos = x.search_videos(query, run)
        authors = list(dict.fromkeys(v["author"] for v in videos))
        medians = x.saved(db, authors, MEDIAN_DAYS)
        x.apply(videos, medians)
    except Exception as e:
        print(f"[search] failed: {e}", flush=True)
        return error(502, "X search failed. Check the API terminal for details.", str(e))
    missing = [a for a in authors if a.lower() not in medians][:x.AUTHORS_PER_FILL]
    payload = {"query": query, "platform": "x", "fetchedAt": int(time.time() * 1000), "videos": videos,
               "mediansPending": bool(missing)}
    write_cache(payload)
    print(f'[search] x "{query}" → {len(videos)} videos', flush=True)
    if missing:
        filling.add(cache_name(query, "x"))
        background = copy.deepcopy(payload)

        def fill():
            try:
                found = {}
                if spend("apify", round(len(missing) * x.ITEMS_PER_AUTHOR * X_USD_PER_TWEET, 4), DAILY_APIFY_USD):
                    try:
                        found = x.fetch_medians(missing, run)
                        x.save(db, found)
                    except Exception as e:
                        print(f"[search] x medians failed: {e}", flush=True)
                else:
                    print("[search] x medians skipped: today's Apify budget is used up", flush=True)
                x.apply(background["videos"], {**medians, **found})
                background["mediansPending"] = False
                write_cache(background)
            finally:
                filling.discard(cache_name(query, "x"))

        in_background(fill)
    return {**payload, "cached": False}


def search_ig(query: str):
    """Instagram reels for the keyword. Each account's usual plays (its latest reels, one batched actor
    run) are filled afterwards, like X's."""
    def run(payload, max_items):
        return run_actor(payload, max_items, actor=instagram.REEL_ACTOR, max_usd=MAX_USD_PER_MEDIANS)

    def run_profiles(payload, max_items):
        return run_actor(payload, max_items, actor=instagram.PROFILE_ACTOR, max_usd=instagram.MAX_USD_PER_PROFILES)

    try:
        videos = search_instagram(query)
        authors = list(dict.fromkeys(v["author"] for v in videos if v["author"]))
        baselines = instagram.saved(db, authors, MEDIAN_DAYS)
        instagram.apply(videos, baselines)
    except Exception as e:
        print(f"[search] failed: {e}", flush=True)
        return error(502, "Instagram search failed. Check the API terminal for details.", str(e))
    followers = instagram.saved_followers(db, authors, MEDIAN_DAYS)
    instagram.apply_followers(videos, followers)
    missing = [a for a in authors if a not in baselines][:instagram.ACCOUNTS_PER_FILL]
    missing_followers = [a for a in authors if a not in followers][:instagram.ACCOUNTS_PER_FILL]
    pending = bool(missing or missing_followers)
    payload = {"query": query, "platform": "instagram", "fetchedAt": int(time.time() * 1000), "videos": videos,
               "mediansPending": pending}
    write_cache(payload)
    print(f'[search] instagram "{query}" → {len(videos)} videos', flush=True)
    if pending:
        filling.add(cache_name(query, "instagram"))
        background = copy.deepcopy(payload)

        def fill():
            try:
                found, found_followers = {}, {}
                # Followers first: they are the client's score and the cheapest call (about 0.04).
                if missing_followers:
                    if spend("apify", round(len(missing_followers) * instagram.USD_PER_PROFILE, 4), DAILY_APIFY_USD):
                        try:
                            found_followers = instagram.fetch_followers(missing_followers, run_profiles)
                            instagram.save_followers(db, found_followers)
                        except Exception as e:
                            print(f"[search] instagram followers failed: {e}", flush=True)
                    else:
                        print("[search] instagram followers skipped: today's Apify budget is used up", flush=True)
                if missing and spend("apify", round(len(missing) * instagram.REELS_PER_ACCOUNT * instagram.USD_PER_REEL, 2), DAILY_APIFY_USD):
                    try:
                        found = instagram.fetch_baselines(missing, run)
                        instagram.save(db, found)
                        now = int(time.time() * 1000)
                        found = {a: b and {**b, "fetchedAt": now} for a, b in found.items()}
                    except Exception as e:
                        print(f"[search] instagram baselines failed: {e}", flush=True)
                elif missing:
                    print("[search] instagram baselines skipped: today's Apify budget is used up", flush=True)
                instagram.apply_followers(background["videos"], {**followers, **found_followers})
                instagram.apply(background["videos"], {**baselines, **found})
                background["mediansPending"] = False
                write_cache(background)
            finally:
                filling.discard(cache_name(query, "instagram"))

        in_background(fill)
    return {**payload, "cached": False}


def search_reddit(query: str):
    """The search itself is already paid for (counted by the caller). Up to SUBS_PER_SEARCH subreddit
    medians are paid for and fetched in the background, the way TikTok's account medians are."""
    try:
        videos = reddit.search_posts(run_actor, query, REDDIT_ACTOR)
        subs = list(dict.fromkeys(v["community"] for v in videos if v["community"]))
        medians = reddit.saved(db, subs, MEDIAN_DAYS)
        reddit.apply(videos, medians)
    except Exception as e:
        print(f"[search] failed: {e}", flush=True)
        return error(502, "Reddit search failed. Check the API terminal for details.", str(e))
    missing = [s for s in subs if s not in medians][:reddit.SUBS_PER_SEARCH]
    payload = {"query": query, "platform": "reddit", "fetchedAt": int(time.time() * 1000), "videos": videos,
               "mediansPending": bool(missing)}
    write_cache(payload)
    print(f'[search] reddit "{query}" → {len(videos)} videos', flush=True)
    if missing:
        filling.add(cache_name(query, "reddit"))
        background = copy.deepcopy(payload)

        def fill():
            try:
                found = {}
                if spend("apify", round(len(missing) * REDDIT_USD_PER_SUB, 2), DAILY_APIFY_USD):
                    found = reddit.fetch_subreddits(run_actor, missing, REDDIT_SUB_ACTOR)
                    reddit.save(db, found)
                else:
                    print("[search] subreddit medians skipped: today's Apify budget is used up", flush=True)
                reddit.apply(background["videos"], {**medians, **found})
                background["mediansPending"] = False
                write_cache(background)
                print(f'[search] reddit "{query}" → scores for {len(found)} of {len(missing)} subreddits', flush=True)
            finally:
                filling.discard(cache_name(query, "reddit"))

        in_background(fill)
    return {**payload, "cached": False}


@app.get("/api/health")
def health():
    # yt-dlp alone is enough for live YouTube search; TikTok, Instagram, Reddit and X need the Apify token.
    return {"live": bool(TOKEN) or bool(shutil.which("yt-dlp")), "platforms": ["tiktok", "instagram", "youtube", "reddit", "x"],
            "resultsPerSearch": RESULTS_PER_SEARCH,
            # Demo mode (bin/isolated-backend.sh --demo-data): the app may keep and save its built-in sample clients.
            "demo": os.environ.get("REMAKE_DEMO") == "1"}


def saved_files():
    """(file name, parsed search, is pinned) for every saved search; the same search in both folders has the same file name."""
    for folder in (CACHE_DIR, PINNED_DIR):
        for f in sorted(folder.glob("*.json")):
            try:
                yield f.name, json.loads(f.read_text()), folder == PINNED_DIR
            except (OSError, ValueError):
                continue


STATS_SECONDS = 60
stats_cache: dict = {}


@app.get("/api/stats")
def stats():
    """How many real videos this server has searched: saved and pinned searches, each search and each video once."""
    now = time.time()
    if stats_cache.get("at", 0) > now - STATS_SECONDS:
        return stats_cache["value"]
    searches = {name: saved for name, saved, _ in saved_files()}
    seen = {(s.get("platform"), v.get("id")) for s in searches.values() for v in s.get("videos", []) if v.get("id")}
    value = {"videosScanned": len(seen), "searches": len(searches)}
    stats_cache.update(at=now, value=value)
    return value


@app.get("/api/suggest")
def suggest_queries(q: str = ""):
    """Past searches and client topics that contain what is being typed: pinned first, each once, at most 8."""
    needle = q.strip().lower()
    if not needle:
        return {"queries": []}
    files = list(saved_files())
    names = [s.get("query") for _, s, pinned in files if pinned] + [s.get("query") for _, s, pinned in files if not pinned]
    for c in load("clients") or []:
        names += [*(c.get("topics") or []), *c.get("examples", [])]
    out: list[str] = []
    for name in names:
        if isinstance(name, str) and needle in name.lower() and name.lower() not in {o.lower() for o in out}:
            out.append(name)
    return {"queries": out[:8]}


@app.get("/api/search", response_model=SearchResult)
def search(q: str = "", fresh: str = "", platform: str = "tiktok", cachedOnly: str = ""):
    query = q.strip()[:120]
    if not query:
        return error(400, "Type something to search.")
    if platform not in ("tiktok", "instagram", "youtube", "reddit", "x"):
        return error(400, "Search TikTok, Instagram, YouTube, Reddit or X.")
    if not TOKEN and platform != "youtube":
        return error(503, "Live search is off. Add APIFY_TOKEN to .env and restart the API.")
    if fresh != "1":
        cached = read_cache(query, platform)
        if cached:
            return {**cached, "cached": True}
    if cachedOnly == "1":  # the front end's poll for scores must never start a paid search
        # Not an error: a 404 would put a red line in the browser console on every Home load.
        return {"query": query, "platform": platform, "fetchedAt": 0, "videos": [], "cached": False}
    if platform == "youtube":
        return search_youtube(query)
    if not spend("apify", SEARCH_USD[platform], DAILY_APIFY_USD):
        return over_budget("Apify", DAILY_APIFY_USD, "DAILY_APIFY_USD")
    if platform == "x":
        return search_x(query)
    if platform == "instagram":
        return search_ig(query)
    medians, missing = {}, []
    try:
        if platform == "reddit":
            return search_reddit(query)  # subreddit medians are filled in the background
        videos = search_tiktok(query)
        # Accounts seen in the last week are scored now; up to AUTHORS_PER_SEARCH others later.
        authors = list(dict.fromkeys(v["author"] for v in videos if v["author"]))
        medians = saved_medians(authors)
        missing = [a for a in authors if a not in medians][:AUTHORS_PER_SEARCH]
        apply_medians(videos, medians)
    except Exception as e:
        print(f"[search] failed: {e}", flush=True)
        return error(502, f"TikTok search failed. Check the API terminal for details.", str(e))
    payload = {"query": query, "platform": platform, "fetchedAt": int(time.time() * 1000), "videos": videos,
               "mediansPending": bool(missing)}
    write_cache(payload)
    print(f'[search] {platform} "{query}" → {len(videos)} videos', flush=True)
    if missing:
        filling.add(cache_name(query, platform))
        background = copy.deepcopy(payload)  # the reply below must not change while it is filled
        in_background(lambda: fill_medians(background, medians, missing))
    return {**payload, "cached": False}


def types_file(query: str, platform: str) -> str:
    return cache_name(query, platform) + ".types"  # not *.json, so saved_files() never reads it as a search


def read_types(query: str, platform: str, fetched_at: int):
    """Saved content types of this search, or None. Pinned searches keep theirs next to them (in git, for offline
    demos); the rest sit in the cache folder. Types of an older fetch of the same search are not used."""
    for folder in (PINNED_DIR, CACHE_DIR):
        try:
            saved = json.loads((folder / types_file(query, platform)).read_text())
        except (OSError, ValueError):
            continue
        if isinstance(saved, dict) and saved.get("fetchedAt") == fetched_at and isinstance(saved.get("types"), dict):
            return saved["types"]
    return None


@app.get("/api/search/types", response_model=ContentTypes)
def search_types(q: str = "", platform: str = "tiktok"):
    """Content type of each video in a saved search. One cheap Claude call the first time, then free.
    Never starts a search: without a saved search the types are empty. The front end shows the results without types if this fails."""
    query = q.strip()[:120]
    if not query or platform not in ("tiktok", "instagram", "youtube", "reddit", "x"):
        return error(400, "Give a saved search and a platform.")
    saved = read_cache(query, platform)
    if not saved:
        return {"types": {}}  # not a 404: that would put a red line in the browser console
    known = read_types(query, platform, saved["fetchedAt"])
    if known is not None:
        return {"types": known}
    videos = saved["videos"][:60]
    if not videos:
        return {"types": {}}
    if not spend("claude", CLASSIFY_USD, DAILY_CLAUDE_USD):
        return over_budget("Claude", DAILY_CLAUDE_USD, "DAILY_CLAUDE_USD")
    try:
        types = assist.classify_content_types(videos)
    except Exception as e:
        return error(502, "Could not sort the videos by type.", str(e))
    CACHE_DIR.mkdir(exist_ok=True)
    target = CACHE_DIR / types_file(query, platform)
    partial = target.with_suffix(f".{threading.get_ident()}.tmp")
    partial.write_text(json.dumps({"fetchedAt": saved["fetchedAt"], "types": types}))
    os.replace(partial, target)
    return {"types": types}


# Clients and ideas are saved as whole lists, the way the front end already holds them.
# GET returns null until something is saved, so the front end keeps its sample data.
def migrate_medians(conn: sqlite3.Connection) -> None:
    """Add the baseline columns to a medians table made before they existed. Rows are kept as they are."""
    have = {row[1] for row in conn.execute("PRAGMA table_info(medians)")}
    for column, kind in (("n", "INTEGER"), ("base_from", "TEXT"), ("base_to", "TEXT")):
        if column not in have:
            conn.execute(f"ALTER TABLE medians ADD COLUMN {column} {kind}")


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    conn.execute("CREATE TABLE IF NOT EXISTS medians (author TEXT PRIMARY KEY, median REAL, fetched_at REAL NOT NULL)")
    migrate_medians(conn)
    for statement in workspaces.SCHEMA + auth.SCHEMA + publishing.SCHEMA + takes.SCHEMA + canvas.SCHEMA + editing.SCHEMA + generations.SCHEMA + renders.SCHEMA + recheck.SCHEMA:
        conn.execute(statement)
    auth.migrate(conn)
    publishing.migrate(conn)
    generations.migrate(conn)
    renders.migrate(conn)
    takes.migrate(conn)
    return conn


def load(key: str):
    with db() as conn:
        row = conn.execute("SELECT value FROM store WHERE key = ?", (key,)).fetchone()
    return json.loads(row[0]) if row else None


def save(key: str, items) -> None:
    if isinstance(items, dict):
        value = json.dumps({k: v.model_dump() for k, v in items.items()})
    else:
        value = json.dumps([i.model_dump(exclude_none=True) for i in items] if isinstance(items, list) else items.model_dump())
    with db() as conn:
        conn.execute("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)", (key, value))


@app.get("/api/clients", response_model=Optional[list[Client]], response_model_exclude_none=True)
def get_clients():
    return load("clients")


@app.put("/api/clients", response_model=list[Client], response_model_exclude_none=True)
def put_clients(clients: list[Client]):
    # The brand and the consistency kit belong to their own routes: ones carried by the request are dropped and the stored ones kept.
    with brand.lock:
        old = {c["id"]: c for c in load("clients") or []}
        for c in clients:
            c.brand = Brand(**old[c.id]["brand"]) if old.get(c.id, {}).get("brand") else None
            c.kit = Kit(**old[c.id]["kit"]) if old.get(c.id, {}).get("kit") else None
        save("clients", clients)
    return clients


def etag(rev: int) -> str:
    return f'"{rev}"'


@app.get("/api/ideas", response_model=Optional[list[SavedIdea]], response_model_exclude_none=True)
def get_ideas(response: Response):
    response.headers["ETag"] = etag(share.ideas_rev(load))
    return load("ideas")


# A PUT with If-Match must carry the revision its tab last read; an older one gets 409 with the current
# list, so a stale tab can't overwrite another tab's edit or delete an idea it never saw.
# Without If-Match the PUT works as before.
@app.put("/api/ideas", response_model=list[SavedIdea], response_model_exclude_none=True)
def put_ideas(ideas: list[SavedIdea], response: Response, if_match: Optional[str] = Header(None)):
    with share.ideas_lock:
        rev = share.ideas_rev(load)
        if if_match is not None and if_match.strip().removeprefix("W/").strip('"') != str(rev):
            current = [SavedIdea(**i).model_dump(exclude_none=True) for i in load("ideas") or []]
            return JSONResponse({"error": "The ideas changed somewhere else.", "ideas": current},
                                status_code=409, headers={"ETag": etag(rev)})
        # Annie may have decided since this tab last loaded; keep her newer answer.
        merged = share.merge_ideas(load("ideas"), [i.model_dump(exclude_none=True) for i in ideas])
        ideas = [SavedIdea(**i) for i in production.stamp_updated(load("ideas"), merged, int(time.time() * 1000))]
        save("ideas", ideas)
        response.headers["ETag"] = etag(share.bump_ideas_rev(db, load))
    return ideas


# Without these, saved ideas open in another browser have no video to show.
@app.get("/api/library", response_model=Optional[Library])
def get_library():
    return load("library")


@app.put("/api/library", response_model=Library)
def put_library(library: Library):
    save("library", library)
    return library


# Each client's last "Trending now" check, keyed by client id.
@app.get("/api/pulses", response_model=Optional[dict[str, Pulse]])
def get_pulses():
    return load("pulses")


@app.put("/api/pulses", response_model=dict[str, Pulse])
def put_pulses(pulses: dict[str, Pulse]):
    save("pulses", pulses)
    return pulses


# The approver's share link: /api/share (Daphne) and /api/review/<token> (Annie, no login).
def session_cookie_secure(request: Request) -> bool:
    return request.headers.get("x-forwarded-proto", "").lower() == "https" or request.url.scheme == "https"


@app.post("/api/auth/login")
def auth_login(body: LoginRequest, request: Request):
    email, now = auth.normalise(body.email), time.time()
    if auth.too_many_failures(email, now):
        return error(429, "Too many tries. Wait a few minutes and try again.")
    with contextlib.closing(db()) as conn:
        user = auth.check_login(conn, email, body.password)
        if user is None:
            auth.note_failure(email, now)
            return error(401, "Wrong email or password.")
        token = auth.start_session(conn, user[0], now)
        conn.commit()
    auth.clear_failures(email)
    response = JSONResponse({"email": user[0], "name": user[1], "agency": user[2]})
    response.set_cookie(auth.COOKIE, token, max_age=auth.SESSION_SECONDS, path="/", httponly=True, samesite="lax",
                        secure=session_cookie_secure(request))
    return response


@app.post("/api/auth/logout", status_code=204)
def auth_logout(request: Request):
    with contextlib.closing(db()) as conn:
        auth.end_session(conn, request.cookies.get(auth.COOKIE))
        conn.commit()
    response = Response(status_code=204)
    response.delete_cookie(auth.COOKIE, path="/")
    return response


@app.get("/api/auth/me")
def auth_me(request: Request):
    # Reached with no account at all (the app then opens as before) or with a live session; the
    # middleware has already turned back an account-holder without one.
    with contextlib.closing(db()) as conn:
        if not auth.has_users(conn):
            return {"users": False}
        user = auth.session_user(conn, request.cookies.get(auth.COOKIE), time.time())
        conn.commit()
    if user is None:
        return error(401, "Sign in to continue.")
    return {"users": True, "email": user[0], "name": user[1], "agency": user[2]}


app.include_router(share.make_router(db, load, save, lambda c, t: cut_review.waiting_cuts(db, load, lambda: MEDIA_DIR, c, t)))
app.include_router(comments.make_router(load, save))
app.include_router(google_auth.make_router(db, session_cookie_secure))
app.include_router(publishing.make_router(db, load, lambda: MEDIA_DIR))
app.include_router(takes.make_router(db, load, lambda: MEDIA_DIR))
app.include_router(cleaning.make_router(db, load, lambda: MEDIA_DIR))
app.include_router(production.make_router(db))
def storyboard_budget(wallet: str, usd: float):
    """None when the paid call may go ahead, else the 429 to return. Frame images use the generation wallet."""
    if wallet == "image":
        return gen_budget("image", usd)
    return None if spend(wallet, usd, DAILY_CLAUDE_USD) else over_budget("Claude", DAILY_CLAUDE_USD, "DAILY_CLAUDE_USD")


def storyboard_refund(wallet: str, usd: float) -> None:
    gen_refund("image", usd)


app.include_router(storyboard.make_router(load, lambda: MEDIA_DIR, storyboard_budget, storyboard_refund))
app.include_router(shotlist.make_router(storyboard_budget))
app.include_router(agent.make_router(load, storyboard_budget, db))
app.include_router(renders.make_router(db, load, lambda: MEDIA_DIR))
GEN_WALLETS = {"image": ("gen_image", "DAILY_GEN_IMAGE_USD"), "video": ("gen_video", "DAILY_GEN_VIDEO_USD"),
               "voice": ("gen_voice", "DAILY_GEN_VOICE_USD")}


budget_lock = threading.Lock()


def gen_cap(kind: str) -> float:
    return globals()[GEN_WALLETS[kind][1]]  # looked up at call time, so a test can change the cap


def gen_budget(kind: str, usd: float, conn=None):
    """None when a generation of this kind may be paid for, else the 429 to return."""
    wallet, env = GEN_WALLETS[kind]
    cap = gen_cap(kind)
    if conn is None:
        if spend(wallet, usd, cap):
            return None
        left = remaining(wallet, cap)
    else:  # workspace confirm owns budget_lock and BEGIN IMMEDIATE on this connection
        key = f'spend:{today()}'
        row = conn.execute('SELECT value FROM store WHERE key=?', (key,)).fetchone()
        spent = json.loads(row[0]) if row else {}
        total = round(spent.get(wallet, 0) + usd, 4)
        if total <= cap:
            conn.execute('INSERT OR REPLACE INTO store (key,value) VALUES (?,?)',
                         (key, json.dumps({**spent, wallet: total})))
            return None
        left = round(max(0, cap - spent.get(wallet, 0)), 4)
    return error(429, f"Today's {kind} generation budget has US${left:.2f} left, and this needs US${usd:.2f}. "
                      f"The budget resets at midnight; to allow more, raise {env} in .env and restart the API.")


def gen_refund(kind: str, usd: float) -> None:
    refund(GEN_WALLETS[kind][0], usd)


def gen_remaining() -> dict:
    return {k: {"spent": round(gen_cap(k) - remaining(w, gen_cap(k)), 4), "cap": gen_cap(k)}
            for k, (w, _) in GEN_WALLETS.items()}


gen_router = generations.make_router(db, load, lambda: MEDIA_DIR, gen_budget, gen_refund, gen_remaining, confirmation_lock=budget_lock)
gen_jobs = gen_router.jobs
app.include_router(gen_router)
app.include_router(canvas.make_router(db, load))
app.include_router(workspaces.make_router(db, load))
app.include_router(editing.make_router(db, load, lambda: MEDIA_DIR, gen_router))
app.include_router(suggest.make_router(db, load, lambda: MEDIA_DIR))
app.include_router(finishing.make_router(db, load, lambda: MEDIA_DIR))
app.include_router(brand.make_router(load, save, lambda: MEDIA_DIR))
app.include_router(kit.make_router(load, save, lambda: MEDIA_DIR))
app.include_router(cut_review.make_router(db, load, lambda: MEDIA_DIR))
app.include_router(recheck.make_router(db, lambda u: is_video_link(u)))
publishing.seed_demo(db)


def today() -> str:
    return time.strftime("%Y-%m-%d")  # this machine's local day


def spend(wallet: str, usd: float, cap: float) -> bool:
    """Count a paid call against today's cap. Returns False, counting nothing, if it would go over."""
    key = f"spend:{today()}"
    with budget_lock:
        spent = load(key) or {}
        total = round(spent.get(wallet, 0) + usd, 4)  # 4 places: a Jev label costs less than a cent
        if total > cap:
            return False
        with db() as conn:
            conn.execute("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)",
                         (key, json.dumps({**spent, wallet: total})))
    print(f"[budget] {wallet} US${total:.4f} of US${cap:.2f} today", flush=True)
    return True


def refund(wallet: str, usd: float) -> None:
    """Take money back off today's count after a paid call that did not produce anything. Never below 0."""
    key = f"spend:{today()}"
    with budget_lock:
        spent = load(key) or {}
        total = round(max(0.0, spent.get(wallet, 0) - usd), 4)
        with db() as conn:
            conn.execute("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)",
                         (key, json.dumps({**spent, wallet: total})))
    print(f"[budget] {wallet} refunded US${usd:.4f}, now US${total:.4f} today", flush=True)


def remaining(wallet: str, cap: float) -> float:
    return round(max(0.0, cap - (load(f"spend:{today()}") or {}).get(wallet, 0)), 4)


def saved_searches(limit: int = 3) -> list[str]:
    """Queries of the pinned demo searches, which load without spending anything."""
    names = []
    for f in sorted(PINNED_DIR.glob("*.json")):
        try:
            q = json.loads(f.read_text()).get("query")
        except (OSError, ValueError):
            continue
        if q and q not in names:
            names.append(q)
    return names[:limit]


def over_budget(name: str, cap: float, env: str, unit: str = "US$") -> JSONResponse:
    print(f"[budget] {name} budget used up; to allow more, raise {env} in .env and restart the API.", flush=True)
    if cap <= 0:
        saved = saved_searches() if name == "Apify" else []
        names = ", ".join('"' + q + '"' for q in saved)
        hint = f" Try a saved search, like {names}." if saved else ""
        return error(429, f"New {name} work is turned off. Saved searches and finished breakdowns still work.{hint}")
    return error(429, f"Today's {name} budget ({unit}{cap:.2f}) is used up. Saved searches and finished "
                      "breakdowns still work, and the budget resets at midnight.")


# A breakdown takes minutes, so it runs in the background and the front end polls for progress.
jobs = Jobs()


X_STATUS = re.compile(r"https://(www\.|mobile\.)?(x|twitter)\.com/\w+/status/\d+")


def is_video_link(url: str) -> bool:
    return url.startswith(("https://www.tiktok.com/", "https://www.instagram.com/", "https://www.youtube.com/shorts/",
                           "https://youtube.com/shorts/", "https://www.reddit.com/r/", "https://v.redd.it/")) or bool(X_STATUS.match(url))


@app.post("/api/analyze", response_model=AnalyzeStarted)
def start_analyze(body: AnalyzeRequest):
    url = body.url.strip()
    if not is_video_link(url):
        return error(400, "Paste a TikTok, Instagram, YouTube Shorts, Reddit video or X link.")
    if jobs.will_run(url, body.force) and not spend("claude", ANALYZE_USD, DAILY_CLAUDE_USD):
        return over_budget("Claude", DAILY_CLAUDE_USD, "DAILY_CLAUDE_USD")
    args = (url, body.needs) if body.needs else (url,)
    return {"job": jobs.submit(*args, force=True) if body.force else jobs.submit(*args)}


@app.get("/api/analyze/{job_id}", response_model=AnalyzeJob, response_model_exclude_none=True)
def get_analyze(job_id: str):
    job = jobs.get(job_id)
    if not job:
        return error(404, "No breakdown with that id. Start one with POST /api/analyze.")
    return job


# Compare viral videos: a breakdown per video (free when it was done before), then one synthesis call.
compares = CompareJobs(jobs)


@app.post("/api/compare", response_model=CompareStarted)
def start_compare(body: CompareRequest):
    urls = list(dict.fromkeys(u.strip() for u in body.urls))
    if len(urls) < 2:
        return error(400, "Add at least 2 different videos to compare.", code="few")
    if len(urls) > 5:
        return error(400, "Compare up to 5 videos at a time.", code="many")
    bad = [u for u in urls if not is_video_link(u)]
    if bad:
        return error(400, f"That is not a TikTok, Instagram, YouTube Shorts, Reddit video or X link: {bad[0]}", code="link")
    current = compares.get(compare_id_for(urls))
    if not current or current.status == "failed":
        new = [u for u in urls if not (jobs.get(job_id_for(u)) and jobs.get(job_id_for(u)).status != "failed")]
        if not spend("claude", ANALYZE_USD * len(new) + COMPARE_USD, DAILY_CLAUDE_USD):
            return over_budget("Claude", DAILY_CLAUDE_USD, "DAILY_CLAUDE_USD")
    return {"job": compares.submit(urls)}


@app.get("/api/compare/{job_id}", response_model=CompareJob, response_model_exclude_none=True)
def get_compare(job_id: str):
    job = compares.get(job_id)
    if not job:
        return error(404, "No comparison with that id. Start one with POST /api/compare.")
    return job


@app.post("/api/like", response_model=AnalyzeStarted)
def start_like(body: LikeRequest):
    """Find videos like a pasted link: starts (or reuses) the breakdown of that link."""
    return start_analyze(AnalyzeRequest(url=body.url))


@app.get("/api/like/{job_id}", response_model=LikeJob, response_model_exclude_none=True)
def get_like(job_id: str):
    job = jobs.get(job_id)
    if not job:
        return error(404, "No search with that id. Start one with POST /api/like.")
    if job.status != "done" or not job.result:
        return {"status": job.status, "step": job.step, "error": job.error}
    breakdown = job.result.model_dump()
    saved = analyze.JOBS_DIR / job_id / "like.json"
    if saved.exists():
        terms = json.loads(saved.read_text(encoding="utf-8"))
    else:
        if not spend("claude", LIKE_USD, DAILY_CLAUDE_USD):
            return over_budget("Claude", DAILY_CLAUDE_USD, "DAILY_CLAUDE_USD")
        try:
            keywords, name = assist.like_terms(breakdown)
        except Exception as e:
            return error(502, "Could not read what this video is about. Try again.", str(e))
        terms = {"keywords": keywords, "formatName": name}
        saved.write_text(json.dumps(terms, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"status": "done", "step": "Done", "breakdown": breakdown, **terms}


@app.post("/api/like-image", response_model=LikeImageResult)
def like_image(body: LikeImageRequest):
    """Find videos like a screenshot: Claude describes what it shows. Free for a picture seen before."""
    data = body.image.strip()
    if len(data) * 3 // 4 > MAX_IMAGE_BYTES + 3:  # cheap check before decoding a huge string
        return error(413, "That image is too big. Use one under 5 MB.")
    try:
        raw = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError):
        return error(400, "That image could not be read. Try another file.")
    if len(raw) > MAX_IMAGE_BYTES:
        return error(413, "That image is too big. Use one under 5 MB.")
    key = f"likeimg:{hashlib.sha1(raw).hexdigest()}"
    cached = load(key)
    if cached:
        return cached
    if not spend("claude", IMAGE_USD, DAILY_CLAUDE_USD):
        return over_budget("Claude", DAILY_CLAUDE_USD, "DAILY_CLAUDE_USD")
    try:
        keywords, name, description = assist.like_image_terms(data, body.mediaType)
    except Exception as e:
        return error(502, "Could not read that image. Try again.", str(e))
    result = {"keywords": keywords, "formatName": name, "description": description}
    with db() as conn:
        conn.execute("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)", (key, json.dumps(result)))
    return result


@app.post("/api/answer", response_model=AnswerResult)
def answer_search(body: AnswerRequest):
    """Answers a search from the real videos it found. Free for the same search and videos seen before."""
    key = "answer:" + hashlib.sha1(json.dumps([body.query, [v.id for v in body.videos]]).encode()).hexdigest()
    cached = load(key)
    if cached:
        return cached
    if not spend("claude", ASK_USD, DAILY_CLAUDE_USD):
        return over_budget("Claude", DAILY_CLAUDE_USD, "DAILY_CLAUDE_USD")
    try:
        lines = assist.answer_lines(body.query, [v.model_dump(exclude={"id"}, exclude_none=True) for v in body.videos])
    except Exception as e:
        return error(502, "Could not write an answer. Try again.", str(e))
    result = {"lines": lines, "basis": f"Written from the {len(body.videos)} real videos below"}
    with db() as conn:
        conn.execute("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)", (key, json.dumps(result)))
    return result


@app.post("/api/needs", response_model=NeedsResult)
def check_needs(body: NeedsRequest):
    """Fills in `needs` on a breakdown saved before needs existed. Free once it has been filled."""
    saved = analyze.JOBS_DIR / job_id_for(body.url.strip()) / "breakdown.json"
    if not saved.exists():
        return error(404, "No breakdown for that video yet. Break it down first.")
    data = json.loads(saved.read_text(encoding="utf-8"))
    if "needs" in data:
        return {"needs": data["needs"]}
    if not spend("claude", NEEDS_USD, DAILY_CLAUDE_USD):
        return over_budget("Claude", DAILY_CLAUDE_USD, "DAILY_CLAUDE_USD")
    try:
        needs = assist.pick_needs(data, body.needs or DEFAULT_NEEDS)
    except Exception as e:
        return error(502, "Could not check what this video needs. Try again.", str(e))
    saved.write_text(json.dumps({**data, "needs": needs}, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"needs": needs}


# A channel summary takes minutes to an hour, so it also runs in the background and is polled.
CHANNEL_CAPS = {"claude": DAILY_CLAUDE_USD, "jev": DAILY_JEV_USD, "scrapecreators": DAILY_SCRAPECREATORS_CREDITS}


def budget_left(wallet: str, cap: float) -> float:
    return cap - (load(f"spend:{today()}") or {}).get(wallet, 0)


channel_jobs = channels.ChannelJobs(lambda w, n: spend(w, n, CHANNEL_CAPS[w]),
                                    lambda w: budget_left(w, CHANNEL_CAPS[w]))


@app.post("/api/channel", response_model=ChannelStarted)
def start_channel(body: ChannelRequest):
    if not 1 <= body.maxVideos <= channels.MAX_VIDEOS:
        return error(400, f"Decode between 1 and {channels.MAX_VIDEOS} videos.")
    try:
        handle = channels.normalise(body.platform, body.handle)
        return {"job": channel_jobs.submit(body.platform, handle, body.maxVideos)}
    except channels.BadChannel as e:
        return error(400, str(e), code=e.code)
    except ValueError as e:
        return error(400, str(e))
    except channels.OverBudget as e:
        name, env = channels.WALLETS[e.wallet]
        return over_budget(name, CHANNEL_CAPS[e.wallet], env, "" if e.wallet == "scrapecreators" else "US$")


@app.get("/api/channel/{job_id}", response_model=ChannelJob, response_model_exclude_none=True)
def get_channel(job_id: str):
    job = channel_jobs.get(job_id)
    if not job:
        return error(404, "No channel summary with that id. Start one with POST /api/channel.")
    return job


@app.get("/api/channel/{job_id}/thumb/{name}")
def get_channel_thumb(job_id: str, name: str):
    path = channels.thumb_path(job_id, name)
    if not path:
        return error(404, "No such thumbnail.")
    return FileResponse(path, media_type="image/jpeg")


@app.get("/api/cover/{name}")
def get_cover(name: str):
    path = covers.find([PINNED_COVERS_DIR, COVERS_DIR], name)
    if not path:
        return error(404, "No such cover.")
    return FileResponse(path, media_type=covers.media_type(path))


# Last route, so it never shadows the API: built files by path, and the app for anything else.
@app.get("/{path:path}", include_in_schema=False)
def front_end(path: str):
    if path.startswith("api/"):
        return error(404, "No such API route. See /docs.")
    target = (DIST_DIR / path).resolve()
    if path and target.is_file() and target.is_relative_to(DIST_DIR.resolve()):
        return FileResponse(target)
    index = DIST_DIR / "index.html"
    if not index.exists():
        return error(404, "The app isn't built yet. Run npm run build in trend-finder/.")
    return FileResponse(index)


def pin(query: str, platform: str = "tiktok") -> None:
    src = CACHE_DIR / cache_name(query, platform)
    if not src.exists():
        sys.exit(f'No cached search for "{query}". Search it in the app first.')
    PINNED_DIR.mkdir(exist_ok=True)
    shutil.copy(src, PINNED_DIR / src.name)
    print(f'Pinned "{query}": it will load without Apify or the internet.')


def localize_pins() -> None:
    """localize-pins: save the covers of every pinned search into pinned/covers/ (commit them) and point
    the pins at them. Run it while the pins' cover links still work; it keeps links it cannot fetch."""
    for f in sorted(PINNED_DIR.glob("*.json")):
        payload = json.loads(f.read_text())
        saved = covers.localize(payload, PINNED_COVERS_DIR)
        left = sum(1 for v in payload["videos"] if not (v.get("cover") or "").startswith(covers.URL_PREFIX))
        f.write_text(json.dumps(payload))
        print(f'{payload["platform"]} "{payload["query"]}": saved {saved} new covers, {left} still remote')


def refetch(query: str, platform: str = "tiktok") -> None:
    """Fresh search with account baselines, then pin it. Goes through search(), so every spend cap applies."""
    global in_background
    if platform not in ("tiktok", "instagram"):
        sys.exit("refetch supports tiktok and instagram.")
    query = query.strip()[:120]
    original, in_background = in_background, lambda fill: fill()  # medians must finish before we pin
    try:
        result = search(query, fresh="1", platform=platform)
    finally:
        in_background = original
    if isinstance(result, JSONResponse):
        sys.exit(result.body.decode())
    videos = json.loads((CACHE_DIR / cache_name(query, platform)).read_text())["videos"]
    scored = sum(1 for v in videos if v.get("outlier") is not None)
    if videos and scored == 0:  # never replace a pin with a baseline-less one
        sys.exit(f"medians failed or over budget: scored 0 of {len(videos)}; not pinned")
    pin(query, platform)
    print(f"scored {scored} of {len(videos)} videos; baseline details on {sum(1 for v in videos if v.get('medianN'))}")


def add_user(args: list[str]) -> None:
    """add-user <email> "<name>" "<agency>" [--password-stdin]: asks for the password twice, unless it comes on stdin."""
    stdin = "--password-stdin" in args
    args = [a for a in args if a != "--password-stdin"]
    if len(args) != 3:
        sys.exit('Usage: python backend/server.py add-user <email> "<name>" "<agency>" [--password-stdin]')
    if stdin:
        password = sys.stdin.readline().rstrip("\r\n")
    else:
        password = getpass.getpass("Password: ")
        if getpass.getpass("Password again: ") != password:
            sys.exit("The passwords don't match.")
    try:
        with contextlib.closing(db()) as conn, conn:
            auth.create_user(conn, args[0], args[1], args[2], password)
    except ValueError as e:
        sys.exit(str(e))
    print(f"Added {auth.normalise(args[0])}. They can sign in now.")


if __name__ == "__main__":
    platforms = ["tiktok", "instagram", "youtube", "reddit", "x"]
    if len(sys.argv) in (3, 4) and sys.argv[1] == "pin" and (sys.argv[3:] == [] or sys.argv[3] in platforms):
        pin(sys.argv[2].strip()[:120], *sys.argv[3:])
    elif len(sys.argv) in (3, 4) and sys.argv[1] == "refetch" and (sys.argv[3:] == [] or sys.argv[3] in platforms[:2]):
        refetch(sys.argv[2], *sys.argv[3:])
    elif len(sys.argv) == 2 and sys.argv[1] == "localize-pins":
        localize_pins()
    elif len(sys.argv) >= 2 and sys.argv[1] == "add-user":
        add_user(sys.argv[2:])
    else:
        sys.exit(f'Usage: python backend/server.py pin "<search>" [{"|".join(platforms)}]\n'
                 '       python backend/server.py refetch "<search>" [tiktok|instagram]\n'
                 '       python backend/server.py localize-pins\n'
                 '       python backend/server.py add-user <email> "<name>" "<agency>"')

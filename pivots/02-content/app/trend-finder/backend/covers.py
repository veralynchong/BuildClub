"""Cover images saved next to the search cache. Platforms hand out signed CDN links that expire after a
few days (TikTok answers 403 afterwards), so a cached or pinned search would lose its pictures. Each
cover is downloaded once and the video points at /api/cover/<platform>-<id>.jpg instead."""

import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable, Optional

COVER = re.compile(r"((?:tiktok|instagram|x|youtube|reddit)-[A-Za-z0-9_-]+)\.jpg")  # letters, digits, _ and - only
URL_PREFIX = "/api/cover/"
MAX_BYTES = 5_000_000
TIMEOUT_S = 8
WORKERS = 8


def download(url: str) -> Optional[bytes]:
    """The image behind a URL, or None when it is gone, slow, too big or not an image."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            if not resp.headers.get("Content-Type", "").startswith("image/"):
                return None
            data = resp.read(MAX_BYTES + 1)
    except Exception:
        return None
    return data if 0 < len(data) <= MAX_BYTES else None


def file_name(video: dict, platform: str) -> Optional[str]:
    name = f"{platform}-{video.get('id')}.jpg"
    return name if COVER.fullmatch(name) else None


def media_type(path: Path) -> str:
    head = path.read_bytes()[:12]
    if head.startswith(b"\x89PNG"):
        return "image/png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def find(folders: list[Path], name: str) -> Optional[Path]:
    """The saved cover for a name like 'tiktok-7123.jpg', or None."""
    if not COVER.fullmatch(name):
        return None
    for folder in folders:
        if (folder / name).is_file():
            return folder / name
    return None


def localize(payload: dict, folder: Path, fetch: Optional[Callable[[str], Optional[bytes]]] = None) -> int:
    """Save each video's cover into folder and point the video at this API. A cover that cannot be
    fetched keeps its original URL. Returns how many covers were saved just now."""
    fetch = fetch or download
    todo = []
    for v in payload.get("videos", []):
        cover, name = v.get("cover") or "", file_name(v, payload.get("platform", ""))
        if not name or cover.startswith(URL_PREFIX):
            continue
        if (folder / name).is_file():
            v["cover"] = URL_PREFIX + name
        elif cover.startswith("http"):
            todo.append((v, name, cover))
    if not todo:
        return 0
    folder.mkdir(parents=True, exist_ok=True)

    def save(job):
        v, name, url = job
        data = fetch(url)
        if data:
            partial = folder / f"{name}.tmp"
            partial.write_bytes(data)
            partial.replace(folder / name)
            v["cover"] = URL_PREFIX + name
        return bool(data)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        return sum(pool.map(save, todo))

"""Provider adapters for generated media: mock (free), fal (queue API) and Gemini (images), behind one
interface, plus fetch_media, the safe download helper. All HTTP goes through an injectable `Http`.

Errors: ProviderError means the provider explicitly refused or reported failure (or returned bad media), so
the caller may refund. ResultLost means a request was already sent and we lost track of it (no answer to a
submit, a 4xx or missing key while polling, Gemini's image gone after a restart): it may have been charged,
so the caller must not refund and must not call it a plain failure. A network error, 5xx, 408 or 429 while
polling is not an error, it is `running`."""

import base64
import json
import os
import random
import re
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal, Optional, Protocol
from urllib.parse import urlparse

import cutting
import storyboard

Http = Callable[[str, str, dict, Optional[bytes]], tuple[int, dict, bytes]]

MOCK_DELAY_S = float(os.environ.get("MOCK_GEN_DELAY_S", 2))
MOCK_FAILED = "Mock failure (the prompt asked for one)."
NOT_MEDIA = "The model returned something that isn't an image/video."
TOO_LARGE = "The model returned a file over the size limit."
REFUSED = "The model provider didn't accept this request."
NO_IMAGE = "The model didn't return an image."
NO_KEY = "This model isn't set up yet."
MAX_BYTES = {"image": 20 * 1024 * 1024, "video": 200 * 1024 * 1024}
HTTP_TIMEOUT_S = 60
GEMINI_TIMEOUT_S = 120  # generateContent is synchronous, so it can take a while
FAL_QUEUE = "https://queue.fal.run/"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
ASPECT = "9:16"
RETRY_STATUS = (408, 429)  # polling again later may work


class ProviderError(Exception):
    """The provider refused or reported failure. Safe to show (the text is ours); refundable."""


class ResultLost(Exception):
    """A request that may have been charged has no result any more. Not a ProviderError: do not refund."""


class _Transient(Exception):
    """A network error or 5xx: the thing may still work later."""


class _NetworkError(_Transient):
    """No answer at all (timeout, connection lost): a request already sent may or may not have been charged."""


@dataclass
class Job:
    model: dict
    prompt: str
    start: Optional[Path]
    references: list
    duration: Optional[int]
    scratch: Optional[Path] = None  # a folder the mock may keep temp files in


@dataclass
class Poll:
    state: Literal["running", "done", "failed"]
    data: Optional[bytes] = None
    ext: Optional[str] = None
    error: Optional[str] = None


class Adapter(Protocol):
    def submit(self, job: Job) -> str: ...  # the request id, enough to poll again after a restart

    def poll(self, job: Job, request_id: str) -> Poll: ...


def default_http(method: str, url: str, headers: dict, body: Optional[bytes]) -> tuple[int, dict, bytes]:
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    timeout = GEMINI_TIMEOUT_S if urlparse(url).hostname == "generativelanguage.googleapis.com" else HTTP_TIMEOUT_S
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read(MAX_BYTES["video"] + 1)
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read(1 << 20)


def log_provider(what: str, status: int, body: bytes) -> None:
    print(f"[gen] {what}: HTTP {status} {body[:300]!r}", flush=True)  # raw provider text stays in the log


def call(http: Http, method: str, url: str, headers: dict, body: Optional[bytes] = None) -> tuple[int, dict, bytes]:
    """One request. A network error raises _NetworkError and a 5xx raises _Transient; everything else comes back."""
    try:
        status, resp_headers, data = http(method, url, headers, body)
    except Exception as e:
        print(f"[gen] {method} {urlparse(url).netloc}: {type(e).__name__}", flush=True)
        raise _NetworkError() from e
    if status >= 500:
        log_provider(f"{method} {urlparse(url).netloc}", status, data)
        raise _Transient()
    return status, resp_headers, data


def sniff(head: bytes) -> Optional[tuple[str, str]]:
    """(kind, ext) from the file header, or None when it is not a PNG, JPEG, WebP or MP4."""
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", "png"
    if head.startswith(b"\xff\xd8\xff"):
        return "image", "jpg"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image", "webp"
    if head[4:8] == b"ftyp":
        return "video", "mp4"
    return None


def check_media(data: bytes, kind: str) -> tuple[bytes, str]:
    found = sniff(data[:16])
    if found is None or found[0] != kind:
        raise ProviderError(NOT_MEDIA)
    if len(data) > MAX_BYTES[kind]:
        raise ProviderError(TOO_LARGE)
    return data, found[1]


def fetch_media(http: Http, url: str, kind: str) -> tuple[bytes, str]:
    """Download a provider's output. Only https; the header must match `kind`; capped at 20 MB (image) or
    200 MB (video). A 4xx or wrong content is a ProviderError; a network error or 5xx raises _Transient."""
    if urlparse(url).scheme != "https":
        raise ProviderError(NOT_MEDIA)
    status, _headers, data = call(http, "GET", url, {})
    if status != 200:
        log_provider("download", status, data)
        raise ProviderError(NOT_MEDIA)
    return check_media(data, kind)


def data_uri(path: Path) -> str:
    data = Path(path).read_bytes()
    found = sniff(data[:16])
    if found is None or found[0] != "image":
        raise ProviderError("An input image isn't a PNG, JPEG or WebP file.")
    mime = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}[found[1]]
    return f"data:{mime};base64,{base64.b64encode(data).decode()}"


def key_from(env_name: str) -> str:
    key = os.environ.get(env_name, "")
    if not key:
        raise ProviderError(NO_KEY)
    return key


def dig(obj, path: str):
    """obj at a path like "images[0].url" or "video.url", or None."""
    for part in re.findall(r"[^.\[\]]+", path):
        try:
            obj = obj[int(part)] if isinstance(obj, list) else obj[part]
        except (KeyError, IndexError, ValueError, TypeError):
            return None
    return obj


def json_body(data: bytes) -> dict:
    try:
        out = json.loads(data)
    except ValueError:
        return {}
    return out if isinstance(out, dict) else {}


class MockAdapter:
    """The free provider, same behaviour as P1: a delay, `#fail` in the prompt, MOCK_GEN_FAIL_RATE,
    an SVG for images and an ffmpeg test pattern with a sine tone for video."""

    def __init__(self, http: Http):
        pass

    def submit(self, job: Job) -> str:
        return f"mock-{uuid.uuid4().hex}"

    def poll(self, job: Job, request_id: str) -> Poll:
        time.sleep(MOCK_DELAY_S)
        rate = float(os.environ.get("MOCK_GEN_FAIL_RATE", 0) or 0)
        if "#fail" in job.prompt or (rate > 0 and random.random() < rate):
            return Poll("failed", error=MOCK_FAILED)
        if job.model["kind"] == "image":
            return Poll("done", data=storyboard.placeholder_svg("body", job.prompt, "", 0).encode(), ext="svg")
        duration = job.duration or job.model["durations"][0]
        folder = job.scratch
        if folder is not None:
            folder.mkdir(parents=True, exist_ok=True)
        part = Path(tempfile.mkdtemp()) / "m.mp4" if folder is None else folder / f"{request_id}.part.mp4"
        try:
            r = cutting.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30",
                             "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", str(duration),
                             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-g", "30", "-keyint_min", "30",
                             "-sc_threshold", "0", "-c:a", "aac", "-b:a", "128k", "-shortest",
                             "-movflags", "+faststart", str(part)])
            if r.returncode != 0:
                print(f"[gen] {request_id} ffmpeg failed: {r.stderr.strip()[-500:]}", flush=True)
                raise ProviderError("The mock video failed. Try again.")
            return Poll("done", data=part.read_bytes(), ext="mp4")
        finally:
            part.unlink(missing_ok=True)
            if folder is None:
                part.parent.rmdir()


FAL_DEFAULTS = {"prompt": "prompt", "start": "image_url", "references": "image_urls", "aspect": "aspect_ratio",
                "duration": "duration", "output": "images[0].url"}


class FalAdapter:
    """fal queue API. Which body field each of our inputs goes to comes from the model's `params`."""

    def __init__(self, http: Http):
        self._http = http

    def _headers(self) -> dict:
        return {"Authorization": f"Key {key_from('FAL_KEY')}", "Content-Type": "application/json"}

    def submit(self, job: Job) -> str:
        model = job.model
        p = {**FAL_DEFAULTS, **(model.get("params") or {})}
        body = {p["prompt"]: job.prompt}
        if job.start is not None:
            if not p["start"]:
                raise ProviderError("This model doesn't take a start frame.")
            body[p["start"]] = data_uri(job.start)
        if job.references:
            if not p["references"]:
                raise ProviderError("This model doesn't take reference images.")
            body[p["references"]] = [data_uri(r) for r in job.references]
        if p["aspect"]:
            body[p["aspect"]] = (p.get("aspectValues") or {}).get(ASPECT, ASPECT)
        if job.duration is not None and p["duration"]:
            fmt = model.get("durationFormat")
            body[p["duration"]] = (str(job.duration) if fmt == "string"
                                   else f"{job.duration}s" if fmt == "seconds-s" else job.duration)
        body.update(model.get("fixed") or {})
        endpoint = model.get("endpointWithRefs") if job.references and model.get("endpointWithRefs") \
            else model["endpoint"]
        try:
            status, _h, data = call(self._http, "POST", FAL_QUEUE + endpoint, self._headers(),
                                    json.dumps(body).encode())
        except _NetworkError:  # sent, no answer: it may have been queued and charged
            raise ResultLost("fal didn't answer the submit.")
        except _Transient:
            raise ProviderError(REFUSED)
        reply = json_body(data)
        if status >= 300 or not (reply.get("status_url") and reply.get("response_url")):
            log_provider("fal submit", status, data)
            raise ProviderError(REFUSED)
        return json.dumps({"id": reply.get("request_id"), "status_url": reply["status_url"],
                           "response_url": reply["response_url"]})

    @staticmethod
    def _fal_url(url) -> str:
        parsed = urlparse(url) if isinstance(url, str) else None
        if parsed is None or parsed.scheme != "https" or parsed.hostname != "queue.fal.run":
            raise ResultLost("The saved fal request can't be polled.")
        return url

    def poll(self, job: Job, request_id: str) -> Poll:
        """A request was sent, so only an explicit failure is a ProviderError. Anything else that stops us
        from learning the outcome (a 4xx, a missing key, an unusable id) is ResultLost: no refund."""
        try:
            ids = json.loads(request_id)
            status_url, response_url = self._fal_url(ids["status_url"]), self._fal_url(ids["response_url"])
        except (ValueError, KeyError, TypeError):
            raise ResultLost("The saved fal request can't be polled.")
        try:
            headers = self._headers()
        except ProviderError:
            raise ResultLost("The fal key is missing, so the request can't be polled.")
        try:
            status, _h, data = call(self._http, "GET", status_url, headers)
            if status in RETRY_STATUS:
                return Poll("running")
            if status >= 300:
                log_provider("fal status", status, data)
                raise ResultLost("fal wouldn't report the request.")
            state = json_body(data)
            if state.get("error"):
                print(f"[gen] fal reported an error: {str(state.get('error'))[:300]}", flush=True)
                return Poll("failed", error="The model reported a failure.")
            if state.get("status") != "COMPLETED":
                return Poll("running")
            status, _h, data = call(self._http, "GET", response_url, headers)
            if status in RETRY_STATUS:
                return Poll("running")
            if status >= 300:
                log_provider("fal result", status, data)
                raise ResultLost("fal wouldn't return the result.")
            url = dig(json_body(data), (job.model.get("params") or {}).get("output") or FAL_DEFAULTS["output"])
            if not isinstance(url, str):
                log_provider("fal result without media", status, data)
                raise ResultLost("fal completed without a media url.")
            media, ext = fetch_media(self._http, url, job.model["kind"])
            return Poll("done", data=media, ext=ext)
        except _Transient:
            return Poll("running")


class GeminiAdapter:
    """Gemini image models over generateContent. The call is synchronous: submit does the work and keeps
    the image in memory (shared by every adapter object) until poll takes it. After a restart the image is
    gone, and poll raises ResultLost."""

    _results: dict = {}

    def __init__(self, http: Http):
        self._http = http

    def submit(self, job: Job) -> str:
        if job.start is not None:
            raise ProviderError("This model doesn't take a start frame.")
        parts = [{"text": job.prompt}]
        for ref in job.references:
            mime, b64 = data_uri(ref)[5:].split(";base64,")
            parts.append({"inline_data": {"mime_type": mime, "data": b64}})
        body = {"contents": [{"parts": parts}],
                "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": ASPECT}}}
        headers = {"x-goog-api-key": key_from("GEMINI_API_KEY"), "Content-Type": "application/json"}
        url = f"{GEMINI_BASE}{job.model['endpoint']}:generateContent"
        try:
            status, _h, data = call(self._http, "POST", url, headers, json.dumps(body).encode())
        except _NetworkError:  # sent, no answer: Gemini may have made (and charged for) the image
            raise ResultLost("Gemini didn't answer.")
        except _Transient:
            raise ProviderError(REFUSED)
        if status >= 300:
            log_provider("gemini", status, data)
            raise ProviderError(REFUSED)
        reply = json_body(data)
        for candidate in reply.get("candidates") or []:
            for part in (candidate.get("content") or {}).get("parts") or []:
                inline = part.get("inlineData") or part.get("inline_data")
                if isinstance(inline, dict) and inline.get("data"):
                    try:
                        raw = base64.b64decode(inline["data"], validate=True)
                    except ValueError:
                        raise ProviderError(NOT_MEDIA)
                    image, ext = check_media(raw, "image")
                    rid = f"gemini-{uuid.uuid4().hex}"
                    self._results[rid] = (image, ext)
                    return rid
        log_provider("gemini without image", status, data)
        raise ProviderError(NO_IMAGE)

    def poll(self, job: Job, request_id: str) -> Poll:
        found = self._results.pop(request_id, None)
        if found is None:
            raise ResultLost("The image is no longer in memory.")
        return Poll("done", data=found[0], ext=found[1])


ADAPTERS = {"mock": MockAdapter, "fal": FalAdapter, "gemini": GeminiAdapter}


def adapter_for(provider: str, http: Http = default_http) -> Adapter:
    if provider not in ADAPTERS:
        raise ValueError(f"unknown provider {provider!r}")
    return ADAPTERS[provider](http)

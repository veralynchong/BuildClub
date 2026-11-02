"""Provider adapters (mock, fal, Gemini) and the media download helper, all against a fake Http."""

import base64
import json
import shutil

import pytest

import gen_providers as gp

PNG = b"\x89PNG\r\n\x1a\n" + b"\0" * 32
MP4 = b"\0\0\0\x18ftypmp42" + b"\0" * 32
FAL_Q = "https://queue.fal.run/"
STATUS_URL = "https://queue.fal.run/fal-ai/x/requests/r1/status"
RESULT_URL = "https://queue.fal.run/fal-ai/x/requests/r1"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent"

IMAGE_MODEL = {"id": "seedream-4.5", "kind": "image", "provider": "fal", "endpoint": "fal/t2i",
               "endpointWithRefs": "fal/edit",
               "params": {"prompt": "prompt", "start": None, "references": "image_urls", "aspect": "image_size",
                          "aspectValues": {"9:16": "portrait_16_9"}, "duration": None, "output": "images[0].url"}}
VIDEO_MODEL = {"id": "kling", "kind": "video", "provider": "fal", "endpoint": "fal/video",
               "durationFormat": "string", "fixed": {"generate_audio": False},
               "params": {"prompt": "prompt", "start": "start_image_url", "references": None, "aspect": None,
                          "duration": "duration", "output": "video.url"}}
VEO_MODEL = {**VIDEO_MODEL, "id": "veo", "durationFormat": "seconds-s",
             "params": {**VIDEO_MODEL["params"], "start": "image_url", "aspect": "aspect_ratio"}}
GEMINI_MODEL = {"id": "nano", "kind": "image", "provider": "gemini", "endpoint": "gemini-3.1-flash-image"}


class FakeHttp:
    """Records every request; answers from a url -> response (or list of responses, or callable) map."""

    def __init__(self, routes=None):
        self.routes, self.calls = routes or {}, []

    def __call__(self, method, url, headers, body):
        self.calls.append({"method": method, "url": url, "headers": headers,
                           "body": json.loads(body) if body and body[:1] == b"{" else body})
        r = self.routes[(method, url)]
        if isinstance(r, list):
            r = r.pop(0) if len(r) > 1 else r[0]
        if isinstance(r, Exception):
            raise r
        return r


def jr(obj, status=200):
    return status, {"content-type": "application/json"}, json.dumps(obj).encode()


@pytest.fixture(autouse=True)
def keys(monkeypatch):
    monkeypatch.setenv("FAL_KEY", "fal-test-key")
    monkeypatch.setenv("GEMINI_API_KEY", "gem-test-key")


def png_file(tmp_path, name="a.png"):
    p = tmp_path / name
    p.write_bytes(PNG)
    return p


def submit_ok():
    return jr({"request_id": "r1", "status_url": STATUS_URL, "response_url": RESULT_URL})


def test_fal_submit_sends_key_aspect_and_data_uri(tmp_path):
    http = FakeHttp({("POST", FAL_Q + "fal/video"): submit_ok(), ("POST", FAL_Q + "fal/t2i"): submit_ok(),
                     ("POST", FAL_Q + "fal/edit"): submit_ok()})
    start = png_file(tmp_path)
    # video: start frame as a data URI, duration as a string, fixed fields merged, no aspect field
    rid = gp.adapter_for("fal", http).submit(gp.Job(VIDEO_MODEL, "a clip", start, [], 5))
    call = http.calls[0]
    assert call["headers"]["Authorization"] == "Key fal-test-key"
    assert call["body"]["prompt"] == "a clip" and call["body"]["duration"] == "5"
    assert call["body"]["generate_audio"] is False
    assert call["body"]["start_image_url"] == "data:image/png;base64," + base64.b64encode(PNG).decode()
    assert not any("aspect" in k or k == "image_size" for k in call["body"])
    assert "r1" in rid
    # veo: aspect field and "6s" duration
    http.routes[("POST", FAL_Q + "fal/video")] = submit_ok()
    gp.adapter_for("fal", http).submit(gp.Job(VEO_MODEL, "p", start, [], 6))
    assert http.calls[1]["body"]["aspect_ratio"] == "9:16" and http.calls[1]["body"]["duration"] == "6s"
    # image without refs: plain endpoint, mapped aspect value; with refs: the edit endpoint and image_urls
    gp.adapter_for("fal", http).submit(gp.Job(IMAGE_MODEL, "p", None, [], None))
    assert http.calls[2]["url"] == FAL_Q + "fal/t2i" and http.calls[2]["body"]["image_size"] == "portrait_16_9"
    gp.adapter_for("fal", http).submit(gp.Job(IMAGE_MODEL, "p", None, [start], None))
    assert http.calls[3]["url"] == FAL_Q + "fal/edit"
    assert http.calls[3]["body"]["image_urls"] == ["data:image/png;base64," + base64.b64encode(PNG).decode()]


def test_fal_submit_refuses_inputs_the_model_cannot_take(tmp_path):
    http = FakeHttp({("POST", FAL_Q + "fal/video"): submit_ok()})
    with pytest.raises(gp.ProviderError):
        gp.adapter_for("fal", http).submit(gp.Job(VIDEO_MODEL, "p", None, [png_file(tmp_path)], 5))
    assert http.calls == []


def test_fal_poll_states():
    rid = gp.adapter_for("fal", FakeHttp({("POST", FAL_Q + "fal/video"): submit_ok()})).submit(
        gp.Job(VIDEO_MODEL, "p", None, [], 5))
    job = gp.Job(VIDEO_MODEL, "p", None, [], 5)
    media = "https://v3.fal.media/files/out.mp4"
    http = FakeHttp({("GET", STATUS_URL): [jr({"status": "IN_QUEUE"}), jr({"status": "IN_PROGRESS"}),
                                           jr({"status": "COMPLETED"})],
                     ("GET", RESULT_URL): jr({"video": {"url": media}}),
                     ("GET", media): (200, {"content-type": "video/mp4"}, MP4)})
    ad = gp.adapter_for("fal", http)
    assert ad.poll(job, rid).state == "running"
    assert ad.poll(job, rid).state == "running"
    done = ad.poll(job, rid)
    assert (done.state, done.data, done.ext) == ("done", MP4, "mp4")
    # the key goes to fal, never to the media host
    assert all("Authorization" in c["headers"] for c in http.calls[:4]) and "Authorization" not in http.calls[-1]["headers"]


def test_fal_completed_with_error_is_failed():
    rid = json.dumps({"id": "r1", "status_url": STATUS_URL, "response_url": RESULT_URL})
    http = FakeHttp({("GET", STATUS_URL): jr({"status": "COMPLETED", "error": "bad", "error_type": "x"})})
    p = gp.adapter_for("fal", http).poll(gp.Job(VIDEO_MODEL, "p", None, [], 5), rid)
    assert p.state == "failed" and p.error and "bad" not in p.error


def test_fal_4xx_is_provider_error():
    http = FakeHttp({("POST", FAL_Q + "fal/video"): jr({"detail": "no credit"}, 403)})
    with pytest.raises(gp.ProviderError) as e:
        gp.adapter_for("fal", http).submit(gp.Job(VIDEO_MODEL, "p", None, [], 5))
    assert "no credit" not in str(e.value)
    # a 5xx at submit is also a ProviderError (the provider answered, nothing was queued)
    with pytest.raises(gp.ProviderError):
        gp.adapter_for("fal", FakeHttp({("POST", FAL_Q + "fal/video"): jr({}, 502)})).submit(
            gp.Job(VIDEO_MODEL, "p", None, [], 5))


def test_fal_submit_without_answer_is_result_lost():
    # sent, then a timeout: it may have been queued and charged, so no refund
    with pytest.raises(gp.ResultLost):
        gp.adapter_for("fal", FakeHttp({("POST", FAL_Q + "fal/video"): OSError("timed out")})).submit(
            gp.Job(VIDEO_MODEL, "p", None, [], 5))


def test_fal_poll_4xx_is_result_lost_but_429_and_408_retry():
    rid = json.dumps({"id": "r1", "status_url": STATUS_URL, "response_url": RESULT_URL})
    job = gp.Job(VIDEO_MODEL, "p", None, [], 5)
    for code in (400, 401, 403, 404):
        with pytest.raises(gp.ResultLost):
            gp.adapter_for("fal", FakeHttp({("GET", STATUS_URL): jr({}, code)})).poll(job, rid)
    for code in (408, 429):
        assert gp.adapter_for("fal", FakeHttp({("GET", STATUS_URL): jr({}, code)})).poll(job, rid).state == "running"
    http = FakeHttp({("GET", STATUS_URL): jr({"status": "COMPLETED"}), ("GET", RESULT_URL): jr({}, 404)})
    with pytest.raises(gp.ResultLost):
        gp.adapter_for("fal", http).poll(job, rid)
    http = FakeHttp({("GET", STATUS_URL): jr({"status": "COMPLETED"}), ("GET", RESULT_URL): jr({}, 429)})
    assert gp.adapter_for("fal", http).poll(job, rid).state == "running"


def test_fal_poll_without_key_is_result_lost(monkeypatch):
    monkeypatch.delenv("FAL_KEY")
    rid = json.dumps({"id": "r1", "status_url": STATUS_URL, "response_url": RESULT_URL})
    http = FakeHttp()
    with pytest.raises(gp.ResultLost):
        gp.adapter_for("fal", http).poll(gp.Job(VIDEO_MODEL, "p", None, [], 5), rid)
    assert http.calls == []


def test_fal_5xx_while_polling_is_running():
    rid = json.dumps({"id": "r1", "status_url": STATUS_URL, "response_url": RESULT_URL})
    job = gp.Job(VIDEO_MODEL, "p", None, [], 5)
    for bad in (jr({}, 503), OSError("timed out")):
        assert gp.adapter_for("fal", FakeHttp({("GET", STATUS_URL): bad})).poll(job, rid).state == "running"
    # also while fetching the result or the file
    media = "https://v3.fal.media/o.mp4"
    http = FakeHttp({("GET", STATUS_URL): jr({"status": "COMPLETED"}), ("GET", RESULT_URL): jr({}, 500)})
    assert gp.adapter_for("fal", http).poll(job, rid).state == "running"
    http = FakeHttp({("GET", STATUS_URL): jr({"status": "COMPLETED"}),
                     ("GET", RESULT_URL): jr({"video": {"url": media}}), ("GET", media): (502, {}, b"")})
    assert gp.adapter_for("fal", http).poll(job, rid).state == "running"


def test_fal_rejects_foreign_status_url():
    rid = json.dumps({"id": "r1", "status_url": "https://evil.example/s", "response_url": RESULT_URL})
    http = FakeHttp()
    with pytest.raises(gp.ResultLost):
        gp.adapter_for("fal", http).poll(gp.Job(VIDEO_MODEL, "p", None, [], 5), rid)
    assert http.calls == []


def test_fal_download_rejects_non_media():
    url = "https://v3.fal.media/x.mp4"
    for body in (b"<html>error</html>", b"", b"\0\0\0\x18ftyp"[:6]):
        http = FakeHttp({("GET", url): (200, {"content-type": "text/html"}, body)})
        with pytest.raises(gp.ProviderError, match="isn't an image/video"):
            gp.fetch_media(http, url, "video")
    # an image where a video is expected is refused too
    with pytest.raises(gp.ProviderError):
        gp.fetch_media(FakeHttp({("GET", url): (200, {}, PNG)}), url, "video")
    # 404 and non-https are refused
    with pytest.raises(gp.ProviderError):
        gp.fetch_media(FakeHttp({("GET", url): (404, {}, b"")}), url, "video")
    with pytest.raises(gp.ProviderError):
        gp.fetch_media(FakeHttp(), "http://v3.fal.media/x.mp4", "video")
    assert gp.fetch_media(FakeHttp({("GET", url): (200, {}, MP4)}), url, "video") == (MP4, "mp4")
    assert gp.fetch_media(FakeHttp({("GET", url): (200, {}, PNG)}), url, "image") == (PNG, "png")
    jpg, webp = b"\xff\xd8\xff\xe0" + b"\0" * 8, b"RIFF\0\0\0\0WEBP" + b"\0" * 8
    assert gp.fetch_media(FakeHttp({("GET", url): (200, {}, jpg)}), url, "image")[1] == "jpg"
    assert gp.fetch_media(FakeHttp({("GET", url): (200, {}, webp)}), url, "image")[1] == "webp"


def test_fal_download_size_cap(monkeypatch):
    monkeypatch.setattr(gp, "MAX_BYTES", {"image": 1000, "video": 5000})
    url = "https://v3.fal.media/big"
    with pytest.raises(gp.ProviderError, match="over the size limit"):
        gp.fetch_media(FakeHttp({("GET", url): (200, {}, PNG + b"\0" * 1000)}), url, "image")
    ok_image = PNG + b"\0" * (1000 - len(PNG))
    assert gp.fetch_media(FakeHttp({("GET", url): (200, {}, ok_image)}), url, "image")[1] == "png"
    # the video cap is larger
    assert gp.fetch_media(FakeHttp({("GET", url): (200, {}, MP4 + b"\0" * 2000)}), url, "video")[1] == "mp4"
    with pytest.raises(gp.ProviderError):
        gp.fetch_media(FakeHttp({("GET", url): (200, {}, MP4 + b"\0" * 5000)}), url, "video")


def test_size_caps_are_20mb_and_200mb():
    assert gp.MAX_BYTES == {"image": 20 * 1024 * 1024, "video": 200 * 1024 * 1024}


def gemini_reply(data=PNG, mime="image/png", key="inlineData"):
    return jr({"candidates": [{"content": {"parts": [
        {"text": "here"}, {key: {"mimeType" if key == "inlineData" else "mime_type": mime,
                                  "data": base64.b64encode(data).decode()}}]}}]})


def test_gemini_image_inline_data(tmp_path):
    http = FakeHttp({("POST", GEMINI_URL): gemini_reply()})
    ref = png_file(tmp_path)
    job = gp.Job(GEMINI_MODEL, "a tofu bar", None, [ref], None)
    ad = gp.adapter_for("gemini", http)
    rid = ad.submit(job)
    call = http.calls[0]
    assert call["headers"]["x-goog-api-key"] == "gem-test-key"
    parts = call["body"]["contents"][0]["parts"]
    assert parts[0] == {"text": "a tofu bar"}
    assert parts[1]["inline_data"] == {"mime_type": "image/png", "data": base64.b64encode(PNG).decode()}
    assert call["body"]["generationConfig"]["imageConfig"]["aspectRatio"] == "9:16"
    # a fresh adapter object still finds the cached result (the cache is shared), once
    p = gp.adapter_for("gemini", http).poll(job, rid)
    assert (p.state, p.data, p.ext) == ("done", PNG, "png")
    assert len(http.calls) == 1
    # snake_case inline_data in the reply works too
    http = FakeHttp({("POST", GEMINI_URL): gemini_reply(key="inline_data")})
    rid = gp.adapter_for("gemini", http).submit(job)
    assert gp.adapter_for("gemini", http).poll(job, rid).data == PNG


def test_gemini_refusal_is_provider_error():
    refusal = jr({"candidates": [{"content": {"parts": [{"text": "I can't draw that."}]}}]})
    for reply in (refusal, jr({"candidates": []}), jr({"promptFeedback": {"blockReason": "SAFETY"}}),
                  jr({"error": {"message": "bad key"}}, 400), jr({}, 503),
                  gemini_reply(data=b"<html>not an image</html>")):
        with pytest.raises(gp.ProviderError) as e:
            gp.adapter_for("gemini", FakeHttp({("POST", GEMINI_URL): reply})).submit(
                gp.Job(GEMINI_MODEL, "p", None, [], None))
        assert "I can't draw" not in str(e.value) and "bad key" not in str(e.value)


def test_gemini_timeout_is_result_lost_but_http_errors_are_provider_errors():
    with pytest.raises(gp.ResultLost):
        gp.adapter_for("gemini", FakeHttp({("POST", GEMINI_URL): TimeoutError("read timed out")})).submit(
            gp.Job(GEMINI_MODEL, "p", None, [], None))


def test_gemini_refuses_start_frame_before_any_call(tmp_path):
    http = FakeHttp()
    with pytest.raises(gp.ProviderError):
        gp.adapter_for("gemini", http).submit(gp.Job(GEMINI_MODEL, "p", png_file(tmp_path), [], None))
    assert http.calls == []


def test_gemini_call_gets_the_longer_timeout(monkeypatch):
    seen = []

    class Resp:
        status, headers = 200, {}
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self, n): return b"{}"

    monkeypatch.setattr(gp.urllib.request, "urlopen", lambda req, timeout: seen.append(timeout) or Resp())
    gp.default_http("POST", GEMINI_URL, {}, b"{}")
    gp.default_http("GET", STATUS_URL, {}, None)
    assert seen == [120, 60]


def test_gemini_poll_without_cached_result_is_result_lost():
    with pytest.raises(gp.ResultLost):
        gp.adapter_for("gemini", FakeHttp()).poll(gp.Job(GEMINI_MODEL, "p", None, [], None), "gemini-nope")
    assert not issubclass(gp.ResultLost, gp.ProviderError)  # a lost result must not be refunded


def test_missing_key_is_provider_error(monkeypatch):
    monkeypatch.delenv("FAL_KEY")
    with pytest.raises(gp.ProviderError):
        gp.adapter_for("fal", FakeHttp()).submit(gp.Job(VIDEO_MODEL, "p", None, [], 5))


def test_unknown_provider():
    with pytest.raises(ValueError):
        gp.adapter_for("nope")


MOCK_IMAGE = {"id": "mock-image", "kind": "image", "provider": "mock"}
MOCK_VIDEO = {"id": "mock-video", "kind": "video", "provider": "mock", "durations": [4, 6]}


def test_mock_adapter_keeps_p1_behaviour(tmp_path, monkeypatch):
    monkeypatch.setattr(gp, "MOCK_DELAY_S", 0)
    ad = gp.adapter_for("mock")
    job = gp.Job(MOCK_IMAGE, "a tofu bar", None, [], None)
    rid = ad.submit(job)
    assert rid.startswith("mock-")
    p = ad.poll(job, rid)
    assert p.state == "done" and p.ext == "svg" and p.data.startswith(b"<svg")
    # the prompt can ask for a failure; MOCK_GEN_FAIL_RATE=1 always fails
    bad = gp.Job(MOCK_IMAGE, "x #fail", None, [], None)
    p = ad.poll(bad, ad.submit(bad))
    assert p.state == "failed" and p.error == "Mock failure (the prompt asked for one)."
    monkeypatch.setenv("MOCK_GEN_FAIL_RATE", "1")
    assert ad.poll(job, ad.submit(job)).state == "failed"


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"), reason="needs ffmpeg")
def test_mock_adapter_video_spec(tmp_path, monkeypatch):
    import subprocess
    monkeypatch.setattr(gp, "MOCK_DELAY_S", 0)
    job = gp.Job(MOCK_VIDEO, "p", None, [], 4, scratch=tmp_path)
    ad = gp.adapter_for("mock")
    p = ad.poll(job, ad.submit(job))
    assert p.state == "done" and p.ext == "mp4"
    assert list(tmp_path.iterdir()) == []  # no temp file left behind
    f = tmp_path.parent / "out.mp4"
    f.write_bytes(p.data)
    out = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json",
                                     str(f)], capture_output=True, text=True).stdout)
    v = next(s for s in out["streams"] if s["codec_type"] == "video")
    a = next(s for s in out["streams"] if s["codec_type"] == "audio")
    assert (v["codec_name"], v["width"], v["height"], v["r_frame_rate"]) == ("h264", 1080, 1920, "30/1")
    assert a["codec_name"] == "aac" and abs(float(out["format"]["duration"]) - 4) < 0.1

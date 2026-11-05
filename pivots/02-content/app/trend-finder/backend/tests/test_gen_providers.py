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

ELEVEN_URL = "https://api.elevenlabs.io/v1/text-to-speech/voice1?output_format=mp3_44100_128"
MP3 = b"ID3\x04\0\0\0\0\0\0" + b"\0" * 32
VOICE_MODEL = {"id": "el", "kind": "voice", "provider": "elevenlabs", "endpoint": "eleven_multilingual_v2",
               "params": {"voiceId": "voice1"}}
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
    monkeypatch.setenv("ELEVENLABS_API_KEY", "el-test-key")
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
    assert gp.MAX_BYTES == {"image": 20 * 1024 * 1024, "video": 200 * 1024 * 1024, "voice": 20 * 1024 * 1024}


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
                  jr({"error": {"message": "bad key"}}, 400), jr({}, 503)):
        with pytest.raises(gp.ProviderError) as e:
            gp.adapter_for("gemini", FakeHttp({("POST", GEMINI_URL): reply})).submit(
                gp.Job(GEMINI_MODEL, "p", None, [], None))
        assert "I can't draw" not in str(e.value) and "bad key" not in str(e.value)


def test_gemini_unusable_image_data_is_file_unusable():
    assert not issubclass(gp.FileUnusable, gp.ProviderError)  # the provider answered: no refund
    bad_b64 = jr({"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "image/png", "data": "!!"}}]}}]})
    for reply in (gemini_reply(data=b"<html>not an image</html>"), gemini_reply(data=MP4), bad_b64):
        with pytest.raises(gp.FileUnusable):
            gp.adapter_for("gemini", FakeHttp({("POST", GEMINI_URL): reply})).submit(
                gp.Job(GEMINI_MODEL, "p", None, [], None))


def test_fal_file_problem_after_completed_is_file_unusable():
    rid = json.dumps({"id": "r1", "status_url": STATUS_URL, "response_url": RESULT_URL})
    job = gp.Job(VIDEO_MODEL, "p", None, [], 5)
    media = "https://v3.fal.media/o.mp4"
    for file_reply in ((404, {}, b""), (200, {}, b"<html>oops</html>"), (200, {}, PNG)):
        http = FakeHttp({("GET", STATUS_URL): jr({"status": "COMPLETED"}),
                         ("GET", RESULT_URL): jr({"video": {"url": media}}), ("GET", media): file_reply})
        with pytest.raises(gp.FileUnusable):
            gp.adapter_for("fal", http).poll(job, rid)


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


OPENROUTER_URL = "https://openrouter.ai/api/v1/images"
OPENROUTER_MODEL = {"id": "openrouter-nano-banana-2", "kind": "image", "provider": "openrouter",
                    "endpoint": "google/gemini-3.1-flash-image"}


def test_openrouter_image_request_and_result(tmp_path, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-test-key")
    http = FakeHttp({("POST", OPENROUTER_URL): jr({
        "data": [{"b64_json": base64.b64encode(PNG).decode()}], "usage": {"cost": 0.068}})})
    job = gp.Job(OPENROUTER_MODEL, "a tofu bar", None, [png_file(tmp_path)], None)
    rid = gp.adapter_for("openrouter", http).submit(job)
    sent = http.calls[0]
    assert sent["headers"]["Authorization"] == "Bearer or-test-key"
    assert sent["body"] == {
        "model": "google/gemini-3.1-flash-image", "prompt": "a tofu bar", "n": 1,
        "resolution": "1K", "aspect_ratio": "9:16", "provider": {"allow_fallbacks": False},
        "input_references": [{"type": "image_url", "image_url": {"url": gp.data_uri(png_file(tmp_path))}}]}
    result = gp.adapter_for("openrouter", http).poll(job, rid)
    assert (result.state, result.data, result.ext, result.actual_usd) == ("done", PNG, "png", 0.068)
    with pytest.raises(gp.ResultLost):
        gp.adapter_for("openrouter", http).poll(job, rid)
    assert len(http.calls) == 1


@pytest.mark.parametrize("reply", [OSError("timeout"), jr({}, 503), jr({}), jr({"error": {"code": 500}})])
def test_openrouter_uncertain_submit_never_retries_or_refunds(reply, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-test-key")
    http = FakeHttp({("POST", OPENROUTER_URL): reply})
    with pytest.raises(gp.ResultLost):
        gp.adapter_for("openrouter", http).submit(gp.Job(OPENROUTER_MODEL, "p", None, [], None))
    assert len(http.calls) == 1


@pytest.mark.parametrize("code", [400, 401, 402, 403, 429])
def test_openrouter_explicit_refusal_is_refundable(code, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-test-key")
    http = FakeHttp({("POST", OPENROUTER_URL): jr({}, code)})
    with pytest.raises(gp.ProviderError, match=gp.REFUSED):
        gp.adapter_for("openrouter", http).submit(gp.Job(OPENROUTER_MODEL, "p", None, [], None))


@pytest.mark.parametrize("data", ["!!", base64.b64encode(b"not an image").decode()])
def test_openrouter_bad_image_keeps_charge(data, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-test-key")
    http = FakeHttp({("POST", OPENROUTER_URL): jr({"data": [{"b64_json": data}]})})
    with pytest.raises(gp.FileUnusable):
        gp.adapter_for("openrouter", http).submit(gp.Job(OPENROUTER_MODEL, "p", None, [], None))


def test_openrouter_missing_key_sends_nothing(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    http = FakeHttp()
    with pytest.raises(gp.ProviderError, match=gp.NO_KEY):
        gp.adapter_for("openrouter", http).submit(gp.Job(OPENROUTER_MODEL, "p", None, [], None))
    assert http.calls == []


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


def test_fal_submit_2xx_without_urls_is_result_lost():
    for reply in (jr({"request_id": "r1"}), jr({}), (200, {}, b"not json")):
        http = FakeHttp({("POST", FAL_Q + "fal/video"): reply})
        with pytest.raises(gp.ResultLost):
            gp.adapter_for("fal", http).submit(gp.Job(VIDEO_MODEL, "p", None, [], 5))
    http = FakeHttp({("POST", FAL_Q + "fal/video"): jr({"detail": "no"}, 422)})
    with pytest.raises(gp.ProviderError):
        gp.adapter_for("fal", http).submit(gp.Job(VIDEO_MODEL, "p", None, [], 5))


def test_sniff_mp3_headers():
    assert gp.sniff(b"ID3\x04" + b"\0" * 12) == ("voice", "mp3")
    assert gp.sniff(b"\xff\xfb\x90\x00" + b"\0" * 12) == ("voice", "mp3")  # MPEG-1 layer 3, the common header
    assert gp.sniff(b"\xff\xf3\x90\x00" + b"\0" * 12) == ("voice", "mp3")
    assert gp.sniff(b"\xff\xd8\xff\xe0" + b"\0" * 12) == ("image", "jpg")  # a JPEG is not an MP3
    assert gp.sniff(b"\xff\x00" + b"\0" * 12) is None


def test_elevenlabs_submit_sends_key_and_model():
    http = FakeHttp({("POST", ELEVEN_URL): (200, {}, MP3)})
    ad = gp.adapter_for("elevenlabs", http)
    job = gp.Job(VOICE_MODEL, "hello there", None, [], None)
    rid = ad.submit(job)
    call = http.calls[0]
    assert call["headers"] == {"xi-api-key": "el-test-key", "Content-Type": "application/json"}
    assert call["body"] == {"text": "hello there", "model_id": "eleven_multilingual_v2"}
    p = ad.poll(job, rid)
    assert p.state == "done" and p.ext == "mp3" and p.data == MP3
    with pytest.raises(gp.ResultLost):  # the audio is taken once; after a restart it is gone
        ad.poll(job, rid)


def test_elevenlabs_voice_id_falls_back_to_the_environment(monkeypatch):
    model = {**VOICE_MODEL, "params": {"voiceId": ""}}
    job = gp.Job(model, "hi", None, [], None)
    with pytest.raises(gp.ProviderError):  # no voice anywhere: nothing is sent
        gp.adapter_for("elevenlabs", FakeHttp()).submit(job)
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice1")
    http = FakeHttp({("POST", ELEVEN_URL): (200, {}, MP3)})
    gp.adapter_for("elevenlabs", http).submit(job)
    assert http.calls[0]["url"] == ELEVEN_URL


def test_elevenlabs_4xx_is_provider_error():
    for status in (401, 422, 500):
        http = FakeHttp({("POST", ELEVEN_URL): jr({"detail": "no"}, status)})
        with pytest.raises(gp.ProviderError):  # refundable: the provider said it failed
            gp.adapter_for("elevenlabs", http).submit(gp.Job(VOICE_MODEL, "hi", None, [], None))


def test_elevenlabs_no_answer_is_result_lost():
    http = FakeHttp({("POST", ELEVEN_URL): TimeoutError("slow")})
    with pytest.raises(gp.ResultLost):  # sent, no answer: it may have been charged (spec 11.5 #8)
        gp.adapter_for("elevenlabs", http).submit(gp.Job(VOICE_MODEL, "hi", None, [], None))


def test_elevenlabs_non_mp3_rejected():
    http = FakeHttp({("POST", ELEVEN_URL): (200, {}, b"<html>not audio</html>" + b"\0" * 20)})
    with pytest.raises(gp.FileUnusable):  # a 200 that isn't MP3: no refund, it may have charged
        gp.adapter_for("elevenlabs", http).submit(gp.Job(VOICE_MODEL, "hi", None, [], None))


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"), reason="needs ffmpeg")
def test_mock_voice_is_mp3(tmp_path, monkeypatch):
    import subprocess
    monkeypatch.setattr(gp, "MOCK_DELAY_S", 0)
    ad = gp.adapter_for("mock")
    job = gp.Job({"id": "mock-voice", "kind": "voice", "provider": "mock"}, "abcd", None, [], None, scratch=tmp_path)
    p = ad.poll(job, ad.submit(job))
    assert p.state == "done" and p.ext == "mp3" and gp.sniff(p.data[:16]) == ("voice", "mp3")
    assert list(tmp_path.iterdir()) == []
    f = tmp_path.parent / "v.mp3"
    f.write_bytes(p.data)
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                         capture_output=True, text=True).stdout
    assert abs(float(out) - 1.0) < 0.2  # 4 width units x 0.25 s


@pytest.mark.parametrize('ratio,width,height', [('1:1', 2048, 2048), ('9:16', 1152, 2048), ('16:9', 2048, 1152)])
@pytest.mark.parametrize('resolution,factor', [('1K', 0.5), ('2K', 1), ('4K', 2)])
def test_mock_image_effective_settings(ratio, width, height, resolution, factor, monkeypatch):
    import xml.etree.ElementTree as ET
    monkeypatch.setattr(gp, 'MOCK_DELAY_S', 0)
    job = gp.Job({'kind': 'image'}, 'Bike', None, [], None, aspectRatio=ratio, resolution=resolution)
    adapter = gp.adapter_for('mock')
    svg = ET.fromstring(adapter.poll(job, adapter.submit(job)).data)
    assert int(svg.attrib['width']) == width * factor and int(svg.attrib['height']) == height * factor


def test_openrouter_selected_options_one_request(monkeypatch):
    monkeypatch.setenv('OPENROUTER_API_KEY', 'or-test-key')
    http = FakeHttp({('POST', OPENROUTER_URL): jr({'data': [{'b64_json': base64.b64encode(PNG).decode()}]})})
    job = gp.Job(OPENROUTER_MODEL, 'p', None, [], None, aspectRatio='1:1', resolution='4K', count=3)
    gp.adapter_for('openrouter', http).submit(job)
    assert len(http.calls) == 1
    body = http.calls[0]['body']
    assert body['n'] == 1 and body['resolution'] == '4K' and body['aspect_ratio'] == '1:1'
    assert body['provider'] == {'allow_fallbacks': False}

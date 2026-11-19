import subprocess

import analyze
import server

URL = "https://www.tiktok.com/@a/video/1"


def seed(client, url=URL):
    client.put("/api/library", json={"videos": [{"id": "tt-1", "url": url}], "formats": []})
    client.put("/api/ideas", json=[{"id": "i1", "videoId": "tt-1", "clientId": "c1", "status": "approved",
                                    "dueDate": "2026-11-20", "notes": ""}])


def fake_download(calls):
    def download(url, work):
        calls.append(url)
        out = work / "video.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=64x96:d=4",
                        "-pix_fmt", "yuv420p", str(out)], check=True)
        return out
    return download


def test_frame_comes_from_the_saved_reference_and_the_video_is_fetched_once(client, monkeypatch):
    calls = []
    monkeypatch.setattr(analyze, "download", fake_download(calls))
    seed(client)
    first = client.get("/api/ideas/i1/reference-frame?t=1.2")
    second = client.get("/api/ideas/i1/reference-frame?t=2")
    assert first.status_code == 200 and first.headers["content-type"] == "image/jpeg"
    assert second.status_code == 200
    assert calls == [URL]


def test_no_frame_without_a_saved_reference_or_for_a_foreign_host(client, monkeypatch):
    monkeypatch.setattr(analyze, "download", lambda url, work: (_ for _ in ()).throw(AssertionError(url)))
    assert client.get("/api/ideas/nope/reference-frame?t=1").status_code == 404
    seed(client, url="http://169.254.169.254/latest")
    assert client.get("/api/ideas/i1/reference-frame?t=1").status_code == 404

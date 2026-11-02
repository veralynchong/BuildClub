"""Tests for the ffmpeg / whisper helpers in cutting.py that need the real programs (or their absence)."""

import os
import shutil
import subprocess

import pytest

import cutting

need_ffmpeg = pytest.mark.skipif(not (shutil.which("ffmpeg") and shutil.which("ffprobe")), reason="needs ffmpeg")

GAP_CLIP = [("tone", 440, 1.0), ("quiet", None, 1.5), ("tone", 440, 1.0)]  # 3.5 s, silence at 1.0-2.5
FAKE_WORDS = [(0.0, 1.3, "hello"), (2.5, 3.5, "world")]  # "hello" ends 0.3 s late, like whisper


def fake_words(wav, work):
    return FAKE_WORDS


def make_clip(path, parts, size="640x360", with_audio=True):
    """parts: [("tone", 440, 1.0), ("quiet", None, 1.5), ...]. Video is testsrc at 24 fps for the total length."""
    total = sum(p[2] for p in parts)
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc=s={size}:r=24:d={total}"]
    if with_audio:
        for kind, freq, dur in parts:
            src = f"sine=f={freq}:d={dur}:r=48000" if kind == "tone" else "anullsrc=r=48000:cl=mono"
            cmd += ["-f", "lavfi", "-t", str(dur), "-i", src]
        n = len(parts)
        cmd += ["-filter_complex", "".join(f"[{i + 1}:a]" for i in range(n)) + f"concat=n={n}:v=0:a=1[a]",
                "-map", "0:v", "-map", "[a]", "-c:a", "aac"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", str(total), str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    assert r.returncode == 0, r.stderr
    return path


@need_ffmpeg
def test_gap_clip_is_cut_by_keep_intervals(tmp_path):
    clip = make_clip(tmp_path / "a.mp4", GAP_CLIP)
    total = cutting.probe(clip)["duration"]
    assert total == pytest.approx(3.5, abs=0.2)
    keeps = cutting.keep_intervals(fake_words(clip, tmp_path), [(1.0, 2.5)], total)
    assert keeps[0][0] == 0.0 and sum(b - a for a, b in keeps) < total - 1.0


@need_ffmpeg
def test_missing_whisper_is_an_error(tmp_path, monkeypatch):
    monkeypatch.setattr(cutting.analyze, "WHISPER", "/nonexistent/whisper-cli")
    with pytest.raises(cutting.CutError, match="whisper.cpp"):
        cutting.transcribe_words(tmp_path / "x.wav", tmp_path)


@pytest.mark.skipif(not os.environ.get("REMAKE_WHISPER_TESTS") or cutting.missing_tools(),
                    reason="slow: set REMAKE_WHISPER_TESTS=1")
def test_real_whisper_on_say_audio(tmp_path):
    aiff = tmp_path / "s.aiff"
    subprocess.run(["say", "-o", str(aiff), "hello there, this is a test"], check=True)
    wav = tmp_path / "s.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(aiff), "-ac", "1", "-ar", "16000", str(wav)], check=True)
    words = cutting.transcribe_words(wav, tmp_path)
    assert words and all(s < e for s, e, _ in words)


def test_run_times_out_with_a_human_sentence():
    with pytest.raises(cutting.CutError, match="took too long"):
        cutting.run(["sleep", "5"], timeout=0.2)

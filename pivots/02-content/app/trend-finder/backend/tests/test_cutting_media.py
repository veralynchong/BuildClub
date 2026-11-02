"""Tests for the ffmpeg / whisper helpers in cutting.py that need the real programs (or their absence)."""

import os
import shutil
import subprocess

import pytest

import cutting

need_ffmpeg = pytest.mark.skipif(not (shutil.which("ffmpeg") and shutil.which("ffprobe")), reason="needs ffmpeg")


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

"""Tests for the ffmpeg / whisper helpers in cutting.py that need the real programs (or their absence)."""

import os
import shutil
import subprocess
import wave

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


def _spoken_words(tmp_path, script):
    """16 kHz mono wav of words spoken one by one by `say` ("<P>" = 1.5 s pause), with each word's true
    (start, end) from the trimmed sample counts."""
    sr, pcm, t, truth = 16000, bytearray(b"\0\0" * 8000), 0.5, []
    for i, w in enumerate(script.split()):
        if w == "<P>":
            pcm += b"\0\0" * int(1.5 * sr)
            t += 1.5
            continue
        aiff = tmp_path / f"w{i}.aiff"
        subprocess.run(["say", "-o", str(aiff), w], check=True)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(aiff), "-af",
                              "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:"
                              "stop_threshold=-45dB:stop_duration=0.02", "-ac", "1", "-ar", str(sr),
                              "-f", "s16le", "-"], capture_output=True, check=True).stdout
        truth.append((t, t + len(raw) / 2 / sr, w))
        pcm += raw + b"\0\0" * int(0.06 * sr)
        t += len(raw) / 2 / sr + 0.06
    pcm += b"\0\0" * 8000
    wav = tmp_path / "words.wav"
    with wave.open(str(wav), "wb") as f:
        f.setnchannels(1), f.setsampwidth(2), f.setframerate(sr), f.writeframes(bytes(pcm))
    return wav, truth


@pytest.mark.skipif(not os.environ.get("REMAKE_WHISPER_TESTS") or cutting.missing_tools(),
                    reason="slow: set REMAKE_WHISPER_TESTS=1")
def test_real_whisper_finds_fillers_after_a_pause(tmp_path):
    # Without DTW token times whisper put the "uh" after the pause about 1.7 s early, inside the silence.
    wav, truth = _spoken_words(tmp_path, "So uh today we will <P> uh look at three tips")
    words = cutting.transcribe_words(wav, tmp_path)
    found = cutting._ffmpeg(["-i", str(wav), "-af", "silencedetect=n=-35dB:d=0.15", "-f", "null", "-"],
                            "pauses", quiet=False)  # as cleaning.clean_take does
    starts = cutting._effective_starts(words, cutting.parse_silences(found.stderr, truth[-1][1] + 0.5))
    got = [(s, e) for s, (_, e, w) in zip(starts, words) if cutting.is_filler(w)]
    real = [(s, e) for s, e, w in truth if w == "uh"]
    assert len(got) == 2
    for (gs, ge), (ts, te) in zip(got, real):
        assert abs(gs - ts) <= 0.15 and abs(ge - te) <= 0.15, (got, real)


def test_run_times_out_with_a_human_sentence():
    with pytest.raises(cutting.CutError, match="took too long"):
        cutting.run(["sleep", "5"], timeout=0.2)


@need_ffmpeg
def test_build_clean_graph_cuts_the_gap(tmp_path):
    src = make_clip(tmp_path / "a.mp4", GAP_CLIP)
    out = tmp_path / "out.mp4"
    graph = tmp_path / "g.txt"
    graph.write_text(cutting.build_clean_graph([(0, 1.12), (2.38, 3.5)]))
    cutting._ffmpeg(["-i", str(src), "-/filter_complex", str(graph), "-map", "[v]", "-map", "[a]",
                     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out)], "clean")
    info = cutting.probe(out)
    assert info["duration"] == pytest.approx(2.24, abs=0.05) and info["hasAudio"] and info["acodec"] == "aac"

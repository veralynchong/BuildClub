"""Pure helpers for cutting silences and filler words: no ffmpeg or whisper needed."""

import json
import random
import shutil
from pathlib import Path

import pytest

import analyze
import cutting

FIXTURES = Path(__file__).parent / "fixtures"
W = [(0.0, 1.0, "hello"), (1.0, 1.6, "um"), (2.9, 3.5, "world")]  # "um" really ends at 1.3
SIL = [(1.3, 2.9)]


def test_parse_words_drops_markers():
    data = json.loads((FIXTURES / "whisper_words.json").read_text())
    assert cutting.parse_words(data) == [
        (0.12, 0.64, "hello"), (0.65, 1.0, "everyone"), (0.7, 0.9, "out"),
        (1.0, 1.6, "um"), (2.9, 3.5, "world")]


def test_filler_removed_and_gap_trimmed():
    keeps = cutting.keep_intervals(W, SIL, 3.5)
    # um 1.0-1.3 and the gap up to 2.9 are one cut; keep 0.12 only on the world side
    assert keeps == [pytest.approx((0.0, 1.0)), pytest.approx((2.78, 3.5))]


def test_short_gap_is_kept():
    assert cutting.keep_intervals([(0, 1, "a"), (1.2, 2, "b")], [(1.0, 1.2)], 2) == [(0, 2)]


def test_no_words_keeps_everything():
    assert cutting.keep_intervals([], [], 5.0) == [(0.0, 5.0)]


def test_filler_list_only_cuts_listed_words():
    assert not cutting.is_filler("like") and not cutting.is_filler("ah") and cutting.is_filler(" Um, ")


@pytest.mark.parametrize("seed", range(20))
def test_never_cuts_inside_a_real_word(seed):
    rng = random.Random(seed)
    words, silences, truth, t = [], [], [], 0.0
    for _ in range(rng.randint(3, 12)):
        t += rng.choice([0.0, 0.05, 0.3, 0.6, 1.5])
        start = t
        true_end = start + rng.uniform(0.15, 0.6)
        gap = rng.choice([0.0, 0.05, 0.3, 0.6, 1.5])
        text = rng.choice(["um", "hello", "word", "uh", "again"])
        # whisper overstates the end into the gap, but never past the next word
        end = true_end + rng.uniform(0, gap)
        words.append((start, end, text))
        truth.append((start, true_end, text))
        if gap >= 0.15:
            silences.append((true_end, true_end + gap))
        t = true_end + gap
    total = t + rng.choice([0.0, 0.5, 2.0])
    keeps = cutting.keep_intervals(words, silences, total)
    for a, b in zip(keeps, keeps[1:]):
        assert a[1] < b[0]
    for k in keeps:
        assert 0 <= k[0] < k[1] <= total
    for start, true_end, text in truth:
        if cutting.is_filler(text):
            continue
        assert any(k[0] <= start + 1e-9 and true_end <= k[1] + 1e-9 for k in keeps), (text, start, true_end, keeps)


SILENCE_ERR = """[silencedetect @ 0x1] silence_start: 1.3
[silencedetect @ 0x1] silence_end: 2.9 | silence_duration: 1.6
[silencedetect @ 0x1] silence_start: 4.25
"""


def test_parse_silences():
    assert cutting.parse_silences(SILENCE_ERR, 6.0) == [(1.3, 2.9), (4.25, 6.0)]


def test_missing_tools(monkeypatch, tmp_path):
    whisper, model = tmp_path / "whisper-cli", tmp_path / "model.bin"
    whisper.write_text("")
    model.write_text("")
    monkeypatch.setattr(analyze, "WHISPER", str(whisper))
    monkeypatch.setattr(analyze, "MODEL", model)
    monkeypatch.setattr(shutil, "which", lambda name: f"/usr/bin/{name}")
    assert cutting.missing_tools() is None
    ffmpeg_msg = ("ffmpeg isn't installed on this computer, so the cut can't be made. "
                  "Install it (brew install ffmpeg) and try again.")
    monkeypatch.setattr(shutil, "which", lambda name: None if name == "ffprobe" else f"/usr/bin/{name}")
    assert cutting.missing_tools() == ffmpeg_msg
    monkeypatch.setattr(shutil, "which", lambda name: None if name == "ffmpeg" else f"/usr/bin/{name}")
    assert cutting.missing_tools() == ffmpeg_msg
    monkeypatch.setattr(shutil, "which", lambda name: f"/usr/bin/{name}")
    monkeypatch.setattr(analyze, "MODEL", tmp_path / "missing.bin")
    assert cutting.missing_tools() == ("whisper.cpp or its model wasn't found (looked for /opt/homebrew/bin/whisper-cli "
                                       "and ~/models/ggml-large-v3-turbo-q5_0.bin), so the cut can't be made.")


# E3: takes without speech are kept whole. Spans are (start, end) of each take in the joined timeline.
def test_wordless_middle_take_is_kept_whole():
    words = [(0.0, 1.0, "hello"), (6.0, 7.0, "world")]  # take 1: 0-2, take 2 (silent): 2-5, take 3: 5-8
    keeps = cutting.keep_intervals(words, [], 8.0, protected=[(2.0, 5.0)])
    assert _covers(keeps, 2.0, 5.0)
    assert not _covers(keeps, 1.2, 1.9)  # silence inside the speaking take is still trimmed


def _covers(keeps, a, b):
    return any(k0 <= a + 1e-9 and k1 >= b - 1e-9 for k0, k1 in keeps)


def test_wordless_first_take_is_kept_whole():
    words = [(3.0, 4.0, "hello")]
    keeps = cutting.keep_intervals(words, [], 5.0, protected=[(0.0, 2.0)])
    assert _covers(keeps, 0.0, 2.0)
    assert not _covers(keeps, 2.2, 2.8)


def test_wordless_last_take_is_kept_whole():
    words = [(0.0, 1.0, "hello")]
    keeps = cutting.keep_intervals(words, [], 5.0, protected=[(3.0, 5.0)])
    assert _covers(keeps, 3.0, 5.0)
    assert not _covers(keeps, 1.2, 2.8)


def test_take_with_words_is_still_trimmed():
    keeps = cutting.keep_intervals(W, SIL, 3.5, protected=[])
    assert keeps == [pytest.approx((0.0, 1.0)), pytest.approx((2.78, 3.5))]


def test_protected_boundary_does_not_cut_into_protected_take():
    # speaking take 0-3 (word 0-1, long silence after), protected take 3-5, speaking take 5-8 (word 7-8)
    words = [(0.0, 1.0, "a"), (7.0, 8.0, "b")]
    keeps = cutting.keep_intervals(words, [], 8.0, protected=[(3.0, 5.0)])
    assert keeps == [pytest.approx((0.0, 1.12)), pytest.approx((3.0, 5.0)), pytest.approx((6.88, 8.0))]


def test_no_words_with_protected_keeps_everything():
    assert cutting.keep_intervals([], [], 5.0, protected=[(0.0, 5.0)]) == [(0.0, 5.0)]


def test_describe_trims_splits_per_take_and_names_fillers():
    words = [(0.0, 0.5, "hello"), (1.5, 1.8, "um"), (1.9, 2.4, "there"), (5.0, 5.5, "bye")]
    keeps = [(0.0, 0.62), (1.8, 3.0), (3.6, 6.0)]  # removed: 0.62-1.8 (has the filler), 3.0-3.6 (pause)
    trims = cutting.describe_trims(keeps, words, [3.2, 2.8], 6.0)
    assert trims == [
        {"shot": 0, "kind": "filler", "start": 0.62, "end": 1.8},
        {"shot": 0, "kind": "pause", "start": 3.0, "end": 3.2},
        {"shot": 1, "kind": "pause", "start": 0.0, "end": 0.4},
    ]


def test_describe_trims_is_empty_when_nothing_was_cut():
    assert cutting.describe_trims([(0.0, 4.0)], [], [4.0], 4.0) == []

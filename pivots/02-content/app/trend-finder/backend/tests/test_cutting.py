"""Pure helpers for cutting silences and filler words: no ffmpeg or whisper needed."""

import json
import random
import shutil
import subprocess
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


def test_parse_words_drops_starred_sound_notes():
    seg = lambda a, b, text: {"offsets": {"from": a, "to": b}, "text": text}
    data = {"transcription": [seg(0, 1990, " *phone"), seg(1990, 4000, " rings*"), seg(4000, 4500, " hi")]}
    assert cutting.parse_words(data) == [(4.0, 4.5, "hi")]


def test_parse_words_uses_dtw_token_times():
    # Real whisper-cli 1.9.5 output: the segment offsets put "of the um" inside the 1.9-3.6 s pause; the
    # DTW token times (t_dtw, 10 ms units, about where each token ends) do not.
    data = json.loads((FIXTURES / "whisper_words_dtw.json").read_text())
    words = cutting.parse_words(data)
    assert [w[2] for w in words] == ["hello", "um", "this", "is", "a", "test", "of", "the", "um", "video", "tool"]
    assert words[0] == pytest.approx((0.55, 0.78, "hello"))  # first word starts at its segment offset
    assert words[1] == pytest.approx((0.78, 1.0, "um"))      # previous token's t_dtw to its own
    assert words[8] == pytest.approx((3.82, 3.96, "um"))
    assert words[6] == pytest.approx((1.84, 3.72, "of"))     # swallows the pause; keep_intervals moves it


def test_dtw_word_start_skips_the_silence_before_it():
    # "of" starts where "test" ended, before the pause; the pause must still be cut, the fillers too
    data = json.loads((FIXTURES / "whisper_words_dtw.json").read_text())
    sil = [(0.0, 0.53), (1.908, 3.617), (4.881, 5.584)]  # silencedetect=n=-35dB on the same audio
    keeps = cutting.keep_intervals(cutting.parse_words(data), sil, 5.584)
    kept = lambda a, b: any(ka < b and kb > a for ka, kb in keeps)
    assert not kept(0.8, 0.99) and not kept(3.83, 3.95) and not kept(2.1, 3.4)
    assert kept(0.6, 0.75) and kept(1.2, 1.8) and kept(4.0, 4.8)  # hello, "this is a test", "video tool"


def test_pause_inside_a_long_word_is_not_its_start():
    # a silence that begins well after the word starts is inside the word; only one right at its start counts
    words = [(0.0, 0.5, "so"), (0.5, 2.0, "really"), (2.0, 2.4, "um")]
    assert cutting._effective_starts(words, [(1.2, 1.5)]) == [0.0, 0.5, 2.0]
    assert cutting._effective_starts(words, [(0.6, 1.5)]) == [0.0, 1.5, 2.0]
    assert cutting.keep_intervals(words, [(1.2, 1.5)], 2.4) == [(0.0, 2.0)]


def test_fit_to_silences_trims_both_sides():
    words = [(0.5, 0.9, "test"), (0.9, 3.7, "of"), (3.7, 3.8, "the")]
    assert cutting.fit_to_silences(words, [(1.0, 3.6)]) == [(0.5, 0.9, "test"), (3.6, 3.7, "of"), (3.7, 3.8, "the")]
    assert cutting.fit_to_silences([(0.5, 2.0, "so")], [(1.0, 2.5)]) == [(0.5, 1.0, "so")]


def _fake_whisper(tmp_path, monkeypatch, knows_dtw):
    exe, model = tmp_path / "whisper-cli", tmp_path / "model.bin"
    exe.write_text(""), model.write_text("")
    monkeypatch.setattr(analyze, "WHISPER", str(exe))
    monkeypatch.setattr(analyze, "MODEL", model)
    calls = []

    def fake_run(cmd, timeout=None):
        calls.append(cmd)
        if knows_dtw or "-dtw" not in cmd:  # an old build prints usage and exits 0 without a JSON file
            base = Path(cmd[cmd.index("-of") + 1])
            seg = {"offsets": {"from": 100, "to": 400}, "text": " hi", "tokens": [{"text": " hi", "t_dtw": 30 if "-dtw" in cmd else -1}]}
            base.with_suffix(".json").write_text(json.dumps({"transcription": [seg]}))
        return subprocess.CompletedProcess(cmd, 0, "", "")
    monkeypatch.setattr(cutting, "run", fake_run)
    return calls


def test_old_whisper_without_dtw_falls_back(tmp_path, monkeypatch, caplog):
    calls = _fake_whisper(tmp_path, monkeypatch, knows_dtw=False)
    assert cutting.transcribe_words(tmp_path / "a.wav", tmp_path) == [(0.1, 0.4, "hi")]
    assert ["-dtw" in c for c in calls] == [True, False] and "-nfa" not in calls[1]
    assert "without -dtw" in caplog.text


def test_whisper_with_dtw_runs_once(tmp_path, monkeypatch):
    calls = _fake_whisper(tmp_path, monkeypatch, knows_dtw=True)
    assert cutting.transcribe_words(tmp_path / "a.wav", tmp_path) == [(0.1, 0.3, "hi")]
    assert len(calls) == 1


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


def test_parse_words_times_every_chinese_character():
    # Real whisper-cli output (say -v Tingting, a 1.4 s pause after "整理好,"): Chinese has no spaces, so the
    # whole sentence is ONE -sow segment; its tokens still carry their own t_dtw times.
    data = json.loads((FIXTURES / "whisper_words_zh.json").read_text())
    words = cutting.parse_words(data)
    assert len(words) > 30 and "".join(w[2] for w in words).startswith("大家好,今天我们来聊三个剪辑小技巧,第一,")
    by_text = {w[2]: w for w in words}
    assert by_text["今天"][:2] == pytest.approx((0.56, 1.32), abs=0.01)  # from the previous character's end, like English words
    assert by_text["剪"][0] < by_text["掉"][0] < by_text["多"][0]  # times grow through the sentence, no one-word span
    assert words[-1][2] == "了。" and words[-1][1] == pytest.approx(14.30)
    # the pause is 6.81-8.24 s: after fit_to_silences nothing is spoken inside it
    fitted = cutting.fit_to_silences(words, [(6.809, 8.243)])
    assert all(e <= 6.82 or s >= 8.24 for s, e, _ in fitted)
    assert next(w for w in fitted if w[2].startswith("第二"))[0] == pytest.approx(8.243)


def test_parse_words_drops_punctuation_and_symbol_only_text():
    # whisper writes "." for weak room noise (seen on 8 s of -40 dBFS pink noise) and a note symbol for music:
    # neither is speech, so a take of it must come out with no words
    seg = lambda a, b, text: {"offsets": {"from": a, "to": b}, "text": text}
    data = {"transcription": [seg(0, 2180, " ."), seg(2180, 3000, " ♪"), seg(3000, 3500, " ..."), seg(3500, 4000, " hi.")]}
    assert cutting.parse_words(data) == [(3.5, 4.0, "hi.")]


def test_is_silent_only_when_the_pauses_cover_the_whole_file():
    assert cutting.is_silent([(0.0, 8.0)], 8.0)
    assert cutting.is_silent([(0.0, 0.1), (0.1, 7.95)], 8.0)  # silencedetect's own rounding
    assert not cutting.is_silent([(1.0, 7.0)], 8.0)
    assert not cutting.is_silent([], 8.0) and not cutting.is_silent([(0.0, 0.0)], 0.0)


def test_whisper_prompt_is_passed_only_when_given(tmp_path, monkeypatch):
    calls = _fake_whisper(tmp_path, monkeypatch, knows_dtw=True)
    cutting.transcribe_words(tmp_path / "a.wav", tmp_path)
    cutting.transcribe_words(tmp_path / "a.wav", tmp_path, prompt="Umm, uh, so")
    assert "--prompt" not in calls[0]
    assert calls[1][calls[1].index("--prompt") + 1] == "Umm, uh, so"

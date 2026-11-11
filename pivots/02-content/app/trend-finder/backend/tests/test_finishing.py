"""Auto first cut, music ducking ranges, loudness commands and the EDL / OTIO files. The pure functions run on
synthetic analysis data (no ffmpeg or whisper); the routes read analysis rows written by hand."""

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

import editing
import finishing
import suggest
from test_suggest import CLEAN, LINE, MESSY, results_of, setup, speak, take, w  # noqa: F401  (setup is a fixture)


def shots(*lines):
    return [{"id": f"s{i + 1}", "line": line} for i, line in enumerate(lines)]


def cand(id, words, silences=(), duration=7.0, name=None):
    return {"id": id, "name": name or id, "chosen": False, "results": results_of(words, silences, duration=duration)}


# ---- auto first cut ----

def test_first_cut_picks_the_best_take_trims_to_the_line_and_cleans_up():
    messy = cand("messy", MESSY, [(2.3, 4.5)], name="Take 1")
    clean = cand("clean", CLEAN, duration=3.0, name="Take 2")
    got = suggest.first_cut(shots(LINE), {"s1": [messy, clean]}, 4)
    assert [c["source"]["id"] for c in got["clips"]] == ["clean"]
    c = got["clips"][0]
    assert c["id"] == "c1" and c["volume"] == 1 and c["muted"] is False and c["source"]["shotId"] == "s1"
    assert 0 <= c["in"] < 0.3 and 2.0 < c["out"] <= 3.0          # the line is spoken from 0.3 s to 2.4 s, plus padding
    pick = got["log"][0]
    assert pick["kind"] == "pick" and pick["takeId"] == "clean" and pick["takes"] == 2
    assert pick["text"] == "Shot 1: picked Take 2 — covers 100% of the line, 0 fillers"
    assert got["primaries"] == {"s1": {"kind": "take", "id": "clean", "shotId": "s1"}}


def test_first_cut_trims_to_the_last_try_of_the_line_so_the_retake_needs_no_cut():
    got = suggest.first_cut(shots("First boil the water for tea"), {"s1": [cand("m", MESSY, [(2.3, 4.5)], name="Only")]}, 0)
    kinds = [e["kind"] for e in got["log"]]
    assert kinds[0] == "pick"
    pick = got["log"][0]
    assert pick["text"].startswith("Shot 1: used the only take, Only")
    cuts = [e for e in got["log"] if e["kind"] == "cut"]
    # the line is only said from 4.5 s, so the alignment trim has already dropped the first try; what is left is clean
    trim = next(e for e in got["log"] if e["kind"] == "trim")
    assert trim["start"] == pytest.approx(4.5, abs=0.04) and trim["text"].startswith("Shot 1: trimmed to the line")
    assert cuts == [] and len(got["clips"]) == 1


def test_first_cut_without_a_line_cleans_the_whole_take():
    got = suggest.first_cut(shots(None), {"s1": [cand("m", MESSY, [(2.3, 4.5)])]}, 0)
    cuts = {e["type"]: e for e in got["log"] if e["kind"] == "cut"}
    assert set(cuts) == {"silence", "filler", "retake"}
    assert cuts["silence"]["text"] == "Shot 1: removed 2.2 s silence at 0:02.3"
    assert cuts["filler"]["text"] == "Shot 1: removed the filler “Um” at 0:02.0"
    assert len(got["clips"]) >= 2 or got["clips"][0]["in"] >= 4.0      # the retake and the pause are gone
    total = sum(c["out"] - c["in"] for c in got["clips"])
    assert total < 7.0 - 2.0


def test_first_cut_places_shots_in_plan_order_and_skips_shots_without_footage():
    a, b = cand("a", CLEAN, duration=3.0), cand("b", speak("Then add the leaves", start=0.2, step=0.4), duration=3.0)
    got = suggest.first_cut(shots(LINE, "Boil it", "Then add the leaves"), {"s3": [b], "s1": [a]}, 4)
    assert [c["source"]["shotId"] for c in got["clips"]] == ["s1", "s3"]
    skip = [e for e in got["log"] if e["kind"] == "skip"]
    assert [e["text"] for e in skip] == ["Shot 2: no footage, skipped"]
    ends = [c["out"] - c["in"] for c in got["clips"]]
    assert got["seconds"] == pytest.approx(sum(ends), abs=0.01)
    picks = [e for e in got["log"] if e["kind"] == "pick"]
    assert picks[1]["at"] == pytest.approx(ends[0], abs=0.01)         # the log points at where the shot sits on the new timeline


def test_first_cut_cut_entries_point_at_the_seam_on_the_new_timeline():
    words = speak("one two three", start=0.0, step=0.3) + speak("four five six", start=3.0, step=0.3)
    got = suggest.first_cut(shots(None), {"s1": [cand("t", words, [(1.0, 3.0)], duration=4.0)]}, 0)
    cut = next(e for e in got["log"] if e["kind"] == "cut")
    assert cut["type"] == "silence" and cut["at"] == pytest.approx(1.0, abs=0.04)
    assert [round(c["out"] - c["in"], 1) for c in got["clips"]] == [1.0, 1.0]


def test_first_cut_turns_the_speech_into_captions_on_the_new_timeline():
    got = suggest.first_cut(shots(LINE), {"s1": [cand("clean", CLEAN, duration=3.0)]}, 0)
    assert got["captions"]["status"] == "ok"
    first = got["captions"]["entries"][0]
    assert first["text"].startswith("First boil") and 0 <= first["start"] < 0.5


def test_first_cut_stops_at_the_reel_limit_and_says_so():
    long = cand("long", speak("a b c", step=0.3), duration=100.0)
    got = suggest.first_cut(shots(None, None, None), {"s1": [long], "s2": [long], "s3": [long]}, 0)
    assert len(got["clips"]) == 1
    assert [e["kind"] for e in got["log"]][-1] == "limit"


def test_first_cut_clips_never_run_past_the_video():
    got = suggest.first_cut(shots(None), {"s1": [cand("t", speak("hello there"), duration=1.0345)]}, 4)
    assert all(c["out"] <= 1.0333334 for c in got["clips"])


# ---- first cut route ----

def test_first_cut_route(client, setup):
    messy = take(client, results=results_of(MESSY, [(2.3, 4.5)]))
    clean = take(client, results=results_of(CLEAN, duration=3.0))
    other = take(client, shot=1, results=results_of(speak("Then a cup"), duration=2.0))
    r = client.post("/api/ideas/ia/edit/suggest/first-cut", json={})
    assert r.status_code == 200
    body = r.json()
    assert [c["source"]["id"] for c in body["clips"]] == [clean, other]
    assert body["log"][0]["kind"] == "pick" and body["captions"]["status"] == "ok"
    # the clips can be saved as they are
    base = client.get("/api/ideas/ia/edit").json()
    proj = {**base["project"], "clips": body["clips"], "primaries": body["primaries"]}
    assert client.put("/api/ideas/ia/edit", json={"version": base["version"], "project": proj}).status_code == 200
    assert messy


def test_first_cut_route_waits_for_analysis_and_needs_footage(client, setup):
    assert client.post("/api/ideas/ia/edit/suggest/first-cut", json={}).status_code == 409
    take(client, results=None, status="running")
    r = client.post("/api/ideas/ia/edit/suggest/first-cut", json={})
    assert r.status_code == 409 and r.json()["status"] == "running"
    assert client.post("/api/ideas/iw/edit/suggest/first-cut", json={}).status_code == 409
    assert client.post("/api/ideas/nope/edit/suggest/first-cut", json={}).status_code == 404


# ---- music ducking ----

def clip(take_id, a, b, **extra):
    return {"source": {"kind": "take", "id": take_id}, "in": a, "out": b, "volume": 1, "muted": False, **extra}


def test_duck_ranges_follow_the_words_and_shift_to_the_timeline():
    res = {"t1": results_of(speak("one two three", start=1.0, step=0.5)), "t2": results_of(speak("four", start=0.0, step=0.5))}
    got = finishing.duck_ranges([clip("t1", 1.0, 2.5), clip("t2", 0.0, 1.0)], res)
    assert got == [[0.0, 1.5], [1.5, 2.0]] or got == [[0.0, 2.0]]       # contiguous speech is one span
    assert finishing.duck_ranges([clip("t1", 1.0, 2.5), clip("t2", 0.0, 1.0)], res) == [[0.0, 2.0]]


def test_duck_ranges_keep_gaps_longer_than_the_join_time_apart():
    res = {"t": results_of([w("hi", 0.0, 0.5), w("there", 2.0, 2.5)])}
    assert finishing.duck_ranges([clip("t", 0.0, 3.0)], res) == [[0.0, 0.5], [2.0, 2.5]]


def test_duck_ranges_skip_muted_clips_generations_and_silent_takes():
    res = {"t": results_of(speak("hello world", step=0.4)), "q": results_of([], speech="none")}
    gen = {"source": {"kind": "generation", "id": "g"}, "in": 0, "out": 2, "volume": 1, "muted": False}
    assert finishing.duck_ranges([clip("t", 0, 1, muted=True), gen, clip("q", 0, 1)], res) == []
    assert finishing.duck_ranges([clip("t", 0, 1, volume=0)], res) == []


def test_duck_ranges_without_speech_recognition_use_what_is_not_a_pause():
    res = {"t": results_of([], [(0.0, 1.0), (3.0, 4.0)], duration=5.0, speech="unavailable")}
    assert finishing.duck_ranges([clip("t", 0.0, 5.0)], res) == [[1.0, 3.0], [4.0, 5.0]]


def test_duck_ranges_include_the_voiceover():
    got = finishing.duck_ranges([], {}, [{"start": 2.0, "words": [{"text": "a", "start": 0.0, "end": 0.5}, {"text": "b", "start": 0.6, "end": 1.0}]}])
    assert got == [[2.0, 3.0]]


def test_duck_ranges_drop_blips():
    assert finishing.merge_spans([[0.0, 0.1], [5.0, 6.0]]) == [[5.0, 6.0]]


# ---- loudness ----

FIRST_PASS = """[Parsed_loudnorm_0 @ 0x1]
{
\t"input_i" : "-23.54",
\t"input_tp" : "-6.01",
\t"input_lra" : "5.20",
\t"input_thresh" : "-34.10",
\t"output_i" : "-14.60",
\t"output_tp" : "-1.20",
\t"output_lra" : "4.80",
\t"output_thresh" : "-24.80",
\t"normalization_type" : "dynamic",
\t"target_offset" : "0.60"
}
"""


def test_loudnorm_first_pass_command_targets_minus_14_lufs_and_minus_1_dbtp():
    cmd = finishing.measure_command(Path("/x/in.mp4"))
    assert cmd[0] == "ffmpeg" and "-vn" in cmd and cmd[-3:] == ["-f", "null", "-"]
    f = cmd[cmd.index("-af") + 1]
    assert f.startswith("loudnorm=I=-14:TP=-1:LRA=11") and f.endswith("print_format=json")


def test_loudnorm_second_pass_uses_the_measurement_and_copies_the_video():
    m = finishing.parse_measured(FIRST_PASS)
    assert m == {"input_i": -23.54, "input_tp": -6.01, "input_lra": 5.2, "input_thresh": -34.1, "target_offset": 0.6}
    cmd = finishing.apply_command(Path("/x/in.mp4"), Path("/x/out.mp4"), m)
    assert cmd[cmd.index("-c:v") + 1] == "copy" and cmd[cmd.index("-c:a") + 1] == "aac" and cmd[-1] == "/x/out.mp4"
    f = cmd[cmd.index("-af") + 1]
    assert "I=-14:TP=-1:LRA=11" in f and "measured_I=-23.54" in f and "measured_TP=-6.01" in f
    assert "measured_thresh=-34.1" in f and "offset=0.6" in f and "linear=true" in f


def test_parse_measured_refuses_silence_and_garbage():
    assert finishing.parse_measured(FIRST_PASS.replace('"-23.54"', '"-inf"')) is None
    assert finishing.parse_measured("no json here") is None


def test_normalise_runs_two_passes_and_replaces_the_file(tmp_path):
    video = tmp_path / "next.mp4"
    video.write_bytes(b"old")
    calls = []

    def run(cmd, **kw):
        calls.append(cmd)
        if len(calls) == 1:
            return SimpleNamespace(returncode=0, stderr=FIRST_PASS)
        Path(cmd[-1]).write_bytes(b"levelled")
        return SimpleNamespace(returncode=0, stderr="")

    assert finishing.normalise(video, tmp_path, run) is True
    assert len(calls) == 2 and video.read_bytes() == b"levelled"


def test_normalise_leaves_the_video_alone_when_it_cannot(tmp_path):
    video = tmp_path / "next.mp4"
    video.write_bytes(b"old")
    assert finishing.normalise(video, tmp_path, lambda cmd, **kw: SimpleNamespace(returncode=0, stderr="")) is False
    assert video.read_bytes() == b"old"
    seq = iter([SimpleNamespace(returncode=0, stderr=FIRST_PASS), SimpleNamespace(returncode=1, stderr="boom")])
    assert finishing.normalise(video, tmp_path, lambda cmd, **kw: next(seq)) is False
    assert video.read_bytes() == b"old"


# ---- EDL / OTIO ----

def test_timecodes_are_non_drop_frame_at_30_fps():
    assert finishing.timecode(0) == "00:00:00:00"
    assert finishing.timecode(29) == "00:00:00:29" and finishing.timecode(30) == "00:00:01:00"
    assert finishing.timecode(30 * 61 + 5) == "00:01:01:05"
    assert finishing.timecode(3600 * 30) == "01:00:00:00"


def edl_clips():
    return [{"id": "c1", "source": {"kind": "take", "id": "t1"}, "in": 1.0, "out": 3.5, "volume": 1, "muted": False},
            {"id": "c2", "source": {"kind": "take", "id": "t2"}, "in": 0.2, "out": 2.2, "volume": 1, "muted": True}]


def test_edl_text_is_cmx3600_with_source_and_record_timecodes():
    names = {"take:t1": "tea scene.mov", "take:t2": "pour (2).mp4"}
    text = finishing.edl_text("Tea", finishing.edl_events(edl_clips(), names))
    lines = text.splitlines()
    assert lines[:3] == ["TITLE: Tea", "FCM: NON-DROP FRAME", ""]
    assert lines[3] == "001  tea_scene AA/V  C        00:00:01:00 00:00:03:15 01:00:00:00 01:00:02:15"
    assert lines[4] == "* FROM CLIP NAME: tea scene.mov"
    assert lines[5] == "002  pour_2   V     C        00:00:00:06 00:00:02:06 01:00:02:15 01:00:04:15"


def test_reel_names_are_unique():
    assert finishing.reel_names({"take:a": "clip.mp4", "take:b": "clip.mov"}) == {"take:a": "clip", "take:b": "clip_2"}


def test_otio_has_the_clips_with_source_ranges():
    doc = finishing.otio_doc("Tea", finishing.edl_events(edl_clips(), {"take:t1": "a.mp4", "take:t2": "b.mp4"}))
    clips = doc["tracks"]["children"][0]["children"]
    assert doc["OTIO_SCHEMA"] == "Timeline.1" and len(clips) == 2
    assert clips[0]["source_range"]["start_time"]["value"] == 30 and clips[0]["source_range"]["duration"]["value"] == 75
    assert clips[0]["media_reference"]["target_url"] == "a.mp4"
    json.dumps(doc)


def test_edl_route(client, setup):
    t1 = take(client, results=results_of(CLEAN, duration=3.0))
    name = client.get("/api/ideas/ia/takes").json()[0]["name"]
    base = client.get("/api/ideas/ia/edit").json()
    assert client.get("/api/ideas/ia/edit/edl").status_code == 409                     # nothing on the timeline
    clips = [{"id": "c1", "source": {"kind": "take", "id": t1}, "in": 0.0, "out": 2.0, "volume": 1, "muted": False}]
    assert client.put("/api/ideas/ia/edit", json={"version": base["version"], "project": {**base["project"], "clips": clips}}).status_code == 200
    r = client.get("/api/ideas/ia/edit/edl")
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    assert "00:00:00:00 00:00:02:00 01:00:00:00 01:00:02:00" in r.text and f"* FROM CLIP NAME: {name}" in r.text
    otio = client.get("/api/ideas/ia/edit/edl?format=otio")
    assert otio.status_code == 200 and otio.json()["OTIO_SCHEMA"] == "Timeline.1"
    assert client.get("/api/ideas/iw/edit/edl").status_code == 409


# ---- duck route and the project fields ----

def test_duck_route(client, setup):
    t = take(client, results=results_of(speak("hello world there", step=0.4)))
    r = client.post("/api/ideas/ia/edit/duck", json={"clips": [clip(t, 0.0, 2.0)], "voiceover": []})
    assert r.status_code == 200 and r.json()["ranges"] == [[0.0, 1.2]]
    assert client.post("/api/ideas/ia/edit/duck", json={"clips": "x", "voiceover": []}).status_code == 422


def test_project_accepts_duck_and_export_settings(client, setup):
    base = client.get("/api/ideas/ia/edit").json()
    ok = {**base["project"], "music": {"volume": 0.5, "duck": False}, "export": {"preset": "reels", "loudnorm": False}}
    assert client.put("/api/ideas/ia/edit", json={"version": base["version"], "project": ok}).status_code == 200
    for bad in ({"music": {"volume": 0.5, "duck": "yes"}}, {"export": {"preset": "vimeo", "loudnorm": True}},
                {"export": {"preset": "tiktok", "loudnorm": 1}}, {"export": "x"}):
        r = client.put("/api/ideas/ia/edit", json={"version": base["version"] + 1, "project": {**base["project"], **bad}})
        assert r.status_code == 422, bad


def test_loudness_switch_changes_the_signature_only_when_off():
    p = editing.empty_project()
    assert editing.loudnorm_on(p) is True
    assert editing.loudnorm_on({**p, "export": {"preset": "tiktok", "loudnorm": False}}) is False

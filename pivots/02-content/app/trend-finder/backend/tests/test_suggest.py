"""AI edit suggestions: captions from speech, clean-up items, script alignment, take ranking. The pure functions
run on synthetic word lists and silences (no ffmpeg or whisper); the routes read analysis rows written by hand."""

import json
import time

import pytest

import cutting
import server
import suggest
from models import Shot
from test_takes import A, idea, store_ideas, up


def w(text, start, end):
    return {"text": text, "start": start, "end": end}


def speak(text, start=0.0, step=0.4, gap=0.0):
    """Words of `text`, each `step` s long, one after the other."""
    out, at = [], start
    for t in text.split():
        out.append(w(t, round(at, 3), round(at + step, 3)))
        at += step + gap
    return out


# ---- captions ----

def test_caption_chunks_break_at_four_words_punctuation_and_pauses():
    words = speak("one two three four five six") + [w("seven.", 3.0, 3.4), w("eight", 3.5, 3.9)]
    chunks = suggest.caption_chunks(speak("a b c d e f g h", step=0.2))
    assert [c["text"] for c in chunks] == ["a b c d", "e f g h"]
    # 1.2 s cap: 0.5 s words make a line of at most two words
    slow = suggest.caption_chunks(speak("one two three four", step=0.5))
    assert all(c["end"] - c["start"] <= 1.2 for c in slow) and len(slow) == 2
    # a sentence end and a pause both end a line
    mixed = suggest.caption_chunks([w("Hello", 0, 0.3), w("there.", 0.3, 0.6), w("Next", 0.6, 0.9), w("one", 1.9, 2.2)])
    assert [c["text"] for c in mixed] == ["Hello there.", "Next", "one"]
    # a comma ends a line only once it holds two words
    comma = suggest.caption_chunks([w("So,", 0, 0.2), w("first", 0.2, 0.4), w("boil,", 0.4, 0.6), w("water", 0.6, 0.8)])
    assert [c["text"] for c in comma] == ["So, first boil,", "water"]


def test_caption_chunks_leave_fillers_out():
    chunks = suggest.caption_chunks([w("So", 0, 0.2), w("um", 0.2, 0.5), w("boil", 0.5, 0.8), w("it.", 0.8, 1.0)])
    assert [c["text"] for c in chunks] == ["So boil it."]


def test_timeline_captions_shift_and_drop_words_outside_the_trim():
    words = {"t1": speak("alpha beta gamma delta", step=0.5), "t2": speak("one two", step=0.5)}
    clips = [{"source": {"kind": "take", "id": "t1"}, "in": 1.0, "out": 2.0},      # beta..gamma window: words at 1.0-2.0
             {"source": {"kind": "generation", "id": "g1"}, "in": 0.0, "out": 1.0},  # no speech to caption
             {"source": {"kind": "take", "id": "t2"}, "in": 0.0, "out": 1.0}]
    got = suggest.timeline_captions(clips, words)
    assert [(e["text"], e["start"], e["end"]) for e in got] == [("gamma delta", 0.0, 1.0), ("one two", 2.0, 3.0)]
    assert [e["id"] for e in got] == ["sp1", "sp2"]


def test_timeline_captions_cut_a_word_that_runs_past_the_clip():
    got = suggest.timeline_captions([{"source": {"kind": "take", "id": "t"}, "in": 0.0, "out": 0.5}], {"t": [w("long", 0.2, 0.7)]})
    assert got and got[0]["start"] == 0.2 and got[0]["end"] == 0.5


# ---- clean-up ----

MESSY = ([w("First", 0.5, 0.8), w("boil", 0.8, 1.1), w("the", 1.1, 1.3), w("water.", 1.3, 1.8),
          w("Um", 2.0, 2.3),
          w("First,", 4.5, 4.8), w("boil", 4.8, 5.1), w("the", 5.1, 5.3), w("water", 5.3, 5.7), w("for", 5.7, 5.9), w("tea.", 5.9, 6.3)])


def results_of(words, silences=(), duration=7.0, speech="ok", lufs=-14.0):
    return {"duration": duration, "silences": [list(s) for s in silences],
            "transcript": {"status": speech, "words": words}, "loudness": {"integratedLufs": lufs}}


def test_cleanup_items_find_silence_filler_and_retake():
    items = suggest.cleanup_items(results_of(MESSY, [(0.0, 0.5), (2.3, 4.5), (6.3, 7.0)]), 0.0, 7.0)
    kinds = [(i["type"], i["start"], i["end"]) for i in items]
    assert ("retake", 0.5, 4.5) in kinds        # the first try goes up to where the second begins
    assert ("filler", 2.0, 2.3) in kinds
    assert ("silence", 2.3, 4.5) in kinds
    assert ("silence", 0.0, 0.5) in kinds       # leading air is offered from 0.3 s, so no sliver of the cut word is left
    assert all({"id", "type", "start", "end", "label", "reason"} <= set(i) for i in items)
    assert [i["start"] for i in items] == sorted(i["start"] for i in items)


def test_cleanup_items_stay_inside_the_clip_range():
    items = suggest.cleanup_items(results_of(MESSY, [(2.3, 4.5)]), 3.0, 7.0)
    sil = [i for i in items if i["type"] == "silence"]
    assert sil == [{**sil[0], "start": 3.0, "end": 4.5, "where": "start"}]
    assert not [i for i in items if i["type"] in ("filler", "retake")]  # both are before 3.0


def test_edge_silences_are_marked_by_position():
    got = suggest.silence_items([[0.0, 1.5], [3.0, 4.0], [8.0, 9.5]], 0.0, 9.5)
    assert [g["where"] for g in got] == ["start", "middle", "end"]


def test_short_dead_air_is_offered_only_at_the_start():
    got = suggest.silence_items([[0.0, 0.4], [3.0, 3.4], [8.7, 9.5]], 0.0, 9.5)
    assert [g["where"] for g in got] == ["start", "end"]


def test_like_is_a_filler_only_when_set_off_by_commas():
    assert [f["text"] for f in suggest.filler_items([w("I", 0, .2), w("was,", .2, .5), w("like,", .5, .8), w("tired", .8, 1)])] == ["like"]
    assert suggest.filler_items([w("things", 0, .3), w("like", .3, .6), w("this", .6, .9)]) == []
    assert [f["text"] for f in suggest.filler_items([w("Uh,", 0, .3), w("erm", .3, .6), w("ok", .6, .9)])] == ["Uh", "erm"]


def test_no_retake_without_three_repeated_words_or_when_far_apart():
    assert suggest.retake_items(speak("boil the water then boil the pan")) == []  # only "boil the" repeats ... then a different third word
    far = speak("alpha beta gamma " + " ".join(f"w{i}" for i in range(40)) + " alpha beta gamma")
    assert suggest.retake_items(far) == []
    assert len(suggest.retake_items(speak("make it now make it now ok"))) == 1


def test_no_speech_gives_silences_only():
    r = results_of([], [(1.0, 2.0)], speech="unavailable")
    assert [i["type"] for i in suggest.cleanup_items(r, 0, 7)] == ["silence"]


def test_keep_ranges_pad_the_cuts_by_frames():
    keeps = suggest.keep_ranges(0.0, 10.0, [[2.0, 5.0]], 4)
    pad = 4 / 30
    assert keeps == [[0.0, round((2.0 + pad) * 30) / 30], [round((5.0 - pad) * 30) / 30, 10.0]]
    assert suggest.keep_ranges(0.0, 10.0, [[2.0, 5.0]], 0) == [[0.0, 2.0], [5.0, 10.0]]
    # the padding is capped at 10 frames
    capped = suggest.keep_ranges(0.0, 10.0, [[2.0, 5.0]], 99)
    assert capped[0][1] == round((2.0 + 10 / 30) * 30) / 30


def test_keep_ranges_merge_overlapping_cuts_and_undo_tiny_ones():
    assert suggest.keep_ranges(0.0, 10.0, [[2.0, 4.0], [3.0, 5.0]], 0) == [[0.0, 2.0], [5.0, 10.0]]
    # a cut shorter than 0.2 s after padding is not worth a seam
    assert suggest.keep_ranges(0.0, 10.0, [[4.0, 4.2]], 4) == [[0.0, 10.0]]
    # a leftover shorter than 0.2 s is dropped
    assert suggest.keep_ranges(0.0, 10.0, [[0.0, 2.0], [2.1, 10.0]], 0) == []
    assert suggest.keep_ranges(0.0, 10.0, [[0.0, 9.9]], 0) == []
    # cuts at the head and tail leave the middle
    assert suggest.keep_ranges(0.0, 10.0, [[0.0, 1.0], [9.0, 10.0]], 0) == [[1.0, 9.0]]


def test_keep_ranges_work_in_a_trimmed_clip_and_ignore_cuts_outside_it():
    assert suggest.keep_ranges(3.0, 6.0, [[0.0, 1.0], [4.0, 5.0]], 0) == [[3.0, 4.0], [5.0, 6.0]]


# ---- script alignment ----

LINE = "First boil the water for tea"


def test_alignment_finds_the_line_after_a_retake():
    a = suggest.align_script(MESSY, LINE, 7.0, 4)
    assert a["status"] == "ok" and a["coverage"] == 1.0 and a["missing"] == []
    assert a["in"] == pytest.approx(4.5 - 4 / 30, abs=0.02) and a["out"] == pytest.approx(6.3 + 4 / 30, abs=0.02)


def test_alignment_takes_the_last_try_when_the_line_is_said_twice():
    a = suggest.align_script(MESSY, "First boil the water", 7.0, 0)
    assert a["coverage"] == 1.0 and a["in"] == pytest.approx(4.5, abs=0.04) and a["out"] == pytest.approx(5.7, abs=0.04)


def test_alignment_reports_missing_words_and_partial_coverage():
    a = suggest.align_script(speak("First boil the water"), LINE, 3.0, 0)
    assert a["coverage"] == pytest.approx(4 / 6, abs=0.001) and a["missing"] == ["for tea"]
    assert a["in"] == 0.0 and a["out"] == 1.6


def test_alignment_ignores_case_and_punctuation_and_clamps_padding():
    a = suggest.align_script([w("HELLO,", 0.0, 0.3), w("world!", 0.3, 0.6)], "Hello world", 0.6, 10)
    assert a["coverage"] == 1.0 and a["in"] == 0.0 and a["out"] == 0.6


def test_alignment_manual_when_there_is_no_spoken_line_and_zero_without_words():
    assert suggest.align_script(MESSY, "", 7.0) == {"status": "manual"}
    assert suggest.align_script(MESSY, None, 7.0) == {"status": "manual"}
    a = suggest.align_script([], LINE, 7.0)
    assert a["coverage"] == 0.0 and a["in"] is None and a["missing"] == [LINE]


def test_alignment_unrelated_speech_has_no_range():
    a = suggest.align_script(speak("completely different words here today"), LINE, 3.0)
    assert a["coverage"] == 0.0 and a["in"] is None


def test_alignment_of_chinese_works_per_character():
    words = [w(c, i * 0.2, i * 0.2 + 0.2) for i, c in enumerate("先把水煮開")]
    a = suggest.align_script(words, "先把水煮開", 1.0, 0)
    assert a["coverage"] == 1.0 and a["in"] == 0.0


# ---- ranking ----

def cand(id, words, silences=(), lufs=-14.0, chosen=False):
    return {"id": id, "name": id, "chosen": chosen, "results": results_of(words, silences, lufs=lufs)}


CLEAN = speak("First boil the water for tea", start=0.3, step=0.35)


def test_ranking_prefers_the_take_that_covers_the_line_cleanly():
    ranked = suggest.rank_takes([cand("messy", MESSY, [(2.3, 4.5)]), cand("clean", CLEAN)], LINE)
    assert [r["takeId"] for r in ranked] == ["clean", "messy"]
    assert ranked[0]["coverage"] == 1.0 and ranked[0]["fillers"] == 0
    assert ranked[0]["reason"] == "covers 100% of the line, 0 fillers"
    assert "1 filler" in ranked[1]["reason"] and "1 retake" in ranked[1]["reason"] and "1 long pause" in ranked[1]["reason"]
    assert ranked[0]["score"] > ranked[1]["score"]


def test_ranking_returns_three_and_breaks_ties_by_age():
    ranked = suggest.rank_takes([cand(f"t{i}", CLEAN) for i in range(5)], LINE)
    assert [r["takeId"] for r in ranked] == ["t0", "t1", "t2"]


def test_loudness_closer_to_the_target_wins_a_tie():
    ranked = suggest.rank_takes([cand("quiet", CLEAN, lufs=-30.0), cand("right", CLEAN, lufs=-14.5)], LINE)
    assert ranked[0]["takeId"] == "right"


def test_ranking_without_a_line_still_scores_the_rest():
    ranked = suggest.rank_takes([cand("messy", MESSY, [(2.3, 4.5)]), cand("clean", CLEAN)], None)
    assert ranked[0]["takeId"] == "clean" and ranked[0]["coverage"] is None
    assert ranked[0]["reason"].startswith("no script line to compare")


# ---- routes ----

@pytest.fixture
def setup(client):
    client.put("/api/clients", json=[A])
    i = idea("ia")
    i.shots = [Shot(time="0-5s", shot="Pot", line=LINE), Shot(time="5-9s", shot="Cup")]
    store_ideas(i, idea("iw", "waiting"))


def put_analysis(take_id, idea_id="ia", status="done", results=None):
    with server.db() as conn:
        conn.execute("INSERT OR REPLACE INTO take_analysis (take_id, idea_id, status, error, results, updated_at) "
                     "VALUES (?, ?, ?, NULL, ?, ?)", (take_id, idea_id, status, json.dumps(results) if results else None, int(time.time() * 1000)))


def take(client, shot=0, results=None, status="done"):
    t = up(client, shot=shot).json()["id"]
    put_analysis(t, status=status, results=results)
    return t


def test_clip_suggestions(client, setup):
    t = take(client, results=results_of(MESSY, [(2.3, 4.5)]))
    r = client.get(f"/api/ideas/ia/edit/suggest/clip?take={t}&in=0&out=7")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ready" and body["speech"] == "ok" and body["line"] == LINE
    assert body["alignment"]["coverage"] == 1.0
    assert {i["type"] for i in body["cleanup"]} == {"silence", "filler", "retake"}
    # a narrower range only offers what is inside it
    narrow = client.get(f"/api/ideas/ia/edit/suggest/clip?take={t}&in=3&out=7").json()
    assert {i["type"] for i in narrow["cleanup"]} == {"silence"}


def test_clip_suggestions_for_a_shot_without_a_line_are_manual(client, setup):
    t = take(client, shot=1, results=results_of(MESSY))
    assert client.get(f"/api/ideas/ia/edit/suggest/clip?take={t}").json()["alignment"] == {"status": "manual"}


def test_clip_suggestions_not_ready_is_409(client, setup):
    t = take(client, results=None, status="running")
    r = client.get(f"/api/ideas/ia/edit/suggest/clip?take={t}")
    assert r.status_code == 409 and r.json()["status"] == "running" and "isn't ready" in r.json()["error"]
    failed = take(client, results=None, status="failed")
    r = client.get(f"/api/ideas/ia/edit/suggest/clip?take={failed}")
    assert r.status_code == 409 and r.json()["status"] == "failed"


def test_clip_suggestions_checks_plan_and_take(client, setup):
    t = take(client, results=results_of(MESSY))
    assert client.get(f"/api/ideas/nope/edit/suggest/clip?take={t}").status_code == 404
    assert client.get(f"/api/ideas/iw/edit/suggest/clip?take={t}").status_code == 409  # not approved
    assert client.get("/api/ideas/ia/edit/suggest/clip?take=missing").status_code == 404
    assert client.get(f"/api/ideas/ia/edit/suggest/clip?take={t}&in=5&out=2").status_code == 422
    assert client.get(f"/api/ideas/ia/edit/suggest/clip?take={t}&in=abc").status_code == 422


def test_whisper_unavailable_still_lists_silences(client, setup):
    t = take(client, results={**results_of([], [(1.0, 3.0)], speech="unavailable"), "transcript": {"status": "unavailable", "reason": cutting.NO_WHISPER, "words": []}})
    body = client.get(f"/api/ideas/ia/edit/suggest/clip?take={t}").json()
    assert body["speech"] == "unavailable" and [i["type"] for i in body["cleanup"]] == ["silence"]


def test_take_ranking_route(client, setup):
    messy = take(client, results=results_of(MESSY, [(2.3, 4.5)]))
    clean = take(client, results=results_of(CLEAN, duration=3.0))
    pending = take(client, results=None, status="running")
    shot = client.get("/api/ideas/ia/takes").json()[0]["shotId"]
    body = client.get(f"/api/ideas/ia/edit/suggest/takes?shot={shot}").json()
    assert [r["takeId"] for r in body["ranking"]] == [clean, messy] and body["pending"] == [pending] and body["count"] == 3
    # a shot with one take has nothing to rank
    only = take(client, shot=1, results=results_of(CLEAN))
    other = client.get("/api/ideas/ia/takes").json()
    sid = next(t["shotId"] for t in other if t["id"] == only)
    assert client.get(f"/api/ideas/ia/edit/suggest/takes?shot={sid}").json()["ranking"] == []


def test_keeps_route(client, setup):
    r = client.post("/api/ideas/ia/edit/suggest/keeps", json={"in": 0, "out": 10, "removals": [[2, 5]], "paddingFrames": 0})
    assert r.status_code == 200 and r.json() == {"keeps": [[0.0, 2.0], [5.0, 10.0]], "seconds": 7.0}
    assert client.post("/api/ideas/ia/edit/suggest/keeps", json={"in": 0, "out": 10, "removals": [[0, 10]]}).status_code == 422
    assert client.post("/api/ideas/ia/edit/suggest/keeps", json={"in": 0, "out": 10, "removals": "x"}).status_code == 422
    assert client.post("/api/ideas/ia/edit/suggest/keeps", json={"in": 5, "out": 1, "removals": []}).status_code == 422


def test_captions_route(client, setup):
    t = take(client, results=results_of(MESSY, [(2.3, 4.5)]))
    clips = [{"source": {"kind": "take", "id": t}, "in": 4.0, "out": 7.0}]
    body = client.post("/api/ideas/ia/edit/suggest/captions", json={"clips": clips}).json()
    assert body["status"] == "ok" and body["entries"][0]["text"] == "First, boil the water"
    assert body["entries"][0]["start"] == pytest.approx(0.5)
    assert client.post("/api/ideas/ia/edit/suggest/captions", json={"clips": [{"source": {"kind": "take", "id": "zzz"}, "in": 0, "out": 1}]}).status_code == 404
    assert client.post("/api/ideas/ia/edit/suggest/captions", json={"clips": "no"}).status_code == 422


def test_captions_route_reports_no_speech_and_unready_takes(client, setup):
    silent = take(client, results=results_of([], [(0, 3)], speech="none"))
    r = client.post("/api/ideas/ia/edit/suggest/captions", json={"clips": [{"source": {"kind": "take", "id": silent}, "in": 0, "out": 3}]})
    assert r.json() == {"status": "none", "entries": []}
    waiting = take(client, results=None, status="queued")
    r = client.post("/api/ideas/ia/edit/suggest/captions", json={"clips": [{"source": {"kind": "take", "id": waiting}, "in": 0, "out": 3}]})
    assert r.status_code == 409


def test_project_accepts_speech_captions(client, setup):
    base = client.get("/api/ideas/ia/edit").json()
    proj = {**base["project"], "captions": {"enabled": True, "source": "speech", "speechKey": "abc",
                                            "speech": [{"id": "sp1", "start": 0.0, "end": 1.0, "text": "hello"}]}}
    assert client.put("/api/ideas/ia/edit", json={"version": base["version"], "project": proj}).status_code == 200
    for bad in ({"enabled": True, "source": "other"}, {"enabled": True, "speech": [{"id": "x", "start": 2, "end": 1, "text": "a"}]},
                {"enabled": True, "speech": [{"id": "x", "start": 0, "end": 1, "text": 3}]}):
        r = client.put("/api/ideas/ia/edit", json={"version": base["version"] + 1, "project": {**base["project"], "captions": bad}})
        assert r.status_code == 422

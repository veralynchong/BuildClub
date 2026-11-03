"""Clean-up of an HDR take: which ffmpeg and filter chain is chosen (no ffmpeg run needed)."""

import logging

import pytest

import cleaning
import cutting

KEEPS = [(0, 1.12), (2.38, 3.5)]
TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]


def test_sdr_take_uses_plain_ffmpeg_and_the_old_graph():
    for trc in (None, "bt709", "iec61966-2-1"):
        plan = cleaning.encode_plan({"color_transfer": trc}, KEEPS, "/x/ffmpeg-full")
        assert plan.binary == "ffmpeg"
        assert plan.graph == cutting.build_clean_graph(KEEPS)
        assert plan.out_args == []
        assert plan.out_label == "[v]"


@pytest.mark.parametrize("trc", ["smpte2084", "arib-std-b67"])
def test_hdr_take_is_tone_mapped_with_the_hdr_ffmpeg(trc):
    plan = cleaning.encode_plan({"color_transfer": trc}, KEEPS, "/x/ffmpeg-full")
    assert plan.binary == "/x/ffmpeg-full"
    assert plan.out_label == "[vt]"
    assert plan.graph.startswith(cutting.build_clean_graph(KEEPS).replace("[v][a]", "[vc][a]"))
    assert ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,"
            "zscale=t=bt709:m=bt709:r=tv,format=yuv420p[vt]") in plan.graph
    assert plan.out_args == TAGS


def test_hdr_take_without_an_hdr_ffmpeg_keeps_the_old_command():
    plan = cleaning.encode_plan({"color_transfer": "smpte2084"}, KEEPS, None)
    assert plan.binary == "ffmpeg" and plan.out_label == "[v]" and plan.out_args == []
    assert plan.graph == cutting.build_clean_graph(KEEPS)


def test_hdr_ffmpeg_env_beats_the_fallback_and_needs_zscale(monkeypatch, tmp_path):
    fake = tmp_path / "ff"
    fake.write_text("")
    monkeypatch.setattr(cleaning, "_hdr_bin", cleaning._UNSET)
    monkeypatch.setenv("FFMPEG_HDR_BIN", str(fake))
    monkeypatch.setattr(cleaning, "has_zscale", lambda b: b == str(fake))
    assert cleaning.hdr_ffmpeg() == str(fake)


def test_hdr_ffmpeg_missing_or_without_zscale_is_none_and_logs_once(monkeypatch, tmp_path, caplog):
    monkeypatch.setattr(cleaning, "_hdr_bin", cleaning._UNSET)
    monkeypatch.setenv("FFMPEG_HDR_BIN", str(tmp_path / "nope"))
    monkeypatch.setattr(cleaning, "HDR_FALLBACK_BIN", str(tmp_path / "also-nope"))
    with caplog.at_level(logging.WARNING):
        assert cleaning.hdr_ffmpeg() is None
        assert cleaning.hdr_ffmpeg() is None
    assert len([r for r in caplog.records if "zscale" in r.getMessage()]) == 1

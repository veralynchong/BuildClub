"""Text width, the one thing left of subtitles: the voiceover length estimate uses it."""

import subtitles


def test_cjk_counts_double():
    assert subtitles.is_cjk("字") and not subtitles.is_cjk("a")
    assert subtitles.width_units("hello") == 5
    assert subtitles.width_units("你好 hi") == 7

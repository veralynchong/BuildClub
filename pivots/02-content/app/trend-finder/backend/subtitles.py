"""Text width for the voiceover length estimate: a CJK character counts 2, anything else 1."""


def is_cjk(ch: str) -> bool:
    o = ord(ch)
    return (0x2E80 <= o <= 0x9FFF or 0xAC00 <= o <= 0xD7AF or 0xF900 <= o <= 0xFAFF
            or 0x3000 <= o <= 0x303F or 0xFF00 <= o <= 0xFFEF)


def width_units(text: str) -> int:
    return sum(2 if is_cjk(c) else 1 for c in text)

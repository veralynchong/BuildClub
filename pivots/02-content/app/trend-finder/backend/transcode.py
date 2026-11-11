"""Phone footage to a file every browser and the renderer can play: H.264 8-bit yuv420p SDR in an mp4 (AAC audio).
A take that already is that stays as uploaded; anything else (HEVC, HDR, .mov, .m4v, .webm ...) is converted
and the original is kept beside it."""

import logging
from pathlib import Path

import cutting
from cutting import CutError

log = logging.getLogger(__name__)

HDR_TRANSFERS = {"smpte2084", "arib-std-b67"}  # PQ (HDR10) and HLG


def needs_transcode(info: dict, ext: str) -> bool:
    """True when the probed file is not an H.264 8-bit SDR mp4. `ext` is the container it arrived in."""
    return (ext != "mp4" or info.get("vcodec") != "h264" or info.get("pix_fmt") != "yuv420p"
            or info.get("color_transfer") in HDR_TRANSFERS)


def to_proxy(src: Path, out: Path, info: dict) -> None:
    """Write an H.264 yuv420p SDR mp4 of `src` to `out`. Raises CutError with a one-sentence reason."""
    import cleaning  # imported late: cleaning imports takes, which imports this module

    binary, vf = "ffmpeg", "format=yuv420p"
    tags: list[str] = []
    if info.get("color_transfer") in HDR_TRANSFERS:
        hdr = cleaning.hdr_ffmpeg()
        if hdr:
            binary, vf, tags = hdr, cleaning.HDR_CHAIN, cleaning.BT709_TAGS
    part = out.with_suffix(".part")
    args = ["-i", str(src), "-map", "0:v:0", "-map", "0:a:0?", "-vf", vf,
            "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p", *tags,
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-f", "mp4", str(part)]
    try:
        cutting._ffmpeg(args, "Converting the video", binary=binary)
        part.replace(out)
    except CutError:
        log.warning("Transcode of %s failed", src.name, exc_info=True)
        raise
    finally:
        part.unlink(missing_ok=True)

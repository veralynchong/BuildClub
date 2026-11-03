#!/usr/bin/env bash
# Builds the synthetic media used by the A2-A8 checks (ffmpeg + macOS `say` only, nothing downloaded).
# Run: bash pivots/02-content/app/trend-finder/e2e/make-fixtures.sh <output_dir>
# Output (all in <output_dir>): clip-1..9.mp4, speech-hevc.mov, speech-hdr10.mp4, speech-sdr.mp4,
#   ref.png, silence-take.mp4, noise-take.mp4, noise-loud-take.mp4, silence.wav, noise.wav, noise-loud.wav, zh.wav, zh-tw.wav
set -eu
out="${1:?usage: make-fixtures.sh <output_dir>}"
mkdir -p "$out"; cd "$out"
ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# Speech with a 1.5 s pause and two "um"s (say voice), the same shape the P4 clean-up checks used.
say -v Samantha -o speech.aiff "Hello. [[slnc 1500]] um this is a test of the um video tool"
ff -i speech.aiff -ar 44100 -ac 1 speech.wav
sd=$(ffprobe -v error -show_entries format=duration -of csv=p=0 speech.wav)

# A2: nine distinct 540x960 clips of 8 s (different hue each) with a tone, to slice into 20+ timeline clips.
for i in 1 2 3 4 5 6 7 8 9; do
  ff -f lavfi -i "testsrc2=size=540x960:rate=30:duration=8,hue=h=$((i * 40))" \
     -f lavfi -i "sine=frequency=$((200 + i * 60)):duration=8:sample_rate=44100" \
     -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "clip-$i.mp4"
done

# A3: landscape 1080p HEVC in a .mov with the hvc1 tag (what an iPhone writes), speech audio.
ff -f lavfi -i "testsrc2=size=1920x1080:rate=30:duration=$sd" -i speech.wav \
   -c:v libx265 -tag:v hvc1 -pix_fmt yuv420p -preset ultrafast -c:a aac -shortest -movflags +faststart speech-hevc.mov

# A4: 10-bit HDR10 (BT.2020 + PQ) HEVC, same speech; and an 8-bit SDR twin for comparing colour.
ff -f lavfi -i "testsrc2=size=1080x1920:rate=30:duration=$sd" -i speech.wav \
   -c:v libx265 -tag:v hvc1 -pix_fmt yuv420p10le -preset ultrafast \
   -x265-params "colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:range=limited:hdr10=1:max-cll=1000,400:master-display=G(13250,34500)B(7500,3000)R(34000,16000)WP(15635,16450)L(10000000,1)" \
   -color_primaries bt2020 -color_trc smpte2084 -colorspace bt2020nc -c:a aac -shortest speech-hdr10.mp4
ff -f lavfi -i "testsrc2=size=1080x1920:rate=30:duration=$sd" -i speech.wav \
   -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest speech-sdr.mp4

# A5: a reference image for the canvas
ff -f lavfi -i "testsrc2=size=540x960:rate=1:duration=1" -frames:v 1 ref.png

# A6: no speech at all. Digital silence, and weak pink noise (amplitude 0.01 = about -40 dBFS).
ff -f lavfi -i "anullsrc=r=16000:cl=mono" -t 8 silence.wav
ff -f lavfi -i "anoisesrc=color=pink:amplitude=0.01:sample_rate=16000:duration=8" -ac 1 noise.wav
ff -f lavfi -i "anoisesrc=color=pink:amplitude=0.1:sample_rate=16000:duration=8" -ac 1 noise-loud.wav  # about -20 dBFS room noise
for n in silence noise noise-loud; do
  ff -f lavfi -i "testsrc2=size=540x960:rate=30:duration=8" -i "$n.wav" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "$n-take.mp4"
done

# A7: Mandarin speech (Tingting zh_CN, Meijia zh_TW) with a 1.2 s pause in the middle.
say -v Tingting -o zh.aiff "大家好，今天我們來聊三個剪輯小技巧。第一，先把素材整理好。[[slnc 1200]] 第二，剪掉多餘的停頓。第三，加上字幕和音樂，就完成了。"
ff -i zh.aiff -ar 44100 -ac 1 zh.wav
say -v Meijia -o zh-tw.aiff "大家好，今天我們來聊三個剪輯小技巧。第一，先把素材整理好。[[slnc 1200]] 第二，剪掉多餘的停頓。第三，加上字幕和音樂，就完成了。"
ff -i zh-tw.aiff -ar 44100 -ac 1 zh-tw.wav
rm -f ./*.aiff
ls -la "$out"

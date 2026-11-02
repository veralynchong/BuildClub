// Manual smoke for text, logo, music and captions: renders three mixed sources with Chinese text in every position and
// colour, a logo and a music track for real, then a Chinese lines-captions video and an English voiceover video
// (needs ffmpeg and Chrome, ~1 min). Not part of verify.sh.
// node render/smoke-p3b.mjs [frameDir]
// Voice words come from VOICE_WORDS (a json file of {text,start,end}) and the audio from VOICE_AUDIO when set (see
// the Task 11 report); otherwise macOS `say` and fixed words are used.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const work = mkdtempSync(path.join(os.tmpdir(), 'reel-smoke-p3b-'))
const media = path.join(work, 'media')
mkdirSync(media)
const frameDir = process.argv[2] ? path.resolve(process.argv[2]) : work
mkdirSync(frameDir, { recursive: true })

const fail = (m) => {
  console.error(`SMOKE FAIL: ${m}`)
  process.exit(1)
}
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const ff = (...args) => run('ffmpeg', ['-y', '-loglevel', 'error', ...args])
const enc = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p']

// Footage is silent, so any sound in the result is the music.
ff('-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=25:duration=3', ...enc, '-an', path.join(media, 'a.mp4'))
ff('-f', 'lavfi', '-i', 'testsrc2=size=1080x1920:rate=30:duration=3', ...enc, '-an', path.join(media, 'b.mp4'))
ff('-f', 'lavfi', '-i', 'testsrc2=size=720x1280:rate=60:duration=3', ...enc, '-an', path.join(media, 'c.mp4'))
ff('-f', 'lavfi', '-i', 'color=c=0xe11d48:size=400x200:duration=1', '-frames:v', '1', path.join(media, 'logo.png'))
ff('-f', 'lavfi', '-i', 'sine=frequency=330:duration=10', '-c:a', 'libmp3lame', path.join(media, 'music.mp3'))

const clip = (id, sid, inn, out) => ({ id, source: { kind: 'generation', id: sid }, in: inn, out, volume: 1, muted: false })
const text = (id, body, start, end, position, color) => ({ id, text: body, start, end, position, color })
const project = {
  fps: 30, width: 1080, height: 1920,
  clips: [clip('c1', 'a', 0.5, 2.5), clip('c2', 'b', 0, 2), clip('c3', 'c', 0, 2)],
  texts: [
    text('t1', '三分鐘學會剪輯短影音', 0, 1.9, 'top', 'white'),
    text('t2', '這是一段很長的中文字幕，用來確認文字會在九百四十像素寬的欄位裡自動換行', 2, 3.9, 'bottom', 'white'),
    text('t3', '黑色字加白色描邊', 4, 5.9, 'middle', 'black'),
    text('t4', '品牌色文字 Brand', 4, 5.9, 'top', 'brand'),
  ],
  captions: { enabled: false }, music: { volume: 0.5 }, voiceover: [], primaries: {}, showLogo: true,
}
const input = {
  project,
  urls: { 'generation:a': 'a.mp4', 'generation:b': 'b.mp4', 'generation:c': 'c.mp4' },
  lines: {}, musicUrl: 'music.mp3', voice: [], brand: { font: 'Noto Sans TC', color: '#22c55e', logoUrl: 'logo.png' }, fontUrl: '',
}
function render(name, inp) {
  const out = path.join(work, `${name}.mp4`)
  const jobFile = path.join(work, `${name}.job.json`)
  writeFileSync(jobFile, JSON.stringify({ input: inp, mediaDir: media, out, cacheDir: path.join(APP, '.remotion-bundle') }))
  const t0 = Date.now()
  const r = spawnSync('node', [path.join(APP, 'render/render-reel.mjs'), jobFile], { cwd: APP, encoding: 'utf8' })
  if (r.status !== 0) fail(`${name}: render exited ${r.status}: ${r.stderr.trim()}`)
  return { out, seconds: (Date.now() - t0) / 1000 }
}
const { out, seconds } = render('out', input)

const probeOf = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]))
const probe = probeOf(out)
const v = probe.streams.find((s) => s.codec_type === 'video')
const a = probe.streams.find((s) => s.codec_type === 'audio')
const dur = Number(probe.format.duration)
if (!v || v.width !== 1080 || v.height !== 1920) fail(`size ${v && v.width}x${v && v.height}`)
if (!a || a.codec_name !== 'aac') fail('no aac audio track')
if (Math.abs(dur - 6.0) > 0.1) fail(`duration ${dur}`)

function meanVolume(from, to) {
  const m = /mean_volume: (-?[\d.]+|-inf) dB/.exec(spawnSync('ffmpeg', ['-hide_banner', '-ss', String(from), '-to', String(to), '-i', out, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr)
  return m ? Number(m[1]) : -Infinity
}
const early = meanVolume(0.5, 1.5)
const late = meanVolume(4.5, 5.5)
if (!(early > -40) || !(late > -40)) fail(`music should be audible all through (${early} dB, ${late} dB)`)

for (const t of [1, 3, 5]) ff('-ss', String(t), '-i', out, '-frames:v', '1', path.join(frameDir, `frame-${t}s.png`))
console.log(`SMOKE OK render ${seconds.toFixed(1)}s ${v.width}x${v.height} ${a.codec_name} ${dur.toFixed(3)}s music ${early} / ${late} dB`)
console.log(`out ${out}`)

// ---- captions from the shots' lines: shot s1 appears twice (clips 1 and 3) and shares one line over both ----
const lineProject = {
  ...project, texts: [], showLogo: false, music: null, captions: { enabled: true },
  clips: [{ ...clip('c1', 'a', 0, 2), source: { kind: 'generation', id: 'a', shotId: 's1' } },
    { ...clip('c2', 'b', 0, 2), source: { kind: 'generation', id: 'b', shotId: 's2' } },
    { ...clip('c3', 'c', 0, 2), source: { kind: 'generation', id: 'c', shotId: 's1' } }],
}
const lineRun = render('lines', {
  ...input, project: lineProject, musicUrl: null,
  lines: { s1: '三分鐘學會剪輯，從今天開始跟著做，你也可以', s2: '第二個鏡頭的台詞比較長一點，所以這一行會自動換行顯示在畫面下方' },
})
for (const t of [0.3, 1.5, 2.5, 4.5, 5.5]) ff('-ss', String(t), '-i', lineRun.out, '-frames:v', '1', path.join(frameDir, `lines-${t}s.png`))
console.log(`SMOKE OK lines ${lineRun.seconds.toFixed(1)}s`)

// ---- captions from a voiceover: macOS `say` English speech and its word times ----
const voiceFile = process.env.VOICE_AUDIO && existsSync(process.env.VOICE_AUDIO) ? process.env.VOICE_AUDIO : null
if (voiceFile) ff('-i', voiceFile, '-ac', '1', '-ar', '44100', path.join(media, 'voice.wav'))
else {
  run('say', ['-o', path.join(work, 'voice.aiff'), 'Learn video editing in three days. Cut fast, add captions, and publish.'])
  ff('-i', path.join(work, 'voice.aiff'), '-ac', '1', '-ar', '44100', path.join(media, 'voice.wav'))
}
const fixed = [['Learn', 0, 0.3], ['video', 0.3, 0.6], ['editing', 0.6, 1], ['in', 1, 1.1], ['three', 1.1, 1.4], ['days.', 1.4, 1.9], ['Cut', 2.2, 2.4], ['fast,', 2.4, 2.8], ['add', 2.8, 3], ['captions,', 3, 3.8], ['and', 3.8, 3.9], ['publish.', 3.9, 4.6]]
const words = process.env.VOICE_WORDS && existsSync(process.env.VOICE_WORDS) ? JSON.parse(readFileSync(process.env.VOICE_WORDS, 'utf8')) : fixed.map(([text, start, end]) => ({ text, start, end }))
const voiceProject = {
  ...lineProject,
  voiceover: [{ id: 'v1', source: 'upload', start: 0.5, volume: 1, edits: { 1: 'Cut fast, EDIT captions,' } }],
}
const voiceRun = render('voice', { ...input, project: voiceProject, musicUrl: null, lines: { s1: '台詞不該出現', s2: '台詞不該出現' }, voice: [{ id: 'v1', url: 'voice.wav', words }] })
const vp = probeOf(voiceRun.out)
if (!vp.streams.find((s) => s.codec_type === 'audio')) fail('voice video has no audio track')
const voiceOut = voiceRun.out // the footage is silent, so any sound is the voiceover
const vol = (from, to) => {
  const m = /mean_volume: (-?[\d.]+|-inf) dB/.exec(spawnSync('ffmpeg', ['-hide_banner', '-ss', String(from), '-to', String(to), '-i', voiceOut, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr)
  return m ? Number(m[1]) : -Infinity
}
const loud = vol(1, 4)
if (!(loud > -45)) fail(`the voiceover should be audible (${loud} dB)`)
for (const t of [1.2, 2.5, 3.5, 5.0]) ff('-ss', String(t), '-i', voiceOut, '-frames:v', '1', path.join(frameDir, `voice-${t}s.png`))
console.log(`SMOKE OK voice ${voiceRun.seconds.toFixed(1)}s voiceover ${loud} dB`)

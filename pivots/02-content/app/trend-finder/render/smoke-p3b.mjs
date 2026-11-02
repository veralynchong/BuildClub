// Manual smoke for text, logo and music: renders three mixed sources with Chinese text in every position and colour,
// a logo and a music track for real (needs ffmpeg and Chrome, ~30 s). Not part of verify.sh.
// node render/smoke-p3b.mjs [frameDir]
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
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
const out = path.join(work, 'out.mp4')
const jobFile = path.join(work, 'job.json')
writeFileSync(jobFile, JSON.stringify({ input, mediaDir: media, out, cacheDir: path.join(APP, '.remotion-bundle') }))

const t0 = Date.now()
const r = spawnSync('node', [path.join(APP, 'render/render-reel.mjs'), jobFile], { cwd: APP, encoding: 'utf8' })
const seconds = (Date.now() - t0) / 1000
if (r.status !== 0) fail(`render exited ${r.status}: ${r.stderr.trim()}`)

const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', out]))
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

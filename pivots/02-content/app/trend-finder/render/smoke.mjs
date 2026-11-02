// Manual smoke: renders three mixed sources for real (needs ffmpeg and Chrome, ~30 s). Not part of verify.sh.
// node render/smoke.mjs [frameDir]
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const work = mkdtempSync(path.join(os.tmpdir(), 'reel-smoke-'))
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
const tone = ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3']
const enc = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p']

ff('-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=25:duration=3', ...enc, '-an', path.join(media, 'a.mp4'))
ff('-f', 'lavfi', '-i', 'testsrc2=size=1080x1920:rate=30:duration=3', ...tone, ...enc, '-c:a', 'aac', '-shortest', path.join(media, 'b.mp4'))
ff('-f', 'lavfi', '-i', 'testsrc2=size=720x1280:rate=60:duration=3', ...tone, ...enc, '-c:a', 'aac', '-shortest', path.join(media, 'c.mp4'))

const clip = (id, sid, inn, out, muted) => ({ id, source: { kind: 'generation', id: sid }, in: inn, out, volume: 1, muted })
const project = {
  fps: 30, width: 1080, height: 1920,
  clips: [clip('c1', 'a', 0.5, 2.5, false), clip('c2', 'b', 0, 2, false), clip('c3', 'c', 0, 2, true)],
  texts: [], captions: { enabled: false }, music: null, voiceover: [], primaries: {}, showLogo: false,
}
const input = {
  project,
  urls: { 'generation:a': 'a.mp4', 'generation:b': 'b.mp4', 'generation:c': 'c.mp4' },
  lines: {}, musicUrl: null, voice: [], brand: { font: 'Noto Sans TC', color: null, logoUrl: null }, fontUrl: '',
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
if (v.r_frame_rate !== '30/1') fail(`frame rate ${v.r_frame_rate}`)
if (!a || a.codec_name !== 'aac') fail('no aac audio track')
if (Math.abs(dur - 6.0) > 0.1) fail(`duration ${dur}`)

// Mean volume of one time window.
function meanVolume(from, to) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-ss', String(from), '-to', String(to), '-i', out, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' })
  const m = /mean_volume: (-?[\d.]+|-inf) dB/.exec(r.stderr)
  return m ? Number(m[1]) : -Infinity
}
const loud = meanVolume(2.2, 3.8)
const muted = meanVolume(4.2, 5.8)
if (!(loud > -40)) fail(`clip 2 should be audible, mean ${loud} dB`)
if (!(muted < -60)) fail(`muted clip 3 should be silent, mean ${muted} dB`)

for (const t of [1, 3.5, 5]) ff('-ss', String(t), '-i', out, '-frames:v', '1', path.join(frameDir, `frame-${t}s.png`))
console.log(`SMOKE OK render ${seconds.toFixed(1)}s ${v.width}x${v.height} ${v.r_frame_rate} ${a.codec_name} ${dur.toFixed(3)}s clip2 ${loud} dB muted ${muted} dB`)
console.log(`out ${out}`)

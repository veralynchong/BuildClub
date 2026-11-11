import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DUCK_GAIN, duckFactor, musicVolume } from '../src/lib/editor/duck.ts'
import { PLATFORMS, exportSettings, safeZoneWarnings, secondsOver, wordsBox } from '../src/lib/editor/presets.ts'
import { applyFirstCut, firstCutLine } from '../src/lib/editor/aiEdit.ts'

const project = (extra = {}) => ({
  fps: 30, width: 1080, height: 1920, clips: [], texts: [], captions: { enabled: false }, music: null, voiceover: [], primaries: {}, showLogo: false, logoSize: 'medium', logoCorner: 'top-right', ...extra,
})
const text = (id, body, position, start = 0) => ({ id, text: body, start, end: start + 2, position, color: 'white' })

test('duckFactor: level outside speech, -12 dB under it, ramps in front and behind', () => {
  const r = [[10, 12]]
  assert.equal(duckFactor(0, r), 1)
  assert.ok(Math.abs(DUCK_GAIN - 0.2512) < 0.001)
  assert.equal(duckFactor(11, r), DUCK_GAIN)
  assert.ok(duckFactor(9.9, r) < 1 && duckFactor(9.9, r) > DUCK_GAIN)
  assert.ok(duckFactor(12.3, r) < 1 && duckFactor(12.3, r) > DUCK_GAIN)
  assert.equal(duckFactor(13, r), 1)
})

test('duckFactor: the lowest of overlapping ranges wins; musicVolume scales the base level', () => {
  assert.equal(duckFactor(5, [[4, 6], [5, 7]]), DUCK_GAIN)
  assert.equal(musicVolume(0.5, undefined, 30), 0.5)
  assert.equal(musicVolume(0.5, [], 30), 0.5)
  assert.ok(Math.abs(musicVolume(0.5, [[0, 5]], 30) - 0.5 * DUCK_GAIN) < 1e-9)
})

test('export settings default to TikTok with loudness on', () => {
  assert.deepEqual(exportSettings({}), { preset: 'tiktok', loudnorm: true })
  assert.deepEqual(exportSettings({ export: { preset: 'reels', loudnorm: false } }), { preset: 'reels', loudnorm: false })
})

test('platform length limits: TikTok 10 min, Reels and Shorts 3 min', () => {
  assert.equal(PLATFORMS.tiktok.maxSeconds, 600)
  assert.equal(PLATFORMS.reels.maxSeconds, 180)
  assert.equal(PLATFORMS.shorts.maxSeconds, 180)
  assert.equal(secondsOver(200, 'reels'), 20)
  assert.equal(secondsOver(200, 'tiktok'), 0)
})

test('wordsBox: Chinese is as wide as tall, long lines wrap at the 940 px column', () => {
  assert.deepEqual(wordsBox('你好', 96, 1.25), { w: 192, h: 120 })
  const long = wordsBox('x'.repeat(40), 96, 1.25)
  assert.equal(long.w, 940)
  assert.equal(long.h, 360)
})

test('safe zone: a bottom text at the default place is clear, a long caption reaches the right-hand buttons', () => {
  const clear = safeZoneWarnings(project({ texts: [text('t1', 'Hi', 'bottom')] }), [], 'tiktok')
  assert.deepEqual(clear, [])
  const wide = safeZoneWarnings(project({ texts: [text('t1', 'x'.repeat(30), 'middle', 3)] }), [], 'tiktok')
  assert.deepEqual(wide.map((w) => [w.kind, w.side, w.count, w.at]), [['text', 'right', 1, 3]])
})

test('safe zone: platforms differ (Reels covers more of the top) and captions are checked too', () => {
  const p = project({ texts: [text('t1', 'Hi', 'top')] })
  assert.deepEqual(safeZoneWarnings(p, [], 'tiktok'), [])
  assert.deepEqual(safeZoneWarnings(p, [], 'reels').map((w) => w.side), ['top'])
  const page = { text: 'a caption', startMs: 1500, durationMs: 1000, tokens: [] }
  assert.deepEqual(safeZoneWarnings(project(), [page], 'shorts'), [])
  const tall = { ...page, text: 'word '.repeat(40) } // wraps to many lines, climbing out of its place
  assert.ok(safeZoneWarnings(project(), [tall], 'shorts').some((w) => w.kind === 'caption'))
})

const cut = (extra = {}) => ({
  clips: [{ id: 'c1', source: { kind: 'take', id: 't1', shotId: 's1' }, in: 0, out: 2, volume: 1, muted: false }],
  primaries: { s1: { kind: 'take', id: 't1', shotId: 's1' } },
  captions: { status: 'ok', entries: [{ id: 'sp1', start: 0, end: 1, text: 'hello' }] },
  ...extra,
})

test('applyFirstCut replaces the clips, pins the takes and turns on speech captions', () => {
  const p = project({ clips: [{ id: 'old', source: { kind: 'take', id: 'x' }, in: 0, out: 1, volume: 1, muted: false }], texts: [text('t1', 'Hi', 'top')], primaries: { s9: { kind: 'take', id: 'z' } } })
  const next = applyFirstCut(p, cut())
  assert.deepEqual(next.clips.map((c) => c.id), ['c1'])
  assert.equal(next.captions.enabled, true)
  assert.equal(next.captions.source, 'speech')
  assert.equal(next.captions.speech.length, 1)
  assert.deepEqual(Object.keys(next.primaries).sort(), ['s1', 's9'])
  assert.equal(next.texts.length, 1)
  assert.equal(p.clips[0].id, 'old', 'the input is not changed')
})

test('applyFirstCut leaves the captions alone with no speech, and does nothing with no clips', () => {
  const next = applyFirstCut(project(), cut({ captions: { status: 'none', entries: [] } }))
  assert.equal(next.captions.enabled, false)
  const p = project()
  assert.equal(applyFirstCut(p, cut({ clips: [] })), p)
})

test('firstCutLine reads each decision in plain words', () => {
  const pick = { kind: 'pick', text: '', shot: 2, at: 3, takes: 2, speech: 'ok', coverage: 1, fillers: 0, longPauses: 0, retakes: 0 }
  assert.equal(firstCutLine(pick, 'Take 2'), 'Shot 2: picked Take 2 of 2 takes — covers 100% of the line, 0 fillers')
  assert.equal(firstCutLine({ ...pick, takes: 1 }, 'Take 1'), 'Shot 2: used the only take, Take 1 — covers 100% of the line, 0 fillers')
  assert.equal(firstCutLine({ kind: 'cut', type: 'silence', text: '', shot: 1, at: 1, start: 3.4, end: 4.6, seconds: 1.2 }, ''), 'Shot 1: removed 1.2s of silence at 0:03.4')
  assert.equal(firstCutLine({ kind: 'cut', type: 'filler', text: '', shot: 1, at: 1, start: 2, end: 2.3, said: 'um' }, ''), 'Shot 1: removed the filler “um” at 0:02.0')
  assert.equal(firstCutLine({ kind: 'skip', text: '', shot: 3, at: 5, why: 'none' }, ''), 'Shot 3: no footage, skipped')
  assert.equal(firstCutLine({ kind: 'trim', text: '', shot: 1, at: 0, start: 0.4, end: 3.1, duration: 8 }, ''), 'Shot 1: trimmed to the line, 0:00.4 to 0:03.1 of 0:08.0')
})

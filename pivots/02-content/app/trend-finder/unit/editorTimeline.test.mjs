import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitZoom, followScroll, laneBars, previewOf, removeBar, setBarTime, snapMove, snapTargets, snapThreshold, snapTime, tickStep, timecode } from '../src/lib/editor/lanes.ts'
import { HISTORY_LIMIT, MERGE_MS, emptyHistory, lastAi, record, redo, undo } from '../src/lib/editor/history.ts'

const take = (id) => ({ kind: 'take', id })
const clip = (id, inn, out) => ({ id, source: take(id), in: inn, out, volume: 1, muted: false })
const project = (extra = {}) => ({
  fps: 30, width: 1080, height: 1920, clips: [clip('c1', 0, 4), clip('c2', 1, 7)], texts: [], captions: { enabled: true }, music: null, voiceover: [], primaries: {},
  showLogo: false, logoSize: 'medium', logoCorner: 'top-right', ...extra,
})
const facts = (extra = {}) => ({ captionMode: 'lines', pages: [], voiceSeconds: {}, voiceLabel: (i) => `Voice ${i + 1}`, musicLabel: null, ...extra })

test('laneBars: clips sit end to end, texts keep their times, music spans the video', () => {
  const p = project({ texts: [{ id: 't1', text: 'Hi', start: 1, end: 3, position: 'bottom', color: 'white' }], music: { volume: 0.5 } })
  const lanes = laneBars(p, facts({ musicLabel: 'song.mp3' }))
  assert.deepEqual(lanes.video.map((b) => [b.id, b.start, b.end]), [['c1', 0, 4], ['c2', 4, 10]])
  assert.deepEqual(lanes.text.map((b) => [b.id, b.start, b.end, b.label, b.movable]), [['t1', 1, 3, 'Hi', true]])
  assert.deepEqual(lanes.music.map((b) => [b.start, b.end, b.label, b.movable]), [[0, 10, 'song.mp3', false]])
})

test('laneBars: captions from lines are select-only pages; speech lines can be moved; captions off shows none', () => {
  const pages = [{ startMs: 0, durationMs: 1500, text: 'one' }, { startMs: 1500, durationMs: 1000, text: 'two' }, { startMs: 20000, durationMs: 1000, text: 'late' }]
  const lines = laneBars(project(), facts({ pages }))
  assert.deepEqual(lines.captions.map((b) => [b.id, b.start, b.end, b.label, b.movable, b.trimmable]), [['page-0', 0, 1.5, 'one', false, false], ['page-1', 1.5, 2.5, 'two', false, false]])
  const speech = laneBars(project({ captions: { enabled: true, source: 'speech', speech: [{ id: 's1', start: 2, end: 12, text: 'said' }] } }), facts({ captionMode: 'speech' }))
  assert.deepEqual(speech.captions.map((b) => [b.id, b.start, b.end, b.movable]), [['s1', 2, 10, true]])
  assert.equal(laneBars(project({ captions: { enabled: false } }), facts({ pages })).captions.length, 0)
})

test('laneBars: a voiceover is as long as its file, or 1 s while that is unknown', () => {
  const p = project({ voiceover: [{ id: 'v1', source: 'tts', start: 2, volume: 1, edits: {} }, { id: 'v2', source: 'upload', start: 5, volume: 1, edits: {} }] })
  const lanes = laneBars(p, facts({ voiceSeconds: { v1: 3.5 } }))
  assert.deepEqual(lanes.voice.map((b) => [b.id, b.start, b.end, b.label]), [['v1', 2, 5.5, 'Voice 1'], ['v2', 5, 6, 'Voice 2']])
})

test('snapTargets and snapTime: nearest edge within the threshold, the playhead included, the dragged bar left out', () => {
  const lanes = laneBars(project({ texts: [{ id: 't1', text: 'x', start: 1, end: 3, position: 'bottom', color: 'white' }] }), facts())
  const targets = snapTargets(lanes, 6.5, 10, 't1')
  assert.deepEqual(targets, [0, 4, 6.5, 10])
  assert.equal(snapTime(4.1, targets, 0.2), 4)
  assert.equal(snapTime(6.4, targets, 0.2), 6.5)
  assert.equal(snapTime(5.2, targets, 0.2), 5.2, 'nothing near: left alone')
  assert.equal(snapThreshold(40), 0.2)
})

test('snapMove: whichever edge is nearer a target snaps, the length kept', () => {
  const targets = [0, 4, 10]
  assert.equal(snapMove(3.9, 2, targets, 0.2), 4, 'start snaps')
  assert.equal(snapMove(1.95, 2, targets, 0.2), 2, 'end snaps to 4')
  assert.equal(snapMove(2.5, 2, targets, 0.2), 2.5, 'neither near')
  assert.equal(snapMove(0.05, 3.9, targets, 0.2), 0, 'start nearer than end')
})

test('setBarTime: texts move and trim inside the video on whole frames; line pages and clips are left alone', () => {
  const p = project({ texts: [{ id: 't1', text: 'x', start: 1, end: 3, position: 'bottom', color: 'white' }] })
  const moved = setBarTime(p, 'text', 't1', 4.01, 6.01)
  assert.deepEqual([moved.texts[0].start, moved.texts[0].end], [4, 6])
  const past = setBarTime(p, 'text', 't1', 9, 11)
  assert.deepEqual([past.texts[0].start, past.texts[0].end], [8, 10], 'slid back inside, length kept')
  const short = setBarTime(p, 'text', 't1', 2, 2.05)
  assert.ok(short.texts[0].end - short.texts[0].start >= 0.2 - 1e-9, 'never shorter than 0.2 s')
  assert.equal(setBarTime(p, 'video', 'c1', 1, 2), p)
  assert.equal(setBarTime(p, 'captions', 'page-0', 1, 2), p)
  assert.equal(p.texts[0].start, 1, 'the input is not changed')
})

test('setBarTime: speech captions get new times; a voiceover only moves', () => {
  const p = project({ captions: { enabled: true, source: 'speech', speech: [{ id: 's1', start: 0, end: 1, text: 'a' }] }, voiceover: [{ id: 'v1', source: 'tts', start: 0, volume: 1, edits: {} }] })
  const c = setBarTime(p, 'captions', 's1', 2, 3.5)
  assert.deepEqual([c.captions.speech[0].start, c.captions.speech[0].end], [2, 3.5])
  const v = setBarTime(p, 'voice', 'v1', 1.5, 2.5)
  assert.equal(v.voiceover[0].start, 1.5)
})

test('removeBar: clips, texts, speech lines and voiceovers go; music stays', () => {
  const p = project({
    texts: [{ id: 't1', text: 'x', start: 1, end: 3, position: 'bottom', color: 'white' }],
    captions: { enabled: true, source: 'speech', speech: [{ id: 's1', start: 0, end: 1, text: 'a' }] },
    voiceover: [{ id: 'v1', source: 'tts', start: 0, volume: 1, edits: {} }],
    music: { volume: 1 },
  })
  assert.equal(removeBar(p, 'video', 'c1').clips.length, 1)
  assert.equal(removeBar(p, 'text', 't1').texts.length, 0)
  assert.equal(removeBar(p, 'captions', 's1').captions.speech.length, 0)
  assert.equal(removeBar(p, 'voice', 'v1').voiceover.length, 0)
  assert.equal(removeBar(p, 'music', 'music'), p)
})

test('timecode: mm:ss.ff', () => {
  assert.equal(timecode(0), '00:00.00')
  assert.equal(timecode(29), '00:00.29')
  assert.equal(timecode(30 * 41 + 4), '00:41.04')
  assert.equal(timecode(30 * 125), '02:05.00')
})

test('tickStep, fitZoom and followScroll', () => {
  assert.deepEqual(tickStep(40), { major: 2, minor: 1 })
  assert.deepEqual(tickStep(10), { major: 10, minor: 2 })
  assert.deepEqual(tickStep(200), { major: 0.5, minor: 0.25 })
  assert.equal(fitZoom(10, 800, 10, 200), 80)
  assert.equal(fitZoom(1000, 800, 10, 200), 10, 'never below the slider')
  assert.equal(fitZoom(0, 800, 10, 200), 10)
  assert.equal(followScroll(500, 0, 400), 476, 'ran off the right: a page on')
  assert.equal(followScroll(100, 0, 400), null, 'in view: left alone')
  assert.equal(followScroll(50, 300, 400), 26, 'left of the view: back')
})

test('history: undo and redo step through changes; a new change clears redo', () => {
  const a = project()
  const b = { ...a, showLogo: true }
  const c = { ...b, logoSize: 'large' }
  let h = record(emptyHistory(), a, null, 0)
  h = record(h, b, null, 10_000)
  const u1 = undo(h, c)
  assert.equal(u1.project, b)
  const u2 = undo(u1.history, u1.project)
  assert.equal(u2.project, a)
  assert.equal(undo(u2.history, a), null)
  const r1 = redo(u2.history, a)
  assert.equal(r1.project, b)
  const fresh = record(r1.history, b, null, 20_000)
  assert.equal(fresh.future.length, 0)
})

test('history: quick unnamed changes merge into one step; named (AI) changes never merge', () => {
  const a = project()
  let h = record(emptyHistory(), a, null, 0)
  h = record(h, { ...a, showLogo: true }, null, MERGE_MS - 1)
  assert.equal(h.past.length, 1)
  assert.equal(h.past[0].project, a, 'the step goes back to before the gesture')
  h = record(h, a, 'Applied first cut', MERGE_MS)
  h = record(h, a, null, MERGE_MS + 1)
  assert.equal(h.past.length, 3)
  assert.equal(lastAi(h), null, 'a manual change after the AI change: no "undo AI" offer')
  const back = undo(h, a)
  assert.deepEqual(lastAi(back.history), { label: 'Applied first cut' })
})

test('history: keeps at most HISTORY_LIMIT steps', () => {
  let h = emptyHistory()
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) h = record(h, project(), 'x', i * 1000)
  assert.equal(h.past.length, HISTORY_LIMIT)
})

test('previewOf: hidden and muted lanes change only the copy the preview plays', () => {
  const p = project({
    texts: [{ id: 't1', text: 'x', start: 1, end: 3, position: 'bottom', color: 'white' }],
    voiceover: [{ id: 'v1', source: 'tts', start: 0, volume: 1, edits: {} }],
    music: { volume: 0.8 },
  })
  assert.equal(previewOf(p, new Set(), new Set()), p)
  const v = previewOf(p, new Set(['text', 'captions']), new Set(['video', 'voice', 'music']))
  assert.equal(v.texts.length, 0)
  assert.equal(v.captions.enabled, false)
  assert.ok(v.clips.every((c) => c.muted))
  assert.equal(v.voiceover[0].volume, 0)
  assert.equal(v.music.volume, 0)
  assert.equal(p.texts.length, 1, 'the saved project is not changed')
  assert.equal(p.music.volume, 0.8)
})

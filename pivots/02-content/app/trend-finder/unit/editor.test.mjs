import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FPS,
  MAX_TOTAL,
  MIN_CLIP,
  clipLength,
  clipStarts,
  clipFrames,
  reelDurationInFrames,
  sourceKey,
  toFrames,
  totalLength,
  insertClip,
  trimClip,
  splitAt,
  removeClip,
  moveClip,
  setClipAudio,
  dropIndex,
  newClipId,
} from '../src/lib/editor/timeline.ts'

const clip = (id, inn, out, extra = {}) => ({
  id,
  source: { kind: 'generation', id: 'g1' },
  in: inn,
  out,
  volume: 1,
  muted: false,
  ...extra,
})
const project = (clips) => ({
  fps: 30, width: 1080, height: 1920, clips, texts: [], captions: { enabled: false },
  music: null, voiceover: [], primaries: {}, showLogo: false,
})
const three = project([clip('a', 0, 2), clip('b', 1, 4), clip('c', 0.5, 1)])

test('constants', () => {
  assert.equal(FPS, 30)
  assert.equal(MIN_CLIP, 0.2)
  assert.equal(MAX_TOTAL, 180)
})

test('clipLength, totalLength and clipStarts of three clips', () => {
  assert.deepEqual(three.clips.map(clipLength), [2, 3, 0.5])
  assert.deepEqual(clipStarts(three), [0, 2, 5])
  assert.equal(totalLength(three), 5.5)
})

test('toFrames rounds to the nearest frame', () => {
  assert.equal(toFrames(5.5), 165)
  assert.equal(toFrames(1 / 30), 1)
})

test('reelDurationInFrames is at least 1', () => {
  assert.equal(reelDurationInFrames(project([])), 1)
  assert.equal(reelDurationInFrames(three), 165)
})

test('clipFrames leaves no one-frame gaps and ends at the reel end', () => {
  const p = project([clip('a', 0, 0.2), clip('b', 0, 0.2), clip('c', 0, 0.2), clip('d', 0, 0.3)])
  const spans = clipFrames(p)
  assert.equal(spans[0].from, 0)
  for (let i = 1; i < spans.length; i++) assert.equal(spans[i].from, spans[i - 1].from + spans[i - 1].duration)
  const last = spans[spans.length - 1]
  assert.equal(last.from + last.duration, reelDurationInFrames(p))
  assert.ok(spans.every((s) => s.duration >= 1))
  assert.deepEqual(clipFrames(project([])), [])
})

test('sourceKey is kind:id', () => {
  assert.equal(sourceKey({ kind: 'take', id: 't9' }), 'take:t9')
  assert.equal(sourceKey({ kind: 'generation', id: 'g1', nodeId: 'n1' }), 'generation:g1')
})

// ---- Task 4: editing functions ----
const src = { kind: 'generation', id: 'g9' }
const lens = (p) => p.clips.map((c) => [c.id, c.in, c.out])

test('insertClip puts the new clip at the index with in 0 and the full source length', () => {
  const out = insertClip(three, src, 4, 1, 'c9')
  assert.deepEqual(out.clips.map((c) => c.id), ['a', 'c9', 'b', 'c'])
  assert.deepEqual([out.clips[1].in, out.clips[1].out, out.clips[1].volume, out.clips[1].muted], [0, 4, 1, false])
  assert.equal(three.clips.length, 3) // input untouched
})

test('insertClip cuts a clip that would pass 180 s, and returns the same object when full or when room < MIN_CLIP', () => {
  const big = project([clip('a', 0, 178)])
  const out = insertClip(big, src, 10, 1, 'n')
  assert.equal(out.clips[1].out, 2)
  assert.ok(totalLength(out) <= MAX_TOTAL)
  const full = project([clip('a', 0, 180)])
  assert.equal(insertClip(full, src, 5, 0, 'n'), full)
  const tiny = project([clip('a', 0, 179.9)]) // F10: 0.1 s of room is treated as full
  assert.equal(insertClip(tiny, src, 5, 0, 'n'), tiny)
  assert.equal(insertClip(three, src, 0.1, 0, 'n'), three) // source shorter than MIN_CLIP
})

test('trimClip clamps to the source, keeps MIN_CLIP, never goes below 0 and rounds to 1/30 s', () => {
  const p = project([clip('a', 1, 3)])
  assert.equal(trimClip(p, 'a', 'out', 99, 5).clips[0].out, 5)
  assert.equal(trimClip(p, 'a', 'in', 99, 5).clips[0].in, 3 - MIN_CLIP)
  assert.equal(trimClip(p, 'a', 'in', -4, 5).clips[0].in, 0)
  assert.equal(trimClip(p, 'a', 'out', -4, 5).clips[0].out, 1 + MIN_CLIP)
  const r = trimClip(p, 'a', 'out', 2.51, 5).clips[0].out
  assert.equal(r, Math.round(2.51 * 30) / 30)
  assert.ok(r - 1 >= MIN_CLIP - 1e-9)
  assert.equal(p.clips[0].out, 3)
})

test('trimClip keeps the total under MAX_TOTAL', () => {
  const p = project([clip('a', 0, 100), clip('b', 0, 78)])
  const out = trimClip(p, 'b', 'out', 90, 90)
  assert.equal(totalLength(out), 180)
})

test('splitAt cuts [0-3] at 1.0 s into [0-1] and [1-3] with the new id', () => {
  const out = splitAt(project([clip('a', 0, 3)]), 1.0, 'c2')
  assert.deepEqual(lens(out), [['a', 0, 1], ['c2', 1, 3]])
  const later = splitAt(three, 2.5, 'n') // inside clip b (starts at 2), source time 1.5
  assert.deepEqual(lens(later), [['a', 0, 2], ['b', 1, 1.5], ['n', 1.5, 4], ['c', 0.5, 1]])
})

test('splitAt does nothing at 0.1 s, at a boundary or outside the reel', () => {
  const p = project([clip('a', 0, 3)])
  assert.equal(splitAt(p, 0.1, 'n'), p)
  assert.equal(splitAt(p, 2.9, 'n'), p)
  assert.equal(splitAt(three, 2, 'n'), three)
  assert.equal(splitAt(three, 99, 'n'), three)
})

test('removeClip drops the clip and returns the same object for an unknown id', () => {
  assert.deepEqual(removeClip(three, 'b').clips.map((c) => c.id), ['a', 'c'])
  assert.equal(removeClip(three, 'zzz'), three)
  assert.equal(three.clips.length, 3)
})

test('moveClip reorders and ignores no-op moves', () => {
  assert.deepEqual(moveClip(three, 0, 2).clips.map((c) => c.id), ['b', 'c', 'a'])
  assert.deepEqual(moveClip(three, 2, 0).clips.map((c) => c.id), ['c', 'a', 'b'])
  assert.equal(moveClip(three, 1, 1), three)
  assert.equal(moveClip(three, 5, 0), three)
  assert.equal(moveClip(three, 0, -1), three)
})

test('setClipAudio patches volume (clamped 0-2) and mute', () => {
  const out = setClipAudio(three, 'b', { volume: 3, muted: true })
  assert.deepEqual([out.clips[1].volume, out.clips[1].muted], [2, true])
  assert.equal(setClipAudio(three, 'b', { volume: -1 }).clips[1].volume, 0)
  assert.equal(out.clips[0], three.clips[0])
  assert.equal(three.clips[1].volume, 1)
  assert.equal(setClipAudio(three, 'zzz', { muted: true }), three)
})

test('dropIndex puts the clip before a clip when x is in its left half', () => {
  // widths at 40 px/s: a 0-80, b 80-200, c 200-220
  assert.equal(dropIndex(three, 10, 40), 0)
  assert.equal(dropIndex(three, 45, 40), 1)
  assert.equal(dropIndex(three, 130, 40), 1)
  assert.equal(dropIndex(three, 150, 40), 2)
  assert.equal(dropIndex(three, 9999, 40), 3)
})

test('newClipId is c plus a number and never repeats an id in use', () => {
  assert.equal(newClipId(project([])), 'c1')
  assert.equal(newClipId(three), 'c1')
  assert.equal(newClipId(project([clip('c1', 0, 1), clip('c7', 0, 1), clip('x', 0, 1)])), 'c8')
})

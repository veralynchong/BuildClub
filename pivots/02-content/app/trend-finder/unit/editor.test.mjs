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

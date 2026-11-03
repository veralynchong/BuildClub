import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeShotClip, oneClipPerShot, timelineSummary } from '../src/lib/editor/timeline.ts'
import { clipLabel } from '../src/components/editor/clipName.ts'

const proj = (clips, primaries = {}) => ({
  fps: 30, width: 1080, height: 1920, clips, texts: [], captions: { enabled: false },
  music: null, voiceover: [], primaries, showLogo: false,
})
const src = (kind, id, shotId, nodeId) => ({ kind, id, ...(shotId ? { shotId } : {}), ...(nodeId ? { nodeId } : {}) })
const clip = (id, source, out) => ({ id, source, in: 0, out, volume: 1, muted: false })
const shotOrder = ['s1', 's2', 's3']
const g1 = src('generation', 'g1', 's1', 'n_vid_s1')
const g2 = src('generation', 'g2', 's2', 'n_vid_s2')
const g2b = src('generation', 'g2b', 's2', 'n_vid_s2')
const g3 = src('generation', 'g3', 's3', 'n_vid_s3')

test('placeShotClip replaces the shot clip and keeps shot order', () => {
  const p = proj([clip('c1', g1, 3), clip('c3', g3, 3)])
  const a = placeShotClip(p, g2, 4, shotOrder, 'c2')
  assert.deepEqual(a.clips.map((c) => c.source.id), ['g1', 'g2', 'g3'])
  assert.deepEqual([a.clips[1].in, a.clips[1].out], [0, 4])
  assert.deepEqual(a.primaries.s2, g2)
  const b = placeShotClip(a, g2b, 5, shotOrder, 'c4')
  assert.deepEqual(b.clips.map((c) => c.source.id), ['g1', 'g2b', 'g3'])
  assert.equal(b.clips[1].out, 5)
  assert.deepEqual(b.primaries.s2, g2b)
})

test('placeShotClip ignores a source without a shot', () => {
  const p = proj([clip('c1', g1, 3)])
  assert.equal(placeShotClip(p, src('generation', 'gx', undefined, 'n_free'), 4, shotOrder, 'c2'), p)
  assert.equal(placeShotClip(p, src('generation', 'gy', 'gone', 'n_x'), 4, shotOrder, 'c2'), p)
})

test('placeShotClip returns the same project when full', () => {
  const p = proj([clip('c1', g1, 178)])
  assert.equal(placeShotClip(p, g2, 4, shotOrder, 'c2'), p)
  assert.equal(placeShotClip(p, src('generation', 'g1b', 's1', 'n_vid_s1'), 180, shotOrder, 'c2').clips[0].source.id, 'g1b')
})

test('oneClipPerShot keeps the primary, else the first, and counts the rest', () => {
  const a1 = src('generation', 'a1', 's1'), a2 = src('generation', 'a2', 's1'), a3 = src('generation', 'a3', 's1'), free = src('take', 't9')
  const r = oneClipPerShot(proj([clip('x1', a1, 2), clip('x2', a2, 2), clip('x3', a3, 2), clip('x4', free, 2), clip('y1', g2, 2), clip('y2', g2b, 2)], { s1: a2 }))
  assert.deepEqual(r.project.clips.map((c) => c.id), ['x2', 'x4', 'y1'])
  assert.equal(r.removed, 3)
  const one = proj([clip('c1', g1, 3)])
  assert.deepEqual(oneClipPerShot(one), { project: one, removed: 0 })
})

test('timelineSummary counts ready shots and seconds', () => {
  assert.deepEqual(timelineSummary(proj([clip('c1', g1, 3), clip('c3', g3, 4.5)]), shotOrder), { seconds: 7.5, ready: 2, total: 3 })
  assert.deepEqual(timelineSummary(null, shotOrder), { seconds: 0, ready: 0, total: 3 })
})

test('clipLabel names shot and version or take', () => {
  const shots = [{ id: 's1' }, { id: 's2' }]
  const gens = [
    { id: 'g0', nodeId: 'n_vid_s1', status: 'done', createdAt: 1 },
    { id: 'gf', nodeId: 'n_vid_s1', status: 'failed', createdAt: 2 },
    { id: 'g1', nodeId: 'n_vid_s1', status: 'done', createdAt: 3 },
  ]
  const takes = [{ id: 't2', shotId: 's2', createdAt: 9 }, { id: 't1', shotId: 's2', createdAt: 5 }]
  assert.equal(clipLabel(g1, shots, gens, takes), 'Shot 1 · v2')
  assert.equal(clipLabel(src('take', 't2', 's2'), shots, gens, takes), 'Shot 2 · Take 2')
  assert.equal(clipLabel(src('generation', 'gx'), shots, gens, takes), 'Clip')
})

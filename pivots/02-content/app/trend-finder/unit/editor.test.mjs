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
  primaryClipFor,
  fillByShotOrder,
  clipStatus,
  applyNewer,
  CLIP_MIME,
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

// ---- Task 5: canvas -> timeline ----
const vnode = (id, shotId, selected = null) => ({ id, type: 'video', shotId, position: { x: 0, y: 0 }, data: { selected } })
const gen = (id, nodeId, finishedAt, status = 'done') => ({ id, nodeId, kind: 'video', status, finishedAt, url: `/g/${id}.mp4` })
const take = (id, shotId, chosen = false) => ({ id, shotId, chosen, url: `/t/${id}.mp4` })
const doc = (nodes) => ({ nodes, edges: [] })

test('CLIP_MIME is the drag type the timeline accepts', () => {
  assert.equal(CLIP_MIME, 'application/x-remake-clip')
})

test('primaryClipFor: a pinned primary wins over a chosen take and a video node', () => {
  const d = doc([vnode('n1', 's1', 'g1')])
  const gens = [gen('g1', 'n1', 10)]
  const takes = [take('t1', 's1', true)]
  const pin = { kind: 'take', id: 't2', shotId: 's1' }
  assert.deepEqual(primaryClipFor('s1', d, gens, [...takes, take('t2', 's1')], { s1: pin }), pin)
})

test('primaryClipFor: no pin -> the chosen take', () => {
  const d = doc([vnode('n1', 's1', 'g1')])
  const r = primaryClipFor('s1', d, [gen('g1', 'n1', 10)], [take('t1', 's1', true), take('t2', 's1')], {})
  assert.deepEqual(r, { kind: 'take', id: 't1', shotId: 's1' })
})

test('primaryClipFor: no take -> the video node whose selected version finished last (S9)', () => {
  const d = doc([vnode('n1', 's1', 'g1'), vnode('n2', 's1', 'g2'), vnode('n3', 's2', 'g3')])
  const gens = [gen('g1', 'n1', 10), gen('g2', 'n2', 20), gen('g3', 'n3', 99)]
  const r = primaryClipFor('s1', d, gens, [], {})
  assert.deepEqual(r, { kind: 'generation', id: 'g2', nodeId: 'n2', shotId: 's1' })
})

test('primaryClipFor: a version that is not done does not count; nothing -> null', () => {
  const d = doc([vnode('n1', 's1', 'g1')])
  assert.equal(primaryClipFor('s1', d, [gen('g1', 'n1', null, 'running')], [], {}), null)
  assert.equal(primaryClipFor('s9', d, [], [], {}), null)
})

test('primaryClipFor: a pin whose footage is gone falls back to the rules', () => {
  const d = doc([vnode('n1', 's1', 'g1')])
  const gens = [gen('g1', 'n1', 10)]
  const r = primaryClipFor('s1', d, gens, [], { s1: { kind: 'take', id: 'gone', shotId: 's1' } })
  assert.equal(r.id, 'g1')
  const r2 = primaryClipFor('s1', d, [gen('g1', 'n1', 10, 'failed')], [], { s1: { kind: 'generation', id: 'g1', nodeId: 'n1' } })
  assert.equal(r2, null)
})

const info = (kind, id, duration) => ({ key: `${kind}:${id}`, kind, id, url: '', duration, hasAudio: true, width: 1, height: 1 })

test('fillByShotOrder: 3 shots, the second has nothing -> 2 clips in shot order and s2 skipped', () => {
  const shots = [{ id: 's1' }, { id: 's2' }, { id: 's3' }]
  const d = doc([vnode('n1', 's1', 'g1')])
  const gens = [gen('g1', 'n1', 10)]
  const takes = [take('t3', 's3', true)]
  const sources = [info('generation', 'g1', 4), info('take', 't3', 2.5)]
  const { project: out, skipped } = fillByShotOrder(project([]), shots, d, gens, takes, sources)
  assert.deepEqual(out.clips.map((c) => [c.id, c.source.kind, c.source.id, c.in, c.out]), [
    ['c1', 'generation', 'g1', 0, 4],
    ['c2', 'take', 't3', 0, 2.5],
  ])
  assert.deepEqual(skipped, ['s2'])
})

test('fillByShotOrder: a primary without length info is skipped; a non-empty timeline is left alone', () => {
  const shots = [{ id: 's1' }]
  const d = doc([vnode('n1', 's1', 'g1')])
  const gens = [gen('g1', 'n1', 10)]
  const r = fillByShotOrder(project([]), shots, d, gens, [], [])
  assert.deepEqual(r.project.clips, [])
  assert.deepEqual(r.skipped, ['s1'])
  const busy = project([clip('a', 0, 1)])
  const r2 = fillByShotOrder(busy, shots, d, gens, [], [info('generation', 'g1', 4)])
  assert.equal(r2.project, busy)
  assert.deepEqual(r2.skipped, [])
})

test('clipStatus: ok, missing (generation gone / not done / take deleted)', () => {
  const d = doc([vnode('n1', 's1', 'g1')])
  const gens = [gen('g1', 'n1', 10)]
  const g = clip('a', 0, 1, { source: { kind: 'generation', id: 'g1', nodeId: 'n1', shotId: 's1' } })
  assert.deepEqual(clipStatus(g, d, gens, []), { state: 'ok' })
  assert.deepEqual(clipStatus(g, d, [], []), { state: 'missing' })
  assert.deepEqual(clipStatus(g, d, [gen('g1', 'n1', null, 'running')], []), { state: 'missing' })
  const tk = clip('b', 0, 1, { source: { kind: 'take', id: 't1', shotId: 's1' } })
  assert.deepEqual(clipStatus(tk, d, gens, [take('t1', 's1', true)]), { state: 'ok' })
  assert.deepEqual(clipStatus(tk, d, gens, []), { state: 'missing' })
})

test('clipStatus: newer when the node picked another version, or the shot chose another take', () => {
  const d = doc([vnode('n1', 's1', 'g2')])
  const gens = [gen('g1', 'n1', 10), gen('g2', 'n1', 20)]
  const g = clip('a', 0, 1, { source: { kind: 'generation', id: 'g1', nodeId: 'n1', shotId: 's1' } })
  assert.deepEqual(clipStatus(g, d, gens, []), { state: 'newer', source: { kind: 'generation', id: 'g2', nodeId: 'n1', shotId: 's1' } })
  const tk = clip('b', 0, 1, { source: { kind: 'take', id: 't1', shotId: 's1' } })
  assert.deepEqual(clipStatus(tk, d, gens, [take('t1', 's1'), take('t2', 's1', true)]), { state: 'newer', source: { kind: 'take', id: 't2', shotId: 's1' } })
  // a take with no shot never has a newer one
  const loose = clip('c', 0, 1, { source: { kind: 'take', id: 't1' } })
  assert.deepEqual(clipStatus(loose, d, gens, [take('t1', 's1'), take('t2', 's1', true)]), { state: 'ok' })
})

test('applyNewer: swaps the source and clamps out to the new length', () => {
  const p = project([clip('a', 1, 4)])
  const src = { kind: 'generation', id: 'g2', nodeId: 'n1' }
  const same = applyNewer(p, 'a', src, 10)
  assert.deepEqual(same.clips[0].source, src)
  assert.equal(same.clips[0].in, 1)
  assert.equal(same.clips[0].out, 4)
  const cut = applyNewer(p, 'a', src, 3)
  assert.equal(cut.clips[0].in, 1)
  assert.equal(cut.clips[0].out, 3)
})

test('applyNewer: when clamping leaves under MIN_CLIP, restart from 0 with the old length', () => {
  const p = project([clip('a', 4, 6)])
  const r = applyNewer(p, 'a', { kind: 'generation', id: 'g2' }, 4.1)
  assert.equal(r.clips[0].in, 0)
  assert.equal(r.clips[0].out, 2)
  const r2 = applyNewer(p, 'a', { kind: 'generation', id: 'g2' }, 1.5)
  assert.equal(r2.clips[0].in, 0)
  assert.equal(r2.clips[0].out, 1.5)
  assert.equal(applyNewer(p, 'nope', { kind: 'take', id: 'x' }, 9), p)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectedGen as graphSelectedGen } from '../src/lib/canvas/graph.ts'
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
  exportBlocked,
  flushOutcome,
  applyNewer,
  isPrimaryPin,
  withPrimary,
  repinIfOld,
  CLIP_MIME,
  addText,
  updateText,
  removeText,
  newTextId,
  textsAt,
  MAX_TEXTS,
  addVoice,
  updateVoice,
  removeVoice,
  setShotCaption,
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

test('clipStatus: newer when the node picked another version', () => {
  const d = doc([vnode('n1', 's1', 'g2')])
  const gens = [gen('g1', 'n1', 10), gen('g2', 'n1', 20)]
  const g = clip('a', 0, 1, { source: { kind: 'generation', id: 'g1', nodeId: 'n1', shotId: 's1' } })
  assert.deepEqual(clipStatus(g, d, gens, []), { state: 'newer', source: { kind: 'generation', id: 'g2', nodeId: 'n1', shotId: 's1' } })
})

test('clipStatus: a take stays ok even when another take of the shot is chosen', () => {
  const d = doc([vnode('n1', 's1', 'g2')])
  const gens = [gen('g1', 'n1', 10), gen('g2', 'n1', 20)]
  const takes = [take('t1', 's1'), take('t2', 's1', true)]
  const tk = clip('b', 0, 1, { source: { kind: 'take', id: 't1', shotId: 's1' } })
  assert.deepEqual(clipStatus(tk, d, gens, takes), { state: 'ok' })
  const loose = clip('c', 0, 1, { source: { kind: 'take', id: 't1' } })
  assert.deepEqual(clipStatus(loose, d, gens, takes), { state: 'ok' })
  assert.deepEqual(clipStatus(tk, d, gens, [take('t2', 's1', true)]), { state: 'missing' })
})

test('repinIfOld: the pin follows a replaced version, other pins stay', () => {
  const g1 = { kind: 'generation', id: 'g1', nodeId: 'n1', shotId: 's1' }
  const g2 = { kind: 'generation', id: 'g2', nodeId: 'n1', shotId: 's1' }
  const other = { kind: 'take', id: 't9', shotId: 's1' }
  const pins = { s1: g1 }
  assert.deepEqual(repinIfOld(pins, 's1', g1, g2), { s1: g2 })
  assert.deepEqual(pins, { s1: g1 })
  const p2 = { s1: other }
  assert.equal(repinIfOld(p2, 's1', g1, g2), p2)
  assert.equal(repinIfOld(pins, undefined, g1, g2), pins)
  assert.equal(repinIfOld({}, 's1', g1, g2).s1, undefined)
})

test('isPrimaryPin / withPrimary', () => {
  const g1 = { kind: 'generation', id: 'g1', nodeId: 'n1', shotId: 's1' }
  const t1 = { kind: 'take', id: 'g1', shotId: 's1' }
  const pins = {}
  assert.equal(isPrimaryPin(pins, 's1', g1), false)
  const next = withPrimary(pins, 's1', g1)
  assert.deepEqual(pins, {})
  assert.equal(isPrimaryPin(next, 's1', g1), true)
  assert.equal(isPrimaryPin(next, 's1', t1), false) // same id, other kind
  assert.equal(isPrimaryPin(next, 's2', g1), false)
  assert.deepEqual(withPrimary(next, 's1', t1), { s1: t1 })
})

test('timeline selectedGen agrees with canvas graph selectedGen', () => {
  const gens = [
    { id: 'a', nodeId: 'n1', status: 'done', createdAt: 1 },
    { id: 'b', nodeId: 'n1', status: 'done', createdAt: 3 },
    { id: 'c', nodeId: 'n1', status: 'running', createdAt: 5 },
    { id: 'x', nodeId: 'n2', status: 'done', createdAt: 2 },
  ]
  const nodes = [
    { id: 'n1', type: 'video', shotId: 's1', data: {} },
    { id: 'n1', type: 'video', shotId: 's1', data: { selected: 'a' } },
    { id: 'n1', type: 'video', shotId: 's1', data: { selected: 'c' } },
    { id: 'n3', type: 'video', shotId: 's3', data: {} },
  ]
  for (const n of nodes) {
    const viaGraph = graphSelectedGen(n, gens)
    const d = doc([n])
    const clipSrc = { kind: 'generation', id: viaGraph ? viaGraph.id : 'none', nodeId: n.id, shotId: n.shotId }
    const st = clipStatus(clip('k', 0, 1, { source: clipSrc }), d, gens, [])
    // primaryClipFor goes through the timeline copy of selectedGen
    const prim = primaryClipFor(n.shotId, d, gens, [], {})
    assert.equal(prim ? prim.id : null, viaGraph ? viaGraph.id : null)
    if (viaGraph) assert.deepEqual(st, { state: 'ok' })
  }
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

test('exportBlocked: empty, missing, and ready', () => {
  assert.equal(exportBlocked(project([]), {}), 'editor.export.empty')
  const p = project([clip('a', 0, 2), clip('b', 0, 2)])
  assert.equal(exportBlocked(p, { a: 'ok', b: 'missing' }), 'editor.export.missing')
  assert.equal(exportBlocked(p, { a: 'ok', b: 'newer' }), null)
  assert.equal(exportBlocked(p, { a: 'ok', b: 'ok' }), null)
})

test('flushOutcome: saved only when nothing unsaved is left', () => {
  const base = { dirty: false, blocked: false, readOnly: false }
  assert.equal(flushOutcome(base), 'saved')
  assert.equal(flushOutcome({ ...base, dirty: true }), 'failed')
  assert.equal(flushOutcome({ ...base, dirty: true, blocked: true }), 'stale')
  assert.equal(flushOutcome({ ...base, dirty: true, readOnly: true }), 'readonly')
})

// ---- texts ----
test('addText: 2 s at the bottom in white, cut to fit the video', () => {
  const p = project([clip('c1', 0, 5)])
  const a = addText(p, 1, 'hello', 't1')
  assert.deepEqual(a.texts, [{ id: 't1', text: 'hello', start: 1, end: 3, position: 'bottom', color: 'white' }])
  assert.equal(p.texts.length, 0)
  const near = addText(p, 4.5, 'x', 't1').texts[0]
  assert.equal(near.end, 5)
  assert.ok(near.start < near.end)
  const past = addText(p, 99, 'x', 't1').texts[0]
  assert.ok(past.start < 5 && past.end === 5)
  assert.equal(addText(p, -3, 'x', 't1').texts[0].start, 0)
})

test('addText: nothing to add to, empty words, or 30 texts already', () => {
  const empty = project([])
  assert.equal(addText(empty, 0, 'x', 't1'), empty)
  const p = project([clip('c1', 0, 5)])
  assert.equal(addText(p, 0, '   ', 't1'), p)
  assert.equal(addText(p, 0, 'a'.repeat(200), 't1').texts[0].text.length, 120)
  let full = p
  for (let i = 0; i < MAX_TEXTS; i++) full = addText(full, 0, 'x', `t${i + 1}`)
  assert.equal(full.texts.length, MAX_TEXTS)
  assert.equal(addText(full, 0, 'x', 'tz'), full)
})

test('updateText: changes one text, keeps timing valid, ignores empty words', () => {
  const p = addText(project([clip('c1', 0, 5)]), 1, 'hello', 't1')
  const u = updateText(p, 't1', { text: '你好', position: 'top', color: 'black' })
  assert.deepEqual([u.texts[0].text, u.texts[0].position, u.texts[0].color], ['你好', 'top', 'black'])
  assert.equal(p.texts[0].text, 'hello')
  assert.equal(updateText(p, 't1', { text: '  ' }), p)
  assert.equal(updateText(p, 'nope', { text: 'x' }), p)
  const back = updateText(p, 't1', { start: 4, end: 2 })
  assert.ok(back.texts[0].end > back.texts[0].start)
  assert.equal(updateText(p, 't1', { start: -2 }).texts[0].start, 0)
})

test('removeText and newTextId', () => {
  let p = addText(project([clip('c1', 0, 5)]), 0, 'a', 't1')
  p = addText(p, 1, 'b', newTextId(p))
  assert.deepEqual(p.texts.map((x) => x.id), ['t1', 't2'])
  const r = removeText(p, 't1')
  assert.deepEqual(r.texts.map((x) => x.id), ['t2'])
  assert.equal(removeText(r, 't1'), r)
})

test('textsAt: start is in, end is out', () => {
  let p = addText(project([clip('c1', 0, 6)]), 1, 'a', 't1') // 1 to 3
  p = addText(p, 2, 'b', 't2') // 2 to 4
  assert.deepEqual(textsAt(p, 0.5).map((x) => x.id), [])
  assert.deepEqual(textsAt(p, 1).map((x) => x.id), ['t1'])
  assert.deepEqual(textsAt(p, 2.5).map((x) => x.id), ['t1', 't2'])
  assert.deepEqual(textsAt(p, 3).map((x) => x.id), ['t2'])
  assert.deepEqual(textsAt(p, 4).map((x) => x.id), [])
})

// ---- captions (Task 11) ----
import {
  pageEnd, tokens, lineCaptions, voiceCaptions, captionPages, pagesWithEdits, voicePages, captionMode, projectPages, ttsDefaultText, widthUnits,
} from '../src/lib/editor/captions.ts'

const shotClip = (id, shotId, inn, out, extra = {}) => ({ ...clip(id, inn, out, extra), source: { kind: 'generation', id: 'g1', shotId } })
const joined = (caps) => caps.map((c) => c.text).join('')

test('tokens: one per CJK character, latin words carry one leading space', () => {
  assert.deepEqual(tokens('3 天學會 editing fast'), ['3', '天', '學', '會', ' editing', ' fast'])
  assert.deepEqual(tokens('學會editing'), ['學', '會', 'editing'])
  assert.deepEqual(tokens('  '), [])
})

test('lineCaptions: two adjacent clips of one shot share the line', () => {
  const p = project([shotClip('a', 's1', 0, 2), shotClip('b', 's1', 0, 2)])
  const caps = lineCaptions(p, { s1: '一二三四' })
  assert.equal(joined(caps), '一二三四')
  assert.deepEqual(caps.map((c) => c.startMs), [0, 1000, 2000, 3000])
  assert.equal(caps[3].endMs, 4000)
})

test('lineCaptions (R5): non-adjacent clips of one shot share ONE line over their combined time', () => {
  const p = project([shotClip('a', 's1', 0, 2), shotClip('b', 's2', 0, 3), shotClip('c', 's1', 0, 2)])
  const lines = { s1: '一二三四五六', s2: 'hello brave world' }
  const caps = lineCaptions(p, lines)
  const s1 = caps.filter((c) => '一二三四五六'.includes(c.text))
  assert.equal(joined(s1), '一二三四五六') // the whole line, once
  assert.equal(joined(caps.filter((c) => !'一二三四五六'.includes(c.text))).trim(), 'hello brave world')
  const spans = [[0, 2000], [5000, 7000]] // the clips of s1
  let prev = -1
  for (const c of s1) {
    assert.ok(c.startMs >= prev, 'monotonic')
    prev = c.startMs
    assert.ok(spans.some(([a, b]) => c.startMs >= a && c.endMs <= b), `token ${c.text} ${c.startMs}-${c.endMs} lies inside a clip of the shot`)
  }
  assert.deepEqual(s1.map((c) => c.startMs), [0, 667, 1333, 5000, 5667, 6333])
  const all = caps.map((c) => c.startMs)
  assert.deepEqual(all, [...all].sort((a, b) => a - b))
})

test('lineCaptions: a clip caption overrides the line; the first overriding clip wins', () => {
  const p = project([shotClip('a', 's1', 0, 1), shotClip('b', 's1', 0, 1, { caption: '改過' }), shotClip('c', 's1', 0, 1, { caption: '別的' })])
  assert.equal(joined(lineCaptions(p, { s1: '原本' })), '改過')
  const cleared = project([shotClip('a', 's1', 0, 1, { caption: '' })])
  assert.deepEqual(lineCaptions(cleared, { s1: '原本' }), []) // an empty override hides the caption
})

test('lineCaptions: clips without a shot, or a shot without a line, get nothing', () => {
  assert.deepEqual(lineCaptions(project([clip('a', 0, 2)]), { s1: 'x' }), [])
  assert.deepEqual(lineCaptions(project([shotClip('a', 's1', 0, 2)]), {}), [])
})

test('voiceCaptions: words move to the voiceover start, and words past the end are dropped', () => {
  const seg = { id: 'v1', source: 'upload', start: 1, volume: 1, edits: {} }
  const words = { v1: [{ text: 'hello', start: 0, end: 0.5 }, { text: 'there', start: 0.6, end: 1 }, { text: 'late', start: 5, end: 6 }] }
  const caps = voiceCaptions([seg], words, 3)
  assert.deepEqual(caps.map((c) => [c.text, c.startMs, c.endMs]), [['hello', 1000, 1500], [' there', 1600, 2000]])
  const cut = voiceCaptions([seg], { v1: [{ text: 'hello', start: 1.5, end: 3 }] }, 3)
  assert.equal(cut[0].endMs, 3000) // clamped to the total
})

test('captionPages: page text has no space between Chinese characters', () => {
  const p = project([shotClip('a', 's1', 0, 6)])
  const pages = captionPages(lineCaptions(p, { s1: '三分鐘學會剪輯，3 天 學會 fast editing' }))
  assert.ok(pages.length >= 2)
  assert.ok(!/[一-鿿]\s+[一-鿿]/.test(pages.map((g) => g.text).join('')))
  assert.equal(pages[0].text, '三分鐘學會剪輯，')
  assert.ok(pages.every((g) => widthUnits(g.text) <= 18))
})

test('F28: the pages of a lines-mode shot join to the line', () => {
  const p = project([shotClip('a', 's1', 0, 3), shotClip('b', 's2', 0, 1), shotClip('c', 's1', 0, 3)])
  const line = '先講重點，再講例子。最後給你一個行動'
  const caps = lineCaptions(p, { s1: line })
  assert.equal(captionPages(caps).map((g) => g.text).join(''), line)
})

test('pagesWithEdits: replaces the text of the page at that index only', () => {
  const caps = [
    { text: '你', startMs: 0, endMs: 500, timestampMs: null, confidence: null },
    { text: '好', startMs: 500, endMs: 1000, timestampMs: null, confidence: null, pageBreakAfter: true },
    { text: '再', startMs: 1000, endMs: 1500, timestampMs: null, confidence: null },
    { text: '見', startMs: 1500, endMs: 2000, timestampMs: null, confidence: null },
  ]
  const pages = captionPages(caps)
  assert.deepEqual(pages.map((g) => g.text), ['你好', '再見'])
  const edited = pagesWithEdits(pages, { 1: '拜拜囉' })
  assert.deepEqual(edited.map((g) => g.text), ['你好', '拜拜囉'])
  assert.deepEqual(edited[1].tokens.map((t) => t.text), ['拜', '拜', '囉'])
  assert.equal(edited[1].startMs, 1000)
  assert.equal(edited[0], pages[0])
})

test('voice mode: pages are per voiceover and edits are keyed by page inside each', () => {
  const a = { id: 'v1', source: 'upload', start: 0, volume: 1, edits: { 0: '甲' } }
  const b = { id: 'v2', source: 'upload', start: 3, volume: 1, edits: { 0: '乙' } }
  const words = { v1: [{ text: '你好', start: 0, end: 1 }], v2: [{ text: '再見', start: 0, end: 1 }] }
  assert.deepEqual(voicePages([a, b], words, 10).map((g) => g.text), ['甲', '乙'])
  const p = { ...project([shotClip('a', 's1', 0, 10)]), voiceover: [a, b], captions: { enabled: true } }
  assert.equal(captionMode(p, words), 'voice')
  assert.equal(captionMode(p, {}), 'lines')
  assert.deepEqual(projectPages(p, { s1: '台詞' }, words).map((g) => g.text), ['甲', '乙'])
  assert.deepEqual(projectPages(p, { s1: '台詞' }, { v1: [] }).map((g) => g.text), ['台詞'])
  assert.deepEqual(projectPages({ ...p, captions: { enabled: false } }, { s1: '台詞' }, words), [])
})

test('ttsDefaultText: joins the lines and cuts at 480 width units', () => {
  assert.deepEqual(ttsDefaultText(['一', '', 'b']), { text: '一\nb', truncated: false })
  const long = ttsDefaultText(['字'.repeat(300)])
  assert.equal(long.truncated, true)
  assert.ok(widthUnits(long.text) <= 480 && long.text.length === 240)
})

test('voice helpers add, update and remove a voiceover; setShotCaption keeps one override on the first clip', () => {
  const seg = { id: 'v1', source: 'upload', start: 0, volume: 1, edits: {} }
  let p = addVoice(project([clip('a', 0, 2)]), seg)
  assert.equal(addVoice(p, seg), p)
  p = updateVoice(p, 'v1', { start: 2, volume: 0.5 })
  assert.deepEqual([p.voiceover[0].start, p.voiceover[0].volume], [2, 0.5])
  assert.equal(updateVoice(p, 'nope', { start: 1 }), p)
  p = removeVoice(p, 'v1')
  assert.deepEqual(p.voiceover, [])
  assert.equal(removeVoice(p, 'v1'), p)
  const q = project([shotClip('a', 's1', 0, 1), shotClip('b', 's2', 0, 1), shotClip('c', 's1', 0, 1, { caption: 'old' })])
  const r = setShotCaption(q, 's1', '新字幕')
  assert.deepEqual(r.clips.map((c) => c.caption), ['新字幕', undefined, undefined])
  assert.deepEqual(setShotCaption(r, 's1', undefined).clips.map((c) => c.caption), [undefined, undefined, undefined])
  assert.equal(setShotCaption(q, 'zz', 'x'), q)
})

test('I1: a Chinese line without punctuation splits into several pages that join to the line', () => {
  const p = project([shotClip('a', 's1', 0, 3)])
  const line = '三分鐘學會剪輯短影音的方法跟著我一起做'
  const pages = captionPages(lineCaptions(p, { s1: line }))
  assert.ok(pages.length > 1)
  assert.equal(pages.map((g) => g.text).join(''), line)
  assert.ok(pages.every((g) => widthUnits(g.text) <= 16 && pageEnd(g) - g.startMs <= 1400))
})

test('I2: pages never cross a clip or a shot, and words of adjacent shots keep a space', () => {
  const p = project([shotClip('a', 's1', 0, 2), shotClip('b', 's2', 0, 2), shotClip('c', 's1', 0, 2)])
  const lines = { s1: 'learn editing in three days now', s2: 'cut fast add captions' }
  const pages = captionPages(lineCaptions(p, lines))
  const spans = [[0, 2000, 's1'], [2000, 4000, 's2'], [4000, 6000, 's1']]
  for (const g of pages) {
    const hit = spans.filter(([a, b]) => g.startMs >= a && pageEnd(g) <= b)
    assert.equal(hit.length, 1, `page "${g.text}" lies inside one clip`)
    const words = g.text.split(' ')
    const owner = hit[0][2]
    assert.ok(words.every((w) => lines[owner].split(' ').includes(w)), `page "${g.text}" holds only words of ${owner}`)
  }
  const caps = lineCaptions(p, lines)
  const owner = (c) => (c.startMs < 2000 || c.startMs >= 4000 ? 's1' : 's2')
  caps.forEach((c, i) => {
    if (i > 0 && owner(caps[i - 1]) !== owner(c)) assert.ok(c.text.startsWith(' '), `"${c.text}" after another shot keeps a space`)
  })
})

test('I2: a short clip of a shot does not leave its page on screen over another shot', () => {
  const p = project([shotClip('a', 's1', 0, 0.2), shotClip('b', 's2', 0, 3), shotClip('c', 's1', 0, 0.2)])
  const pages = captionPages(lineCaptions(p, { s1: 'supercalifragilistic word' }))
  for (const g of pages) assert.ok(pageEnd(g) <= 200 || g.startMs >= 3200, `page "${g.text}" ${g.startMs}-${pageEnd(g)}`)
})

test('N1/N2: short lines stay whole, long ones split without tiny pages, the line is kept', () => {
  const pagesOf = (line, secs) => captionPages(lineCaptions(project([shotClip('a', 's1', 0, secs)]), { s1: line }))
  assert.deepEqual(pagesOf('台詞', 3).map((g) => g.text), ['台詞'])
  assert.deepEqual(pagesOf('三分鐘學會剪輯短', 6).map((g) => g.text), ['三分鐘學會剪輯短']) // 8 characters over 6 s
  const line = '三分鐘學會剪輯短影音的'.slice(0, 13) // 13 characters, no punctuation
  for (const secs of [2, 6, 12]) {
    const pages = pagesOf(line.padEnd(13, '的'), secs)
    assert.equal(pages.map((g) => g.text).join(''), line.padEnd(13, '的'))
    assert.ok(pages.length > 1 && pages.every((g) => widthUnits(g.text) >= 4 && widthUnits(g.text) <= 18), pages.map((g) => g.text).join('|'))
  }
  const sentences = '先講重點，再講例子。最後給你一個行動'
  const pages = pagesOf(sentences, 9)
  assert.equal(pages.map((g) => g.text).join(''), sentences)
  assert.deepEqual(pages.map((g) => g.text), ['先講重點，', '再講例子。', '最後給你一個行動'])
})

// ---- final review fixes ----
test('lineCaptions: a lone closing mark never becomes a page of its own across a clip boundary', () => {
  const p = project([shotClip('a', 's1', 0, 5), shotClip('b', 's1', 0, 1)])
  const caps = lineCaptions(p, { s1: '你好，世界。' })
  const pages = captionPages(caps)
  assert.equal(pages.map((pg) => pg.text).join(''), '你好，世界。')
  assert.ok(pages.every((pg) => pg.text.trim() !== '。'))
})

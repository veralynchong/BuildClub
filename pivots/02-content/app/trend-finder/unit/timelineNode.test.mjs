import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeShotClip, oneClipPerShot, sourcesWithShots, timelineSummary, isOnTimeline, shotOnTimeline, splitAt, applyNewer } from '../src/lib/editor/timeline.ts'
import { clipLabel } from '../src/components/editor/clipName.ts'
import { timelineFlow, isVirtual, TIMELINE_NODE_ID } from '../src/lib/canvas/timelineNode.ts'
import { toFlow, fromFlow } from '../src/lib/canvas/flow.ts'
import { previewInput, reelInput, FONT_URL } from '../src/lib/editor/preview.ts'

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

test('isOnTimeline matches kind and id; shotOnTimeline matches the shot', () => {
  const p = proj([clip('c1', g1, 3), clip('c3', g3, 3)])
  assert.equal(isOnTimeline(p, g1), true)
  assert.equal(isOnTimeline(p, src('take', 'g1', 's1')), false) // same id, other kind
  assert.equal(isOnTimeline(p, g2), false)
  assert.equal(isOnTimeline(null, g1), false)
  assert.equal(shotOnTimeline(p, 's1'), true)
  assert.equal(shotOnTimeline(p, 's2'), false)
  assert.equal(shotOnTimeline(p, undefined), false)
  assert.equal(shotOnTimeline(null, 's1'), false)
  // the button's guard: a source already on the timeline is not placed again, so its trim stays
  const trimmed = proj([{ ...clip('c1', g1, 3), in: 1, volume: 0.5 }])
  assert.equal(isOnTimeline(trimmed, g1), true)
  assert.notEqual(placeShotClip(trimmed, g1, 5, shotOrder, 'c9').clips[0].in, 1) // why the guard is needed
})

test('oneClipPerShot keeps split pieces of the kept source', () => {
  const split = splitAt(proj([clip('c1', g1, 4), clip('c2', g2, 3)]), 2, 'c9')
  assert.deepEqual(split.clips.map((c) => c.id), ['c1', 'c9', 'c2'])
  const r = oneClipPerShot(split)
  assert.equal(r.removed, 0)
  assert.equal(r.project, split)
  // two pieces of A and one clip of B in one shot, A pinned: both A pieces stay, B goes
  const a = src('generation', 'ga', 's1'), b = src('take', 'tb', 's1')
  const r2 = oneClipPerShot(proj([clip('b1', b, 2), clip('a1', a, 2), clip('a2', a, 2)], { s1: a }))
  assert.deepEqual(r2.project.clips.map((c) => c.id), ['a1', 'a2'])
  assert.equal(r2.removed, 1)
})

test('placeShotClip replaces every piece of the shot, split ones included', () => {
  const split = splitAt(proj([clip('c1', g1, 4), clip('c2', g2, 3)]), 2, 'c9')
  const r = placeShotClip(split, src('take', 't1', 's1'), 3, shotOrder, 'c10')
  assert.deepEqual(r.clips.map((c) => c.id), ['c10', 'c2'])
})

test('applyNewer swaps every split piece of the shot, keeping each piece\'s cut', () => {
  const split = splitAt(proj([clip('c1', g1, 4), clip('c2', g2, 3)]), 2, 'c9')
  const g1n = src('generation', 'g1n', 's1', 'n_vid_s1')
  const r = applyNewer(split, 'c1', g1n, 10)
  assert.deepEqual(r.clips.map((c) => [c.id, c.source.id, c.in, c.out]), [['c1', 'g1n', 0, 2], ['c9', 'g1n', 2, 4], ['c2', 'g2', 0, 3]])
  assert.equal(oneClipPerShot({ ...r, primaries: { s1: g1n } }).removed, 0)
  // a newer version too short for one piece leaves the project alone rather than mixing sources
  assert.equal(applyNewer(split, 'c9', g1n, 0.1), split)
  // a whole new take replaces the pieces with one clip in the first piece's place
  const t1 = src('take', 't1', 's1'), t1c = src('take', 't1c', 's1')
  const st = splitAt(proj([clip('c1', t1, 4), clip('c2', g2, 3)]), 2, 'c9')
  const w = applyNewer(st, 'c9', t1c, 3.5, true)
  assert.deepEqual(w.clips.map((c) => [c.id, c.source.id, c.in, c.out]), [['c1', 't1c', 0, 3.5], ['c2', 'g2', 0, 3]])
})

// ---- C3: the Timeline node on the canvas ----
// fixture: frames for s1 (n_vid_s1) and s2 (n_ft_s2 footage); c1 is a generation of n_vid_s1, c2 a take of shot s2
const node = (id, type, shotId, x, y) => ({ id, type, ...(shotId ? { shotId } : {}), position: { x, y }, data: {} })
const doc = {
  nodes: [node('n_shot_s1', 'shot', 's1', 0, 100), node('n_shot_s2', 'shot', 's2', 0, 600), node('n_sb_s1', 'storyboard', 's1', 16, 164), node('n_vid_s1', 'video', 's1', 256, 164), node('n_ft_s2', 'footage', 's2', 16, 664)],
  edges: [{ id: 'e_s1', source: 'n_sb_s1', sourceHandle: 'out', target: 'n_vid_s1', targetHandle: 'in:start' }],
}
const boxes = new Map([['n_shot_s1', { x: 0, y: 100, w: 600, h: 400 }], ['n_shot_s2', { x: 0, y: 600, w: 900, h: 400 }]])
const project = proj([clip('c1', src('generation', 'g1', 's1', 'n_vid_s1'), 3), clip('c2', src('take', 't1', 's2'), 4)])

test('timelineFlow places the node right of the frames and draws a line per clip', () => {
  const { node, edges } = timelineFlow(doc, project, boxes)
  assert.equal(node.id, TIMELINE_NODE_ID)
  assert.deepEqual(node.position, { x: 900 + 120, y: 100 })
  assert.equal(node.deletable, false); assert.equal(node.draggable, false)
  assert.equal(node.selectable, true) // else React Flow turns off its buttons on a read-only board
  assert.deepEqual(edges.map((e) => [e.id, e.source, e.target, e.targetHandle]), [['e_tl_n_vid_s1', 'n_vid_s1', 'n_timeline', 'in:clips'], ['e_tl_n_ft_s2', 'n_ft_s2', 'n_timeline', 'in:clips']])
  assert.deepEqual(timelineFlow(doc, null, boxes).edges, [])
})
test('isVirtual marks the Timeline node and its lines only', () => {
  assert.equal(isVirtual('n_timeline'), true); assert.equal(isVirtual('e_tl_n_vid_s1'), true)
  assert.equal(isVirtual('n_vid_s1'), false); assert.equal(isVirtual('e_s1'), false)
})
test('fromFlow never saves the Timeline node or its lines', () => {
  const flow = toFlow(doc)
  const tl = timelineFlow(doc, project, boxes)
  const back = fromFlow([...flow.nodes, tl.node], [...flow.edges, ...tl.edges], undefined)
  assert.ok(!back.nodes.some((n) => n.id === 'n_timeline'))
  assert.ok(!back.edges.some((e) => e.id.startsWith('e_tl_')))
  assert.deepEqual(back.nodes.map((n) => n.id), doc.nodes.map((n) => n.id))
})
test('previewInput has every ReelInput field and leaves out music and voice', () => {
  const brand = { font: 'Inter', color: '#123456', logoUrl: null }
  const shots = [{ id: 's1', time: '0-3s', shot: 'x', line: 'Hello' }, { id: 's2', time: '3-6s', shot: 'y', line: '  ' }]
  const r = previewInput(project, { g1: '/u/g1' }, shots, brand)
  assert.deepEqual(Object.keys(r).sort(), ['brand', 'fontUrl', 'lines', 'musicUrl', 'project', 'urls', 'voice'])
  assert.deepEqual(r.lines, { s1: 'Hello' })
  assert.equal(r.musicUrl, null); assert.deepEqual(r.voice, [])
  assert.equal(r.fontUrl, FONT_URL)
  assert.deepEqual(reelInput({ project, urls: {}, shots, musicUrl: '/m.mp3', voice: [], brand }).musicUrl, '/m.mp3')
})
test('timelineFlow starts a take line at the upload node holding it, and split pieces share one line', () => {
  const withUpload = { ...doc, nodes: [...doc.nodes, { id: 'n_up_s2', type: 'upload', shotId: 's2', position: { x: 300, y: 664 }, data: { takeId: 't1' } }] }
  assert.deepEqual(timelineFlow(withUpload, project, boxes).edges.map((e) => e.id), ['e_tl_n_vid_s1', 'e_tl_n_up_s2'])
  const split = splitAt(project, 1.5, 'c9')
  assert.equal(split.clips.length, 3)
  assert.deepEqual(timelineFlow(doc, split, boxes).edges.map((e) => e.id), ['e_tl_n_vid_s1', 'e_tl_n_ft_s2'])
})

test('sourcesWithShots gives a generation its node\'s shot and leaves takes and free nodes alone', () => {
  const doc = { nodes: [{ id: 'n_vid_s1', type: 'video', shotId: 's1', position: { x: 0, y: 0 }, data: {} }, { id: 'n_free', type: 'video', position: { x: 0, y: 0 }, data: {} }], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  const list = [
    { key: 'generation:g1', kind: 'generation', id: 'g1', url: 'u', duration: 4, nodeId: 'n_vid_s1' },
    { key: 'generation:g9', kind: 'generation', id: 'g9', url: 'u', duration: 4, nodeId: 'n_free' },
    { key: 'take:t1', kind: 'take', id: 't1', url: 'u', duration: 3, shotId: 's2' },
    { key: 'generation:gx', kind: 'generation', id: 'gx', url: 'u', duration: 4, nodeId: 'n_gone' },
  ]
  const out = sourcesWithShots(list, doc)
  assert.deepEqual(out.map((s) => s.shotId), ['s1', undefined, 's2', undefined])
  assert.equal(out[2], list[2])
  assert.equal(out[1], list[1])
})

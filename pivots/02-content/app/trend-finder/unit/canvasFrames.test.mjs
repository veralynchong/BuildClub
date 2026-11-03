import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FRAME_PAD, FRAME_HEAD, NODE_SIZE, MIN_FRAME, KIT_GAP, shotNodeOf, frameOf, frameBoxes, slotInFrame, kitSpot, migrateDoc } from '../src/lib/canvas/frames.ts'
import { toFlow, fromFlow, reframe } from '../src/lib/canvas/flow.ts'

const at = (id, type, x, y, shotId, data = {}) => ({ id, type, ...(shotId ? { shotId } : {}), position: { x, y }, data })
const line = (id, source, target, targetHandle) => ({ id, source, sourceHandle: 'out', target, targetHandle })

const doc = {
  nodes: [
    at('n_shot_s1', 'shot', 0, 0, 's1'),
    at('n_shot_s2', 'shot', 0, 480, 's2'),
    at('n_sb_s1', 'storyboard', 360, 0, 's1', { primary: true }),
    at('n_vid_s1', 'video', 720, 0, 's1'),
    at('n_kit', 'kit', -400, 0),
    at('n_p', 'prompt', 2000, 0, undefined, { text: '' }),
  ],
  edges: [line('e_k', 'n_kit', 'n_sb_s1', 'in:kit'), line('e_s', 'n_sb_s1', 'n_vid_s1', 'in:start')],
}
const node = (id) => doc.nodes.find((n) => n.id === id)

const legacy = {
  nodes: [...doc.nodes, at('n_ft_s1', 'footage', 0, 300, 's1')],
  edges: [
    line('e_t1', 'n_shot_s1', 'n_sb_s1', 'in:text'),
    line('e_t2', 'n_shot_s1', 'n_ft_s1', 'in:text'),
    line('e_k', 'n_kit', 'n_sb_s1', 'in:kit'),
    line('e_s', 'n_sb_s1', 'n_vid_s1', 'in:start'),
  ],
}

test('shotNodeOf maps a Shot id to its shot node id', () => {
  assert.equal(shotNodeOf(doc, 's1'), 'n_shot_s1')
  assert.equal(shotNodeOf(doc, 'nope'), null)
})

test('frameOf uses shotId; kit and free nodes have no frame', () => {
  assert.equal(frameOf(doc, node('n_sb_s1')), 'n_shot_s1')
  assert.equal(frameOf(doc, node('n_kit')), null)
  assert.equal(frameOf(doc, node('n_p')), null)
  assert.equal(frameOf(doc, node('n_shot_s1')), null)
})

test('frameBoxes wraps the members with padding and header; an empty frame sits at the shot node', () => {
  const boxes = frameBoxes(doc)
  assert.deepEqual(boxes.get('n_shot_s1'), { x: 344, y: -64, w: 200 + 360 + 32, h: 300 + 64 + 16 })
  assert.deepEqual(boxes.get('n_shot_s2'), { x: 0, y: 480, w: MIN_FRAME.w, h: MIN_FRAME.h })
  assert.equal(boxes.has('n_kit'), false)
})

test('frameBoxes uses measured sizes when given', () => {
  const boxes = frameBoxes(doc, new Map([['n_vid_s1', { w: 300, h: 400 }]]))
  assert.deepEqual(boxes.get('n_shot_s1'), { x: 344, y: -64, w: 300 + 360 + 32, h: 400 + 64 + 16 })
})

test('slotInFrame is right of the rightmost member on the first row', () => {
  assert.deepEqual(slotInFrame(doc, 'n_shot_s1'), { x: 720 + 200 + 40, y: 0 }) // NODE_W gap as freeSpot uses
  assert.deepEqual(slotInFrame(doc, 'n_shot_s2'), { x: FRAME_PAD, y: 480 + FRAME_HEAD })
})

test('migrateDoc on a P2.5 doc drops only the shot text lines and keeps kit and start lines', () => {
  const out = migrateDoc(legacy)
  assert.deepEqual(out.edges.map((e) => e.id), ['e_k', 'e_s'])
  assert.deepEqual(out.nodes, legacy.nodes)
  assert.equal(migrateDoc(out), out)
})

test('toFlow/fromFlow round-trips absolute positions', () => {
  const flow = toFlow(doc)
  const m = flow.nodes.find((n) => n.id === 'n_sb_s1')
  assert.equal(m.parentId, 'n_shot_s1')
  assert.deepEqual(m.position, { x: 360 - 344, y: 0 + 64 })
  const back = fromFlow(flow.nodes, flow.edges, { x: 1.4, y: 2.6, zoom: 1.23456 })
  assert.deepEqual(back.nodes.find((n) => n.id === 'n_sb_s1').position, { x: 360, y: 0 })
  assert.deepEqual(back.nodes.find((n) => n.id === 'n_shot_s1').position, { x: 344, y: -64 })
  assert.deepEqual(back.viewport, { x: 1, y: 3, zoom: 1.235 })
  assert.deepEqual(back.edges, doc.edges)
})

test('toFlow puts frames before their members and gives members extent parent', () => {
  const ids = toFlow(doc).nodes.map((n) => n.id)
  assert.ok(ids.indexOf('n_shot_s1') < ids.indexOf('n_sb_s1'))
  const m = toFlow(doc).nodes.find((n) => n.id === 'n_vid_s1')
  assert.equal(m.extent, 'parent'); assert.equal(m.expandParent, true)
  const f = toFlow(doc).nodes.find((n) => n.id === 'n_shot_s1')
  assert.equal(f.dragHandle, '.cv-frame-head'); assert.deepEqual(f.style, { width: 592, height: 380 })
  assert.equal(toFlow(doc).nodes.find((n) => n.id === 'n_kit').draggable, false)
})

test('toFlow puts the kit left of the frames and leaves free nodes where they are', () => {
  const ns = toFlow(doc).nodes
  assert.deepEqual(ns.find((n) => n.id === 'n_kit').position, { x: 0 - KIT_GAP - NODE_SIZE.w, y: -64 })
  const p = ns.find((n) => n.id === 'n_p')
  assert.deepEqual(p.position, { x: 2000, y: 0 })
  assert.equal(p.parentId, undefined)
})

test('reframe grows a frame to hold a member added to its right', () => {
  const ns = toFlow(doc).nodes
  const moved = ns.map((n) => (n.id === 'n_vid_s1' ? { ...n, position: { x: n.position.x + 400, y: n.position.y } } : n))
  const out = reframe(moved)
  assert.equal(out.find((n) => n.id === 'n_shot_s1').style.width, 592 + 400)
  assert.deepEqual(out.find((n) => n.id === 'n_shot_s2'), ns.find((n) => n.id === 'n_shot_s2'))
})

test('reframe adopts a new absolute node with a shotId into its frame', () => {
  const ns = toFlow(doc).nodes
  const slot = slotInFrame(doc, 'n_shot_s1')
  const added = { id: 'n_new', type: 'video', position: slot, data: { node: at('n_new', 'video', slot.x, slot.y, 's1') }, deletable: true }
  const out = reframe([...ns, added])
  const a = out.find((n) => n.id === 'n_new')
  assert.equal(a.parentId, 'n_shot_s1')
  assert.deepEqual(a.position, { x: 960 - 344, y: 64 })
  assert.equal(out.find((n) => n.id === 'n_shot_s1').style.width, 960 + 200 - 360 + 32)
  const back = fromFlow(out, [], undefined)
  assert.deepEqual(back.nodes.find((n) => n.id === 'n_new').position, slot)
})

test('kitSpot is left of the leftmost frame', () => {
  const boxes = new Map([['a', { x: 100, y: 50, w: 300, h: 300 }], ['b', { x: 40, y: 600, w: 300, h: 300 }]])
  assert.deepEqual(kitSpot(boxes), { x: 40 - KIT_GAP - NODE_SIZE.w, y: 50 })
})

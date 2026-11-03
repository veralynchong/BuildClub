import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasResult, focusSet, edgeLook } from '../src/lib/canvas/edges.ts'
import { compatibleKinds } from '../src/lib/canvas/ports.ts'
import { wireStart } from '../src/lib/canvas/graph.ts'

const at = (id, type, shotId, data = {}) => ({ id, type, ...(shotId ? { shotId } : {}), position: { x: 0, y: 0 }, data })
const line = (id, source, target, targetHandle) => ({ id, source, sourceHandle: 'out', target, targetHandle })
const doc = {
  nodes: [
    at('n_shot_s1', 'shot', 's1'),
    at('n_sb_s1', 'storyboard', 's1'),
    { ...at('n_vid_s1', 'video', 's1'), data: { model: 'mock-video' } },
    at('n_kit', 'kit'),
    at('n_p', 'prompt', undefined, { text: 'x' }),
    at('n_p1', 'prompt', 's1', { text: 'y' }),
  ],
  edges: [line('e_k', 'n_kit', 'n_sb_s1', 'in:kit'), line('e_s', 'n_sb_s1', 'n_vid_s1', 'in:start'), line('e_t', 'n_p', 'n_sb_s1', 'in:text')],
}
const models = [
  { id: 'mock-image', kind: 'image', inputs: { text: 'required', reference: 'optional' } },
  { id: 'mock-video', kind: 'video', inputs: { text: 'required', startFrame: 'optional' } },
]
const node = (id) => doc.nodes.find((n) => n.id === id)
const e = (id) => doc.edges.find((x) => x.id === id)
const done = [{ id: 'g1', nodeId: 'n_sb_s1', status: 'done', createdAt: 1 }]

test('hasResult per node kind', () => {
  assert.equal(hasResult(node('n_sb_s1'), []), false)
  assert.equal(hasResult(node('n_sb_s1'), done), true)
  assert.equal(hasResult(node('n_sb_s1'), [{ ...done[0], status: 'failed' }]), false)
  assert.equal(hasResult({ id: 'q', type: 'prompt', data: { text: '  ' } }, []), false)
  assert.equal(hasResult(node('n_p'), []), true)
  assert.equal(hasResult(node('n_kit'), []), true)
  assert.equal(hasResult({ id: 'u', type: 'upload', data: { takeId: 't1' } }, []), true)
  assert.equal(hasResult({ id: 'u2', type: 'upload', data: { media: 'image' } }, [{ id: 'g9', nodeId: 'u2', status: 'done', createdAt: 1 }]), true)
  assert.equal(hasResult({ id: 'u3', type: 'upload', data: {} }, []), false)
  assert.equal(hasResult({ id: 'f', type: 'footage', shotId: 's1', data: {} }, [], [{ id: 't1', shotId: 's1' }]), true)
  assert.equal(hasResult({ id: 'f', type: 'footage', shotId: 's1', data: {} }, [], [{ id: 't1', shotId: 's2' }]), false)
})

test('edgeLook: idle, running, focus and kit states', () => {
  assert.deepEqual(edgeLook(e('e_s'), doc, [], [], new Set(), false), { className: 'cv-edge is-idle', animated: false })
  const run = [...done, { id: 'g2', nodeId: 'n_vid_s1', status: 'running', createdAt: 2 }]
  assert.deepEqual(edgeLook(e('e_s'), doc, run, [], new Set(), false), { className: 'cv-edge is-running', animated: true })
  assert.equal(edgeLook(e('e_s'), doc, done, [], new Set(['n_sb_s1', 'n_vid_s1']), false).className, 'cv-edge is-focus')
  assert.equal(edgeLook(e('e_s'), doc, done, [], new Set(['n_sb_s1']), false).className, 'cv-edge')
  assert.equal(edgeLook(e('e_k'), doc, done, [], new Set(), false).className, 'cv-edge is-kit')
  assert.equal(edgeLook(e('e_k'), doc, done, [], new Set(), true).className, 'cv-edge is-kit is-kit-on')
})

test('edgeLook with a timeline target override never looks the target up', () => {
  const tl = { id: 'e_tl_n_vid_s1', source: 'n_vid_s1', sourceHandle: 'out', target: 'n_timeline', targetHandle: 'in:clips' }
  const vidDone = [{ id: 'g3', nodeId: 'n_vid_s1', status: 'done', createdAt: 3 }]
  assert.deepEqual(edgeLook(tl, doc, [], [], new Set(), false, { targetKind: 'timeline' }), { className: 'cv-edge is-idle', animated: false })
  assert.deepEqual(edgeLook(tl, doc, vidDone, [], new Set(['n_vid_s1']), false, { targetKind: 'timeline' }), { className: 'cv-edge is-focus', animated: false })
})

test('focusSet walks both ways from the selection', () => {
  assert.deepEqual([...focusSet(doc, ['n_sb_s1'])].sort(), ['n_kit', 'n_p', 'n_sb_s1', 'n_vid_s1'])
  assert.deepEqual([...focusSet(doc, ['n_vid_s1'])].sort(), ['n_kit', 'n_p', 'n_sb_s1', 'n_vid_s1'])
  assert.equal(focusSet(doc, []).size, 0)
})

test('compatibleKinds from a storyboard offers storyboard ref and video start, from a prompt the text inputs', () => {
  assert.deepEqual(compatibleKinds(doc, 'n_sb_s1'), [{ kind: 'storyboard', handle: 'in:ref' }, { kind: 'video', handle: 'in:start' }])
  assert.deepEqual(compatibleKinds(doc, 'n_p'), [{ kind: 'prompt', handle: 'in:text' }, { kind: 'storyboard', handle: 'in:text' }, { kind: 'video', handle: 'in:text' }])
  assert.deepEqual(compatibleKinds(doc, 'n_p1').at(-1), { kind: 'footage', handle: 'in:text' })
  assert.deepEqual(compatibleKinds(doc, 'n_kit'), [{ kind: 'storyboard', handle: 'in:kit' }])
  assert.deepEqual(compatibleKinds(doc, 'n_vid_s1'), [])
})

test('wireStart picks the newest storyboard of the frame and leaves a taken port alone', () => {
  const two = { ...doc, nodes: [...doc.nodes, { id: 'n_sb2_s1', type: 'storyboard', shotId: 's1', position: { x: 0, y: 0 }, data: {} }] }
  const free = { ...two, edges: two.edges.filter((x) => x.id !== 'e_s') }
  const out = wireStart(free, 'n_vid_s1', models)
  assert.deepEqual(out.edges.filter((x) => x.target === 'n_vid_s1').map((x) => [x.source, x.targetHandle]), [['n_sb2_s1', 'in:start']])
  assert.equal(wireStart(two, 'n_vid_s1', models), two)
  const noSb = { ...free, nodes: free.nodes.filter((n) => n.type !== 'storyboard') }
  assert.equal(wireStart(noSb, 'n_vid_s1', models), noSb)
  const noStart = models.map((m) => (m.kind === 'video' ? { ...m, inputs: { ...m.inputs, startFrame: 'none' } } : m))
  assert.equal(wireStart(free, 'n_vid_s1', noStart), free)
})

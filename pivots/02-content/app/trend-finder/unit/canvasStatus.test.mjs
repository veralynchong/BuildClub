import { test } from 'node:test'
import assert from 'node:assert/strict'
import { genButton, nodeStatus } from '../src/lib/canvas/status.ts'

const at = (id, type, shotId, data = {}) => ({ id, type, shotId, position: { x: 0, y: 0 }, data })
const doc = {
  nodes: [at('n_shot_s1', 'shot', 's1'), at('n_sb_s1', 'storyboard', 's1', { model: 'mock-image' }), at('n_vid_s1', 'video', 's1', { model: 'mock-video' })],
  edges: [{ id: 'e_s', source: 'n_sb_s1', sourceHandle: 'out', target: 'n_vid_s1', targetHandle: 'in:start' }],
}
const staleDoc = { ...doc, nodes: doc.nodes.map((n) => (n.id === 'n_sb_s1' ? { ...n, data: { ...n.data, stale: true } } : n)) }
const shots = [{ id: 's1', line: 'Hi' }]
const models = [
  { id: 'mock-image', kind: 'image', inputs: { text: 'required', reference: 'optional' }, typicalSeconds: 20 },
  { id: 'mock-video', kind: 'video', inputs: { text: 'optional', startFrame: 'optional' }, typicalSeconds: 20 },
]
// A generation with the node's model.
const g = (id, nodeId, status, createdAt) => ({
  id,
  nodeId,
  status,
  createdAt,
  kind: nodeId.includes('vid') ? 'video' : 'image',
  model: doc.nodes.find((n) => n.id === nodeId).data.model,
  inputs: {},
  url: status === 'done' ? `/m/${id}.png` : null,
})

test('nodeStatus shows one status, running first', () => {
  const gens = [g('a', 'n_sb_s1', 'failed', 1), g('b', 'n_sb_s1', 'running', 2_000)]
  assert.deepEqual(nodeStatus(staleDoc, 'n_sb_s1', gens, models, shots, 12_000), { key: 'canvas.status.running', vars: { eta: '10 s' }, tone: 'busy' })
  const noEta = models.map((m) => ({ ...m, typicalSeconds: undefined }))
  assert.equal(nodeStatus(staleDoc, 'n_sb_s1', gens, noEta, shots, 12_000).key, 'canvas.status.elapsed')
  assert.deepEqual(nodeStatus(staleDoc, 'n_sb_s1', gens, noEta, shots, 12_000).vars, { eta: '10 s' })
  // a video held for its storyboard image waits for it
  const held = [g('i', 'n_sb_s1', 'running', 1), g('v', 'n_vid_s1', 'waiting', 1)]
  assert.deepEqual(nodeStatus(doc, 'n_vid_s1', held, models, shots, 0), { key: 'canvas.status.waitFor', vars: { node: 'Storyboard' }, tone: 'wait' })
})

test('nodeStatus: failed beats stale; stale beats version; empty is none', () => {
  assert.deepEqual(nodeStatus(staleDoc, 'n_sb_s1', [g('a', 'n_sb_s1', 'done', 1), g('b', 'n_sb_s1', 'failed', 2)], models, shots, 0), { key: 'canvas.status.failed', tone: 'bad' })
  assert.deepEqual(nodeStatus(staleDoc, 'n_sb_s1', [g('a', 'n_sb_s1', 'done', 1), g('b', 'n_sb_s1', 'unknown', 2)], models, shots, 0), { key: 'canvas.status.failed', tone: 'bad' })
  assert.deepEqual(nodeStatus(staleDoc, 'n_sb_s1', [g('a', 'n_sb_s1', 'done', 1)], models, shots, 0), { key: 'canvas.status.stale', tone: 'stale' })
  const three = [g('a', 'n_sb_s1', 'done', 1), g('f', 'n_sb_s1', 'failed', 2), g('c', 'n_sb_s1', 'done', 3)]
  assert.deepEqual(nodeStatus(doc, 'n_sb_s1', three, models, shots, 0), { key: 'canvas.status.version', vars: { n: 2, total: 2 }, tone: 'ok' })
  // the chosen version is the shown one
  const chosen = { ...doc, nodes: doc.nodes.map((n) => (n.id === 'n_sb_s1' ? { ...n, data: { ...n.data, selected: 'a' } } : n)) }
  assert.deepEqual(nodeStatus(chosen, 'n_sb_s1', three, models, shots, 0).vars, { n: 1, total: 2 })
  assert.deepEqual(nodeStatus(doc, 'n_sb_s1', [], models, shots, 0), { key: 'canvas.status.none', tone: 'none' })
  assert.deepEqual(nodeStatus(doc, 'missing', [], models, shots, 0), { key: 'canvas.status.none', tone: 'none' })
})

test('nodeStatus waits for a storyboard without a result', () => {
  const need = models.map((m) => (m.kind === 'video' ? { ...m, inputs: { ...m.inputs, startFrame: 'required' } } : m))
  assert.deepEqual(nodeStatus(doc, 'n_vid_s1', [], need, shots, 0), { key: 'canvas.status.waitFor', vars: { node: 'Storyboard' }, tone: 'wait' })
  assert.equal(nodeStatus(doc, 'n_vid_s1', [g('a', 'n_sb_s1', 'done', 1)], need, shots, 0).key, 'canvas.status.none')
  // nothing on the start frame: nothing to wait for
  const unwired = { ...doc, edges: [] }
  assert.equal(nodeStatus(unwired, 'n_vid_s1', [], need, shots, 0).key, 'canvas.status.none')
})

test('genButton: Generate, then Regenerate (v2), Try again after a failure', () => {
  const sb = doc.nodes.find((n) => n.id === 'n_sb_s1')
  assert.deepEqual(genButton(sb, []), { key: 'canvas.gen.go' })
  assert.deepEqual(genButton(sb, [g('a', 'n_sb_s1', 'done', 1)]), { key: 'canvas.gen.regenerate', vars: { n: 2 } })
  assert.deepEqual(genButton(sb, [g('a', 'n_sb_s1', 'done', 1), g('f', 'n_sb_s1', 'failed', 2), g('c', 'n_sb_s1', 'done', 3)]), { key: 'canvas.gen.regenerate', vars: { n: 3 } }) // the failed attempt is not a version
  assert.deepEqual(genButton(sb, [g('a', 'n_sb_s1', 'done', 1), g('f', 'n_sb_s1', 'failed', 2)]), { key: 'canvas.gen.retry' })
  assert.deepEqual(genButton(sb, [g('f', 'n_sb_s1', 'unknown', 2)]), { key: 'canvas.gen.retry' })
  assert.deepEqual(genButton(sb, [g('a', 'n_vid_s1', 'done', 1)]), { key: 'canvas.gen.go' }) // another node's version
})

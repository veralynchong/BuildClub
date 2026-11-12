import { test } from 'node:test'
import assert from 'node:assert/strict'
import { savePrompt, regenerate, finish } from '../src/lib/shotGridActions.ts'
import { gridCells } from '../src/lib/shotGrid.ts'
import { StaleCanvas } from '../src/lib/canvas/api.ts'

const node = (id, type, shotId, data = {}) => ({ id, type, shotId, position: { x: 0, y: 0 }, data })
const doc = () => ({ nodes: [node('sh1', 'shot', 's1'), node('f1', 'storyboard', 's1', { selected: 'g1' })], edges: [] })
const shots = [{ id: 's1', time: '0:00', shot: 'Hands fold dough' }]
const gen = (id, status, extra = {}) => ({ id, nodeId: 'f1', status, createdAt: 1, inputs: {}, url: null, error: null, ...extra })
const model = { id: 'img-1', kind: 'image', label: 'Img', price: { per: 'image', usd: 0.04 }, available: true }
const stale = () => new StaleCanvas('stale', 7, null)

function fakeIO(over = {}) {
  const calls = { put: [], reload: 0, start: [] }
  const io = {
    put: async (v, d) => { calls.put.push({ v, d }); return v + 1 },
    reload: async () => { calls.reload++; return { doc: { ...doc(), nodes: [...doc().nodes, node('extra', 'prompt', null)] }, version: 9, generations: [] } },
    start: async (body) => { calls.start.push(body); return gen('g2', 'queued') },
    ...over,
  }
  return { io, calls }
}

test('savePrompt puts the doc with the new prompt', async () => {
  const { io, calls } = fakeIO()
  const out = await savePrompt(io, { doc: doc(), version: 3 }, 'f1', 'mine')
  assert.equal(out.version, 4)
  assert.equal(out.doc.nodes[1].data.prompt, 'mine')
  assert.equal(calls.put[0].v, 3)
  assert.equal(calls.reload, 0)
})

test('savePrompt reloads once on StaleCanvas and re-applies', async () => {
  let n = 0
  const { io, calls } = fakeIO({ put: async (v, d) => { calls.put.push({ v, d }); if (n++ === 0) throw stale(); return v + 1 } })
  const out = await savePrompt(io, { doc: doc(), version: 3 }, 'f1', 'mine')
  assert.equal(calls.reload, 1)
  assert.equal(out.version, 10)
  assert.equal(out.doc.nodes.find((x) => x.id === 'f1').data.prompt, 'mine')
  assert.ok(out.doc.nodes.some((x) => x.id === 'extra'))
})

test('savePrompt rejects on a second StaleCanvas', async () => {
  const { io, calls } = fakeIO({ put: async () => { throw stale() } })
  await assert.rejects(savePrompt(io, { doc: doc(), version: 3 }, 'f1', 'x'), StaleCanvas)
  assert.equal(calls.reload, 1)
})

test('regenerate starts one job and saves awaiting', async () => {
  const { io, calls } = fakeIO()
  const cell = gridCells(doc(), shots, [])[0]
  const out = await regenerate(io, { doc: doc(), version: 3 }, cell, shots, [], model)
  const body = calls.start[0]
  assert.equal(body.prompt, cell.prompt)
  assert.equal(body.aspectRatio, '9:16')
  assert.equal(body.nodeId, 'f1')
  assert.equal(body.model, 'img-1')
  assert.deepEqual(body.references, [])
  assert.equal(out.gen.id, 'g2')
  assert.equal(calls.put.length, 1)
  assert.equal(out.doc.nodes[1].data.awaiting, 'g2')
  assert.equal(out.doc.nodes[1].data.model, 'img-1')
  assert.equal(out.version, 4)
})

test('regenerate saves nothing when start fails', async () => {
  const { io, calls } = fakeIO({ start: async () => { throw new Error('Budget used up') } })
  const cell = gridCells(doc(), shots, [])[0]
  await assert.rejects(regenerate(io, { doc: doc(), version: 3 }, cell, shots, [], model), /Budget used up/)
  assert.equal(calls.put.length, 0)
})

test('finish selects a done version and keeps the old one on failure', () => {
  const awaiting = { nodes: [node('f1', 'storyboard', 's1', { selected: 'g1', awaiting: 'g2' })], edges: [] }
  const ok = finish({ doc: awaiting }, 'f1', gen('g2', 'done'))
  assert.equal(ok.nodes[0].data.selected, 'g2')
  assert.equal(ok.nodes[0].data.awaiting, undefined)
  const bad = finish({ doc: awaiting }, 'f1', gen('g2', 'failed'))
  assert.equal(bad.nodes[0].data.selected, 'g1')
  assert.equal(bad.nodes[0].data.awaiting, undefined)
})

test('workspace regenerate saves the prompt, quotes, then confirms with the stamps', async () => {
  const log = []
  const { io } = fakeIO({
    put: async (v, d) => { log.push(['put', v, d.nodes[1].data.prompt, d.nodes[1].data.awaiting]); return v + 1 },
    quote: async (nodeId, v) => { log.push(['quote', nodeId, v]); return { inputStamp: 'in1', quoteStamp: 'q1' } },
    start: async (body) => { log.push(['start', body]); return gen('g2', 'queued') },
  })
  const cell = { ...gridCells(doc(), shots, [])[0], prompt: 'edited prompt' }
  const out = await regenerate(io, { doc: doc(), version: 3 }, cell, shots, [], model)
  assert.deepEqual(log.map((l) => l[0]), ['put', 'quote', 'start', 'put'])
  assert.deepEqual(log[0].slice(1), [3, 'edited prompt', undefined])
  assert.deepEqual(log[1].slice(1), ['f1', 4])
  const body = log[2][1]
  assert.equal(body.confirm, true)
  assert.equal(body.inputStamp, 'in1')
  assert.equal(body.quoteStamp, 'q1')
  assert.equal(body.canvasVersion, 4)
  assert.equal(body.prompt, 'edited prompt')
  assert.equal(log[3][3], 'g2')
  assert.equal(log[3][1], 4)
  assert.equal(out.version, 5)
})

test('workspace regenerate saves nothing after the quote when start fails', async () => {
  const { io, calls } = fakeIO({ quote: async () => ({ inputStamp: 'a', quoteStamp: 'b' }), start: async () => { throw new Error('Budget used up') } })
  const cell = gridCells(doc(), shots, [])[0]
  await assert.rejects(regenerate(io, { doc: doc(), version: 3 }, cell, shots, [], model), /Budget used up/)
  assert.equal(calls.put.length, 1) // only the prompt save
})

test('regenerate re-saves awaiting on a fresh doc when the canvas went stale after start', async () => {
  let n = 0
  const { io, calls } = fakeIO({ put: async (v, d) => { calls.put.push({ v, d }); if (n++ === 0) throw stale(); return v + 1 } })
  const cell = gridCells(doc(), shots, [])[0]
  const out = await regenerate(io, { doc: doc(), version: 3 }, cell, shots, [], model)
  assert.equal(calls.start.length, 1)
  assert.equal(calls.reload, 1)
  assert.equal(out.version, 10)
  assert.equal(out.doc.nodes.find((x) => x.id === 'f1').data.awaiting, 'g2')
  assert.ok(out.doc.nodes.some((x) => x.id === 'extra'))
  assert.deepEqual(out.generations, [])
})

test('savePrompt returns the reloaded generations after a stale save', async () => {
  let n = 0
  const { io, calls } = fakeIO({ put: async (v, d) => { calls.put.push({ v, d }); if (n++ === 0) throw stale(); return v + 1 } })
  const out = await savePrompt(io, { doc: doc(), version: 3 }, 'f1', 'mine')
  assert.deepEqual(out.generations, [])
})

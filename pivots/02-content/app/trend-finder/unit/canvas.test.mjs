import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canConnect, edgeLabel, outMedia } from '../src/lib/canvas/ports.ts'
import { addNode, downstream, markStale, versionsOf, selectedGen, pendingGen, genRequest, missingInput, primaryFrames, failedGen, freeSpot, roomBelow, staleIds, finishedWhileAway, genStarted, genFinished, chainPair, priceOf, budgetLeft, isRetired, chainBusy } from '../src/lib/canvas/graph.ts'
import { putCanvas, getCanvas, NoShots, StaleCanvas, pollGen, getBudget, quoteChain, startChain } from '../src/lib/canvas/api.ts'

const models = [
  { id: 'mock-image', kind: 'image', inputs: { text: 'required', reference: 'optional' } },
  { id: 'mock-video', kind: 'video', inputs: { text: 'optional', startFrame: 'optional', reference: 'optional' } },
]
const edge = (source, target, targetHandle = 'in:text') => ({ id: `e_${source}_${target}_${targetHandle}`, source, sourceHandle: 'out', target, targetHandle })
const node = (id, type, data = {}, shotId) => ({ id, type, ...(shotId ? { shotId } : {}), position: { x: 0, y: 0 }, data })
const docWith = ({ nodes = [], edges = [] } = {}) => ({
  nodes: [
    node('n_shot_s1', 'shot', { removed: false }, 's1'),
    node('n_sb_s1', 'storyboard', { primary: true, model: 'mock-image', prompt: '', selected: null, stale: false }, 's1'),
    node('n_vid', 'video', { model: 'mock-video', prompt: '' }),
    node('n_vid2', 'video', { model: 'mock-video', prompt: '' }),
    ...nodes,
  ],
  edges: [edge('n_shot_s1', 'n_sb_s1'), edge('n_sb_s1', 'n_vid', 'in:start'), edge('n_vid', 'n_vid2', 'in:start'), ...edges],
  viewport: { x: 0, y: 0, zoom: 1 },
})
const gen = (id, nodeId, status, createdAt, url = `/u/${id}`) => ({ id, nodeId, status, createdAt, url, kind: 'image', model: 'mock-image', inputs: {} })

test('text cannot go into an image port', () => {
  const r = canConnect(docWith(), { source: 'n_shot_s1', target: 'n_vid', targetHandle: 'in:start' }, models)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'canvas.conn.media')
  assert.deepEqual(r.vars, { from: 'text', to: 'image' })
})

test('image into a video start frame is allowed and labelled', () => {
  const doc = docWith()
  doc.edges = doc.edges.filter((e) => e.target !== 'n_vid')
  assert.deepEqual(canConnect(doc, { source: 'n_sb_s1', target: 'n_vid', targetHandle: 'in:start' }, models), { ok: true })
  assert.equal(edgeLabel({ targetHandle: 'in:start' }), 'canvas.edge.start')
  assert.equal(edgeLabel({ targetHandle: 'in:ref' }), 'canvas.edge.ref')
  assert.equal(edgeLabel({ targetHandle: 'in:text' }), null)
})

test('a port takes one line, no self or cycle, empty upload blocked', () => {
  const doc = docWith({ nodes: [node('n_up', 'upload', {}), node('n_sb_b', 'storyboard', {})], edges: [edge('n_sb_s1', 'n_sb_b', 'in:ref')] })
  const c = (source, target, targetHandle) => canConnect(doc, { source, target, targetHandle }, models)
  assert.equal(c('n_vid', 'n_vid', 'in:text').reason, 'canvas.conn.self')
  assert.equal(c('n_up', 'n_sb_s1', 'in:ref').reason, 'canvas.conn.empty')
  assert.equal(c('n_sb_s1', 'n_vid', 'in:start').reason, 'canvas.conn.taken')
  // n_sb_b is downstream of n_sb_s1, so n_sb_b -> n_sb_s1 would loop.
  assert.equal(c('n_sb_b', 'n_sb_s1', 'in:ref').reason, 'canvas.conn.cycle')
})

test('a model without reference input blocks the line', () => {
  const noRef = [{ ...models[1], inputs: { text: 'optional', startFrame: 'optional' } }]
  const doc = docWith()
  assert.equal(canConnect(doc, { source: 'n_sb_s1', target: 'n_vid', targetHandle: 'in:ref' }, noRef).reason, 'canvas.conn.model')
  assert.deepEqual(canConnect(doc, { source: 'n_sb_s1', target: 'n_vid', targetHandle: 'in:ref' }, noRef).vars, { model: 'mock-video' })
})

test('outMedia by node kind', () => {
  assert.equal(outMedia(node('a', 'shot')), 'text')
  assert.equal(outMedia(node('a', 'storyboard')), 'image')
  assert.equal(outMedia(node('a', 'footage')), 'video')
  assert.equal(outMedia(node('a', 'upload', {})), null)
  assert.equal(outMedia(node('a', 'upload', { media: 'image' })), 'image')
})

test('downstream excludes the node, dedupes and survives loops', () => {
  const doc = docWith({ edges: [edge('n_shot_s1', 'n_vid')] })
  assert.deepEqual(downstream(doc, 'n_shot_s1').sort(), ['n_sb_s1', 'n_vid', 'n_vid2'])
})

test('markStale only flags generated nodes downstream', () => {
  const doc = docWith({ nodes: [node('n_vid3', 'video', {})], edges: [edge('n_vid2', 'n_vid3', 'in:start')] })
  const gens = [gen('g1', 'n_sb_s1', 'done', 1), gen('g2', 'n_vid', 'done', 2), gen('g3', 'n_vid2', 'failed', 3)]
  const before = JSON.stringify(doc)
  const out = markStale(doc, 'n_shot_s1', gens)
  assert.equal(out.nodes.find((n) => n.id === 'n_sb_s1').data.stale, true)
  assert.equal(out.nodes.find((n) => n.id === 'n_vid').data.stale, true)
  assert.notEqual(out.nodes.find((n) => n.id === 'n_vid2').data.stale, true)
  assert.notEqual(out.nodes.find((n) => n.id === 'n_vid3').data.stale, true)
  assert.equal(JSON.stringify(doc), before)
})

test('selectedGen falls back to the newest done', () => {
  const n = (selected) => node('n', 'storyboard', { selected })
  const v1 = gen('v1', 'n', 'done', 1)
  const v2 = gen('v2', 'n', 'failed', 2)
  const v3 = gen('v3', 'n', 'running', 3)
  assert.equal(selectedGen(n(null), [v1, v2, v3]).id, 'v1')
  assert.equal(selectedGen(n('v2'), [v1, v2, v3]).id, 'v1')
  assert.equal(selectedGen(n('gone'), [v1, v2, v3]).id, 'v1')
  assert.equal(selectedGen(n(null), [v2, v3]), null)
  assert.equal(selectedGen(n('v1'), [v1, { ...v3, status: 'done' }]).id, 'v1')
  assert.equal(selectedGen(n(null), [v1, v2, { ...v3, status: 'done' }]).id, 'v3')
  assert.equal(pendingGen('n', [v1, v2, v3]).id, 'v3')
  assert.equal(pendingGen('n', [v1, v2]), null)
  assert.deepEqual(versionsOf('n', [v3, v1, gen('x', 'other', 'done', 0), v2]).map((g) => g.id), ['v1', 'v2', 'v3'])
})

const shots = [{ id: 's1', time: '0-3s', shot: 'Wide shot of the cafe', line: 'Welcome in', frameImage: '/old.svg' }]

test('genRequest prefers the node prompt, then the shot line', () => {
  const doc = docWith()
  assert.deepEqual(genRequest(doc, 'n_sb_s1', shots, []), { prompt: 'Welcome in' })
  doc.nodes.find((n) => n.id === 'n_sb_s1').data.prompt = 'Neon cafe'
  assert.deepEqual(genRequest(doc, 'n_sb_s1', shots, []), { prompt: 'Neon cafe' })
  const noLine = [{ ...shots[0], line: undefined }]
  const doc2 = docWith()
  assert.equal(genRequest(doc2, 'n_sb_s1', noLine, []).prompt, 'Wide shot of the cafe')
})

test('genRequest follows prompt nodes and picks start frame from the selected version', () => {
  const doc = docWith({
    nodes: [node('n_p1', 'prompt', { text: '' }), node('n_p2', 'prompt', { text: 'Slow zoom' })],
    edges: [edge('n_p2', 'n_p1'), edge('n_p1', 'n_vid')],
  })
  const gens = [gen('g1', 'n_sb_s1', 'done', 1)]
  assert.deepEqual(genRequest(doc, 'n_vid', shots, gens), { prompt: 'Slow zoom', startFrame: 'g1' })
})

test('missingInput says what is needed', () => {
  const doc = docWith()
  doc.edges = []
  assert.equal(missingInput(doc, 'n_sb_s1', models[0], shots, []), 'canvas.gen.needText')
  const need = { ...models[1], inputs: { text: 'optional', startFrame: 'required' } }
  assert.equal(missingInput(doc, 'n_vid', need, shots, []), 'canvas.gen.needStart')
  assert.equal(missingInput(docWith(), 'n_sb_s1', models[0], shots, []), null)
})

test('primaryFrames lists only changed shots', () => {
  const two = [shots[0], { id: 's2', time: '3-6s', shot: 'x', frameImage: '/same.svg' }]
  const doc = docWith({
    nodes: [node('n_shot_s2', 'shot', {}, 's2'), node('n_sb_s2', 'storyboard', { primary: true }, 's2')],
  })
  const gens = [gen('g1', 'n_sb_s1', 'done', 1, '/new.svg'), gen('g2', 'n_sb_s2', 'done', 1, '/same.svg')]
  assert.deepEqual(primaryFrames(doc, two, gens), [{ index: 0, frameImage: '/new.svg' }])
})

test('putCanvas sends version and doc, returns the new version', async () => {
  let seen
  globalThis.fetch = async (url, init) => {
    seen = { url, init }
    return { ok: true, status: 200, json: async () => ({ version: 4 }) }
  }
  assert.equal(await putCanvas('i/a', 3, docWith()), 4)
  assert.equal(seen.url, '/api/ideas/i%2Fa/canvas')
  assert.equal(seen.init.method, 'PUT')
  assert.equal(JSON.parse(seen.init.body).version, 3)
})

test('putCanvas throws StaleCanvas on 409', async () => {
  const doc = docWith()
  globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'stale', version: 7, doc }) })
  await assert.rejects(putCanvas('ia', 3, doc), (e) => e instanceof StaleCanvas && e.version === 7 && e.doc === doc)
})

test('putCanvas treats a 409 without a version and the shot-delete 422 as stale', async () => {
  const doc = docWith()
  globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'Only an approved plan can change the canvas.' }) })
  await assert.rejects(putCanvas('ia', 3, doc), (e) => e instanceof StaleCanvas)
  globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ error: "Shot nodes can't be deleted." }) })
  await assert.rejects(putCanvas('ia', 3, doc), (e) => e instanceof StaleCanvas)
  globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ error: 'Every node needs a position.' }) })
  await assert.rejects(putCanvas('ia', 3, doc), (e) => !(e instanceof StaleCanvas) && /position/.test(e.message))
})

test('getCanvas throws NoShots on 409 no-shots and other errors with the server text', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'Save the shot list first.', code: 'no-shots' }) })
  await assert.rejects(getCanvas('ia'), NoShots)
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ error: "That plan doesn't exist." }) })
  await assert.rejects(getCanvas('ia'), { message: "That plan doesn't exist." })
})

test('pollGen resolves on done and null on abort', async () => {
  const states = ['running', 'done']
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 'g', status: states.shift() }) })
  const seen = []
  const last = await pollGen('ia', 'g', (g) => seen.push(g.status), { intervalMs: 1 })
  assert.equal(last.status, 'done')
  assert.deepEqual(seen, ['running', 'done'])
  const ac = new AbortController()
  ac.abort()
  assert.equal(await pollGen('ia', 'g', () => {}, { signal: ac.signal }), null)
})

import { toFlow, fromFlow } from '../src/lib/canvas/flow.ts'

test('toFlow / fromFlow keep the saved node data and only take positions and viewport from the screen', () => {
  const doc = {
    nodes: [
      { id: 'n2', type: 'shot', shotId: 's2', position: { x: 0, y: 300 }, data: {} },
      { id: 'n1', type: 'shot', shotId: 's1', position: { x: 0, y: 0 }, data: { removed: true } },
      { id: 'sb1', type: 'storyboard', position: { x: 300, y: 0 }, data: { primary: true } },
    ],
    edges: [{ id: 'e1', source: 'n1', sourceHandle: 'out:text', target: 'sb1', targetHandle: 'in:text' }],
    viewport: { x: 1, y: 2, zoom: 1 },
  }
  const { nodes, edges } = toFlow(doc)
  assert.deepEqual(nodes.map((n) => n.type), ['shot', 'shot', 'storyboard'])
  assert.deepEqual(nodes.map((n) => n.deletable), [false, false, true])
  assert.equal(edges[0].sourceHandle, 'out:text')
  assert.equal(edges[0].targetHandle, 'in:text')
  assert.deepEqual(fromFlow(nodes, edges, doc.viewport), doc)
  nodes[2].position = { x: 310.4, y: 5.6 }
  const moved = fromFlow(nodes, edges, { x: 0.4, y: 0, zoom: 1.23456 })
  assert.deepEqual(moved.nodes[2].position, { x: 310, y: 6 })
  assert.deepEqual(moved.nodes[2].data, { primary: true })
  assert.deepEqual(moved.viewport, { x: 0, y: 0, zoom: 1.235 })
  assert.equal(fromFlow(nodes, edges, undefined).viewport, undefined)
})

import { isDefaultViewport } from '../src/lib/canvas/flow.ts'

test('the backend\'s starting view counts as not yet set', () => {
  assert.equal(isDefaultViewport(undefined), true)
  assert.equal(isDefaultViewport({ x: 0, y: 0, zoom: 1 }), true)
  assert.equal(isDefaultViewport({ x: 0, y: 0, zoom: 1.2 }), false)
  assert.equal(isDefaultViewport({ x: -40, y: 0, zoom: 1 }), false)
})

test('addNode gives every node a new id and leaves the input doc alone', () => {
  const doc = docWith()
  const ids = new Set(doc.nodes.map((n) => n.id))
  let cur = doc
  for (let i = 0; i < 60; i++) cur = addNode(cur, i % 2 ? 'video' : 'prompt', { x: i, y: 5 })
  assert.equal(cur.nodes.length, doc.nodes.length + 60)
  assert.equal(new Set(cur.nodes.map((n) => n.id)).size, cur.nodes.length)
  assert.equal(doc.nodes.length, 4)
  const added = cur.nodes[doc.nodes.length]
  assert.equal(added.type, 'prompt')
  assert.deepEqual(added.position, { x: 0, y: 5 })
  assert.equal(ids.has(added.id), false)
  assert.match(added.id, /^[A-Za-z0-9_:-]{1,80}$/)
})

test('addNode starts each kind with its own data', () => {
  const d = addNode(addNode(addNode(docWith(), 'storyboard', { x: 0, y: 0 }), 'video', { x: 0, y: 0 }), 'prompt', { x: 0, y: 0 })
  const [sb, vid, pr] = d.nodes.slice(-3)
  assert.equal(sb.data.primary, false)
  assert.equal(sb.data.model, 'mock-image')
  assert.equal(vid.data.model, 'mock-video')
  assert.equal(pr.data.text, '')
})

test('addNode for a shot links the shot to the new node, and footage needs a shot', () => {
  assert.throws(() => addNode(docWith(), 'footage', { x: 0, y: 0 }), /shot/i)
  assert.throws(() => addNode(docWith(), 'footage', { x: 0, y: 0 }, 'nope'), /shot/i)
  const d = addNode(docWith(), 'footage', { x: 700, y: 0 }, 's1')
  const ft = d.nodes[d.nodes.length - 1]
  assert.equal(ft.shotId, 's1')
  const line = d.edges[d.edges.length - 1]
  assert.deepEqual([line.source, line.sourceHandle, line.target, line.targetHandle], ['n_shot_s1', 'out', ft.id, 'in:text'])
  const u = addNode(docWith(), 'upload', { x: 0, y: 0 }, 's1') // upload has no text port: no line
  assert.equal(u.edges.length, docWith().edges.length)
})

test('addNode with a shot moves right to a free spot on the shot row', () => {
  const doc = docWith()
  doc.nodes[0].position = { x: 0, y: 100 }
  doc.nodes[1].position = { x: 360, y: 100 }
  const d = addNode(doc, 'video', { x: 360, y: 100 }, 's1')
  const v = d.nodes[d.nodes.length - 1]
  assert.equal(v.position.y, 100)
  assert.ok(v.position.x >= 720)
})

test('failedGen is the newest version only when it failed', () => {
  const g = [gen('a', 'n_sb_s1', 'done', 1), gen('b', 'n_sb_s1', 'failed', 2)]
  assert.equal(failedGen('n_sb_s1', g)?.id, 'b')
  assert.equal(failedGen('n_sb_s1', [...g, gen('c', 'n_sb_s1', 'done', 3)]), null)
  assert.equal(failedGen('n_sb_s1', [...g, gen('d', 'n_sb_s1', 'running', 3)]), null)
  assert.equal(failedGen('n_other', g), null)
})

test('roomBelow keeps the spot when it is empty and steps down past nodes in the way', () => {
  const at = (x, y) => ({ ...node(`n_${x}_${y}`, 'video'), position: { x, y } })
  assert.deepEqual(roomBelow(docWith({ nodes: [at(900, 0)] }), { x: 360, y: 0 }), { x: 360, y: 0 })
  assert.deepEqual(roomBelow(docWith({ nodes: [at(360, 0)] }), { x: 360, y: 0 }), { x: 360, y: 280 })
  const stacked = docWith({ nodes: [at(360, 0), at(380, 280), at(360, 560)] })
  assert.deepEqual(roomBelow(stacked, { x: 360, y: 0 }), { x: 360, y: 840 })
})

test('freeSpot moves a new node off the ones already there', () => {
  const doc = docWith()
  assert.deepEqual(freeSpot(doc, { x: 500, y: 500 }), { x: 500, y: 500 })
  const busy = { ...doc, nodes: [...doc.nodes, { ...node('n_a', 'prompt'), position: { x: 500, y: 500 } }, { ...node('n_b', 'prompt'), position: { x: 540, y: 540 } }] }
  assert.deepEqual(freeSpot(busy, { x: 500, y: 500 }), { x: 580, y: 580 })
})

test('staleIds never includes the node itself unless its own input changed', () => {
  const g = [gen('a', 'n_sb_s1', 'done', 1), gen('v', 'n_vid', 'done', 2), gen('w', 'n_vid2', 'done', 3)]
  const doc = docWith()
  doc.nodes.find((n) => n.id === 'n_sb_s1').data.stale = true // an earlier stale mark on the node being regenerated
  assert.deepEqual(staleIds(doc, 'n_sb_s1', g, false).sort(), ['n_vid', 'n_vid2'])
  assert.deepEqual(staleIds(doc, 'n_sb_s1', g, true).sort(), ['n_sb_s1', 'n_vid', 'n_vid2'])
  assert.deepEqual(staleIds(doc, 'n_sb_s1', [], true), [])
})

test('genStarted keeps the chosen version and marks the wait', () => {
  const data = { selected: 'v1', stale: true, model: 'mock-image', prompt: 'x' }
  assert.deepEqual(genStarted(data, 'mock-image', 'g2'), { ...data, awaiting: 'g2' })
})

test('genFinished: done selects the new version, clears the wait and the stale flag', () => {
  const data = { selected: 'v1', stale: true, awaiting: 'g2' }
  const out = genFinished(data, { id: 'g2', status: 'done' })
  assert.equal(out.selected, 'g2')
  assert.equal(out.stale, false)
  assert.equal('awaiting' in out, false)
})

test('genFinished: failed keeps the chosen version and clears the wait', () => {
  const out = genFinished({ selected: 'v1', awaiting: 'g2' }, { id: 'g2', status: 'failed' })
  assert.equal(out.selected, 'v1')
  assert.equal('awaiting' in out, false)
  // a node that had nothing chosen stays that way
  assert.equal(genFinished({ selected: null, awaiting: 'g2' }, { id: 'g2', status: 'failed' }).selected, null)
})

test('genFinished: an older job ending does not disturb a newer wait', () => {
  const data = { selected: 'v1', awaiting: 'g3' }
  assert.deepEqual(genFinished(data, { id: 'g2', status: 'failed' }), data)
})

test('finishedWhileAway: a done version we were waiting for is selected and dates what follows', () => {
  const doc = docWith()
  doc.nodes.find((n) => n.id === 'n_sb_s1').data.awaiting = 'a'
  doc.nodes.find((n) => n.id === 'n_sb_s1').data.selected = 'v1'
  const gens = [gen('v1', 'n_sb_s1', 'done', 1), gen('a', 'n_sb_s1', 'done', 2)]
  assert.deepEqual(finishedWhileAway(doc, gens), [{ nodeId: 'n_sb_s1', genId: 'a', select: true }])
})

test('finishedWhileAway: a failed job we were waiting for only clears the wait', () => {
  const doc = docWith()
  doc.nodes.find((n) => n.id === 'n_sb_s1').data.awaiting = 'a'
  doc.nodes.find((n) => n.id === 'n_sb_s1').data.selected = 'v1'
  const gens = [gen('v1', 'n_sb_s1', 'done', 1), gen('a', 'n_sb_s1', 'failed', 2)]
  assert.deepEqual(finishedWhileAway(doc, gens), [{ nodeId: 'n_sb_s1', genId: 'a', select: false }])
})

test('finishedWhileAway: still running is left alone; legacy and imported nodes are untouched', () => {
  const doc = docWith()
  const sb = doc.nodes.find((n) => n.id === 'n_sb_s1')
  sb.data.awaiting = 'a'
  assert.deepEqual(finishedWhileAway(doc, [gen('a', 'n_sb_s1', 'running', 2)]), [])
  delete sb.data.awaiting
  assert.deepEqual(finishedWhileAway(doc, [{ ...gen('i', 'n_sb_s1', 'done', 1), model: 'imported' }]), [])
  assert.deepEqual(finishedWhileAway(doc, [gen('a', 'n_sb_s1', 'done', 1)]), [])
})

import { checkImage, imageType, uploadKind } from '../src/lib/canvas/upload.ts'

test('upload: image and video types, by type then by extension', () => {
  assert.equal(imageType({ name: 'a.png', type: 'image/png' }), 'image/png')
  assert.equal(imageType({ name: 'a.JPEG', type: '' }), 'image/jpeg')
  assert.equal(imageType({ name: 'a.webp', type: '' }), 'image/webp')
  assert.equal(imageType({ name: 'a.png', type: 'image/gif' }), null)
  assert.equal(uploadKind({ name: 'a.mov', type: '' }), 'video')
  assert.equal(uploadKind({ name: 'a.png', type: 'image/png' }), 'image')
  assert.equal(uploadKind({ name: 'a.txt', type: 'text/plain' }), null)
})

test('upload: checkImage rejects unsupported and oversize', () => {
  assert.equal(checkImage({ name: 'a.png', type: 'image/png', size: 10 }), null)
  assert.equal(checkImage({ name: 'a.gif', type: 'image/gif', size: 10 }), 'canvas.err.upload')
  assert.equal(checkImage({ name: 'a.png', type: 'image/png', size: 21 * 1024 * 1024 }), 'canvas.upload.tooBig')
})

test('uploadImage rejects an unsupported file without a request', async () => {
  const { uploadImage } = await import('../src/lib/canvas/api.ts')
  const real = globalThis.fetch
  let called = false
  globalThis.fetch = async () => { called = true; return new Response('{}') }
  try {
    await assert.rejects(uploadImage('i', 'n', { name: 'a.gif', type: 'image/gif', size: 3 }), /upload/i)
    assert.equal(called, false)
  } finally { globalThis.fetch = real }
})

test('chainPair finds the video a storyboard feeds, from either end, and null without a line', () => {
  assert.deepEqual(chainPair(docWith(), 'n_sb_s1'), { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid' })
  assert.deepEqual(chainPair(docWith(), 'n_vid'), { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid' })
  const bare = docWith()
  bare.edges = bare.edges.filter((e) => e.targetHandle !== 'in:start')
  assert.equal(chainPair(bare, 'n_sb_s1'), null)
  assert.equal(chainPair(bare, 'n_vid'), null)
  // a video fed by another video's start line is not a chain with a storyboard
  assert.equal(chainPair(docWith(), 'n_vid2'), null)
  assert.equal(chainPair(docWith(), 'nope'), null)
})

test('priceOf: per image is flat, per second multiplies by the length or the first duration', () => {
  const img = { price: { per: 'image', usd: 0.04 } }
  const vid = { price: { per: 'second', usd: 0.1 }, durations: [5, 10] }
  assert.equal(priceOf(img, undefined), 0.04)
  assert.equal(priceOf(img, 8), 0.04)
  assert.equal(priceOf(vid, 10), 1)
  assert.equal(priceOf(vid, undefined), 0.5)
  assert.equal(priceOf({ price: { per: 'second', usd: 0.1 } }, undefined), 0)
  assert.equal(priceOf({ price: { per: 'image', usd: 0 } }, undefined), 0)
})

test('budgetLeft is the cap minus what was spent, never below zero', () => {
  const b = { image: { spent: 0.2, cap: 0.5 }, video: { spent: 1.5, cap: 1 } }
  assert.equal(budgetLeft(b, 'image'), 0.3)
  assert.equal(budgetLeft(b, 'video'), 0)
  assert.equal(budgetLeft(null, 'image'), null)
})

test('isRetired: a saved model missing from the menu of its kind', () => {
  const list = [{ id: 'a', kind: 'image' }, { id: 'b', kind: 'video' }]
  assert.equal(isRetired(list, 'image', 'a'), false)
  assert.equal(isRetired(list, 'image', 'gone'), true)
  assert.equal(isRetired(list, 'image', 'b'), true)
  assert.equal(isRetired(list, 'image', undefined), false)
  assert.equal(isRetired([], 'image', 'a'), false) // models not loaded yet
})

test('waiting counts as in progress; unknown is an ended version that can be retried', () => {
  const v1 = gen('v1', 'n', 'done', 1)
  const w = gen('w', 'n', 'waiting', 2)
  assert.equal(pendingGen('n', [v1, w]).id, 'w')
  const u = gen('u', 'n', 'unknown', 3)
  assert.equal(pendingGen('n', [v1, u]), null)
  assert.equal(failedGen('n', [v1, u]).id, 'u')
  const doc = docWith()
  doc.nodes.find((n) => n.id === 'n_sb_s1').data.awaiting = 'u'
  assert.deepEqual(finishedWhileAway(doc, [gen('u', 'n_sb_s1', 'unknown', 2)]), [{ nodeId: 'n_sb_s1', genId: 'u', select: false }])
  assert.equal(genFinished({ awaiting: 'u', selected: 'v1' }, { id: 'u', status: 'unknown' }).awaiting, undefined)
})

test('pollGen keeps going while waiting and stops on unknown', async () => {
  const states = ['waiting', 'running', 'unknown']
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 'g', status: states.shift() }) })
  const last = await pollGen('ia', 'g', () => {}, { intervalMs: 1 })
  assert.equal(last.status, 'unknown')
  assert.deepEqual(states, [])
})

test('getBudget, quoteChain and startChain talk to the right routes', async () => {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, status: 200, json: async () => ({ ok: 1 }) }
  }
  await getBudget()
  assert.equal(calls[0].url, '/api/gen/budget')
  const body = { imageNodeId: 'a', videoNodeId: 'b', imageModel: 'm', videoModel: 'v', prompt: 'p' }
  await quoteChain('i/a', body)
  assert.equal(calls[1].url, '/api/ideas/i%2Fa/gen/chain')
  assert.equal(JSON.parse(calls[1].init.body).confirm, false)
  await startChain('i/a', body)
  assert.equal(JSON.parse(calls[2].init.body).confirm, true)
  assert.equal(JSON.parse(calls[2].init.body).imageNodeId, 'a')
})

test('startChain shows a 429 message from the server as it is', async () => {
  const msg = "Today's budget has US$0.10 left for images and US$0.00 for videos. Nothing was started."
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: msg }) })
  await assert.rejects(startChain('ia', {}), { message: msg })
  await assert.rejects(quoteChain('ia', {}), { message: msg })
})

test('chainBusy: true when either end of the chain is queued, waiting or running', () => {
  const doc = docWith()
  assert.equal(chainBusy(doc, 'n_sb_s1', []), false)
  assert.equal(chainBusy(doc, 'n_sb_s1', [gen('a', 'n_sb_s1', 'running', 1)]), true)
  assert.equal(chainBusy(doc, 'n_sb_s1', [gen('b', 'n_vid', 'waiting', 1)]), true)
  assert.equal(chainBusy(doc, 'n_vid', [gen('a', 'n_sb_s1', 'queued', 1)]), true)
  assert.equal(chainBusy(doc, 'n_vid', [gen('a', 'n_sb_s1', 'done', 1), gen('b', 'n_vid', 'failed', 2)]), false)
  assert.equal(chainBusy(docWith(), 'n_vid2', []), false) // no chain
})

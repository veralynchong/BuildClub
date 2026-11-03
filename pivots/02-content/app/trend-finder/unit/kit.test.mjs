import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kitRefs, wireKit, pruneKit, kitStale } from '../src/lib/canvas/kit.ts'
import { getKit, createKitItem, updateKitItem, deleteKitItem, addKitImage, deleteKitImage, kitFileUrl } from '../src/lib/canvas/api.ts'

const edge = (source, target, targetHandle) => ({ id: `e_${source}_${target}_${targetHandle}`, source, sourceHandle: 'out', target, targetHandle })
const node = (id, type, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data })
const item = (id, kind, name, images, updatedAt = 100) => ({ id, kind, name, note: '', images, updatedAt })
const mia = item('k_mia', 'character', 'Mia', ['a1.png', 'a2.png'])
const cup = item('k_cup', 'product', 'Cup', ['c1.png'])
const cafe = item('k_cafe', 'place', 'Cafe', ['p1.png'])
const film = item('k_film', 'style', 'Warm film', ['s1.png'])
const kit = { items: [film, cafe, cup, mia] } // not in kind order on purpose
const model = (maxRefs, reference = 'optional') => ({ id: 'm', kind: 'image', inputs: { text: 'required', reference }, ...(maxRefs ? { maxRefs } : {}) })
const gen = (id, nodeId, status = 'done', createdAt = 1, inputs = {}) => ({ id, nodeId, status, createdAt, url: `/u/${id}`, kind: 'image', model: 'm', inputs })

// a storyboard with `manual` upload nodes on in:ref and a kit node on in:kit
function docOf({ manual = 0, kitItems = ['k_mia', 'k_cup', 'k_cafe', 'k_film'], kitOff, wired = true } = {}) {
  const nodes = [node('sb', 'storyboard', { ...(kitOff ? { kitOff } : {}) }), node('kit', 'kit', { kitItems })]
  const edges = wired ? [edge('kit', 'sb', 'in:kit')] : []
  for (let i = 1; i <= manual; i++) {
    nodes.push(node(`up${i}`, 'upload', { media: 'image' }))
    edges.push(edge(`up${i}`, 'sb', 'in:ref'))
  }
  return { nodes, edges }
}
const gens = [1, 2, 3].map((i) => gen(`g${i}`, `up${i}`))
const ids = (r) => r.references.map((x) => (x.source === 'gen' ? x.genId : `${x.itemId}:${x.image}`))

test('kitRefs orders manual refs, then character, product, place, style', () => {
  const r = kitRefs(docOf({ manual: 1 }), 'sb', kit, gens, model(14))
  assert.deepEqual(ids(r), ['g1', 'k_mia:a1.png', 'k_mia:a2.png', 'k_cup:c1.png', 'k_cafe:p1.png', 'k_film:s1.png'])
  assert.deepEqual([r.dropped, r.unused], [[], false])
})

test('kitRefs skips items in kitOff and items not in kitItems', () => {
  const r = kitRefs(docOf({ kitItems: ['k_mia', 'k_cup', 'k_film'], kitOff: ['k_mia'] }), 'sb', kit, [], model(14))
  assert.deepEqual(ids(r), ['k_cup:c1.png', 'k_film:s1.png'])
  const gone = kitRefs(docOf({ kitItems: ['k_mia', 'k_deleted'] }), 'sb', kit, [], model(14))
  assert.deepEqual(ids(gone), ['k_mia:a1.png', 'k_mia:a2.png'])
})

test('kitRefs trims from the end', () => {
  const r = kitRefs(docOf({ manual: 1, kitItems: ['k_mia', 'k_film'] }), 'sb', kit, gens, model(3))
  assert.deepEqual(ids(r), ['g1', 'k_mia:a1.png', 'k_mia:a2.png'])
  assert.deepEqual(r.dropped, ['Warm film'])
})

test('kitRefs lists a partly cut item as dropped', () => {
  const r = kitRefs(docOf({ manual: 1, kitItems: ['k_mia'] }), 'sb', kit, gens, model(2))
  assert.deepEqual(ids(r), ['g1', 'k_mia:a1.png'])
  assert.deepEqual(r.dropped, ['Mia'])
})

test('kitRefs trims manual refs last', () => {
  const r = kitRefs(docOf({ manual: 3, kitItems: [] }), 'sb', kit, gens, model(1))
  assert.deepEqual(ids(r), ['g1'])
  assert.deepEqual(r.dropped, ['image 2', 'image 3'])
})

test('kitRefs with null kit', () => {
  const r = kitRefs(docOf({ manual: 2 }), 'sb', null, gens, model(14))
  assert.deepEqual(ids(r), ['g1', 'g2'])
  assert.deepEqual(r.dropped, [])
})

test('kitRefs on a model with reference none', () => {
  const r = kitRefs(docOf({ manual: 1 }), 'sb', kit, gens, model(14, 'none'))
  assert.deepEqual(r, { references: [], dropped: [], unused: true })
})

test('kitRefs without an in:kit edge sends no kit refs', () => {
  const r = kitRefs(docOf({ manual: 1, wired: false }), 'sb', kit, gens, model(14))
  assert.deepEqual(ids(r), ['g1'])
})

test('kitRefs skips a manual source with no done version', () => {
  const r = kitRefs(docOf({ manual: 2, kitItems: [] }), 'sb', kit, [gen('g2', 'up2')], model(14))
  assert.deepEqual(ids(r), ['g2'])
})

test('kitRefs sends a text-only ref for an image-less item', () => {
  const bare = item('k_bare', 'style', 'Grainy', [])
  const k = { items: [mia, bare] }
  const r = kitRefs(docOf({ manual: 1, kitItems: ['k_mia', 'k_bare'] }), 'sb', k, gens, model(3))
  assert.deepEqual(r.references, [
    { source: 'gen', genId: 'g1' },
    { source: 'kit', itemId: 'k_mia', image: 'a1.png' },
    { source: 'kit', itemId: 'k_mia', image: 'a2.png' },
    { source: 'kit', itemId: 'k_bare' },
  ])
  assert.deepEqual(r.dropped, []) // the text-only ref is not counted and not trimmed
  const tight = kitRefs(docOf({ kitItems: ['k_mia', 'k_bare'] }), 'sb', k, [], model(1))
  assert.deepEqual(tight.references.at(-1), { source: 'kit', itemId: 'k_bare' })
  assert.deepEqual(tight.dropped, ['Mia'])
})

test('wireKit connects every storyboard once and respects kitCut', () => {
  const doc = {
    nodes: [node('kit', 'kit'), node('sb1', 'storyboard'), node('sb2', 'storyboard'), node('sb3', 'storyboard', { kitCut: true }), node('sb4', 'storyboard'), node('v', 'video')],
    edges: [edge('kit', 'sb4', 'in:kit')],
  }
  const out = wireKit(doc)
  const kitEdges = out.edges.filter((e) => e.targetHandle === 'in:kit')
  assert.deepEqual(kitEdges.map((e) => e.target).sort(), ['sb1', 'sb2', 'sb4'])
  assert.deepEqual(kitEdges.find((e) => e.target === 'sb1'), { id: 'e_kit_sb1_in:kit', source: 'kit', sourceHandle: 'out', target: 'sb1', targetHandle: 'in:kit' })
  assert.deepEqual(wireKit(out), out)
})

test('wireKit with no kit node is a no-op', () => {
  const doc = docOf({ wired: false })
  doc.nodes = doc.nodes.filter((n) => n.type !== 'kit')
  assert.equal(wireKit(doc), doc)
})

test('pruneKit removes deleted ids', () => {
  const doc = docOf({ kitItems: ['k_mia', 'k_gone'], kitOff: ['k_gone', 'k_cup'] })
  const out = pruneKit(doc, kit)
  assert.deepEqual(out.nodes.find((n) => n.id === 'kit').data.kitItems, ['k_mia'])
  assert.deepEqual(out.nodes.find((n) => n.id === 'sb').data.kitOff, ['k_cup'])
  assert.equal(pruneKit(doc, null), doc)
  assert.equal(pruneKit(out, kit), out)
})

test('kitStale flags a newer updatedAt and a removed item', () => {
  const doc = docOf()
  doc.nodes.push(node('sb2', 'storyboard'), node('sb3', 'storyboard'))
  const stamped = (nodeId, stamp, refs = []) => gen(`x_${nodeId}`, nodeId, 'done', 1, { kitStamp: stamp, references: refs })
  const g = [
    stamped('sb', { k_mia: 50 }), // mia is at 100 now: newer
    stamped('sb2', { k_mia: 100, k_cup: 100 }), // current
    stamped('sb3', { k_old: 10 }, [{ source: 'kit', itemId: 'k_old', name: 'Old', kind: 'place' }]), // removed
  ]
  assert.deepEqual(kitStale(doc, g, kit), [{ nodeId: 'sb', removed: [] }, { nodeId: 'sb3', removed: ['Old'] }])
  assert.deepEqual(kitStale(doc, g, null), [])
})

test('kitStale ignores storyboards with no done version', () => {
  const doc = docOf()
  const g = [gen('q', 'sb', 'running', 1, { kitStamp: { k_mia: 1 } }), gen('f', 'sb', 'failed', 2, { kitStamp: { k_mia: 1 } })]
  assert.deepEqual(kitStale(doc, g, kit), [])
})

// ---- api client ----
function stub(status, body) {
  const seen = {}
  globalThis.fetch = async (url, init = {}) => {
    seen.url = url
    seen.init = init
    return { ok: status < 400, status, json: async () => body }
  }
  return seen
}

test('getKit GETs the client kit', async () => {
  const seen = stub(200, { items: [mia] })
  assert.deepEqual(await getKit('c/1'), { items: [mia] })
  assert.equal(seen.url, '/api/clients/c%2F1/kit')
  assert.equal(seen.init.method ?? 'GET', 'GET')
})

test('createKitItem POSTs the body', async () => {
  const seen = stub(201, mia)
  assert.deepEqual(await createKitItem('c1', { kind: 'character', name: 'Mia' }), mia)
  assert.equal(seen.url, '/api/clients/c1/kit/items')
  assert.equal(seen.init.method, 'POST')
  assert.deepEqual(JSON.parse(seen.init.body), { kind: 'character', name: 'Mia' })
})

test('updateKitItem PATCHes a partial body', async () => {
  const seen = stub(200, mia)
  await updateKitItem('c1', 'k_mia', { note: 'blue coat' })
  assert.equal(seen.url, '/api/clients/c1/kit/items/k_mia')
  assert.equal(seen.init.method, 'PATCH')
  assert.deepEqual(JSON.parse(seen.init.body), { note: 'blue coat' })
})

test('deleteKitItem DELETEs and returns the kit', async () => {
  const seen = stub(200, { items: [] })
  assert.deepEqual(await deleteKitItem('c1', 'k_mia'), { items: [] })
  assert.equal(seen.url, '/api/clients/c1/kit/items/k_mia')
  assert.equal(seen.init.method, 'DELETE')
})

test('addKitImage PUTs the raw file with its content type', async () => {
  const seen = stub(200, mia)
  const file = { name: 'a.png', type: 'image/png', size: 3 }
  await addKitImage('c1', 'k_mia', file)
  assert.equal(seen.url, '/api/clients/c1/kit/items/k_mia/images')
  assert.equal(seen.init.method, 'PUT')
  assert.equal(seen.init.headers['content-type'], 'image/png')
  assert.equal(seen.init.body, file)
})

test('deleteKitImage DELETEs one image by name', async () => {
  const seen = stub(200, mia)
  await deleteKitImage('c1', 'k_mia', 'ka_1.png')
  assert.equal(seen.url, '/api/clients/c1/kit/items/k_mia/images/ka_1.png')
  assert.equal(seen.init.method, 'DELETE')
})

test('kitFileUrl points at the file route', () => {
  assert.equal(kitFileUrl('c/1', 'ka_1.png'), '/api/clients/c%2F1/kit/files/ka_1.png')
})

test('kit api errors carry the backend error text', async () => {
  const msg = 'A kit item with that name already exists.'
  for (const call of [
    () => getKit('c1'),
    () => createKitItem('c1', { kind: 'style', name: 'x' }),
    () => updateKitItem('c1', 'k', { name: 'x' }),
    () => deleteKitItem('c1', 'k'),
    () => addKitImage('c1', 'k', { name: 'a.png', type: 'image/png', size: 1 }),
    () => deleteKitImage('c1', 'k', 'a.png'),
  ]) {
    stub(409, { error: msg })
    await assert.rejects(call(), (e) => e instanceof Error && e.message === msg)
  }
})

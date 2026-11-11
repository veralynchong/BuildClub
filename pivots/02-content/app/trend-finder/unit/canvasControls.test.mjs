import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeImageSettings, imageEstimate, modelRefusal, genRequest, reuseSettings, referenceEdge, successfulVersions } from '../src/lib/canvas/graph.ts'
import { generationItems, startGen, quoteNode, nodeQuoteMatches } from '../src/lib/canvas/api.ts'
import { reconcileGenerations, rememberBatch, selectGeneration, createCanvasSession } from '../src/lib/canvas/session.ts'
const model = { id: 'image', kind: 'image', aspects: ['9:16', '1:1'], resolutions: ['1K', '2K'], maxCount: 10, maxRefs: 2, inputs: { reference: 'optional' }, price: { per: 'image', usd: .1, byResolutionUsd: { '1K': .1, '2K': .2 } } }
const node = (id, data = {}, type = 'storyboard') => ({ id, type, position: { x: 0, y: 0 }, data })
const gen = (id, status = 'done', nodeId = 'n') => ({ id, nodeId, status, kind: 'image', inputs: {}, createdAt: Number(id.replace(/\D/g, '')) || 1 })
test('legacy defaults and model normalization retain valid settings', () => {
 assert.deepEqual(normalizeImageSettings({}, model), { aspectRatio: '9:16', resolution: '1K', count: 1 })
 assert.deepEqual(normalizeImageSettings({ aspectRatio: '1:1', resolution: '2K', count: 3 }, model), { aspectRatio: '1:1', resolution: '2K', count: 3 })
 assert.deepEqual(normalizeImageSettings({ aspectRatio: 'bad', resolution: '4K', count: 9 }, { ...model, resolutions: undefined, maxCount: undefined }), { aspectRatio: '9:16', resolution: undefined, count: 1 })
 assert.equal(imageEstimate(model, { resolution: '2K', count: 3 }), .6)
})
test('request/reuse carry options without changing absent legacy settings', () => {
 const data = { aspectRatio: '1:1', resolution: '2K', count: 3 }
 assert.deepEqual(genRequest({ nodes: [node('n', data)], edges: [] }, 'n', [], []), { prompt: '', references: [], ...data })
 assert.deepEqual(genRequest({ nodes: [node('n')], edges: [] }, 'n', [], []), { prompt: '', references: [] })
 assert.deepEqual(reuseSettings({ model: 'image', kind: 'image', inputs: data }), { model: 'image', prompt: '', ...data })
})
test('reference choice rejects incompatible models and uses existing ports', () => {
 const doc = { nodes: [node('n'), node('s', { selected: 'g' })], edges: [referenceEdge('s', 'n', false)] }
 assert.equal(doc.edges[0].targetHandle, 'in:ref')
 assert.equal(referenceEdge('kit', 'n', true).targetHandle, 'in:kit')
 assert.ok(modelRefusal(doc, 'n', { ...model, inputs: {} }, [], null))
 assert.equal(modelRefusal(doc, 'n', model, [], null), null)
 const removed = { ...doc, edges: [] }; assert.equal(removed.nodes.length, 2)
})
test('batch parser and flat response stay compatible; quoteStamp reaches confirm', async () => {
 const g = gen('g1'); assert.deepEqual(generationItems(g), [g]); assert.deepEqual(generationItems({ batchId: 'b', count: 2, items: [g, gen('g2')] }), [g, gen('g2')])
 const old = globalThis.fetch
 try { globalThis.fetch = async (_, init) => { assert.equal(JSON.parse(init.body).quoteStamp, 'price-v2'); return new Response(JSON.stringify(g)) }; assert.deepEqual(await startGen('idea', { nodeId: 'n', quoteStamp: 'price-v2', confirm: true }), g) } finally { globalThis.fetch = old }
})
function ioFor(initial) { let doc = initial; const io = { current: () => doc, change: d => { doc = d }, flush: async () => true, voices: [], importVoice: async () => null, onVoice() {} }; return io }
test('batch partial/reload reconciliation selects first success once and retains manual selection', async () => {
 const io = ioFor({ nodes: [node('n')], edges: [] })
 await rememberBatch([gen('g1', 'queued'), gen('g2', 'queued'), gen('g3', 'queued')], io)
 await reconcileGenerations([gen('g1'), gen('g2', 'running')], io)
 assert.equal(io.current().nodes[0].data.selected, 'g1')
 assert.deepEqual(io.current().nodes[0].data.awaitingBatch, ['g2', 'g3'])
 await selectGeneration(gen('manual'), io)
 await reconcileGenerations([gen('g2'), gen('g3', 'unknown')], io)
 assert.equal(io.current().nodes[0].data.selected, 'manual')
 assert.equal(io.current().nodes[0].data.awaitingBatch, undefined)
})
test('batch preserves prior selected output; successful history is same-node only', async () => {
 const io = ioFor({ nodes: [node('n', { selected: 'old' })], edges: [] })
 await rememberBatch([gen('g1'), gen('g2')], io); await reconcileGenerations([gen('g1'), gen('g2')], io)
 assert.equal(io.current().nodes[0].data.selected, 'old')
 assert.deepEqual(successfulVersions('n', [gen('g2'), gen('g1'), gen('fail', 'failed'), gen('other', 'done', 'x')]).map(g => g.id), ['g1', 'g2'])
})

test('confirmation requires renewed review when server price/options stamp changes, even at the same total', async () => {
 const shown = { usd: .6, inputStamp: 'settings-1', quoteStamp: 'price-1' }
 assert.equal(nodeQuoteMatches(shown, { total: .6, inputStamp: 'settings-1', quoteStamp: 'price-1' }), true)
 assert.equal(nodeQuoteMatches(shown, { total: .6, inputStamp: 'settings-1', quoteStamp: 'price-2' }), false)
 assert.equal(nodeQuoteMatches(shown, { total: .6, inputStamp: 'settings-2', quoteStamp: 'price-1' }), false)
 assert.equal(nodeQuoteMatches(shown, { total: 0, inputStamp: 'settings-1', quoteStamp: 'free' }), false)
 const old = globalThis.fetch
 try {
  globalThis.fetch = async (_, init) => { assert.deepEqual(JSON.parse(init.body), { nodeId: 'n', canvasVersion: 4, confirm: false }); return new Response(JSON.stringify({ total: .6, inputStamp: 'settings-1', quoteStamp: 'price-2', count: 3, unitUsd: .2 })) }
  assert.equal(nodeQuoteMatches(shown, await quoteNode('idea', 'n', 4)), false)
 } finally { globalThis.fetch = old }
})
test('batch tracking survives saved session reopen and clears all terminal children without resubmission', async () => {
 let saved, draft
 const session = createCanvasSession({ doc: { nodes: [node('n')], edges: [] }, version: 1 }, { save: async (_, doc) => { saved = structuredClone(doc); return 2 }, readDraft: () => null, writeDraft: d => { draft = d } })
 const io = { ...ioFor(session.doc()), current: session.doc, change: session.change, flush: session.flush }
 await rememberBatch([gen('g1', 'queued'), gen('g2', 'queued'), gen('g3', 'queued')], io)
 session.keepDraft(); assert.equal(draft, null)
 const reopened = ioFor(saved)
 await reconcileGenerations([gen('g1', 'failed'), gen('g2'), gen('g3', 'unknown')], reopened)
 assert.equal(reopened.current().nodes[0].data.awaitingBatch, undefined)
 assert.equal(reopened.current().nodes[0].data.selected, 'g2')
 await reconcileGenerations([gen('g1', 'done'), gen('g3')], reopened)
 assert.equal(reopened.current().nodes[0].data.selected, 'g2')
})
test('capability normalization rejects boolean/oversized counts and accounts for untrimmed kit references', () => {
 assert.equal(normalizeImageSettings({ count: true }, model).count, 1)
 assert.equal(normalizeImageSettings({ count: 11 }, model).count, 1)
 const doc = { nodes: [node('n'), node('kit', { kitItems: ['item'] }, 'kit')], edges: [referenceEdge('kit', 'n', true)] }
 const kit = { items: [{ id: 'item', images: ['a', 'b', 'c'] }] }
 assert.ok(modelRefusal(doc, 'n', model, [], kit))
 assert.equal(doc.edges.length, 1)
 assert.equal(modelRefusal(doc, 'n', { ...model, maxRefs: 3 }, [], kit), null)
})

test('bootstrap reconstructs a new server batch over old empty tracking, including terminal-before-reopen', async () => {
 for (const status of ['running', 'done']) {
  const io = ioFor({ nodes: [node('n', { selected: null, awaitingBatch: [] })], edges: [] })
  const old = { ...gen('g1', 'failed'), inputs: { batchId: 'old' } }
  const children = ['g2', 'g3'].map(id => ({ ...gen(id, status), inputs: { batchId: 'new' } }))
  await reconcileGenerations([old, ...children], io, { restoreBatches: true })
  if (status === 'running') {
   assert.deepEqual(io.current().nodes[0].data.awaitingBatch, ['g2', 'g3'])
   await reconcileGenerations(children.map(g => ({ ...g, status: 'done' })), io)
  }
  assert.equal(io.current().nodes[0].data.selected, 'g2')
 }
})
test('bootstrap preserves an existing manual choice while reconstructing server children', async () => {
 const io = ioFor({ nodes: [node('n', { selected: 'manual', awaitingBatch: [] })], edges: [] })
 const children = ['g2', 'g3'].map(id => ({ ...gen(id, 'running'), inputs: { batchId: 'new' } }))
 await reconcileGenerations(children, io, { restoreBatches: true })
 assert.deepEqual(io.current().nodes[0].data.awaitingBatch, ['g2', 'g3'])
 await reconcileGenerations(children.map(g => ({ ...g, status: 'done' })), io)
 assert.equal(io.current().nodes[0].data.selected, 'manual')
})
test('focused ModelPicker listbox consumes destructive keys and retains arrow/Escape handling', async () => {
 const { readFile } = await import('node:fs/promises')
 const { default: ts } = await import('typescript')
 const hooks = 'data:text/javascript;base64,' + Buffer.from(`export const changes=[];export const useState=v=>[typeof v==='boolean'?true:0,n=>changes.push(n)];export const useEffect=()=>{};export const useId=()=>"picker-test";export const useRef=()=>({current:null})`).toString('base64')
 const source = await readFile(new URL('../src/components/canvas/ModelPicker.tsx', import.meta.url), 'utf8')
 let code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
 const imports = {
  react: hooks, 'react/jsx-runtime': import.meta.resolve('react/jsx-runtime'),
  '../../lib/i18n': new URL('../src/lib/i18n.ts', import.meta.url).href,
  '../../lib/canvas/graph': new URL('../src/lib/canvas/graph.ts', import.meta.url).href,
  '../../lib/canvas/shell': new URL('../src/lib/canvas/shell.ts', import.meta.url).href,
  '../../lib/strings/freeform': new URL('../src/lib/strings/freeform.ts', import.meta.url).href,
 }
 for (const [name, url] of Object.entries(imports)) code = code.replaceAll(`from "${name}"`, `from "${url}"`).replaceAll(`from '${name}'`, `from '${url}'`)
 const { ModelPicker } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
 const menuModel = { ...model, available: true, label: 'First' }
 const tree = ModelPicker({ models: [menuModel, { ...menuModel, id: 'other', label: 'Other' }], kind: 'image', value: 'image', refuses: () => null, disabled: false, onPick() {} })
 const list = tree.props.children.find(child => child?.props?.role === 'listbox')
 assert.ok(list, 'test renders the actual focused menu handler')
 for (const key of ['Delete', 'Backspace', 'ArrowDown', 'Escape']) {
  let stopped = false, prevented = false
  list.props.onKeyDown({ key, stopPropagation: () => { stopped = true }, preventDefault: () => { prevented = true } })
  assert.equal(stopped, true, `${key} must stay inside the focused control`)
  if (key === 'ArrowDown' || key === 'Escape') assert.equal(prevented, true)
 }
 const { changes } = await import(hooks)
 assert.ok(changes.includes(1), 'ArrowDown still advances to the next model')
 assert.ok(changes.includes(false), 'Escape still closes the menu')
})
test('bootstrap recovers an already terminal new batch when an old batch saved an empty anchor', async () => {
 const io = ioFor({ nodes: [node('n', { selected: null, awaitingBatch: [] })], edges: [] })
 const children = ['g2', 'g3'].map(id => ({ ...gen(id), inputs: { batchId: 'new' } }))
 await reconcileGenerations([{ ...gen('g1', 'failed'), inputs: { batchId: 'old' } }, ...children], io, { restoreBatches: true })
 assert.equal(io.current().nodes[0].data.selected, 'g2')
})

test('bootstrap respects a valid newer count1 awaiting over historic failed batches', async () => {
 for (const status of ['running', 'done']) {
  const io = ioFor({ nodes: [node('n', { selected: null, awaiting: 'single-new' })], edges: [] })
  const old = { ...gen('batch-old', 'failed'), createdAt: 1, inputs: { batchId: 'old' } }
  const single = { ...gen('single-new', status), createdAt: 2 }
  await reconcileGenerations([old, single], io, { restoreBatches: true })
  if (status === 'running') assert.equal(io.current().nodes[0].data.awaiting, 'single-new')
  else assert.equal(io.current().nodes[0].data.selected, 'single-new')
  assert.equal(io.current().nodes[0].data.awaitingBatch, undefined)
 }
})
test('bootstrap uses complete chronology when the latest single has no saved tracking', async () => {
 for (const status of ['running', 'done']) {
  const io = ioFor({ nodes: [node('n', { selected: null, awaitingBatch: [] })], edges: [] })
  const old = { ...gen('old-child'), createdAt: 1, inputs: { batchId: 'old' } }
  const single = { ...gen('single-new', status), createdAt: 2 }
  await reconcileGenerations([old, single], io, { restoreBatches: true })
  if (status === 'running') {
   assert.equal(io.current().nodes[0].data.awaiting, 'single-new')
   await reconcileGenerations([{ ...single, status: 'done' }], io)
  }
  assert.equal(io.current().nodes[0].data.selected, 'single-new')
 }
})
test('bootstrap restores a newer batch after an older tracked single, including terminal children', async () => {
 for (const status of ['running', 'done']) {
  const io = ioFor({ nodes: [node('n', { selected: null, awaiting: 'single-old' })], edges: [] })
  const single = { ...gen('single-old', 'failed'), createdAt: 1 }
  const children = ['b2', 'b3'].map((id, index) => ({ ...gen(id, status), createdAt: 2 + index, inputs: { batchId: 'new' } }))
  await reconcileGenerations([single, ...children], io, { restoreBatches: true })
  if (status === 'running') {
   assert.deepEqual(io.current().nodes[0].data.awaitingBatch, ['b2', 'b3'])
   await reconcileGenerations(children.map(g => ({ ...g, status: 'done' })), io)
  }
  assert.equal(io.current().nodes[0].data.selected, 'b2')
 }
})
test('historic failed-only batches require no tracking write on repeated reopen', async () => {
 const io = ioFor({ nodes: [node('n', { selected: null })], edges: [] })
 let writes = 0
 const withWrites = { ...io, change: doc => { writes++; io.change(doc) } }
 const failed = [{ ...gen('old-child', 'failed'), inputs: { batchId: 'old' } }]
 await reconcileGenerations(failed, withWrites, { restoreBatches: true })
 await reconcileGenerations(failed, withWrites, { restoreBatches: true })
 assert.equal(writes, 0)
 assert.equal(io.current().nodes[0].data.selected, null)
})
test('review reproduction: failed historic batch cannot erase the newer completed single awaiting', async () => {
 const io = ioFor({ nodes: [node('n', { selected: null, awaiting: 'single-new' })], edges: [] })
 await reconcileGenerations([
  { ...gen('batch-old', 'failed'), createdAt: 1, inputs: { batchId: 'old' } },
  { ...gen('single-new'), createdAt: 2 },
 ], io, { restoreBatches: true })
 assert.equal(io.current().nodes[0].data.selected, 'single-new')
 assert.equal(io.current().nodes[0].data.awaiting, undefined)
})
test('bootstrap orders mixed rows by creation and preserves manual choices for untracked terminal results', async () => {
 for (const batch of [false, true]) {
  const io = ioFor({ nodes: [node('n', { selected: 'manual', awaitingBatch: [] })], edges: [] })
  const latest = { ...gen('new'), createdAt: 20, inputs: batch ? { batchId: 'new-batch' } : {} }
  await reconcileGenerations([latest, { ...gen('old', 'failed'), createdAt: 10, inputs: { batchId: 'old-batch' } }], io, { restoreBatches: true })
  assert.equal(io.current().nodes[0].data.selected, 'manual')
 }
})

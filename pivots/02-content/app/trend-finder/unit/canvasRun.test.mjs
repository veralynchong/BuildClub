import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chainBody, liveShotIds, paidConfirmNeeded, runBatches, runScopeChecked, runScopeInfo, scopeTotal } from '../src/lib/canvas/run.ts'

const at = (id, type, shotId, data = {}) => ({ id, type, ...(shotId ? { shotId } : {}), position: { x: 0, y: 0 }, data })
const start = (id, source, target) => ({ id, source, sourceHandle: 'out', target, targetHandle: 'in:start' })
const sb = (id, shotId, model = 'mock-image') => at(id, 'storyboard', shotId, { model, prompt: '', selected: null, stale: false })
const vid = (id, shotId) => at(id, 'video', shotId, { model: 'mock-video', prompt: '', duration: 4 })
const doc = {
  nodes: [
    at('n_shot_s1', 'shot', 's1', { removed: false }),
    at('n_shot_s2', 'shot', 's2', { removed: false }),
    at('n_shot_s3', 'shot', 's3', { removed: true }),
    sb('n_sb_s1', 's1'),
    vid('n_vid_s1', 's1'),
    sb('n_sb_s2', 's2'),
    vid('n_vid_s2', 's2'),
    sb('n_sb_s3', 's3'),
    sb('n_old_s2', 's2', 'gone'),
    sb('n_free', undefined),
  ],
  edges: [start('e_s1', 'n_sb_s1', 'n_vid_s1'), start('e_s2', 'n_sb_s2', 'n_vid_s2')],
}
const shots = [
  { id: 's1', line: 'A coffee cup on a desk' },
  { id: 's2', line: 'Steam rising' },
  { id: 's3', line: 'Gone shot' },
]
const models = [
  { id: 'mock-image', kind: 'image', price: { per: 'image', usd: 0.04 }, available: true, inputs: { text: 'required', reference: 'optional' } },
  { id: 'mock-video', kind: 'video', price: { per: 'second', usd: 0.08 }, durations: [4], available: true, inputs: { text: 'optional', startFrame: 'required' } },
]
const g = (id, nodeId, status, createdAt) => ({ id, nodeId, status, createdAt, kind: nodeId.includes('vid') ? 'video' : 'image', model: 'mock-image', inputs: {}, url: status === 'done' ? `/m/${id}.png` : null })
const doneSb2 = [g('d', 'n_sb_s2', 'done', 1)]
const runScope = (...args) => runScopeInfo(...args).items
const ids = (items) => items.map((i) => i.nodeId)

test('runScope skips done, running, removed and retired nodes; includeStale adds stale ones', () => {
  assert.deepEqual(ids(runScope(doc, shots, doneSb2, models, { includeStale: false })), ['n_sb_s1', 'n_vid_s1', 'n_vid_s2'])
  const running = [...doneSb2, g('r', 'n_sb_s1', 'running', 2)]
  assert.deepEqual(ids(runScope(doc, shots, running, models, { includeStale: false })), ['n_vid_s2'])
  const stale = structuredClone(doc)
  stale.nodes.find((n) => n.id === 'n_sb_s2').data.stale = true
  assert.deepEqual(ids(runScope(stale, shots, doneSb2, models, { includeStale: false })), ['n_sb_s1', 'n_vid_s1', 'n_vid_s2'])
  assert.deepEqual(ids(runScope(stale, shots, doneSb2, models, { includeStale: true })), ['n_sb_s1', 'n_vid_s1', 'n_sb_s2', 'n_vid_s2'])
  assert.deepEqual(runScope(doc, shots, doneSb2, models, { includeStale: false })[0], { shotId: 's1', nodeId: 'n_sb_s1', kind: 'image', model: 'mock-image', usd: 0.04 })
})

test('runScope skips removed shots', () => {
  assert.ok(!ids(runScope(doc, shots, [], models, { includeStale: true })).includes('n_sb_s3'))
  assert.deepEqual(runScope(doc, shots, [], models, { shotId: 's3', includeStale: true }), [])
  assert.ok(!ids(runScope(doc, shots, [], models, { includeStale: true })).includes('n_free'))
})

test('runScope keeps a video whose start frame comes from a storyboard in scope', () => {
  assert.deepEqual(ids(runScope(doc, shots, [], models, { shotId: 's1', includeStale: false })), ['n_sb_s1', 'n_vid_s1'])
  const cut = { ...doc, edges: doc.edges.filter((e) => e.id !== 'e_s1') }
  assert.deepEqual(ids(runScope(cut, shots, [], models, { shotId: 's1', includeStale: false })), ['n_sb_s1']) // start frame required, nothing makes it
})

test('runScope skips a model that needs a key', () => {
  const off = models.map((m) => (m.kind === 'video' ? { ...m, available: false } : m))
  assert.deepEqual(ids(runScope(doc, shots, [], off, { includeStale: false })), ['n_sb_s1', 'n_sb_s2'])
})

test('runBatches chains a storyboard with its video and puts singles after', () => {
  const items = runScope(doc, shots, doneSb2, models, { includeStale: false })
  assert.deepEqual(runBatches(doc, items), [{ chain: { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1' } }, { single: 'n_vid_s2' }])
  // a storyboard without its video in scope runs alone, before the videos
  const only = items.filter((i) => i.nodeId !== 'n_vid_s1')
  assert.deepEqual(runBatches(doc, only), [{ single: 'n_sb_s1' }, { single: 'n_vid_s2' }])
})

test('chainBody builds the same body onChain sent, or the reason it can not', () => {
  const r = chainBody(doc, { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1' }, models, shots, [], null)
  assert.deepEqual(r, { body: { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1', imageModel: 'mock-image', videoModel: 'mock-video', prompt: shots[0].line, videoPrompt: shots[0].line, duration: 4 } })
  const off = models.map((m) => ({ ...m, available: false }))
  assert.deepEqual(chainBody(doc, { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1' }, off, shots, [], null), { error: 'canvas.chain.noKey' })
  const noText = shots.map((s) => ({ ...s, line: '' }))
  assert.deepEqual(chainBody(doc, { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1' }, models, noText, [], null), { error: 'canvas.chain.missing' })
})

test('runScopeChecked leaves out a chain chainBody refuses, and gives the same scope every time', () => {
  // a reference on the video: the chain would be refused with noRef
  const withRef = structuredClone(doc)
  withRef.edges.push({ id: 'e_ref', source: 'n_sb_s2', sourceHandle: 'out', target: 'n_vid_s1', targetHandle: 'in:ref' })
  const opts = { includeStale: false }
  const plain = runScopeInfo(withRef, shots, doneSb2, models, opts)
  assert.deepEqual(ids(plain.items), ['n_sb_s1', 'n_vid_s1', 'n_vid_s2'])
  const checked = runScopeChecked(withRef, shots, doneSb2, models, null, opts)
  assert.deepEqual(checked.refused, ['canvas.chain.noRef'])
  assert.deepEqual(ids(checked.items), ['n_vid_s2'])
  assert.deepEqual(runScopeChecked(withRef, shots, doneSb2, models, null, opts), checked)
  // nothing refused: the same items as the plain scope
  const ok = runScopeChecked(doc, shots, doneSb2, models, null, opts)
  assert.deepEqual(ok.refused, [])
  assert.deepEqual(ok.items, runScopeInfo(doc, shots, doneSb2, models, opts).items)
})

test('scopeTotal sums per shot', () => {
  const items = [{ shotId: 's1', usd: 0.04 }, { shotId: 's1', usd: 0.32 }, { shotId: 's2', usd: 0.04 }]
  assert.deepEqual(scopeTotal(items), { total: 0.4, perShot: [{ shotId: 's1', usd: 0.36 }, { shotId: 's2', usd: 0.04 }] })
  assert.deepEqual(scopeTotal([]), { total: 0, perShot: [] })
})

test('paidConfirmNeeded only for a paid first run', () => {
  assert.equal(paidConfirmNeeded(0, false), false)
  assert.equal(paidConfirmNeeded(0.04, false), true)
  assert.equal(paidConfirmNeeded(0.04, true), false)
})

test('a second video on a storyboard remade in this run is deferred, not priced or started', () => {
  const two = structuredClone(doc)
  two.nodes.push(vid('n_vid2_s1', 's1'))
  two.edges.push(start('e_s1b', 'n_sb_s1', 'n_vid2_s1'))
  const info = runScopeInfo(two, shots, [], models, { shotId: 's1', includeStale: false })
  assert.deepEqual(ids(info.items), ['n_sb_s1', 'n_vid_s1'])
  assert.deepEqual(info.deferred, ['n_vid2_s1'])
  assert.deepEqual(runBatches(two, info.items), [{ chain: { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1' } }])
  assert.equal(scopeTotal(info.items).total, 0.36)
  // a stale storyboard with a result: the second video would start from the old frame, so it waits as well
  const stale = structuredClone(two)
  stale.nodes.find((n) => n.id === 'n_sb_s1').data.stale = true
  const gens = [g('old', 'n_sb_s1', 'done', 1)]
  const s2 = runScopeInfo(stale, shots, gens, models, { shotId: 's1', includeStale: true })
  assert.deepEqual(ids(s2.items), ['n_sb_s1', 'n_vid_s1'])
  assert.deepEqual(s2.deferred, ['n_vid2_s1'])
  assert.equal(runScopeInfo(stale, shots, gens, models, { shotId: 's1', includeStale: false }).deferred.length, 0) // storyboard not rerun
})

test('runScopeInfo counts nodes left out for a model that needs a key', () => {
  const off = models.map((m) => ({ ...m, available: false }))
  const info = runScopeInfo(doc, shots, [], off, { shotId: 's1', includeStale: true })
  assert.deepEqual(info.items, [])
  assert.equal(info.skippedNoKey, 2)
  assert.equal(runScopeInfo(doc, shots, [], models, { includeStale: true }).skippedNoKey, 0)
})

test('liveShotIds leaves out removed shots and keeps plan order', () => {
  assert.deepEqual(liveShotIds(doc, shots), ['s1', 's2'])
  assert.deepEqual(liveShotIds(doc, shots, 's3'), [])
})

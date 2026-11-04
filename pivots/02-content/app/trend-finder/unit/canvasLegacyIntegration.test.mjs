import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { askAgent, applyAgentPlan } from '../src/lib/canvas/agent.ts'
import { getCanvas, NoShots } from '../src/lib/canvas/api.ts'
import { apiBase } from '../src/lib/canvas/resource.ts'
import { applyPromptPlan } from '../src/lib/canvas/freeform.ts'
import { staleIds } from '../src/lib/canvas/graph.ts'

// Run the production handlers and load effect with controlled IO, without a browser or copied implementations.
const source = ts.createSourceFile('CanvasScreen.tsx', readFileSync(new URL('../src/components/canvas/CanvasScreen.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function find(root, predicate) {
  const found = []
  function visit(n) { if (predicate(n)) found.push(n); ts.forEachChild(n, visit) }
  visit(root)
  return found
}
const variable = (name) => find(source, (n) => ts.isVariableDeclaration(n) && n.name.getText(source) === name)[0].initializer
function evaluate(node, scope) {
  const code = ts.transpileModule(`const value = ${node.getText(source)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(scope), `${code}; return value`)(...Object.values(scope))
}
const node = (id, type, shotId, data = {}) => ({ id, type, shotId, data, position: { x: 0, y: 0 } })
const models = [{ id: 'mock-image', inputs: {} }, { id: 'mock-video', inputs: { startFrame: 'optional' } }]
const legacyPlan = { source: 'demo', shotId: 's1', storyboard: { model: 'mock-image', prompt: 'shot image' }, video: { model: 'mock-video', prompt: 'shot video', duration: 4 }, planUsd: 0 }
const promptPlan = { source: 'demo', storyboard: legacyPlan.storyboard, video: legacyPlan.video, planUsd: 0, promptNodeId: 'p', canvasVersion: 7 }
const doc = { nodes: [node('shot', 'shot', 's1'), node('p', 'prompt', undefined, { text: 'workspace text' }), node('legacyPrompt', 'prompt', 's1', { text: 'separate prompt' }), node('sb', 'storyboard', 's1', { selected: 'old', primary: true }), node('vid', 'video', 's1', { selected: 'old-video' }), node('kit', 'kit')], edges: [] }
const tick = () => new Promise((resolve) => setImmediate(resolve))
function assistant(kind, pickedId = 'shot', flush = async () => true) {
  let current = structuredClone(doc), preview, note, version = 7
  const scope = {
    resource: { kind, id: 'legacy / id' }, selected: [pickedId], picked: current.nodes.find((n) => n.id === pickedId), shots: [{ id: 's1', line: 'original shot line' }],
    session: { doc: () => current, saved: () => current, version: () => version }, flush,
    withBusy: async (_, run) => run(), askAgent, apiBase, fetch: (...args) => globalThis.fetch(...args),
    setPlan: (p) => { preview = p }, serverText: (s) => s, ff: (s) => s, t: (s) => s,
  }
  return {
    ask: () => evaluate(variable('ask'), scope)(), preview: () => preview, doc: () => current, note: () => note,
    setVersion: (v) => { version = v },
    apply: () => {
      evaluate(variable('applyAssistant'), { ...scope, plan: preview, models, gens: [{ id: 'old', nodeId: 'sb', status: 'done' }, { id: 'old-video', nodeId: 'vid', status: 'done' }], applyAgentPlan, applyPromptPlan, staleIds, change: (d) => { current = d }, setNote: (s) => { note = s }, setDock: () => {} })()
    },
  }
}

test('actual legacy assistant posts shotId and applies its response to existing shot nodes', async (t) => {
  const seen = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    seen.push([url, init.method, JSON.parse(init.body)])
    return { ok: true, json: async () => legacyPlan }
  })
  const app = assistant('legacy-plan', 'legacyPrompt')
  await app.ask()
  assert.deepEqual(seen, [['/api/ideas/legacy%20%2F%20id/agent/plan', 'POST', { shotId: 's1' }]])
  app.apply()
  const next = app.doc()
  assert.equal(next.nodes.length, doc.nodes.length)
  assert.equal(next.nodes.find((n) => n.id === 'sb').data.prompt, 'shot image')
  assert.equal(next.nodes.find((n) => n.id === 'sb').data.selected, 'old')
  assert.equal(next.nodes.find((n) => n.id === 'sb').data.stale, true)
  assert.equal(next.nodes.find((n) => n.id === 'vid').data.stale, true)
  assert.ok(next.edges.some((e) => e.source === 'sb' && e.target === 'vid' && e.targetHandle === 'in:start'))
  assert.ok(next.edges.some((e) => e.source === 'kit' && e.target === 'sb' && e.targetHandle === 'in:kit'))
})

test('actual workspace assistant retains prompt/version request and connected-node application', async (t) => {
  const seen = []
  t.mock.method(globalThis, 'fetch', async (url, init) => { seen.push([url, JSON.parse(init.body)]); return { ok: true, json: async () => promptPlan } })
  const app = assistant('workspace', 'p')
  await app.ask()
  assert.deepEqual(seen, [['/api/workspaces/legacy%20%2F%20id/agent/plan', { promptNodeId: 'p', canvasVersion: 7 }]])
  app.apply()
  assert.equal(app.doc().nodes.length, doc.nodes.length + 2)
  assert.equal(app.doc().edges.filter((e) => e.source === 'p' && e.targetHandle === 'in:text').length, 2)
})

test('legacy assistant offers an explicit shot selection and never treats free prompts as shots', async (t) => {
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => { requests++; return { ok: true, json: async () => legacyPlan } })
  const app = assistant('legacy-plan', 'p')
  await assert.rejects(app.ask())
  assert.equal(requests, 0)
  const select = find(source, (n) => ts.isJsxElement(n) && n.openingElement.tagName.getText(source) === 'select' && n.getText(source).includes('assistantShot'))[0]
  assert.ok(select, 'legacy users can select a shot from the assistant dock')
  const onChange = select.openingElement.attributes.properties.find((n) => n.name?.text === 'onChange').initializer.expression
  let selected
  evaluate(onChange, { doc, setSelected: (ids) => { selected = ids } })({ target: { value: 's1' } })
  assert.deepEqual(selected, ['shot'])
})

test('assistant never applies a legacy preview after canvas version changes or requests after failed save', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => legacyPlan }))
  const app = assistant('legacy-plan')
  await app.ask(); app.setVersion(8); app.apply()
  assert.deepEqual(app.doc(), doc)
  assert.equal(app.note(), 'changed')
  await assert.rejects(assistant('legacy-plan', 'shot', async () => false).ask(), /saveFirst/)
})

test('actual editor initialization honors Make the video on legacy graphs without editor nodes', () => {
  for (const kind of ['legacy-plan', 'workspace']) {
    for (const openEditor of [false, true]) {
      for (const hasEditor of [false, true]) {
        const initialDoc = hasEditor ? { ...doc, nodes: [...doc.nodes, node('n_editor', 'editor')] } : doc
        const before = structuredClone(initialDoc)
        const value = evaluate(variable('[editing, setEditing]'), { openEditor, resource: { kind }, initial: { doc: initialDoc }, useState: (v) => v })
        assert.equal(value, openEditor && (kind === 'legacy-plan' || hasEditor))
        assert.deepEqual(initialDoc, before)
      }
    }
  }
})

function loading(kind, get = getCanvas) {
  const effect = find(source, (n) => ts.isCallExpression(n) && n.expression.getText(source) === 'useEffect')[0].arguments[0]
  const timers = new Map(), states = [], errors = []
  let serial = 0
  const cleanup = evaluate(effect, {
    resource: { kind, id: 'i' }, getCanvas: get, NoShots,
    setState: (s) => states.push(s), setError: (e) => errors.push(e),
    setTimeout: (fn) => { timers.set(++serial, fn); return serial }, clearTimeout: (id) => timers.delete(id),
  })()
  return { cleanup, states, errors, timers, next: async () => { const [id, fn] = timers.entries().next().value; timers.delete(id); fn(); await tick() } }
}

test('actual load effect recovers when queued legacy shots reach the server after initial no-shots', async (t) => {
  let saved = false, requests = 0
  const state = { version: 1, doc, takes: [], generations: [] }
  t.mock.method(globalThis, 'fetch', async () => { requests++; return saved ? { ok: true, json: async () => state } : { ok: false, status: 409, json: async () => ({ code: 'no-shots', error: 'Save the shot list first.' }) } })
  const app = loading('legacy-plan')
  await tick()
  assert.equal(app.timers.size, 1)
  saved = true; await app.next()
  assert.equal(requests, 2)
  assert.deepEqual(app.states.at(-1), state)
  assert.equal(app.errors.at(-1), '')
  app.cleanup()
})

test('actual no-shots retry is bounded, cancelled on leave, and never retries unrelated/workspace errors', async () => {
  let calls = 0
  const missing = async () => { calls++; throw new NoShots('missing') }
  const bounded = loading('legacy-plan', missing)
  await tick()
  for (let count = 0; bounded.timers.size && count < 20; count++) await bounded.next()
  assert.equal(bounded.timers.size, 0)
  assert.ok(calls > 1 && calls <= 6)
  assert.equal(bounded.errors.at(-1), 'missing')
  const cancelled = loading('legacy-plan', missing)
  await tick(); cancelled.cleanup()
  assert.equal(cancelled.timers.size, 0)
  for (const [kind, error] of [['workspace', new NoShots('missing')], ['legacy-plan', Error('approval required')]]) {
    const app = loading(kind, async () => { throw error })
    await tick()
    assert.equal(app.timers.size, 0)
    assert.equal(app.errors.at(-1), error.message)
    app.cleanup()
  }
  let resolve
  const late = loading('legacy-plan', () => new Promise((r) => { resolve = r }))
  late.cleanup(); resolve({ doc }); await tick()
  assert.deepEqual(late.states, [null])
})

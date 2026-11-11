import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const board = ts.createSourceFile('CanvasScreen.tsx', readFileSync(new URL('../src/components/canvas/CanvasScreen.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function find(node, predicate) {
  if (predicate(node)) return node
  return ts.forEachChild(node, child => find(child, predicate))
}
const handler = find(board, node => ts.isBinaryExpression(node) && node.left.getText(board) === 'guideFocus.current').right
function fixture(overrides = {}) {
  const events = []
  let focused = null
  let generateCalls = 0
  const scope = {
    guideBusy: false, editing: false, mounted: { current: true },
    doc: { nodes: [{ id: 'image' }, { id: 'video' }], edges: [{ id: 'image-video' }] },
    edit: { flush: async () => true },
    setEditing: value => events.push(['editing', value]),
    setGuideExport: value => events.push(['export', value]),
    setSelected: value => events.push(['nodes', value]),
    setSelectedEdges: value => events.push(['edges', value]),
    setDock: value => events.push(['dock', value]),
    requestAnimationFrame: callback => { callback(); return 1 },
    fitView: async options => { events.push(['fit', options]); return true },
    setGuideFocused: value => { focused = value },
    startGen: () => { generateCalls++ },
    ...overrides,
  }
  const js = ts.transpileModule(`exports.focus = ${handler.getText(board)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const output = {}
  new Function('exports', ...Object.keys(scope), js)(output, ...Object.values(scope))
  return { focus: output.focus, events, focused: () => focused, generateCalls: () => generateCalls }
}

test('native focus selects the real nodes and edge and publishes readiness only after fitView finishes', async () => {
  let release
  const app = fixture({ fitView: () => new Promise(resolve => { release = resolve }) })
  const request = { nodeIds: ['image', 'video'], edgeIds: ['image-video'], dock: 'inspect' }
  const running = app.focus(request)
  await Promise.resolve()
  assert.equal(app.focused(), null)
  release(true)
  assert.equal(await running, true)
  assert.deepEqual(app.focused(), request)
  assert.deepEqual(app.events.find(event => event[0] === 'nodes')[1], ['image', 'video'])
  assert.equal(app.generateCalls(), 0)
})

test('busy, missing targets, editor flush denial and an unmounted board cannot claim focus', async () => {
  for (const overrides of [
    { guideBusy: true },
    { doc: { nodes: [], edges: [] } },
    { editing: true, edit: { flush: async () => false } },
    { mounted: { current: false } },
    { fitView: async () => false },
  ]) {
    const app = fixture(overrides)
    assert.equal(await app.focus({ nodeIds: ['image'], dock: null }), false)
    assert.equal(app.focused(), null)
    assert.equal(app.generateCalls(), 0)
  }
  const app = fixture()
  assert.equal(await app.focus({ nodeIds: ['image'], edgeIds: ['foreign-edge'] }), false)
  assert.equal(app.events.length, 0)
})

test('nested progress requires the completed native focus and the actual Inspector or History dock', () => {
  const appSource = ts.createSourceFile('App.tsx', readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const matcher = find(appSource, node => ts.isFunctionDeclaration(node) && node.name?.text === 'matchesCanvasFocus')
  const js = ts.transpileModule(`${matcher.getText(appSource)}; exports.match = matchesCanvasFocus`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const output = {}
  new Function('exports', js)(output)
  const desired = { nodeIds: ['image', 'video'], edgeIds: ['image-video'], dock: null }
  const observed = { focusedNodeIds: ['image', 'video'], focusedEdgeIds: ['image-video'], focusedDock: null }
  assert.equal(output.match(observed, desired), true)
  for (const patch of [{ focusedNodeIds: ['image'] }, { focusedEdgeIds: [] }, { focusedDock: 'history' }]) assert.equal(output.match({ ...observed, ...patch }, desired), false)
  assert.equal(output.match({}, desired), false)
})

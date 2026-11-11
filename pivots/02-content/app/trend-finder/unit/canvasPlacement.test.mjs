import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toolbarPosition } from '../src/lib/canvas/placement.ts'
import { createNode } from '../src/lib/canvas/freeform.ts'
import { compatibleKinds } from '../src/lib/canvas/ports.ts'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

test('sequential toolbar adds have separate cards before any measurements arrive', () => {
  const preferred = { x: 100, y: 160 }
  let doc = { nodes: [], edges: [] }
  for (const kind of ['prompt', 'storyboard', 'video', 'voice', 'upload', 'editor']) {
    const before = structuredClone(doc.nodes)
    const at = toolbarPosition(doc.nodes, preferred)
    doc = createNode(doc, kind, at)
    assert.deepEqual(doc.nodes.slice(0, -1), before)
    for (const old of before) assert.ok(at.x >= old.position.x + 350 + 48)
  }
  assert.deepEqual(doc.nodes[0].position, preferred)
  assert.equal(new Set(doc.nodes.map((n) => n.position.x)).size, 6)
})

test('placement checks every blocker, including measured and user moved cards', () => {
  const nodes = [
    { position: { x: 500, y: 100 }, measured: { width: 500, height: 900 } },
    { position: { x: 0, y: 100 }, measured: { width: 350, height: 230 } },
  ]
  const before = structuredClone(nodes)
  assert.deepEqual(toolbarPosition(nodes, { x: 0, y: 100 }), { x: 1048, y: 100 })
  assert.deepEqual(nodes, before)
  assert.deepEqual(toolbarPosition(nodes, { x: 500, y: 950 }), { x: 1048, y: 950 })
})

test('a free location is kept and distant rows do not displace it', () => {
  const nodes = [{ position: { x: 0, y: 1000 } }]
  assert.deepEqual(toolbarPosition(nodes, { x: -100, y: -200 }), { x: -100, y: -200 })
  assert.deepEqual(toolbarPosition([], { x: 1.25, y: 3.5 }), { x: 1.25, y: 3.5 })
})

test('explicit drag-to-empty coordinates bypass toolbar placement unchanged', () => {
  const explicit = { x: -37.5, y: 82.25 }
  const nodes = [{ position: explicit }]
  assert.equal(toolbarPosition(nodes, { x: 100, y: 160 }, explicit), explicit)
})

// Execute the component's actual handlers so menu-origin wiring is covered, too.
const source = ts.createSourceFile('CanvasScreen.tsx', readFileSync(new URL('../src/components/canvas/CanvasScreen.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function findNodes(root, predicate) {
  const found = []
  function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit) }
  visit(root)
  return found
}
const arrow = (name) => findNodes(source, (n) => ts.isVariableDeclaration(n) && n.name.getText(source) === name)[0].initializer
const rail = findNodes(source, (n) => ts.isJsxElement(n) && n.openingElement.attributes.properties.some((a) => a.name?.getText(source) === 'className' && a.initializer?.text === 'fc-rail'))[0]
const clicks = (root) => findNodes(root, (n) => ts.isJsxAttribute(n) && n.name.text === 'onClick').map((n) => n.initializer.expression)
const menuClick = clicks(source).find((n) => ts.isArrowFunction(n) && ts.isCallExpression(n.body) && n.body.expression.getText(source) === 'add' && n.body.arguments[1]?.getText(source) === 'menu.at')
function handler(node, scope) {
  const code = ts.transpileModule(`const callback = ${node.getText(source)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(scope), `${code}; return callback`)(...Object.values(scope))
}
function componentAdds(options = {}) {
  let doc = options.doc ?? { nodes: [], edges: [] }
  let menu = null
  let note = null
  const connections = []
  const scope = {
    readOnly: false, stale: false, quote: null,
    resource: { kind: 'workspace' }, selected: [], shots: [], ...options,
    flowBox: { current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000 }) } },
    screenToFlowPosition: ({ x, y }) => ({ x: (x - 80) / 2, y: (y - 40) / 2 }),
    getNode: () => undefined, toolbarPosition, createNode, compatibleKinds,
    session: { doc: () => doc }, change: (next) => { doc = next },
    setSelected: () => {}, setSearch: () => {}, setMenu: (next) => { menu = next },
    connect: async (connection) => { connections.push(connection) },
    drag: { current: null }, setNote: (next) => { note = next }, ff: (key) => key,
  }
  scope.add = handler(arrow('add'), scope)
  return {
    doc: () => doc, connections, note: () => note,
    plus: () => handler(clicks(rail)[0], { ...scope, menu })(),
    choose: (k) => handler(menuClick, { ...scope, menu, k })(),
    icon: (k) => handler(clicks(rail).find((n) => n.getText(source) === '() => add(k)'), { ...scope, k })(),
    drop: (from, point) => {
      scope.drag.current = from
      handler(arrow('endConnect'), scope)({ ...point, target: { closest: () => null } }, { isValid: false })
    },
  }
}

test('actual plus-menu and direct icon paths both avoid occupied positions', () => {
  const app = componentAdds()
  for (const kind of ['prompt', 'storyboard']) { app.plus(); app.choose(kind) }
  app.icon('video')
  const nodes = app.doc().nodes
  assert.equal(nodes.length, 3)
  for (let i = 1; i < nodes.length; i++) assert.ok(nodes[i].position.x >= nodes[i - 1].position.x + 350 + 48)
})

test('actual drag-to-empty menu preserves transformed drop position and auto-connects', () => {
  const app = componentAdds()
  app.plus(); app.choose('prompt')
  const prompt = structuredClone(app.doc().nodes[0])
  app.drop(prompt.id, { clientX: 960, clientY: 600 })
  app.choose('storyboard')
  const image = app.doc().nodes[1]
  assert.deepEqual(image.position, { x: 440, y: 280 })
  assert.deepEqual(app.doc().nodes[0], prompt)
  assert.deepEqual(app.connections, [{ source: prompt.id, sourceHandle: 'out', target: image.id, targetHandle: 'in:text' }])
})

const legacyDoc = () => ({ nodes: [
  { id: 'shot-2', type: 'shot', shotId: 's2', position: { x: 0, y: 0 }, data: {} },
  { id: 'image-2', type: 'storyboard', shotId: 's2', position: { x: 400, y: 0 }, data: {} },
], edges: [] })

test('legacy toolbar video inherits the single selected shot without adding an edge', () => {
  for (const selected of [['shot-2'], ['image-2']]) {
    for (const menu of [false, true]) {
      const app = componentAdds({ resource: { kind: 'legacy-plan' }, doc: legacyDoc(),
        shots: [{ id: 's2' }], selected })
      if (menu) { app.plus(); app.choose('video') } else app.icon('video')
      assert.equal(app.doc().nodes.length, 3)
      assert.equal(app.doc().nodes.at(-1).shotId, 's2')
      assert.deepEqual(app.doc().edges, [])
      assert.deepEqual(app.connections, [])
    }
  }
})

test('legacy video rejects missing, ambiguous, stale or removed shot selection', () => {
  for (const options of [
    { selected: [] }, { selected: ['shot-2', 'image-2'] }, { selected: ['missing'] },
    { selected: ['image-2'], shots: [] },
    { selected: ['image-2'], doc: { nodes: [legacyDoc().nodes[1]], edges: [] } },
    { selected: ['image-2'], doc: { nodes: legacyDoc().nodes.map((n) =>
      n.type === 'shot' ? { ...n, data: { removed: true } } : n), edges: [] } },
  ]) {
    const app = componentAdds({ resource: { kind: 'legacy-plan' }, doc: legacyDoc(),
      shots: [{ id: 's2' }], ...options })
    const before = structuredClone(app.doc())
    app.icon('video')
    assert.deepEqual(app.doc(), before)
    assert.equal(app.note(), 'assistantChooseShot')
    assert.deepEqual(app.connections, [])
  }
})

test('legacy explicit source keeps shot inheritance and exactly one intended connection', () => {
  const app = componentAdds({ resource: { kind: 'legacy-plan' }, doc: legacyDoc(),
    shots: [{ id: 's2' }], selected: [] })
  app.drop('image-2', { clientX: 960, clientY: 600 })
  app.choose('video')
  assert.equal(app.doc().nodes.at(-1).shotId, 's2')
  assert.equal(app.connections.length, 1)
  assert.equal(app.connections[0].source, 'image-2')
})

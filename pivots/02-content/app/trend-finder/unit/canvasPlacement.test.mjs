import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toolbarPosition } from '../src/lib/canvas/placement.ts'
import { createNode } from '../src/lib/canvas/freeform.ts'

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

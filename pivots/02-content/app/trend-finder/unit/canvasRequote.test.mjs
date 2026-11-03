import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quoteChanged, quoteLines } from '../src/lib/canvas/requote.ts'

const doc = { nodes: [{ id: 'v', type: 'video', data: { duration: 5 } }, { id: 's', type: 'storyboard', data: {} }], edges: [] }
const items = [
  { nodeId: 's', model: 'img', usd: 0.04 },
  { nodeId: 'v', model: 'vid', usd: 0.4 },
]

test('quoteLines reads each node length from the doc', () => {
  assert.deepEqual(quoteLines(doc, items), [
    { nodeId: 's', model: 'img', seconds: null, usd: 0.04 },
    { nodeId: 'v', model: 'vid', seconds: 5, usd: 0.4 },
  ])
})

test('quoteChanged is false for the same quote, even in another order', () => {
  const shown = quoteLines(doc, items)
  assert.equal(quoteChanged(shown, quoteLines(structuredClone(doc), items)), false)
  assert.equal(quoteChanged(shown, [...quoteLines(doc, items)].reverse()), false)
})

test('quoteChanged is true when the length, model, price or node set differs', () => {
  const shown = quoteLines(doc, items)
  const longer = structuredClone(doc)
  longer.nodes[0].data.duration = 10
  assert.equal(quoteChanged(shown, quoteLines(longer, items)), true)
  assert.equal(quoteChanged(shown, quoteLines(doc, [items[0], { ...items[1], model: 'vid2' }])), true)
  assert.equal(quoteChanged(shown, quoteLines(doc, [items[0], { ...items[1], usd: 0.8 }])), true)
  assert.equal(quoteChanged(shown, quoteLines(doc, [items[0]])), true)
  assert.equal(quoteChanged(shown, quoteLines(doc, [items[0], { nodeId: 'x', model: 'vid', usd: 0.4 }])), true)
})

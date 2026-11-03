import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFullscreen, writeFullscreen, shellKey, aboutTime, etaOf, runningQueue, queueLeft } from '../src/lib/canvas/shell.ts'

const doc = {
  nodes: [
    { id: 'n_sb_s2', type: 'storyboard', shotId: 's2', position: { x: 0, y: 0 }, data: {} },
    { id: 'n_vid_s1', type: 'video', shotId: 's1', position: { x: 0, y: 0 }, data: {} },
  ],
  edges: [],
}
const shots = [{ id: 's1' }, { id: 's2' }]

test('readFullscreen / writeFullscreen survive a throwing store', () => {
  const m = new Map(); const store = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }
  assert.equal(readFullscreen(store), false); writeFullscreen(true, store); assert.equal(readFullscreen(store), true)
  const bad = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
  assert.equal(readFullscreen(bad), false); assert.doesNotThrow(() => writeFullscreen(true, bad))
  assert.equal(readFullscreen(null), false); assert.doesNotThrow(() => writeFullscreen(true, null))
})
test('shellKey ignores typing and yields Esc to dialogs', () => {
  assert.equal(shellKey({ key: 'f', typing: false, dialogOpen: false, editorOpen: false }, false), 'enter')
  assert.equal(shellKey({ key: 'F', typing: false, dialogOpen: false, editorOpen: false }, false), 'enter')
  assert.equal(shellKey({ key: 'f', typing: true, dialogOpen: false, editorOpen: false }, false), null)
  assert.equal(shellKey({ key: 'f', typing: false, dialogOpen: false, editorOpen: false }, true), null)
  assert.equal(shellKey({ key: 'Escape', typing: false, dialogOpen: false, editorOpen: false }, true), 'leave')
  assert.equal(shellKey({ key: 'Escape', typing: false, dialogOpen: true, editorOpen: false }, true), null)
  assert.equal(shellKey({ key: 'Escape', typing: false, dialogOpen: false, editorOpen: true }, true), null)
})
test('aboutTime rounds up', () => {
  assert.deepEqual(aboutTime(12), { key: 'canvas.time.sec', n: 15 })
  assert.deepEqual(aboutTime(61), { key: 'canvas.time.min', n: 2 })
  assert.deepEqual(aboutTime(55), { key: 'canvas.time.sec', n: 55 })
  assert.deepEqual(aboutTime(56), { key: 'canvas.time.min', n: 1 })
  assert.deepEqual(aboutTime(59), { key: 'canvas.time.min', n: 1 })
  assert.deepEqual(aboutTime(60), { key: 'canvas.time.min', n: 1 })
})
test('etaOf: left from typicalSeconds, null without it or while waiting', () => {
  const g = { status: 'running', createdAt: 10_000 }
  assert.deepEqual(etaOf(g, { typicalSeconds: 90 }, 40_000), { elapsed: 30, left: 60 })
  assert.deepEqual(etaOf(g, { typicalSeconds: 10 }, 40_000), { elapsed: 30, left: 0 })
  assert.equal(etaOf(g, {}, 40_000).left, null)
  assert.equal(etaOf({ ...g, status: 'waiting' }, { typicalSeconds: 90 }, 40_000).left, null)
})
test('runningQueue lists open jobs with their shot number, queueLeft is the longest', () => {
  const gens = [{ id: 'g1', nodeId: 'n_sb_s2', kind: 'image', model: 'mock-image', status: 'running', createdAt: 10_000 },
                { id: 'g2', nodeId: 'n_vid_s1', kind: 'video', model: 'mock-video', status: 'done', createdAt: 5_000 }]
  const items = runningQueue(doc, gens, [{ id: 'mock-image', kind: 'image', typicalSeconds: 90 }], shots, 40_000)
  assert.deepEqual(items, [{ nodeId: 'n_sb_s2', genId: 'g1', kind: 'image', shotNumber: 2, elapsed: 30, left: 60 }])
  assert.equal(queueLeft(items), 60)
  assert.equal(queueLeft([{ ...items[0], left: null }]), null)
  assert.deepEqual(runningQueue(doc, [gens[1]], [], shots, 40_000), [])
})

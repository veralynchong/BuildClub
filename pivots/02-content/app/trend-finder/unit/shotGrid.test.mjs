import { test } from 'node:test'
import assert from 'node:assert/strict'
import { framePrompt, frameNodeOf, gridCells, setPrompt, chooseVersion, stepVersion, patchShot, cameraTag } from '../src/lib/shotGrid.ts'
import { framingLabel, angleLabel, movementLabel } from '../src/lib/shots.ts'

const full = { id: 's1', time: '0:00', shot: 'Hands fold dough', framing: 'close_up', angle: 'eye_level', movement: 'push_in', lens: '35mm' }
const bare = { id: 's2', time: '0:03', shot: 'A loaf' }
const node = (id, type, shotId, data = {}) => ({ id, type, shotId, position: { x: 0, y: 0 }, data })
const gen = (id, nodeId, status, createdAt, prompt) => ({ id, nodeId, status, createdAt, inputs: prompt === undefined ? {} : { prompt } })

test('framePrompt builds the frame text', () => {
  assert.equal(
    framePrompt(full),
    'Vertical 9:16 video frame, photographic, natural light. Hands fold dough. Camera: close up, eye level, push in, 35mm lens. No text, no captions.',
  )
  assert.equal(framePrompt(bare), 'Vertical 9:16 video frame, photographic, natural light. A loaf. No text, no captions.')
})

test('frameNodeOf prefers the primary node', () => {
  const doc = { nodes: [node('a', 'storyboard', 's1'), node('b', 'storyboard', 's1', { primary: true })], edges: [] }
  assert.equal(frameNodeOf(doc, 's1').id, 'b')
  assert.equal(frameNodeOf(doc, 'nope'), null)
  assert.equal(frameNodeOf({ nodes: [node('a', 'storyboard', 's1')], edges: [] }, 's1').id, 'a')
})

test('gridCells', () => {
  const doc = {
    nodes: [
      node('sh1', 'shot', 's1'), node('f1', 'storyboard', 's1', { prompt: 'mine' }),
      node('sh2', 'shot', 's2'),
      node('sh3', 'shot', 's3', { removed: true }),
    ],
    edges: [],
  }
  const shots = [full, bare, { id: 's3', time: '0:06', shot: 'gone' }]
  let cells = gridCells(doc, shots, [])
  assert.equal(cells.length, 2)
  assert.equal(cells[0].prompt, 'mine')
  assert.equal(cells[0].auto, false)
  assert.equal(cells[0].nodeId, 'f1')
  assert.equal(cells[1].nodeId, null)
  assert.deepEqual(cells[1].versions, [])
  assert.equal(cells[1].auto, true)
  assert.equal(cells[1].prompt, framePrompt(bare))
  assert.equal(cells[0].shown, null)

  const gens = [gen('g1', 'f1', 'done', 1, 'old'), gen('g2', 'f1', 'failed', 2), gen('g3', 'f1', 'running', 3)]
  cells = gridCells(doc, shots, gens)
  assert.equal(cells[0].changed, true)
  assert.equal(cells[0].shown.id, 'g1')
  assert.equal(cells[0].failed, null) // the newest version is the running one
  assert.equal(cells[0].pending.id, 'g3')
  cells = gridCells(doc, shots, gens.slice(0, 2))
  assert.equal(cells[0].failed.id, 'g2')
  assert.equal(cells[0].shown.id, 'g1')
  cells = gridCells(doc, shots, [gen('g1', 'f1', 'done', 1, 'mine')])
  assert.equal(cells[0].changed, false)
})

test('setPrompt and chooseVersion return new docs', () => {
  const doc = { nodes: [node('f1', 'storyboard', 's1', { prompt: 'x' })], edges: [] }
  const cleared = setPrompt(doc, 'f1', '  ')
  assert.equal('prompt' in cleared.nodes[0].data, false)
  assert.notEqual(cleared.nodes[0], doc.nodes[0])
  assert.equal(doc.nodes[0].data.prompt, 'x')
  assert.equal(setPrompt(doc, 'f1', null).nodes[0].data.prompt, undefined)
  assert.equal(setPrompt(doc, 'f1', 'new').nodes[0].data.prompt, 'new')
  const chosen = chooseVersion(doc, 'f1', 'g9')
  assert.equal(chosen.nodes[0].data.selected, 'g9')
  assert.notEqual(chosen.nodes[0], doc.nodes[0])
  assert.equal(doc.nodes[0].data.selected, undefined)
})

test('stepVersion skips failed versions', () => {
  const cell = { versions: [gen('a', 'n', 'done', 1), gen('b', 'n', 'failed', 2), gen('c', 'n', 'done', 3)], shown: gen('c', 'n', 'done', 3) }
  assert.equal(stepVersion(cell, -1), 'a')
  assert.equal(stepVersion(cell, 1), null)
  assert.equal(stepVersion({ ...cell, shown: cell.versions[0] }, 1), 'c')
  assert.equal(stepVersion({ ...cell, shown: cell.versions[0] }, -1), null)
})

test('patchShot and cameraTag', () => {
  const shots = [full, bare]
  const out = patchShot(shots, 1, { lens: '50mm', gear: 'gimbal' })
  assert.equal(out[0], full)
  assert.equal(out[1].lens, '50mm')
  assert.equal(out[1].gear, 'gimbal')
  assert.equal(out[1].shot, 'A loaf')
  assert.equal(cameraTag(full), [framingLabel('close_up'), angleLabel('eye_level'), movementLabel('push_in'), '35mm'].join(' · '))
  assert.equal(cameraTag(bare), '')
})

test('a frame made outside the grid is not flagged changed; a grid-made one is', () => {
  const doc = { nodes: [node('sh2', 'shot', 's2'), node('f2', 'storyboard', 's2')], edges: [] }
  const canvasMade = gridCells(doc, [bare], [gen('g1', 'f2', 'done', 1, 'A loaf')])
  assert.equal(canvasMade[0].auto, true)
  assert.equal(canvasMade[0].changed, false)
  const gridMade = gridCells(doc, [bare], [gen('g1', 'f2', 'done', 1, framePrompt(bare))])
  assert.equal(gridMade[0].changed, false)
  const edited = gridCells(doc, [{ ...bare, lens: '85mm' }], [gen('g1', 'f2', 'done', 1, framePrompt(bare))])
  assert.equal(edited[0].changed, true)
})

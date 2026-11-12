import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gridCells, shotListRows } from '../src/lib/shotGrid.ts'
import { framingLabel, angleLabel, movementLabel, gearLabel } from '../src/lib/shots.ts'

const full = { id: 's1', time: '0:00', shot: 'Hands fold dough', line: 'Watch this', framing: 'close_up', angle: 'eye_level', movement: 'push_in', lens: '35mm', gear: 'gimbal' }
const bare = { id: 's2', time: '0:03', shot: 'A loaf' }
const third = { id: 's3', time: '0:06', shot: 'Slice' }
const node = (id, type, shotId, data = {}) => ({ id, type, shotId, position: { x: 0, y: 0 }, data })

test('shotListRows fills every column of a full shot', () => {
  const [row] = shotListRows(gridCells({ nodes: [], edges: [] }, [full], []))
  assert.deepEqual(row, {
    n: 1, thumb: null, action: 'Hands fold dough', line: 'Watch this',
    size: framingLabel('close_up'), angle: angleLabel('eye_level'), movement: movementLabel('push_in'),
    lens: '35mm', gear: gearLabel('gimbal'), time: '0:00',
  })
})

test('shotListRows shows a dash for blank camera fields and line', () => {
  const [row] = shotListRows(gridCells({ nodes: [], edges: [] }, [bare], []))
  for (const k of ['size', 'angle', 'movement', 'lens', 'gear']) assert.equal(row[k], '—', k)
  assert.equal(row.line, '—')
  assert.equal(row.action, 'A loaf')
})

test('shotListRows numbers only visible shots and uses the shown frame as thumb', () => {
  const doc = {
    nodes: [node('sh2', 'shot', 's2', { removed: true }), node('f1', 'storyboard', 's1')],
    edges: [],
  }
  const gens = [{ id: 'g1', nodeId: 'f1', status: 'done', createdAt: 1, url: '/a.png', inputs: {} }]
  const rows = shotListRows(gridCells(doc, [full, bare, third], gens))
  assert.deepEqual(rows.map((r) => r.n), [1, 2])
  assert.deepEqual(rows.map((r) => r.action), ['Hands fold dough', 'Slice'])
  assert.equal(rows[0].thumb, '/a.png')
  assert.equal(rows[1].thumb, null)
})

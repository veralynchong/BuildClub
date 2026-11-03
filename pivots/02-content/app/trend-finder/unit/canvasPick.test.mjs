import { test } from 'node:test'
import assert from 'node:assert/strict'
import { approvedPlans } from '../src/lib/canvasPick.ts'

const mk = (id, status, dueDate, clientId = 'c') => ({ id, videoId: 'v', clientId, status, dueDate, notes: '' })

test('approvedPlans: this client approved plans only, soonest due first', () => {
  const ideas = [mk('a', 'approved', '2026-11-20'), mk('b', 'waiting', '2026-11-01'), mk('c', 'approved', '2026-11-05'), mk('d', 'approved', '2026-11-02', 'other')]
  assert.deepEqual(approvedPlans(ideas, 'c').map((i) => i.id), ['c', 'a'])
  assert.deepEqual(approvedPlans([], 'c'), [])
})

test('videoOf / formatOf: a plan whose video is gone falls back to its own data', async () => {
  const { videoOf, formatOf } = await import('../src/lib/missingVideo.ts')
  const shots = [{ n: 1 }]
  const idea = { ...mk('a', 'approved', '2026-11-20'), videoId: 'gone', shots }
  const v = videoOf(idea, new Map())
  assert.equal(v.id, 'gone')
  assert.equal(formatOf(idea, v, new Map()).shotList, shots)
  const real = { id: 'gone', formatId: 'f' }
  assert.equal(videoOf(idea, new Map([['gone', real]])), real)
})

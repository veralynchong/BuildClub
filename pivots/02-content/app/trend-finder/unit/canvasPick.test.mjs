import { test } from 'node:test'
import assert from 'node:assert/strict'
import { approvedPlans, planProgress } from '../src/lib/canvasPick.ts'

const mk = (id, status, dueDate, clientId = 'c') => ({ id, videoId: 'v', clientId, status, dueDate, notes: '' })

test('approvedPlans: this client approved plans only, soonest due first', () => {
  const ideas = [mk('a', 'approved', '2026-11-20'), mk('b', 'waiting', '2026-11-01'), mk('c', 'approved', '2026-11-05'), mk('d', 'approved', '2026-11-02', 'other')]
  assert.deepEqual(approvedPlans(ideas, 'c').map((i) => i.id), ['c', 'a'])
  assert.deepEqual(approvedPlans([], 'c'), [])
})

test('boardPlans: every plan of this client, soonest due first', async () => {
  const { boardPlans } = await import('../src/lib/canvasPick.ts')
  const ideas = [mk('a', 'approved', '2026-11-20'), mk('b', 'waiting', '2026-11-01'), mk('c', 'saved', '2026-11-05'), mk('d', 'saved', '2026-11-02', 'other')]
  assert.deepEqual(boardPlans(ideas, 'c').map((i) => i.id), ['b', 'c', 'a'])
  assert.deepEqual(boardPlans([], 'c'), [])
})

test('planProgress counts the shots and those with a storyboard frame', () => {
  const idea = { shots: [{ id: 'a', time: '0-3s', shot: 'x', frameImage: '/f' }, { id: 'b', time: '3-6s', shot: 'y' }] }
  assert.deepEqual(planProgress(idea, []), { shots: 2, ready: 1 })
  assert.deepEqual(planProgress({}, [{ time: '1s', shot: 'z' }]), { shots: 1, ready: 0 })
})

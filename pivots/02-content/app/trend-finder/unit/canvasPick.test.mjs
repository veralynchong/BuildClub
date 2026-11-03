import { test } from 'node:test'
import assert from 'node:assert/strict'
import { approvedPlans } from '../src/lib/canvasPick.ts'

const mk = (id, status, dueDate, clientId = 'c') => ({ id, videoId: 'v', clientId, status, dueDate, notes: '' })

test('approvedPlans: this client approved plans only, soonest due first', () => {
  const ideas = [mk('a', 'approved', '2026-11-20'), mk('b', 'waiting', '2026-11-01'), mk('c', 'approved', '2026-11-05'), mk('d', 'approved', '2026-11-02', 'other')]
  assert.deepEqual(approvedPlans(ideas, 'c').map((i) => i.id), ['c', 'a'])
  assert.deepEqual(approvedPlans([], 'c'), [])
})

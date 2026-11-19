import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeResearch, withoutSampleResearch } from '../src/lib/researchSync.ts'

const row = (id, extra = {}) => ({ id, clientId: 'c', videoId: 'v', source: 'search', ...extra })
const slot = (id, extra = {}) => ({ id, clientId: 'c', number: 1, topic: 't', createdAt: 1, ...extra })
const sheet = (entries, slots = []) => ({ entries, slots })

test("a teammate's row added elsewhere is kept, and this tab's edit wins for the same id", () => {
  const base = sheet([row('a')])
  const mine = sheet([row('a', { notes: 'mine' }), row('b')])
  const theirs = sheet([row('a', { notes: 'theirs' }), row('c')])
  assert.deepEqual(mergeResearch(base, mine, theirs).entries.map((e) => [e.id, e.notes]), [
    ['a', 'mine'], ['c', undefined], ['b', undefined],
  ])
})

test('a row this tab removed stays removed even though the other copy still has it', () => {
  const base = sheet([row('a'), row('b')], [slot('s1')])
  const mine = sheet([row('a')], [])
  const theirs = sheet([row('a'), row('b')], [slot('s1'), slot('s2')])
  const merged = mergeResearch(base, mine, theirs)
  assert.deepEqual(merged.entries.map((e) => e.id), ['a'])
  assert.deepEqual(merged.slots.map((s) => s.id), ['s2'])
})

test('the first upload leaves the built-in sample rows and slots out', () => {
  const local = sheet([row('x', { source: 'sample' }), row('y')], [slot('sample-1'), slot('mine-1')])
  const out = withoutSampleResearch(local, [{ id: 'sample-1' }])
  assert.deepEqual(out.entries.map((e) => e.id), ['y'])
  assert.deepEqual(out.slots.map((s) => s.id), ['mine-1'])
})

test("a browser's own rows join a sheet a teammate already put on the server, once", async () => {
  const { initialResearch } = await import('../src/lib/researchSync.ts')
  const remote = sheet([row('a', { notes: 'server' })], [slot('s1')])
  const local = sheet([row('a', { notes: 'stale' }), row('b')], [slot('s1'), slot('s2')])
  const first = initialResearch(remote, local, false)
  assert.equal(first.upload, true)
  assert.deepEqual(first.sheet.entries.map((e) => [e.id, e.notes]), [['a', 'server'], ['b', undefined]])
  assert.deepEqual(first.sheet.slots.map((s) => s.id), ['s1', 's2'])
  assert.deepEqual(initialResearch(remote, local, true), { sheet: remote, upload: false })
  assert.deepEqual(initialResearch(null, local, true), { sheet: local, upload: true })
  assert.equal(initialResearch(remote, sheet([row('a')]), false).upload, false)
})

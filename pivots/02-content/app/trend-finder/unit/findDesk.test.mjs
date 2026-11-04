import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  recordSearch, cleanRuns, recentSearches, runFor, savedByVideo, savedPreview, typeAhead, matchesTyped, normalizeSearch,
  MAX_RUNS_PER_CLIENT, SAME_LOOK_MS, STALE_MS,
} from '../src/lib/findDesk.ts'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 9, 30, 9) // Thu 30 Oct 2026
const rec = (runs, text, ids, at, o = {}) => recordSearch(runs, { clientId: 'c1', text, platforms: ['tiktok'], resultIds: ids, ...o }, at)

test('a first search has nothing to compare with', () => {
  const runs = rec([], '  Quick tofu  dinners ', ['a', 'b'], T0)
  assert.equal(runs.length, 1)
  assert.equal(runs[0].text, 'Quick tofu  dinners')
  assert.equal(runs[0].prevAt, undefined)
  assert.deepEqual(runs[0].newIds, [])
  assert.deepEqual(recentSearches(runs, 'c1', new Set(), T0)[0].fresh, null)
})

test('running the same words again days later counts the videos that are new since then', () => {
  let runs = rec([], 'quick tofu dinners', ['a', 'b'], T0)
  runs = rec(runs, 'Quick Tofu Dinners', ['a', 'b', 'c', 'd'], T0 + 4 * DAY)
  assert.equal(runs.length, 1, 'same words (any case or spacing) update one row')
  assert.equal(runs[0].prevAt, T0)
  assert.deepEqual(runs[0].newIds, ['c', 'd'])
  assert.equal(recentSearches(runs, 'c1', new Set(), T0 + 4 * DAY)[0].fresh, 2)
})

test('a second look soon after keeps comparing with the older run', () => {
  let runs = rec([], 'tofu', ['a'], T0)
  runs = rec(runs, 'tofu', ['a', 'b'], T0 + 3 * DAY)
  runs = rec(runs, 'tofu', ['a', 'b'], T0 + 3 * DAY + SAME_LOOK_MS / 2)
  assert.equal(runs[0].prevAt, T0)
  assert.deepEqual(runs[0].newIds, ['b'])
  // Two quick looks at a brand-new search: still nothing to compare with.
  let once = rec([], 'new one', ['a'], T0)
  once = rec(once, 'new one', ['a', 'z'], T0 + 60_000)
  assert.equal(once[0].prevAt, undefined)
  assert.deepEqual(once[0].newIds, [])
})

test('nothing new says 0, not null', () => {
  let runs = rec([], 'tofu', ['a', 'b'], T0)
  runs = rec(runs, 'tofu', ['b', 'a'], T0 + 2 * DAY)
  assert.equal(recentSearches(runs, 'c1', new Set(), T0 + 2 * DAY)[0].fresh, 0)
})

test('empty words or no client are not recorded; ids are de-duplicated', () => {
  assert.deepEqual(rec([], '   ', ['a'], T0), [])
  assert.deepEqual(recordSearch([], { clientId: '', text: 'x', platforms: [], resultIds: [] }, T0), [])
  assert.deepEqual(rec([], 'x', ['a', 'a', 'b'], T0)[0].resultIds, ['a', 'b'])
})

test('keeps who ran it, and the newest searches per client only', () => {
  let runs = rec([], 'one', [], T0, { by: 'Sam' })
  runs = rec(runs, 'one', [], T0 + DAY)
  assert.equal(runs[0].by, 'Sam', 'a later run without a name keeps the first name')
  runs = recordSearch(runs, { clientId: 'c2', text: 'other client', platforms: [], resultIds: [] }, T0)
  for (let i = 0; i < MAX_RUNS_PER_CLIENT + 5; i++) runs = rec(runs, `search ${i}`, [], T0 + i)
  assert.equal(runs.filter((r) => r.clientId === 'c1').length, MAX_RUNS_PER_CLIENT)
  assert.equal(runs.filter((r) => r.clientId === 'c2').length, 1, 'other clients are untouched')
})

test('recent list: new videos first, then newest; saved counts; stale after a week; only this client', () => {
  let runs = rec([], 'old question?', ['q1'], T0 - 10 * DAY)
  runs = rec(runs, 'desserts', ['d1', 'd2'], T0 - 3 * DAY)
  runs = rec(runs, 'dinners', ['a'], T0 - 2 * DAY)
  runs = rec(runs, 'dinners', ['a', 'b'], T0 - DAY)
  runs = rec(runs, 'hacks', ['h1'], T0)
  runs = recordSearch(runs, { clientId: 'c2', text: 'not mine', platforms: [], resultIds: [] }, T0)
  const rows = recentSearches(runs, 'c1', new Set(['d1', 'd2', 'b']), T0)
  assert.deepEqual(rows.map((r) => r.run.text), ['dinners', 'hacks', 'desserts', 'old question?'])
  assert.deepEqual(rows.map((r) => r.saved), [1, 0, 2, 0])
  assert.deepEqual(rows.map((r) => r.stale), [false, false, false, true])
  assert.equal(recentSearches(runs, 'c1', new Set(), T0, 2).length, 2)
  assert.ok(STALE_MS === 7 * DAY)
})

test('runFor finds the recorded run for the search on screen', () => {
  const runs = rec([], 'Tofu Hacks', ['a'], T0)
  assert.equal(runFor(runs, 'c1', 'tofu hacks')?.text, 'Tofu Hacks')
  assert.equal(runFor(runs, 'c2', 'tofu hacks'), undefined)
  assert.equal(runFor(runs, 'c1', null), undefined)
})

test('cleanRuns drops junk', () => {
  assert.deepEqual(cleanRuns(null), [])
  assert.deepEqual(cleanRuns([{ clientId: 'c1' }, 3, null]), [])
  const good = rec([], 'x', ['a'], T0)
  assert.deepEqual(cleanRuns(good), good)
})

const slot = (n, o = {}) => ({ id: `s${n}`, clientId: 'c1', number: n, topic: `Topic ${n}`, createdAt: 0, ...o })
const entry = (id, o = {}) => ({
  id: `c1-${id}`, clientId: 'c1', videoId: id, account: `@${id}`, platform: 'tiktok', followers: 1000, views: 10_000,
  keywords: [], hook: id, notes: '', loggedAt: 0, source: 'search', ...o,
})

test('saved by video: one row per video in number order, top = most views per follower, picked, then Unsorted', () => {
  const slots = [slot(2), slot(1), slot(3)]
  const entries = [
    entry('a', { slotId: 's1', followers: 4400, views: 1_200_000 }),
    entry('b', { slotId: 's1', followers: 100_000, views: 2_000_000 }),
    entry('c', { slotId: 's2' }),
    entry('d'),
    entry('e', { slotId: 'gone' }),
  ]
  const ideas = [{ id: 'c1-b', clientId: 'c1', videoId: 'b', status: 'saved', dueDate: '2026-11-07', notes: '' }]
  const rows = savedByVideo(slots, entries, ideas)
  assert.deepEqual(rows.map((r) => r.slot?.number ?? 'unsorted'), [1, 2, 3, 'unsorted'])
  assert.equal(rows[0].top.videoId, 'a')
  assert.equal(rows[0].picked, true)
  assert.equal(rows[1].picked, false)
  assert.equal(rows[2].refs.length, 0)
  assert.equal(rows[2].top, undefined)
  assert.deepEqual(rows[3].refs.map((e) => e.videoId), ['d', 'e'], 'no slot or a removed slot counts as Unsorted')
})

test('saved by video: no Unsorted row when everything is filed; no followers falls back to views', () => {
  const rows = savedByVideo([slot(1)], [entry('a', { slotId: 's1', followers: 0, views: 5 }), entry('b', { slotId: 's1', followers: 0, views: 50 })], [])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].top.videoId, 'b')
})

test('saved preview: first videos not posted yet, plus Unsorted', () => {
  const rows = [1, 2, 3, 4, 5, 6].map((n) => ({ slot: slot(n), refs: [], picked: false, status: n === 2 ? 'posted' : 'none' }))
  rows.push({ slot: null, refs: [entry('x')], picked: false, status: 'none' })
  assert.deepEqual(savedPreview(rows, 4).map((r) => r.slot?.number ?? 'u'), [1, 3, 4, 5, 'u'])
})

test('matchesTyped: every word, the last one may be half typed', () => {
  assert.ok(matchesTyped('tofu d', 'Quick tofu dinners'))
  assert.ok(matchesTyped('TOFU', 'silken tofu desserts'))
  assert.ok(!matchesTyped('tofu x', 'tofu dinners'))
  assert.ok(!matchesTyped('', 'tofu'))
  assert.equal(normalizeSearch('  A  b '), 'a b')
})

test('typeAhead: groups in order, capped, no repeats, nothing equal to what is typed', () => {
  const items = typeAhead('tofu d', {
    recent: ['Tofu dinners', 'tofu desserts', 'tofu dumplings', 'tofu drinks', 'crispy tofu'],
    searches: [{ label: 'tofu dinner ideas', value: 'tofu dinner ideas' }, { label: 'tofu dinners', value: 'tofu dinners' }, { label: 'tofu taste tests', value: 'tofu taste tests' }],
    brief: [{ label: 'Tofu dinner after work', value: 'tofu dinner after work', hint: 'Their audience cooks after work' }, { label: 'Kitchen hacks', value: 'kitchen hacks' }],
    questions: ['What tofu dinner videos get the most saves?'],
  })
  assert.deepEqual(items.map((i) => `${i.group}:${i.value}`), [
    'recent:Tofu dinners', 'recent:tofu desserts', 'recent:tofu dumplings',
    'search:tofu dinner ideas',
    'brief:tofu dinner after work',
    'ask:What tofu dinner videos get the most saves?',
  ])
  assert.equal(items[4].hint, 'Their audience cooks after work')
  assert.deepEqual(typeAhead('t', { recent: ['tofu'], searches: [], brief: [], questions: [] }), [], 'two letters first')
  assert.deepEqual(typeAhead('https://tiktok.com/x', { recent: ['https://tiktok.com/x/y'], searches: [], brief: [], questions: [] }), [])
  assert.deepEqual(typeAhead('tofu', { recent: ['Tofu'], searches: [], brief: [], questions: [] }), [], 'not the same as typed')
})

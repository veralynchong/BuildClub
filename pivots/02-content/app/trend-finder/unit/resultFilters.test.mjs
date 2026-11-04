import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_FILTERS, applyFilters, followersPending, activeFilters, clearFilter, relaxHint, lengthBandOf, isDefaultFilter,
} from '../src/lib/resultFilters.ts'

const vid = (o = {}) => ({ id: 'v', platform: 'tiktok', views: 2_000_000, followers: 100_000, daysAgo: 5, lengthSec: 30, ...o })
const any = { ...DEFAULT_FILTERS, viewsMin: 0, followersMax: 0 }
const ids = (vs) => vs.map((v) => v.id)

test('default is 1M+ views from accounts under 50K followers, and nothing else', () => {
  assert.equal(DEFAULT_FILTERS.viewsMin, 1_000_000)
  assert.equal(DEFAULT_FILTERS.followersMax, 50_000)
  assert.deepEqual(activeFilters(DEFAULT_FILTERS), ['views', 'followers'])
  const out = applyFilters([vid({ id: 'a', followers: 4_000 }), vid({ id: 'b', views: 999_999, followers: 4_000 }), vid({ id: 'c' })], DEFAULT_FILTERS)
  assert.deepEqual(ids(out), ['a'])
})

test('chips at their default value say so; changed or other filters do not', () => {
  assert.equal(isDefaultFilter('followers', DEFAULT_FILTERS), true)
  assert.equal(isDefaultFilter('views', DEFAULT_FILTERS), true)
  assert.equal(isDefaultFilter('followers', { ...DEFAULT_FILTERS, followersMax: 5_000 }), false)
  assert.equal(isDefaultFilter('smallBig', { ...DEFAULT_FILTERS, smallBig: true }), false)
})

test('views floor leaves Reddit alone (its views are upvotes)', () => {
  assert.equal(applyFilters([vid({ platform: 'reddit', views: 40, followers: 0 })], DEFAULT_FILTERS).length, 1)
})

test('account followers: under 5K / 50K / 1M', () => {
  const vs = [vid({ id: 'a', followers: 3000 }), vid({ id: 'b', followers: 30_000 }), vid({ id: 'c', followers: 900_000 }), vid({ id: 'd', followers: 5000 })]
  assert.deepEqual(ids(applyFilters(vs, { ...any, followersMax: 5_000 })), ['a'])
  assert.deepEqual(ids(applyFilters(vs, { ...any, followersMax: 50_000 })), ['a', 'b', 'd'])
  assert.deepEqual(ids(applyFilters(vs, { ...any, followersMax: 1_000_000 })), ['a', 'b', 'c', 'd'])
})

test('unknown followers are kept and marked pending when a followers filter is on', () => {
  const ig = vid({ id: 'ig', platform: 'instagram', followers: 0 })
  const rd = vid({ id: 'rd', platform: 'reddit', followers: 0 })
  for (const f of [{ ...any, followersMax: 5_000 }, { ...any, smallBig: true }, { ...any, brokeOut: true }]) {
    assert.deepEqual(ids(applyFilters([ig, rd], f)), ['ig', 'rd'])
    assert.ok(followersPending(ig, f) && followersPending(rd, f))
  }
  assert.equal(followersPending(ig, any), false)
  assert.equal(followersPending(vid(), { ...any, followersMax: 5_000 }), false)
})

test('small account, big views', () => {
  const vs = [vid({ id: 'a', followers: 3109, views: 2_900_000 }), vid({ id: 'b', followers: 3000, views: 900_000 }), vid({ id: 'c', followers: 80_000, views: 5_000_000 })]
  assert.deepEqual(ids(applyFilters(vs, { ...any, smallBig: true })), ['a'])
})

test('broke out: views at least 10x followers', () => {
  const vs = [vid({ id: 'a', followers: 100_000, views: 1_000_000 }), vid({ id: 'b', followers: 100_000, views: 999_999 })]
  assert.deepEqual(ids(applyFilters(vs, { ...any, brokeOut: true })), ['a'])
})

test('both viral types ticked: either one qualifies', () => {
  const small = vid({ id: 's', followers: 100, views: 1_000_000 })
  const broke = vid({ id: 'b', followers: 200_000, views: 2_000_000 })
  const neither = vid({ id: 'n', followers: 900_000, views: 1_000_000 })
  assert.deepEqual(ids(applyFilters([small, broke, neither], { ...any, smallBig: true, brokeOut: true })), ['s', 'b'])
})

test('upload date uses daysAgo; unknown dates stay', () => {
  const vs = [vid({ id: 'a', daysAgo: 6 }), vid({ id: 'b', daysAgo: 20 }), vid({ id: 'c', daysAgo: 999 }), vid({ id: 'd', daysAgo: 400 })]
  assert.deepEqual(ids(applyFilters(vs, { ...any, within: 7 })), ['a', 'c'])
  assert.deepEqual(ids(applyFilters(vs, { ...any, within: 30 })), ['a', 'b', 'c'])
  assert.deepEqual(ids(applyFilters(vs, { ...any, within: 365 })), ['a', 'b', 'c'])
})

test('length bands: under 15s, 15-60s, over 60s', () => {
  assert.deepEqual([14, 15, 60, 61].map(lengthBandOf), ['short', 'mid', 'mid', 'long'])
  const vs = [vid({ id: 'a', lengthSec: 10 }), vid({ id: 'b', lengthSec: 45 }), vid({ id: 'c', lengthSec: 120 })]
  assert.deepEqual(ids(applyFilters(vs, { ...any, length: 'short' })), ['a'])
  assert.deepEqual(ids(applyFilters(vs, { ...any, length: 'mid' })), ['b'])
  assert.deepEqual(ids(applyFilters(vs, { ...any, length: 'long' })), ['c'])
})

test('chips: one per active filter, and each can be removed', () => {
  const f = { ...DEFAULT_FILTERS, followersMax: 5_000, smallBig: true, within: 30, length: 'mid' }
  assert.deepEqual(activeFilters(f), ['views', 'followers', 'smallBig', 'within', 'length'])
  assert.deepEqual(activeFilters(clearFilter(f, 'views')), ['followers', 'smallBig', 'within', 'length'])
  assert.deepEqual(activeFilters(clearFilter(clearFilter(f, 'smallBig'), 'length')), ['views', 'followers', 'within'])
})

test('relax hint: under 3 results offers 500K+, then clearing; nothing when enough or no filters', () => {
  assert.deepEqual(relaxHint(2, DEFAULT_FILTERS), { kind: 'views' })
  assert.deepEqual(relaxHint(0, { ...DEFAULT_FILTERS, viewsMin: 500_000, within: 7 }), { kind: 'clear' })
  assert.equal(relaxHint(3, DEFAULT_FILTERS), null)
  assert.equal(relaxHint(0, any), null)
})

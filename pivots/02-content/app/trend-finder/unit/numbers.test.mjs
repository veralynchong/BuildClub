import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as n from '../src/lib/numbers.ts'

const NOW = Date.UTC(2026, 10, 2, 12, 0)
const DAY = 86_400_000
const vid = (o = {}) => ({
  id: 'tt-1', platform: 'tiktok', handle: '@a', hook: '', views: 2_900_000, followers: 3109, medianViews: null, daysAgo: 5,
  lengthSec: 20, shares: 1, saves: 1, formatId: 'x', keywords: [], live: true, url: 'https://www.tiktok.com/@a/video/1', ...o,
})
const rc = (o = {}) => ({
  platform: 'tiktok', id: 'tt-1', checkedAt: NOW, followersKept: true,
  old: { views: 100, likes: 10, comments: null, followers: 50 }, new: { views: 150, likes: 10, comments: null, followers: 50 }, ...o,
})

test('agoWhen says how long ago, in the unit that fits', () => {
  assert.equal(n.agoWhen(NOW, NOW), 'just now')
  assert.equal(n.agoWhen(NOW - 5 * 60_000, NOW), '5 minutes ago')
  assert.equal(n.agoWhen(NOW - 3 * 3_600_000, NOW), '3 hours ago')
  assert.equal(n.agoWhen(NOW - 3 * DAY, NOW), '3 days ago')
  assert.equal(n.agoWhen(NOW - DAY, NOW), '1 day ago')
})

test('fetchedWhen pairs the relative and the absolute time, and is null without a time', () => {
  const s = n.fetchedWhen(NOW - 3 * DAY, NOW)
  assert.match(s, /^3 days ago \(\d{4}-\d{2}-\d{2} \d{2}:\d{2}\)$/)
  assert.equal(n.fetchedWhen(undefined, NOW), null)
})

test('scoreFormula writes views ÷ followers with the real numbers', () => {
  assert.equal(n.scoreFormula(vid()), 'Views ÷ followers: 2.9M ÷ 3,109 = 933×')
})

test('scoreFormula uses the account\'s usual views when there are no followers', () => {
  assert.equal(n.scoreFormula(vid({ followers: 0, medianViews: 1000, views: 5000 })), "Views ÷ the account's usual views: 5k ÷ 1,000 = 5×")
})

test('scoreFormula says there is no score when nothing can be compared', () => {
  assert.match(n.scoreFormula(vid({ followers: 0 })), /^No score/)
})

test('recheckRows leaves out counts nobody knows and marks the changed ones', () => {
  const rows = n.recheckRows(rc())
  assert.deepEqual(rows.map((r) => r.key), ['views', 'likes', 'followers'])
  assert.deepEqual(rows.map((r) => r.changed), [true, false, false])
})

test('rescored uses the new views over the kept followers', () => {
  assert.equal(n.rescored(vid({ views: 100, followers: 50 }), rc()), '3×')
  assert.equal(n.rescored(vid(), rc({ new: { views: null, likes: 1, comments: null, followers: null } })), null)
})

test('canRecheck is for live, linked, non-Reddit videos', () => {
  assert.equal(n.canRecheck(vid()), true)
  assert.equal(n.canRecheck(vid({ platform: 'reddit' })), false)
  assert.equal(n.canRecheck(vid({ url: undefined })), false)
  assert.equal(n.canRecheck(vid({ live: false })), false)
})

test('countText shows a dash for a missing count, never 0', () => {
  assert.equal(n.countText(null), '–')
  assert.equal(n.countText(1234), '1,234')
})

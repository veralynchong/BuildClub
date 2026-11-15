import { test } from 'node:test'
import assert from 'node:assert/strict'
import { byFollowers, compareOf, hasScore, headline, outlierScore, scoreLine, usualMultiple } from '../src/lib/metrics.ts'
import { readFileSync } from 'node:fs'

const vid = (o = {}) => ({
  id: 'v', platform: 'tiktok', handle: '@a', hook: '', views: 10000, followers: 1000, medianViews: 500, daysAgo: 5,
  lengthSec: 20, shares: 0, saves: 0, formatId: 'x', keywords: [], live: true, ...o,
})

test('score is views over followers when followers are known, even with usual views', () => {
  const v = vid()
  assert.equal(byFollowers(v), true)
  assert.equal(outlierScore(v), 10)
  assert.equal(scoreLine(v), '10× more views than followers')
  // The usual-views multiple stays available as secondary info.
  assert.equal(usualMultiple(v), 20)
})

test('falls back to usual views only when followers are unknown or 0', () => {
  const v = vid({ followers: 0, medianViews: 2000 })
  assert.equal(byFollowers(v), false)
  assert.equal(outlierScore(v), 5)
  assert.equal(scoreLine(v), '5 times its usual views')
})

test('reddit uses the subreddit usual upvotes', () => {
  const v = vid({ platform: 'reddit', followers: 0, medianViews: 100, views: 1000 })
  assert.equal(outlierScore(v), 10)
})

test('no score when neither followers nor usual views are known', () => {
  const v = vid({ followers: 0, medianViews: null })
  assert.equal(hasScore(v), false)
  assert.equal(outlierScore(v), 0)
})

test('ranking order follows views over followers', () => {
  const a = vid({ id: 'a', views: 5000, followers: 100, medianViews: 10000 }) // 50x followers, 0.5x usual
  const b = vid({ id: 'b', views: 50000, followers: 10000, medianViews: 1000 }) // 5x followers, 50x usual
  const sorted = [b, a].sort((x, y) => outlierScore(y) - outlierScore(x)).map((v) => v.id)
  assert.deepEqual(sorted, ['a', 'b'])
})

test('headline prefers views over the account\'s usual views, and falls back to followers', () => {
  const both = vid({ views: 273_000, followers: 123, medianViews: 1000 })
  assert.equal(outlierScore(both), 273_000 / 123) // the ranking score is still by followers
  assert.deepEqual(headline(both), { kind: 'usual', base: 1000, multiple: 273 })
  const followersOnly = vid({ views: 10000, followers: 1000, medianViews: undefined })
  assert.deepEqual(headline(followersOnly), { kind: 'followers', base: 1000, multiple: 10 })
  const reddit = vid({ platform: 'reddit', followers: 0, medianViews: 100, views: 1000 })
  assert.deepEqual(headline(reddit), { kind: 'usual', base: 100, multiple: 10 })
  assert.equal(headline(vid({ followers: 0, medianViews: undefined })), null)
})

test('the Best to copy card, its numbers and the breakdown panel all read the same headline multiplier', () => {
  const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
  assert.match(src('components/find/words.ts'), /headline\(v\)/)
  assert.match(src('components/BreakdownPanel.tsx'), /headline\(video\)/)
  assert.match(src('components/ResultsScreen.tsx'), /headline\(video\)/)
  // The second "N times the account's usual views" line next to a followers number is gone.
  assert.doesNotMatch(src('components/BreakdownPanel.tsx'), /usualMultiple/)
  assert.match(src('components/VideoTile.tsx'), /headline\(video\)/)
})

test('compareOf gives the plan screens the same base and label as the results screen', () => {
  const both = vid({ views: 273_000, followers: 123, medianViews: 1000 })
  assert.deepEqual(compareOf(both), { base: 1000, followers: false }) // usual views, although followers are known
  const followersOnly = vid({ views: 10000, followers: 1000, medianViews: undefined })
  assert.deepEqual(compareOf(followersOnly), { base: 1000, followers: true })
  assert.deepEqual(compareOf(vid({ followers: 0, medianViews: undefined })), { base: 0, followers: false })
  const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
  assert.match(src('components/plans/PlanCard.tsx'), /compareOf\(v\)/)
  assert.match(src('components/PlanScreen.tsx'), /compareOf\(video\)/)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { elapsedSeconds, isOnSearchPage } from '../src/lib/searchStatus.ts'
import { en, zhHant } from '../src/lib/strings/find.ts'

test('elapsed seconds count whole seconds and never go negative', () => {
  assert.equal(elapsedSeconds(1000, 1000), 0)
  assert.equal(elapsedSeconds(1000, 12_999), 11)
  assert.equal(elapsedSeconds(5000, 1000), 0)
})

test('a finished search shows directly only on that client\'s Find ideas or results page', () => {
  assert.equal(isOnSearchPage({ view: 'search', workspace: 'a' }, 'a'), true)
  assert.equal(isOnSearchPage({ view: 'results', workspace: 'a' }, 'a'), true)
  assert.equal(isOnSearchPage({ view: 'home', workspace: 'a' }, 'a'), false)
  assert.equal(isOnSearchPage({ view: 'shortlist', workspace: 'a' }, 'a'), false)
  assert.equal(isOnSearchPage({ view: 'search', workspace: 'b' }, 'a'), false)
  assert.equal(isOnSearchPage({ view: 'overview', workspace: 'all' }, 'a'), false)
})

test('background search strings exist in English and Traditional Chinese with the query placeholder', () => {
  for (const key of ['find.bg.status', 'find.bg.ready']) {
    assert.match(en[key], /\{query\}/)
    assert.match(zhHant[key], /\{query\}/)
  }
  assert.match(en['find.bg.seconds'], /\{seconds\}/)
  assert.match(zhHant['find.bg.seconds'], /\{seconds\}/)
})

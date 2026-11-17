import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseQuery, searchTerms } from '../src/lib/parseQuery.ts'

const stirFry = [{ id: 'f1', tags: ['stir fry'] }]

test('"recipe" is kept, so "chicken recipe" is not sent as plain "chicken" (11/17 B2)', () => {
  assert.equal(searchTerms(parseQuery('chicken recipe', [])), 'chicken recipe')
})

test('words go out in the order they were typed, format tags included (11/17 B5)', () => {
  assert.equal(searchTerms(parseQuery('chili chicken stir fry', stirFry)), 'chili chicken stir fry')
  assert.equal(searchTerms(parseQuery('stir fry chili chicken on tiktok', stirFry)), 'stir fry chili chicken')
})

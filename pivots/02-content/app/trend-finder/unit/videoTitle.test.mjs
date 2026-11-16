import { test } from 'node:test'
import assert from 'node:assert/strict'
import { videoTitle } from '../src/lib/videoTitle.ts'

test('hashtags, mentions and "ib:" credits are dropped from a title', () => {
  assert.equal(videoTitle('Crispy tofu in 10 min #tofu #vegan '), 'Crispy tofu in 10 min')
  assert.equal(videoTitle('Tofu shawarma ib: @alexkhosieyo'), 'Tofu shawarma')
  assert.equal(videoTitle('Best dumplings with @chef | #food'), 'Best dumplings with')
})

test('a line of only tags keeps its text rather than going blank', () => {
  assert.equal(videoTitle('#tofu #vegan'), '#tofu #vegan')
})

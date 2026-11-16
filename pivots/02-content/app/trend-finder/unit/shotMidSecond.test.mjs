import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shotMidSecond } from '../src/lib/shotGrid.ts'

test("a shot's reference frame is taken from the middle of its time", () => {
  assert.equal(shotMidSecond('0-3s'), 1.5)
  assert.equal(shotMidSecond('3–9 s'), 6)
  assert.equal(shotMidSecond('12s'), 12)
  assert.equal(shotMidSecond(''), null)
})

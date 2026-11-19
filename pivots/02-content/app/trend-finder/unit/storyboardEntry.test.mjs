import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storyboardTarget } from '../src/lib/canvasPick.ts'

const plan = (id) => ({ id })

test('no plans opens the chooser', () => {
  assert.equal(storyboardTarget([]), 'pick')
})

test('one plan opens straight away', () => {
  assert.deepEqual(storyboardTarget([plan('a')]), { open: 'a' })
})

test('an unapproved plan still opens (read-only)', () => {
  assert.deepEqual(storyboardTarget([{ id: 'a', status: 'draft' }]), { open: 'a' })
})

test('several plans open the chooser', () => {
  assert.equal(storyboardTarget([plan('a'), plan('b')]), 'pick')
})

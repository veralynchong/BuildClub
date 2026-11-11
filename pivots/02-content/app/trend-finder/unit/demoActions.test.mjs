import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRevealController } from '../src/lib/demo/actions.ts'

function scheduler() {
  let next = 0
  const pending = new Map(), history = new Map()
  return {
    setTimeout(fn) { const id = ++next; pending.set(id, fn); history.set(id, fn); return id },
    clearTimeout(id) { pending.delete(id) },
    tick() { const [id, fn] = pending.entries().next().value ?? []; if (fn) { pending.delete(id); fn() } },
    stale(id) { history.get(id)?.() },
    size() { return pending.size },
  }
}

test('reveals unique ids in order without mutating input; double start is idempotent', () => {
  const clock = scheduler(), got = [], ids = Object.freeze(['a', 'a', 'b'])
  const c = createRevealController(clock, 20)
  let complete = 0
  const onReveal = (id) => got.push(id), onComplete = () => complete++
  c.start(ids, onReveal, onComplete)
  clock.tick()
  c.start(ids, onReveal, onComplete)
  clock.tick()
  assert.deepEqual(got, ['a', 'b'])
  assert.equal(complete, 1)
  assert.equal(clock.size(), 0)
  c.start(ids, onReveal, onComplete)
  clock.tick(); clock.tick()
  assert.deepEqual(got, ['a', 'b', 'a', 'b'])
  assert.equal(complete, 2)
})

test('cancel/reset blocks callbacks even when the cleared timer races', () => {
  const clock = scheduler(), got = []
  const c = createRevealController(clock)
  let complete = 0
  c.start(['a', 'b'], (id) => got.push(id), () => complete++)
  c.cancel(); c.cancel()
  clock.stale(1); clock.tick()
  assert.deepEqual(got, [])
  assert.equal(complete, 0)
  c.start(['new'], (id) => got.push(id), () => complete++)
  clock.stale(1); clock.tick()
  assert.deepEqual(got, ['new'])
  assert.equal(complete, 1)
})

test('route restart cancels the previous sequence and ignores its stale callback', () => {
  const clock = scheduler(), got = []
  const c = createRevealController(clock)
  let oldComplete = 0, newComplete = 0
  c.start(['old', 'late'], (id) => got.push(id), () => oldComplete++)
  clock.tick()
  c.start(['new'], (id) => got.push(id), () => newComplete++)
  clock.stale(2); clock.tick()
  assert.deepEqual(got, ['old', 'new'])
  assert.equal(oldComplete, 0)
  assert.equal(newComplete, 1)
})

test('empty completes asynchronously and remains cancellable', () => {
  const clock = scheduler(), c = createRevealController(clock)
  let complete = 0
  c.start([], () => assert.fail('empty reveal'), () => complete++)
  assert.equal(complete, 0)
  c.cancel(); clock.stale(1)
  assert.equal(complete, 0)
  c.start([], () => assert.fail('empty reveal'), () => complete++)
  clock.tick()
  assert.equal(complete, 1)
})

test('cancel and restart inside a callback do not complete the abandoned run', () => {
  const clock = scheduler(), got = [], c = createRevealController(clock)
  let oldComplete = 0, newComplete = 0
  c.start(['old'], (id) => {
    got.push(id)
    c.cancel()
    c.start(['new'], (next) => got.push(next), () => newComplete++)
  }, () => oldComplete++)
  clock.tick(); clock.tick()
  assert.deepEqual(got, ['old', 'new'])
  assert.equal(oldComplete, 0)
  assert.equal(newComplete, 1)
})

test('reveal is local and never calls network', () => {
  const original = globalThis.fetch
  globalThis.fetch = () => assert.fail('network is forbidden')
  try {
    const clock = scheduler(), c = createRevealController(clock), got = []
    c.start(['image', 'video'], (id) => got.push(id), () => {})
    clock.tick(); clock.tick()
    assert.deepEqual(got, ['image', 'video'])
  } finally { globalThis.fetch = original }
})

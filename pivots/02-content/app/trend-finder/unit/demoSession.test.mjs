import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEMO_SESSION_STORAGE_KEY, createDemoSession, nextDemo, previousDemo,
  chooseDemoRoute, resetDemoSession, exitDemoSession, parseDemoSession,
} from '../src/lib/demo/session.ts'
import { DEMO_STEPS } from '../src/lib/demo/steps.ts'

const ids = ['research', 'breakdown', 'script', 'route', 'canvas', 'edit', 'result']

test('fresh demo uses only its own namespace and seven bilingual steps', () => {
  assert.match(DEMO_SESSION_STORAGE_KEY, /^buildclub:demo:/)
  assert.deepEqual(createDemoSession(), {
    version: 1, active: true, stepId: 'research', route: null, revealedAssetIds: [],
  })
  assert.deepEqual(DEMO_STEPS.map(step => step.id), ids)
  for (const step of DEMO_STEPS) {
    for (const lang of ['en', 'zh-Hant']) {
      assert.ok(step[lang].title)
      assert.ok(step[lang].description)
    }
  }
})

test('navigation clamps at both ends and waits for an explicit route choice', () => {
  let session = createDemoSession()
  assert.deepEqual(previousDemo(session), session)
  for (const id of ids.slice(1, 4)) {
    session = nextDemo(session)
    assert.equal(session.stepId, id)
  }
  assert.deepEqual(nextDemo(session), session)
  session = chooseDemoRoute(session, 'shoot')
  assert.equal(session.stepId, 'route')
  for (const id of ids.slice(4)) {
    session = nextDemo(session)
    assert.equal(session.stepId, id)
  }
  assert.deepEqual(nextDemo(session), session)
  for (const id of ids.slice(0, -1).reverse()) {
    session = previousDemo(session)
    assert.equal(session.stepId, id)
  }
})

test('returning to the fork can switch routes without moving or losing reveals', () => {
  const session = { ...createDemoSession(), stepId: 'canvas', route: 'shoot', revealedAssetIds: ['angle-high'] }
  const fork = previousDemo(session)
  const switched = chooseDemoRoute(fork, 'ai')
  assert.equal(switched.stepId, 'route')
  assert.equal(nextDemo(switched).stepId, 'canvas')
  assert.deepEqual(switched.revealedAssetIds, ['angle-high'])
})

test('reset clears route and reveals; exit preserves progress but deactivates', () => {
  const session = { ...createDemoSession(), stepId: 'edit', route: 'ai', revealedAssetIds: ['image-1'] }
  assert.deepEqual(resetDemoSession(session), createDemoSession())
  const exited = exitDemoSession(session)
  assert.deepEqual(exited, { ...session, active: false })
  assert.deepEqual(nextDemo(exited), exited)
  assert.deepEqual(previousDemo(exited), exited)
})

test('all transitions leave the input untouched, including a frozen reveals array', () => {
  const session = Object.freeze({ ...createDemoSession(), stepId: 'route', revealedAssetIds: Object.freeze(['a']) })
  const before = JSON.stringify(session)
  for (const transition of [nextDemo, previousDemo, resetDemoSession, exitDemoSession, s => chooseDemoRoute(s, 'ai')]) {
    transition(session)
    assert.equal(JSON.stringify(session), before)
  }
})

test('restore validates every persisted field and rejects unknown versions and steps', () => {
  const valid = { ...createDemoSession(), stepId: 'result', route: 'ai', revealedAssetIds: ['clip-1'] }
  assert.deepEqual(parseDemoSession(JSON.stringify(valid)), valid)
  assert.deepEqual(parseDemoSession(JSON.stringify({ ...valid, active: false })), { ...valid, active: false })
  for (const raw of [null, '', '{', 'null', '[]', '1', '"demo"', '{}']) assert.equal(parseDemoSession(raw), null)
  for (const patch of [
    { version: 2 }, { version: '1' }, { active: 1 }, { stepId: 'unknown' },
    { route: 'other' }, { route: null }, { revealedAssetIds: null },
    { revealedAssetIds: [1] }, { revealedAssetIds: [''] },
  ]) assert.equal(parseDemoSession(JSON.stringify({ ...valid, ...patch })), null)
  for (const field of Object.keys(valid)) {
    const incomplete = { ...valid }
    delete incomplete[field]
    assert.equal(parseDemoSession(JSON.stringify(incomplete)), null)
  }
  assert.deepEqual(parseDemoSession(JSON.stringify({ ...createDemoSession(), unrelated: 'ignored' })), createDemoSession())
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EDITOR_STEPS, stepsDone } from '../src/lib/editor/steps.ts'

const project = (over = {}) => ({ clips: [{ id: 'c1' }], captions: { enabled: false }, showLogo: false, ...over })
const cut = (over = {}) => ({ status: 'done', source: 'editor', stale: false, output: { url: '/v.mp4' }, review: null, ...over })
const done = (facts) => EDITOR_STEPS.filter((s) => stepsDone(facts)[s])

test('nothing is done before the project and the cut have loaded', () => {
  assert.deepEqual(done({ project: null, clientHasLogo: true, cut: null }), [])
})

test('clips, captions and logo follow the project; the logo also needs one on the client', () => {
  assert.deepEqual(done({ project: project({ clips: [] }), clientHasLogo: false, cut: null }), [])
  assert.deepEqual(done({ project: project(), clientHasLogo: false, cut: null }), ['clips'])
  assert.deepEqual(done({ project: project({ captions: { enabled: true }, showLogo: true }), clientHasLogo: true, cut: null }), ['clips', 'captions', 'logo'])
  assert.deepEqual(done({ project: project({ showLogo: true }), clientHasLogo: false, cut: null }), ['clips'])
})

test('export needs a finished editor video that is not stale', () => {
  const p = project()
  assert.deepEqual(done({ project: p, clientHasLogo: false, cut: cut() }), ['clips', 'export'])
  assert.deepEqual(done({ project: p, clientHasLogo: false, cut: cut({ stale: true }) }), ['clips'])
  assert.deepEqual(done({ project: p, clientHasLogo: false, cut: cut({ source: 'auto' }) }), ['clips'])
  assert.deepEqual(done({ project: p, clientHasLogo: false, cut: cut({ status: 'running' }) }), ['clips'])
  assert.deepEqual(done({ project: p, clientHasLogo: false, cut: cut({ output: undefined }) }), ['clips'])
})

test('send is done while the review waits or after it is approved, not when rejected or never sent', () => {
  const p = project()
  for (const [status, sent] of [['waiting', true], ['approved', true], ['rejected', false]]) {
    assert.equal(stepsDone({ project: p, clientHasLogo: false, cut: cut({ review: { status } }) }).send, sent, status)
  }
  assert.equal(stepsDone({ project: p, clientHasLogo: false, cut: cut() }).send, false)
  // a stale video was replaced since it was sent
  assert.equal(stepsDone({ project: p, clientHasLogo: false, cut: cut({ stale: true, review: { status: 'waiting' } }) }).send, false)
})

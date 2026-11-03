import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stepsDone, tabsDone } from '../src/lib/editor/steps.ts'

const project = (over = {}) => ({ clips: [{ id: 'c1' }], captions: { enabled: false }, showLogo: false, ...over })
const cut = (over = {}) => ({ status: 'done', source: 'editor', stale: false, output: { url: '/v.mp4' }, review: null, ...over })
const done = (facts) => Object.entries(stepsDone(facts)).flatMap(([s, d]) => (d ? [s] : []))

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

test('tabsDone ticks only visited tabs whose step is done', () => {
  const facts = { project: { clips: [], captions: { enabled: true }, showLogo: true }, clientHasLogo: true, cut: null, texts: 0, voices: 0, music: false }
  assert.equal(tabsDone(facts, new Set()).captions, false) // on by default, not visited: no tick in advance
  assert.equal(tabsDone(facts, new Set(['captions'])).captions, true)
  assert.equal(tabsDone(facts, new Set(['clips'])).clips, false) // visited, no clip
  assert.equal(tabsDone({ ...facts, project: { ...facts.project, clips: [{}] } }, new Set(['clips'])).clips, true)
  assert.equal(tabsDone({ ...facts, clientHasLogo: false }, new Set(['brand'])).brand, false)
  assert.equal(tabsDone({ ...facts, texts: 1, voices: 1, music: true }, new Set(['text', 'voice', 'music'])).voice, true)
  assert.equal(tabsDone({ ...facts, texts: 1 }, new Set(['voice'])).text, false)
})

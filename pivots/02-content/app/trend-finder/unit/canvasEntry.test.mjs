import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasMissingLegacyPlan } from '../src/lib/canvas/resource.ts'

test('a standalone workspace stays on Canvas with zero legacy plans', () => {
  const workspace = { kind: 'workspace', id: 'ws_empty' }
  assert.equal(hasMissingLegacyPlan('canvas', workspace, false), false)
  assert.equal(hasMissingLegacyPlan('canvas', workspace, true), false)
})

test('a legacy Canvas with a missing plan still redirects to Plans', () => {
  const legacy = { kind: 'legacy-plan', id: 'plan_deleted' }
  assert.equal(hasMissingLegacyPlan('canvas', legacy, false), true)
  assert.equal(hasMissingLegacyPlan('canvas', legacy, true), false)
  assert.equal(hasMissingLegacyPlan('canvas', undefined, false), true)
})

test('a retained workspace context never bypasses plan or board validation', () => {
  const workspace = { kind: 'workspace', id: 'ws_empty' }
  for (const view of ['plan', 'board']) {
    for (const resource of [undefined, workspace, { kind: 'legacy-plan', id: 'plan' }]) {
      // Losing any one of these lookups must still redirect legacy views.
      for (const missing of ['idea', 'video', 'format', 'client']) {
        const lookups = { idea: {}, video: {}, format: {}, client: {}, [missing]: undefined }
        const ready = !!(lookups.idea && lookups.video && lookups.format && lookups.client)
        assert.equal(hasMissingLegacyPlan(view, resource, ready), true)
      }
      assert.equal(hasMissingLegacyPlan(view, resource, true), false)
    }
  }
})

test('a storyboard without its plan redirects to Plans', () => {
  assert.equal(hasMissingLegacyPlan('storyboard', { kind: 'legacy-plan', id: 'p' }, false), true)
  assert.equal(hasMissingLegacyPlan('storyboard', { kind: 'legacy-plan', id: 'p' }, true), false)
})

test('non-plan screens remain usable without a plan', () => {
  for (const view of ['canvasPick', 'storyboardPick', 'shortlist', 'home', 'search', 'overview', 'review']) {
    assert.equal(hasMissingLegacyPlan(view, undefined, false), false)
  }
})

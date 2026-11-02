import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PLAN_TABS, defaultTab, tabLocked, planTabKey, isPlanTab } from '../src/lib/planTabs.ts'

test('tabs in production order', () => {
  assert.deepEqual(PLAN_TABS, ['script', 'storyboard', 'shoot', 'edit', 'post'])
})
test('default tab follows the step', () => {
  assert.equal(defaultTab('idea'), 'script')
  assert.equal(defaultTab('script'), 'script')
  assert.equal(defaultTab('storyboard'), 'storyboard')
  assert.equal(defaultTab('filming'), 'shoot')
  assert.equal(defaultTab('editing'), 'edit')
  assert.equal(defaultTab('posted'), 'post')
})
test('edit and post wait for approval', () => {
  for (const s of ['saved', 'waiting', 'rejected']) {
    assert.equal(tabLocked('edit', s), 'needs-approval')
    assert.equal(tabLocked('post', s), 'needs-approval')
    assert.equal(tabLocked('storyboard', s), null)
  }
  assert.equal(tabLocked('edit', 'approved'), null)
  assert.equal(tabLocked('post', 'approved'), null)
})
test('stored tab is checked and keyed per plan', () => {
  assert.equal(planTabKey('abc'), 'remake.plan-tab.abc')
  assert.equal(isPlanTab('edit'), true)
  assert.equal(isPlanTab('nope'), false)
  assert.equal(isPlanTab(null), false)
})

test('locked tab message depends on the status', async () => {
  const { lockedNotice } = await import('../src/lib/planTabs.ts')
  assert.equal(lockedNotice('script', 'saved'), null)
  assert.equal(lockedNotice('edit', 'approved'), null)
  assert.deepEqual(lockedNotice('edit', 'saved'), { titleKey: 'plan.tab.locked.edit.saved.title', bodyKey: 'plan.tab.locked.edit.saved.body', toStoryboard: true })
  assert.deepEqual(lockedNotice('post', 'waiting'), { titleKey: 'plan.tab.locked.post.waiting.title', bodyKey: 'plan.tab.locked.post.waiting.body', toStoryboard: false })
  assert.deepEqual(lockedNotice('edit', 'rejected'), { titleKey: 'plan.tab.locked.edit.rejected.title', bodyKey: 'plan.tab.locked.edit.rejected.body', toStoryboard: true })
})

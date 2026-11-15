import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { areas } from '../src/lib/i18n.ts'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

test('the picked video panel offers Plan video before the video is saved or planned', () => {
  const panel = read('components/BreakdownPanel.tsx')
  // The button shows when the video has no plan yet, whether or not it is saved to Research.
  assert.match(panel, /!status && \(\s*<button[^>]*onClick=\{onPlanNow\}[^>]*>\s*\{t\('plan\.common\.planVideo'\)\}/)
  assert.equal(areas.plan.en['plan.common.planVideo'], 'Plan video')
})

test('the panel\'s Plan video runs the same planNow the saved-idea card uses and opens the plan', () => {
  const app = read('App.tsx')
  assert.match(app, /onPlanNow=\{\(\) => planNow\(openVideo\.id\)\}/)
  assert.match(app, /onPlanShots=\{\(videoId\) => planNow\(videoId\)\}/)
})

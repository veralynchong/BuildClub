import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tofuCase } from '../src/lib/demo/tofuCase.ts'
import { projectCanvas } from '../src/lib/demo/canvasPresentation.ts'

function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze) }
  return value
}

test('case preserves all 21 source actions, timings and five story groups', () => {
  assert.deepEqual(tofuCase.shots.map((s) => s.id), Array.from({ length: 21 }, (_, i) => `s${i + 1}`))
  assert.equal(tofuCase.groups.length, 5)
  assert.ok(Math.abs(tofuCase.shots.reduce((n, s) => n + s.durationSeconds, 0) - 10.5) < 0.00001)
  assert.equal(tofuCase.analysis.spokenNarration, null)
  assert.ok(tofuCase.script.every((s) => s.spokenText === ''))
  assert.ok(tofuCase.shots.every((s) => s.action && tofuCase.groups.some((g) => g.id === s.groupId)))
  assert.match(tofuCase.sourceUrl, /instagram.com\/reel\/DVp3xOdFaHL/)
  assert.ok(tofuCase.assets.every((a) => a.relativePath.startsWith('/demo-assets/') && /^[a-f0-9]{64}$/.test(a.sha256)))
  assert.equal(tofuCase.assets.filter((a) => a.provenance === 'fresh-ai').length, 0)
  assert.equal(tofuCase.assets.filter((a) => a.id.startsWith('image-s')).length, 21)
  assert.ok(tofuCase.assets.filter((a) => a.id.startsWith('image-s')).every((a) => a.provenance === 'source-derived'))
  assert.ok(tofuCase.assets.filter((a) => a.routes.includes('shoot')).every((a) => a.provenance === 'ai-concept' && /AI alternative angle/.test(a.label)))
})

test('both routes retain every shot; shoot alternatives belong to s19 only', () => {
  for (const route of ['shoot', 'ai']) {
    const groups = projectCanvas(tofuCase, route)
    assert.equal(groups.length, 5)
    assert.deepEqual(groups.flatMap((g) => g.shots.map((s) => s.shot.id)), tofuCase.shots.map((s) => s.id))
    assert.ok(groups.flatMap((g) => g.shots).every((s) => s.assets.every((a) => a.routes.includes(route))))
  }
  const shoot = projectCanvas(tofuCase, 'shoot').flatMap((g) => g.shots)
  assert.equal(shoot.find((s) => s.shot.id === 's19').assets.length, 4)
  assert.ok(shoot.filter((s) => s.shot.id !== 's19').every((s) => s.assets.length === 0))
})

test('empty, missing and unrevealed assets never hide shots or imply ready', () => {
  const noAssets = { ...tofuCase, assets: [] }
  assert.equal(projectCanvas(noAssets, 'ai').flatMap((g) => g.shots).length, 21)
  assert.ok(projectCanvas(noAssets, 'ai').flatMap((g) => g.shots).every((s) => s.assets.length === 0))
  assert.deepEqual(projectCanvas({ ...noAssets, shots: [], groups: [] }, 'ai'), [])
  const unavailable = { ...tofuCase, assets: tofuCase.assets.map((a) => ({ ...a, available: false })) }
  assert.ok(projectCanvas(unavailable, 'ai').flatMap((g) => g.shots).every((s) => s.assets.length === 0))
  const hidden = projectCanvas(tofuCase, 'ai', [])
  assert.equal(hidden.flatMap((g) => g.shots).length, 21)
  assert.ok(hidden.flatMap((g) => g.shots).every((s) => s.assets.length === 0))
  const shown = projectCanvas(tofuCase, 'ai', ['image-s1', 'unknown'])
  assert.deepEqual(shown.flatMap((g) => g.shots.flatMap((s) => s.assets.map((a) => a.id))), ['image-s1'])
})

test('grouping is a detached projection, including shots with a missing group', () => {
  const input = freeze(structuredClone(tofuCase)), before = JSON.stringify(input)
  const projected = projectCanvas(input, 'ai')
  projected[0].shots[0].shot.action = 'preview only'
  projected[0].shots[0].assets[0].routes.push('shoot')
  projected.reverse()
  assert.equal(JSON.stringify(input), before)
  const orphan = { ...input, groups: [] }
  assert.equal(projectCanvas(orphan, 'ai').flatMap((g) => g.shots).length, 21)
})

test('projection neither loads media nor calls network', () => {
  const original = globalThis.fetch
  globalThis.fetch = () => assert.fail('network is forbidden')
  try { assert.equal(projectCanvas(tofuCase, 'ai').flatMap((g) => g.shots).length, 21) }
  finally { globalThis.fetch = original }
})

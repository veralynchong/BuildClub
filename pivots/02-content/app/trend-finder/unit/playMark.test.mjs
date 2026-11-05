import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FLY_MS, RESOLVE_MS, RESOLVE_MS_REDUCED, arrivalOrder, easeOutCubic, estimate, looseFraction, makeTiles,
  resolveMs, shouldPlayResolve, tickerCells,
} from '../src/lib/playMark.ts'

test('the estimate waits out the 3s send, then eases toward 90% and never completes', () => {
  assert.equal(estimate(0), 0)
  assert.equal(estimate(2.9), 0)
  assert.equal(estimate(3), 0)
  const at60 = estimate(60)
  assert.ok(at60 > 0.78 && at60 < 0.85, `about 80% at a minute, got ${at60}`)
  assert.ok(estimate(600) < 0.9)
  let prev = 0
  for (let s = 0; s <= 300; s += 0.5) {
    const f = estimate(s)
    assert.ok(f >= prev, 'never goes backwards')
    prev = f
  }
})

test('the per-tile flight is a cubic ease-out over 415ms', () => {
  assert.equal(FLY_MS, 415)
  assert.equal(easeOutCubic(0), 0)
  assert.equal(easeOutCubic(1), 1)
  assert.equal(easeOutCubic(0.5), 0.875)
})

test('loose pixels drift in over the first 3 seconds, up to 60%', () => {
  assert.equal(looseFraction(0), 0)
  assert.equal(looseFraction(1.5), 0.3)
  assert.equal(looseFraction(3), 0.6)
  assert.equal(looseFraction(40), 0.6)
})

test('instant (cached) results skip the resolve; slower ones get about 2 seconds', () => {
  assert.equal(shouldPlayResolve(0), false)
  assert.equal(shouldPlayResolve(900), false)
  assert.equal(shouldPlayResolve(4000), true)
  assert.equal(shouldPlayResolve(4000, true), false, 'a hidden tab never waits')
  assert.equal(resolveMs(false), RESOLVE_MS)
  assert.ok(RESOLVE_MS >= 1700 && RESOLVE_MS <= 2100)
  assert.equal(resolveMs(true), RESOLVE_MS_REDUCED)
})

test('the tile set is the hero\'s: same every time, three mustard tiles, loose pixels outside the play shape', () => {
  const a = makeTiles(440, 460)
  const b = makeTiles(440, 460)
  assert.deepEqual(a, b)
  assert.equal(a.T, 16)
  assert.ok(a.core.length > 150)
  assert.equal(a.core.filter((t) => t.hit).length, 3)
  assert.ok(a.loose.length > 0 && a.loose.every((t) => t.fg === null))
  const colours = new Set(a.tiles.flatMap((t) => [t.bg, t.fg]).filter(Boolean))
  for (const c of colours) assert.ok(['navy', 'blue', 'beige', 'black', 'white', 'mustard'].includes(c))
})

test('reduced motion fills bottom row first; the ticker is a small play shape', () => {
  const { core } = makeTiles(440, 460)
  const rows = arrivalOrder(core, true).map((t) => t.r)
  assert.deepEqual(rows, [...rows].sort((x, y) => y - x))
  const cells = tickerCells(false)
  assert.ok(cells.length > 10 && cells.length < 64)
  assert.ok(cells.every((c) => c.c < 8 && c.r < 8))
})

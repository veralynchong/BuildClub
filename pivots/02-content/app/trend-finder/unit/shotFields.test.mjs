import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LENSES, GEARS, gearLabel } from '../src/lib/shots.ts'

test('lens and gear lists match the backend', () => {
  assert.deepEqual(LENSES, ['16mm', '24mm', '35mm', '50mm', '85mm', '100mm'])
  assert.deepEqual(GEARS, ['tripod', 'gimbal', 'handheld', 'slider'])
  assert.equal(typeof gearLabel('gimbal'), 'string')
})

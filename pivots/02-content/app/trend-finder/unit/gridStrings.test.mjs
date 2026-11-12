import { test } from 'node:test'
import assert from 'node:assert/strict'
import { areas } from '../src/lib/i18n.ts'

const keys = ['tab.board', 'tab.list', 'cols', 'show.action', 'show.line', 'show.camera', 'budget', 'canvas', 'next', 'noFrame', 'noLine', 'generating', 'changed', 'refine', 'regenerate', 'readOnly', 'lineLocked', 'failed', 'regenerateOff', 'noModel', 'promptAuto', 'promptReset', 'noAuto']

test('every grid.* key has English and Traditional Chinese text', () => {
  assert.ok(areas.grid, 'grid strings are registered in i18n')
  for (const k of keys) {
    const key = `grid.${k}`
    assert.ok(areas.grid.en[key]?.trim(), `en ${key}`)
    assert.ok(areas.grid.zhHant[key]?.trim(), `zh ${key}`)
  }
})

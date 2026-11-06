import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTheme, readTheme, writeTheme, applyTheme, THEME_KEY, THEME_CHOICES } from '../src/lib/theme.ts'

const store = (value) => ({ getItem: () => value, setItem() {} })

test('a saved light or dark is kept', () => {
  assert.equal(parseTheme('light'), 'light')
  assert.equal(parseTheme('dark'), 'dark')
  assert.equal(readTheme(store('dark')), 'dark')
})

test('a missing or bad value means light', () => {
  for (const bad of [null, undefined, '', 'system', 'Dark', 'blue', 3, {}]) assert.equal(parseTheme(bad), 'light')
  assert.equal(readTheme(store(null)), 'light')
  assert.equal(readTheme(store('nope')), 'light')
  assert.equal(readTheme(null), 'light')
})

test('storage that throws means light and never throws out', () => {
  const boom = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  assert.equal(readTheme(boom), 'light')
  assert.doesNotThrow(() => writeTheme('dark', boom))
})

test('writeTheme stores under the theme key', () => {
  const seen = {}
  writeTheme('light', { getItem: () => null, setItem: (k, v) => { seen[k] = v } })
  assert.deepEqual(seen, { [THEME_KEY]: 'light' })
})

test('applyTheme always applies an explicit light or dark attribute', () => {
  const attrs = new Map()
  const root = { setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k) }
  applyTheme('dark', root)
  assert.equal(attrs.get('data-theme'), 'dark')
  applyTheme('light', root)
  assert.equal(attrs.get('data-theme'), 'light')
})

test('only Light and Dark are offered', () => {
  assert.deepEqual(THEME_CHOICES, ['light', 'dark'])
})

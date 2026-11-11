import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hookUsed, pickHook, sampleHooks, subjectOf, suggestedHooks, withHookOptions } from '../src/lib/hooks.ts'
import { inLang } from '../src/lib/i18n.ts'

const format = (over = {}) => ({
  short: 'crispy tofu',
  name: 'Crispy tofu ASMR, top-down',
  why: { hook: 'The first words promise speed.', first3s: '', length: '', format: '', sound: '' },
  shotList: [
    { time: '0-2s', shot: 'Top-down: tofu drops into hot oil', text: 'Crispy tofu in 5 min' },
    { time: '2-6s', shot: 'Close-up: cubes turning golden' },
  ],
  ...over,
})
const video = { hook: 'Crispy tofu in 5 min' }
const client = { name: 'Evergreen Foods' }

test('hookUsed: the spoken hook line wins, on-screen text and first shot are kept', () => {
  const h = hookUsed(video, format({ lines: [{ time: '0-2s', text: 'Five minutes, that is all', role: 'hook' }] }))
  assert.equal(h.opening, 'Five minutes, that is all')
  assert.equal(h.onScreen, 'Crispy tofu in 5 min')
  assert.equal(h.firstShot, 'Top-down: tofu drops into hot oil')
  assert.equal(h.why, 'The first words promise speed.')
  assert.equal(h.type, undefined)
})

test('hookUsed: falls back to on-screen text, then the caption, and drops repeats', () => {
  const h = hookUsed(video, format())
  assert.equal(h.opening, 'Crispy tofu in 5 min')
  assert.equal(h.onScreen, undefined)
  const bare = hookUsed({ hook: 'Is this chicken?' }, format({ shotList: [], why: { hook: '', first3s: '', length: '', format: '', sound: '', hookType: 'nonsense' } }))
  assert.deepEqual(bare, { opening: 'Is this chicken?' })
})

test('hookUsed: keeps a known hook type only', () => {
  const why = { hook: '', first3s: '', length: '', format: '', sound: '', hookType: 'question_or_text' }
  assert.equal(hookUsed(video, format({ why })).type, 'question_or_text')
})

test('subjectOf: uses short, skips a short that is just the caption, and trims the name', () => {
  assert.equal(subjectOf(format(), video), 'crispy tofu')
  assert.equal(subjectOf({ short: 'Crispy tofu in 5 min', name: 'Crispy tofu ASMR, top-down' }, video), 'crispy tofu ASMR')
  assert.equal(subjectOf({ short: '', name: 'ASMR tofu: loud' }, video), 'ASMR tofu')
  assert.equal(subjectOf({ short: '', name: '' }, video), 'this')
})

test('sampleHooks: same input gives the same lines, starting with the original kind', () => {
  const why = { hook: '', first3s: '', length: '', format: '', sound: '', hookType: 'challenge' }
  const a = sampleHooks(format({ why }), video, client)
  assert.deepEqual(a, sampleHooks(format({ why }), video, client))
  assert.equal(a.length, 3)
  assert.equal(a[0], 'We tried crispy tofu at Evergreen Foods. Can you do it faster?')
  assert.equal(new Set(a).size, 3)
})

test('sampleHooks: follows the screen language', () => {
  const zh = inLang('zh-Hant', () => sampleHooks(format(), video, client, 1))
  assert.equal(zh[0], '你知道crispy tofu也能這樣嗎？')
})

test('suggestedHooks: written options first, samples fill to 3, repeats dropped', () => {
  const shots = [{ time: '0-2s', shot: 'x', line: 'Mine', options: ['One', 'one ', ''] }]
  const s = suggestedHooks(shots, format(), video, client)
  assert.equal(s.length, 3)
  assert.deepEqual(s[0], { text: 'One', source: 'written' })
  assert.ok(s.slice(1).every((h) => h.source === 'sample'))
  assert.deepEqual(suggestedHooks([], format(), video, client).map((h) => h.source), ['sample', 'sample', 'sample'])
  const four = [{ time: '', shot: '', options: ['a', 'b', 'c', 'd'] }]
  assert.deepEqual(suggestedHooks(four, format(), video, client).map((h) => h.text), ['a', 'b', 'c'])
})

test('pickHook: sets shot 1 line as edited, keeps the rest, and makes a shot when there are none', () => {
  const shots = [{ time: '0-2s', shot: 'Pour', line: 'old', options: ['x'] }, { time: '2-4s', shot: 'Stir' }]
  const next = pickHook(shots, '  New start  ')
  assert.deepEqual(next[0], { time: '0-2s', shot: 'Pour', line: 'New start', options: ['x'], edited: true, purpose: 'hook' })
  assert.equal(next[1], shots[1])
  assert.equal(shots[0].line, 'old')
  assert.deepEqual(pickHook([], 'Go'), [{ time: '0-3s', shot: '', line: 'Go', purpose: 'hook', edited: true }])
  assert.equal(pickHook(shots, '   '), shots)
})

test('withHookOptions: the writer answer becomes shot 1 options and the picked line stays', () => {
  const shots = [{ time: '0-2s', shot: 'Pour', line: 'Mine', edited: true }, { time: '2-4s', shot: 'Stir' }]
  const next = withHookOptions(shots, { line: 'A', options: ['B', 'a', 'C', 'D'] })
  assert.equal(next[0].line, 'Mine')
  assert.equal(next[0].edited, true)
  assert.deepEqual(next[0].options, ['A', 'B', 'C', 'D'])
  assert.equal(next[1], shots[1])
  assert.equal(withHookOptions(shots, { options: [] }), shots)
  assert.deepEqual(withHookOptions([], { line: 'A' }), [])
})

test('captionless TikTok keeps its brand casing in subjects and sample openings', () => {
  const f = format({ short: 'TikTok video', name: 'TikTok video' })
  const v = { hook: 'TikTok video' }
  assert.equal(subjectOf(f, v), 'TikTok video')
  assert.equal(inLang('en', () => sampleHooks(f, v, client, 1))[0], 'Did you know TikTok video could look like this?')
  assert.equal(subjectOf(format({ short: 'TikTok recipes' }), video), 'TikTok recipes')
})

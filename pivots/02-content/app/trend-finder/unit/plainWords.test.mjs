import { test } from 'node:test'
import assert from 'node:assert/strict'
import { areas } from '../src/lib/i18n.ts'

// Beta testers (small businesses) did not understand these production terms.
const JARGON = /\b(hooks?|CTA|EDL|LUFS|payoff|b-?roll)\b/i
// Strings that only carry the {hook} data value (a video's first line) are not labels.
const VARIABLE_ONLY = /^[^A-Za-z]*\{hook\}/

test('no user-visible English label uses Hook, CTA, EDL, LUFS, payoff or B-roll', () => {
  const bad = []
  for (const [area, dict] of Object.entries(areas)) {
    for (const [key, value] of Object.entries(dict.en)) {
      if (typeof value !== 'string') continue
      const text = value.replace(/\{hook\}/g, '')
      if (JARGON.test(text) && !VARIABLE_ONLY.test(value)) bad.push(`${area}:${key} = ${value}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('the Traditional Chinese labels do not keep Hook, CTA, EDL or LUFS either', () => {
  const bad = []
  for (const [area, dict] of Object.entries(areas)) {
    for (const [key, value] of Object.entries(dict.zhHant)) {
      if (typeof value !== 'string') continue
      const text = value.replace(/\{hook\}/g, '')
      if (/\b(hooks?|CTA|EDL|LUFS)\b|鉤子/i.test(text)) bad.push(`${area}:${key} = ${value}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('shot purposes read as Opening, Middle and Ending ask', () => {
  assert.equal(areas.plan.en['plan.sb.purpose.hook'], 'Opening')
  assert.equal(areas.plan.en['plan.sb.purpose.body'], 'Middle')
  assert.equal(areas.plan.en['plan.sb.purpose.cta'], 'Call to action')
})

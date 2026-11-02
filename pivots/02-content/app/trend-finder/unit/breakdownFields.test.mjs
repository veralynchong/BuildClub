import { test } from 'node:test'
import assert from 'node:assert/strict'
import { areas } from '../src/lib/i18n.ts'

// The enums in backend/models.py (HookType, Emotion); each needs a label in both languages.
const hookTypes = ['visual', 'question_or_text', 'rage_bait', 'informative', 'challenge', 'other']
const emotions = ['curious', 'excited', 'craving', 'funny', 'angry_comment', 'relatable']

test('every hook type and emotion has an English and a zh-Hant label', () => {
  const { en, zhHant } = areas.find
  for (const key of [...hookTypes.map((h) => `find.hook.${h}.label`), ...emotions.map((e) => `find.emotion.${e}.label`)]) {
    assert.ok(en[key]?.trim(), `${key}: missing English label`)
    assert.ok(zhHant[key]?.trim(), `${key}: missing zh-Hant label`)
  }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HOOK_EMOTIONS, classifyHookEmotion, emotionKey, hookEmotion, isHookEmotion } from '../src/lib/hookEmotion.ts'
import { suggestedHooks } from '../src/lib/hooks.ts'
import { inLang, t } from '../src/lib/i18n.ts'

test('the three sample tofu hooks: Curiosity, Relief, FOMO / insider (as in the design)', () => {
  assert.equal(classifyHookEmotion('Did you know tofu hacks could look like this?'), 'curiosity')
  assert.equal(classifyHookEmotion('Watch this: tofu hacks, start to finish'), 'relief')
  assert.equal(classifyHookEmotion('3 things nobody tells you about tofu hacks'), 'insider')
})

test('each emotion has its hook patterns', () => {
  const cases = {
    curiosity: ['How we make 200 dumplings an hour', 'Why does this work?', 'What if you skipped the oven'],
    surprise: ['Wait for it…', "You won't believe what's inside", 'Plot twist: it is vegan'],
    relief: ['No tofu press needed', 'Crispy tofu without an air fryer', 'Finally, a fix for soggy tofu', 'Step by step: the whole recipe'],
    insider: ['The secret every chef knows', "What your barista won't tell you", 'No one tells you this about rent'],
    humour: ['lol this went sideways fast', 'The funny part is the ending', 'Dad jokes, but make it coffee'],
    desire: ['My dream kitchen tour', 'Obsessed with this latte', 'Craving this already', 'You will want this'],
    recognition: ['POV: you opened a cafe', 'When you forget the oat milk', 'Us when the oven timer goes off'],
    alarm: ['Stop rinsing your rice', 'Never do this with a cast iron pan', 'The mistake everyone makes', "Don't buy this blender", 'You have been doing tofu wrong'],
  }
  for (const [emotion, lines] of Object.entries(cases)) {
    for (const line of lines) assert.equal(classifyHookEmotion(line), emotion, line)
  }
})

test('specific phrases win over broad ones', () => {
  assert.equal(classifyHookEmotion("You won't believe how easy this is"), 'surprise', 'not Curiosity for "how"')
  assert.equal(classifyHookEmotion("You don't need a press for this"), 'relief', 'not Alarm for "don\'t"')
  assert.equal(classifyHookEmotion('The secret nobody tells you? Stop salting early'), 'insider')
  assert.equal(classifyHookEmotion('You won’t believe it'), 'surprise', 'curly apostrophe')
})

test('nothing matched, or empty: Curiosity', () => {
  assert.equal(classifyHookEmotion('Tofu, three ways'), 'curiosity')
  assert.equal(classifyHookEmotion(''), 'curiosity')
  assert.equal(classifyHookEmotion(undefined), 'curiosity')
})

test('Traditional Chinese hooks follow the same rules', () => {
  assert.equal(classifyHookEmotion('你知道豆腐也能這樣嗎？'), 'curiosity')
  assert.equal(classifyHookEmotion('看這個：豆腐，從頭到尾'), 'relief')
  assert.equal(classifyHookEmotion('關於豆腐，沒人告訴你的 3 件事'), 'insider')
  assert.equal(classifyHookEmotion('你的豆腐一直都做錯了'), 'alarm')
})

test('an explicit emotion on the hook wins; an unknown one is ignored', () => {
  assert.equal(hookEmotion({ text: 'Did you know?', emotion: 'humour' }), 'humour')
  assert.equal(hookEmotion({ text: 'Did you know?', emotion: 'angry' }), 'curiosity')
  assert.equal(hookEmotion({ text: 'Stop doing this' }), 'alarm')
  assert.ok(isHookEmotion('insider'))
  assert.ok(!isHookEmotion('curious'))
})

test('every emotion has a name in both languages', () => {
  assert.equal(HOOK_EMOTIONS.length, 8)
  for (const e of HOOK_EMOTIONS) {
    const key = emotionKey(e)
    assert.notEqual(t(key), key, `en name for ${e}`)
    assert.notEqual(inLang('zh-Hant', () => t(key)), key, `zh name for ${e}`)
  }
  assert.equal(t(emotionKey('insider')), 'FOMO / insider')
})

test('suggestedHooks: samples carry their emotion, the same in either language', () => {
  const format = { short: 'tofu hacks', name: 'Tofu hacks', why: { hook: '', first3s: '', length: '', format: '', sound: '' } }
  const video = { hook: 'x' }
  const client = { name: 'Evergreen Foods' }
  const en = suggestedHooks([], format, video, client)
  assert.deepEqual(en.map((h) => h.text), [
    'Did you know tofu hacks could look like this?',
    'Watch this: tofu hacks, start to finish',
    '3 things nobody tells you about tofu hacks',
  ])
  assert.deepEqual(en.map((h) => h.emotion), ['curiosity', 'relief', 'insider'])
  const zh = inLang('zh-Hant', () => suggestedHooks([], format, video, client))
  assert.deepEqual(zh.map((h) => h.emotion), ['curiosity', 'relief', 'insider'])
  const written = suggestedHooks([{ time: '', shot: '', options: ['Stop rinsing tofu'] }], format, video, client)
  assert.equal(written[0].emotion, undefined, 'written options are classified on screen, not stamped')
  assert.equal(hookEmotion(written[0]), 'alarm')
})

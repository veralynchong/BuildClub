import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildScript, draftScript, editScriptLine, makeScript, savedScript, scriptBasis, scriptOutOfDate, shotPhrase } from '../src/lib/script.ts'
import { inLang } from '../src/lib/i18n.ts'

const client = { name: 'Evergreen Foods' }
const shots = () => [
  { time: '0–2s', shot: 'Top-down: tofu cubes drop into hot oil', text: 'Crispy tofu in 5 min', line: 'Crispy tofu in five minutes?' },
  { time: '2–6s', shot: 'Close-up: cubes turning golden, tongs flipping' },
  { time: '6–10s', shot: 'Sauce poured over, quick toss in the pan.' },
  { time: '10–14s', shot: 'Plated, one piece pulled apart to show the crunch', text: 'Save this' },
]
const en = (fn) => inLang('en', fn)

test('shotPhrase: drops the camera note and the full stop, lower-cases a sentence start', () => {
  assert.equal(shotPhrase('Close-up: cubes turning golden'), 'cubes turning golden')
  assert.equal(shotPhrase('Sauce poured over.'), 'sauce poured over')
  assert.equal(shotPhrase('ASMR crunch'), 'ASMR crunch')
  assert.equal(shotPhrase('  '), '')
})

test('buildScript: one line per shot, the picked hook first, the shot list words kept', () => {
  const lines = en(() => buildScript({ shots: shots(), hook: 'Crispy tofu in five minutes?', client }))
  assert.equal(lines.length, 4)
  assert.deepEqual(lines[0], { say: 'Crispy tofu in five minutes?', onScreen: 'Crispy tofu in 5 min' })
  assert.equal(lines[1].say, 'First, cubes turning golden, tongs flipping.')
  assert.equal(lines[1].onScreen, '')
  assert.equal(lines[2].say, 'Then sauce poured over, quick toss in the pan.')
  assert.match(lines[3].say, /^Last, plated, one piece pulled apart to show the crunch\. Follow Evergreen Foods/)
  assert.equal(lines[3].onScreen, 'Save this')
})

test('buildScript: a shot\'s own line is kept word for word; the last shot gets a follow line on screen', () => {
  const s = shots()
  s[2].line = 'Pour it all over.'
  delete s[3].text
  const lines = en(() => buildScript({ shots: s, hook: 'Hi', client }))
  assert.equal(lines[2].say, 'Pour it all over.')
  assert.equal(lines[3].onScreen, 'Follow Evergreen Foods')
})

test('buildScript: no hook given falls back to shot 1\'s line, then to what it shows', () => {
  const s = shots()
  assert.equal(en(() => buildScript({ shots: s, hook: '', client }))[0].say, 'Crispy tofu in five minutes?')
  delete s[0].line
  assert.equal(en(() => buildScript({ shots: s, hook: ' ', client }))[0].say, 'Watch this: tofu cubes drop into hot oil.')
})

test('buildScript: a single shot is just the hook; no shots is no lines', () => {
  assert.deepEqual(en(() => buildScript({ shots: [{ time: '', shot: 'Bite' }], hook: 'Is it chicken?', client })), [{ say: 'Is it chicken?', onScreen: '' }])
  assert.deepEqual(buildScript({ shots: [], hook: 'x', client }), [])
})

test('buildScript: writes in the screen language', () => {
  const lines = inLang('zh-Hant', () => buildScript({ shots: shots(), hook: '五分鐘酥脆豆腐？', client }))
  assert.equal(lines[1].say, '首先，cubes turning golden, tongs flipping。')
  assert.match(lines[3].say, /追蹤 Evergreen Foods/)
})

test('scriptOutOfDate: what is filmed, the lines, on-screen words and order count; timing and camera do not', () => {
  const script = en(() => makeScript({ shots: shots(), hook: 'x', client }, 5))
  assert.equal(script.writtenAt, 5)
  assert.equal(scriptOutOfDate(script, shots()), false)
  const retimed = shots().map((s) => ({ ...s, time: '1s', framing: 'wide', id: 'a' }))
  assert.equal(scriptOutOfDate(script, retimed), false)
  const edited = shots()
  edited[1].shot = 'Close-up: golden cubes'
  assert.equal(scriptOutOfDate(script, edited), true)
  assert.equal(scriptOutOfDate(script, shots().slice(0, 3)), true)
  assert.equal(scriptOutOfDate(script, [shots()[1], shots()[0], ...shots().slice(2)]), true)
  const newHook = shots()
  newHook[0].line = 'Another hook'
  assert.equal(scriptOutOfDate(script, newHook), true)
  assert.equal(scriptBasis([{ shot: ' a  b ' }]), scriptBasis([{ shot: 'a b', line: '' }]))
})

test('editScriptLine: changes one line and marks the script as edited; a bad index changes nothing', () => {
  const script = en(() => makeScript({ shots: shots(), hook: 'x', client }))
  assert.equal(script.edited, undefined)
  const next = editScriptLine(script, 1, { say: 'My own words' })
  assert.equal(next.lines[1].say, 'My own words')
  assert.equal(next.lines[1].onScreen, script.lines[1].onScreen)
  assert.equal(next.edited, true)
  assert.equal(next.basedOn, script.basedOn)
  assert.equal(script.lines[1].say, 'First, cubes turning golden, tongs flipping.')
  assert.equal(editScriptLine(script, 9, { say: 'x' }), script)
})

test('draftScript: the in-browser writer until the backend has one', async () => {
  const s = await en(() => draftScript('idea-1', { shots: shots(), hook: 'Hook', client }))
  assert.equal(s.lines[0].say, 'Hook')
  assert.equal(scriptOutOfDate(s, shots()), false)
})

test('savedScript: old plans without a script and bad saved data are handled', () => {
  assert.equal(savedScript(undefined), null)
  assert.equal(savedScript(null), null)
  assert.equal(savedScript('x'), null)
  assert.equal(savedScript({ basedOn: 'x' }), null)
  assert.deepEqual(savedScript({ lines: [{ say: 'Hi' }, null] }), {
    lines: [{ say: 'Hi', onScreen: '' }, { say: '', onScreen: '' }],
    basedOn: '',
    edited: false,
    writtenAt: 0,
  })
})


test('native script calls the backend once, maps its lines and preserves on-screen text', async () => {
  const previous = globalThis.fetch, calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) })
    return new Response(JSON.stringify({ source: 'claude', shots: shots().map((shot, i) => ({ ...shot, line: `Written line ${i + 1}` })) }))
  }
  try {
    const result = await draftScript('native-plan', { shots: shots(), hook: 'Hook', client }, true, true)
    assert.deepEqual(calls, [{ url: '/api/ideas/native-plan/script', body: { force: true, expectedBasis: scriptBasis(shots()) } }])
    assert.equal(result.lines[1].say, 'Written line 2')
    assert.equal(result.lines[0].onScreen, 'Crispy tofu in 5 min')
    assert.equal(scriptOutOfDate(result, shots()), false)
  } finally { globalThis.fetch = previous }
})

test('native script rejects changed server shots and propagates errors instead of inventing an AI success', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Budget exceeded' }), { status: 429 })
    await assert.rejects(draftScript('i', { shots: shots(), hook: '', client }, true), /Budget exceeded/)
    globalThis.fetch = async () => new Response(JSON.stringify({ shots: shots().slice(1) }))
    await assert.rejects(draftScript('i', { shots: shots(), hook: '', client }, true))
    globalThis.fetch = async () => new Response(JSON.stringify({ shots: shots().map(shot => ({ ...shot, shot: 'Changed on the server' })) }))
    await assert.rejects(draftScript('i', { shots: shots(), hook: '', client }, true))
  } finally { globalThis.fetch = previous }
})

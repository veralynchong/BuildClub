import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyDraft, cameraLabels, looksLikeInterview, planEnd, setCamera, shiftTime, toPlanShot } from '../src/lib/shots.ts'
import { applyBreakdown } from '../src/lib/live.ts'
import { setActiveLang } from '../src/lib/i18n.ts'

const cam = { framing: 'close_up', angle: 'low', movement: 'push_in' }
const plan = () => [
  { time: '0-3s', shot: 'Pour' },
  { time: '3-8s', shot: 'Stir', ...cam },
]

test('cameraLabels lists the set fields in order and nothing for old shots', () => {
  setActiveLang('en')
  assert.deepEqual(cameraLabels(cam), ['Close-up', 'Low angle', 'Push in'])
  assert.deepEqual(cameraLabels({ angle: 'top_down' }), ['Top-down'])
  assert.deepEqual(cameraLabels({ time: '0-1s', shot: 'old' }), [])
})

test('labels follow the screen language', () => {
  setActiveLang('zh-Hant')
  assert.deepEqual(cameraLabels(cam), ['特寫', '低角度', '推進'])
  setActiveLang('en')
})

test('setCamera sets and clears one field and leaves the others', () => {
  const set = setCamera(plan(), 0, 'framing', 'wide')
  assert.equal(set[0].framing, 'wide')
  assert.equal(set[1].framing, 'close_up')
  const cleared = setCamera(set, 1, 'angle', '')
  assert.equal('angle' in cleared[1], false)
  assert.equal(cleared[1].movement, 'push_in')
})

test('looksLikeInterview reads the format name or concept', () => {
  assert.equal(looksLikeInterview('Street interview', undefined), true)
  assert.equal(looksLikeInterview('Taste test', 'Street interview asking about noodles'), true)
  assert.equal(looksLikeInterview('街訪'), true)
  assert.equal(looksLikeInterview('Recipe', undefined, 'Step by step'), false)
})

test('toPlanShot keeps the camera fields and the tip', () => {
  const s = toPlanShot({ time: '0-3s', shot: 'Bowl', text: 'Hi', tip: 'Steady', ...cam })
  assert.deepEqual(s, { time: '0-3s', shot: 'Bowl', text: 'Hi', tip: 'Steady', ...cam })
})

test('an interview draft becomes the question to ask, with the reaction to capture', () => {
  setActiveLang('en')
  const s = toPlanShot({ time: '0-5s', shot: 'Host asks', question: 'Where are noodles from?', reaction: 'Confident wrong answer', tip: 'Stay close', framing: 'medium' })
  assert.equal(s.shot, 'Ask: Where are noodles from?')
  assert.equal(s.tip, 'Capture: Confident wrong answer Stay close')
  assert.equal('question' in s, false)
  setActiveLang('zh-Hant')
  assert.equal(toPlanShot({ time: '0-5s', shot: 'x', question: 'Q' }).shot, '問： Q')
  setActiveLang('en')
})

test('shiftTime and planEnd read "a-bs" ranges and leave other text alone', () => {
  assert.equal(shiftTime('0-3s', 8), '8-11s')
  assert.equal(shiftTime('1.5-3s', 2), '3.5-5s')
  assert.equal(shiftTime('0-3s', 0), '0-3s')
  assert.equal(shiftTime('intro', 8), 'intro')
  assert.equal(planEnd([{ time: '0-3s' }, { time: '3-8s' }, { time: '' }]), 8)
  assert.equal(planEnd([{ time: 'later' }]), 0)
})

test('replace swaps the list; append keeps it and moves the new times after the old end', () => {
  const draft = [{ time: '0-4s', shot: 'A', ...cam }, { time: '4-6s', shot: 'B' }]
  const replaced = applyDraft(plan(), draft, 'replace')
  assert.deepEqual(replaced.map((s) => s.shot), ['A', 'B'])
  const appended = applyDraft(plan(), draft, 'append')
  assert.deepEqual(appended.map((s) => s.shot), ['Pour', 'Stir', 'A', 'B'])
  assert.deepEqual(appended.map((s) => s.time), ['0-3s', '3-8s', '8-12s', '12-14s'])
  assert.equal(appended[2].framing, 'close_up')
  assert.equal(appended[1].framing, 'close_up')
})

test('applyDraft does not touch the plan it was given', () => {
  const before = plan()
  applyDraft(before, [{ time: '0-1s', shot: 'X' }], 'append')
  assert.deepEqual(before, plan())
})

test('a breakdown carries the camera fields into the format, so a plan copy keeps them', () => {
  const b = { shotList: [{ time: '0-2s', shot: 'tofu', tip: 'Hold', ...cam }], why: {}, props: [], editorNotes: '', lines: [], needs: [] }
  const f = applyBreakdown({ id: 'f', shotList: [] }, b)
  assert.deepEqual(f.shotList[0], { time: '0-2s', shot: 'tofu', tip: 'Hold', ...cam })
  assert.deepEqual(f.shotList.map((sh) => ({ ...sh }))[0].framing, 'close_up')
})

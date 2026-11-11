import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixCaptions, flatItems, GAP_MIN, isFiller, itemAt, REACH, selectionCuts, selectionLabel, setWordFix, transcriptGroups, wordKey } from '../src/lib/editor/transcript.ts'
import { speechCaptions } from '../src/lib/editor/captions.ts'
import { withSpeechCaptions } from '../src/lib/editor/aiEdit.ts'

const w = (text, start, end) => ({ text, start, end })
const clip = (id, take, inn, out) => ({ id, source: { kind: 'take', id: take }, in: inn, out, volume: 1, muted: false })
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)
const project = (clips, extra = {}) => ({ fps: 30, width: 1080, height: 1920, clips, texts: [], captions: { enabled: true }, music: null, voiceover: [], primaries: {}, showLogo: false, logoSize: 'medium', logoCorner: 'top-right', ...extra })

// Take t1: "So um boil the water." with a 1 s pause after "boil"
const T1 = { status: 'ok', words: [w('So', 0.5, 0.8), w('um', 0.8, 1.1), w('boil', 1.1, 1.4), w('the', 2.4, 2.6), w('water.', 2.6, 3.0)] }

test('transcriptGroups: words map through the trim and the clip place, words cut away are not shown', () => {
  // t1 trimmed to 0.9-3.0 after a 2 s clip of t2 ("So" is cut away; "um" has its middle inside)
  const p = project([clip('a', 't2', 0, 2), clip('b', 't1', 0.9, 3.0)])
  const [ga, gb] = transcriptGroups(p, { t1: T1, t2: { status: 'none', words: [] } })
  assert.equal(ga.state, 'none')
  assert.deepEqual(gb.items.filter((x) => x.kind === 'word').map((x) => x.text), ['um', 'boil', 'the', 'water.'])
  const boil = gb.items.find((x) => x.text === 'boil')
  near(boil.from, 2 + 0.2)
  near(boil.to, 2 + 0.5)
  assert.equal(boil.key, wordKey('t1', 1.1))
  // "um" starts before the trim: its time is held at the clip start
  near(gb.items[0].from, 2)
})

test('transcriptGroups: pauses of GAP_MIN or more show as gap items, at the clip edges too', () => {
  const [g] = transcriptGroups(project([clip('b', 't1', 0, 4)]), { t1: T1 })
  const gaps = g.items.filter((x) => x.kind === 'gap').map((x) => [+x.takeFrom.toFixed(3), +x.takeTo.toFixed(3)])
  assert.deepEqual(gaps, [[0, 0.5], [1.4, 2.4], [3, 4]])
  assert.ok(GAP_MIN <= 0.5)
})

test('transcriptGroups: split clips each show their own words; pending, AI video and fixes', () => {
  const p = project([clip('a', 't1', 0, 1.3), clip('b', 't1', 1.3, 3.0), { ...clip('g', 'x', 0, 1), source: { kind: 'generation', id: 'g1' } }, clip('c', 't9', 0, 1)])
  const gs = transcriptGroups(p, { t1: T1 }, { [wordKey('t1', 2.6)]: 'water!' })
  assert.deepEqual(gs[0].items.filter((x) => x.kind === 'word').map((x) => x.text), ['So', 'um', 'boil'])
  assert.deepEqual(gs[1].items.filter((x) => x.kind === 'word').map((x) => x.text), ['the', 'water!'])
  assert.equal(gs[1].items.at(-1).original, 'water.')
  assert.deepEqual(gs.slice(2).map((g) => g.state), ['generation', 'pending'])
  assert.equal(transcriptGroups(project([clip('a', 't1', 0, 1)]), { t1: { status: 'unavailable', words: [] } })[0].state, 'unavailable')
})

test('isFiller: the backend list, and "like" only when set off with a comma', () => {
  const ws = [w('Um,', 0, 1), w('I', 1, 2), w('was,', 2, 3), w('like', 3, 4), w('things', 4, 5), w('like', 5, 6)]
  assert.deepEqual(ws.map((_, i) => isFiller(ws, i)), [true, false, false, true, false, false])
})

test('itemAt: the word or pause under the playhead', () => {
  const gs = transcriptGroups(project([clip('a', 't1', 0, 4)]), { t1: T1 })
  assert.equal(itemAt(gs, 1.2), wordKey('t1', 1.1))
  assert.equal(itemAt(gs, 1.8), 'a:gap:1400')
  assert.equal(itemAt(gs, 9), null)
})

test('selectionCuts: a word run reaches into the quiet beside it, never into a word that stays', () => {
  const gs = transcriptGroups(project([clip('a', 't1', 0, 4)]), { t1: T1 })
  const flat = flatItems(gs)
  const at = (text) => flat.findIndex((f) => f.item.text === text)
  // "the": a 1 s pause before it, "water." right after it
  const [c1] = selectionCuts(gs, at('the'), at('the'))
  near(c1.from, 2.4 - REACH)
  near(c1.to, 2.6)
  assert.equal(c1.whole, false)
  // "um" .. "boil": "So" right before, the pause after
  const [c2] = selectionCuts(gs, at('boil'), at('um'))
  near(c2.from, 0.8)
  near(c2.to, 1.4 + REACH)
  // a pause pill alone: exactly the pause (the clean-up keeps its air)
  const gap = flat.findIndex((f) => f.item.key === 'a:gap:1400')
  const [c3] = selectionCuts(gs, gap, gap)
  assert.deepEqual([c3.from, c3.to], [1.4, 2.4])
  // the first item reaches the clip start
  assert.equal(selectionCuts(gs, 0, 1)[0].from, 0)
})

test('selectionCuts: a run across clips cuts the end of one, all of the middle and the start of the next', () => {
  const p = project([clip('a', 't1', 0, 1.25), clip('b', 't2', 0, 2), clip('c', 't1', 2.2, 4)])
  const gs = transcriptGroups(p, { t1: T1, t2: { status: 'ok', words: [w('hi', 0.2, 0.6)] } })
  const flat = flatItems(gs)
  const lo = flat.findIndex((f) => f.item.text === 'boil')
  const hi = flat.findIndex((f) => f.item.text === 'the')
  const cuts = selectionCuts(gs, lo, hi)
  assert.deepEqual(cuts.map((c) => [c.clipId, c.whole]), [['a', false], ['b', true], ['c', false]])
  assert.equal(cuts[0].to, 1.25) // to the end of clip a
  assert.equal(cuts[2].from, 2.2) // from the start of clip c
  near(cuts[2].to, 2.6)
  assert.deepEqual(selectionLabel(gs, lo, hi), { text: 'boil hi the', gap: null })
})

test('selectionLabel: a pause alone is named by its length', () => {
  const gs = transcriptGroups(project([clip('a', 't1', 0, 4)]), { t1: T1 })
  const gap = flatItems(gs).findIndex((f) => f.item.key === 'a:gap:1400')
  const got = selectionLabel(gs, gap, gap)
  near(got.gap, 1)
})

// ---- corrections and caption word timing ----

const line = () => ({ id: 'sp1', start: 0, end: 1, text: 'boil the water.', words: [
  { text: 'boil', start: 0, end: 0.3, key: 't1:1100' }, { text: 'the', start: 0.6, end: 0.7, key: 't1:2400' }, { text: 'water.', start: 0.7, end: 1, key: 't1:2600' }] })

test('setWordFix: the correction is kept and the speech caption holding the word reads it, timing untouched', () => {
  const p = project([clip('a', 't1', 0, 4)], { captions: { enabled: true, source: 'speech', speech: [line()] } })
  const next = setWordFix(p, 't1:2600', 'tea.', 'water.')
  assert.deepEqual(next.transcriptFixes, { 't1:2600': 'tea.' })
  const e = next.captions.speech[0]
  assert.equal(e.text, 'boil the tea.')
  assert.deepEqual(e.words.map((x) => [x.text, x.start, x.end]), [['boil', 0, 0.3], ['the', 0.6, 0.7], ['tea.', 0.7, 1]])
  assert.deepEqual([e.start, e.end], [0, 1])
  // back to what was said: the correction goes
  const back = setWordFix(next, 't1:2600', 'water.', 'water.')
  assert.deepEqual(back.transcriptFixes, {})
  assert.equal(back.captions.speech[0].text, 'boil the water.')
})

test('setWordFix: a line edited by hand gets the word replaced where it is found', () => {
  const edited = { ...line(), text: 'Boil the water!' }
  const [e] = fixCaptions([edited], { 't1:1100': 'Heat' })
  assert.equal(e.text, 'Boil the water!') // "boil" is not in the edited text as written
  const [e2] = fixCaptions([edited], { 't1:2400': 'some' })
  assert.equal(e2.text, 'Boil some water!')
})

test('withSpeechCaptions: corrections made before the captions apply to them when they are made', () => {
  const p = project([clip('a', 't1', 0, 4)], { transcriptFixes: { 't1:2400': 'a' } })
  assert.equal(withSpeechCaptions(p, [line()]).captions.speech[0].text, 'boil a water.')
})

test('speechCaptions: words show at the times they were said while the line reads as its words', () => {
  const caps = speechCaptions([line()], 10)
  assert.deepEqual(caps.map((c) => [c.text, c.startMs, c.endMs]), [['boil', 0, 300], [' the', 600, 700], [' water.', 700, 1000]])
  assert.equal(caps.at(-1).pageBreakAfter, true)
  // edited by hand: the words share the line by width, as before
  const spread = speechCaptions([{ ...line(), text: 'boil it' }], 10)
  assert.deepEqual(spread.map((c) => [c.text, c.startMs, c.endMs]), [['boil', 0, 667], [' it', 667, 1000]])
  // no words (made before word timing): spread too
  assert.equal(speechCaptions([{ id: 'x', start: 0, end: 1, text: 'a b' }], 10).length, 2)
  // a word past the end of the video is held at the end
  const short = speechCaptions([line()], 0.65)
  assert.ok(short.every((c) => c.endMs <= 650))
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { speechCaptions, projectPages, captionMode } from '../src/lib/editor/captions.ts'
import { nextClipId, previewFrame, replaceWithRanges, setClipRange, speechKey, stamp, swapTake, withSpeechCaptions, MAX_CLIPS } from '../src/lib/editor/aiEdit.ts'
import { EDITOR_TABS, tabsDone } from '../src/lib/editor/steps.ts'

const take = (id, shotId) => ({ kind: 'take', id, shotId })
const clip = (id, source, inn, out, extra = {}) => ({ id, source, in: inn, out, volume: 1, muted: false, ...extra })
const project = (clips, captions = { enabled: true }) => ({
  fps: 30, width: 1080, height: 1920, clips, texts: [], captions, music: null, voiceover: [], primaries: {}, showLogo: false, logoSize: 'medium', logoCorner: 'top-right',
})
const total = (p) => p.clips.reduce((n, c) => n + c.out - c.in, 0)

test('replaceWithRanges: one clip per kept range, same take, first keeps the id and the shot caption', () => {
  const p = project([clip('c1', take('t1', 's1'), 0, 10, { caption: 'hello', fit: 'fit', volume: 0.5 }), clip('c2', take('t2', 's2'), 0, 3)])
  const next = replaceWithRanges(p, 'c1', [[0, 2], [5, 7.5], [9, 10]], nextClipId)
  assert.deepEqual(next.clips.map((c) => [c.id, c.in, c.out]), [['c1', 0, 2], ['c3', 5, 7.5], ['c4', 9, 10], ['c2', 0, 3]])
  assert.equal(next.clips[0].caption, 'hello')
  assert.equal(next.clips[1].caption, undefined)
  assert.ok(next.clips.slice(0, 3).every((c) => c.source.id === 't1' && c.fit === 'fit' && c.volume === 0.5))
  assert.ok(total(next) < total(p))
  assert.equal(p.clips[0].out, 10, 'the input is not changed')
})

test('replaceWithRanges: no ranges, an unknown clip or too many clips leave the project alone', () => {
  const p = project([clip('c1', take('t1', 's1'), 0, 10)])
  assert.equal(replaceWithRanges(p, 'c1', [], nextClipId), p)
  assert.equal(replaceWithRanges(p, 'zzz', [[0, 1]], nextClipId), p)
  const many = Array.from({ length: MAX_CLIPS + 1 }, (_, i) => [i, i + 0.5])
  assert.equal(replaceWithRanges(p, 'c1', many, nextClipId), p)
})

test('ranges land on whole frames', () => {
  const p = project([clip('c1', take('t1', 's1'), 0, 10)])
  const next = replaceWithRanges(p, 'c1', [[0.0333, 1.0], [2.01, 3.0]], nextClipId)
  assert.deepEqual(next.clips.map((c) => [c.in, c.out]), [[1 / 30, 1], [2.0, 3]])
})

test('setClipRange trims to the line, within the video and the minimum length', () => {
  const p = project([clip('c1', take('t1', 's1'), 0, 8)])
  assert.deepEqual(setClipRange(p, 'c1', 4.4, 6.4, 8).clips[0], { ...p.clips[0], in: 4.4, out: 6.4 })
  assert.equal(setClipRange(p, 'c1', 4.4, 9, 8).clips[0].out, 8) // cut to the video
  assert.equal(setClipRange(p, 'c1', 1, 1.1, 8), p) // under 0.2 s
  assert.equal(setClipRange(p, 'c1', 0, 8, 8), p) // unchanged
  assert.equal(setClipRange(p, 'nope', 1, 2, 8), p)
})

test('swapTake keeps the slot, drops the other pieces and re-pins the shot', () => {
  const a = take('t1', 's1')
  const p = { ...project([clip('c1', a, 0, 2), clip('c2', a, 3, 5), clip('c3', take('x', 's2'), 0, 4)]), primaries: { s1: a } }
  const next = swapTake(p, 'c2', take('t9', 's1'), 6, { in: 1, out: 3 })
  assert.deepEqual(next.clips.map((c) => [c.id, c.source.id, c.in, c.out]), [["c2", "t9", 1, 3], ['c3', 'x', 0, 4]])
  assert.equal(next.primaries.s1.id, 't9')
  const whole = swapTake(p, 'c1', take('t9', 's1'), 6, { in: null, out: null })
  assert.deepEqual([whole.clips[0].in, whole.clips[0].out], [0, 6])
  assert.equal(swapTake(p, 'nope', take('t9', 's1'), 6, { in: 0, out: 1 }), p)
})

test('previewFrame is the timeline frame of a moment in the clip', () => {
  const p = project([clip('c1', take('t1', 's1'), 0, 2), clip('c2', take('t2', 's2'), 4, 8)])
  assert.equal(previewFrame(p, 'c2', 5), 90) // clip starts at 2 s, 1 s into it
  assert.equal(previewFrame(p, 'c2', 1), 60) // before the trim: the clip's start
  assert.equal(previewFrame(p, 'zzz', 1), null)
})

test('speech captions: each line is a page; words share the line time', () => {
  const caps = speechCaptions([{ id: 'sp1', start: 0, end: 1, text: 'First boil' }, { id: 'sp2', start: 1.5, end: 2.5, text: 'the water.' }], 10)
  assert.deepEqual(caps.map((c) => [c.text, c.startMs, c.endMs]), [['First', 0, 556], [' boil', 556, 1000], ['the', 1500, 1833], [' water.', 1833, 2500]]) // a word's share of its line is its width
  assert.deepEqual(caps.map((c) => !!c.pageBreakAfter), [false, true, false, true])
})

test('speech captions stop at the end of the video and skip empty lines', () => {
  const caps = speechCaptions([{ id: 'a', start: 0, end: 1, text: '  ' }, { id: 'b', start: 9, end: 12, text: 'late' }, { id: 'c', start: 11, end: 12, text: 'past' }], 10)
  assert.deepEqual(caps.map((c) => [c.text, c.endMs]), [['late', 10000]])
})

test('projectPages follows the speech lines once the source is speech, and not before', () => {
  const entries = [{ id: 'sp1', start: 0, end: 1, text: 'hello there' }]
  const p = project([clip('c1', take('t1', 's1'), 0, 5)], { enabled: true, source: 'speech', speech: entries })
  assert.equal(captionMode(p, {}), 'speech')
  assert.deepEqual(projectPages(p, { s1: 'script line' }, {}).map((g) => g.text.trim()), ['hello there'])
  assert.deepEqual(projectPages({ ...p, captions: { enabled: true, source: 'lines', speech: entries } }, { s1: 'script' }, {}).map((g) => g.text.trim()), ['script'])
  assert.deepEqual(projectPages({ ...p, captions: { ...p.captions, enabled: false } }, {}, {}), [])
  assert.deepEqual(projectPages({ ...p, captions: { enabled: true, source: 'speech' } }, { s1: 'script' }, {}), [])
})

test('withSpeechCaptions turns captions on and remembers which clips they were made for', () => {
  const p = project([clip('c1', take('t1', 's1'), 0, 5)], { enabled: false })
  const next = withSpeechCaptions(p, [{ id: 'sp1', start: 0, end: 1, text: 'hi' }])
  assert.equal(next.captions.enabled, true)
  assert.equal(next.captions.source, 'speech')
  assert.equal(next.captions.speechKey, speechKey(p))
  const moved = { ...next, clips: [{ ...next.clips[0], out: 4 }] }
  assert.notEqual(speechKey(moved), next.captions.speechKey)
})

test('the AI tab exists and is never ticked', () => {
  assert.ok(EDITOR_TABS.includes('ai'))
  const facts = { project: project([clip('c1', take('t1', 's1'), 0, 5)]), clientHasLogo: false, cut: null, texts: 0, voices: 0, music: false }
  assert.equal(tabsDone(facts, new Set(['ai'])).ai, false)
})

test('stamp formats minutes and tenths', () => {
  assert.equal(stamp(4.25), '0:04.3')
  assert.equal(stamp(65.04), '1:05.0')
})

test('applyRewrites: only the picked speech lines change, and nothing picked returns the same project', async () => {
  const { applyRewrites } = await import('../src/lib/editor/aiEdit.ts')
  const speech = [{ id: 'sp1', start: 0, end: 1, text: 'so um the tofu' }, { id: 'sp2', start: 1, end: 2, text: 'is crispy' }]
  const p = project([clip('c1', take('t1', 's1'), 0, 5)], { enabled: true, source: 'speech', speech })
  const next = applyRewrites(p, [{ id: 'sp1', after: 'the tofu' }, { id: 'nope', after: 'x' }])
  assert.deepEqual(next.captions.speech.map((e) => e.text), ['the tofu', 'is crispy'])
  assert.equal(next.captions.source, 'speech')
  assert.equal(applyRewrites(p, [{ id: 'nope', after: 'x' }]), p)
  assert.equal(applyRewrites(p, [{ id: 'sp2', after: 'is crispy' }]), p)
  assert.equal(applyRewrites(project([]), [{ id: 'sp1', after: 'x' }]).captions.speech, undefined)
})

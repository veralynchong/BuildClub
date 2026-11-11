import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clipMarks, filmTiles, groupPins, LEFTOVER, peaksFromSamples, peaksSpan, waveformPath } from '../src/lib/editor/marks.ts'

const clip = (inn, out) => ({ in: inn, out, source: { kind: 'take', id: 'tk' } })
const item = (id, start, end, type = 'silence') => ({ id, type, start, end, label: id, reason: '' })
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('clipMarks: take seconds map through the trim and the clip place on the timeline', () => {
  // the clip shows 2-6 s of its take and starts 10 s into the timeline
  const marks = clipMarks(clip(2, 6), 10, [item('a', 3, 3.5), item('b', 0.2, 1), item('c', 7, 8)])
  assert.deepEqual(marks.map((m) => m.key), ['tk:a'])
  near(marks[0].from, 11)
  near(marks[0].to, 11.5)
})

test('clipMarks: only the part inside the clip shows, and dismissed ones are left out', () => {
  const items = [item('a', 1, 3), item('b', 5, 7.5), item('c', 4, 4.4, 'filler')]
  const marks = clipMarks(clip(2, 6), 0, items, new Set(['tk:c']))
  assert.deepEqual(marks.map((m) => [m.key, +m.from.toFixed(3), +m.to.toFixed(3)]), [['tk:a', 0, 1], ['tk:b', 3, 4]])
})

test('clipMarks: the air an applied cut leaves at a piece edge is not offered again', () => {
  // the AI tab cut 3-4 s with 4 frames of air: pieces 2-3.133 and 3.867-6
  const items = [item('s', 3, 4)]
  assert.equal(clipMarks(clip(2, 3 + 4 / 30), 0, items).length, 0)
  assert.equal(clipMarks(clip(3.867, 6), 5, items).length, 0)
  // a short suggestion wholly inside the clip still shows
  assert.equal(clipMarks(clip(2, 6), 0, [item('f', 3, 3 + LEFTOVER / 2, 'filler')]).length, 1)
  // a long one trimmed half away still shows its visible half
  assert.equal(clipMarks(clip(2, 6), 0, [item('r', 5, 9, 'retake')]).length, 1)
})

test('peaksSpan: slices the trimmed span into columns, loudest per column, silence past the data', () => {
  const peaks = { rate: 10, values: [0, 0.1, 0.2, 0.9, 0.3, 0.3, 0.5, 0, 0, 1] }
  assert.deepEqual(peaksSpan(peaks, 0.2, 0.6, 2), [0.9, 0.3])
  assert.deepEqual(peaksSpan(peaks, 0.8, 1.6, 2), [1, 0])
  assert.deepEqual(peaksSpan(peaks, 0, 1, 0), [])
  assert.deepEqual(peaksSpan(peaks, 1, 1, 3), [0, 0, 0])
})

test('waveformPath: one closed path, scaled by volume and kept in the box', () => {
  const d = waveformPath([0.5, 1], 1)
  assert.ok(d.startsWith('M0,50 L') && d.endsWith('Z'))
  assert.ok(d.includes('0,25.0 1,25.0') && d.includes('1,0.0 2,0.0'))
  assert.ok(waveformPath([1], 2).includes('0,0.0'), 'never past the top')
  assert.ok(waveformPath([0.5], 0).includes('49.4'), 'a muted clip draws a hairline')
  assert.equal(waveformPath([]), '')
})

test('peaksFromSamples: buckets decoded samples', () => {
  const s = new Float32Array([0.1, -0.8, 0.2, 0.05, 0, 0.5])
  assert.deepEqual(peaksFromSamples(s, 4, 2), { rate: 2, values: [0.8, 0.2, 0.5] })
})

test('filmTiles: tiles cover the clip and pick the thumbnail nearest each tile', () => {
  const times = [0.5, 1.5, 2.5, 3.5]
  const tiles = filmTiles(times, 2, 4, 100, 40) // 2-4 s of the take over 100 px
  assert.deepEqual(tiles.map((x) => [x.left, x.width]), [[0, 40], [40, 40], [80, 20]])
  assert.deepEqual(tiles.map((x) => x.n), [2, 3, 3])
  assert.deepEqual(filmTiles([], 0, 1, 100, 40), [])
})

test('groupPins: lines about the same moment share a pin; a cut marks it', () => {
  const pins = groupPins([{ at: 0, text: 'picked', kind: 'pick' }, { at: 0.01, text: 'trimmed', kind: 'trim' }, { at: 3.2, text: 'cut um', kind: 'cut' }])
  assert.deepEqual(pins, [{ at: 0, lines: ['picked', 'trimmed'], cut: false }, { at: 3.2, lines: ['cut um'], cut: true }])
})

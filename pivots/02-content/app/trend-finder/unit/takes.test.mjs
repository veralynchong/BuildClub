import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_TAKE_BYTES,
  canClean,
  canEdit,
  checkFile,
  checklistProgress,
  cutSeconds,
  formatSize,
  isNothingToCut,
  takesByShot,
  uploadTake,
  videoType,
} from '../src/lib/takes.ts'

test('videoType falls back to the extension when the browser gives no type', () => {
  assert.equal(videoType({ name: 'IMG_1.MOV', type: '' }), 'video/quicktime')
  assert.equal(videoType({ name: 'a.mp4', type: '' }), 'video/mp4')
  assert.equal(videoType({ name: 'a.mp4', type: 'video/mp4' }), 'video/mp4')
  assert.equal(videoType({ name: 'a.webm', type: 'video/webm' }), 'video/webm')
  assert.equal(videoType({ name: 'a.m4v', type: '' }), 'video/x-m4v')
  assert.equal(videoType({ name: 'a.avi', type: 'video/x-msvideo' }), null)
  assert.equal(videoType({ name: 'notes.txt', type: '' }), null)
})

test('checkFile rejects big and non-video files with the server copy', () => {
  assert.equal(checkFile({ name: 'a.mp4', type: 'video/mp4', size: MAX_TAKE_BYTES + 1 }), 'The file is over the 200 MB limit.')
  assert.equal(checkFile({ name: 'a.txt', type: 'text/plain', size: 10 }), 'Upload an .mp4, .mov, .m4v or .webm video file.')
  assert.equal(checkFile({ name: 'a.mov', type: 'video/quicktime', size: 10 }), null)
  assert.equal(checkFile({ name: 'a.mp4', type: 'video/mp4', size: MAX_TAKE_BYTES }), null)
})

test('checklistProgress counts current shots with a chosen take and ignores takes past the last shot', () => {
  const t = (shot, chosen) => ({ id: `${shot}${chosen}`, shot, chosen })
  assert.deepEqual(checklistProgress(2, [t(0, true), t(1, false), t(3, true)]), { done: 1, total: 2 })
  assert.deepEqual(checklistProgress(0, []), { done: 0, total: 0 })
})

test('takesByShot groups by shot and drops out-of-range ones', () => {
  const t = (id, shot) => ({ id, shot })
  assert.deepEqual(
    takesByShot([t('a', 1), t('b', 0), t('c', 5), t('d', 1)], 2).map((g) => g.map((x) => x.id)),
    [['b'], ['a', 'd']],
  )
})

test('takesByShot leaves out takes whose shot was removed (shot null)', () => {
  const t = (id, shot) => ({ id, shot, shotId: shot === null ? 'gone' : `s${shot}` })
  assert.deepEqual(
    takesByShot([t('a', 0), t('b', null)], 2).map((g) => g.map((x) => x.id)),
    [['a'], []],
  )
})

test('formatSize', () => {
  assert.equal(formatSize(0), '0 B')
  assert.equal(formatSize(1536), '1.5 KB')
  assert.equal(formatSize(52_428_800), '50 MB')
})

test('canEdit only for approved', () => {
  assert.equal(canEdit('approved'), true)
  for (const s of ['saved', 'waiting', 'rejected']) assert.equal(canEdit(s), false)
})

test('uploadTake sends the raw file with its type and encoded name', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'IMG 1.MOV', { type: '' })
  let seen
  globalThis.fetch = async (url, init) => {
    seen = { url, init }
    return { ok: true, status: 200, json: async () => ({ id: 't1' }) }
  }
  assert.deepEqual(await uploadTake('i/a', 2, file), { id: 't1' })
  assert.equal(seen.url, '/api/ideas/i%2Fa/shots/2/takes')
  assert.equal(seen.init.method, 'POST')
  assert.equal(seen.init.body, file)
  assert.equal(seen.init.headers['content-type'], 'video/quicktime')
  assert.equal(seen.init.headers['x-filename'], 'IMG%201.MOV')
})

test('uploadTake surfaces the server error', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'Only an approved plan can take footage.' }) })
  const file = new File([new Uint8Array([1])], 'a.mp4', { type: 'video/mp4' })
  await assert.rejects(uploadTake('ia', 0, file), { message: 'Only an approved plan can take footage.' })
})

test('canClean: only an original take with no cleaned version yet', () => {
  const orig = { id: 'a', cleanedFrom: null }
  const cleaned = { id: 'b', cleanedFrom: 'a' }
  assert.equal(canClean(orig, [orig]), true)
  assert.equal(canClean(cleaned, [orig, cleaned]), false)
  assert.equal(canClean(orig, [orig, cleaned]), false)
})

test('cutSeconds: seconds cut by a clean-up, one decimal, never negative', () => {
  assert.equal(cutSeconds({ originalSec: 4.35, cleanSec: 2.33 }), '2.0')
  assert.equal(cutSeconds({ originalSec: 3, cleanSec: 3.2 }), '0.0')
})

test('isNothingToCut: only the "no speech" and "no fillers" refusals are results, not errors', () => {
  assert.equal(isNothingToCut('No speech was found in this take, so nothing was cut.'), true)
  assert.equal(isNothingToCut('This take has no fillers or long pauses to cut.'), true)
  assert.equal(isNothingToCut('This take has no sound, so there is nothing to clean.'), false)
  assert.equal(isNothingToCut(undefined), false)
})

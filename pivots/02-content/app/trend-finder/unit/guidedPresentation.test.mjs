import { test } from 'node:test'
import assert from 'node:assert/strict'
import { presentPreparedVideo, presentPreparedResearch } from '../src/lib/guided/presentation.ts'
import { GUIDED_IDS } from '../src/lib/guided/contracts.ts'
import { outlierScore, shareSaveRate, viewsPerDay } from '../src/lib/metrics.ts'

test('prepared views stay consistent across video metrics and an older missing Research row', () => {
  const original = { id: GUIDED_IDS.videoId, views: 0, followers: 0, platform: 'instagram' }
  const video = presentPreparedVideo(original)
  const row = presentPreparedResearch({ videoId: original.id, views: 0, followers: 0, notes: 'Keep my notes' })
  assert.equal(row.views, video.views)
  assert.equal(row.followers, video.followers)
  assert.equal(row.notes, 'Keep my notes')
  assert.ok(outlierScore(video) > 1)
  assert.ok(shareSaveRate(video) > 0)
  assert.equal(viewsPerDay(video), video.views / 7)
  assert.equal(original.views, 0)
})

test('presentation leaves unrelated records and user-entered Research counts unchanged', () => {
  const other = { id: 'other', videoId: 'other', views: 0, followers: 0 }
  assert.equal(presentPreparedVideo(other), other)
  assert.equal(presentPreparedResearch(other), other)
  const edited = { videoId: GUIDED_IDS.videoId, views: 123, followers: 456 }
  assert.equal(presentPreparedResearch(edited), edited)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { INSTAGRAM_PREVIEWS, INSTAGRAM_UNAVAILABLE, instagramPlayback, instagramUnavailable } from '../src/lib/guided/instagramAssets.ts'

test('cached Instagram playback requires the same source URL and video identity', () => {
 for(const clip of INSTAGRAM_PREVIEWS){
  assert.equal(instagramPlayback({id:clip.videoId,url:clip.sourceUrl}),clip.path)
  assert.equal(instagramPlayback({id:'other',url:clip.sourceUrl}),undefined)
  assert.equal(instagramPlayback({id:clip.videoId,url:'https://www.instagram.com/p/other/'}),undefined)
 }
})
test('every preview is a real non-empty media file with its recorded hash', () => {
 assert.ok(INSTAGRAM_PREVIEWS.length>0)
 for(const clip of INSTAGRAM_PREVIEWS){
  assert.ok(clip.duration>0 && clip.bytes>0 && clip.width>0 && clip.height>0)
  const media=readFileSync(new URL('../public'+clip.path,import.meta.url))
  assert.equal(media.length,clip.bytes)
  assert.equal(createHash('sha256').update(media).digest('hex'),clip.sha256)
 }
})

test('restricted posts never receive another reference’s preview', () => {
 for(const clip of INSTAGRAM_UNAVAILABLE){
  const video={id:clip.videoId,url:clip.sourceUrl}
  assert.equal(instagramPlayback(video),undefined)
  assert.equal(instagramUnavailable(video),true)
  assert.equal(instagramUnavailable({...video,id:'other'}),false)
 }
})

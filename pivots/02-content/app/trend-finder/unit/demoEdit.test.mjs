import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDemoEditDraft, parseDemoEditDraft, validateDemoEditDraft, demoEditKey, demoSources, withDemoProject, observeDemoMetadata } from '../src/lib/demo/editDraft.ts'
import { trimClip, splitAt, moveClip, setClipAudio, reelDurationInFrames, sourceKey } from '../src/lib/editor/timeline.ts'

const ai = 'prepared-source-derived-cut'
const high = 'shoot-high-angle-video'
const macro = 'shoot-low-macro-video'
const metadata = {
  [ai]: { duration: 10.517, width: 1080, height: 1920 },
  [high]: { duration: 5.875, width: 768, height: 1366 },
  [macro]: { duration: 5.875, width: 768, height: 1366 },
}
const clone = value => structuredClone(value)

test('AI uses one allowlisted real source split cumulatively into 21 clips and 315 frames', () => {
  const draft = createDemoEditDraft('ai', ai, metadata)
  assert.ok(draft)
  assert.equal(draft.project.clips.length, 21)
  assert.equal(reelDurationInFrames(draft.project), 315)
  assert.deepEqual([draft.project.width, draft.project.height, draft.project.fps], [1080, 1920, 30])
  draft.project.clips.forEach((clip, i) => {
    assert.equal(sourceKey(clip.source), `generation:${ai}`)
    assert.equal(clip.source.shotId, `s${i + 1}`)
    if (i) assert.equal(clip.in, draft.project.clips[i - 1].out)
  })
})

test('shoot sources and storage are separate from AI and route selection is explicit', () => {
  for (const id of [high, macro]) {
    const draft = createDemoEditDraft('shoot', id, metadata)
    assert.equal(draft.project.clips.length, 1)
    assert.equal(draft.project.clips[0].source.id, id)
    assert.ok(draft.project.clips[0].out <= metadata[id].duration)
  }
  assert.equal(demoEditKey('shoot'), 'buildclub:demo:edit:shoot:v1')
  assert.equal(demoEditKey('ai'), 'buildclub:demo:edit:ai:v1')
  assert.equal(createDemoEditDraft('shoot', ai, metadata), null)
  assert.equal(createDemoEditDraft('ai', high, metadata), null)
  assert.equal(createDemoEditDraft('ai', 'https://example.com/video.mp4', metadata), null)
  assert.equal(createDemoEditDraft('ai', ai, {}), null)
  assert.equal(createDemoEditDraft('ai', ai, { [ai]: { ...metadata[ai], duration: 2 } }), null)
  assert.equal(demoSources('shoot', metadata).length, 2)
  assert.equal(demoSources('ai', metadata)[0].url.startsWith('/demo-assets/'), true)
})

test('native trim, split, reorder and mute change the same validated immutable project', () => {
  const draft = createDemoEditDraft('shoot', high, metadata)
  const before = JSON.stringify(draft)
  let project = trimClip(draft.project, 'c1', 'in', 0.5, metadata[high].duration)
  project = splitAt(project, 1, 'c2')
  project = moveClip(project, 0, 1)
  project = setClipAudio(project, 'c2', { muted: true, volume: 0.5 })
  assert.equal(project.clips.length, 2)
  assert.equal(project.clips[0].id, 'c2')
  assert.equal(project.clips[0].muted, true)
  assert.equal(project.clips[0].volume, 0.5)
  assert.equal(validateDemoEditDraft({ ...draft, project }, 'shoot', metadata), true)
  assert.equal(JSON.stringify(draft), before)
})

test('restore rejects schema, route, nonfinite or out-of-media trims and source injection', () => {
  const draft = createDemoEditDraft('ai', ai, metadata)
  assert.deepEqual(parseDemoEditDraft(JSON.stringify(draft), 'ai', metadata), draft)
  for (const raw of [null, '', '{', 'null', '{}', '[]']) assert.equal(parseDemoEditDraft(raw, 'ai', metadata), null)
  assert.equal(parseDemoEditDraft(JSON.stringify(draft), 'shoot', metadata), null)
  const mutations = [
    d => { d.version = 2 }, d => { d.url = 'https://example.com' },
    d => { d.project.urls = { evil: 'https://example.com' } }, d => { d.assetId = high },
    d => { d.project.fps = 25 }, d => { d.project.width = 720 },
    d => { d.project.clips[0].in = -1 }, d => { d.project.clips[0].out = 30 },
    d => { d.project.clips[0].in = NaN }, d => { d.project.clips[0].out = Infinity },
    d => { d.project.clips[0].out = 0.001 }, d => { d.project.clips[0].muted = 'yes' },
    d => { d.project.clips[0].volume = 3 }, d => { d.project.clips[0].source.id = high },
    d => { d.project.clips[0].source.url = 'https://example.com/evil.mp4' },
    d => { d.project.clips[1].id = d.project.clips[0].id },
    d => { d.project.music = { volume: 1 } }, d => { d.project.voiceover = [{ id: 'remote' }] },
    d => { d.project.texts = [{ text: 'injected' }] },
  ]
  for (const mutate of mutations) {
    const changed = clone(draft)
    mutate(changed)
    assert.equal(validateDemoEditDraft(changed, 'ai', metadata), false, mutate.toString())
    assert.equal(parseDemoEditDraft(JSON.stringify(changed), 'ai', metadata), null)
  }
})

test('pure draft helpers do not call network or alter metadata and returned drafts do not alias', () => {
  const original = globalThis.fetch
  globalThis.fetch = () => { throw new Error('network is forbidden') }
  try {
    const before = JSON.stringify(metadata)
    const draft = createDemoEditDraft('shoot', high, metadata)
    const restored = parseDemoEditDraft(JSON.stringify(draft), 'shoot', metadata)
    restored.project.clips[0].out = 1
    assert.notEqual(draft.project.clips[0].out, 1)
    assert.equal(JSON.stringify(metadata), before)
    const changed = withDemoProject(draft, { ...draft.project, clips: [] }, metadata)
    assert.deepEqual(changed.project.clips, [])
    assert.equal(draft.project.clips.length, 1)
    assert.equal(withDemoProject(draft, { ...draft.project, width: 20 }, metadata), null)
  } finally { globalThis.fetch = original }
})


class FakeVideo extends EventTarget {
  readyState = 0
  duration = NaN
  videoWidth = 0
  videoHeight = 0
  error = null
  listeners = new Map()
  addEventListener(type, callback) {
    this.listeners.set(type, callback)
    super.addEventListener(type, callback)
  }
  removeEventListener(type, callback) {
    if (this.listeners.get(type) === callback) this.listeners.delete(type)
    super.removeEventListener(type, callback)
  }
  ready() {
    Object.assign(this, { readyState: 4, duration: 5.875, videoWidth: 768, videoHeight: 1364 })
    return this
  }
  load() { throw new Error('observer must not reload media') }
}

test('metadata observer snapshots cached-ready video after registering native listeners', () => {
  const video = new FakeVideo().ready()
  const seen = []
  const cleanup = observeDemoMetadata(video, info => {
    assert.ok(video.listeners.has('loadedmetadata'))
    assert.ok(video.listeners.has('error'))
    seen.push(info)
  }, () => assert.fail('valid cached metadata must not fail'))
  assert.deepEqual(seen, [{ duration: 5.875, width: 768, height: 1364 }])
  cleanup()
})

test('metadata observer waits for native events and reads the actual duration and dimensions', () => {
  const video = new FakeVideo()
  const seen = []
  const cleanup = observeDemoMetadata(video, info => seen.push(info), () => assert.fail('loading is not an error'))
  assert.equal(seen.length, 0)
  video.ready()
  video.dispatchEvent(new Event('loadedmetadata'))
  assert.equal(seen[0].duration, 5.875)
  video.duration = 6.25
  video.dispatchEvent(new Event('durationchange'))
  assert.equal(seen.at(-1).duration, 6.25)
  cleanup()
})

test('metadata cleanup removes all listeners and ignores queued stale callbacks after unmount or retry', () => {
  const video = new FakeVideo()
  let calls = 0
  const cleanup = observeDemoMetadata(video, () => calls++, () => calls++)
  const stale = [...video.listeners.values()]
  cleanup()
  cleanup()
  assert.equal(video.listeners.size, 0)
  video.ready()
  for (const callback of stale) callback(new Event('loadedmetadata'))
  video.dispatchEvent(new Event('error'))
  assert.equal(calls, 0)
})

test('metadata observer rejects invalid dimensions and durations and can recover on native resize', () => {
  for (const patch of [{ videoWidth: 0 }, { videoHeight: -1 }, { videoWidth: 1.5 }, { duration: Infinity }, { duration: NaN }, { duration: 0 }]) {
    const video = Object.assign(new FakeVideo().ready(), patch)
    let failures = 0
    const seen = []
    const cleanup = observeDemoMetadata(video, info => seen.push(info), () => failures++)
    assert.equal(failures, 1)
    assert.equal(seen.length, 0)
    video.ready()
    video.dispatchEvent(new Event('resize'))
    assert.deepEqual(seen, [{ duration: 5.875, width: 768, height: 1364 }])
    cleanup()
  }
})

test('metadata observer reports both cached native errors and later errors without reload or network', () => {
  const video = new FakeVideo()
  video.error = { code: 4 }
  let failures = 0
  const cleanup = observeDemoMetadata(video, () => assert.fail('failed source cannot be ready'), () => failures++)
  assert.equal(failures, 1)
  video.dispatchEvent(new Event('error'))
  assert.equal(failures, 2)
  cleanup()
})

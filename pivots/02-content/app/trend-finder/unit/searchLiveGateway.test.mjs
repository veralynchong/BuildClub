import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchLive } from '../src/lib/live.ts'

// A tunnel in front of the API gives up on a long search (Cloudflare 524, an HTML page) while the API keeps going
// and caches the result. searchLive then waits on the free cachedOnly read instead of failing.
const item = { id: '1', text: 'a', url: 'https://www.tiktok.com/@a/video/1', createTime: null, views: 10, author: 'a' }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const html = (status) => new Response('<html>timeout</html>', { status, headers: { 'content-type': 'text/html' } })
const empty = { query: 'q', platform: 'tiktok', fetchedAt: 0, videos: [], cached: false }

function mockFetch(replies) {
  const urls = []
  globalThis.fetch = async (url) => { urls.push(String(url)); return replies.shift()() }
  return urls
}
const noWait = async () => {}

test('a gateway timeout waits for the cached result instead of failing', async () => {
  const urls = mockFetch([() => html(524), () => json(empty), () => json(empty),
    () => json({ query: 'q', platform: 'tiktok', fetchedAt: 5, videos: [item], cached: true })])
  const found = await searchLive('q', false, 'tiktok', false, noWait)
  assert.equal(found.videos.length, 1)
  assert.ok(urls.slice(1).every((u) => u.includes('cachedOnly=1')), 'polls never start a paid search')
})

test('a refresh ignores the older cached result it is replacing', async () => {
  mockFetch([() => html(524), () => json({ ...empty, fetchedAt: 1, videos: [item] }),
    () => json({ ...empty, fetchedAt: 1, videos: [item] }), () => json({ ...empty, fetchedAt: 9, videos: [item, { ...item, id: '2' }] })])
  const found = await searchLive('q', true, 'tiktok', false, noWait)
  assert.equal(found.fetchedAt, 9)
  assert.equal(found.videos.length, 2)
})

test('an error from the API itself still fails at once', async () => {
  const urls = mockFetch([() => json({ error: 'TikTok search failed.' }, 502)])
  await assert.rejects(searchLive('q', false, 'tiktok', false, noWait), /TikTok search failed/)
  assert.equal(urls.length, 1)
})

test('gives up with a clear message when the result never arrives', async () => {
  mockFetch([() => html(524), ...Array.from({ length: 60 }, () => () => json(empty))])
  await assert.rejects(searchLive('q', false, 'tiktok', false, noWait), /still running/)
})

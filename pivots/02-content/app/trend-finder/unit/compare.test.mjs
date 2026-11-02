import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseLinks, mergeLinks, checkLinks, isVideoLink, lastCompare, rememberCompare, hookLabelKey, MAX_VIDEOS } from '../src/lib/compare.ts'

const tt = (n) => `https://www.tiktok.com/@a/video/${n}`

test('parseLinks splits on lines, spaces and commas, and drops blanks and repeats', () => {
  assert.deepEqual(parseLinks(` ${tt(1)}\n\n${tt(2)}, ${tt(1)} ${tt(3)}  `), [tt(1), tt(2), tt(3)])
  assert.deepEqual(parseLinks('  \n '), [])
})

test('mergeLinks puts pasted links first and removes repeats', () => {
  assert.deepEqual(mergeLinks([tt(1), tt(2)], [tt(2), tt(3)]), [tt(1), tt(2), tt(3)])
})

test('isVideoLink accepts the same links as the backend', () => {
  for (const ok of [tt(1), 'https://www.instagram.com/reel/abc/', 'https://www.youtube.com/shorts/abc', 'https://youtube.com/shorts/abc',
    'https://www.reddit.com/r/food/comments/x/', 'https://v.redd.it/abc', 'https://x.com/a/status/123', 'https://twitter.com/a/status/9']) {
    assert.equal(isVideoLink(ok), true, ok)
  }
  for (const bad of ['', 'http://www.tiktok.com/@a/video/1', 'https://youtube.com/watch?v=1', 'https://x.com/a', 'noodles']) {
    assert.equal(isVideoLink(bad), false, bad)
  }
})

test('checkLinks needs 2 to 5 valid links', () => {
  assert.deepEqual(checkLinks([tt(1)]), { ok: false, reason: 'few' })
  assert.deepEqual(checkLinks([]), { ok: false, reason: 'few' })
  assert.deepEqual(checkLinks([tt(1), tt(2)]), { ok: true, urls: [tt(1), tt(2)] })
  const six = Array.from({ length: MAX_VIDEOS + 1 }, (_, i) => tt(i))
  assert.deepEqual(checkLinks(six), { ok: false, reason: 'many' })
  assert.equal(checkLinks(six.slice(0, MAX_VIDEOS)).ok, true)
  assert.deepEqual(checkLinks([tt(1), 'https://example.com/x']), { ok: false, reason: 'link', link: 'https://example.com/x' })
})

test('the last comparison is remembered, and blocked or junk storage means none', () => {
  const seen = {}
  rememberCompare('abc', [tt(1), tt(2)], { setItem: (k, v) => { seen[k] = v } })
  const stored = Object.values(seen)[0]
  assert.deepEqual(lastCompare({ getItem: () => stored }), { job: 'abc', urls: [tt(1), tt(2)] })
  assert.equal(lastCompare({ getItem: () => 'not json' }), null)
  assert.equal(lastCompare({ getItem: () => '{"job":3}' }), null)
  assert.equal(lastCompare({ getItem: () => { throw new Error('blocked') } }), null)
  assert.equal(lastCompare(null), null)
  assert.doesNotThrow(() => rememberCompare('x', [], { setItem() { throw new Error('blocked') } }))
})

test('every hook type has a label, and "other" avoids the plural suffix', async () => {
  const { areas } = await import('../src/lib/i18n.ts')
  for (const h of ['visual', 'question_or_text', 'rage_bait', 'informative', 'challenge', 'other']) {
    assert.ok(hookLabelKey(h) in areas.compare.en, h)
  }
  assert.equal(hookLabelKey('other'), 'compare.hookType.misc')
})

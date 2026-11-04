import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guessFraming, insertShot, promptSubject, rewriteShots, sampleInsert, sampleRewrite } from '../src/lib/boardAssist.ts'

const shots = () => [
  { time: '0-3s', shot: 'Pour the sauce' },
  { time: '3-8s', shot: 'Stir the pot' },
  { time: '8-10s', shot: 'Taste it' },
  { time: '10-14s', shot: 'Plate it' },
  { time: '14-16s', shot: 'Show the shop' },
  { time: '16-20s', shot: 'Say the price' },
]

test('prompt subject drops the verb', () => {
  assert.equal(promptSubject('add a taste-test reaction'), 'taste-test reaction')
  assert.equal(promptSubject('Remove the stir shot.'), 'stir shot')
  assert.equal(promptSubject('加一個試吃反應'), '試吃反應')
})

test('"make it faster" shortens every shot and keeps at most 5', () => {
  const out = sampleRewrite(shots(), 'make it faster')
  assert.equal(out.length, 5)
  assert.equal(out.at(-1).shot, 'Say the price', 'the ending stays last')
  assert.equal(out[0].time, '0-1.8s')
  assert.deepEqual(sampleRewrite(shots(), 'make it faster'), out, 'deterministic')
  assert.equal(sampleRewrite(shots(), '節奏快一點').length, 5)
})

test('"slower" stretches every shot', () => {
  const out = sampleRewrite(shots().slice(0, 2), 'slow it down')
  assert.deepEqual(out.map((s) => s.time), ['0-4.2s', '4.2-11.2s'])
})

test('"add X" puts a new shot before the last one, with camera direction, and re-times', () => {
  const out = sampleRewrite(shots(), 'add a taste-test reaction')
  assert.equal(out.length, 7)
  assert.equal(out[5].shot, 'Taste-test reaction')
  assert.equal(out[5].framing, 'close_up')
  assert.equal(out[6].shot, 'Say the price')
  assert.equal(out[6].time, '19-23s')
})

test('"remove X" drops matching shots, but never every shot', () => {
  assert.deepEqual(sampleRewrite(shots(), 'remove the stir').map((s) => s.shot).includes('Stir the pot'), false)
  assert.equal(sampleRewrite([{ time: '0-3s', shot: 'Stir' }], 'remove stir').length, 1)
})

test('an empty prompt changes nothing; an empty list still gets the new shot', () => {
  const s = shots()
  assert.equal(sampleRewrite(s, '   '), s)
  assert.deepEqual(sampleRewrite([], 'add a wide shot of the store').map((x) => [x.shot, x.framing, x.time]), [
    ['Wide shot of the store', 'wide', '0-3s'],
  ])
})

test('sample insert starts where the shot before ends', () => {
  const shot = sampleInsert({ time: '3-8s', shot: 'Stir' }, 'a close-up of the first bite')
  assert.equal(shot.time, '8-11s')
  assert.equal(shot.framing, 'close_up')
  assert.equal(sampleInsert(null, 'overhead of the table').time, '0-3s')
  assert.equal(guessFraming('the crowd outside'), 'wide')
  assert.equal(guessFraming('something'), 'medium')
})

test('sample mode never calls the API', async () => {
  let called = false
  const fetcher = async () => {
    called = true
    throw new Error('no')
  }
  const r = await rewriteShots('i1', shots(), 'make it faster', { live: false, fetcher })
  assert.equal(called, false)
  assert.equal(r.source, 'sample')
  assert.equal(r.reason, 'offline')
  const ins = await insertShot('i1', null, null, 'a reaction', { live: false, fetcher })
  assert.equal(ins.reason, 'offline')
})

test('live mode falls back to the sample when the route fails or answers junk', async () => {
  const down = async () => new Response('nope', { status: 404 })
  const r = await rewriteShots('i1', shots(), 'add a hug', { live: true, fetcher: down })
  assert.deepEqual([r.source, r.reason], ['sample', 'failed'])
  const junk = async () => new Response(JSON.stringify({ shots: [{ nope: 1 }] }), { status: 200 })
  assert.equal((await rewriteShots('i1', shots(), 'x', { live: true, fetcher: junk })).source, 'sample')
  const offline = async () => {
    throw new TypeError('fetch failed')
  }
  assert.equal((await insertShot('i1', null, null, 'x', { live: true, fetcher: offline })).reason, 'failed')
})

test('live mode uses the API answer, posts to the proposed routes, and keeps uploaded footage', async () => {
  const seen = []
  const fetcher = async (url, init) => {
    seen.push([url, JSON.parse(init.body)])
    if (url.endsWith('/rewrite')) return new Response(JSON.stringify({ shots: [{ time: '0-2s', shot: 'New one' }] }))
    return new Response(JSON.stringify({ shot: { time: '0-2s', shot: 'Inserted' } }))
  }
  const footage = { key: 'k', kind: 'image', name: 'a.png', src: 'data:image/png;base64,AAA' }
  const r = await rewriteShots('id/1', [{ time: '0-3s', shot: '', footage }], 'tighter', { live: true, fetcher })
  assert.equal(r.source, 'ai')
  assert.equal(r.result[0].shot, 'New one')
  assert.equal(r.result[0].footage, footage, 'footage stays on the shot at the same place')
  assert.equal(seen[0][0], '/api/ideas/id%2F1/board/rewrite')
  assert.equal(seen[0][1].shots[0].footage, undefined, 'files are not sent')
  assert.equal(seen[0][1].shots[0].shot, 'a.png')
  const ins = await insertShot('id1', { time: '0-3s', shot: 'a' }, { time: '3-6s', shot: 'b' }, 'hug', { live: true, fetcher })
  assert.equal(ins.result.shot, 'Inserted')
  assert.equal(seen[1][0], '/api/ideas/id1/board/insert')
  assert.deepEqual(Object.keys(seen[1][1]).sort(), ['after', 'before', 'prompt'])
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFreshSixData, freshTemplate, materializeFresh, freshNodes, freshPrompt, freshSourceFor, placeFreshSource } from '../src/lib/guided/freshSix.ts'
const store = () => { const entries = new Map(); return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) } }

test('AI has genuine parent edges only for I2V shots; shoot has references without video generation', () => {
 const ai = freshTemplate('ai'), shoot = freshTemplate('shoot')
 assert.equal(ai.nodes.filter(n => n.type === 'video').length, 3)
 assert.equal(shoot.nodes.filter(n => n.type === 'video').length, 0)
 assert.deepEqual(ai.edges.filter(e => e.targetHandle === 'in:start').map(e => e.target), ['n_six_video_s1', 'n_six_video_s5'])
 assert.ok(!ai.edges.some(e => e.target === 'n_six_video_s4' && e.targetHandle === 'in:start'))
})

test('manual I2V requires its selected completed exact parent; replay and alias identity survive reload', async () => {
 const local = store(), session = store(); let time = 0
 let data = createFreshSixData(local, session, () => time)
 const call = async (path, method = 'GET', body) => { const r = await data.request(new Request(`http://local/api/ideas/guided-tofu-ai/${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) })); return { status: r.status, body: await r.json() } }
 let canvas = (await call('canvas')).body
 canvas.doc = materializeFresh(canvas.doc, [freshNodes(0).prompt, freshNodes(0).image, freshNodes(0).video], 'ai')
 assert.equal((await call('canvas', 'PUT', { version: canvas.version, doc: canvas.doc })).status, 200)
 const run = async (kind, parent) => {
  const canvas = (await call('canvas')).body
  const node = canvas.doc.nodes.find(n => n.id === freshNodes(0)[kind])
  const body = { nodeId: node.id, prompt: freshPrompt(0, 'ai'), model: node.data.model, canvasVersion: canvas.version, ...(parent ? { startFrame: parent } : {}) }
  const quote = await call('gen', 'POST', { nodeId: node.id, canvasVersion: canvas.version, confirm: false })
  if (quote.status !== 200) return quote
  return call('gen', 'POST', { ...body, confirm: true, inputStamp: quote.body.inputStamp, quoteStamp: quote.body.quoteStamp })
 }
 assert.equal((await run('video')).status, 422)
 const image = (await run('image')).body
 assert.equal(image.status, 'queued')
 time = 500
 assert.equal((await call(`gen/${image.id}`)).body.status, 'running')
 time = 1600
 assert.equal((await call(`gen/${image.id}`)).body.status, 'done')
 canvas = (await call('canvas')).body
 canvas.doc.nodes.find(n => n.id === freshNodes(0).image).data.selected = image.id
 assert.equal((await call('canvas', 'PUT', { version: canvas.version, doc: canvas.doc })).status, 200)
 assert.equal(freshSourceFor('ai', (await call(`gen/${image.id}`)).body), null)
 const video = (await run('video', image.id)).body
 assert.equal(video.status, 'queued')
 data = createFreshSixData(local, session, () => time)
 time = 3200
 const done = (await call(`gen/${video.id}`)).body
 assert.equal(done.status, 'done')
 assert.equal(freshSourceFor('ai', done).id, 'ai-s1')
 assert.equal(freshSourceFor('shoot', done), null)
})


test('Use in Edit restores a deleted shot in order without unsupported workspace pins', () => {
 const project = { clips: [{ id: 'last', source: { kind: 'generation', id: 'ai-s6', shotId: 's6' }, in: 0, out: 2 }], primaries: {} }
 const source = { kind: 'generation', id: 'ai-s1', shotId: 's1', nodeId: 'n_six_video_s1' }
 const placed = placeFreshSource(project, source, 1.4)
 assert.deepEqual(placed.clips.map(clip => clip.source.shotId), ['s1', 's6'])
 assert.deepEqual(placed.primaries, {})
 assert.equal(placed.clips[0].muted, true)
 assert.equal(placeFreshSource(placed, source, 1.4), placed)
})

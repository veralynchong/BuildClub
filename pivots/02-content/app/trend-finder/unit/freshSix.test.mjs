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


test('full master mode maps all 21 original shots into six continuous video parts without altering shoot', () => {
 const full=freshTemplate('ai', true), shoot=freshTemplate('shoot', true)
 assert.equal(full.nodes.filter(n=>n.type==='video').length,6)
 assert.equal(full.edges.filter(e=>e.targetHandle==='in:start').length,0)
 assert.equal(shoot.nodes.filter(n=>n.type==='video').length,0)
 const data=createFreshSixData(store(),store(),()=>0,true)
 const ideas=data.bootstrap.local['trend-finder.ideas.v6']
 assert.match(ideas.find(i=>i.id==='guided-tofu-ai').notes,/21-shot/)
 assert.equal(ideas.find(i=>i.id==='guided-tofu-ai').shots[0].time,'0.00-1.60s')
 assert.equal(ideas.find(i=>i.id==='guided-tofu-shoot').shots[0].time,'0.00-1.40s')
})

test('every full-master part replays as video without an invented image parent and maps to its editor alias', async () => {
 const local=store(), session=store(); let time=0
 const data=createFreshSixData(local,session,()=>time,true)
 const call=async(path,method='GET',body)=>{const response=await data.request(new Request(`http://local/api/ideas/guided-tofu-ai/${path}`,{method,...(body?{body:JSON.stringify(body)}:{})}));return {status:response.status,body:await response.json()}}
 let canvas=(await call('canvas')).body
 canvas.doc=materializeFresh(canvas.doc,freshTemplate('ai',true).nodes.map(n=>n.id),'ai')
 assert.equal((await call('canvas','PUT',{version:canvas.version,doc:canvas.doc})).status,200)
 for(let i=0;i<6;i++){
  const quote=await call('gen','POST',{nodeId:freshNodes(i).video,confirm:false})
  assert.equal(quote.status,200)
  const result=await call('gen','POST',{nodeId:freshNodes(i).video,model:'prepared-full-cut',prompt:freshPrompt(i,'ai',true),inputStamp:quote.body.inputStamp,quoteStamp:quote.body.quoteStamp,confirm:true})
  assert.equal(result.status,200);assert.equal(result.body.inputs.startFrame,undefined)
  time+=1600
  const done=(await call(`gen/${result.body.id}`)).body
  assert.equal(done.status,'done');assert.match(done.url,/full-ai-six/)
  assert.equal(freshSourceFor('ai',done).id,`ai-s${i+1}`)
 }
 assert.equal(local.getItem('fresh-six.v1'),null)
})

test('full-master tour has all six video steps and retains the shoot tour', async () => {
 const {CANVAS_TOURS}=await import('../src/lib/guided/canvasTour.ts')
 const previous=globalThis.window, shoot=CANVAS_TOURS.shoot
 try{
  globalThis.window={location:{search:'?guided=tofu&cut=full21'}}
  assert.deepEqual(CANVAS_TOURS.ai.filter(s=>s.generation==='video').map(s=>s.id),Array.from({length:6},(_,i)=>`video-s${i+1}`))
  assert.equal(CANVAS_TOURS.ai.length,14)
  assert.ok(!CANVAS_TOURS.ai.some(s=>/exact.*parent|still hold/.test(s.en.description)))
  assert.deepEqual(CANVAS_TOURS.shoot,shoot)
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous}
})

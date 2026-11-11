import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFreshSixData, freshTemplate, materializeFresh, freshNodes, freshPrompt, freshSourceFor, placeFreshSource } from '../src/lib/guided/freshSix.ts'
const store = () => { const entries = new Map(); return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) } }

test('AI has genuine parent edges only for I2V shots; shoot has one prepared opening video', () => {
 const ai = freshTemplate('ai'), shoot = freshTemplate('shoot')
 assert.equal(ai.nodes.filter(n => n.type === 'video').length, 3)
 assert.equal(shoot.nodes.filter(n => n.type === 'video').length, 1)
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
 assert.equal(shoot.nodes.filter(n=>n.type==='video').length,1)
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


test('demo scripts prefill both routes and migrate only untouched empty scripts once', () => {
 for (const full of [false, true]) {
  const local=store(),session=store(),key=full?'full-ai-six-ideas.v1':'fresh-six-ideas.v1'
  const initial=createFreshSixData(local,session,()=>0,full).bootstrap.local['trend-finder.ideas.v6']
  assert.ok(initial.every(idea=>idea.script.lines.length===6&&idea.script.lines.every(line=>line.say.trim()&&line.onScreen.trim())))
  assert.ok(initial.every(idea=>idea.shots.every(shot=>shot.line===''&&shot.text==='')))
  const old=structuredClone(initial)
  old[0].script.lines=old[0].script.lines.map(()=>({say:'',onScreen:''}))
  old[1].script.edited=true;old[1].script.lines[0].say='My own script'
  local.setItem(key,JSON.stringify(old));local.setItem(`${key}:script-prefill.v1`,'')
  const upgraded=createFreshSixData(local,session,()=>0,full).bootstrap.local['trend-finder.ideas.v6']
  assert.ok(upgraded[0].script.lines.every(line=>line.say.trim()))
  assert.equal(upgraded[1].script.lines[0].say,'My own script')
  upgraded[0].script.lines=upgraded[0].script.lines.map(()=>({say:'',onScreen:''}))
  local.setItem(key,JSON.stringify(upgraded))
  const reopened=createFreshSixData(local,session,()=>0,full).bootstrap.local['trend-finder.ideas.v6']
  assert.ok(reopened[0].script.lines.every(line=>line.say===''))
 }
})

test('opening replays alternate distinct versions and replace only the chosen shot in a full six-shot edit', async () => {
 const local = store(), session = store(); let time = 0
 let data = createFreshSixData(local, session, () => time)
 const call = async (path, method = 'GET', body) => {
  const res = await data.request(new Request(`http://local/api/ideas/guided-tofu-shoot/${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) }))
  assert.equal(res.status, 200); return res.json()
 }
 let canvas = await call('canvas')
 canvas.doc = materializeFresh(canvas.doc, [freshNodes(0).prompt, freshNodes(0).image], 'shoot')
 await call('canvas', 'PUT', { version: canvas.version, doc: canvas.doc })
 const versions = []
 for (let i = 0; i < 3; i++) {
  canvas = await call('canvas')
  const quote = await call('gen', 'POST', { nodeId: freshNodes(0).image, canvasVersion: canvas.version, confirm: false })
  const gen = await call('gen', 'POST', { nodeId: freshNodes(0).image, canvasVersion: canvas.version, confirm: true, inputStamp: quote.inputStamp, quoteStamp: quote.quoteStamp })
  time += 1600
  versions.push(await call(`gen/${gen.id}`))
  data = createFreshSixData(local, session, () => time)
 }
 assert.notEqual(versions[0].url, versions[1].url)
 assert.equal(versions[0].url, versions[2].url)
 assert.equal(freshSourceFor('shoot', versions[0]).id, 'shoot-s1')
 const variant = freshSourceFor('shoot', versions[1])
 assert.equal(variant.id, 'shoot-s1-v2')
 assert.equal(freshSourceFor('ai', versions[1]), null)
 const project = { clips: Array.from({length: 6}, (_, i) => ({id: `clip-${i}`, source: {kind: 'generation', id: `shoot-s${i+1}`, shotId: `s${i+1}`}, in: 0, out: i === 0 ? 1.4 : 1})), primaries: {}, texts: [{text: 'Keep my edit'}] }
 const chosen = placeFreshSource(project, variant, 1.4)
 assert.equal(chosen.clips.length, 6)
 assert.equal(chosen.clips[0].source.id, 'shoot-s1-v2')
 assert.deepEqual(chosen.clips.slice(1), project.clips.slice(1))
 assert.deepEqual(chosen.texts, project.texts)
 assert.equal(placeFreshSource(chosen, freshSourceFor('shoot', versions[0]), 1.4).clips[0].source.id, 'shoot-s1')
})


test('prepared opening video follows saved Prompt rather than run count and preserves per-version inputs', async () => {
 const {OPENING_NODE, OPENING_VERSIONS, OPENING_MODEL} = await import('../src/lib/guided/shootOpening.ts')
 const local=store(), session=store(); let time=0, data=createFreshSixData(local,session,()=>time)
 const call=async(path,method='GET',body)=>{const res=await data.request(new Request(`http://local/api/ideas/guided-tofu-shoot/${path}`,{method,...(body?{body:JSON.stringify(body)}:{})}));return{status:res.status,body:await res.json()}}
 let canvas=(await call('canvas')).body
 canvas.doc=materializeFresh(canvas.doc,[OPENING_NODE],'shoot')
 assert.equal((await call('canvas','PUT',{version:canvas.version,doc:canvas.doc})).status,200)
 async function setPrompt(prompt){canvas=(await call('canvas')).body;canvas.doc.nodes.find(n=>n.id===OPENING_NODE).data.prompt=prompt;assert.equal((await call('canvas','PUT',{version:canvas.version,doc:canvas.doc})).status,200)}
 async function quote(){canvas=(await call('canvas')).body;return call('gen','POST',{nodeId:OPENING_NODE,canvasVersion:canvas.version,confirm:false})}
 async function run(){const q=await quote();assert.equal(q.status,200);const started=await call('gen','POST',{nodeId:OPENING_NODE,canvasVersion:canvas.version,confirm:true,inputStamp:q.body.inputStamp,quoteStamp:q.body.quoteStamp});assert.equal(started.status,200);time+=1600;return(await call(`gen/${started.body.id}`)).body}
 const first=await run(), same=await run()
 assert.equal(first.kind,'video');assert.equal(first.model,OPENING_MODEL);assert.equal(first.url,same.url)
 const stale=await quote();await setPrompt(OPENING_VERSIONS[1].prompt)
 assert.equal((await call('gen','POST',{nodeId:OPENING_NODE,canvasVersion:canvas.version,confirm:true,inputStamp:stale.body.inputStamp,quoteStamp:stale.body.quoteStamp})).status,409)
 const second=await run();assert.notEqual(first.url,second.url)
 assert.equal(first.inputs.prompt,OPENING_VERSIONS[0].prompt);assert.equal(second.inputs.prompt,OPENING_VERSIONS[1].prompt)
 assert.equal(freshSourceFor('shoot',first).id,OPENING_VERSIONS[0].sourceId);assert.equal(freshSourceFor('shoot',second).id,OPENING_VERSIONS[1].sourceId)
 assert.equal(freshSourceFor('shoot',{...second,url:first.url}),null)
 await setPrompt('Invent an unrelated scene')
 assert.equal((await quote()).status,422)
 data=createFreshSixData(local,session,()=>time)
 assert.equal((await call(`gen/${second.id}`)).body.inputs.prompt,OPENING_VERSIONS[1].prompt)
})

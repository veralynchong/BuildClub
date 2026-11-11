import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sixShotFixtures, SIX_SHOTS, sixShotTemplate } from '../src/lib/guided/sixShot.ts'
import { GUIDED_IDS } from '../src/lib/guided/contracts.ts'

test('six adapted shots start left to right with no output placeholders and six distinct source assets', () => {
 const state = sixShotFixtures()
 assert.equal(SIX_SHOTS.length,6)
 assert.equal(new Set(SIX_SHOTS.map(s=>s.asset.sha256)).size,6)
 for (const id of Object.values(GUIDED_IDS.plans)) {
  assert.equal(state.ideas.find(i=>i.id===id).shots.length,6)
  assert.equal(state.ideas.find(i=>i.id===id).script.lines.length,6)
  assert.equal(state.canvases[id].doc.nodes.length,6)
  assert.ok(state.canvases[id].doc.nodes.every((n,i)=>n.type==='shot' && n.position.x===i*1100))
  assert.equal(state.projects[id].project.clips.length,6)
  assert.ok(state.projects[id].project.clips.every(c=>c.muted))
  assert.equal(state.cuts[id].stale,true)
 }
 assert.equal(state.library.formats[0].shotList.length,21)
 const full = sixShotTemplate()
 assert.equal(full.nodes.length,18)
 assert.equal(full.edges.length,6)
})

import { createPreparedDataWithClock } from '../src/lib/guided/prepared.ts'
import { materializeSixShot } from '../src/lib/guided/sixShot.ts'
const storage = () => { const m=new Map(); return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)} }
test('all six manual replays persist exact prompt/asset identity and reject foreign inputs and stale saves', async () => {
 const local=storage(), session=storage(); let time=0
 let data=createPreparedDataWithClock(local,session,()=>time,true)
 const id=GUIDED_IDS.plans.ai
 const call=async (action,method='GET',body) => {
  const response=await data.request(new Request(`http://local/api/ideas/${id}/${action}`,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})}))
  return {status:response.status,body:await response.json()}
 }
 for (const shot of SIX_SHOTS) {
  let {body:canvas}=await call('canvas')
  canvas.doc=materializeSixShot(canvas.doc,[shot.nodes.prompt,shot.nodes.image])
  const saved=await call('canvas','PUT',{version:canvas.version,doc:canvas.doc}); assert.equal(saved.status,200)
  const version=saved.body.version
  const body={nodeId:shot.nodes.image,model:'prepared-image',prompt:shot.prompt,aspectRatio:'9:16',resolution:'1K',count:1,canvasVersion:version}
  assert.equal((await call('gen','POST',{...body,prompt:'foreign prompt'})).status,422)
  assert.equal((await call('gen','POST',{...body,startFrame:'foreign-frame'})).status,422)
  assert.equal((await call('gen','POST',{...body,references:[{kind:'image',id:'foreign'}]})).status,422)
  const quote=await call('gen','POST',{...body,confirm:false}); assert.equal(quote.status,200)
  assert.equal(quote.body.total,0)
  const run=await call('gen','POST',{...body,confirm:true,inputStamp:quote.body.inputStamp,quoteStamp:quote.body.quoteStamp})
  assert.equal(run.status,200); assert.equal(run.body.status,'queued'); assert.equal(run.body.url,null)
  time+=600; assert.equal((await call(`gen/${run.body.id}`)).body.status,'running')
  data=createPreparedDataWithClock(local,session,()=>time,true)
  assert.equal((await call(`gen/${run.body.id}`)).body.status,'running')
  time+=3000
  const done=await call(`gen/${run.body.id}`); assert.equal(done.body.status,'done'); assert.equal(done.body.url,shot.asset.relativePath)
  assert.equal((await call('canvas','PUT',{version:canvas.version,doc:canvas.doc})).status,409)
 }
 const canvas=(await call('canvas')).body
 assert.equal(canvas.generations.filter(g=>g.model==='prepared-image').length,6)
 assert.equal(new Set(canvas.generations.filter(g=>g.model==='prepared-image').map(g=>g.url)).size,6)
 const bad=structuredClone(canvas.doc); bad.nodes.push({...bad.nodes[0],id:'foreign'})
 assert.equal((await call('canvas','PUT',{version:canvas.version,doc:bad})).status,422)
 data.reset()
 assert.equal((await call('canvas')).body.doc.nodes.length,6)
 assert.equal((await call('canvas')).body.generations.length,1)
})

import { readGuidedState, saveGuidedState } from '../src/lib/guided/tour.ts'
test('both routes restore explicit skipped six-shot replays without resetting progress', () => {
 for (const route of ['ai','shoot']) {
  const store=storage(), state={version:1,active:true,stepId:'canvas',route,canvasStep:'image-s3',skippedCanvasSteps:['image-s1','image-s2']}
  saveGuidedState(store,state)
  assert.deepEqual(readGuidedState(store), route === 'shoot' ? {...state, canvasStep: 'prompt-s1', skippedCanvasSteps: []} : state)
 }
})

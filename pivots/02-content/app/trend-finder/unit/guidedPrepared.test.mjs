import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPreparedDataWithClock } from '../src/lib/guided/prepared.ts'
import { preparedSearchResult } from '../src/lib/guided/fixtures.ts'
import { GUIDED_IDS as ids } from '../src/lib/guided/contracts.ts'
const store = () => { const values = new Map(); return { get length() { return values.size }, key: (i) => [...values.keys()][i] ?? null, getItem: (k) => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)), removeItem: (k) => values.delete(k), clear: () => values.clear() } }
const setup = () => { let time = 0; const local = store(), session = store(); const data = createPreparedDataWithClock(local, session, () => time); const call = (path, method = 'GET', body, headers = {}) => data.request(new Request(`http://guided.test${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })); return { local, session, data, call, tick: (t) => { time = t } } }
const base = `/api/ideas/${ids.plans.ai}`
test('native boot shapes and honest source fixture', async () => {
 const { call, data } = setup(); assert.equal((await (await call('/api/health')).json()).prepared, true)
 assert.deepEqual(await (await call('/api/auth/me')).json(), { users: false })
 const ideas = await call('/api/ideas'); assert.ok(ideas.headers.get('ETag')); assert.equal((await ideas.json()).length,2)
 const library = await (await call('/api/library')).json(); assert.match(library.videos[0].url,/instagram/); assert.equal(library.videos[0].views,0)
 assert.equal(data.bootstrap.local['trend-finder.signed-in'],true)
 assert.equal((await (await call(`${base}/canvas`)).json()).doc.nodes.filter(n=>n.type==='shot').length,21)
})
test('native generation transitions, duplicate, immutable fingerprint and reload', async () => {
 const s = setup(); const body = { nodeId:'n_sb_s1', model:'prepared-image', prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.', references:[] }
 const gen = await (await s.call(`${base}/gen`,'POST',body)).json(); assert.equal(gen.status,'queued')
 assert.equal((await (await s.call(`${base}/gen`,'POST',body)).json()).id,gen.id)
 s.tick(350); assert.equal((await (await s.call(`${base}/gen/${gen.id}`)).json()).status,'running')
 s.tick(800); const done = await (await s.call(`${base}/gen/${gen.id}`)).json(); assert.equal(done.status,'done'); assert.match(done.url,/S01.jpg$/); assert.equal(done.actualUsd,0)
 const restored = createPreparedDataWithClock(s.local,s.session,()=>900); assert.equal((await (await restored.request(new Request(`http://guided.test${base}/gen/${gen.id}`))).json()).status,'done')
 for (const patch of [{prompt:'changed'},{model:'fal'},{references:[{source:'gen',genId:'foreign'}]},{nodeId:'n_video_s1'},{force:true},{startFrame:'foreign'},{count:2}]) assert.equal((await s.call(`${base}/gen`,'POST',{...body,...patch})).status,422)
})
test('native edit CAS, source containment, stale output and export rejection', async () => {
 const s = setup(); const edit = await (await s.call(`${base}/edit`)).json(); assert.equal(edit.project.clips.length,21)
 const sources = (await (await s.call(`${base}/edit/sources`)).json()).sources; assert.equal(sources[0].key,`generation:${sources[0].id}`); assert.equal(sources[0].duration,10.517)
 edit.project.clips[0].muted = false; assert.equal((await s.call(`${base}/edit`,'PUT',edit)).status,200); assert.equal((await s.call(`${base}/edit`,'PUT',edit)).status,409)
 assert.equal((await (await s.call(`${base}/cut`)).json()).stale,true); assert.equal((await s.call(`${base}/edit/export`,'POST')).status,409)
 const next = await (await s.call(`${base}/edit`)).json(); next.project.clips[0].source.id='foreign'; assert.equal((await s.call(`${base}/edit`,'PUT',next)).status,422)
})
test('unknown/paid routes fail closed; reset and abort never touch sibling stores or network', async () => {
 const original = globalThis.fetch; globalThis.fetch = ()=>assert.fail('outgoing network'); try {
 const s=setup(); s.local.setItem('unrelated','keep'); s.session.setItem('unrelated','keep'); const sibling=store(); sibling.setItem('prepared-data.v1','sibling')
 for(const [path,method,body] of [['/api/unknown','GET'],['https://fal.run/x','POST'],[`${base}/gen/chain`,'POST',{}],[`${base}/edit/voice/tts`,'POST',{}],['/api/analyze','POST',{url:'https://foreign/'}]]) assert.ok((await s.call(path,method,body)).status>=400)
 const controller=new AbortController(); controller.abort(); await assert.rejects(s.data.request(new Request('http://guided.test/api/health',{signal:controller.signal})),{name:'AbortError'})
 s.data.reset(); assert.equal(s.local.getItem('unrelated'),'keep'); assert.equal(s.session.getItem('unrelated'),'keep'); assert.equal(sibling.getItem('prepared-data.v1'),'sibling')
 }finally{globalThis.fetch=original}
})

test('original API callers use playback with native CAS, history and source keys', async () => {
 const api = await import('../src/lib/canvas/api.ts'); const editor = await import('../src/lib/editor/api.ts'); const live = await import('../src/lib/live.ts'); const cut = await import('../src/lib/cut.ts'); const auth = await import('../src/lib/auth.ts')
 const s=setup(), original=globalThis.fetch
 globalThis.fetch=(input,init)=>s.data.request(input instanceof Request ? input : new Request(`http://guided.test${input}`,init))
 try {
 assert.deepEqual(await auth.me(),{kind:'open'}); assert.equal(await live.checkLive(),true); assert.equal((await live.loadIdeas()).items.length,2)
 const canvas=await api.getCanvas(ids.plans.ai); const node=canvas.doc.nodes.find(n=>n.id==='n_sb_s1'); const quote=await api.quoteNode(ids.plans.ai,node.id,canvas.version); assert.equal(quote.total,0)
 const gen=await api.startGen(ids.plans.ai,{nodeId:node.id,model:node.data.model,prompt:node.data.prompt,references:[]}); s.tick(800)
 const states=[]; const done=await api.pollGen(ids.plans.ai,gen.id,g=>states.push(g.status),{intervalMs:0}); assert.deepEqual(states,['done']); assert.equal(done.id,gen.id)
 node.data.selected=done.id; const version=await api.putCanvas(ids.plans.ai,canvas.version,canvas.doc); assert.equal(version,2)
 await assert.rejects(api.putCanvas(ids.plans.ai,1,canvas.doc),api.StaleCanvas)
 assert.equal((await api.listGens(ids.plans.ai)).find(g=>g.id===done.id).id,done.id)
 const edit=await editor.getProject(ids.plans.ai); assert.equal((await editor.getSources(ids.plans.ai))[0].key,'generation:prepared-source-derived-cut'); assert.equal(edit.project.clips.length,21)
 await editor.putProject(ids.plans.ai,edit.version,edit.project); await assert.rejects(editor.startExport(ids.plans.ai),/cannot render/); assert.equal((await cut.getCut(ids.plans.ai)).stale,true)
 const controller=new AbortController(); controller.abort(); assert.equal(await api.pollGen(ids.plans.ai,gen.id,()=>assert.fail('aborted'),{signal:controller.signal}),null)
 }finally{globalThis.fetch=original}
})

test('fixed analysis and S19 playback are honest, and mutated persisted bindings are refused', async () => {
 const s=setup(); const start=await s.call('/api/analyze','POST',{url:'https://www.instagram.com/reel/DVp3xOdFaHL/',force:true}); assert.equal(start.status,200); const {job}=await start.json(); s.tick(800)
 const analysis=await (await s.call(`/api/analyze/${job}`)).json(); assert.equal(analysis.status,'done'); assert.equal(analysis.result.shotList.length,21); assert.ok(analysis.result.shotList.every(s=>s.line===''))
 const shoot=`/api/ideas/${ids.plans.shoot}`
 const {preparedTutorialPrompt}=await import('../src/lib/guided/fixtures.ts'); const gen=await (await s.call(`${shoot}/gen`,'POST',{nodeId:'n_high-angle_image',model:'prepared-image',prompt:preparedTutorialPrompt})).json(); s.tick(1700)
 const done=await (await s.call(`${shoot}/gen/${gen.id}`)).json(); assert.match(done.url,/high-angle.jpg$/)
 const saved=JSON.parse(s.local.getItem('prepared-data.v1')); saved.state.jobs[0].assetId='shoot-low-macro-video'; saved.state.jobs[0].generation.url='/demo-assets/batch-20261106/photographer/low-macro.mp4'; s.local.setItem('prepared-data.v1',JSON.stringify(saved))
 const restored=createPreparedDataWithClock(s.local,s.session,()=>2000)
 assert.deepEqual((await (await restored.request(new Request(`http://guided.test${shoot}/gen`))).json()).filter(g=>g.model!=='imported'),[])
})

test('reset invalidates old poll ids and an in-flight mutation, and keeps the other route separate', async () => {
 const s=setup(); const body={nodeId:'n_sb_s1',model:'prepared-image',prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.'}
 const gen=await (await s.call(`${base}/gen`,'POST',body)).json()
 const req=new Request(`http://guided.test${base}/gen`,{method:'POST',body:JSON.stringify(body)})
 let release; req.text=()=>new Promise(resolve=>{release=resolve})
 const pending=s.data.request(req); s.data.reset(); release(JSON.stringify(body)); assert.equal((await pending).status,409)
 const next=await (await s.call(`${base}/gen`,'POST',body)).json(); assert.notEqual(next.id,gen.id); assert.equal((await s.call(`${base}/gen/${gen.id}`)).status,404)
 assert.deepEqual((await (await s.call(`/api/ideas/${ids.plans.shoot}/gen`)).json()).filter(g=>g.model!=='imported'),[])
})

test('native frame replay persists only its own allowlisted image through ideas revision', async () => {
 const s=setup(); const ideas=await (await s.call('/api/ideas')).json(); const frame=await (await s.call(`${base}/shots/0/frame`,'POST',{line:'',purpose:'hook'})).json()
 ideas[1].shots[0].frameImage=frame.frameImage
 const kept=await s.call('/api/ideas','PUT',ideas,{'If-Match':'1'}); assert.equal(kept.status,200); assert.equal(kept.headers.get('ETag'),'"2"')
 assert.equal((await s.call('/api/ideas','PUT',ideas,{'If-Match':'1'})).status,409)
 ideas[1].shots[0].frameImage='https://foreign/image.jpg'; assert.equal((await s.call('/api/ideas','PUT',ideas,{'If-Match':'2'})).status,422)
 assert.equal((await s.call(`${base}/gen`,'POST',{nodeId:'n_sb_s1',model:'prepared-image',prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.',sourceHash:'foreign'})).status,422)
})

test('reload then reset reseeds fresh scripts through exposed bootstrap', async () => {
 const s=setup(), fresh=structuredClone(s.data.bootstrap.local['trend-finder.ideas.v6'])
 const ideas=await (await s.call('/api/ideas')).json(); ideas[0].script.lines[0].onScreen='USER EDIT TO CLEAR'
 assert.equal((await s.call('/api/ideas','PUT',ideas,{'If-Match':'1'})).status,200)
 const reloaded=createPreparedDataWithClock(s.local,s.session,()=>1000)
 assert.equal(reloaded.bootstrap.local['trend-finder.ideas.v6'][0].script.lines[0].onScreen,'USER EDIT TO CLEAR')
 s.local.clear(); s.session.clear(); reloaded.reset()
 for(const [key,value] of Object.entries(reloaded.bootstrap.local)) s.local.setItem(key,JSON.stringify(value))
 for(const [key,value] of Object.entries(reloaded.bootstrap.session)) s.session.setItem(key,JSON.stringify(value))
 assert.deepEqual(JSON.parse(s.local.getItem('trend-finder.ideas.v6')),fresh)
 assert.deepEqual(reloaded.bootstrap.local['trend-finder.ideas.v6'],await (await reloaded.request(new Request('http://guided.test/api/ideas'))).json())
 assert.ok(reloaded.bootstrap.local['trend-finder.ideas.v6'].every(idea=>idea.script.lines.every(line=>line.say==='')))
})

test('native six-frame trim survives save and reload while shorter and invalid trims are refused', async () => {
 const {trimClip}=await import('../src/lib/editor/timeline.ts')
 const s=setup(), edit=await (await s.call(`${base}/edit`)).json()
 edit.project=trimClip(edit.project,'prepared-clip-s3','out',1.8,10.517)
 const clip=edit.project.clips.find(c=>c.id==='prepared-clip-s3'); assert.equal(clip.in,1.6); assert.equal(clip.out,1.8)
 assert.equal(Math.round((clip.out-clip.in)*30),6)
 assert.equal((await s.call(`${base}/edit`,'PUT',edit)).status,200)
 const reloaded=createPreparedDataWithClock(s.local,s.session,()=>1000)
 const kept=await (await reloaded.request(new Request(`http://guided.test${base}/edit`))).json()
 assert.deepEqual(kept.project,edit.project)
 for(const out of [1.6+5/30,1.799999,Infinity,NaN,10.518]) {
  const invalid=structuredClone(kept); invalid.project.clips.find(c=>c.id==='prepared-clip-s3').out=out
  assert.equal((await s.call(`${base}/edit`,'PUT',invalid)).status,422)
 }
})

test('native takes caller reads honest empty footage for both prepared plans and refuses mutations', async () => {
 const takes=await import('../src/lib/takes.ts'), s=setup(), original=globalThis.fetch
 const seen=[]
 globalThis.fetch=(input,init)=>{const request=input instanceof Request?input:new Request(`http://guided.test${input}`,init);seen.push([request.method,new URL(request.url).pathname]);return s.data.request(request)}
 try {
  for(const id of Object.values(ids.plans)) {
   assert.deepEqual(await takes.listTakes(id),[])
   assert.deepEqual(takes.checklistProgress(21,await takes.listTakes(id)),{done:0,total:21})
   await assert.rejects(takes.chooseTake(id,'foreign-take'))
   await assert.rejects(takes.deleteTake(id,'foreign-take'))
   await assert.rejects(takes.cleanTake(id,'foreign-take'))
   await assert.rejects(takes.uploadTake(id,18,new File(['not footage'],'concept.mp4',{type:'video/mp4'})))
   assert.deepEqual(await takes.listTakes(id),[])
  }
  await assert.rejects(takes.listTakes('foreign-plan'))
  assert.equal((await s.call(`${base}/takes`,'POST',{})).status,404)
  assert.equal((await s.call(`${base}/takes?outside=1`)).status,422)
  assert.ok(seen.some(([method,path])=>method==='GET'&&path===`${base}/takes`))
 }finally{globalThis.fetch=original}
})

test('native clip resolver sees imported prepared identities without inventing shot generations or takes', async () => {
 const {clipStatus,exportBlocked,sourceKey}=await import('../src/lib/editor/timeline.ts')
 const {clipLabel}=await import('../src/components/editor/clipName.ts')
 const {previewInput}=await import('../src/lib/editor/preview.ts')
 const {inLang}=await import('../src/lib/i18n.ts')
 const s=setup(), ideas=await (await s.call('/api/ideas')).json()
 for(const [route,id] of Object.entries(ids.plans)) {
  const root=`/api/ideas/${id}`, canvas=await (await s.call(`${root}/canvas`)).json(), edit=await (await s.call(`${root}/edit`)).json(), sources=(await (await s.call(`${root}/edit/sources`)).json()).sources
  const shots=ideas.find(idea=>idea.id===id).shots, preview=previewInput(edit.project,Object.fromEntries(sources.map(source=>[source.key,source.url])),shots,{font:'Noto Sans TC',color:null,logoUrl:null})
  const states=Object.fromEntries(edit.project.clips.map(c=>[c.id,clipStatus(c,canvas.doc,canvas.generations,canvas.takes).state]))
  assert.ok(Object.values(states).every(state=>state==='ok'))
  assert.equal(exportBlocked(edit.project,states),null)
  assert.equal(clipStatus({...edit.project.clips[0],source:{kind:'generation',id:'missing'}},canvas.doc,canvas.generations,canvas.takes).state,'missing')
  for(const clip of edit.project.clips) {
   const source=sources.find(source=>source.key===sourceKey(clip.source)), gen=canvas.generations.find(g=>g.id===clip.source.id)
   assert.equal(gen.model,'imported'); assert.equal(gen.status,'done'); assert.equal(gen.url,source.url); assert.equal(gen.inputs.duration,source.duration)
   assert.ok(gen.inputs.sentPrompt.includes('not filmed footage')||gen.inputs.sentPrompt.includes('not a fresh AI advert'))
   const label=inLang('en',()=>clipLabel(clip.source,shots,canvas.generations,canvas.takes))
   if(route==='ai') assert.match(label,/Shot [0-9]+.*v1/); else assert.match(label,/Shot 19.*v1/)
   assert.equal(preview.urls[sourceKey(clip.source)],gen.url)
   assert.ok(clip.out<=source.duration)
  }
  assert.equal(canvas.takes.length,0); assert.equal(canvas.generations.length,route==='ai'?3:2)
  if(route==='ai') { assert.equal(new Set(edit.project.clips.map(c=>c.source.id)).size,1); assert.equal(canvas.generations[0].nodeId,'prepared-imported-fullcut'); assert.ok(!canvas.doc.nodes.some(n=>n.id===canvas.generations[0].nodeId)) }
  else assert.match(clipLabel(edit.project.clips[0].source,[{id:'s19'}],canvas.generations,canvas.takes),/v1/)
  assert.equal((await s.call(`${root}/edit/export`,'POST')).status,409)
  assert.equal((await (await s.call(`${root}/cut`)).json()).review.status,'waiting')
 }
})

test('old persisted samples gain only exact import identities without discarding edits or replay jobs', async () => {
 const s=setup(), edit=await (await s.call(`${base}/edit`)).json(); edit.project.clips[0].muted=false
 assert.equal((await s.call(`${base}/edit`,'PUT',edit)).status,200)
 const gen=await (await s.call(`${base}/gen`,'POST',{nodeId:'n_sb_s1',model:'prepared-image',prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.'})).json()
 const saved=JSON.parse(s.local.getItem('prepared-data.v1'))
 for(const canvas of Object.values(saved.state.canvases)) canvas.generations=canvas.generations.filter(g=>g.model!=='imported')
 s.local.setItem('prepared-data.v1',JSON.stringify(saved))
 const restored=createPreparedDataWithClock(s.local,s.session,()=>1000), read=async path=>(await restored.request(new Request(`http://guided.test${path}`))).json()
 assert.deepEqual((await read(`${base}/edit`)).project,edit.project)
 assert.equal((await read(`${base}/cut`)).stale,true)
 assert.equal((await read(`${base}/gen/${gen.id}`)).status,'done')
 assert.equal((await read(`${base}/gen`)).filter(g=>g.model==='imported').length,3)
 assert.equal((await read(`/api/ideas/${ids.plans.shoot}/gen`)).filter(g=>g.model==='imported').length,2)
 const corrupt=JSON.parse(s.local.getItem('prepared-data.v1')); corrupt.state.canvases[ids.plans.ai].generations.find(g=>g.model==='imported').url='/demo-assets/batch-20261106/photographer/high-angle.mp4';s.local.setItem('prepared-data.v1',JSON.stringify(corrupt))
 const clean=createPreparedDataWithClock(s.local,s.session,()=>1200)
 assert.equal((await (await clean.request(new Request(`http://guided.test${base}/edit`))).json()).version,1)
})

test('original on-screen source quotes reach native breakdown separately from adapted silent plan', async () => {
 const s=setup(), library=await (await s.call('/api/library')).json(), format=library.formats[0]
 const expected=[
  {time:'0-6.13s',role:'hook',text:'Quoted source on-screen text (not spoken): "Turn tofu into..."'},
  {time:'6.13-9.03s',role:'payoff',text:'Quoted source on-screen text (not spoken; nutrition claim unverified): "Healthy & high protein okonomiyaki"'},
  {time:'9.03-10.27s',role:'cta',text:'Quoted source on-screen text (not spoken): "Want the full recipe? Comment "RECIPE" below!"'},
 ]
 assert.deepEqual(format.lines,expected)
 assert.match(format.editorNotes,/Original on-screen text is quoted/); assert.doesNotMatch(format.editorNotes,/transcription is unavailable/)
 assert.match(format.editorNotes,/nutrition claim is not independently verified/)
 const start=await (await s.call('/api/analyze','POST',{url:library.videos[0].url})).json(); s.tick(800)
 const analysis=await (await s.call(`/api/analyze/${start.job}`)).json(); assert.deepEqual(analysis.result.lines,expected)
 const plans=await (await s.call('/api/ideas')).json()
 for(const plan of plans) {
  assert.ok(plan.shots.every(shot=>shot.line===''))
  assert.ok(plan.script.lines.every(line=>line.say===''))
  assert.equal(plan.script.lines[0].onScreen,'Adapted copy: Turn silken tofu into something crispy.')
  assert.ok(!expected.some(line=>line.text===plan.script.lines[0].onScreen))
 }
})

test('native search parser, searchAll and saveLibrary retain the fixed analysed source and reload identity', async () => {
 const {registerHooks}=await import('node:module')
 const hook=registerHooks({resolve(specifier,context,next){return next(specifier==='./metrics'&&context.parentURL?.endsWith('/parseQuery.ts')?'./metrics.ts':specifier,context)}})
 let parseQuery
 try { ({parseQuery}=await import('../src/lib/parseQuery.ts')) } finally { hook.deregister() }
 const live=await import('../src/lib/live.ts')
 const s=setup(), original=globalThis.fetch, seen=[]
 globalThis.fetch=(input,init)=>{const request=input instanceof Request?input:new Request(`http://guided.test${input}`,init);seen.push(new URL(request.url).pathname);return s.data.request(request)}
 try {
  const previous=await live.loadLibrary(), parsed=parseQuery('Tofu Recipe',previous.formats)
  const query=([...parsed.keywords,...parsed.topics.map(topic=>topic.word)].join(' ')||'Tofu Recipe').trim()
  assert.equal(query.toLowerCase(),'tofu')
  const results=await live.searchAll(query,['instagram']); assert.equal(results.failed.length,0); assert.equal(results.videos.length,preparedSearchResult.videos.length)
  const video=results.videos.find(v=>v.id===ids.videoId); assert.equal(video.id,ids.videoId); assert.equal(video.formatId,ids.formatId); assert.equal(video.handle,'@Ever Green reference'); assert.equal(video.lengthSec,11); assert.equal(video.daysAgo,999)
  assert.deepEqual(video.keywords,['tofu']); assert.equal(video.views,0); assert.equal(video.followers,0)
  assert.equal(video.url,'https://www.instagram.com/reel/DVp3xOdFaHL/')
  const broken=new Map(previous.formats.filter(format=>format.shotList.length).map(format=>[format.id,format]))
  const merged={videos:results.videos,formats:results.formats.map(format=>broken.get(format.id)??format)}
  await live.saveLibrary(merged)
  const restored=createPreparedDataWithClock(s.local,s.session,()=>1000)
  const library=await (await restored.request(new Request('http://guided.test/api/library'))).json()
  assert.equal(library.videos[0].id,video.id); assert.equal(library.formats[0].shotList.length,21); assert.equal(library.formats[0].lines.length,3)
  const plans=await (await restored.request(new Request('http://guided.test/api/ideas'))).json(); assert.ok(plans.every(plan=>plan.videoId===video.id))
  assert.equal(s.data.bootstrap.session['remake.view.v1'],'search')
  const variant=await live.searchLive('  TOFU   Recipe ',false,'instagram'); await live.saveLibrary({videos:variant.videos,formats:merged.formats})
  for(const bad of ['egg recipe','recipe tofu','tofu recipe shrimp']) await assert.rejects(live.searchLive(bad,false,'instagram'))
  await assert.rejects(live.searchLive('tofu recipe',false,'youtube'))
  const injected=structuredClone(merged); injected.videos[0].url='https://foreign/'; await assert.rejects(live.saveLibrary(injected))
  assert.ok(seen.every(path=>['/api/library','/api/search'].includes(path)))
 }finally{globalThis.fetch=original}
})

test('fixed search side callers work without allowing other sources, metrics or queries', async () => {
 const live=await import('../src/lib/live.ts'), s=setup(), original=globalThis.fetch
 globalThis.fetch=(input,init)=>s.data.request(input instanceof Request?input:new Request(`http://guided.test${input}`,init))
 try {
  const result=await live.searchLive('tofu',false,'instagram')
  assert.equal((await live.fetchContentTypes('tofu',['instagram'])).size,0)
  assert.deepEqual(await (await s.call('/api/suggest?q=To')).json(),{queries:['Tofu Recipe']})
  const answer=await live.askAnswer('Tofu Recipe',result.videos); assert.match(answer.basis,/Prepared local sample/); assert.equal(answer.lines.length,1)
  const raw=await (await s.call('/api/search?q=%20TOFU%20%20RECIPE%20&platform=instagram')).json()
  assert.equal(raw.videos[0].id,'DVp3xOdFaHL'); assert.equal(raw.videos[0].plays,null); assert.equal(raw.videos[0].followers,null); assert.equal(raw.videos[0].createTime,null); assert.equal(raw.cached,true)
  for(const path of ['/api/search?q=eggs&platform=instagram','/api/search?q=tofu&platform=x','/api/search?q=tofu&q=tofu&platform=instagram','/api/search?q=tofu&platform=instagram&fresh=1','/api/search/types?q=eggs&platform=instagram','/api/suggest?q=eggs']) assert.ok((await s.call(path)).status>=400)
  assert.equal((await s.call('/api/search?q=tofu&platform=instagram','POST',{})).status,422)
  const library=await live.loadLibrary()
  for(const mutate of [v=>{v.videos[0].views=42},v=>{v.videos[0].id='foreign'},v=>{v.videos[0].thumbnail='https://foreign/image.jpg'},v=>{v.formats[0].shotList=[]}]) {
   const changed=structuredClone(library); mutate(changed); await assert.rejects(live.saveLibrary(changed))
  }
  await assert.rejects(live.askAnswer('Tofu Recipe',[{...result.videos[0],id:'foreign'}]))
 }finally{globalThis.fetch=original}
})

test('native S19 prompt wires and selected image drive actual prepared I2V and editor replacement', async () => {
 const {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts'), api=await import('../src/lib/canvas/api.ts'), graph=await import('../src/lib/canvas/graph.ts'), timeline=await import('../src/lib/editor/timeline.ts')
 const {legacyGenerationRequest,legacyInputsMatch}=await import('../src/lib/canvas/legacy.ts')
 const s=setup(), original=globalThis.fetch
 globalThis.fetch=(input,init)=>s.data.request(input instanceof Request?input:new Request(`http://guided.test${input}`,init))
 try {
  const id=ids.plans.ai, plan=(await (await s.call('/api/ideas')).json()).find(i=>i.id===id), shots=plan.shots
  assert.match(plan.script.lines[18].onScreen,/Adapted copy: Tofu okonomiyaki/); assert.equal(plan.script.lines[18].say,'')
  let canvas=await api.getCanvas(id); const models=await api.getModels(), imageModel=models.find(m=>m.id==='prepared-image'), videoModel=models.find(m=>m.id==='prepared-i2v')
  const {canConnect}=await import('../src/lib/canvas/ports.ts'); for(const edge of canvas.doc.edges) assert.equal(canConnect({...canvas.doc,edges:canvas.doc.edges.filter(e=>e.id!==edge.id)},edge,models).ok,true)
  assert.equal(graph.shotTextSource(canvas.doc,c.nodes.image,shots).from,'prompt')
  const image=await api.startGen(id,{nodeId:c.nodes.image,model:imageModel.id,...legacyGenerationRequest(canvas.doc,c.nodes.image,shots,canvas.generations,null,imageModel).request})
  s.tick(800); await api.pollGen(id,image.id,()=>{}, {intervalMs:0}); canvas=await api.getCanvas(id)
  canvas.doc.nodes.find(n=>n.id===c.nodes.image).data.selected=image.id; await api.putCanvas(id,canvas.version,canvas.doc); canvas=await api.getCanvas(id)
  const request=legacyGenerationRequest(canvas.doc,c.nodes.video,shots,canvas.generations,null,videoModel).request; assert.equal(request.startFrame,image.id); assert.equal(graph.modelRefusal(canvas.doc,c.nodes.video,videoModel,canvas.generations,null),null)
  const quote=await api.quoteNode(id,c.nodes.video,canvas.version); assert.equal(quote.total,0)
  const body={nodeId:c.nodes.video,model:videoModel.id,...request,canvasVersion:canvas.version,inputStamp:quote.inputStamp,quoteStamp:quote.quoteStamp,confirm:true}
  const video=await api.startGen(id,body); assert.equal((await api.startGen(id,body)).id,video.id); s.tick(1700); const done=await api.pollGen(id,video.id,()=>{},{intervalMs:0}); assert.match(done.url,/high-angle.mp4$/); assert.equal(legacyInputsMatch(canvas.doc,done,shots,[...canvas.generations,done],null,videoModel),true)
  canvas=await api.getCanvas(id); Object.assign(canvas.doc.nodes.find(n=>n.id===c.nodes.video).data,graph.reuseSettings(done)); await api.putCanvas(id,canvas.version,canvas.doc); canvas=await api.getCanvas(id); assert.equal(canvas.doc.nodes.find(n=>n.id===c.nodes.video).data.prompt,undefined)
  const edit=await (await s.call(`${base}/edit`)).json(), source={kind:'generation',id:done.id,nodeId:c.nodes.video,shotId:'s19'}
  const changed=timeline.placeShotClip(edit.project,source,5.875,shots.map(s=>s.id),'replacement-s19')
  assert.equal(changed.clips.length,21); assert.equal(changed.clips.filter(c=>c.source.shotId==='s19').length,1); assert.equal(changed.clips.find(c=>c.source.shotId==='s19').source.id,done.id)
  assert.equal((await s.call(`${base}/edit`,'PUT',{...edit,project:changed})).status,200)
  canvas=await api.getCanvas(id); canvas.doc.nodes.find(n=>n.id===c.nodes.video).data.selected=done.id; await api.putCanvas(id,canvas.version,canvas.doc); assert.equal(timeline.clipStatus(changed.clips.find(c=>c.id==='replacement-s19'),canvas.doc,canvas.generations,canvas.takes).state,'ok')
 }finally{globalThis.fetch=original}
})

test('both routes keep 21 shots and two honest same-node imported angle versions, including footage', async () => {
 const {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts'), {selectedGen,versionsOf}=await import('../src/lib/canvas/graph.ts'), {placeShotClip,clipStatus}=await import('../src/lib/editor/timeline.ts')
 const s=setup(), shots=(await (await s.call('/api/ideas')).json())[0].shots
 for(const [route,id] of Object.entries(ids.plans)) {
  const root=`/api/ideas/${id}`, canvas=await (await s.call(`${root}/canvas`)).json(), nodeId=route==='ai'?c.nodes.video:c.nodes.footage
  assert.equal(canvas.doc.nodes.filter(n=>n.type==='shot').length,21)
  const node=canvas.doc.nodes.find(n=>n.id===nodeId), versions=versionsOf(nodeId,canvas.generations)
  assert.equal(versions.length,2); assert.ok(versions.every(g=>g.model==='imported'&&g.kind==='video'&&g.inputs.sentPrompt.includes('not filmed footage')))
  assert.equal(new Set(versions.map(g=>g.url)).size,2); assert.equal(canvas.takes.length,0)
  node.data.selected='shoot-low-macro-video'; assert.equal((await s.call(`${root}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)
  assert.match(selectedGen(node,canvas.generations).url,/low-macro.mp4$/)
  const edit=await (await s.call(`${root}/edit`)).json(), source={kind:'generation',id:node.data.selected,nodeId,shotId:'s19'}
  const project=placeShotClip(edit.project,source,5.875,shots.map(s=>s.id),'angle-s19')
  assert.equal(project.clips.length,route==='ai'?21:1); assert.equal(clipStatus(project.clips.find(c=>c.id==='angle-s19'),canvas.doc,canvas.generations,canvas.takes).state,'ok')
  assert.equal((await s.call(`${root}/edit`,'PUT',{version:edit.version,project})).status,200)
  assert.equal((await (await s.call(`${root}/cut`)).json()).stale,true); assert.equal((await s.call(`${root}/edit/export`,'POST')).status,409)
  const upload=await s.call(`${root}/shots/18/takes`,'POST',{}); assert.equal(upload.status,422); assert.match((await upload.json()).error,/view-only/)
 }
})

test('I2V captures a selected same-plan S19 image and survives later selection while foreign input and graph edits fail closed', async () => {
 const {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts'), {preparedTutorialPrompt}=await import('../src/lib/guided/fixtures.ts')
 const s=setup(), imageBody={nodeId:c.nodes.image,model:'prepared-image',prompt:preparedTutorialPrompt,references:[]}
 const image=await (await s.call(`${base}/gen`,'POST',imageBody)).json(); s.tick(800); await s.call(`${base}/gen/${image.id}`)
 const select=async (id)=>{const canvas=await (await s.call(`${base}/canvas`)).json();canvas.doc.nodes.find(n=>n.id===c.nodes.image).data.selected=id;assert.equal((await s.call(`${base}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)}
 await select(image.id)
 const body={nodeId:c.nodes.video,model:'prepared-i2v',prompt:preparedTutorialPrompt,duration:6,startFrame:image.id,references:[]}
 const first=await (await s.call(`${base}/gen`,'POST',body)).json(); assert.equal(first.inputs.startFrame,image.id); assert.equal(first.inputs.inputStamp,undefined); const fingerprint=id=>JSON.parse(s.local.getItem('prepared-data.v1')).state.jobs.find(j=>j.generation.id===id).fingerprint; assert.ok(fingerprint(first.id).includes(image.id)); assert.ok(fingerprint(first.id).includes('0931917b5bc51a7fcfa13f11f36d451c965fe50f64a71bf372742e52e1098622'))
 const next=await (await s.call(`${base}/gen`,'POST',imageBody)).json(); s.tick(1700); await s.call(`${base}/gen/${next.id}`); await select(next.id)
 const restored=createPreparedDataWithClock(s.local,s.session,()=>1800)
 const old=await (await restored.request(new Request(`http://guided.test${base}/gen/${first.id}`))).json(); assert.equal(old.status,'done'); assert.equal(old.inputs.startFrame,image.id)
 const foreignBase=`/api/ideas/${ids.plans.shoot}`
 const foreign=await (await s.call(`${foreignBase}/gen`,'POST',imageBody)).json(); s.tick(2500); await s.call(`${foreignBase}/gen/${foreign.id}`)
 const wrongShot=await (await s.call(`${base}/gen`,'POST',{nodeId:'n_sb_s19',model:'prepared-image',prompt:'Low close shot of the finished okonomiyaki with toppings.'})).json(); s.tick(3300); await s.call(`${base}/gen/${wrongShot.id}`)
 for(const patch of [{startFrame:foreign.id},{startFrame:wrongShot.id},{startFrame:image.id},{startFrame:'https://foreign/frame.jpg'},{startFrame:'foreign'},{startFrame:'shoot-high-angle-video'},{references:[{source:'gen',genId:next.id}]},{model:'fal'},{count:2},{duration:5}]) assert.equal((await s.call(`${base}/gen`,'POST',{...body,startFrame:next.id,...patch})).status,422)
 const current=await (await s.call(`${base}/gen`,'POST',{...body,startFrame:next.id})).json(); assert.notEqual(current.id,first.id); assert.notEqual(fingerprint(current.id),fingerprint(first.id))
 let canvas=await (await s.call(`${base}/canvas`)).json()
 const bad=structuredClone(canvas); bad.doc.edges.push({...bad.doc.edges[0],id:'extra'}); assert.equal((await s.call(`${base}/canvas`,'PUT',{version:bad.version,doc:bad.doc})).status,422)
 const wrong=structuredClone(canvas); wrong.doc.edges[0].source='n_shot_s1'; assert.equal((await s.call(`${base}/canvas`,'PUT',{version:wrong.version,doc:wrong.doc})).status,422)
 const native=structuredClone(canvas); native.doc.edges=native.doc.edges.map(e=>({...e,id:`e_${e.source}_${e.target}_${e.targetHandle}`})); assert.equal((await s.call(`${base}/canvas`,'PUT',{version:native.version,doc:native.doc})).status,200)
 canvas=await (await s.call(`${base}/canvas`)).json(); assert.equal(canvas.doc.edges[0].id,c.edges.promptImage)
 assert.equal((await s.call(`${base}/canvas`,'PUT',{version:native.version,doc:native.doc})).status,409)
 const connected=structuredClone(canvas.doc); canvas.doc.edges=canvas.doc.edges.filter(e=>e.id!==c.edges.imageVideo)
 assert.equal((await s.call(`${base}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)
 assert.equal((await s.call(`${base}/gen`,'POST',{...body,startFrame:next.id})).status,422)
 canvas=await (await s.call(`${base}/canvas`)).json(); canvas.doc=connected
 assert.equal((await s.call(`${base}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)
 canvas=await (await s.call(`${base}/canvas`)).json()
 canvas.doc.nodes.find(n=>n.id===c.nodes.prompt).data.text='Changed draft'; assert.equal((await s.call(`${base}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)
 assert.equal((await s.call(`${base}/gen`,'POST',{...imageBody,prompt:'Changed draft'})).status,422)
 const afterDraft=createPreparedDataWithClock(s.local,s.session,()=>1900)
 assert.equal((await (await afterDraft.request(new Request(`http://guided.test${base}/gen/${first.id}`))).json()).id,first.id)
 const corrupted=JSON.parse(s.local.getItem('prepared-data.v1')); const captured=corrupted.state.jobs.find(j=>j.generation.id===first.id); captured.generation.inputs.startFrame=next.id; s.local.setItem('prepared-data.v1',JSON.stringify(corrupted))
 const refused=createPreparedDataWithClock(s.local,s.session,()=>4000); assert.equal((await refused.request(new Request(`http://guided.test${base}/gen/${first.id}`))).status,404)
})

test('migration preserves old graph drafts, edits and jobs while adding only fixed S19 bindings', async () => {
 const {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts')
 const s=setup(), edit=await (await s.call(`${base}/edit`)).json(); edit.project.clips[0].muted=false; assert.equal((await s.call(`${base}/edit`,'PUT',edit)).status,200)
 const image=await (await s.call(`${base}/gen`,'POST',{nodeId:'n_sb_s1',model:'prepared-image',prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.'})).json()
 const saved=JSON.parse(s.local.getItem('prepared-data.v1'))
 for(const [id,canvas] of Object.entries(saved.state.canvases)) {
  canvas.doc.nodes=canvas.doc.nodes.filter(n=>n.id!==c.nodes.prompt&&n.id!==c.nodes.footage&&(id!==ids.plans.ai||![c.nodes.image,c.nodes.video].includes(n.id)))
  canvas.doc.edges=[]
  if(id===ids.plans.shoot) for(const node of canvas.doc.nodes) if([c.nodes.image,c.nodes.video].includes(node.id)) node.data={model:node.type==='video'?'prepared-video':'prepared-image',prompt:'Prepared S19 high-angle alternative',selected:null,...(node.type==='video'?{duration:6}:{})}
  canvas.generations=canvas.generations.filter(g=>g.model!=='imported'||id!==ids.plans.ai||g.id==='prepared-source-derived-cut')
  for(const row of canvas.generations) if(row.model==='imported'&&id===ids.plans.shoot) row.nodeId=row.id.includes('high-angle')?'n_high-angle_video':'n_low-macro_video'
  saved.state.sources[id]=saved.state.sources[id].filter(source=>id!==ids.plans.ai||source.id==='prepared-source-derived-cut')
  for(const source of saved.state.sources[id]) if(id===ids.plans.shoot) source.nodeId=source.id.includes('high-angle')?'n_high-angle_video':'n_low-macro_video'
 }
 for(const clip of saved.state.projects[ids.plans.ai].project.clips) delete clip.source.shotId
 saved.state.projects[ids.plans.shoot].project.clips[0].source.nodeId='n_high-angle_video'
 saved.state.projects[ids.plans.shoot].project.primaries.s19=structuredClone(saved.state.projects[ids.plans.shoot].project.clips[0].source)
 const {preparedAssets}=await import('../src/lib/guided/fixtures.ts'), legacyAsset=preparedAssets.find(a=>a.id==='shoot-high-angle-video'), legacyPrompt='Prepared S19 high-angle alternative'
 const stamp=JSON.stringify([ids.plans.shoot,c.nodes.video,'prepared-video',legacyPrompt,legacyAsset.id])
 const oldVideo={id:'old-prepared-video',ideaId:ids.plans.shoot,nodeId:c.nodes.video,kind:'video',model:'prepared-video',inputs:{prompt:legacyPrompt,references:[],inputStamp:stamp,sentPrompt:`${legacyAsset.label}: ${legacyPrompt}`,duration:6},status:'queued',estUsd:0,actualUsd:null,url:null,error:null,createdAt:0,finishedAt:null}
 saved.state.canvases[ids.plans.shoot].generations.push(structuredClone(oldVideo)); saved.state.jobs.push({fingerprint:stamp,assetId:legacyAsset.id,generation:oldVideo,started:0})

 s.local.setItem('prepared-data.v1',JSON.stringify(saved))
 const restored=createPreparedDataWithClock(s.local,s.session,()=>1000), read=async path=>(await restored.request(new Request(`http://guided.test${path}`))).json()
 const project=(await read(`${base}/edit`)).project; assert.equal(project.clips[0].muted,false); assert.equal(project.clips[18].source.shotId,'s19')
 assert.equal((await read(`${base}/gen/${image.id}`)).status,'done'); assert.equal((await read(`/api/ideas/${ids.plans.shoot}/gen/old-prepared-video`)).model,'prepared-video'); assert.equal((await read(`/api/ideas/${ids.plans.shoot}/gen/old-prepared-video`)).status,'done'); assert.equal((await read(`${base}/canvas`)).doc.edges.length,3)
 assert.equal((await read(`/api/ideas/${ids.plans.shoot}/edit`)).project.primaries.s19.nodeId,c.nodes.footage)
 const original=globalThis.fetch; globalThis.fetch=()=>assert.fail('network forbidden'); try {restored.reset();assert.equal((await read(`${base}/canvas`)).generations.filter(g=>g.model!=='imported').length,0)}finally{globalThis.fetch=original}
})

test('native legacy reconciliation naturally clears only matching video stale after image update', async () => {
 const {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts'), api=await import('../src/lib/canvas/api.ts'), native=await import('../src/lib/canvas/session.ts'), legacy=await import('../src/lib/canvas/legacy.ts'), graph=await import('../src/lib/canvas/graph.ts')
 const s=setup(), original=globalThis.fetch
 globalThis.fetch=(input,init)=>s.data.request(input instanceof Request?input:new Request(`http://guided.test${input}`,init))
 try {
  const shots=(await (await s.call('/api/ideas')).json()).find(i=>i.id===ids.plans.ai).shots, models=await api.getModels()
  const session=native.createCanvasSession(await api.getCanvas(ids.plans.ai),{save:(version,doc)=>api.putCanvas(ids.plans.ai,version,doc),readDraft:()=>null,writeDraft:()=>{}})
  let gens=await api.listGens(ids.plans.ai)
  const io={current:session.doc,change:session.change,flush:session.flush,voices:[],get generations(){return gens},matchesInputs:g=>legacy.legacyInputsMatch(session.doc(),g,shots,gens,null,models.find(m=>m.id===g.model)),importVoice:async()=>assert.fail('no voice'),onVoice:()=>assert.fail('no voice')}
  const start=async(nodeId)=>{const model=models.find(m=>m.id===session.doc().nodes.find(n=>n.id===nodeId).data.model), quote=await api.quoteNode(ids.plans.ai,nodeId,session.version());assert.equal(typeof quote.inputStamp,'string');const gen=await api.startGen(ids.plans.ai,{nodeId,model:model.id,...legacy.legacyGenerationRequest(session.doc(),nodeId,shots,gens,null,model).request,canvasVersion:session.version(),inputStamp:quote.inputStamp,quoteStamp:quote.quoteStamp,confirm:true});await native.rememberGeneration(gen,io);return gen}
  const finish=async(gen,time)=>{s.tick(time);const done=await api.pollGen(ids.plans.ai,gen.id,()=>{},{intervalMs:0});gens=await api.listGens(ids.plans.ai);await native.reconcileGenerations(gens,io);return done}
  await finish(await start(c.nodes.image),800)
  assert.equal(session.doc().nodes.find(n=>n.id===c.nodes.video).data.stale,true)
  const video=await finish(await start(c.nodes.video),1700)
  assert.equal(io.matchesInputs(video),true)
  assert.equal(session.doc().nodes.find(n=>n.id===c.nodes.video).data.stale,false)
  assert.equal(session.doc().nodes.find(n=>n.id===c.nodes.video).data.selected,video.id)
  const matching=structuredClone(session.doc()), changed=structuredClone(matching); changed.nodes.find(n=>n.id===c.nodes.prompt).data.text='Changed prompt'
  let negative=graph.markStale(changed,c.nodes.prompt,gens)
  const negativeIO={...io,current:()=>negative,change:doc=>{negative=doc},flush:async()=>true,matchesInputs:g=>legacy.legacyInputsMatch(negative,g,shots,gens,null,models.find(m=>m.id===g.model))}
  assert.equal(negativeIO.matchesInputs(video),false); await native.selectGeneration(video,negativeIO); assert.equal(negative.nodes.find(n=>n.id===c.nodes.video).data.stale,true)
  await finish(await start(c.nodes.image),2600)
  assert.equal(io.matchesInputs(video),false); await native.selectGeneration(video,io); assert.equal(session.doc().nodes.find(n=>n.id===c.nodes.video).data.stale,true)
  for(const path of [`${base}/gen/${video.id}`,`${base}/gen`,`${base}/canvas`]) {const value=await (await s.call(path)).json();const rows=Array.isArray(value)?value:value.generations??[value];assert.ok(rows.every(g=>g.inputs.inputStamp===undefined))}
  const reloaded=createPreparedDataWithClock(s.local,s.session,()=>2700), canvas=await (await reloaded.request(new Request(`http://guided.test${base}/canvas`))).json(); assert.ok(canvas.generations.every(g=>g.inputs.inputStamp===undefined))
 }finally{globalThis.fetch=original}
})

test('only exact validated old prepared stamps migrate out of every legacy generation read path', async () => {
 const {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts'), {preparedTutorialPrompt}=await import('../src/lib/guided/fixtures.ts')
 const s=setup(), image=await (await s.call(`${base}/gen`,'POST',{nodeId:c.nodes.image,model:'prepared-image',prompt:preparedTutorialPrompt})).json();s.tick(800);await s.call(`${base}/gen/${image.id}`)
 const canvas=await (await s.call(`${base}/canvas`)).json();canvas.doc.nodes.find(n=>n.id===c.nodes.image).data.selected=image.id
 assert.equal((await s.call(`${base}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)
 const video=await (await s.call(`${base}/gen`,'POST',{nodeId:c.nodes.video,model:'prepared-i2v',prompt:preparedTutorialPrompt,startFrame:image.id,duration:6})).json()
 const draft=await (await s.call(`${base}/canvas`)).json();draft.doc.nodes.find(n=>n.id===c.nodes.prompt).data.text='Keep draft';assert.equal((await s.call(`${base}/canvas`,'PUT',{version:draft.version,doc:draft.doc})).status,200)
 const old=JSON.parse(s.local.getItem('prepared-data.v1'))
 for(const job of old.state.jobs) {job.generation.inputs.inputStamp=job.fingerprint;old.state.canvases[job.generation.ideaId].generations.find(g=>g.id===job.generation.id).inputs.inputStamp=job.fingerprint}
 s.local.setItem('prepared-data.v1',JSON.stringify(old))
 const restored=createPreparedDataWithClock(s.local,s.session,()=>900), persisted=JSON.parse(s.local.getItem('prepared-data.v1'))
 assert.equal(persisted.state.sequence,old.state.sequence);assert.equal(persisted.state.jobs.length,2)
 assert.deepEqual(persisted.state.jobs.map(j=>j.fingerprint),old.state.jobs.map(j=>j.fingerprint))
 assert.ok(persisted.state.jobs.every(j=>j.generation.inputs.inputStamp===undefined))
 assert.equal(persisted.state.canvases[ids.plans.ai].doc.nodes.find(n=>n.id===c.nodes.prompt).data.text,'Keep draft')
 for(const path of [`${base}/gen/${video.id}`,`${base}/gen`,`${base}/canvas`]) {const response=await restored.request(new Request(`http://guided.test${path}`));assert.equal(response.status,200);const value=await response.json(), rows=Array.isArray(value)?value:value.generations??[value];assert.ok(rows.every(g=>g.inputs.inputStamp===undefined))}
 for(const corrupt of [state=>{state.jobs[1].generation.inputs.inputStamp='foreign';state.canvases[ids.plans.ai].generations.find(g=>g.id===video.id).inputs.inputStamp='foreign'},state=>{state.canvases[ids.plans.ai].generations.find(g=>g.id===video.id).inputs.inputStamp='mismatch'},state=>{state.jobs[1].fingerprint='foreign'},state=>{state.canvases[ids.plans.ai].generations.push(structuredClone(state.canvases[ids.plans.ai].generations.find(g=>g.id===video.id)))},state=>{state.jobs.push(structuredClone(state.jobs[1]))}]) {
  const bad=structuredClone(old);corrupt(bad.state);s.local.setItem('prepared-data.v1',JSON.stringify(bad));const denied=createPreparedDataWithClock(s.local,s.session,()=>1000);assert.equal((await denied.request(new Request(`http://guided.test${base}/gen/${video.id}`))).status,404)
 }
})

test('fixed search shows the available pinned Instagram tofu gallery with unique cached references with local matching thumbnails and safe native saves', async () => {
 const live=await import('../src/lib/live.ts'), {readFileSync}=await import('node:fs'), {preparedSearchResult}=await import('../src/lib/guided/fixtures.ts'), s=setup(), original=globalThis.fetch
 globalThis.fetch=(input,init)=>s.data.request(input instanceof Request?input:new Request(`http://guided.test${input}`,init))
 try {
  const result=await live.searchLive('tofu',false,'instagram'); assert.equal(result.videos.length,12)
  assert.equal(new Set(result.videos.map(v=>v.id)).size,result.videos.length);assert.equal(new Set(result.videos.map(v=>v.thumbnail)).size,result.videos.length)
  const target=result.videos.find(v=>v.id===ids.videoId);assert.equal(target.url,'https://www.instagram.com/reel/DVp3xOdFaHL/')
  const cache=JSON.parse(readFileSync(new URL('../backend/pinned/48e1400ee0794f8f6c7ed5f4eb7fdf960d6a806c.json',import.meta.url),'utf8'))
  assert.deepEqual(new Set(preparedSearchResult.videos.slice(1).map(v=>v.id)),new Set(cache.videos.filter(v=>v.id!=='4017428646242838414').map(v=>v.id)))
  for(const raw of preparedSearchResult.videos.slice(1)) {
   const source=cache.videos.find(v=>v.id===raw.id);for(const key of ['url','author','plays','likes','comments','shares','saves','duration','followers','medianViews','music','musicOriginal','hashtags']) assert.deepEqual(raw[key],source[key]);assert.equal(raw.sourceFetchedAt,cache.fetchedAt);assert.match(raw.text,/Cached 2 Nov 2026/);assert.match(raw.text,/analysis and transcript are unavailable/);assert.ok(source.text.split('\n').some(line=>line.trim() && raw.text.includes(line.trim())))
   assert.match(raw.cover,/^\/demo-assets\/search-results\/instagram-[0-9]+\.jpg$/)
   const bytes=readFileSync(new URL('../public'+raw.cover,import.meta.url));assert.equal(bytes[0],255);assert.equal(bytes[1],216)
  }
  const known=await live.loadLibrary(), broken=new Map(known.formats.filter(f=>f.shotList.length).map(f=>[f.id,f]))
  const merged={videos:result.videos,formats:result.formats.map(f=>broken.get(f.id)??f)};await live.saveLibrary(merged)
  await live.saveLibrary({videos:[target],formats:[known.formats.find(f=>f.id===ids.formatId)]})
  for(const v of result.videos.filter(v=>v.id!==ids.videoId)) {assert.notEqual(v.formatId,ids.formatId);await assert.rejects(live.analyzeVideo(v.url,()=>{}),/no local analysis/)}
  const outside=cache.videos.find(v=>v.id==='4017428646242838414'), injected=structuredClone(merged);injected.videos[1].id=`ig-${outside.id}`;injected.videos[1].url=outside.url;await assert.rejects(live.saveLibrary(injected))
  const unknown=structuredClone(merged);unknown.videos[1].url='https://foreign/';await assert.rejects(live.saveLibrary(unknown))
  const changed=structuredClone(merged);changed.videos[1].views++;await assert.rejects(live.saveLibrary(changed))
  assert.equal((await (await s.call('/api/health')).json()).resultsPerSearch,29)
  const answer=await live.askAnswer('Tofu Recipe',result.videos);assert.ok(answer.lines[0].includes(String(result.videos.length)))
  const restored=createPreparedDataWithClock(s.local,s.session,()=>1000), library=await (await restored.request(new Request('http://guided.test/api/library'))).json();assert.equal(library.videos.length,29);assert.equal(library.formats.find(f=>f.id===ids.formatId).lines.length,3)
 }finally{globalThis.fetch=original}
})

test('old target-only library migrates without losing replay state, and translated cached placeholders stay allowlisted', async () => {
 const live=await import('../src/lib/live.ts'), lang=await import('../src/lib/i18n.ts'), s=setup(), original=globalThis.fetch, priorLang=lang.getActiveLang()
 const started=await (await s.call(`${base}/gen`,'POST',{nodeId:'n_sb_s1',model:'prepared-image',prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.'})).json()
 const saved=JSON.parse(s.local.getItem('prepared-data.v1'));saved.state.library.videos=saved.state.library.videos.filter(v=>v.id===ids.videoId);saved.state.library.formats=saved.state.library.formats.filter(f=>f.id===ids.formatId);s.local.setItem('prepared-data.v1',JSON.stringify(saved))
 const restored=createPreparedDataWithClock(s.local,s.session,()=>1000), gen=await (await restored.request(new Request(`http://guided.test${base}/gen/${started.id}`))).json();assert.equal(gen.status,'done');assert.equal(JSON.parse(s.local.getItem('prepared-data.v1')).state.sequence,saved.state.sequence)
 globalThis.fetch=(input,init)=>restored.request(input instanceof Request?input:new Request(`http://guided.test${input}`,init))
 try {
  lang.setActiveLang('zh-Hant');const results=await live.searchLive('tofu',false,'instagram'), library=await live.loadLibrary(), target=library.formats.find(f=>f.id===ids.formatId)
  const body={videos:results.videos,formats:results.formats.map(f=>f.id===ids.formatId?target:f)};await live.saveLibrary(body)
  const invented=structuredClone(body);invented.formats.find(f=>f.id!==ids.formatId).lines=[{time:'0-1s',text:'Invented transcript',role:'hook'}];await assert.rejects(live.saveLibrary(invented))
  const duplicate=structuredClone(body);duplicate.videos[1]=duplicate.videos[0];await assert.rejects(live.saveLibrary(duplicate))
  assert.equal((await live.loadLibrary()).formats.find(f=>f.id===ids.formatId).shotList.length,21)
  await assert.rejects(live.searchLive('unrelated search',false,'instagram'))
 }finally{lang.setActiveLang(priorLang);globalThis.fetch=original}
})

test('real cached source dates survive native search/save/reload and render as Nov 2 rather than today', async () => {
 const live=await import('../src/lib/live.ts'), evidence=await import('../src/lib/evidence.ts'), {preparedAt}=await import('../src/lib/guided/fixtures.ts'), s=setup(), original=globalThis.fetch, fixedNow=Date.parse('2026-11-06T05:45:00Z'), cacheAt=1793579309700
 globalThis.fetch=(input,init)=>s.data.request(input instanceof Request?input:new Request(`http://guided.test${input}`,init))
 try {
  const seeded=await live.loadLibrary();assert.equal(seeded.videos.find(v=>v.id===ids.videoId).fetchedAt,preparedAt)
  for(const video of seeded.videos.filter(v=>v.platform==='instagram'&&v.id!==ids.videoId)) {assert.equal(video.fetchedAt,cacheAt);assert.match(evidence.fetchedLine(video),/2026-11-02/);assert.equal(evidence.cachedLabel(video.fetchedAt,fixedNow),'Cached · fetched 4 days ago')}
  const result=await live.searchLive('tofu',false,'instagram');assert.equal(result.fetchedAt,cacheAt)
  assert.equal(result.videos.find(v=>v.id===ids.videoId).fetchedAt,preparedAt)
  const target=seeded.formats.find(f=>f.id===ids.formatId);await live.saveLibrary({videos:result.videos,formats:result.formats.map(f=>f.id===ids.formatId?target:f)})
  const restored=createPreparedDataWithClock(s.local,s.session,()=>1000), saved=await (await restored.request(new Request('http://guided.test/api/library'))).json()
  for(const video of saved.videos.filter(v=>v.platform==='instagram'&&v.id!==ids.videoId)) {assert.equal(video.fetchedAt,cacheAt);assert.match(evidence.fetchedLine(video),/2026-11-02/);assert.doesNotMatch(evidence.cachedLabel(video.fetchedAt,fixedNow),/today/)}
 }finally{globalThis.fetch=original}
})

test('per-result timestamp is only used for explicit prepared responses with a valid positive integer date', async () => {
 const live=await import('../src/lib/live.ts'), {preparedSearchResult,preparedAt}=await import('../src/lib/guided/fixtures.ts'), original=globalThis.fetch, sourceAt=1793579309700
 try {
  const response=async(prepared,sourceFetchedAt,batch=preparedAt)=>{globalThis.fetch=async()=>new Response(JSON.stringify({videos:[{...preparedSearchResult.videos[0],sourceFetchedAt}],prepared,...(batch==='missing'?{}:{fetchedAt:batch}),cached:true}));return (await live.searchLive('tofu',false,'instagram')).videos[0].fetchedAt}
  assert.equal(await response(true,sourceAt),sourceAt)
  for(const flag of [false,undefined,1,'true']) assert.equal(await response(flag,sourceAt),preparedAt)
  for(const bad of [undefined,null,0,-1,1.5,'1793579309700',NaN,Infinity,Number.MAX_SAFE_INTEGER,8640000000000001]) assert.equal(await response(true,bad),preparedAt)
  assert.equal(await response(false,sourceAt,'missing'),undefined);assert.equal(await response(true,undefined,'missing'),undefined);assert.equal(await response(true,sourceAt,'missing'),sourceAt)
 }finally{globalThis.fetch=original}
})

test('only the known wrong supplemental timestamp migrates while jobs, sequence and drafts remain intact', async () => {
 const {preparedAt,preparedCacheFetchedAt}=await import('../src/lib/guided/fixtures.ts'), {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts'), s=setup()
 const gen=await (await s.call(`${base}/gen`,'POST',{nodeId:'n_sb_s1',model:'prepared-image',prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.'})).json()
 const canvas=await (await s.call(`${base}/canvas`)).json();canvas.doc.nodes.find(n=>n.id===c.nodes.prompt).data.text='Keep date migration draft';assert.equal((await s.call(`${base}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)
 const old=JSON.parse(s.local.getItem('prepared-data.v1'));for(const video of old.state.library.videos) if(video.platform==='instagram'&&video.id!==ids.videoId) video.fetchedAt=preparedAt
 s.local.setItem('prepared-data.v1',JSON.stringify(old));const fixed=createPreparedDataWithClock(s.local,s.session,()=>1000)
 const persisted=JSON.parse(s.local.getItem('prepared-data.v1'));assert.equal(persisted.state.sequence,old.state.sequence);assert.equal(persisted.state.jobs[0].fingerprint,old.state.jobs[0].fingerprint)
 assert.equal(persisted.state.canvases[ids.plans.ai].doc.nodes.find(n=>n.id===c.nodes.prompt).data.text,'Keep date migration draft')
 assert.equal((await (await fixed.request(new Request(`http://guided.test${base}/gen/${gen.id}`))).json()).status,'done')
 for(const v of persisted.state.library.videos) assert.equal(v.fetchedAt,v.id===ids.videoId?preparedAt:v.platform==='instagram'?preparedCacheFetchedAt:1793072997591)
 const unknown=structuredClone(old);unknown.state.library.videos.find(v=>v.id!==ids.videoId).fetchedAt=preparedAt-1;s.local.setItem('prepared-data.v1',JSON.stringify(unknown));const denied=createPreparedDataWithClock(s.local,s.session,()=>1000);assert.equal((await denied.request(new Request(`http://guided.test${base}/gen/${gen.id}`))).status,404)
})


test('the previous six-card gallery expands without losing jobs, sequence or prompt drafts', async () => {
 const {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts'), s=setup()
 const gen=await (await s.call(`${base}/gen`,'POST',{nodeId:'n_sb_s1',model:'prepared-image',prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.'})).json()
 const canvas=await (await s.call(`${base}/canvas`)).json();canvas.doc.nodes.find(n=>n.id===c.nodes.prompt).data.text='Preserve six-card gallery draft';assert.equal((await s.call(`${base}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)
 const old=JSON.parse(s.local.getItem('prepared-data.v1')), oldIds=new Set([ids.videoId,...['3965228470707584451','3967092331747788579','3977423352452053149','3984140265618652354','3989438398069123761'].map(id=>`ig-${id}`)])
 old.state.library.videos=old.state.library.videos.filter(v=>oldIds.has(v.id));const formats=new Set(old.state.library.videos.map(v=>v.formatId));old.state.library.formats=old.state.library.formats.filter(f=>formats.has(f.id));assert.equal(old.state.library.videos.length,6)
 s.local.setItem('prepared-data.v1',JSON.stringify(old));const restored=createPreparedDataWithClock(s.local,s.session,()=>1000), persisted=JSON.parse(s.local.getItem('prepared-data.v1'))
 assert.equal(persisted.state.library.videos.length,29);assert.deepEqual(persisted.state.jobs,old.state.jobs);assert.equal(persisted.state.sequence,old.state.sequence)
 assert.equal(persisted.state.canvases[ids.plans.ai].doc.nodes.find(n=>n.id===c.nodes.prompt).data.text,'Preserve six-card gallery draft')
 assert.equal(persisted.state.library.formats.find(f=>f.id===ids.formatId).shotList.length,21);assert.equal(persisted.state.library.formats.find(f=>f.id===ids.formatId).lines.length,3)
 assert.equal((await (await restored.request(new Request(`http://guided.test${base}/gen/${gen.id}`))).json()).status,'done')
})


test('native mixed-platform tofu wall retains exact cached records, labels, dates and strict saves', async () => {
 const live=await import('../src/lib/live.ts'), evidence=await import('../src/lib/evidence.ts'), {readFileSync}=await import('node:fs'), lang=await import('../src/lib/i18n.ts'), s=setup(), original=globalThis.fetch, priorLang=lang.getActiveLang(), fixedNow=Date.parse('2026-11-06T05:45:00Z')
 globalThis.fetch=(input,init)=>s.data.request(input instanceof Request?input:new Request(`http://guided.test${input}`,init))
 try {
  const cache=JSON.parse(readFileSync(new URL('../backend/pinned/e9757527822e4a60a1bf27415af6c18ec463b4fb.json',import.meta.url),'utf8')), raw=await (await s.call('/api/search?q=TOFU%20Recipe&platform=tiktok')).json()
  assert.equal(raw.platform,'tiktok');assert.equal(raw.fetchedAt,cache.fetchedAt);assert.equal(raw.videos.length,17);assert.equal(raw.mediansPending,false)
  for(const v of raw.videos) {
   const source=cache.videos.find(x=>x.id===v.id);for(const key of ['url','author','plays','likes','comments','shares','saves','duration','followers','medianViews','music','musicOriginal','hashtags','createTime']) assert.deepEqual(v[key],source[key]);assert.ok(v.duration>0);assert.equal(v.sourceFetchedAt,cache.fetchedAt)
   assert.deepEqual(readFileSync(new URL('../public'+v.cover,import.meta.url)),readFileSync(new URL('../backend/pinned/covers/tiktok-'+v.id+'.jpg',import.meta.url)))
  }
  const result=await live.searchAll('tofu',['instagram','tiktok']);assert.deepEqual(result.failed,[]);assert.equal(result.videos.length,29);assert.equal(new Set(result.videos.map(v=>v.id)).size,29);assert.equal(new Set(result.videos.map(v=>v.thumbnail)).size,29)
  assert.equal(result.videos.filter(v=>v.platform==='instagram').length,12);assert.equal(result.videos.filter(v=>v.platform==='tiktok').length,17)
  for(const v of result.videos.filter(v=>v.platform==='tiktok')) {const item=raw.videos.find(x=>`tt-${x.id}`===v.id);assert.ok(item);assert.equal(v.formatId,`live-${item.id}`);assert.equal(v.handle,`@${item.author}`);assert.equal(v.lengthSec,Math.round(item.duration));assert.equal(v.daysAgo,Math.max(0,Math.round((Date.now()-Date.parse(item.createTime))/86400000)));assert.equal(v.fetchedAt,cache.fetchedAt);assert.match(evidence.fetchedLine(v),/2026-10-27/);assert.equal(evidence.cachedLabel(v.fetchedAt,fixedNow),'Cached · fetched 10 days ago');await assert.rejects(live.analyzeVideo(v.url,()=>{}),/no local analysis/)}
  const seed=await live.loadLibrary(), target=seed.formats.find(f=>f.id===ids.formatId), merge=r=>({videos:r.videos,formats:r.formats.map(f=>f.id===ids.formatId?target:f)})
  const tiktokOnly=await live.searchLive('tofu',false,'tiktok');await live.saveLibrary({videos:tiktokOnly.videos,formats:tiktokOnly.formats});assert.equal((await live.loadLibrary()).videos.find(v=>v.id===ids.videoId).formatId,ids.formatId)
  await live.saveLibrary(merge(result));const answer=await live.askAnswer('Tofu Recipe',result.videos);assert.match(answer.lines[0],/29/);assert.match(answer.basis,/27 Oct 2026/);assert.match(answer.basis,/2 Nov 2026/)
  lang.setActiveLang('zh-Hant');await live.saveLibrary(merge(await live.searchAll('TOFU Recipe',['instagram','tiktok'])))
  const types=await live.fetchContentTypes('tofu',['instagram','tiktok']);assert.equal(types.size,0)
  for(const mutate of [v=>{v.platform='instagram'},v=>{v.views++},v=>{v.fetchedAt=1793912400000},v=>{v.daysAgo=123456},v=>{v.url='https://foreign/'}]) {const body=merge(result);body.videos=structuredClone(body.videos);mutate(body.videos.find(v=>v.platform==='tiktok'));await assert.rejects(live.saveLibrary(body))}
  const generation=await (await s.call(`${base}/gen`,'POST',{nodeId:'n_sb_s1',model:'prepared-image',prompt:'Hand lifts the plastic mould off a block of silken tofu in a white bowl.'})).json()
  const {GUIDED_CANVAS_IDS:c}=await import('../src/lib/guided/contracts.ts'), canvas=await (await s.call(`${base}/canvas`)).json();canvas.doc.nodes.find(n=>n.id===c.nodes.prompt).data.text='Keep old twelve-card draft';assert.equal((await s.call(`${base}/canvas`,'PUT',{version:canvas.version,doc:canvas.doc})).status,200)
  const old=JSON.parse(s.local.getItem('prepared-data.v1'));old.state.library.videos=old.state.library.videos.filter(v=>v.platform==='instagram');const known=new Set(old.state.library.videos.map(v=>v.formatId));old.state.library.formats=old.state.library.formats.filter(f=>known.has(f.id));assert.equal(old.state.library.videos.length,12);s.local.setItem('prepared-data.v1',JSON.stringify(old));const restored=createPreparedDataWithClock(s.local,s.session,()=>1000), persisted=JSON.parse(s.local.getItem('prepared-data.v1'));assert.equal(persisted.state.library.videos.length,29);assert.deepEqual(persisted.state.jobs,old.state.jobs);assert.equal(persisted.state.sequence,old.state.sequence)
  assert.equal(persisted.state.canvases[ids.plans.ai].doc.nodes.find(n=>n.id===c.nodes.prompt).data.text,'Keep old twelve-card draft');assert.equal((await (await restored.request(new Request(`http://guided.test${base}/gen/${generation.id}`))).json()).status,'done')
  const library=await (await restored.request(new Request('http://guided.test/api/library'))).json();assert.equal(library.formats.find(f=>f.id===ids.formatId).shotList.length,21);assert.equal(library.formats.find(f=>f.id===ids.formatId).lines.length,3)
  const health=await (await s.call('/api/health')).json();assert.deepEqual(health.platforms,['instagram','tiktok']);assert.deepEqual(health.platformCounts,{instagram:12,tiktok:17});assert.equal(health.resultsPerSearch,29)
  for(const path of ['/api/search?q=eggs&platform=tiktok','/api/search?q=tofu&platform=x','/api/search?q=tofu&platform=youtube','/api/search/types?q=eggs&platform=tiktok']) assert.ok((await s.call(path)).status>=400)
 } finally {lang.setActiveLang(priorLang);globalThis.fetch=original}
})


test('native current publication ages stay exact while canonical snapshot metadata survives a later day', async () => {
 const live=await import('../src/lib/live.ts'), s=setup(), original=globalThis.fetch, originalNow=Date.now
 globalThis.fetch=(input,init)=>s.data.request(input instanceof Request?input:new Request(`http://guided.test${input}`,init))
 try {
  Date.now=()=>Date.parse('2026-11-06T05:45:00Z');const result=await live.searchAll('tofu',['instagram','tiktok']), seed=await live.loadLibrary(), target=seed.formats.find(f=>f.id===ids.formatId)
  await live.saveLibrary({videos:result.videos,formats:result.formats.map(f=>f.id===ids.formatId?target:f)})
  const initial=result.videos.find(v=>v.platform==='tiktok'), savedBefore=JSON.parse(s.local.getItem('prepared-data.v1')).state
  Date.now=()=>Date.parse('2026-11-13T05:45:00Z');const restored=createPreparedDataWithClock(s.local,s.session,()=>0);assert.deepEqual(JSON.parse(s.local.getItem('prepared-data.v1')).state,savedBefore)
  const latest=await live.searchAll('tofu',['instagram','tiktok']);assert.equal(latest.videos.find(v=>v.id===initial.id).daysAgo,initial.daysAgo+7)
  await live.saveLibrary({videos:latest.videos,formats:latest.formats.map(f=>f.id===ids.formatId?target:f)})
  await assert.rejects(live.saveLibrary({videos:result.videos,formats:result.formats.map(f=>f.id===ids.formatId?target:f)}))
  assert.equal((await (await restored.request(new Request('http://guided.test/api/library'))).json()).videos.length,29)
 } finally {Date.now=originalNow;globalThis.fetch=original}
})

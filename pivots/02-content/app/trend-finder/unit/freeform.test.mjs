import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apiBase } from '../src/lib/canvas/resource.ts'
import { createNode, editorEdges, removeEditorSource, applyPromptPlan } from '../src/lib/canvas/freeform.ts'
import { canConnect, compatibleKinds } from '../src/lib/canvas/ports.ts'
const n = (id, type, data = {}) => ({id,type,data,position:{x:0,y:0}})
const empty = {nodes:[],edges:[]}
test('workspace routes are explicit, legacy ids remain legacy', () => {
 assert.equal(apiBase({kind:'workspace',id:'ws x'}), '/api/workspaces/ws%20x')
 assert.equal(apiBase('ws_x'), '/api/ideas/ws_x')
})
test('editor is explicit and unique', () => {
 const p = createNode(empty,'prompt',{x:12,y:15})
 assert.equal(p.nodes.length,1)
 const e = createNode(p,'editor',{x:20,y:20})
 assert.equal(e.nodes.at(-1).id,'n_editor')
 assert.equal(createNode(e,'editor',{x:0,y:0}),e)
})
test('typed connections reject wrong handles and offer voice/editor', () => {
 const doc={nodes:[n('p','prompt'),n('v','voice'),n('a','upload',{media:'audio'}),n('x','video'),n('n_editor','editor')],edges:[]}
 assert.equal(canConnect(doc,{source:'p',sourceHandle:'wrong',target:'v',targetHandle:'in:text'},[]).ok,false)
 assert.equal(canConnect(doc,{source:'p',sourceHandle:'out',target:'v',targetHandle:'in:text'},[]).ok,true)
 assert.ok(compatibleKinds(doc,'p').some(x=>x.kind==='voice'))
 assert.deepEqual(compatibleKinds(doc,'x'),[{kind:'editor',handle:'in:clips'}])
 assert.deepEqual(compatibleKinds(doc,'a'),[{kind:'editor',handle:'in:audio'}])
})
test('editor edges reflect saved project and removal removes split clips too', () => {
 const doc={nodes:[n('v','video',{selected:'g'}),n('a','voice',{voiceId:'voice1'}),n('n_editor','editor')],edges:[]}
 const p={clips:[{id:'c',source:{kind:'generation',id:'g',nodeId:'v'}},{id:'split',source:{kind:'generation',id:'g',nodeId:'v'}}],voiceover:[{id:'voice1'}]}
 assert.equal(editorEdges(doc,p).length,2)
 const r=removeEditorSource(p,'v',doc)
 assert.equal(r.clips.length,0)
 assert.equal(r.voiceover.length,1)
 assert.equal(editorEdges(doc,r).length,1)
})
test('assistant retains unrelated work and connects selected prompt', () => {
 const doc={nodes:[n('p','prompt',{text:'hello'}),n('keep','upload')],edges:[]}
 const next=applyPromptPlan(doc,{promptNodeId:'p',storyboard:{prompt:'image',model:'mock-image'},video:{prompt:'video',model:'mock-video',duration:4}})
 assert.equal(next.nodes.length,4)
 assert.deepEqual(next.nodes[1],doc.nodes[1])
 assert.equal(next.edges.length,3)
 assert.ok(next.edges.some(e=>e.source==='p'&&e.targetHandle==='in:text'))
})

test('new upload node can be saved before choosing a file', () => {
 const doc=createNode({...empty,viewport:{x:0,y:0,zoom:1}},'upload',{x:0,y:0})
 assert.equal(doc.nodes[0].data.media,'image')
 assert.equal(doc.edges.length,0)
})

test('workspace API uses exact CRUD and quote contracts', async () => {
 const { getCanvas, putCanvas, listWorkspaces, createWorkspace, quoteNode, startGen }=await import('../src/lib/canvas/api.ts')
 const original=globalThis.fetch
 const calls=[]
 globalThis.fetch=async (url, init={})=>{calls.push([url,init]);return new Response(JSON.stringify(url.endsWith('?clientId=c')?{workspaces:[]}:{version:2,total:0,remaining:{image:0},items:[],inputStamp:'stamp',canvasVersion:2}),{status:200})}
 try {
  const ref={kind:'workspace',id:'ws_a'}
  await listWorkspaces('c');await createWorkspace('c','Canvas');await getCanvas(ref);await putCanvas(ref,1,empty)
  await quoteNode(ref,'image',2)
  await startGen(ref,{nodeId:'image',model:'mock-image',prompt:'hello',canvasVersion:2,inputStamp:'stamp',confirm:true})
  assert.deepEqual(calls.map(c=>c[0]),['/api/workspaces?clientId=c','/api/workspaces','/api/workspaces/ws_a','/api/workspaces/ws_a','/api/workspaces/ws_a/gen','/api/workspaces/ws_a/gen'])
  assert.deepEqual(JSON.parse(calls[4][1].body),{nodeId:'image',canvasVersion:2,confirm:false})
  assert.equal(JSON.parse(calls[5][1].body).inputStamp,'stamp')
 } finally {globalThis.fetch=original}
})

test('voice APIs carry node and stamp and never add a timeline segment', async () => {
 const { quoteTts,startTts,putVoice,importTts }=await import('../src/lib/editor/api.ts')
 const original=globalThis.fetch
 const calls=[]
 globalThis.fetch=async(url,init={})=>{calls.push([url,init]);return new Response(JSON.stringify({id:'voice',usd:0,remaining:0,inputStamp:'voiceStamp',canvasVersion:3}),{status:200})}
 try {
  const ref={kind:'workspace',id:'ws_a'}
  await quoteTts(ref,'hello','mock-voice','n_voice',3)
  await startTts(ref,'hello','mock-voice','n_voice',3,'voiceStamp')
  await putVoice(ref,new Blob(['audio'],{type:'audio/wav'}),'upload','n_upload')
  await importTts(ref,'g','n_voice')
  assert.deepEqual(JSON.parse(calls[1][1].body),{text:'hello',model:'mock-voice',confirm:true,nodeId:'n_voice',canvasVersion:3,inputStamp:'voiceStamp'})
  assert.equal(calls[2][0],'/api/workspaces/ws_a/edit/voice?source=upload&nodeId=n_upload')
  assert.equal(calls[3][0],'/api/workspaces/ws_a/edit/voice/from-gen/g?nodeId=n_voice')
  assert.ok(calls.every(c=>!c[0].endsWith('/edit')))
 }finally {globalThis.fetch=original}
})

test('run all follows graph order and inline prompt overrides a connected prompt', async () => {
 const {generationOrder,connectedPrompt}=await import('../src/lib/canvas/freeform.ts')
 const doc={nodes:[n('v','video',{prompt:'ignored'}),n('p','prompt',{text:'source'}),n('i','storyboard'),n('voice','voice')],edges:[{source:'p',target:'i',targetHandle:'in:text'},{source:'i',target:'v',targetHandle:'in:start'},{source:'p',target:'v',targetHandle:'in:text'},{source:'p',target:'voice',targetHandle:'in:text'}]}
 assert.deepEqual(generationOrder(doc),['i','v','voice'])
 assert.equal(connectedPrompt(doc,'v'),'ignored')
 assert.equal(connectedPrompt(doc,'voice'),'source')
 assert.throws(()=>generationOrder({...doc,edges:[...doc.edges,{source:'v',target:'p',targetHandle:'in:text'}]}),/cycle/)
})

test('freeform labels are translated in both UI languages', async()=>{
 const {setActiveLang}=await import('../src/lib/i18n.ts')
 const {ff}=await import('../src/lib/strings/freeform.ts')
 try{setActiveLang('en');assert.equal(ff('create'),'Create canvas');setActiveLang('zh-Hant');for(const k of ['create','storyboard','voice','editor','assistant','quote','composeHint']) assert.match(ff(k),/[\u4e00-\u9fff]/)}finally{setActiveLang('en')}
})

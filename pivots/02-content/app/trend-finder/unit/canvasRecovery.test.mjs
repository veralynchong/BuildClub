import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createCanvasSession, reconcileGenerations, selectGeneration, rememberGeneration} from '../src/lib/canvas/session.ts'
import {editorEdges,removeEditorSource} from '../src/lib/canvas/freeform.ts'
const doc=(nodes=[],edges=[])=>({nodes,edges,viewport:{x:0,y:0,zoom:1}})
const node=(id,type,data={})=>({id,type,data,position:{x:0,y:0}})
const gen=(id,nodeId,kind='image',status='done')=>({id,nodeId,kind,status,createdAt:1,inputs:{},model:'mock',url:`/${id}`})
test('leave while image/voice runs, reopen done, persist selection before downstream',async()=>{
 let saved=doc([node('i','storyboard'),node('v','voice')])
 const events=[]
 const deps={current:()=>saved,change:n=>{saved=n},flush:async()=>{events.push(['persist',saved.nodes.map(n=>n.data.selected)]);return true},voices:[],importVoice:async(g,n)=>{events.push(['import',g,n]);return{id:'voice1',genId:g,nodeId:n}},onVoice:()=>{}}
 await rememberGeneration(gen('g','i','image','running'),deps)
 await rememberGeneration(gen('speech','v','voice','running'),deps)
 assert.equal(saved.nodes[0].data.awaiting,'g');assert.equal(saved.nodes[1].data.awaiting,'speech')
 saved=JSON.parse(JSON.stringify(saved)) // server document after leaving and reopening
 await reconcileGenerations([gen('g','i'),gen('speech','v','voice')],deps)
 assert.equal(saved.nodes[0].data.selected,'g');assert.equal(saved.nodes[0].data.awaiting,undefined)
 assert.equal(saved.nodes[1].data.voiceId,'voice1');assert.equal(saved.nodes[1].data.awaiting,undefined)
 assert.equal(events.at(-1)[0],'persist')
 assert.equal(saved.nodes[1].data.stale,undefined)
})
test('history chooses matching voice mapping and editor receives that voice',async()=>{
 let saved=doc([node('v','voice',{selected:'g2',voiceId:'v2'}),node('n_editor','editor')])
 const voices=[{id:'v1',genId:'g1',nodeId:'v'},{id:'v2',genId:'g2',nodeId:'v'}]
 await selectGeneration(gen('g1','v','voice'),{current:()=>saved,change:n=>{saved=n},flush:async()=>true,voices,importVoice:async()=>{throw Error('already imported')},onVoice:()=>{}})
 assert.equal(saved.nodes[0].data.voiceId,'v1')
 const project={clips:[],voiceover:[{id:saved.nodes[0].data.voiceId}]}
 assert.equal(project.voiceover[0].id,'v1');assert.equal(editorEdges(saved,project,voices)[0].source,'v')
})
test('voice version changes keep old connected source visible and removal clears all versions',()=>{
 const d=doc([node('v','voice',{voiceId:'v2'}),node('n_editor','editor')])
 const voices=[{id:'v1',nodeId:'v',genId:'g1'},{id:'v2',nodeId:'v',genId:'g2'},{id:'other',nodeId:'other'}]
 const p={clips:[],voiceover:[{id:'v1'},{id:'v2'},{id:'other'}]}
 assert.equal(editorEdges(d,p,voices).length,1)
 assert.deepEqual(removeEditorSource(p,'v',d,voices).voiceover,[{id:'other'}])
 const deleted=doc(d.nodes.filter(n=>n.id!=='v'))
 assert.deepEqual(removeEditorSource(p,'v',deleted,voices).voiceover,[{id:'other'}])
})
test('two-tab CAS preserves draft; reload waits; restore uses latest version explicitly',async()=>{
 const drafts=new Map();let remote=doc([node('p','prompt',{text:'remote'})]);let ver=1
 const io={writeDraft:d=>d?drafts.set('draft',d):drafts.delete('draft'),readDraft:()=>drafts.get('draft')??null,save:async(v,d)=>{if(v!==ver)throw Object.assign(Error('conflict'),{conflict:true});remote=d;return ++ver}}
 const a=createCanvasSession({version:ver,doc:remote},io)
 const b=createCanvasSession({version:ver,doc:remote},io)
 a.change(doc([node('p','prompt',{text:'tab A'})]));assert.equal(await a.flush(),true)
 b.change(doc([node('p','prompt',{text:'tab B'})]));assert.equal(await b.flush(),false)
 assert.equal(drafts.get('draft').doc.nodes[0].data.text,'tab B')
 assert.equal(await b.prepareReload(false),false)
 await b.prepareReload(true)
 const reopened=createCanvasSession({version:ver,doc:remote},io)
 assert.equal(reopened.recovery().doc.nodes[0].data.text,'tab B')
 assert.equal(reopened.doc().nodes[0].data.text,'tab A')
 reopened.restore();assert.equal(await reopened.flush(),true)
 assert.equal(remote.nodes[0].data.text,'tab B')
})
test('failed save survives reload and explicit discard never races a PUT',async()=>{
 let finish;let calls=0;let draft=null
 const s=createCanvasSession({version:1,doc:doc()}, {readDraft:()=>draft,writeDraft:d=>{draft=d},save:async()=>{calls++;return new Promise(r=>{finish=r})}})
 s.change(doc([node('p','prompt',{text:'keep'})]));const flushing=s.flush()
 let reloaded=false;const reloading=s.prepareReload(false).then(v=>{reloaded=v})
 await Promise.resolve();assert.equal(reloaded,false);finish(2);await flushing;await reloading
 assert.equal(reloaded,true);assert.equal(calls,1)
 const failed=createCanvasSession({version:2,doc:doc()}, {readDraft:()=>draft,writeDraft:d=>{draft=d},save:async()=>{throw Error('offline')}})
 failed.change(doc([node('p','prompt',{text:'draft'})]));assert.equal(await failed.prepareReload(false),false);assert.equal(draft.doc.nodes[0].data.text,'draft')
 await failed.prepareReload(true);assert.ok(draft)
 failed.discard();assert.equal(draft,null)
})

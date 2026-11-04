import {test} from 'node:test'
import assert from 'node:assert/strict'
import {selectGeneration} from '../src/lib/canvas/session.ts'
import {editorEdges,removeEditorSource} from '../src/lib/canvas/freeform.ts'
import {replaceUploadedMedia} from '../src/lib/canvas/mediaReplacement.ts'
import {createOperationQueue,prepareCanvasLeave} from '../src/lib/canvas/operations.ts'
const n=(id,type,data={})=>({id,type,data,position:{x:0,y:0}})
const g=id=>({id,nodeId:'voice',kind:'voice',status:'done',inputs:{},createdAt:1})
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const tick=()=>new Promise(r=>setImmediate(r))
test('legacy DTO without mapping survives refresh, history and removal of every owned version',async()=>{
 let doc={nodes:[n('voice','voice'),n('n_editor','editor')],edges:[]};let imports=0
 // This is the actual legacy DTO: no nodeId and no genId.
 const raw=[{id:'v1',url:'/v1',duration:1,words:null},{id:'v2',url:'/v2',duration:1,words:null},{id:'editorOwned',url:'/old',duration:1,words:null}]
 const io={current:()=>doc,change:d=>{doc=d},flush:async()=>true,voices:raw,importVoice:async id=>{imports++;return raw[id==='g1'?0:1]},onVoice:()=>{}}
 await selectGeneration(g('g1'),io);await selectGeneration(g('g2'),io)
 doc=JSON.parse(JSON.stringify(doc)) // server save + reload, all transient maps gone
 await selectGeneration(g('g1'),{...io,voices:raw,importVoice:async()=>{throw Error('409 already imported')}})
 assert.equal(doc.nodes[0].data.voiceId,'v1');assert.equal(imports,2)
 const project={clips:[],voiceover:[{id:'v2'},{id:'v1'},{id:'editorOwned'}]}
 assert.equal(editorEdges(doc,project,raw).length,1)
 assert.equal(editorEdges(doc,project,[]).length,1) // ownership stays visible while DTO refresh is loading
 assert.deepEqual(removeEditorSource(project,'voice',doc,raw).voiceover,[{id:'editorOwned'}])
})
for(const action of ['Reload','Back'])test(`deferred upload → ${action} waits for editor write, final save and rollback boundary`,async()=>{
 const queue=createOperationQueue();const upload=defer(),editor=defer();const events=[];let mounted=true
 let live={nodes:[n('u','upload',{media:'image',selected:'old'})],edges:[]}
 const operation=queue.run(()=>replaceUploadedMedia('u','video',{current:()=>live,change:d=>{live=d},restore:d=>{live=d},flush:async()=>{assert.ok(mounted);events.push(live.nodes[0].data.selected==='new'?'final PUT':'prepare PUT');return true},upload:async()=>{await upload.promise;return{selected:'new'}},removeOldSources:async()=>{assert.ok(mounted);events.push('editor PUT');await editor.promise;return true}}))
 await tick()
 const navigation=prepareCanvasLeave(queue,async()=>{events.push('edit.flush');return'saved'},async()=>{events.push('canvas.flush');return true}).then(ok=>{assert.ok(ok);mounted=false;events.push('GET new board')})
 await tick();assert.deepEqual(events,['prepare PUT'])
 upload.resolve();await tick();assert.deepEqual(events,['prepare PUT','editor PUT'])
 editor.resolve();await operation;await navigation
 assert.deepEqual(events,['prepare PUT','editor PUT','final PUT','edit.flush','canvas.flush','GET new board'])
})
test('editor direct persist participates in flush pending barrier',async()=>{
 const writes=createOperationQueue(),put=defer();const events=[]
 const persist=writes.run(async()=>{events.push('PUT start');await put.promise;events.push('PUT done')})
 const flush=async()=>{await writes.wait();events.push('flush done');return'saved'}
 const navigation=prepareCanvasLeave(createOperationQueue(),flush,async()=>true).then(()=>events.push('reload GET'))
 await tick();assert.deepEqual(events,['PUT start'])
 put.resolve();await persist;await navigation;assert.deepEqual(events,['PUT start','PUT done','flush done','reload GET'])
})
test('navigation waits for failed upload rollback before allowing another board',async()=>{
 const queue=createOperationQueue(),upload=defer(),rollback=defer();const events=[]
 let live={nodes:[n('u','upload',{media:'image',selected:'old'})],edges:[]};let prepared=false
 const operation=queue.run(()=>replaceUploadedMedia('u','audio',{current:()=>live,change:d=>{live=d},restore:d=>{live=d},flush:async()=>{if(prepared){events.push('rollback PUT');await rollback.promise;events.push('restored')}prepared=true;return true},upload:async()=>{await upload.promise;throw Error('upload failed')}})).catch(()=>{})
 const leaving=prepareCanvasLeave(queue,async()=>'saved',async()=>true).then(()=>events.push('GET'))
 upload.resolve();await tick();assert.deepEqual(events,['rollback PUT']);rollback.resolve();await operation;await leaving;assert.deepEqual(events,['rollback PUT','restored','GET'])
})

test('actual useEditProject persist blocks its flush until PUT resolves and cleanup starts no PUT',async()=>{
 const {readFileSync}=await import('node:fs')
 const ts=(await import('typescript')).default
 const {flushOutcome}=await import('../src/lib/editor/timeline.ts')
 const effects=[],events=[];const pendingPut=defer()
 const project={clips:[],voiceover:[],captions:{enabled:true}}
 const react={useRef:value=>({current:value}),useState:value=>[value,next=>{if(next===null)events.push('reload state cleared')}],useCallback:fn=>fn,useEffect:fn=>{effects.push(fn)}}
 const api={StaleProject:class extends Error{},getProject:async()=>({version:1,project}),putProject:async()=>{events.push('PUT');await pendingPut.promise;events.push('PUT done');return 2}}
 const source=readFileSync(new URL('../src/lib/editor/useEditProject.ts',import.meta.url),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
 const module={exports:{}}
 new Function('require','module','exports',output)(name=>name==='react'?react:name.endsWith('/operations.ts')?{createOperationQueue}:name==='./api.ts'?api:name==='./timeline.ts'?{flushOutcome}:(()=>{throw Error(name)})(),module,module.exports)
 const edit=module.exports.useEditProject('legacy',false)
 const cleanups=effects.map(effect=>effect()).filter(fn=>typeof fn==='function')
 await tick();events.length=0
 const persistence=edit.persist({...project,voiceover:[{id:'v1'}]})
 await tick()
 const flush=edit.flush().then(()=>events.push('flush done'))
 edit.reload()
 await tick();assert.deepEqual(events,['PUT'])
 pendingPut.resolve();await persistence;await flush;await tick();assert.ok(events.indexOf('reload state cleared')>events.indexOf('PUT done'));assert.ok(events.indexOf('flush done')>events.indexOf('PUT done'))
 for(const cleanup of cleanups)cleanup()
 assert.equal(await edit.persist(project),false)
 await tick();assert.equal(events.filter(e=>e==='PUT').length,1)
})

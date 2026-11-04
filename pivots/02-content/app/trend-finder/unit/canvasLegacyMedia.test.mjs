import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createNode,duplicateNode} from '../src/lib/canvas/freeform.ts'
import {replaceUploadedMedia} from '../src/lib/canvas/mediaReplacement.ts'
import {legacyGenerationRequest,applyLegacyFrames} from '../src/lib/canvas/legacy.ts'
import {syncKit} from '../src/lib/canvas/kit.ts'
import {scopedWorkspaces} from '../src/lib/canvas/resource.ts'
const n=(id,type,data={},shotId)=>({id,type,data,shotId,position:{x:0,y:0}})
const edge=(source,target,targetHandle)=>({id:source+target+targetHandle,source,sourceHandle:'out',target,targetHandle})
const doc=(nodes,edges=[])=>({nodes,edges,viewport:{x:0,y:0,zoom:1}})
test('footage duplicate and drag creation keep their shot association',()=>{
 const d=doc([n('shot','shot',{},'s1'),n('text','prompt',{text:'hello'},'s1'),n('foot','footage',{},'s1')])
 const copy=duplicateNode(d,'foot')
 assert.equal(copy.nodes.at(-1).shotId,'s1')
 const dropped=createNode(d,'footage',{x:10,y:10},d.nodes.find(n=>n.id==='text').shotId)
 assert.equal(dropped.nodes.at(-1).shotId,'s1')
})
test('image replacement removes incompatible start wire before save and rolls back failed upload',async()=>{
 const before=doc([n('u','upload',{media:'image',selected:'old'}),n('video','video')],[edge('u','video','in:start')])
 let live=before;const saved=[]
 await assert.rejects(()=>replaceUploadedMedia('u','video',{current:()=>live,change:d=>{live=d},restore:d=>{live=d},flush:async()=>{saved.push(live);return true},upload:async()=>{assert.equal(live.edges.length,0);assert.equal(live.nodes[0].data.media,'video');throw Error('upload failed')}}),/upload failed/)
 assert.equal(saved[0].edges.length,0)
 assert.equal(live.nodes[0].data.selected,'old');assert.equal(live.nodes[0].data.media,'image')
 assert.deepEqual(live.edges,before.edges)
})
test('replacement succeeds with legal media and keeps compatible editor data until source removal commits',async()=>{
 let live=doc([n('u','upload',{media:'image',selected:'old'}),n('v','video')],[edge('u','v','in:start')]);const events=[]
 await replaceUploadedMedia('u','audio',{current:()=>live,change:d=>{live=d},restore:d=>{live=d},flush:async()=>{events.push('save');return true},upload:async()=>{events.push('upload');return{voiceId:'voice1'}},removeOldSources:async()=>{events.push('remove sources');return true}})
 assert.equal(live.nodes[0].data.voiceId,'voice1');assert.equal(live.nodes[0].data.selected,null)
 assert.deepEqual(events,['save','upload','remove sources','save'])
})
test('legacy kit refs reach generation payload and kit changes mark result stale',()=>{
 const d=doc([n('k','kit',{kitItems:['character','style']}),n('s','storyboard',{primary:true,prompt:'A cup',selected:'g'},'shot1'),n('v','video')],[edge('k','s','in:kit'),edge('s','v','in:start')])
 const kit={items:[{id:'character',name:'Host',kind:'character',note:'Friendly red hair',images:['host.png'],updatedAt:1},{id:'style',name:'Brand',kind:'style',note:'Warm studio light',images:[],updatedAt:1}]}
 const model={id:'mock-image',kind:'image',inputs:{reference:'optional'},maxRefs:4}
 const {request:req,kitPreview}=legacyGenerationRequest(d,'s',[],[],kit,model)
 assert.deepEqual(req.references,[{source:'kit',itemId:'character',image:'host.png'},{source:'kit',itemId:'style'}])
 // References carry ids to the existing backend, which builds the canonical prefix exactly once.
 assert.equal(req.prompt,'A cup')
 assert.match(kitPreview,/Friendly red hair/);assert.match(kitPreview,/Warm studio light/)
 const gens=[{id:'g',nodeId:'s',status:'done',createdAt:1,inputs:{kitStamp:{character:1}}}]
 const changed={items:kit.items.map(i=>({...i,updatedAt:2}))}
 assert.equal(syncKit(d,changed,gens).doc.nodes.find(n=>n.id==='s').data.stale,true)
})
test('legacy primary storyboard result writes back frame without dropping other shot data',()=>{
 const d=doc([n('s','storyboard',{primary:true,selected:'g'},'shot1')])
 const shots=[{id:'shot1',shot:'Close-up',line:'Keep line',frameImage:'/old'}]
 const next=applyLegacyFrames(d,shots,[{id:'g',nodeId:'s',status:'done',createdAt:1,url:'/new'}])
 assert.equal(next[0].frameImage,'/new');assert.equal(next[0].line,'Keep line')
 assert.equal(shots[0].frameImage,'/old')
})
test('picker hides previous client results before the new request resolves',()=>{
 const old=[{id:'ws_a',clientId:'a'}]
 assert.deepEqual(scopedWorkspaces(old,'b'),[])
 assert.equal(scopedWorkspaces(old,'a').length,1)
})

test('final media save failure restores original graph and previously connected editor sources',async()=>{
 const before=doc([n('u','upload',{media:'image',selected:'old'}),n('v','video')],[edge('u','v','in:start')])
 let live=before;let saves=0;let connected=true
 await assert.rejects(()=>replaceUploadedMedia('u','video',{current:()=>live,change:d=>{live=d},restore:d=>{live=d},flush:async()=>++saves!==2,upload:async()=>({selected:'new'}),removeOldSources:async()=>{connected=false;return true},restoreOldSources:async()=>{connected=true;return true}}))
 assert.equal(live.nodes[0].data.selected,'old');assert.equal(connected,true);assert.equal(live.edges.length,1)
})

test('legacy completion clears stale only while effective inputs still match',async()=>{
 const {legacyInputsMatch}=await import('../src/lib/canvas/legacy.ts')
 const {selectGeneration}=await import('../src/lib/canvas/session.ts')
 const g={id:'g',nodeId:'s',kind:'image',status:'done',createdAt:1,model:'mock-image',inputs:{prompt:'before',duration:null,references:[]}}
 const model={id:'mock-image',inputs:{text:'optional',reference:'optional'}}
 let live=doc([n('s','storyboard',{model:'mock-image',prompt:'before',stale:true,awaiting:'g'})])
 const io={current:()=>live,change:d=>{live=d},flush:async()=>true,voices:[],onVoice:()=>{},importVoice:async()=>{},matchesInputs:gen=>legacyInputsMatch(live,gen,[],[],null,model)}
 await selectGeneration(g,io);assert.equal(live.nodes[0].data.stale,false)
 live=doc([n('s','storyboard',{model:'mock-image',prompt:'changed while running',stale:true,awaiting:'g'})])
 await selectGeneration(g,io);assert.equal(live.nodes[0].data.stale,true)
})

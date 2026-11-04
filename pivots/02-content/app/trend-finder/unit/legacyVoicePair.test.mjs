import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mergeVoiceOwnership} from '../src/lib/canvas/voices.ts'
import {selectGeneration} from '../src/lib/canvas/session.ts'
import {editorEdges,removeEditorSource} from '../src/lib/canvas/freeform.ts'
const node=(id,type,data={})=>({id,type,data,position:{x:0,y:0}})
const initial=()=>({nodes:[node('N','voice',{selected:'g1',voiceId:'v1'}),node('n_editor','editor')],edges:[]})
const generation=id=>({id,nodeId:'N',kind:'voice',status:'done',inputs:{},createdAt:1})
const rawVoices=[{id:'v1',url:'/v1',duration:1,words:null},{id:'v2',url:'/v2',duration:1,words:null},{id:'editor-owned',url:'/editor',duration:1,words:null}]
test('explicit old selected/voiceId pair reselects without import and is persisted',async()=>{
 let doc=initial(),calls=0;const saves=[]
 await selectGeneration(generation('g1'),{current:()=>doc,change:d=>{doc=d},flush:async()=>{saves.push(JSON.parse(JSON.stringify(doc)));return true},voices:rawVoices,importVoice:async()=>{calls++;throw Error('409 already imported')},onVoice:()=>{}})
 assert.equal(calls,0)
 assert.deepEqual(saves[0].nodes[0].data.voiceSources,{g1:'v1'})
 assert.deepEqual(saves[0].nodes[0].data.voiceIds,['v1'])
})
test('switching an old pair preserves v1 ownership through raw refresh and complete source removal',async()=>{
 let doc=initial()
 await selectGeneration(generation('g2'),{current:()=>doc,change:d=>{doc=d},flush:async()=>true,voices:rawVoices,importVoice:async()=>rawVoices[1],onVoice:()=>{}})
 doc=JSON.parse(JSON.stringify(doc))
 assert.deepEqual(doc.nodes[0].data.voiceSources,{g1:'v1',g2:'v2'})
 assert.deepEqual(new Set(doc.nodes[0].data.voiceIds),new Set(['v1','v2']))
 const project={clips:[],voiceover:[{id:'v1'},{id:'v2'},{id:'editor-owned'}]}
 assert.equal(editorEdges(doc,project,rawVoices).length,1)
 assert.deepEqual(removeEditorSource(project,'N',doc,rawVoices).voiceover,[{id:'editor-owned'}])
 const afterDelete={...doc,nodes:doc.nodes.filter(n=>n.id!=='N')}
 const removed=removeEditorSource(project,'N',doc,rawVoices)
 assert.equal(editorEdges(afterDelete,removed,rawVoices).length,0)
 assert.deepEqual(removed.voiceover,[{id:'editor-owned'}])
})
test('unknown editor audio stays unassigned and explicit server mappings remain authoritative',()=>{
 const doc=initial()
 assert.deepEqual(mergeVoiceOwnership(doc,[rawVoices[2]]),[rawVoices[2]])
 const server={...rawVoices[0],nodeId:'server-node',genId:'server-gen'}
 assert.equal(mergeVoiceOwnership(doc,[server])[0],server)
})

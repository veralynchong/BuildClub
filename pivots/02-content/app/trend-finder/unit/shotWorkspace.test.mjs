import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shotAssets, shotCover } from '../src/lib/canvas/shotWorkspace.ts'
const node=(id,type,shotId,data={})=>({id,type,...(shotId?{shotId}:{}),position:{x:1,y:2},data})
const gen=(id,nodeId,kind='image',createdAt=1)=>({id,nodeId,kind,status:'done',url:'/media/'+id,createdAt,inputs:{}})
const edge=(source,target)=>({id:source+target,source,target,sourceHandle:'out',targetHandle:'in:ref'})
const doc={nodes:[node('s1','shot','s1'),node('s2','shot','s2'),node('im1','storyboard','s1',{primary:true,selected:'im-new'}),node('im2','storyboard','s2'),node('v1','video','s1',{selected:'video1'}),node('v2','video','s1',{selected:'video2'}),node('source','upload'),node('shared','upload')],edges:[edge('source','im1'),edge('shared','im1'),edge('shared','im2')]}
const gens=[gen('im-old','im1'),gen('im-new','im1','image',2),gen('im-other','im2'),gen('source1','source'),gen('shared1','shared'),gen('video1','v1','video'),gen('video2','v2','video',2)]
test('same-shot nodes and generation history become one deduplicated list without touching inputs',()=>{
 const before=structuredClone({doc,gens}),project={clips:[{source:{kind:'generation',id:'video2'}}]}
 const a=shotAssets(doc,'s1',gens,[],project)
 assert.deepEqual(a.images.map(x=>x.generation.id),['im-old','im-new'])
 assert.equal(a.images.find(x=>x.primaryImage).generation.id,'im-new')
 assert.deepEqual(a.videos.map(x=>x.generation.id),['video1','video2'])
 assert.equal(a.videos.filter(x=>x.onTimeline).length,1)
 assert.equal(a.videos.find(x=>x.onTimeline).generation.id,'video2')
 assert.equal(a.videos.filter(x=>x.chosenOnNode).length,2)
 assert.deepEqual(a.references.map(x=>x.node.id),['source','shared'])
 assert.deepEqual({doc,gens},before)
 assert.equal(shotCover(doc,'s1',gens).url,'/media/im-new')
})
test('references are shared visual projections and cycles terminate without stealing foreign generators',()=>{
 const cyclic={...doc,edges:[...doc.edges,edge('shared','source'),edge('source','shared'),edge('im2','im1')]}
 const a=shotAssets(cyclic,'s1',gens,[],null),b=shotAssets(cyclic,'s2',gens,[],null)
 assert.equal(a.references.filter(x=>x.node.id==='shared').length,1)
 assert.equal(b.references.filter(x=>x.node.id==='shared').length,1)
 assert.ok(a.references.some(x=>x.node.id==='im2'))
 assert.ok(!a.images.some(x=>x.node.id==='im2'))
})
test('empty, pending, failed and removed results never become fabricated ready assets',()=>{
 const d={nodes:[node('im','storyboard','s1'),node('video','video','s1')],edges:[]}
 const bad=[{...gen('running','im'),status:'running',url:null},{...gen('bad','video','video'),status:'failed',url:null}]
 const a=shotAssets(d,'s1',bad,[],null)
 assert.deepEqual(a.images,[]);assert.deepEqual(a.videos,[])
 assert.equal(a.imageNode.id,'im');assert.equal(a.videoNode.id,'video')
 assert.equal(shotCover(d,'s1',bad),null)
})
test('real footage remains a take with its actual chosen state',()=>{
 const d={nodes:[node('footage','footage','s1')],edges:[]},take={id:'take1',shotId:'s1',url:'/take.mp4',chosen:true,createdAt:1}
 const a=shotAssets(d,'s1',[],[take],null)
 assert.equal(a.videos.length,1);assert.equal(a.videos[0].take.id,'take1');assert.equal(a.videos[0].generation,null)
})

test('new shot-owned uploads and prompts remain visible before and after they are connected',()=>{
 const owned=node('owned','upload','s1'),prompt=node('prompt','prompt','s1',{text:'A new angle'})
 const d={...doc,nodes:[...doc.nodes,owned,prompt],edges:[...doc.edges,edge('owned','im1'),edge('prompt','im1')]}
 const a=shotAssets(d,'s1',[...gens,gen('uploaded','owned')],[],null)
 assert.equal(a.references.filter(x=>x.node.id==='owned').length,1)
 assert.equal(a.references.find(x=>x.node.id==='owned').url,'/media/uploaded')
 assert.equal(a.references.filter(x=>x.node.id==='prompt').length,1)
 const notConnected=shotAssets({...d,edges:doc.edges},'s1',[],[],null)
 assert.ok(notConnected.references.some(x=>x.node.id==='owned'))
})

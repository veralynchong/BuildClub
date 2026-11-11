import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrangeShots, initialShotLayout, variantPosition } from '../src/lib/canvas/shotLayout.ts'
import { createNode } from '../src/lib/canvas/freeform.ts'
const node=(id,type,shotId,primary=false)=>({id,type,...(shotId?{shotId}:{}),position:{x:5,y:5},data:{selected:id+'-selected',...(primary?{primary:true}:{})}})
const edge=(source,target)=>({id:source+'-'+target,source,target,sourceHandle:'out',targetHandle:'in:ref'})
const shots=[{id:'s1'},{id:'s2'}]
const sample=()=>({nodes:[node('shot2','shot','s2'),node('shot1','shot','s1'),node('image1','storyboard','s1',true),node('image2','storyboard','s2',true),node('video1','video','s1'),node('video2','video','s2'),node('alt','video','s1'),node('ref','upload'),node('shared','upload')],edges:[edge('ref','image1'),edge('shared','image1'),edge('shared','image2')],viewport:{x:1,y:2,zoom:1}})
test('shot order runs left to right; variants stack below; shared and inferred references remain visible',()=>{
 const before=sample(),copy=structuredClone(before),after=arrangeShots(before,shots)
 const get=id=>after.nodes.find(n=>n.id===id)
 assert.ok(get('shot1').position.x<get('shot2').position.x)
 assert.equal(get('shot1').position.y,get('shot2').position.y)
 assert.equal(get('video1').position.x,get('alt').position.x)
 assert.ok(get('alt').position.y>=get('video1').position.y+720+80)
 assert.ok(get('ref').position.x<get('image1').position.x)
 assert.ok(get('shared').position.y<0)
 assert.deepEqual(before,copy)
 assert.deepEqual(after.nodes.map(({position,...n})=>n),before.nodes.map(({position,...n})=>n))
 assert.deepEqual(after.edges,before.edges)
 assert.deepEqual(after.viewport,before.viewport)
 assert.equal(after.layout,'shots-horizontal')
 assert.equal(arrangeShots(after,shots),after)
})
test('measured oversized cards and titles have no overlapping rectangles',()=>{
 const before=sample(),sizes=new Map(before.nodes.map(n=>[n.id,{width:n.id==='ref'?510:350,height:n.id==='video1'?1200:900}]))
 const after=arrangeShots(before,shots,sizes)
 const boxes=after.nodes.map(n=>({x:n.position.x,y:n.position.y-34,w:sizes.get(n.id).width,h:sizes.get(n.id).height+34}))
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`overlap ${i}/${j}`)}
})
test('adding a variant keeps every other shot in place and uses the same column',()=>{
 const before=arrangeShots(sample(),shots),other=before.nodes.filter(n=>n.shotId==='s2')
 const after=arrangeShots({...before,nodes:[...before.nodes,node('alt2','video','s1')]},shots)
 assert.deepEqual(after.nodes.filter(n=>n.shotId==='s2'),other)
 const at=variantPosition(before,'video','s1')
 assert.equal(at.x,before.nodes.find(n=>n.id==='video1').position.x)
 assert.ok(at.y>before.nodes.find(n=>n.id==='alt').position.y)
 const added=createNode(before,'video',{x:0,y:0},'s1').nodes.at(-1)
 assert.deepEqual(added.position,at)
})
test('only untouched imported shot layouts auto-arrange; manual and freeform layouts are preserved',()=>{
 const doc={nodes:shots.flatMap((s,i)=>[{...node('shot'+i,'shot',s.id),position:{x:0,y:i*480}},{...node('image'+i,'storyboard',s.id,true),position:{x:360,y:i*480}}]),edges:[]}
 assert.equal(initialShotLayout(doc,shots),true)
 doc.nodes[0].position.x=7
 assert.equal(initialShotLayout(doc,shots),false)
 assert.equal(initialShotLayout({nodes:[],edges:[]},[]),false)
 assert.equal(initialShotLayout(sample(),shots),false)
})

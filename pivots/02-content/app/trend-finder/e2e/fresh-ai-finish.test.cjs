'use strict';
// Pure in-memory fixtures; never launch a browser, subprocess, server, or network.
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const {staffCutVersion,verifyPublicCutVersion,canonical,digest,sha,allowed,routeAllowed,validatePlan,textSegments,verifyProvenance,verifyProject,editorMode} = require('./fresh-ai-finish.cjs');
const IDEA = 'evergreen-fresh-ai-21', state = '/isolated/state';
function fixture() {
  const frames = [16,32,10,8,10,10,11,20,12,12,13,14,16,15,25,15,15,17,22,15,7];
  const plan = {fps:30,timelineFrames:315,caps:{fal:4,openrouter:3,total:7},shots:frames.map((timelineFrames,i)=>({
    shotId:'s'+(i+1),timelineFrames,imageInputs:[],imageProvider:'fal',imageModel:'fal-ai/bytedance/seedream/v4.5/text-to-image',imagePrompt:'New image '+i,
    videoProvider:i<12?'fal':'openrouter',videoModel:i<12?'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video':'google/veo-3.1-lite',videoPrompt:'Motion '+i,duration:i<12?6:4}))};
  const ledger={mode:'live',policy:'seedream-fal4-openrouter3',halted:false,caps:{fal:'4.00',openrouter:'3.00'},reserved:{fal:'3.24',openrouter:'1.80'},requests:[],assets:{}};
  const rows=[],bindings=[],files=new Map(),canvas={version:7,doc:{nodes:[],edges:[]},generations:[]};
  const scope=digest([plan,path.join(state,'engine'),path.join(state,'media')]);
  for(const s of plan.shots){let parent;
    for(const kind of ['image','video']){
      const model=kind==='image'?'seedream-4.5':s.videoProvider==='fal'?'hailuo-2.3-fast':'veo-lite-openrouter';
      const id=s.shotId+'_'+kind,nodeId='n_'+id,endpoint=s[kind+'Model'];
      const raw={prompt:s[kind+'Prompt'],sentPrompt:s[kind+'Prompt'],aspectRatio:'9:16',count:1,references:[],kitStamp:{},duration:kind==='image'?null:s.duration,startFrame:kind==='image'?null:parent.id};
      const body={model:endpoint,prompt:raw.prompt};
      if(kind==='image')Object.assign(body,{num_images:1,max_images:1,image_size:'portrait_16_9',enable_safety_checker:true});
      else{body.firstImage=parent.asset;Object.assign(body,s.videoProvider==='fal'?{duration:'6',prompt_optimizer:false,enable_safety_checker:true}:{duration:4,resolution:'1080p',aspect_ratio:'9:16',generate_audio:false});}
      const provider=s[kind+'Provider'],asset=digest([provider,kind,body]),requestId='request-'+id;
      const data=Buffer.from('pure fake bytes '+id),hash=sha(data),ext=kind==='image'?'.png':'.mp4',file=id+ext,relative='media/'+asset+ext;
      const imageInput=kind==='image'?null:{asset:parent.asset,sha256:parent.sha256,parentRequestId:parent.requestId};
      ledger.requests.push({fingerprint:asset,asset,provider,kind,shot:s.shotId,model:endpoint,state:'done',offlineSimulation:false,textOnly:kind==='image',imageInput,
        providerRequestId:requestId,providerReceipt:{providerRequestId:requestId,model:endpoint},outputSha256:hash,actualUsd:null,billingEstimateUsd:kind==='image'?.04:.20,reservationUsd:kind==='image'?'.04':'.20'});
      ledger.assets[asset]={path:relative,sha256:hash,providerRequestId:requestId,requestFingerprint:asset,shot:s.shotId,kind,model:endpoint,offlineSimulation:false,textOnly:kind==='image'};
      if(kind==='image'){
        const original=Buffer.from('provider-original bytes '+s.shotId),rawPath='provider-originals/'+asset+'.bin';
        const normalization={operation:'decoded-jpeg-to-png',rawPath,rawSha256:sha(original),outputSha256:hash,providerRequestId:requestId,rawBytes:original.length,outputBytes:data.length};
        ledger.requests.at(-1).normalization=normalization;ledger.assets[asset].normalization=structuredClone(normalization);
        files.set(path.join(state,'engine',rawPath),original);
      }
      rows.push({id,idea_id:IDEA,node_id:nodeId,kind,model,inputs:JSON.stringify(raw),status:'done',source_url:null,file});
      bindings.push({gid:id,idea_id:IDEA,node_id:nodeId,shot:s.shotId,asset,model,kind,inputHash:digest(body),outputHash:hash,identityHash:digest([IDEA,nodeId,kind,model,raw,s.shotId]),scope});
      canvas.doc.nodes.push({id:nodeId,type:kind==='image'?'storyboard':'video',shotId:s.shotId,data:{model,selected:id}});
      canvas.generations.push({id,nodeId,kind,model,inputs:structuredClone(raw),status:'done',url:'/api/ideas/'+IDEA+'/gen/'+id+'/file'});
      files.set(path.join(state,'engine',relative),data);files.set(path.join(state,'media',IDEA,'gen',file),data);
      if(kind==='video')canvas.doc.edges.push({source:parent.nodeId,target:nodeId,targetHandle:'in:start'});
      if(kind==='image')parent={id,nodeId,asset,sha256:hash,requestId};
    }
  }
  const idea={id:IDEA,shots:plan.shots.map(s=>({id:s.shotId,line:''})),script:{lines:plan.shots.map((_,i)=>({say:'',onScreen:i<13?'Turn tofu into...':i<18?'Healthy & high protein okonomiyaki':'Want the full recipe? Comment "RECIPE" below!'}))}};
  return{plan,ledger,canvas,rows,bindings,state,files,idea,readFile:filename=>{assert.ok(files.has(filename),filename);return files.get(filename);}};
}
function completed(){const f=fixture(),manifest=verifyProvenance(f),segments=textSegments(f.plan,f.idea);
  const sources=manifest.selected.map(s=>({id:s.video.generationId,hasAudio:false}));
  const project={fps:30,width:1080,height:1920,clips:manifest.selected.map(s=>({id:'clip_'+s.shotId,source:{kind:'generation',id:s.video.generationId,nodeId:s.video.nodeId,shotId:s.shotId},in:0,out:s.timelineFrames/30,muted:false})),texts:segments.map((s,i)=>({id:'text_'+i,...s})),captions:{enabled:false},music:null,voiceover:[],primaries:{}};
  return{f,manifest,segments,sources,project};
}
test('canonical Python sorted ASCII JSON',()=>assert.equal(canonical({z:'豆腐',a:[null,true,'é']}),'{"a":[null,true,"\\u00e9"],"z":"\\u8c46\\u8150"}'));
test('loopback ports only; generation mutations and decisions blocked',()=>{
  for(const url of ['https://127.0.0.1:8978','http://localhost:8978','http://127.0.0.1:8982','https://fal.run'])assert.equal(allowed(url),false);
  for(const port of [8978,8979,8980])assert.equal(allowed('http://127.0.0.1:'+port),true);
  for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal(routeAllowed(method,'http://127.0.0.1:8978/api/ideas/'+IDEA+'/gen'),false);
  assert.equal(routeAllowed('POST','http://127.0.0.1:8978/api/review/test/cuts/'+IDEA+'/decide'),false);
  assert.equal(routeAllowed('POST','http://127.0.0.1:8978/api/ideas/'+IDEA+'/edit/export'),true);
  assert.equal(routeAllowed('PUT','http://127.0.0.1:8978/api/ideas/'+IDEA+'/edit'),true);
  assert.equal(routeAllowed('POST','http://127.0.0.1:8978/api/search'),false);
});
test('42 valid own-shot assets preserve unknown actual billing',()=>{
  const m=verifyProvenance(fixture());assert.equal(m.selected.length,21);assert.equal(m.actualUnknownCount,42);assert.equal(m.actualTotalUsd,null);assert.equal(m.actualKnownSubtotalUsd,0);
  assert.ok(m.costs.every(r=>r.actualUsd===null&&r.billingEstimateUsd>0));
  assert.equal(m.selected.filter(s=>s.video.model==='hailuo-2.3-fast').length,12);assert.equal(m.selected.filter(s=>s.video.model==='veo-lite-openrouter').length,9);
});
for(const[name,mutate]of[
  ['offline',f=>{f.ledger.mode='offline';}],['halted',f=>{f.ledger.halted=true;}],['partial',f=>{f.ledger.requests.pop();}],['unknown',f=>{f.ledger.requests[0].state='unknown';}],
  ['non-text image',f=>{f.ledger.requests[0].textOnly=false;}],['wrong shot input',f=>{f.ledger.requests[1].imageInput.asset=f.ledger.requests[2].asset;}],
  ['missing request ID',f=>{f.ledger.requests[0].providerRequestId='';}],['engine bytes changed',f=>{f.files.set(path.join(state,'engine',f.ledger.assets[f.ledger.requests[0].asset].path),Buffer.from('changed'));}],
  ['app bytes changed',f=>{f.files.set(path.join(state,'media',IDEA,'gen',f.rows[0].file),Buffer.from('changed'));}],['wrong selection',f=>{f.canvas.doc.nodes[0].data.selected='old';}],
  ['wrong identity',f=>{f.bindings[0].identityHash='bad';}],['missing billing field',f=>{delete f.ledger.requests[0].actualUsd;}],['over cap',f=>{f.ledger.reserved.fal='4.01';}],['old source',f=>{f.rows[0].source_url='old-frame';}],
])test('reject '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>verifyProvenance(f));});
test('315-frame cut, three segments, safe exact reentry and pristine empty edit',()=>{
  const{f,manifest,segments,sources,project}=completed();validatePlan(f.plan);assert.equal(Math.min(...f.plan.shots.map(s=>s.timelineFrames)),7);
  assert.equal(segments.length,3);assert.equal(segments[0].start,0);assert.equal(segments[2].end,10.5);verifyProject(project,manifest,segments,sources);
  assert.equal(editorMode(project,manifest,segments,sources),'exact-existing');assert.equal(editorMode({clips:[],texts:[],music:null,voiceover:[],primaries:{}},manifest,segments,sources),'empty');
});
for(const[name,mutate]of[
  ['partial edit',d=>{d.project.clips.pop();}],['order',d=>{d.project.clips.reverse();}],['trim',d=>{d.project.clips[0].out+=1/30;}],['foreign clip',d=>{d.project.clips[0].source.id='old';}],
  ['music',d=>{d.project.music={volume:1};}],['audible',d=>{d.sources[0].hasAudio=true;}],['captions',d=>{d.project.captions.enabled=true;}],['text timing',d=>{d.project.texts[0].end+=1/30;}],
])test('reentry refuses '+name,()=>{const d=completed();mutate(d);assert.throws(()=>editorMode(d.project,d.manifest,d.segments,d.sources));});
test('Shot.line is preserved rather than backfilled',()=>{const f=fixture();f.idea.shots[0].line='do not overwrite';assert.throws(()=>textSegments(f.plan,f.idea));});

test('native staff review omits version; URL nanoseconds match native public string exactly',()=>{
  const version='1793898844797185424';
  const staff={status:'done',output:{url:'/api/ideas/'+IDEA+'/cut/file?v='+version,size:100,durationSec:10.5},review:{status:'waiting',sentAt:123}};
  const publicCut={url:'/api/review/token/cuts/'+IDEA+'/file?v='+version,durationSec:10.5,version,sentAt:123};
  assert.equal(staff.review.version,undefined);assert.equal(staffCutVersion(staff),version);assert.equal(verifyPublicCutVersion(staff,publicCut),version);
  assert.throws(()=>verifyPublicCutVersion(staff,{...publicCut,version:'1793898844797185425'}));
  assert.throws(()=>verifyPublicCutVersion(staff,{...publicCut,version:1793898844797185424}));
  assert.throws(()=>verifyPublicCutVersion(staff,{...publicCut,url:publicCut.url.replace(version,'1793898844797185425')}));
  assert.throws(()=>staffCutVersion({...staff,output:{url:'/api/ideas/'+IDEA+'/cut/file'}}));
  assert.throws(()=>staffCutVersion({...staff,output:{url:staff.output.url+'&v='+version}}));
});
for(const[name,mutate]of[
  ['all image raw proof absent',f=>{for(const r of f.ledger.requests.filter(r=>r.kind==='image')){delete r.normalization;delete f.ledger.assets[r.asset].normalization;}}],
  ['request normalization absent',f=>{delete f.ledger.requests[0].normalization;}],
  ['asset normalization absent',f=>{delete f.ledger.assets[f.ledger.requests[0].asset].normalization;}],
  ['asset metadata mismatch',f=>{f.ledger.assets[f.ledger.requests[0].asset].normalization.rawBytes++;}],
  ['cross-shot raw proof',f=>{const r=f.ledger.requests[0];r.normalization=structuredClone(f.ledger.requests[2].normalization);f.ledger.assets[r.asset].normalization=structuredClone(r.normalization);}],
  ['raw bytes tampered',f=>{f.files.set(path.join(state,'engine',f.ledger.requests[0].normalization.rawPath),Buffer.from('changed raw bytes'));}],
  ['wrong raw path',f=>{const r=f.ledger.requests[0];r.normalization.rawPath='provider-originals/other.bin';f.ledger.assets[r.asset].normalization=structuredClone(r.normalization);}],
  ['wrong proof request ID',f=>{const r=f.ledger.requests[0];r.normalization.providerRequestId='other-request';f.ledger.assets[r.asset].normalization=structuredClone(r.normalization);}],
  ['wrong proof output hash',f=>{const r=f.ledger.requests[0];r.normalization.outputSha256='bad';f.ledger.assets[r.asset].normalization=structuredClone(r.normalization);}],
])test('reject '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>verifyProvenance(f));});

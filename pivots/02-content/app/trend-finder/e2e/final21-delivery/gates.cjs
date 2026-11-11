'use strict';
// CLI: node gates.cjs MANIFEST [NEW_OUTPUT_DIRECTORY]. No HTTP/browser/provider calls.
// Input extends partial manifest: sourceShots[21], pinned sourceLedgers, derivedReferences,
// and posters for s8/s11/s12/s14. Derived rows: path, sha256, sourceVideoRequestId,
// sourceVideoSha256, frameIndex (zero based). A poster is the same proof object.
const A = require('node:assert/strict'), fs = require('node:fs'), cp = require('node:child_process'), path = require('node:path'), crypto = require('node:crypto');
const FRAMES = [16,32,10,8,10,10,11,20,12,12,13,14,16,15,25,15,15,17,22,15,7];
const EDGES = FRAMES.reduce((a,n) => [...a,a.at(-1)+n], [0]);
const PREFIX = '/api/ideas/evergreen-fresh-ai-21';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => { A.ok(path.isAbsolute(p), 'absolute path required'); return fs.readFileSync(p); };
const hash = (p,h) => { A.match(h || '', /^[a-f0-9]{64}$/); A.equal(sha(read(p)), h, 'hash mismatch: '+p); };
function allowed(method, value) {
  let u; try { u = new URL(value); } catch { return false; }
  if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || !['8978','8979','8980'].includes(u.port) || u.username || u.password) return false;
  const p = u.pathname;
  if (!['GET','HEAD','POST','PUT'].includes(method)) return false;
  if (['GET','HEAD'].includes(method)) return !p.startsWith('/api/') || /^\/api\/(health|batch\/status|auth\/(config|me)|clients|ideas|library|production|stats)$/.test(p) || p === '/api/gen/models' || p === '/api/gen/budget' || /^\/api\/review\/[^/]+(?:\/cuts\/evergreen-fresh-ai-21\/file)?$/.test(p) || p.startsWith(PREFIX+'/') && /^(canvas|gen|takes|edit|cut)(\/|$)/.test(p.slice(PREFIX.length+1));
  return method === 'PUT' ? p === PREFIX+'/edit' : ['/api/auth/login','/api/auth/logout','/api/share',PREFIX+'/shots/0/takes',PREFIX+'/edit/export',PREFIX+'/cut/review'].includes(p);
}
function version(cut) {
  const u = new URL(cut.output.url, 'http://127.0.0.1:8978'); A.ok(allowed('GET',u.href)); A.equal(u.pathname,PREFIX+'/cut/file');
  const v=u.searchParams.getAll('v'); A.equal(v.length,1); A.match(v[0],/^[1-9][0-9]*$/); return v[0];
}
function shape(m) {
  A.equal(m.preparedNotLiveGeneration,true);A.equal(m.humanReview,'waiting');A.ok(m.humanApproval==null,'No human approval may be invented');
  A.equal(m.sourceShots?.length,21,'PENDING: exactly 21 content-accepted sources required');
  A.ok(!m.missingShots?.length,'PENDING: missing shots');
  const ids=new Set(), rids=new Set();
  m.sourceShots.forEach((s,i) => {A.equal(s.shotId,'s'+(i+1),'numeric shot order required'); A.equal(s.frames,FRAMES[i]); A.deepEqual(s.originalTimelineFrames,[EDGES[i],EDGES[i+1]]); A.match(s.qaStatus||'',/^(PASS|ROOT_VISUAL_QA_PASSED_USED_WINDOW|ACCEPTED)/); A.ok(!/FAIL|PENDING|NOT/.test(s.qaStatus)); A.ok(!ids.has(s.preparedSha256),'duplicate prepared bytes');ids.add(s.preparedSha256);A.ok(s.providerRequestId && !rids.has(s.providerRequestId),'21 distinct video receipts required');rids.add(s.providerRequestId);});
}
function mediaShape(p, frames, silentOnly=false) {
  const v=p.streams.filter(s=>s.codec_type==='video'); A.equal(v.length,1); A.equal(v[0].codec_name,'h264'); A.equal(v[0].width,1080);A.equal(v[0].height,1920);A.equal(v[0].r_frame_rate,'30/1'); A.equal(Number(v[0].nb_read_frames),frames);A.ok(Math.abs(Number(v[0].duration)-frames/30)<.00001);
  const audio=p.streams.filter(s=>s.codec_type==='audio'); A.ok(audio.length<=1);A.equal(p.streams.length,1+audio.length,'Only video and optional verified silent export audio allowed');
  if (!silentOnly) A.equal(audio.length,0,'prepared inputs must have no audio');
  else if (audio.length) A.equal(audio[0].codec_name,'aac');
  return audio;
}
function pcmZero(pcm) { A.ok(pcm.length && pcm.every(b=>b===0),'decoded PCM must be ALL ZERO'); }
function probe(file,frames,silentOnly=false) {
  const p=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
  const audio=mediaShape(p,frames,silentOnly);
  if(audio.length) { const pcm=cp.execFileSync('ffmpeg',['-v','error','-xerror','-i',file,'-map','0:a:0','-acodec','pcm_s32le','-f','s32le','pipe:1'],{maxBuffer:32*1024*1024}); pcmZero(pcm); }
  cp.execFileSync('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-']);return {probe:p,audioProvenance:audio.length?'generated silence; decoded PCM ALL ZERO':'no audio; no original music'};
}
function receipts(rows) {
  A.equal(rows.length,52,'all 52 paid rows including quality failures required');
  A.equal(new Set(rows.map(r=>r.providerRequestId)).size,52);
  const count=kind=>rows.filter(r=>r.kind===kind).length; A.equal(count('image'),28);A.equal(count('video'),24);
  A.equal(rows.filter(r=>r.kind==='video'&&r.model.includes('hailuo')).length,12);A.equal(rows.filter(r=>r.kind==='video'&&r.model==='google/veo-3.1-lite').length,12);
  for(const r of rows) {A.ok(r.providerRequestId);A.equal(r.providerReceipt?.providerRequestId,r.providerRequestId);A.equal(r.providerReceipt?.model,r.model);A.match(r.payloadSha256||'',/^[a-f0-9]{64}$/); A.equal(r.offlineSimulation,false); A.ok(['done','failed'].includes(r.state)); A.ok(Object.hasOwn(r,'actualUsd')); A.ok(r.actualUsd===null||typeof r.actualUsd==='number'&&Number.isFinite(r.actualUsd)&&r.actualUsd>=0);}
  for(const [provider,cents] of [['fal',352],['openrouter',240]]) A.equal(rows.filter(r=>r.provider===provider).reduce((n,r)=>n+Math.round(Number(r.reservationUsd)*100),0),cents);
}
function imageProof(r,a,raw,output) {
  const n=r.normalization;A.ok(n,'all image raw normalization required');A.equal(r.textOnly,true);A.equal(r.imageInput,null);A.equal(n.providerRequestId,r.providerRequestId);A.equal(n.outputSha256,r.outputSha256);A.equal(n.rawPath,'provider-originals/'+r.fingerprint+'.bin');A.deepEqual(a.normalization,n);
  for(const [k,v] of Object.entries({providerRequestId:r.providerRequestId,requestFingerprint:r.fingerprint,shot:r.shot,kind:'image',model:r.model,sha256:r.outputSha256})) A.equal(a[k],v,'asset metadata mismatch '+k);
  A.equal(sha(raw),n.rawSha256);A.equal(raw.length,n.rawBytes);A.equal(sha(output),n.outputSha256);A.equal(output.length,n.outputBytes);
}
function selectedMix(selected) {
  A.equal(selected.length,21);A.equal(selected.filter(s=>s.sourceModel?.includes('hailuo')).length,9);A.equal(selected.filter(s=>s.sourceModel==='google/veo-3.1-lite').length,12);
}
function preflight(m) {
  shape(m);selectedMix(m.sourceShots); const rows=[], locations=new Map(), ledgerPins=[];
  for(const pin of m.sourceLedgers || []) {hash(pin.path,pin.sha256); const l=JSON.parse(read(pin.path)); A.equal(l.mode,'live'); ledgerPins.push(pin); for(const r of l.requests) {rows.push(r);locations.set(r.providerRequestId,{r,l,root:path.dirname(pin.path)});} }
  receipts(rows); const byId=new Map(rows.map(r=>[r.providerRequestId,r]));
  function derived(d, expectedParent, expectedHash) {
    A.equal(d.sourceVideoRequestId,expectedParent);A.equal(d.sha256,expectedHash);hash(d.path,d.sha256);
    const loc=locations.get(expectedParent);A.ok(loc);A.equal(d.sourceVideoSha256,loc.r.outputSha256);A.ok(Number.isInteger(d.frameIndex)&&d.frameIndex>=0);
    const video=path.resolve(loc.root,loc.l.assets[loc.r.asset].path);hash(video,d.sourceVideoSha256);
    const bytes=cp.execFileSync('ffmpeg',['-v','error','-xerror','-i',video,'-vf',`select=eq(n\\,${d.frameIndex})`,'-frames:v','1','-c:v','png','-f','image2pipe','pipe:1'],{maxBuffer:40*1024*1024});A.equal(sha(bytes),d.sha256,'derived frame not exact native extraction');
  }
  function ancestry(r, stack=[]) {
    A.ok(!stack.includes(r.providerRequestId),'lineage cycle');A.equal(r.state,'done');A.equal(r.offlineSimulation,false);
    if(r.imageInput) {const parent=byId.get(r.imageInput.parentRequestId);A.ok(parent,'untracked parent'); if(parent.kind==='image') A.equal(r.imageInput.sha256,parent.outputSha256);else {const d=(m.derivedReferences||[]).find(d=>d.sha256===r.imageInput.sha256&&d.sourceVideoRequestId===parent.providerRequestId);A.ok(d,'missing native-frame proof');derived(d,parent.providerRequestId,r.imageInput.sha256);} ancestry(parent,[...stack,r.providerRequestId]);}
    else A.equal(r.textOnly,true,'lineage root must be this-round pure text');
    if(r.kind==='image') {const loc=locations.get(r.providerRequestId);A.ok(r.normalization,'all image raw normalization required');const a=loc.l.assets[r.asset];A.ok(a);imageProof(r,a,read(path.resolve(loc.root,r.normalization.rawPath)),read(path.resolve(loc.root,a.path)));}
  }
  for(const r of rows.filter(r=>r.kind==='image')) ancestry(r);
  let h=0,v=0;
  for(const s of m.sourceShots) {hash(s.prepared,s.preparedSha256);hash(s.source,s.sourceSha256);probe(s.prepared,s.frames);const loc=locations.get(s.providerRequestId);A.ok(loc);const r=loc.r;A.equal(r.kind,'video');A.equal(r.shot,s.shotId);A.equal(r.outputSha256,s.sourceSha256);A.equal(r.payloadSha256,s.sourcePayloadSha256);A.equal(r.model,s.sourceModel);A.equal(r.provider,s.sourceProvider);A.equal(r.actualUsd,s.actualUsd,'preserve actual null');A.equal(String(r.reservationUsd),String(s.reservationUsd));A.equal(fs.realpathSync(s.source),fs.realpathSync(path.resolve(loc.root,loc.l.assets[r.asset].path)));ancestry(r);r.model.includes('hailuo')?h++:v++;
    if(['s8','s11','s12','s14'].includes(s.shotId)) {A.equal(r.model,'google/veo-3.1-lite');A.equal(r.textOnly,true);A.equal(r.imageInput,null);A.ok(s.poster,'non-billed video-derived poster proof required');derived(s.poster,r.providerRequestId,s.poster.sha256);}
  }
  A.equal(h,9);A.equal(v,12);return {sourceShots:m.sourceShots,sourceLedgers:ledgerPins,derivedReferences:m.derivedReferences||[],allPaidRows:rows,preparedNotLiveGeneration:true,humanApproval:'none; latest review must stay waiting',costs:{falReservedUsd:3.52,openrouterReservedUsd:2.40,totalActualUsd:rows.some(r=>r.actualUsd===null)?null:rows.reduce((n,r)=>n+r.actualUsd,0)}};
}
function concatCommand(shots,file,proof) {
  A.equal(shots.length,21);const args=['-hide_banner','-v','warning','-nostdin','-n','-filter_complex_threads','1'];
  const filters=[];shots.forEach((s,i)=>{A.equal(s.shotId,'s'+(i+1));A.equal(s.frames,FRAMES[i]);args.push('-threads','1','-i',s.prepared);filters.push(`[${i}:v:0]trim=start_frame=0:end_frame=${s.frames},settb=expr=1/30,setpts=N,setsar=1,format=yuv420p[v${i}]`);});
  filters.push(shots.map((_,i)=>`[v${i}]`).join('')+`concat=n=21:v=1:a=0,settb=expr=1/30,setpts=N,split=2[encoded][proof]`);
  args.push('-filter_complex',filters.join(';'),'-map','[encoded]','-an','-c:v','libx264','-threads','2','-crf','18','-pix_fmt','yuv420p','-enc_time_base','1/30','-fps_mode','passthrough','-movflags','+faststart',file,'-map','[proof]','-an','-c:v','rawvideo','-threads','1','-pix_fmt','yuv420p','-fps_mode','passthrough','-f','framemd5',proof);return args;
}
function frameHashes(text) {return text.split('\n').filter(l=>l.trim()&&!l.startsWith('#')).map(l=>{const fields=l.split(',').map(x=>x.trim());A.equal(fields.length,6);A.match(fields[5],/^[a-f0-9]{32}$/);return fields[5];});}
function frameOrder(shots,inputs,combined) {
  A.equal(inputs.length,21);A.equal(combined.length,315);
  shots.forEach((s,i)=>{A.equal(s.shotId,'s'+(i+1));A.equal(s.frames,FRAMES[i]);A.equal(inputs[i].length,FRAMES[i]);});
  A.deepEqual(combined,inputs.flat(),'Every decoded input frame, including last frames, must contribute once in numeric shot order');
}
function concat(m,out) {
  fs.mkdirSync(out); // Exclusive directory creation; never overwrite a failed or successful artifact.
  const file=path.join(out,'prepared-21shots-no-text.mp4'),proof=path.join(out,'concat-frames.md5');
  const args=concatCommand(m.sourceShots,file,proof);fs.writeFileSync(path.join(out,'command.json'),JSON.stringify(['ffmpeg',...args],null,2));
  const inputs=m.sourceShots.map(s=>{hash(s.prepared,s.preparedSha256);probe(s.prepared,s.frames);const text=cp.execFileSync('ffmpeg',['-v','error','-xerror','-nostdin','-i',s.prepared,'-map','0:v:0','-an','-c:v','rawvideo','-pix_fmt','yuv420p','-fps_mode','passthrough','-f','framemd5','pipe:1'],{encoding:'utf8'});fs.writeFileSync(path.join(out,s.shotId+'-input.md5'),text);return frameHashes(text);});
  const process=cp.spawnSync('ffmpeg',args,{encoding:'utf8',maxBuffer:4*1024*1024});fs.writeFileSync(path.join(out,'ffmpeg-stderr.log'),process.stderr||'');A.ifError(process.error);A.equal(process.status,0,'FFmpeg concat failed; retain command/log/output');
  A.ok(!/non.?monoton|dropping|corrupt|invalid|error/i.test(process.stderr||''),'Unexpected concat warning; inspect retained log');
  frameOrder(m.sourceShots,inputs,frameHashes(fs.readFileSync(proof,'utf8')));
  const media=probe(file,315);const evidence={status:'ALL_315_DECODED_INPUT_FRAMES_IN_NUMERIC_ORDER',inputFrames:inputs.map((frames,i)=>({shotId:m.sourceShots[i].shotId,frames:frames.length,first:frames[0],last:frames.at(-1)})),filterFrameHashesSha256:sha(read(proof)),outputProbe:media.probe};fs.writeFileSync(path.join(out,'frame-order-proof.json'),JSON.stringify(evidence,null,2));
  return {file,sha256:sha(read(file)),bytes:read(file).length,frames:315,fps:30,width:1080,height:1920,durationSeconds:10.5,preparedHashes:m.sourceShots.map(s=>s.preparedSha256),frameOrderProof:path.join(out,'frame-order-proof.json')};
}

module.exports={FRAMES,EDGES,PREFIX,sha,hash,shape,receipts,selectedMix,imageProof,allowed,version,mediaShape,pcmZero,probe,preflight,concatCommand,frameHashes,frameOrder,concat};
if(require.main===module) {let result={status:'PENDING',errors:[]};try{const m=JSON.parse(read(process.argv[2]));result.manifest=preflight(m);if(process.argv[3])result.input=concat(m,path.resolve(process.argv[3]));result.status='PREFLIGHT_PASS_NOT_UI_OR_CONTENT_APPROVAL';}catch(e){result.status=e.message.startsWith('PENDING:')?'PENDING':'FAIL';result.errors.push(e.message);process.exitCode=1;}console.log(JSON.stringify(result,null,2));}

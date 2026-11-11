'use strict';
// Root only: node ui.cjs --manifest ABS --input ABS_CONCAT_JSON --out NEW_ABS
// --input is the saved gates.cjs JSON result (or its input object), NOT an arbitrary movie.
// After root restarts its owned Popen with SAME state: add --restart-check PRIOR_RESULT_JSON.
// No generation; never writes editor/canvas via API. Only UI-generated edit PUT is allowed.
const fs=require('node:fs'), path=require('node:path'), os=require('node:os'), A=require('node:assert/strict');
const G=require('./gates.cjs');
const APP='/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder';
const BASE='http://127.0.0.1:8978', P=G.PREFIX;
const TEXTS=[{text:'Turn tofu into...',start:0,end:184/30},{text:'Healthy & high protein okonomiyaki',start:184/30,end:271/30},{text:'Want the full recipe? Comment "RECIPE" below!',start:271/30,end:10.5}];
const DISCLOSURE='Prepared AI assets reused; generations completed earlier. This is real local import/edit/export/review, not live AI generation. No human approval; review stays waiting.';
function browserEnvironment(out,deliveryUserHome=os.homedir()) {
  return {PATH:'/opt/homebrew/bin:/usr/bin:/bin',HOME:deliveryUserHome,TMPDIR:out};
}
function silentSource(source,probe) {
  return source.hasAudio===false && Array.isArray(probe?.streams) && probe.streams.length===1 && probe.streams[0].codec_type==='video';
}
function audioEvidence(p,source,probe) {
  return {sourceId:source.id,sourceHasAudio:source.hasAudio??null,verifiedNoAudio:silentSource(source,probe),nativeClipFlags:p.clips.map(c=>({id:c.id,muted:c.muted})),explanation:'Native flags preserved; unmuted is inaudible only when source metadata and actual hashed input probe both prove no audio; music and voiceover must be absent'};
}
function rulerClick(ruler,scroll,frame) {
  const x=ruler.x+frame*4,y=ruler.y+ruler.height/2;
  A.ok(x>Math.max(0,scroll.x)&&x<Math.min(1440,scroll.x+scroll.width),'Ruler target clipped/offscreen; stop');
  A.ok(y>0&&y<900,'Ruler target outside viewport');return {x,y};
}
function projectCheck(p,source,number=21,texts=true,inputProbe=null) {
  A.equal(p.fps,30);A.equal(p.width,1080);A.equal(p.height,1920);A.equal(p.clips.length,number);
  p.clips.forEach((c,i)=>{A.equal(c.source.kind,'take');A.equal(c.source.id,source.id);A.equal(Math.round(c.in*30),G.EDGES[i]);A.equal(Math.round(c.out*30),i===number-1?315:G.EDGES[i+1]);A.equal(typeof c.muted,'boolean');A.ok(c.muted||silentSource(source,inputProbe),'Unmuted audio-bearing/unknown source rejected; no API flag patch');});
  A.equal(p.captions.enabled,false);A.equal(p.music,null);A.deepEqual(p.voiceover,[]);A.equal(p.showLogo,false);
  if(texts) {A.equal(p.texts.length,3); p.texts.forEach((t,i)=>{A.equal(t.text,TEXTS[i].text);A.equal(t.position,'top');A.equal(t.color,'white');A.equal(Math.round(t.start*30),Math.round(TEXTS[i].start*30));A.equal(Math.round(t.end*30),Math.round(TEXTS[i].end*30));});}
}
async function run() {
  const opts={};for(let i=2;i<process.argv.length;i+=2){A.ok(['--manifest','--input','--out','--restart-check'].includes(process.argv[i]));A.ok(process.argv[i+1]);opts[process.argv[i]]=process.argv[i+1];}
  A.ok(opts['--out']&&path.isAbsolute(opts['--out']));const out=opts['--out'];fs.mkdirSync(out);
  let browser,ctx,page,stage='local preflight';
  const result={status:'PENDING',stage,errors:[],checks:[],recordings:[],versions:{},disclosure:DISCLOSURE,humanApproval:null,serverRestartVerified:false,manifestPath:opts['--manifest'],inputPath:opts['--input']};
  const save=()=>fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({...result,stage},null,2)+'\n');
  const poll=async(fn,accept,timeout=30000)=>{const start=Date.now();while(Date.now()-start<timeout){const r=await fn();if(accept(r))return r;await new Promise(r=>setTimeout(r,300));}throw Error('PENDING/timeout at '+stage);};
  save();
  try {
    const manifest=JSON.parse(fs.readFileSync(opts['--manifest'])); result.provenance=G.preflight(manifest);
    const inputJSON=JSON.parse(fs.readFileSync(opts['--input']));const input=inputJSON.input||inputJSON;G.hash(input.file,input.sha256);const inputMedia=G.probe(input.file,315);result.inputMedia=inputMedia;A.ok(fs.statSync(input.file).size<=200*1024*1024);
    A.equal(input.frames,315);A.equal(input.durationSeconds,10.5);
    // The root concat artifact must bind back to all 21 prepared clips, not a partial or arbitrary file.
    A.deepEqual(input.preparedHashes,manifest.sourceShots.map(s=>s.preparedSha256));
    const prior=opts['--restart-check']?JSON.parse(fs.readFileSync(opts['--restart-check'])):null;
    if(prior){A.equal(prior.status,'UI_PASS_RESTART_PENDING');A.equal(prior.manifestSha256,G.sha(fs.readFileSync(opts['--manifest'])));}
    result.manifestSha256=G.sha(fs.readFileSync(opts['--manifest']));
    const executablePath=APP+'/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell';A.ok(fs.existsSync(executablePath),'Existing browser required, downloads forbidden');
    const {chromium}=require('/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core');
    browser=await chromium.launch({executablePath,headless:true,env:browserEnvironment(out)});
    ctx=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',acceptDownloads:true,recordVideo:{dir:path.join(out,'raw-recordings'),size:{width:1440,height:900}}});
    result.blockedRequests=[];
    await ctx.route('**/*',r=>{if(G.allowed(r.request().method(),r.request().url()))return r.continue();result.blockedRequests.push({method:r.request().method(),url:r.request().url()});return r.abort('blockedbyclient');});
    A.equal(typeof ctx.routeWebSocket,'function','WebSocket blocking required');await ctx.routeWebSocket('**/*',s=>s.close());
    await ctx.addInitScript(text=>{document.addEventListener('DOMContentLoaded',()=>{const e=document.createElement('div');e.textContent=text;e.style.cssText='position:fixed;bottom:6px;right:6px;z-index:999999;max-width:420px;color:white;background:#152a24;padding:8px;font:12px sans-serif;pointer-events:none';document.body.append(e);});},DISCLOSURE);
    page=await ctx.newPage();page.setDefaultTimeout(20000);
    const call=async(method,url,data)=>{const absolute=new URL(url,BASE).href;A.ok(G.allowed(method,absolute));const r=await ctx.request.fetch(absolute,{method,data,maxRedirects:0});A.ok(r.ok(),method+' '+url+' '+r.status());return r;};
    const get=async s=>(await call('GET',s)).json();
    const plans=()=>page.getByRole('button',{name:/^Plans(?:\s|$)/}).first().click();
    const play=async selector=>{const v=page.locator(selector);A.equal(await v.count(),1);await v.evaluate(e=>{e.muted=true;e.currentTime=0;return e.play();});await page.waitForFunction(sel=>{const v=document.querySelector(sel);return v?.ended&&v.duration>10&&v.currentTime>=v.duration-.1;},selector,{timeout:30000});return v.evaluate(e=>({ended:e.ended,duration:e.duration}));};
    stage='permanently locked private server gate';save();const status=await get('/api/batch/status');A.equal(status.scope,'final21-prepared-review');A.equal(status.generationEnabled,false);A.equal(status.mode,'offline');A.ok(status.bootId);result.server=status;
    if(prior){A.equal(status.state,prior.server.state);A.notEqual(status.bootId,prior.server.bootId,'Real backend restart required; page.reload is insufficient');}
    stage='synthetic staff login';save();await page.goto(BASE);
    if(!await page.locator('#login-email').isVisible())await page.getByRole('button',{name:/^Log in/}).first().click();
    await page.locator('#login-email').fill('test@example.com');await page.locator('#login-password').fill('pw-for-e2e');
    let response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/auth/login');await page.getByRole('button',{name:/^Log in/}).last().click();A.equal((await response).status(),200);
    await page.getByText('Client dashboard',{exact:true}).first().waitFor();await page.getByRole('button',{name:'Ever Green',exact:true}).first().click();await page.getByRole('button',{name:/^Plans(?:\s|$)/}).first().waitFor();
    const ideaBefore=JSON.stringify((await get('/api/ideas')).find(i=>i.id==='evergreen-fresh-ai-21'));
    let edit=await get(P+'/edit');let sources=(await get(P+'/edit/sources')).sources;
    if(prior){A.equal(sources.length,1);const source=sources[0];A.equal(source.kind,'take');A.equal(source.hasAudio,false);A.equal(G.sha(await(await call('GET',source.url)).body()),input.sha256);projectCheck(edit.project,source,21,true,inputMedia.probe);result.importedSource=source;result.nativeAudio=audioEvidence(edit.project,source,inputMedia.probe);A.deepEqual(edit.project,prior.nativeEdit.project);const cut=await get(P+'/cut');A.equal(cut.review?.status,'waiting');A.equal(G.version(cut),prior.versions.review);A.equal(cut.output.url,prior.nativeCut.output.url);A.equal(G.sha(await(await call('GET',cut.output.url)).body()),prior.output.sha256);result.nativeEdit=edit;result.nativeCut=cut;result.output=prior.output;result.versions=prior.versions;result.reviewUrl=prior.reviewUrl;result.priorRecording=prior.recordings;}
    else {
      stage='Plans native upload';save();A.ok(edit.project.clips.length===0||edit.project.clips.length===21,'Nonempty partial editor: stop, never silently overwrite');
      await plans();await page.getByRole('button',{name:'Open plan',exact:true}).click();
      if(!sources.length){A.equal(edit.project.clips.length,0);response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===P+'/shots/0/takes');await page.locator('.take-add input[type=file]').first().setInputFiles(input.file);A.equal((await response).status(),201);sources=await poll(async()=>(await get(P+'/edit/sources')).sources,s=>s.length===1);}
      A.equal(sources.length,1);const source=sources[0];A.equal(source.kind,'take');A.equal(source.shotId,'s1');A.equal(G.sha(await(await call('GET',source.url)).body()),input.sha256);A.equal(Math.round(source.duration*30),315);A.equal(source.hasAudio,false,'Native source metadata must agree with actual no-audio probe');result.importedSource=source;
      stage='true Canvas imported prepared movie';save();await page.getByRole('button',{name:'Open the canvas',exact:true}).click();await page.locator('.react-flow').waitFor();await page.getByRole('button',{name:'Fit to screen',exact:true}).click();await page.screenshot({path:path.join(out,'prepared-import-canvas.png')});
      await plans();await page.getByRole('button',{name:'Make the video',exact:true}).click();await page.locator('.cv-ed').waitFor();
      if(edit.project.clips.length===0){await page.locator('.cv-ed-shot').first().getByRole('button',{name:'Put in timeline',exact:true}).click();edit=await poll(()=>get(P+'/edit'),e=>e.project.clips.length===1);
        const zoom=page.locator('.cv-ed-zoom input');await zoom.focus();await zoom.press('End');A.equal(await zoom.inputValue(),'120','Inspect changed zoom contract');
        result.splitEvidence=[];for(let i=1;i<21;i++){const previousVersion=edit.version;stage='native UI split '+i;save();const ruler=page.locator('.cv-ed-ruler');await ruler.scrollIntoViewIfNeeded();await page.locator('.cv-ed-scroll').evaluate((e,x)=>{e.scrollLeft=Math.max(0,x-200);},G.EDGES[i]*4);const box=await ruler.boundingBox(),scroll=await page.locator('.cv-ed-scroll').boundingBox();A.ok(box&&scroll);const point=rulerClick(box,scroll,G.EDGES[i]);await page.mouse.click(point.x,point.y);await page.getByRole('button',{name:'Split at playhead',exact:true}).click();edit=await poll(()=>get(P+'/edit'),e=>e.project.clips.length===i+1);A.ok(edit.version>previousVersion,'Split must be persisted with a newer native edit version');result.splitEvidence.push({split:i,frame:G.EDGES[i],click:point,editVersion:edit.version});edit.project.clips.forEach((c,j)=>{A.equal(c.source.id,source.id);A.equal(Math.round(c.in*30),G.EDGES[j]);A.equal(Math.round(c.out*30),j===i?315:G.EDGES[j+1]);});fs.writeFileSync(path.join(out,'split-'+i+'.json'),JSON.stringify(edit,null,2));}
        // Preserve disabled Mute and native false flags for proven silent sources; never patch app state.
        for(let i=0;i<21;i++){edit=await get(P+'/edit');if(!edit.project.clips[i].muted&&!silentSource(source,inputMedia.probe)){const mute=page.locator('.cv-ed-audio-row').nth(i).getByRole('button',{name:'Mute',exact:true});A.ok(await mute.isEnabled(),'Audio-bearing or unknown source requires a real enabled UI Mute control');await mute.click();await poll(()=>get(P+'/edit'),e=>e.project.clips[i].muted);}}
        await page.getByRole('tab',{name:'Captions',exact:true}).click();await page.getByRole('checkbox',{name:'Show captions in the video',exact:true}).uncheck();await page.getByRole('tab',{name:'Text',exact:true}).click();
        for(const [i,t] of TEXTS.entries()){await page.getByRole('button',{name:'Add text at the playhead',exact:true}).click();await page.getByRole('textbox',{name:'Words',exact:true}).fill(t.text);await page.getByRole('button',{name:'Top',exact:true}).click();await page.getByRole('button',{name:'White',exact:true}).click();for(const [label,val] of [['Starts at (s)',t.start],['Ends at (s)',t.end]]){const f=page.getByRole('spinbutton',{name:label,exact:true});await f.fill(String(val));await f.press('Tab');}await poll(()=>get(P+'/edit'),e=>e.project.texts.length===i+1&&Math.round(e.project.texts[i].end*30)===Math.round(t.end*30));}
      }
      edit=await get(P+'/edit');projectCheck(edit.project,source,21,true,inputMedia.probe);result.nativeAudio=audioEvidence(edit.project,source,inputMedia.probe);result.nativeEdit=edit;result.versions.edit=edit.version;result.checks.push('21 native UI clips, numeric order, exact315frames, 3 English text groups');
      stage='native Export/download/staff playback';save();await page.getByRole('button',{name:'Export and send',exact:true}).click();let cut=await get(P+'/cut');A.ok(!cut.review?.status,'Existing review: stop');A.ok(!['queued','running','done'].includes(cut.status),'Existing render: stop rather than overwrite');response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===P+'/edit/export');await page.getByRole('button',{name:'Export the video',exact:true}).click();A.ok((await response).ok());cut=await poll(()=>get(P+'/cut'),c=>{if(c.status==='failed')throw Error(c.error);return c.status==='done';},240000);A.equal(cut.source,'editor');A.equal(cut.stale,false);
      const event=page.waitForEvent('download');await page.getByRole('link',{name:'Download',exact:true}).click();const download=await event;const file=path.join(out,'evergreen-fresh-ai-21.mp4');await download.saveAs(file);A.equal(await download.failure(),null);const media=G.probe(file,315,true);result.output={file,sha256:G.sha(fs.readFileSync(file)),bytes:fs.statSync(file).size,durationSeconds:10.5,width:1080,height:1920,fps:30,frames:315,...media};result.staffPlayback=await play('.cv-ed-export-video');
      stage='local review link and UI send waiting';save();const share=await(await call('POST','/api/share',{clientId:'evergreen-fresh-ai'})).json();A.ok(G.allowed('GET',share.url));result.reviewUrl=share.url;response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===P+'/cut/review');await page.getByRole('button',{name:/^Send to .+ for approval$/}).click();A.ok((await response).ok());cut=await get(P+'/cut');A.equal(cut.review.status,'waiting');result.nativeCut=cut;result.versions.review=G.version(cut);
      await page.reload();A.deepEqual((await get(P+'/edit')).project,edit.project);A.equal(G.version(await get(P+'/cut')),result.versions.review);A.equal((await get(P+'/cut')).review.status,'waiting');A.equal(JSON.stringify((await get('/api/ideas')).find(i=>i.id==='evergreen-fresh-ai-21')),ideaBefore,'Shot.line/script changed');
    }
    stage='same page signed-out anonymous playback';save();await plans();response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/auth/logout');await page.getByRole('button',{name:'Sign out',exact:true}).click();A.ok((await response).ok());await ctx.clearCookies();A.deepEqual(await ctx.cookies(),[]);await page.goto(result.reviewUrl);result.publicPlayback=await play('video');A.deepEqual(await ctx.cookies(),[]);await page.reload();A.deepEqual(await ctx.cookies(),[]);
    const token=new URL(result.reviewUrl).pathname.split('/').filter(Boolean).at(-1);const review=await get('/api/review/'+token);A.equal(review.cuts.length,1);const publicCut=review.cuts[0].cut;A.equal(publicCut.version,result.versions.review);A.equal(new URL(publicCut.url,BASE).searchParams.get('v'),result.versions.review);A.equal(G.sha(await(await call('GET',publicCut.url)).body()),result.output.sha256);
    for(const pin of manifest.sourceLedgers)G.hash(pin.path,pin.sha256);
    A.ok(!result.blockedRequests.some(r=>r.method!=='GET'&&/\/gen(?:\/|$)/.test(new URL(r.url).pathname)),'Generation attempt was blocked');
    result.reviewStatus='waiting';result.serverRestartVerified=!!prior;result.status=prior?'PASS':'UI_PASS_RESTART_PENDING';result.checks.push(prior?'real new backend bootId; exact edit/output/latestwaiting and anonymoushash persisted':'same-page continuous staff export/waiting/logout/cookie-empty public ended; backend restart still required');stage='complete';
  } catch(e){result.errors.push(String(e.stack||e));result.status='PENDING_OR_FAIL';process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}
  finally{if(ctx){const videos=ctx.pages().map(p=>p.video()).filter(Boolean);await ctx.close().catch(e=>result.errors.push('context close '+e));for(const v of videos)result.recordings.push(await v.path().catch(()=>null));if(result.recordings.length!==1||result.recordings.some(f=>!f||!fs.existsSync(f)||!fs.statSync(f).size))result.errors.push('Exactly one complete raw same-page recording required');}if(browser)await browser.close().catch(e=>result.errors.push('browser close '+e));if(result.errors.length){result.status='PENDING_OR_FAIL';process.exitCode=1;}save();if(result.status==='PASS')fs.writeFileSync(path.join(out,'delivery-allowlist.json'),JSON.stringify({output:result.output,shotSources:result.provenance.sourceShots,sourceLedgers:result.provenance.sourceLedgers,derivedReferences:result.provenance.derivedReferences,allPaidRows:result.provenance.allPaidRows,costs:result.provenance.costs,EnglishCaptions:TEXTS,audioOrigin:result.output.audioProvenance,nativeAudio:result.nativeAudio,recordings:{fullSuccessfulStaffToAnonymous:result.priorRecording,restartProof:result.recordings},latestReview:'waiting',versions:result.versions,serverRestartVerified:true,preparedNotLiveGeneration:true,humanApproval:null},null,2));console.log(result.status,stage,out);}
}
module.exports={browserEnvironment,projectCheck,silentSource,audioEvidence,rulerClick,TEXTS};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});

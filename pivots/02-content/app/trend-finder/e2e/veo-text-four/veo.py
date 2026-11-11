"""Four explicitly approved text-only CLI videos; no image inputs or live UI claim."""
import argparse
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from contextlib import contextmanager
from decimal import Decimal

HERE=Path(__file__).resolve().parent
B=Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')
PINS_SHA='3e55ab8dd12dc9c66b3b3b16461d1cd77968a4d83d5636abf798ee086db084d4'
SHOTS=('s8','s11','s12','s14')
VEO='google/veo-3.1-lite'
SEED='fal-ai/bytedance/seedream/v4.5/text-to-image'
HAILUO='fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video'
ENV={'PATH':'/opt/homebrew/bin:/usr/bin:/bin','LC_ALL':'C'}
ENDPOINT='https://openrouter.ai/api/v1/videos'
FIELDS={'model','prompt','duration','resolution','aspect_ratio','generate_audio'}

def sha(blob):return hashlib.sha256(blob).hexdigest()
def encoded(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def digest(value):return sha(encoded(value))
def require(ok,message):
    if not ok:raise ValueError(message)
def safe(path):
    path=Path(path).absolute();require(all(not p.is_symlink() for p in [path,*path.parents]),'symlink forbidden');return path

def approval(p,pins):
    for name,key in [('approvalPath','approvalSha256'),('proposalPath','proposalSha256')]:
        path=safe(p[name]);st=path.stat();require(path.is_file() and st.st_uid==os.getuid() and not st.st_mode&0o022,'approval/proposal ownership differs')
        require(sha(path.read_bytes())==pins[key],'approval/proposal changed')
    a=json.loads(safe(p['approvalPath']).read_bytes());q=json.loads(safe(p['proposalPath']).read_bytes())
    require(a==p['approval'] and q==p['proposal'] and a['status']=='AUTHORIZED_BY_EXPLICIT_USER_GO_AND_TARGET_CONFIRMATION','explicit target approval missing')
    require(a['proposalPath']==p['proposalPath'] and a['proposalSha256']==pins['proposalSha256'] and a['targets']==q['targets']==p['shots']==list(SHOTS),'approval scope/proposal differs')
    require(a['provider']=='openrouter' and a['model']==VEO and a['inputMode']=='TEXT_ONLY' and a['maximumNewCalls']==4 and a['perCallReservationUsd']=='0.20' and a['newBatchMaximumUsd']=='0.80','new-call allowance differs')
    require(a['cumulativeMaximumUsd']==dict(fal='3.52',openrouter='2.40') and a['maximumImageCalls']==28 and a['maximumVeoCalls']==12 and a['selectedFinalMix']==dict(hailuo=9,veo=12) and a['unpricedAdditionalBudgetAuthorized'] is False,'cumulative authority differs')
    require(set(q['requestBodies'])==set(SHOTS) and q['requestedScopeChanges']['veoRetakesRemainingAfterFour']==0,'no extra target/retake')
    for body in q['requestBodies'].values():
        fixed=dict(model=VEO,duration=4,resolution='1080p',aspect_ratio='9:16',generate_audio=False)
        require(set(body)==FIELDS and all(type(body[k]) is type(v) and body[k]==v for k,v in fixed.items()) and isinstance(body['prompt'],str) and 0<len(body['prompt'])<=2000,'only exact six-field text-only video bodies')
    return pins['approvalSha256']

def load():
    raw=(HERE/'pins.json').read_bytes();require(sha(raw)==PINS_SHA,'pins changed');pins=json.loads(raw)
    raw=(HERE/'plan.json').read_bytes();require(sha(raw)==pins['planSha256'],'plan changed');p=json.loads(raw)
    for n,h in pins['sourcePins'].items():require(sha(safe(B/n).read_bytes())==h,'reviewed core changed: '+n)
    require(sha(safe(B/'veo-price-verification-20261106.json').read_bytes())==pins['priceSha256'],'fixed video SKU evidence changed')
    approval(p,pins);return p,pins

PLAN,PINS=load()
sys.path.insert(0,str(B))
from fixed_runtime import FixedEngine
from provider_transport import ProviderTransport
from runtime import Blocked


def prove_parents(p):
    rows=[];fal=Decimal(0);router=Decimal(0)
    require(len(p['parentLedgers'])==9,'nine immutable parents required')
    for i,parent in enumerate(p['parentLedgers']):
        root=safe(parent['state']);raw=safe(root/'engine/runtime-ledger.json').read_bytes();require(sha(raw)==parent['ledgerSha256'],'parent hash changed');d=json.loads(raw)
        require(d['mode']=='live' and d['caps']==dict(fal='4.00',openrouter='3.00') and d['halted']==parent['mustRemainHalted'],'parent mode/caps/hold differs')
        if i==0:require(d['halted'] is True and d.get('qualityHolds'),'original QUALITY_HOLD must remain')
        require(d['requests']==parent['requests'] and d['reserved']==parent['reserved'] and all(r['state']=='done' for r in d['requests']),'parent unresolved/receipts differ')
        require(parent['frozenFile']==('frozen-plan.json' if i<2 else 'plan.json') and sha(safe(root/parent['frozenFile']).read_bytes())==parent['frozenSha256'],'parent freeze changed')
        require(len(d['requests'])==[31,3,1,1,4,4,2,1,1][i] and all(r['provider']==('fal' if i<5 else 'openrouter') for r in d['requests']),'parent allocation differs')
        if i>=5:require(all(r['actualUsd'] is not None for r in d['requests']) and sum(Decimal(str(r['actualUsd'])) for r in d['requests'])==Decimal(['.80','.40','.20','.20'][i-5]),'parent OR actuals differ')
        rows+=d['requests'];fal+=Decimal(d['reserved']['fal']);router+=Decimal(d['reserved']['openrouter'])
    ids=[r['providerRequestId'] for r in rows]
    require(len(rows)==len(set(ids))==len({r['fingerprint'] for r in rows})==48,'48 unique paid parent rows required')
    require(all(r['offlineSimulation'] is False and (r['provider'],r['kind'],r['model']) in (('fal','image',SEED),('fal','video',HAILUO),('openrouter','video',VEO)) for r in rows),'foreign parent model/provider')
    require(sum(r['kind']=='image' for r in rows)==28 and sum(r['provider']=='fal' and r['kind']=='video' for r in rows)==12 and sum(r['provider']=='openrouter' for r in rows)==8,'parent counts differ')
    require(fal==sum(Decimal(r['reservationUsd']) for r in rows if r['provider']=='fal')==Decimal('3.52') and router==sum(Decimal(r['reservationUsd']) for r in rows if r['provider']=='openrouter')==Decimal('1.60'),'parent funding differs')
    return dict(parentIds=ids,parentReceiptsSha256=digest(rows),reservedFal=str(fal),reservedOpenRouter=str(router),images=28,hailuo=12,veo=8)

class ParentLocks:
    def __init__(self,p):self.p,self.fds=p,[]
    def __enter__(self):
        try:
            for x in self.p['parentLedgers']:
                fd=os.open(safe(Path(x['state'])/'engine/runtime.lock'),os.O_RDONLY|os.O_NOFOLLOW);self.fds.append(fd);fcntl.flock(fd,fcntl.LOCK_SH|fcntl.LOCK_NB)
            self.proof=prove_parents(self.p);return self
        except BaseException:self.release();raise
    def release(self):
        while self.fds:os.close(self.fds.pop())
    def __exit__(self,*a):self.release()

def exclusive(path,blob):
    path=safe(path);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('xb') as f:f.write(blob);f.flush();os.fsync(f.fileno())
    fd=os.open(path.parent,os.O_RDONLY)
    try:os.fsync(fd)
    finally:os.close(fd)

def state_check(state,p,pins):
    state=safe(state);require(state==Path(p['newState']) and all(state!=Path(x['state']) for x in p['parentLedgers']),'foreign child state')
    require(json.loads(safe(state/'plan.json').read_bytes())==p and json.loads(safe(state/'pins.json').read_bytes())==pins,'child immutable plan differs')


class TextTransport(ProviderTransport):
    """Only the four frozen six-field text-only requests, using existing safe HTTP helpers."""
    def __init__(self,root,*,proposal=None,**kwargs):
        self.root=Path(root);self.proposal=PLAN if proposal is None else proposal;super().__init__(**kwargs)
    @staticmethod
    def model_ok(value):require(value.get('model',VEO) in (VEO,'google/veo-3.1-lite-20260331'),'provider reported foreign model')
    def __call__(self,kind,body,first,*,checkpoint):
        require(kind=='video' and first is None and set(body)==FIELDS and any(encoded(body)==encoded(x) for x in self.proposal['proposal']['requestBodies'].values()),'transport permits approved text-only bodies only')
        d=json.loads(safe(self.root/'runtime-ledger.json').read_bytes());r=d['requests'][-1];fp=r['fingerprint']
        require(r['state']=='reserved' and encoded(body)==encoded(self.proposal['proposal']['requestBodies'][r['shot']]) and fp==digest(['openrouter','video',body]),'transport requires durable matching reservation')
        headers={'Authorization':'Bearer '+self.require_key('openrouter'),'Content-Type':'application/json'};payload=json.dumps(body,separators=(',',':')).encode()
        submitted=self._json(self.http('POST',ENDPOINT,headers,payload));rid=submitted.get('id')
        if not isinstance(rid,str) or not re.fullmatch(r'[A-Za-z0-9_.:-]{1,128}',rid):
            exclusive(self.root/'provider-replies'/(fp+'-submit.json'),(json.dumps(submitted,indent=2)+'\n').encode());raise ValueError('missing request id')
        poll=ENDPOINT+'/'+rid;receipt=dict(providerRequestId=rid,model=VEO,submitEndpoint=ENDPOINT,pollUrl=poll,requestPayloadSha256=sha(payload))
        checkpoint(receipt)  # Persist RID before response evidence, URL/model checks, or GET.
        exclusive(self.root/'provider-replies'/(fp+'-submit.json'),(json.dumps(submitted,indent=2)+'\n').encode())
        require(self._url(submitted.get('polling_url') or poll,'openrouter.ai')==poll,'unexpected polling URL');self.model_ok(submitted)
        for i in range(self.poll_limit):
            try:response=self.http('GET',poll,headers,None)
            except (OSError,TimeoutError):self.sleep(2);continue
            if response[0] in (408,429) or response[0]>=500:self.sleep(2);continue
            value=self._json(response);exclusive(self.root/'provider-replies'/(fp+'-poll-'+str(i)+'.json'),(json.dumps(value,indent=2)+'\n').encode());self.model_ok(value)
            status=value.get('status')
            require(not value.get('error') and status not in ('failed','FAILED','cancelled','CANCELLED'),'provider reported failure')
            if status not in ('completed','COMPLETED'):self.sleep(2);continue
            blob=self._download(poll+'/content?index=0',headers)
            answer=dict(providerRequestId=rid,data=blob,actualUsd=(value.get('usage') or {}).get('cost'),billingEstimateUsd=.20,receipt=receipt)
            exclusive(self.root/'provider-originals'/(fp+'.bin'),blob);evidence={k:v for k,v in answer.items() if k!='data'};evidence.update(sha256=sha(blob),bytes=len(blob),textOnlyVideo=True,requestBody=body)
            exclusive(self.root/'provider-originals'/(fp+'.json'),(json.dumps(evidence,indent=2)+'\n').encode());return answer
        raise TimeoutError('provider polling deadline exceeded')


class TextEngine(FixedEngine):
    policy='four-approved-text-only-veo-cli'
    def __init__(self,root,transport,*,proposal=None,pins=None):
        self.proposal=copy.deepcopy(PLAN if proposal is None else proposal);self.pins=copy.deepcopy(PINS if pins is None else pins);self._parents=self._proof=None
        state_check(Path(root).parent,self.proposal,self.pins);require(Path(root)==Path(self.proposal['newState'])/'engine','foreign engine root');approval(self.proposal,self.pins)
        require(isinstance(transport,TextTransport) and transport.proposal==self.proposal,'only bounded text transport')
        super().__init__(root,transport,mode='live')
    def body(self,shot):
        require(shot in SHOTS,'unapproved target');return copy.deepcopy(self.proposal['proposal']['requestBodies'][shot])
    def _body(self,provider,kind,shot,body):
        require((provider,kind)==('openrouter','video') and shot in SHOTS and set(body)==FIELDS and encoded(body)==encoded(self.body(shot)),'only exact approved six-field text-only body');return copy.deepcopy(body)
    def lineage(self):return dict(planSha256=self.pins['planSha256'],approvalSha256=self.pins['approvalSha256'],proposalSha256=self.pins['proposalSha256'],parentLedgerHashes=[x['ledgerSha256'] for x in self.proposal['parentLedgers']],parentReceiptsSha256=self._proof['parentReceiptsSha256'],disclosure='Prepared CLI pure-text videos; no image input/firstImage/native generation; posters are nonbilled extraction; content QA/promotion pending; selected9H12V; no Veo retakes after four')
    @contextmanager
    def lock(self):
        with ParentLocks(self.proposal) as parents:
            fd=os.open(self.root/'runtime.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600);owned=False
            try:
                fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB);owned=True;self._parents,self._proof=parents,parents.proof
                state_check(self.root.parent,self.proposal,self.pins);approval(self.proposal,self.pins)
                if self.path.exists():self.check_child(self.read())
                yield
            finally:
                if owned:self._parents=self._proof=None
                os.close(fd)
    def event(self,n):return dict(sequence=n,parentLedgerHashes=self.lineage()['parentLedgerHashes'],parentUniqueRequestCount=48,combinedFalReservation='3.52',combinedOpenRouterReservation=str(Decimal('1.60')+Decimal('.20')*n),combinedImages=28,combinedHailuo=12,combinedVeo=8+n,newReserved=str(Decimal('.20')*n))
    def check_child(self,d):
        require(d['mode']=='live' and d['policy']==self.policy and d['caps']==self.caps and d.get('lineage')==self.lineage(),'foreign child ledger')
        rows=d['requests'];n=len(rows);total=Decimal('.20')*n
        require(n<=4 and len({r['shot'] for r in rows})==len({r['fingerprint'] for r in rows})==n,'duplicate/quota')
        require(Decimal(d['reserved']['fal'])==0 and Decimal(d['reserved']['openrouter'])==total<=Decimal('.80') and Decimal(d['categories']['image'])==0 and Decimal(d['categories']['video'])==total,'funding differs')
        require(Decimal(self._proof['reservedFal'])==Decimal('3.52')<=Decimal('4') and self._proof['images']==28 and self._proof['hailuo']==12<=15 and self._proof['veo']+n<=12 and Decimal(self._proof['reservedOpenRouter'])+total<=Decimal('2.40')<=Decimal('3'),'aggregate cap/quota exceeded')
        fps=[];ids=[]
        for r in rows:
            body=self.body(r['shot']);fp=digest(['openrouter','video',body]);fps.append(fp)
            require((r['provider'],r['kind'],r['model'])==('openrouter','video',VEO) and r['fingerprint']==fp and r['payloadSha256']==sha(json.dumps(body,sort_keys=True).encode()) and r['imageInput'] is None and r['textOnly'] is True and r['textOnlyVideo'] is True and r['offlineSimulation'] is False,'not approved pure-text video')
            require(r['state'] in ('reserved','done','unknown') and Decimal(r['reservationUsd'])==Decimal('.20'),'state/price differs')
            if r.get('providerRequestId') and r['state']!='unknown':
                rid=r['providerRequestId'];require(rid not in self._proof['parentIds']+ids,'duplicate provider ID');ids.append(rid)
                require(r.get('providerReceipt')==dict(providerRequestId=rid,model=VEO,submitEndpoint=ENDPOINT,pollUrl=ENDPOINT+'/'+rid,requestPayloadSha256=sha(json.dumps(body,separators=(',',':')).encode())),'submission receipt differs')
            if r['state']=='done':
                require(r.get('providerReceipt') and r.get('asset')==fp and fp in d['assets'],'done lacks receipt/asset');a=d['assets'][fp]
                require(a['kind']=='video' and a['shot']==r['shot'] and a['model']==VEO and a['textOnlyVideo'] is a['textOnly'] is True and a['providerRequestId']==r['providerRequestId'] and a['requestFingerprint']==fp and a['offlineSimulation'] is False and a['sha256']==r['outputSha256'] and a['path']=='media/'+fp+'.mp4','output asset differs')
        require(set(d['assets'])<=set(fps),'foreign/image asset forbidden')
        require(d.get('funding')==[self.event(i) for i in range(1,n+1)],'atomic funding differs')
    def _reservation(self,d,provider,kind):
        self.check_child(d);require(all(r['state']=='done' for r in d['requests']) and len(d['requests'])<4,'pending/unknown or four-call cap: no retry')
        n=len(d['requests'])+1;require(self._proof['veo']+n<=12 and Decimal(self._proof['reservedOpenRouter'])+Decimal('.20')*n<=Decimal('2.40'),'next aggregate allowance exceeded');d['funding'].append(self.event(n));return Decimal('.20'),Decimal('.20')*n,Decimal('.20')*n
    def write(self,d):
        previous=self.read() if self.path.exists() else None;d.setdefault('lineage',self.lineage());d.setdefault('funding',[]);self.check_child(d)
        if previous is not None:
            require(len(d['requests'])>=len(previous['requests']) and Decimal(d['reserved']['openrouter'])>=Decimal(previous['reserved']['openrouter']) and (not previous['halted'] or d['halted']),'no reset/refund/unhalt')
            require(d['funding'][:len(previous['funding'])]==previous['funding'],'funding history changed')
            for old,new in zip(previous['requests'],d['requests']):require(old['fingerprint']==new['fingerprint'] and (old['state'] not in ('done','unknown') or old==new),'closed history changed')
        else:require(not d['requests'] and not d['assets'],'no imported generation')
        super().write(d)
        if d['requests'] and d['requests'][-1]['state']=='reserved' and len(d['requests'])>len(previous['requests'] if previous else []):self._parents.release()
    def run(self,provider,kind,shot,body):
        # The reviewed core run requires firstImage for video; this bounded path has none.
        body=self._body(provider,kind,shot,body);self._live_gate(provider);fp=digest([provider,kind,body])
        with self.lock():
            d=self.read();require(not d['halted'] and all(r['state']=='done' for r in d['requests']),'unknown/pending: STOP, no resubmission')
            require(all(r['fingerprint']!=fp for r in d['requests']),'duplicate payload')
            amount,total,category=self._reservation(d,provider,kind)
            row=dict(fingerprint=fp,provider=provider,kind=kind,shot=shot,model=VEO,state='reserved',reservationUsd=str(amount),actualUsd=None,payloadSha256=sha(json.dumps(body,sort_keys=True).encode()),imageInput=None,textOnly=True,textOnlyVideo=True,offlineSimulation=False)
            d['requests'].append(row);d['reserved'][provider]=str(total);d['categories'][kind]=str(category);self.write(d)
            try:
                def checkpoint(receipt):row.update(providerRequestId=receipt['providerRequestId'],providerReceipt=receipt);self.write(d)
                answer=self.transport(kind,body,None,checkpoint=checkpoint);row.update(providerRequestId=answer['providerRequestId'],actualUsd=answer.get('actualUsd'),billingEstimateUsd=answer.get('billingEstimateUsd'))
                cost=row['actualUsd']
                if cost is not None:require(not isinstance(cost,bool) and Decimal(str(cost)).is_finite() and Decimal(0)<=Decimal(str(cost))<=amount,'provider cost exceeds/invalid reservation')
                blob=answer['data'];self._valid_media('video',blob);relative='media/'+fp+'.mp4';exclusive(self.root/relative,blob)
                d['assets'][fp]=dict(path=relative,sha256=sha(blob),providerRequestId=row['providerRequestId'],requestFingerprint=fp,kind='video',shot=shot,model=VEO,textOnly=True,textOnlyVideo=True,offlineSimulation=False)
                row.update(state='done',asset=fp,outputSha256=sha(blob));self.write(d);return fp
            except BaseException as error:
                row.update(state='unknown',errorType=type(error).__name__);d['halted']=True;self.write(d)
                if isinstance(error,(KeyboardInterrupt,SystemExit)):raise
                raise Blocked('unconfirmed/invalid text-only video: batch halted, no retry') from None


def bootstrap(p=PLAN,pins=PINS):
    approval(p,pins)
    with ParentLocks(p):
        state=safe(p['newState']);state.mkdir(mode=0o700,exist_ok=False)
        exclusive(state/'plan.json',(json.dumps(p,indent=2)+'\n').encode());exclusive(state/'pins.json',(json.dumps(pins,indent=2)+'\n').encode())
    return state


def export_result(engine,shot,reused):
    with engine.lock():
        d=engine.read();require(not d['halted'] and all(r['state']=='done' for r in d['requests']),'unresolved child');r=next(r for r in d['requests'] if r['shot']==shot);a=d['assets'][r['asset']];fp=r['fingerprint'];path=safe(engine.root/a['path']);blob=path.read_bytes()
        require(sha(blob)==a['sha256']==r['outputSha256'],'MP4 changed');raw=safe(engine.root/'provider-originals'/(fp+'.bin')).read_bytes();retained=json.loads(safe(engine.root/'provider-originals'/(fp+'.json')).read_bytes())
        require(raw==blob and retained['sha256']==sha(blob) and retained['receipt']==r['providerReceipt'] and retained['actualUsd']==r['actualUsd'] and retained['requestBody']==engine.body(shot),'raw receipt/cost/payload differs')
        info=json.loads(subprocess.run(['/opt/homebrew/bin/ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)],capture_output=True,check=True,timeout=30,env=ENV).stdout);streams=[s for s in info['streams'] if s['codec_type']=='video']
        require(len(streams)==1 and streams[0]['codec_name']=='h264' and not any(s['codec_type']=='audio' for s in info['streams']) and (streams[0]['width'],streams[0]['height'])==(1080,1920) and abs(float(info['format']['duration'])-4)<.15,'expected silent H264 4s1080p portrait')
        subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-xerror','-protocol_whitelist','file,pipe','-i',str(path),'-f','null','-'],capture_output=True,check=True,timeout=60,env=ENV)
        args=['/opt/homebrew/bin/ffmpeg','-v','error','-xerror','-protocol_whitelist','file,pipe','-noautorotate','-i',str(path),'-map','0:v:0','-vf',r'select=eq(n\,0)','-fps_mode','passthrough','-frames:v','1','-c:v','png','-f','image2pipe','pipe:1'];png=subprocess.run(args,capture_output=True,check=True,timeout=60,env=ENV).stdout;require(png.startswith(b'\x89PNG\r\n\x1a\n'),'poster is not PNG')
        poster=engine.root.parent/'posters'/(shot+'-frame0.png')
        if poster.exists():require(safe(poster).read_bytes()==png,'poster changed')
        else:exclusive(poster,png)
        evidence=dict(file=str(poster),sha256=sha(png),sourceVideoSha256=sha(blob),providerRequestId=r['providerRequestId'],frameIndex=0,nativeFps=streams[0]['r_frame_rate'],averageFps=streams[0]['avg_frame_rate'],extractionArgs=args,prompt=engine.body(shot)['prompt'],payloadSha256=r['payloadSha256'],textOnlyVideo=True,separatelyPaidImageGeneration=False,paidRequestsForExtraction=0,nativeGenerationId=None)
        report=dict(status='TECHNICAL_PASS',shot=shot,reused=reused,file=str(path),sha256=sha(blob),rawVideoSha256=sha(blob),providerRequestId=r['providerRequestId'],providerReceipt=r['providerReceipt'],actualUsd=r['actualUsd'],reservationUsd=r['reservationUsd'],billingEstimateUsd=r.get('billingEstimateUsd'),requestBody=engine.body(shot),payloadSha256=r['payloadSha256'],textOnlyVideo=True,imageInput=None,poster=evidence,lineage=d['lineage'],funding=d['funding'][:next(i+1 for i,x in enumerate(d['requests']) if x['shot']==shot)],ffprobe=info,fullDecode='PASS',visualQA='pending',requiredUsedWindowFramesAt30=engine.proposal['usedWindowFramesAt30'][shot],promotion='not promoted',disclosure='Prepared CLI T2V, not live UI or content/human approval; frame0 poster is nonbilled extraction')
        dest=engine.root.parent/'results'/(shot+('-reused' if reused else '')+'.json')
        if dest.exists():require(json.loads(dest.read_bytes())==report,'result evidence changed')
        else:exclusive(dest,(json.dumps(report,indent=2)+'\n').encode())
        return report


def main():
    parser=argparse.ArgumentParser(description=__doc__);g=parser.add_mutually_exclusive_group(required=True);g.add_argument('--check',action='store_true');g.add_argument('--bootstrap',action='store_true');g.add_argument('--run',choices=SHOTS);args=parser.parse_args()
    if args.check:
        approval(PLAN,PINS)
        with ParentLocks(PLAN) as x:print(json.dumps(dict(status='CHECKED',newPosts=0,approvalSha256=PINS['approvalSha256'],parentUniqueRequests=len(x.proof['parentIds']),parentFal=x.proof['reservedFal'],parentOpenRouter=x.proof['reservedOpenRouter'],parentImages=28,parentHailuo=12,parentVeo=8,newMaximumCalls=4,newMaximumUsd='0.80',combinedOpenRouterMaximum='2.40',combinedVeoMaximum=12,inputFields=sorted(FIELDS),selectedFinalMix=dict(hailuo=9,veo=12),veoRetakesRemainingAfterBatch=0)))
        return
    if args.bootstrap:print(bootstrap());return
    engine=TextEngine(Path(PLAN['newState'])/'engine',TextTransport(Path(PLAN['newState'])/'engine'))
    with engine.lock():
        d=engine.read();require(not d['halted'] and all(r['state']=='done' for r in d['requests']),'STOP unknown/pending: GET-only inspection required');reused=any(r['shot']==args.run for r in d['requests'])
    if not reused:engine.run('openrouter','video',args.run,engine.body(args.run))
    print(json.dumps(export_result(engine,args.run,reused),indent=2))

if __name__=='__main__':main()

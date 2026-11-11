"""One derived-frame source-gated prepared CLI Veo clips; never live UI or final visual approval."""
import argparse
import base64
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from contextlib import closing, contextmanager
from decimal import Decimal

HERE=Path(__file__).resolve().parent
B=Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')
PINS_SHA='922bee24550a2bcc51787048d01f2af1bd748b844584b307800a90b35fe9e887'
SHOTS=('s17',)
SEED='fal-ai/bytedance/seedream/v4.5/text-to-image'
HAILUO='fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video'
VEO='google/veo-3.1-lite'
ENV={'PATH':'/opt/homebrew/bin:/usr/bin:/bin','LC_ALL':'C'}

def sha(blob):return hashlib.sha256(blob).hexdigest()
def encoded(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def digest(value):return sha(encoded(value))
def require(ok,message):
    if not ok:raise ValueError(message)
def safe(path):
    path=Path(path).absolute();require(all(not p.is_symlink() for p in [path,*path.parents]),'symlink forbidden');return path

def load():
    raw=(HERE/'pins.json').read_bytes();require(sha(raw)==PINS_SHA,'pins changed');pins=json.loads(raw)
    raw=(HERE/'plan.json').read_bytes();require(sha(raw)==pins['planSha256'],'plan changed');p=json.loads(raw)
    require(p['shots']==list(SHOTS) and p['model']==VEO and set(p['prompts'])==set(SHOTS),'scope differs')
    for n,h in pins['sourcePins'].items():require(sha(safe(B/n).read_bytes())==h,'reviewed core changed: '+n)
    for n,k in [('minimal-correction-proposal.json','approvalSha256'),('veo-price-verification-20261106.json','priceSha256')]:require(sha(safe(B/n).read_bytes())==pins[k],'approval/catalog changed')
    approval=json.loads((B/'minimal-correction-proposal.json').read_bytes())
    require(approval['status']=='AUTHORIZED_BY_USER_GO' and approval['requestedScopeChanges']['imageCallMaximum']==28 and approval['requestedScopeChanges']['maximumCalls']==dict(hailuo=15,veo=12) and approval['requestedScopeChanges']['dollarCapsUnchanged']==dict(fal=4,openrouter=3),'authorization differs')
    require(len(p['ancestors'])==1 and p['ancestors'][0]['pilotVisualQA']=='LIMITED','preserve R16 source pilot limitations')
    return p,pins

PLAN,PINS=load()
sys.path.insert(0,str(B))
from fixed_runtime import FixedEngine
from provider_transport import ProviderTransport
from image_normalization import normalize_image
from runtime import Blocked


def acceptance(p,pins):
    path=safe(p['acceptancePath']);st=path.stat()
    require(path.is_file() and st.st_uid==os.getuid() and not st.st_mode&0o022,'source acceptance must be owned and not group/world writable')
    raw=path.read_bytes();require(isinstance(pins.get('acceptanceSha256'),str) and sha(raw)==pins['acceptanceSha256'],'root source acceptance changed/missing')
    a=json.loads(raw);require(a['status']=='ROOT_ACCEPTED_SOURCE_REFERENCE_ONLY_NOT_VIDEO_APPROVAL' and a['scope']==list(SHOTS) and a['source']==p['derivedLineage'],'root derived-source gate closed')
    return sha(raw)


def prove_parents(p,pins):
    rows=[];ledgers={};total=Decimal(0);router=Decimal(0)
    require(len(p['parentLedgers'])==7,'seven immutable parents required')
    for i,parent in enumerate(p['parentLedgers']):
        root=safe(parent['state']);raw=safe(root/'engine/runtime-ledger.json').read_bytes();require(sha(raw)==parent['ledgerSha256'],'parent hash changed');d=json.loads(raw)
        require(d['mode']=='live' and d['caps']==dict(fal='4.00',openrouter='3.00') and d['halted']==parent['mustRemainHalted'],'parent mode/caps/hold differs')
        if i==0:require(d['halted'] is True and d.get('qualityHolds'),'original QUALITY_HOLD must remain')
        require(d['requests']==parent['requests'] and d['reserved']==parent['reserved'] and all(r['state']=='done' for r in d['requests']),'parent unresolved/receipt differs')
        require(parent['frozenFile']==('frozen-plan.json' if i<2 else 'plan.json') and sha(safe(root/parent['frozenFile']).read_bytes())==parent['frozenSha256'],'parent freeze changed')
        require(len(d['requests'])==[31,3,1,1,4,4,2][i] and all(r['provider']==('fal' if i<5 else 'openrouter') for r in d['requests']),'parent allocation differs')
        if i>=5:require(all(r['actualUsd'] is not None for r in d['requests']) and sum(Decimal(str(r['actualUsd'])) for r in d['requests'])==Decimal('.80' if i==5 else '.40'),'completed parent OR actuals differ')
        rows+=d['requests'];ledgers[str(root)]=d;total+=Decimal(d['reserved']['fal']);router+=Decimal(d['reserved']['openrouter'])
    ids=[r['providerRequestId'] for r in rows]
    require(len(rows)==len(set(ids))==len({r['fingerprint'] for r in rows})==46,'46 unique paid parents required')
    require(all(r['offlineSimulation'] is False and (r['provider'],r['kind'],r['model']) in (('fal','image',SEED),('fal','video',HAILUO),('openrouter','video',VEO)) for r in rows),'foreign parent model/provider')
    require(sum(r['kind']=='image' for r in rows)==28 and sum(r['provider']=='fal' and r['kind']=='video' for r in rows)==12 and sum(r['provider']=='openrouter' for r in rows)==6 and total==sum(Decimal(r['reservationUsd']) for r in rows if r['provider']=='fal')==Decimal('3.52') and router==sum(Decimal(r['reservationUsd']) for r in rows if r['provider']=='openrouter')==Decimal('1.20'),'parent aggregate differs')
    sources={}
    for s in p['ancestors']:
        require(s['sourceState']==p['parentLedgers'][1]['state'],'ancestor must be original R pure-text repair image')
        root=safe(s['sourceState']);d=ledgers[str(root)];r=next((r for r in d['requests'] if r.get('asset')==s['asset']),None);a=d['assets'].get(s['asset'])
        require(r==s['request'] and a==s['assetRow'],'source receipt/asset changed')
        require(r['shot']==a['shot']==s['sourceShot'] and r['kind']==a['kind']=='image' and r['model']==a['model']==SEED and r['textOnly'] is a['textOnly'] is True and r['imageInput'] is None and r['offlineSimulation'] is a['offlineSimulation'] is False,'not fresh text-only source')
        require(r['providerRequestId']==a['providerRequestId']==s['providerRequestId']==r['providerReceipt']['providerRequestId'] and r['fingerprint']==a['requestFingerprint']==s['asset'],'source identity differs')
        body=dict(model=SEED,prompt=s['imagePrompt'],num_images=1,max_images=1,image_size='portrait_16_9',enable_safety_checker=True)
        require(r['fingerprint']==digest(['fal','image',body]) and r['payloadSha256']==sha(json.dumps(body,sort_keys=True).encode()),'source pure-text payload differs')
        require(r['providerReceipt']['model']==SEED and r['providerReceipt']['submitEndpoint']=='https://queue.fal.run/'+SEED and r['providerReceipt']['requestPayloadSha256']==sha(json.dumps({k:v for k,v in body.items() if k!='model'},separators=(',',':')).encode()),'source provider payload receipt differs')
        require(s['sourcePath']==str(root/'engine/media'/(s['asset']+'.png')) and a['path']=='media/'+s['asset']+'.png','source path differs')
        image=safe(s['sourcePath']).read_bytes();require(sha(image)==s['sourceSha256']==a['sha256']==r['outputSha256'],'source PNG changed')
        n=r['normalization'];require(n==a['normalization'] and n['providerRequestId']==r['providerRequestId'] and n['outputSha256']==sha(image) and n['rawPath']=='provider-originals/'+s['asset']+'.bin','normalization identity differs')
        raw=safe(root/'engine'/n['rawPath']).read_bytes();require(sha(raw)==n['rawSha256'],'source raw changed');normalized,conversion=normalize_image(raw)
        require(normalized==image and conversion['operation']==n['operation'] and conversion['rawSha256']==n['rawSha256'],'raw normalization not reproducible')
        if s['native'] is not None:
            with closing(sqlite3.connect('file:'+str(safe(root/'data.db'))+'?mode=ro',uri=True)) as c:
                c.row_factory=sqlite3.Row;g=c.execute('SELECT * FROM generations WHERE id=?',(s['native']['generation']['id'],)).fetchone();b=c.execute('SELECT * FROM batch_bindings WHERE gid=?',(s['native']['generation']['id'],)).fetchone()
                require(g is not None and b is not None and dict(g)==s['native']['generation'] and dict(b)==s['native']['binding'],'native source generation/binding changed');g,b=dict(g),dict(b)
                canvas=c.execute('SELECT doc FROM canvases WHERE idea_id=?',(g['idea_id'],)).fetchone();require(canvas and any(n['id']==g['node_id'] and n['shotId']==s['sourceShot'] and n['data'].get('selected')==g['id'] for n in json.loads(canvas['doc'])['nodes']),'source selection differs')
            inputs=json.loads(g['inputs']);require(g['status']=='done' and g['source_url'] is None and inputs['prompt']==inputs.get('sentPrompt',inputs['prompt'])==s['imagePrompt'] and all(not inputs.get(k) for k in ('startFrame','references','reference','kit','kitRefs','kitStamp','kitImages')),'native source input differs')
            require(b['asset']==g['provider_request_id']==s['asset'] and b['outputHash']==s['sourceSha256'] and b['inputHash']==digest(body),'native binding input/output differs')
            require(sha(safe(root/'media'/g['idea_id']/'gen'/g['file']).read_bytes())==sha(image),'native source bytes differ')
            freeze=json.loads(safe(root/'frozen-plan.json').read_bytes());f=next(x for x in freeze['shots'] if x['shotId']==s['sourceShot']);require(f['imagePrompt']==s['imagePrompt'] and f['imageInputs']==[],'source frozen prompt differs')
        else:raise ValueError('both cooking sources require genuine native binding')
        sources[s['targetShot']]=dict(image=image,raw=raw)
    require([(s['targetShot'],s['sourceShot']) for s in p['sources']]==[('s17','s16')],'target/source mapping differs')
    image,derivation=prove_derived(p,pins,ledgers,sources['s16']['image'])
    return dict(parentIds=ids,parentReceiptsSha256=digest(rows),reservedFal=str(total),images=28,hailuo=12,veo=6,reservedOpenRouter=str(router),derivation=derivation,sources={'s17':dict(image=image,raw=safe(p['derivedLineage']['sourceVideoPath']).read_bytes())})


def prove_derived(p,pins,ledgers,ancestor):
    s=p['sources'][0];l=p['derivedLineage'];root=safe(p['parentLedgers'][6]['state']);d=ledgers[str(root)]
    require(s['sourceState']==str(root) and s['native'] is None,'C16 is engine-only; no invented native generation')
    raw=safe(s['lineagePath']).read_bytes();require(sha(raw)==pins['lineageSha256'] and json.loads(raw)==l,'derived lineage changed')
    require(l['targetShot']=='s17' and l['sourceShot']=='s16' and l['frameIndex']==84 and l['nativeFps']=='24/1' and l['nominalTimeSeconds']==3.5,'only exact native frame84@24fps')
    require(l['ancestorTextOnlyImage'] is True and l['separatelyPaidImageGeneration'] is False and l['paidRequestsForExtraction']==0 and s['separatelyPaidImageGeneration'] is False,'derived reference cannot claim a paid image')
    ar=p['ancestors'][0];require(l['ancestorImageState']==ar['sourceState']==p['parentLedgers'][1]['state'] and l['ancestorImageSha256']==ar['sourceSha256']==sha(ancestor) and l['ancestorImageRequestId']==ar['providerRequestId'],'wrong text-only R16 ancestor')
    require(l['sourceLedgerPath']==str(root/'engine/runtime-ledger.json') and l['sourceLedgerSha256']==p['parentLedgers'][6]['ledgerSha256'],'derived source ledger differs')
    r=next((r for r in d['requests'] if r['shot']=='s16'),None);require(r==s['videoRequest'],'source C16 request differs');a=d['assets'].get(r['asset']);require(a==s['videoAsset'],'source C16 asset differs')
    require((r['provider'],r['kind'],r['model'],r['state'])==('openrouter','video',VEO,'done') and r['offlineSimulation'] is False and r['textOnly'] is False,'source must be completed live C16 Veo')
    require(a['kind']=='video' and a['shot']=='s16' and a['model']==VEO and a['textOnly'] is False and a['offlineSimulation'] is False,'source video asset differs')
    require(r['imageInput']==dict(asset=ar['asset'],sha256=sha(ancestor),parentRequestId=ar['providerRequestId']),'C16 did not start from the proven R16 image')
    require(r['providerRequestId']==a['providerRequestId']==l['sourceVideoRequestId']==s['providerRequestId'] and r['asset']==r['fingerprint']==a['requestFingerprint'],'source video receipt/asset identity differs')
    freeze=json.loads(safe(root/'plan.json').read_bytes());require(freeze['model']==VEO and freeze['shots']==['s13','s16'] and next(x for x in freeze['sources'] if x['targetShot']=='s16')==ar,'C16 frozen source differs')
    body=dict(model=VEO,prompt=freeze['prompts']['s16'],firstImage=ar['asset'],duration=4,resolution='1080p',aspect_ratio='9:16',generate_audio=False)
    fp=digest(['openrouter','video',body]);require(fp==r['fingerprint'],'C16 frozen payload differs')
    outgoing={k:v for k,v in body.items() if k!='firstImage'};outgoing['frame_images']=[dict(type='image_url',image_url=dict(url='data:image/png;base64,'+base64.b64encode(ancestor).decode()),frame_type='first_frame')]
    receipt=dict(providerRequestId=r['providerRequestId'],model=VEO,submitEndpoint='https://openrouter.ai/api/v1/videos',pollUrl='https://openrouter.ai/api/v1/videos/'+r['providerRequestId'],requestPayloadSha256=sha(json.dumps(outgoing,separators=(',',':')).encode()))
    require(r['providerReceipt']==receipt and r['payloadSha256']==sha(json.dumps(outgoing,sort_keys=True).encode()),'C16 provider payload/model/input-byte receipt differs')
    require(a['path']=='media/'+fp+'.mp4' and l['sourceVideoPath']==str(root/'engine'/a['path']),'foreign video path')
    video=safe(l['sourceVideoPath']).read_bytes();require(sha(video)==l['sourceVideoSha256']==r['outputSha256']==a['sha256'],'C16 MP4 bytes differ')
    require(safe(root/'engine/provider-originals'/(fp+'.bin')).read_bytes()==video,'source retained provider MP4 differs')
    retained=json.loads(safe(root/'engine/provider-originals'/(fp+'.json')).read_bytes());require(retained['sha256']==sha(video) and retained['receipt']==receipt and retained['providerRequestId']==r['providerRequestId'] and retained['actualUsd']==r['actualUsd'],'source raw receipt/cost differs')
    require(l['sourceVideoResultPath']==str(root/'results/s16.json'),'foreign source result path')
    result_raw=safe(l['sourceVideoResultPath']).read_bytes();require(sha(result_raw)==l['sourceVideoResultSha256'],'C16 result changed');result=json.loads(result_raw)
    require(result['status']=='TECHNICAL_PASS' and result['shot']=='s16' and result['file']==l['sourceVideoPath'] and result['sha256']==result['rawVideoSha256']==sha(video) and result['providerRequestId']==r['providerRequestId'] and result['providerReceipt']==receipt and result['source']==ar and result['actualUsd']==r['actualUsd'] and result['fullDecode']=='PASS','C16 result identity/provenance differs')
    probe=json.loads(subprocess.run(['/opt/homebrew/bin/ffprobe','-v','error','-show_streams','-of','json',l['sourceVideoPath']],capture_output=True,check=True,timeout=30,env=ENV).stdout)
    streams=[x for x in probe['streams'] if x.get('codec_type')=='video'];require(len(streams)==1 and streams[0]['codec_name']=='h264' and streams[0]['r_frame_rate']==streams[0]['avg_frame_rate']=='24/1' and (streams[0]['width'],streams[0]['height'])==(1080,1920) and not any(x.get('codec_type')=='audio' for x in probe['streams']),'source must be native silent H264 portrait24fps')
    subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-xerror','-protocol_whitelist','file,pipe','-i',l['sourceVideoPath'],'-f','null','-'],capture_output=True,check=True,timeout=60,env=ENV)
    args=['/opt/homebrew/bin/ffmpeg','-v','error','-xerror','-protocol_whitelist','file,pipe','-noautorotate','-i',l['sourceVideoPath'],'-map','0:v:0','-vf',r'select=eq(n\,84)','-fps_mode','passthrough','-frames:v','1','-c:v','png','-f','image2pipe','pipe:1']
    extracted=subprocess.run(args,capture_output=True,check=True,timeout=60,env=ENV).stdout;image=safe(s['sourcePath']).read_bytes()
    require(l['framePath']==s['sourcePath'] and sha(image)==s['sourceSha256']==l['frameSha256'] and image==extracted,'exact frame84 extraction does not reproduce source PNG')
    require(s['asset']==digest(['derived-own-ai-video-frame',sha(video),84,sha(image)]),'derived asset identity differs')
    return image,dict(extractionArgs=args,extractionSha256=sha(extracted),sourceVideoSha256=sha(video),nativeFrameIndex=84,nativeFps='24/1',ancestorImageSha256=sha(ancestor),nativeVideoGenerationId=None)


class ParentLocks:
    def __init__(self,p,pins):self.p,self.pins,self.fds=p,pins,[]
    def __enter__(self):
        try:
            for x in self.p['parentLedgers']:
                fd=os.open(safe(Path(x['state'])/'engine/runtime.lock'),os.O_RDONLY|os.O_NOFOLLOW);self.fds.append(fd);fcntl.flock(fd,fcntl.LOCK_SH|fcntl.LOCK_NB)
            self.proof=prove_parents(self.p,self.pins);return self
        except BaseException:self.release();raise
    def release(self):
        while self.fds:os.close(self.fds.pop())
    def __exit__(self,*args):self.release()


def state_check(state,p,pins):
    state=safe(state);require(state==Path(p['newState']) and all(state!=Path(x['state']) for x in p['parentLedgers']),'foreign child state')
    require(json.loads(safe(state/'plan.json').read_bytes())==p and json.loads(safe(state/'pins.json').read_bytes())==pins,'child immutable plan differs')

def reference(s):return dict(path='media/'+s['asset']+'.png',sha256=s['sourceSha256'],kind='image',shot='s16',targetShot='s17',model='derived-own-ai-video-frame',providerRequestId=s['providerRequestId'],derivationFingerprint=s['asset'],textOnly=False,ancestorTextOnlyImage=True,offlineSimulation=False,nonBilledParentReference=True,separatelyPaidImageGeneration=False,sourceState=s['sourceState'],nativeSourceKind='engine-only-video',nativeGenerationId=None,frameIndex=84,nativeFps='24/1')

class VeoEngine(FixedEngine):
    policy='one-s17-derived-own-video-veo-cli'
    def __init__(self,root,transport,*,proposal=None,pins=None):
        self.proposal=copy.deepcopy(PLAN if proposal is None else proposal);self.pins=copy.deepcopy(PINS if pins is None else pins);self._parents=self._proof=None
        state_check(Path(root).parent,self.proposal,self.pins);require(Path(root)==Path(self.proposal['newState'])/'engine','foreign engine root');acceptance(self.proposal,self.pins)
        super().__init__(root,transport,mode='live')
    def source(self,shot):
        require(shot in SHOTS,'unapproved shot');return next(s for s in self.proposal['sources'] if s['targetShot']==shot)
    def body(self,shot):return dict(model=VEO,prompt=self.proposal['prompts'][shot],firstImage=self.source(shot)['asset'],duration=4,resolution='1080p',aspect_ratio='9:16',generate_audio=False)
    def lineage(self):return dict(planSha256=self.pins['planSha256'],sourceAcceptanceSha256=self.pins['acceptanceSha256'],parentLedgerHashes=[x['ledgerSha256'] for x in self.proposal['parentLedgers']],parentReceiptsSha256=self._proof['parentReceiptsSha256'],derivation=self._proof['derivation'],disclosure='Prepared CLI videos, not live UI; parent image references are non-billed; video visual QA and promotion pending; s17 sourceShot16 native-frame84 of engine-only C16 video; pure-text R16 ancestor pilot LIMITED preserved; no native video/image receipt invented; s18 not enabled')
    @contextmanager
    def lock(self):
        with ParentLocks(self.proposal,self.pins) as parents:
            fd=os.open(self.root/'runtime.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600);owned=False
            try:
                fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB);owned=True;self._parents,self._proof=parents,parents.proof
                state_check(self.root.parent,self.proposal,self.pins);acceptance(self.proposal,self.pins)
                for s in self.proposal['sources']:require(sha(safe(self.root/'media'/(s['asset']+'.png')).read_bytes())==s['sourceSha256'],'copied first frame changed')
                if self.path.exists():self.check_child(self.read())
                yield
            finally:
                if owned:self._parents=self._proof=None
                os.close(fd)
    def _body(self,provider,kind,shot,body):
        require((provider,kind)==('openrouter','video') and shot in SHOTS and body==self.body(shot),'only exact one s17 Veo payload');return super()._body(provider,kind,shot,body)
    def event(self,n):return dict(sequence=n,parentLedgerHashes=self.lineage()['parentLedgerHashes'],parentUniqueRequestCount=46,combinedFalReservation='3.52',combinedOpenRouterReservation=str(Decimal('1.20')+Decimal('.20')*n),combinedImages=28,combinedHailuo=12,combinedVeo=6+n,newReserved=str(Decimal('.20')*n))
    def check_child(self,d):
        require(d['mode']=='live' and d['policy']==self.policy and d['caps']==self.caps and d.get('lineage')==self.lineage(),'foreign child ledger')
        rows=d['requests'];n=len(rows);require(n<=1 and len({r['shot'] for r in rows})==n and len({r['fingerprint'] for r in rows})==n,'duplicate/quota')
        total=Decimal('.20')*n
        require(Decimal(d['reserved']['fal'])==0 and Decimal(d['reserved']['openrouter'])==total<=Decimal('.20') and Decimal(d['categories']['image'])==0 and Decimal(d['categories']['video'])==total,'funding differs')
        require(Decimal(self._proof['reservedFal'])<=Decimal('3.92')<=Decimal('4') and self._proof['images']==28 and self._proof['hailuo']<=15 and self._proof['veo']+n<=12 and Decimal(self._proof['reservedOpenRouter'])+total<=Decimal('2.40')<=Decimal('3'),'combined cap/quota')
        refs={s['asset']:reference(s) for s in self.proposal['sources']};require(all(d['assets'].get(k)==v for k,v in refs.items()),'nonbilled reference differs')
        fps=[];ids=[]
        for r in rows:
            s=self.source(r['shot']);body=self.body(r['shot']);fp=digest(['openrouter','video',body]);fps.append(fp)
            outgoing={k:v for k,v in body.items() if k!='firstImage'};outgoing['frame_images']=[dict(type='image_url',image_url=dict(url='data:image/png;base64,'+base64.b64encode(self._proof['sources'][r['shot']]['image']).decode()),frame_type='first_frame')]
            require((r['provider'],r['kind'],r['model'])==('openrouter','video',VEO) and r['fingerprint']==fp and r['payloadSha256']==sha(json.dumps(outgoing,sort_keys=True).encode()) and r['imageInput']==dict(asset=s['asset'],sha256=s['sourceSha256'],parentRequestId=s['providerRequestId']) and r['textOnly'] is False and r['offlineSimulation'] is False,'video payload/source differs')
            require(r['state'] in ('reserved','done','unknown') and Decimal(r['reservationUsd'])==Decimal('.20'),'state/price differs')
            if r.get('providerRequestId') and r['state']!='unknown':
                rid=r['providerRequestId'];require(rid not in self._proof['parentIds']+ids,'duplicate provider ID');ids.append(rid)
                receipt=r.get('providerReceipt');require(receipt and receipt==dict(providerRequestId=rid,model=VEO,submitEndpoint='https://openrouter.ai/api/v1/videos',pollUrl='https://openrouter.ai/api/v1/videos/'+rid,requestPayloadSha256=sha(json.dumps(outgoing,separators=(',',':')).encode())),'OR receipt/model/input bytes differ')
            if r['state']=='done':require(r.get('providerReceipt') and r.get('asset')==fp and fp in d['assets'],'done lacks receipt/asset')
        require(set(d['assets'])<=set(refs)|set(fps),'foreign asset')
        require(d.get('funding')==[self.event(i) for i in range(1,n+1)],'atomic append funding differs')
    def _reservation(self,d,provider,kind):
        self.check_child(d);acceptance(self.proposal,self.pins);require(all(r['state']=='done' for r in d['requests']) and len(d['requests'])<1,'no pending/unknown retry or second call')
        n=len(d['requests'])+1;require(self._proof['veo']+n<=12 and Decimal(self._proof['reservedOpenRouter'])+Decimal('.20')*n<=Decimal('2.40') and Decimal('.20')*n<=Decimal('.20'),'next combined Veo cap/quota exceeded');d['funding'].append(self.event(n));return Decimal('.20'),Decimal('.20')*n,Decimal('.20')*n
    def write(self,d):
        previous=self.read() if self.path.exists() else None;d.setdefault('lineage',self.lineage());d.setdefault('funding',[])
        if previous is None:
            require(not d['requests'] and not d['assets'],'no imported generation');d['assets'].update({s['asset']:reference(s) for s in self.proposal['sources']})
        self.check_child(d)
        if previous is not None:
            require(len(d['requests'])>=len(previous['requests']) and Decimal(d['reserved']['openrouter'])>=Decimal(previous['reserved']['openrouter']) and (not previous['halted'] or d['halted']),'no reset/refund/unhalt')
            require(d['funding'][:len(previous['funding'])]==previous['funding'],'funding history changed')
            for old,new in zip(previous['requests'],d['requests']):require(old['fingerprint']==new['fingerprint'] and (old['state'] not in ('done','unknown') or old==new),'closed history changed')
        super().write(d)
        if d['requests'] and d['requests'][-1]['state']=='reserved' and len(d['requests'])>len(previous['requests'] if previous else []):self._parents.release()



class RetainingTransport(ProviderTransport):
    """Keep completed provider bytes even when later price/media validation fails."""
    def __init__(self,root,**kwargs):
        self.root=Path(root);super().__init__(**kwargs)
        original_http=self.http
        def observed(method,url,headers,blob):
            response=original_http(method,url,headers,blob)
            if url.startswith('https://openrouter.ai/api/v1/videos') and '/content?' not in url and 200<=response[0]<300:
                value=json.loads(response[2]);self._responses.append({k:value[k] for k in ('id','model','status','usage') if k in value})
                if method=='GET':self.verify_models()
            return response
        self.http=observed
    def verify_models(self):
        require(all(x.get('model',VEO) in (VEO,'google/veo-3.1-lite-20260331') for x in self._responses),'provider reported foreign model')
    def __call__(self,kind,body,first,*,checkpoint):
        self._responses=[]
        def durable(receipt):
            checkpoint(receipt)  # Retain request identity even if POST reports a foreign model.
            self.verify_models()
        answer=super().__call__(kind,body,first,checkpoint=durable)
        d=json.loads(safe(self.root/'runtime-ledger.json').read_bytes());r=d['requests'][-1]
        require(r['state']=='reserved' and r['providerRequestId']==answer['providerRequestId'],'retained output request differs')
        fp=r['fingerprint'];exclusive(self.root/'provider-originals'/(fp+'.bin'),answer['data'])
        evidence={k:v for k,v in answer.items() if k!='data'};evidence.update(sha256=sha(answer['data']),bytes=len(answer['data']),fingerprint=fp,providerResponses=self._responses,providerModelReported=any('model' in x for x in self._responses))
        exclusive(self.root/'provider-originals'/(fp+'.json'),(json.dumps(evidence,indent=2)+'\n').encode())
        return answer


def exclusive(path,blob):
    path=safe(path);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('xb') as f:f.write(blob);f.flush();os.fsync(f.fileno())

def bootstrap(p=PLAN,pins=PINS):
    acceptance(p,pins)
    with ParentLocks(p,pins) as x:
        state=safe(p['newState']);state.mkdir(mode=0o700,exist_ok=False)
        exclusive(state/'plan.json',(json.dumps(p,indent=2)+'\n').encode());exclusive(state/'pins.json',(json.dumps(pins,indent=2)+'\n').encode())
        for s in p['sources']:
            proof=x.proof['sources'][s['targetShot']];exclusive(state/'engine/media'/(s['asset']+'.png'),proof['image']);exclusive(state/'references'/(s['targetShot']+'-provider-original.bin'),proof['raw'])
        exclusive(state/'source-acceptance.json',safe(p['acceptancePath']).read_bytes())
    return state


def export_result(engine,shot,reused):
    with engine.lock():
        d=engine.read();require(not d['halted'] and all(r['state']=='done' for r in d['requests']),'unresolved child')
        r=next(r for r in d['requests'] if r['shot']==shot);a=d['assets'][r['asset']];path=safe(engine.root/a['path']);blob=path.read_bytes();fp=r['fingerprint']
        raw=safe(engine.root/'provider-originals'/(fp+'.bin')).read_bytes();retained=json.loads(safe(engine.root/'provider-originals'/(fp+'.json')).read_bytes());require(raw==blob and retained['sha256']==sha(blob) and retained['providerRequestId']==r['providerRequestId'] and retained['receipt']==r['providerReceipt'],'retained provider bytes/receipt differ')
        require(a['path']=='media/'+fp+'.mp4' and a['kind']=='video' and a['shot']==shot and a['model']==VEO and a['offlineSimulation'] is False and a['requestFingerprint']==fp and a['providerRequestId']==r['providerRequestId'] and sha(blob)==a['sha256']==r['outputSha256'],'output asset/bytes differ')
        probe=subprocess.run(['/opt/homebrew/bin/ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)],capture_output=True,check=True,timeout=30,env=ENV);info=json.loads(probe.stdout)
        videos=[s for s in info['streams'] if s['codec_type']=='video'];require(len(videos)==1 and videos[0]['codec_name']=='h264' and not any(s['codec_type']=='audio' for s in info['streams']),'expected H264 silent video')
        require((videos[0]['width'],videos[0]['height'])==(1080,1920) and abs(float(info['format']['duration'])-4)<.15,'video dimensions/duration differ')
        subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-xerror','-protocol_whitelist','file,pipe','-i',str(path),'-f','null','-'],check=True,capture_output=True,timeout=60,env=ENV)
        report=dict(status='TECHNICAL_PASS',shot=shot,reused=reused,file=str(path),sha256=sha(blob),rawVideoSha256=sha(blob),providerRequestId=r['providerRequestId'],providerReceipt=r['providerReceipt'],actualUsd=r['actualUsd'],reservationUsd=r['reservationUsd'],billingEstimateUsd=r.get('billingEstimateUsd'),source=engine.source(shot),lineage=d['lineage'],funding=d['funding'][:next(i+1 for i,x in enumerate(d['requests']) if x['shot']==shot)],ffprobe=info,fullDecode='PASS',visualQA='pending',promotion='not promoted',disclosure='Prepared CLI video, not live UI or source/video human approval')
        dest=engine.root.parent/'results'/(shot+('-reused' if reused else '')+'.json')
        if dest.exists():require(json.loads(dest.read_bytes())==report,'result evidence changed')
        else:exclusive(dest,(json.dumps(report,indent=2)+'\n').encode())
        return report


def main():
    parser=argparse.ArgumentParser(description=__doc__);g=parser.add_mutually_exclusive_group(required=True);g.add_argument('--check',action='store_true');g.add_argument('--bootstrap',action='store_true');g.add_argument('--run',choices=SHOTS);args=parser.parse_args()
    if args.check:
        with ParentLocks(PLAN,PINS) as x:print(json.dumps(dict(status='CHECKED',sourceGate=acceptance(PLAN,PINS),newPosts=0,parentReceiptCount=len(x.proof['parentIds']),falReserved=x.proof['reservedFal'],parentOpenRouterReserved=x.proof['reservedOpenRouter'],parentVeo=x.proof['veo'],combinedVeoMaximum=7,newMaximumOR='0.20',combinedMaximumOR='1.40',sources={k:sha(v['image']) for k,v in x.proof['sources'].items()})))
        return
    if args.bootstrap:print(bootstrap());return
    engine=VeoEngine(Path(PLAN['newState'])/'engine',RetainingTransport(Path(PLAN['newState'])/'engine'))
    with engine.lock():
        d=engine.read();require(not d['halted'] and all(r['state']=='done' for r in d['requests']),'STOP unknown/pending: GET-only inspection required');reused=any(r['shot']==args.run for r in d['requests'])
    if not reused:engine.run('openrouter','video',args.run,engine.body(args.run))
    print(json.dumps(export_result(engine,args.run,reused),indent=2))

if __name__=='__main__':main()

"""Prepared CLI s8 repair only. One Hailuo POST, durable receipt, GET polling; never live UI."""
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

HERE = Path(__file__).resolve().parent
B = Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')
PINS_SHA = 'f633446b0f1b7a4f131caa36e12a769979a503b91d2382ae22f8e3b8bba5987b'
SEED = 'fal-ai/bytedance/seedream/v4.5/text-to-image'
HAILUO = 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video'
ENV = {'PATH': '/opt/homebrew/bin:/usr/bin:/bin', 'LC_ALL': 'C'}


def sha(blob): return hashlib.sha256(blob).hexdigest()
def encoded(value): return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()
def digest(value): return sha(encoded(value))

def require(ok, message):
    if not ok: raise ValueError(message)

def safe(path):
    path = Path(path).absolute()
    require(all(not p.is_symlink() for p in [path, *path.parents]), 'symlink path forbidden')
    return path

def load():
    raw = (HERE / 'pins.json').read_bytes(); require(sha(raw) == PINS_SHA, 'pins changed')
    pins = json.loads(raw); raw = (HERE / 'plan.json').read_bytes()
    require(sha(raw) == pins['planSha256'], 'reviewed candidate proposal changed')
    p = json.loads(raw)
    require((p['targetShot'], p['provider'], p['model'], p['duration']) == ('s8', 'fal', HAILUO, '6'), 'not the one frozen s8 video')
    require(p['originalCapsUsd'] == dict(fal=4, openrouter=3) and p['originalQuantityCaps'] == dict(falImages=24, hailuo=15, veo=12), 'original authorization differs')
    require(p['currentCombinedCounts'] == dict(falImages=24, hailuo=11, veo=0), 'current quantities differ')
    require(p['newReservationCapUsd'] == .20 and p['combinedFalReservationMaximumUsd'] == 3.36 and p['prompt_optimizer'] is False and p['enable_safety_checker'] is True, 'fixed settings differ')
    for name, h in pins['sourcePins'].items(): require(sha(safe(B / name).read_bytes()) == h, 'reviewed source changed: ' + name)
    return p, pins

PLAN, PINS = load()
sys.path.insert(0, str(B))
from fixed_runtime import FixedEngine
from provider_transport import ProviderTransport
from image_normalization import normalize_image
from runtime import Blocked


def prove_parents(p, pins):
    rows, ledgers = [], []
    for parent in p['parentLedgers']:
        root = safe(parent['state']); raw = safe(root / 'engine/runtime-ledger.json').read_bytes()
        require(sha(raw) == parent['ledgerSha256'], 'parent ledger changed')
        d = json.loads(raw)
        require(d['mode'] == 'live' and d['caps'] == {'fal': '4.00', 'openrouter': '3.00'} and d['halted'] == parent['mustRemainHalted'], 'parent mode/caps/quality lock differs')
        require(d['requests'] == parent['requests'] and d['reserved'] == parent['reserved'] and all(r['state'] == 'done' for r in d['requests']), 'parent receipts differ or unresolved')
        require(sha(safe(root / parent['frozenFile']).read_bytes()) == parent['frozenPlanSha256'], 'parent frozen plan changed')
        rows += d['requests']; ledgers.append(d)
    ids = [r['providerRequestId'] for r in rows]
    require(len(rows) == len(set(ids)) == 35, 'parent request IDs must be 35 unique paid receipts')
    require(all(r['provider'] == 'fal' and r['offlineSimulation'] is False and r['model'] == (SEED if r['kind'] == 'image' else HAILUO) for r in rows), 'foreign provider/model provenance')
    images = sum(r['kind'] == 'image' for r in rows); videos = sum(r['kind'] == 'video' for r in rows)
    require((images, videos) == (24, 11), 'combined parent quantities differ')
    total = sum(Decimal(d['reserved']['fal']) for d in ledgers)
    require(total == sum(Decimal(r['reservationUsd']) for r in rows) == Decimal('3.16') and all(Decimal(d['reserved']['openrouter']) == 0 for d in ledgers), 'combined parent funding differs')
    source=p['source'];require(source['state']==p['parentLedgers'][0]['state'],'source must be this round original AI batch')
    root=safe(source['state']);parent=ledgers[0]
    lineage_raw=safe(source['lineagePath']).read_bytes();require(sha(lineage_raw)==source['lineageSha256'],'derived-frame lineage changed')
    frame_lineage=json.loads(lineage_raw)
    require(frame_lineage['originalLedgerSha256']==p['parentLedgers'][0]['ledgerSha256'] and frame_lineage['sourceVideoSha256']==source['videoSha256'] and frame_lineage['frameSha256']==source['sha256'],'derived manifest does not bind the frozen ledger/video/frame')
    require(frame_lineage['sourceVideoGenerationId']==source['nativeGenerationId'] and frame_lineage['sourceVideoRequestId']==source['providerRequestId'] and frame_lineage['sourceVideoPath']==source['videoPath'] and frame_lineage['framePath']==source['path'],'derived manifest points at a different source')
    require(frame_lineage['frameIndex']==source['frameIndex']==48 and frame_lineage['nativeFps']==source['nativeFps']=='24/1' and frame_lineage['nominalTimeSeconds']==source['nominalTimeSeconds']==2,'only native zero-based frame48 at24fps is permitted')
    require(frame_lineage['separatelyPaidImageGeneration'] is False and frame_lineage['paidRequestsForExtraction']==0 and source['separatelyPaidImageGeneration'] is False,'derived frame cannot be billed as a generated image')
    frozen=json.loads(safe(root / 'frozen-plan.json').read_bytes());f=next(t for t in frozen['shots'] if t['shotId']=='s3')
    with closing(sqlite3.connect('file:'+str(safe(root/'data.db'))+'?mode=ro',uri=True)) as conn:
        conn.row_factory=sqlite3.Row
        native={}
        for label,gid in [('image',source['ancestorImageGenerationId']),('video',source['nativeGenerationId'])]:
            g=conn.execute('SELECT * FROM generations WHERE id=?',(gid,)).fetchone();b=conn.execute('SELECT * FROM batch_bindings WHERE gid=?',(gid,)).fetchone()
            require(g is not None and b is not None,'source AI native generation/binding missing')
            g,b=dict(g),dict(b);require(digest(g)==pins[label+'_generationsSha256'] and digest(b)==pins[label+'_batch_bindingsSha256'],'native source identity changed')
            require(g['status']=='done' and g['kind']==b['kind']==label and g['source_url'] is None and b['shot']=='s3' and g['node_id']==b['node_id'] and b['gid']==g['id'],'foreign/imported native source')
            require(g['model']==b['model']==('seedream-4.5' if label=='image' else 'hailuo-2.3-fast'),'native source model differs')
            require(b['scope']==digest([frozen,str(root/'engine'),str(root/'media')]),'source binding scope differs')
            raw_inputs=json.loads(g['inputs'])
            require(raw_inputs['prompt']==raw_inputs.get('sentPrompt',raw_inputs['prompt'])==f[label+'Prompt'] and all(not raw_inputs.get(k) for k in ('references','reference','kit','kitStamp','kitRefs','kitImages')),'source prompt/reference ancestry differs')
            require(raw_inputs.get('count',1)==1 and raw_inputs.get('aspectRatio','9:16')=='9:16' and raw_inputs.get('duration')==(None if label=='image' else 6),'source settings differ')
            require(b['identityHash']==digest([g['idea_id'],g['node_id'],label,g['model'],raw_inputs,'s3']),'source input identity differs')
            canvas=conn.execute('SELECT doc FROM canvases WHERE idea_id=?',(g['idea_id'],)).fetchone()
            require(canvas is not None and any(n['id']==g['node_id'] and n['shotId']=='s3' and n['data'].get('selected')==g['id'] for n in json.loads(canvas['doc'])['nodes']),'source no longer natively selected')
            native[label]=(g,b,raw_inputs)
    image_g,image_b,image_inputs=native['image'];video_g,video_b,video_inputs=native['video']
    r=next((r for r in parent['requests'] if r['asset']==source['ancestorImageAsset']),None);a=parent['assets'].get(source['ancestorImageAsset'])
    require(r is not None and a is not None and r['kind']==a['kind']=='image' and r['shot']==a['shot']=='s3' and r['model']==a['model']==SEED,'ancestor is not S3 Seedream')
    require(r['textOnly'] is a['textOnly'] is True and r['imageInput'] is None and r['offlineSimulation'] is a['offlineSimulation'] is False and image_inputs.get('startFrame') is None and f['imageInputs']==[],'ancestor image must be this-round live pure text')
    require(r['providerRequestId']==a['providerRequestId']==source['ancestorImageRequestId']==r['providerReceipt']['providerRequestId'] and r['providerReceipt']['model']==SEED,'ancestor provider identity differs')
    require(r['fingerprint']==r['asset']==a['requestFingerprint']==source['ancestorImageAsset']==image_b['asset']==image_g['provider_request_id'],'ancestor asset identity differs')
    require(a['path']=='media/'+r['asset']+'.png','ancestor image path differs')
    ancestor=safe(root/'engine'/a['path']).read_bytes();require(sha(ancestor)==source['ancestorImageSha256']==r['outputSha256']==a['sha256']==image_b['outputHash'],'ancestor PNG changed')
    require(frame_lineage['ancestorTextOnlyImageAsset']==r['asset'] and frame_lineage['ancestorImageRequestId']==r['providerRequestId'] and frame_lineage['ancestorImageSha256']==sha(ancestor),'derived manifest ancestor differs')
    norm=r['normalization'];require(a['normalization']==norm and norm['providerRequestId']==r['providerRequestId'] and norm['outputSha256']==sha(ancestor) and norm['rawPath']=='provider-originals/'+r['asset']+'.bin','ancestor raw normalization differs')
    original=safe(root/'engine'/norm['rawPath']).read_bytes();require(sha(original)==norm['rawSha256'],'ancestor raw provider bytes changed')
    reproduced,conversion=normalize_image(original);require(reproduced==ancestor and conversion['operation']==norm['operation'],'ancestor PNG normalization cannot be reproduced')
    body=dict(model=SEED,prompt=f['imagePrompt'],num_images=1,max_images=1,image_size='portrait_16_9',enable_safety_checker=True)
    require(image_b['inputHash']==digest(body) and r['fingerprint']==digest(['fal','image',body]),'ancestor pure-text payload differs')
    vr=next((r for r in parent['requests'] if r['asset']==source['videoAsset']),None);va=parent['assets'].get(source['videoAsset'])
    require(vr is not None and va is not None and vr['kind']==va['kind']=='video' and vr['shot']==va['shot']=='s3' and vr['model']==va['model']==HAILUO and vr['offlineSimulation'] is va['offlineSimulation'] is False,'source video is not this-round S3 Hailuo')
    require(vr['providerRequestId']==va['providerRequestId']==source['providerRequestId']==vr['providerReceipt']['providerRequestId'] and vr['providerReceipt']['model']==HAILUO,'source video provider identity differs')
    require(vr['imageInput']==dict(asset=r['asset'],sha256=sha(ancestor),parentRequestId=r['providerRequestId']) and video_inputs['startFrame']==image_g['id'],'source video did not start from the proven pure-text image')
    require(vr['fingerprint']==vr['asset']==va['requestFingerprint']==source['videoAsset']==video_b['asset']==video_g['provider_request_id'],'source video asset identity differs')
    body=dict(model=HAILUO,prompt=f['videoPrompt'],firstImage=r['asset'],duration='6',prompt_optimizer=False,enable_safety_checker=True)
    require(video_b['inputHash']==digest(body) and vr['fingerprint']==digest(['fal','video',body]),'source video payload differs')
    require(va['path']=='media/'+vr['asset']+'.mp4' and source['videoPath']==str(root/'engine'/va['path']),'source video path differs')
    video=safe(source['videoPath']).read_bytes();require(sha(video)==source['videoSha256']==vr['outputSha256']==va['sha256']==video_b['outputHash'],'source MP4 changed')
    for kind,(g,b,inputs) in native.items():
        ext='.png' if kind=='image' else '.mp4';require(g['file']==g['id']+ext and sha(safe(root/'media'/g['idea_id']/'gen'/g['file']).read_bytes())==(sha(ancestor) if kind=='image' else sha(video)),'native source bytes differ')
    probe=json.loads(subprocess.run(['/opt/homebrew/bin/ffprobe','-v','error','-show_entries','stream=codec_type,r_frame_rate,avg_frame_rate','-of','json',source['videoPath']],capture_output=True,check=True,timeout=30,env=ENV).stdout)
    streams=[s for s in probe['streams'] if s.get('codec_type')=='video'];require(len(streams)==1 and streams[0]['r_frame_rate']==streams[0]['avg_frame_rate']=='24/1','source frame index requires native constant24fps')
    args=['/opt/homebrew/bin/ffmpeg','-v','error','-xerror','-protocol_whitelist','file,pipe','-noautorotate','-i',source['videoPath'],'-map','0:v:0','-vf','select=eq(n\\,48)','-fps_mode','passthrough','-frames:v','1','-c:v','png','-f','image2pipe','pipe:1']
    extracted=subprocess.run(args,capture_output=True,check=True,timeout=60,env=ENV).stdout
    image=safe(source['path']).read_bytes();require(extracted==image and sha(image)==source['sha256'],'frame48 extraction does not reproduce the pinned PNG')
    require(source['asset']==digest(['derived-own-ai-video-frame',sha(video),48,sha(image)]),'derived asset identity differs')
    return dict(parentIds=ids,parentReceiptsSha256=digest(rows),parentReservation=str(total),counts=dict(images=images,hailuo=videos),image=image,raw=video,sourceReceipt=vr,sourceAsset=va,ancestorImageReceipt=r,ancestorImageNormalization=conversion,nativeImageGeneration=image_g,nativeVideoGeneration=video_g,frameLineage=frame_lineage,extractionArgs=args,extractionSha256=sha(extracted))


class ParentLocks:
    def __init__(self, p, pins): self.p, self.pins, self.fds = p, pins, []
    def __enter__(self):
        try:
            for parent in self.p['parentLedgers']:
                fd = os.open(safe(Path(parent['state']) / 'engine/runtime.lock'), os.O_RDONLY | os.O_NOFOLLOW); self.fds.append(fd)
                fcntl.flock(fd, fcntl.LOCK_SH | fcntl.LOCK_NB)
            self.proof = prove_parents(self.p, self.pins); return self
        except BaseException: self.release(); raise
    def release(self):
        while self.fds: os.close(self.fds.pop())
    def __exit__(self, *a): self.release()


def state_check(root, p, pins):
    root = safe(root); require(root == Path(p['newState']), 'foreign child state')
    require(json.loads(safe(root / 'plan.json').read_bytes()) == p and json.loads(safe(root / 'pins.json').read_bytes()) == pins, 'child immutable proposal differs')


def reference(p):
    return dict(path='media/'+p['source']['asset']+'.png',sha256=p['source']['sha256'],kind='image',shot='s3',targetShot='s8',
                model='derived-own-ai-video-frame',providerRequestId=p['source']['providerRequestId'],derivationFingerprint=p['source']['asset'],textOnly=False,ancestorTextOnlyImage=True,offlineSimulation=False,
                nonBilledParentReference=True,separatelyPaidImageGeneration=False,parentLedgerSha256=p['parentLedgers'][0]['ledgerSha256'],nativeSourceKind='video',nativeGenerationId=p['source']['nativeGenerationId'],frameIndex=48,nativeFps='24/1')


class SingleEngine(FixedEngine):
    policy = 'single-hailuo-s8-derived-frame-repair'
    def __init__(self, root, transport, *, proposal=None, pins=None):
        self.proposal, self.pins = copy.deepcopy(PLAN if proposal is None else proposal), copy.deepcopy(PINS if pins is None else pins)
        state_check(Path(root).parent, self.proposal, self.pins); require(Path(root) == Path(self.proposal['newState']) / 'engine', 'foreign engine root')
        self._parents = self._proof = None
        super().__init__(root, transport, mode='live')
    def body(self):
        p = self.proposal
        return dict(model=HAILUO, prompt=p['prompt'], firstImage=p['source']['asset'], duration='6', prompt_optimizer=False, enable_safety_checker=True)
    def lineage(self):
        return dict(planSha256=self.pins['planSha256'], parentLedgerHashes=[x['ledgerSha256'] for x in self.proposal['parentLedgers']],
                    parentReceiptsSha256=self._proof['parentReceiptsSha256'], sourceSha256=self.proposal['source']['sha256'], disclosure='CLI prepared repair; derived S3 frame is non-billed, not a new image-generation receipt; not live UI; promotion and motion QA pending')
    @contextmanager
    def lock(self):
        with ParentLocks(self.proposal, self.pins) as parents:
            fd = os.open(self.root / 'runtime.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600); owned = False
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB); owned = True
                self._parents, self._proof = parents, parents.proof
                state_check(self.root.parent, self.proposal, self.pins)
                require(sha(safe(self.root / 'media' / (self.proposal['source']['asset'] + '.png')).read_bytes()) == self.proposal['source']['sha256'], 'copied first-frame bytes changed')
                if self.path.exists(): self.check_child(self.read())
                yield
            finally:
                if owned: self._parents = self._proof = None
                os.close(fd)
    def _body(self, provider, kind, shot, body):
        require((provider,kind,shot)==('fal','video','s8') and body == self.body(), 'only the frozen one-video proposal is permitted')
        return super()._body(provider,kind,shot,body)
    def check_child(self, d):
        require(d['mode']=='live' and d['policy']==self.policy and d['caps']==self.caps and d.get('lineage')==self.lineage(), 'foreign child ledger')
        rows=d['requests']; require(len(rows)<=1 and d['reserved']['openrouter']=='0.00', 'one video only; no OpenRouter')
        require(Decimal(d['reserved']['fal'])==Decimal('.20')*len(rows) and all(Decimal(v)==0 for v in d['categories'].values()), 'no reset/refund or category funding')
        require(Decimal(self._proof['parentReservation'])+Decimal(d['reserved']['fal'])<=Decimal('4') and self._proof['counts']['hailuo']+len(rows)<=15 and self._proof['counts']['images']==24, 'aggregate cap/quota exceeded')
        require(d['assets'].get(self.proposal['source']['asset'])==reference(self.proposal), 'parent reference changed or falsely billed')
        body=self.body(); fp=digest(['fal','video',body])
        expected=dict(asset=self.proposal['source']['asset'],sha256=self.proposal['source']['sha256'],parentRequestId=self.proposal['source']['providerRequestId'])
        outgoing={k:v for k,v in body.items() if k!='firstImage'}
        outgoing['image_url']='data:image/png;base64,'+base64.b64encode(self._proof['image']).decode()
        payload_hash=sha(json.dumps(outgoing,sort_keys=True).encode())
        submitted_hash=sha(json.dumps({k:v for k,v in outgoing.items() if k!='model'},separators=(',',':')).encode())
        require(set(d['assets']) <= {self.proposal['source']['asset'],fp}, 'foreign child asset')
        for r in rows:
            require(r['payloadSha256']==payload_hash, 'submitted first-frame bytes differ')
            if r.get('providerReceipt') and r['state']!='unknown':
                receipt=r['providerReceipt']
                require(receipt['providerRequestId']==r['providerRequestId'] and receipt['model']==HAILUO and receipt['requestPayloadSha256']==submitted_hash and receipt['submitEndpoint']=='https://queue.fal.run/'+HAILUO, 'provider submission receipt differs')
            require((r['provider'],r['kind'],r['shot'],r['model'])==('fal','video','s8',HAILUO) and r['fingerprint']==fp and r['textOnly'] is False and r['offlineSimulation'] is False and r['imageInput']==expected, 'request provenance differs')
            require(r['state'] in ('reserved','done','unknown') and Decimal(r['reservationUsd'])==Decimal('.20'), 'request state/funding differs')
            if r['state']!='unknown': require(not r.get('providerRequestId') or r['providerRequestId'] not in self._proof['parentIds'], 'provider request ID reused from a parent')
        require(len(d.get('funding',[]))==len(rows), 'atomic funding evidence missing')
        if rows:
            require(d['funding'][0]==dict(parentLedgerHashes=self.lineage()['parentLedgerHashes'],parentUniqueRequestCount=35,combinedFalReservation='3.36',combinedImages=24,combinedHailuo=12,newReservation='0.20'), 'funding evidence changed')
    def _reservation(self,d,provider,kind):
        self.check_child(d); require(not d['requests'], 'no second POST, including unknown retries')
        require(Decimal(self._proof['parentReservation'])+Decimal('.20')<=Decimal('4') and self._proof['counts']['hailuo']+1<=15 and self._proof['counts']['images']==24, 'aggregate cap/quota exceeded')
        d['funding'].append(dict(parentLedgerHashes=self.lineage()['parentLedgerHashes'],parentUniqueRequestCount=35,combinedFalReservation='3.36',combinedImages=24,combinedHailuo=12,newReservation='0.20'))
        return Decimal('.20'),Decimal('.20'),None
    def write(self,d):
        previous=self.read() if self.path.exists() else None
        d.setdefault('lineage',self.lineage());d.setdefault('funding',[])
        if previous is None:
            require(not d['requests'] and not d['assets'], 'no imported request or fabricated generation')
            d['assets'][self.proposal['source']['asset']]=reference(self.proposal)
        self.check_child(d)
        if previous is not None:
            require(len(d['requests'])>=len(previous['requests']) and Decimal(d['reserved']['fal'])>=Decimal(previous['reserved']['fal']) and (not previous['halted'] or d['halted']), 'no reset/refund/unhalt')
            require(d['funding'][:len(previous['funding'])]==previous['funding'], 'funding history changed')
            for old,new in zip(previous['requests'],d['requests']):
                require(old['fingerprint']==new['fingerprint'] and (old['state'] not in ('done','unknown') or old==new), 'closed request history changed')
        super().write(d)
        if d['requests'] and d['requests'][-1]['state']=='reserved' and len(d['requests'])>len(previous['requests'] if previous else []):
            self._parents.release()  # Both immutable parent locks end before provider POST/poll.


def exclusive(path,blob):
    safe(path).parent.mkdir(parents=True,exist_ok=True)
    with Path(path).open('xb') as f: f.write(blob);f.flush();os.fsync(f.fileno())


def bootstrap(p=PLAN,pins=PINS):
    with ParentLocks(p,pins) as locked:
        state=safe(p['newState']);state.mkdir(mode=0o700,exist_ok=False)
        exclusive(state/'plan.json',(json.dumps(p,indent=2)+'\n').encode());exclusive(state/'pins.json',(json.dumps(pins,indent=2)+'\n').encode())
        exclusive(state/'engine/media'/(p['source']['asset']+'.png'),locked.proof['image'])
        exclusive(state/'references/source-ai-video.mp4',locked.proof['raw'])
        evidence={k:v for k,v in locked.proof.items() if k not in ('image','raw')}
        exclusive(state/'source-provenance.json',(json.dumps(evidence,indent=2)+'\n').encode())
    return state


def export_result(engine,reused):
    with engine.lock():
        d=engine.read(); require(len(d['requests'])==1 and d['requests'][0]['state']=='done' and not d['halted'],'not a completed repair')
        r=d['requests'][0];a=d['assets'][r['asset']];path=safe(engine.root/a['path']);blob=path.read_bytes()
        require(sha(blob)==r['outputSha256']==a['sha256'],'MP4 bytes changed')
        require(r['providerRequestId']==a['providerRequestId'] and r['providerReceipt']['providerRequestId']==r['providerRequestId'] and r['providerReceipt']['model']==HAILUO,'output receipt differs')
        probe=subprocess.run(['/opt/homebrew/bin/ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)],capture_output=True,check=True,timeout=30,env=ENV)
        subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-xerror','-protocol_whitelist','file,pipe','-i',str(path),'-f','null','-'],check=True,capture_output=True,timeout=60,env=ENV)
        report=dict(status='PASS',reused=reused,disclosure='Prepared backend CLI repair; not live UI; motion/used-window QA and verified promotion pending',
            file=str(path),sha256=sha(blob),providerRequestId=r['providerRequestId'],rawVideoSha256=sha(blob),actualUsd=r['actualUsd'],reservationUsd=r['reservationUsd'],billingEstimateUsd=r.get('billingEstimateUsd'),
            source=engine.proposal['source'],lineage=d['lineage'],funding=d['funding'],ffprobe=json.loads(probe.stdout),fullDecode='PASS')
        target=engine.root.parent/('result-reused.json' if reused else 'result.json')
        if target.exists(): require(json.loads(target.read_bytes())==report, 'existing result evidence differs')
        else: exclusive(target,(json.dumps(report,indent=2)+'\n').encode())
        return report


def main():
    parser=argparse.ArgumentParser(description=__doc__);group=parser.add_mutually_exclusive_group(required=True)
    for flag in ('check','bootstrap','run'):group.add_argument('--'+flag,action='store_true')
    args=parser.parse_args()
    if args.check:
        with ParentLocks(PLAN,PINS) as x: print(json.dumps(dict(status='CHECKED',newPosts=0,sourceSha256=sha(x.proof['image']),parentReceiptCount=len(x.proof['parentIds']),sourceVisualLimitation=PLAN['sourceVisualInspection']['limitation'],readiness='provenance checked; source transition and generated used-window QA pending')));return
    if args.bootstrap: print(bootstrap());return
    # Only explicit --run can reach the existing inherited fal key through reviewed transport.
    engine=SingleEngine(Path(PLAN['newState'])/'engine',ProviderTransport())
    with engine.lock():
        d=engine.read();require(not d['halted'] and all(r['state']=='done' for r in d['requests']),'unknown/reserved request: STOP, GET-only inspection required');reused=bool(d['requests'])
    if not reused: engine.run('fal','video','s8',engine.body())
    print(json.dumps(export_result(engine,reused),indent=2))


if __name__=='__main__': main()

"""Four expressly approved text-only CLI images, one target per invocation; not live UI."""
import argparse
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sys
from contextlib import contextmanager
from decimal import Decimal

HERE=Path(__file__).resolve().parent
B=Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')
PINS_SHA='7bce07ca408c9bdf1e6e8a393f296722bf6b9934027c16879e7631da2fe410c0'
SHOTS=('s8','s11','s12','s15')
SEED='fal-ai/bytedance/seedream/v4.5/text-to-image'
HAILUO='fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video'


def sha(blob):return hashlib.sha256(blob).hexdigest()
def encoded(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def digest(value):return sha(encoded(value))
def require(ok,message):
    if not ok:raise ValueError(message)
def safe(path):
    path=Path(path).absolute();require(all(not p.is_symlink() for p in [path,*path.parents]),'symlink path forbidden');return path


def load():
    raw=(HERE/'pins.json').read_bytes();require(sha(raw)==PINS_SHA,'pins changed');pins=json.loads(raw)
    raw=(HERE/'plan.json').read_bytes();require(sha(raw)==pins['planSha256'],'frozen local plan changed');p=json.loads(raw)
    require(sha(safe(B/'minimal-correction-proposal.json').read_bytes())==pins['approvalSha256'],'approved proposal changed')
    a=p['approval'];scope=a['requestedScopeChanges']
    require(a['status']=='AUTHORIZED_BY_USER_GO' and a['approvalText']=='go','explicit user approval missing')
    require(scope['imageCallMaximum']==28 and scope['maximumCalls']==dict(hailuo=15,veo=12) and scope['dollarCapsUnchanged']==dict(fal=4,openrouter=3),'approved limits differ')
    require(scope['selectedFilmModelMix']==dict(hailuo=11,veo=10),'approved eventual film mix differs')
    require(p['shots']==list(SHOTS) and [x['shot'] for x in a['newTextOnlyImages']]==list(SHOTS) and p['model']==SEED,'only four exact approved images')
    require(p['newMaximumReservation']=='0.16' and p['combinedFalMaximum']=='3.52' and p['combinedImageMaximum']==28,'image funding differs')
    for name,h in pins['sourcePins'].items():require(sha(safe(B/name).read_bytes())==h,'reviewed core changed: '+name)
    return p,pins

PLAN,PINS=load()
sys.path.insert(0,str(B))
from fixed_runtime import FixedEngine
from provider_transport import ProviderTransport
from runtime import Blocked


def prove_parents(p):
    rows=[];fal=Decimal(0)
    require(len(p['parentLedgers'])==4,'all four parents are required')
    for i,parent in enumerate(p['parentLedgers']):
        root=safe(parent['state']);raw=safe(root/'engine/runtime-ledger.json').read_bytes()
        require(sha(raw)==parent['ledgerSha256'],'immutable parent ledger changed')
        d=json.loads(raw)
        require(d['mode']=='live' and d['caps']=={'fal':'4.00','openrouter':'3.00'} and d['halted']==parent['mustRemainHalted'],'parent mode/caps/hold differs')
        if i==0:require(d['halted'] is True and d.get('qualityHolds'),'original QUALITY_HOLD must remain locked')
        require(d['requests']==parent['requests'] and d['reserved']==parent['reserved'] and all(r['state']=='done' for r in d['requests']),'parent receipt/funding differs or unresolved')
        require(parent['frozenFile']==('frozen-plan.json' if i<2 else 'plan.json'),'wrong parent frozen-file contract')
        require(sha(safe(root/parent['frozenFile']).read_bytes())==parent['frozenSha256'],'parent frozen plan changed')
        # Count only this ledger's paid request rows, never nested funding ancestors
        # or non-billed reference assets copied by the V/W repair ledgers.
        rows.extend(d['requests']);fal+=Decimal(d['reserved']['fal'])
        require(Decimal(d['reserved']['openrouter'])==0,'no OpenRouter parent spend is in this batch')
    ids=[r['providerRequestId'] for r in rows]
    require(len(rows)==len(set(ids))==len({r['fingerprint'] for r in rows})==36,'expected 36 unique paid parent requests')
    require(all(r['provider']=='fal' and r['offlineSimulation'] is False and r['kind'] in ('image','video') and r['model']==(SEED if r['kind']=='image' else HAILUO) for r in rows),'foreign parent request')
    images=sum(r['kind']=='image' for r in rows);videos=sum(r['kind']=='video' for r in rows)
    require((images,videos)==(24,12),'current parent quantity differs')
    require(fal==sum(Decimal(r['reservationUsd']) for r in rows)==Decimal('3.36'),'parent reservation differs')
    return dict(parentUniqueIds=ids,parentReceiptsSha256=digest(rows),reservedFal=str(fal),images=images,hailuo=videos)


class ParentLocks:
    def __init__(self,p):self.p,self.fds=p,[]
    def __enter__(self):
        try:
            for parent in self.p['parentLedgers']:
                fd=os.open(safe(Path(parent['state'])/'engine/runtime.lock'),os.O_RDONLY|os.O_NOFOLLOW);self.fds.append(fd)
                fcntl.flock(fd,fcntl.LOCK_SH|fcntl.LOCK_NB)
            self.proof=prove_parents(self.p);return self
        except BaseException:self.release();raise
    def release(self):
        while self.fds:os.close(self.fds.pop())
    def __exit__(self,*a):self.release()


def state_check(state,p,pins):
    state=safe(state);require(state==Path(p['newState']) and all(state!=Path(x['state']) for x in p['parentLedgers']),'foreign child state')
    require(json.loads(safe(state/'plan.json').read_bytes())==p and json.loads(safe(state/'pins.json').read_bytes())==pins,'child immutable plan differs')


class ImageEngine(FixedEngine):
    policy='authorized-minimal-four-text-images'
    def __init__(self,root,transport,*,proposal=None,pins=None):
        self.proposal=copy.deepcopy(PLAN if proposal is None else proposal);self.pins=copy.deepcopy(PINS if pins is None else pins)
        state_check(Path(root).parent,self.proposal,self.pins);require(Path(root)==Path(self.proposal['newState'])/'engine','foreign engine root')
        self._parents=self._proof=None
        super().__init__(root,transport,mode='live')
    def body(self,shot):
        require(shot in SHOTS,'unapproved image target')
        prompt=next(x['prompt'] for x in self.proposal['approval']['newTextOnlyImages'] if x['shot']==shot)
        return dict(model=SEED,prompt=prompt,num_images=1,max_images=1,image_size='portrait_16_9',enable_safety_checker=True)
    def lineage(self):
        return dict(approvalSha256=self.pins['approvalSha256'],planSha256=self.pins['planSha256'],parentLedgerHashes=[x['ledgerSha256'] for x in self.proposal['parentLedgers']],parentReceiptCount=36,parentReceiptsSha256=self._proof['parentReceiptsSha256'],disclosure='Prepared backend CLI text-only images, not live UI; visual QA and verified promotion pending')
    @contextmanager
    def lock(self):
        with ParentLocks(self.proposal) as parents:
            fd=os.open(self.root/'runtime.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600);owned=False
            try:
                fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB);owned=True
                self._parents,self._proof=parents,parents.proof
                state_check(self.root.parent,self.proposal,self.pins)
                if self.path.exists():self.check_child(self.read())
                yield
            finally:
                if owned:self._parents=self._proof=None
                os.close(fd)
    def _body(self,provider,kind,shot,body):
        require((provider,kind)==('fal','image') and shot in SHOTS and body==self.body(shot),'only exact approved text-only image payloads')
        return super()._body(provider,kind,shot,body)
    def check_child(self,d):
        require(d['mode']=='live' and d['policy']==self.policy and d['caps']==self.caps and d.get('lineage')==self.lineage(),'foreign child ledger')
        rows=d['requests'];require(len(rows)<=4 and len({r['shot'] for r in rows})==len(rows) and len({r['fingerprint'] for r in rows})==len(rows),'image quota or duplicate target')
        require(Decimal(d['reserved']['fal'])==Decimal('.04')*len(rows)<=Decimal('.16') and Decimal(d['reserved']['openrouter'])==0 and all(Decimal(v)==0 for v in d['categories'].values()),'image funding differs')
        require(Decimal(self._proof['reservedFal'])+Decimal(d['reserved']['fal'])<=Decimal('4') and self._proof['images']+len(rows)<=28 and self._proof['hailuo']<=15,'combined cap/quota exceeded')
        fps=[];new_ids=[]
        for r in rows:
            require(r['shot'] in SHOTS and (r['provider'],r['kind'],r['model'])==('fal','image',SEED),'foreign request kind/provider/model/shot')
            body=self.body(r['shot']);fp=digest(['fal','image',body]);fps.append(fp)
            require(r['fingerprint']==fp and r['payloadSha256']==sha(json.dumps(body,sort_keys=True).encode()) and r['imageInput'] is None and r['textOnly'] is True and r['offlineSimulation'] is False,'not the approved pure-text payload')
            require(r['state'] in ('reserved','done','unknown') and Decimal(r['reservationUsd'])==Decimal('.04'),'request state/price differs')
            if r.get('providerRequestId') and r['state']!='unknown':
                require(r['providerRequestId'] not in self._proof['parentUniqueIds'] and r['providerRequestId'] not in new_ids,'duplicate provider request ID');new_ids.append(r['providerRequestId'])
            if r['state']=='done':require(isinstance(r.get('providerReceipt'),dict) and r.get('asset')==fp and fp in d['assets'],'completed image lacks provider receipt/asset')
            if r.get('providerReceipt') and r['state']!='unknown':
                receipt=r['providerReceipt'];payload={k:v for k,v in body.items() if k!='model'}
                require(receipt['providerRequestId']==r['providerRequestId'] and receipt['model']==SEED and receipt['submitEndpoint']=='https://queue.fal.run/'+SEED and receipt['requestPayloadSha256']==sha(json.dumps(payload,separators=(',',':')).encode()),'provider receipt differs')
        require(set(d['assets'])<=set(fps),'foreign/copied image assets forbidden')
        require(len(d.get('funding',[]))==len(rows),'missing atomic funding evidence')
        for i,event in enumerate(d['funding'],1):
            require(event==dict(sequence=i,parentLedgerHashes=self.lineage()['parentLedgerHashes'],parentUniqueRequestCount=36,combinedFalReservation=str(Decimal('3.36')+Decimal('.04')*i),combinedImages=24+i,combinedHailuo=12,newReserved=str(Decimal('.04')*i)),'funding history differs')
    def _reservation(self,d,provider,kind):
        self.check_child(d);require(all(r['state']=='done' for r in d['requests']) and len(d['requests'])<4,'unknown/pending or four-image cap: do not retry')
        total=Decimal(d['reserved']['fal'])+Decimal('.04');n=len(d['requests'])+1
        require(Decimal(self._proof['reservedFal'])+total<=Decimal('4') and total<=Decimal('.16') and self._proof['images']+n<=28,'combined approved image allowance exceeded')
        d['funding'].append(dict(sequence=n,parentLedgerHashes=self.lineage()['parentLedgerHashes'],parentUniqueRequestCount=36,combinedFalReservation=str(Decimal('3.36')+total),combinedImages=24+n,combinedHailuo=12,newReserved=str(total)))
        return Decimal('.04'),total,None
    def write(self,d):
        previous=self.read() if self.path.exists() else None
        d.setdefault('lineage',self.lineage());d.setdefault('funding',[]);self.check_child(d)
        if previous is not None:
            require(len(d['requests'])>=len(previous['requests']) and Decimal(d['reserved']['fal'])>=Decimal(previous['reserved']['fal']) and (not previous['halted'] or d['halted']),'no reset/refund/unhalt')
            require(d['funding'][:len(previous['funding'])]==previous['funding'],'funding is append-only')
            for old,new in zip(previous['requests'],d['requests']):require(old['fingerprint']==new['fingerprint'] and (old['state'] not in ('done','unknown') or old==new),'closed request history changed')
        super().write(d)
        if d['requests'] and d['requests'][-1]['state']=='reserved' and len(d['requests'])>len(previous['requests'] if previous else []):self._parents.release()


def exclusive(path,blob):
    path=safe(path);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('xb') as f:f.write(blob);f.flush();os.fsync(f.fileno())


def bootstrap(p=PLAN,pins=PINS):
    with ParentLocks(p):
        state=safe(p['newState']);state.mkdir(mode=0o700,exist_ok=False)
        exclusive(state/'plan.json',(json.dumps(p,indent=2)+'\n').encode());exclusive(state/'pins.json',(json.dumps(pins,indent=2)+'\n').encode())
    return state


def export_image(engine,shot,reused):
    with engine.lock():
        d=engine.read();r=next((r for r in d['requests'] if r['shot']==shot),None)
        require(r is not None and r['state']=='done' and not d['halted'],'not a completed approved image')
        fp=r['fingerprint'];a=d['assets'].get(fp);require(a is not None,'missing output asset')
        require(r['asset']==a['requestFingerprint']==fp and a['kind']=='image' and a['model']==SEED and a['shot']==shot and a['textOnly'] is True and a['offlineSimulation'] is False,'asset identity differs')
        require(a['providerRequestId']==r['providerRequestId'] and a['path']=='media/'+fp+'.png','asset request/path differs')
        file=safe(engine.root/a['path']);blob=file.read_bytes();require(sha(blob)==a['sha256']==r['outputSha256'],'PNG bytes changed')
        n=r['normalization'];require(a['normalization']==n and n['providerRequestId']==r['providerRequestId'] and n['outputSha256']==sha(blob) and n['rawPath']=='provider-originals/'+fp+'.bin','normalization lineage differs')
        raw=safe(engine.root/n['rawPath']).read_bytes();require(sha(raw)==n['rawSha256'],'raw provider bytes changed')
        engine._valid_media('image',blob)
        report=dict(status='PASS',shot=shot,reused=reused,disclosure='Prepared CLI image, not live UI; visual QA pending, not promoted',file=str(file),sha256=sha(blob),rawSha256=sha(raw),providerRequestId=r['providerRequestId'],actualUsd=r['actualUsd'],reservationUsd=r['reservationUsd'],billingEstimateUsd=r.get('billingEstimateUsd'),textOnly=True,imageInputs=[],payload=engine.body(shot),payloadSha256=r['payloadSha256'],normalization=n,lineage=d['lineage'],funding=d['funding'][:next(i+1 for i,x in enumerate(d['requests']) if x['shot']==shot)],visualQA='pending',promotion='not promoted')
        target=engine.root.parent/'results'/(shot+('-reused' if reused else '')+'.json')
        if target.exists():require(json.loads(target.read_bytes())==report,'existing result evidence differs')
        else:exclusive(target,(json.dumps(report,indent=2)+'\n').encode())
        return report


def main():
    parser=argparse.ArgumentParser(description=__doc__);g=parser.add_mutually_exclusive_group(required=True)
    g.add_argument('--check',action='store_true');g.add_argument('--bootstrap',action='store_true');g.add_argument('--run',choices=SHOTS,metavar='SHOT');args=parser.parse_args()
    if args.check:
        with ParentLocks(PLAN) as p:print(json.dumps(dict(status='CHECKED',newPosts=0,parentUniqueRequests=len(p.proof['parentUniqueIds']),parentImages=p.proof['images'],parentHailuo=p.proof['hailuo'],parentFalReservation=p.proof['reservedFal'],newImagesMaximum=4,newReservationMaximum='0.16',combinedImagesMaximum=28,combinedFalMaximum='3.52')))
        return
    if args.bootstrap:print(bootstrap());return
    # ProviderTransport reads only the normally inherited fal key when a new run is actually submitted.
    engine=ImageEngine(Path(PLAN['newState'])/'engine',ProviderTransport())
    with engine.lock():
        d=engine.read();require(not d['halted'] and all(r['state']=='done' for r in d['requests']),'unknown/pending image: STOP, GET-only inspection required')
        reused=any(r['shot']==args.run for r in d['requests'])
    if not reused:engine.run('fal','image',args.run,engine.body(args.run))
    print(json.dumps(export_image(engine,args.run,reused),indent=2))


if __name__=='__main__':main()

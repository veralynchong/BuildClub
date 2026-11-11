"""Prepared CLI s2 repair only. One Hailuo POST, durable receipt, GET polling; never live UI."""
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
PINS_SHA = '5f936a286415928d24e0a0e7260337a4ad6bd9b624c68c6fe8c51af846fc7794'
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
    require(sha(raw) == pins['planSha256'] == sha(safe(B / 's2-video-repair-plan.json').read_bytes()), 'root frozen proposal changed')
    p = json.loads(raw)
    require((p['targetShot'], p['provider'], p['model'], p['duration']) == ('s2', 'fal', HAILUO, '6'), 'not the one authorized s2 video')
    require(p['originalCapsUsd'] == dict(fal=4, openrouter=3) and p['originalQuantityCaps'] == dict(falImages=24, hailuo=15, veo=12), 'original authorization differs')
    require(p['currentCombinedCounts'] == dict(falImages=24, hailuo=10, veo=0), 'current quantities differ')
    require(p['newReservationCapUsd'] == .20 and p['combinedFalReservationMaximumUsd'] == 3.16 and p['prompt_optimizer'] is False and p['enable_safety_checker'] is True, 'fixed settings differ')
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
        require(sha(safe(root / 'frozen-plan.json').read_bytes()) == parent['frozenPlanSha256'], 'parent frozen plan changed')
        rows += d['requests']; ledgers.append(d)
    ids = [r['providerRequestId'] for r in rows]
    require(len(rows) == len(set(ids)) == 34, 'parent request IDs must be 34 unique paid receipts')
    require(all(r['provider'] == 'fal' and r['offlineSimulation'] is False and r['model'] == (SEED if r['kind'] == 'image' else HAILUO) for r in rows), 'foreign provider/model provenance')
    images = sum(r['kind'] == 'image' for r in rows); videos = sum(r['kind'] == 'video' for r in rows)
    require((images, videos) == (24, 10), 'combined parent quantities differ')
    total = sum(Decimal(d['reserved']['fal']) for d in ledgers)
    require(total == sum(Decimal(r['reservationUsd']) for r in rows) == Decimal('2.96') and all(Decimal(d['reserved']['openrouter']) == 0 for d in ledgers), 'combined parent funding differs')
    source = p['source']; require(source['state'] == p['parentLedgers'][1]['state'], 'source must be this repair pilot')
    root = safe(source['state']); parent = ledgers[1]
    r = next((r for r in parent['requests'] if r['asset'] == source['asset']), None); a = parent['assets'].get(source['asset'])
    require(r is not None and a is not None, 'source is not a verified parent asset')
    require(r['kind'] == a['kind'] == 'image' and r['shot'] == a['shot'] == 's2' and r['model'] == a['model'] == SEED and r['textOnly'] is a['textOnly'] is True and r['imageInput'] is None, 'source is not same-shot text-only Seedream')
    require(r['offlineSimulation'] is a['offlineSimulation'] is False and source['offlineSimulation'] is False and source['imageInput'] is None and source['textOnly'] is True, 'old/offline/image-derived source forbidden')
    require(r['providerRequestId'] == a['providerRequestId'] == source['providerRequestId'] == r['providerReceipt']['providerRequestId'] and r['providerReceipt']['model'] == SEED, 'source request identity differs')
    require(a['requestFingerprint'] == r['fingerprint'] == r['asset'] == source['asset'], 'source asset identity differs')
    require(source['path'] == str(root / 'engine/media' / (source['asset'] + '.png')) and a['path'] == 'media/' + source['asset'] + '.png', 'source path differs')
    image = safe(source['path']).read_bytes(); require(sha(image) == source['sha256'] == r['outputSha256'] == a['sha256'], 'source PNG bytes differ')
    norm = r['normalization']; require(a['normalization'] == norm and norm['providerRequestId'] == r['providerRequestId'] and norm['outputSha256'] == source['sha256'], 'raw normalization provenance differs')
    require(norm['rawPath'] == 'provider-originals/' + source['asset'] + '.bin', 'foreign raw path')
    raw = safe(root / 'engine' / norm['rawPath']).read_bytes(); require(sha(raw) == norm['rawSha256'], 'raw provider bytes differ')
    normalized, conversion = normalize_image(raw); require(normalized == image and conversion['rawSha256'] == norm['rawSha256'] and conversion['operation'] == norm['operation'], 'raw-to-PNG lineage cannot be reproduced')
    frozen = json.loads(safe(root / 'frozen-plan.json').read_bytes()); f = next(t for t in frozen['shots'] if t['shotId'] == 's2')
    with closing(sqlite3.connect('file:' + str(safe(root / 'data.db')) + '?mode=ro', uri=True)) as conn:
        conn.row_factory = sqlite3.Row
        g = conn.execute('SELECT * FROM generations WHERE id=?', (source['nativeGenerationId'],)).fetchone()
        b = conn.execute('SELECT * FROM batch_bindings WHERE gid=?', (source['nativeGenerationId'],)).fetchone()
        require(g is not None and b is not None, 'no native source generation/binding')
        g, b = dict(g), dict(b)
        require(digest(g) == pins['generationsSha256'] and digest(b) == pins['batch_bindingsSha256'], 'native source identity changed')
        canvas = conn.execute('SELECT doc FROM canvases WHERE idea_id=?', (g['idea_id'],)).fetchone()
        require(canvas is not None and any(n['id'] == g['node_id'] and n['shotId'] == 's2' and n['data'].get('selected') == g['id'] for n in json.loads(canvas['doc'])['nodes']), 'source must remain natively selected')
    inputs = json.loads(g['inputs']); require(g['status'] == 'done' and g['kind'] == b['kind'] == 'image' and g['model'] == b['model'] == 'seedream-4.5' and g['source_url'] is None, 'not a generated native image')
    require(inputs['prompt'] == inputs.get('sentPrompt', inputs['prompt']) == f['imagePrompt'] and inputs.get('startFrame') is None and f['imageInputs'] == [] and all(not inputs.get(k) for k in ('references','reference','kit','kitStamp','kitRefs','kitImages')), 'source inputs were not pure text')
    body = dict(model=SEED, prompt=f['imagePrompt'], num_images=1, max_images=1, image_size='portrait_16_9', enable_safety_checker=True)
    require(b['gid'] == g['id'] and b['node_id'] == g['node_id'] and b['shot'] == 's2' and b['asset'] == g['provider_request_id'] == source['asset'] and b['outputHash'] == source['sha256'], 'native asset binding differs')
    require(b['scope'] == digest([frozen, str(root / 'engine'), str(root / 'media')]) and b['identityHash'] == digest([g['idea_id'], g['node_id'], 'image', 'seedream-4.5', inputs, 's2']), 'source identity/scope hash differs')
    require(b['inputHash'] == digest(body) and r['fingerprint'] == digest(['fal','image',body]), 'source prompt fingerprint differs')
    require(g['file'] == g['id'] + '.png' and sha(safe(root / 'media' / g['idea_id'] / 'gen' / g['file']).read_bytes()) == source['sha256'], 'native source bytes differ')
    return dict(parentIds=ids, parentReceiptsSha256=digest(rows), parentReservation=str(total), counts=dict(images=images,hailuo=videos), image=image, raw=raw, sourceReceipt=r, sourceAsset=a, nativeGeneration=g, nativeBinding=b, normalization=conversion)


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
    return dict(path='media/' + p['source']['asset'] + '.png', sha256=p['source']['sha256'], kind='image', shot='s2', model=SEED,
                providerRequestId=p['source']['providerRequestId'], requestFingerprint=p['source']['asset'], textOnly=True, offlineSimulation=False,
                nonBilledParentReference=True, parentLedgerSha256=p['parentLedgers'][1]['ledgerSha256'], nativeGenerationId=p['source']['nativeGenerationId'])


class SingleEngine(FixedEngine):
    policy = 'single-hailuo-s2-prepared-repair'
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
                    parentReceiptsSha256=self._proof['parentReceiptsSha256'], sourceSha256=self.proposal['source']['sha256'], disclosure='CLI prepared repair; copied parent image is non-billed; not live UI; promotion and motion QA pending')
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
        require((provider,kind,shot)==('fal','video','s2') and body == self.body(), 'only the frozen one-video proposal is permitted')
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
            require((r['provider'],r['kind'],r['shot'],r['model'])==('fal','video','s2',HAILUO) and r['fingerprint']==fp and r['textOnly'] is False and r['offlineSimulation'] is False and r['imageInput']==expected, 'request provenance differs')
            require(r['state'] in ('reserved','done','unknown') and Decimal(r['reservationUsd'])==Decimal('.20'), 'request state/funding differs')
            if r['state']!='unknown': require(not r.get('providerRequestId') or r['providerRequestId'] not in self._proof['parentIds'], 'provider request ID reused from a parent')
        require(len(d.get('funding',[]))==len(rows), 'atomic funding evidence missing')
        if rows:
            require(d['funding'][0]==dict(parentLedgerHashes=self.lineage()['parentLedgerHashes'],parentUniqueRequestCount=34,combinedFalReservation='3.16',combinedImages=24,combinedHailuo=11,newReservation='0.20'), 'funding evidence changed')
    def _reservation(self,d,provider,kind):
        self.check_child(d); require(not d['requests'], 'no second POST, including unknown retries')
        require(Decimal(self._proof['parentReservation'])+Decimal('.20')<=Decimal('4') and self._proof['counts']['hailuo']+1<=15 and self._proof['counts']['images']==24, 'aggregate cap/quota exceeded')
        d['funding'].append(dict(parentLedgerHashes=self.lineage()['parentLedgerHashes'],parentUniqueRequestCount=34,combinedFalReservation='3.16',combinedImages=24,combinedHailuo=11,newReservation='0.20'))
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
        exclusive(state/'references/provider-original.bin',locked.proof['raw'])
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
        with ParentLocks(PLAN,PINS) as x: print(json.dumps(dict(status='CHECKED',newPosts=0,sourceSha256=sha(x.proof['image']),parentReceiptCount=len(x.proof['parentIds']))));return
    if args.bootstrap: print(bootstrap());return
    # Only explicit --run can reach the existing inherited fal key through reviewed transport.
    engine=SingleEngine(Path(PLAN['newState'])/'engine',ProviderTransport())
    with engine.lock():
        d=engine.read();require(not d['halted'] and all(r['state']=='done' for r in d['requests']),'unknown/reserved request: STOP, GET-only inspection required');reused=bool(d['requests'])
    if not reused: engine.run('fal','video','s2',engine.body())
    print(json.dumps(export_result(engine,reused),indent=2))


if __name__=='__main__': main()

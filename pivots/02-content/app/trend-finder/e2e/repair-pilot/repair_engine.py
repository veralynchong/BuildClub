"""Three text-only repairs, funded atomically against an immutable QUALITY_HOLD parent."""
import copy
import fcntl
import hashlib
import json
import os
from contextlib import contextmanager
from decimal import Decimal
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
B = Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')
MANIFEST_SHA = '45f701de5023c504bc4ac0fc68c45e5b2334847d3bc59ce1a08c9f30af098b86'
SHOTS = ('s2', 's13', 's16')
SEED = 'fal-ai/bytedance/seedream/v4.5/text-to-image'


def sha(blob):
    return hashlib.sha256(blob).hexdigest()


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def safe(path):
    path = Path(path).absolute()
    require(all(not p.is_symlink() for p in [path, *path.parents]), 'symlink path forbidden')
    return path


def manifest():
    raw = (HERE / 'manifest.json').read_bytes()
    require(sha(raw) == MANIFEST_SHA, 'repair manifest changed')
    m = json.loads(raw)
    require(m['caps'] == dict(fal='4.00', openrouter='3.00', total='7.00', combinedImages=24, repairImages=3, repairReservation='0.12'), 'authorization differs')
    require(m['repairShots'] == list(SHOTS), 'only the three repair shots are authorized')
    for name, digest in m['sourcePins'].items():
        require(sha(safe(B / name).read_bytes()) == digest, 'reviewed source changed: ' + name)
    require(sha(safe(B / 'repair-pilot-plan.json').read_bytes()) == m['rootRepairPlanSha256'], 'root-frozen repair prompts changed')
    require(sha((HERE / 'repair-plan.json').read_bytes()) == m['repairPlanSha256'], 'repair plan changed')
    return m


# Reviewed provider/core imports only; none performs a provider request at import time.
_TRUSTED = manifest()
sys.path.insert(0, str(B))
from fixed_runtime import FixedEngine
from runtime import Blocked


def check_base(m):
    base = safe(Path(m['baseState']))
    raw = safe(base / 'engine/runtime-ledger.json').read_bytes()
    require(sha(raw) == m['baseLedgerSha256'], 'original ledger changed; do not fund a repair')
    ledger = json.loads(raw)
    require(ledger['mode'] == 'live' and ledger['policy'] == 'seedream-fal4-openrouter3' and ledger['halted'] is True, 'original batch must remain QUALITY_HOLD')
    require(ledger.get('qualityHolds') and ledger['qualityHolds'][-1]['newPosts'] == 0, 'missing original quality hold')
    require(ledger['caps'] == {'fal': '4.00', 'openrouter': '3.00'}, 'original caps differ')
    require(ledger['requests'] == m['baseRequests'] and len(ledger['requests']) == 31 and all(r['state'] == 'done' for r in ledger['requests']), 'original receipts differ or remain unresolved')
    require(sum(r['kind'] == 'image' for r in ledger['requests']) == 21 and sum(r['kind'] == 'video' for r in ledger['requests']) == 10, 'original quota differs')
    require(ledger['reserved'] == m['baseReserved'] == {'fal': '2.84', 'openrouter': '0.00'}, 'original funding differs')
    require(sha(safe(base / 'frozen-plan.json').read_bytes()) == m['baseFrozenSha256'], 'original frozen plan changed')
    return ledger


class BaseHold:
    def __init__(self, m):
        self.m, self.fd = m, None
    def __enter__(self):
        path = safe(Path(self.m['baseState']) / 'engine/runtime.lock')
        self.fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            fcntl.flock(self.fd, fcntl.LOCK_SH | fcntl.LOCK_NB)
            self.ledger = check_base(self.m)
            return self
        except BaseException:
            self.release(); raise
    def release(self):
        if self.fd is not None:
            os.close(self.fd); self.fd = None
    def __exit__(self, *args):
        self.release()


def check_state(state, m):
    state = safe(state)
    require(state == Path(m['repairState']) and state != Path(m['baseState']), 'foreign repair state')
    require(json.loads(safe(state / 'repair-manifest.json').read_bytes()) == m, 'state manifest differs')
    raw = safe(state / 'frozen-plan.json').read_bytes()
    require(sha(raw) == m['repairPlanSha256'], 'frozen repair plan differs')
    return json.loads(raw)


def lineage(m):
    return dict(baseState=m['baseState'], baseLedgerSha256=m['baseLedgerSha256'],
                baseRequestCount=31, baseReceiptsSha256=sha(encoded(m['baseRequests'])),
                baseReserved=m['baseReserved'], repairPlanSha256=m['repairPlanSha256'],
                promotion='NOT promoted; explicit verified lineage and visual QA required')


class RepairEngine(FixedEngine):
    policy = 'seedream-repair-pilot-3'
    def __init__(self, root, transport, mode='live', *, approved=None):
        self.approved = copy.deepcopy(_TRUSTED if approved is None else approved)
        self.repair_plan = check_state(Path(root).parent, self.approved)
        require(Path(root) == Path(self.approved['repairState']) / 'engine', 'foreign engine root')
        self._hold = self._base = None
        super().__init__(root, transport, mode)

    @contextmanager
    def lock(self):
        # Always parent shared -> repair exclusive; never wait holding the parent lock.
        with BaseHold(self.approved) as parent:
            fd = os.open(self.root / 'runtime.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
            owned = False
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                owned = True
                self._hold, self._base = parent, parent.ledger
                check_state(self.root.parent, self.approved)
                if self.path.exists():
                    self.check_own(self.read())
                yield
            finally:
                if owned:
                    self._hold = self._base = None
                os.close(fd)

    def check_own(self, data):
        require(data['mode'] == self.mode and data['policy'] == self.policy and data['caps'] == self.caps, 'foreign repair ledger')
        require(data.get('repairLineage') == lineage(self.approved), 'repair parent lineage differs')
        rows = data['requests']
        require(len(rows) <= 3 and len({r['shot'] for r in rows}) == len(rows), 'repair quota/duplicate shot')
        require(len({r['fingerprint'] for r in rows}) == len(rows), 'duplicate payload')
        for r in rows:
            require(r['provider'] == 'fal' and r['kind'] == 'image' and r['model'] == SEED and r['shot'] in SHOTS, 'repair is image-only for three shots')
            require(r['state'] in ('reserved', 'done', 'unknown') and r['imageInput'] is None and r['textOnly'] is True and r['offlineSimulation'] == (self.mode == 'offline'), 'untrusted repair provenance')
            body = self.body(r['shot'])
            require(r['fingerprint'] == sha(encoded(['fal', 'image', body])) and r['payloadSha256'] == sha(json.dumps(body, sort_keys=True).encode()), 'repair prompt/input differs')
            require(Decimal(r['reservationUsd']) == Decimal('.04'), 'repair reservation differs')
        total = Decimal(data['reserved']['fal'])
        require(total == Decimal('.04') * len(rows) and total <= Decimal('.12'), 'repair funding differs')
        require(Decimal(data['reserved']['openrouter']) == 0 and all(Decimal(x) == 0 for x in data['categories'].values()), 'no OpenRouter/video funding allowed')
        require(Decimal(self._base['reserved']['fal']) + total <= Decimal('4') and Decimal(self._base['reserved']['openrouter']) == 0, 'combined original caps exceeded')
        require(21 + len(rows) <= 24, 'combined 21+3 image quota exceeded')
        require(len(data.get('funding', [])) == len(rows), 'missing atomic funding record')
        for i, event in enumerate(data['funding'], 1):
            require(event == dict(sequence=i, baseLedgerSha256=self.approved['baseLedgerSha256'], parentReceiptCount=31,
                combinedImageCount=21 + i, combinedFalReservation=str(Decimal('2.84') + Decimal('.04') * i),
                repairReservation=str(Decimal('.04') * i)), 'funding lineage changed')

    def body(self, shot):
        f = next(s for s in self.repair_plan['shots'] if s['shotId'] == shot)
        return dict(model=SEED, prompt=f['imagePrompt'], num_images=1, max_images=1, image_size='portrait_16_9', enable_safety_checker=True)

    def _body(self, provider, kind, shot, body):
        require((provider, kind) == ('fal', 'image') and shot in SHOTS and body == self.body(shot), 'only exact text-only repair prompts are enabled')
        return super()._body(provider, kind, shot, body)

    def _reservation(self, data, provider, kind):
        self.check_own(data)
        require(all(r['state'] == 'done' for r in data['requests']), 'unresolved repair: never resubmit')
        require(len(data['requests']) < 3, 'three repair image cap')
        total = Decimal(data['reserved']['fal']) + Decimal('.04')
        require(Decimal(self._base['reserved']['fal']) + total <= Decimal('4') and total <= Decimal('.12') and 21 + len(data['requests']) + 1 <= 24, 'combined cap/quota exceeded')
        data['funding'].append(dict(sequence=len(data['requests']) + 1, baseLedgerSha256=self.approved['baseLedgerSha256'],
            parentReceiptCount=31, combinedImageCount=21 + len(data['requests']) + 1,
            combinedFalReservation=str(Decimal(self._base['reserved']['fal']) + total), repairReservation=str(total)))
        return Decimal('.04'), total, None

    def write(self, data):
        data.setdefault('repairLineage', lineage(self.approved)); data.setdefault('funding', [])
        previous = self.read() if self.path.exists() else None
        self.check_own(data)
        if previous is not None:
            require(len(data['requests']) >= len(previous['requests']) and Decimal(data['reserved']['fal']) >= Decimal(previous['reserved']['fal']), 'no reset/refund')
            require(not previous['halted'] or data['halted'], 'never automatically unhalt a repair')
            require(data['funding'][:len(previous['funding'])] == previous['funding'], 'funding history is append-only')
            for old, new in zip(previous['requests'], data['requests']):
                require(old['fingerprint'] == new['fingerprint'], 'request history changed')
                if old['state'] in ('done', 'unknown'):
                    require(old == new, 'closed request history is immutable')
        super().write(data)
        if data['requests'] and data['requests'][-1]['state'] == 'reserved' and (previous is None or len(data['requests']) > len(previous['requests'])):
            # Reservation+funding event are one atomic ledger write. Do not hold the
            # parent shared lock across the provider POST/poll/media conversion.
            self._hold.release()

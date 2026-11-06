"""Exact generation-context bridge to the fresh batch FixedEngine (stdlib only)."""
import copy
import hashlib
import json
import os
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path

SEED = 'fal-ai/bytedance/seedream/v4.5/text-to-image'
HAILUO = 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video'
VEO = 'google/veo-3.1-lite'


def _encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def _hash(blob):
    return hashlib.sha256(blob).hexdigest()


def _require(ok, message):
    if not ok:
        raise ValueError(message)


def _bytes(root, relative):
    """Reject traversal and every symlink component before opening without following links."""
    root = Path(root).absolute()
    relative = Path(relative)
    _require(not relative.is_absolute() and relative.parts and
             all(p not in ('.', '..') for p in relative.parts), 'unsafe media path')
    path = root / relative
    part = path
    while True:
        _require(not part.is_symlink(), 'media symlink')
        if part == root:
            break
        part = part.parent
    _require(path.resolve().is_relative_to(root.resolve()), 'media outside root')
    directory = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for component in relative.parts[:-1]:
            child = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
            os.close(directory)
            directory = child
        fd = os.open(relative.parts[-1], os.O_RDONLY | os.O_NOFOLLOW, dir_fd=directory)
        with os.fdopen(fd, 'rb') as stream:
            return stream.read()
    finally:
        os.close(directory)


class BindingAdapter:
    def __init__(self, db, media, engine, plan, idea_id, gp):
        self.db, self.media, self.engine, self.idea_id, self.gp = db, Path(media).absolute(), engine, idea_id, gp
        _require(isinstance(idea_id, str) and idea_id and not idea_id.startswith('.') and
                 Path(idea_id).name == idea_id, 'unsafe idea id')
        self._plan = copy.deepcopy(plan)
        self._shots = {s['shotId']: s for s in self._plan['shots']}
        _require(len(self._plan['shots']) == len(self._shots) == 21 and
                 set(self._shots) == {'s' + str(i) for i in range(1, 22)}, 'expected 21 unique shots')
        for i in range(1, 22):
            s = self._shots['s' + str(i)]
            _require(s['imageProvider'] == 'fal' and s['imageModel'] == SEED and
                     s.get('imageInputs') == [] and
                     s['videoProvider'] == ('fal' if i <= 12 else 'openrouter') and
                     s['videoModel'] == (HAILUO if i <= 12 else VEO) and
                     type(s['duration']) is int and s['duration'] == (6 if i <= 12 else 4),
                     'plan differs from approved provider allocation')
        self._scope = _hash(_encoded([self._plan, str(Path(engine.root).resolve()), str(self.media)]))
        self._gid = ContextVar('fresh_generation', default=None)
        with self._connection() as conn:
            conn.execute('CREATE TABLE IF NOT EXISTS batch_bindings ('
                         'gid TEXT PRIMARY KEY, idea_id TEXT NOT NULL, node_id TEXT NOT NULL, '
                         'shot TEXT NOT NULL, asset TEXT, model TEXT NOT NULL, kind TEXT NOT NULL, '
                         'inputHash TEXT NOT NULL, outputHash TEXT, identityHash TEXT NOT NULL, '
                         'scope TEXT NOT NULL)')

    @contextmanager
    def _connection(self):
        conn = self.db()
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    @contextmanager
    def for_generation(self, gen_id):
        _require(isinstance(gen_id, str) and bool(gen_id), 'missing generation id')
        token = self._gid.set(gen_id)
        try:
            yield self
        finally:
            self._gid.reset(token)

    def _generation(self, conn, gid):
        cursor = conn.execute('SELECT id, idea_id, node_id, inputs, model, kind, status, file, source_url '
                              'FROM generations WHERE id=?', (gid,))
        row = cursor.fetchone()
        _require(row is not None, 'unknown generation')
        return dict(zip((d[0] for d in cursor.description), row))

    def _binding(self, conn, gid):
        cursor = conn.execute('SELECT * FROM batch_bindings WHERE gid=?', (gid,))
        row = cursor.fetchone()
        return dict(zip((d[0] for d in cursor.description), row)) if row else None

    def _validate(self, conn, job):
        gid = self._gid.get()
        _require(gid is not None, 'generation context required')
        row = self._generation(conn, gid)
        _require(row['idea_id'] == self.idea_id and row['status'] == 'running', 'wrong idea or status')
        result = conn.execute('SELECT doc FROM canvases WHERE idea_id=?', (self.idea_id,)).fetchone()
        _require(result is not None, 'missing canvas')
        nodes = [n for n in json.loads(result[0])['nodes'] if n.get('id') == row['node_id']]
        _require(len(nodes) == 1, 'missing or duplicate canvas node')
        node = nodes[0]
        shot = node.get('shotId')
        _require(shot in self._shots, 'unknown shot')
        s, kind = self._shots[shot], row['kind']
        _require(kind in ('image', 'video') and node.get('type') ==
                 ('storyboard' if kind == 'image' else 'video'), 'wrong node type')
        expected_id = 'seedream-4.5' if kind == 'image' else (
            'hailuo-2.3-fast' if s['videoProvider'] == 'fal' else 'veo-lite-openrouter')
        model = job.model
        _require(row['model'] == expected_id == model.get('id') and model.get('kind') == kind and
                 model.get('provider') == s[kind + 'Provider'] and
                 model.get('endpoint') == s[kind + 'Model'], 'model contract mismatch')
        raw = json.loads(row['inputs'])
        prompt = s[kind + 'Prompt']
        _require(isinstance(prompt, str) and prompt and job.prompt == prompt == raw.get('prompt') and
                 raw.get('sentPrompt', prompt) == prompt, 'prompt differs from plan')
        _require(not job.references and not any(raw.get(k) for k in
                 ('references', 'reference', 'kit', 'kitStamp', 'kitRefs', 'kitImages')), 'references forbidden')
        _require(type(job.count) is int and job.count == 1 and type(raw.get('count', 1)) is int and
                 raw.get('count', 1) == 1 and job.aspectRatio == raw.get('aspectRatio', '9:16') == '9:16',
                 'count or aspect mismatch')
        duration = None if kind == 'image' else s['duration']
        _require(job.duration == raw.get('duration') == duration and
                 (duration is None or (type(job.duration) is int and type(raw.get('duration')) is int)),
                 'duration mismatch')
        if kind == 'image':
            _require(raw.get('startFrame') is None and job.start is None, 'images must be text only')
        else:
            _require(isinstance(raw.get('startFrame'), str) and raw['startFrame'], 'missing source generation')
        identity = _hash(_encoded([row['idea_id'], row['node_id'], kind, row['model'], raw, shot]))
        return row, raw, shot, s, identity

    def _receipt(self, binding):
        _require(binding['scope'] == self._scope and binding['asset'], 'unresolved or foreign binding')
        with self.engine.lock():
            ledger = self.engine.read()
            asset = ledger['assets'].get(binding['asset'])
            rows = [r for r in ledger['requests'] if r.get('asset') == binding['asset']]
            _require(asset and len(rows) == 1, 'missing engine receipt')
            receipt = rows[0]
            kind, shot = binding['kind'], binding['shot']
            endpoint = self._shots[shot][kind + 'Model']
            for r in (asset, receipt):
                _require(r.get('kind') == kind and r.get('shot') == shot and r.get('model') == endpoint,
                         'receipt identity differs')
            _require(receipt.get('state') == 'done' and receipt.get('provider') == self._shots[shot][kind + 'Provider'] and
                     receipt.get('fingerprint') == binding['asset'] == asset.get('requestFingerprint') and
                     receipt.get('providerRequestId') and receipt['providerRequestId'] == asset.get('providerRequestId'),
                     'unconfirmed engine receipt')
            _require(kind != 'image' or (asset.get('textOnly') is True and receipt.get('textOnly') is True and
                     receipt.get('imageInput') is None), 'non text-only image')
            _require(Path(asset['path']).parent == Path('media'), 'unexpected engine output path')
            blob = _bytes(self.engine.root, asset['path'])
            digest = _hash(blob)
            _require(digest == asset['sha256'] == receipt['outputSha256'] and
                     (binding['outputHash'] is None or digest == binding['outputHash']), 'output bytes changed')
            return blob, digest, receipt

    def _source(self, conn, raw, shot, job, resume=False):
        gid = raw['startFrame']
        source = self._generation(conn, gid)
        binding = self._binding(conn, gid)
        _require(binding and binding['idea_id'] == self.idea_id and binding['shot'] == shot and
                 binding['kind'] == 'image' and binding['outputHash'] and source['idea_id'] == self.idea_id and
                 source['kind'] == 'image' and source['model'] == binding['model'] and
                 source['node_id'] == binding['node_id'] and source['status'] == 'done' and
                 source['file'] and not source['source_url'], 'unverified source generation')
        source_raw = json.loads(source['inputs'])
        identity = _hash(_encoded([source['idea_id'], source['node_id'], source['kind'], source['model'], source_raw, shot]))
        _require(identity == binding['identityHash'], 'source generation changed')
        _require(Path(source['file']).name == source['file'], 'unsafe app filename')
        relative = Path(self.idea_id) / 'gen' / source['file']
        path = self.media / relative
        _require((resume and job.start is None) or (job.start is not None and Path(job.start).absolute() == path),
                 'job start does not match source')
        blob, digest, _ = self._receipt(binding)
        _require(_hash(_bytes(self.media, relative)) == digest and blob, 'app source bytes changed')
        return binding['asset']

    def submit(self, job):
        existing = None
        try:
            with self._connection() as conn:
                conn.execute('BEGIN IMMEDIATE')
                existing = self._binding(conn, self._gid.get())
                row, raw, shot, s, identity = self._validate(conn, job)
                if existing:
                    if existing['identityHash'] != identity or existing['scope'] != self._scope or not existing['asset']:
                        raise self.gp.ResultLost('previous submission unresolved or changed')
                    try:
                        self._receipt(existing)
                    except Exception as exc:
                        raise self.gp.ResultLost('previous result unavailable; do not retry') from exc
                    return existing['asset']
                kind = row['kind']
                body = dict(model=s[kind + 'Model'], prompt=s[kind + 'Prompt'])
                if kind == 'image':
                    body.update(num_images=1, max_images=1, image_size='portrait_16_9', enable_safety_checker=True)
                else:
                    body['firstImage'] = self._source(conn, raw, shot, job)
                    if s['videoProvider'] == 'fal':
                        body.update(duration='6', prompt_optimizer=False, enable_safety_checker=True)
                    else:
                        body.update(duration=4, resolution='1080p', aspect_ratio='9:16', generate_audio=False)
                fingerprint = _hash(_encoded([s[kind + 'Provider'], kind, body]))
                # Commit the intent before calling the engine: a crash must never cause a second POST.
                conn.execute('INSERT INTO batch_bindings VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?)',
                             (row['id'], self.idea_id, row['node_id'], shot, row['model'], kind,
                              _hash(_encoded(body)), identity, self._scope))
        except self.gp.ResultLost:
            raise
        except (ValueError, OSError, KeyError, TypeError) as exc:
            # GenJobs is already in phase=submit here. Only a fresh intent-free
            # validation failure proves that this generation has never been sent.
            if existing:
                raise self.gp.ResultLost('previous submission unresolved or changed') from exc
            raise self.gp.ProviderError('Fresh batch input rejected before submission.') from exc
        try:
            asset = self.engine.run(s[kind + 'Provider'], kind, shot, body)
            _require(asset == fingerprint, 'engine asset fingerprint differs')
            with self._connection() as conn:
                binding = self._binding(conn, row['id'])
                binding['asset'] = asset
                _, digest, _ = self._receipt(binding)
                conn.execute('UPDATE batch_bindings SET asset=?, outputHash=? WHERE gid=?', (asset, digest, row['id']))
            return asset
        except Exception as exc:
            raise self.gp.ResultLost('submission may have charged; do not retry') from exc

    def poll(self, job, asset_id):
        try:
            with self._connection() as conn:
                row, raw, shot, _, identity = self._validate(conn, job)
                binding = self._binding(conn, row['id'])
                _require(binding and binding['identityHash'] == identity and binding['asset'] == asset_id,
                         'poll binding mismatch')
                source = self._source(conn, raw, shot, job, resume=True) if row['kind'] == 'video' else None
                blob, _, receipt = self._receipt(binding)
                if source:
                    _require((receipt.get('imageInput') or {}).get('asset') == source, 'receipt source differs')
                return self.gp.Poll('done', data=blob, ext='png' if row['kind'] == 'image' else 'mp4',
                                    actual_usd=receipt.get('actualUsd'))
        except Exception as exc:
            raise self.gp.ResultLost('bound result unavailable; do not resubmit') from exc

"""Standalone offline contract tests; no app imports, credentials or network."""
import ast
import copy
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from contextlib import nullcontext
from types import SimpleNamespace

from fresh_canvas_binding import BindingAdapter

SEED = 'fal-ai/bytedance/seedream/v4.5/text-to-image'
HAILUO = 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video'
VEO = 'google/veo-3.1-lite'

class Refused(Exception):
    pass

class Lost(Exception):
    pass

class Engine:
    def __init__(self, root):
        self.root = root
        (root / 'media').mkdir()
        self.calls = []
        self.data = {'requests': [], 'assets': {}}
        self.unknown = False

    def lock(self):
        return nullcontext()

    def read(self):
        return copy.deepcopy(self.data)

    def run(self, provider, kind, shot, body):
        self.calls.append((provider, kind, shot, body))
        if self.unknown:
            raise ValueError('unconfirmed provider result')
        asset = hashlib.sha256(json.dumps([provider, kind, body], sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        blob = b'fake PNG' if kind == 'image' else b'fake MP4'
        digest = hashlib.sha256(blob).hexdigest()
        path = 'media/' + asset + ('.png' if kind == 'image' else '.mp4')
        (self.root / path).write_bytes(blob)
        row = dict(kind=kind, shot=shot, model=body['model'], provider=provider,
                   providerRequestId='receipt-' + asset, fingerprint=asset,
                   state='done', asset=asset, outputSha256=digest, actualUsd=None,
                   billingEstimateUsd=.04, textOnly=kind == 'image')
        row['imageInput'] = None if kind == 'image' else {'asset': body['firstImage']}
        self.data['requests'].append(row)
        self.data['assets'][asset] = dict(path=path, sha256=digest, kind=kind, shot=shot,
            model=body['model'], requestFingerprint=asset, providerRequestId=row['providerRequestId'], textOnly=kind == 'image')
        return asset

class Connection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()

class BindingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.media = self.root / 'app'
        (self.media / 'idea' / 'gen').mkdir(parents=True)
        self.dbpath = self.root / 'test.db'
        self.engine = Engine(self.root)
        self.plan = {'shots': [dict(shotId='s' + str(i), imageProvider='fal', imageModel=SEED,
            imageInputs=[], imagePrompt='image ' + str(i), videoPrompt='video ' + str(i),
            videoProvider='fal' if i <= 12 else 'openrouter',
            videoModel=HAILUO if i <= 12 else VEO, duration=6 if i <= 12 else 4) for i in range(1, 22)]}
        self.gp = SimpleNamespace(ProviderError=Refused, ResultLost=Lost, Poll=lambda state, **kw: SimpleNamespace(state=state, **kw))
        with self.db() as c:
            c.execute('CREATE TABLE generations (id TEXT PRIMARY KEY, idea_id, node_id, inputs, model, kind, status, file, source_url)')
            c.execute('ALTER TABLE generations ADD COLUMN est_usd REAL DEFAULT 0.04')
            c.execute('ALTER TABLE generations ADD COLUMN provider_request_id TEXT')
            c.execute('CREATE TABLE canvases (idea_id TEXT PRIMARY KEY, doc)')
            nodes = [dict(id=k + str(i), shotId='s' + str(i), type='storyboard' if k == 'i' else 'video') for i in range(1, 22) for k in ('i', 'v')]
            c.execute('INSERT INTO canvases VALUES (?, ?)', ('idea', json.dumps({'nodes': nodes})))
        self.adapter = self.new_adapter()

    def db(self):
        return sqlite3.connect(self.dbpath, factory=Connection)

    def new_adapter(self):
        return BindingAdapter(self.db, self.media, self.engine, self.plan, 'idea', self.gp)

    def generation(self, gid='g', shot=1, kind='image', start=None):
        s = self.plan['shots'][shot - 1]
        model = dict(id='seedream-4.5' if kind == 'image' else ('hailuo-2.3-fast' if shot <= 12 else 'veo-lite-openrouter'),
                     kind=kind, provider=s[kind + 'Provider'], endpoint=s[kind + 'Model'])
        raw = dict(prompt=s[kind + 'Prompt'], sentPrompt=s[kind + 'Prompt'], references=[],
                   startFrame=start, duration=None if kind == 'image' else s['duration'], count=1, aspectRatio='9:16')
        with self.db() as c:
            c.execute('INSERT INTO generations (id, idea_id, node_id, inputs, model, kind, status, file, source_url) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)',
                (gid, 'idea', ('i' if kind == 'image' else 'v') + str(shot), json.dumps(raw), model['id'], kind, 'running'))
        return SimpleNamespace(model=model, prompt=raw['prompt'], start=None, references=[],
            duration=raw['duration'], count=1, aspectRatio='9:16', resolution=None)

    def raw_update(self, gid='g', **updates):
        with self.db() as c:
            raw = json.loads(c.execute('SELECT inputs FROM generations WHERE id=?', (gid,)).fetchone()[0])
            raw.update(updates)
            c.execute('UPDATE generations SET inputs=? WHERE id=?', (json.dumps(raw), gid))

    def saved_image(self, gid='image', shot=1):
        job = self.generation(gid, shot)
        with self.adapter.for_generation(gid):
            asset = self.adapter.submit(job)
            result = self.adapter.poll(job, asset)
        path = self.media / 'idea' / 'gen' / (gid + '.png')
        path.write_bytes(result.data)
        with self.db() as c:
            c.execute("UPDATE generations SET status='done', file=? WHERE id=?", (path.name, gid))
        return path

    def run_actual_genjobs(self, gid, template):
        # Execute the repository's actual run method, including its phase/exception
        # branches, with only its I/O collaborators replaced by local test doubles.
        source = Path(__file__).resolve().parents[1] / 'pivots/02-content/app/trend-finder/backend/generations.py'
        tree = ast.parse(source.read_text())
        cls = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == 'GenJobs')
        method = next(n for n in cls.body if isinstance(n, ast.FunctionDef) and n.name == 'run')
        gp = SimpleNamespace(**vars(self.gp))
        gp.FileUnusable = type('FileUnusable', (Exception,), {})
        gp.Job = lambda model, prompt, start, references, duration, **kw: SimpleNamespace(
            model=model, prompt=prompt, start=start, references=references, duration=duration, **kw)
        gp.adapter_for = lambda provider: self.adapter
        namespace = dict(gen_providers=gp, cutting=SimpleNamespace(CutError=type('CutError', (Exception,), {})),
                         load_models=lambda: [template.model], json=json, SUBMITTING='submitting',
                         gen_folder=lambda media, idea: media / idea / 'gen', LOST='lost',
                         FAILED='failed', FILE_LOST='file lost')
        exec(compile(ast.Module(body=[method], type_ignores=[]), str(source), 'exec'), namespace)
        outcomes = []
        def set_request(gid, request):
            with self.db() as c:
                c.execute('UPDATE generations SET provider_request_id=? WHERE id=?', (request, gid))
        harness = SimpleNamespace(_db=self.db, _media=lambda: self.media,
            _ref_paths=lambda *args: template.references, _input_path=lambda *args: template.start,
            _set_request_id=set_request, _poll=lambda adapter, job, asset, *args: adapter.poll(job, asset),
            _fail=lambda gid, kind, est, error, refund: outcomes.append(('failed', refund)),
            _finish=lambda gid, status, **kw: outcomes.append((status, False)))
        with self.db() as c:
            c.execute("UPDATE generations SET status='queued', provider_request_id=NULL WHERE id=?", (gid,))
        with self.adapter.for_generation(gid):
            namespace['run'](harness, gid)
        return outcomes

    def test_actual_genjobs_known_presubmit_failure_refunds(self):
        path = self.saved_image()
        for case in ('prompt', 'references', 'kit', 'source_bytes'):
            with self.subTest(case=case):
                video = case == 'source_bytes'
                job = self.generation(case, kind='video' if video else 'image', start='image' if video else None)
                if case == 'prompt':
                    self.raw_update(case, prompt='unapproved prompt')
                elif case == 'references':
                    self.raw_update(case, references=[{'source': 'gen', 'genId': 'old'}])
                elif case == 'kit':
                    self.raw_update(case, kitStamp={'brand': 1})
                else:
                    job.start = path
                    path.write_bytes(b'old source bytes')
                before = len(self.engine.calls)
                self.assertEqual(self.run_actual_genjobs(case, job), [('failed', True)])
                self.assertEqual(len(self.engine.calls), before)
                with self.db() as c:
                    self.assertEqual(c.execute('SELECT count(*) FROM batch_bindings WHERE gid=?', (case,)).fetchone()[0], 0)

    def test_presubmit_error_type_and_unresolved_intent_stays_lost(self):
        job = self.generation('bad')
        self.raw_update('bad', prompt='unapproved')
        with self.adapter.for_generation('bad'), self.assertRaises(Refused):
            self.adapter.submit(job)
        self.assertEqual(self.engine.calls, [])
        unknown = self.generation('unknown')
        self.engine.unknown = True
        self.assertEqual(self.run_actual_genjobs('unknown', unknown), [('unknown', False)])
        self.assertEqual(len(self.engine.calls), 1)
        self.raw_update('unknown', prompt='changed after unresolved intent')
        self.adapter = self.new_adapter()
        with self.adapter.for_generation('unknown'), self.assertRaises(Lost):
            self.adapter.submit(unknown)
        self.assertEqual(self.run_actual_genjobs('unknown', unknown), [('unknown', False)])
        self.assertEqual(len(self.engine.calls), 1)

    def test_image_video_restart_and_unknown_cost(self):
        path = self.saved_image()
        for shot in (1, 12, 13, 21):
            source = 'image' if shot == 1 else 'image' + str(shot)
            if shot != 1:
                path = self.saved_image(source, shot)
            gid = 'video' + str(shot)
            job = self.generation(gid, shot, 'video', source)
            job.start = path
            with self.adapter.for_generation(gid):
                asset = self.adapter.submit(job)
                self.assertIsNone(self.adapter.poll(job, asset).actual_usd)
            adapter = self.new_adapter()
            job.start = None  # GenJobs resumes with no start path
            before = len(self.engine.calls)
            with adapter.for_generation(gid):
                self.assertEqual(adapter.poll(job, asset).data, b'fake MP4')
                self.assertEqual(adapter.submit(job), asset)
            self.assertEqual(len(self.engine.calls), before)
        self.assertEqual(self.engine.calls[0][3], dict(model=SEED, prompt='image 1', image_size='portrait_16_9', num_images=1, max_images=1, enable_safety_checker=True))

    def test_rejected_inputs_never_call_engine(self):
        changes = ['idea', 'node', 'shot', 'model', 'kind', 'status', 'prompt', 'sent', 'provider', 'endpoint', 'refs', 'kit', 'start', 'count', 'aspect', 'duration']
        for change in changes:
            with self.subTest(change=change):
                job = self.generation(change)
                with self.db() as c:
                    columns = {'idea': ('idea_id', 'other'), 'node': ('node_id', 'missing'), 'model': ('model', 'upload'), 'kind': ('kind', 'video'), 'status': ('status', 'done')}
                    if change in columns:
                        col, value = columns[change]
                        c.execute('UPDATE generations SET ' + col + '=? WHERE id=?', (value, change))
                    if change == 'shot':
                        c.execute('UPDATE generations SET node_id=? WHERE id=?', ('i2', change))
                raw = {'prompt': {'prompt': 'old'}, 'sent': {'sentPrompt': 'prefix'}, 'refs': {'references': [{'source': 'gen'}]}, 'kit': {'kit': ['x']}, 'start': {'startFrame': 'old'}, 'count': {'count': 2}, 'aspect': {'aspectRatio': '1:1'}, 'duration': {'duration': 4}}
                if change in raw:
                    self.raw_update(change, **raw[change])
                if change in ('provider', 'endpoint'):
                    job.model[change] = 'wrong'
                with self.adapter.for_generation(change), self.assertRaises(Refused):
                    self.adapter.submit(job)
        self.assertEqual(self.engine.calls, [])

    def test_missing_context_and_job_mismatches(self):
        job = self.generation()
        with self.assertRaises(Refused):
            self.adapter.submit(job)
        for attr, value in [('prompt', 'changed'), ('references', [Path('old')]), ('start', Path('old')), ('count', True), ('aspectRatio', '1:1'), ('duration', 6)]:
            bad = copy.deepcopy(job)
            setattr(bad, attr, value)
            with self.adapter.for_generation('g'), self.assertRaises(Refused):
                self.adapter.submit(bad)
        self.assertEqual(self.engine.calls, [])

    def test_reject_unbound_import_cross_shot_and_overwrite(self):
        path = self.saved_image()
        for case in ('unbound', 'import', 'cross', 'overwrite', 'symlink', 'escape'):
            with self.subTest(case=case):
                source = 'image'
                if case == 'unbound':
                    self.generation('upload')
                    source = 'upload'
                if case == 'import':
                    with self.db() as c:
                        c.execute("UPDATE generations SET source_url='oldframe' WHERE id='image'")
                job = self.generation(case, 2 if case == 'cross' else 1, 'video', source)
                job.start = path
                original = path.read_bytes()
                if case == 'overwrite':
                    path.write_bytes(b'old frame')
                if case == 'symlink':
                    path.unlink()
                    path.symlink_to(self.root / 'media' / next(iter(self.engine.data['assets'].values()))['path'].split('/')[-1])
                if case == 'escape':
                    with self.db() as c:
                        c.execute("UPDATE generations SET file='../image.png' WHERE id='image'")
                before = len(self.engine.calls)
                with self.adapter.for_generation(case), self.assertRaises(Refused):
                    self.adapter.submit(job)
                self.assertEqual(len(self.engine.calls), before)
                if path.is_symlink():
                    path.unlink()
                path.write_bytes(original)
                with self.db() as c:
                    c.execute("UPDATE generations SET source_url=NULL, file='image.png' WHERE id='image'")

    def test_wrong_video_allocation_and_frozen_plan(self):
        job = self.generation(kind='video')
        self.plan['shots'][0]['videoProvider'] = 'openrouter'
        job.model.update(id='veo-lite-openrouter', provider='openrouter', endpoint=VEO)
        with self.adapter.for_generation('g'), self.assertRaises(Refused):
            self.adapter.submit(job)
        bad = copy.deepcopy(self.plan)
        with self.assertRaises(ValueError):
            BindingAdapter(self.db, self.media, self.engine, bad, 'idea', self.gp)
        self.assertEqual(self.engine.calls, [])

    def test_unknown_never_resubmits(self):
        job = self.generation()
        self.engine.unknown = True
        with self.adapter.for_generation('g'), self.assertRaises(Lost):
            self.adapter.submit(job)
        adapter = self.new_adapter()
        with adapter.for_generation('g'), self.assertRaises(Lost):
            adapter.submit(job)
        self.assertEqual(len(self.engine.calls), 1)

    def test_pending_receipt_and_context_restore(self):
        job = self.generation()
        with self.adapter.for_generation('g'):
            asset = self.adapter.submit(job)
            with self.adapter.for_generation('missing'), self.assertRaises(Refused):
                self.adapter.submit(job)
            self.assertEqual(self.adapter.poll(job, asset).state, 'done')
        self.engine.data['requests'][0]['state'] = 'pending'
        adapter = self.new_adapter()
        with adapter.for_generation('g'):
            with self.assertRaises(Lost):
                adapter.poll(job, asset)
            with self.assertRaises(Lost):
                adapter.submit(job)
        self.assertEqual(len(self.engine.calls), 1)

    def test_actual_cost_and_receipt_identity(self):
        job = self.generation()
        with self.adapter.for_generation('g'):
            asset = self.adapter.submit(job)
            self.engine.data['requests'][0]['actualUsd'] = .031
            self.assertEqual(self.adapter.poll(job, asset).actual_usd, .031)
            self.engine.data['requests'][0]['providerRequestId'] = 'forged'
            with self.assertRaises(Lost):
                self.adapter.poll(job, asset)
        self.assertEqual(len(self.engine.calls), 1)

    def test_plan_deepcopy_and_raw_kit_stamp(self):
        job = self.generation()
        self.plan['shots'][0]['imagePrompt'] = 'changed after construction'
        with self.adapter.for_generation('g'):
            self.assertTrue(self.adapter.submit(job))
        other = self.generation('kit')
        self.raw_update('kit', kitStamp={'brand': 1})
        with self.adapter.for_generation('kit'), self.assertRaises(Refused):
            self.adapter.submit(other)
        self.assertEqual(len(self.engine.calls), 1)

    def test_video_duration_and_job_start_rejected(self):
        path = self.saved_image()
        for case in ('duration', 'path', 'refs'):
            job = self.generation(case, 1, 'video', 'image')
            job.start = path
            if case == 'duration':
                job.duration = 4
                self.raw_update(case, duration=4)
            elif case == 'path':
                job.start = self.root / 'old.png'
            else:
                job.references = [path]
            before = len(self.engine.calls)
            with self.adapter.for_generation(case), self.assertRaises(Refused):
                self.adapter.submit(job)
            self.assertEqual(len(self.engine.calls), before)

    def test_poll_requires_matching_context_and_ledger_bytes(self):
        job = self.generation()
        with self.adapter.for_generation('g'):
            asset = self.adapter.submit(job)
        self.generation('other')
        with self.adapter.for_generation('other'), self.assertRaises(Lost):
            self.adapter.poll(job, asset)
        record = self.engine.data['assets'][asset]
        (self.root / record['path']).write_bytes(b'changed')
        with self.adapter.for_generation('g'), self.assertRaises(Lost):
            self.adapter.poll(job, asset)

if __name__ == '__main__':
    unittest.main(verbosity=2)

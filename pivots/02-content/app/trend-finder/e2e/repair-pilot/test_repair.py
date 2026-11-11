"""Fake-only tests; all mutable state is temporary, no credentials/network/browser."""
import base64
import copy
import fcntl
import json
import os
from pathlib import Path
import tempfile
import unittest
from repair_engine import RepairEngine, Blocked, SHOTS, HERE, manifest, sha, encoded
from serve_repair import skeleton, native_gate, build, IDEA

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWioAAAAASUVORK5CYII=')


class Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name).resolve()
        self.base, self.state = root / 'base', root / 'repair'
        (self.base / 'engine').mkdir(parents=True); self.state.mkdir()
        self.m = copy.deepcopy(manifest())
        self.m.update(baseState=str(self.base), repairState=str(self.state))
        old = dict(mode='live', policy='seedream-fal4-openrouter3', caps={'fal': '4.00', 'openrouter': '3.00'},
                   reserved={'fal': '2.84', 'openrouter': '0.00'}, requests=self.m['baseRequests'], halted=True,
                   qualityHolds=[dict(newPosts=0, reason='fixture visual QA')])
        self.base_bytes = (json.dumps(old, indent=2) + '\n').encode()
        (self.base / 'engine/runtime-ledger.json').write_bytes(self.base_bytes)
        (self.base / 'engine/runtime.lock').write_bytes(b'')
        (self.base / 'frozen-plan.json').write_bytes(b'fixture-original-frozen')
        self.m.update(baseLedgerSha256=sha(self.base_bytes), baseFrozenSha256=sha(b'fixture-original-frozen'))
        (self.state / 'repair-manifest.json').write_text(json.dumps(self.m))
        (self.state / 'frozen-plan.json').write_bytes((HERE / 'repair-plan.json').read_bytes())
        self.calls, self.fail = [], False
        def fake(kind, body, first):
            self.assertEqual(kind, 'image'); self.assertIsNone(first)
            # Parent shared lock must have ended after atomic funding, before transport.
            fd = os.open(self.base / 'engine/runtime.lock', os.O_RDONLY)
            try: fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            finally: os.close(fd)
            with self.assertRaises(BlockingIOError):
                with self.e.lock(): pass
            self.assertIsNotNone(self.e._base, 'busy status contender must not clear active funding context')
            self.calls.append(copy.deepcopy(body))
            if self.fail: raise TimeoutError('fake unknown')
            return dict(providerRequestId='fake-repair-' + str(len(self.calls)), data=PNG, actualUsd=None, billingEstimateUsd=.04)
        self.e = RepairEngine(self.state / 'engine', fake, mode='offline', approved=self.m)

    def tearDown(self):
        self.assertEqual((self.base / 'engine/runtime-ledger.json').read_bytes(), self.base_bytes)
        self.temp.cleanup()

    def run_shot(self, shot):
        return self.e.run('fal', 'image', shot, self.e.body(shot))

    def test_three_repairs_atomic_combined_funding_and_raw_provenance(self):
        for shot in SHOTS:
            asset = self.run_shot(shot); d = self.e.read(); r = d['requests'][-1]
            self.assertEqual(r['asset'], asset); self.assertEqual(r['actualUsd'], None)
            self.assertEqual(d['assets'][asset]['sha256'], sha(PNG))
            self.assertEqual((self.state / 'engine' / r['normalization']['rawPath']).read_bytes(), PNG)
            self.assertEqual(d['repairLineage']['baseLedgerSha256'], self.m['baseLedgerSha256'])
        self.assertEqual(len(self.calls), 3)
        d = self.e.read(); self.assertEqual(d['reserved'], {'fal': '0.12', 'openrouter': '0.00'})
        self.assertEqual(d['funding'][-1]['combinedFalReservation'], '2.96')
        self.assertEqual(d['funding'][-1]['combinedImageCount'], 24)
        with self.e.lock(), self.assertRaises(ValueError): self.e._reservation(d, 'fal', 'image')

    def test_no_or_video_other_shot_prompt_variation_or_image_sources(self):
        body = self.e.body('s2')
        for provider, kind, shot, altered in [('openrouter', 'image', 's2', body), ('fal', 'video', 's2', body),
            ('fal', 'image', 's1', body), ('fal', 'image', 's2', {**body, 'prompt': 'wrong'}),
            ('fal', 'image', 's2', {**body, 'image_url': 'old-source'}),
            ('fal', 'image', 's2', {**body, 'num_images': 2})]:
            with self.assertRaises(ValueError): self.e.run(provider, kind, shot, altered)
        self.assertEqual(self.calls, []); self.assertEqual(self.e.read()['requests'], [])

    def test_duplicate_unknown_never_retries_or_refunds(self):
        self.run_shot('s2')
        with self.assertRaises(Blocked): self.run_shot('s2')
        self.fail = True
        with self.assertRaises(Blocked): self.run_shot('s13')
        d = self.e.read(); self.assertTrue(d['halted']); self.assertEqual(d['requests'][-1]['state'], 'unknown')
        self.assertEqual(d['reserved']['fal'], '0.08')
        with self.assertRaises(Blocked): self.run_shot('s16')
        self.assertEqual(len(self.calls), 2)
        with self.assertRaises(ValueError): native_gate(self.state, self.e)

    def test_combined_budget_is_enforced_before_transport(self):
        with self.e.lock():
            self.e._base['reserved']['fal'] = '3.99'
            with self.assertRaises(ValueError): self.e._reservation(self.e.read(), 'fal', 'image')
        self.assertEqual(self.calls, [])

    def test_parent_activity_and_hash_mismatch_fail_closed(self):
        fd = os.open(self.base / 'engine/runtime.lock', os.O_RDONLY)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError): self.run_shot('s2')
        finally: os.close(fd)
        changed = self.base_bytes + b' '
        (self.base / 'engine/runtime-ledger.json').write_bytes(changed)
        try:
            with self.assertRaises(ValueError): self.run_shot('s2')
        finally: (self.base / 'engine/runtime-ledger.json').write_bytes(self.base_bytes)
        self.assertEqual(self.calls, [])

    def test_foreign_or_altered_state_and_reset_are_rejected(self):
        with self.assertRaises((ValueError, FileNotFoundError)):
            RepairEngine(self.base / 'engine', lambda *a: None, mode='offline', approved=self.m)
        self.run_shot('s2')
        with self.e.lock():
            d = self.e.read(); d['requests'] = []; d['reserved']['fal'] = '0.00'; d['funding'] = []
            with self.assertRaises(ValueError): self.e.write(d)
        frozen = self.state / 'frozen-plan.json'; original = frozen.read_bytes(); frozen.write_bytes(b'{}')
        try:
            with self.assertRaises(ValueError): self.run_shot('s13')
        finally: frozen.write_bytes(original)
        self.assertEqual(len(self.calls), 1)

    def test_offline_real_app_build_has_own_native_21_shot_case_and_three_slots(self):
        import sqlite3
        from contextlib import closing
        app, fresh = build(self.e)
        self.assertFalse(app.state.generation_enabled)
        self.assertEqual(fresh.IDEA, IDEA)
        self.assertEqual([m['id'] for m in fresh.catalog()], ['seedream-4.5'])
        with closing(sqlite3.connect(self.state / 'data.db')) as conn:
            doc = json.loads(conn.execute('SELECT doc FROM canvases WHERE idea_id=?', (IDEA,)).fetchone()[0])
            self.assertEqual(len(doc['nodes']), 24)
            self.assertEqual(conn.execute('SELECT count(*) FROM generations').fetchone()[0], 0)
            self.assertEqual(conn.execute('SELECT count(*) FROM batch_bindings').fetchone()[0], 0)
        self.assertEqual(self.calls, [])

    def test_original_authorization_and_21_shot_three_slot_skeleton(self):
        m = manifest(); self.assertEqual(m['caps']['fal'], '4.00'); self.assertEqual(m['caps']['combinedImages'], 24)
        plan = json.loads((HERE / 'repair-plan.json').read_bytes()); doc = skeleton(plan)
        self.assertEqual(len([n for n in doc['nodes'] if n['type'] == 'shot']), 21)
        self.assertEqual([n['shotId'] for n in doc['nodes'] if n['type'] == 'storyboard'], list(SHOTS))
        self.assertEqual(len(doc['edges']), 3); self.assertEqual(plan['timelineFrames'], 315)
        self.assertEqual([r['prompt'] for r in m['retakeImages']], [next(f['imagePrompt'] for f in plan['shots'] if f['shotId'] == shot) for shot in SHOTS])


if __name__ == '__main__':
    unittest.main(verbosity=2)

"""Offline acceptance tests: no inherited keys, provider calls, services, or browsers."""
import base64
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch

os.environ.clear()
os.environ.update(PATH='/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin', HOME='/tmp',
                  BUILDCLUB_OFFLINE_VERIFY='1', PYTHONDONTWRITEBYTECODE='1')
from serve_fresh import APP, BATCH, BRIDGE, IDEA, build_app, check_ports, main
for p in (APP / 'backend', BATCH, BRIDGE):
    sys.path.insert(0, str(p))
from fastapi.testclient import TestClient
from fixed_runtime import FixedEngine
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWioAAAAASUVORK5CYII=')


class FakeTransport:
    def __init__(self):
        self.calls = []

    def __call__(self, kind, body, first):
        self.calls.append((kind, body, first))
        return {'providerRequestId': 'synthetic-' + str(len(self.calls)), 'data': PNG, 'actualUsd': .04}


class FreshServerTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop('FAL_KEY', None)
        os.environ.pop('OPENROUTER_API_KEY', None)
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.transport = FakeTransport()
        self.engine = FixedEngine(self.root / 'engine', self.transport)
        # Fakes are injected, and every socket connection is denied during the app test.
        self.network = patch.object(socket.socket, 'connect', side_effect=AssertionError('network forbidden'))
        self.network.start()
        self.app = build_app(self.root / 'state', 'offline', self.engine)
        self.server = self.app.state.server
        self.client = TestClient(self.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.network.stop()
        self.temp.cleanup()

    def login(self):
        response = self.client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'pw-for-e2e'})
        self.assertEqual(response.status_code, 200, response.text)

    def test_seed_auth_and_no_imported_images(self):
        self.assertEqual(self.client.get('/api/ideas').status_code, 401)
        self.login()
        idea = self.client.get('/api/ideas').json()[0]
        self.assertEqual(idea['id'], IDEA)
        self.assertEqual([s['id'] for s in idea['shots']], ['s' + str(i) for i in range(1, 22)])
        for shot in idea['shots']:
            self.assertTrue(isinstance(shot['line'], str))
            for field in ('frameImage', 'palette', 'footage'):
                self.assertNotIn(field, shot)
        self.assertIn('not human approval', idea['notes'])
        canvas = self.client.get(f'/api/ideas/{IDEA}/canvas').json()
        self.assertEqual(canvas['generations'], [])
        self.assertFalse(list(self.server.MEDIA_DIR.rglob('*')))
        frozen = json.loads((self.root / 'state/frozen-plan.json').read_text())
        self.assertNotIn('status', frozen)
        self.assertEqual(len(frozen['shots']), 21)
        self.assertEqual(self.transport.calls, [])

    def test_locks_helpers_catalog_and_status(self):
        self.login()
        self.assertEqual(self.client.post(f'/api/ideas/{IDEA}/gen', json={}).status_code, 403)
        for path in ('/api/analyze', '/api/channel', '/api/compare', '/api/answer', '/api/agent',
                     '/api/script', '/api/board', '/api/ideas/other/gen', f'/api/ideas/{IDEA}/edit/voice/tts'):
            self.assertEqual(self.client.post(path, json={}).status_code, 403, path)
        self.assertEqual(self.client.get('/api/search?q=tofu').status_code, 403)
        models = self.client.get('/api/gen/models').json()['models']
        self.assertEqual({m['id'] for m in models}, {'seedream-4.5', 'hailuo-2.3-fast', 'veo-lite-openrouter'})
        self.assertTrue(all(m['available'] is False for m in models))
        import generations
        self.assertEqual(generations.validate_models(models), [])
        status = self.client.get('/api/batch/status')
        self.assertEqual(status.status_code, 200)
        self.assertEqual(status.json()['keys'], {'fal': False, 'openrouter': False})
        self.assertNotIn('Authorization', status.text)
        self.assertEqual(status.json()['approvedCaps']['total'], 7)
        self.assertEqual(self.transport.calls, [])

    def test_share_review_and_production_read_routes(self):
        self.assertEqual(self.client.post('/api/share', json={'clientId': 'evergreen-fresh-ai'}).status_code, 401)
        self.login()
        self.assertEqual(self.client.get('/api/production').status_code, 200)
        response = self.client.post('/api/share', json={'clientId': 'evergreen-fresh-ai'})
        self.assertEqual(response.status_code, 200, response.text)
        token = response.json()['token']
        with TestClient(self.app) as anonymous:
            self.assertFalse(anonymous.cookies)
            self.assertEqual(anonymous.get(f'/api/review/{token}').status_code, 200)
            missing = anonymous.get(f'/api/review/{token}/cuts/{IDEA}/file')
            self.assertEqual(missing.status_code, 404, missing.text)
            self.assertEqual(anonymous.get('/api/review/invalid-token').status_code, 404)
            for path in (f'/api/review/{token}/decide', f'/api/review/{token}/cuts/{IDEA}/decide'):
                self.assertEqual(anonymous.post(path, json={}).status_code, 403)
            self.assertEqual(anonymous.get(f'/api/review/{token}/cuts/other-idea/file').status_code, 403)
        self.assertEqual(self.client.delete('/api/share').status_code, 403)
        self.assertEqual(self.client.post('/api/production', json={}).status_code, 403)
        self.assertEqual(self.transport.calls, [])

    def test_catalog_ui_metadata_and_due_date(self):
        from datetime import date
        self.login()
        models = self.client.get('/api/gen/models').json()['models']
        self.assertEqual([m.get('label') for m in models], ['Seedream 4.5', 'Hailuo 2.3 Fast', 'Veo Lite - OpenRouter'])
        for model in models:
            self.assertIn(model.get('tier'), ('cheap', 'balanced', 'best'))
            date.fromisoformat(model['priceCheckedAt'])
        date.fromisoformat(self.client.get('/api/ideas').json()[0]['dueDate'])

    def test_seed_due_date_is_iso(self):
        from datetime import date
        self.login()
        date.fromisoformat(self.client.get('/api/ideas').json()[0]['dueDate'])

    def test_lifespan_cleans_renderer_on_normal_and_exceptional_exit(self):
        with patch.object(self.server.editing, 'kill_active') as cleanup:
            with TestClient(self.app):
                cleanup.assert_not_called()
            cleanup.assert_called_once_with()
            with self.assertRaisesRegex(RuntimeError, 'synthetic exit'):
                with TestClient(self.app):
                    raise RuntimeError('synthetic exit')
            self.assertEqual(cleanup.call_count, 2)

    def test_colocated_bridge_precedes_worker_fallback(self):
        import serve_fresh
        local = self.root / 'portable-bin'
        local.mkdir()
        (local / 'fresh_canvas_binding.py').write_text('# synthetic discovery fixture only')
        self.assertEqual(serve_fresh.bridge_directory(local), local)
        self.assertEqual(serve_fresh.bridge_directory(self.root / 'missing-bin'),
                         Path('/Users/tommy/orca/workspaces/BuildClub/fresh-canvas-binding/bin'))

    def generate(self, prompt=None):
        plan = json.loads((self.root / 'state/frozen-plan.json').read_text())
        payload = {'nodeId': 'n_sb_s1', 'model': 'seedream-4.5', 'prompt': prompt or plan['shots'][0]['imagePrompt']}
        return self.client.post(f'/api/ideas/{IDEA}/gen', json=payload)

    def test_native_generation_context_file_and_history(self):
        self.login()
        self.client.get(f'/api/ideas/{IDEA}/canvas')
        self.app.state.generation_enabled = True
        # Synthetic presence only, not inherited credentials; no real transport is installed.
        os.environ['FAL_KEY'] = 'synthetic-offline-presence'
        self.server.gen_jobs.submit = self.server.gen_jobs.run
        response = self.generate()
        self.assertEqual(response.status_code, 201, response.text)
        gid = response.json()['id']
        row = self.client.get(f'/api/ideas/{IDEA}/gen/{gid}').json()
        self.assertEqual(row['status'], 'done', row)
        result = self.client.get(f'/api/ideas/{IDEA}/gen/{gid}/file')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.content, PNG)
        history = self.client.get(f'/api/ideas/{IDEA}/canvas').json()['generations']
        self.assertEqual([r['id'] for r in history], [gid])
        self.assertEqual(len(self.transport.calls), 1)
        status = self.client.get('/api/batch/status')
        self.assertTrue(status.json()['keys']['fal'])
        self.assertNotIn('synthetic-offline-presence', status.text)
        self.assertIsNone(self.app.state.binding._gid.get())
        with self.server.db() as conn:
            binding = conn.execute('SELECT gid FROM batch_bindings').fetchone()
        self.assertEqual(binding[0], gid)

    def test_wrong_prompt_and_old_source_never_reach_engine(self):
        self.login()
        self.client.get(f'/api/ideas/{IDEA}/canvas')
        self.app.state.generation_enabled = True
        os.environ['FAL_KEY'] = 'synthetic-offline-presence'
        self.server.gen_jobs.submit = self.server.gen_jobs.run
        spy = patch.object(self.engine, 'run', wraps=self.engine.run)
        run_spy = spy.start()
        self.addCleanup(spy.stop)
        response = self.generate('Borrowed old scene')
        self.assertEqual(response.status_code, 201)
        row = self.client.get(f'/api/ideas/{IDEA}/gen/{response.json()["id"]}').json()
        self.assertEqual(row['status'], 'failed', row)
        self.assertEqual(self.client.get('/api/gen/budget').json()['image']['spent'], 0)
        response = self.client.post(f'/api/ideas/{IDEA}/gen', json={
            'nodeId': 'n_sb_s1', 'model': 'seedream-4.5', 'prompt': 'old', 'startFrame': 'old-original'})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.transport.calls, [])
        self.assertEqual(self.engine.read()['requests'], [])
        run_spy.assert_not_called()
        self.assertIsNone(self.app.state.binding._gid.get())

    def test_binding_rejects_other_idea_even_with_native_job(self):
        import generations
        plan = json.loads((self.root / 'state/frozen-plan.json').read_text())
        with self.server.db() as conn:
            job = generations.enqueue(conn, 'other-idea', 'n_sb_s1', 'image', 'seedream-4.5',
                {'prompt': plan['shots'][0]['imagePrompt'], 'aspectRatio': '9:16', 'count': 1}, .04)
        with patch.object(self.engine, 'run', wraps=self.engine.run) as run:
            self.server.gen_jobs.run(job['id'])
            run.assert_not_called()
        with self.server.db() as conn:
            self.assertEqual(conn.execute('SELECT status FROM generations WHERE id=?', (job['id'],)).fetchone()[0], 'failed')
        self.assertIsNone(self.app.state.binding._gid.get())

    def test_restart_preserves_snapshot_and_existing_state(self):
        self.server.save('ideas', [__import__('models').SavedIdea.model_validate({
            **self.server.load('ideas')[0], 'notes': 'Do not overwrite user state'})])
        frozen = (self.root / 'state/frozen-plan.json').read_bytes()
        app = build_app(self.root / 'state', 'offline', self.engine)
        self.assertEqual(app.state.server.load('ideas')[0]['notes'], 'Do not overwrite user state')
        self.assertEqual((self.root / 'state/frozen-plan.json').read_bytes(), frozen)

    def test_live_missing_keys_starts_without_submission(self):
        app = build_app(self.root / 'live-state', 'live')
        with TestClient(app) as client:
            self.assertEqual(client.get('/api/batch/status').json()['mode'], 'live')
            self.assertFalse(client.get('/api/batch/status').json()['generationEnabled'])
            client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'pw-for-e2e'})
            self.assertTrue(all(not m['available'] for m in client.get('/api/gen/models').json()['models']))
        self.assertEqual(app.state.engine.read()['requests'], [])

    def test_locked_restart_does_not_resume_queued_generation(self):
        import generations
        with self.server.db() as conn:
            job = generations.enqueue(conn, IDEA, 'n_sb_s1', 'image', 'seedream-4.5',
                                      {'prompt': 'queued setup'}, .04)
        app = build_app(self.root / 'state', 'offline', self.engine)
        with patch.object(app.state.server.gen_jobs, 'submit') as submit:
            with TestClient(app):
                submit.assert_not_called()
        with self.server.db() as conn:
            self.assertEqual(conn.execute('SELECT status FROM generations WHERE id=?', (job['id'],)).fetchone()[0], 'queued')
        self.assertEqual(self.transport.calls, [])

    def test_frontend_is_explicit_and_render_stays_disabled(self):
        frontend = self.root / 'frontend'
        frontend.mkdir()
        (frontend / 'index.html').write_text('<html>synthetic fresh frontend</html>')
        app = build_app(self.root / 'frontend-state', 'offline', self.engine, frontend=frontend)
        with patch.object(app.state.server.editing, 'prewarm_bundle') as prewarm:
            with TestClient(app) as client:
                self.assertIn('synthetic fresh frontend', client.get('/').text)
                prewarm.assert_not_called()
        self.assertFalse(app.state.server.editing.APP_DIR.exists())

    def test_main_is_locked_by_default_and_loopback_only(self):
        from types import SimpleNamespace
        import serve_fresh
        fake_app = SimpleNamespace(state=SimpleNamespace(generation_enabled=True))
        for unlock in (False, True):
            argv = ['serve_fresh.py', '--state', str(self.root / 'cli-state')]
            if unlock:
                argv.append('--enable-generation')
            with patch.object(sys, 'argv', argv), patch.object(serve_fresh, 'check_ports') as ports, \
                    patch.object(serve_fresh, 'build_app', return_value=fake_app), \
                    patch.object(serve_fresh, 'APP', self.root / 'missing-app'), patch('uvicorn.run') as run:
                main()
                ports.assert_called_once_with([8978, 8979, 8980])
                run.assert_called_once_with(fake_app, host='127.0.0.1', port=8978)
                self.assertEqual(fake_app.state.generation_enabled, unlock)
                self.assertEqual(os.environ['REMOTION_PORT'], '8979')
                self.assertEqual(os.environ['REMOTION_MEDIA_PORT'], '8980')

    def test_ports_shared_state_and_unapproved_engine_rejected(self):
        for ports in ([8982, 8979, 8980], [8978, 8983, 8980], [8978, 8979, 8984], [8978, 8978, 8980]):
            with self.assertRaises(ValueError):
                check_ports(ports)
        with patch('serve_fresh.socket.socket') as socket_type:
            socket_type.return_value.bind.side_effect = OSError('address in use')
            with self.assertRaises(OSError):
                check_ports([8978, 8979, 8980])
            socket_type.return_value.close.assert_called_once()
        with self.assertRaises(ValueError):
            build_app(BATCH / 'unsafe-state', 'offline', self.engine)
        with self.assertRaises(ValueError):
            build_app(self.root / 'other', 'offline', object())


if __name__ == '__main__':
    unittest.main(verbosity=2)

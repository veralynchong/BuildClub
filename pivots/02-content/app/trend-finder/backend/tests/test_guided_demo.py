"""Isolated guided editing uses real native persistence and no provider routes."""
import hashlib
import json
import sqlite3
import subprocess
import uuid
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from guided_demo import create_app
import editing
import renders


class IdleJobs:
    submitted = []

    def __init__(self, db, media):
        pass

    def submit(self, wid):
        self.submitted.append(wid)


def fixture(tmp_path):
    assets = tmp_path / 'assets'
    assets.mkdir()
    video = assets / 'still.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=1080x1920:r=30', '-t', '1', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-an', str(video)], check=True)
    sources = [{'id': 'source1', 'shotId': 's1', 'path': video.name, 'sha256': hashlib.sha256(video.read_bytes()).hexdigest(), 'label': 'Static reference', 'provenance': 'Test static presentation'}]
    project = {'fps': 30, 'width': 1080, 'height': 1920, 'clips': [{'id': 'clip1', 'source': {'kind': 'generation', 'id': 'source1', 'shotId': 's1'}, 'in': 0, 'out': 1, 'volume': 0, 'muted': True}], 'texts': [], 'captions': {'enabled': False}, 'music': None, 'voiceover': [], 'primaries': {}, 'showLogo': False, 'logoSize': 'medium', 'logoCorner': 'top-right'}
    manifest = {'version': 1, 'routes': {route: {'sources': sources, 'project': project} for route in ['ai', 'shoot']}}
    return assets, manifest


def test_sessions_save_versions_and_restart(tmp_path):
    assets, manifest = fixture(tmp_path)
    state = tmp_path / 'state'
    app = create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)
    prefix = f'/api/guided/sessions/{uuid.uuid4()}/ai'
    sibling = f'/api/guided/sessions/{uuid.uuid4()}/ai'
    with TestClient(app) as client:
        original = client.post(prefix, json={}).json()
        assert original['sources'][0]['url'] == prefix + '/media/source1'
        project = original['project']
        project['texts'] = [{'id': 'title', 'text': 'New title', 'start': 0, 'end': 1, 'position': 'top', 'color': 'white'}]
        assert client.put(prefix + '/edit', json={'version': 1, 'project': project}).json() == {'version': 2}
        assert client.put(prefix + '/edit', json={'version': 1, 'project': project}).status_code == 409
        assert client.post(prefix, json={}).json()['version'] == 2
        assert client.post(sibling, json={}).json()['project']['texts'] == []
        assert client.get(prefix + '/media/source1').content == (assets / 'still.mp4').read_bytes()
        assert client.post(prefix + '/gen', json={}).status_code == 405
        assert client.post('/api/ideas/anything/edit/export').status_code == 404
    with TestClient(create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)) as client:
        assert client.get(prefix + '/edit').json()['project']['texts'][0]['text'] == 'New title'


def test_unknown_sources_and_paths_are_rejected(tmp_path):
    assets, manifest = fixture(tmp_path)
    with TestClient(create_app(manifest=manifest, asset_root=assets, state_root=tmp_path / 'state', jobs_factory=IdleJobs)) as client:
        prefix = f'/api/guided/sessions/{uuid.uuid4()}/ai'
        project = client.post(prefix, json={}).json()['project']
        project['clips'][0]['source']['id'] = 'foreign'
        assert client.put(prefix + '/edit', json={'version': 1, 'project': project}).status_code == 422
        assert client.get(prefix + '/media/foreign').status_code == 404
        assert client.get(prefix + '/edit?unexpected=1').status_code == 422
        assert client.post(prefix + '/cut/review', json={}).status_code == 405


def test_export_download_stale_route_reset_and_restart_recovery(tmp_path):
    assets, manifest = fixture(tmp_path)
    state = tmp_path / 'state'
    app = create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)
    sid = str(uuid.uuid4())
    prefix = f'/api/guided/sessions/{sid}/ai'
    shoot = f'/api/guided/sessions/{sid}/shoot'
    with TestClient(app) as client:
        client.post(prefix, json={})
        client.post(shoot, json={})
        assert client.post(prefix + '/edit/export').status_code == 202
        assert client.get(prefix + '/cut').json()['status'] == 'queued'
        assert client.post(prefix + '/reset', json={}).status_code == 409
        with sqlite3.connect(app.state.database) as conn:
            wid = conn.execute("SELECT workspace FROM guided_sessions WHERE route='ai'").fetchone()[0]
            project = json.loads(conn.execute('SELECT doc FROM edit_projects WHERE idea_id=?', (wid,)).fetchone()[0])
            signature = editing.signature(conn, app.state.media, {'id': wid}, project)
            output = app.state.media / wid / 'cut/final.mp4'
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes((assets / 'still.mp4').read_bytes())
            conn.execute("UPDATE renders SET status='done',out_size=?,out_duration=1,out_source='editor',out_signature=?,out_shots=1 WHERE idea_id=?", (output.stat().st_size, signature, wid))
        cut = client.get(prefix + '/cut').json()
        assert cut['status'] == 'done' and cut['stale'] is False
        assert cut['output']['url'].startswith(prefix + '/cut/file?')
        assert client.get(cut['output']['url'] + '&download=1').content == output.read_bytes()
        current = client.get(prefix + '/edit').json()
        current['project']['texts'] = [{'id': 'new', 'text': 'Changed', 'start': 0, 'end': 1, 'position': 'top', 'color': 'white'}]
        assert client.put(prefix + '/edit', json=current).status_code == 200
        assert client.get(prefix + '/cut').json()['stale'] is True
        assert client.post(prefix + '/edit/export').status_code == 202
    app = create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)
    with TestClient(app) as client:
        assert client.get(prefix + '/cut').json()['status'] == 'failed'
        assert client.get(prefix + '/edit').json()['project']['texts'][0]['text'] == 'Changed'
        assert client.post(prefix + '/reset', json={}).status_code == 200
        assert client.get(prefix + '/edit').json()['project']['texts'] == []
        assert client.get(shoot + '/edit').status_code == 200
        assert client.get(shoot + '/cut').json()['status'] == 'none'


def test_tampered_copy_and_changed_manifest_cannot_export(tmp_path):
    assets, manifest = fixture(tmp_path)
    state = tmp_path / 'state'
    app = create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)
    prefix = f'/api/guided/sessions/{uuid.uuid4()}/ai'
    with TestClient(app) as client:
        client.post(prefix, json={})
        with sqlite3.connect(app.state.database) as conn:
            wid = conn.execute('SELECT workspace FROM guided_sessions').fetchone()[0]
        (app.state.media / wid / 'gen/source1.mp4').write_bytes(b'changed')
        assert client.post(prefix + '/edit/export').status_code == 409
        assert client.post(prefix, json={}).status_code == 409
        assert client.get(prefix + '/media/source1').status_code == 409
    manifest['routes']['ai']['project']['texts'] = [{'id': 'changed', 'text': 'New template', 'start': 0, 'end': 1, 'position': 'top', 'color': 'white'}]
    app = create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)
    with TestClient(app) as client:
        assert client.get(prefix + '/edit').status_code == 409
        assert client.post(prefix + '/edit/export').status_code == 409


def test_guided_factory_preserves_native_media_default(tmp_path):
    assets, manifest = fixture(tmp_path)
    before = renders._media_dir
    create_app(manifest=manifest, asset_root=assets, state_root=tmp_path / 'state', jobs_factory=IdleJobs)
    assert renders._media_dir is before


def test_native_guided_editors_keep_auth_and_presets_separate(tmp_path, monkeypatch):
    import auth
    import server
    from guided_demo import attach_editors

    assets, manifest = fixture(tmp_path)
    (assets / 'manifest.json').write_text(json.dumps(manifest))
    full = tmp_path / 'full-assets'
    full.mkdir()
    (full / 'still.mp4').write_bytes((assets / 'still.mp4').read_bytes())
    full_manifest = json.loads(json.dumps(manifest))
    for spec in full_manifest['routes'].values():
        spec['project']['clips'][0]['out'] = 0.5
    (full / 'manifest.json').write_text(json.dumps(full_manifest))
    # Restore all app configuration after this test; no native state is shared with the editors.
    routes = list(server.app.router.routes)
    monkeypatch.setattr(server.app.router, 'routes', routes[:-1])
    monkeypatch.setattr(server.app.router, 'lifespan_context', server.app.router.lifespan_context)
    monkeypatch.setattr(server.app.state, 'guided_editor_prefixes', (), raising=False)
    attach_editors(server.app, fresh_assets=assets, full_assets=full, state_root=tmp_path / 'guided', jobs_factory=IdleJobs)
    server.app.router.routes.append(routes[-1])
    with server.db() as conn:
        auth.create_user(conn, 'guest@example.test', 'Guest', 'Demo', 'test-password')
    dist = tmp_path / 'dist'
    dist.mkdir()
    (dist / 'index.html').write_text('<html><head></head><body>App</body></html>')
    monkeypatch.setattr(server, 'DIST_DIR', dist)
    sid = str(uuid.uuid4())
    fresh_path = f'/api/guided/sessions/{sid}/shoot'
    full_path = f'/api/guided/full/sessions/{sid}/shoot'
    with TestClient(server.app) as client:
        assert client.get('/api/ideas').status_code == 401
        assert client.get('/api/workspaces').status_code == 401
        assert client.post('/api/guided/sessionsX').status_code == 401
        fresh = client.post(fresh_path, json={})
        original = client.post(full_path, json={})
        assert fresh.status_code == original.status_code == 200
        assert fresh.json()['project']['clips'][0]['out'] == 1
        assert original.json()['project']['clips'][0]['out'] == 0.5
        assert fresh.json()['sources'][0]['url'] == fresh_path + '/media/source1'
        assert original.json()['sources'][0]['url'] == full_path + '/media/source1'
        assert client.get(original.json()['sources'][0]['url']).status_code == 200
        changed = fresh.json()['project']
        changed['texts'] = [{'id': 'title', 'text': 'Fresh only', 'start': 0, 'end': 1, 'position': 'top', 'color': 'white'}]
        assert client.put(fresh_path + '/edit', json={'version': 1, 'project': changed}).status_code == 200
        assert client.get(full_path + '/edit').json()['project']['texts'] == []
        assert client.post(full_path + '/gen', json={}).status_code == 405
        for origin in ['https://foreign.test', 'null']:
            assert client.post(fresh_path, json={}, headers={'Origin': origin}).status_code == 403
        for path in ['/', '/index.html']:
            assert 'name="guided-editor-full"' in client.get(path).text
        assert client.get('/api/ideas').status_code == 401


def test_adding_prepared_variant_preserves_existing_session_and_edits(tmp_path):
    assets, manifest = fixture(tmp_path)
    state = tmp_path / 'state'
    prefix = f'/api/guided/sessions/{uuid.uuid4()}/shoot'
    with TestClient(create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)) as client:
        initial = client.post(prefix, json={}).json()
        project = initial['project']
        project['texts'] = [{'id': 'title', 'text': 'Preserve my edit', 'start': 0, 'end': 1, 'position': 'top', 'color': 'white'}]
        assert client.put(prefix + '/edit', json={'version': 1, 'project': project}).status_code == 200
    variant = {**manifest['routes']['shoot']['sources'][0], 'id': 'source1-v2', 'nodeId': 'import_source1', 'label': 'Alternative opening'}
    manifest['routes']['shoot']['variants'] = [variant]
    with TestClient(create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)) as client:
        upgraded = client.post(prefix, json={}).json()
        assert upgraded['version'] == 2
        assert upgraded['project'] == project
        assert {source['id'] for source in upgraded['sources']} == {'source1', 'source1-v2'}
        assert client.post(prefix, json={}).json() == upgraded
        project['clips'][0]['source']['id'] = 'source1-v2'
        assert client.put(prefix + '/edit', json={'version': 2, 'project': project}).status_code == 200
        assert client.get(prefix + '/media/source1-v2').content == (assets / 'still.mp4').read_bytes()
    with TestClient(create_app(manifest=manifest, asset_root=assets, state_root=state, jobs_factory=IdleJobs)) as client:
        restored = client.post(prefix, json={}).json()
        assert restored['version'] == 3
        assert restored['project'] == project
        fresh = client.post(f'/api/guided/sessions/{uuid.uuid4()}/shoot', json={}).json()
        assert fresh['project']['clips'][0]['source']['id'] == 'source1'
        assert len(fresh['sources']) == 2


def test_variant_cannot_introduce_another_shot(tmp_path):
    import pytest
    assets, manifest = fixture(tmp_path)
    manifest['routes']['shoot']['variants'] = [{**manifest['routes']['shoot']['sources'][0], 'id': 'foreign', 'shotId': 's2'}]
    with pytest.raises(ValueError, match='existing shot'):
        create_app(manifest=manifest, asset_root=assets, state_root=tmp_path / 'state', jobs_factory=IdleJobs)

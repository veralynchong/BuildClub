"""Independent canvas contracts, using temporary storage and no providers."""
import copy
import time

import auth
import server


def staff(client):
    with server.db() as conn:
        auth.create_user(conn, 'canvas@example.test', 'Canvas', 'Studio', 'password123')
        token = auth.start_session(conn, 'canvas@example.test', time.time())
    client.cookies.set(auth.COOKIE, token)
    with server.db() as conn:
        conn.execute("INSERT OR REPLACE INTO store VALUES ('clients', ?)", ('[{"id":"client-a","name":"Studio"}]',))


def node(nid, kind, **data):
    return {'id': nid, 'type': kind, 'position': {'x': 0, 'y': 0}, 'data': data}


def test_workspace_requires_session_without_bootstrap(client):
    assert client.get('/api/workspaces').status_code == 401
    assert client.post('/api/workspaces', json={'clientId': 'client-a'}).status_code == 401


def test_empty_workspace_crud_cas(client):
    staff(client)
    assert client.get('/api/workspaces?clientId=client-a').json() == {'workspaces': []}
    made = client.post('/api/workspaces', json={'clientId': 'client-a', 'title': 'New film'})
    assert made.status_code == 201
    out = made.json()
    wid = out['workspace']['id']
    assert wid.startswith('ws_') and out['version'] == 1
    assert out['doc'] == {'nodes': [], 'edges': [], 'viewport': {'x': 0, 'y': 0, 'zoom': 1}}
    assert out['takes'] == out['generations'] == []
    assert server.load('ideas') is None
    assert client.get(f'/api/workspaces/{wid}').json() == out
    doc = copy.deepcopy(out['doc'])
    doc['nodes'] = [node('prompt', 'prompt', prompt='A red bicycle')]
    saved = client.put(f'/api/workspaces/{wid}', json={'version': 1, 'doc': doc, 'title': 'Bicycle'})
    assert saved.status_code == 200 and saved.json()['version'] == 2
    assert saved.json()['workspace']['title'] == 'Bicycle'
    assert client.put(f'/api/workspaces/{wid}', json={'version': 1, 'doc': doc}).status_code == 409
    assert client.put(f'/api/workspaces/{wid}', json={'version': True, 'doc': doc}).status_code == 422
    assert client.get(f'/api/ideas/{wid}/canvas').status_code == 404
    client.cookies.clear()
    assert client.get(f'/api/workspaces/{wid}/gen').status_code == 401


def test_workspace_graph_ports_and_derived_editor(client):
    staff(client)
    out = client.post('/api/workspaces', json={'clientId': 'client-a'}).json()
    url = '/api/workspaces/' + out['workspace']['id']
    doc = out['doc']
    doc['nodes'] = [node('p', 'prompt', prompt='bike'), node('v', 'video', model='mock-video'), node('n_editor', 'editor')]
    edge = {'id': 'e', 'source': 'p', 'sourceHandle': 'out', 'target': 'v', 'targetHandle': 'in:text'}
    doc['edges'] = [edge]
    assert client.put(url, json={'version': 1, 'doc': doc}).status_code == 200
    edge['targetHandle'] = 'in:start'
    assert client.put(url, json={'version': 2, 'doc': doc}).status_code == 422
    edge.update(source='v', target='n_editor', targetHandle='in:clips')
    bad = client.put(url, json={'version': 2, 'doc': doc})
    assert bad.status_code == 422 and bad.json()['code'] == 'editor_edges_derived'


def setup_graph(client, nodes, edges=None):
    out = client.post('/api/workspaces', json={'clientId': 'client-a'}).json()
    base = '/api/workspaces/' + out['workspace']['id']
    doc = out['doc']
    doc.update(nodes=nodes, edges=edges or [])
    saved = client.put(base, json={'version': 1, 'doc': doc})
    assert saved.status_code == 200, saved.text
    return base, saved.json()['doc']


def connect(src, dst, port='in:text'):
    return {'id': 'e_' + src + dst + port, 'source': src, 'sourceHandle': 'out', 'target': dst, 'targetHandle': port}


def finish(gen, kind='image'):
    folder = server.MEDIA_DIR / gen['ideaId'] / 'gen'
    folder.mkdir(parents=True, exist_ok=True)
    name = gen['id'] + ('.mp4' if kind == 'video' else '.png')
    (folder / name).write_bytes(b'test fixture')
    with server.db() as conn:
        conn.execute("UPDATE generations SET status='done', file=? WHERE id=?", (name, gen['id']))


def test_generation_uses_graph_quote_and_recursive_stale(client, monkeypatch):
    staff(client)
    monkeypatch.setattr(server.gen_jobs, 'submit', lambda gid: None)
    base, doc = setup_graph(client, [node('p', 'prompt', prompt='Persisted bicycle'),
        node('s', 'storyboard', model='mock-image'), node('v', 'video', model='mock-video', duration=4)],
        [connect('p', 's'), connect('p', 'v'), connect('s', 'v', 'in:start')])
    body = {'canvasVersion': 2, 'nodeId': 's', 'model': 'bad-model', 'prompt': 'CALLER LIE'}
    quote = client.post(base + '/gen', json=body)
    assert quote.status_code == 200 and quote.json()['total'] == 0
    assert quote.json()['inputs']['prompt'] == 'Persisted bicycle'
    made = client.post(base + '/gen', json={**body, 'confirm': True, 'inputStamp': quote.json()['inputStamp']})
    assert made.status_code == 201, made.text
    image = made.json()
    assert image['inputs']['prompt'] == 'Persisted bicycle' and len(image['inputs']['inputStamp']) == 64
    finish(image)
    doc['nodes'][1]['data']['selected'] = image['id']
    assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 200
    video = run_node(client, base, 'v', 3)
    assert video.status_code == 201, video.text
    video = video.json()
    assert video['inputs']['startFrame'] == image['id']
    finish(video, 'video')
    doc['nodes'][2]['data']['selected'] = video['id']
    assert client.put(base, json={'version': 3, 'doc': doc}).status_code == 200
    assert not any(g['stale'] for g in client.get(base).json()['generations'])
    doc['nodes'][0]['data']['prompt'] = 'A changed scene'
    doc['nodes'][1]['data']['stale'] = False
    assert client.put(base, json={'version': 4, 'doc': doc}).status_code == 200
    out = client.get(base).json()
    assert all(g['stale'] for g in out['generations'])
    assert out['doc']['nodes'][1]['data']['stale']
    assert client.post(base + '/gen', json={'canvasVersion': 5, 'nodeId': 'v', 'confirm': True}).status_code == 422
    assert client.post(base + '/gen', json={**body, 'confirm': True}).status_code == 409
    # Pure reads neither reconcile nodes nor increment the CAS.
    assert client.get(base).json()['version'] == 5
    assert len(client.get(base).json()['doc']['nodes']) == 3


def test_upload_and_sources_cannot_cross_scopes(client, monkeypatch):
    import editing
    staff(client)
    base, doc = setup_graph(client, [node('u', 'upload', media='image'), node('n_editor', 'editor')])
    uploaded = client.post(base + '/gen/upload?nodeId=u', content=b'\x89PNGfixture', headers={'content-type': 'image/png'})
    assert uploaded.status_code == 200, uploaded.text
    gid = uploaded.json()['id']
    other, otherdoc = setup_graph(client, [node('u', 'upload', media='image'), node('n_editor', 'editor')])
    otherdoc['nodes'][0]['data']['selected'] = gid
    assert client.put(other, json={'version': 2, 'doc': otherdoc}).status_code == 422
    assert client.get(other + '/gen/' + gid).status_code == 404
    project = editing.empty_project()
    project['clips'] = [{'id': 'c1', 'source': {'kind': 'generation', 'id': gid}, 'in': 0, 'out': 1, 'muted': False, 'volume': 1}]
    assert client.put(other + '/edit', json={'version': 0, 'project': project}).status_code == 422
    assert client.get(base + '/edit').json()['project']['clips'] == []
    assert not client.get(base).json()['generations'][0]['stale']


def test_workspace_assistant_uses_prompt_and_preserves_graph(client, monkeypatch):
    import agent
    staff(client)
    monkeypatch.setattr(agent.storyboard, 'use_claude', lambda: False)
    base, doc = setup_graph(client, [node('p', 'prompt', prompt='Bicycle in the rain')])
    planned = client.post(base + '/agent/plan', json={'promptNodeId': 'p', 'canvasVersion': 2})
    assert planned.status_code == 200, planned.text
    out = planned.json()
    assert out['source'] == 'demo' and out['planUsd'] == 0 and out['promptNodeId'] == 'p'
    assert 'Bicycle in the rain' in out['storyboard']['prompt']
    assert client.get(base).json()['doc']['nodes'] == [{**doc['nodes'][0], 'data': {**doc['nodes'][0]['data'], 'stale': False}}]
    assert client.post(base + '/agent/plan', json={'promptNodeId': 'p', 'canvasVersion': 1}).status_code == 409


def test_voice_upload_and_tts_are_node_sources_not_automatic_timeline(client, monkeypatch):
    import cutting
    import editing
    staff(client)
    monkeypatch.setattr(server.gen_jobs, 'submit', lambda gid: None)
    monkeypatch.setattr(cutting, 'probe', lambda path: {'duration': 2, 'hasAudio': True, 'width': 0, 'height': 0})
    monkeypatch.setattr(editing, 'transcribe_voice', lambda path, work: [{'text': 'Hello', 'start': 0, 'end': 1}])
    base, doc = setup_graph(client, [node('p', 'prompt', prompt='Hello bicycle'), node('voice', 'voice', model='mock-voice')], [connect('p', 'voice')])
    assert client.put(base + '/edit/voice?source=upload', content=b'audio', headers={'content-type': 'audio/mpeg'}).status_code == 422
    voice = client.put(base + '/edit/voice?source=upload&nodeId=voice', content=b'audio', headers={'content-type': 'audio/mpeg'})
    assert voice.status_code == 200, voice.text
    out = voice.json()
    assert out['voiceId'] == out['id'] and out['nodeId'] == 'voice'
    assert client.get(base).json()['generations'][0]['kind'] == 'voice'
    assert client.get(base + '/edit').json()['project']['voiceover'] == []
    quote = client.post(base + '/edit/voice/tts', json={'nodeId': 'voice', 'canvasVersion': 2})
    assert quote.status_code == 200 and quote.json()['usd'] == 0
    made = client.post(base + '/edit/voice/tts', json={'nodeId': 'voice', 'canvasVersion': 2, 'confirm': True, 'inputStamp': quote.json()['inputStamp']})
    assert made.status_code == 201, made.text
    assert made.json()['nodeId'] == 'voice' and made.json()['inputs']['prompt'] == 'Hello bicycle'
    assert made.json()['kind'] == 'voice' and made.json()['inputs']['inputStamp']


def test_malformed_graph_is_422_not_server_error(client):
    staff(client)
    base, original = setup_graph(client, [node('p', 'prompt', prompt='Bike'), node('s', 'storyboard', model='mock-image')])
    cases = []
    for field, value in [('model', []), ('prompt', {}), ('selected', []), ('voiceId', []), ('duration', True)]:
        doc = copy.deepcopy(original)
        doc['nodes'][1]['data'][field] = value
        cases.append(doc)
    doc = copy.deepcopy(original)
    doc['edges'] = [connect('p', 's')]
    doc['edges'][0]['targetHandle'] = []
    cases.append(doc)
    for doc in cases:
        assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 422


def test_graph_cycles_cardinality_capabilities_and_finite_coordinates(client):
    staff(client)
    base, doc = setup_graph(client, [node('p', 'prompt', prompt='Bike'), node('q', 'prompt', prompt='Rain'),
        node('s', 'storyboard', model='mock-image'), node('v', 'video', model='hailuo-2.3-fast')])
    for edges in ([connect('p', 'q'), connect('q', 'p')], [connect('p', 's'), connect('q', 's')],
                  [connect('s', 'v', 'in:ref')], [connect('p', 'p')]):
        bad = copy.deepcopy(doc)
        bad['edges'] = edges
        assert client.put(base, json={'version': 2, 'doc': bad}).status_code == 422
    doc['viewport']['zoom'] = 0
    assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 422
    doc['viewport']['zoom'] = 1
    doc['nodes'][0]['position']['x'] = True
    assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 422


def test_workspace_review_union_and_stale_source_guard(client, monkeypatch):
    import editing
    import renders
    staff(client)
    monkeypatch.setattr(server.gen_jobs, 'submit', lambda gid: None)
    base, doc = setup_graph(client, [node('p', 'prompt', prompt='Private prompt'), node('v', 'video', model='mock-video')], [connect('p', 'v')])
    rid = base.rsplit('/', 1)[1]
    gen = run_node(client, base, 'v', 2).json()
    finish(gen, 'video')
    project = editing.empty_project()
    project['clips'] = [{'id': 'c1', 'source': {'kind': 'generation', 'id': gen['id']}, 'in': 0, 'out': 1, 'muted': False, 'volume': 1}]
    assert client.put(base + '/edit', json={'version': 0, 'project': project}).status_code == 200
    final = server.MEDIA_DIR / rid / 'cut' / 'final.mp4'
    final.parent.mkdir(parents=True)
    final.write_bytes(b'test video')
    with server.db() as conn:
        sig = editing.signature(conn, server.MEDIA_DIR, {'id': rid}, project)
        conn.execute("INSERT INTO renders (idea_id,status,progress,step,speed,signature,started_at,out_size,out_duration,out_signature,out_source) VALUES (?,'done',1,'Done',1,'',0,10,1,?,'editor')", (rid, sig))
    token = client.post('/api/share', json={'clientId': 'client-a'}).json()['token']
    assert client.post(base + '/cut/review').status_code == 200
    cuts = client.get('/api/review/' + token).json()['cuts']
    assert len(cuts) == 1 and set(cuts[0]) == {'workspace', 'cut'}
    assert cuts[0]['workspace'] == {'id': rid, 'title': 'Untitled workspace'}
    assert 'Private prompt' not in str(cuts)
    url = cuts[0]['cut']['url']
    assert client.get(url).status_code == 200
    with server.db() as conn:
        conn.execute("INSERT OR REPLACE INTO store VALUES ('share:other', ?)", ('{"clientId":"client-b","token":"other"}',))
    assert client.get('/api/review/other/cuts/' + rid + '/file').status_code == 404
    doc['nodes'][0]['data']['prompt'] = 'Changed during generation'
    assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 200
    assert client.get(base + '/cut').json()['stale']
    assert client.post(base + '/cut/review').status_code == 409
    assert client.get(url).status_code == 404
    assert client.post('/api/review/' + token + '/cuts/' + rid + '/decide', json={'decision': 'approved', 'version': cuts[0]['cut']['version']}).status_code == 404
    monkeypatch.setattr(editing, 'missing_render_tools', lambda: None)
    monkeypatch.setattr(editing, '_probe', lambda path: {'duration': 4, 'hasAudio': True, 'width': 1080, 'height': 1920})
    assert client.post(base + '/edit/export').status_code == 409


def run_node(client, base, nid, version):
    quote = client.post(base + '/gen', json={'canvasVersion': version, 'nodeId': nid, 'confirm': False})
    assert quote.status_code == 200, quote.text
    return client.post(base + '/gen', json={'canvasVersion': version, 'nodeId': nid, 'confirm': True, 'inputStamp': quote.json()['inputStamp']})


def test_workspace_confirm_requires_quote_stamp_and_does_not_charge(client, monkeypatch):
    staff(client)
    submissions = []
    monkeypatch.setattr(server.gen_jobs, 'submit', submissions.append)
    base, doc = setup_graph(client, [node('p', 'prompt', prompt='Bike'), node('s', 'storyboard', model='mock-image')], [connect('p', 's')])
    body = {'nodeId': 's', 'canvasVersion': 2}
    quote = client.post(base + '/gen', json={**body, 'confirm': False}).json()
    assert quote['total'] == 0 and quote['items'] == [{'nodeId': 's', 'model': 'mock-image', 'usd': 0}]
    assert submissions == []
    for extra in ({}, {'inputStamp': 'forged'}):
        assert client.post(base + '/gen', json={**body, 'confirm': True, **extra}).status_code == 409
    assert submissions == [] and client.get(base + '/gen').json() == []
    # Geometry is deliberately excluded from the input stamp; CAS still tracks the document write.
    doc['nodes'][0]['position']['x'] = 300
    doc['viewport']['x'] = 100
    assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 200
    fresh = client.post(base + '/gen', json={**body, 'canvasVersion': 3}).json()
    assert fresh['inputStamp'] == quote['inputStamp']
    assert client.post(base + '/gen', json={**body, 'canvasVersion': 3, 'confirm': True, 'inputStamp': fresh['inputStamp']}).status_code == 201
    assert len(submissions) == 1
    assert client.post(base + '/gen/chain', json={}).status_code == 422


def test_two_node_jobs_consume_files_and_inflight_changes_stay_stale(client, monkeypatch):
    import gen_providers
    staff(client)
    monkeypatch.setattr(server.gen_jobs, 'submit', lambda gid: None)
    base, doc = setup_graph(client, [node('p', 'prompt', prompt='Bicycle input'), node('s', 'storyboard', model='mock-image'),
        node('v', 'video', model='mock-video')], [connect('p', 's'), connect('p', 'v'), connect('s', 'v', 'in:start')])
    calls = []
    class Adapter:
        def submit(self, job):
            calls.append((job.prompt, job.start.read_bytes() if job.start else None))
            return 'offline-job'
        def poll(self, job, request_id):
            return gen_providers.Poll('done', data=b'image result' if job.model['kind'] == 'image' else b'video result', ext='png' if job.model['kind'] == 'image' else 'mp4')
    monkeypatch.setattr(gen_providers, 'adapter_for', lambda provider: Adapter())
    image = run_node(client, base, 's', 2).json()
    server.gen_jobs.run(image['id'])
    assert client.get(base + '/gen/' + image['id']).json()['status'] == 'done'
    doc['nodes'][1]['data']['selected'] = image['id']
    assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 200
    video = run_node(client, base, 'v', 3).json()
    # A request was queued with the previous scene, then the user changes the graph before completion.
    doc['nodes'][0]['data']['prompt'] = 'New scene while running'
    assert client.put(base, json={'version': 3, 'doc': doc}).status_code == 200
    server.gen_jobs.run(video['id'])
    assert calls == [('Bicycle input', None), ('Bicycle input', b'image result')]
    polled = client.get(base + '/gen/' + video['id']).json()
    assert polled['status'] == 'done' and polled['stale']
    assert client.get(base).json()['generations'][1]['stale']


def test_workspace_video_upload_is_generation_with_no_take(client, monkeypatch):
    import cutting
    staff(client)
    monkeypatch.setattr(cutting, 'probe', lambda path: {'duration': 4, 'hasAudio': True, 'width': 1080, 'height': 1920})
    base, doc = setup_graph(client, [node('u', 'upload', media='video')])
    out = client.post(base + '/gen/upload?nodeId=u', content=b'local video', headers={'content-type': 'video/mp4'})
    assert out.status_code == 200 and out.json()['kind'] == 'video'
    doc['nodes'][0]['data']['selected'] = out.json()['id']
    assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 200
    assert client.get(base).json()['takes'] == []
    with server.db() as conn:
        assert conn.execute('SELECT COUNT(*) FROM takes').fetchone()[0] == 0
    assert client.get(out.json()['url']).content == b'local video'


def test_inline_prompt_precedence_and_prompt_chain(client):
    staff(client)
    base, doc = setup_graph(client, [node('p', 'prompt', text='Upstream text'), node('q', 'prompt', text='Local text'),
        node('s', 'storyboard', model='mock-image', prompt='Image override')], [connect('p', 'q'), connect('q', 's')])
    quote = client.post(base + '/gen', json={'nodeId': 's', 'canvasVersion': 2}).json()
    assert quote['inputs']['prompt'] == 'Image override'
    doc['nodes'][2]['data']['prompt'] = ''
    assert client.put(base, json={'version': 2, 'doc': doc}).status_code == 200
    quote = client.post(base + '/gen', json={'nodeId': 's', 'canvasVersion': 3}).json()
    assert quote['inputs']['prompt'] == 'Local text'
    assert client.post(base + '/gen', json={'nodeId': [], 'canvasVersion': 3}).status_code == 422
    assert client.post(base + '/agent/plan', json={'promptNodeId': 'p', 'canvasVersion': True}).status_code == 422


def test_editor_output_and_unknown_target_ports_are_rejected(client):
    staff(client)
    base, doc = setup_graph(client, [node('n_editor', 'editor'), node('u', 'upload', media='image'),
        node('p', 'prompt', text='Bicycle'), node('s', 'storyboard', model='mock-image')])
    for source, target, handle in [('n_editor', 'u', 'in:unknown'), ('n_editor', 'p', 'in:unknown'),
                                   ('n_editor', 'p', 'in:text'), ('p', 's', 'in:unknown')]:
        doc['edges'] = [connect(source, target, handle)]
        refused = client.put(base, json={'version': 2, 'doc': doc})
        assert refused.status_code == 422, (source, target, handle, refused.text)
        assert refused.json()['code'] == 'invalid_graph'
    assert client.get(base).json()['version'] == 2
    assert client.get(base).json()['doc']['edges'] == []

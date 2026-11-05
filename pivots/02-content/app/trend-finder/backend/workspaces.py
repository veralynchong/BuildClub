"""Independent workspaces and explicit resource scope; legacy plans keep their approval rules."""
import copy
import hashlib
import json
import math
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

import auth
from models import WorkspaceMetadata

SCHEMA = (
    'CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, title TEXT NOT NULL, '
    'created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS workspace_voices (idea_id TEXT NOT NULL, voice_id TEXT NOT NULL, '
    'node_id TEXT NOT NULL, gen_id TEXT, PRIMARY KEY (idea_id, voice_id))',
)
CHAIN_UNSUPPORTED = 'Run each workspace node with canvasVersion and confirm.'
EMPTY = {'nodes': [], 'edges': [], 'viewport': {'x': 0, 'y': 0, 'zoom': 1}}


def metadata(row):
    return WorkspaceMetadata(**dict(zip(('id', 'clientId', 'title', 'createdAt', 'updatedAt'), row))).model_dump()


def workspace(conn, rid):
    # Older standalone router tests need no workspace table.
    if not conn.execute("SELECT 1 FROM sqlite_master WHERE name='workspaces'").fetchone():
        return None
    row = conn.execute('SELECT id, client_id, title, created_at, updated_at FROM workspaces WHERE id=?', (rid,)).fetchone()
    return metadata(row) if row else None


def resolve(db, load, rid):
    with db() as conn:
        found = workspace(conn, rid)
    if found:
        return found
    return next(({**i, 'kind': 'legacy-plan'} for i in load('ideas') or [] if i['id'] == rid), None)


def editable(resource):
    return resource and (resource.get('kind') == 'workspace' or resource.get('status') == 'approved')


def session_dependency(db):
    def signed_in(request: Request):
        with db() as conn:
            user = auth.session_user(conn, request.cookies.get(auth.COOKIE), time.time())
        if user is None:
            raise HTTPException(status_code=401, detail='Sign in to continue.')
        return user
    return signed_in


def aliases(router, db):
    """Register the same handlers with a session and real-workspace dependency."""
    def exists(idea_id: str):
        with db() as conn:
            if workspace(conn, idea_id) is None:
                raise HTTPException(status_code=404, detail="That workspace doesn't exist.")
    for route in list(router.routes):
        if route.path.startswith('/api/ideas/{idea_id}/'):
            router.add_api_route(route.path.replace('/api/ideas/', '/api/workspaces/', 1), route.endpoint,
                                 methods=route.methods, dependencies=[Depends(session_dependency(db)), Depends(exists)])
    return router


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


def media(node):
    return {'prompt': 'text', 'storyboard': 'image', 'video': 'video', 'voice': 'audio', 'kit': 'kit',
            'upload': node.get('data', {}).get('media', 'image')}.get(node['type'])


def check_graph(doc):
    import canvas
    import generations
    problem = canvas.check_doc(doc, [])
    if problem:
        return problem, 'invalid_graph'
    nodes = {n['id']: n for n in doc['nodes']}
    if any(n['type'] in ('shot', 'footage') for n in nodes.values()):
        return 'Workspace nodes cannot depend on a shot list.', 'invalid_graph'
    if any(not all(finite(n['position'].get(k)) for k in ('x', 'y')) for n in nodes.values()):
        return 'Every node needs finite coordinates.', 'invalid_graph'
    view = doc.get('viewport')
    if not isinstance(view, dict) or not all(finite(view.get(k)) for k in ('x', 'y', 'zoom')) or view['zoom'] <= 0:
        return 'Send a finite viewport with a positive zoom.', 'invalid_graph'
    editors = [n for n in nodes.values() if n['type'] == 'editor']
    if len(editors) > 1 or any(n['id'] != 'n_editor' for n in editors):
        return 'A workspace can have one editor named n_editor.', 'invalid_graph'
    ports = {'prompt': {'in:text': 'text'}, 'storyboard': {'in:text': 'text', 'in:ref': 'image', 'in:kit': 'kit'},
             'video': {'in:text': 'text', 'in:start': 'image', 'in:ref': 'image'}, 'voice': {'in:text': 'text'}}
    models = {m['id']: m for m in generations.load_models()}
    seen, counts, outgoing = set(), {}, {nid: [] for nid in nodes}
    for n in nodes.values():
        data = n['data']
        for key in ('model', 'prompt', 'text', 'selected', 'voiceId', 'media'):
            if key in data and data[key] is not None and not isinstance(data[key], str):
                return 'Node input values must be text.', 'invalid_graph'
        if 'duration' in data and (not finite(data['duration']) or data['duration'] <= 0):
            return 'Duration must be a positive finite number.', 'invalid_graph'
        for key in ('kitItems', 'kitOff'):
            if key in data and (not isinstance(data[key], list) or not all(isinstance(v, str) for v in data[key])):
                return 'Kit picks must be item ids.', 'invalid_graph'
        if n['type'] == 'upload' and media(n) not in ('image', 'video', 'audio'):
            return 'Unknown upload media.', 'invalid_graph'
        if n['type'] in ('storyboard', 'video', 'voice'):
            mid = n['data'].get('model')
            expected = {'storyboard': 'image', 'video': 'video', 'voice': 'voice'}[n['type']]
            if mid is not None and (mid not in models or models[mid]['kind'] != expected or models[mid].get('retired')):
                return 'That model cannot make this node.', 'invalid_graph'
        if n['type'] == 'storyboard':
            model = models.get(data.get('model') or 'mock-image', {})
            try:
                generations.image_options(model, data)
            except ValueError as e:
                return str(e), 'invalid_graph'
        elif 'count' in data and (type(data['count']) is not int or data['count'] != 1):
            return 'This node does not support batches.', 'invalid_graph'
    for e in doc['edges']:
        src, dst, port = nodes[e['source']], nodes[e['target']], e.get('targetHandle')
        if dst['type'] == 'editor':
            return 'Editor input edges are derived from the edit project.', 'editor_edges_derived'
        key = (src['id'], dst['id'], port)
        accepted = ports.get(dst['type'], {})
        source_media = media(src)
        if e.get('sourceHandle') != 'out' or source_media is None or not isinstance(port, str) \
                or port not in accepted or accepted[port] != source_media:
            return 'The ports do not accept this media.', 'invalid_graph'
        if src['id'] == dst['id'] or key in seen:
            return 'Duplicate and self connections are not allowed.', 'invalid_graph'
        seen.add(key)
        outgoing[src['id']].append(dst['id'])
        count_key = (dst['id'], port)
        counts[count_key] = counts.get(count_key, 0) + 1
        m = models.get(dst['data'].get('model'), {})
        field = {'in:text': 'text', 'in:ref': 'reference', 'in:start': 'startFrame'}.get(port)
        if m and field and m.get('inputs', {}).get(field, 'none') == 'none':
            return 'This model does not support that input.', 'invalid_graph'
        cap = m.get('maxRefs', 1) if port == 'in:ref' else 1
        if counts[count_key] > cap:
            return 'This input has too many connections.', 'invalid_graph'
    active, done = set(), set()
    def visit(nid):
        if nid in active:
            return True
        if nid in done:
            return False
        active.add(nid)
        if any(visit(other) for other in outgoing[nid]):
            return True
        active.remove(nid)
        done.add(nid)
        return False
    if any(visit(nid) for nid in nodes):
        return 'Connections cannot form a cycle.', 'invalid_graph'
    return None


def graph(conn, rid):
    row = conn.execute('SELECT version, doc FROM canvases WHERE idea_id=?', (rid,)).fetchone()
    return (row[0], json.loads(row[1])) if row else (0, copy.deepcopy(EMPTY))


def prompt_text(doc, node_id):
    """The node's own prompt wins; an empty prompt inherits the text input, as in the editor."""
    nodes = {n['id']: n for n in doc['nodes']}
    def text(nid):
        node = nodes[nid]
        data = node['data']
        own = (data.get('text') or data.get('prompt') or '') if node['type'] == 'prompt' else (data.get('prompt') or '')
        if own.strip():
            return own
        upstream = next((e for e in doc['edges'] if e['target'] == nid and e['targetHandle'] == 'in:text'), None)
        return text(upstream['source']) if upstream else ''
    return text(node_id)


def inputs(conn, rid, node_id, load):
    """Resolve effective inputs and a canonical stamp from the persisted graph, never caller values."""
    import generations
    version, doc = graph(conn, rid)
    nodes = {n['id']: n for n in doc['nodes']}
    if not isinstance(node_id, str):
        raise ValueError('That node cannot generate media.')
    target = nodes.get(node_id)
    if not target or target['type'] not in ('storyboard', 'video', 'voice'):
        raise ValueError('That node cannot generate media.')
    data = target['data']
    refs, start = [], None
    for edge in doc['edges']:
        if edge['target'] != node_id:
            continue
        source = nodes[edge['source']]
        if edge['targetHandle'] in ('in:start', 'in:ref'):
            gid = source['data'].get('selected')
            row = conn.execute(f'SELECT {generations.COLUMNS} FROM generations WHERE id=? AND idea_id=?', (gid, rid)).fetchone()
            if not row or row[3] != 'image' or row[7] != 'done':
                raise ValueError('An upstream image is not ready.')
            if generation_stale(conn, rid, generations.to_json(row), load):
                raise ValueError('An upstream image is stale. Generate it again.')
            if edge['targetHandle'] == 'in:start':
                start = gid
            else:
                refs.append({'source': 'gen', 'genId': gid})
        elif edge['targetHandle'] == 'in:kit':
            client = next((c for c in load('clients') or [] if c['id'] == workspace(conn, rid)['clientId']), {})
            picks = set(source['data'].get('kitItems') or []) - set(data.get('kitOff') or [])
            for item in (client.get('kit') or {}).get('items') or []:
                if item['id'] not in picks:
                    continue
                images = item.get('images') or []
                refs.extend([{'source': 'kit', 'itemId': item['id'], 'image': image} for image in images]
                            or [{'source': 'kit', 'itemId': item['id']}])
    kind = {'storyboard': 'image', 'video': 'video', 'voice': 'voice'}[target['type']]
    model_id = data.get('model') or {'image': 'mock-image', 'video': 'mock-video', 'voice': 'mock-voice'}[kind]
    model = next((m for m in generations.load_models() if m['id'] == model_id), {})
    duration = data.get('duration') if kind == 'video' else None
    if duration is None and kind == 'video':
        duration = (model.get('durations') or [4])[0]
    resolved = {'prompt': prompt_text(doc, node_id), 'model': model_id, 'startFrame': start, 'references': refs, 'duration': duration}
    if kind == 'image':
        resolved.update(generations.image_options(model, data))
    client = next((c for c in load('clients') or [] if c['id'] == workspace(conn, rid)['clientId']), {})
    used = {r.get('itemId') for r in refs if r.get('source') == 'kit'}
    stamp_data = {**{k: v for k, v in resolved.items() if k not in ('aspectRatio', 'resolution', 'count')},
                  **generations.semantic_options(resolved), 'kit': [i for i in (client.get('kit') or {}).get('items') or [] if i['id'] in used]}
    stamp = hashlib.sha256(json.dumps(stamp_data, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    return version, resolved, stamp


def generation_stale(conn, rid, gen, load):
    stamp = gen.get('inputs', {}).get('inputStamp')
    if gen.get('model') == 'upload':
        return False
    if not stamp:
        return True
    try:
        return inputs(conn, rid, gen['nodeId'], load)[2] != stamp
    except (ValueError, KeyError, RecursionError):
        return True


def stale_project(conn, rid, project, load):
    import generations
    if workspace(conn, rid) is None:
        return False
    gids = [c['source']['id'] for c in project.get('clips', []) if c['source']['kind'] == 'generation']
    for voice in project.get('voiceover', []):
        row = conn.execute('SELECT gen_id FROM workspace_voices WHERE idea_id=? AND voice_id=?', (rid, voice['id'])).fetchone()
        if row and row[0]:
            gids.append(row[0])
    for gid in gids:
        row = conn.execute(f'SELECT {generations.COLUMNS} FROM generations WHERE id=? AND idea_id=?', (gid, rid)).fetchone()
        if row is None or generation_stale(conn, rid, generations.to_json(row), load):
            return True
    return False


def stored_load(conn):
    def load(key):
        row = conn.execute('SELECT value FROM store WHERE key=?', (key,)).fetchone()
        return json.loads(row[0]) if row else None
    return load


def make_router(db, load):
    import canvas
    import generations
    router = APIRouter(dependencies=[Depends(session_dependency(db))])
    def response(conn, rid, full=True):
        version, doc = graph(conn, rid)
        result = {'workspace': workspace(conn, rid), 'version': version, 'doc': doc}
        if full:
            rows = conn.execute(f'SELECT {generations.COLUMNS} FROM generations WHERE idea_id=? ORDER BY created_at, rowid', (rid,)).fetchall()
            gens = [generations.to_json(r) for r in rows]
            for gen in gens:
                gen['stale'] = generation_stale(conn, rid, gen, load)
            by_id = {g['id']: g for g in gens}
            for n in doc['nodes']:
                selected = by_id.get(n['data'].get('selected'))
                if n['data'].get('voiceId'):
                    voice = conn.execute('SELECT gen_id FROM workspace_voices WHERE idea_id=? AND voice_id=?', (rid, n['data']['voiceId'])).fetchone()
                    selected = by_id.get(voice[0]) if voice else None
                n['data']['stale'] = bool(selected and selected['stale'])
            result.update(generations=gens, takes=[])
        return result
    @router.post('/api/workspaces')
    async def create(request: Request):
        try:
            body = await request.json()
        except ValueError:
            body = None
        if not isinstance(body, dict) or not any(c['id'] == body.get('clientId') for c in load('clients') or []):
            return canvas.error(422, 'Choose an existing client.')
        title = body.get('title', 'Untitled workspace')
        if not isinstance(title, str) or not title.strip() or len(title) > 200:
            return canvas.error(422, 'Use a title between 1 and 200 characters.')
        rid, now = 'ws_' + uuid.uuid4().hex, int(time.time() * 1000)
        with canvas.canvas_lock, db() as conn:
            conn.execute('INSERT INTO workspaces VALUES (?,?,?,?,?)', (rid, body['clientId'], title.strip(), now, now))
            conn.execute('INSERT INTO canvases VALUES (?,?,?,?)', (rid, 1, json.dumps(EMPTY), now))
            return JSONResponse(response(conn, rid), status_code=201)
    @router.get('/api/workspaces')
    def listing(clientId: str | None = None):
        with db() as conn:
            rows = conn.execute('SELECT id,client_id,title,created_at,updated_at FROM workspaces '
                                'WHERE (? IS NULL OR client_id=?) ORDER BY updated_at DESC, id', (clientId, clientId)).fetchall()
        return {'workspaces': [metadata(r) for r in rows]}
    @router.get('/api/workspaces/{idea_id}')
    def get(idea_id: str):
        with db() as conn:
            if workspace(conn, idea_id) is None:
                return canvas.error(404, "That workspace doesn't exist.")
            return response(conn, idea_id)
    @router.put('/api/workspaces/{idea_id}')
    async def save(idea_id: str, request: Request):
        try:
            body = await request.json()
        except ValueError:
            body = None
        if not isinstance(body, dict) or type(body.get('version')) is not int:
            return canvas.error(422, 'Send the version and the canvas.')
        with canvas.canvas_lock, db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            found = workspace(conn, idea_id)
            if found is None:
                return canvas.error(404, "That workspace doesn't exist.")
            version, doc = graph(conn, idea_id)
            if version != body['version']:
                return canvas.error(409, canvas.STALE, version=version, doc=doc)
            problem = check_graph(body.get('doc'))
            if problem:
                return canvas.error(422, problem[0], code=problem[1])
            title = body.get('title', found['title'])
            if not isinstance(title, str) or not title.strip() or len(title) > 200 or ('clientId' in body and body['clientId'] != found['clientId']):
                return canvas.error(422, 'The title or client is invalid.')
            # Selected sources must belong to this scope and match the output media.
            for n in body['doc']['nodes']:
                gid = n['data'].get('selected')
                if gid is not None:
                    row = conn.execute('SELECT kind,status FROM generations WHERE id=? AND idea_id=?', (gid, idea_id)).fetchone()
                    if not row or row[0] != ('voice' if media(n) == 'audio' else media(n)) or row[1] != 'done':
                        return canvas.error(422, 'Choose a finished source from this workspace.')
                vid = n['data'].get('voiceId')
                if vid is not None and not conn.execute('SELECT 1 FROM workspace_voices WHERE idea_id=? AND voice_id=? AND node_id=?', (idea_id, vid, n['id'])).fetchone():
                    return canvas.error(422, 'Choose a voice from this workspace node.')
            now = int(time.time() * 1000)
            conn.execute('UPDATE canvases SET version=?,doc=?,updated_at=? WHERE idea_id=?', (version+1, json.dumps(body['doc']), now, idea_id))
            conn.execute('UPDATE workspaces SET title=?,updated_at=? WHERE id=?', (title.strip(), now, idea_id))
            return response(conn, idea_id, full=False)
    return router

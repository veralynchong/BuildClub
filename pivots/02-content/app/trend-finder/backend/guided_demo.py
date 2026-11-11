"""Standalone local guided editor; immutable imported media, no provider routes."""
import asyncio
import copy
import hashlib
import inspect
import json
import re
import shutil
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.concurrency import run_in_threadpool

import canvas
import editing
import generations
import renders
import takes
import workspaces

ID = re.compile(r'^[A-Za-z0-9_-]{1,80}$')
SCHEMA = (
    'CREATE TABLE IF NOT EXISTS guided_sessions (session TEXT, route TEXT, workspace TEXT UNIQUE, signature TEXT, PRIMARY KEY(session,route))',
    'CREATE TABLE IF NOT EXISTS guided_sources (workspace TEXT, source TEXT, generation TEXT UNIQUE, metadata TEXT, PRIMARY KEY(workspace,source))',
)


def error(code, message):
    return JSONResponse({'error': message}, status_code=code)


def validate_manifest(manifest, root):
    if manifest.get('version') != 1 or set(manifest.get('routes', {})) != {'ai', 'shoot'}:
        raise ValueError('Invalid guided manifest')
    specs = json.loads(json.dumps(manifest['routes']))
    for route, spec in specs.items():
        signature = hashlib.sha256(json.dumps({k: v for k, v in spec.items() if k != 'variants'}, sort_keys=True).encode()).hexdigest()
        known = {}
        for source in spec['sources'] + spec.get('variants', []):
            sid = source['id']
            if not ID.fullmatch(sid) or sid in known:
                raise ValueError('Invalid source identity')
            path = (root / source['path']).resolve(strict=True)
            if not path.is_relative_to(root) or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
                raise ValueError('Invalid source file or hash')
            info = editing._probe(path)
            if not info or info['duration'] <= 0:
                raise ValueError('Unreadable source')
            source['resolved'] = path
            source['duration'] = info['duration']
            known[sid] = source
        baseline_shots = {source['shotId'] for source in spec['sources']}
        if any(source['shotId'] not in baseline_shots for source in spec.get('variants', [])):
            raise ValueError('A variant must belong to an existing shot')
        project = spec['project']
        if editing.check_project(project, set()) or project.get('music') is not None or project.get('voiceover') or project.get('primaries'):
            raise ValueError('Invalid initial project')
        for clip in project['clips']:
            source = known.get(clip['source']['id'])
            if not source or clip['source']['kind'] != 'generation' or clip['source'].get('shotId', source['shotId']) != source['shotId'] or clip['out'] > source['duration'] + editing.EPS:
                raise ValueError('Invalid initial clip')
        spec['signature'] = signature
    return specs


def create_app(*, manifest, asset_root, state_root, jobs_factory=renders.RenderJobs, api_prefix="/api/guided/sessions"):
    root = Path(asset_root).resolve(strict=True)
    specs = validate_manifest(manifest, root)
    state = Path(state_root).resolve()
    media = state / 'media'
    media.mkdir(parents=True, exist_ok=True)
    database = state / 'guided.sqlite3'
    lock = asyncio.Lock()

    def db():
        return sqlite3.connect(database, timeout=30)

    def load(key):
        with db() as conn:
            row = conn.execute('SELECT value FROM store WHERE key=?', (key,)).fetchone()
        return json.loads(row[0]) if row else None

    with db() as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)')
        for sql in workspaces.SCHEMA + canvas.SCHEMA + takes.SCHEMA + editing.SCHEMA + generations.SCHEMA + renders.SCHEMA + SCHEMA:
            conn.execute(sql)
        renders.migrate(conn)
        conn.execute("INSERT OR IGNORE INTO store VALUES ('clients', ?)", (json.dumps([{'id': 'guided-fixture', 'name': 'Local guided example', 'brand': {}}]),))
        conn.execute("INSERT OR IGNORE INTO store VALUES ('ideas', '[]')")
    renders.recover(db, lambda: media)
    editor = editing.make_router(db, load, lambda: media, None)
    cutter = renders.make_router(db, load, lambda: media, jobs_factory=jobs_factory, register_default_media=False)
    native = {}
    for method, action, router in [('GET', 'edit', editor), ('PUT', 'edit', editor), ('GET', 'edit/sources', editor), ('POST', 'edit/export', cutter), ('GET', 'cut', cutter), ('GET', 'cut/file', cutter)]:
        native[method, action] = next(r.endpoint for r in router.routes if r.path == '/api/ideas/{idea_id}/' + action and method in r.methods)

    def binding(sid, route):
        with db() as conn:
            return conn.execute('SELECT workspace,signature FROM guided_sessions WHERE session=? AND route=?', (sid, route)).fetchone()

    def mapping(wid):
        with db() as conn:
            rows = conn.execute('SELECT source,generation,metadata FROM guided_sources WHERE workspace=?', (wid,)).fetchall()
        return {sid: (gid, json.loads(metadata)) for sid, gid, metadata in rows}

    def verify_imports(wid):
        for _alias, (_gid, metadata) in mapping(wid).items():
            path = media / wid / 'gen' / metadata['filename']
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != metadata['sha256']:
                raise ValueError('The imported source changed. Start a new guide.')

    def import_sources(conn, wid, sources):
        folder = media / wid / 'gen'
        ids = {}
        for source in sources:
            filename = source['id'] + '.mp4'
            destination = folder / filename
            shutil.copyfile(source['resolved'], destination)
            if hashlib.sha256(destination.read_bytes()).hexdigest() != source['sha256']:
                raise ValueError('Imported source hash mismatch')
            node = source.get('nodeId', 'import_' + source['id'])
            gen = generations.insert_done(conn, wid, node, 'video', 'upload', file=filename)
            ids[source['id']] = gen['id']
            metadata = {k: source[k] for k in ['shotId', 'label', 'provenance', 'sha256']}
            metadata.update(nodeId=node, filename=filename)
            conn.execute('INSERT INTO guided_sources VALUES (?,?,?,?)', (wid, source['id'], gen['id'], json.dumps(metadata)))
        return ids

    def initialize(sid, route):
        found = binding(sid, route)
        spec = specs[route]
        if found:
            if found[1] != spec['signature']:
                raise ValueError('The prepared assets changed. Start a new guide.')
            verify_imports(found[0])
            imported = mapping(found[0])
            variants = spec.get('variants', [])
            if any(source['id'] in imported and imported[source['id']][1]['sha256'] != source['sha256'] for source in variants):
                raise ValueError('The prepared variant changed. Start a new guide.')
            with db() as conn:
                import_sources(conn, found[0], [source for source in variants if source['id'] not in imported])
            return found[0]
        wid = 'ws_' + uuid.uuid4().hex
        folder = media / wid / 'gen'
        folder.mkdir(parents=True)
        now = int(time.time() * 1000)
        project = copy.deepcopy(spec['project'])
        ids = {}
        try:
            with db() as conn:
                conn.execute('INSERT INTO workspaces VALUES (?,?,?,?,?)', (wid, 'guided-fixture', f'Guided {route} imported-media example', now, now))
                ids = import_sources(conn, wid, spec['sources'] + spec.get('variants', []))
                source_specs = {item['id']: item for item in spec['sources']}
                for clip in project['clips']:
                    source_id = clip['source']['id']
                    clip['source'] = {'kind': 'generation', 'id': ids[source_id], 'shotId': source_specs[source_id]['shotId'], 'nodeId': source_specs[source_id].get('nodeId', 'import_' + source_id)}
                conn.execute('INSERT INTO edit_projects VALUES (?,?,?,?)', (wid, 1, json.dumps(project), now))
                conn.execute('INSERT INTO guided_sessions VALUES (?,?,?,?)', (sid, route, wid, spec['signature']))
        except Exception:
            shutil.rmtree(media / wid)
            raise
        return wid

    async def call(handler, *args, **kwargs):
        if inspect.iscoroutinefunction(handler):
            return await handler(*args, **kwargs)
        return await run_in_threadpool(handler, *args, **kwargs)

    def public(result, sid, route, wid):
        if isinstance(result, FileResponse):
            return result
        status = result.status_code if isinstance(result, JSONResponse) else 200
        if status >= 400:
            return result
        result = json.loads(result.body) if isinstance(result, JSONResponse) else copy.deepcopy(result)
        aliases = mapping(wid)
        reverse = {gid: sid for sid, (gid, _) in aliases.items()}
        prefix = f'{api_prefix}/{sid}/{route}'
        if 'project' in result:
            for clip in result['project']['clips']:
                clip['source']['id'] = reverse[clip['source']['id']]
        for source in result.get('sources', []):
            alias = reverse[source['id']]
            metadata = aliases[alias][1]
            source.update(id=alias, key='generation:' + alias, url=f'{prefix}/media/{alias}', shotId=metadata['shotId'], nodeId=metadata['nodeId'], label=metadata['label'], provenance=metadata['provenance'])
        if result.get('output'):
            version = result['output']['url'].partition('?')[2]
            result['output']['url'] = f'{prefix}/cut/file' + ('?' + version if version else '')
        return JSONResponse(result, status_code=status)

    @asynccontextmanager
    async def lifespan(_app):
        yield
        editing.kill_active()

    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.database = database
    app.state.media = media

    async def dispatch(request: Request, sid: str, route: str, tail: str = ''):
        try:
            if str(uuid.UUID(sid)) != sid or route not in specs:
                return error(404, 'Unknown guided session or route.')
        except ValueError:
            return error(404, 'Unknown guided session or route.')
        raw = request.scope.get('raw_path', b'')
        if b'%' in raw or b'\\' in raw or b'//' in raw:
            return error(422, 'Invalid guided path.')
        origin = request.headers.get('origin')
        if origin and origin != str(request.base_url).rstrip('/'):
            return error(403, 'Only same-origin local editing is available.')
        query = list(request.query_params.multi_items())
        if query and (tail != 'cut/file' or len({k for k, _ in query}) != len(query) or any(not (k == 'download' and v == '1' or k == 'v' and v.isdigit()) for k, v in query)):
            return error(422, 'Unsupported query.')
        async with lock:
            if tail == '' and request.method == 'POST':
                try:
                    if await request.json() != {}:
                        return error(422, 'Send an empty object.')
                    wid = initialize(sid, route)
                except (ValueError, json.JSONDecodeError) as exc:
                    return error(409, str(exc))
                project = await call(native['GET', 'edit'], wid)
                sources = await call(native['GET', 'edit/sources'], wid)
                return public({**project, **sources}, sid, route, wid)
            found = binding(sid, route)
            if not found:
                return error(404, 'Initialize this route first.')
            wid = found[0]
            if found[1] != specs[route]['signature'] and tail != 'reset':
                return error(409, 'The prepared assets changed. Start a new guide.')
            if tail == 'reset' and request.method == 'POST':
                try:
                    if await request.json() != {}:
                        return error(422, 'Send an empty object.')
                except ValueError:
                    return error(422, 'Send an empty object.')
                with db() as conn:
                    row = conn.execute('SELECT status FROM renders WHERE idea_id=?', (wid,)).fetchone()
                    if row and row[0] in renders.ACTIVE:
                        return error(409, 'Wait for the current export to finish.')
                    for table in ['edit_projects', 'generations', 'canvases', 'workspace_voices', 'takes', 'cut_music', 'cut_reviews', 'renders']:
                        conn.execute(f'DELETE FROM {table} WHERE idea_id=?', (wid,))
                    conn.execute('DELETE FROM guided_sources WHERE workspace=?', (wid,))
                    conn.execute('DELETE FROM guided_sessions WHERE session=? AND route=?', (sid, route))
                    conn.execute('DELETE FROM workspaces WHERE id=?', (wid,))
                shutil.rmtree(media / wid)
                wid = initialize(sid, route)
                project = await call(native['GET', 'edit'], wid)
                sources = await call(native['GET', 'edit/sources'], wid)
                return public({**project, **sources}, sid, route, wid)
            aliases = mapping(wid)
            if request.method == 'GET' and tail.startswith('media/'):
                source = aliases.get(tail.removeprefix('media/'))
                if not source:
                    return error(404, 'Unknown source.')
                path = media / wid / 'gen' / source[1]['filename']
                if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != source[1]['sha256']:
                    return error(409, 'The imported source changed.')
                return FileResponse(path, media_type='video/mp4')
            handler = native.get((request.method, tail))
            if not handler:
                return error(405, 'This operation is unavailable in the local guided editor.')
            if tail == 'edit' and request.method == 'PUT':
                if len(await request.body()) > editing.MAX_BYTES:
                    return error(413, 'Project too large.')
                try:
                    body = await request.json()
                    project = body['project']
                    if set(body) != {'version', 'project'} or type(body['version']) is not int or editing.check_project(project, set()) or project.get('primaries') or project.get('voiceover') or project.get('music') is not None:
                        return error(422, 'Invalid guided project.')
                    for clip in project['clips']:
                        source = clip['source']
                        if source['kind'] != 'generation' or source['id'] not in aliases or set(source) - {'kind', 'id', 'shotId', 'nodeId'}:
                            return error(422, 'Unknown guided clip source.')
                        gid, meta = aliases[source['id']]
                        if source.get('shotId', meta['shotId']) != meta['shotId'] or source.get('nodeId', meta['nodeId']) != meta['nodeId']:
                            return error(422, 'The source belongs to another shot.')
                        clip['source'] = {'kind': 'generation', 'id': gid, 'nodeId': meta['nodeId'], 'shotId': meta['shotId']}
                    request._json = body
                except (ValueError, KeyError, TypeError):
                    return error(422, 'Invalid guided project.')
                result = await call(handler, wid, request)
            elif tail == 'cut/file':
                result = await call(handler, wid, download=int(request.query_params.get('download', '0')))
            else:
                if tail == 'edit/export':
                    try:
                        verify_imports(wid)
                    except ValueError as exc:
                        return error(409, str(exc))
                result = await call(handler, wid)
            return public(result, sid, route, wid)

    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
    base = api_prefix + '/{sid}/{route}'
    app.add_api_route(base, dispatch, methods=methods)
    app.add_api_route(base + '/{tail:path}', dispatch, methods=methods)
    return app


def attach_editors(app, *, fresh_assets, full_assets, state_root, jobs_factory=renders.RenderJobs):
    """Expose only isolated, provider-free guided routes beside a native account-based app."""
    editors = []
    for name, assets, prefix in [('fresh', fresh_assets, '/api/guided/sessions'),
                                  ('full', full_assets, '/api/guided/full/sessions')]:
        assets = Path(assets).resolve(strict=True)
        manifest = json.loads((assets / 'manifest.json').read_text())
        editor = create_app(manifest=manifest, asset_root=assets, state_root=Path(state_root) / name,
                            jobs_factory=jobs_factory, api_prefix=prefix)
        editors.append((prefix, editor))
    for _prefix, editor in editors:
        app.include_router(editor.router)
    app.state.guided_editor_prefixes = tuple(prefix + '/' for prefix, _editor in editors)

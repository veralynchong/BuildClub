"""Isolated fresh-batch app. Start with an already loaded process environment only."""
import argparse
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import sys
from contextlib import asynccontextmanager
from datetime import date

APP = Path(__file__).resolve().parents[1] / 'pivots/02-content/app/trend-finder'
BATCH = Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')
WORKER_BRIDGE = Path('/Users/tommy/orca/workspaces/BuildClub/fresh-canvas-binding/bin')


def bridge_directory(directory=None):
    local = Path(directory) if directory is not None else Path(__file__).resolve().parent
    return local if (local / 'fresh_canvas_binding.py').is_file() else WORKER_BRIDGE


BRIDGE = bridge_directory()
IDEA = 'evergreen-fresh-ai-21'
CLIENT = 'evergreen-fresh-ai'
CAPS = {'fal': 4, 'openrouter': 3, 'total': 7}


def clean_environment():
    """No dotenv, shell startup file, or other provider credentials reach the app."""
    keep = {k: os.environ[k] for k in ('PATH', 'HOME', 'FAL_KEY', 'OPENROUTER_API_KEY') if k in os.environ}
    os.environ.clear()
    os.environ.update(keep, BUILDCLUB_OFFLINE_VERIFY='1', PYTHONDONTWRITEBYTECODE='1')
    sys.dont_write_bytecode = True


def catalog():
    from fresh_canvas_binding import SEED, HAILUO, VEO
    return [dict(id=mid, label=label, provider=provider, kind=kind, endpoint=endpoint,
                 tier='cheap' if provider == 'fal' else 'balanced', priceCheckedAt='2026-11-06',
                 inputs={'text': 'required', 'reference': 'none', 'startFrame': start},
                 aspects=['9:16'], maxCount=1, maxRefs=0,
                 price={'usd': price, 'per': unit}, **({'durations': [duration]} if duration else {}))
            for mid, label, provider, kind, endpoint, start, price, unit, duration in (
                ('seedream-4.5', 'Seedream 4.5', 'fal', 'image', SEED, 'none', .04, 'image', None),
                ('hailuo-2.3-fast', 'Hailuo 2.3 Fast', 'fal', 'video', HAILUO, 'required', .19 / 6, 'second', 6),
                ('veo-lite-openrouter', 'Veo Lite - OpenRouter', 'openrouter', 'video', VEO, 'required', .05, 'second', 4))]


def snapshot(state):
    path = state / 'frozen-plan.json'
    if not path.exists():
        source = json.loads((BATCH / 'fresh-plan.json').read_text())
        fields = ('shotId', 'action', 'timelineFrames', 'imagePrompt', 'imageInputs', 'imageProvider',
                  'imageModel', 'videoPrompt', 'videoProvider', 'videoModel', 'duration')
        plan = {'shots': [{k: s[k] for k in fields} for s in source['shots']],
                'fps': source['fps'], 'timelineFrames': source['timelineFrames'], 'caps': CAPS}
        with path.open('x') as stream:
            json.dump(plan, stream, indent=2)
    plan = json.loads(path.read_text())
    if plan['caps'] != CAPS or plan['fps'] != 30 or plan['timelineFrames'] != 315:
        raise ValueError('frozen plan differs from approval')
    return plan


def seed(server, plan):
    from models import Client, SavedIdea, Shot, Library, PlanScript, ScriptLine
    if server.load('ideas') is None:
        elapsed, shots = 0, []
        for s in plan['shots']:
            end = elapsed + s['timelineFrames']
            shots.append(Shot(id=s['shotId'], time=f'{elapsed / plan["fps"]:.3f}-{end / plan["fps"]:.3f}s',
                              shot=s['action'], line=''))
            elapsed = end
        if elapsed != plan['timelineFrames']:
            raise ValueError('shot timeline differs')
        server.save('clients', [Client(id=CLIENT, name='Ever Green', niche='Silken tofu', audience='Home cooks',
                                      monthlyTarget=1, examples=[], cannot=[])])
        script = PlanScript(lines=[ScriptLine(say='', onScreen=('Turn tofu into...' if i < 13 else
                           'Healthy & high protein okonomiyaki' if i < 18 else
                           'Want the full recipe? Comment "RECIPE" below!')) for i in range(21)],
                            basedOn='Fresh text-only setup', writtenAt=0)
        server.save('ideas', [SavedIdea(id=IDEA, videoId=IDEA, clientId=CLIENT, status='approved', dueDate=date.today().isoformat(),
                    notes='Synthetic QA setup approval only; not human approval of the final cut.', shots=shots, script=script)])
        server.save('library', Library(videos=[{'id': IDEA, 'title': 'Ever Green fresh AI remake',
                    'url': 'https://www.instagram.com/reel/DVp3xOdFaHL/', 'cover': '',
                    'researchSourceOnly': True, 'platform': 'instagram', 'handle': 'Ever Green',
                    'hook': 'Fresh silken tofu advertisement', 'views': 0, 'followers': 0, 'medianViews': None,
                    'daysAgo': 0, 'lengthSec': 10.5, 'shares': 0, 'saves': None, 'formatId': IDEA, 'keywords': []}],
                    formats=[{'id': IDEA, 'name': 'Fresh tofu remake', 'short': 'Tofu advertisement',
                    'tags': [], 'audiences': [], 'summary': 'New text-only AI scenes',
                    'why': {'hook': '', 'first3s': '', 'length': '', 'format': '', 'sound': ''},
                    'shotList': [s.model_dump(exclude_none=True) for s in shots], 'props': [], 'needs': [],
                    'effort': 'medium', 'editorNotes': 'Synthetic QA setup, not human approval.'}]))
    with server.db() as conn:
        if not server.auth.has_users(conn):
            server.auth.create_user(conn, 'test@example.com', 'Synthetic QA', 'Local QA', 'pw-for-e2e')


def prepare_render(state):
    root = state / 'render-app'
    if not root.exists():
        root.mkdir()
        for name in ('render', 'public', 'src'):
            shutil.copytree(APP / name, root / name)
        for name in ('package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json'):
            if (APP / name).exists():
                shutil.copy2(APP / name, root / name)
        (root / 'node_modules').symlink_to(APP / 'node_modules', target_is_directory=True)
    return root


def build_app(state, mode, engine=None, frontend=None, render_enabled=False):
    """Build one app per process; an injected offline engine supports network-free tests."""
    if mode not in ('offline', 'live'):
        raise ValueError('mode must be offline or live')
    clean_environment()
    state = Path(state).absolute()
    # Never let a caller point this launcher at either shared batch or application storage.
    if state.is_symlink() or state.resolve().is_relative_to(BATCH.resolve()) or state.resolve().is_relative_to(APP.parents[3].resolve()) or state.resolve().is_relative_to(WORKER_BRIDGE.parent.resolve()):
        raise ValueError('state must be isolated')
    state.mkdir(parents=True, exist_ok=True)
    for p in state.rglob('*'):
        if p.is_symlink() and p != state / 'render-app' / 'node_modules':
            raise ValueError('state contains a symlink')
    for p in (APP / 'backend', BATCH, BRIDGE):
        sys.path.insert(0, str(p))
    from fixed_runtime import FixedEngine
    from provider_transport import ProviderTransport
    from fresh_canvas_binding import BindingAdapter
    import generations
    import gen_providers
    plan = snapshot(state)
    if engine is None:
        def blocked(*args, **kwargs):
            raise ValueError('offline transport cannot submit')
        engine = FixedEngine(state / 'engine', ProviderTransport() if mode == 'live' else blocked, mode=mode)
    if not isinstance(engine, FixedEngine) or engine.mode != mode:
        raise ValueError('only an approved FixedEngine is accepted')
    spec = importlib.util.spec_from_file_location('fresh_server_instance', APP / 'backend' / 'server.py')
    server = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(server)
    for attr, relative in {'DB_PATH': 'data.db', 'MEDIA_DIR': 'media', 'DIST_DIR': 'dist', 'CACHE_DIR': 'cache',
                           'PINNED_DIR': 'pinned', 'COVERS_DIR': 'covers', 'PINNED_COVERS_DIR': 'pinned/covers'}.items():
        setattr(server, attr, state / relative)
        if attr != 'DB_PATH':
            (state / relative).mkdir(parents=True, exist_ok=True)
    if frontend is not None:
        server.DIST_DIR = Path(frontend).absolute()
    server.analyze.JOBS_DIR = state / 'jobs'
    server.channels.CHANNELS_DIR = state / 'channels'
    for name in ('DAILY_APIFY_USD', 'DAILY_CLAUDE_USD', 'DAILY_GEN_VOICE_USD', 'DAILY_JEV_USD', 'DAILY_SCRAPECREATORS_CREDITS',
                 'MAX_USD_PER_SEARCH', 'MAX_USD_PER_MEDIANS'):
        setattr(server, name, 0)
    server.CHANNEL_CAPS = {'claude': 0, 'jev': 0, 'scrapecreators': 0}
    server.DAILY_GEN_IMAGE_USD, server.DAILY_GEN_VIDEO_USD = .96, 5.40
    server.editing.APP_DIR = prepare_render(state) if render_enabled else state / 'render-disabled'
    seed(server, plan)
    generations.load_models = lambda: copy.deepcopy(catalog())
    binding = BindingAdapter(server.db, server.MEDIA_DIR, engine, plan, IDEA, gen_providers)

    def adapter(provider, *args, **kwargs):
        if provider not in ('fal', 'openrouter'):
            raise ValueError('unapproved provider')
        return binding
    gen_providers.adapter_for = adapter
    original_run = server.gen_jobs.run

    def run(gid):
        with binding.for_generation(gid):
            return original_run(gid)
    server.gen_jobs.run = run
    app = server.app
    app.state.generation_enabled = False
    app.state.server, app.state.engine, app.state.binding = server, engine, binding

    @asynccontextmanager
    async def lifespan(_app):
        if app.state.generation_enabled:
            generations.recover(server.db, server.gen_jobs)
        server.renders.recover(server.db)
        if render_enabled:
            server.editing.prewarm_bundle()
        try:
            yield
        finally:
            server.editing.kill_active()
    app.router.lifespan_context = lifespan

    from fastapi.responses import JSONResponse
    from fastapi.routing import APIRoute

    async def status(request: server.Request):
        if request.client and request.client.host not in ('127.0.0.1', '::1', 'testclient'):
            return JSONResponse({'error': 'loopback only'}, status_code=403)
        with engine.lock():
            data = engine.read()
        return JSONResponse({'mode': mode, 'generationEnabled': app.state.generation_enabled,
            'keys': {'fal': bool(os.environ.get('FAL_KEY')), 'openrouter': bool(os.environ.get('OPENROUTER_API_KEY'))},
            'approvedCaps': CAPS, 'ledger': {k: data.get(k) for k in ('reserved', 'categories', 'halted')},
            'requests': len(data.get('requests', []))})
    app.router.routes.insert(0, APIRoute('/api/batch/status', status, methods=['GET']))
    server.PUBLIC_API += ('/api/batch/status',)

    @app.middleware('http')
    async def fresh_policy(request, call_next):
        path, method = request.url.path, request.method
        # An allowlist closes all paid helpers, including future ones, before their route executes.
        if path.startswith('/api/'):
            safe = path in ('/api/health', '/api/stats', '/api/batch/status', '/api/auth/config',
                            '/api/auth/login', '/api/auth/logout', '/api/auth/me', '/api/gen/models', '/api/gen/budget',
                            '/api/clients', '/api/ideas', '/api/library')
            safe = safe or (path == '/api/share' and method == 'POST')
            safe = safe or (path == '/api/production' and method == 'GET')
            review = path.split('/')
            if method == 'GET' and len(review) >= 4 and review[1:3] == ['api', 'review'] and review[3]:
                safe = safe or len(review) == 4 or (len(review) == 7 and review[4:] == ['cuts', IDEA, 'file'])
            safe = safe or (path.startswith(f'/api/ideas/{IDEA}/') and
                   any(path == f'/api/ideas/{IDEA}/{s}' or path.startswith(f'/api/ideas/{IDEA}/{s}/')
                       for s in ('canvas', 'gen', 'edit', 'cut')))
            if path.startswith(f'/api/ideas/{IDEA}/edit/') and method != 'GET':
                safe = path == f'/api/ideas/{IDEA}/edit/export' and render_enabled
            if '/voice' in path:
                safe = method == 'GET' and safe
            safe = safe or (path == '/api/search' and method == 'GET' and request.query_params.get('cachedOnly') == '1')
            if not safe:
                return JSONResponse({'error': 'Helper disabled for approved fresh batch'}, status_code=403)
            if method == 'POST' and '/gen' in path:
                if not app.state.generation_enabled or path != f'/api/ideas/{IDEA}/gen':
                    return JSONResponse({'error': 'Generation locked'}, status_code=403)
            if not render_enabled and method == 'POST' and ('/cut' in path or '/export' in path):
                return JSONResponse({'error': 'Renderer disabled'}, status_code=403)
        return await call_next(request)
    return app


def check_ports(ports):
    if len(set(ports)) != len(ports) or any(p in (8982, 8983, 8984) or not 1024 <= p <= 65535 for p in ports):
        raise ValueError('unsafe or duplicate ports')
    held = []
    try:
        for port in ports:
            sock = socket.socket()
            held.append(sock)
            sock.bind(('127.0.0.1', port))
    finally:
        for sock in held:
            sock.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', type=Path, required=True)
    parser.add_argument('--mode', choices=['offline', 'live'], default='offline')
    parser.add_argument('--enable-generation', action='store_true')
    parser.add_argument('--enable-render', action='store_true')
    parser.add_argument('--browser-executable', type=Path)
    parser.add_argument('--port', type=int, default=8978)
    parser.add_argument('--renderer-port', type=int, default=8979)
    parser.add_argument('--media-port', type=int, default=8980)
    args = parser.parse_args()
    check_ports([args.port, args.renderer_port, args.media_port])
    if args.enable_render and (not args.browser_executable or not args.browser_executable.is_file()):
        parser.error('--enable-render requires an existing --browser-executable (no download)')
    app = build_app(args.state, args.mode, render_enabled=args.enable_render)
    os.environ.update(REMOTION_PORT=str(args.renderer_port), REMOTION_MEDIA_PORT=str(args.media_port))
    if args.browser_executable:
        os.environ['REMOTION_BROWSER_EXECUTABLE'] = str(args.browser_executable.absolute())
    if not (args.state / 'dist' / 'index.html').exists() and (APP / 'dist' / 'index.html').exists():
        shutil.copytree(APP / 'dist', args.state / 'dist', dirs_exist_ok=True)
    app.state.generation_enabled = args.enable_generation
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=args.port)


if __name__ == '__main__':
    main()

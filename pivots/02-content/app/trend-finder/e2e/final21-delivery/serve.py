"""Root-only foreground launcher; worker never runs this file.

CLI: EXISTING_VENV/bin/python -B serve.py --state NEW_SIBLING --prepare
Then same command without --prepare under owned Popen + test-slot (8978/8979/8980).
Stop only that owned Popen via terminate(), wait(), then release its lease.
Restart: same state and command, never --prepare; run ui.cjs --restart-check after.
No dotenv, provider credentials, generation, helper LLM or browser download.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import subprocess
import uuid

APP = Path('/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder')
B = Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')
IDEA = 'evergreen-fresh-ai-21'
P = '/api/ideas/' + IDEA
BINARY = APP / 'node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'


def allowed(method, path):
    if method in ('GET', 'HEAD'):
        if not path.startswith('/api/'):
            return True
        import re
        return bool(path in ('/api/health', '/api/batch/status', '/api/auth/config', '/api/auth/me', '/api/clients', '/api/ideas', '/api/library', '/api/production', '/api/stats', '/api/gen/models', '/api/gen/budget') or
                    re.fullmatch(r'/api/review/[^/]+(?:/cuts/' + IDEA + r'/file)?', path) or
                    path.startswith(P + '/') and re.match(r'(canvas|gen|takes|edit|cut)(/|$)', path[len(P) + 1:]))
    if method == 'PUT':
        return path == P + '/edit'
    return method == 'POST' and path in ('/api/auth/login', '/api/auth/logout', '/api/share', P + '/shots/0/takes', P + '/edit/export', P + '/cut/review')


def render_source(source):
    if source.count('await ensureBrowser()') != 2:
        raise ValueError('Renderer changed: inspect before patching private copy')
    source = source.replace("  const { ensureBrowser, renderMedia, selectComposition }", "  const denyDownload = () => { throw new Error('Browser download forbidden'); };\n  const existing = process.env.REMOTION_BROWSER_EXECUTABLE;\n  if (!existing || !existsSync(existing)) throw new Error('Existing browser required');\n  const { ensureBrowser, renderMedia, selectComposition }")
    source = source.replace('await ensureBrowser()', 'await ensureBrowser({browserExecutable: existing, onBrowserDownload: denyDownload})')
    source = source.replace("id: 'Reel', inputProps, port: PORT, browserExecutable", "id: 'Reel', inputProps, port: PORT, browserExecutable, onBrowserDownload: denyDownload")
    source = source.replace('composition, serveUrl, inputProps, port: PORT, browserExecutable,', 'composition, serveUrl, inputProps, port: PORT, browserExecutable, onBrowserDownload: denyDownload,')
    source = source.replace("'Access-Control-Allow-Origin': '*'", "'Access-Control-Allow-Origin': 'http://127.0.0.1:8979'")
    return source


def patch_render(root):
    f = root / 'render/render-reel.mjs'
    f.write_text(render_source(f.read_text()))


def delivery_environment(delivery_user_home, private_tmp):
    return dict(PATH='/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
                HOME=delivery_user_home, TMPDIR=str(private_tmp),
                BUILDCLUB_OFFLINE_VERIFY='1', PYTHONDONTWRITEBYTECODE='1')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', required=True, type=Path)
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    # Preserve the real user home; private state and temporary paths are explicit.
    delivery_user_home = str(Path.home())
    os.environ.clear()
    state = args.state.absolute()
    if state.is_symlink() or not state.is_absolute() or state.parent != B.parent or not state.name.startswith('fresh-ai-final-review-'):
        raise ValueError('Use a dedicated sibling fresh-ai-final-review-* state')
    os.environ.update(delivery_environment(delivery_user_home, state / 'tmp'))
    if not BINARY.is_file():
        raise ValueError('Existing Remotion executable required; download forbidden')
    sys.dont_write_bytecode = True
    if args.prepare:
        state.mkdir()  # Nonempty/reused state must never be overwritten by preparation.
    elif not (state / 'delivery-private-ready.json').is_file():
        raise ValueError('Run explicit --prepare first')
    (state / 'tmp').mkdir(exist_ok=True)
    for directory in (B, APP / 'backend'):
        sys.path.insert(0, str(directory))
    if args.prepare:
        # Copy server source privately; imports still use read-only B bridge/runtime.
        shutil.copy2(B / 'serve_fresh.py', state / 'serve_private.py')
    spec = importlib.util.spec_from_file_location('delivery_private', state / 'serve_private.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.BRIDGE = B
    if args.prepare:
        render = module.prepare_render(state)
        patch_render(render)
        script = "import {build} from " + json.dumps(str(APP / 'node_modules/vite/dist/node/index.js')) + "; await build({root:" + json.dumps(str(APP)) + ",envFile:false,build:{outDir:" + json.dumps(str(state / 'dist')) + ",emptyOutDir:false}});"
        subprocess.run(['node', '--input-type=module', '-e', script], env=dict(os.environ), check=True)
        (state / 'delivery-private-ready.json').write_text(json.dumps({'scope': 'Prepared AI assets, generation permanently disabled', 'app': str(APP), 'ports': [8978, 8979, 8980], 'humanApproval': None}))
        print('PREPARED private frontend/render copy; no service started')
        return
    from fixed_runtime import FixedEngine

    def blocked(*_args, **_kwargs):
        raise RuntimeError('Generation permanently disabled in final delivery')

    engine = FixedEngine(state / 'engine', blocked, mode='offline')
    app = module.build_app(state, 'offline', engine=engine, frontend=state / 'dist', render_enabled=True)
    # Replace only the copied batch policy, which intentionally lacks take uploads.
    old = [m for m in app.user_middleware if getattr(m, 'kwargs', {}).get('dispatch', None) and m.kwargs['dispatch'].__name__ == 'fresh_policy']
    if len(old) != 1:
        raise ValueError('Private policy shape changed; fail closed')
    app.user_middleware.remove(old[0])
    from fastapi.responses import JSONResponse
    from fastapi.routing import APIRoute

    boot_id = str(uuid.uuid4())

    async def status(_request):
        return JSONResponse({'scope': 'final21-prepared-review', 'generationEnabled': False, 'mode': 'offline', 'state': str(state), 'bootId': boot_id, 'pid': os.getpid(), 'humanApproval': None})
    app.router.routes.insert(0, APIRoute('/api/batch/status', status, methods=['GET']))

    @app.middleware('http')
    async def delivery_policy(request, call_next):
        origin = request.headers.get('origin')
        if request.client and request.client.host not in ('127.0.0.1', '::1', 'testclient') or origin and origin not in ('http://127.0.0.1:8978', 'http://127.0.0.1:8979', 'http://127.0.0.1:8980') or not allowed(request.method, request.url.path):
            return JSONResponse({'error': 'Final delivery route disabled'}, status_code=403)
        app.state.generation_enabled = False
        return await call_next(request)

    # build_app cleans the environment; restore private tmp and ports before lifespan.
    os.environ.update(delivery_environment(delivery_user_home, state / 'tmp'))
    os.environ.update(REMOTION_PORT='8979', REMOTION_MEDIA_PORT='8980', REMOTION_BROWSER_EXECUTABLE=str(BINARY))
    print('PREPARED AI ASSET REVIEW — NO GENERATION — HUMAN REVIEW WAITING', flush=True)
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8978)


if __name__ == '__main__':
    main()

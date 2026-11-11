"""OFFLINE ENGINEERING TEST only: foreground loopback server, never an AI ad.

Run with the existing backend .venv Python and --state /absolute/sibling-state.
No live switch, credential loading, provider transport, or dependency download.
The supervisor owns this process and terminates only its Popen process group.
"""
import argparse
import importlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid

APP = Path('/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder')
BATCH = Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')


def clean_environment(state):
    # An allowlist drops every inherited credential without reading its value.
    os.environ.clear()
    os.environ.update(PATH='/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
                      HOME=str(state), TMPDIR=str(state / 'tmp'),
                      BUILDCLUB_OFFLINE_VERIFY='1', PYTHONDONTWRITEBYTECODE='1')
    sys.dont_write_bytecode = True


class FakeTransport:
    """Local lavfi fixtures; neither network URLs nor source movie frames are consumed."""
    def __init__(self, state):
        self.root = state / 'fixtures'
        self.root.mkdir()

    def __call__(self, kind, body, first):
        if kind not in ('image', 'video'):
            raise ValueError('offline fixture kind rejected')
        fixture = self.root / (uuid.uuid4().hex + ('.png' if kind == 'image' else '.mp4'))
        command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-n',
                   '-f', 'lavfi', '-i', 'testsrc=size=360x640:rate=30']
        if kind == 'image':
            if first is not None:
                raise ValueError('offline image must be text-only')
            command += ['-frames:v', '1', str(fixture)]
        else:
            duration = 6 if body.get('model') == 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video' else 4
            if not first or body.get('duration') not in (str(duration), duration):
                raise ValueError('offline video requires a bound first image and fixed duration')
            command += ['-t', str(duration), '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                        '-metadata', 'comment=OFFLINE ENGINEERING TEST - SYNTHETIC TESTSRC', str(fixture)]
        subprocess.run(command, check=True, timeout=60, capture_output=True)
        fixture.with_suffix(fixture.suffix + '.json').write_text(json.dumps({
            'offlineSimulation': True, 'disclosure': 'OFFLINE ENGINEERING TEST; lavfi testsrc; not AI advertising',
            'model': body['model'], 'source': 'local ffmpeg lavfi testsrc', 'actualUsd': 0}, indent=2))
        return {'providerRequestId': 'OFFLINE-TEST-' + fixture.stem, 'data': fixture.read_bytes(), 'actualUsd': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', type=Path, required=True)
    parser.add_argument('--port', type=int, choices=[8978], default=8978)
    parser.add_argument('--renderer-port', type=int, choices=[8979], default=8979)
    parser.add_argument('--media-port', type=int, choices=[8980], default=8980)
    args = parser.parse_args()
    state = args.state.absolute()
    # Fresh sibling only: refuse all existing state, symlinks, repository and batch paths.
    if state.parent.resolve() != BATCH.parent.resolve() or state.exists() or state.is_symlink() or state.name in (BATCH.name, 'batch-20261106'):
        parser.error('--state must be a NEW sibling of the fresh batch, never a batch or existing state')
    state.mkdir()
    (state / 'tmp').mkdir()
    clean_environment(state)
    for executable in ('ffmpeg', 'ffprobe', 'node'):
        if not shutil.which(executable):
            parser.error('missing existing executable: ' + executable)
    candidates = [p for p in (APP / 'node_modules/.remotion/chrome-headless-shell').rglob('chrome-headless-shell') if p.is_file() and os.access(p, os.X_OK)]
    if len(candidates) != 1 or not (APP / 'dist/index.html').is_file():
        parser.error('one existing Remotion browser and existing APP/dist required; no download/build')
    browser = candidates[0]
    shutil.copytree(APP / 'dist', state / 'dist')
    sys.path.insert(0, str(BATCH))
    serve = importlib.import_module('serve_fresh')
    from fixed_runtime import FixedEngine
    serve.check_ports([args.port, args.renderer_port, args.media_port])
    engine = FixedEngine(state / 'engine', FakeTransport(state), mode='offline')
    app = serve.build_app(state, 'offline', engine=engine, frontend=state / 'dist', render_enabled=True)
    if app.state.engine is not engine or engine.mode != 'offline' or type(engine.transport) is not FakeTransport:
        raise RuntimeError('OFFLINE engine identity mismatch')
    # build_app cleans env: configure before uvicorn enters the render lifespan.
    os.environ.update(HOME=str(state), TMPDIR=str(state / 'tmp'), REMOTION_PORT=str(args.renderer_port),
                      REMOTION_MEDIA_PORT=str(args.media_port), REMOTION_BROWSER_EXECUTABLE=str(browser))
    import generations
    original_catalog = generations.load_models
    generations.load_models = lambda: [{**m, 'label': 'OFFLINE TEST ' + m['label']} for m in original_catalog()]
    generations.is_available = lambda model: model.get('id') in ('seedream-4.5', 'hailuo-2.3-fast', 'veo-lite-openrouter')
    app.state.generation_enabled = True
    (state / 'OFFLINE-TEST.json').write_text(json.dumps({'mode': 'offline', 'paidUsd': 0,
        'disclosure': 'OFFLINE ENGINEERING TEST; synthetic testsrc; not AI advertising',
        'browser': str(browser), 'ports': [8978, 8979, 8980]}, indent=2))
    print('OFFLINE ENGINEERING TEST — synthetic testsrc, $0, NOT AN AI ADVERTISEMENT', flush=True)
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=args.port)


if __name__ == '__main__':
    main()

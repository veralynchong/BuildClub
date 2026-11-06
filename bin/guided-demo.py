#!/usr/bin/env python3
"""Run a prepared six-shot demo with real isolated local editing and export."""
import argparse
import json
import os
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', required=True, type=Path)
    parser.add_argument('--dist', required=True, type=Path)
    parser.add_argument('--port', type=int, default=8996)
    parser.add_argument('--render-port', type=int, default=8997)
    args = parser.parse_args()
    app_dir = Path(__file__).resolve().parents[1] / 'pivots/02-content/app/trend-finder'
    assets = app_dir / 'public/demo-assets/fresh-six'
    browser = app_dir / 'node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'
    if not browser.is_file():
        parser.error('The existing Remotion browser is required; no download is performed.')
    if not (args.dist / 'index.html').is_file():
        parser.error('Build the isolated frontend first.')
    state = args.state.absolute()
    if state.is_symlink():
        parser.error('The state directory cannot be a symlink.')
    state.mkdir(parents=True, exist_ok=True)
    user_home = str(Path.home())
    os.environ.clear()
    os.environ.update(PATH='/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', HOME=user_home,
                      PYTHONDONTWRITEBYTECODE='1', REMOTION_BROWSER_EXECUTABLE=str(browser.resolve()),
                      REMOTION_CACHE_DIR=str(state / 'render-cache'), REMOTION_PORT=str(args.render_port))
    sys.path.insert(0, str(app_dir / 'backend'))
    import uvicorn
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles
    from guided_demo import create_app
    app = create_app(manifest=json.loads((assets / 'manifest.json').read_text()), asset_root=assets, state_root=state)

    @app.get('/api/guided/status')
    def status():
        return {'mode': 'prepared-local-export', 'generationEnabled': False, 'pid': os.getpid()}

    @app.get('/')
    def index():
        return FileResponse(args.dist / 'index.html')

    app.mount('/', StaticFiles(directory=args.dist, html=True), name='frontend')
    uvicorn.run(app, host='127.0.0.1', port=args.port, log_level='warning')


if __name__ == '__main__':
    main()

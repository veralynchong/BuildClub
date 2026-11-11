"""Root-only launcher: bootstrap new sibling state, then serve under an owned test-slot."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sqlite3
import sys
import time
from decimal import Decimal
from contextlib import closing
sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_engine import B, HERE, SHOTS, RepairEngine, BaseHold, check_state, manifest, safe, require

IDEA = 'evergreen-repair-pilot-3'
CLIENT = 'evergreen-repair-pilot'
PORTS = (8990, 8991, 8992)


def skeleton(plan):
    nodes, edges = [], []
    for i, f in enumerate(plan['shots']):
        shot = f['shotId']; y = i * 1000
        nodes.append(dict(id='n_shot_' + shot, type='shot', shotId=shot, position=dict(x=-100, y=y), data=dict(removed=False)))
        if shot in SHOTS:
            nid = 'n_sb_' + shot
            nodes.append(dict(id=nid, type='storyboard', shotId=shot, position=dict(x=450, y=y), data=dict(primary=True, model='seedream-4.5', prompt=f['imagePrompt'], shotTextOff=True, aspectRatio='9:16', count=1, selected=None)))
            edges.append(dict(id='e_' + shot, source='n_shot_' + shot, sourceHandle='out', target=nid, targetHandle='in:text'))
    return dict(nodes=nodes, edges=edges, viewport=dict(x=0, y=0, zoom=.75))


def bootstrap():
    m = manifest(); state = Path(m['repairState'])
    with BaseHold(m):
        safe(state).mkdir(mode=0o700, exist_ok=False)
        for name, blob in [('repair-manifest.json', (HERE / 'manifest.json').read_bytes()), ('frozen-plan.json', (HERE / 'repair-plan.json').read_bytes())]:
            with (state / name).open('xb') as f:
                f.write(blob); f.flush(); os.fsync(f.fileno())
    return state


def native_gate(state, engine):
    if not (state / 'data.db').exists():
        with engine.lock(): require(not engine.read()['requests'], 'missing native DB with engine receipts')
        return
    with engine.lock():
        ledger = engine.read()
        require(not ledger['halted'] and all(r['state'] == 'done' for r in ledger['requests']), 'unresolved repair; do not restart recovery')
        with closing(sqlite3.connect('file:' + str(safe(state / 'data.db')) + '?mode=ro', uri=True)) as conn:
            conn.row_factory = sqlite3.Row
            gs = [dict(r) for r in conn.execute('SELECT * FROM generations')]
            bs = [dict(r) for r in conn.execute('SELECT * FROM batch_bindings')]
            require(all(g['status'] == 'done' for g in gs) and len(gs) == len(bs) == len(ledger['requests']), 'native pending or unbound repair rows')
            for g in gs:
                b = next((b for b in bs if b['gid'] == g['id']), None)
                require(b is not None and b['shot'] in SHOTS and b['asset'] in ledger['assets'] and g['provider_request_id'] == b['asset'] and g['idea_id'] == IDEA, 'foreign native repair receipt')


def build(engine, frontend=None):
    state = Path(engine.approved['repairState']); plan = check_state(state, engine.approved)
    native_gate(state, engine)
    spec = importlib.util.spec_from_file_location('isolated_repair_server', B / 'serve_fresh.py')
    fresh = importlib.util.module_from_spec(spec); spec.loader.exec_module(fresh)
    if engine.mode == 'offline':
        # Fake-only app tests never inspect inherited provider credentials.
        fresh.clean_environment = lambda: os.environ.__setitem__('BUILDCLUB_OFFLINE_VERIFY', '1')
    fresh.IDEA, fresh.CLIENT = IDEA, CLIENT
    fresh.snapshot = lambda location: check_state(Path(location), engine.approved)
    original_catalog = fresh.catalog
    fresh.catalog = lambda: [m for m in original_catalog() if m['id'] == 'seedream-4.5']
    app = fresh.build_app(state, engine.mode, engine=engine, frontend=frontend, render_enabled=False)
    server = app.state.server
    # Fresh native case: retain all 21 shot headers but only three runnable image nodes.
    with server.db() as conn:
        row = conn.execute('SELECT doc FROM canvases WHERE idea_id=?', (IDEA,)).fetchone()
        if row is None:
            conn.execute('INSERT INTO canvases (idea_id,version,doc,updated_at) VALUES (?,?,?,?)', (IDEA, 0, json.dumps(skeleton(plan)), int(time.time() * 1000)))
    from fastapi.responses import JSONResponse
    @app.middleware('http')
    async def repair_policy(request, call_next):
        path = request.url.path
        if request.method == 'POST' and path == '/api/ideas/' + IDEA + '/gen':
            body = await request.json()
            allowed = body.get('nodeId') in {'n_sb_' + shot for shot in SHOTS} and body.get('model') == 'seedream-4.5'
            if not allowed:
                return JSONResponse({'error': 'Only the three fixed repair image nodes are enabled'}, status_code=403)
        elif request.method == 'POST' and path != '/api/auth/login':
            return JSONResponse({'error': 'Repair pilot has no video, review, export or helper submissions'}, status_code=403)
        return await call_next(request)
    # A separate status discloses parent lineage without unlocking or rewriting it.
    @app.get('/api/ideas/' + IDEA + '/canvas/repair-status')
    async def repair_status():
        with engine.lock():
            d = engine.read()
        return dict(parentLedgerSha256=engine.approved['baseLedgerSha256'], parentHalted=True,
                    repairPlanSha256=engine.approved['repairPlanSha256'], enabledShots=list(SHOTS),
                    repairReserved=d['reserved'], combinedFalReservation=str(Decimal('2.84') + Decimal(d['reserved']['fal'])),
                    combinedImageCount=21 + len(d['requests']), originalCaps=dict(fal=4, openrouter=3, total=7))
    server.PUBLIC_API += ('/api/ideas/' + IDEA + '/canvas/repair-status',)
    return app, fresh


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bootstrap', action='store_true')
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--enable-generation', action='store_true')
    args = parser.parse_args()
    require(args.bootstrap != args.serve, 'choose --bootstrap or --serve')
    if args.bootstrap:
        require(not args.enable_generation, 'bootstrap cannot enable generation')
        print(bootstrap()); return
    m = manifest(); state = Path(m['repairState']); check_state(state, m)
    # Only normal inherited fal credentials can reach the approved backend transport.
    keep = {k: os.environ[k] for k in ('PATH', 'HOME', 'FAL_KEY') if k in os.environ}
    os.environ.clear(); os.environ.update(keep)
    from provider_transport import ProviderTransport
    engine = RepairEngine(state / 'engine', ProviderTransport(), mode='live')
    app, fresh = build(engine)
    fresh.check_ports(list(PORTS))
    if not (state / 'dist/index.html').exists():
        shutil.copytree(fresh.APP / 'dist', state / 'dist', dirs_exist_ok=True)
    app.state.generation_enabled = args.enable_generation
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=PORTS[0])


if __name__ == '__main__':
    main()

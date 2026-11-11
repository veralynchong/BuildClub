"""User-launch only: inherited keys, free OR auth check, leased foreground server.

Never loads dotenv, fish, shell startup files or credential stores. Both inherited
keys are required; only their presence is printed. The free OpenRouter key endpoint
is the existing B/check-account.py endpoint; no fal validation URL is guessed.
This auth check does not prove video access, credit availability or generation price.
Use --self-test for offline fake-only tests, without reading this process's keys.
"""
import argparse
from contextlib import contextmanager, closing
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import signal
import socket
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request

APP = Path('/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder')
B = Path('/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai')
STATE = B.parent / 'fresh-ai-state-20261106'
PYTHON = APP / 'backend/.venv/bin/python'
BROWSER = APP / 'node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'
SLOT_SCRIPT = Path('/Users/tommy/.agents/skills/test-slot/scripts/test_slot.py')
SLOT_DIR = Path('/Users/tommy/.local/state/codex-test-slots')
RESOURCE = 'local:127.0.0.1:8978:buildclub-e2e'
PORTS = (8978, 8979, 8980)
FROZEN_SHA = '032cd86a787f32e19ae26dd62d9696b5485e7cec12f95cae99c2508668136908'
KEY_URL = 'https://openrouter.ai/api/v1/key'
PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'


class LaunchBlocked(ValueError):
    pass


def require(ok, message):
    if not ok:
        raise LaunchBlocked(message)


def inherited_environment(values):
    present = {name: bool(values.get(name)) for name in ('FAL_KEY', 'OPENROUTER_API_KEY')}
    require(all(present.values()), 'Both FAL_KEY and OPENROUTER_API_KEY must already be inherited; nothing was loaded')
    for name in present:
        value = values[name]
        require(isinstance(value, str) and not any(c in value for c in '\r\n\x00') and value == value.strip(), 'Invalid inherited key formatting')
    # Fixed executable search path and HOME; every other credential/proxy/startup hook is dropped.
    return {'PATH': PATH, 'HOME': '/Users/tommy', **{name: values[name] for name in present}}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def check_openrouter_key(key, opener=None):
    """One GET, no body, no redirect, no retry; never returns account labels or keys."""
    req = urllib.request.Request(KEY_URL, headers={'Authorization': 'Bearer ' + key}, method='GET')
    opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect()).open
    try:
        with opener(req, timeout=15) as response:
            require(response.status == 200, 'OpenRouter key endpoint did not return HTTP 200')
            blob = response.read(65537)
            require(len(blob) <= 65536, 'OpenRouter key response exceeds limit')
            data = json.loads(blob)
            require(isinstance(data, dict) and isinstance(data.get('data'), dict) and data['data'], 'OpenRouter key metadata is invalid')
    except LaunchBlocked:
        raise
    except Exception:
        raise LaunchBlocked('Free OpenRouter key check failed; no server or generation started') from None
    return {'httpStatus': 200, 'authenticated': True, 'paidRequests': 0}


def ports_free(factory=socket.socket):
    held = []
    try:
        for port in PORTS:
            sock = factory(socket.AF_INET, socket.SOCK_STREAM)
            held.append(sock)
            try:
                sock.bind(('127.0.0.1', port))
            except OSError:
                raise LaunchBlocked('Port ' + str(port) + ' is occupied; existing processes were not touched') from None
    finally:
        for sock in held:
            sock.close()


def server_command(render=False, browser=BROWSER):
    require(browser == BROWSER, 'Only the existing approved Remotion browser path is accepted')
    argv = [str(PYTHON), '-I', '-B', str(B / 'serve_fresh.py'), '--mode', 'live', '--enable-generation',
            '--state', str(STATE), '--port', '8978', '--renderer-port', '8979', '--media-port', '8980']
    if render:
        argv += ['--enable-render', '--browser-executable', str(BROWSER)]
    return argv


def owned_stop(child):
    # Only the new foreground server group created with start_new_session=True.
    for sig, timeout in [(signal.SIGINT, 20), (signal.SIGTERM, 5), (signal.SIGKILL, 5)]:
        if child.poll() is not None:
            return
        try:
            os.killpg(child.pid, sig)
        except ProcessLookupError:
            return
        try:
            child.wait(timeout=timeout)
            return
        except subprocess.TimeoutExpired:
            pass
    raise LaunchBlocked('Owned server did not terminate; inspect it before releasing the environment')


def serve_under_lease(clean, render, slot_type, key_check=check_openrouter_key, port_check=ports_free,
                      popen=subprocess.Popen, close_fd=os.close, state_guard=None):
    slot = slot_type(SLOT_DIR, RESOURCE)
    lease = run = child = None
    try:
        lease, run = slot.acquire(os.getpid(), 30, 0, wrapped=True)
        port_check()
        guard = state_guard or ready_guard
        with guard():
            pass
        account = key_check(clean['OPENROUTER_API_KEY'])
        print(json.dumps({'keys': {'fal': True, 'openrouter': True}, 'openrouterKeyCheck': account,
                          'falAuthEndpointCheck': False, 'resource': RESOURCE, 'generationPosts': 0}), flush=True)
        port_check()
        # Keep a shared engine lock and readonly SQLite transaction through spawn.
        with guard():
            child = popen(server_command(render), env=clean, pass_fds=(run,), start_new_session=True)
        try:
            return child.wait()
        except KeyboardInterrupt:
            owned_stop(child)
            return 130
        finally:
            if child.poll() is None:
                owned_stop(child)
    finally:
        try:
            if lease is not None:
                # A live child retains the inherited kernel run lock even if this wrapper fails.
                require(child is None or child.poll() is not None, 'Owned server is still alive; lease not released')
                slot.release(lease['token'], owned_run=run)
        finally:
            if run is not None:
                close_fd(run)
            close_fd(slot.dirfd)


def validate_ready_ledger(ledger):
    require(ledger.get('mode') == 'live' and ledger.get('policy') == 'seedream-fal4-openrouter3' and ledger.get('halted') is False, 'Ledger must be the approved unhalted live state')
    require(ledger.get('caps') == {'fal': '4.00', 'openrouter': '3.00'}, 'Approved ledger caps differ')
    requests = ledger.get('requests', [])
    require(33 <= len(requests) <= 42 and all(r.get('state') == 'done' for r in requests), 'Finish and inspect all fal work before launch; no unresolved requests may be recovered automatically')
    image = [r for r in requests if r.get('kind') == 'image']
    fal_video = [r for r in requests if r.get('kind') == 'video' and r.get('provider') == 'fal']
    veo = [r for r in requests if r.get('kind') == 'video' and r.get('provider') == 'openrouter']
    all_shots = ['s' + str(i) for i in range(1, 22)]
    require(len(image) == 21 and {r.get('shot') for r in image} == set(all_shots) and all(r.get('provider') == 'fal' for r in image), 'Exactly 21 fresh fal images are required')
    require(len(fal_video) == 12 and {r.get('shot') for r in fal_video} == set(all_shots[:12]), 'Exactly 12 completed fal videos are required')
    require(len(requests) == len(image) + len(fal_video) + len(veo), 'Unexpected request allocation')
    require(len(veo) <= 9 and len({r.get('shot') for r in veo}) == len(veo) and {r.get('shot') for r in veo} == set(all_shots[12:12 + len(veo)]), 'Only a completed Veo prefix is reusable')
    require(ledger.get('reserved', {}).get('fal') == '3.24' and float(ledger.get('reserved', {}).get('openrouter', -1)) == round(len(veo) * .20, 2), 'Reservation differs; no reset or refund is performed')


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def digest(value):
    return hashlib.sha256(encoded(value)).hexdigest()


def validate_native(conn, ledger, frozen):
    """Inspect every native row, not just ledger requests: startup can release waiting chains."""
    validate_ready_ledger(ledger)
    conn.row_factory = sqlite3.Row
    gs = [dict(r) for r in conn.execute('SELECT * FROM generations')]
    require(all(g['status'] == 'done' for g in gs), 'Native non-done generation exists; startup recovery must not run')
    bs = [dict(r) for r in conn.execute('SELECT * FROM batch_bindings')]
    requests, assets = ledger['requests'], ledger.get('assets', {})
    require(len(gs) == len(bs) == len(assets) == len(requests), 'Native/ledger/binding row count mismatch')
    require(len({b['gid'] for b in bs}) == len(bs) and len({b['asset'] for b in bs}) == len(bs), 'Duplicate binding identity')
    require(len({r['fingerprint'] for r in requests}) == len(requests) and len({r['providerRequestId'] for r in requests}) == len(requests), 'Duplicate engine receipt identity')
    canvas = conn.execute('SELECT doc FROM canvases WHERE idea_id=?', ('evergreen-fresh-ai-21',)).fetchone()
    require(canvas is not None, 'Native canvas is missing')
    nodes = json.loads(canvas['doc'])['nodes']
    scope = digest([frozen, str(STATE / 'engine'), str(STATE / 'media')])
    shots = {t['shotId']: t for t in frozen['shots']}
    for g in gs:
        binding = next((b for b in bs if b['gid'] == g['id']), None)
        require(binding is not None, 'Unbound native generation')
        b = binding
        r = next((r for r in requests if r['asset'] == b['asset']), None)
        require(r is not None and r['asset'] == r['fingerprint'], 'Binding has no exact engine receipt')
        a = assets.get(b['asset'])
        require(a is not None and r['state'] == 'done', 'Missing completed engine asset')
        shot, kind = b['shot'], g['kind']
        require(shot in shots and kind in ('image', 'video'), 'Foreign generation kind or shot')
        f = shots[shot]
        provider, endpoint = f[kind + 'Provider'], f[kind + 'Model']
        alias = 'seedream-4.5' if kind == 'image' else 'hailuo-2.3-fast' if provider == 'fal' else 'veo-lite-openrouter'
        require(g['idea_id'] == b['idea_id'] == 'evergreen-fresh-ai-21' and g['node_id'] == b['node_id'], 'Native binding idea/node differs')
        require(g['model'] == b['model'] == alias and b['kind'] == kind == r['kind'] == a['kind'], 'Native model or kind differs')
        require(r['shot'] == a['shot'] == shot and r['provider'] == provider and r['model'] == a['model'] == endpoint, 'Receipt allocation differs')
        require(r['offlineSimulation'] is False and a['offlineSimulation'] is False and r['textOnly'] == a['textOnly'] == (kind == 'image'), 'Foreign/offline asset')
        require(b['scope'] == scope, 'Binding scope changed')
        raw = json.loads(g['inputs'])
        require(raw['prompt'] == raw.get('sentPrompt', raw['prompt']) == f[kind + 'Prompt'], 'Native prompt differs from frozen plan')
        require(all(not raw.get(k) for k in ('references', 'reference', 'kit', 'kitStamp', 'kitRefs', 'kitImages')), 'Foreign image reference metadata')
        require(raw.get('count', 1) == 1 and raw.get('aspectRatio', '9:16') == '9:16', 'Native count or aspect differs')
        require(raw.get('duration') == (None if kind == 'image' else f['duration']), 'Native duration differs')
        body = dict(model=endpoint, prompt=f[kind + 'Prompt'])
        if kind == 'image':
            require(raw.get('startFrame') is None and r['imageInput'] is None, 'Image was not text-only')
            body.update(num_images=1, max_images=1, image_size='portrait_16_9', enable_safety_checker=True)
        else:
            source = next((b for b in bs if b['gid'] == raw.get('startFrame')), None)
            require(source is not None and source['kind'] == 'image' and source['shot'] == shot, 'Native video starts from a foreign shot')
            parent = next((p for p in requests if p['asset'] == source['asset']), None)
            require(parent is not None and parent['kind'] == 'image' and parent['state'] == 'done', 'Video image has no completed receipt')
            require(r['imageInput'] == dict(asset=parent['asset'], sha256=parent['outputSha256'], parentRequestId=parent['providerRequestId']), 'Video source receipt differs')
            body['firstImage'] = source['asset']
            if provider == 'fal': body.update(duration='6', prompt_optimizer=False, enable_safety_checker=True)
            else: body.update(duration=4, resolution='1080p', aspect_ratio='9:16', generate_audio=False)
        require(b['inputHash'] == digest(body) and r['fingerprint'] == digest([provider, kind, body]), 'Binding payload hash differs')
        require(b['identityHash'] == digest([g['idea_id'], g['node_id'], kind, alias, raw, shot]), 'Native identity hash differs')
        require(b['outputHash'] == r['outputSha256'] == a['sha256'] and a['requestFingerprint'] == r['fingerprint'], 'Output hash differs')
        receipt = r.get('providerReceipt', {})
        require(bool(r['providerRequestId']) and receipt.get('providerRequestId') == a['providerRequestId'] == r['providerRequestId'] and receipt.get('model') == endpoint, 'Provider receipt identity differs')
        require(g['provider_request_id'] == b['asset'], 'Native worker receipt differs from completed engine asset')
        ext = '.png' if kind == 'image' else '.mp4'
        require(g['file'] == g['id'] + ext and g['source_url'] is None and a['path'] == 'media/' + b['asset'] + ext, 'Native file mapping differs')
        matches = [n for n in nodes if n['id'] == g['node_id']]
        require(len(matches) == 1 and matches[0]['shotId'] == shot and matches[0]['type'] == ('storyboard' if kind == 'image' else 'video') and matches[0]['data'].get('selected') == g['id'], 'Native selection differs')


@contextmanager
def ready_guard(state=STATE):
    """Lease caller keeps this readonly snapshot fenced until its new server is spawned."""
    state = Path(state)
    paths = [state / 'data.db', state / 'frozen-plan.json', state / 'engine/runtime-ledger.json', state / 'engine/runtime.lock']
    require(all(not p.is_symlink() and not p.parent.is_symlink() for p in paths), 'Unsafe native state path')
    fd = os.open(paths[3], os.O_RDONLY | os.O_NOFOLLOW)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_SH | fcntl.LOCK_NB)
        except BlockingIOError:
            raise LaunchBlocked('Engine is active; do not start another server') from None
        frozen_bytes = paths[1].read_bytes()
        require(hashlib.sha256(frozen_bytes).hexdigest() == FROZEN_SHA, 'Frozen plan changed')
        ledger_bytes = paths[2].read_bytes()
        with closing(sqlite3.connect('file:' + str(paths[0]) + '?mode=ro', uri=True)) as conn:
            conn.execute('BEGIN')
            validate_native(conn, json.loads(ledger_bytes), json.loads(frozen_bytes))
            require(paths[2].read_bytes() == ledger_bytes, 'Ledger changed during native check')
            try:
                yield
            finally:
                conn.rollback()
    finally:
        os.close(fd)



def validate_files(render):
    require(STATE.exists() and STATE.resolve() == STATE and not STATE.is_symlink(), 'Exact existing production state is required')
    frozen = STATE / 'frozen-plan.json'
    require(not frozen.is_symlink() and hashlib.sha256(frozen.read_bytes()).hexdigest() == FROZEN_SHA, 'Frozen plan changed')
    ledger = STATE / 'engine/runtime-ledger.json'
    require(not ledger.is_symlink() and not ledger.parent.is_symlink(), 'Ledger symlink is forbidden')
    validate_ready_ledger(json.loads(ledger.read_bytes()))
    require(PYTHON.is_file() and (B / 'serve_fresh.py').is_file() and SLOT_SCRIPT.is_file(), 'Existing server, venv or test-slot script is missing; nothing installed')
    if render:
        require(BROWSER.is_file(), 'Existing approved browser is missing; nothing downloaded')


def self_test():
    import unittest
    from unittest.mock import Mock, patch

    @contextmanager
    def empty_guard():
        yield

    import ast
    import copy
    import tempfile
    import time

    tree = ast.parse((APP / 'backend/generations.py').read_text())
    schema_node = next(n for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'SCHEMA' for t in n.targets))
    generation_schema = ast.literal_eval(schema_node.value)[0]
    recover_ast = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'recover')
    jobs_ast = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == 'GenJobs')
    release_ast = next(n for n in jobs_ast.body if isinstance(n, ast.FunctionDef) and n.name == 'release')
    real = {'time': time, 'SUBMITTING': '!submitting', 'LOST': 'lost', 'RESTARTED': 'restarted', 'START_FRAME_LOST': 'source lost'}
    exec(compile(ast.Module(body=[recover_ast, release_ast], type_ignores=[]), '<actual-recover-release-AST>', 'exec'), real)

    def fixture(root, veo_count=0):
        root = Path(root).resolve(); (root / 'engine').mkdir()
        (root / 'engine/runtime.lock').write_bytes(b'')
        frozen = {'shots': [dict(shotId='s' + str(i), imageProvider='fal', imageModel='fal-ai/bytedance/seedream/v4.5/text-to-image',
            imagePrompt='fresh image ' + str(i), videoProvider='fal' if i <= 12 else 'openrouter',
            videoModel='fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video' if i <= 12 else 'google/veo-3.1-lite',
            videoPrompt='fresh video ' + str(i), duration=6 if i <= 12 else 4) for i in range(1, 22)]}
        ledger = dict(mode='live', policy='seedream-fal4-openrouter3', caps={'fal': '4.00', 'openrouter': '3.00'}, halted=False,
            reserved={'fal': '3.24', 'openrouter': format(veo_count * .20, '.2f')}, requests=[], assets={})
        scope = digest([frozen, str(STATE / 'engine'), str(STATE / 'media')])
        nodes, generations, bindings = [], [], []
        for kind in ('image', 'video'):
            for f in frozen['shots'][:21 if kind == 'image' else 12 + veo_count]:
                shot = f['shotId']; image = kind == 'image'; gid = kind + '-' + shot; node = 'node-' + gid
                provider = f[kind + 'Provider']
                alias = 'seedream-4.5' if image else 'hailuo-2.3-fast' if provider == 'fal' else 'veo-lite-openrouter'
                body = dict(model=f[kind + 'Model'], prompt=f[kind + 'Prompt'])
                raw = dict(prompt=body['prompt'], sentPrompt=body['prompt'], references=[], kitStamp={}, count=1, aspectRatio='9:16', duration=None if image else f['duration'], startFrame=None if image else 'image-' + shot)
                if image:
                    image_input = None; body.update(num_images=1, max_images=1, image_size='portrait_16_9', enable_safety_checker=True)
                else:
                    parent = next(r for r in ledger['requests'] if r['shot'] == shot and r['kind'] == 'image')
                    image_input = dict(asset=parent['asset'], sha256=parent['outputSha256'], parentRequestId=parent['providerRequestId'])
                    body['firstImage'] = parent['asset']
                    if provider == 'fal': body.update(duration='6', prompt_optimizer=False, enable_safety_checker=True)
                    else: body.update(duration=4, resolution='1080p', aspect_ratio='9:16', generate_audio=False)
                asset = digest([provider, kind, body]); output = digest(['fixture-output', gid]); rid = 'receipt-' + gid; ext = '.png' if image else '.mp4'
                r = dict(fingerprint=asset, asset=asset, kind=kind, shot=shot, model=body['model'], provider=provider, state='done',
                    textOnly=image, offlineSimulation=False, reservationUsd='0.04' if image else '0.20', actualUsd=None,
                    imageInput=image_input, outputSha256=output, providerRequestId=rid,
                    providerReceipt=dict(providerRequestId=rid, model=body['model']))
                ledger['requests'].append(r)
                ledger['assets'][asset] = dict(kind=kind, shot=shot, model=body['model'], sha256=output,
                    requestFingerprint=asset, providerRequestId=rid, offlineSimulation=False, textOnly=image, path='media/' + asset + ext)
                generations.append(dict(id=gid, idea_id='evergreen-fresh-ai-21', node_id=node, kind=kind, model=alias, inputs=json.dumps(raw),
                    input_hash='fixture', status='done', est_usd=.04 if image else .20, actual_usd=None, file=gid + ext,
                    source_url=None, error=None, created_at=1, finished_at=2, provider_request_id=asset, after=None))
                bindings.append(dict(gid=gid, idea_id='evergreen-fresh-ai-21', node_id=node, shot=shot, asset=asset, model=alias,
                    kind=kind, inputHash=digest(body), outputHash=output, identityHash=digest(['evergreen-fresh-ai-21', node, kind, alias, raw, shot]), scope=scope))
                nodes.append(dict(id=node, type='storyboard' if image else 'video', shotId=shot, data=dict(selected=gid)))
        with closing(sqlite3.connect(root / 'data.db')) as conn, conn:
            conn.execute(generation_schema)
            conn.execute('CREATE TABLE batch_bindings (gid TEXT PRIMARY KEY, idea_id TEXT, node_id TEXT, shot TEXT, asset TEXT, model TEXT, kind TEXT, inputHash TEXT, outputHash TEXT, identityHash TEXT, scope TEXT)')
            conn.execute('CREATE TABLE canvases (idea_id TEXT PRIMARY KEY, doc TEXT)')
            for table, items in [('generations', generations), ('batch_bindings', bindings)]:
                for row in items:
                    conn.execute('INSERT INTO ' + table + ' (' + ','.join('"' + k + '"' for k in row) + ') VALUES (' + ','.join('?' for _ in row) + ')', list(row.values()))
            conn.execute('INSERT INTO canvases VALUES (?,?)', ('evergreen-fresh-ai-21', json.dumps(dict(nodes=nodes))))
        frozen_bytes = json.dumps(frozen).encode(); (root / 'frozen-plan.json').write_bytes(frozen_bytes)
        (root / 'engine/runtime-ledger.json').write_text(json.dumps(ledger))
        return root, ledger, frozen, hashlib.sha256(frozen_bytes).hexdigest()

    class Tests(unittest.TestCase):
        def test_native_readonly_guard_accepts_only_exact_done_mapping(self):
            with tempfile.TemporaryDirectory() as temp:
                state, ledger, frozen, frozen_sha = fixture(temp)
                before = {str(p.relative_to(state)): hashlib.sha256(p.read_bytes()).hexdigest() for p in state.rglob('*') if p.is_file()}
                with patch.dict(globals(), FROZEN_SHA=frozen_sha):
                    with ready_guard(state): pass
                self.assertEqual(before, {str(p.relative_to(state)): hashlib.sha256(p.read_bytes()).hexdigest() for p in state.rglob('*') if p.is_file()})
            for status in ['waiting', 'queued', 'running', 'unknown', 'failed']:
                with self.subTest(status=status), tempfile.TemporaryDirectory() as temp:
                    state, ledger, frozen, frozen_sha = fixture(temp)
                    with closing(sqlite3.connect(state / 'data.db')) as conn, conn:
                        conn.execute('UPDATE generations SET status=? WHERE id=?', (status, 'video-s1'))
                    with patch.dict(globals(), FROZEN_SHA=frozen_sha), self.assertRaises(LaunchBlocked):
                        with ready_guard(state): pass

        def test_all_42_done_including_veo_keep_exact_native_mapping(self):
            with tempfile.TemporaryDirectory() as temp:
                state, ledger, frozen, frozen_sha = fixture(temp, veo_count=9)
                self.assertEqual(len(ledger['requests']), 42)
                with patch.dict(globals(), FROZEN_SHA=frozen_sha):
                    with ready_guard(state): pass

        def test_native_binding_receipt_and_selection_mismatch_rejected(self):
            changes = ["UPDATE batch_bindings SET asset='foreign' WHERE gid='video-s1'",
                "UPDATE batch_bindings SET identityHash='foreign' WHERE gid='video-s1'",
                "UPDATE generations SET provider_request_id='!submitting' WHERE id='video-s1'",
                "UPDATE generations SET node_id='foreign' WHERE id='video-s1'",
                "DELETE FROM batch_bindings WHERE gid='video-s1'",
                "UPDATE canvases SET doc='{" + '"nodes":[]' + "}'"]
            for sql in changes:
                with self.subTest(sql=sql), tempfile.TemporaryDirectory() as temp:
                    state, ledger, frozen, frozen_sha = fixture(temp)
                    with closing(sqlite3.connect(state / 'data.db')) as conn, conn: conn.execute(sql)
                    with patch.dict(globals(), FROZEN_SHA=frozen_sha), self.assertRaises(LaunchBlocked):
                        with ready_guard(state): pass
            with tempfile.TemporaryDirectory() as temp:
                state, ledger, frozen, frozen_sha = fixture(temp)
                ledger['requests'][0]['providerReceipt']['providerRequestId'] = 'wrong-receipt'
                (state / 'engine/runtime-ledger.json').write_text(json.dumps(ledger))
                with patch.dict(globals(), FROZEN_SHA=frozen_sha), self.assertRaises(LaunchBlocked):
                    with ready_guard(state): pass

        def test_actual_recover_release_ast_waiting_chain_is_fenced_before_auth_or_spawn(self):
            with tempfile.TemporaryDirectory() as temp:
                state, ledger, frozen, frozen_sha = fixture(temp)
                with closing(sqlite3.connect(state / 'data.db')) as conn, conn:
                    conn.execute("INSERT INTO generations (id,idea_id,node_id,kind,model,inputs,input_hash,status,est_usd,created_at,after) VALUES ('hidden-waiting','evergreen-fresh-ai-21','hidden-node','video','hailuo-2.3-fast','{}','fixture','waiting',.20,3,'image-s1')")
                @contextmanager
                def db():
                    with closing(sqlite3.connect(state / 'data.db')) as conn, conn: yield conn
                class FakeJobs:
                    release = real['release']
                    def __init__(self): self.submitted = []; self._db = db
                    def submit(self, gid): self.submitted.append(gid)
                    def refund(self, *args): pass
                    def fail_orphans(self): pass
                jobs = FakeJobs()
                real['recover'](db, jobs)
                self.assertEqual(jobs.submitted, ['hidden-waiting'], 'Actual startup AST releases a waiting row behind a done upstream')
                with db() as conn: conn.execute("UPDATE generations SET status='waiting' WHERE id='hidden-waiting'")
                slot = Mock(dirfd=100); slot.acquire.return_value = ({'token': 'fake-token'}, 101)
                popen = Mock(); auth = Mock(); port = Mock(); closed = Mock()
                clean = inherited_environment({'FAL_KEY': 'fake-fal', 'OPENROUTER_API_KEY': 'fake-or'})
                with patch.dict(globals(), FROZEN_SHA=frozen_sha), self.assertRaises(LaunchBlocked):
                    serve_under_lease(clean, False, Mock(return_value=slot), auth, port, popen, closed,
                                      state_guard=lambda: ready_guard(state))
                auth.assert_not_called(); popen.assert_not_called()
                slot.release.assert_called_once_with('fake-token', owned_run=101)
                with db() as conn:
                    self.assertEqual(conn.execute("SELECT status FROM generations WHERE id='hidden-waiting'").fetchone()[0], 'waiting')

        def test_strip_other_credentials_and_missing_keys(self):
            clean = inherited_environment({'FAL_KEY': 'fake-fal', 'OPENROUTER_API_KEY': 'fake-or',
                                           'ANTHROPIC_API_KEY': 'never-forward', 'HTTP_PROXY': 'never-forward', 'PYTHONPATH': 'never-forward'})
            self.assertEqual(set(clean), {'PATH', 'HOME', 'FAL_KEY', 'OPENROUTER_API_KEY'})
            self.assertEqual(clean['PATH'], PATH)
            for values in ({}, {'FAL_KEY': 'fake'}, {'FAL_KEY': 'fake', 'OPENROUTER_API_KEY': 'bad\nheader'}):
                with self.assertRaises(LaunchBlocked): inherited_environment(values)

        def test_get_only_auth_and_sanitized_result(self):
            class Response:
                status = 200
                def __enter__(self): return self
                def __exit__(self, *args): pass
                def read(self, maximum): return b'{"data":{"label":"must-not-leak"}}'
            opener = Mock(return_value=Response())
            result = check_openrouter_key('fake-only', opener)
            req = opener.call_args.args[0]
            self.assertEqual(req.get_method(), 'GET'); self.assertEqual(req.full_url, KEY_URL); self.assertIsNone(req.data)
            self.assertNotIn('must-not-leak', json.dumps(result)); self.assertEqual(result['paidRequests'], 0)
            for status in [301, 401, 403, 500]:
                r = Response(); r.status = status
                with self.assertRaises(LaunchBlocked): check_openrouter_key('fake-only', Mock(return_value=r))

        def test_owned_ports_only_and_close_on_busy(self):
            sockets = []
            class Socket:
                def __init__(self, *a): self.closed = False; sockets.append(self)
                def bind(self, address):
                    self.address = address
                    if address[1] == 8979: raise OSError('busy')
                def close(self): self.closed = True
            with self.assertRaises(LaunchBlocked): ports_free(Socket)
            self.assertEqual([s.address[1] for s in sockets], [8978, 8979]); self.assertTrue(all(s.closed for s in sockets))
            self.assertFalse(set(PORTS) & {8982, 8983, 8984})

        def test_no_startup_recovery_of_unfinished_fal_or_unknown_work(self):
            import copy
            image = [dict(kind='image', provider='fal', state='done', shot='s' + str(i)) for i in range(1, 22)]
            video = [dict(kind='video', provider='fal', state='done', shot='s' + str(i)) for i in range(1, 13)]
            ledger = dict(mode='live', policy='seedream-fal4-openrouter3', caps={'fal': '4.00', 'openrouter': '3.00'}, halted=False,
                          reserved={'fal': '3.24', 'openrouter': '0.00'}, requests=image + video)
            validate_ready_ledger(ledger)
            for mutate in [lambda x: x['requests'].pop(), lambda x: x['requests'][0].update(state='unknown'),
                           lambda x: x.update(halted=True), lambda x: x['reserved'].update(fal='0.00')]:
                changed = copy.deepcopy(ledger); mutate(changed)
                with self.assertRaises(LaunchBlocked): validate_ready_ledger(changed)

        def test_approved_command_and_render_only(self):
            cmd = server_command()
            self.assertEqual(cmd[:4], [str(PYTHON), '-I', '-B', str(B / 'serve_fresh.py')])
            self.assertNotIn('--enable-render', cmd); self.assertEqual(cmd[cmd.index('--state') + 1], str(STATE))
            self.assertIn('--enable-render', server_command(True)); self.assertIn(str(BROWSER), server_command(True))
            with self.assertRaises(LaunchBlocked): server_command(True, Path('/foreign/browser'))

        def test_slot_and_failed_auth_release_without_starting(self):
            slot = Mock(dirfd=100)
            slot.acquire.return_value = ({'token': 'fake-token'}, 101)
            popen = Mock(); check = Mock(side_effect=LaunchBlocked('fake auth rejection')); close = Mock(); port = Mock()
            clean = inherited_environment({'FAL_KEY': 'fake-fal', 'OPENROUTER_API_KEY': 'fake-or'})
            with self.assertRaises(LaunchBlocked): serve_under_lease(clean, False, Mock(return_value=slot), check, port, popen, close, state_guard=empty_guard)
            popen.assert_not_called(); slot.release.assert_called_once_with('fake-token', owned_run=101)
            self.assertEqual(close.call_count, 2)

        def test_foreground_server_inherits_only_clean_env_and_own_run_fd(self):
            slot = Mock(dirfd=100); slot.acquire.return_value = ({'token': 'fake-token'}, 101)
            child = Mock(); child.wait.return_value = 0; child.poll.return_value = 0
            popen = Mock(return_value=child); close = Mock(); port = Mock()
            clean = inherited_environment({'FAL_KEY': 'fake-fal', 'OPENROUTER_API_KEY': 'fake-or'})
            with patch('builtins.print'):
                rc = serve_under_lease(clean, False, Mock(return_value=slot), Mock(return_value={'authenticated': True}), port, popen, close, state_guard=empty_guard)
            self.assertEqual(rc, 0); self.assertEqual(port.call_count, 2)
            self.assertEqual(popen.call_args.kwargs, {'env': clean, 'pass_fds': (101,), 'start_new_session': True})
            slot.release.assert_called_once_with('fake-token', owned_run=101)
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests))
    print('OFFLINE FAKE-ONLY: no inherited-key reads, network, lease files or server startup')
    return 0 if result.wasSuccessful() else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--enable-render', action='store_true')
    parser.add_argument('--browser-executable', type=Path, default=BROWSER)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    require(args.browser_executable == BROWSER, 'Only the approved existing browser is allowed')
    # Only these two inherited credential values are accessed; no other secrets are read.
    values = {name: os.environ.get(name, '') for name in ('FAL_KEY', 'OPENROUTER_API_KEY')}
    print(json.dumps({'inherited': {name: bool(value) for name, value in values.items()}, 'paidRequests': 0}), flush=True)
    clean = inherited_environment(values)
    os.environ.clear(); os.environ.update(clean)
    validate_files(args.enable_render)
    spec = importlib.util.spec_from_file_location('fresh_launch_test_slot', SLOT_SCRIPT)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    rc = serve_under_lease(clean, args.enable_render, module.Slot)
    return rc if rc >= 0 else 128 - rc


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as error:
        # Do not print exception repr/traceback: HTTP errors may include account metadata.
        print('Launch blocked (' + type(error).__name__ + '): no credential values logged; inspect the safe preflight status', file=sys.stderr)
        if isinstance(error, LaunchBlocked):
            print(str(error), file=sys.stderr)
        sys.exit(2)

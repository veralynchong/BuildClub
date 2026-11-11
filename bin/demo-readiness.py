#!/usr/bin/env python3
"""Owned, persistent HTTP acceptance environment; never copies the backend."""
import argparse
import contextlib
import ctypes
import fcntl
import hashlib
import json
import os
import pwd
from pathlib import Path
import signal
import socket
import subprocess
import struct
import sys
import time
import urllib.request

sys.dont_write_bytecode = True
from verify_offline import APP, PYTHON, environment, profile

PORT = 8972
EVIDENCE = Path(os.environ.get('READINESS_EVIDENCE') or
                f'/tmp/buildclub-readiness-b-r1/run-{time.time_ns()}').resolve()
STATE = EVIDENCE / 'state'
PW = Path('/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core')
SLOT = Path('/Users/tommy/.agents/skills/test-slot/scripts/test_slot.py')
SLOT_STATE = Path(pwd.getpwuid(os.getuid()).pw_dir) / '.local/state/codex-test-slots'
SELF = Path(__file__).resolve()


def hashes():
    return {str(p.relative_to(STATE)): hashlib.sha256(p.read_bytes()).hexdigest()
            for folder in ('media',) for p in (STATE / folder).rglob('*') if p.is_file()}


def serve():
    sys.path.insert(0, str(APP / 'backend'))
    import server
    import analyze
    import channels
    import uvicorn

    # Routes close over db()/media callbacks, not the original path values.
    server.DB_PATH = STATE / 'data.db'
    server.MEDIA_DIR = STATE / 'media'
    server.DIST_DIR = STATE / 'dist'
    for name, folder in [('CACHE_DIR', 'search-cache'), ('COVERS_DIR', 'covers'),
                         ('PINNED_DIR', 'pinned'), ('PINNED_COVERS_DIR', 'pinned/covers')]:
        setattr(server, name, STATE / folder)
        (STATE / folder).mkdir(parents=True, exist_ok=True)
    analyze.JOBS_DIR = STATE / 'jobs'
    channels.CHANNELS_DIR = STATE / 'channels'
    # Export is outside this check; an empty app dir makes the existing tools check
    # skip optional prewarming, without replacing any HTTP handler or result.
    with contextlib.closing(server.db()) as conn, conn:
        if not server.auth.has_users(conn):
            server.auth.create_user(conn, 'test@example.com', 'Readiness Tester',
                                    'Synthetic QA', 'pw-for-e2e')
    uvicorn.run(server.app, host='127.0.0.1', port=PORT, log_level='info')


LIBPROC = ctypes.CDLL('/usr/lib/libproc.dylib')
LIBPROC.proc_pidinfo.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_uint64, ctypes.c_void_p, ctypes.c_int]
LIBPROC.proc_pidinfo.restype = ctypes.c_int
LIBPROC.proc_listpids.argtypes = [ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_int]
LIBPROC.proc_listpids.restype = ctypes.c_int


def identity(pid):
    info = ctypes.create_string_buffer(136)
    if LIBPROC.proc_pidinfo(pid, 3, 0, info, len(info)) != len(info):
        return None
    if struct.unpack_from('=I', info, 4)[0] == 5:
        return None
    return list(struct.unpack_from('=QQ', info, 120))


def group_members(group):
    members = (ctypes.c_int * 4096)()
    size = LIBPROC.proc_listpids(2, group, members, ctypes.sizeof(members))
    if size < 0 or size >= ctypes.sizeof(members):
        raise RuntimeError('cannot inspect owned process group')
    return [pid for pid in members[:size // ctypes.sizeof(ctypes.c_int)] if pid and identity(pid)]


def register(kind, env, detach=False):
    with (STATE / 'launch.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if (STATE / 'stopping').exists():
            sys.exit(125)
        # Until this locked handoff the wrapper stays in its parent's tracked
        # group, so a kill before registration cannot leave an untracked session.
        if detach and os.getpgrp() != os.getpid():
            os.setsid()
        if os.getpgrp() != os.getpid():
            raise RuntimeError('owned entry must be its own process group')
        record = {'pid': os.getpid(), 'birth': identity(os.getpid()),
                  'token': env['READINESS_OWNER_TOKEN'], 'kind': kind,
                  'group': os.getpgrp(), 'session': os.getsid(0)}
        if record['birth'] is None:
            raise RuntimeError('cannot register owned browser birth')
        with (STATE / ('owned-browsers.jsonl' if kind == 'browser' else 'owned-actors.jsonl')).open('a') as log:
            log.write(json.dumps(record) + '\n')


def browser_entry():
    register('browser', os.environ, detach=True)
    executable = os.environ['READINESS_BROWSER_EXECUTABLE']
    os.execv(executable, [executable, *sys.argv[2:]])


def actor_entry():
    register(sys.argv[2], os.environ, detach=True)
    os.execvpe(sys.argv[3], sys.argv[3:], os.environ)


def launch_actor(command, kind, env, **options):
    return subprocess.Popen([str(PYTHON), str(SELF), '--actor', kind, *command],
                            env=env, **options)


def prepare_browser(env):
    browser = next((APP / 'node_modules/.remotion/chrome-headless-shell').glob('**/chrome-headless-shell'))
    env['READINESS_BROWSER_EXECUTABLE'] = str(browser.resolve())
    env['READINESS_OWNER_TOKEN'] = os.urandom(24).hex()
    wrapper = STATE / 'owned-browser'
    wrapper.write_text(f'#!{PYTHON}\nimport os,sys\nos.execv({str(PYTHON)!r}, '
                       f'[{str(PYTHON)!r}, "-B", {str(SELF)!r}, "--browser", *sys.argv[1:]])\n')
    wrapper.chmod(0o700)
    env['READINESS_BROWSER'] = str(wrapper)


def stop(proc, timeout=15):
    if proc is None:
        return {'exit': None, 'forced': False}
    forced = False
    if proc.poll() is None:
        proc.send_signal(signal.SIGTERM)
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            forced = True
            # This group was created by our Popen(start_new_session=True).
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait(timeout=5)
    return {'exit': proc.poll(), 'forced': forced}


def stop_group(record, timeout=3):
    pid = record['pid']
    before = group_members(pid)
    leader = identity(pid)
    if leader is not None and leader != record['birth']:
        raise RuntimeError(f'PID reused; refusing group {pid}')
    if record['group'] != pid or record['session'] != pid:
        raise RuntimeError('unverified group ownership')

    def checked_members():
        members = []
        for member in group_members(pid):
            try:
                if os.getsid(member) != pid or os.getpgid(member) != pid:
                    raise RuntimeError(f'group ownership changed: {pid}')
                members.append(member)
            except ProcessLookupError:
                continue
        return members

    for sig in (signal.SIGTERM, signal.SIGKILL):
        if not checked_members():
            break
        # A missing leader is not an empty group: the registered session still
        # owns its remaining children. A reused live leader was rejected above.
        try:
            os.killpg(pid, sig)
        except ProcessLookupError:
            pass
        deadline = time.monotonic() + timeout
        while checked_members() and time.monotonic() < deadline:
            time.sleep(.05)
    after = checked_members()
    return {'pid': pid, 'leaderMissing': leader is None, 'membersBefore': before,
            'survives': bool(after), 'groupMembers': after}


def cleanup(driver, server, audit, env, timeout=15, inject=False):
    result = {'errors': [], 'browsers': [], 'actors': []}
    try:
        with (STATE / 'launch.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            (STATE / 'stopping').touch()
    except Exception as error:
        result['errors'].append(f'launch fence: {error!r}')
    for name, proc in [('driver', driver), ('server', server)]:
        try:
            result[name] = stop(proc, timeout)
            if inject and name == 'driver':
                raise RuntimeError('controlled post-driver cleanup failure')
        except Exception as error:
            result['errors'].append(f'{name}: {error!r}')
    try:
        for filename, key in [('owned-actors.jsonl', 'actors'), ('owned-browsers.jsonl', 'browsers')]:
            records = STATE / filename
            for line in records.read_text().splitlines() if records.exists() else []:
                record = json.loads(line)
                if record['token'] != env['READINESS_OWNER_TOKEN'] or record['pid'] == os.getpid():
                    continue
                try:
                    result[key].append(stop_group(record))
                except Exception as error:
                    result['errors'].append(f'{key} {record["pid"]}: {error!r}')
    except Exception as error:
        result['errors'].append(f'browser registry: {error!r}')
    finally:
        audit['cleanup'] = result
        try:
            audit['media'] = hashes()
        except Exception as error:
            result['errors'].append(f'media audit: {error!r}')
        (EVIDENCE / ('owner-lifecycle.json' if audit.get('owner') else 'lifecycle.json')).write_text(json.dumps(audit, indent=2))
    return result


def cleanup_tests(env):
    results = []
    # Force driver timeout and a cleanup exception; server and audit must still finish.
    driver = launch_actor([str(PYTHON), '-c',
        'import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print("ready",flush=True);time.sleep(60)'],
        'driver', env, stdout=subprocess.PIPE, text=True)
    server = None
    try:
        server = launch_actor([str(PYTHON), '-c', 'import time;time.sleep(60)'], 'server', env)
        driver.stdout.readline()
        assert driver.pid in group_members(driver.pid), 'owned-group inspection must work'
    finally:
        result = cleanup(driver, server, {}, env, timeout=.1, inject=True)
    assert result['driver']['forced'] and driver.poll() is not None
    assert server.poll() is not None and len(result['errors']) == 1
    results.append({'case': 'driver-timeout-and-cleanup-error', 'result': result})
    for mode in ('term', 'context-close-error', 'ignore-term'):
        (STATE / 'stopping').unlink(missing_ok=True)
        ready = STATE / 'probe-ready'
        ready.unlink(missing_ok=True)
        probe_env = {**env, 'READINESS_CLEANUP_PROBE': mode}
        proc = launch_actor(['node', str(APP / 'e2e/demo-readiness.cjs')], 'driver', probe_env)
        try:
            deadline = time.monotonic() + 15
            while not ready.exists():
                assert proc.poll() is None, 'cleanup probe exited before ready'
                if time.monotonic() > deadline:
                    raise TimeoutError('cleanup probe ready deadline')
                time.sleep(.05)
        finally:
            result = cleanup(proc, None, {}, env, timeout=.3 if mode == 'ignore-term' else 8)
        assert not any(b['survives'] for b in result['browsers'])
        assert not result['errors'], result
        if mode != 'ignore-term':
            report = json.loads((EVIDENCE / f'cleanup-node-{mode}.json').read_text())
            assert report['browserClosed']
            assert bool(report['errors']) == (mode == 'context-close-error')
        else:
            assert result['driver']['forced']
        results.append({'case': mode, 'result': result})
    (EVIDENCE / 'cleanup-tests.json').write_text(json.dumps(results, indent=2))
    print('PASS cleanup: driver timeout, independent cleanup error, Node TERM, context close failure, owned Chrome fallback', flush=True)
    return 0


def start_server(env, log, on_created, inject=False):
    proc = None
    ready = False
    try:
        proc = launch_actor([str(PYTHON), str(SELF), '--serve'], 'server', env,
                            stdout=log, stderr=subprocess.STDOUT)
        on_created(proc)
        if inject:
            raise ValueError('controlled exception immediately after server Popen')
        for _ in range(100):
            if proc.poll() is not None:
                raise RuntimeError('backend exited; see backend.log')
            try:
                with urllib.request.urlopen(env['BASE'] + '/api/health', timeout=1) as r:
                    if r.status == 200:
                        ready = True
                        return proc
            except OSError:
                time.sleep(.1)
        raise RuntimeError('backend readiness deadline')
    finally:
        if proc is not None and not ready:
            stop(proc)


def lifecycle_workload(env, mode):
    server = driver = None
    audit = {'probe': mode}
    def remember(proc):
        nonlocal server
        server = proc
    try:
        with (EVIDENCE / 'backend.log').open('w') as log:
            if mode == 'leader-exit':
                code = ('import os,signal,time; child=os.fork(); '
                        'signal.signal(signal.SIGTERM,signal.SIG_IGN); '
                        'time.sleep(60) if child==0 else None')
                server = launch_actor([str(PYTHON), '-c', code], 'server', env,
                                      stdout=log, stderr=subprocess.STDOUT)
                server.wait(timeout=10)
                audit['leaderGoneBeforeCleanup'] = {'pid': server.pid, 'members': group_members(server.pid)}
                assert audit['leaderGoneBeforeCleanup']['members'], 'fixture child must outlive leader'
                return 0
            start_server(env, log, remember, inject=mode == 'startup-exception')
            ready = STATE / 'probe-ready'
            probe_env = {**env, 'READINESS_CLEANUP_PROBE': 'ignore-term'}
            driver = launch_actor(['node', str(APP / 'e2e/demo-readiness.cjs')], 'driver', probe_env,
                                  stdout=log, stderr=subprocess.STDOUT)
            deadline = time.monotonic() + 15
            while not ready.exists():
                if driver.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError('lifecycle Chrome probe did not become ready')
                time.sleep(.05)
            (EVIDENCE / 'probe-ready.json').write_text(json.dumps({'insidePid': os.getpid(),
                'serverPid': server.pid, 'driverPid': driver.pid}))
            while True:
                time.sleep(.1)
    finally:
        result = cleanup(driver, server, audit, env, timeout=.3)
        if result['errors'] or any(r['survives'] for r in result['actors'] + result['browsers']):
            raise RuntimeError(f'probe cleanup failed: {result}')


def slot_command(action, *arguments):
    command = [sys.executable, str(SLOT), '--state-dir', str(SLOT_STATE),
               '--resource', f'local:127.0.0.1:{PORT}:buildclub-e2e', action, *arguments]
    result = subprocess.run(command, env=environment(STATE), capture_output=True, text=True, timeout=10)
    if result.returncode:
        raise RuntimeError(f'test-slot {action} exit{result.returncode}: {result.stderr}')
    return json.loads(result.stdout)


def own_workload(command, env):
    """The live lease owner stays outside the workload's kill boundary."""
    term = []
    def on_term(signum, _frame):
        term.append(signum)
    previous = signal.signal(signal.SIGTERM, on_term)
    try:
        lease = slot_command('acquire', '--owner-pid', str(os.getpid()), '--wait', '0')
    except BaseException:
        signal.signal(signal.SIGTERM, previous)
        raise
    audit = {'owner': os.getpid(), 'events': [{'event': 'acquired', 'at': time.monotonic()}]}
    child = None
    try:
        if term:
            return 143
        prepare_browser(env)
        child = subprocess.Popen(command, env=env, start_new_session=True)
        deadline = time.monotonic() + 480
        while child.poll() is None:
            if term or time.monotonic() >= deadline:
                audit['reason'] = 'owner-term' if term else 'owner-watchdog'
                break
            time.sleep(.05)
        audit['workloadExit'] = child.poll()
        audit['leaseBeforeCleanup'] = slot_command('status')
        assert audit['leaseBeforeCleanup']['held']
        return 143 if term else (child.returncode if child.returncode is not None else 124)
    finally:
        try:
            audit['events'].append({'event': 'cleanup-start', 'at': time.monotonic()})
            result = cleanup(child, None, audit, env, timeout=1)
            clean = not result['errors'] and not any(r['survives'] for r in result['actors'] + result['browsers'])
            if child is not None and group_members(child.pid):
                clean = False
                result['errors'].append('workload group is not empty')
            if not clean:
                raise RuntimeError(f'owner cannot prove cleanup; lease not released: {result}')
            audit['events'].append({'event': 'groups-empty', 'at': time.monotonic()})
            assert slot_command('status')['held'], 'real port lease must still be held after cleanup'
            slot_command('release', '--token', lease['token'])
            audit['events'].append({'event': 'released', 'at': time.monotonic()})
            audit['leaseAfterRelease'] = slot_command('status')
            assert not audit['leaseAfterRelease']['held']
        finally:
            (EVIDENCE / 'owner-lifecycle.json').write_text(json.dumps(audit, indent=2))
            signal.signal(signal.SIGTERM, previous)


def lifecycle_tests():
    results = []
    for mode in ('owner-term', 'inside-term', 'watchdog', 'startup-exception', 'leader-exit'):
        evidence = EVIDENCE / mode
        env = environment(STATE)
        env['READINESS_EVIDENCE'] = str(evidence)
        child = None
        try:
            with (EVIDENCE / f'{mode}.log').open('w') as log:
                child = subprocess.Popen([str(PYTHON), str(SELF), '--lifecycle-probe', mode], env=env,
                                         stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
                if mode in ('owner-term', 'inside-term'):
                    deadline = time.monotonic() + 25
                    ready = evidence / 'probe-ready.json'
                    while not ready.exists():
                        if child.poll() is not None or time.monotonic() > deadline:
                            raise RuntimeError(f'{mode}: readiness failed')
                        time.sleep(.05)
                    pid = child.pid if mode == 'owner-term' else json.loads(ready.read_text())['insidePid']
                    os.kill(pid, signal.SIGTERM)
                code = child.wait(timeout=30)
            expected = {'owner-term': 143, 'inside-term': 143, 'watchdog': 124,
                        'startup-exception': 1, 'leader-exit': 0}[mode]
            assert code == expected, (mode, code)
            report = json.loads((evidence / 'owner-lifecycle.json').read_text())
            assert report['leaseBeforeCleanup']['held']
            assert not report['leaseAfterRelease']['held']
            assert not report['cleanup']['errors']
            assert not any(r['survives'] or r['groupMembers'] for r in report['cleanup']['actors'] + report['cleanup']['browsers'])
            assert [e['event'] for e in report['events']] == ['acquired', 'cleanup-start', 'groups-empty', 'released']
            if mode == 'leader-exit':
                inside_report = json.loads((evidence / 'lifecycle.json').read_text())
                assert inside_report['leaderGoneBeforeCleanup']['members']
                assert any(r['leaderMissing'] and r['membersBefore'] for r in inside_report['cleanup']['actors'])
            results.append({'mode': mode, 'exit': code, 'report': report})
            print(f'PASS {mode}: real port lease held until owned groups empty, then released', flush=True)
        finally:
            if child is not None and child.poll() is None:
                child.terminate()
                child.wait(timeout=20)
    (EVIDENCE / 'lifecycle-tests.json').write_text(json.dumps(results, indent=2))
    return 0


def inside(red=False, selftest=False, probe=None):
    if red:
        print('intentional readiness harness RED', flush=True)
        return 7
    env = dict(os.environ)
    if probe:
        return lifecycle_workload(env, probe)
    if selftest:
        return cleanup_tests(env)
    # TEST-NET is not a provider; the OS must reject connect before any traffic.
    with socket.socket() as probe:
        probe.settimeout(.5)
        try:
            probe.connect(('192.0.2.1', 9))
        except PermissionError:
            print('PASS OS sandbox rejects external socket', flush=True)
        else:
            raise RuntimeError('network sandbox did not reject external socket')
    with (EVIDENCE / 'zero-spend.log').open('w') as log:
        zero = subprocess.run([str(PYTHON), '-B', '-m', 'pytest', '-q', '-p', 'no:cacheprovider',
                               '--basetemp', str(STATE / 'pytest-zero'),
                               str(APP / 'backend/tests/test_zero_spend.py')], env=env,
                              stdout=log, stderr=subprocess.STDOUT)
    print(f'zero-spend provider/network spy suite exit={zero.returncode}', flush=True)
    if zero.returncode:
        return zero.returncode
    build = """const {build}=await import(process.env.APP+'/node_modules/vite/dist/node/index.js');
const {default:react}=await import(process.env.APP+'/node_modules/@vitejs/plugin-react/dist/index.js');
await build({root:process.env.APP,configFile:false,envFile:false,plugins:[react()],
cacheDir:process.env.READINESS_STATE+'/vite-cache',build:{outDir:process.env.READINESS_STATE+'/dist',emptyOutDir:true}});"""
    with (EVIDENCE / 'build.log').open('w') as log:
        result = subprocess.run(['node', '--input-type=module', '-e', build], env=env,
                                stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        print('FAIL build; see build.log', flush=True)
        return result.returncode
    server = driver = None
    audit = {'restarts': [], 'media': {}, 'cleanup': {}}
    request, done = STATE / 'restart-request', STATE / 'restart-done'
    request.unlink(missing_ok=True)
    done.unlink(missing_ok=True)

    def start(log):
        def remember(proc):
            nonlocal server
            server = proc
        return start_server(env, log, remember)

    try:
        with (EVIDENCE / 'backend.log').open('w') as log:
            server = start(log)
            with (EVIDENCE / 'ui.log').open('w') as output:
                driver = launch_actor(['node', str(APP / 'e2e/demo-readiness.cjs')], 'driver', env,
                                      stdout=output, stderr=subprocess.STDOUT)
                deadline = time.monotonic() + 420
                while driver.poll() is None:
                    if time.monotonic() > deadline:
                        raise TimeoutError('UI deadline')
                    if request.exists():
                        token = request.read_text()
                        request.unlink()
                        before = hashes()
                        old = server.pid
                        stop(server)
                        db_before = hashlib.sha256((STATE / 'data.db').read_bytes()).hexdigest()
                        server = start(log)
                        record = {'token': token, 'oldPid': old, 'newPid': server.pid,
                                  'mediaBefore': before, 'mediaAfter': hashes(),
                                  'dbBefore': db_before,
                                  'dbAfter': hashlib.sha256((STATE / 'data.db').read_bytes()).hexdigest()}
                        assert record['mediaBefore'] == record['mediaAfter']
                        assert record['dbBefore'] == record['dbAfter']
                        assert old != server.pid
                        audit['restarts'].append(record)
                        done.write_text(json.dumps(record))
                    time.sleep(.05)
                return driver.returncode
    finally:
        result = cleanup(driver, server, audit, env)
        if result['errors'] or any(b['survives'] for b in result['browsers'] + result['actors']):
            raise RuntimeError(f'cleanup incomplete: {result}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inside', action='store_true')
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--red', action='store_true')
    parser.add_argument('--cleanup-selftest', action='store_true')
    parser.add_argument('--lifecycle-selftest', action='store_true')
    parser.add_argument('--lifecycle-probe', choices=['owner-term', 'inside-term', 'watchdog', 'startup-exception', 'leader-exit'])
    args = parser.parse_args()
    if args.serve:
        serve()
        return 0
    if args.inside:
        def on_term(_signum, _frame):
            signal.signal(signal.SIGTERM, signal.SIG_IGN)
            raise InterruptedError('inside received TERM')
        signal.signal(signal.SIGTERM, on_term)
        register('workload', os.environ)
        try:
            return inside(args.red, args.cleanup_selftest, args.lifecycle_probe)
        except InterruptedError:
            return 143
    EVIDENCE.mkdir(parents=True, exist_ok=False)
    STATE.mkdir(exist_ok=True)
    print(f'evidence={EVIDENCE}', flush=True)
    if args.lifecycle_selftest:
        return lifecycle_tests()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', PORT))
    env = environment(STATE)
    env.update(APP=str(APP), READINESS_STATE=str(STATE), READINESS_EVIDENCE=str(EVIDENCE),
               BASE=f'http://127.0.0.1:{PORT}', PW_CORE=str(PW),
               REMOTION_APP_DIR=str(STATE / 'render-disabled'), MOCK_GEN_DELAY_S='.05')
    for key in ('DAILY_APIFY_USD', 'DAILY_CLAUDE_USD', 'DAILY_GEN_IMAGE_USD',
                'DAILY_GEN_VIDEO_USD', 'DAILY_GEN_VOICE_USD', 'DAILY_JEV_USD',
                'DAILY_SCRAPECREATORS_CREDITS', 'MAX_USD_PER_SEARCH', 'MAX_USD_PER_MEDIANS'):
        env[key] = '0'
    policy = EVIDENCE / 'http.sb'
    policy.write_text(profile(EVIDENCE) + f'\n(allow network-outbound (remote ip "localhost:{PORT}"))\n'
                      f'(allow network-inbound (local ip "localhost:{PORT}"))\n'
                      f'(allow network-bind (local ip "localhost:{PORT}"))\n')
    command = ['/usr/bin/sandbox-exec', '-f', str(policy), str(PYTHON), str(SELF), '--inside']
    if args.red:
        command.append('--red')
    if args.cleanup_selftest:
        command.append('--cleanup-selftest')
    if args.lifecycle_probe:
        command.extend(['--lifecycle-probe', args.lifecycle_probe])
    if args.lifecycle_probe == 'watchdog':
        # This fixture kills the workload with the real CLI. The independent
        # owner retains the actual port lease until it has cleaned every actor.
        command = [sys.executable, str(SLOT), '--state-dir', str(EVIDENCE / 'watchdog-slot'),
                   '--resource', 'fixture:owned-watchdog', 'with-command', '--wait', '0',
                   '--timeout', '5', '--', *command]
    (EVIDENCE / ('red-command.json' if args.red else 'command.json')).write_text(json.dumps(command))
    return own_workload(command, env)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--browser']:
        browser_entry()
    elif sys.argv[1:2] == ['--actor']:
        actor_entry()
    else:
        sys.exit(main())

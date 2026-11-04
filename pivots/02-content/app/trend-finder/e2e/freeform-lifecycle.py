"""Deterministic last-snapshot / reparent regression; no browser or network."""
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time

sys.dont_write_bytecode = True
RUNNER = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[5] / 'bin/freeform-e2e.py'
spec = importlib.util.spec_from_file_location('runner', RUNNER)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


def wait_for(predicate):
    until = time.monotonic() + 5
    while not predicate():
        assert time.monotonic() < until, 'barrier timed out'
        time.sleep(.005)


with tempfile.TemporaryDirectory(prefix='freeform-lifecycle-') as folder:
    work = Path(folder)
    release, started = work / 'release', work / 'started.json'
    launcher = [sys.executable]
    if hasattr(runner, 'install_launchers'):
        runner.install_launchers(work, Path(sys.executable))
        launcher = [str(work / 'render-browser')]
    # The parent is alive at the final snapshot, then launches a detached child and exits.
    child_code = f"import os,json,time; from pathlib import Path; Path({str(started)!r}).write_text(json.dumps({{'pid':os.getpid()}})); time.sleep(60)"
    parent_code = f"import subprocess,time; from pathlib import Path; p=Path({str(release)!r});\nwhile not p.exists(): time.sleep(.005)\nsubprocess.Popen({launcher + ['-c', child_code]!r},start_new_session=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)"
    parent = subprocess.Popen([sys.executable, '-c', parent_code], start_new_session=True)
    tree = runner.OwnedTree(parent.pid, work) if hasattr(runner, 'install_launchers') else runner.OwnedTree(parent.pid)
    tree.stop.set()
    tree.thread.join()
    capture = tree.capture
    fired = False

    def barrier_capture():
        global fired
        capture()
        if not fired:
            fired = True
            release.touch()
            parent.wait(timeout=5)
            # A registered launcher records its own birth before deciding whether exec is allowed.
            wait_for(lambda: started.exists() or (work / 'launch-audit.jsonl').exists())
            time.sleep(.05)

    tree.capture = barrier_capture
    try:
        tree.close()
        assert fired and parent.poll() is not None
        assert not started.exists(), 'late detached engine escaped after final snapshot / parent exit'
        records = [json.loads(line) for line in (work / 'launch-audit.jsonl').read_text().splitlines()]
        assert records and all(not r['allowed'] for r in records)
        wait_for(lambda: all(not runner.same_process(r['pid'], r['birth']) for r in records))
        print('PASS final snapshot barrier: detached late launcher refused after parent exit; all recorded PID+birth gone')
    finally:
        if started.exists():
            pid = json.loads(started.read_text())['pid']
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        parent.wait(timeout=5)


# An allowed launcher may be reparented before any poll sees it. Registration,
# rather than PPID discovery, must still reclaim its exact process group.
with tempfile.TemporaryDirectory(prefix='freeform-lifecycle-') as folder:
    work = Path(folder)
    runner.install_launchers(work, Path(sys.executable))
    started = work / 'started.json'
    engine = f"import os,json,time,subprocess,sys; from pathlib import Path; child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)']); Path({str(started)!r}).write_text(json.dumps({{'pid':os.getpid(),'child':child.pid}})); time.sleep(60)"
    release = work / 'release'
    parent_code = f"import subprocess,time; from pathlib import Path; p=Path({str(release)!r});\nwhile not p.exists(): time.sleep(.005)\nsubprocess.Popen({[str(work / 'render-browser'), '-c', engine]!r},start_new_session=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)"
    parent = subprocess.Popen([sys.executable, '-c', parent_code], start_new_session=True)
    tree = runner.OwnedTree(parent.pid, work)
    tree.stop.set()
    tree.thread.join()
    record = None
    child_pid, child_birth = None, None
    try:
        release.touch()
        parent.wait(timeout=5)
        wait_for(started.exists)
        record = json.loads((work / 'launch-audit.jsonl').read_text().splitlines()[0])
        assert record['allowed'] and record['pid'] not in tree.owned
        assert runner.process_info(record['pid'])['parent'] == 1
        child_pid = json.loads(started.read_text())['child']
        child_birth = runner.process_info(child_pid)['birth']
        assert child_pid not in tree.owned
        tree.close()
        wait_for(lambda: not runner.same_process(record['pid'], record['birth']) and not runner.same_process(child_pid, child_birth))
        print('PASS registered detached launcher reparented to PID 1; leader and unpolled child PID+birth gone')
    finally:
        if record and runner.same_process(record['pid'], record['birth']):
            os.killpg(record['pid'], signal.SIGKILL)
        if child_pid and runner.same_process(child_pid, child_birth):
            os.kill(child_pid, signal.SIGKILL)
        if parent.poll() is None:
            parent.kill()
        parent.wait(timeout=5)

# A stale record must never authorize signaling an unrelated live PID/group.
with tempfile.TemporaryDirectory(prefix='freeform-lifecycle-') as folder:
    work = Path(folder)
    outsider = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'], start_new_session=True)
    parent = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'], start_new_session=True)
    tree = runner.OwnedTree(parent.pid, work)
    info = runner.process_info(outsider.pid)
    birth = info['birth'][:]
    info['birth'][1] += 1
    (work / 'launch-audit.jsonl').write_text(json.dumps({'pid': outsider.pid, **info, 'allowed': True}) + '\n')
    try:
        tree.close()
        assert runner.same_process(outsider.pid, birth), 'stale birth signaled unrelated process'
        print('PASS mismatched microsecond birth preserves unrelated live process/group')
    finally:
        outsider.kill()
        outsider.wait(timeout=5)
        parent.wait(timeout=5)

"""Verification-only checks for the OS boundary, including inherited child processes."""
import asyncio
import errno
import importlib.util
import os
from pathlib import Path
import socket
import signal
import subprocess
import sys
import time
from unittest.mock import patch

import pytest
import server

ROOT = Path(__file__).resolve().parents[6]


def require_boundary():
    if os.environ.get("BUILDCLUB_OFFLINE_VERIFY") != "1":
        pytest.skip("run through bash bin/verify.sh to test the OS boundary")


def test_offline_import_and_normal_dotenv_parser(tmp_path):
    require_boundary()
    program = """import sys
from pathlib import Path
original = Path.exists
def exists(path):
    if path.name == '.env':
        raise AssertionError('offline import probed dotenv')
    return original(path)
Path.exists = exists
sys.path.insert(0, sys.argv[1])
import server
assert not server.TOKEN
"""
    subprocess.run([sys.executable, "-c", program, str(ROOT / "pivots/02-content/app/trend-finder/backend")],
                   check=True, capture_output=True)
    fixture = tmp_path / "settings.fixture"
    fixture.write_text("BUILDCLUB_TEST_SETTING=fixture\n")
    with patch.dict(os.environ, {}, clear=True):
        server.load_env(fixture)
        assert os.environ["BUILDCLUB_TEST_SETTING"] == "fixture"


def test_os_denies_dotenv_read_in_child_even_without_toggle(tmp_path):
    require_boundary()
    forbidden = tmp_path / ".env"
    forbidden.write_text("synthetic fixture, never a real credential")
    program = "import pathlib,sys; pathlib.Path(sys.argv[1]).read_text()"
    result = subprocess.run([sys.executable, "-I", "-c", program, str(forbidden)],
                            env={}, capture_output=True, text=True)
    assert result.returncode != 0
    assert "PermissionError" in result.stderr
    # The boundary also follows aliases to the forbidden file.
    alias = tmp_path / "fixture-alias"
    alias.symlink_to(forbidden)
    with pytest.raises(PermissionError):
        alias.read_text()


def test_os_denies_ip_network_in_children_but_keeps_asyncio():
    require_boundary()
    async def local_loop():
        await asyncio.sleep(0)
    asyncio.run(local_loop())
    left, right = socket.socketpair()
    try:
        left.sendall(b"ok")
        assert right.recv(2) == b"ok"
    finally:
        left.close()
        right.close()
    for address in ("192.0.2.1", "127.0.0.1", "::1"):
        family = socket.AF_INET6 if ":" in address else socket.AF_INET
        with socket.socket(family) as connection:
            with pytest.raises(PermissionError) as error:
                connection.connect((address, 443))
            assert error.value.errno == errno.EPERM
    program = "import socket; socket.socket().connect(('192.0.2.1',443))"
    child = subprocess.run([sys.executable, "-I", "-c", program], env={}, capture_output=True)
    assert child.returncode != 0 and b"PermissionError" in child.stderr
    node = subprocess.run(["node", "-e", "require('net').connect(443,'192.0.2.1')"],
                          capture_output=True, timeout=10)
    assert node.returncode != 0 and b"EPERM" in node.stderr


def test_os_denies_checkout_writes():
    require_boundary()
    with pytest.raises(PermissionError):
        (ROOT / "verify-must-not-write.fixture").write_text("forbidden")


@pytest.fixture
def helper():
    require_boundary()
    spec = importlib.util.spec_from_file_location("verify_offline", ROOT / "bin/verify_offline.py")
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    return helper


@pytest.mark.parametrize("code,output", [(1, "intentional failing fixture"), (124, "step timed out")])
def test_gate_propagates_failure_and_cleans_temp(capsys, helper, code, output):
    paths = []

    def failing_fixture(command, temp, env):
        assert temp.is_dir()
        assert env["HOME"] == str(temp)
        assert "VERIFY_UNTRUSTED_MARKER" not in env
        paths.append(temp)
        return subprocess.CompletedProcess(command, code, output)

    with patch.dict(os.environ, {"VERIFY_UNTRUSTED_MARKER": "discard-me"}), \
            patch.object(sys, "argv", ["verify_offline.py", "full"]), \
            patch.object(helper, "run_step", failing_fixture):
        assert helper.main() == 1
    assert "verify: RED" in capsys.readouterr().out
    assert paths and all(not path.exists() for path in paths)


@pytest.mark.parametrize("exit_code", [0, 7, None], ids=["success", "failure", "timeout"])
def test_step_cleans_ordinary_child_and_grandchild(helper, tmp_path, exit_code):
    require_boundary()
    from test_editing import gone

    ready, pids = tmp_path / "ready", tmp_path / "pids"
    child = ("import os,subprocess,sys,time; "
             "g=subprocess.Popen([sys.executable,'-I','-c','import time; time.sleep(60)']); "
             f"open({str(ready)!r},'w').write(str(os.getpid())+' '+str(g.pid)); time.sleep(60)")
    parent = ("import os,subprocess,sys,time\nfrom pathlib import Path\n"
              f"subprocess.Popen([sys.executable,'-I','-c',{child!r}])\n"
              f"ready=Path({str(ready)!r})\n"
              "while not ready.exists() or not ready.read_text(): time.sleep(0.01)\n"
              f"Path({str(pids)!r}).write_text(str(os.getpid())+' '+ready.read_text())\n"
              + ("time.sleep(60)\n" if exit_code is None else f"sys.exit({exit_code})\n"))
    unrelated = subprocess.Popen([sys.executable, "-I", "-c", "import time; time.sleep(60)"],
                                 start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        started = time.monotonic()
        result = helper.run_step([sys.executable, "-I", "-c", parent], tmp_path,
                                 helper.environment(tmp_path), timeout=2)
        assert time.monotonic() - started < 10
        assert result.returncode == (124 if exit_code is None else exit_code)
        if exit_code is None:
            assert "timed out" in result.stdout
        owned = [int(pid) for pid in pids.read_text().split()]
        assert len(owned) == 3 and all(gone(pid) for pid in owned)
        assert unrelated.poll() is None
    finally:
        if pids.exists():
            try:
                os.killpg(int(pids.read_text().split()[0]), signal.SIGKILL)
            except ProcessLookupError:
                pass
        unrelated.kill()
        unrelated.wait(5)


def test_step_launch_failure_is_red(helper, tmp_path):
    result = helper.run_step([str(tmp_path / "no-such-command")], tmp_path, helper.environment(tmp_path))
    assert result.returncode != 0 and "could not start" in result.stdout

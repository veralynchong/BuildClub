"""Offline gate for trusted project tests, not a sandbox for hostile code.

Detached descendants outside the owned group and pre-existing hardlink aliases are
not comprehensively controlled. No dependency installation or live services.
"""
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "pivots/02-content/app/trend-finder"
PYTHON = APP / "backend/.venv/bin/python"


def profile(temp):
    import pwd

    # Unnamed socketpairs still support asyncio/TestClient with all network operations denied.
    home = Path(pwd.getpwuid(os.getuid()).pw_dir)
    return f'''(version 1)
(allow default)
(deny network*)
(deny file-read-data (regex #"(^|/)\\.env($|[./])" #"(^|/)(auth\\.json|api-keys\\.fish)$"))
(deny file-read-data {" ".join(f"(subpath {json.dumps(str(home / folder))})" for folder in (".ssh", ".config", ".claude", ".codex"))})
(deny appleevent-send)
(deny process-exec (literal "/usr/bin/open") (literal "/usr/bin/osascript"))
(deny file-write*)
(allow file-write* (subpath {json.dumps(str(temp))}) (literal "/dev/null"))
'''


def environment(temp):
    return {"PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
            "HOME": str(temp), "TMPDIR": str(temp), "XDG_CACHE_HOME": str(temp / "cache"),
            "PYTHONPYCACHEPREFIX": str(temp / "pycache"), "PYTHONDONTWRITEBYTECODE": "1",
            "PYTEST_DISABLE_PLUGIN_AUTOLOAD": "1", "BUILDCLUB_OFFLINE_VERIFY": "1",
            "LC_ALL": "en_US.UTF-8", "TZ": "Australia/Sydney"}


def run_step(command, temp, env, timeout=120):
    # File output avoids waiting for inherited pipe handles after a step exits.
    with tempfile.TemporaryFile(dir=temp) as log:
        try:
            proc = subprocess.Popen(command, cwd=ROOT, env=env, start_new_session=True,
                                    stdout=log, stderr=subprocess.STDOUT)
        except OSError as error:
            return subprocess.CompletedProcess(command, 1, f"could not start: {error}")
        note = ""
        try:
            try:
                code = proc.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                code = 124
                note = f"step timed out after {timeout}s\n"
        finally:
            # Only the group created by this step is ours. A setsid child can escape it.
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            proc.wait(timeout=5)
        log.seek(0, os.SEEK_END)
        log.seek(max(0, log.tell() - 65536))
        output = log.read().decode("utf-8", errors="replace")
    return subprocess.CompletedProcess(command, code, note + output)


def main():
    mode = sys.argv[1:] or ["full"]
    if mode not in (["fast"], ["full"]):
        print("usage: bash bin/verify.sh [fast|full]", file=sys.stderr)
        return 2
    if sys.platform != "darwin" or not Path("/usr/bin/sandbox-exec").is_file():
        print("verify: RED — macOS sandbox-exec required; offline enforcement unavailable")
        return 1
    if not PYTHON.is_file() or not shutil.which("node"):
        print("verify: RED — existing backend .venv and Node required; nothing installed")
        return 1
    # Both modes deliberately retain the complete offline suite.
    failed = False
    with tempfile.TemporaryDirectory(prefix="buildclub-verify-") as work:
        temp = Path(work).resolve()
        policy = temp / "offline.sb"
        policy.write_text(profile(temp))
        env = environment(temp)
        prefix = ["/usr/bin/sandbox-exec", "-f", str(policy)]
        steps = [
            ("backend compiles", [str(PYTHON), "-m", "py_compile", str(APP / "backend/server.py")]),
            ("backend loads without dotenv", [str(PYTHON), "-c",
             f"import sys; sys.path.insert(0, {str(APP / 'backend')!r}); import server"]),
            ("backend tests", [str(PYTHON), "-m", "pytest", "-q", "-p", "no:cacheprovider",
                               "--basetemp", str(temp / "pytest"), str(APP / "backend/tests")]),
            ("frontend unit tests", [shutil.which("node"), "--test", str(APP / "unit/")]),
            ("beta instance script", ["/bin/bash", str(ROOT / "bin/test_beta_instance.sh")]),
        ]
        for name, command in steps:
            # The beta script test must read the generated .env, which the sandbox hides; it never touches the network.
            result = run_step(command if name == "beta instance script" else prefix + command, temp, env)
            print(f"{'PASS' if result.returncode == 0 else 'FAIL'}  {name}", flush=True)
            if not result.returncode and name in ("backend tests", "frontend unit tests"):
                print("\n".join(result.stdout.splitlines()[-4:]), flush=True)
            if result.returncode:
                print("\n".join(result.stdout.splitlines()[-20:]), flush=True)
                failed = True
    print(f"verify: {'RED' if failed else 'GREEN'}")
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())

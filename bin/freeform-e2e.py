#!/usr/bin/env python3
"""Run the freeform UI check against owned local services with external network denied."""
import argparse
import json
import os
from pathlib import Path
import pwd
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "pivots/02-content/app/trend-finder"
PYTHON = APP / "backend/.venv/bin/python"
BACKEND_PORT = 8872
RENDER_PORT = 8892
PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
DEFAULT_PW = Path("/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core")


def tools(pw):
    required = [Path("/usr/bin/sandbox-exec"), PYTHON,
                APP / "node_modules/typescript/package.json", pw / "package.json"]
    missing = [str(p) for p in required if not p.is_file()]
    missing += [name for name in ("node", "ffmpeg", "ffprobe") if not shutil.which(name, path=PATH)]
    browsers = APP / "node_modules/.remotion/chrome-headless-shell"
    if not any(p.is_file() for p in browsers.glob("**/chrome-headless-shell")):
        missing.append("existing Remotion Chrome Headless Shell (downloads are forbidden)")
    if missing:
        raise RuntimeError("Missing existing tools: " + ", ".join(missing))


def policy(work, evidence):
    home = Path(pwd.getpwuid(os.getuid()).pw_dir)
    sensitive = " ".join(f"(subpath {json.dumps(str(home / p))})"
                         for p in (".ssh", ".config", ".claude", ".codex"))
    return f'''(version 1)
(allow default)
(deny network*)
(allow network-outbound (remote ip "localhost:*"))
(allow network-inbound (local ip "localhost:*"))
(allow network-bind (local ip "localhost:*"))
(allow network* (local unix-socket) (remote unix-socket))
(deny file-read-data (regex #"(^|/)\\.env($|[./])" #"(^|/)(auth\\.json|api-keys\\.fish)$"))
(deny file-read-data {sensitive})
(deny appleevent-send)
(deny process-exec (literal "/usr/bin/open") (literal "/usr/bin/osascript"))
(deny file-write*)
(allow file-write* (subpath {json.dumps(str(work))})
                  (subpath {json.dumps(str(evidence))})
                  (subpath {json.dumps(str(APP / '.remotion-bundle'))})
                  (literal "/dev/null"))
'''


def clean_environment(work, evidence, pw):
    return {"PATH": PATH, "HOME": str(work), "TMPDIR": str(work),
            "XDG_CACHE_HOME": str(work / "cache"), "PYTHONDONTWRITEBYTECODE": "1",
            "BUILDCLUB_OFFLINE_VERIFY": "1", "REMOTION_APP_DIR": str(APP),
            "REMOTION_PORT": str(RENDER_PORT), "MOCK_GEN_DELAY_S": "0.05",
            "DAILY_APIFY_USD": "0", "DAILY_CLAUDE_USD": "0", "DAILY_JEV_USD": "0",
            "DAILY_GEN_IMAGE_USD": "0", "DAILY_GEN_VIDEO_USD": "0", "DAILY_GEN_VOICE_USD": "0",
            "DAILY_SCRAPECREATORS_CREDITS": "0", "LC_ALL": "en_US.UTF-8",
            "TZ": "Australia/Sydney", "PW_CORE": str(pw),
            "BASE": f"http://127.0.0.1:{BACKEND_PORT}",
            "FREEFORM_EVIDENCE_DIR": str(evidence), "FREEFORM_WORK_DIR": str(work)}


def check_ports():
    for port in (BACKEND_PORT, RENDER_PORT):
        with socket.socket() as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError as exc:
                raise RuntimeError(f"Port {port} is in use; no existing service will be stopped.") from exc


def inside(args):
    work, evidence = args.work, args.evidence
    env = clean_environment(work, evidence, args.pw_core)
    # A copy keeps the database and every generated asset away from normal app state.
    shutil.copytree(APP / "backend", work / "backend", ignore=shutil.ignore_patterns(
        ".venv", ".env*", "auth.json", "api-keys.fish", "data.db*", "__pycache__",
        "cache", "jobs", "channels", "media", "*.log"))
    shutil.copytree(APP / "dist", work / "dist")
    user = subprocess.run([str(PYTHON), str(work / "backend/server.py"), "add-user",
                           "test@example.com", "E2E Tester", "E2E Agency", "--password-stdin"],
                          input="pw-for-e2e\n", text=True, cwd=work, env=env, capture_output=True)
    if user.returncode:
        raise RuntimeError("Could not create the temporary test account: " + user.stderr[-2000:])
    with (evidence / "backend.log").open("w") as log:
        server = subprocess.Popen([str(PYTHON), "-m", "uvicorn", "server:app", "--app-dir",
                                   str(work / "backend"), "--host", "127.0.0.1",
                                   "--port", str(BACKEND_PORT)], cwd=work, env=env,
                                  stdout=log, stderr=subprocess.STDOUT)
        try:
            for _ in range(120):
                if server.poll() is not None:
                    raise RuntimeError("Owned backend exited; inspect backend.log.")
                try:
                    with urllib.request.urlopen(env["BASE"] + "/api/health", timeout=1) as response:
                        if response.status == 200:
                            break
                except (urllib.error.URLError, TimeoutError):
                    pass
                time.sleep(0.25)
            else:
                raise RuntimeError("Owned backend did not become ready.")
            return subprocess.run([shutil.which("node", path=PATH), str(args.script)],
                                  cwd=APP, env=env, check=False).returncode
        finally:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-tools", action="store_true")
    parser.add_argument("--pw-core", type=Path, default=DEFAULT_PW)
    parser.add_argument("--script", type=Path, default=APP / "e2e/freeform.cjs")
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--inside", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--work", type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    args.pw_core = args.pw_core.resolve()
    args.script = args.script.resolve()
    tools(args.pw_core)
    if args.check_tools:
        print("PASS existing Python, Node, Playwright, ffmpeg, ffprobe and Remotion browser; nothing installed")
        return 0
    if args.inside:
        return inside(args)
    if not args.script.is_file() or not (APP / "dist/index.html").is_file():
        raise RuntimeError("Build the frontend and provide the checked-in E2E script first.")
    check_ports()
    evidence = (args.evidence or Path(tempfile.mkdtemp(prefix="freeform-evidence-"))).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="freeform-ui-") as folder:
        work = Path(folder).resolve()
        profile = work / "local-only.sb"
        profile.write_text(policy(work, evidence))
        env = clean_environment(work, evidence, args.pw_core)
        command = ["/usr/bin/sandbox-exec", "-f", str(profile), sys.executable, str(Path(__file__).resolve()),
                   "--inside", "--work", str(work), "--evidence", str(evidence),
                   "--pw-core", str(args.pw_core), "--script", str(args.script)]
        proc = subprocess.Popen(command, cwd=ROOT, env=env, start_new_session=True)
        try:
            code = proc.wait(timeout=900)
        except subprocess.TimeoutExpired:
            code = 124
            print("FAIL local E2E exceeded 900 seconds", file=sys.stderr)
        finally:
            # This group belongs solely to this check, never another browser or server.
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            proc.wait(timeout=10)
        print(f"Evidence: {evidence}")
        return code


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as error:
        print(f"FAIL {error}", file=sys.stderr)
        sys.exit(1)

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
import threading
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "pivots/02-content/app/trend-finder"
PYTHON = APP / "backend/.venv/bin/python"
BACKEND_PORT = 8872
RENDER_PORT = 8892
MEDIA_PORT = 8893
DEBUG_PORT = 8894
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
    allowed = "\n".join(f'(allow network-outbound (remote ip "localhost:{port}"))\n(allow network-inbound (local ip "localhost:{port}"))\n(allow network-bind (local ip "localhost:{port}"))' for port in (BACKEND_PORT, RENDER_PORT, MEDIA_PORT, DEBUG_PORT))
    return f'''(version 1)
(allow default)
(deny network*)
{allowed}
(deny file-read-data (regex #"(^|/)\\.env($|[./])" #"(^|/)(auth\\.json|api-keys\\.fish)$"))
(deny file-read-data {sensitive})
(deny appleevent-send)
(deny process-exec (literal "/usr/bin/open") (literal "/usr/bin/osascript"))
(deny file-write*)
(allow file-write* (subpath {json.dumps(str(work))})
                  (subpath {json.dumps(str(evidence))})
                  (literal "/dev/null"))
'''


def clean_environment(work, evidence, pw):
    return {"PATH": PATH, "HOME": str(work), "TMPDIR": str(work),
            "XDG_CACHE_HOME": str(work / "cache"), "PYTHONDONTWRITEBYTECODE": "1",
            "BUILDCLUB_OFFLINE_VERIFY": "1", "REMOTION_APP_DIR": str(work / "app"),
            "REMOTION_PORT": str(RENDER_PORT), "REMOTION_MEDIA_PORT": str(MEDIA_PORT),
            "REMOTION_BROWSER_EXECUTABLE": str(work / "render-browser"), "MOCK_GEN_DELAY_S": "0.05",
            "DAILY_APIFY_USD": "0", "DAILY_CLAUDE_USD": "0", "DAILY_JEV_USD": "0",
            "DAILY_GEN_IMAGE_USD": "0", "DAILY_GEN_VIDEO_USD": "0", "DAILY_GEN_VOICE_USD": "0",
            "DAILY_SCRAPECREATORS_CREDITS": "0", "LC_ALL": "en_US.UTF-8",
            "TZ": "Australia/Sydney", "PW_CORE": str(pw),
            "BASE": f"http://127.0.0.1:{BACKEND_PORT}",
            "FREEFORM_EVIDENCE_DIR": str(evidence), "FREEFORM_WORK_DIR": str(work),
            "FREEFORM_PROXY_SOCKET": str(work / "forbidden-proxy.sock")}


def check_ports():
    for port in (BACKEND_PORT, RENDER_PORT, MEDIA_PORT, DEBUG_PORT):
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
    render_app = work / "app"
    render_app.mkdir()
    for name in ("render", "src", "public"):
        shutil.copytree(APP / name, render_app / name)
    for name in ("package.json", "package-lock.json", "tsconfig.json"):
        if (APP / name).is_file():
            shutil.copy2(APP / name, render_app / name)
    (render_app / "node_modules").symlink_to((APP / "node_modules").resolve(), target_is_directory=True)
    browser = next(p for p in (APP / "node_modules/.remotion/chrome-headless-shell").glob("**/chrome-headless-shell") if p.is_file()).resolve()
    wrapper = work / "render-browser"
    wrapper.write_text("#!" + sys.executable + "\nimport os,sys\n" +
                       "args=[arg.replace('--remote-debugging-port=0','--remote-debugging-port=" + str(DEBUG_PORT) + "') for arg in sys.argv[1:]]\n" +
                       "os.execv(" + repr(str(browser)) + ",[" + repr(str(browser)) + "]+args)\n")
    wrapper.chmod(0o700)
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



class OwnedTree:
    """Track descendants outside the sandbox, including renderer/Chrome session leaders."""
    def __init__(self, root):
        self.root = root
        self.owned = {}
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.capture()
        self.thread = threading.Thread(target=self.watch, daemon=True)
        self.thread.start()

    @staticmethod
    def snapshot():
        result = subprocess.run(["/bin/ps", "-axo", "pid=,ppid=,lstart="],
                                capture_output=True, text=True, check=True)
        found = {}
        for line in result.stdout.splitlines():
            parts = line.split(None, 2)
            if len(parts) == 3:
                found[int(parts[0])] = (int(parts[1]), parts[2])
        return found

    def capture(self):
        current = self.snapshot()
        with self.lock:
            if not self.owned and self.root in current:
                self.owned[self.root] = current[self.root][1]
            known = {pid for pid, stamp in self.owned.items()
                     if pid in current and current[pid][1] == stamp}
            changed = True
            while changed:
                changed = False
                for pid, (parent, stamp) in current.items():
                    if parent in known and pid not in known:
                        self.owned[pid] = stamp
                        known.add(pid)
                        changed = True

    def watch(self):
        while not self.stop.wait(0.05):
            self.capture()

    def signal_owned(self, sig):
        self.capture()
        current = self.snapshot()
        with self.lock:
            targets = list(self.owned.items())
        for pid, stamp in targets:
            if pid in current and current[pid][1] == stamp:
                try:
                    os.kill(pid, sig)
                except ProcessLookupError:
                    pass

    def close(self):
        try:
            self.signal_owned(signal.SIGTERM)
            time.sleep(0.5)
            self.signal_owned(signal.SIGKILL)
        finally:
            self.stop.set()
            self.thread.join(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-tools", action="store_true")
    parser.add_argument("--timeout", type=float, default=900)
    parser.add_argument("--pw-core", type=Path, default=DEFAULT_PW)
    parser.add_argument("--script", type=Path, default=APP / "e2e/freeform.cjs")
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--inside", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--work", type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if not 0 < args.timeout <= 900:
        parser.error("--timeout must be between 0 and 900 seconds")
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
        proxy = socket.socket(socket.AF_UNIX)
        proxy.bind(str(work / "forbidden-proxy.sock"))
        proxy.listen(1)
        proc = subprocess.Popen(command, cwd=ROOT, env=env, start_new_session=True)
        tree = OwnedTree(proc.pid)
        try:
            code = proc.wait(timeout=args.timeout)
        except subprocess.TimeoutExpired:
            code = 124
            print(f"FAIL local E2E exceeded {args.timeout}s", file=sys.stderr)
        finally:
            tree.close()
            proc.wait(timeout=10)
            proxy.close()
            (evidence / "owned-processes.json").write_text(json.dumps(tree.owned, indent=2))
        print(f"Evidence: {evidence}")
        return code


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as error:
        print(f"FAIL {error}", file=sys.stderr)
        sys.exit(1)

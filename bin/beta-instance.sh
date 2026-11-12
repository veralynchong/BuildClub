#!/usr/bin/env bash
# Production-like Trend Finder instance for one beta tester: launchd + Cloudflare quick tunnel + daily backups.
# Usage: bash bin/beta-instance.sh <install|update|status|backup|add-user> [daphne|collage] [email]
#   install <name>          copy backend + dist to ~/beta/<name>/app, write .env and the LaunchAgents, load them
#   update <name>           recopy backend + dist (keeps state/ and .env), restart the backend
#   status                  every installed instance: launchd pid, port, tunnel URL, spend (today / total)
#   backup <name>           sqlite .backup + media copy into backups/<stamp>/, newest 7 kept
#   add-user <name> <email> create a sign-in account; the password is read from stdin, never printed
# Overrides (tests): BETA_HOME, BETA_LAUNCHAGENTS, BETA_SOURCE_ENV, BETA_DIST, BETA_STAMP, BETA_NO_LAUNCHCTL=1,
#   TF_VENV, TF_APP_DIR (defaults to the instance's own app/, which gets render/, src/ and public/ for the video editor).
set -eu
cd "$(dirname "$0")/.."

usage="usage: bash bin/beta-instance.sh <install|update|status|backup|add-user> [daphne|collage] [email]"
TF=pivots/02-content/app/trend-finder
home="${BETA_HOME:-$HOME/beta}"
agents="${BETA_LAUNCHAGENTS:-$HOME/Library/LaunchAgents}"
source_env="${BETA_SOURCE_ENV:-/Users/tommy/Desktop/BuildClub/$TF/.env}"
# Not under ~/Desktop: macOS privacy protection blocks a launchd job from reading it, and uvicorn hangs at start.
venv="${TF_VENV:-/Users/tommy/orca/workspaces/BuildClub/lunch/$TF/backend/.venv}"
dist_src="${BETA_DIST:-$TF/dist}"
cloudflared="${CLOUDFLARED:-/opt/homebrew/bin/cloudflared}"
script="$(pwd)/bin/beta-instance.sh"

cmd="${1:-}"
[ -n "$cmd" ] || { echo "$usage" >&2; exit 2; }
shift

# Per-name settings: port, Remotion port, total budget in USD.
configure() {
  case "$1" in
    daphne)  port=8801; remotion_port=8811; total_usd=12;;
    collage) port=8802; remotion_port=8812; total_usd=8;;
    *) echo "error: name must be daphne or collage" >&2; exit 2;;
  esac
  name="$1"; base="$home/$name"; label="com.remake.beta.$name"; uid_="$(id -u)"
}

# launchctl is skipped in tests.
lc() { [ "${BETA_NO_LAUNCHCTL:-}" = 1 ] || launchctl "$@"; }

copy_app() {
  mkdir -p "$base/app/backend"
  # data.db and media are symlinks into state/, so they are excluded here and never deleted.
  rsync -a --delete --exclude .venv --exclude 'data.db*' --exclude cache --exclude jobs --exclude __pycache__ \
    --exclude .env --exclude media "$TF/backend/" "$base/app/backend/"
  rsync -a --delete "$dist_src/" "$base/app/dist/"
  # The video editor renders with Remotion from this same commit: render/, src/, public/, package.json and
  # package-lock.json (render-reel.mjs hashes it into the bundle key).
  for d in render src public; do rsync -a --delete "$TF/$d/" "$base/app/$d/"; done
  cp "$TF/package.json" "$TF/package-lock.json" "$base/app/"
  [ ! -e "$TF/node_modules" ] || ln -sfn "$(cd "$TF/node_modules" && pwd -P)" "$base/app/node_modules"
  # The backend reads data.db and media/ next to server.py; keep them in state/ across updates.
  mkdir -p "$base/state/media"
  ln -sfn "$base/state/data.db" "$base/app/backend/data.db"
  ln -sfn "$base/state/media" "$base/app/backend/media"
}

write_env() {
  local out="$base/app/.env"
  : >"$out"; chmod 600 "$out"
  sed -e "s/@BETA_TOTAL_USD@/$total_usd/" -e "s/@REMOTION_PORT@/$remotion_port/" bin/beta/instance.env.template >>"$out"
  # Only these keys are copied, by name. FAL_KEY, GEMINI_API_KEY, ELEVENLABS_* and the rest never are.
  [ -f "$source_env" ] || { echo "error: source keys file not found (set BETA_SOURCE_ENV)" >&2; exit 1; }
  grep -E '^(ANTHROPIC_API_KEY|APIFY_TOKEN|APIFY_[A-Z0-9_]*_ACTOR)=' "$source_env" >>"$out" || true
  echo "config:   $out (mode 600)"
}

write_plist() { # write_plist <file> <label> <keepalive 1|0> <log> <workdir> <extra xml> -- <program args...>
  local file="$1" lbl="$2" keep="$3" log="$4" wd="$5" extra="$6"; shift 7
  { cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$lbl</string>
  <key>ProgramArguments</key>
  <array>
EOF
    for a in "$@"; do printf '    <string>%s</string>\n' "$a"; done
    cat <<EOF
  </array>
  <key>WorkingDirectory</key><string>$wd</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key><string>$HOME</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>REMOTION_APP_DIR</key><string>${TF_APP_DIR:-$base/app}</string>
  </dict>
EOF
    if [ "$keep" = 1 ]; then echo '  <key>RunAtLoad</key><true/>'; echo '  <key>KeepAlive</key><true/>'; fi
    printf '%s\n' "$extra"
    cat <<EOF
  <key>StandardOutPath</key><string>$log</string>
  <key>StandardErrorPath</key><string>$log</string>
</dict>
</plist>
EOF
  } >"$file"
}

load_agent() { # load_agent <plist file> <label>
  lc bootout "gui/$uid_/$2" 2>/dev/null || true
  # bootout returns before the job is gone; bootstrap fails with an I/O error until it is.
  for _ in 1 2 3 4 5 6 7 8 9 10; do lc print "gui/$uid_/$2" >/dev/null 2>&1 || break; sleep 0.5; done
  lc bootstrap "gui/$uid_" "$1"
}

do_install() {
  configure "$1"
  [ -d "$dist_src" ] || { echo "error: $dist_src is missing; run 'npm run build' in $TF first" >&2; exit 1; }
  [ -x "$venv/bin/uvicorn" ] || { echo "error: no uvicorn in $venv (set TF_VENV)" >&2; exit 1; }
  mkdir -p "$base"/{app,state,backups,logs} "$agents"
  copy_app
  write_env
  # --proxy-headers is not needed: session_cookie_secure() reads X-Forwarded-Proto, which cloudflared sets to https.
  write_plist "$agents/$label.plist" "$label" 1 "$base/logs/backend.log" "$base/app" "" -- \
    "$venv/bin/uvicorn" server:app --app-dir backend --host 127.0.0.1 --port "$port"
  write_plist "$agents/$label.tunnel.plist" "$label.tunnel" 1 "$base/logs/tunnel.log" "$base" "" -- \
    "$cloudflared" tunnel --url "http://localhost:$port"
  write_plist "$agents/$label.backup.plist" "$label.backup" 0 "$base/logs/backup.log" "$PWD" \
    '  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>' -- \
    /bin/bash "$script" backup "$name"
  for p in "" .tunnel .backup; do plutil -lint "$agents/$label$p.plist" >/dev/null; done
  load_agent "$agents/$label.plist" "$label"
  load_agent "$agents/$label.tunnel.plist" "$label.tunnel"
  load_agent "$agents/$label.backup.plist" "$label.backup"
  echo "installed $name: port $port, state $base/state"
  open_warning
}

do_update() {
  configure "$1"
  [ -d "$base/app" ] || { echo "error: $name is not installed" >&2; exit 1; }
  [ -d "$dist_src" ] || { echo "error: $dist_src is missing; run 'npm run build' in $TF first" >&2; exit 1; }
  copy_app
  lc kickstart -k "gui/$uid_/$label"
  echo "updated $name"
}

do_backup() {
  configure "$1"
  [ -f "$base/state/data.db" ] || { echo "error: no database yet in $base/state" >&2; exit 1; }
  local dest="$base/backups/${BETA_STAMP:-$(date +%Y-%m-%d-%H%M)}"
  mkdir -p "$dest"
  sqlite3 "$base/state/data.db" ".backup '$dest/data.db'"
  rsync -a "$base/state/media/" "$dest/media/"
  # Stamps sort by time, so everything after the newest 7 goes.
  ls -1 "$base/backups" | sort -r | tail -n +8 | while read -r old; do rm -r "$base/backups/$old"; done
  echo "backup:   $dest"
}

# With no accounts the backend lets anyone in, so an instance must get one before its link goes out.
open_warning() {
  local users
  users="$(sqlite3 "$base/state/data.db" "SELECT count(*) FROM users" 2>/dev/null || echo 0)"
  [ "${users:-0}" -gt 0 ] || echo "WARNING: $name has no accounts, so anyone with the link gets in. Run: add-user $name <email>"
}

do_status() {
  local n
  for n in daphne collage; do
    configure "$n"
    [ -d "$base/app" ] || continue
    local pid code url spend
    pid="$(launchctl list "$label" 2>/dev/null | awk -F'= ' '/"PID"/ {gsub(/;/, "", $2); print $2}')"
    code="$(curl -s -o /dev/null -m 3 -w '%{http_code}' "http://localhost:$port/api/auth/me" || true)"
    url="$(grep -ho 'https://[a-z0-9-]*\.trycloudflare\.com' "$base/logs/tunnel.log" 2>/dev/null | tail -1 || true)"
    spend="$("${venv}/bin/python" - "$base/state/data.db" <<'PY' 2>/dev/null || echo "n/a"
import json, sqlite3, sys, time
try:
    rows = sqlite3.connect(sys.argv[1]).execute("SELECT key, value FROM store WHERE key LIKE 'spend:%'").fetchall()
except sqlite3.Error:
    rows = []
today, total = 0.0, 0.0
for key, value in rows:
    usd = sum(v for w, v in json.loads(value).items() if w != "scrapecreators")
    total += usd
    if key == "spend:" + time.strftime("%Y-%m-%d"):
        today = usd
print(f"today ${today:.2f}, total ${total:.2f}")
PY
)"
    echo "$n: pid ${pid:--}, port $port -> HTTP ${code:-000}, tunnel ${url:-none}, spend $spend"
    open_warning
  done
}

do_add_user() {
  configure "$1"
  local email="${2:-}"
  [ -n "$email" ] || { echo "$usage" >&2; exit 2; }
  # The password comes from stdin and goes straight to the backend; the backend reads its data.db via the symlink.
  (cd "$base/app" && "$venv/bin/python" backend/server.py add-user "$email" "Beta Tester" "Beta $name" --password-stdin)
}

case "$cmd" in
  install|update|backup|add-user) [ -n "${1:-}" ] || { echo "$usage" >&2; exit 2; }
    case "$cmd" in install) do_install "$@";; update) do_update "$@";; backup) do_backup "$@";; add-user) do_add_user "$@";; esac;;
  status) do_status;;
  *) echo "$usage" >&2; exit 2;;
esac

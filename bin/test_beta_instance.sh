#!/usr/bin/env bash
# Offline test for bin/beta-instance.sh: temp dirs only, no launchctl, no real secrets file.
set -u
cd "$(dirname "$0")/.."
tmp="$(mktemp -d "${TMPDIR:-/tmp}/beta-test.XXXXXX")" || exit 1; trap 'rm -r "$tmp"' EXIT
fails=0
check() { if "${@:2}"; then echo "ok   $1"; else echo "FAIL $1"; fails=$((fails + 1)); fi; }
absent() { ! grep -q "$1" "$2"; }  # absent <regex> <file>

mkdir -p "$tmp/dist"; echo '<html></html>' >"$tmp/dist/index.html"
src="$tmp/source-vars"
printf '%s\n' ANTHROPIC_API_KEY=fake-a APIFY_TOKEN=fake-b APIFY_TIKTOK_ACTOR=x FAL_KEY=fake-fal GEMINI_API_KEY=fake-g \
  ELEVENLABS_API_KEY=fake-e >"$src"
export BETA_HOME="$tmp/beta" BETA_SOURCE_ENV="$src" BETA_LAUNCHAGENTS="$tmp/agents" BETA_NO_LAUNCHCTL=1 BETA_DIST="$tmp/dist"
b="$tmp/beta/daphne"; s="bash bin/beta-instance.sh"

$s install daphne >"$tmp/install.log" 2>&1
check "install daphne succeeds" test $? -eq 0
for d in app/backend app/dist state backups logs; do check "dir $d" test -d "$b/$d"; done
check "server.py copied" test -f "$b/app/backend/server.py"
check "jobs not copied" test ! -e "$b/app/backend/jobs"
conf="$b/app/.env"
for line in BETA_TOTAL_USD=12 DAILY_GEN_IMAGE_USD=0 DAILY_GEN_VIDEO_USD=0 DAILY_GEN_VOICE_USD=0 REMOTION_PORT=8811 \
  ANTHROPIC_API_KEY=fake-a APIFY_TOKEN=fake-b APIFY_TIKTOK_ACTOR=x; do
  check "config has $line" grep -qx "$line" "$conf"
done
check "no FAL_KEY" absent '^FAL_KEY' "$conf"
check "no GEMINI_API_KEY" absent '^GEMINI_API_KEY' "$conf"
check "no ELEVENLABS" absent '^ELEVENLABS' "$conf"
check "config mode is 600" test "$(stat -f %Lp "$conf")" = 600
check "install output hides secrets" absent 'fake-' "$tmp/install.log"
for p in com.remake.beta.daphne com.remake.beta.daphne.tunnel com.remake.beta.daphne.backup; do
  check "plist $p lints" bash -c "plutil -lint \"$tmp/agents/$p.plist\" >/dev/null"
done
check "daphne plist uses port 8801" grep -q 8801 "$tmp/agents/com.remake.beta.daphne.plist"
check "tunnel plist targets port 8801" grep -q 'http://localhost:8801' "$tmp/agents/com.remake.beta.daphne.tunnel.plist"

$s install collage >/dev/null 2>&1
check "collage budget is 8" grep -qx BETA_TOTAL_USD=8 "$tmp/beta/collage/app/.env"
check "collage plist uses port 8802" grep -q 8802 "$tmp/agents/com.remake.beta.collage.plist"

$s install foo >/dev/null 2>&1; rc=$?
check "install foo exits 2" test "$rc" -eq 2

# update keeps state and config
echo keep >"$b/state/marker"; $s update daphne >/dev/null 2>&1
check "update keeps state" test -f "$b/state/marker"
check "update keeps config" grep -qx BETA_TOTAL_USD=12 "$conf"

# backup: readable copy, newest 7 kept
sqlite3 "$b/state/data.db" "CREATE TABLE t (x); INSERT INTO t VALUES (42);"
mkdir -p "$b/state/media"; echo m >"$b/state/media/a.txt"
for i in 1 2 3 4 5 6 7 8 9; do BETA_STAMP="2026-11-0$i-0300" $s backup daphne >/dev/null 2>&1; done
check "backup copy readable" test "$(sqlite3 "$b/backups/2026-11-09-0300/data.db" 'SELECT x FROM t')" = 42
check "backup has media" test -f "$b/backups/2026-11-09-0300/media/a.txt"
check "backup keeps 7" test "$(ls "$b/backups" | wc -l | tr -d ' ')" = 7
check "backup drops oldest" test ! -d "$b/backups/2026-11-01-0300"

# status runs without a live server
$s status >/dev/null 2>&1
check "status succeeds" test $? -eq 0

[ "$fails" -eq 0 ] && echo "beta-instance tests: PASS" || { echo "beta-instance tests: $fails FAILED"; exit 1; }

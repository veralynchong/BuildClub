#!/usr/bin/env bash
# Start verification with no inherited credentials or Python/shell startup hooks.
set -eu
cd "$(dirname "$0")/.."
if [ "$#" -eq 0 ]; then
  set -- full
fi
exec /usr/bin/env -i PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  python3 -I bin/verify_offline.py "${@}"

#!/usr/bin/env bash
# Offline paid-entry checks only: no inherited credentials or HTTP service.
set -eu
cd "$(dirname "$0")/.."

TF=pivots/02-content/app/trend-finder
if [ -e "$TF/.env" ]; then
  echo "Refused: local configuration exists; no configuration was read."
  exit 1
fi

exec env -i PATH=/opt/homebrew/bin:/usr/bin:/bin \
  DAILY_APIFY_USD=0 DAILY_CLAUDE_USD=0 DAILY_GEN_IMAGE_USD=0 \
  DAILY_GEN_VIDEO_USD=0 DAILY_GEN_VOICE_USD=0 DAILY_JEV_USD=0 \
  DAILY_SCRAPECREATORS_CREDITS=0 \
  "$TF/backend/.venv/bin/python" -B -m pytest -q -p no:cacheprovider \
  "$TF/backend/tests/test_zero_spend.py"

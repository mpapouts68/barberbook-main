#!/bin/bash
# Quick check that peqi.hair serves a recent frontend build (run locally or on VPS).
set -euo pipefail

URL="${1:-https://peqi.hair}"
HTML="$(curl -sfL "$URL/")"
JS="$(echo "$HTML" | grep -oE '/assets/index-[^"]+\.js' | head -1)"

if [[ -z "$JS" ]]; then
  echo "FAIL: Could not find index-*.js in $URL"
  exit 1
fi

echo "Live bundle: $JS"
BODY="$(curl -sfL "$URL$JS")"

if echo "$BODY" | grep -q 'peqibarber@yahoo.com'; then
  echo "OK: Contact/email bundle is current."
  exit 0
fi

if echo "$BODY" | grep -q 'peqi_haircut_studio'; then
  echo "OK: Instagram contact link found in bundle."
  exit 0
fi

echo "STALE: Bundle does not contain expected PEQI contact strings."
echo "      Run GitHub Actions deploy or: ssh VPS 'cd /var/www/peqi && bash deploy/deploy.sh'"
exit 1

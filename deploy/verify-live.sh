#!/bin/bash
# Quick check that the live site serves a recent BarberBook frontend build.
set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Usage: bash deploy/verify-live.sh https://your-domain.com"
  exit 1
fi

MAX_ATTEMPTS="${VERIFY_LIVE_ATTEMPTS:-5}"
SLEEP_SEC="${VERIFY_LIVE_SLEEP:-4}"

MARKERS=(
  "BarberBook"
  "Book Your Cut"
  "bookAppointment"
  "branding/default-logo"
)

attempt=1
while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
  echo "Verify attempt $attempt/$MAX_ATTEMPTS..."

  HTML="$(curl -sfL "$URL/")" || {
    echo "WARN: Could not fetch $URL/"
    sleep "$SLEEP_SEC"
    attempt=$((attempt + 1))
    continue
  }

  JS="$(echo "$HTML" | grep -oE '/assets/index-[^"]+\.js' | head -1)"
  if [[ -z "$JS" ]]; then
    echo "WARN: No index-*.js in HTML"
    sleep "$SLEEP_SEC"
    attempt=$((attempt + 1))
    continue
  fi

  echo "Live bundle: $JS"
  BODY="$(curl -sfL "$URL$JS")" || {
    echo "WARN: Could not fetch bundle"
    sleep "$SLEEP_SEC"
    attempt=$((attempt + 1))
    continue
  }

  for marker in "${MARKERS[@]}"; do
    if echo "$BODY" | grep -qF "$marker"; then
      echo "OK: Found '$marker' in live bundle."
      exit 0
    fi
  done

  echo "WARN: Bundle missing expected markers (cache or deploy still rolling out)."
  sleep "$SLEEP_SEC"
  attempt=$((attempt + 1))
done

echo "STALE: Live site did not match expected BarberBook build after ${MAX_ATTEMPTS} attempts."
echo "      If deploy.log shows 'Built frontend: dist/public/assets/index-....js' and HTTP 200, hard-refresh the site."
exit 1

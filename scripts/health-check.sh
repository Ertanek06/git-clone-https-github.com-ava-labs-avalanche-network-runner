#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${BASE:-/home/arteva/arteva-crm-erp-efsana36}"
PORT="${PORT:-3120}"
EXPECTED_VERSION="${EXPECTED_VERSION:-3.8.57}"
EXPECTED_RELEASE="${EXPECTED_RELEASE:-v3.8.57-crmv1.45-web-import-upsert-ui-document-fix}"
EXPECTED_BUILD="${EXPECTED_BUILD:-crmv1.45}"
ACTIVE_ROOT="$(readlink -f "$BASE/current" 2>/dev/null || true)"
CHECK_ROOT="$ROOT"
if [[ -n "$ACTIVE_ROOT" && -f "$ACTIVE_ROOT/scripts/verify-health.js" && -d "$ACTIVE_ROOT/node_modules" ]]; then CHECK_ROOT="$ACTIVE_ROOT"; fi
PORT="$PORT" EXPECTED_VERSION="$EXPECTED_VERSION" EXPECTED_RELEASE="$EXPECTED_RELEASE" EXPECTED_BUILD="$EXPECTED_BUILD" node "$CHECK_ROOT/scripts/verify-health.js"
for path in /login /health; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:${PORT}${path}" || true)"
  printf '%-20s -> HTTP %s\n' "$path" "$code"
  [ "$code" = "200" ]
done
PORT="$PORT" node "$CHECK_ROOT/scripts/verify-login-studio-runtime.js"

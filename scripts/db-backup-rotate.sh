#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export RETENTION_DAYS="${RETENTION_DAYS:-365}"
if [ -f .env ]; then set -a; source .env; set +a; fi
exec node scripts/online-backup.js

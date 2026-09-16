#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-/home/arteva/arteva-crm-erp-efsana36}"
APP_USER="${APP_USER:-$(stat -c '%U' "$BASE" 2>/dev/null || id -un)}"
CURRENT="$BASE/current"
CRON_FILE="/etc/cron.d/arteva-crm-quote-followup"
LINE="17 8 * * * $APP_USER cd $CURRENT && /usr/bin/node scripts/quote-followup-run.js >> $BASE/shared/logs/quote-followup.log 2>&1"
mkdir -p "$BASE/shared/logs"
if [ "$(id -u)" -eq 0 ]; then
  printf '%s\n' 'SHELL=/bin/bash' 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' "$LINE" > "$CRON_FILE"
  chmod 0644 "$CRON_FILE"
  echo "FOLLOWUP_CRON_INSTALLED=$CRON_FILE"
else
  echo "FOLLOWUP_CRON_SKIPPED_ROOT_REQUIRED"
  echo "$LINE"
fi

#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-/home/arteva/arteva-crm-erp-efsana36}"
APP_USER="${APP_USER:-$(stat -c '%U' "$BASE" 2>/dev/null || id -un)}"
CURRENT="$BASE/current"
CRON_FILE="/etc/cron.d/arteva-crm-web-product-sync"
LINE="20 3 * * * $APP_USER cd $CURRENT && SHARED_DIR=$BASE/shared /usr/bin/node scripts/web-product-auto-sync.js >> $BASE/shared/logs/web-product-auto-sync.log 2>&1"
mkdir -p "$BASE/shared/logs"
if [ "$(id -u)" -eq 0 ]; then
  printf '%s\n' 'SHELL=/bin/bash' 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' "$LINE" > "$CRON_FILE"
  chmod 0644 "$CRON_FILE"
  echo "WEB_PRODUCT_SYNC_CRON_INSTALLED=$CRON_FILE"
else
  echo "WEB_PRODUCT_SYNC_CRON_SKIPPED_ROOT_REQUIRED"
  echo "$LINE"
fi

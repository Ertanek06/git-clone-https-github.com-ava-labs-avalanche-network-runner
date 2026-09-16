#!/usr/bin/env bash
set -Eeuo pipefail
BASE="${BASE:-/opt/crm-erp-efsana36}"
CURRENT="$BASE/current"
SHARED="$BASE/shared"
HOUR="${HOUR:-03}"
MINUTE="${MINUTE:-15}"
RETENTION_DAYS="${RETENTION_DAYS:-365}"
APP_USER="${APP_USER:-$(stat -c '%U' "$BASE" 2>/dev/null || id -un)}"
CRON_FILE="/etc/cron.d/crm-erp-efsana36-maintenance"
BACKUP_CMD="$MINUTE $HOUR * * * $APP_USER BASE=$BASE RETENTION_DAYS=$RETENTION_DAYS bash $CURRENT/scripts/db-backup-rotate.sh >> $SHARED/logs/backup.log 2>&1"
PRIVACY_CMD="45 $HOUR * * * $APP_USER cd $CURRENT && node scripts/privacy-maintenance.js --apply >> $SHARED/logs/privacy-maintenance.log 2>&1"
if [ "$(id -u)" -ne 0 ]; then
  echo "Bu script cron dosyası yazmak için sudo/root ister."
  exit 1
fi
[ -d "$CURRENT" ] || { echo "Aktif release bulunamadı: $CURRENT"; exit 1; }
mkdir -p "$SHARED/logs" "$SHARED/backups"
printf '# CRM ERP günlük bakım\n# Ana CRM kayıtları silinmez. Yedek rotasyonu yalnız yedek dosyalarını etkiler.\n%s\n# Kapalı canlı sohbetler site saklama politikasına göre kayıt kimliği korunarak anonimleştirilir.\n%s\n' "$BACKUP_CMD" "$PRIVACY_CMD" > "$CRON_FILE"
chmod 0644 "$CRON_FILE"
echo "Bakım cron dosyası kuruldu: $CRON_FILE"

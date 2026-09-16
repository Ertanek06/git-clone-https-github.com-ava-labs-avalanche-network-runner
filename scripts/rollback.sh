#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
BASE="${BASE:-/opt/crm-erp-efsana36}"
RELEASES="$BASE/releases"
CURRENT="$BASE/current"
SHARED="$BASE/shared"
PORT="${PORT:-3120}"
PIDFILE="$SHARED/crm-erp-$PORT.pid"
LOGFILE="$SHARED/logs/crm-erp-$PORT.log"
SERVICE_NAME="crm-erp-efsana36"
USE_SYSTEMD=0
if command -v systemctl >/dev/null 2>&1 && systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then USE_SYSTEMD=1; fi
CURRENT_REAL="$(readlink -f "$CURRENT" 2>/dev/null || true)"
[ -n "$CURRENT_REAL" ] && [ -d "$CURRENT_REAL" ] || { echo "Aktif release bulunamadı: $CURRENT"; exit 1; }
mapfile -t RELS < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d | sort -r)
TARGET=""
FOUND_CURRENT=0
for rel in "${RELS[@]}"; do
  if [ "$rel" = "$CURRENT_REAL" ]; then FOUND_CURRENT=1; continue; fi
  if [ "$FOUND_CURRENT" -eq 1 ]; then TARGET="$rel"; break; fi
done
if [ -z "$TARGET" ]; then
  for rel in "${RELS[@]}"; do [ "$rel" = "$CURRENT_REAL" ] || { TARGET="$rel"; break; }; done
fi
[ -n "$TARGET" ] || { echo "Geri dönülecek önceki release bulunamadı."; exit 1; }
[ -f "$TARGET/package.json" ] && [ -f "$TARGET/src/server.js" ] && [ -f "$TARGET/src/config.js" ] && [ -f "$TARGET/scripts/verify-health.js" ] || { echo "Hedef release geçersiz: $TARGET"; exit 1; }

release_meta(){
  local dir="$1" version release
  version="$(node -p "require('$dir/package.json').version" 2>/dev/null || true)"
  release="$(sed -n 's/^[[:space:]]*releaseId:[[:space:]]*"\([^"]*\)".*/\1/p' "$dir/src/config.js" | head -1)"
  [ -n "$version" ] && [ -n "$release" ] || return 1
  printf '%s\t%s\n' "$version" "$release"
}

IFS=$'\t' read -r TARGET_VERSION TARGET_RELEASE < <(release_meta "$TARGET") || { echo "Hedef release sürüm bilgisi okunamadı: $TARGET"; exit 1; }
IFS=$'\t' read -r CURRENT_VERSION CURRENT_RELEASE < <(release_meta "$CURRENT_REAL") || { echo "Aktif release sürüm bilgisi okunamadı: $CURRENT_REAL"; exit 1; }

OLD_APP_VERSION_PRESENT=0
OLD_APP_VERSION=""
if [ -f "$SHARED/.env" ] && grep -q '^APP_VERSION=' "$SHARED/.env"; then
  OLD_APP_VERSION_PRESENT=1
  OLD_APP_VERSION="$(sed -n 's/^APP_VERSION=//p' "$SHARED/.env" | tail -1)"
fi

set_app_version(){
  local value="$1"
  [ -f "$SHARED/.env" ] || { echo "Paylaşılan .env bulunamadı: $SHARED/.env"; return 1; }
  if grep -q '^APP_VERSION=' "$SHARED/.env"; then
    sed -i "s/^APP_VERSION=.*/APP_VERSION=$value/" "$SHARED/.env"
  else
    printf '\nAPP_VERSION=%s\n' "$value" >> "$SHARED/.env"
  fi
}

restore_app_version(){
  if [ "$OLD_APP_VERSION_PRESENT" -eq 1 ]; then
    set_app_version "$OLD_APP_VERSION"
  else
    sed -i '/^APP_VERSION=/d' "$SHARED/.env"
  fi
}

stop_app(){
  if [ "$USE_SYSTEMD" -eq 1 ]; then systemctl stop "$SERVICE_NAME" 2>/dev/null || true; fi
  if [ -f "$PIDFILE" ]; then PID="$(cat "$PIDFILE" 2>/dev/null || true)"; [ -z "$PID" ] || kill -TERM "$PID" 2>/dev/null || true; sleep 1; [ -z "$PID" ] || kill -KILL "$PID" 2>/dev/null || true; rm -f "$PIDFILE"; fi
}
start_app(){
  cd "$1"; [ -L .env ] || ln -sfn "$SHARED/.env" .env
  set -a; source .env; set +a
  if [ "$USE_SYSTEMD" -eq 1 ]; then systemctl restart "$SERVICE_NAME"; else nohup env PORT="$PORT" APP_VERSION="$(node -p "require('./package.json').version")" node src/server.js >> "$LOGFILE" 2>&1 & echo $! > "$PIDFILE"; fi
}
health_ok(){
  local dir="$1" version="$2" release="$3"
  for _ in $(seq 1 40); do
    if PORT="$PORT" EXPECTED_VERSION="$version" EXPECTED_RELEASE="$release" node "$dir/scripts/verify-health.js" >/dev/null 2>&1; then return 0; fi
    sleep .4
  done
  return 1
}

stop_app
set_app_version "$TARGET_VERSION"
ln -sfn "$TARGET" "$CURRENT"
start_app "$TARGET"
if ! health_ok "$TARGET" "$TARGET_VERSION" "$TARGET_RELEASE"; then
  echo "Rollback hedefi sağlık kontrolünü geçemedi; mevcut sürüm geri yükleniyor."
  stop_app
  restore_app_version
  ln -sfn "$CURRENT_REAL" "$CURRENT"
  start_app "$CURRENT_REAL"
  health_ok "$CURRENT_REAL" "$CURRENT_VERSION" "$CURRENT_RELEASE" || { if [ "$USE_SYSTEMD" -eq 1 ]; then journalctl -u "$SERVICE_NAME" -n 160 --no-pager || true; else tail -n 160 "$LOGFILE" || true; fi; exit 1; }
  exit 1
fi
curl -fsS "http://127.0.0.1:$PORT/health"; echo
echo "ROLLBACK TAMAMLANDI: $TARGET ($TARGET_VERSION / $TARGET_RELEASE)"
echo "Not: Veritabanı otomatik geri alınmadı; ana kayıtların üzerine yazılmaz."

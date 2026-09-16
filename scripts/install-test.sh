#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${BASE:-/opt/crm-erp-efsana36}"
RELEASES="$BASE/releases"
SHARED="$BASE/shared"
CURRENT="$BASE/current"
STAMP="$(date +%Y%m%d-%H%M%S)"
REL="$RELEASES/$STAMP"
PORT="${PORT:-3120}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
SERVICE_NAME="${SERVICE_NAME:-crm-erp-efsana36}"
VERSION="3.8.57"
RELEASE_ID="v3.8.57-crmv1.45-web-import-upsert-ui-document-fix"
BUILD_ID="crmv1.45"
SUDO=()
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO=(sudo); fi
USE_SYSTEMD=0
if command -v systemctl >/dev/null 2>&1 && systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then USE_SYSTEMD=1; fi

for command in node npm curl openssl tar timeout; do command -v "$command" >/dev/null 2>&1 || { echo "Gerekli komut bulunamadı: $command"; exit 1; }; done
mkdir -p "$RELEASES" "$SHARED/data" "$SHARED/uploads" "$SHARED/private-uploads" "$SHARED/backups" "$SHARED/logs"
chmod 700 "$SHARED" "$SHARED/data" "$SHARED/private-uploads" "$SHARED/backups" "$SHARED/logs" || true

PREVIOUS=""
[ -L "$CURRENT" ] && PREVIOUS="$(readlink -f "$CURRENT" || true)"
OLD_APP_VERSION=""
if [ -f "$SHARED/.env" ]; then OLD_APP_VERSION="$(sed -n 's/^APP_VERSION=//p' "$SHARED/.env" | tail -1)"; fi

mkdir -p "$REL"
tar -C "$ROOT" --exclude='./node_modules' --exclude='./.env' --exclude='./data' --exclude='./backups' --exclude='./private-uploads' --exclude='./shared' --exclude='./public/uploads' -cf - . | tar -C "$REL" -xf -
cd "$REL"

if [ ! -f "$SHARED/.env" ]; then
  cp .env.example "$SHARED/.env"
  SESSION_KEY="$(openssl rand -hex 48)"
  DATA_KEY="$(openssl rand -hex 48)"
  PASS="$(openssl rand -base64 24 | tr -d '=+/ ' | cut -c1-20)A7"
  sed -i \
    -e "s|^SESSION_SECRET=.*|SESSION_SECRET=$SESSION_KEY|" \
    -e "s|^DATA_ENCRYPTION_KEY=.*|DATA_ENCRYPTION_KEY=$DATA_KEY|" \
    -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$PASS|" \
    -e "s|^PORT=.*|PORT=$PORT|" \
    -e "s|^DATABASE_FILE=.*|DATABASE_FILE=$SHARED/data/crm-erp.sqlite|" \
    -e "s|^SHARED_DIR=.*|SHARED_DIR=$SHARED|" \
    -e "s|^PRIVATE_UPLOAD_DIR=.*|PRIVATE_UPLOAD_DIR=$SHARED/private-uploads|" \
    -e "s|^BACKUP_DIR=.*|BACKUP_DIR=$SHARED/backups|" \
    "$SHARED/.env"
  printf 'KULLANICI: crmadmin\nGECICI SIFRE: %s\nILK GIRISTE SIFRE DEGISIKLIGI ZORUNLUDUR.\n' "$PASS" > "$SHARED/INITIAL_ADMIN_PASSWORD.txt"
  chmod 600 "$SHARED/.env" "$SHARED/INITIAL_ADMIN_PASSWORD.txt"
else
  grep -q '^DATA_ENCRYPTION_KEY=' "$SHARED/.env" || printf '\nDATA_ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 48)" >> "$SHARED/.env"
  grep -q '^SHARED_DIR=' "$SHARED/.env" || printf 'SHARED_DIR=%s\n' "$SHARED" >> "$SHARED/.env"
  grep -q '^PRIVATE_UPLOAD_DIR=' "$SHARED/.env" || printf 'PRIVATE_UPLOAD_DIR=%s\n' "$SHARED/private-uploads" >> "$SHARED/.env"
  grep -q '^BACKUP_DIR=' "$SHARED/.env" || printf 'BACKUP_DIR=%s\n' "$SHARED/backups" >> "$SHARED/.env"
  grep -q '^PUBLIC_UPLOAD_DIR=' "$SHARED/.env" || printf 'PUBLIC_UPLOAD_DIR=%s\n' "$SHARED/uploads" >> "$SHARED/.env"
  grep -q '^DATABASE_FILE=' "$SHARED/.env" || printf 'DATABASE_FILE=%s\n' "$SHARED/data/crm-erp.sqlite" >> "$SHARED/.env"
  grep -q '^PORT=' "$SHARED/.env" || printf 'PORT=%s\n' "$PORT" >> "$SHARED/.env"
  # Canlı veri ve medya daima release dışındaki shared alanda tutulur. Eski veya
  # eksik .env hiçbir koşulda yeni release altında boş bir DB/media alanı açamaz.
  sed -i \
    -e "s|^DATABASE_FILE=.*|DATABASE_FILE=$SHARED/data/crm-erp.sqlite|" \
    -e "s|^SHARED_DIR=.*|SHARED_DIR=$SHARED|" \
    -e "s|^PUBLIC_UPLOAD_DIR=.*|PUBLIC_UPLOAD_DIR=$SHARED/uploads|" \
    -e "s|^PRIVATE_UPLOAD_DIR=.*|PRIVATE_UPLOAD_DIR=$SHARED/private-uploads|" \
    -e "s|^BACKUP_DIR=.*|BACKUP_DIR=$SHARED/backups|" \
    -e "s/^PORT=.*/PORT=$PORT/" \
    "$SHARED/.env"
fi

# Eski paketlerde PUBLIC_BASE_URL hiç yazılmadığı veya örnek alan adıyla
# bırakıldığı için e-postalardaki güvenli proforma bağlantıları yanlış domaine
# gidiyordu. Mevcut özel domain değerlerine dokunmadan yalnızca eksik/örnek
# değeri canlı Arteva CRM adresine taşır.
if grep -q '^PUBLIC_BASE_URL=' "$SHARED/.env"; then
  sed -i -E \
    's|^PUBLIC_BASE_URL=(https?://crm\.example\.com/*)?$|PUBLIC_BASE_URL=https://crm.artevapp.com.tr|' \
    "$SHARED/.env"
else
  printf '\nPUBLIC_BASE_URL=https://crm.artevapp.com.tr\n' >> "$SHARED/.env"
fi

ln -sfn "$SHARED/.env" .env
rm -rf public/uploads data private-uploads backups shared
ln -sfn "$SHARED/uploads" public/uploads
ln -sfn "$SHARED/data" data
ln -sfn "$SHARED/private-uploads" private-uploads
ln -sfn "$SHARED/backups" backups
ln -sfn "$SHARED" shared

export npm_config_registry="${npm_config_registry:-https://registry.npmjs.org/}"
export npm_config_fetch_retries="${npm_config_fetch_retries:-2}"
export npm_config_fetch_timeout="${npm_config_fetch_timeout:-120000}"
npm ci --omit=dev
npm run build:assets
bash scripts/ensure-document-tools.sh || echo "UYARI: PDF/OCR araçları otomatik kurulamadı; dahili PDF okuyucusu kullanılacak."
bash scripts/static-check.sh
node scripts/sync-login-media.js --prune-seed

set -a; source .env; set +a
export PORT
EXPECTED_SHARED_DB="$SHARED/data/crm-erp.sqlite"
[ "$(readlink -m "${DATABASE_FILE:-}")" = "$(readlink -m "$EXPECTED_SHARED_DB")" ] || {
  echo "HATA: Canlı DATABASE_FILE shared veritabanını göstermiyor. expected=$EXPECTED_SHARED_DB actual=${DATABASE_FILE:-<bos>}" >&2
  exit 1
}
[ "$(readlink -m "${PUBLIC_UPLOAD_DIR:-}")" = "$(readlink -m "$SHARED/uploads")" ] || {
  echo "HATA: PUBLIC_UPLOAD_DIR shared uploads alanını göstermiyor. actual=${PUBLIC_UPLOAD_DIR:-<bos>}" >&2
  exit 1
}
PIDFILE="$SHARED/crm-erp-$PORT.pid"
LOGFILE="$SHARED/logs/crm-erp-$PORT.log"

run_systemctl(){ if [ "${#SUDO[@]}" -gt 0 ]; then "${SUDO[@]}" systemctl "$@"; else systemctl "$@"; fi; }
run_priv(){ if [ "${#SUDO[@]}" -gt 0 ]; then "${SUDO[@]}" "$@"; else "$@"; fi; }
disable_conflicting_services(){
  # Önceki kurulumlardan kalan ikinci servis aynı 3120 portunu yeniden açarak
  # EADDRINUSE, 502 ve oturum/CSRF kesintilerine yol açıyordu.
  for unit in arteva-crm-erp.service arteva-crm-erp; do
    [ "$unit" = "$SERVICE_NAME" ] && continue
    if systemctl cat "$unit" >/dev/null 2>&1; then
      echo "Çakışan eski servis kapatılıyor: $unit"
      run_systemctl disable --now "$unit" 2>/dev/null || true
    fi
  done
}
clear_port(){
  command -v lsof >/dev/null 2>&1 || return 0
  local pids
  pids="$(run_priv lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | sort -u || true)"
  if [ -n "$pids" ]; then
    echo "Port $PORT üzerindeki eski süreçler kapatılıyor: $pids"
    for pid in $pids; do run_priv kill -TERM "$pid" 2>/dev/null || true; done
    for _ in $(seq 1 16); do
      pids="$(run_priv lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | sort -u || true)"
      [ -z "$pids" ] && return 0
      sleep .25
    done
    for pid in $pids; do run_priv kill -KILL "$pid" 2>/dev/null || true; done
  fi
}
stop_current(){
  if [ "$USE_SYSTEMD" -eq 1 ]; then run_systemctl stop "$SERVICE_NAME" 2>/dev/null || true; fi
  if [ -f "$PIDFILE" ]; then
    PID="$(cat "$PIDFILE" 2>/dev/null || true)"
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then kill -TERM "$PID" 2>/dev/null || true; for _ in $(seq 1 20); do kill -0 "$PID" 2>/dev/null || break; sleep .25; done; kill -KILL "$PID" 2>/dev/null || true; fi
    rm -f "$PIDFILE"
  fi
  clear_port
}
start_release(){
  local dir="$1"
  cd "$dir"
  [ -L .env ] || ln -sfn "$SHARED/.env" .env
  ln -sfn "$dir" "$CURRENT"
  if [ "$USE_SYSTEMD" -eq 1 ]; then
    run_systemctl restart "$SERVICE_NAME"
  else
    nohup env PORT="$PORT" node src/server.js >> "$LOGFILE" 2>&1 &
    echo $! > "$PIDFILE"
  fi
}
health_any(){ for _ in $(seq 1 50); do curl -fsS --max-time 3 "http://127.0.0.1:$PORT/health" >/dev/null && return 0; sleep .4; done; return 1; }
health_new(){
  for _ in $(seq 1 50); do
    if PORT="$PORT" EXPECTED_VERSION="$VERSION" EXPECTED_RELEASE="$RELEASE_ID" EXPECTED_BUILD="$BUILD_ID" node "$REL/scripts/verify-health.js" >/dev/null 2>&1; then
      if [ "$USE_SYSTEMD" -eq 1 ] && command -v lsof >/dev/null 2>&1; then
        local main_pid port_pid
        main_pid="$(run_systemctl show "$SERVICE_NAME" -p MainPID --value 2>/dev/null || true)"
        port_pid="$(run_priv lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | sort -u | head -1 || true)"
        if [ -n "$main_pid" ] && [ "$main_pid" != "0" ] && [ "$main_pid" = "$port_pid" ]; then return 0; fi
      else
        return 0
      fi
    fi
    sleep .4
  done
  echo "HATA: Yeni release sağlık/port sahipliği kontrolünü geçemedi. Olası EADDRINUSE çakışması." >&2
  return 1
}
set_app_version(){
  local value="$1"
  if grep -q '^APP_VERSION=' "$SHARED/.env"; then sed -i "s/^APP_VERSION=.*/APP_VERSION=$value/" "$SHARED/.env"; else printf '\nAPP_VERSION=%s\n' "$value" >> "$SHARED/.env"; fi
}

ACTIVATION_STARTED=0
rollback_on_error(){
  local code=$?
  trap - ERR
  set +e
  if [ "$ACTIVATION_STARTED" -eq 1 ]; then
    echo "HATA: Yeni sürüm etkinleştirilemedi. Önceki çalışan sürüm geri başlatılıyor."
    stop_current
    [ -z "$OLD_APP_VERSION" ] || set_app_version "$OLD_APP_VERSION"
    if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then start_release "$PREVIOUS"; health_any || echo "UYARI: Önceki sürüm health kontrolü başarısız. Log: $LOGFILE"; fi
  fi
  rm -rf "$REL"
  exit "$code"
}
trap rollback_on_error ERR

# Eski servis çalışırken güvenli online yedek alınır.
if [ -f "${DATABASE_FILE:-$SHARED/data/crm-erp.sqlite}" ]; then
  UPLOAD_KB="$(du -sk "$SHARED/uploads" 2>/dev/null | awk '{print $1+0}')"
  AVAIL_KB="$(df -Pk "$SHARED" | awk 'NR==2 {print $4+0}')"
  NEED_KB="$((UPLOAD_KB + UPLOAD_KB / 2 + 1048576))"
  if [ "$AVAIL_KB" -gt "$NEED_KB" ]; then
    echo "Kurulum öncesi tam yedek için yeterli disk alanı var; medya dahil yedek alınıyor."
    node scripts/online-backup.js
  else
    echo "UYARI: Tam medya yedeği için yeterli boş alan yok. Canlı DB güvenlik yedeği alınacak; shared/uploads korunacak."
    PREINSTALL_DB_BACKUP="$SHARED/backups/pre-install-$STAMP.sqlite" node scripts/preinstall-db-backup.js
  fi
fi

if [ "$USE_SYSTEMD" -eq 1 ]; then BASE="$BASE" SERVICE_NAME="$SERVICE_NAME" bash scripts/ensure-systemd-current.sh; fi
disable_conflicting_services
ACTIVATION_STARTED=1
stop_current
npm run migrate
npm run seed
set_app_version "$VERSION"
set -a; source "$SHARED/.env"; set +a

if [ "$USE_SYSTEMD" -eq 1 ]; then
  SERVICE_USER="$(systemctl show "$SERVICE_NAME" -p User --value 2>/dev/null || true)"
  if [ -n "$SERVICE_USER" ] && id "$SERVICE_USER" >/dev/null 2>&1; then
    if [ "${#SUDO[@]}" -gt 0 ]; then "${SUDO[@]}" chown -R "$SERVICE_USER:$(id -gn "$SERVICE_USER")" "$REL" "$SHARED"; else chown -R "$SERVICE_USER:$(id -gn "$SERVICE_USER")" "$REL" "$SHARED"; fi
  fi
fi

start_release "$REL"

ACTIVE_AFTER="$(readlink -f "$CURRENT" 2>/dev/null || true)"
[ "$ACTIVE_AFTER" = "$REL" ] || { echo "HATA: current bağlantısı yeni release dizinine geçmedi. expected=$REL actual=$ACTIVE_AFTER" >&2; exit 1; }
[ -f "$CURRENT/views/products/preview.ejs" ] || { echo "HATA: Yeni ürün ön izleme şablonu aktif release içinde yok." >&2; exit 1; }
grep -q "crmv133-product-preview-inline-edit" "$CURRENT/views/products/preview.ejs" || { echo "HATA: crmv1.45 yerinde ürün düzenleme işareti aktif release içinde bulunamadı." >&2; exit 1; }
health_new

if [ "${AUTO_INSTALL_SYSTEMD:-1}" = "1" ] && [ "$USE_SYSTEMD" -eq 0 ] && command -v systemctl >/dev/null 2>&1; then
  INSTALL_USER="$(id -un)"
  stop_current
  if [ "${#SUDO[@]}" -gt 0 ]; then "${SUDO[@]}" env BASE="$BASE" PORT="$PORT" APP_USER="$INSTALL_USER" bash "$REL/scripts/install-systemd.sh"; else BASE="$BASE" PORT="$PORT" APP_USER="$INSTALL_USER" bash "$REL/scripts/install-systemd.sh"; fi
  USE_SYSTEMD=1
  health_new
fi

PORT="$PORT" EXPECTED_VERSION="$VERSION" EXPECTED_RELEASE="$RELEASE_ID" EXPECTED_BUILD="$BUILD_ID" node "$REL/scripts/verify-health.js"
trap - ERR
ACTIVATION_STARTED=0

mapfile -t OLD_RELEASES < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | tail -n +$((KEEP_RELEASES+1)))
for old in "${OLD_RELEASES[@]}"; do [ "$RELEASES/$old" = "$REL" ] || [ "$RELEASES/$old" = "$PREVIOUS" ] || rm -rf "$RELEASES/$old"; done
DOMAIN="${DOMAIN:-crm.artevapp.com.tr}" LIMIT=128m bash "$REL/scripts/ensure-upload-limit.sh" || echo "UYARI: Nginx yükleme limiti otomatik uygulanamadı; uygulama çalışmaya devam ediyor."
CRON_APP_USER="${SERVICE_USER:-$(stat -c '%U' "$BASE" 2>/dev/null || id -un)}"
run_priv env BASE="$BASE" APP_USER="$CRON_APP_USER" RETENTION_DAYS=365 bash "$REL/scripts/install-backup-cron.sh" || echo "UYARI: Günlük yedekleme cron'u otomatik kurulamadı; sudo ile scripts/install-backup-cron.sh çalıştırın."
run_priv env BASE="$BASE" APP_USER="$CRON_APP_USER" bash "$REL/scripts/install-followup-cron.sh" || echo "UYARI: Akıllı teklif takip cron'u otomatik kurulamadı; sudo ile scripts/install-followup-cron.sh çalıştırın."
run_priv env BASE="$BASE" APP_USER="$CRON_APP_USER" bash "$REL/scripts/install-web-product-sync-cron.sh" || echo "UYARI: Web ürün otomatik senkron cron'u kurulamadı; sudo ile scripts/install-web-product-sync-cron.sh çalıştırın."

echo "FINAL SURUM AKTIF: $REL"
echo "AKTIF UYGULAMA SURUMU: $VERSION"
echo "LOGIN STUDIO RELEASE: $RELEASE_ID"
echo "AKTIF BUILD: $BUILD_ID"
echo "PORT: $PORT"
echo "ILK KURULUM KIMLIK DOSYASI: $SHARED/INITIAL_ADMIN_PASSWORD.txt"

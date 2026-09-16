#!/usr/bin/env bash
set -Eeuo pipefail
[ "$(id -u)" -eq 0 ] || { echo "systemd kurulumu root/sudo gerektirir."; exit 1; }
BASE="${BASE:-/opt/crm-erp-efsana36}"
CURRENT="$BASE/current"
SHARED="$BASE/shared"
SERVICE_NAME="${SERVICE_NAME:-crm-erp-efsana36}"
APP_USER="${APP_USER:-$(id -un)}"
PORT="${PORT:-3120}"
NODE_BIN="$(command -v node)"
[ -d "$CURRENT" ] && [ -f "$CURRENT/src/server.js" ] || { echo "Aktif release bulunamadı: $CURRENT"; exit 1; }
id "$APP_USER" >/dev/null 2>&1 || { echo "Servis kullanıcısı bulunamadı: $APP_USER"; exit 1; }
APP_GROUP="$(id -gn "$APP_USER")"
chown -R "$APP_USER:$APP_GROUP" "$BASE"
find "$SHARED" -type d -exec chmod 700 {} +
chmod 600 "$SHARED/.env" 2>/dev/null || true
cat > "/etc/systemd/system/$SERVICE_NAME.service" <<UNIT
[Unit]
Description=CRM ERP EFSANA36
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$CURRENT
EnvironmentFile=$SHARED/.env
Environment=NODE_ENV=production
ExecStart=$NODE_BIN $CURRENT/src/server.js
Restart=on-failure
RestartSec=3
TimeoutStopSec=25
KillSignal=SIGTERM
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=false
ReadWritePaths=$SHARED
UMask=0077
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
for _ in $(seq 1 40); do curl -fsS --max-time 3 "http://127.0.0.1:$PORT/health" >/dev/null && { echo "systemd servisi aktif: $SERVICE_NAME"; exit 0; }; sleep .5; done
systemctl status "$SERVICE_NAME" --no-pager || true
journalctl -u "$SERVICE_NAME" -n 120 --no-pager || true
exit 1

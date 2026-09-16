#!/usr/bin/env bash
set -Eeuo pipefail
BASE="${BASE:-/opt/crm-erp-efsana36}"
SERVICE_NAME="${SERVICE_NAME:-crm-erp-efsana36}"
CURRENT="$BASE/current"
NODE_BIN="$(command -v node)"
if ! command -v systemctl >/dev/null 2>&1 || ! systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then exit 0; fi
SUDO=()
if [ "$(id -u)" -ne 0 ]; then command -v sudo >/dev/null 2>&1 || { echo 'systemd güncellemesi için sudo gerekli.'; exit 1; }; SUDO=(sudo); fi
DROPIN="/etc/systemd/system/${SERVICE_NAME}.service.d"
"${SUDO[@]}" mkdir -p "$DROPIN"
cat <<UNIT | "${SUDO[@]}" tee "$DROPIN/20-current-release.conf" >/dev/null
[Service]
WorkingDirectory=$CURRENT
ExecStart=
ExecStart=$NODE_BIN $CURRENT/src/server.js
Restart=on-failure
RestartSec=3
UNIT
"${SUDO[@]}" systemctl daemon-reload
echo "SYSTEMD_CURRENT_READY service=$SERVICE_NAME current=$CURRENT restart=on-failure"

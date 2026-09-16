#!/usr/bin/env bash
set -Eeuo pipefail
DOMAIN="${DOMAIN:-crm.artevapp.com.tr}"
echo "=== AKTIF NGINX CRM SERVER_NAME KAYITLARI ==="
sudo grep -RniE "server_name[[:space:]].*${DOMAIN//./\\.}" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true
echo
echo "=== AKTIF LOCAL PROXY_PASS SATIRLARI ==="
sudo grep -RniE 'proxy_pass[[:space:]]+http://127\.0\.0\.1:' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true

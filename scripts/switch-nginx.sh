#!/usr/bin/env bash
set -Eeuo pipefail
PORT="${PORT:-3120}"
DOMAIN="${DOMAIN:-crm.artevapp.com.tr}"
CONF="/etc/nginx/sites-available/$DOMAIN"
ENABLED="/etc/nginx/sites-enabled/$DOMAIN"
BACK="/opt/crm-erp-backups/nginx-$DOMAIN-$(date +%Y%m%d-%H%M%S).conf"
mkdir -p /opt/crm-erp-backups
curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null
mapfile -t MATCHES < <(sudo grep -RliE "server_name[[:space:]].*${DOMAIN//./\\.}" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true)
if [ "${#MATCHES[@]}" -gt 1 ]; then
  echo "HATA: $DOMAIN için birden fazla aktif Nginx kaydı bulundu. Otomatik geçiş durduruldu."
  printf ' - %s\n' "${MATCHES[@]}"
  echo "Önce DOMAIN=$DOMAIN bash scripts/nginx-audit.sh çıktısını inceleyin."
  exit 1
fi
[ -f "$CONF" ] && sudo cp -a "$CONF" "$BACK" || true
sudo tee "$CONF" >/dev/null <<NGINX
server {
 listen 80;
 server_name $DOMAIN;
 client_max_body_size 128m;
 location / {
  proxy_pass http://127.0.0.1:$PORT;
  proxy_http_version 1.1;
  proxy_set_header Host \$host;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
 }
}
NGINX
sudo ln -sfn "$CONF" "$ENABLED"
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx $DOMAIN -> 127.0.0.1:$PORT olarak yönlendirildi."
echo "SSL sertifikası ayrıca Certbot ile crm alt alan adını kapsayacak biçimde kurulmalıdır."

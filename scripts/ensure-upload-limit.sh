#!/usr/bin/env bash
set -Eeuo pipefail
DOMAIN="${DOMAIN:-crm.artevapp.com.tr}"
LIMIT="${LIMIT:-128m}"
ESCAPED="${DOMAIN//./\.}"
mapfile -t FILES < <(sudo grep -RliE "server_name[[:space:]].*$ESCAPED" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true)
if [ "${#FILES[@]}" -eq 0 ]; then
  echo "UYARI: $DOMAIN için aktif Nginx dosyası bulunamadı. Yükleme limiti otomatik değiştirilemedi."
  exit 0
fi
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p /opt/crm-erp-backups
for FILE in "${FILES[@]}"; do
  BASE="$(basename "$FILE")"
  sudo cp -a "$FILE" "/opt/crm-erp-backups/${BASE}.${STAMP}.before-upload-limit"
  if sudo grep -qE 'client_max_body_size[[:space:]]+' "$FILE"; then
    sudo sed -i -E "s/client_max_body_size[[:space:]]+[^;]+;/client_max_body_size $LIMIT;/g" "$FILE"
  else
    sudo sed -i -E "/server_name[[:space:]].*$ESCAPED/a\    client_max_body_size $LIMIT;" "$FILE"
  fi
  echo "GUNCELLENDI: $FILE -> client_max_body_size $LIMIT"
done
sudo nginx -t
sudo systemctl reload nginx
echo "BASARILI: Nginx yükleme limiti $LIMIT olarak uygulandı."

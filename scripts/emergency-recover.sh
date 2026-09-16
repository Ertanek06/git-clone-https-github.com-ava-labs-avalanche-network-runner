#!/usr/bin/env bash
set -u
PORT="${PORT:-3120}"
SERVICE_NAME="${SERVICE_NAME:-crm-erp-efsana36}"
BASE="${BASE:-/home/arteva/arteva-crm-erp-efsana36}"
SUDO=()
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO=(sudo); fi
run_priv(){ if [ "${#SUDO[@]}" -gt 0 ]; then "${SUDO[@]}" "$@"; else "$@"; fi; }

echo "Takılı PDF/OCR süreçleri sonlandırılıyor..."
for pattern in 'proforma-import.worker.js' 'pdftotext.*private-uploads' 'tesseract.*private-uploads' 'pdftoppm.*private-uploads'; do
  run_priv pkill -KILL -f "$pattern" 2>/dev/null || true
done

if command -v systemctl >/dev/null 2>&1 && systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then
  echo "CRM servisi temiz biçimde yeniden başlatılıyor..."
  if [ "${#SUDO[@]}" -gt 0 ]; then "${SUDO[@]}" systemctl restart "$SERVICE_NAME"; else systemctl restart "$SERVICE_NAME"; fi
else
  pids=""
  if command -v lsof >/dev/null 2>&1; then pids="$(run_priv lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"; fi
  for pid in $pids; do run_priv kill -KILL "$pid" 2>/dev/null || true; done
  CURRENT="$BASE/current"
  SHARED="$BASE/shared"
  if [ -d "$CURRENT" ]; then
    mkdir -p "$SHARED/logs"
    cd "$CURRENT"
    nohup env PORT="$PORT" node src/server.js >> "$SHARED/logs/crm-erp-$PORT.log" 2>&1 &
    echo $! > "$SHARED/crm-erp-$PORT.pid"
  fi
fi

for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    echo "CRM yeniden cevap veriyor."
    exit 0
  fi
  sleep .5
done
echo "UYARI: CRM health kontrolü henüz cevap vermedi; güncelleme kurulumu devam ederek servisi yeniden oluşturacak." >&2
exit 0

#!/usr/bin/env bash
set -Eeuo pipefail
PORT="${PORT:-3120}"; BASE="http://127.0.0.1:$PORT"; COOKIE="$(mktemp)"; LOGIN_HTML="$(mktemp)"; trap 'rm -f "$COOKIE" "$LOGIN_HTML"' EXIT
for p in /health /login; do code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE$p" || true)"; printf '%-32s -> HTTP %s\n' "$p" "$code"; done
if [ -n "${TEST_USERNAME:-}" ] && [ -n "${TEST_PASSWORD:-}" ]; then
 curl -s -c "$COOKIE" "$BASE/login" > "$LOGIN_HTML"
 CSRF="$(grep -o 'name="_csrf" value="[^"]*"' "$LOGIN_HTML" | head -n1 | sed 's/.*value="//;s/"$//')"
 login_code="$(curl -s -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/login" --data-urlencode "_csrf=$CSRF" --data-urlencode "login=$TEST_USERNAME" --data-urlencode "password=$TEST_PASSWORD" --data-urlencode "next=/" -o /dev/null -w '%{http_code}')"
 printf '%-32s -> HTTP %s\n' "/login (POST)" "$login_code"
 [ "$login_code" = 302 ]
 for p in / /profiles /profiles/new /customers /customers/new /products /products/new /products/import-proforma /products/import-proforma/history /quotes /quotes/new /quotes/processes '/quotes/processes?flow=pending' /quotes/archives /quotes/sent /templates /settings /settings/general /settings/theme /settings/login /setup /excel /integrations /invoices /backups /system-health /recovery '/search?q=test' /live /live/chats /live/history /live/settings /users /users/new /users/permissions /audit; do code="$(curl -s -b "$COOKIE" -o /dev/null -w '%{http_code}' --max-time 10 "$BASE$p" || true)"; printf '%-32s -> HTTP %s\n' "$p" "$code"; [ "$code" = 200 ]; done
else
 echo "Yetkili sayfaları test etmek için TEST_USERNAME ve TEST_PASSWORD ortam değişkenlerini verin."
fi

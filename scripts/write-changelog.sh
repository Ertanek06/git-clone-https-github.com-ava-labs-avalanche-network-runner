#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${VERSION:-$(node -e "import('./src/config.js').then(m=>console.log(m.config.appVersion))" 2>/dev/null || echo unknown)}"
FILE="$ROOT/docs/CHANGELOG.md"
mkdir -p "$ROOT/docs"
DATE="$(date '+%Y-%m-%d %H:%M:%S %z')"
ENTRY="## v$VERSION — $DATE
- Proforma e-posta gönderimi eklendi: SMTP ayarları, proforma gönderim ekranı, gönderim log'u ve hata kayıtları.
- Görüntülendi takibi eklendi: müşteriye özel güvenli teklif bağlantısı, view_count, ilk görüntülenme zamanı ve ziyaret olayları.
- Teklif → fatura zinciri eklendi: proformadan fatura taslağı üretme, fatura listesi, durum yönetimi ve JSON dışa aktarım.
- Fatura/e-fatura entegrasyon ayar merkezi eklendi: sağlayıcı, API URL, firma kodu ve API anahtarı alanları.
- Tam Excel aktarım merkezi eklendi: müşteri ve ürün şablon indir, dışa aktar, içe aktar akışı tek panelde toplandı.
- Müşteri Excel içe/dışa aktarma eklendi: .xlsx, XML .xls ve CSV destekli toplu müşteri yükleme/güncelleme.
- Deploy sırasında CHANGELOG otomatik güncelleme adımı update-live.sh içine bağlandı.
"
if [ -f "$FILE" ]; then
  printf '%s\n\n%s' "$ENTRY" "$(cat "$FILE")" > "$FILE.tmp"
  mv "$FILE.tmp" "$FILE"
else
  printf '# CHANGELOG\n\n%s\n' "$ENTRY" > "$FILE"
fi
echo "CHANGELOG güncellendi: $FILE"

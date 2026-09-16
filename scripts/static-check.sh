#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHECK_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/crmv1-static-check.XXXXXX")"

cleanup() {
  case "$CHECK_ROOT" in
    "${TMPDIR:-/tmp}"/crmv1-static-check.*) rm -rf -- "$CHECK_ROOT" ;;
    *) echo "Güvenli olmayan statik kontrol dizini temizlenmedi: $CHECK_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT INT TERM

export DATABASE_FILE="$CHECK_ROOT/check.sqlite"
export SHARED_DIR="$CHECK_ROOT/shared"
export PRIVATE_UPLOAD_DIR="$CHECK_ROOT/private"
export BACKUP_DIR="$CHECK_ROOT/backups"
export SESSION_SECRET="static-check-session-secret-1234567890123456"
export DATA_ENCRYPTION_KEY="static-check-data-secret-123456789012345678"

cd "$ROOT"
echo "[1/28] JavaScript söz dizimi"
find src public/js public/live scripts -type f -name '*.js' -print0 | xargs -0 -n1 node --check
echo "[2/28] Bash söz dizimi"
find scripts -type f -name '*.sh' -print0 | xargs -0 -n1 bash -n
echo "[3/28] EJS delimiter kontrolü"
python3 - <<'PY'
from pathlib import Path
bad=[]
for p in Path('views').rglob('*.ejs'):
 s=p.read_text(encoding='utf-8')
 if s.count('<%') != s.count('%>'): bad.append(str(p))
if bad: raise SystemExit('EJS delimiter hatası: '+', '.join(bad))
print('EJS delimiter kontrolü başarılı')
PY
echo "[4/28] Sahte link kontrolü"
if grep -RInE "href=['\"]#['\"]" views public src; then echo 'HATA: Sahte link bulundu'; exit 1; fi
grep -q '^PUBLIC_BASE_URL=https://crm\.artevapp\.com\.tr$' .env.example || { echo 'HATA: Canlı PUBLIC_BASE_URL varsayılanı eksik'; exit 1; }
grep -q 'https://crm\.artevapp\.com\.tr' src/config.js || { echo 'HATA: Uygulama canlı URL varsayılanı eksik'; exit 1; }
grep -q 'PUBLIC_BASE_URL=https://crm\.artevapp\.com\.tr' scripts/install-test.sh || { echo 'HATA: Mevcut kurulum URL onarımı eksik'; exit 1; }
echo "[5/28] Hassas dosya kontrolü"
if find . -path './node_modules' -prune -o -type f \( -name '*.sqlite' -o -name '*.sqlite-wal' -o -name '*.sqlite-shm' -o -name '.env' \) -print | grep -q .; then echo 'HATA: Dağıtım paketinde hassas çalışma dosyası bulundu'; exit 1; fi
echo "[6/28] Dahili npm registry kontrolü"
if grep -RInE 'applied-caas|internal\.api\.openai|artifactory/api/npm' package-lock.json package.json .npmrc 2>/dev/null; then echo 'HATA: Erişilemeyen dahili npm registry adresi bulundu'; exit 1; fi
echo "[7/28] Multipart CSRF bağlantıları"
for f in views/customers/form.ejs views/products/form.ejs views/profiles/form.ejs views/settings/login.ejs; do grep -q '?_csrf=' "$f" || { echo "HATA: Multipart CSRF query token eksik: $f"; exit 1; }; done
echo "[8/28] Login kayıtlı ayar bağlantısı"
grep -q 'getLoginStudioState' src/routes/auth.js || { echo 'HATA: Login Studio ayarları auth routeuna bağlı değil'; exit 1; }
grep -q 'saveLoginStudio' src/routes/settings.js || { echo 'HATA: Login Studio kayıt routeuna bağlı değil'; exit 1; }
echo "[9/28] Ortak WYSIWYG şablonu"
grep -q "include('../partials/login-canvas'" views/auth/login.ejs || { echo 'HATA: Gerçek login ortak canvas kullanmıyor'; exit 1; }
grep -q "include('../partials/login-canvas'" views/settings/login.ejs || { echo 'HATA: Ön izleme ortak canvas kullanmıyor'; exit 1; }
echo "[10/28] Anlık ön izleme ve sürükleme"
grep -q 'data-draggable="left_title"' views/partials/login-canvas.ejs || { echo 'HATA: Sol başlık sürüklenemiyor'; exit 1; }
grep -q 'data-draggable="left_text"' views/partials/login-canvas.ejs || { echo 'HATA: Sol açıklama sürüklenemiyor'; exit 1; }
grep -q "addEventListener('wheel'" public/js/login-studio-v356.js || { echo 'HATA: Tekerlek boyutlandırma bağlı değil'; exit 1; }
echo "[11/28] Animasyon kütüphanesi"
grep -q 'login-library' src/services/login-studio.service.js || { echo 'HATA: Kalıcı login-library servisi yok'; exit 1; }
grep -q 'login_media' src/middleware/upload.js || { echo 'HATA: Video yükleme alanı tanımlı değil'; exit 1; }
grep -q 'deleteLoginMedia' src/routes/settings.js || { echo 'HATA: Animasyon silme routeu yok'; exit 1; }
echo "[12/28] Büyük video bellek kontrolü"
if grep -q 'fs.readFileSync(file.path)' src/middleware/upload.js; then echo 'HATA: Yüklenen videonun tamamı belleğe okunuyor'; exit 1; fi
grep -q 'fs.readSync' src/middleware/upload.js || { echo 'HATA: Akış tipi magic-byte kontrolü yok'; exit 1; }
echo "[13/28] Kalıcı medya seed içeriği"
[ -f seed-login-media/catalog.json ] || { echo 'HATA: Hazır animasyon kataloğu yok'; exit 1; }
[ "$(find seed-login-media -maxdepth 1 -type f \( -name '*.mp4' -o -name '*.webm' \) | wc -l)" -ge 11 ] || { echo 'HATA: Hazır animasyon dosyaları eksik'; exit 1; }
echo "[14/28] Güvenli aktivasyon ve rollback"
grep -q 'rollback_on_error' scripts/install-test.sh || { echo 'HATA: Kurulum rollback trap yok'; exit 1; }
grep -q 'EXPECTED_RELEASE' scripts/verify-health.js || { echo 'HATA: Gerçek release doğrulaması yok'; exit 1; }
grep -q 'Restart=on-failure' scripts/install-systemd.sh || { echo 'HATA: systemd Restart=on-failure değil'; exit 1; }
grep -q 'Restart=on-failure' scripts/ensure-systemd-current.sh || { echo 'HATA: current release systemd drop-in Restart=on-failure değil'; exit 1; }
echo "[15/28] Nginx ve uygulama yükleme limiti"
grep -q '50 \* 1024 \* 1024' src/middleware/upload.js || { echo 'HATA: Uygulama video limiti 50 MB değil'; exit 1; }
grep -q 'LIMIT=128m' scripts/install-test.sh || { echo 'HATA: Nginx 128 MB limiti kurulumda bağlı değil'; exit 1; }
echo "[16/28] İç içe form ve giriş kartı kontrolü"
if grep -q '<form class="login-pro-card" <% if(isPreview)' views/partials/login-canvas.ejs; then echo 'HATA: Ön izlemede iç içe form oluşturuluyor'; exit 1; fi
grep -q 'data-preview-login-card' views/partials/login-canvas.ejs || { echo 'HATA: Ön izleme kartı div yapısında değil'; exit 1; }
grep -q 'action="/login"' views/partials/login-canvas.ejs || { echo 'HATA: Gerçek giriş formu action bağlantısı eksik'; exit 1; }
echo "[17/28] Ayrık cache-kıran Login Studio varlıkları"
[ -f public/css/login-studio-v356.css ] || { echo 'HATA: Login Studio CSS kaynağı yok'; exit 1; }
grep -q 'assetBundle?.styles' views/auth/login.ejs || { echo 'HATA: Login birleşik CSS paketine bağlı değil'; exit 1; }
grep -q 'login-studio-v356.css' scripts/build-assets.js || { echo 'HATA: Login Studio CSS bundle girdilerinde yok'; exit 1; }
echo "[18/28] Güvenilir tasarım ve animasyon kaydı"
grep -q 'selected_media_id' views/settings/login.ejs || { echo 'HATA: Seçili animasyon hidden alanı yok'; exit 1; }
grep -q 'studio_payload' views/settings/login.ejs || { echo 'HATA: Tasarım payload alanı yok'; exit 1; }
grep -q 'syncPayload' public/js/login-studio-v356.js || { echo 'HATA: Form payload senkronizasyonu yok'; exit 1; }
grep -q 'resolveLoginTenantId' src/services/login-studio.service.js || { echo 'HATA: Public login tenant çözümlemesi yok'; exit 1; }
echo "[19/28] Public login firma eşleşmesi"
grep -q 'login_studio_public_active' src/services/login-studio.service.js || { echo 'HATA: Aktif public login firma işaretçisi yok'; exit 1; }
grep -q "WHERE key=? AND value_json='true'" src/services/login-studio.service.js || { echo 'HATA: Public login aktif firma sorgusu yok'; exit 1; }
grep -q 'markPublicLoginTenant(resolvedTenantId, now)' src/services/login-studio.service.js || { echo 'HATA: Kaydetmede public login firma işaretlenmiyor'; exit 1; }
echo "[20/28] Public animasyon render türü"
grep -Eq 'source_kind:[[:space:]]*item\.kind' src/services/login-studio.service.js && grep -Eq 'kind:[[:space:]]*"video"' src/services/login-studio.service.js || { echo 'HATA: Public seçili animasyon video türüne normalize edilmiyor'; exit 1; }
grep -q 'mediaRenderKind' views/partials/login-canvas.ejs || { echo 'HATA: Login canvas medya render normalizasyonu yok'; exit 1; }
echo "TEMEL STATIK KONTROLLER BASARILI"
echo "[21/28] Giriş/çıkış CSRF oturum dayanıklılığı"
grep -q 'preservedCsrfToken' src/routes/auth.js || { echo 'HATA: Login session regenerate CSRF tokenını korumuyor'; exit 1; }
grep -q 'req.session.save' src/routes/auth.js || { echo 'HATA: Login redirect öncesi session save yok'; exit 1; }
grep -q 'AUTH_GRACE_PATHS' src/middleware/csrf.js || { echo 'HATA: Auth same-origin CSRF toleransı yok'; exit 1; }
grep -q '/auth/csrf-token' src/server.js || { echo 'HATA: CSRF yenileme endpointi yok'; exit 1; }
grep -q 'assetBundle.js' views/layout.ejs || { echo 'HATA: Birleştirilmiş uygulama JS paketi yerleşimde yok'; exit 1; }
grep -q 'csrf-session-v355.js' scripts/build-assets.js || { echo 'HATA: Uygulama logout CSRF yenileme scripti bundle girdilerinde yok'; exit 1; }
grep -q 'assetBundle?.js' views/auth/login.ejs || { echo 'HATA: Login birleşik JS paketine bağlı değil'; exit 1; }
echo "[22/28] Animasyon decoder yükü kontrolü"
if grep -q '<video src="<%=item.url%>"' views/settings/login.ejs; then echo 'HATA: Kütüphane bütün videoları decode ediyor'; exit 1; fi
grep -q 'login-media-video-placeholder' views/settings/login.ejs || { echo 'HATA: Hafif video placeholderı yok'; exit 1; }
grep -q 'requestIdleCallback' public/js/login-page-v356.js || { echo 'HATA: Login videosu ertelenmiş yüklenmiyor'; exit 1; }
grep -q 'visibilitychange' public/js/login-page-v356.js || { echo 'HATA: Arka planda video durdurulmuyor'; exit 1; }
echo "[23/28] Optimize hazır medya"
[ "$(find seed-login-media -maxdepth 1 -type f -name '*.mp4' | wc -l)" -ge 11 ] || { echo 'HATA: Optimize MP4 animasyonlar eksik'; exit 1; }
if find seed-login-media -maxdepth 1 -type f -name '*.webm' | grep -q .; then echo 'HATA: Seed içinde ağır VP9 WEBM kaldı'; exit 1; fi
grep -q 'updated=${updated}' scripts/sync-login-media.js || { echo 'HATA: Optimize builtin medya güncelleme senkronu yok'; exit 1; }
echo "[24/28] Health aktif release bağımlılık kontrolü"
grep -q 'ACTIVE_ROOT' scripts/health-check.sh || { echo 'HATA: Health aktif release kökünü kullanmıyor'; exit 1; }
grep -q 'node_modules' scripts/health-check.sh || { echo 'HATA: Health bağımlılık klasörünü doğrulamıyor'; exit 1; }

echo "[25/28] Beş kart modeli ve bağımsız kart ayarları"
for token in 'classic' 'glass' 'executive' 'minimal' 'embedded'; do grep -q "id: \"$token\"" src/services/login-studio.service.js || { echo "HATA: Kart modeli eksik: $token"; exit 1; }; done
grep -q 'data-card-model' views/settings/login.ejs || { echo 'HATA: Kart model seçici yok'; exit 1; }
grep -q 'card_width' src/services/login-studio.service.js || { echo 'HATA: Bağımsız kart genişliği kaydı yok'; exit 1; }
grep -q 'logo_height' src/services/login-studio.service.js || { echo 'HATA: Logo boyutu kaydı yok'; exit 1; }
echo "[26/28] Tüm giriş kartı metinleri düzenlenebilir"
for token in login_label_text login_placeholder_text password_label_text password_placeholder_text password_toggle_text password_hide_text remember_text note_text; do grep -q "$token" src/services/login-studio.service.js || { echo "HATA: Düzenlenebilir kart metni eksik: $token"; exit 1; }; done
grep -q 'data-preview-role="login_label"' views/partials/login-canvas.ejs || { echo 'HATA: Kullanıcı alan başlığı canlı bağlı değil'; exit 1; }
grep -q 'data-preview-role="note"' views/partials/login-canvas.ejs || { echo 'HATA: Alt bilgi canlı bağlı değil'; exit 1; }
echo "[27/28] Birebir kırpma, görünür sınır ve tam ekran ön izleme"
grep -q 'viewportRatio' public/js/login-studio-v356.js || { echo 'HATA: Tarayıcı oranı eşleştirmesi yok'; exit 1; }
grep -q 'clampPosition' public/js/login-studio-v356.js || { echo 'HATA: Studio görünür alan sınırı yok'; exit 1; }
grep -q 'clampVisibleText' public/js/login-page-v356.js || { echo 'HATA: Gerçek login görünür alan sınırı yok'; exit 1; }
grep -q 'data-live-preview-modal' views/settings/login.ejs || { echo 'HATA: Tam ekran canlı ön izleme penceresi yok'; exit 1; }
grep -q 'MOBILE_BREAKPOINT = 1100' public/js/login-page-v356.js || { echo 'HATA: Gerçek login mobil kırılımı yok'; exit 1; }
grep -q "classList.add('is-mobile-layout')" public/js/login-page-v356.js || { echo 'HATA: Gerçek login mobil yerleşimi etkinleşmiyor'; exit 1; }
grep -q "compact ? 'contain' : 'cover'" public/js/login-studio-v356.js || { echo 'HATA: Mobil Studio ön izlemesi taşmadan sığdırılmıyor'; exit 1; }
grep -q '@media(max-width:680px)' public/css/login-studio-v356.css || { echo 'HATA: Login Studio telefon kırılımı yok'; exit 1; }
grep -q 'login-pro-canvas.is-mobile-layout' public/css/login-studio-v356.css || { echo 'HATA: Mobil giriş tuvali stilleri yok'; exit 1; }
echo "[28/28] Çift servis ve port çakışması koruması"
grep -q 'arteva-crm-erp.service' scripts/install-test.sh || { echo 'HATA: Eski çift servis kapatma koruması yok'; exit 1; }
grep -q 'EADDRINUSE' scripts/install-test.sh || { echo 'HATA: Port çakışması doğrulama mesajı yok'; exit 1; }

echo "[29/31] Çoklu e-posta ve gerçek güvenli bağlantı"
grep -q 'data-email-recipient-editor' views/quotes/email.ejs || { echo 'HATA: Çoklu Kime/Bilgi alanı yok'; exit 1; }
[ -f public/js/quote-email.js ] || { echo 'HATA: Çoklu e-posta istemci denetimi yok'; exit 1; }
grep -q 'share_url_secret' src/routes/quotes.js || { echo 'HATA: Kopyalanabilir güvenli bağlantı şifreli saklanmıyor'; exit 1; }
grep -q 'send_log_id' src/routes/public-quotes.js || { echo 'HATA: Görüntülenme olayı doğru gönderim kaydına bağlı değil'; exit 1; }
node scripts/test-email-list.js

echo "[30/34] Doğrulanmış veri yedeği ve transaction geri yükleme"
[ -f views/backups/index.ejs ] || { echo 'HATA: Yedekleme ekranı eksik'; exit 1; }
[ -f src/services/data-backup.service.js ] || { echo 'HATA: Veri yedekleme servisi eksik'; exit 1; }
grep -q 'ARTEVA_CRM_DATA_BACKUP' src/services/data-backup.service.js || { echo 'HATA: Doğrulanmış JSON yedek formatı yok'; exit 1; }
grep -q "db.transaction" src/services/data-backup.service.js || { echo 'HATA: Geri yükleme tek transaction içinde değil'; exit 1; }
grep -q "backup_file" views/backups/index.ejs || { echo 'HATA: JSON geri yükleme dosya alanı yok'; exit 1; }
grep -q "SHA-256" src/services/data-backup.service.js || { echo 'HATA: Yedek bütünlük doğrulaması yok'; exit 1; }
grep -q "DATA_BACKUP_OPERATION_FAILED" src/routes/backups.js || { echo 'HATA: Başarısız yedekleme audit kaydı yok'; exit 1; }

echo "[31/34] Kullanıcı bazlı yedekleme hatırlatması"
grep -q "backup_reminder:" src/routes/dashboard.js || { echo 'HATA: Ana sayfa yedekleme hatırlatması yok'; exit 1; }
grep -q "/backups/reminder/snooze" views/dashboard/index.ejs || { echo 'HATA: 15 gün ertele akışı yok'; exit 1; }

echo "[32/34] Proformadan ürün aktarımı ve OCR fallback"
[ -f src/services/proforma-product-import.service.js ] || { echo 'HATA: Proforma ürün tarama servisi eksik'; exit 1; }
grep -q "pdftotext" src/services/proforma-product-import.service.js || { echo 'HATA: PDF metin çıkarma akışı yok'; exit 1; }
grep -q "tesseract" src/services/proforma-product-import.service.js || { echo 'HATA: OCR fallback yok'; exit 1; }
grep -q "import-proforma/:token/save" src/routes/products.js || { echo 'HATA: Ön izlemeli ürün kaydetme akışı yok'; exit 1; }
grep -q "data-import-preview" views/products/import-proforma-preview.ejs || { echo 'HATA: Ürün kartı ön izlemesi yok'; exit 1; }
grep -q 'href="/products/import-proforma"' views/partials/sidebar.ejs || { echo 'HATA: Menü ağacında Proformadan Ürün Aktar yok'; exit 1; }
[ -f views/products/import-proforma.ejs ] || { echo 'HATA: Temalı ürün aktarım giriş paneli yok'; exit 1; }

echo "[33/34] Güvenli link, WhatsApp, bayrak ve kompakt işlem tasarımı"
grep -q "ensureOperationalSchema" src/routes/quotes.js || { echo 'HATA: Güvenli bağlantı şema onarımı çağrılmıyor'; exit 1; }
grep -q "https://wa.me/" src/routes/quotes.js || { echo 'HATA: WhatsApp doğru hedefe yönlenmiyor'; exit 1; }
grep -q "data-whatsapp-action" public/js/app.js || { echo 'HATA: WhatsApp ayrı pencere istemci akışı yok'; exit 1; }
grep -q "application/x-www-form-urlencoded" public/js/app.js || { echo 'HATA: WhatsApp isteği CSRF middleware ile uyumlu URL-encoded gönderilmiyor'; exit 1; }
grep -q "X-CSRF-Token" public/js/app.js || { echo 'HATA: WhatsApp isteğinde CSRF başlığı yok'; exit 1; }
grep -q "/public/flags/tr.svg" views/partials/topbar.ejs || { echo 'HATA: Gerçek TR SVG bayrağı yok'; exit 1; }
grep -q "quote-page-actions" public/css/app.css || { echo 'HATA: Kompakt proforma işlem düğmeleri yok'; exit 1; }

echo "[34/34] Ana sayfa kısayol canlı ekle/kaldır"
grep -q "shortcutZone.replaceChildren()" public/js/app.js || { echo 'HATA: Kaldırılan kısayol ana sayfadan fiziksel olarak temizlenmiyor'; exit 1; }
grep -q "fetch('/dashboard/shortcuts'" public/js/app.js || { echo 'HATA: Kısayol seçimi sunucuyla eşitlenmiyor'; exit 1; }
grep -Eq "r\\.post\\(['\"]\\/dashboard\\/shortcuts['\"]" src/routes/dashboard.js || { echo 'HATA: Kısayol kaydetme API rotası yok'; exit 1; }
grep -q "if(document.querySelector('\[data-dashboard-shortcut-add-v62\]'))return" public/js/app.js || { echo 'HATA: Eski kısayol motoru devre dışı değil'; exit 1; }
grep -q "#sidebar .menu a\[href\]" public/js/app.js || { echo 'HATA: Sidebar alt menüleri kısayol kataloğuna alınmıyor'; exit 1; }
grep -q 'assetBundle.js' views/layout.ejs || { echo 'HATA: Hashli uygulama JS paketi yerleşimde yok'; exit 1; }
grep -q '"app.js"' scripts/build-assets.js || { echo 'HATA: Ana uygulama JS dosyası bundle girdilerinde yok'; exit 1; }
grep -q "mailFailureText" src/routes/quotes.js || { echo 'HATA: E-posta hatası gönderim ekranına güvenli mesajla dönmüyor'; exit 1; }
grep -q "data-dashboard-widget=\"live-support\"" public/css/app.css || { echo 'HATA: Mobil ana sayfa kart sırası tanımlı değil'; exit 1; }
grep -q "locale-flags" views/partials/topbar.ejs || { echo 'HATA: TR/EN bayrakları üst barda birlikte görünmüyor'; exit 1; }
grep -q "desktop rail hotfix" public/css/app.css || { echo 'HATA: Daraltılmış sidebar simgesi düzeltmesi yok'; exit 1; }
grep -q "QUOTE_WHATSAPP_SHARE_CREATED" src/routes/quotes.js || { echo 'HATA: Proforma WhatsApp güvenli paylaşım rotası yok'; exit 1; }
grep -q "globalPreviewWhatsapp" views/layout.ejs || { echo 'HATA: Proforma ön izlemede WhatsApp paylaşımı yok'; exit 1; }
grep -q "crm-login-remembered-username-v1" public/js/login-page-v356.js || { echo 'HATA: Beni hatırla kullanıcı adı kaydı yok'; exit 1; }
grep -q "contact_extra_mobile\[\]" public/js/app.js || { echo 'HATA: Cep telefonu +90 hazırlayıcısı yok'; exit 1; }

node scripts/test-auth-csrf.js
echo "EK AUTH/PERFORMANS VE LOGIN DESIGNER KONTROLLERI BASARILI"

node scripts/test-crmv1-31-install-contract-hotfix.js
node scripts/test-v360-contracts.js
node scripts/test-crmv16-contracts.js
node scripts/test-crmv17-contracts.js
node scripts/test-crmv18-contracts.js
node scripts/test-crmv19-contracts.js
node scripts/ejs-compile-test.js
node scripts/test-v3814-consistency.js
node scripts/test-v3814-ui-contracts.js
node scripts/test-v3815-ui-integrity.js
node scripts/test-crmv10-hotfix.js

node scripts/test-crmv13-ui.js
node scripts/test-audit-remediation.js
node scripts/test-crmv1-38-web-history-csp.js
node scripts/test-crmv1-14-performance.js
node scripts/test-crmv1-15-print-layout.js

node scripts/test-crmv1-34-persistent-media-catalog-print.js
node scripts/test-crmv1-39-release-contract.js

# Test Raporu — v3.8.37 / crmv1.25

Doğrulama tarihi: 09.08.2026

## Geçen kontroller

- JavaScript söz dizimi
- Bash söz dizimi
- EJS delimiter kontrolü
- Sahte link / hassas dosya / registry kontrolü
- Multipart CSRF, login ayarları ve WYSIWYG bağlantıları
- Canlı ön izleme / sürükleme / animasyon / medya kontrolleri
- Güvenli aktivasyon ve rollback kontrolleri
- Nginx yükleme limiti ve port çakışması koruması
- E-posta güvenli bağlantı kontrolleri
- `EMAIL_LIST_TESTS=6/6 OK`
- Doğrulanmış veri yedeği ve transaction geri yükleme kontrolü
- Kullanıcı bazlı yedekleme hatırlatması
- Proformadan ürün aktarımı / OCR fallback
- WhatsApp / bayrak / kompakt işlem tasarımı
- Ana sayfa kısayol canlı ekle/kaldır
- `AUTH_CSRF_TESTS=5/5 OK`
- `V360_CONTRACT_TESTS=35/35 OK`
- `CRMV16_CONTRACTS=25/25 OK`
- crmV17 / crmV18 / crmV19 sözleşmeleri
- `EJS_COMPILE_TESTS=55/55 OK`
- `V3814_CONSISTENCY_TESTS=26/26 OK`

## Ortam notu

Yerel doğrulama konteynerinde npm registry `@e965/xlsx@0.20.3` paketini döndürmediği için `npm ci` tamamlanamadı. Bu nedenle bağımlılık isteyen sonraki UI testleri burada koşturulamadı. Canlı sunucu kurulumunda `install-test.sh`, `npm ci --omit=dev` sonrasında aynı statik test zincirini tekrar çalıştırır ve başarısız olursa aktif release'e geçmez.

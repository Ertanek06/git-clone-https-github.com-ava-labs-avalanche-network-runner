# ARTEVA CRM / ERP v3.7.1 — Final Doğrulama

## Kimlik

- Uygulama sürümü: `3.7.1`
- Release: `v3.7.1-dashboard-theme-preview-muadil-import-setup-final`
- SQLite şema sürümü: `41`

## Tamamlanan doğrulamalar

- JavaScript söz dizimi: `93/93`
- Bash söz dizimi: `18/18`
- EJS kaynak derleme: `51/51`
- Gerçek EJS proforma renderer testi: taslak, gönderilen, onaylı, revizyonlu ve arşiv `5/5`
- v3.7.0 geriye dönük sözleşme kontrolleri: `50/50`
- v3.7.1 son düzeltme sözleşmeleri: `18/18`
- Ana statik güvenlik/bağlantı kontrolleri: başarılı
- Auth/CSRF: `5/5`
- Para hesaplama: `4/4`
- Varsayılan yetkiler: `4/4`
- Çoklu e-posta: `6/6`
- Login Studio render: `3/3`
- Login kayıt sözleşmesi: `10/10`
- Public tenant login sözleşmesi: `6/6`
- Excel ürün ayrıştırma: `12/12`
- PDF ürün ayrıştırma: `6/6`
- Migration: `3/3`; integrity `OK`; foreign-key hatası `0`
- Gönderilen gerçek e-fatura örneğinde yalnızca ana ürün tablosundaki `7` ürün çıkarıldı; birim fiyatlar `1850, 4670, 2510, 600, 500, 600, 870 EUR` olarak ayrıştırıldı.
- Proforma satırlarında hard-delete kullanılmadığı, soft-delete ve `QUOTE_CONTENT_UPDATE` geçmişi bulunduğu statik sözleşmeyle doğrulandı.

## Ortam notu

Bu çalışma ortamının npm proxy'si `bytes@3.1.3` arşivini 404 döndürdüğü için temiz `npm ci` tamamlanamadı. Kaynak, migration, EJS, parser, güvenlik ve sözleşme testleri ayrı ayrı çalıştırıldı. Canlı kurulum scripti bağımlılık kurulumu başarısız olursa release'i etkinleştirmez ve mevcut sürümü korur.

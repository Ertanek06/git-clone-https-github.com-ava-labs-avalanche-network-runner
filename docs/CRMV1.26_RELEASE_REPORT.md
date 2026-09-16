# crmv1.28 — Palette + Address Hotfix

- Version: `3.8.40`
- Release: `v3.8.40-crmv1.28-email-tracking-mobile-assets`
- Build: `crmv1.28`

## Düzeltilenler

1. Proforma şablonundaki gelişmiş renk kutuları birbirinden ayrıldı. Bağımsız renk modu ilk kez açılırken mevcut canlı tasarımın gerçek hesaplanmış renkleri palete alınır; kullanıcının değiştirmediği alanlar aynı kalır. Böylece örneğin banka başlık rengi değiştirildiğinde ürün tablosu veya diğer kırmızı başlıklar değişmez.
2. Müşteri adresi için yalnızca ikon/noktalama içeren bozuk değerler geçersiz sayılır. Kayıtlı müşterinin fatura/teslimat/adres1/adres2 alanlarından anlamlı tam adres geri kazanılır.
3. Eski müşteri kayıtlarında yalnızca `address1/address2` doluysa proforma müşteri seçicisinde fatura/teslimat adresine doğru aktarılır.
4. Proforma detay ekranı, standart PDF/ön izleme ve özel HTML şablonları aynı adres temizleme/fallback mantığını kullanır.

## Doğrulama

- Değiştirilen JavaScript dosyaları `node --check` ile doğrulandı.
- `scripts/test-crmv1-26-palette-address.js` geçti.
- Statik kontrol paketi bağımlılık gerektirmeyen tüm kontrolleri ve EJS derleme sözleşmelerini geçti; yerel ortamda `node_modules` bulunmadığı için sonraki UI testi `ejs` modülünü yükleyemedi. Kurulum betiği sunucuda `npm ci --omit=dev` ve asset build çalıştırır.

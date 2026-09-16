# CRMV1.45 Web Ürün Aktarım Güvenilirlik Raporu

## Sürüm

- Uygulama: `3.8.57`
- Paket: `crmv1.45`
- Release: `v3.8.57-crmv1.45-web-import-upsert-ui-document-fix`

## Tamamlanan düzeltmeler

- Tarama sonuçlarında geç CSS yüklenmesinden kaynaklanan ham/amatör ekran parlaması kaldırıldı; sayfa stilleri ilk boyamada hazırdır.
- Ürün Kontrol Tablosu kompakt, sistem renkleriyle uyumlu ve doğrudan açık bir liste olarak yeniden tasarlandı.
- Toplu seçim düğmeleri ve sayfa/filtre seçimi gerçek sunucu seçimiyle eşitlendi; seçili ürün sayaçları aynı değeri gösterir.
- Aynı kodun harf farkıyla tekrar eklenmesi engellendi. Eski yinelenen kayıtlar tek ana üründe birleştirilir ve bağlı teklif satırları korunur.
- Ürün varsa son tarama verileriyle güncellenir, yoksa bir kez eklenir. Arşivde aynı kod bulunması benzersiz alan hatasına yol açmaz.
- Açıklamalar kaydetme anında yeniden temizlenir; eski tarama işleri de site, WhatsApp, iletişim, kampanya, kategori ve form metni taşımadan güncellenir.
- Marka çıkarımı JSON-LD, üretici/marka alanları, HTML etiketleri ve güvenli başlık geri dönüşüyle tutarlı hale getirildi.
- Broşür/CE/kullanım kılavuzu PDF belgeleri yetkili ve satır içi belge rotası üzerinden canlı ön izlemede açılır.
- İşçi tamamlandığında gerçek eklenen/güncellenen/atlanan sayaçları doğrudan kalıcı geçmiş tablosuna yazılır.
- Otomatik süreli geçmiş silme kaldırıldı; yalnız geçici iş dosyaları temizlenir. Tekil geçmiş kaydı kullanıcı isterse ayrıca silinebilir.
- Canlı taramada ürün kartı varken görünen yanlış “Henüz analiz edilmiş ürün yok” alanı kesin olarak gizlenir.

## Doğrulama

- Veritabanı migration: `1-52` başarılı.
- EJS derleme: `60/60` başarılı.
- CRM tam regresyon paketi: tüm testler başarılı.
- Yeni v1.45 upsert/UI/belge testi: `35/35` başarılı.
- JavaScript, Bash, EJS, güvenlik ve dağıtım statik kontrolleri: başarılı.
- HTTP/CSP duman testi: başarılı.
- Üretim CSS/JS varlıkları yeniden derlendi ve gzip karşılıkları oluşturuldu.

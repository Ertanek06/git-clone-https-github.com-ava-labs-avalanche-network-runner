# crmv1.42 Release Report

**Version:** 3.8.54  
**Build:** crmv1.42  
**Release:** `v3.8.54-crmv1.42-web-import-control-center`

## Canlı Proforma Takibi

- Doğrulanmış müşteri açılışlarında `verified_last_viewed_at` son ziyaret alanı olarak kullanılır.
- Gönderilenler listesi son ziyaret zamanı azalan sırada listelenir; henüz açılmamış kayıtlar ziyaret edilmiş kayıtların arkasında kalır.
- Her gönderimin doğrulanmış açılma geçmişi yeni tarihten eski tarihe doğru ayrı ayrı gösterilir.

## Ürün Ön İzleme — yerinde düzenleme

- Ayrı alt editör kartı kaldırıldı.
- Ürün adı, kod, marka/model, kategori, birim, GTİP, menşei, stok/minimum, tedarikçi, durum, açıklama, ürün bağlantısı ve yetki varsa satış fiyatı/para birimi/KDV aynı kart içindeki mevcut alanlarda düzenlenir.
- Düzenleme durumunda Kaydet, Vazgeç ve Sil kontrolleri başlıkta görünür.
- Görsel hızlı yükleme, ürün görseli üzerinde korunur.
- Broşür, CE Belgesi ve Kullanma Kılavuzu belge satırları düzenleme modunda PDF seçme, kayıtlı dosya adını görme ve kaldırma imkânı verir.
- Kısmi kart kaydında ekranda bulunmayan ana ürün alanları korunarak veri kaybı önlenir.

## Ürün katalog çıktısı

- Ürün ön izlemesindeki Yazdır / PDF Kaydet düğmesi `/products/:id/catalog-print?auto=1` çıktısını açar.
- A4 çıktı firma logosu/başlığı, ürün görseli, ürün adı/kodu/meta bilgileri, ürün açıklaması ve firma iletişim alt barından oluşur.
- Satış fiyatı, satın alma fiyatı ve ticari fiyat alanları katalog çıktısına basılmaz.
- Görsel yükleme hatasında kırık resim ikonu basılmaz.

## Doğrulamalar

- `CRMV1.34_PRODUCT_INLINE_CATALOG_VISIT_ORDER=25/25 OK`
- `EJS_COMPILE_TESTS=56/56 OK`
- `V360_CONTRACT_TESTS=35/35 OK`
- `CRMV16_CONTRACTS=25/25 OK`
- `CRMV1.27_PRODUCT_PREVIEW_IMAGE_TESTS=OK`
- Önceki ilgili statik sözleşme kontrolleri yeni yerinde düzenleme ve ürün katalog yazdırma davranışına göre güncellendi.
- Bağımlılık gerektiren tam çalışma zamanı test paketi, teslim ZIP'inde `node_modules` bulunmadığı için yerelde çalıştırılmadı; canlı kurulum `npm ci` sonrası kendi test zincirini çalıştırır.

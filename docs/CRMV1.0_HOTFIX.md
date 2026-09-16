# crmv1.0 Hotfix — R2

Bu paket mevcut **3.8.19** canlı sürümü üzerinde hedefli düzeltmeler içerir. Ana veri kayıtlarını silmez ve mevcut canlı kurulum/rollback akışını kullanır.

## Korunan önceki düzeltmeler

1. Proformadan ürün kaydetme CSRF ve 303 yönlendirme düzeltmesi.
2. Tarama iptali sonrasında ana CRM sürecinin kapanmasını ve 502 oluşmasını engelleyen güvenli alt süreç sonlandırması.
3. Masaüstü dashboard kart geometrisi uygulanırken büyüme/küçülme ve göz kırpma önleme.
4. Ürün görsellerinin kırpılmadan tam gösterilmesi ve mobil liste düzenlemeleri.

## R2 düzeltmeleri

### Ürün Ön İzleme

- Satış fiyatı artık ürün ön izleme kartında her zaman görünür.
- Para birimi boşsa güvenli biçimde `TRY` kullanılır.
- Kısa açıklama ve teknik açıklama birleştirilir; varsa eski açıklama alanları da kaybolmadan gösterilir.
- Ürün açıklamasında satır kısıtlaması, maksimum yükseklik ve metin kırpma kaldırılmıştır.
- Uzun açıklamalar eksiksiz, satırları korunarak ve kelime taşması yapmadan gösterilir.

### Mobil Ana Sayfa

- Önceki tek ve yanlış mobil panel gizlenmiştir.
- Mevcut/orijinal dashboard kartları geri getirilmiştir.
- Telefonda yalnızca istenen kartlar, ayrı ve simetrik şekilde gösterilir:
  - Canlı Proforma Takibi
  - Son Proformalar
  - Son Eklenen Müşteriler
  - Son İşlemler
  - Bildirimler
- Kartlar mobilde mutlak konum, kayıtlı masaüstü genişlik/yükseklik ve serbest pano ölçülerinden etkilenmez.
- Kart araçları ve boyutlandırma tutamaçları yalnız mobilde gizlenir.
- Son proformalar, müşteriler, işlemler ve bildirimler düz liste satırları halinde okunaklı gösterilir.
- Akıllı İş Akışı ve Canlı Destek gibi talep edilmeyen kartlar mobilde gizli, masaüstünde korunmuştur.

## Paket adı

- ZIP: `crmv1.0.zip`
- ZIP içi klasör: `crmv1.0/`
- Uygulama sürüm sözleşmesi: `3.8.19`
- Release sözleşmesi: `v3.8.19-template-preview-smart-product-search`

## Doğrulamalar

- JavaScript ve Bash söz dizimi başarılı.
- EJS delimiter kontrolü başarılı.
- EJS derleme kontrolü: **54/54** başarılı.
- `CRMV10_HOTFIX=30/30` başarılı.
- Temel statik kontroller, e-posta ve auth/CSRF testleri başarılı.
- V360, CRMV16, CRMV17, CRMV18, CRMV19 ve V3814 consistency testleri başarılı.

Paketleme ortamında `node_modules` bulunmadığından `test-v3814-ui-contracts.js` bağımlılık testi çalıştırılamamıştır. Canlı kurulum sonunda `scripts/health-check.sh` çalıştırılmalıdır.

# CRM v3.8.14 Son Doğrulama Raporu

Tarih: 24.07.2026  
Release: `v3.8.14-ui-integrity-final`  
Şema: `42`

## Düzeltilen doğrulanmış sorunlar

- Proforma listesindeki finansal yetkiye bağlı `colgroup`, başlık, gövde ve boş durum sütun sayıları eşitlendi.
- Süreç listesindeki koşullu toplam sütunu ve boş durum `colspan` değeri düzeltildi.
- Arşiv tablosundaki geçersiz iç içe form yapısı ayrıştırıldı; toplu ve satır bazlı işlemler bağımsız çalışır.
- Müşteri, ürün, proforma, süreç, arşiv, kullanıcı ve dashboard tablolarındaki işlem ikonları ortak SVG bileşenine taşındı.
- İşlem sütunu genişliği görünür işlem sayısına bağlandı; eski sayfa kurallarının 30/32 px ve farklı sütun ölçüleri üretmesi engellendi.
- Müşteri detayındaki bağımsız proforma tablosu aynı ikon, ölçü ve erişilebilir etiket sözleşmesine alındı.
- Rollback işlemi hedef release için yalnızca HTTP yanıtını değil sürüm ve release kimliğini doğrular; başarısızlıkta önceki `APP_VERSION` geri yüklenir.
- Kurulum komutu paket adındaki kopya eki gibi değişikliklerden etkilenmez; aynı dizindeki tek v3.8.14 ZIP paketini seçer.

## Uygulanan doğrulamalar

- Temiz geçici veritabanında 42 migration ve SQLite bütünlük/foreign-key kontrolü
- 53/53 EJS derleme kontrolü
- 5/5 auth/CSRF, 7/7 session, 4/4 yetki varsayılanı, 4/4 para hesabı ve 6/6 e-posta listesi testi
- 12/12 Excel, 6/6 PDF ve 10/10 katı ürün aktarım testi
- 35/35 V360, 52/52 V370, 23/23 + 14/14 V373, 21/21 V375 ve 12/12 crmV20 sözleşme testi
- 25/25 v3.8.14 tutarlılık ve 137/137 UI sözleşme testi
- Tüm JavaScript/Bash söz dizimi, EJS delimiter, hassas dosya ve dağıtım statik kontrolleri
- Üretim bağımlılıklarında `npm audit`: 0 bilinen güvenlik açığı
- Geçici üretim veritabanıyla gerçek HTTP smoke testi: `/health` 200, `/login` 200, yeni tutarlılık CSS’i 200

Bu revizyon mevcut iş kayıtlarının, route davranışlarının, yetki modelinin ve soft-delete/snapshot yapısının anlamını değiştirmez.

# v3.5.8 Final Revizyon Raporu

## WhatsApp ve CSRF

- Liste, proforma detay ve ön izleme penceresindeki WhatsApp işlemleri ortak bir istemci akışına bağlandı.
- İşlemden önce `/auth/csrf-token` üzerinden güncel anahtar alınır.
- POST gövdesi `application/x-www-form-urlencoded` biçiminde gönderilir; `_csrf` alanı ve `X-CSRF-Token` başlığı birlikte kullanılır.
- Sunucudan dönen hedef yalnız `wa.me` veya `whatsapp.com` ise kabul edilir.
- Yönlendirme aynı sekmede yapılır; CRM ekranını yeniden açan davranış kaldırıldı.
- WhatsApp iletişim günlüğü yazılamazsa güvenli teklif tokenı ayrı oluşturulur; log hatası paylaşımı engellemez.

## Proforma e-postası

- Migration 34, `quote_share_tokens`, `quote_send_logs`, `quote_view_events` ve `backup_jobs` yapılarını canlı kurulumlarda yeniden doğrular.
- E-posta öncesi log/token kaydı için token-only ikinci koruma eklendi.
- SMTP başarılı olduktan sonraki log veya audit hataları artık gönderimi başarısız göstermez.
- Güvenli bağlantı aktivasyonu, log güncellemesi hata verirse bağımsız olarak yeniden denenir.
- Gerçek SMTP hatalarında bağlantı pasifleştirilir ve hata kaydı tutulur.

## Proforma işlem tasarımı

- İşlem sütunu 218 px olarak sabitlendi.
- Altı işlemin her biri 30×30 px kompakt hücrede, 5 px aralıkla gösterilir.
- Müşteri adı alanı kalan genişliği kullanır ve gerektiğinde üç noktayla kısalır.
- Liste kartında yatay kaydırma güvenli biçimde korunur; butonlar birbirinin içine girmez.
- Detay ve e-posta üst işlem grupları küçük ekranlarda sarılır, masaüstünde tam görünür kalır.

## Proformadan ürün aktarımı

- Ürün ve Hizmetler menü ağacına doğrudan erişim eklendi.
- Temaya uyumlu yükleme paneli PDF, XLSX, XLS ve CSV kabul eder.
- Dosya türü/boyutu doğrulama, tablo/metin çıkarma, başlık eşleştirme, satır doğrulama ve uyarı işaretleme uygulanır.
- Taranmış PDF’de sunucuda `pdftoppm` ve `tesseract` varsa OCR otomatik çalışır.
- Satır bulunamazsa hata sayfası yerine düzenlenebilir boş satır açılır.
- Kod, ad, açıklama, miktar, birim, fiyat, para birimi, KDV ve görsel bağlantısı kaydetmeden önce düzenlenebilir.
- Göz düğmesi düzenlenmiş satırla oluşacak ürün kartını gösterir.
- Yalnız seçili satırlar tek transaction içinde işlenir. Aynı ürün kodu güncellenir; yeni kart oluşturulmaz.
- Müşteri, tedarikçi ve firma kimlik alanları ürün kartına aktarılmaz.
- Vazgeç işlemi hiçbir kayıt oluşturmaz.

## Veri yedekleme

- Yedekleme paneli `backups/admin` yetkisiyle çalışır; tenant yöneticisinin varsayılan yetkilerine yedekleme eklendi.
- JSON yedeği geri yüklenebilir ve SHA-256 doğrulamalıdır.
- Excel raporu şu ayrı sayfaları üretir: Yedek Bilgisi, Firma Profilleri, Ürünler, Müşteriler, Yetkililer, Proformalar, Proforma Satırları ve Şablonlar.
- Geri yükleme tek transaction içinde merge/upsert yapar ve mevcut kayıtları topluca silmez.
- Audit/geçmiş yazımı sorunları başarılı dosya indirmesini veya tamamlanmış geri yüklemeyi başarısız göstermez.

## Dil ve arayüz

- Ürün listesi araçları, tablo başlıkları, işlemler ve proformadan ürün aktarım ekranı TR/EN tamamlandı.
- Sol menüde yeni ürün aktarım bağlantısı iki dilde görünür.
- Gerçek SVG TR/EN bayrakları ve önceki kompakt WhatsApp tasarımı korunmuştur.

## Sürüm

- Version: `3.5.8`
- Release: `v3.5.8-whatsapp-csrf-action-layout-product-import-final`
- Schema: `34`
- Ana müşteri/ürün/proforma/fatura/revizyon kayıtlarını temizleyen migration yoktur.

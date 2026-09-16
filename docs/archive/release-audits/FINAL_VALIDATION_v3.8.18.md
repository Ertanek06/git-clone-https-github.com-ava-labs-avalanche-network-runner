# Final Doğrulama — v3.8.18

Tarih: 24.07.2026  
Release: `v3.8.18-responsive-import-user-report`

## Kapsam

- Kullanıcı Yönetimi taşma kontrolü, kullanıcı bilgi kartı ve son işlem raporu
- Tüm form bağlantılı “Tümünü Seç” alanları
- Çok sayfalı proforma PDF satır ayrıştırma
- Kırık ürün görseli için boş PDF hücresi
- Dikey kayan ürün aktarım paneli ve sabit/simetrik alt işlemler
- Yatay Sidebar Tasarımları ön izleme galerisi
- Tarayıcı yakınlaştırmasında dashboard yeniden akış davranışı
- Üst tarih, saat, arama ve WhatsApp alanlarının korunması

## PDF doğrulaması

Eklenen gerçek 6 sayfalık doğrulama belgesinde ürün tablosu 16 satırdır. Ayrıştırıcı 16 satırın tamamını almış; ürün fiyat toplamı `8.985,24 EUR` ve seçilen strateji `paginated` olarak doğrulanmıştır. Belgede doğrulanabilir 17. ürün bulunmadığından sistem fazladan ürün üretmez.

## Otomatik kontroller

Tam test paketi, EJS derleme, statik kontrol, temiz migration, çalışma zamanı sağlık kontrolü, üretim bağımlılığı güvenlik taraması ve paket manifest doğrulaması dağıtım öncesinde çalıştırılır.

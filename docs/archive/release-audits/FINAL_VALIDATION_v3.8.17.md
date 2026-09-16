# Final Doğrulama — v3.8.17

Tarih: 24.07.2026  
Release: `v3.8.17-full-backup-ui-integrity`  
Şema: `42`

## Korunan üst çubuk

`views/partials/topbar.ejs` dosyasının SHA-256 özeti önceki v3.8.16 paketiyle aynıdır:

`ed4c87068f1795044e5c56a927633c9e9dc8d0cbd650b8eae046d4c51eb9b19d`

Tarih, saat, arama ve WhatsApp bölümünün kaynak yapısı değiştirilmemiştir.

## Doğrulanan kapsam

| Kontrol | Sonuç |
|---|---:|
| Temiz `npm ci` | Başarılı |
| Üretim bağımlılığı güvenlik taraması | 0 bilinen açık |
| Statik/söz dizimi kontrolü | Başarılı |
| Migration | 42/42 |
| EJS derleme | 54/54 |
| v3.8.16 güvenlik ve kurtarma sözleşmesi | 23/23 |
| v3.8.17 veri bütünlüğü/UI sözleşmesi | 22/22 |
| `/health` çalışma testi | HTTP 200 |
| `/login` çalışma testi | HTTP 200, CSRF alanı mevcut |
| Şifreli tam yedek oluşturma ve inceleme | Başarılı |

## Veri güvenliği

- Ana iş kayıtlarında yeni bir hard-delete akışı eklenmemiştir.
- Müşteri ek yetkilisi düzenlemesinde var olan kimlik korunur; kaldırılan kayıt arşivlenir.
- Veri Bütünlüğü Merkezi salt okunurdur ve otomatik dosya/kayıt silmez.
- Tam yedek inceleme komutu yeni bir klasöre açar; canlı veritabanının üzerine yazmaz.
- Dağıtım paketine `.env`, SQLite çalışma verisi, kullanıcı yüklemeleri ve `node_modules` dahil edilmez.

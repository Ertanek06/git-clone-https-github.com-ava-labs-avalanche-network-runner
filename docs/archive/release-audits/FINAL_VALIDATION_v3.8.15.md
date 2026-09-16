# Final Doğrulama — v3.8.15

Tarih: 24.07.2026  
Release: `v3.8.15-ui-function-integrity`  
Şema: `42`

## İncelenen alanlar

- Sidebar ve mobil menü ağaçları
- Aktif rota ve süreç filtresi işaretlemeleri
- Müşteri, ürün, proforma, süreç, fatura, canlı destek ve yönetim modülleri
- Buton türleri, hedefleri ve ayrıntılı yetki görünürlüğü
- Sayfa başlıkları, paneller, kartlar, tablo yazıları, hücre boşlukları ve mobil yerleşim
- EJS layout referansları, sunucu rotaları ve hata günlükleri

## Giderilen kritik hatalar

1. `/products/import-proforma/history` görünümü bulunmayan `layouts/main.ejs` dosyasını çağırdığı için HTTP 500 veriyordu. Ortak `layout.ejs` iskeletine geçirildi.
2. Gönderilen proformalar ana listeyle birlikte aktif görünüyordu. Aktif rota koşulları ayrıştırıldı.
3. Süreç alt menülerinin `flow` sorgu durumu okunmadığı için aktif bağlantı gösterilemiyordu. Sorgu bilgisi görünüm bağlamına eklendi.
4. Mobil menü ve bazı üst/ayar kısayolları kullanıcı izinlerini dikkate almıyordu. Tüm görünürlük koşulları gerçek izin matrisine bağlandı.
5. Müşteri, ürün ve fatura eylemleri rol adına göre veya koşulsuz gösteriliyordu. Create/edit/archive/export/financial/integration izinleri ayrı ayrı uygulandı.
6. Toplu fiyat güncellemesi sunucu tarafında finans düzenleme iznini zorunlu tutmuyordu. Rota koruması tamamlandı.
7. Tema ve canlı destek ön izleme düğmeleri form içinde yanlışlıkla kayıt gönderebiliyordu. Ön izleme düğmeleri açıkça `type="button"` yapıldı.

## Doğrulama sonucu

- Temiz migration: başarılı, şema `42`
- `npm test`: başarılı
- `npm run check`: başarılı
- EJS derleme ve layout varlık kontrolü: `53/53`
- UI tablo/form sözleşmeleri: `137/137`
- v3.8.15 UI ve yetki bütünlüğü: `39/39`
- Oturumlu ana/yönetim ekranı taraması: `35/35 HTTP 200`
- Sunucu çalışma zamanı hata taraması: hata bulunmadı
- Üretim bağımlılığı güvenlik taraması: `0 vulnerabilities`
- `/health`: `3.8.15 / v3.8.15-ui-function-integrity`

Dağıtım ZIP'i `node_modules`, `.env`, SQLite çalışma dosyaları, yedekler ve kullanıcı yüklemeleri hariç tutularak oluşturulur.

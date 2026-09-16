# Final Doğrulama — v3.8.16

Tarih: 24.07.2026  
Release: `v3.8.16-security-recovery`

## Değişiklik kapsamı

- Genel erişime açık yükleme dizini oturum, tenant sahipliği ve kapsamı/süresi imzalı erişimle korundu.
- Yeni yüklemeler tenant klasörlerine ayrıldı; Login Studio medya kataloğu tenant bazında izole edildi.
- Login yanıtları hesap varlığını veya durumunu ele vermeyen tek hata sözleşmesine bağlandı; dışarıdan hesap kilitlemeye yol açan akış kaldırıldı.
- Yetim yüklemeler için kalıcı silme yerine özel karantina uygulandı.
- Sistem Sağlık Merkezi disk, bellek ve SMTP durumunu doğru kaynaklardan ölçer.
- Müşteri, ürün, proforma, firma profili ve şablonlar için tenant kapsamlı Arşiv ve Kurtarma Merkezi eklendi.
- Yeni panel masaüstü ve 390 px mobil görünüm için ortak uygulama düzeniyle uyumlu hale getirildi.

## Veri koruma sözleşmesi

- Mevcut `.env`, veritabanı, kullanıcılar, firma profilleri ve yüklemeler güncelleme sırasında korunur.
- Temel CRM kayıtlarında geri döndürülemez toplu silme eklenmemiştir.
- Arşivden çıkarma işlemleri tenant filtresi ve audit kaydıyla yürütülür.
- Login Studio özel medyası ve yetim dosyalar kaldırıldığında kurtarma karantinasına taşınır.

## Otomatik doğrulama

| Kontrol | Sonuç |
|---|---:|
| SQLite migration | 42/42 |
| EJS görünüm derleme | 54/54 |
| v3.8.16 güvenlik ve kurtarma sözleşmesi | 23/23 |
| Tam `npm test` paketi | Başarılı |
| Üretim bağımlılığı güvenlik taraması | 0 bilinen açık |
| Yetkisiz `/public/uploads` isteği | HTTP 404 |
| Genel CSS varlığı | HTTP 200 |
| Oturumlu ana/yönetim ekranları | Tümü HTTP 200 |
| `/health` sürüm/release | `3.8.16` / `v3.8.16-security-recovery` |

## Çalışma zamanı senaryosu

Geçici ve temiz bir SQLite veritabanında migration ve yönetici hesabı oluşturuldu. Oturum açıldıktan sonra müşteri, ürün, proforma, şablon, ayarlar, yedekler, sistem sağlığı, kullanıcılar, audit ve yeni `/recovery` ekranı dahil smoke-test kapsamındaki tüm ekranlar HTTP 200 verdi. Aynı çalışmada yetkisiz yükleme isteğinin HTTP 404 döndürdüğü doğrulandı.

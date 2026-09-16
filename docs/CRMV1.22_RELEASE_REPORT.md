# crmv1.22 Sürüm Raporu

Sürüm: `3.8.34`  
Release: `v3.8.34-crmv1.22-proforma-live-studio-hotfix`  
Build: `crmv1.22`

## Düzenlemeler

- crmv1.21 kurulumunda statik kontrolde durmaya neden olan eksik `views/backups/index.ejs` yedekleme ekranı geri eklendi.
- Yedekleme ekranı mevcut `src/routes/backups.js` akışıyla uyumlu olacak şekilde JSON yedek indirme, Excel rapor indirme, doğrulanmış JSON geri yükleme, veri bölümü seçimi ve işlem geçmişini içerir.
- crmv1.21 ile eklenen Proforma Canlı Tasarım Stüdyosu, tek ana renk, iki sayfayı yan yana canlı ön izleme, gelişmiş logo yerleşimi, sıfırlama, gönderilen tasarım snapshot'ı ve ürün ön izleme fiyat pill düzenlemeleri korunur.
- Kurulum/health sürüm kimlikleri `3.8.34 / crmv1.22` olarak artırıldı.
- Hatalı kurulumda aktif sürüm değiştirilmediği için sunucudaki crmv1.20 güvenli biçimde çalışmaya devam eder; crmv1.22 başarılı kontrollerden sonra etkinleşir.

## Doğrulama

- JavaScript ve Bash söz dizimi kontrolleri geçti.
- EJS delimiter kontrolü geçti.
- Statik kontrolün 34/34 yapısal maddesi geçti; önceki `Yedekleme ekranı eksik` hatası giderildi.
- Auth/CSRF kontrolleri ve sürüm sözleşme kontrolleri dependency gerektirmeyen aşamalarda geçti.
- Yerel çalışma konteynerinde npm registry `@e965/xlsx` paketini sağlamadığı için production bağımlılık kurulumu tamamlanamadı; canlı kurulum scripti bağımlılıkları kendi `npm ci --omit=dev` adımında kurar.

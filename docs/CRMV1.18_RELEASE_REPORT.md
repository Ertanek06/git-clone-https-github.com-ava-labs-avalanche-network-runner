# crmv1.18 Sürüm Raporu

Sürüm: `3.8.30`  
Release: `v3.8.30-crmv1.18-template-preview-recovery`  
Build: `crmv1.18`

## Düzeltilen ana sorunlar

- Ürün Ön İzleme penceresi, dashboard widget kartlarıyla aynı pencere-seviyesi pointer motoruyla büyütülüp küçültülür. İmleç kart veya iframe dışına çıksa da işlem devam eder ve sonuç kullanıcı bazında saklanır.
- Hazır proforma şablonları yapısal v2'ye otomatik dönüştürülmez. Migration 47, 44 hazır şablonun özgün `layout-*` görünümünü geri getirir ve arşivlenmiş eski hazır tasarımları açar.
- Şablon galerisi ve düzenleyici, seçilen veritabanı kaydını doğrudan gerçek baskı motoruyla render eder. Düzenleme ekranındaki canlı ön izleme de sentetik maket yerine aynı sunucu rotasını kullanır.
- Baskı gövdesinin tasarım sınıfları ilk HTML içinde yer alır; sonradan sınıf ekleyen ve görünüm sıçramasına yol açan script kaldırılmıştır.

## Doğrulama kapsamı

- 44 hazır şablonun her biri gerçek örnek firma, müşteri, normal ürün, muadil ürün, tutar ve koşul verileriyle EJS render testinden geçer.
- Eski şablonlarda yapısal v2 sınıfı bulunmadığı; yeni yapısal tasarım açıkken v2 sınıflarının doğrudan `body` üzerinde oluştuğu doğrulanır.
- Ürün Ön İzleme motorunda `pointermove`, `pointerup` ve `pointercancel` olaylarının pencere seviyesinde bağlı olduğu; yerleşik `resize: both` davranışının kapalı olduğu doğrulanır.
- Şema sürümü 47, SQLite bütünlüğü ve yabancı anahtar denetimi test edilir.

# crmv1.17 Sürüm Raporu

Sürüm: `3.8.29`  
Release: `v3.8.29-crmv1.17-mobile-print-footer-resize`  
Build: `crmv1.17`

## Tamamlanan düzeltmeler

- iOS/AirPrint baskısında alt bilgi aynı A4 içinde sabitlendi; yalnız alt bilgi içeren boş fiziksel sayfa engellendi.
- Standart proforma sayfalayıcısı, koşul/banka/imza bloklarını kalan gerçek alana göre yerleştiriyor ve içeriksiz footer sayfalarını temizliyor.
- Ürün açıklaması alanının aşağı doğru yeniden boyutlandırılması ve Ürün Ön İzleme kartının sağ alt köşeden büyütülüp küçültülmesi çalışır hale getirildi.
- Proforma Şablonunu Düzenle ekranına tam ekran ve büyük ön izleme odak modları eklendi.
- Yapısal Tasarım 15 kontrol grubuna genişletildi; başlık, müşteri, ürün, toplam, koşul, banka, imza, alt bilgi, yoğunluk ve boşluk seçenekleri canlı ön izleme ile gerçek çıktıda aynı sınıf motorunu kullanıyor.
- Eski hazır proforma şablonlarını arşivleyen otomatik eleme kaldırıldı. Migration 46 önceki sürümde arşivlenen sistem şablonlarını bir kez geri getiriyor; sonraki kullanıcı silmeleri korunuyor.

## Doğrulama kapsamı

- JavaScript sözdizimi ve 55 EJS görünümü derleme kontrolü
- Migration 1–46, SQLite bütünlük ve yabancı anahtar kontrolü
- Mobil A4/alt bilgi, ürün açıklaması ve pencere resize sözleşme testleri
- Tam ekran şablon stüdyosu, yeni yapısal seçenekler ve eski şablon geri yükleme testleri
- Tam uygulama regresyon, statik analiz ve hash'li asset üretimi

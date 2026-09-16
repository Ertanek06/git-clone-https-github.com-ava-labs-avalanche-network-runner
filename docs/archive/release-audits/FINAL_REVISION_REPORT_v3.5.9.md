# ARTEVA CRM/ERP v3.5.9 Final Revizyon Raporu

## Kapsam

Bu sürüm, **Proformadan Ürün Aktar** ekranında Excel dosyasının yüklenememesi/işlenememesi sorununu, ürün bulunamadığında geçici boş satır oluşturulmasını, WhatsApp yönlendirme davranışını ve Tema–Sidebar tasarım stüdyosunun tutarsızlığını düzeltir.

## Excel ve proforma aktarımı

- `.xlsx`, `.xls`, `.csv` ve `.txt` dosyaları uzantı + gerçek dosya imzası birlikte doğrulanarak kabul edilir.
- Windows/Chrome tarafından `application/octet-stream`, `application/zip` veya OLE türüyle gönderilen gerçek Excel dosyaları artık MIME uyuşmazlığı nedeniyle reddedilmez.
- XLSX çalışma kitabı buffer üzerinden okunur; CommonJS ve ESM paket dışa aktarımları birlikte desteklenir.
- Tüm çalışma sayfaları taranır. İlk 50 satır içinde Türkçe ve İngilizce ürün başlıkları aranır.
- Standart başlık bulunamazsa kod, ürün adı, miktar, birim, fiyat ve para birimi içerik yapısından çıkarılmaya çalışılır.
- Aynı ürün satırları kod/ad/fiyat anahtarına göre tekilleştirilir.
- Ürün bulunamazsa ön izleme için sahte veya boş satır oluşturulmaz. İşlem durdurulur ve kullanıcı dosyayı düzeltip yeniden yüklemeye yönlendirilir.
- Bozuk/parola korumalı Excel, desteklenmeyen içerik ve dosya boyutu hataları ayrı ve anlaşılır mesajlarla gösterilir.
- Hata veya başarı sonrasında geçici yükleme dosyası temizlenir.

## WhatsApp

- Paylaşım ayrı bir tarayıcı penceresinde açılır.
- Açılır pencere kullanıcı tıklaması sırasında oluşturulduğu için tarayıcı popup engeline düşme riski azaltılmıştır.
- CRM sayfası kapanmaz veya WhatsApp adresine dönüşmez.
- Güvenli bağlantı oluşturulamazsa açılan boş pencere kapatılır ve gerçek hata mesajı gösterilir.

## Tema ve Sidebar Kontrolleri

- Login Sayfası Tasarımı ile aynı stüdyo iskeleti kullanılır.
- Sol tarafta canlı CRM/sidebar ön izlemesi, sağ tarafta sabit ayar paneli bulunur.
- Renk, genişlik, yazı, yoğunluk, köşe ve sidebar tasarımı değişiklikleri kaydetmeden anlık görünür.
- Tam ekran ön izleme ve değişiklik/kaydetme durumu eklendi.
- Mevcut varsayılan, düzenle, gizle, geri yükle ve sıfırla işlemleri korunmuştur.

## Veri güvenliği

- Bu revizyonda veritabanı migration ihtiyacı yoktur; şema sürümü 34 korunur.
- Müşteri, ürün, proforma, satır veya revizyon kayıtlarını silen yeni işlem eklenmemiştir.
- Ürün kaydı yalnızca kullanıcı ön izlemede seçip kaydettiğinde kod bazlı ekleme/güncelleme yapar.

## Sürüm

- Uygulama: `3.5.9`
- Release: `v3.5.9-excel-import-whatsapp-window-theme-studio`
- Beklenen port: `3120`

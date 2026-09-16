# ARTEVA CRM/ERP v3.6.0 Final Revizyon Raporu

## Proformadan ürün aktarımı

- PDF dosyaları için `pdftotext -layout`, dahili `pdf-parse` okuyucusu ve gerektiğinde Türkçe/İngilizce OCR birlikte kullanılır.
- Sabit sütunlu tablolar, standart dışı başlıklar, devam satırları ve miktar/birim/fiyat düzenleri ayrı stratejilerle taranır.
- Aynı ürün kodunun farklı stratejilerde tekrar bulunması tek ön izleme satırında birleştirilir.
- Ticari belge bağlamı ve doğrulanabilir ürün satırı oluşmadan geçici/boş ürün üretilmez.
- PDF, XLSX, XLS, CSV ve TXT dosyalarında uygulama limiti 100 MB; Nginx limiti 128 MB olarak kurulumda uygulanır.
- Sunucuda eksikse Poppler ve Tesseract OCR araçları kurulum sırasında güvenli biçimde tamamlanmaya çalışılır.

## Tema ve Sidebar Tasarımcısı

- Login Tasarımcısı ile aynı stüdyo iskeleti ve tam ekran canlı ön izleme kullanılır.
- 140'tan fazla görünüm değeri kullanıcı bazında ayrı ayrı saklanır.
- Sayfa zemini, sayfa başlığı, kartlar, iç paneller, sayaç kartları, üst bar, sidebar, logo kartı, aktif etiketi, menü/ikon/alt menü, bütün buton türleri, işlem ikonları, giriş alanları, tablolar, durum etiketleri, modal, dropdown, tooltip, bildirim, tipografi, scrollbar ve animasyon ayarları bağımsızdır.
- Özel CSS alanı tüm standart kontrollerden sonra uygulanır.
- Sıfırlama yalnızca kullanıcı görünüm ayarlarını siler; müşteri, ürün ve proforma kayıtlarına dokunmaz.

## Şema ve sürüm

- Uygulama: `3.6.0`
- Release: `v3.6.0-pdf-import-100mb-full-theme-components`
- Şema: `35`
- Migration 35, kullanıcı görünüm ayarlarına `custom_json` alanını ekler.

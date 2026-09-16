# ARTEVA CRM / ERP v3.8.0 Doğrulama

Sürüm: `3.8.0`  
Release: `v3.8.0-ocr-table-theme-center-navigation-dialog-final`

## Kapsam
- `İndir / PDF` ve `Yazdır / PDF Kaydet` yalnızca gerçek proforma PDF ön izlemesinde görünür.
- Müşteri kartı ön izlemesinde PDF rotası üretilmez; `/customers/:id/print?auto=1` kaynaklı 404 kaldırılmıştır.
- Modal içindeki proforma iframe'inde ikinci/tekrarlı işlem çubuğu gösterilmez.
- PDF ürün aktarımında farklı okuyucuların satırları birleştirilmez; en güçlü tek kaynak ve tek tablo stratejisi seçilir.
- Adres, firma kimliği, garanti, ödeme, toplam, banka, IBAN, kur ve not satırları ürün kabul edilmez.
- Ürün adının ilk kelimesinin yanlışlıkla kod sütununa kaydığı satırlar elenir.
- İlk Kurulum Sihirbazı kapalı akordiyon içermeyen, bütün bölümleri açık tek sayfalı kurulum/devir stüdyosu olarak yeniden tasarlanmıştır.

## Çalıştırılan kontroller
- JavaScript söz dizimi: `96/96`
- Bash söz dizimi: `17/17`
- EJS derleme: `51/51`
- v3.6.0 sözleşmeleri: `35/35`
- v3.7.0 sözleşmeleri: `50/50`
- v3.7.2/v3.7.3 sözleşmeleri: `23/23` ve `14/14`
- v3.8.0 sözleşmeleri: `21/21`
- Katı sentetik ürün ayrıştırma: `10/10`
- İlave gürültülü tablo kontrolü: `2/2 gerçek ürün`
- Gerçek e-fatura örneği: `7/7 gerçek ürün`; fiyatlar `1850, 4670, 2510, 600, 500, 600, 870 EUR`
- Manifest doğrulaması ve ZIP bütünlük kontrolü

## Canlı ortam notu
Tarayıcı, Nginx, systemd, gerçek SMTP ve canlı veritabanı aktivasyonu bu paketleme ortamında çalıştırılmamıştır. `update-live.sh`, kurulum veya sağlık kontrolü başarısız olursa yeni release'i etkinleştirmeden mevcut çalışan sürümü korur.

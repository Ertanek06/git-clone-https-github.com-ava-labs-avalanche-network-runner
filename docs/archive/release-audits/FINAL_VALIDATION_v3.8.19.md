# Final Doğrulama — v3.8.19

Tarih: 24.07.2026  
Release: `v3.8.19-template-preview-smart-product-search`

## Kapsam

- Proforma oluştururken standart ve özel HTML şablonlarının canlı ön izlemesi
- Süresi geçmiş CSRF anahtarında otomatik yenileme ve güvenli iframe form geri dönüşü
- Boş ürün alanına tıklayınca alfabetik kayıtlı ürün listesinin açılması
- Türkçe karakter normalizasyonu ve yazım hatası toleranslı ürün sıralaması
- PDF görsel hücresindeki mükerrer Muadil etiketinin kaldırılması
- `1.950,00 TRY` biçiminin sütunda bölünmeden gösterilmesi
- Ürün adının koyu/net, açıklamasının daha ince/açık gösterilmesi
- Üst tarih, saat, arama ve WhatsApp alanlarının korunması

## Canlı doğrulama

- Boş ürün sorgusu alfabetik `AEE-750, AFCBOTD120, MX-S` sırasını döndürdü.
- Hatalı `vortxe` sorgusu `MX-S / VORTEX`, `çekre` sorgusu `AFCBOTD120 / ÇEKER OCAK` sonucunu ilk sırada döndürdü.
- `corporate-main`, özel HTML etkin `technical-lab` ve `clean-lab-plus` şablonları taslak ön izleme rotasında HTTP 200 verdi.
- Sıfır veritabanından 42 migration uygulandı; giriş ve 35 yetkili uygulama rotası HTTP 200 verdi.
- Sağlık yanıtı sürüm `3.8.19` ve release `v3.8.19-template-preview-smart-product-search` olarak doğrulandı.

## PDF doğrulaması

Eklenen gerçek altı sayfalık A4 proforma Poppler ile PNG olarak işlendi ve mevcut para birimi satır bölünmesi görsel olarak doğrulandı. Yeni EJS çıktısında Muadil rozeti yalnız ürün başlığında bir kez üretilir; görsel hücresinde üretilmez. Türkçe sayı biçimi `1.950,00` olarak korunur ve değer ile `TRY` kodu `white-space: nowrap` kullanan tek para bileşeni içinde tutulur. Ürün adı ve açıklaması ayrı renk/ağırlık kurallarıyla doğrulandı.

## Otomatik kontroller

- Tam `npm test` paketi başarılı
- EJS derleme: `54/54`
- v3.8.19 regresyon testi: `30/30`
- Statik JavaScript, Bash, EJS, CSRF, kurulum ve arayüz kontrolleri başarılı
- Üretim bağımlılığı güvenlik taraması: `0` güvenlik açığı
- Paket manifest ve temiz ZIP doğrulaması dağıtım öncesinde yeniden çalıştırılır

# Final Doğrulama - v3.8.19 Proforma PDF Hotfix

Tarih: 24.07.2026

## Düzeltilenler

- Standart ve manuel proforma şablonlarında ürün görseli 17,5 x 24 mm alana büyütüldü.
- Ürün adı 9,2 px / 700; ürün açıklaması 7,75 px / 400 olacak şekilde net ayrıldı.
- Proforma genelinde resmi evrak uyumlu Arial / Liberation Sans yazı ailesi sabitlendi.
- Fiyatlarda anlamsız `,00` son eki kaldırıldı; gerçek küsurat varsa iki basamak korunur.
- Birim fiyat, indirim ve toplam sütunları yeniden oranlandı. Para alanları tek satır tutulur ve çalışma anında hücreye sığdırılır.
- Standart, canlı ön izleme, yazdırma ve manuel HTML şablonları aynı para/görsel tipografi kurallarına bağlandı.
- CSS ve sayfalama betiği için önbellek kırma eki eklendi.

## Kontrol

- EJS söz dizimi ve statik şablon kontrolü
- Fiyat biçimi regresyon testi
- Standart PDF görsel render kontrolü
- Yatay fiyat taşması denetimi

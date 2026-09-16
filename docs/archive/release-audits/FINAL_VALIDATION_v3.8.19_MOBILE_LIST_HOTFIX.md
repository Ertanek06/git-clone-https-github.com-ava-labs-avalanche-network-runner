# Final Doğrulama - v3.8.19 Mobil Liste Hotfix

Tarih: 25.07.2026

## Kapsam

- `/products` ürün listesi
- `/customers` müşteri listesi
- `/quotes` proforma listesi
- Ürün ekleme/düzenleme ekranındaki `Dosyalar ve Açıklama` bölümü

## Uygulanan mobil kurallar

- Kurallar yalnızca `max-width: 760px` altında etkinleşir.
- Masaüstü tablo ölçüleri, sütun genişlikleri ve toolbar yerleşimleri değiştirilmez.
- Mobil kartlarda sabit `tr` yüksekliği iptal edilmiştir.
- Tablo, satır ve hücrelerde mobilde `min-width: 0`, `height: auto` ve taşmasız metin kuralları zorlanmıştır.
- Mobilde ürün adı, müşteri unvanı ve proforma numarası kart başlığı olarak öne alınmıştır.
- Ürün görselleri `object-fit: contain` ile tam görünür.
- Mobil arama ve işlem araçları yatay taşma olmadan grid düzenine alınmıştır.
- Ürün formundaki dosya alanları tek sütun ve tam genişlik olarak sabitlenmiştir.

## Doğrulamalar

- EJS derleme kontrolü: `54/54 OK`
- Yeni mobil sözleşme testi: `9/9 OK`
- Ürün medya sözleşme testi: `10/10 OK`
- JavaScript söz dizimi kontrolü: başarılı
- Bash söz dizimi kontrolü: başarılı
- CSS ayrıştırma kontrolü: hata yok
- Tam bağımlılık gerektiren entegrasyon testleri, pakette `node_modules` bulunmadığı için bu çalışma ortamında çalıştırılamadı.

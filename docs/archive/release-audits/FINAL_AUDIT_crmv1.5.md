# ARTEVA CRM / ERP — crmv1.5 Mobil Proforma İyileştirme Raporu

Uygulama: 3.8.22  
Build: `crmv1.5`  
Release: `v3.8.22-crmv1.5-mobile-proforma-discount-picker`

## Düzeltilen sorunlar

1. Mobil proforma ürün satırında masaüstü piksel genişlikleri son katmana sızdığı için ürün adı dahil bazı kontroller tek harf genişliğine kadar daralabiliyordu. crmv1.5 katmanında her ürün hücresi tam genişlikte dikey kart alanına dönüştürüldü; giriş, seçim ve açıklama alanlarının yazı yönü yatay ve genişliği yüzde 100 olarak zorlandı.
2. Mobil üst bardaki tarih, saat ve kur DOM alanları mevcut olmasına rağmen eski responsive kuralı bunları gizliyordu. Tarih, saat, EUR ve USD artık üst barda yatay kaydırılabilir canlı bilgi şeridinde görünürdür.
3. Ürün seçici her harfte tüm popup HTML'ini silip yeniden üretiyor, dolayısıyla arama inputu DOM'dan çıkıp yeniden giriyor ve odak/klavye davranışı titreşiyordu. Seçici artık sabit kabuk kullanır; yalnız sonuç alanı güncellenir ve eski istek `AbortController` ile iptal edilir.
4. Teklif seviyesinde indirim modeli yoktu. `quotes` tablosuna tip, değer ve hesaplanan toplam indirim alanları eklendi. Yüzde veya sabit tutar indirimi satır indirimlerinden sonra uygulanır; KDV satır matrahlarına oransal dağıtılan genel indirimden sonra yeniden hesaplanır.
5. Satır indirimi sıfır olan proformalarda çıktı tablosunda gereksiz İndirim sütunu görünüyordu. Standart EJS ve özel HTML şablon tablosu satır indirimi varlığını kontrol eder; hiç satır indirimi yoksa sütun ve başlık oluşturulmaz. Teklif geneli indirim varsa toplamlar bölümündeki indirim satırında görünmeye devam eder.

## Korunan davranışlar

- En güncel ürünlerin önce listelenmesi ve kod/ad içinde geçen metinle arama korunmuştur.
- crmv1.4'teki koşullu PDF toplam bloğu sayfalaması korunmuştur.
- Masaüstü proforma tablosu ve mevcut satır indirimi davranışı korunmuştur.
- Güncelleme akışı canlı veriyi release dizininden ayırmaya ve aktivasyon öncesi yedek almaya devam eder.

## Doğrulama

- JavaScript sözdizimi, EJS derleme, statik dağıtım kontrolleri ve crmv1.5 özel davranış sözleşmeleri çalıştırılır.
- Tam veritabanı testinin çalıştırılabilmesi için `better-sqlite3` yerel Node modülünün hedef ortamda derlenmiş olması gerekir; canlı `update-live.sh` bağımlılık kurulumunu hedef sunucuda gerçekleştirir.

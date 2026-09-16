# CRMV1.43 Ürün ve Web Aktarım Onarım Raporu

Baz paket: **crmv1.42 / 3.8.54**. Önceki modüller korunarak ürün listesi araması ile web sitesi ürün tarama, kontrol ve güncelleme akışları onarıldı.

## Düzeltilen sorunlar

- Ürün Kontrol Tablosu'ndaki satır kutuları, **Bu Sayfayı Seç**, **Filtredeki Tümünü Seç** ve **Seçimi Kaldır** işlemleri çalışır hâle getirildi.
- Marka, model, kategori veya fiyat bulunamaması seçim kutusunu artık kilitlemez. Yalnız ürün kodu ya da gerçek ürün adı bulunmayan hatalı satırlar engellenir.
- Toplu ve tekli seçimler sunucuya kaydedilir; seçili ürün sayısı üst özet ve alt kayıt çubuğunda eş zamanlı güncellenir.
- Seçim yapılmadan kayıt düğmesine basılırsa genel hata sayfası yerine aynı ekranda anlaşılır uyarı gösterilir.
- Mevcut ürün eşleştirmesine ürün kodunun yanında normalize edilmiş **kaynak ürün URL'si** eklendi.
- Aynı URL'den yeniden taranan ve seçilen ürün, eski CRM kaydını günceller; temizlenen yeni açıklama eski hatalı açıklamanın yerine yazılır.
- WhatsApp, telefon, e-posta, alan adı, web sitesi adı, menü, kampanya, iletişim ve footer satırları ürün açıklamasına kaydedilmez.
- Marka JSON-LD, üretici, meta etiketi, `itemprop`, marka bağlantısı ve ürün marka bloğundan güvenli sırayla alınır; bulunamazsa alan boş bırakılır.
- Ürün listesi araması, eski açıklamalardaki ortak menü metinleri yüzünden bütün kataloğu döndürmez. Öncelik ürün kodu, adı, marka, model ve kategoridedir.
- Büyük katalog taraması 36 sayfalık kontrol noktalarıyla parça parça kaydedilir. Worker kesilirse işlem iki kez otomatik, sonrasında kullanıcı komutuyla kaldığı yerden sürdürülebilir.
- Tarama geçmişindeki uzun düğme yazılarının kesilmesi giderildi ve hatalı/durdurulmuş taramalara **Kaldığı Yerden Devam Et** işlemi eklendi.

## Doğrulama

- JavaScript sözdizimi ve 60 EJS şablonu derleme kontrolünden geçirildi.
- URL ile mevcut ürün güncelleme, açıklama temizliği, boş metadata ile seçim, toplu seçim istemcisi ve kaldığı yerden tarama sözleşmeleri için `test-crmv1-43-product-web-import-repair.js` eklendi.

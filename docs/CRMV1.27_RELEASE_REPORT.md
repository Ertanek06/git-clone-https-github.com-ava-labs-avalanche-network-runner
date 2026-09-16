# crmv1.28 — Ürün Ön İzleme Hızlı Görsel Yükleme

- Ürün ön izleme görsel alanının üzerine yetkili kullanıcılar için `Görsel Ekle / Görseli Değiştir` butonu eklendi.
- Buton doğrudan JPEG/PNG/WEBP seçicisini açar; ayrı düzenleme kartını açmak gerekmez.
- Seçilen görsel CSRF ve ürün düzenleme yetkisi kontrolleriyle `/products/:id/image` üzerinden kaydedilir.
- Veritabanında `image_url` ve `image_path` birlikte güncellenir ve işlem audit kaydına alınır.
- Görsel değiştiğinde ürün ön izlemesi sayfadan çıkmadan güncellenir.
- Kart içi düzenleyicideki görsel ön izleme davranışı, hızlı yükleme butonunu silmeyecek şekilde düzeltildi.

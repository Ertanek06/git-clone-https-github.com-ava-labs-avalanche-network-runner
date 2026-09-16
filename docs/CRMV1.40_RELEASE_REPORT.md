# crmv1.40 — crmv1.39 Bazlı Profil Medya + Varyant Açıklama Hotfix

**Baz paket:** kullanıcı tarafından sağlanan `crmv1.39(1).zip` / crmv1.39, sürüm 3.8.51.

Bu paket crmv1.35 veya daha eski bir paketten türetilmemiştir. crmv1.39 içindeki web katalog tarama, canlı geçmiş, arka plan işçisi ve diğer güncel akışlar korunarak yalnızca gerekli hotfixler eklenmiştir.

## Uygulanan düzeltmeler

- Firma profili logo / kaşe / imza yüklemelerinde Windows ve iOS MIME farklılıklarına tolerans eklendi.
- JPG, JPEG, JFIF, PNG, WEBP, GIF ve AVIF gerçek içerik doğrulamasıyla desteklenir.
- Profil medya yükleme hatası artık genel hata sayfasına düşmez; form ekranına anlaşılır mesajla döner.
- Logo ve kaşe/imza kaldırma düğmeleri ana multipart formu göndermek yerine URL-encoded istek yapar; dosya alanları kaldırma isteğini bozmaz.
- Web ürün aktarımında crmv1.39 tarama/geçmiş altyapısı korunmuştur.
- Ürün başlığındaki 120 cm gibi hedef varyantın açıklamada kendi başlığı/özellik bloğu varsa, o başlık ve blok birebir korunur; 90/150 gibi rakip varyant blokları karıştırılmaz.
- Hedef varyant bloğu bulunamazsa crmv1.39 mevcut güvenli ayıklama davranışı fallback olarak devam eder.

## Sürüm

- Version: `3.8.52`
- Build: `crmv1.40`
- Release: `v3.8.52-crmv1.40-current-base-profile-media-variant-hotfix`

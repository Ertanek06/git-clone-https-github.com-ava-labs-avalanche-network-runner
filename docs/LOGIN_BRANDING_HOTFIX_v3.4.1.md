# CRM / ERP EFSANA36 v3.4.1 Login Branding Restore Fix

## Düzeltilen hata

`src/routes/auth.js` içindeki giriş route'u, veritabanındaki `login_settings` kaydını okumak yerine boş `branding` nesnesi gönderiyordu. Bu nedenle daha önce kaydedilen logo, sol duvar görseli, başlıklar, açıklamalar ve buton metni veritabanında durmasına rağmen giriş sayfasında varsayılan görünüm oluşuyordu.

## Uygulanan çözüm

- Login GET route'u kayıtlı marka ayarlarını tekrar yükler.
- Başarısız girişlerde bilinen kullanıcının tenant ayarı kullanılır.
- Login yanıtı tarayıcı önbelleğine alınmaz.
- Upload ve veritabanı yapısı korunur; mevcut görsellerin yeniden yüklenmesi gerekmez.
- Statik test, branding'in tekrar boş nesneye çevrilmesini engeller.

## Veri güvenliği

Bu hotfix migration içermez. Mevcut veritabanı ve `/shared/uploads` klasörü aynen korunur.

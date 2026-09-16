# Final Revizyon Raporu — v3.5.0

## Temel

Çalışma, kullanıcının yüklediği `CRM_ERP_EFSANA36_v3.4.1_LOGIN_BRANDING_RESTORE_FIX_PRO(2).zip` dosyası üzerinde yapılmıştır. Önceki deneysel v3.4.10–v3.4.16 paketleri kaynak olarak kullanılmamıştır.

## Gerçek WYSIWYG

Gerçek giriş sayfası ve ayarlar ön izlemesi aynı EJS partial, aynı CSS sınıfları ve aynı 1600 × 900 mantıksal tuvali kullanır. Sol metin koordinatları yüzde olarak sol alan üzerinde kaydedilir; ekran ölçeği değişse bile iki ekranda aynı göreli noktada görünür.

## Canlı düzenleme

- Sol başlık ve açıklama bağımsız sürüklenir.
- Fare tekerleğiyle boyutlandırılır.
- Giriş üst başlığı, giriş başlığı, giriş açıklaması, sol başlık, sol açıklama ve buton metni anında güncellenir.
- Renk, font ve boyut seçenekleri anında ortak tuvale uygulanır.
- Boş metinler görünmez ve yer kaplamaz.

## Animasyon kütüphanesi

- 11 hazır animasyon ve animasyonsuz seçenek eklendi.
- Seçilen video kaydetmeden önce ön izlemede oynar.
- Manuel MP4/WEBM yüklemesi geçici kart oluşturur.
- Kaydetme sonrası video benzersiz isimle kalıcı shared klasörüne taşınır.
- Hazır/yüklenen animasyonlar onay sonrası medya dosyası ve varsa küçük resmiyle birlikte silinir.
- Hazır animasyon silme kararı tombstone olarak saklanır ve sonraki güncellemede dosya geri kopyalanmaz.

## Güvenli çalışma

- Yeni veritabanı migrationı eklenmedi.
- Yüklenen büyük videoların tamamı belleğe alınmıyor.
- Uygulama limiti 50 MB, Nginx limiti 64 MB.
- Güncelleme ERR trap ile rollback uygular.
- Health kontrolü yalnız APP_VERSION değil, kod içi release kimliğini de doğrular.
- Systemd mevcut release symlinkini kullanır ve `Restart=always` uygulanır.

# Güvenli Canlıya Alma

1. ZIP SHA256 değerini doğrulayın.
2. `PORT=3120 bash scripts/install-test.sh` ile ayrı release kurun.
3. `/health`, `/login`, müşteri, ürün, proforma, revizyon ve yazdırma testlerini tamamlayın.
4. Veritabanı yedeğini kontrol edin.
5. `scripts/switch-nginx.sh` ile yalnızca `crm.example.com` proxy hedefini değiştirin.
6. SSL sertifikasının alt alan adını kapsadığını doğrulayın.
7. Hata varsa `PORT=3120 bash scripts/rollback.sh` çalıştırın.

Ana çalışan `artevapp.com.tr` alanına müdahale edilmemelidir.

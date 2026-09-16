# Veritabanı Şeması Özeti

- `tenants`: firma/tenant izolasyonu
- `users`: hash parola, rol, kilit ve son giriş
- `user_ui_settings`: kullanıcıya özel tema
- `login_settings`: kalıcı login markalama
- `profiles`: aktif firma, logo, kaşe, imza, banka
- `customers`: eksiksiz müşteri kartı
- `products`: ürün/hizmet ve teknik bilgi
- `quotes`: proforma başlığı, snapshot, kilitlenen kur, süreç durumları
- `quote_items`: ürün snapshot, indirim, KDV, satır toplamı
- `quote_templates`: 10 farklı A4 tasarım ve stüdyo ayarları
- `quote_events`: revizyon ve süreç geçmişi
- `notifications`: bildirimler
- `audit_logs`: kritik işlem kayıtları
- `app_settings`: genel ayarlar

## v3.0.2 Ek Alanları

### user_ui_settings
- `locale`: Kullanıcı bazında arayüz ve proforma dili (`tr` / `en`).

### profiles
- `quote_prefix`: Çıktı seri numarasının başında kullanılan kısa firma ön eki. Boş bırakılırsa `short_name` alanından otomatik türetilir.

## v3.3.16 Adres Alanları

### profiles
- `billing_address`: Firma fatura adresi.
- `delivery_address`: Firma teslimat adresi. Proforma çıktısında doluysa öncelikli kullanılır.

### customers
- `billing_address`: Müşteri fatura adresi.
- `delivery_address`: Müşteri teslimat adresi. Proforma çıktısında doluysa öncelikli kullanılır.

Migration 11, eski adres verilerini kaybetmeden fatura adresine aktarır.

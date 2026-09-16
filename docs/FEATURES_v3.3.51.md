# v3.3.51 — E-posta, Görüntülendi Takibi, Fatura Entegrasyonu ve Excel Paneli

Bu sürümde daha önce altyapı/dokümantasyon seviyesinde kalan büyük özellikler aktif modüllere dönüştürüldü.

## Eklenenler

### 1. E-posta ile proforma gönderme
- `/integrations` altında SMTP ayar ekranı eklendi.
- Proforma detayından `/quotes/:id/email` ekranı açılır.
- Müşteriye özel güvenli teklif linki üretilir.
- Gönderimler `quote_send_logs` tablosuna yazılır.
- Başarılı/başarısız gönderim ve hata mesajı kayıt altına alınır.

### 2. Görüntülendi bilgisi
- Müşteri linki `/q/:token` üzerinden proformayı açar.
- İlk görüntülenme zamanı, toplam görüntülenme sayısı ve IP/user-agent olay kayıtları tutulur.
- Gönderim ekranında view count ve viewed_at bilgisi görünür.

### 3. Teklif → fatura zinciri
- Proforma detayından fatura taslağı oluşturulabilir.
- `/invoices` ekranında fatura taslakları listelenir.
- Fatura durumları yönetilir: DRAFT, READY, EXPORTED, SENT, CANCELLED.
- JSON dışa aktarım ile harici muhasebe/e-fatura sistemlerine aktarım için standart veri çıktısı hazırlanır.

### 4. Harici muhasebe/e-fatura entegrasyon noktası
- `/integrations` altında sağlayıcı/API ayarları eklendi.
- LOGO, MIKRO, PARASUT, UYUMSOFT, EDM, IZIBIZ gibi sağlayıcılar için bağlantı bilgileri tutulabilir.
- Bu sürüm gerçek sağlayıcı API çağrısını otomatik yapmaz; güvenli entegrasyon noktası ve export payload standardını hazırlar.

### 5. Tam Excel müşteri/ürün paneli
- `/excel` merkezi eklendi.
- Müşteri şablon indir, dışa aktar, içe aktar akışı eklendi.
- Ürün şablon indir, dışa aktar, içe aktar akışı tek panelden erişilebilir hale getirildi.
- Müşteri import destekleri: .xlsx, XML .xls, CSV.

### 6. CHANGELOG otomasyonu
- `scripts/update-live.sh` deploy sırasında `scripts/write-changelog.sh` çalıştırır.
- Her kurulumda `docs/CHANGELOG.md` üstüne yeni sürüm notu eklenir.

## Kurulum Notu
SMTP gönderimi için `nodemailer` bağımlılığı eklendi. Sunucuda kurulum sırasında `npm install` çalıştırılmalıdır.

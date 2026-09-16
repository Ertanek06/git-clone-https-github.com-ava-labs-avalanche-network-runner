# Entegrasyon Noktaları — CRM / ERP EFSANA36

Bu dosya, ileride aktif edilecek dış bağlantılar için standart teknik çerçevedir.

## 1. SMTP / E-posta ile Proforma Gönderme

Gereken `.env` alanları:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM="ARTEVA LAB <teklif@firma.com>"
MAIL_TRACKING_ENABLED=false
```

Önerilen akış:
- Proforma PDF oluşturulur.
- E-posta gönderilir.
- `mail_logs` tablosuna alıcı, konu, gönderim zamanı ve sonuç yazılır.
- İzleme aktifse görüntülendi bilgisi ayrı loglanır.

## 2. Harici Muhasebe / E-Fatura

Gereken `.env` alanları:

```env
ACCOUNTING_PROVIDER=
ACCOUNTING_API_URL=
ACCOUNTING_API_KEY=
ACCOUNTING_TIMEOUT_MS=15000
```

Önerilen akış:
- Teklif → Sipariş → Fatura zincirinde sadece onaylı kayıtlar aktarılır.
- Cari kart eşleştirme için vergi no / TCKN / müşteri kodu kullanılır.
- Aktarım sonucu harici belge numarası CRM tarafında saklanır.

## 3. Alan Bazlı Yetki

Başlangıç standardı:
- `SUPER_ADMIN`, `TENANT_ADMIN`, `STAFF`: fiyat ve operasyon alanlarını görür.
- `VIEWER`: fiyat, maliyet, kâr oranı, genel toplam gibi finansal alanları görmez.

## 4. Excel Toplu İçe/Dışa Aktarma

Mevcut standart:
- Ürün: `.xlsx`, XML `.xls`, gerçek ikili `.xls`, `.csv`.
- Müşteri tarafı aynı standartla genişletilebilir.

## 5. Otomatik Yedekleme

Kurulum örneği:

```bash
sudo BASE=/opt/crm-erp-efsana36 RETENTION_DAYS=365 bash scripts/install-backup-cron.sh
```

Manuel yedek:

```bash
BASE=/opt/crm-erp-efsana36 RETENTION_DAYS=365 bash scripts/db-backup-rotate.sh
```

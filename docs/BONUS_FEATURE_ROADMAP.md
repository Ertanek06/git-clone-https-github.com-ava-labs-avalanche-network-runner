# Bonus Özellik Yol Haritası

## Faz 1 — Güvenlik
- Yönetici ve finans rolleri için TOTP MFA / WebAuthn passkey
- Aktif cihaz ve oturum yönetimi ekranı
- Hash zincirli, imzalı audit dışa aktarma
- S3 uyumlu şifreli ve object-lock offsite backup

## Faz 2 — Satış
- Müşteri portalında kabul, ret, revizyon isteği ve OTP onayı
- Marj alt sınırı ve tutar/iskonto bazlı çok kademeli onay
- Teklif geçerlilik ve takip otomasyonu
- Headless Chromium tabanlı deterministik PDF ve QR doğrulama

## Faz 3 — ERP
- Stok rezervasyonu, minimum stok ve satın alma önerileri
- BOM/reçete, üretim iş emri, seri numarası ve garanti takibi
- Kalibrasyon/servis planı
- Tedarikçi teklif karşılaştırması

## Faz 4 — Finans ve deneyim
- UBL-TR e-Fatura/e-Arşiv, tevkifat/istisna/ihracat senaryoları
- Tahsilat yaşlandırma ve banka hareketi eşleştirme
- CRM 360°, görev/takvim ve segmentasyon
- PWA, erişilebilirlik ve kullanıcı bazlı sunucu taslakları

# v3.4.0 Final Revizyon Raporu

## Sonuç

v3.3.98 denetimindeki 13 kritik bulgunun tamamı kod seviyesinde kapatıldı. 22 yüksek öncelikli bulgunun güvenlik ve veri bütünlüğünü etkileyen tamamı revize edildi; sistemd/CI/KVKK saklama dahil operasyon katmanı eklendi. Orta öncelikli bulguların sürüm, dokümantasyon, revizyon kopyalama, doğrulama, kur tarihi, timezone, analitik, token yaşam döngüsü, disk/yedek, upload, optimistic locking, pagination ve route içinde şema değişikliği başlıkları düzeltildi.

## Kritik revizyonlar

1. Audit otomatik temizliği ve panelden hard-delete kaldırıldı.
2. Fiziksel yedek yalnız SUPER_ADMIN’a kapatıldı; online backup + integrity + SHA-256 eklendi.
3. Dinamik izin matrisi gerçek route/API kontrollerine bağlandı.
4. Teklifi hazırlayanın kendi teklifini onaylamasını engelleyen dört göz kuralı eklendi.
5. Kaynak-hedef teklif durum geçişleri doğrulandı.
6. Finansal alanlar UI dışında API/export/print/detail seviyesinde de korundu.
7. Pasif kullanıcı, şifre ve rol değişikliğinde session revizyonu uygulandı.
8. Dashboard saklanan XSS kapatıldı.
9. SMTP TLS doğrulaması açıldı; SMTP/API sırları AES-256-GCM ile şifrelendi.
10. Canlı destek ekleri private storage ve token/yetki kontrollü route’a taşındı.
11. Fatura exportu POST + CSRF + izin oldu; transaction sayaç ve UNIQUE eklendi.
12. Paylaşım tokenları hash’li, süreli, tek aktif ve başarısız e-postada pasif hale getirildi.
13. Para hesapları ölçekli tamsayı/BigInt ile kuruş hassasiyetine taşındı.

## Eklenen bonuslar

- Site bazlı KVKK aydınlatma metni, zorunlu onay ve 30–3650 gün saklama ayarı
- Kapalı sohbetlerde kayıt kimliğini koruyan anonimleştirme aracı
- Kalıcı SQLite rate limiter
- Güvenli ilk giriş parola akışı ve açık oturum iptali
- systemd servis izolasyonu ve otomatik yeniden başlatma
- GitHub Actions CI kalite kapısı
- Migration uyumluluk, para hesabı, izin varsayımları ve EJS compile testleri
- Doğrulanmış backup metadata ve restore inceleme alanı

## Bilinçli olarak korunmuş davranış

Müşteri, ürün, proforma, revizyon ve fatura ana kayıtlarında hard-delete eklenmedi. Audit geçmişi silinmez. Rollback veritabanını otomatik geri almaz. Tenant yöneticisine tüm sistem DB yedeği verilmez.

## Sonraki geliştirme yol haritası

MFA/passkey, UBL-TR e-Fatura, dijital teklif onayı/OTP, sunucu taraflı deterministik PDF, şifreli offsite object-lock backup, stok/BOM/seri numarası, görev-takvim, PWA ve erişilebilirlik ayrı ürün geliştirme fazları olarak bırakıldı; bunlar güvenlik hotfix kapsamına riskli biçimde sıkıştırılmadı.

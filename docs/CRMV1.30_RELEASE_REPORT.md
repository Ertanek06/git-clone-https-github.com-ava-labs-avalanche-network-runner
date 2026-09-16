# CRMV1.30 Release Report

- Version: 3.8.43
- Build: crmv1.31
- Release: v3.8.43-crmv1.31-install-contract-hotfix

## Düzeltmeler

1. Proforma logo, ürün görseli ve kaşe/imza görselleri yerel yüklemelerde yazdırma renderına data URI olarak gömülür. Böylece masaüstü ve mobil yazdır/PDF önizlemesinde oturum veya asset isteği zamanlaması nedeniyle oluşan kırık görsel işaretleri giderilir.
2. Görseller yüklenmeden A4 sayfalama ve yazdırma başlatılmaz; 5 saniyelik güvenli timeout ile sonsuz bekleme engellenir.
3. Yüklenemeyen görseller soru işareti/kırık ikon göstermek yerine boş bırakılır.
4. Başarılı e-posta gönderiminden sonra kullanıcı otomatik olarak Gönderilen Proformalar sayfasına yönlendirilir.
5. Gönderim başarı bildirimi Gönderilen Proformalar sayfasında ekranın ortasında gösterilir.

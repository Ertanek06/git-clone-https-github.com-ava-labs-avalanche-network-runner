# crmv1.16 Sürüm Raporu

Sürüm: `3.8.28`  
Release: `v3.8.28-crmv1.16-preview-template-studio`

## Tamamlanan işler

- Ürün, proforma ve müşteri ön izlemeleri masaüstünde sürüklenebilir ve boyutlandırılabilir hale getirildi; ölçüler kullanıcı ve pencere türü bazında saklanır.
- Ürün Ön İzleme kompaktlaştırıldı; düzenle, arşivle, indir/yazdır, fiyat güncelle, fiyatı geri al ve proforma kullanım geçmişi işlemleri eklendi.
- Proforma satır fiyatları normal ağırlıkta tutuldu; toplam alanları ölçülü biçimde okunaklılaştırıldı.
- Ürün fiyat değişiklikleri için `product_price_history` şeması ve yüzde/tutar değişikliği geçmişi eklendi.
- Proforma ve Teklifler listesinde müşteri adına bağlı düzenlenebilir Müşteri Kimlik Kartı eklendi.
- Açıklama alanları otomatik uzayacak şekilde ortaklaştırıldı; yapıştırmada istemsiz boş satırlar temizlenir.
- Proforma Tasarım Stüdyosu canlı yapısal ön izleme, farklı başlık/müşteri/ürün/koşul/banka/imza modelleri ve şablon arşivleme işlemi kazandı.
- Widget başlık/işlem ızgarası ve `Düzeni Sıfırla`/kapat düğmesi çakışması düzeltildi.

## Doğrulama

- Temiz veritabanında migration 1–45
- EJS derleme ve JavaScript/Bash sözdizimi
- `CRMV1_16_PREVIEW_TEMPLATE_STUDIO=58/58 OK`
- Production `/health`, `/login`, CSP nonce, hashli/gzip varlık kontrolleri
- Dağıtım paketinde `.env`, SQLite çalışma veritabanı, `node_modules` ve canlı veri bulunmaması

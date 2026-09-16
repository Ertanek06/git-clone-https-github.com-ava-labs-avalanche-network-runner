# crmv1.32 — Ürün PDF Kaydı ve Ön İzleme Performansı

- Version: 3.8.44
- Build: crmv1.32
- Release: v3.8.44-crmv1.32-product-upload-preview-performance

## Düzeltmeler
- Ürün düzenlemede broşür / CE / kullanım kılavuzu PDF yüklemeleri 120 MB sınırına çıkarıldı ve yaygın PDF MIME türleri desteklenir. Gerçek PDF içeriği `%PDF-` sihirli başlığıyla doğrulanmaya devam eder.
- Ürün düzenleme formu AJAX kayda geçirildi; hata halinde kullanıcı genel sistem hata sayfasına düşmez, gerçek kayıt hatası aynı ekranda gösterilir.
- Başarılı ürün kaydında yüklenen belge URL'leri veritabanından geri okunarak JSON yanıtına eklenir.
- Public proforma görsel yetkilendirmesinde `quote_items.tenant_id` gibi tabloda olmayan kolona yapılan sorgu kaldırıldı ve quotes JOIN'i kullanıldı.
- Canlı proforma ön izlemede görselleri senkron base64'e çevirme kaldırıldı; bu işlem yalnız yazdırma/PDF/public çıktı tarafında yapılır.
- Ürün ve müşteri ön izleme için erken hazır sinyali eklendi; modal gereksiz yere yükleniyor durumunda kalmaz.
- Ürün->proforma kullanım sorgusu ve müşteri->proforma sorgusu için indeksler eklendi.

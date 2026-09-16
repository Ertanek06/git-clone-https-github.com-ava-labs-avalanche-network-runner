# crmv1.31 — Mobil Broşür İndirme Hotfix

- Version: `3.8.43`
- Release: `v3.8.43-crmv1.31-install-contract-hotfix`
- Build: `crmv1.31`

## Düzeltmeler

- Güvenli mobil proforma görünümünde ürün broşürü, CE belgesi ve kullanım kılavuzu için ayrı token kontrollü PDF indirme rotası eklendi.
- PDF dosyası fiziksel olarak bulunmadan indirme yanıtı başlatılmıyor; eksik/eski dosya yolu 500 yerine kontrollü 404 döndürüyor.
- Dosya yolu quote snapshot sahipliği ile doğrulanıyor ve uploads kökü dışına çıkış engelleniyor.
- Eski `uploads/...` ve `public/uploads/...` yolları normalize edilerek destekleniyor.
- Standart ve özel HTML proforma şablonlarında mutlak URL'lerin `publicBaseUrl` ile ikinci kez birleştirilmesi engellendi.
- Mobil indirme cevabı PDF MIME, güvenli Content-Disposition ve Content-Length başlıklarıyla gönderiliyor.
- Görsel proxy rotası da aynı güvenli fiziksel dosya çözümlemesine geçirildi; bozuk dosya yolu generic 500 üretmiyor.

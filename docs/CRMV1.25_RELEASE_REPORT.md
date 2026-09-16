# CRMV1.25 Release Report

- App version: 3.8.37
- Build: crmv1.25
- Release: v3.8.37-crmv1.25-color-pricing-layout

## Proforma renk yönetimi
Proforma Şablonunu Düzenle ekranına bağımsız renk yönetimi eklendi. Sayfa, genel yazı, ikincil yazı, çerçeve, firma, belge/seri, başlık, müşteri, ürün tablosu, bağlantılar, fiyat/toplam, genel toplam, indirim, teslimat/ödeme/garanti, banka, imza/kaşe ve alt bilgi renkleri ayrı ayrı değiştirilebilir. Her renk değişikliği canlı ön izlemede anında uygulanır. Ana renk modu bağımsız palet kapalıyken eski tek merkez davranışını korur.

## Fiyat / toplam yerleşimi
Fiyat/toplam bloğu ürün listesinin hemen altında kalır. Son ürün satırından sonra mevcut A4'e sığmıyorsa fiyat/toplam bloğu ayrı bir sayfada yalnız bırakılmaz; Teslimat/Ödeme/Garanti + Banka + İmza/Kaşe atomik grubuyla aynı A4'e taşınır. Manuel HTML şablonlarında da aynı davranış uygulanır.

## Kontroller
Yeni crmv1.25 renk/fiyat sözleşme testi, crmv1.24 atomik son sayfa testi, crmv1.22 proforma canlı stüdyo testi, crmv1.15 çıktı yerleşim testi ve crmv1.16 şablon stüdyo testleri başarılıdır.

# crmv1.19 Sürüm Raporu

Sürüm: `3.8.31`  
Release: `v3.8.31-crmv1.19-original-templates-resize`  
Build: `crmv1.19`  
Şema: `48`

## Eski proforma şablonlarının geri yüklenmesi

- Kullanıcının sağladığı `crmv1.12(1).zip` paketindeki 32 hazır şablon tanımı birebir kaynak kabul edildi.
- Anahtar, görünen ad, açıklama, layout, ana/vurgu renkleri ve yazı tipi korunarak migration 48 ile yeniden etkinleştirildi.
- Daha yeni 12 hazır şablon korunur; eski ve yeni şablonlar aynı galeride yan yana bulunur.
- Galeride kayıtlar `ESKİ CRMV1.12`, `YENİ` ve `PDF ORİJİNAL` rozetleriyle ayrılır.
- TEK260075 PDF görünümü `arteva-tek260075-original` anahtarıyla ayrı ve seçilebilir bir şablondur. Firma, müşteri, ürün, toplam, koşullar, banka, imza/kaşe ve sabit alt bilgi bloklarını kullanır.
- `corporate-main` eski crmv1.12 tanımına döndürülmüştür; kayıtlı eski teklif tercihleri bozulmaz.

## Ürün Ön İzleme

- Sağ alt tutamaç, dashboard widget kartlarıyla aynı pencere-seviyesi pointer modelini kullanır.
- Fare hareketinde kartın gerçek genişlik ve yüksekliği doğrudan piksel olarak uygulanır; tema/CSS değişkeni aracılığı kaldırılmıştır.
- Ürün ön izleme masaüstünde 300 px yüksekliğe kadar küçültülebilir, büyütülebilir ve son ölçü kullanıcı bazında saklanır.
- Mobilde sürükleme tutamacı gizlenir; doğal tam ekran ve kaydırmalı görünüm korunur.

## Doğrulama

- crmv1.12 kaynak dizisinin SHA-256 tanım özeti: `6c94c522901c4d7e76fbe0c65ec7409e5d8852c3c2328eeb1b441ced308846d3`
- `32 eski + 12 yeni + 1 PDF orijinali = 45` hazır şablon
- 45/45 EJS gerçek baskı motoru render kontrolü
- Geçici SQLite üzerinde migration 1–48 ve silinmiş/bozulmuş eski şablon geri yükleme kontrolü
- Ürün ön izleme için doğrudan `width`/`height`, pencere-seviyesi pointer ve kalıcı ölçü sözleşmesi

Canlı sunucuya veya kullanıcının mobil cihazına bu çalışma ortamından bağlanılmamıştır. Canlı doğrulama, kurulumdan sonra `scripts/health-check.sh` ve hedef cihaz kontrolüyle tamamlanmalıdır.

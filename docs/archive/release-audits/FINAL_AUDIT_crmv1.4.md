# ARTEVA CRM / ERP - crmv1.4 Genel Tarama ve İyileştirme Raporu

Tarih: 07.08.2026  
Uygulama: 3.8.21  
Release: `v3.8.21-crmv1.4-mobile-proforma-pdf`

## Sonuç

crmv1.3 paketi kaynak kod, şablonlar, istemci JavaScript'i, responsive CSS katmanları, proforma baskı motoru, ürün arama rotaları, kurulum/health dosyaları ve bağımlılıklar açısından tarandı. Kullanıcının gönderdiği `SELCUK-UNIVERSITESI-ECZACILIK-FAKULTESIN-TEK260075.pdf` ayrıca metin ve görsel olarak incelendi. PDF'de ürünlerin 1. sayfada bittiği, toplamların tek başına 2. sayfaya düştüğü ve Teslimat/Ödeme/Garanti bloğunun 3. sayfada başladığı doğrulandı.

## Bulunan olumsuzluklar ve uygulanan iyileştirmeler

1. **Toplam bloğunun tek başına A4 sayfasına düşmesi - kritik çıktı sorunu**
   - Kök neden: sayfalayıcı ürünlerden sonra toplamları ekliyor, taşma olunca yeni sayfa açıyor; koşullar bloğu ise bundan bağımsız olarak her zaman ayrı yeni sayfaya zorlanıyordu.
   - Düzeltme: toplam ürünlerin altında aynı sayfaya sığıyorsa yerinde kalır. Yalnız toplamdan oluşan yeni bir sayfa oluşursa bu sayfa kaldırılır ve toplam, Teslimat/Ödeme/Garanti bloğunun üstüne alınır. Birleşik içerik tek A4'e sığmazsa koşul/banka/imza blokları doğal biçimde sonraki sayfaya akar; toplam yine tek başına bırakılmaz.
   - Kapsam: standart proforma baskı motorunu kullanan tüm hazır tasarım şablonları aynı kurala bağlıdır.

2. **Proforma ürün seçicinin mobilde ekrandan taşması - kritik mobil kullanılabilirlik**
   - Kök neden: ürün seçici JavaScript'te minimum 560 px genişliğe zorlanıyordu.
   - Düzeltme: seçici gerçek viewport genişliğine bağlandı; telefonlarda `100vw - 20px` sınırını aşmıyor.

3. **Boş ürün seçiminde güncel ürünler yerine alfabetik katalog gelmesi**
   - Kök neden: `/products/picker-json` boş sorguda `name ASC` ile sıralanıyordu.
   - Düzeltme: boş sorgu `updated_at/created_at DESC` ile en güncel kayıtları önce getiriyor. Aramalarda aynı eşleşme puanına sahip ürünlerde de en güncel kayıt öne çıkıyor.

4. **Arama ikonuyla açılan kayıtlı ürün penceresinde ikinci arama alanı bulunmaması**
   - Düzeltme: pencerenin içine sabit ürün kodu/ürün adı araması eklendi. 120 ms gecikmeli arama, Enter ile anında arama, temizleme düğmesi ve `no-store` istekleri kullanılıyor. Kod/ad içinde geçen kelime eşleşmesi, Türkçe karakter normalizasyonu ve mevcut yazım hatası toleransı korunuyor.

5. **Mobil proforma formunun masaüstü 1120-1180 px tablo yapısını taşıması**
   - Kök neden: eski responsive katmanlarda proforma tablosu dar ekranda da geniş masaüstü tablo olarak tutulmuştu.
   - Düzeltme: <=1000 px altında her proforma satırı bağımsız düzenlenebilir ürün kartına dönüşüyor. Görsel, ürün kodu, ürün/açıklama, miktar, birim, fiyat, indirim, KDV, toplam ve işlemler etiketli alanlar olarak dikey akıyor. Ürün arama butonu ve satır işlem düğmeleri en az 44 px dokunma alanına sahip.

6. **Mobil CSS katmanlarının parçalı ve birbiriyle çakışmaya açık olması**
   - Kök neden: `app.css`, iki ayrı mobil liste dosyası, hotfix ve crmv1.3 katmanı farklı tarihlerde eklenen `!important` kuralları taşıyordu.
   - Düzeltme: mevcut masaüstü düzenini bozmadan en son yüklenen `crmv1.4.css` tek mobil sözleşme olarak eklendi. Ana sayfa dahil standart sayfa gövdesi, sidebar menü ağacı, topbar, kartlar, form gridleri, input/select/textarea, modal/popup, tablo taşıyıcıları, proforma oluşturma ve ürün seçici aynı viewport kurallarına bağlandı.

7. **Kurulum metninde paket klasörünü doğrudan silen `rm -rf` satırı**
   - Risk: yanlış klasör/sürüm kullanımında gereksiz geri dönüş riski yaratıyordu.
   - Düzeltme: yeni `crmv1.4` paketi için bu satır kaldırıldı; uygulamanın mevcut release/rollback düzeni kullanılmaya devam ediyor.

8. **Bağımlılık güvenlik taramasında 2 açık**
   - İlk tarama: 1 yüksek (`brace-expansion`) + 1 orta (`postcss`).
   - Düzeltme: `brace-expansion` 2.1.4'e kilitlendi; lock dosyası güncellenerek `postcss` 8.5.26'ya yükseltildi.
   - Sonuç: `npm audit --omit=dev` -> 0 güvenlik açığı.

9. **Paket/release kimliği önceki revizyonla aynı kalmıştı**
   - Düzeltme: uygulama 3.8.21, paket/build `crmv1.4`, release `v3.8.21-crmv1.4-mobile-proforma-pdf` olarak artırıldı. Health ve kurulum doğrulamaları aynı kimliklere bağlandı.

## Korunan davranışlar

- Masaüstü proforma oluşturma ve mevcut masaüstü liste düzenleri değiştirilmedi.
- Toplam ürünlerin hemen altında aynı A4'e sığıyorsa ekstra sayfaya taşınmaz.
- Mevcut ürün seçme, muadil, ürün görseli, fiyat, KDV, indirim ve doküman bağlantıları korunur.
- Müşteri/ürün/proforma kayıt modeli, tenant sınırları ve soft-delete yapısı değiştirilmedi.
- Canlı domain/port ve ortak veri dizini yaklaşımı değiştirilmedi.

## Doğrulama

- JavaScript syntax: `quote-form.js`, `print-paginator.js`, `products.js` başarılı.
- `bash scripts/static-check.sh` statik/regresyon zinciri başarılı.
- EJS bağımlılıkları kurularak şablon regresyon testleri yeniden çalıştırıldı.
- crmv1.4 için ayrı sözleşme testi eklendi ve `20/20` geçti: ürün sırası, picker viewport/search, PDF orphan-total kuralı, mobil ürün kartı, yeni release ve güvenli kurulum sözleşmesi kontrol edilir.
- Üretim bağımlılık güvenlik taraması: 0 açık.
- Dağıtım ZIP'i `node_modules`, `.env`, canlı SQLite ve kullanıcı verisi içermeden hazırlanır.

## Not

Bu ortamda `better-sqlite3` native kurulum betiği çalışma alanı dışındaki `/root/.npm`/node-gyp cache dizinine yazmaya çalıştığı için tam veritabanı entegrasyon test zinciri burada native modülle başlatılamadı. Bu durum kaynak paketindeki bir uygulama hatası değildir; dağıtım öncesi statik/EJS/sözleşme testleri ve bağımlılık taraması ayrıca çalıştırılmıştır.

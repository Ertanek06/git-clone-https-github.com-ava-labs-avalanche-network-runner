# CRMV1.44 Web Ürün Aktarım Düzeltme Raporu

## Sürüm

- Uygulama: `3.8.56`
- Paket: `crmv1.44`
- Release: `v3.8.56-crmv1.44-web-import-ui-description-fix`

## Tamamlanan düzeltmeler

- Web aktarım istemci dosyası doğru `/public/js/web-import-v44.js` yoluna alındı.
- Manuel satır seçimi ve toplu seçim işlemleri gerçek sunucu sonucu ile üç sayaçta eşitlendi.
- Ürün Kontrol Tablosu sistem görünümüne uygun durum sekmeleri, toplu işlem kartları ve aşağı açılan ürün listesiyle yenilendi.
- 50, 100, 250 ve filtredeki tüm ürünleri gösterme seçenekleri eklendi; filtre/sayfalama bağlantıları seçimi korur.
- Alt aktarım işlemleri kompakt ve sabit bir kayıt paneline dönüştürüldü.
- Görsel yüklüyken `Görsel yok` veya `Görsel bulunamadı` alanının CSS tarafından tekrar açılması engellendi.
- Ürün açıklaması temizliği kategori menüsü, site adı, iletişim bilgisi, kampanya, hesap/sepet, teklif ve form alanlarını ayıklayacak şekilde güçlendirildi.
- Aynı kod veya normalize edilmiş ürün URL'siyle eşleşen seçili satırlar mevcut CRM kaydını güncellemeye devam eder; kaynakta marka yoksa mevcut marka korunur, yeni üründe alan boş kalır.
- Kurulum komutundaki ikinci ön yedek kaldırıldı; `update-live.sh` içindeki güvenli kurulum yedeği korunur.

## Doğrulama

- Veritabanı migration: `1-52` başarılı.
- EJS derleme: `60/60` başarılı.
- CRM tam regresyon paketi: tüm sözleşmeler başarılı.
- Yeni v1.44 UI/açıklama temizliği testi: `28/28` başarılı.
- HTTP/CSP duman testi: başarılı.
- Üretim varlıkları yeniden derlendi ve gzip karşılıkları oluşturuldu.

# ARTEVA CRM / ERP — crmv1.7 Düzeltme Özeti

Sürüm: `3.8.24`  
Build: `crmv1.7`  
Şema: `44`

Bu paket crmv1.6 incelemesinde tespit edilen tema, sidebar, proforma takibi, güvenlik, tarih/KPI ve statik varlık sorunlarını geriye uyumluluğu koruyarak düzeltir.

## Uygulanan düzeltmeler

- 35 hazır temanın tamamı tam yapısal blueprint alır; sidebar, ikon, yoğunluk, font, radius ve tablo yoğunluğu artık her temada tanımlıdır.
- Hazır temalarda muted/page kontrastı WCAG AA `4.5:1` altına düşmez; Tema Stüdyosu oranı canlı gösterir.
- Marka adı taşıyan tema görünen adları ARTEVA'ya özgü tarafsız adlarla değiştirildi; kalıcı tema anahtarları geriye uyumluluk için korunur.
- Eksik `light-corporate`, `dark-executive`, `classic-office`, `soft-blue`, `slim-rail` tasarımları kataloğa eklendi; 28 sidebar görünümü erişilebilir durumdadır.
- Daraltılmış sidebar artık otomatik genişlemez; gruplar flyout ile açılır. Menü araması, favoriler, bölüm başlıkları ve akordeon davranışı eklendi.
- Mobil menü düğmesi erişilebilir adı düzeltildi; aktif alt menülere çalışma zamanında `aria-current="page"` eklenir.
- Proforma görüntülenme sayacı ham GET, link tarayıcısı ve `print=1` isteğinde artmaz. Görünür müşteri sayfası 1.5 saniye sonra tekil `page_view_id` ile idempotent `HUMAN_VIEW` olayı gönderir.
- Proforma görüntülenme sorguları yalnız insan görüntülenmelerini kullanır; uzun geçmiş yanıtları sınırlanırken gerçek toplam ve truncation bilgisi korunur.
- İstanbul saat dilimi için ortak tarih yardımcıları eklendi. Onay/sipariş/teslim/red geçişleri ayrı zaman damgalarıyla tutulur; aylık KPI `updated_at` yerine gerçek süreç zamanı kullanır.
- Kazanma oranı sonuçlanmış teklifler (`won / (won + lost)`) üzerinden hesaplanır.
- Süreç ve Gönderilenler ekranlarındaki sessiz 250 kayıt kesmesi kaldırıldı; gerçek toplamlı sunucu sayfalaması ve açık `Tümünü Göster` modu eklendi.
- Uzun proforma para değerlerinde 5px + yatay sıkıştırma fallback'i yerine en az 7px metin ve gerektiğinde para birimini alt satıra alan güvenli görünüm eklendi.
- CSP'de `script-src` ve `style-src` içindeki genel `unsafe-inline` kaldırıldı; her HTML yanıtı rastgele nonce alır ve script attribute çalıştırma `script-src-attr 'none'` ile kapatılır. Mevcut dinamik görsel değişkenleri için yalnız `style-src-attr` uyumluluk izni korunur.
- EJS inline `onclick` / `onsubmit` olayları kaldırılıp ortak JS olay delegasyonuna taşındı; `document.write()` kaldırıldı.
- Tema/sidebar özel CSS'i `@import`, script/style etiketi, executable CSS kalıpları, `url(...)`, dış protokoller ve CSS escape kaçışlarına karşı temizlenir.
- Login hız limiti IP başına 15 dakikada 10 denemeye sıkılaştırıldı.
- Kullanılmayan vendor `src/vendor/pdf-parse` / PDF.js kopyası paketten çıkarıldı; npm bağımlılığı olarak kullanılan güncel uygulama yolu korunur.
- Ana ortak CSS/JS, içerik hash'li üç asset paketine birleştirilir. Paketler build aşamasında gzip ön-sıkıştırılır ve bir yıl immutable cache ile servis edilir.

## Doğrulama

- Temiz veritabanı migration zinciri `1 → 44`: başarılı.
- Python SQLite migration/integrity/foreign-key testi: başarılı.
- EJS compile/render sözleşmeleri: başarılı.
- Güvenlik, tema/sidebar, responsive liste, proforma/PDF ve import testleri: başarılı.
- `CRMV1_7_CONTRACTS`: başarılı; 35 tema, 28 sidebar ve tüm tema kontrastları programatik kontrol edildi.
- Oturumlu HTTP smoke testi: dashboard ve tüm ana modül rotaları HTTP 200.
- CSP nonce/header smoke testi: başarılı.
- Hash'li asset gzip + immutable cache smoke testi: başarılı.
- `npm audit --omit=dev`: 0 bilinen güvenlik açığı (paket hazırlanırken çalıştırılan audit sonucu).

Kurulum komutları paket kökündeki `KURULUM_KOMUTU.txt` dosyasındadır.

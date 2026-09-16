# ARTEVA CRM / ERP — crmv1.8 Değişiklik Özeti

Sürüm: `3.8.25`  
Build: `crmv1.8`  
Release: `v3.8.25-crmv1.8-dashboard-theme-studio`

## Sidebar

- Sidebar üzerindeki menü arama alanı kaldırıldı.
- Favoriler alanı, sabitleme düğmesi ve buna ait tarayıcı saklama davranışı kaldırıldı.
- Akordeon grupları, daraltma düğmesi, ikon rayı ve flyout alt menü davranışı korundu.

## Ana Sayfa Widget Sistemi

- `Son Proformalar`, `Son Müşteriler` ve `Akıllı İş Akışı` dahil ana sayfadaki kartlar eklenip kaldırılabilir hale getirildi.
- Aynı katalogda `Canlı Proforma Takibi`, `Son İşlemler`, `Bildirimler` ve yetki varsa `Canlı Destek` de bulunur.
- Her kart mevcut serbest yerleşim altyapısıyla taşınabilir, yeniden boyutlandırılabilir, daraltılabilir, kilitlenebilir ve tek kart olarak sıfırlanabilir.
- Kart üzerindeki `×` ile kaldırılan widget, `Widget Ekle / Düzenle` penceresinden yeniden eklenebilir.
- `Düzeni Sıfırla` tüm kullanılabilir widget'ları varsayılan konum ve boyutlarına getirir.
- Görünürlük, konum, boyut, kilit ve daraltma durumu kullanıcı bazında `/dashboard/layout` üzerinden kalıcı saklanır.

## Tema Stüdyosu

- Tema seçimi tek bir `Tema Sistemini Seç` alanında toplandı.
- Kullanıcıya birbirinden yapısal olarak farklı ana temalar sunulur; marka-esinli görünen adlar Cam Zarif, Kızıl Çizgi, Mavi Akış, Canlı Modern ve Endüstriyel Mavi olarak tarafsızlaştırıldı.
- Bu temalar yalnız paleti değil; sidebar modeli, sidebar genişliği, menü davranışı, yoğunluk, ikon yaklaşımı, kart çizgisi/köşesi/gölgesi, boşluklar, butonlar, input'lar ve tablo yoğunluğunu birlikte değiştirir.
- Eski tema anahtarları kayıt uyumluluğu için servis katmanında korunur; kullanıcı arayüzündeki ana seçim 10 tasarım sistemine sadeleştirilmiştir.
- Ayrı sidebar galerisinin tekrar eden görünür seçim alanı kaldırıldı. İkon/emoji paketi seçimi korunmuştur.

## Noktasal Canlı Tema Düzenleme

- Canlı ön izlemedeki sidebar, logo kartı, menü, üst bar, sayfa, başlık, sayaç, kart, buton ve tablo bileşenleri tıklanabilir hale getirildi.
- Seçilen bileşenin zemin ve/veya yazı/ikon rengi doğrudan küçük renk editöründen değiştirilebilir.
- Başlık, sidebar, tablo ve butonlar için yazı ailesi ayrı ayrı seçilip kaydedilebilir.
- Ön izleme menüsü `accordion`, `hover` ve `static` modlarını etkileşimli olarak gösterir.
- Değişiklikler ön izlemede anında görünür; `Temayı Kaydet` ile mevcut kullanıcı tema kaydına yazılır ve `/settings/theme.css` üzerinden tüm panele uygulanır.

## Doğrulama

- Yeni `scripts/test-crmv1-8-contracts.js` test paketi eklendi.
- Tüm tarihsel test paketi yeni ürün davranışına göre tekrar çalıştırıldı ve geçti.
- EJS derleme testleri 54/54 geçti.
- Veritabanı migrasyon zinciri 1→44, bütünlük ve foreign-key kontrolleri geçti.
- İçerik-hash'li CSS/JS asset paketleri crmv1.8 stilleriyle yeniden üretildi.

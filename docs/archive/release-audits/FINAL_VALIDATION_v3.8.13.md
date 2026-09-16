# CRM v3.8.13 Son Doğrulama Raporu

Doğrulama tarihi: 23 Temmuz 2026

## Korunan sistem davranışları

- Müşteri, ürün, proforma, fatura, revizyon ve denetim kayıtlarında kalıcı silme eklenmedi; mevcut arşivleme davranışı korundu.
- Eski proformaların müşteri ve ürün snapshot verileri ile kayıt anındaki sabit kur bilgileri değiştirilmedi.
- Firma/tenant ayrımı korunarak canlı destek tarafındaki ziyaretçi ve görüşme sorguları da tenant koşuluyla sağlamlaştırıldı.
- Müşteri otomatik doldurma, ürün araması için en az 5 karakter koşulu, uzun içeriklerin taşmadan gösterilmesi ve mevcut tema/sidebar/topbar davranışları korundu.
- Hızlı Ürün Ekle ve Proformadan Ürün Aktar akışlarının görünüm ve işlevleri bozulmadan bırakıldı.

## Uygulanan düzeltmeler

- Sayfa genişlikleri, kartlar, form kontrolleri, boşluklar, tablo hücreleri ve mobil taşma davranışı ortak bir tasarım katmanında standartlaştırıldı.
- Tablo “İşlemler” sütunlarındaki ikonlar aynı ölçü, renk, odak, açıklama ve erişilebilirlik kurallarına bağlandı.
- Proforma satır işlemleri yalnızca yukarı, aşağı, kopyala ve kaldır olarak düzenlendi; ürün düzenleme kontrolü görsel altına alındı.
- Arşiv ekranının sütun sayıları, finansal yetkiye göre genişlikleri ve boş durum görünümü düzeltildi.
- Yanlış “Sil” metinleri gerçek davranışa uygun biçimde “Arşivle” olarak değiştirildi.
- Tekrarlanan CSS blokları güvenli biçimde ayıklandı; mevcut özgüllük ve son-kural davranışı korundu.
- Oturum saklama servisi güncel SQLite sürücüsüne taşındı ve kapanışta güvenli bağlantı kapatma eklendi.
- Canlı destek sayfalarında kullanıcı girdisinden gelen bağlantılar yalnızca `http` ve `https` protokolleriyle sınırlandırıldı.
- Kurulum, güncelleme, rollback ve sağlık doğrulama belgeleri v3.8.13 sürümüne göre güncellendi.

## Geçen doğrulamalar

- Temiz `npm ci` kurulumu
- 42 veritabanı migrasyonu ve yabancı anahtar bütünlüğü
- 52/52 EJS şablon derleme testi
- Kimlik doğrulama, CSRF, yetki, para hesabı, e-posta, Excel, PDF, import ve sürüm sözleşme testleri
- 20/20 v3.8.13 arayüz ve davranış tutarlılığı testi
- JavaScript ve Bash söz dizimi, sahte bağlantı ve hassas dosya denetimi
- Gerçek çalışma zamanı: ilk kullanıcı oluşturma, giriş, zorunlu parola değişimi ve ana ekranlar
- `/`, `/customers`, `/products`, `/quotes`, `/quotes/processes`, `/quotes/archives`, `/profiles`, `/users`, `/settings` ve `/live` için HTTP 200
- Sağlık doğrulaması: sürüm `3.8.13`, şema `42`
- Üretim bağımlılık güvenlik taraması: 0 açık

Dağıtım paketine `.env`, veritabanı, oturum dosyası, yedek, kullanıcı yüklemesi veya `node_modules` dahil edilmemiştir.

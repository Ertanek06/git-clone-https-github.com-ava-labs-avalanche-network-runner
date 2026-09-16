# UI Hata / Eksik Tespit Raporu — v3.3.46

## Genel Değerlendirme

Paket statik olarak baştan sona kontrol edildi. Ana problem backend tarafında değil, panelin genel UI standardında ve ölçekleme davranışında görülüyor. Özellikle panel büyüteci kullanıldığında açılan kartlar, ürün ekleme ve düzenleme pencereleri sayfa sınırını zorlayabiliyordu. Ayrıca yazı boyutları tüm sayfalarda aynı standartta değildi; bazı küçük açıklama, tablo, ürün satırı ve kompakt form alanlarında okunabilirlik zayıftı.

## Öncelikli Hatalar

### 1. Panel büyüteci modal/kartları bozuyordu
Eski yapı `document.documentElement.style.zoom` kullandığı için tüm arayüz gerçek tarayıcı zoom gibi büyüyordu. Bu durum açılan pencereleri gereğinden fazla büyütüyor, kullanıcıyı tarayıcı zoomunu küçültmeye zorluyordu.

**Düzeltildi:** Büyüteç artık güvenli CSS değişkenleriyle çalışıyor. Aralık %90–%110. Browser zoom kullanılmıyor.

### 2. Yazılar standart değildi
Bazı sayfalarda başlık, tablo, form label, açıklama, ürün satırı ve dashboard mini tablo yazıları farklı boyutlardaydı. Bu durum paneli amatör ve güvensiz gösteriyordu.

**Düzeltildi:** Ortak tipografi sistemi eklendi. H1, H2, tablo, label, küçük metin, input ve butonlar standartlandı.

### 3. Modal pencereler taşma riski taşıyordu
Hızlı ürün ekleme, müşteri ekleme, proforma satır düzenleme ve şablon ön izleme modalları yüksek içerikte sayfaya sığmayabiliyordu.

**Düzeltildi:** Modallar `calc(100dvh - 28px)` yüksekliğe bağlandı, içeride scroll sağlandı, genişlikler güvenli `min()` değerlerine alındı.

### 4. Tema CSS değişkenlerinde tutarsızlık vardı
CSS içinde `--muted-color`, `--border-color`, `--card-bg` gibi isimler kullanılıyor; tema çıktısında ise `--muted`, `--border`, `--card` olarak geliyordu. Bu durum bazı alanlarda renk/kontrast farkına yol açabiliyordu.

**Düzeltildi:** Geriye dönük uyum için alias değişkenler eklendi.

### 5. Ürün ekleme/düzenleme pencereleri fazla büyüyordu
Görsel ön izleme, uzun açıklama textarea ve çok kolonlu form yapısı pencereyi büyütebiliyordu.

**Düzeltildi:** Ürün görsel ön izleme alanı sınırlandı, textarea yüksekliği kontrol altına alındı, modal form kolonları otomatik ve responsive yapıldı.

### 6. Kurumsal görünüm zayıf alanlar vardı
Kart gölgeleri, tablo başlıkları, metrik kartlar, form boşlukları ve buton ölçüleri sayfalar arasında farklı hissediliyordu.

**Düzeltildi:** Kart, tablo, dashboard, metrik, form ve butonlara ortak kurumsal görünüm standardı eklendi.

## Yapılan Dosya Değişiklikleri

- `public/js/app.js`
  - Panel büyüteci yeniden yazıldı.
  - Browser zoom kaldırıldı.
  - Güvenli %90–%110 ölçekleme eklendi.

- `public/css/app.css`
  - En sona `v3.3.46 PRO UI STANDARD` bloğu eklendi.
  - Tüm sayfalar için ortak tipografi ve modal standartları eklendi.
  - Kart, tablo, buton, form ve dashboard görünümü güçlendirildi.

- `src/routes/settings.js`
  - Genel yazı boyutu güvenli aralık: 13–16px.
  - Sidebar genişliği güvenli aralık: 220–320px.

- `views/settings/theme.ejs`
  - Yazı boyutu alanına min/max ve açıklama eklendi.
  - Sidebar genişliği alanı güvenli aralığa çekildi.

## Kontrol

Statik kontrol sonucu başarılıdır:

```bash
bash scripts/static-check.sh
# STATIK KONTROLLER BASARILI
```

## Tavsiye Edilen Canlı Kontrol Listesi

1. Giriş yapıldıktan sonra tüm ana menü sayfaları açılmalı.
2. Ürün ekleme modalı açılmalı ve büyük/küçük ekranlarda taşma kontrol edilmeli.
3. Proforma satır düzenleme modalı açılmalı.
4. Hızlı müşteri ekleme modalı açılmalı.
5. Panel büyüteci %90, %100, %110 denenmeli.
6. Dashboard kartları ve son proformalar tablosu 100% tarayıcı zoomunda kontrol edilmeli.
7. Tema ayarında yazı boyutu 14 bırakılmalı. Çok gerekirse 13 veya 15 denenmeli.

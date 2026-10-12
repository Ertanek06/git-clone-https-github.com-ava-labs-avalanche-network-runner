# ArtLab Market – SEO ve Ürün İçerik Raporu

Tarama tarihi: 12.10.2026 · Kaynak: www.artlabmarket.com (herkese açık sayfalar)
Kapsam: 1.220 ürün, 53 kategori, 79 varyantlı ürün (367 alt ürün), 11 blog yazısı, 1.341 etiket sayfası.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `ArtLab-SEO-Calismasi.xlsx` | Tüm ürün/kategori/varyant önerileri (6 sayfa) |
| `tema/urun-aciklama.css` | Tek tip ürün açıklama tasarımı (temaya bir kez eklenir) |
| `onizleme-urun-aciklama.html` | Yeni açıklama tasarımının önizlemesi |

## Bulunan sorunlar (önem sırasıyla)

1. **534 üründe (%44) Google ürün şeması (Product JSON-LD) yok.** Fiyatı girilmemiş ("Teklif İste") ürünlerin hepsi ve bazı TL fiyatlı ürünler. Bu ürünler Google'da fiyat/stok bilgisiyle zengin sonuç olarak çıkamaz. Şeması olan 686 üründe de `availability` (stok durumu), `description`, `mpn` yok; fiyat `69565.229999999996` gibi yuvarlanmamış basılıyor. **Tema düzeltmesi gerekir.**
2. **Varyant alt ürünleri (367 ürün) site haritasında yok.** Kendi URL'leri var ama Google'a bildirilmiyor. Stok kodları IdeaSoft'un otomatik ürettiği `AEKFN_15469`, `705870-705869-705868_49298` gibi kodlar.
3. **Ürün açıklamaları tutarsız.** Satır içi stiller, farklı yazı tipleri, düzen için kullanılmış tablolar, başka siteden (beyondlabmarket.com) çekilen 303 üründe görsel; 137 üründe açıklama hiç yok, 335 üründe açıklama başka ürünlerle birebir aynı.
4. **Ürün adları:** 600 üründe düzeltme (BÜYÜK HARF, marka yazımı DLab/DLAB/Dlab/Dlap, kapanmamış parantez, μl/µl, ºC/℃/⁰C, yazım hataları). 436 ürünün adında model kodu yok. 49 üründe adındaki kod ile stok kodu çelişiyor (örn. `MX-T6-PRO` ↔ adda `MX-T6-RO`, `BKQ-Z75I` ↔ `BKQ-Z75`). 267 stok kodu standart dışı (boşluk, Türkçe karakter: `AEİK`).
5. **SEO başlıkları:** 820 ürünün (%67) başlığı 60 karakteri aşıyor (Google keser). Tüm ürünlerin meta açıklaması aynı kalıp ("…ürününü teknik özellikleri, kullanım alanları…").
6. **Kategori sayfaları:** 53 kategorinin 51'inde H1 yok, hiçbirinde açıklama metni yok, 14 kategoride meta açıklama boş. URL yazım hataları: `/kategori/laboratuvar-saf-malzemeler` (sarf), `/kategori/soksilet` (soxhlet).
7. **Ana sayfada H1 yok.**
8. **1.341 etiket sayfası (`/meta-etiket/...`) indekslenebilir durumda.** İnce içerikli bu sayfalar kategori sayfalarıyla aynı kelimelerde yarışıyor (örn. `/meta-etiket/inkubator` ↔ `/kategori/inkubator`). Bu sayfalar `noindex` yapılmalı veya site haritasından çıkarılmalı.
9. **Blog:** 11 yazının hepsinde sayfada 2 adet H1 var, 6 yazının meta açıklaması boş, 6 yazıda yapılandırılmış veri yok, başlıkların bir kısmı BÜYÜK HARF.
10. `robots.txt` içinde `Crawl-delay: 30`. Google bunu dikkate almaz ama Bing ve Yandex taramayı çok yavaşlatır; kaldırılmalı.

## Başlık stratejisi (anahtar kelime)

Google `meta keywords` etiketini kullanmaz. Sıralamayı etkileyen yerler: **SEO başlığı (title), H1 (ürün adı), URL, açıklama metni ve görsel alt metni.** Bu yüzden ürün adları şu kalıba getirildi:

**Marka + Ürün tipi (anahtar kelime) + Ana özellik + Model kodu**
Örnek: `Memmert Fanlı Etüv 53 Litre +20°C … +300°C UF55`

Böylece hem genel aramalar ("etüv", "53 litre etüv") hem de model aramaları ("Memmert UF55") aynı sayfaya gelir. SEO başlığı 60 karakteri aşarsa önce dolgu kelimeleri (Ayarlanabilir, Profesyonel, Dijital…) atılır; model kodu korunur.

## Tek tip açıklama şablonu

Her ürün açıklaması aynı sırayla ve aynı görünümle:

1. Özet paragrafı
2. **Teknik Özellikler** tablosu (ilk satırlar her zaman: Marka, Model / Ürün Kodu)
3. Varsa çok sütunlu model/hacim tabloları (mobilde yatay kaydırmalı)
4. **Öne Çıkan Özellikler**
5. **Kullanım Alanları**
6. **Paket İçeriği** (varsa)
7. ArtLab güvence ve teklif kutusu

Açıklamalarda hiçbir satır içi stil, font veya renk yoktur; görünüm yalnızca `tema/urun-aciklama.css` ile yönetilir. Durum: 331 ürün tam; diğerlerinde eksik bölümler Excel'de listelendi (özet metni yok: 413, teknik tablo eksik: 428).

## Varyantlar → ayrı ürün

367 alt ürün için yeni ad, stok kodu, SEO başlığı, meta, URL, fiyat, stok, aynı görseller ve teknik tabloya eklenmiş varyant satırı hazırlandı. 78 üründe (Brand pipet/dispenser/büret, Levenhuk renkli mikroskoplar, DLAB pipet) ana üründe birden fazla katalog numarası yazılı. Hangi numaranın hangi hacme ait olduğu sayfadan anlaşılmıyor, bu yüzden kod boş bırakıldı; üretici listesinden eşleştirilmeli.

## Uygulama sırası

1. `tema/urun-aciklama.css` → IdeaSoft Tema Düzenleyici'de özel CSS'e ekle.
2. "Ürün Kodu Kontrol" sayfasındaki sarı satırları doğrula.
3. Ürün adı, SEO başlığı, meta ve açıklamaları yükle (IdeaSoft Admin API ile otomatik ya da Excel içe aktarma ile).
4. Varyantları ayrı ürün olarak oluştur; eski ana ürün URL'lerine 301 yönlendirme ekle.
5. Tema: ürün şeması koşulunu düzelt, ana sayfa ve kategoriye H1 ekle, etiket sayfalarını noindex yap.
6. Kategori adlarını, başlıklarını ve URL hatalarını düzelt; kategori açıklama metinlerini ekle.

# crmv1.45 — Güvenilir Web Ürün Güncelleme ve Profesyonel Kontrol Tablosu

- Kontrol tablosu ham HTML görünmeden doğrudan sistem tasarımıyla açılır; ürün listesi akordeon ve gereksiz aç/kapat düğmesi olmadan hemen gösterilir.
- **Bu Sayfayı Seç**, **Filtredeki Tümünü Seç** ve **Seçimi Temizle** işlemleri sunucuyla eşzamanlı çalışır; üç seçili ürün sayacı gerçek değeri gösterir.
- Aynı ürün kodunun büyük/küçük harf farkları tek kayıtta birleştirilir. Ürün varsa güncellenir, yoksa eklenir; benzersiz kod hatası aktarımı durdurmaz.
- Son taramadaki ürün adı, fiyatı, marka/model/kategori, temiz açıklama, görsel ve belgeler mevcut CRM kaydına yazılır.
- Marka; JSON-LD, üretici/marka alanı, sayfa etiketi ve ürün başlığından tutarlı şekilde çıkarılır. Kaynakta gerçekten yoksa yeni üründe boş bırakılır.
- Site adı, WhatsApp/telefon/e-posta, kampanya, hesap/sepet, kategori menüsü, teklif ve form metinleri ürün açıklamasına alınmaz.
- Ürün broşürü, CE belgesi ve kullanım kılavuzu oturum kontrollü PDF ön izleme rotasıyla sayfa içinde açılır.
- Tarama/aktarım geçmişinde eklenen, güncellenen ve atlanan sayıları kalıcı ve renkli sonuç rozetleriyle gösterilir.

# crmv1.45 — crmv1.39 Güncel Dosya Bazlı Hotfix

> Bu sürüm doğrudan kullanıcı tarafından sağlanan **crmv1.39** paketi baz alınarak hazırlanmıştır. crmv1.39 içindeki daha yeni web katalog tarama/geçmiş özellikleri korunmuştur; eski crmv1.35 kodu paket tabanı olarak kullanılmamıştır.

- Profil logo / kaşe-imza yükleme ve kaldırma hataları düzeltildi.
- Görsel MIME/uzantı uyumluluğu güvenli magic-byte doğrulamasıyla genişletildi.
- Web ürün aktarımında 120 cm gibi ürün başlığına ait özel özellik bloğu başlığıyla birlikte birebir korunur.

# crmv1.45 — Canlı Web Katalog Tarama + Geçmişe Dönüş + Gerçek Ürün Akışı

- Tarama yüzdesi keşif aşamasında sahte bir yüzde göstermez; `CANLI` keşif modu kullanılır. Ürün URL sayısı ve analiz edilen ürün sayısı gerçek iş verisinden güncellenir.
- Analiz tamamlanan her ürün tek tek job durumuna yazılır; ürün adı, kodu ve görseli tarama ekranındaki canlı ürün şeridinde/slaytında görünür.
- Kullanıcı tarama ekranından çıkabilir. **Tarama Geçmişi** çalışan işi gerçek durumuyla gösterir ve `Canlı Durumu Aç` ile aynı taramaya dönülür. READY/IMPORTED işler `Sonuçları Aç` ile kontrol tablosuna gider.
- Geçmişte başlangıç, son hareket, aşama, ilerleme, bulunan/analiz edilen ürün, uyarı, sonuç ve hata bilgileri gösterilir; çalışan tarama gerektiğinde durdurulabilir.
- Hatalı/ürün sayfası olan sitemap girdileri otomatik olarak yok sayılır ve sitemap keşfi robots.txt + standart sitemap adreslerinden yapılır.
- Sitemap taraması paralel partilere alındı; ayrıca sitemap beklenmeden ana sayfa hızlı keşfi çalışır ve kategori/site bağlantıları da taranır. Standart olmayan ürün yollarında sınırlı JSON-LD Product doğrulaması uygulanır.
- Kaynak adı ve URL alanlarındaki örnek metinler herhangi bir markaya bağlı değildir (`Tedarikçi Ürün Kataloğu`, `ornek-site.com`).
- CRM'e kaydetme yalnızca tarama bittikten sonra kontrol tablosunda seçilen ürünler için yapılır.

# crmv1.45 — Tam Web Katalog Tarama + Revizyon Durumu Hotfix

- Ana sayfa URL'si verilerek sitenin ürün URL'leri sitemap/robots ve gerektiğinde site içi link keşfiyle toplu bulunur.
- Tarama arka plan worker'ında çalışır; bulunan tüm ürünler analiz tamamlandıktan sonra profesyonel kontrol tablosunda listelenir.
- Tablo: görsel, ürün kodu, ürün adı, açıklama ön izlemesi, fiyat, kategori/marka, yeni/mevcut ve uyarı durumunu gösterir.
- Her satır Detay / Düzenle ile kontrol edilebilir; seçim ve düzenlemeler tarama işi içinde saklanır, CRM'e ancak kullanıcı kaydet dediğinde yazılır.
- Ürün açıklaması çıkarımında "Ürün Bilgisi" sekme menüsü ile gerçek içerik ayrıştırılır; ürün başlığı/varyantına ait teknik blok korunur.
- Proforma DRAFT/PREPARING durumundan REVISION_REQUESTED (Revizyon istendi) durumuna geçiş hatası giderildi.

# crmv1.45 — Değiştirilebilir Web Sitesi Ürün Aktarım Modülü

- **Ürün ve Hizmetler → Web Sitesinden Ürün Aktar** menüsü eklendi. ArtLab Market ile sınırlı değildir; kaynak site adı, temel URL, sitemap ve ürün URL kalıbı tenant bazlı kaydedilebilir.

- Tek ürün URL’si veya sitemap üzerinden 10/20/30 ürünlük partiler halinde analiz yapılır; CRM’e yazmadan önce düzenlenebilir ön izleme açılır.

- Ürün kodu, ürün adı, fiyat, para birimi, marka, model, kategori, açıklama, ürün URL’si ve ana görsel alınır. Kod mevcutsa güncelle/atla/yeni kod seçenekleri vardır.

- **Başlık-varyant koruması:** başlık 120 cm ise teknik açıklamadaki 120 cm bölümü korunur; 90/150/180 gibi başka ürün varyantlarının özel blokları aynı karta karıştırılmaz. 118 x 60 x 90 cm gibi 120 cm ürünün kendi kabin ölçüsü boyut satırı olduğu için korunur. Kaynak teknik değerler değiştirilmez veya tahmin edilmez.

- Harici ürün görselleri kaydetme anında kalıcı shared/uploads/<tenant>/products alanına indirilir. Sürüm/release temizliği görselleri etkilemez.

- Güvenlik: localhost/özel ağ hedefleri engellenir, yönlendirmeler tekrar doğrulanır, HTML/görsel boyutu sınırlandırılır.

# crmv1.45 — Değiştirilebilir Web Sitesi Ürün Aktarım Modülü

- **Ürün ve Hizmetler → Web Sitesinden Ürün Aktar** menüsü eklendi. ArtLab Market ile sınırlı değildir; kaynak site adı, temel URL, sitemap ve ürün URL kalıbı tenant bazlı kaydedilebilir.
- Tek ürün URL'si veya sitemap üzerinden 10/20/30 ürünlük partiler halinde analiz yapılır; CRM'e yazmadan önce düzenlenebilir ön izleme açılır.
- Ürün kodu, ürün adı, fiyat, para birimi, marka, model, kategori, açıklama, ürün URL'si ve ana görsel alınır. Kod mevcutsa kullanıcı seçimine göre güncelle/atla/yeni kod seçenekleri vardır.
- **Başlık-varyant koruması:** başlık `120 cm` ise teknik açıklamadaki 120 cm bölümü korunur; 90/150/180 gibi başka ürün varyantlarının özel blokları aynı karta karıştırılmaz. `118 x 60 x 90 cm` gibi 120 cm ürünün kendi kabin ölçüsü ise boyut satırı olduğu için korunur. Kaynak teknik değerler değiştirilmez veya tahmin edilmez.
- Harici ürün görselleri kaydetme anında kalıcı `shared/uploads/<tenant>/products` alanına indirilir. Sürüm/release temizliği görselleri etkilemez.
- Güvenlik: localhost/özel ağ hedefleri engellenir, yönlendirmeler tekrar doğrulanır, HTML/görsel boyutu sınırlandırılır.

## crmv1.45 kalıcı ürün medyası + katalog baskı eşitliği + fiyat artırım geri dönüşü

- Ürün görselleri ve ürün belgeleri artık release klasörüne bağlı kalmaz; `shared/uploads/<tenant>` altında kalıcı yazılır ve `/public/uploads` doğrudan bu kalıcı alandan servis edilir.
- Ürün ön izlemede kayıtlı görsel URL'si var fakat fiziksel dosya kayıpsa kırık resim yerine "Görsel bulunamadı — yeniden yükle" alanı gösterilir.
- Ürün ön izlemedeki Fiyat Artır / Azalt / Eski fiyata dön paneli yeniden görünürdür.
- Ürün ön izleme yazdır düğmesi "Katalog Çıktısı Yazdır" olarak adlandırılır.
- Katalog baskısında ekran ve yazdırma geometrisi eşitlendi; ürün görseli `contain` ile tam görünür ve ürün üst bölümü sayfa ortasında bölünmez.
- Tam sistem yedeği ürün medyasını doğrudan kalıcı `shared/uploads` alanından toplar.

## crmv1.45 son ziyaret sıralaması + kart içinde yerinde ürün düzenleme + fiyat içermeyen katalog çıktısı

- **Gönderilen Proformalar / Canlı Proforma Takibi** satırlarında gösterilen ziyaret tarihi müşterinin doğrulanmış en son açılışıdır. Liste, en son ziyaret edilen proforma en üstte olacak şekilde sıralanır; açılış geçmişi yeni tarihten eski tarihe doğru gösterilir.
- **Ürün Ön İzleme → Kart Üzerinde Düzenle** artık ayrı bir düzenleme kartı açmaz. Mevcut ürün adı, kod, marka/model, kategori, birim, GTİP, menşei, stok/minimum, tedarikçi, durum, açıklama ve yetkiye göre fiyat alanları bulundukları yerde düzenlenebilir hale gelir.
- Düzenleme modunda **Kaydet / Vazgeç / Sil** kontrolleri başlıkta görünür. Ürün görseli mevcut hızlı görsel butonundan değiştirilmeye devam eder.
- **Belgeler** bölümünde Broşür, CE Belgesi ve Kullanma Kılavuzu yerinde yüklenebilir/kaldırılabilir; kayıtlı belge varsa dosya adı gösterilir.
- Ürün ön izlemesindeki **Yazdır / PDF Kaydet** işlemi yönetim kartını değil, firma logolu ve iletişim bilgili A4 ürün katalog sayfasını açar. Katalog çıktısında **fiyat gösterilmez**.
- Yerinde ürün kaydı, ekranda bulunmayan barkod/satın alma fiyatı/kâr oranı/KDV gibi ana ürün alanlarını yanlışlıkla boşaltmaz.

## crmv1.45 mobil broşür indirme hotfix

- Mobil güvenli proformada **Broşürü İndir**, CE Belgesi ve Kullanma Kılavuzu token kontrollü ayrı PDF indirme rotasından sunulur.
- Bozuk/eski dosya yolu generic Internal Server Error üretmez; kontrollü 404 döner.
- Standart ve özel HTML şablonlarında mutlak belge URL'leri artık CRM adresiyle ikinci kez birleştirilmez.
- Eski `uploads/...` / `public/uploads/...` yolları normalize edilerek desteklenir.

## crmv1.28 e-posta gönderimi, gerçek açılma geçmişi ve mobil proforma görselleri

- E-posta onay penceresinde artık **Kaydet** yerine **E-posta ile Gönder** yazar.
- Başarılı gönderim bildirimi ekranın ortasında görünür; gönderim kaydı otomatik olarak Gönderilen Proformalar / Canlı Proforma Takibi listesine düşer.
- Açılma sayıları yalnız `HUMAN_VIEW` olaylarından hesaplanır ve müşterinin her doğrulanmış açılış tarihi/saatı ayrı ayrı gösterilir.
- Mobil güvenli proforma görünümünde firma logosu ve ürün görselleri token kontrollü asset proxy üzerinden yüklenir; eski `/uploads/` yolları da desteklenir.

## crmv1.28 ürün ön izleme hızlı görsel yükleme

Ürün ön izleme kartındaki ürün fotoğrafının üzerinde doğrudan **Görsel Ekle / Görseli Değiştir** butonu bulunur. Görsel seçildiğinde ürün kaydı anında güncellenir; kart içi düzenleyiciyi açmak gerekmez.

# CRM / ERP Efsana36

## crmv1.28 bağımsız proforma renkleri + tam müşteri adresi

- Gelişmiş renk yönetiminde her kutu yalnızca bağlı olduğu proforma bölümünü değiştirir; ilk bağımsız renk değişikliğinde diğer alanların mevcut canlı renkleri korunur.
- Müşteri seçimi/eski kayıt fallback zinciri fatura, teslimat, `address1` ve `address2` alanlarını güvenli biçimde birleştirir; ikon/noktalama kaynaklı sahte adres değerleri gösterilmez.
- Proforma detay, PDF/ön izleme ve özel HTML şablonları aynı tam adres mantığını kullanır.

# ARTEVA CRM / ERP EFSANA36 v3.8.57 — crmv1.45

## crmv1.25 proforma canlı stüdyo, gönderim tasarım kilidi ve ürün ön izleme
- Proforma şablonunda **Ana renk**, ürün tablosu ile teslimat/ödeme/garanti ve banka başlıkları dahil ana vurgu alanlarını tek merkezden değiştirir.
- Şablon düzenleme ön izlemesi iki A4 sayfayı yan yana gösterir; renk, yazı, görünürlük, yapı ve logo ayarları kaydetmeden canlı görünür.
- Gelişmiş logo genişliği, yüksekliği ve X/Y konumu ayarlanabilir; taslak proformada LOGO konumu açıkça işaretlenir.
- Kaydedilmemiş şablon değişiklikleri tek tuşla kayıtlı eski hale sıfırlanabilir.
- Ürün ön izleme ilk açılışta geniş görünür, kullanıcı boyutu/konumu kaydedilir ve fiyat okunaklı pill biçiminde gösterilir.
- Ana sayfa widget kartlarındaki gereksiz daralt/aç kontrolü kaldırılmıştır.
- Proforma listesinde yenileme sırasında sonradan tablo tercihleri uygulanmadığı için eski görünüm göz kırpması engellenmiştir.
- İlk e-posta/WhatsApp gönderiminde kullanılan şablon anlık görüntüsü teklife ve gönderim kaydına dondurulur; revizyon yeni tasarımı kendi ilk gönderiminde dondurur.


Güncel denetim düzeltmeleri ve doğrulama özeti: `docs/AUDIT_REMEDIATION_REPORT.md`.

## crmv1.25 canlı şablon uzlaştırması ve doğrulanmış ürün ön izleme boyutlandırması

- Ürün Ön İzleme köşe tutamacı, ana sayfa widget kartlarıyla aynı pencere-seviyesi sürükleme motoruna geçirildi. Pointer Events ve klasik fare yedeği birlikte çalışır; imleç iframe veya kart dışına çıksa bile boyutlandırma kesilmez, bırakılan ölçü kullanıcı ve ön izleme türü bazında kaydedilir.
- Tarayıcının yerleşik resize davranışı kapatıldı. Kartta artık birbiriyle çakışan iki boyutlandırma sistemi değil, tek güvenilir motor çalışır.
- Kullanıcının gönderdiği `crmv1.12(1).zip` içindeki 32 eski hazır şablon; anahtar, ad, açıklama, layout, renk ve yazı tipi değerleri birebir korunarak geri yüklenir. Daha yeni 12 şablon silinmez; iki nesil galeride yan yana kalır.
- Geri yükleme yalnız tek seferlik migration'a bağlı değildir. Şablonlar sayfası canlı tenant verisindeki 45 hazır kaydı fiziksel olarak doğrular; release işareti bulunsa bile eksik kayıtları tamamlar. Yönetici için ayrıca görünür `Eski 32 Şablonu Geri Yükle` işlemi vardır.
- Gönderilen TEK260075 PDF görünümü `ARTEVA TEK260075 Klasik (Orijinal)` adıyla ayrı bir şablon olarak eklenir. Kütüphane uzlaştırması kullanıcının kayıtlı varsayılan şablon seçimini değiştirmez.
- Şablon düzenleyicideki temsili/sentetik ön izleme kaldırıldı. Canlı alan artık kaydedilecek proformayla aynı `quotes/print.ejs` baskı/PDF motorundan üretilir.
- Şablon sınıfları ilk HTML gövdesine doğrudan yazılır; sonradan script ile sınıf ekleme ve eski-yeni görünüm sıçraması kaldırıldı.
- Toplam 45 hazır şablonun tamamı gerçek örnek firma, müşteri, normal ürün, muadil ürün ve toplamlarla ayrı ayrı render testinden geçirilir. Eski 32 tanım ayrıca kaynak paket verisinin SHA-256 özeti ve eksik kayıt/release işareti bulunan mevcut tenant senaryosunda SQLite uzlaştırma testiyle doğrulanır.

## crmv1.17 mobil baskı, yeniden boyutlandırma ve Proforma Tasarım Stüdyosu

- iOS/AirPrint'te alt bilginin tek başına ikinci bir A4 oluşturması engellendi; alt bilgi aynı A4'ün güvenli baskı alanında sabit kalır ve yalnız alt bilgi taşıyan sayfalar üretilmez.
- Ürün açıklaması alanı aşağı doğru serbestçe büyütülüp küçültülebilir; Ürün Ön İzleme penceresinin sağ alt köşesi gerçek sürükleme ile boyutlandırılır ve ölçü kullanıcı bazında saklanır.
- Proforma Şablonunu Düzenle ekranına gerçek tam ekran çalışma modu ve yalnız ön izlemeyi büyüten odak modu eklendi. Taslak Örnek Proforma alanı daha büyük bir çalışma yüzeyine taşındı.
- Yapısal Tasarım; belge başlığı, toplamlar, alt bilgi, boşluk, tablo yoğunluğu ve ürün görseli dahil 15 kontrol grubuna çıkarıldı. Mevcut gruplara yeni kurumsal düzen seçenekleri eklendi ve seçimler gerçek çıktıda uygulanır.
- Önceki sürümün otomatik arşivlediği eski hazır proforma şablonları tek seferlik geri yüklenir. Bundan sonra kullanıcının sildiği şablon kendiliğinden geri gelmez.

- Ürün ve proforma ön izlemeleri masaüstünde başlıktan sürüklenebilir, köşeden boyutlandırılabilir; kullanıcıya ve pencere türüne ait son konum/ölçü tarayıcıda saklanır. Mobilde tam ekran ve doğal kaydırmalı düzen korunur.
- Ürün Ön İzleme varsayılan olarak kompakt açılır; düzenleme, arşivleme, indirme/yazdırma, fiyat güncelleme, eski fiyata dönme ve kullanıldığı proformalara ulaşma işlemleri aynı karttan yapılır.
- Proforma ve Teklifler listesinde müşteri adına tıklanınca düzenlenebilir Müşteri Kimlik Kartı açılır.
- Proforma Tasarım Stüdyosu; başlık, müşteri, ürün, koşul, banka ve imza alanları için yalnız renk değil farklı yapısal modelleri canlı ön izlemede uygular. Kullanılmayan şablonlar galeriden arşivlenebilir.
- Sistem genelindeki açıklama alanları yazdıkça uzar. Yapıştırılan açıklamalardaki istemsiz boş satırlar yalnız yapıştırma anında temizlenir; kullanıcının sonradan verdiği satır düzeni korunur.
- Widget düzenleme başlıkları solda, küçük yönetim düğmeleri sağda ayrılmış ızgarada kalır; `Düzeni Sıfırla`, kapatma düğmesinin altında kalmaz.

## A4 yazdırma ve tutar okunabilirliği

- iOS/AirPrint'te fiziksel sayfa yuvarlama taşması kaldırıldı; sayfalar güvenli `294 mm` baskı kutusu kullanır.
- Her sayfada footer için 24 mm ayrılmış alan ve gerçek konum çakışma kontrolü eklendi; toplamlar, koşullar, banka ve imza kartları footer'ın altına giremez.
- Koşullar, banka ve imza blokları artık tek parça zorlanmak yerine kullanılabilir alana göre ayrı ayrı yeni A4'e taşınır.
- Ürün adı/açıklama/fiyat hiyerarşisi yeniden dengelendi; liste satırı fiyatları kalınlaştırılmadan normal ağırlıkta tutulur. Toplam, genel toplam ve ödenecek tutar alanları bölüm başlığı seviyesinde, ölçülü ve okunabilir görünür.
- Mobil ön izlemede uygulanan ekran ölçeği yazdırmadan önce tamamen kaldırılır; gerçek 1:1 A4 çıktısı korunur.
- Proforma/teklif ve müşteri içi ön izlemelerde pencere türü ilk çizimden önce belirlenir; eski iframe belgesi yenisi hazır olana kadar gösterilmez. Böylece büyükten küçüğe sıçrama ve eski-yeni görünüm kırpması oluşmaz.
- Ürün Ön İzleme masaüstünde kompakt yarım ekran ölçüsüne alındı; görsel, bilgiler ve uzun açıklamalar pencere içinde kaydırılarak eksiksiz görülebilir.
- Sayfa ölçeği tek motorda ve ilk boyamadan önce uygulanır; gecikmeli tekrar ölçekleme zamanlayıcıları kaldırıldığı için menü ve sayfa geçişleri sabit ölçüde açılır.
- Dashboard widget başlıkları/özetleri solda, küçük yönetim düğmeleri sağda ayrı ızgara alanlarında tutulur; `Tümünü Gör` ve diğer kart işlemleri düğmelerin altında kalmaz.
- Sidebar'daki gereksiz `Tümünü daralt` düğmesi ve ona ayrılan boşluk kaldırıldı; akordeon ve daraltılmış flyout davranışı devam eder.

## crmv1.14 önizleme ve sayfa performansı

- Sayfa açılışında tüm uygulamayı gizleyen ilk-boyama katmanı ve menü geçişinde ekranı örten bekleme perdesi kaldırıldı.
- Çekirdek JS, proforma, dashboard, şablon, tema, login ve baskı paketlerine ayrıldı; her sayfa yalnız gereken hash'li kodu indirir.
- Proforma sayfalama, uzak ürün görsellerini beklemeden DOM hazır olduğunda başlar; takılan otomatik yeniden yükleme döngüsü kaldırıldı.
- Masaüstü ve mobil proforma önizlemelerinde bütün A4 sayfaları tek doğal kaydırma yüzeyinde görünür; müşteri kartındaki iç önizleme de kendi dikey kaydırmasını kullanır.
- Müşteri listesi ve müşteri kartındaki proforma sorguları indeksli `customer_id` yoluna taşındı; her satır için tekrarlanan JSON taraması kaldırıldı.

## crmv1.13 müşteri içi mobil proforma ön izleme düzeltmesi

- Müşteri Ön İzleme içindeki ikinci Proforma Ön İzleme iframe'i artık A4'ü telefon genişliğine üst-sol köşeden sığdırır; sağ taraf kırpılmaz.
- İç proforma alanının yüksekliği gerçek ölçeklenmiş belge yüksekliğinden hesaplanır; tüm A4 sayfaları müşteri kartının doğal dikey kaydırmasıyla görülebilir.
- iOS/Safari için iç içe iframe'de `zoom` yerine `transform: scale()` kullanılır ve yön değişiminde ölçü yeniden hesaplanır.
- Ön izleme açılışında `about:blank` ara navigasyonu kaldırıldı; kesilen iframe istekleri için tek seferlik otomatik yeniden deneme ve yükleniyor geri bildirimi eklendi.

## crmv1.12 mobil proforma ön izleme düzeltmesi

- Mobil proforma ön izleme artık tam ekran belge alanı kullanır ve A4 sayfaların tamamı dikey kaydırılabilir.
- A4 genişliği telefona otomatik sığdırılır; belge yarım görünmez, yön değişiminde ölçek yeniden hesaplanır.
- iOS/Safari iç içe modal/iframe kaydırma kilidi kaldırıldı; dokunmatik yatay/dikey kaydırma güvence altına alındı.
- Ön izleme işlem çubuğu mobilde tek satır, yatay kaydırılabilir kompakt yapıya alındı; belge yüksekliğini gereksiz tüketmez.
- Yazdırma/PDF sırasında mobil ekran ölçeği kapatılır ve gerçek 1:1 A4 ölçüsü korunur.

## crmv1.11 tema, sidebar, müşteri listesi ve mobil görünüm düzeltmeleri

- **20 tam tema sistemi:** Tek seçim merkezindeki 20 kurumsal sistem; renk yanında sidebar modeli, menü davranışı, yoğunluk, kart, kontrol ve yerleşimi birlikte değiştirir.
- **Gerçek koyu görünüm:** Koyu presetler tablo, dashboard, modal, mobil panel ve Tema Stüdyosu yüzeylerinde beyaz kart bırakmaz; tema CSS'i build anahtarıyla cache-safe yenilenir.
- **Müşteri unvanı görünürlüğü:** Firma sütunundaki eski `%1` genişlik çakışması kaldırıldı; ilk üç kelime görünür, tam unvan tooltip/erişilebilir etiket olarak korunur.
- **Sabit Anasayfa + mobil uyum:** Sidebar Anasayfa girişi menü kaydırılırken sabit kalır; widget başlıkları, katalog kartları ve mobil panel başlıkları dar alanlarda taşmaz.
- **Beyaz geçiş parlaması:** Aynı origin sayfa geçişleri tema rengini koruyan gecikmeli bir flash-guard ile kapatılır; hızlı geçişlerde katman görünmez.

Bu sürümdeki sidebar, dashboard widget ve Tema Stüdyosu değişikliklerinin özeti: [docs/CRMV1.8_CHANGELOG.md](docs/CRMV1.8_CHANGELOG.md)

Ayrıntılı uygulama ve doğrulama özeti: `docs/CRMV1.7_FIX_REPORT.md`.

- **Doğrulanmış proforma görüntülenmesi:** Ham GET/PDF/print isteği sayaç artırmaz; görünür müşteri sayfası tarayıcıdan tekil ve idempotent görüntülenme olayı gönderir.
- **Tam tema blueprint'i:** 35 temanın tamamı sidebar, ikon, yoğunluk, tipografi ve köşe yapısına sahiptir; hazır tema muted metinleri en az WCAG AA 4.5:1 kontrasta normalleştirilir.
- **28 kullanılabilir sidebar:** `light-corporate`, `dark-executive`, `classic-office`, `soft-blue` ve `slim-rail` kataloğa eklendi. Daraltılmış mod, menüyü zorla genişletmeden flyout alt menü ile çalışır.
- **Sidebar bilgi mimarisi:** Kayıtlar / Satış Süreci / Sistem bölümleri korunur. Excel Aktarımı, Kayıtlar içinde normal menü öğesiyle aynı görsel davranışı kullanır. Arama, favori/sabitleme ve gereksiz `Tümünü daralt` alanları kullanıcı terciğiyle kaldırıldı.
- **Sıkı CSP:** `unsafe-inline` tamamen kaldırıldı; yalnız şablonda açıkça işaretlenen script/style blokları istek bazlı nonce alır, style nitelikleri kontrollü CSS değişkenlerine taşındı.
- **İçerik hash'li ve sıkıştırılmış varlıklar:** Ortak CSS/JS katmanları otomatik olarak hash'li üç bundle'a derlenir ve gzip ön-sıkıştırmasıyla servis edilir; eski sürüm-yama dosyaları artık ana yerleşimde ayrı ayrı istek oluşturmaz.
- **Doğru tarih ve KPI:** İstanbul saat dilimi tarih yardımcıları, süreç aşaması zaman damgaları ve kazanma oranında sonuçlanmış teklifler paydası kullanılır.
- **Ölçeklenebilir listeler:** Süreçler ve Gönderilenler ekranlarındaki sessiz 250 kayıt sınırı kaldırıldı; gerçek toplamla sunucu sayfalaması ve açık `Tümünü Göster` seçeneği eklendi.
- **Güvenlik temizliği:** Login IP limiti sıkılaştırıldı, özel tema CSS'i tehlikeli kalıplara karşı süzülür ve kullanılmayan eski vendor PDF.js kopyası paketten çıkarıldı.

## crmV20 öne çıkan değişiklikler

- **Dosyalarla birlikte tam yedek:** Günlük yedek artık yalnız SQLite veritabanını değil, firma yüklemelerini ve özel ekleri de kapsayan AES-256-GCM şifreli paket üretir; isteğe bağlı ikinci hedefe kopyalar.
- **Kararlı müşteri yetkilisi kimliği:** Müşteri kartı düzenlendiğinde mevcut yetkililer yeniden oluşturulmaz; kişi kimliği ve geçmiş bağlantısı korunur.
- **Veri Bütünlüğü Merkezi:** Eksik dosya bağlantıları, bağlantısız firma yüklemeleri ve bozuk üst kayıt ilişkileri Sistem Sağlık Merkezi'nde salt okunur olarak raporlanır.
- **Mobil tablo kartları ve sütun tercihleri:** Müşteri, ürün ve proforma listeleri telefonda kart görünümüne geçer; kullanıcı sütunları gösterip gizleyebilir ve kompakt yoğunluğu kaydedebilir.
- **Tutarlı Inter fontu:** Türkçe karakterleri içeren Inter web fontu paketle birlikte sunulur; farklı cihazlarda aynı tipografi korunur.
- **Allowlist HTML temizliği:** Özel proforma HTML şablonları parser tabanlı izin listesiyle temizlenir.
- **Mobil üst bar canlı bilgileri:** Tarih, saat, EUR ve USD kuru telefonda dil/işlem satırının hemen altında okunabilir canlı şerit olarak gösterilir.
- **Çalışan canlı şablon ön izlemesi:** Proforma şablon galerisi, tazelenen CSRF anahtarı ve güvenli iframe form geri dönüşüyle standart ve özel HTML şablonlarını yeniden canlı gösterir.
- **Akıllı ürün seçimi:** Boş ürün alanına tıklanınca en güncel kayıtlar önce açılır; ürün penceresindeki ikinci arama alanı kod veya ad içinde geçen ifadeyi anında filtreler. Türkçe karakter ve yazım hatası toleransı korunur.
- **Koşullu PDF sayfalama:** Toplam bloğu ürünlerden sonra aynı sayfaya sığıyorsa yerinde kalır; yalnız başına yeni A4'e düşecekse Teslimat, Ödeme ve Garanti Koşulları sayfasının üstüne taşınır.
- **Tek mobil çalışma alanı:** Proforma oluşturma satırları telefonda düzenlenebilir ürün kartlarına dönüşür; menü ağacı, modal, form ve ortak sayfalar son bir mobil katmanda ekran genişliğine sabitlenir.
- **crmv1.5 mobil proforma satırı:** Ürün alanlarının masaüstü sabit piksel ölçüleri telefonda geçersiz kılınır; her alan başlığıyla birlikte tam genişlikte, yatay yazı yönünde ve doğrudan düzenlenebilir görünür.
- **Titreşimsiz ürün seçici:** Arama kutusu her harfte yeniden oluşturulmaz; sonuçlar aynı sabit pencerenin içinde yenilenir, önceki istek iptal edilerek klavye odağı ve yazım korunur.
- **Teklif geneli indirim:** Toplamın altında yüzde veya tutar bazlı isteğe bağlı genel indirim uygulanabilir; KDV indirim sonrası yeniden hesaplanır. Satır indirimi yoksa çıktıdaki İndirim sütunu hiç üretilmez.
- **Tümünü Göster listeleri:** Ürün, müşteri ve proforma listelerinin altında Önceki/Sonraki yerine filtreyi koruyan `Tümünü Göster` işlemi bulunur; seçildiğinde eşleşen kayıtların tamamı açılır.
- **Güncel Akıllı İş Akışı:** Süresi dolmuş proformalar iş akışı kartından otomatik düşer; güncel ve yaklaşanlar son geçerlilik tarihine göre sıralanır ve 12/40 kayıtlık yapay kesme uygulanmaz.
- **Canlı proforma açılma geçmişi:** Müşteri ziyaretleri her sayfa açılışında olay olarak kaydedilir; dashboard açılma sayısı gün/saat kırılımını gösterir ve yeni ziyarette tıklanana kadar bildirim balonu üretir.
- **Net proforma para alanları:** `1.950,00 TRY` gibi değerler hücre içinde bölünmez; ürün adı koyu, açıklaması daha ince/açık görünür ve Muadil etiketi yalnız ürün başlığında gösterilir.
- **Kullanıcı işlem raporu:** Kullanıcı adına tıklanınca hesap bilgileri ve tenant sınırı içindeki son 12 işlem açılır; kullanıcı tablosu dar ekranlarda taşmadan kart görünümüne dönüşür.
- **16 satırlık çok sayfalı PDF doğrulaması:** Bölünmüş ürün kodları ve devam eden açıklamalar sayfalar arasında birleştirilir; ek doğrulama belgesindeki 16 ürün ve 8.985,24 EUR ara toplam eksiksiz okunur.
- **Taşmasız aktarım paneli:** Ürün ön izlemesi yatay taşmaz, panel içinde dikey kayar; ürün adı koyu, açıklama açık renktir ve simetrik işlem düğmeleri altta sabit kalır.
- **Canlı sidebar galerisi:** Sidebar tasarımları aşağı açılan menü yerine sağa-sola kayan görsel kartlarla seçilir ve canlı ön izlemeye anında yansır.
- **Genel toplu seçim düzeltmesi:** `form=` ile dışarıdan bağlı satır kutuları dahil tüm liste ve arşiv ekranlarında “Tümünü Seç” doğru çalışır.
- **Yakınlaştırmaya dayanıklı dashboard:** Düzenlenebilir kartlar kullanılabilir genişliğe göre yeniden ölçeklenir; alan daraldığında taşmadan otomatik yığın/ızgara düzenine geçer.
- **Arşiv ve Kurtarma Merkezi:** Müşteri, ürün, proforma, firma profili ve şablon arşivleri tenant sınırı içinde tek ekrandan incelenir ve kalıcı silme olmadan geri alınır.
- **Korunan yüklemeler:** Yeni dosyalar firma bazlı klasöre yazılır; yüklemeler oturum, tenant veya süreli teklif/giriş izni olmadan yayınlanmaz. Wildcard CORS kaldırılmıştır.
- **Tenant bazlı Login Studio medyası:** Yüklenen animasyonlar firmalar arasında görünmez; kaldırılan özel medya fiziksel silme yerine kurtarma karantinasına taşınır.
- **Güvenli giriş davranışı:** Hatalı denemeler bilinen kullanıcı hesabını kilitlemez; bulunmayan, pasif veya hatalı hesaplar aynı genel yanıtı verir.
- **Doğru sağlık ölçümü:** SMTP gerçek `smtp_settings` kaydından, disk alanı dosya sisteminden ve RAM ayrı olarak ölçülür.
- **Tek iskelet ve tutarlı yoğunluk:** Sayfa başlıkları, paneller, kartlar, tablolar ve mobil menü ortak ölçü/boşluk katmanıyla hizalandı.
- **Çalışan menü ağacı:** Gönderilen proformalar, süreç filtreleri, ziyaretçi geçmişi, Excel merkezi ve sistem yönetimi bağlantıları rota/yetki durumuyla eşleştirildi.
- **Gerçek yetkiye bağlı eylemler:** Müşteri, ürün ve fatura düğmeleri yalnızca ilgili create/edit/archive/export/financial yetkisi varsa gösterilir ve sunucu rotaları aynı yetkiyi zorunlu tutar.
- **Tam modül taraması:** Oturumlu HTTP testi tüm ana ekranları ve proformadan ürün aktarım geçmişini kapsayacak şekilde genişletildi.
- **A’dan Z’ye sağlamlaştırma:** Bağımlılık kurulumu, session saklama, temiz veritabanı test sırası, paket güvenliği ve şema doğrulaması birlikte güçlendirildi.
- **Tek tip liste görünümü:** Müşteri, ürün, proforma, süreç, arşiv ve kullanıcı tablolarındaki ölçüler, boşluklar ve işlem ikonları ortak davranışa bağlandı.
- **İşlem sütunu standardı:** İşlemler 32 px ikon düğmeleri, aynı renk anlamları, tooltip ve klavye odağıyla gösterilir; düğme sayısına göre sütun genişliği sabittir.
- **Teklif satırı davranışı:** İşlem alanı yalnızca yukarı, aşağı, kopyala ve kaldır işlemlerini içerir; ürün düzenleme ve muadil işareti görsel altında kalır.
- **Korunan kayıtlar:** Firma profili ve ana iş kayıtlarında “Sil” yerine gerçek davranışı anlatan arşiv dili kullanılır; mevcut snapshot ve soft-delete yapısı korunur.
- **Sadeleştirme:** Aynı sonucu üreten 118 eski CSS bloğu kaldırıldı; son tasarım kuralları ve bütün mevcut işlevler korundu.
- **Tekil proforma kaydı:** Aynı oluşturma/düzenleme formunun tekrar gönderilmesi yeni teklif numarası üretmez; mevcut proforma güvenli form kimliğiyle güncellenir.
- **Taslak davranışı:** Başarılı kayıttan sonra ilgili taslak temizlenir; kayıt başarısızsa veya form kaydedilmediyse bilgiler korunur.
- **Kompakt teklif detayı:** Müşteri, teklif özeti ve süreç kartları gereksiz dikey boşluk olmadan daha yoğun ve düzenli görünür.
- **Tam ürün ve belge ön izlemesi:** Ürün görseli kırpılmaz; ürün kartı üzerinden düzenleme ve PDF belge canlı ön izlemesi yapılabilir.
- **Net PDF çıktısı:** Ürün açıklamaları ve tüm proforma içeriği opak, koyu ve yüksek okunabilirlikte yazdırılır.
- **Yeni kullanıcı dashboard iskeleti:** Yeni admin/kullanıcılar mevcut kurumsal kart yerleşimiyle başlar; mevcut kullanıcıların kayıtlı düzeni değiştirilmez.
- Tema düzenleme ekranındaki sidebar tasarımları sağa-sola kayan ön izleme kartlarıyla gösterilir.
- **Sidebar Tasarımları** seçiminde model, yoğunluk, menü davranışı ve genişlik canlı ön izlemeye anında uygulanır.
- **Bağımsız Tasarım Kontrolleri** içinde input, select, textarea ve menüler sağa taşmaz.
- Sidebar seçimi üst galeri, bağımsız kontrol alanı, canlı ön izleme ve ana sistem arasında eşitlenir.
- Proformadan ürün aktarımında `— 20%`, `KDV %20`, `45.000 EUR 20%` ve benzeri fiyat/vergi kalıntıları açıklama alanından kesin olarak temizlenir.
- Gerçek teknik açıklamalar korunur; ürün kodu, ad, açıklama, miktar, birim, fiyat, para birimi ve KDV alanları ayrı tutulur.


Bu paket mevcut canlı kurulumun üzerine güvenli release olarak uygulanır. Müşteri, ürün, proforma, revizyon, fatura ve işlem kayıtlarını hard-delete etmez.

## crmV13 ana kapsamı

- **Ön izleme aksiyon kapsamı:** Müşteri kartı ön izlemesinde hatalı PDF/indir rotası gösterilmez. İndir/PDF ve Yazdır işlemleri yalnızca gerçek proforma PDF ön izlemesinde açılır; modal içindeki ikinci işlem çubuğu kaldırılmıştır.
- **Katı PDF ürün ayrıştırma:** PDF okuyucularının sonuçları birleştirilmez. En güçlü tek metin kaynağı ve tek tablo stratejisi seçilir; adres, firma kimliği, garanti, not, ödeme, toplam ve ölçü parçaları ürün satırı oluşturamaz.
- **İlk Kurulum Stüdyosu:** Kapalı akordiyonlar kaldırıldı. Firma, yönetici, vergi/banka, onay kuralları ve canlı kurulum komutları açık ve tek sayfalı bir stüdyo olarak yeniden tasarlandı.
- **Ortak proforma görüntüleme motoru:** Taslak, gönderilen, onaylı, revizyonlu ve arşivlenmiş proformalar aynı güvenli renderer ile ön izlenir. Özel şablon hatasında boş hata sayfası yerine standart kurumsal şablona geri dönülür.
- **Müşteri paylaşım işlemleri:** İç ön izleme, yazdırma ve güvenli müşteri bağlantılarının üstünde mobil uyumlu İndir/PDF, WhatsApp ve E-posta işlemleri bulunur.
- **Ürün Alternatifi ve Muadil Sistemi:** Bir ürüne yerli, ekonomik, premium, teknik eş değer ve stoktaki alternatifler bağlanabilir. Proforma satırında ana ürüne göre muadil seçilir; MUADİL rozeti PDF, yazdırma, e-posta bağlantısı, WhatsApp bağlantısı, mobil ön izleme ve tasarım stüdyosunda görünür.
- **Proforma Tasarım Stüdyosu:** 32 hazır profesyonel şablon; gerçekçi taslak müşteri/ürün/toplam verileriyle canlı ön izleme; masaüstü/mobil görünüm; kopyalama, aktifleştirme ve JSON içe/dışa aktarma.
- **Tema stüdyosu:** Birbirinden farklı 35 hazır tema; kayıtlı tasarımları isimle saklama, aktifleştirme ve JSON içe/dışa aktarma; renk, tipografi, yoğunluk, sidebar, ikon, tablo ve yerleşim kontrolleri.
- **Akıllı İş Akışı Merkezi:** Son İşlemler alanıyla uyumlu görev listesi; tamamlama, erteleme ve not; kullanıcı/firma bazlı kalıcı konum, boyut, görünürlük, daraltma ve kilitleme.
- **Akıllı teklif takibi:** Son geçerlilik tarihinden varsayılan 3 gün önce hatırlatma; süre sona erdiğinde yeni talep oluşturma e-postası; konu ve gövde metinleri Genel Ayarlar'dan düzenlenebilir; tekrar gönderim engellenir.
- **Proformadan Ürün Aktar:** PDF/XLSX/XLS/CSV, OCR fallback, düzenlenebilir ön izleme, alan eşleştirme, görsel yükleme, seçili satır kaydı, aynı kodda güncelle/yeni kod/atla, işlem geçmişi ve şablon hafızası.
- **Veri koruma:** Proforma düzenlemesinde mevcut satırlar silinip yeniden oluşturulmaz. Satır kimlikleri korunur, kaldırılan satırlar soft-delete edilir ve düzenleme öncesi/sonrası `quote_events` geçmişine kaydedilir.
- **Kurulum ve işletim:** Migration şema sürümü 43, günlük şifreli veritabanı + dosya yedekleme cron'u, 08:17 teklif takip cron'u, health/release doğrulaması ve başarısız aktivasyonda rollback.

## Kurulum

```bash
cd /home/arteva

rm -rf /home/arteva/crmv1.45

unzip -o crmv1.45.zip

cd /home/arteva/crmv1.45

BASE=/home/arteva/arteva-crm-erp-efsana36 \
PORT=3120 \
DOMAIN=crm.artevapp.com.tr \
bash scripts/update-live.sh

BASE=/home/arteva/arteva-crm-erp-efsana36 \
PORT=3120 \
EXPECTED_VERSION=3.8.57 \
EXPECTED_RELEASE=v3.8.57-crmv1.45-web-import-upsert-ui-document-fix \
EXPECTED_BUILD=crmv1.45 \
bash scripts/health-check.sh
```


## OCR araçları

Taranmış PDF proformalar için önerilen sunucu paketleri:

```bash
sudo apt-get update
sudo apt-get install -y poppler-utils tesseract-ocr tesseract-ocr-tur tesseract-ocr-eng
```

Araçlar yoksa dahili PDF okuyucu ve mevcut metin/tablo analizleri çalışır. Doğrulanabilir ürün satırı bulunamazsa yanlış veya boş ürün oluşturmadan işlem durdurulur.

## Veri koruma notları

- Ana iş kayıtlarında hard-delete uygulanmaz; arşiv/soft-delete kullanılır.
- Firma iş verisi geri yükleme işlemi transaction içinde çalışır ve kısmi veri bırakmaz.
- Fiziksel günlük yedek veritabanını, genel yüklemeleri ve özel ekleri birlikte korur; tam paket şifrelidir.
- Tüm tenant sorguları firma sınırıyla çalışır.
- `node_modules`, `.env`, canlı SQLite veritabanı ve kullanıcı yüklemeleri dağıtım ZIP'ine dahil değildir.
- Güncelleme mevcut release dizinini silmez; yeni release ayrı dizine kurulur, önce çevrimiçi yedek alınır ve sağlık kontrolü başarısız olursa önceki release geri açılır.

## crmV13 — Akıllı Sabit Ürün Araç Çubuğu
- Proforma oluşturma ekranındaki ürün araç çubuğu masaüstünde üstte, mobilde altta sabit kalır.
- Ürün satırları kart içinde kontrollü kaydırılır; tablo başlığı ve toplam özeti görünür kalır.
- Boş satır eklendiğinde son satır açılır ve ürün adına odaklanır.
- Klavye kısayolları: Ctrl+Enter yeni satır, Ctrl+D satırı kopyala, Shift+Delete satırı kaldır.
- Ürün sayısı ve teklif toplamı araç çubuğunda canlı gösterilir.

## crmv1.0 hedefli düzeltme paketi

Bu dağıtımın ZIP adı `crmv1.0.zip` olarak hazırlanır. Proformadan ürün kaydetme CSRF hatası, tarama iptalinde ana sürecin kapanmasına yol açabilen PID sonlandırma akışı, mobil ana sayfanın tek panel görünümü ve masaüstü dashboard yenileme titremesi düzeltilmiştir. Ayrıntılar: `docs/CRMV1.0_HOTFIX.md`.

## crmv1.4 hedefli arayüz ve PDF düzeltmesi

Bu paket `crmv1.4.zip` adıyla yayımlanır. crmv1.3'teki masaüstü davranışları korunur; mobil çalışma alanı, ürün seçici ve koşullu proforma toplam sayfalaması son katmanda düzeltilmiştir. Tarihsel rapor: `docs/archive/release-audits/FINAL_AUDIT_crmv1.4.md`.

## crmv1.5 mobil proforma ve indirim düzeltmesi

Bu paket `crmv1.5.zip` adıyla yayımlanır. Mobil ürün satırları tam genişlikte düzenlenebilir kartlara dönüştürülmüş, ürün araması odak kaybetmeyen sabit seçiciye çevrilmiş, üst bara tarih/saat/kurlar geri getirilmiş ve teklif geneli indirim desteği eklenmiştir. Satır indirimi bulunmayan proforma çıktılarında İndirim sütunu üretilmez.

## crmv1.6 liste, iş akışı ve proforma ziyaret takibi

Bu paket `crmv1.6.zip` adıyla yayımlanır. Ana ürün/müşteri/proforma listeleri tek işlemle tamamen açılır; Akıllı İş Akışı yalnız güncel/gelecek tarihli kayıtları eksiksiz gösterir; Canlı Proforma Takibi ziyaretleri gün ve saat bazında özetler ve her yeni ziyarette yeniden bildirim üretir.

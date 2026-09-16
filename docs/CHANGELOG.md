## v3.8.57 — 2026-08-15 00:21:46 +0300
- Proforma e-posta gönderimi eklendi: SMTP ayarları, proforma gönderim ekranı, gönderim log'u ve hata kayıtları.
- Görüntülendi takibi eklendi: müşteriye özel güvenli teklif bağlantısı, view_count, ilk görüntülenme zamanı ve ziyaret olayları.
- Teklif → fatura zinciri eklendi: proformadan fatura taslağı üretme, fatura listesi, durum yönetimi ve JSON dışa aktarım.
- Fatura/e-fatura entegrasyon ayar merkezi eklendi: sağlayıcı, API URL, firma kodu ve API anahtarı alanları.
- Tam Excel aktarım merkezi eklendi: müşteri ve ürün şablon indir, dışa aktar, içe aktar akışı tek panelde toplandı.
- Müşteri Excel içe/dışa aktarma eklendi: .xlsx, XML .xls ve CSV destekli toplu müşteri yükleme/güncelleme.
- Deploy sırasında CHANGELOG otomatik güncelleme adımı update-live.sh içine bağlandı.


## v3.8.23 / crmv1.6 — 2026-08-08

- Ürün, müşteri ve proforma ana listelerinde Önceki/Sonraki sayfalaması kaldırıldı; alt bölümde filtre/sıralama durumunu koruyan `Tümünü Göster` işlemi eklendi.
- Akıllı İş Akışı Merkezi süresi dolmuş teklifleri dışarıda bırakacak, yaklaşanları son geçerlilik tarihine göre sıralayacak ve 40/12 kayıt sınırı olmadan tam akışı kaydırılabilir gösterecek şekilde güncellendi.
- Canlı Proforma Takibi `quote_view_events` üzerinden gerçek açılma sayısını gösterir; tıklanınca proforma, gün, tekrar sayısı ve saatler özetlenir.
- Yeni müşteri ziyareti dashboard kartında küçük bildirim olarak görünür; kullanıcı bildirimi açınca aynı olay tekrar gösterilmez, sonraki ziyaret yeni bildirim oluşturur.
- Güvenli müşteri proforma bağlantısının her sayfa açılışı ayrı ziyaret olayı olarak kaydedilir; geçmiş farklı zamanlardaki ziyaretleri eksiksiz gösterebilir.
- Version/build/release kimlikleri `3.8.23`, `crmv1.6`, `v3.8.23-crmv1.6-lists-workflow-proforma-visits` olarak güncellendi.

## v3.8.22 / crmv1.5 — 2026-08-07

- Mobil proforma ürün satırlarında masaüstünden kalan sabit sütun ölçüleri geçersiz kılındı; alanlar başlıklarıyla birlikte tam genişlikte ve düzenlenebilir kart satırlarına dönüştürüldü.
- Mobil üst barda tarih, saat, EUR ve USD bilgileri dil/işlem satırının altında görünür canlı şeride alındı.
- Kayıtlı ürün seçici her tuşta yeniden oluşturulmak yerine sabit kabuk + yenilenen sonuç listesi modeline geçirildi; önceki arama isteği iptal edilerek odak kaybı ve göz kırpma önlendi.
- Proforma toplamının altına yüzde veya tutar bazlı teklif geneli indirim eklendi; indirim kalıcı şemaya bağlandı ve KDV indirim sonrası matrah üzerinden yeniden hesaplanır.
- Satır indirimi bulunmayan proformalarda standart ve özel HTML çıktısında İndirim sütunu/başlığı artık hiç üretilmez; genel indirim varsa toplam özetinde gösterilir.
- Version/build/release kimlikleri `3.8.22`, `crmv1.5`, `v3.8.22-crmv1.5-mobile-proforma-discount-picker` olarak güncellendi.

## v3.8.21 / crmv1.4 — 2026-08-07

- Proforma PDF sayfalaması koşullu hale getirildi: toplam/fiyat bloğu ürünlerin altında sığıyorsa yerinde kalır; tek başına yeni sayfaya düşüyorsa `TESLİMAT, ÖDEME VE GARANTİ KOŞULLARI` ile aynı sayfada birleştirilir.
- Proforma ürün seçimi en güncel kayıtlar önce gelecek şekilde değiştirildi; ürün kodu/adı yazıldıkça içerik eşleşmeleri anlık listelenir.
- Arama ikonuyla açılan kayıtlı ürün penceresine ayrı arama alanı, temizleme ve klavye davranışları eklendi.
- Mobil proforma satırları yatay 1120/1180 px tablo yerine düzenlenebilir dikey kartlara dönüştürüldü; form, menü, modal, tablo ve üst bar için birleşik mobil son katman eklendi.
- Ürün seçici penceresindeki 560 px minimum genişlik kaldırıldı ve telefon ekranına göre sınırlandı.
- Kurulum komutu `crmv1.4.zip` paket adına geçirildi ve eski dizini doğrudan silen komut kaldırıldı.
- `brace-expansion` ve `postcss` bağımlılıkları güvenli sürümlere yükseltildi; `npm audit --omit=dev` sonucu 0 güvenlik açığına indirildi.
- Sürüm/build kimlikleri `3.8.21`, `v3.8.21-crmv1.4-mobile-proforma-pdf` ve `crmv1.4` olarak eşitlendi.

## v3.8.20 — 2026-07-28 00:17:36 +0300
- Proforma e-posta gönderimi eklendi: SMTP ayarları, proforma gönderim ekranı, gönderim log'u ve hata kayıtları.
- Görüntülendi takibi eklendi: müşteriye özel güvenli teklif bağlantısı, view_count, ilk görüntülenme zamanı ve ziyaret olayları.
- Teklif → fatura zinciri eklendi: proformadan fatura taslağı üretme, fatura listesi, durum yönetimi ve JSON dışa aktarım.
- Fatura/e-fatura entegrasyon ayar merkezi eklendi: sağlayıcı, API URL, firma kodu ve API anahtarı alanları.
- Tam Excel aktarım merkezi eklendi: müşteri ve ürün şablon indir, dışa aktar, içe aktar akışı tek panelde toplandı.
- Müşteri Excel içe/dışa aktarma eklendi: .xlsx, XML .xls ve CSV destekli toplu müşteri yükleme/güncelleme.
- Deploy sırasında CHANGELOG otomatik güncelleme adımı update-live.sh içine bağlandı.


# crmv1.3 Cache-Safe Deployment Fix - 28.07.2026

- Uygulama sürümü 3.8.20 ve release kimliği v3.8.20-crmv1.3-preview-mobile-home olarak artırıldı.
- Önceki paketlerde aynı 3.8.19 sürüm/release değerlerinin kullanılmasından kaynaklanan eski CSS/JS önbelleği engellendi.
- crmv1.3.css ve crmv1.3.js yeni fiziksel dosya adlarıyla bağlandı.
- Health yanıtı build=crmv1.3 döndürür; kurulum eski release aktif kalırsa başarısız olur.
- Aktif current dizinindeki ürün ön izleme şablonu kurulum sırasında ayrıca doğrulanır.
- Masaüstü ürün ön izlemesinde satış fiyatı HTML içinde iki ayrı görünür noktada sunulur ve açıklama sınırsız normal akışta gösterilir.

# crmv1.2 Desktop Preview & Mobile Dashboard Hotfix - 27.07.2026

- Masaüstü ürün ön izleme fiyatı başlık alanında görünür.
- Ürün açıklaması tam metin olarak normal belge akışında gösterilir.
- Standart sayfalarda geri düğmesi ve mobil üst barda Ana Sayfa kısayolu güçlendirildi.
- Mobil ana sayfa beş bağımsız, simetrik panelle yeniden kuruldu.

# v3.8.19 Mobile List Hotfix - 25.07.2026

- Yalnızca 760 px ve altındaki ekranlarda müşteri, ürün ve proforma listeleri kart düzenine geçirildi.
- Masaüstünden kalan sabit satır yüksekliği kaldırılarak mobilde üst üste binme, boş beyaz satırlar ve kırpılmış içerik giderildi.
- Arama, sıralama, toplu seçim, Excel ve ürün aktarım araçları telefon genişliğine göre yeniden dizildi.
- Mobil kartlarda gizli sütun tercihleri kaynaklı boş görünüm önlendi; ürün adı, müşteri unvanı ve proforma numarası öne alındı.
- Ürün ekleme/düzenleme ekranındaki Dosyalar ve Açıklama bölümü tek sütuna sabitlendi; dosya alanı ve ürün görseli taşmadan tam genişlikte gösterildi.
- Masaüstü ve tablet stillerine müdahale edilmedi.

# v3.8.19 Product Image Full-View Hotfix - 24.07.2026

- Proforma satırı düzenleme penceresindeki ürün görseli 230 px yüksekliğe büyütüldü.
- Dikey ve yatay ürün fotoğrafları kırpılmadan, tam boy ve merkezde gösterilir.
- Proforma satırı, ürün arama listesi, kayıtlı proforma detayı, ürün aktarımı ve ürün listesi görselleri aynı `object-fit: contain` standardına bağlandı.
- Görsel kutularındaki eski `cover` ve düşük yükseklik kuralları son yüklenen stil dosyasıyla güvenli biçimde ezildi.
- Mobil ekranda tam görsel korunurken ön izleme alanı 210 px olarak ayarlandı.

# v3.8.19 Proforma PDF Hotfix - 24.07.2026

- Ürün görseli büyütüldü; ürün adı/açıklaması resmi evrak tipografisiyle ayrıştırıldı.
- Fiyatlardaki gereksiz `,00` kaldırıldı; gerçek küsuratlar korunur.
- Birim fiyat, indirim ve toplam sütunlarında yatay taşma engellendi ve otomatik sığdırma eklendi.
- Standart ve manuel proforma şablonları aynı yazı/görsel/para standardına alındı.

# v3.8.19 / crmV20 — 24.07.2026

- Proforma oluşturma ekranındaki canlı şablon ön izlemesi taze CSRF anahtarıyla yeniden deneme ve güvenli iframe form geri dönüşüyle düzeltildi; standart ve özel HTML şablonları doğrulandı.
- Kayıtlı ürün aramasındaki 5 karakter sınırı kaldırıldı. Boş alana tıklanınca alfabetik katalog açılır ve yazdıkça liste kısalır.
- Ürün eşleştirmesine Türkçe karakter normalizasyonu, harf değişimi/eksikliği toleransı ve yüksek olasılıktan düşüğe sıralama eklendi.
- Proforma PDF’inde görsel üzerindeki mükerrer Muadil rozeti kaldırıldı; rozet yalnız ürün başlığında tutuldu.
- `1.950,00 TRY` gibi para değerleri bölünmeyen, sabit rakam genişlikli bileşene alındı.
- PDF ürün adı koyu/net, açıklaması daha ince ve açık tonda gösterilecek şekilde ayrıştırıldı.
- Üst çubuktaki tarih, saat, arama ve WhatsApp bölümü değiştirilmeden korundu.
- Tam test paketi, 42 migration, 54 EJS görünümü, statik kontrol, 35 yetkili rota ve sıfır güvenlik açığıyla doğrulandı.

# v3.8.18 / crmV20 — 24.07.2026

- Üst çubuktaki tarih, saat, arama ve WhatsApp bölümü değiştirilmeden korundu.
- Kullanıcı Yönetimi tablosu taşmasız sabit düzene alındı; kullanıcı adına tıklanınca hesap kartı ve son 12 işlem raporu açılır.
- Çok sayfalı proforma PDF ayrıştırıcısı bölünmüş ürün kodlarını ve açıklama devamlarını birleştirir. Doğrulama belgesindeki 16 ürün, 8.985,24 EUR ara toplamla eksiksiz okunur.
- Kırık veya bulunmayan proforma ürün görselleri PDF ve detay görünümünde bozuk görsel ikonu yerine boş hücre olarak gösterilir.
- Sidebar Tasarımları aşağı açılan panel yerine sağa-sola kayan ön izleme galerisine dönüştürüldü; seçim canlı ön izlemeye anında yansır.
- Ürün aktarım ön izlemesi yatay taşma olmadan dikey kayar; dar ekranlarda satırlar kart düzenine geçer ve alt işlem düğmeleri sabit/simetrik kalır.
- Arşivler dahil `form=` ile bağlı kutu kullanan tüm “Tümünü Seç” alanları düzeltildi.
- Dashboard kartları tarayıcı yakınlaştırması ve kullanılabilir alan değişiminde yeniden ölçeklenir; dar alanda taşmadan yığın/ızgara düzene geçer.

# v3.8.17 / crmV20 — 24.07.2026

- Üst çubuktaki tarih, saat, arama ve WhatsApp bölümü değiştirilmeden bırakıldı; kaynak dosyanın önceki paketle SHA-256 özeti aynıdır.
- Müşteri, ürün ve proforma listelerine kullanıcı bazlı sütun görünürlüğü, kompakt satır tercihi ve mobil kart görünümü eklendi.
- Türkçe karakter kapsamlı Inter fontu uygulamayla aynı kaynaktan sunulur; dış font servisine bağımlılık kaldırıldı.
- Müşteri düzenlemesinde mevcut ek yetkililerin kimlikleri korunur; farklı firmaya ait yetkili kimlikleri kabul edilmez.
- Özel proforma HTML içeriği regex yerine parser tabanlı izin listesiyle temizlenir.
- Günlük fiziksel yedek veritabanı, genel yüklemeler ve özel ekleri manifestle paketler; paket AES-256-GCM ile şifrelenir ve isteğe bağlı ikinci hedefe atomik kopyalanır.
- Tam yedek paketini canlı veriye yazmadan açan ve tüm dosya özetleriyle SQLite bütünlüğünü doğrulayan inceleme komutu eklendi.
- Sistem Sağlık Merkezi'ne eksik dosya referansları, bağlantısız firma yüklemeleri ve bozuk üst kayıt bağlantıları için salt okunur Veri Bütünlüğü ayrıntıları eklendi.
- Yedek ekranının kapsamı doğru adlandırıldı; paneldeki firma iş verisi dışa aktarımı ile otomatik fiziksel yedek birbirinden ayrıldı.
- Temiz bağımlılık kurulumu, statik kontrol, 42 migration, tam test paketi, HTTP çalışma testi ve üretim bağımlılığı güvenlik taraması başarıyla tamamlandı.

# v3.8.16 / crmV20 — 24.07.2026

- `public/uploads` genel statik yayın kapsamından çıkarıldı; dosya erişimi oturum, tenant sahipliği veya kapsamı/süresi imzalı giriş-proforma izniyle sınırlandı.
- Yeni yüklemeler tenant bazlı klasörlerde tutulur; görsel ve PDF yanıtlarındaki wildcard CORS kaldırıldı.
- Login Studio yüklenen medya kataloğu tenant bazında ayrıldı. Hazır medya gizleme tercihi yalnız ilgili firmaya uygulanır; özel medya kaldırılırken dosya kurtarma karantinasına taşınır.
- Hatalı parolayla bilinen kullanıcı hesabını kilitlemeye izin veren akış kaldırıldı. Bulunmayan, pasif ve hatalı hesaplar aynı HTTP durumu ve genel mesajla yanıtlanır.
- “Arşiv ve Kurtarma Merkezi” eklendi. Müşteri, ürün, proforma, firma profili ve şablonlar tek ekrandan, tenant filtresi ve audit kaydıyla geri alınabilir.
- Yetim yükleme bakımı alt klasörleri de tarar; müşteri logolarını referans sayar ve kalıcı silme yerine özel karantinaya taşır.
- Sistem Sağlık Merkezi SMTP durumunu doğru tablodan, disk alanını gerçek dosya sisteminden ve RAM’i ayrı kaynaktan ölçer.
- 390 px mobil görünüm için Kurtarma Merkezi kart/tablo dönüşümü ve ortak arayüz ölçüleri eklendi.
- Yeni güvenlik/kurtarma sözleşme testi eklendi; tam test, EJS derleme, statik kontrol, migration, audit ve çalışma zamanı doğrulamalarına bağlandı.

# v3.8.15 / crmV20 — 24.07.2026

- Proformadan ürün aktarım geçmişinin bulunmayan `layouts/main.ejs` iskeleti nedeniyle verdiği HTTP 500 giderildi; görünüm ortak `layout.ejs` iskeletine bağlandı.
- EJS derleme testi, yalnızca şablon sözdizimini değil statik yerleşim referanslarının gerçekten var olduğunu da doğrulayacak şekilde genişletildi.
- Sidebar menü ağacı yetkilerle ve gerçek rotalarla eşleştirildi; gönderilen proforma çift aktifliği, süreç filtrelerinin aktif durumu, ziyaretçi geçmişi ve Excel merkezi navigasyonu düzeltildi.
- Mobil menü, üst bar ayar kısayolu, ayar merkezi kartları ve dil değiştirme akışı kullanıcı yetkileriyle uyumlu hale getirildi.
- Müşteri, ürün ve fatura ekranlarındaki oluşturma, düzenleme, arşivleme, dışa aktarma, fiyat ve entegrasyon eylemleri ayrıntılı izinlerle eşleştirildi.
- Toplu ürün fiyat güncelleme rotasına eksik `financials:edit` sunucu kontrolü eklendi.
- Sayfa başlıkları, kartlar, paneller, tablolar, işlem hücreleri ve mobil aktif menü için temayı koruyan ortak yoğunluk/hizalama katmanı eklendi; gereksiz boşluklar azaltıldı.
- Tema ve canlı destek ön izleme düğmelerinin yanlışlıkla ana formu göndermesi engellendi.
- Oturumlu HTTP smoke testi 35 ana/yönetim ekranını kapsayacak ve yalnızca HTTP 200 sonucunu kabul edecek biçimde güçlendirildi.
- Temiz veritabanında migration 42, tam test paketi, statik kontroller ve oturumlu modül taraması hatasız tamamlandı.

# v3.8.14 / crmV20 — 24.07.2026

- Yetkiye göre gizlenen finans sütunlarının proforma ve süreç tablolarında işlem sütununu kaydırması giderildi; `colgroup`, başlık, gövde ve boş durum `colspan` değerleri aynı sözleşmeye bağlandı.
- Arşiv listesindeki iç içe form yapısı kaldırıldı; toplu seçim ile satır bazlı geri alma/gizleme işlemleri birbirinden ayrıldı.
- Müşteri, ürün, proforma, süreç, arşiv, kullanıcı ve dashboard listelerindeki platforma bağlı emoji/glyph işlem ikonları ortak, erişilebilir SVG bileşeniyle değiştirildi.
- İşlem düğmelerinin ölçüleri ve sütun genişlikleri yetki/işlem sayısına göre sabitlendi; eski yüksek özgüllüklü sayfa kurallarının görünümü bozması engellendi.
- Müşteri detayındaki bağımsız proforma tablosu aynı ikon, boşluk ve erişilebilir etiket standardına alındı.
- Rollback akışı yalnızca HTTP 200 değil, hedef sürüm ve release kimliğini doğrular; başarısız geri dönüşte önceki `APP_VERSION` değeri ve release birlikte geri yüklenir.
- Kurulum talimatı dosya adına birebir bağımlı olmaktan çıkarıldı; aynı dizindeki tek v3.8.14 paketi güvenli biçimde seçilir.
- Yeni UI sözleşme testleri sütun sayıları, boş durum kapsamı, iç içe form yasağı ve ortak işlem ikonunu otomatik doğrular.

# v3.8.13 / crmV20 — 23.07.2026

- Liste sayfalarının tablo, kontrol yüksekliği, taşma ve mobil yerleşim davranışları ortak bir tutarlılık katmanında birleştirildi.
- Müşteri, ürün, proforma, süreç, arşiv, kullanıcı ve dashboard tablolarındaki işlem düğmeleri tek ölçü, renk anlamı, tooltip ve klavye odağıyla standartlaştırıldı.
- Proforma satırı işlem sütunu yukarı, aşağı, kopyala ve kaldır ile sınırlandı; düzenleme ve muadil işareti ürün görseli altına taşındı.
- Arşiv tablosunun finansal yetkiye göre değişen sütun sayısı düzeltildi; firma profili kaldırma metni gerçek soft-archive davranışını anlatacak şekilde değiştirildi.
- Kayıtlı ürün araması, belirlenmiş en az 5 karakter kuralına bağlandı ve Türkçe/İngilizce açıklaması düzeltildi.
- 118 birebir tekrarlanan eski CSS bloğu kaldırıldı; son etkili kurallar korundu.
- SQLite session saklama `better-sqlite3` ile mevcut tablo formatını koruyacak biçimde yenilendi.
- Üretim bağımlılıkları güncellendi; temiz güvenlik taramasında bilinen açık kalmadı.
- `npm test` temiz ve geçici bir veritabanını otomatik migrate ederek çalışır; CI test sırası kalıcı çalışma verisi üretmez.
- Kurulum talimatlarından mevcut klasörü silen komut kaldırıldı; yedek, yeni yükleme dizini, güncelleme ve health sırası açıkça belgelendi.

# v3.8.12 / crmV20 — 23.07.2026

- Aynı proforma formunun tekrar kaydı ikinci teklif numarası oluşturmaz; form kimliği ve benzersiz indeks ile mevcut kayıt güncellenir.
- Başarılı kayıttan sonra yalnızca ilgili yerel taslak temizlenir; başarısız veya tamamlanmamış form korunur.
- Teklif detay kartları kompaktlaştırıldı, ürün ön izlemesine kart içi düzenleme ve tam görsel/belge görünümü eklendi.
- PDF ve yazdırma çıktısında açıklama ve tüm içerik daha koyu, net ve opak işlenir.
- Yeni kullanıcıların dashboard yerleşimi kurumsal varsayılan iskeletle başlar.

# v3.8.11 / crmV19 — 23.07.2026

- Hızlı Ürün Ekle penceresi sayfa katmanından ayrılarak doğrudan body altında açılır.
- Modal yüzeyi tamamen opaklaştırıldı; tema veya üst kapsayıcı şeffaflığı pencereye aktarılmaz.
- Tek kontrollü kaydırma alanı, sabit başlık ve sabit işlem altlığı sağlandı.
- Arka sayfa modal açıkken kaydırılmaz; pencere masaüstü ve mobilde görünür alana sığar.
- Modal açılışında aria durumu ve odak kapsamı güvenli biçimde güncellenir.

# v3.8.11 / crmV18 — 23.07.2026

- Proformadan Ürün Aktar giriş ekranı sıfırdan, simetrik ve tema bağımsız profesyonel çalışma alanına dönüştürüldü.
- İşlem adımları flex tabanlı güvenli yerleşime alınarak metinlerin dikey/sıkışmış görünmesi engellendi.
- Canlı adım durumları ayrı durum etiketleriyle eşitlendi.
- Tema formu tarayıcı doğrulama tuzaklarından ve genel işlem onayından ayrıldı.
- Tema kaydı JSON yanıtlı doğrudan kayıt akışıyla güvenilir hale getirildi; başarılı kayıttan sonra canlı sistem yenilenir.
- Bağımsız tasarım kontrollerinde yatay taşma engellendi.

# v3.8.9 / crmV17 — 23.07.2026

- Tema stüdyosundaki yatay kayan tema/sidebar şeritleri kaldırıldı.
- Sidebar modelleri aşağı doğru açılan, taşmasız ve senkronize seçim alanında toplandı.
- Bağımsız tasarım kontrollerindeki input/select/textarea taşmaları giderildi.
- Proformadan ürün aktarımında yüzde/KDV/fiyat kalıntılarının açıklamaya yazılması engellendi.
- `— 20%`, `MS- — 20%`, `KDV %20` ve fiyat+KDV satırları otomatik temizlenir; gerçek teknik açıklamalar korunur.

# v3.8.0

- Müşteri ön izlemesindeki hatalı İndir/PDF ve Yazdır düğmeleri kaldırıldı; `/customers/:id/print` 404 rotası artık üretilmez.
- İndir/PDF, Yazdır, WhatsApp ve E-posta işlemleri yalnızca gerçek proforma PDF ön izlemesinde gösterilir.
- Proforma modal iframe içindeki ikinci işlem çubuğu kaldırıldı; tek ve net üst işlem çubuğu kullanılır.
- PDF ürün aktarımında farklı okuyucu sonuçlarının birleştirilmesi kaldırıldı; en güçlü tek kaynak ve tek tablo stratejisi seçilir.
- Adres, firma kimliği, garanti, teslimat, ödeme, banka, not, toplam ve ölçü parçalarının ürün satırı oluşturması engellendi.
- İlk Kurulum Sihirbazı kapalı akordiyonlardan çıkarılarak bütün bölümleri açık, canlı komut ön izlemeli kurulum stüdyosuna dönüştürüldü.
- Sürüm `3.8.0`, release `v3.8.0-ocr-table-theme-center-navigation-dialog-final`.

# v3.7.2

- Sayfa yenilemelerindeki boş beyaz ekran yerine markalı ve kısa yükleme geçişi eklendi.
- Ana sayfa kartlarına serbest taşıma, boyutlandırma, kilitleme, daraltma ve kalıcı konum kaydı geri getirildi.
- Proformadan ürün aktarımında farklı ayrıştırıcı sonuçlarının birleştirilmesi kaldırıldı; en güçlü tek tablo stratejisi kullanılıyor.
- Garanti, teslimat, ödeme, toplam, not, banka, vergi ve benzeri ürün dışı satırlar kesin filtreleniyor.
- E-fatura ürün tablosu ve gerçek 7 ürünlük örnek doğrulaması korunuyor.
- Sürüm `3.7.2`, release `v3.7.2-fouc-dashboard-freeboard-strict-import-final`.

# v3.7.1

- Akıllı İş Akışı Merkezi kartındaki tamamlama, erteleme, not, açma ve widget kontrolleri taşmasız hale getirildi; sıralama, kilit ve daraltma kullanıcı/firma bazında kalıcıdır.
- Eski dashboard serbest-pano motoru devre dışı bırakılarak çift kontrol, pasif düğme ve sayfa yenilemede konum sıçraması giderildi.
- Tema Stüdyosunda ikon paketleri, tema üzerine gelme ön izlemesi ve menü geçiş animasyonları canlı örneğe bağlandı.
- Proforma ön izlemelerinde İndir/PDF, WhatsApp ve e-posta hedefleri gerçek proforma kaydı ve güvenli bağlantı üzerinden çalışacak şekilde düzeltildi.
- Muadil Ürün Ekle akışı ürün arama/seçme penceresine dönüştürüldü; seçilen ürün ana satırın altına eklenir ve hangi ürünün muadili olduğu satır rozetiyle gösterilir.
- Proformadan Ürün Aktar ön izlemesi ürün görseli, kodu, adı, açıklaması, miktarı, birimi, fiyatı, para birimi ve KDV alanlarını ayrı tutar; JPG/PNG/WEBP yükleme ön izlemesi ve kaydı tamamlandı.
- Birim fiyat ve KDV metinlerinin açıklama alanına kayması engellendi; `45.000,00 20%`, `20%` ve benzeri değerler teknik açıklama olarak kaydedilmez.
- E-fatura ürün tablosu regresyon testi gerçek 7 ürün ve doğru EUR birim fiyatlarıyla doğrulandı.
- İlk Kurulum Sihirbazı bölümleri çalışan akordiyon yapısına geçirildi ve tema yüklenmeden önce görülen eski tasarım parlaması giderildi.
- Sürüm `3.7.1`, release `v3.7.1-dashboard-theme-preview-muadil-import-setup-final`.

# v3.6.1

- Proformadan ürün aktarımında ürün kodu, ürün adı, açıklama ve birim fiyat sütunları katı başlık önceliğiyle ayrıştırılır; toplam/tutar alanı birim fiyat olarak kullanılmaz.
- Açıklama artık ürün adı yerine geçirilmez; belirsiz satırlar kaydedilmeden önce kullanıcı kontrolüne bırakılır.
- Ön izleme satırlarına URL yanında JPG/PNG/WEBP görsel dosyası seçme alanı eklendi.
- Ürün görseli yüklenirse ürün kartına kaydedilir; görsel seçilmezse mevcut görsel korunur.
- Silme, arşivleme, kaydetme, içe aktarma ve durum değiştirme dâhil POST işlemleri için merkezi onay penceresi uygulanır.
- Tema stüdyosundaki mevcut bağımsız kontroller ve canlı ön izleme davranışı korunmuştur.
- Sürüm `3.6.1`, release `v3.6.1-product-field-mapping-image-confirm-theme-live`.

# v3.6.0

- PDF proforma taraması; layout metni, dahili JavaScript okuyucusu, sabit sütun analizi, devam satırı birleştirme ve OCR ile güçlendirildi.
- Uygulama yükleme limiti 100 MB, Nginx limiti 128 MB olarak kurulum zincirine bağlandı.
- Tema ve Sidebar Tasarımcısı 140'tan fazla bağımsız bileşen ayarı ve canlı ön izleme ile genişletildi.
- Migration 35 ile kullanıcı bazlı ayrıntılı tema ayarları kalıcı hale getirildi.
- Sürüm `3.6.0`, release `v3.6.0-pdf-import-100mb-full-theme-components`.

# v3.5.9

- Proformadan Ürün Aktar ekranındaki XLSX/XLS yükleme hatası giderildi; tarayıcıların `application/octet-stream`, ZIP ve OLE MIME bildirimleri gerçek dosya imzasıyla doğrulanarak kabul edilir.
- XLSX modülü CommonJS/ESM ortamlarında güvenli biçimde yüklenir; çalışma kitabı doğrudan buffer üzerinden açılır, tüm sayfalar ve ilk 50 satır başlık adayı olarak taranır.
- Türkçe/İngilizce sütun eşleştirmeleri genişletildi; standart dışı proformalarda içerik tabanlı satır çıkarma ve yinelenen satır temizleme eklendi.
- Dosyada doğrulanabilir ürün satırı bulunamazsa geçici/boş ürün oluşturulmaz; işlem 422 durumuyla durur ve kullanıcıya açıklayıcı hata gösterilir.
- Bozuk veya parola korumalı çalışma kitapları ayrı hata sınıfıyla raporlanır; yüklenen geçici dosya her hata yolunda temizlenir.
- WhatsApp paylaşımı kullanıcı tıklaması anında ayrı güvenli pencere açar; CRM ekranı açık kalır ve güvenli bağlantı hazırlandığında pencere WhatsApp hedefine yönlenir.
- Tema ve Sidebar Kontrolleri, Login Sayfası Tasarımı ile aynı iki sütunlu stüdyo iskeleti, anlık ön izleme, tam ekran ön izleme ve kaydetme davranışına geçirildi.
- Gerçek XLSX çalışma kitabı ile ürün satırı çıkarma ve ürün bulunamadığında sert durdurma testleri eklendi.
- Paket sürümü `3.5.9`, release kimliği `v3.5.9-excel-import-whatsapp-window-theme-studio`; veritabanı şeması değişmeden `34` olarak korunur.

# v3.5.8

- WhatsApp paylaşımında multipart CSRF hatası giderildi; güncel token + URL-encoded POST + aynı sekmede doğrulanmış wa.me yönlendirmesi eklendi.
- Proforma e-postasında SMTP sonrası log/audit hatasının yanlış başarısızlık uyarısı vermesi engellendi.
- Migration 34 ile güvenli bağlantı, e-posta günlüğü ve yedekleme şeması yeniden doğrulandı.
- Proforma listesi işlem sütunu ve altı kompakt buton taşmasız hale getirildi.
- Ürün menüsüne temalı Proformadan Ürün Aktar paneli eklendi.
- PDF/Excel tarama, OCR fallback, düzenlenebilir ön izleme, ürün kartı ön izlemesi ve kod bazlı upsert tamamlandı.
- JSON yedek/geri yükleme ve ayrı isimli Excel sayfaları güçlendirildi; tenant yöneticisi yedekleme yetkisi düzeltildi.
- Sürüm `3.5.8`, release `v3.5.8-whatsapp-csrf-action-layout-product-import-final`, şema `34`.

# v3.5.7

- Proforma e-postası ve WhatsApp güvenli bağlantı/log tabloları migration 33 ile zorunlu onarıma alındı.
- Test e-postası çalışırken proforma e-postasının şema hatası vermesi giderildi; SMTP hata sınıfları ayrıştırıldı.
- WhatsApp paylaşımı müşteri telefonuna ve gerçek güvenli proforma bağlantısına yönlendirildi; CRM sayfasını yeniden açan davranış kaldırıldı.
- Proforma detay ve e-posta üst işlem düğmeleri masaüstü/mobil için kompakt, taşmasız ve tam görünür hale getirildi.
- TR/EN emoji yerine gerçek SVG bayraklar kullanır.
- Proforma, e-posta, gönderim, yedekleme ve ürün aktarım ekranlarının TR/EN metinleri tamamlandı.
- Sunucu klasörüne SQLite kopyalayan eski yedek ekranı yerine SHA-256 doğrulamalı JSON veri yedeği ve Excel raporu eklendi.
- JSON geri yükleme tek transaction, mevcut kayıtları silmeyen merge/upsert ve firma izolasyonu ile güçlendirildi.
- Kullanıcı bazlı 15 günlük yedekleme hatırlatması ve audit kayıtları eklendi.
- PDF/Excel proformadan ürün satırı tarama, OCR fallback, düzenlenebilir ön izleme, ürün kartı ön izlemesi ve kod bazlı upsert eklendi.
- Paket sürümü `3.5.7`, release kimliği `v3.5.7-email-whatsapp-backup-import-final` olarak güncellendi.

# v3.5.6

- Login Studio kart tasarımcısı, mobil giriş ve canlı ön izleme iyileştirmeleri korunmuştur.

## 3.8.0 / crmV02
- Sistem Sağlık Merkezi eklendi: SQLite bütünlüğü, migration, depolama izinleri, PDF/OCR araçları, SMTP hazırlığı ve sürüm bilgileri.
- Canlı verileri değiştirmeyen yedek üretme/serileştirme/doğrulama testi eklendi; sonuç backup_jobs geçmişine yazılır.
- Üst bardaki evrensel arama müşteri, ürün, telefon, vergi no, teklif ve sipariş numarası için korunup sağlık merkeziyle birlikte standartlaştırıldı.
- Proforma formuna müşteri, ürün, fiyat, geçerlilik, teslimat ve ödeme alanlarını kaydetmeden önce denetleyen Teklif Kontrol Asistanı eklendi.

## 3.8.0 / crmV06
- E-posta ile gönderilen güvenli proforma bağlantısında mobil İndir/PDF düğmesi gerçek yazdırma ekranını ayrı sekmede açar.
- WhatsApp düğmesi doğrudan WhatsApp universal linkini kullanır; iPhone ve Android uygulamasına yönlenir.
- E-posta düğmesi teklif bağlantısını konu ve gövdeye ekleyerek cihazın e-posta uygulamasını açar.
- Public paylaşım işlemleri oturum veya CSRF gerektirmez; sadece aktif güvenli teklif tokenı üzerinden çalışır.

## crmV1.0 r3
- Masaüstü ürün ön izleme görünürlüğü, fiyat ve tam açıklama düzeltildi.
- Mobil ana sayfa yeniden tasarlandı.
- Mobil ürün listesi ikon çakışması giderildi ve sonsuz kaydırma eklendi.
- Mobil üst bara sabit Ana Sayfa ve Geri kontrolleri eklendi.
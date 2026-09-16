# CRM / ERP EFSANA36 v3.3.98 — A’dan Z’ye Kod, Güvenlik ve İş Akışı Denetim Raporu

**İncelenen paket:** `CRM_ERP_EFSANA36_v3.3.98_QUOTE_DISCOUNT_COLUMN_PRINT_STYLE_FIX_PRO(1).zip`  
**Denetim kapsamı:** kaynak kod, veritabanı migration’ları, yetkilendirme, güvenlik, veri saklama, yedekleme, proforma/fatura akışları, canlı destek, dosya yükleme, kurulum-güncelleme-rollback, performans, UI/CSS, dokümantasyon ve önerilen yeni özellikler.

---

## 1. Yönetici özeti

Paketin ZIP bütünlüğü ve manifest doğrulaması başarılıdır. JavaScript ve Bash sözdizimi kontrolleri geçmektedir. 28 adet veritabanı migration bloğu temiz bir SQLite veritabanında sırayla uygulanmış; son şema sürümü **28**, `PRAGMA integrity_check` sonucu **OK**, yabancı anahtar kontrolü temiz çıkmıştır.

Buna rağmen paket şu haliyle doğrudan canlıya alınmaya hazır değildir. En büyük riskler görsel veya sözdizimsel değil; **yetki kontrolleri, audit kaydı silinmesi, çok kiracılı yedekleme, WAL yedek tutarlılığı, yönetici onayı, finansal veriye erişim, pasif kullanıcı oturumları ve saklanan XSS** alanlarındadır.

### Genel risk sonucu

- **P0 / Kritik:** 13 doğrulanmış bulgu
- **P1 / Yüksek:** 22 doğrulanmış bulgu
- **P2 / Orta:** 25 doğrulanmış bulgu
- **P3 / Düşük / Teknik borç:** 10 bulgu
- **Toplam:** 70 bulgu ve iyileştirme başlığı

> **Karar:** P0 maddeleri çözülmeden canlı kullanıma geçilmemelidir. Özellikle veri saklama politikasına aykırı audit temizliği hemen kaldırılmalıdır.

---

## 2. Yapılan kontroller ve olumlu sonuçlar

1. ZIP içeriği açıldı ve dosya bütünlüğü incelendi.
2. `MANIFEST.sha256` içindeki dosya hash’leri doğrulandı.
3. Projenin `scripts/static-check.sh` betiği başarıyla geçti:
   - JavaScript sözdizimi
   - Bash sözdizimi
   - EJS delimiter sayımı
   - sahte `href="#"` kontrolü
   - dağıtım içinde `.env` / SQLite / WAL / SHM kalıntısı kontrolü
   - dahili NPM registry kontrolü
   - multipart CSRF bağlantıları
   - eski marka metni kontrolü
4. 28 migration temiz SQLite üzerinde sırasıyla başarıyla uygulandı.
5. Veritabanında `foreign_keys=ON`, WAL ve busy timeout tanımları mevcut.
6. Proforma, müşteri ve ürün ana kayıtlarında genel olarak soft-delete/arşivleme yaklaşımı kullanılmış.
7. Müşteri snapshot ve ürün snapshot yapısı proforma geçmişini korumak için doğru bir temel sunuyor.
8. Session secret üretim ortamında zayıfsa uygulamanın başlamayı reddetmesi olumlu.
9. CSRF katmanı ve multipart formlara token aktarımı mevcut.
10. Dosya imza kontrolü JPEG/PNG/WebP/PDF/XLSX gibi yaygın formatlarda yalnız uzantıya güvenmekten daha güvenli.

### Runtime test sınırlaması

`npm ci` bu inceleme konteynerindeki registry/ağ kısıtı nedeniyle tamamlanamadı; dolayısıyla gerçek Node sunucusu, oturumlu tarayıcı ve native `better-sqlite3` çalıştırma testi yapılamadı. Bu durum kaynak kodun bozuk olduğunu kanıtlamaz; ancak login, PDF baskı, e-posta, upload, import ve kullanıcı rollerinin test sunucusunda ayrıca çalıştırılması zorunludur.

---

# 3. P0 — Kritik bulgular

## P0-01 — Audit kayıtları otomatik olarak siliniyor

**Dosya:** `src/services/audit.service.js`  
Her yeni audit işleminden sonra sistem yalnızca son **20** kaydı bırakıp eski kayıtları `DELETE` ile siliyor.

```js
DELETE FROM audit_logs
WHERE tenant_id=?
AND id NOT IN (... LIMIT 20)
```

**Etki:**
- Kullanıcının kalıcı işlem geçmişi politikası ihlal ediliyor.
- Hatalı fiyat, yetki değişikliği, müşteri/proforma güncellemesi ve güvenlik olaylarının geçmişi kayboluyor.
- Denetim izi ve hukuki ispat gücü yok oluyor.

**Düzeltme:** Otomatik hard-delete tamamen kaldırılmalı. Audit logları append-only tutulmalı; büyüme kontrolü arşiv tablosu, sıkıştırılmış yıllık dosya veya tanımlı retention ile yapılmalıdır. En azından kullanıcı kararına göre audit kayıtları hard-delete edilmemelidir.

---

## P0-02 — Tenant yöneticisi bütün sistem veritabanını indiriyor

**Dosya:** `src/routes/backups.js`  
`SUPER_ADMIN` ve `TENANT_ADMIN`, `config.dbFile` dosyasının tamamını kopyalayıp indirebiliyor. Veritabanı tüm tenantları aynı SQLite dosyasında tutuyor.

**Etki:** Bir tenant yöneticisi başka tenantların müşterilerini, ürünlerini, proformalarını, kullanıcılarını ve entegrasyon ayarlarını indirebilir.

**Düzeltme:**
- Fiziksel tam veritabanı yedeği yalnız `SUPER_ADMIN` / sunucu operasyon rolüne açık olmalı.
- Tenant yöneticisine yalnız kendi tenant verilerini içeren mantıksal dışa aktarma verilmelidir.
- Backup indirme işlemi ikinci doğrulama ve ayrıntılı audit gerektirmelidir.

---

## P0-03 — WAL modunda dosya kopyalayarak alınan yedek tutarsız olabilir

**Dosyalar:** `src/db/db.js`, `src/routes/backups.js`, `docs/BACKUP.md`  
Veritabanı WAL modunda çalışıyor; web paneli yalnız ana `.sqlite` dosyasını `copyFileSync` ile kopyalıyor.

**Etki:** WAL dosyasına henüz checkpoint olmamış işlemler yedeğe girmeyebilir. Yedek açılabilir görünüp son kayıtları eksik taşıyabilir.

**Düzeltme:** SQLite online backup API, `VACUUM INTO` veya kontrollü checkpoint + tutarlı snapshot kullanılmalı. Her yedekten sonra ayrı dosyada `integrity_check`, hash ve restore smoke test yapılmalıdır.

---

## P0-04 — Yetki matrisi arayüzü gerçekte uygulanmıyor

**Dosyalar:** `src/routes/users.js`, `src/middleware/auth.js`  
Kullanıcı yönetiminde `permission_matrix` kaydediliyor; ancak uygulamadaki route’lar bu matrisi okumuyor. Yetki, yalnız sabit rol listeleriyle kontrol ediliyor.

**Etki:** Yönetici ekranda bir yetkiyi kapattığını sanabilir fakat kullanıcı işlemi yapmaya devam eder. Bu, yanlış güvenlik hissi yaratan kritik bir yetkilendirme hatasıdır.

**Düzeltme:** Tek bir `requirePermission(module, action)` middleware’i oluşturulmalı; bütün route’lar ve API uçları matristen beslenmelidir. UI gizleme yalnız yardımcı olmalı, asıl kontrol sunucuda yapılmalıdır.

---

## P0-05 — STAFF rolü yönetici onayını verebiliyor

**Dosya:** `src/routes/quotes.js`  
Router’daki tüm POST işlemleri `STAFF` rolüne açık. `POST /quotes/:id/approval` için ayrıca admin kontrolü yok.

**Etki:** Yüksek tutarlı veya yüksek iskontolu teklifi hazırlayan personel kendi teklifini onaylayabilir. “Yönetici onayı” işlevi fiilen etkisizdir.

**Düzeltme:** Onay/reddetme yalnız `SUPER_ADMIN`, `TENANT_ADMIN` veya özel `quotes.approve` iznine açık olmalı. Teklifi oluşturan kişinin kendi teklifini onaylaması opsiyonel “dört göz” kuralıyla engellenmelidir.

---

## P0-06 — Tanımlı durum geçiş tablosu kullanılmıyor

**Dosya:** `src/routes/quotes.js`  
`allowedTransitions` tanımlı olduğu halde `assertTransition()` yalnız hedef durumun listede bulunup bulunmadığına bakıyor; kaynak durumdan hedefe izin verilip verilmediğini kontrol etmiyor.

**Etki:** DRAFT teklif doğrudan DELIVERED, REJECTED veya başka bir aşamaya sıçratılabilir. Süreç bütünlüğü ve raporlama bozulur.

**Düzeltme:** `allowedTransitions[from].has(to)` zorunlu olmalı. Geçişler rol/izin ve gerekli alan kontrolleriyle birlikte transaction içinde doğrulanmalıdır.

---

## P0-07 — VIEWER ürün alış fiyatını doğrudan export ile görebiliyor

**Dosya:** `src/routes/products.js`  
GET istekleri rol kontrolünden geçirilmiyor. `/products/export.xls` satış fiyatı yanında `purchase_price`, tedarikçi ve kâr verilerini de dışarı aktarıyor.

**Etki:** Arayüzde finansal alanlar gizlense bile VIEWER doğrudan URL ile ticari maliyet bilgilerini indirebilir.

**Düzeltme:** Export route’u `products.export` izni istemeli. VIEWER exportu gerekiyorsa alış fiyatı, tedarikçi, kâr ve stok maliyeti sunucu tarafında çıkarılmalıdır.

---

## P0-08 — GET fatura exportu veriyi değiştiriyor ve VIEWER’a açık

**Dosya:** `src/routes/invoices.js`  
`GET /invoices/:id/export.json` faturayı `EXPORTED` durumuna güncelliyor. Router GET’leri tüm oturumlu rollere bırakıyor.

**Etki:**
- VIEWER finansal fatura içeriğini indirebilir.
- Bir tarayıcı, bot veya link önizleme isteği fatura durumunu değiştirebilir.
- GET güvenli/idempotent olmaktan çıkıyor.

**Düzeltme:** Export işlemi POST olmalı, CSRF ve `invoices.export` izni istemeli. Durum değişikliği ayrıca audit edilmelidir.

---

## P0-09 — Pasifleştirilen kullanıcının açık oturumu çalışmaya devam ediyor

**Dosya:** `src/middleware/context.js`  
Oturumdaki kullanıcı veritabanından alınırken `is_active` okunuyor fakat pasif kullanıcı için session sonlandırılmıyor. `requireAuth` yalnız `req.user` varlığına bakıyor.

**Etki:** Yönetici hesabı pasifleştirse bile kullanıcı mevcut oturum süresi boyunca sisteme erişmeye devam eder.

**Düzeltme:** `is_active !== 1` olduğunda session derhal destroy edilmeli ve login sayfasına yönlendirilmelidir. Rol/şifre değişikliğinde de aktif session revizyonu kontrol edilmelidir.

---

## P0-10 — Dashboard detay modalında saklanan XSS

**Dosya:** `public/js/app.js` satır 33  
Müşteri, ürün, teklif ve durum değerleri `innerHTML` içine escape edilmeden yerleştiriliyor.

**Etki:** Firma/ürün adı gibi veritabanına kaydedilebilen bir alana kötü amaçlı HTML girilirse kullanıcı dashboard kartına tıkladığında script/event çalışabilir.

**Düzeltme:** DOM elemanları `createElement` + `textContent` ile kurulmalı. HTML string gerekiyorsa güvenilir escape yardımcı fonksiyonu kullanılmalıdır. CSP’de nonce tabanlı script politikasına geçilmelidir.

---

## P0-11 — SMTP TLS sertifika doğrulaması kapalı

**Dosya:** `src/services/mail.service.js`  
Transporter içinde `tls: { rejectUnauthorized: false }` sabitlenmiş.

**Etki:** SMTP bağlantısı araya girme saldırısına karşı sertifika doğrulaması yapmaz; kullanıcı adı, parola ve e-posta içeriği riske girer.

**Düzeltme:** Varsayılan `true` olmalı. Yalnız geliştirme ortamında açıkça tanımlanan geçici bir ayarla kapatılabilmeli ve UI’da kırmızı uyarı gösterilmelidir.

---

## P0-12 — SMTP parolası ve API anahtarı düz metin tutuluyor

**Dosyalar:** `src/routes/integrations.js`, migration 27  
SMTP parolası ve fatura API anahtarı doğrudan SQLite kolonlarına yazılıyor. Tam DB yedekleri bu sırları da içeriyor.

**Etki:** Yedek veya veritabanı dosyasını ele geçiren kişi e-posta ve fatura entegrasyonu kimlik bilgilerine erişir.

**Düzeltme:** Uygulama seviyesinde AES-GCM ile şifreleme, anahtarın `.env`/secret manager’da tutulması, anahtar rotasyonu ve maskeli erişim uygulanmalıdır.

---

## P0-13 — Canlı destek ekleri herkese açık statik klasörde

**Dosyalar:** `src/middleware/upload.js`, `src/server.js`, `src/routes/live-public.js`  
Yüklemeler `public/uploads` içine kaydediliyor ve `/public` altında 7 günlük cache + wildcard CORS ile servis ediliyor.

**Etki:** URL’yi bilen herkes sohbet ekini kimlik doğrulamasız görüntüleyebilir. Hassas fotoğraf veya PDF’ler arama motoru, proxy veya tarayıcı cache’inde kalabilir.

**Düzeltme:** Canlı destek ekleri private storage’a taşınmalı; dosya yalnız yetkili operatör veya ilgili visitor token için süreli/signed route üzerinden verilmelidir. `Cache-Control: private, no-store` ve `Content-Disposition` uygulanmalıdır.

---

# 4. P1 — Yüksek öncelikli bulgular

## P1-01 — Her oturumlu kullanıcı tenant genelindeki sidebar presetlerini değiştirebiliyor

`src/routes/settings.js` içinde sidebar `edit/delete/restore` POST route’ları adminOnly değil. Değişiklikler `app_settings` üzerinden tenant geneline yazılıyor. VIEWER dahil kullanıcılar ortak görünümü bozabilir veya özel CSS ekleyebilir.

## P1-02 — Entegrasyon ekranı bütün rollere açık

`src/routes/integrations.js` GET route’u SMTP sunucusu, kullanıcı adı, gönderen adresi, entegrasyon sağlayıcısı, API URL’si, şirket kodu ve yakın alıcı loglarını bütün oturumlu rollere gösteriyor. Router’ın tamamı adminOnly olmalıdır.

## P1-03 — Finansal alan gizleme yalnız UI seviyesinde

`canSeeFinancials` EJS/JSON görünümünü kısmen etkiliyor; ancak teklif detay, print, preview, dashboard stat, arama ve export route’larında merkezi alan bazlı erişim politikası yok. VIEWER doğrudan URL ile fiyat/toplam verilerine erişebilir.

## P1-04 — Tenant yöneticisi keyfi SQLite restore talebi oluşturabiliyor

Restore otomatik uygulanmasa da tenant yöneticisi 250 MB’a kadar yalnız uzantısı `.sqlite` olan dosyayı sisteme yükleyebiliyor. SQLite header, `integrity_check`, schema sürümü, tenant uyumu veya malware kontrolü yapılmıyor. Bu işlem yalnız operasyon/SUPER_ADMIN olmalıdır.

## P1-05 — Canlı destek API’si kayıtlı site origin’ini doğrulamıyor

`Access-Control-Allow-Origin: *` kullanılıyor; `live_sites.site_url` bulunmasına rağmen `Origin` bununla karşılaştırılmıyor. Site key embed kodunda görülebildiği için başka siteler endpoint’i spam veya veri toplama amacıyla kullanabilir.

## P1-06 — Rate limiter tek process belleğinde ve spoof edilebilir header’a bağlı

Rate limit Map içinde tutuluyor, restartta sıfırlanıyor ve birden fazla process arasında paylaşılmıyor. IP değeri doğrudan `X-Forwarded-For` başından alınıyor. Güvenilir proxy zinciri ve merkezi Redis/SQLite rate limit kullanılmalıdır.

## P1-07 — Teklif paylaşım linki varsayılan olarak süresiz

`expires_days` boşsa `expires_at=null`. Yeni link oluşturulunca eski linkler iptal edilmiyor; ham token veritabanında tutuluyor. Varsayılan süre, link iptal/yenileme ekranı, token hash’i ve tek aktif link politikası eklenmelidir.

## P1-08 — Public teklif sayfasında `no-store` ve `noindex` yok

Müşteri teklifi cache’lenebilir veya link sızarsa indekslenebilir. `Cache-Control: no-store, private`, `Pragma: no-cache`, `X-Robots-Tag: noindex, nofollow, noarchive` eklenmelidir.

## P1-09 — Audit ekranından hard-delete yapılabiliyor

Tenant admin seçili veya tüm audit kayıtlarını fiziksel olarak silebiliyor; silme işleminin kendisi ayrıca audit edilmiyor. Audit kayıtları değiştirilemez/append-only olmalı; normal UI’dan silme kaldırılmalıdır.

## P1-10 — Proforma taslağı kullanıcı/tenant ayrımı olmadan localStorage’da

Yeni proforma anahtarı `crm-quote-draft-new`. Aynı bilgisayar/tarayıcıda başka kullanıcı giriş yaparsa önceki kullanıcının müşteri ve teklif taslağını görebilir. Anahtar tenant + user ID içermeli, süre sonu olmalı ve logoutta temizlenmelidir.

## P1-11 — Parasal hesaplar JavaScript float ve SQLite REAL kullanıyor

Finansal değerler 2 ondalığa yuvarlansa da binary floating point; büyük listelerde, indirim/KDV ve e-fatura mutabakatında kuruş farkı oluşturabilir. Para integer kuruş veya decimal kütüphanesiyle temsil edilmelidir.

## P1-12 — Fatura numarası `COUNT + 1` ile üretiliyor

Eşzamanlı iki işlem aynı numarayı üretebilir. Silinmiş/kaybolmuş kayıt numaranın tekrar kullanılmasına neden olabilir. Ayrıca `(tenant_id, invoice_no)` UNIQUE değil. Sayaç tablosu + transaction + UNIQUE constraint kullanılmalıdır.

## P1-13 — Kurulum ve yedekleme yolları birbiriyle uyuşmuyor

- Kurulum varsayılanı: `/opt/crm-erp-efsana36`
- Backup betikleri: `/home/arteva/arteva-crm-erp-efsana36`
- Beklenen DB: `arteva-crm.sqlite` veya `crm-erp.sqlite`

Yanlış dizine yedek alınması veya “DB bulunamadı” hatası riski vardır. Tek merkezî `BASE` ve `.env` kullanılmalıdır.

## P1-14 — Web paneli yedekleri release klasörüne yazıyor

`config.root/backups` aktif release’e bağlıdır. Yeni release sonrası backup ekranı yeni boş klasöre geçebilir; veritabanındaki eski mutlak dosya yolları eski release silinince bozulur. Yedekler shared ve release dışı dizinde tutulmalıdır.

## P1-15 — Rollback gerçek “önceki aktif release”i seçmiyor

Betik dizinleri ters sıralayıp ikinciyi seçiyor. Aktif symlink hangi release’i gösteriyor kontrol edilmiyor. Symlink health doğrulanmadan değiştiriliyor; başarısızlıkta otomatik geri dönüş yok.

## P1-16 — Süreç yönetimi `nohup + pidfile`; graceful shutdown yok

Sunucu reboot, crash, log büyümesi, stale PID ve otomatik restart için sağlam değil. Uygulamada `SIGTERM/SIGINT` handler yok; DB/session kapatma ve devam eden istekleri tamamlama uygulanmamış. Systemd veya PM2 + health restart kullanılmalıdır.

## P1-17 — Otomatik test ve CI yok

`package.json` içinde `test` scripti, unit/integration/e2e testleri ve CI workflow bulunmuyor. Mevcut statik kontrol gerçek EJS compile, route authorization veya iş akışı testi yapmıyor.

## P1-18 — JSON ve urlencoded body limiti global 48 MB

Bütün normal POST istekleri 48 MB’a kadar belleğe alınabilir. Login ve basit formlar için gereksiz DoS yüzeyi oluşturur. Global limit 1–2 MB; büyük dosya yalnız multipart route’larda olmalıdır.

## P1-19 — Canlı destek kişisel verileri için retention/consent sistemi yok

IP, user-agent, sayfa URL’si, referrer, ad, telefon, e-posta ve mesajlar süresiz tutuluyor. KVKK/GDPR kapsamında aydınlatma/onay, saklama süresi, anonimleştirme ve veri sahibi silme/dışa aktarma akışı eklenmelidir.

## P1-20 — Şifre politikası ve session revocation eksik

Yeni kullanıcı şifresi için minimum uzunluk/karmaşıklık yok; ilk girişte şifre değiştirme zorunluluğu yok; şifre veya rol değişince diğer oturumlar sonlandırılmıyor. MFA/passkey desteği de bulunmuyor.

## P1-21 — Tenant admin son yöneticiyi pasifleştirebilir

Kendi hesabını pasifleştirme engellenmiş; fakat başka tenant adminleri pasifleştirme veya son aktif yönetici hesabını kapatma engeli yok. Tenant kilitlenebilir. “En az bir aktif tenant admin” kuralı zorunlu olmalıdır.

## P1-22 — Çok tenantlı giriş tasarımı belirsiz ve veri sızıntısına açık

Login sayfası `login_settings ORDER BY tenant_id LIMIT 1` ile rastgele ilk tenant markasını gösteriyor. Kullanıcı adı/e-posta/telefon da tenant bağımsız global UNIQUE. Tenant belirleme stratejisi subdomain, tenant slug veya organizasyon kodu ile açıkça tasarlanmalıdır.

---

# 5. P2 — Orta öncelikli bulgular

## P2-01 — Sürüm uyuşmazlığı

`package.json` ve kod 3.3.98 iken `.env.example` içinde `APP_VERSION=3.3.45`. İlk kurulum bu dosyayı shared `.env` olarak kopyaladığı için health/log/cache sürümü yanlış görünebilir.

## P2-02 — Build zamanı eski ve sabit

`src/config.js` varsayılan build zamanı `2026-06-23`; paket 3.3.98 ile uyumlu değil. Paketleme sırasında otomatik üretilmelidir.

## P2-03 — README yetersiz

README yalnız tek cümle. Mimari, roller, env değişkenleri, backup/restore, test, güvenlik ve upgrade notları yok.

## P2-04 — Kurulum dokümanı eski paket adını kullanıyor

`docs/INSTALL.md` hâlâ `CRM_ERP_EFSANA36_v3.0.2` dizinine yönlendiriyor.

## P2-05 — Rollback dokümanı eski yolu kullanıyor

`docs/ROLLBACK.md` `/opt/CRM_ERP_EFSANA36_v3.0.2` yoluna referans veriyor; güncel releases/current mimarisiyle uyuşmuyor.

## P2-06 — Changelog 3.3.98 kaydını içermiyor

Paket sürümü 3.3.98 olsa da changelog en üstte 3.3.96 ile başlıyor; çok sayıda eski statik doğrulama belgesi de paket içinde birikmiş.

## P2-07 — Revizyonda `show_try_total` kopyalanmıyor

`createRevision()` SELECT/INSERT kolonları içinde `show_try_total` yok. Kaynak teklifte TL karşılığı gizlenmişse revizyon varsayılan 1’e dönebilir.

## P2-08 — İndirim/KDV input doğrulaması eksik

Hesaplamada yüzde indirim 100 ile sınırlandırılıyor fakat ham `discount_value` daha yüksek saklanabiliyor. KDV için üst sınır yok. Miktar/fiyat için makul maksimum ve decimal scale kontrolü bulunmuyor.

## P2-09 — TCMB kur tarihi kaynağın gerçek tarihinden alınmıyor

Kur servisi başarılı fetch tarihini kullanıyor; hafta sonu/geriye dönük TCMB XML’inin gerçek `<Date/Tarih>` alanı parse edilmezse ekranda yanlış “kur tarihi” gösterilebilir.

## P2-10 — Canlı destek mesai saati sunucu timezone’una bağlı

Tenant/site timezone alanı yok. Sunucu farklı timezone’da çalışırsa çevrimiçi/çevrimdışı durumu yanlış hesaplanabilir.

## P2-11 — Canlı destek page_count gerçek sayfa görüntülemesi değil

`upsertVisitor` track/contact/typing/message gibi birçok çağrıda çalıştığı için sayfa sayacı şişebilir. Page view ve heartbeat olayları ayrılmalıdır.

## P2-12 — IP’ye göre eski ziyaretçi eşleştirme yanlış kişiyi bulabilir

Bootstrap token yoksa aynı IP’deki son ziyaretçi seçiliyor. Kurumsal NAT veya mobil ağda ilgisiz kullanıcılar aynı ziyaretçi kabul edilebilir ve hoş geldin davranışı yanlışlaşabilir.

## P2-13 — Public teklif görüntülenme sayacı bot ve yenilemeyi ayırmıyor

Her GET view_count artırıyor; e-posta güvenlik tarayıcıları, gönderen kişinin kontrolü ve sayfa yenilemeleri gerçek müşteri görüntülenmesi sayılabilir. Dedupe, user-agent bot filtresi ve zaman penceresi gerekir.

## P2-14 — Başarısız e-postada paylaşım tokenı aktif kalıyor

Token ve send log, SMTP çağrısından önce oluşturuluyor. Gönderim başarısızsa token devre dışı bırakılmıyor. Failed token iptal edilmeli veya yalnız başarılı gönderim sonrası aktifleştirilmelidir.

## P2-15 — E-posta gövdeleri süresiz saklanıyor

`quote_send_logs.body` müşteri ve ticari içerik barındırabilir. Saklama süresi, maskeleme ve arşiv politikası tanımlanmalıdır.

## P2-16 — Yedek dosya adı saniye hassasiyetinde

Aynı saniyede iki işlem aynı dosya adını üretebilir. Milisaniye/UUID ve DB UNIQUE kullanılmalıdır.

## P2-17 — Yedek öncesi disk alanı kontrolü yok

Disk dolması yarım yedek, uygulama log/session hatası veya hizmet kesintisi doğurabilir. Minimum boş alan kontrolü ve alarm gerekir.

## P2-18 — Dosya değiştirildiğinde eski uploadlar temizlenmiyor

Ürün/logo/broşür güncellemelerinde eski dosyalar orphan kalabilir. Referans sayımı veya güvenli periyodik orphan temizliği gerekir; ana veri kayıtlarına dokunmamalıdır.

## P2-19 — PDF’ler statik ve inline servis ediliyor

PDF aktif içerik taşıyabilir. Download route, `Content-Disposition: attachment`, güvenli CSP/sandbox ve opsiyonel malware taraması kullanılmalıdır.

## P2-20 — Upload alanı bilinmiyorsa dosya yine kabul ediliyor

`allowedByField()` tanınmayan field için de resim/PDF/sheet kabul ediyor. Sıkı alan allowlist uygulanmalıdır.

## P2-21 — Upload fileFilter hatası uygun HTTP statüsü taşımıyor

Multer fileFilter normal `Error` üretiyor; 415/422 yerine genel 500 akışına düşebilir. Hata tipi ve kullanıcı mesajı standartlaştırılmalıdır.

## P2-22 — Aynı kaydı iki kullanıcının ezmesini engelleyen optimistic locking yok

Customer/product/quote update sırasında `updated_at` veya version karşılaştırılmıyor. İki kullanıcı aynı kaydı açarsa son kaydeden öncekinin değişikliklerini sessizce ezer.

## P2-23 — Bazı listelerde pagination yok

Faturalar 200, gönderim logları 250, audit 500 ile kesiliyor. Dashboard’daki `recentQuotes` ise LIMIT olmadan tüm teklifleri çekiyor. Büyük veri hacminde performans ve görünmez kayıt sorunu oluşturur.

## P2-24 — Genel arama HTML route’unda limit üst sınırı yok

`Number(req.query.limit) || 12` doğrudan SQL LIMIT’e gidiyor. JSON route sınırlandırılmış olsa da HTML route için max limit uygulanmalıdır.

## P2-25 — Uygulama açılırken route içinde şema değiştiren kodlar var

`ensureLiveColumns()` ve `ensureProductCompatColumns()` migration dışında `ALTER TABLE` çalıştırıyor. Bu, migration hatalarını gizler; çok process başlatmada yarış ve minimum DB yetkisi sorunları yaratır. Şema değişikliği yalnız migration katmanında yapılmalıdır.

---

# 6. P3 — Düşük öncelik / teknik borç

## P3-01 — CSS monolitik ve yoğun tekrar içeriyor

`public/css/app.css` yaklaşık **700 KB / 6.809 satır**. Basit selector taramasında 830 selector adı birden fazla kez, toplam 1.948 ek tekrar bulundu. `.page-wrap` 27, `.quote-items` 24 kez tekrar tanımlanmış.

**Etki:** Yeni bir görsel düzeltme eski override’ı yeniden bozabilir; mobil/print davranışı kırılganlaşır.

## P3-02 — CSS/JS bundle, minification ve code-splitting yok

Bütün sayfalar büyük ortak CSS’i indiriyor. Vite/esbuild gibi build katmanı ile modül bazlı bundle ve fingerprint kullanılmalıdır.

## P3-03 — Statik EJS kontrolü gerçek compile testi değil

`<%` ve `%>` sayısı eşitliği kontrol ediliyor; yanlış değişken, include veya runtime syntax yine kaçabilir. Tüm EJS dosyaları test locals ile compile edilmelidir.

## P3-04 — CSP `unsafe-inline` içeriyor

Inline script/style gereksinimi XSS savunmasını zayıflatıyor. Kademeli olarak nonce/hash tabanlı CSP’ye geçilmelidir.

## P3-05 — Health endpoint fazla ayrıntı veriyor

Sürüm, migration, environment, buildTime ve port dışarıya açık. Public health yalnız `ok` dönmeli; ayrıntılı readiness iç ağ/admin endpoint’i olmalıdır.

## P3-06 — Health isteği dosya sistemini değiştiriyor

Her health isteğinde upload klasörü oluşturuluyor. Health mümkün olduğunca salt-okuma olmalıdır.

## P3-07 — Error log tam error nesnesini yazıyor

Stack, SQL hata metni veya PII loga girebilir. Structured logger, request ID ve secret/PII redaction gerekir.

## P3-08 — Release ve log temizleme politikası yok

`releases` ve uygulama logları sınırsız büyüyebilir. Son N sağlıklı release saklanmalı; logrotate/journald uygulanmalıdır.

## P3-09 — Package metadata eksik

Repository, license ve destek bilgileri yok. Private proje olsa bile sürüm kaynağı ve build commit bilgisi faydalıdır.

## P3-10 — Eski statik doğrulama dosyaları paket içinde birikmiş

Çok sayıda eski sürüme ait `STATIC_VALIDATION_*` dosyası güncel raporun hangisi olduğunu belirsizleştiriyor. Release paketinde yalnız güncel test raporu ve geçmiş changelog tutulmalıdır.

---

# 7. İş akışı ve fonksiyon bazlı özel değerlendirme

## Proforma

**Güçlü yönler:** snapshot, revision parent, sıra kalemleri, toplam/indirim/KDV, soft archive, e-posta takibi ve şablon altyapısı mevcut.

**Eksikler:** gerçek transition kontrolü, yönetici onayı ayrımı, optimistic locking, token yaşam döngüsü, revizyonda `show_try_total`, sunucu taraflı finansal alan erişimi ve deterministic PDF testi.

## Müşteri

**Güçlü yönler:** arama metni, snapshot, hızlı müşteri oluşturma, soft archive.

**Eksikler:** duplicate merge aracı, değişiklik geçmişi, KVKK izin/retention alanları, adres/vergi no doğrulamaları ve eşzamanlı düzenleme koruması.

## Ürün

**Güçlü yönler:** görsel/broşür/CE/kılavuz alanları, import/export, arama ve soft archive.

**Eksikler:** VIEWER export sızıntısı, alış fiyatı için merkezi izin, fiyat geçmişi, maliyet para birimi/kur tarihi, orphan dosyalar, import satır-hücre limitleri.

## Fatura

**Güçlü yönler:** proformadan snapshot ile taslak oluşturma ve entegrasyon alanları.

**Eksikler:** güvenli fatura numaralandırma, UBL-TR/e-Fatura doğrulaması, cancel/credit note akışı, export yetkisi, GET’in veri değiştirmesi ve UNIQUE constraint.

## Canlı destek

**Güçlü yönler:** visitor, conversation, message, typing, ek, operator paneli ve site bazlı tasarım altyapısı.

**Eksikler:** origin doğrulaması, private attachment, KVKK, timezone, analitik doğruluğu, spam/captcha ve merkezi rate limit.

## Operasyon

**Güçlü yönler:** release/shared/current yaklaşımı, health kontrolü, migration ve seed adımları.

**Eksikler:** farklı BASE yolları, online SQLite backup, systemd, rollback güvenliği, encrypted offsite backup, restore drill, CI ve gözlemlenebilirlik.

---

# 8. Bonus olarak eklenmesi önerilen özellikler

## A. Güvenlik ve yönetim

1. **Gerçek dinamik RBAC:** modül + işlem + alan bazlı izin.
2. **Dört göz onayı:** teklifi hazırlayan kendi teklifini onaylayamasın.
3. **MFA / Passkey:** yönetici ve finans kullanıcılarında zorunlu seçenek.
4. **Aktif oturumlar ekranı:** cihaz/IP/zaman; tek oturum veya tüm oturumları kapatma.
5. **Güvenlik olay merkezi:** başarısız login, rol değişikliği, export, backup, token kullanımı.
6. **Immutable audit zinciri:** her kayıt bir öncekinin hash’ini taşısın; dışa aktarılabilir imzalı rapor.
7. **Hassas alan şifreleme:** SMTP, API key, IBAN/kişisel veriler için kolon seviyesinde encryption.

## B. Proforma ve satış

8. **Gelişmiş revizyon karşılaştırması:** eklenen/çıkarılan ürün, miktar, fiyat, iskonto ve koşul değişikliklerini yan yana gösterme.
9. **Müşteri portalı:** güvenli linkten teklif görüntüleme, kabul/ret, revizyon isteği ve not bırakma.
10. **Dijital onay:** tarih-saat, IP, onaylayan ad/ünvan, OTP veya e-imza kanıtı.
11. **İskonto/marj koruması:** satış fiyatı maliyet altına düşerse uyarı veya yönetici onayı.
12. **Teklif geçerlilik otomasyonu:** süresi dolacak teklif için hatırlatma ve otomatik EXPIRED.
13. **Takip otomasyonu:** gönderimden X gün sonra görev/e-posta/WhatsApp hatırlatması.
14. **Teklif puanlama:** tutar, görüntülenme, müşteri geçmişi ve bekleme süresine göre sıcaklık skoru.
15. **Çoklu para birimi doğruluğu:** her satırın kur tarihi/kaynağı ve teklif anı kur snapshot’ı.
16. **Sunucu taraflı sabit PDF:** aynı font ve sayfa kırılımını üreten headless Chromium/PDF servisi.
17. **PDF imza/hash doğrulaması:** belge değişmedi kanıtı ve QR ile doğrulama sayfası.

## C. Müşteri ve CRM

18. **360° müşteri kartı:** teklifler, siparişler, faturalar, ödemeler, görüşmeler, canlı sohbet ve dosyalar tek zaman çizgisinde.
19. **Duplicate bulma/birleştirme:** vergi no, telefon, e-posta ve benzer firma adına göre.
20. **Görev ve randevu:** kullanıcı atama, son tarih, öncelik, takvim ve bildirim.
21. **Müşteri segmentasyonu:** sektör, şehir, ciro, son alış, teklif kazanma oranı.
22. **KVKK modülü:** açık rıza, iletişim izni, saklama süresi, veri dışa aktarma/silme talebi.

## D. Ürün, stok ve üretim

23. **Fiyat/maliyet geçmişi:** kim, ne zaman, eski-yeni değer ve kur bilgisi.
24. **Stok rezervasyonu:** siparişe dönüşen teklifte miktarı rezerve etme.
25. **Minimum stok ve satın alma önerisi.**
26. **BOM/reçete ve üretim iş emri:** cihaz/masa/kabin projeleri için malzeme listesi.
27. **Seri numarası ve garanti takibi:** üretim, sevk, kurulum, kalibrasyon ve servis geçmişi.
28. **Kalibrasyon/servis planı:** yaklaşan bakım ve sertifika süresi bildirimleri.
29. **Tedarikçi teklif karşılaştırması:** fiyat, termin, kur ve geçmiş performans.

## E. Fatura ve finans

30. **UBL-TR e-Fatura/e-Arşiv üretimi ve şema doğrulaması.**
31. **Tahsilat planı:** vade, kısmi ödeme, geciken bakiye ve yaşlandırma.
32. **Kârlılık raporu:** teklif/sipariş/fatura bazında maliyet, navlun, iskonto ve brüt kâr.
33. **Tevkifat, istisna, ihracat ve farklı KDV senaryoları.**
34. **İptal/iade/credit note iş akışı.**
35. **Banka hareketi eşleştirme ve ödeme kapatma.**

## F. Operasyon ve kalite

36. **Şifreli offsite backup:** S3 uyumlu depolama, immutable object lock ve periyodik restore testi.
37. **Backup doğrulama merkezi:** hash, boyut, integrity, son restore denemesi ve alarm.
38. **Systemd/PM2 servis yönetimi:** otomatik restart, log rotation, resource limit.
39. **Observability:** request ID, structured logs, hata oranı, response time, DB lock süresi, disk/backup alarmı.
40. **CI pipeline:** lint, unit, integration, migration, EJS compile, authorization matrix ve Playwright PDF screenshot testleri.
41. **Feature flag:** riskli yeni özelliği tenant/kullanıcı bazlı açma.
42. **Import ön izleme:** Excel yüklenince ekle/güncelle/atla/hata satırlarını uygulamadan önce gösterme.
43. **Toplu işlem geri alma:** belirli süre içinde batch import/fiyat güncellemesini rollback etme.

## G. Kullanıcı deneyimi

44. **Kaydedilmiş filtreler ve kişisel liste kolonları.**
45. **Global komut paleti:** müşteri/ürün/teklif açma ve hızlı işlem.
46. **Bildirim merkezi:** okundu, ertele, göreve dönüştür, e-posta/push tercihleri.
47. **PWA mobil kullanım:** güvenli offline taslak, kamera ile evrak/ürün fotoğrafı.
48. **Erişilebilirlik:** klavye navigasyonu, focus trap, ARIA dialog, kontrast kontrolü.
49. **Kullanıcı bazlı taslak:** cihazlar arası server-side draft; localStorage bağımlılığını kaldırma.
50. **Türkçe/İngilizce içerik tamlığı:** yalnız UI değil, mail/PDF/koşullar ve durum metinleri.

---

# 9. Önerilen düzeltme sırası

## Aşama 1 — Veri kaybı ve yetki kapatma

1. Audit `LIMIT 20` hard-delete kaldırılmalı.
2. Backup route’u yalnız SUPER_ADMIN/ops yapılmalı.
3. SQLite online backup uygulanmalı.
4. STAFF approval kapatılmalı.
5. Gerçek status transition uygulanmalı.
6. VIEWER export/detail finansal erişimi sunucuda engellenmeli.
7. Pasif kullanıcı session’ı anında iptal edilmeli.
8. Dashboard XSS düzeltilmeli.
9. SMTP TLS doğrulaması açılmalı.
10. Secrets şifrelenmeli.
11. Canlı destek ekleri private storage’a taşınmalı.

## Aşama 2 — İş bütünlüğü

1. Dinamik permission middleware.
2. Fatura sayaç tablosu + UNIQUE.
3. Para integer kuruş/decimal dönüşümü.
4. Optimistic locking.
5. Token süre/iptal/hash sistemi.
6. Audit append-only ve retention.
7. Tenant veri izolasyonu testleri.

## Aşama 3 — Operasyon güvenliği

1. Tek BASE/shared yolu.
2. Systemd/PM2 ve graceful shutdown.
3. Atomik health-check rollback.
4. Şifreli offsite backup ve restore drill.
5. Log rotation ve release retention.
6. CI + test suite.

## Aşama 4 — UI ve sürdürülebilirlik

1. CSS’in modüllere ayrılması.
2. Build/minify/fingerprint.
3. Gerçek EJS compile testi.
4. Playwright mobil ve PDF görsel regresyon testi.
5. Pagination/saved filters.

---

# 10. Canlıya geçiş öncesi zorunlu test listesi

- Tüm roller için route bazlı izin matrisi testi.
- STAFF kullanıcının onay veremediğinin testi.
- VIEWER’ın alış fiyatı, toplam, fatura ve backup göremediğinin testi.
- Kullanıcı pasifleştirilince açık session’ın kapanması.
- İki eşzamanlı fatura oluşturma testi.
- WAL aktifken backup/restore ve integrity testi.
- Başka tenant admininin diğer tenant verisini göremediği/indiremediği izolasyon testi.
- Stored XSS payloadlarıyla müşteri/ürün/teklif/dashboard testi.
- SMTP geçerli/geçersiz sertifika testi.
- Public teklif linki expiry, revoke, no-cache ve bot görüntülenme testi.
- Canlı destek origin, spam, attachment authorization ve KVKK testi.
- 1.000+ ürün/müşteri, 10.000+ teklif ve 100.000 audit kaydıyla performans testi.
- Tüm proforma şablonlarında Chrome tabanlı A4 PDF piksel/sayfa kırılım testi.
- Upgrade ve rollback sırasında veri bütünlüğü ve eski sürüm uyumluluğu.

---

## Son hüküm

Kod tabanı geniş ve işlevsel bir CRM/ERP omurgasına sahip; migration yapısı temiz kuruluyor ve ana kayıtların çoğunda soft-delete yaklaşımı doğru yönde. Ancak mevcut sürümde güvenlik kontrollerinin bir kısmı yalnız görünüm seviyesinde kalmış, bazı yönetim özellikleri gerçek erişim kontrolü uygulamıyor ve audit/yedekleme tasarımı kullanıcının kalıcı veri koruma hedefiyle çelişiyor.

**Bu paket, P0 maddeleri giderildikten ve rol bazlı canlı testler tamamlandıktan sonra güvenli şekilde ilerletilmelidir.**

# Teslim Kapsamı ve Doğrulama Durumu

Bu paket, eski çalışan sisteme gelişi güzel blok ekleyen bir patch değildir. Ayrı release klasörüne kurulmak üzere hazırlanmış temiz kaynak teslimidir.

## Kaynak pakette bulunan modüller

- Ortak layout, sidebar, topbar ve mobil hızlı menü
- Giriş, oturum, hash parola, geçici hesap kilidi ve CSRF
- Kullanıcı bazlı tema kalıcılığı
- 5 ana tema, 15 yapısal sidebar ailesi ve 5 ikon paketi
- Kalıcı login sayfası tasarım ayarları
- Firma profilleri, aktif firma, logo, kaşe, imza ve banka
- Müşteri CRUD ve tekrar kayıt uyarısı
- Ürün/hizmet CRUD, server-side sayfalama ve kontrollü arama
- Proforma, müşteri/firma/ürün snapshot, sabitlenen kur, indirim ve KDV
- Revizyon, eski/yeni revizyon fiyatı, sipariş ve üretim durumu
- 10 farklı proforma şablonu, dolu örnek ön izleme ve tasarım stüdyosu
- A4 yazdırma görünümü, yazdırmada sabit alt bilgi
- Audit kayıtları, dashboard özetleri, sağlık kontrolü
- Test kurulum, yedek, smoke-test, Nginx geçiş ve rollback betikleri

## Bu çalışma ortamında doğrulananlar

- Bütün JavaScript dosyalarının sözdizimi
- Bütün Bash dosyalarının sözdizimi
- 28 EJS dosyasının delimiter dengesi ve EJS derlenebilirliği
- 5 SQLite migration bloğunun geçerli SQL olduğu
- Sahte `href="#"` bağlantısının bulunmadığı
- Dağıtım paketinde `.env`, SQLite, WAL, SHM ve `node_modules` bulunmadığı
- ZIP bütünlüğü ve SHA256

## Sunucuda doğrulanması gerekenler

Bu çalışma ortamında `better-sqlite3` native binding dosyası indirilemediği için Node uygulamasının gerçek runtime uçtan uca testi burada tamamlanamamıştır. Sunucuda Node.js 20 ortamında `scripts/install-test.sh` ayrı test portunda çalıştırılmalı, ardından `scripts/smoke-test.sh` ve manuel uçtan uca senaryo uygulanmalıdır. Test tamamlanmadan Nginx canlı yönlendirmesi yapılmamalıdır.

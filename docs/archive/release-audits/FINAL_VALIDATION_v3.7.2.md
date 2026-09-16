# ARTEVA CRM / ERP v3.7.2 — Final Doğrulama

- Uygulama sürümü: `3.7.2`
- Release: `v3.7.2-fouc-dashboard-freeboard-strict-import-final`
- JavaScript söz dizimi: başarılı
- Bash söz dizimi: başarılı
- EJS delimiter kontrolü: başarılı
- Temel statik kontrol zinciri: başarılı
- v3.6.0 sözleşme kontrolleri: 35/35
- v3.7.0 sözleşme kontrolleri: 50/50
- v3.7.2 sözleşme kontrolleri: 19/19
- PDF örnek ayrıştırma: 6/6
- Katı ürün dışı satır filtreleme: 7/7
- Gerçek e-fatura örneği: 7 ürün / 7 doğru satır
- ZIP bütünlük kontrolü: başarılı

## Bu sürümde doğrulanan davranışlar

- Sayfa yenilemesinde beyaz boş ekran yerine markalı yükleme katmanı gösterilir.
- Ana sayfa kartları masaüstünde sürüklenebilir, yeniden boyutlandırılabilir ve kilitlenebilir.
- Kart konumu, boyutu, kilit ve daraltma durumu kullanıcı/firma bazında kalıcı saklanır.
- Mobil görünümde kartlar taşmasız tek sütuna döner.
- PDF ayrıştırıcıları birbirine karıştırılmaz; en güçlü tek tablo stratejisi kullanılır.
- Garanti, teslimat, ödeme, toplam, not, banka, vergi, KDV ve benzeri ürün dışı satırlar ürün olarak alınmaz.

## Ortam notu

Çalışma ortamındaki npm proxy `bytes@3.1.3` paketine 404 döndürdüğü için temiz `npm ci` ve bağımlılık gerektiren tam EJS/runtime zinciri bu ortamda yeniden çalıştırılamadı. Kaynak söz dizimi, statik sözleşmeler ve PDF ayrıştırma testleri tamamlandı.

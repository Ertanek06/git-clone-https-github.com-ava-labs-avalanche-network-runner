# CRMV1.41 Web Ürün Aktarım Güvenilirlik Raporu

Baz paket: **crmv1.40 / 3.8.52**. Önceki firma profil medya düzeltmeleri, kalıcı ürün medyası ve katalog yazdırma davranışları korunarak web ürün tarama/aktarım modülü güçlendirildi.

## Ana değişiklikler
- Ürün adı yerine URL döndüren veya HTTP hata satırı olan kayıtlar kontrol tablosuna hiç alınmaz.
- `Yeni` filtresi yalnız gerçek, CRM'de aynı kod/aynı başlık bulunmayan ve temel alanları tamamlanmış ürünleri gösterir.
- Aynı ürün kodu veya aynı ürün başlığı CRM'de varsa satır pasif seçilir ve ikinci kayıt oluşturulmaz.
- Görselli, görselsiz, PDF belgeli, metadata eksik ve fiyatı eksik filtreleri eklendi.
- Açıklama çıkarımı yüksek hassasiyetli hale getirildi; iletişim, WhatsApp, menü, kategori/footer metni ürün açıklamasına yazılmaz. Güvenilir açıklama bulunamazsa alan boş kalır.
- 120 cm gibi ürün varyantlarında ilgili varyant başlığı ve özellik bloğu korunur.
- Kaynak ürün sayfası ve bulunan PDF broşür/kılavuz/CE bağlantıları kayıtla birlikte tutulur; PDF dosyaları CRM kalıcı medya alanına indirilebilir.
- Seçili ürünleri kaydetme işlemi arka plan worker'ına taşındı; çoklu görsel/PDF indirmesinde Nginx 504 bekleme sorunu engellenir.
- Aktarım bitince ortada 10 saniyelik gerçek yeni/güncellenen/atlanan ürün sayısı bildirimi gösterilir.
- Canlı tarama ekranı o an analiz edilen/aktarılan ürünü büyük kartta, son ürünleri yatay akışta gösterir.
- Tarama geçmişi tek tek silinebilir; 3 günden eski tamamlanmış rapor ve geçici job dosyaları otomatik temizlenir.
- Sitemap tanımlı kaynaklarda 15 günde bir yeni ürün keşfi/ekleme ve 24 saatte bir fiyat senkronizasyonu için günlük cron eklendi.
- Marka, model ve kategori otomatik aktarımda zorunlu güvenilirlik alanlarıdır; eksikse satır otomatik seçilmez ve manuel tamamlanabilir.

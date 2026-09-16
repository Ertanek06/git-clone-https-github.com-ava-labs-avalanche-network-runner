# ARTEVA CRM / ERP — crmv1.6 Liste, İş Akışı ve Proforma Ziyaret Takibi

Uygulama: 3.8.23  
Build: `crmv1.6`  
Release: `v3.8.23-crmv1.6-lists-workflow-proforma-visits`

## Tespit edilen sorunlar ve düzeltmeler

1. Ürün, müşteri ve proforma listeleri 10–100 kayıtlık sayfalara bölünüyor ve alt bölümde Önceki/Sonraki ile ilerliyordu. Ana listelere filtre ve sıralamayı koruyan `show=all` modu eklendi; `Tümünü Göster` seçildiğinde sorgudaki LIMIT/OFFSET kaldırılır.
2. Proforma ana listesinde pager görünümü bulunmadığı için sonraki kayıtların erişimi açık değildi. Ortak liste alt işlemi proforma ekranına da bağlandı.
3. Akıllı İş Akışı sorgusu süresi dolmuş teklifleri de alıyor, önce 40 sonra 12 kayıtla iki kez kesiyordu. Geçmiş tarihler sorgudan çıkarıldı, LIMIT ve `slice(0,12)` kaldırıldı ve en yakın son geçerlilik tarihi ilk olacak şekilde sıralandı.
4. Gönderim kartındaki Okunan metriği ziyaret zamanı ve tekrarlarını açıklamıyordu. Mevcut `quote_view_events` olayları firma sınırı içinde gruplanarak proforma → gün → saat özet penceresine bağlandı.
5. Public teklif görüntülemesindeki bir saatlik tekrar bastırma müşteri aynı proformayı farklı zamanlarda tekrar açtığında ayrıntılı geçmişi eksik bırakıyordu. Her sayfa açılışı ayrı ziyaret olayı olarak kaydedilir hale getirildi.
6. Yeni ziyaret için operatörün takip ekranını elle yenilemesi gerekiyordu. Dashboard 10 saniyede bir son ziyareti kontrol eder; yeni olayda kart üzerinde bildirim gösterir ve kullanıcı açtığında olay kimliğini kullanıcı/tarayıcı bazında hatırlar.

## Korunan davranışlar

- Arama, sıralama, durum filtresi, tenant izolasyonu ve yetki denetimleri korunur.
- `Tümünü Göster` yalnız görünüm sorgusundaki sayfa sınırını kaldırır; silme/arşivleme veya veri değişikliği yapmaz.
- Akıllı İş Akışı geçmiş görev kayıtlarını silmez; yalnız süresi geçmiş teklifleri güncel dashboard listesinden çıkarır.
- Mobil proforma kartları, titreşimsiz ürün seçici, teklif geneli indirim ve koşullu PDF toplam/koşullar sayfalaması crmv1.5/crmv1.4 katmanlarından korunur.

## Doğrulama

- JavaScript sözdizimi ve tüm EJS şablonları derlenir.
- crmv1.6 özel sözleşme testi liste, iş akışı, ziyaret geçmişi, bildirim ve sürüm kimliklerini denetler.
- Statik güvenlik/dağıtım kontrolleri ve npm güvenlik denetimi paketlemeden önce çalıştırılır.

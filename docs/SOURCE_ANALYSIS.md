# Kaynak Analiz Özeti

Kullanıcının gönderdiği mevcut CRM arşivi incelendi. Eski sisteme art arda eklenen yama bloklarının ortak layout, sidebar, ana sayfa kartları ve CSS genişlik kurallarında çakışma oluşturduğu görüldü. Bu teslim, eski çalışan sistemi yerinde yamalamaz. Ayrı release klasörüne kurulan temiz omurgadır.

## Temel kararlar

- `artevapp.com.tr` çalışan eski sistem korunur.
- Yeni sistem önce ayrı test portunda çalıştırılır.
- Nginx geçişi sağlık ve fonksiyon testlerinden sonra ayrıca uygulanır.
- Tek merkezli CSS, ortak layout, modüler route ve migration yapısı kullanılır.
- Proforma; müşteri, aktif firma, ürün ve kur snapshot kayıtlarıyla korunur.

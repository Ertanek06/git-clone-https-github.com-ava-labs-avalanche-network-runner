# crmV06 Final Validation

- Ağır PDF/Excel analizi Express ana sürecinden ayrılmış OS child process içinde çalışır.
- İşletim sistemi `timeout` koruması: 180 saniye; takılan parser 5 saniye sonra SIGKILL ile sonlandırılır.
- Worker düşük CPU önceliğiyle çalıştırılır; CRM sayfalarının yanıt vermesi önceliklidir.
- İptal işlemi worker process grubunu SIGKILL ile gerçekten durdurur ve geçici dosyayı temizler.
- Tarama işi localStorage + sunucu iş dosyasıyla sayfalar arasında görünür kalır.
- Menüden çıkışta Arka Planda Devam Et / İptal Et ve Çık / Sayfada Kal seçenekleri vardır.
- Güncelleme öncesi acil kurtarma betiği takılı PDF/OCR süreçlerini öldürüp CRM servisini yeniden başlatır.

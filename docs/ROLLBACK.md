# Güvenli Rollback

```bash
sudo BASE=/opt/crm-erp-efsana36 PORT=3120 bash scripts/rollback.sh
```

Betik aktif `current` symlink’ini belirler, gerçek önceki release’i seçer, servisi graceful biçimde durdurur, önceki sürümü başlatır ve health kontrolü yapar. Hedef release sağlık kontrolünü geçmezse mevcut release yeniden etkinleştirilir.

Rollback uygulama kodunu geri alır; veritabanını otomatik olarak eski yedeğe döndürmez. Bu davranış yeni kayıtların kaybolmasını önler. Şema geriye uyumsuzsa restore ayrı bakım prosedürüyle yapılmalıdır.

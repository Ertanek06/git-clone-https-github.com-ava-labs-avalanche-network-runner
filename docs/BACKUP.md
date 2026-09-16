# Yedekleme ve Geri Yükleme

## Politika

- Fiziksel sistem yedeği yalnız SUPER_ADMIN tarafından alınabilir ve indirilebilir.
- Tenant yöneticisi tüm tenantları içeren SQLite dosyasına erişemez.
- WAL modunda ana dosya kopyalanmaz; SQLite online backup API kullanılır.
- Her yedek için SQLite header, `integrity_check`, yabancı anahtar kontrolü, boyut ve SHA-256 doğrulanır.
- Günlük fiziksel yedek; doğrulanmış veritabanını, `public/uploads` içeriğini ve özel yüklemeleri tek pakette toplar.
- Tam paket AES-256-GCM ile şifrelenir. Varsayılan olarak `DATA_ENCRYPTION_KEY`, tercihen ayrı `BACKUP_ENCRYPTION_KEY` kullanılır.
- Yedekler release dışında `shared/backups` altında saklanır.
- Otomatik rotasyon varsayılan 365 gündür ve yalnız yedek dosyalarını siler; CRM ana kayıtlarını etkilemez.
- `BACKUP_MIRROR_DIR` tanımlanırsa şifreli tam paket ve SHA-256 dosyası ikinci hedefe atomik olarak kopyalanır.

## Manuel CLI yedeği

```bash
cd /opt/crm-erp-efsana36/current
sudo -u crm-erp npm run backup
```

Komut iki çıktı üretir:

- Hızlı operasyonel geri dönüş için doğrulanmış `.sqlite` dosyası.
- Veritabanı ile tüm yüklemeleri birlikte taşıyan şifreli `.tar.gz.enc` tam sistem paketi.

Tam paketi canlı sisteme yazmadan güvenli bir inceleme dizininde açmak ve bütünlüğünü doğrulamak için:

```bash
sudo -u crm-erp npm run backup:inspect -- \
  --file /opt/crm-erp-efsana36/shared/backups/crm-erp-full-YYYYMMDD-HHMMSS.tar.gz.enc \
  --out /opt/crm-erp-efsana36/restore-inspection-YYYYMMDD
```

## Günlük bakım cron’u

```bash
sudo BASE=/opt/crm-erp-efsana36 RETENTION_DAYS=365 bash scripts/install-backup-cron.sh
```

Bu görev günlük doğrulanmış veritabanı + dosya yedeği alır ve canlı destek saklama politikasını uygular.

## Restore güvenliği

Web panelindeki JSON işlemi yalnız seçili firmanın iş verilerini güvenli biçimde birleştirir; fiziksel sistem yedeğinin yerine geçmez. Şifreli fiziksel paket `backup:inspect` ile ayrı dizinde açılır. Gerçek restore bakım penceresinde, güncel yedek alındıktan sonra sunucu operasyonu tarafından uygulanmalıdır.

## Restore tatbikatı

En az üç ayda bir ayrı test sunucusunda yedek açılmalı, migration seviyesi, `integrity_check`, kritik tablo sayıları, login ve örnek proforma görüntüleme doğrulanmalıdır.

## Yetim upload kontrolü

Eski ürün/logo dosyaları otomatik ve kontrolsüz silinmez. Önce dry-run yapılır:

```bash
npm run uploads:orphans
```

Onaylanan, hiçbir kayda bağlı olmayan ve en az 30 günlük dosyaları temizlemek için:

```bash
npm run uploads:cleanup
```

# Kurulum ve Güncelleme — v3.8.23 / crmv1.6

`KURULUM_KOMUTU.txt` içindeki dört adımı sırasıyla çalıştırın. Akış mevcut uygulama klasörünü silmez:

1. Çalışan release üzerinden doğrulanmış online SQLite yedeği alır.
2. ZIP paketini tarih damgalı yeni bir yükleme dizinine açar.
3. Yeni release'i ayrı klasöre kurar; migration ve seed işlemlerini ortak veri dizininde çalıştırır.
4. Sürüm, release kimliği, `/login`, `/health`, bağımlılıklar ve Login Studio çalışma durumunu doğrular.

Kurulum betiği aktivasyondan önce ayrıca online yedek alır. Yeni release sağlık kontrolünü geçemezse servis önceki release'e döndürülür. Müşteri, ürün, proforma, revizyon, firma profili, fatura ve denetim kayıtları hard-delete edilmez.

Beklenen sağlık bilgileri:

- Version: `3.8.23`
- Release: `v3.8.23-crmv1.6-lists-workflow-proforma-visits`
- Build: `crmv1.6`
- Schema: `43`

Sunucu gereksinimi: Node.js 20 veya üzeri, npm, SQLite uyumlu dosya sistemi, Nginx ve önerilen PDF/OCR araçları.

# v3.5.6 Final Revizyon Raporu

## Kaynak taban

Kararlı v3.5.4 Login Media Runtime Fix kodu ile v3.5.5 CSRF/video performans düzeltmeleri temel alınmıştır.

## Login Studio

- Gerçek tarayıcı oranıyla aynı `cover` ölçekleme ana ön izlemeye bağlandı.
- Başlık ve açıklama için görünür alan tabanlı dinamik X/Y sınırı eklendi.
- Boyut/font/metin değişince koordinat yeniden doğrulanır.
- Gerçek `/login` sayfası da çalışma anında görünür sınır kontrolü uygular.
- Kaydetmeden önce güncel DOM’u klonlayan tam ekran canlı ön izleme penceresi eklendi.

## Kart tasarım sistemi

Beş kart modeli eklendi: classic, glass, executive, minimal ve embedded. Model seçimi hazır değerler uygular; kullanıcı sonrasında genişlik, renk, çerçeve, köşe, alan ve tipografi değerlerini bağımsız değiştirebilir.

## Düzenlenebilir içerikler

Logo boyutu; üst başlık, ana başlık, açıklama; kullanıcı adı ve şifre alan başlıkları; iki placeholder; Göster/Gizle; Beni hatırla; alt güvenlik notu; buton metni, renkleri, fontu ve köşesi düzenlenebilir.

## Görsel düzeltmeler

- Logo varsayılan yüksekliği 118 px yapıldı.
- Giriş butonu gölgesi kaldırıldı.
- Kart derinliği korunurken butonun yapay alt gölgesi kaldırıldı.
- Kart modellerinin çerçeve ve zemin yapıları birbirinden ayrıldı.

## Operasyon güvenliği

- Eski `arteva-crm-erp.service` otomatik kapatılır.
- 3120 portundaki sahipsiz süreçler temizlenir.
- Yeni systemd PID’sinin portu gerçekten dinlediği doğrulanır.
- Systemd restart politikası `on-failure` olarak düzenlendi.
- Rollback ve online yedekleme korunmuştur.

## Veri güvenliği

Yeni migration yoktur. Ana iş kayıtlarına dokunulmaz.

# crmv1.25 Sürüm Raporu

Sürüm: `3.8.37`  
Release: `v3.8.37-crmv1.25-color-pricing-layout`  
Build: `crmv1.25`

## Düzeltme
- Ürün Ön İzleme kartındaki satış fiyatının tema CSS'i nedeniyle beyaz/okunamaz görünmesi engellendi.
- Fiyat alanı açık mavi pill olarak korunur; metin koyu laciverttir.
- `color` yanında `-webkit-text-fill-color`, `background-image:none`, `background-clip` ve yüksek özgüllüklü yedek kural eklendi. Böylece kullanıcı teması veya WebKit tabanlı tarayıcı stilleri fiyat metnini tekrar beyaza çeviremez.
- crmv1.22 içindeki diğer proforma stüdyo ve ön izleme düzenlemeleri aynen korunur.

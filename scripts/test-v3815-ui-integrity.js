import assert from "node:assert/strict";
import fs from "node:fs";

const read=file=>fs.readFileSync(new URL("../"+file,import.meta.url),"utf8");
let checks=0;
const match=(source,pattern,message)=>{assert.match(source,pattern,message);checks+=1};
const noMatch=(source,pattern,message)=>{assert.doesNotMatch(source,pattern,message);checks+=1};
const before=(source,first,second,message)=>{
  const firstIndex=source.indexOf(first);
  const secondIndex=source.indexOf(second);
  assert.ok(firstIndex>=0&&secondIndex>=0&&firstIndex<secondIndex,message);
  checks+=1;
};

const layout=read("views/layout.ejs");
const preview=read("views/customers/preview.ejs");
const sidebar=read("views/partials/sidebar.ejs");
const mobileNav=read("views/partials/mobile-nav.ejs");
const topbar=read("views/partials/topbar.ejs");
const settingsRoutes=read("src/routes/settings.js");
const settingsIndex=read("views/settings/index.ejs");
const customerList=read("views/customers/index.ejs");
const productList=read("views/products/index.ejs");
const productRoutes=read("src/routes/products.js");
const invoices=read("views/invoices/index.ejs");
const themeStudio=read("views/settings/theme.ejs");
const liveSettings=read("views/live/settings.ejs");
const importHistory=read("views/products/import-proforma-history.ejs");
const compileTest=read("scripts/ejs-compile-test.js");
const smokeTest=read("scripts/smoke-test.sh");
const css=read("public/css/ui-consistency-v3815.css");
const assetBuild=read("scripts/build-assets.js");

match(layout,/assetBundle\.styles/,"Ana yerleşim hashli bütünlük stil paketini yüklemeli");
match(assetBuild,/ui-consistency-v3815\.css/,"Yeni bütünlük stili bundle girdilerinde olmalı");
match(preview,/assetBundle\?\.styles/,"Bağımsız müşteri ön izlemesi birleşik stili yüklemeli");
noMatch(preview,/public\/css\/ui-consistency-v3815\.css/,"Bağımsız müşteri ön izlemesi kaynak CSS'yi ayrıca istememeli");
match(css,/\.page-wrap > \.page-head/,"Sayfa başlıkları ortak stilde olmalı");
match(css,/\.settings-grid--aligned/,"Ayar kartları ortak stilde olmalı");
match(css,/:where\(\.pro-table, \.lined\)/,"Tablo tipografisi ortak stilde olmalı");
match(css,/\.mobile-nav a\.is-active/,"Mobil aktif menü stili olmalı");

match(importHistory,/layout\('layout'\)/,"Proforma geçmişi var olan yerleşimi kullanmalı");
noMatch(importHistory,/layouts\/main/,"Proforma geçmişi bulunmayan yerleşimi kullanmamalı");
match(compileTest,/source\.matchAll\(\/\\blayout/,"EJS testi yerleşim referanslarını denetlemeli");
match(compileTest,/Missing EJS layout/,"Eksik yerleşim anlaşılır hata vermeli");
match(smokeTest,/products\/import-proforma\/history/,"HTTP taraması proforma geçmişini kapsamalı");

match(sidebar,/!navPath\.startsWith\('\/quotes\/sent'\)/,"Gönderilen proformalar liste aktifliğinden ayrılmalı");
match(sidebar,/const navFlow=String\(query\?\.flow\|\|''\)/,"Süreç ağacı sorgu filtresini okumalı");
match(sidebar,/href="\/live\/history"/,"Canlı destek ağacı ziyaretçi geçmişini göstermeli");
match(sidebar,/data-icon="transfer"/,"Excel merkezi bağımsız menü öğesi olmalı");
match(sidebar,/const canUseUsers=can\('users','admin'\)/,"Kullanıcı menüsü gerçek yetkiyi kullanmalı");
match(sidebar,/type="submit"/,"Kenar çubuğu çıkış düğmesi açık tür taşımalı");

match(mobileNav,/can\('customers','view'\)/,"Mobil menü müşteri yetkisini denetlemeli");
match(mobileNav,/can\('products','view'\)/,"Mobil menü ürün yetkisini denetlemeli");
match(mobileNav,/can\('quotes','create'\)/,"Mobil menü proforma oluşturma yetkisini denetlemeli");
match(topbar,/if\(can\('settings','view'\)\)/,"Üst bar ayar kısayolu yetkiye bağlı olmalı");

before(settingsRoutes,'r.get("/locale/:locale"','r.use(requirePermission("settings", "view"))',"Dil değişimi ayar görüntüleme yetkisinden önce tanımlanmalı");
match(settingsIndex,/href:'\/system-health'/,"Ayar merkezi HTML sağlık ekranına bağlanmalı");
noMatch(settingsIndex,/href:'\/health'/,"Ayar merkezi ham sağlık JSON'una bağlanmamalı");
match(settingsIndex,/can\('integrations','admin'\)/,"Entegrasyon kartı gerçek yetkiye bağlı olmalı");
match(settingsIndex,/can\('backups','admin'\)/,"Yedek kartı gerçek yetkiye bağlı olmalı");

match(customerList,/canArchive=can\('customers','archive'\)/,"Müşteri arşiv eylemi arşiv yetkisine bağlı olmalı");
match(customerList,/canExport=can\('customers','export'\)/,"Müşteri dışa aktarımı dışa aktarma yetkisine bağlı olmalı");
match(customerList,/customerActionCount=1\+\(canEdit\?1:0\)/,"Müşteri işlem sütunu düzenleme yetkisini izlemeli");
match(productList,/canPriceEdit=canEdit&&can\('financials','edit'\)/,"Fiyat aracı ürün ve finans yetkilerini birlikte istemeli");
match(productList,/productActionCount=1\+\(canEdit\?1:0\)/,"Ürün işlem sütunu düzenleme yetkisini izlemeli");
match(productRoutes,/r\.post\(\s*['"]\/bulk-price['"]\s*,\s*productEdit\s*,\s*financialEdit/,"Toplu fiyat rotası finans düzenleme yetkisini zorunlu tutmalı");

match(invoices,/can\('invoices','export'\)/,"Fatura JSON eylemi dışa aktarma yetkisine bağlı olmalı");
match(invoices,/can\('invoices','edit'\)/,"Fatura durum eylemi düzenleme yetkisine bağlı olmalı");
match(invoices,/can\('financials','view'\)/,"Fatura tutarı finans görüntüleme yetkisine bağlı olmalı");
match(invoices,/can\('integrations','admin'\)/,"Fatura entegrasyon kısayolu yönetim yetkisine bağlı olmalı");

match(themeStudio,/theme-preview-title-v359[\s\S]{0,260}<button type="button">/,"Tema ön izleme eylemi form göndermemeli");
match(themeStudio,/theme-preview-grid-v359[\s\S]{0,900}<button type="button">/,"Tema ön izleme kart düğmeleri form göndermemeli");
match(liveSettings,/lwp-body[\s\S]{0,260}<button type="button">/,"Canlı destek ön izleme düğmeleri form göndermemeli");

console.log(`V3815_UI_INTEGRITY=${checks}/${checks} OK`);

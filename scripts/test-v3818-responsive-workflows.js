import assert from "node:assert/strict";
import fs from "node:fs";
import { parseProformaTextForTest } from "../src/services/proforma-product-import.service.js";

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8");
const app=read("public/js/app.js");
const css=read("public/css/ui-integrity-v3818.css");
const usersRoute=read("src/routes/users.js");
const usersView=read("views/users/index.ejs");
const importView=read("views/products/import-proforma-preview.ejs");
const themeView=read("views/settings/theme.ejs");
const themeJs=read("public/js/theme-studio.js");
const printView=read("views/quotes/print.ejs");
const topbar=read("views/partials/topbar.ejs");

assert.match(app,/\[\.\.\.form\.elements\]/);
assert.match(app,/crm-dashboard-freeboard-v3818-width/);
assert.match(app,/zoneWidth\(\)>=1040/);
assert.match(usersRoute,/FROM audit_logs WHERE tenant_id=\? AND user_id=\?/);
assert.match(usersView,/user-name-card-trigger-v3818/);
assert.match(usersView,/Son İşlem Raporu/);
assert.match(css,/\.user-table-v3818\{[^}]*table-layout:fixed/);
assert.match(css,/\.user-actions-head-v3818/);
assert.match(css,/\.import-products-fit\{[^}]*overflow-x:hidden!important;overflow-y:auto!important/);
assert.match(css,/\.import-products-table-v367\{[^}]*min-width:0!important/);
assert.match(css,/\.import-action-dock-buttons-v14\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(importView,/Kontrol et ve tamamla/);
assert.match(themeView,/theme-sidebar-gallery-viewport-v3818/);
assert.doesNotMatch(themeView,/Tam sidebar ve çekmece yapısını seçmek için aşağı doğru açın/);
assert.match(themeJs,/data-sidebar-gallery-shift/);
assert.match(printView,/data-empty-image-on-error/);
assert.match(printView,/image\.removeAttribute\('src'\)/);
assert.match(topbar,/topbar-search/);
assert.match(topbar,/data-live-date/);
assert.match(topbar,/data-live-time/);
assert.match(topbar,/WhatsApp|whatsapp/i);

const header="Görsel  Ürün Kodu  Ürün Adı ve Açıklama  Miktar  Birim  Birim Fiyat  İndirim  Vergi  Toplam";
const product=(code,name,price)=>`            ${code.padEnd(12)}  ${name.padEnd(56)}  1,00      ADET     ${price.padEnd(10)}  —            20%      ${price} EUR`;
const codes=["MS-","506-","AEKS-90","3276","B-192PL","GS29VV","TSC10D","AEE-120","AS","SH-132-","70101010","70101010","HI5221-","1000","MX-S","SK-0330-"];
const text=[
  "PROFORMA / FİYAT TEKLİFİ",
  "Para birimi            EUR",
  header,
  ...codes.map((code,index)=>product(code,`ÜRÜN ${index+1} LABORATUVAR CİHAZI`,`${100+index},00`))
].join("\n");
const parsed=parseProformaTextForTest(text);
assert.equal(parsed.strategy,"paginated");
assert.equal(parsed.rows.length,16);

console.log("V3818_RESPONSIVE_WORKFLOWS=23/23 OK");

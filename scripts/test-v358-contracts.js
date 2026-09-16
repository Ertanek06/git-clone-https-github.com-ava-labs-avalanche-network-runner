import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('public/js/app.js');
const quotes=read('src/routes/quotes.js');
const products=read('src/routes/products.js');
const sidebar=read('views/partials/sidebar.ejs');
const productIndex=read('views/products/index.ejs');
const importPage=read('views/products/import-proforma.ejs');
const css=read('public/css/app.css');
const backup=read('src/services/data-backup.service.js');
const backupRoutes=read('src/routes/backups.js');
const permission=read('src/services/permission.service.js');
const migrate=read('src/db/migrate.js');
const importService=read('src/services/proforma-product-import.service.js');
const upload=read('src/middleware/upload.js');
const themePage=read('views/settings/theme.ejs');
const themeJs=read('public/js/theme-studio.js');

const checks=[
  ()=>assert.match(app,/fetch\('\/auth\/csrf-token'/),
  ()=>assert.match(app,/new URLSearchParams\(\)/),
  ()=>assert.match(app,/'Content-Type':'application\/x-www-form-urlencoded;charset=UTF-8'/),
  ()=>assert.match(app,/'X-CSRF-Token':csrf/),
  ()=>assert.match(app,/window\.open\('about:blank','crm_whatsapp_share'/),
  ()=>assert.match(app,/popup\.location\.replace\(target\.toString\(\)\)/),
  ()=>assert.match(quotes,/Audit kaydı başarılı gönderimi engellemeden atlandı/),
  ()=>assert.match(quotes,/Audit kaydı paylaşımı engellemeden atlandı/),
  ()=>assert.match(quotes,/token-only koruma deneniyor/),
  ()=>assert.match(products,/get\('\/import-proforma'/),
  ()=>assert.match(sidebar,/href="\/products\/import-proforma"/),
  ()=>assert.match(productIndex,/proforma-import-direct-action/),
  ()=>assert.match(importPage,/product-import-landing-grid/),
  ()=>assert.match(css,/grid-template-columns:repeat\(6,30px\)/),
  ()=>assert.match(css,/width:218px!important/),
  ()=>assert.match(backup,/quote_items:'Proforma Satırları'/),
  ()=>assert.match(backupRoutes,/requirePermission\('backups','admin'\)/),
  ()=>assert.match(permission,/backups:\["view","export","admin"\]/),
  ()=>assert.match(migrate,/\[\s*34\s*,\s*\(\)\s*=>\s*\{/),
  ()=>assert.match(importService,/NO_PRODUCT_ROWS/),
  ()=>assert.match(importService,/module\?\.default\|\|module/),
  ()=>assert.match(upload,/application\/octet-stream/),
  ()=>assert.match(themePage,/theme-login-studio-v359/),
  ()=>assert.match(themePage,/data-theme-open-live-preview/),
  ()=>assert.match(themeJs,/data-theme-preview-canvas/)
];
for(const check of checks)check();
console.log(`V359_CONTRACT_TESTS=${checks.length}/${checks.length} OK`);

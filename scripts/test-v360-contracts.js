import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const config=read('src/config.js'),pkg=JSON.parse(read('package.json')),migrate=read('src/db/migrate.js');
const upload=read('src/middleware/upload.js'),products=read('src/routes/products.js'),importPage=read('views/products/import-proforma.ejs');
const importService=read('src/services/proforma-product-import.service.js'),install=read('scripts/install-test.sh'),tools=read('scripts/ensure-document-tools.sh');
const themeService=read('src/services/theme.service.js'),themeRoute=read('src/routes/settings.js'),themePage=read('views/settings/theme.ejs'),themeJs=read('public/js/theme-studio.js'),css=read('public/css/app.css');
const checks=[
 ()=>assert.equal(pkg.version,'3.8.57'),
 ()=>assert.match(config,/v3.8.57-crmv1.45-web-import-upsert-ui-document-fix/),
 ()=>assert.match(migrate,/\[\s*38\s*,\s*\(\)\s*=>\s*\{/),
 ()=>assert.match(products,/ensureProductImportSchema/),
 ()=>assert.ok((themeService.match(/key\s*:\s*"/g)||[]).length>=15),
 ()=>assert.match(migrate,/custom_json TEXT NOT NULL DEFAULT '\{\}'/),
 ()=>assert.match(upload,/fileSize: 100 \* 1024 \* 1024/),
 ()=>assert.match(products,/100 MB sınırını aşıyor/),
 ()=>assert.match(importPage,/en fazla 100 MB/),
 ()=>assert.match(install,/LIMIT=128m/),
 ()=>assert.match(install,/ensure-document-tools\.sh/),
 ()=>assert.match(tools,/poppler-utils/),
 ()=>assert.match(tools,/tesseract-ocr-tur/),
 ()=>assert.match(importService,/pdf-parse\/lib\/pdf-parse\.js/),
 ()=>assert.match(importService,/pdftotext/),
 ()=>assert.match(importService,/parsePdfColumnBlocks/),
 ()=>assert.match(importService,/parseCommonOfferLines/),
 ()=>assert.match(importService,/commerceContextScore/),
 ()=>assert.match(importService,/NO_PRODUCT_ROWS/),
 ()=>assert.match(importService,/dedupeProductRows/),
 ()=>assert.match(themeService,/export const advancedDefaults/),
 ()=>assert.match(themeService,/page_header_bg/),
 ()=>assert.match(themeService,/metric_icon_bg/),
 ()=>assert.match(themeService,/action_btn_bg/),
 ()=>assert.match(themeService,/modal_bg/),
 ()=>assert.match(themeService,/scrollbar_width/),
 ()=>assert.match(themeRoute,/body_line_height/),
 ()=>assert.match(themeRoute,/--action-size/),
 ()=>assert.match(themeRoute,/--modal-bg/),
 ()=>assert.match(themePage,/Bağımsız Tasarım Kontrolleri/),
 ()=>assert.match(themePage,/Sayfa Başlığı ve İç Paneller/),
 ()=>assert.match(themePage,/Modal, Açılır Liste ve Bildirimler/),
 ()=>assert.match(themePage,/Tüm Tema Bileşenlerini Kaydet/),
 ()=>assert.match(themeJs,/--pv-metric-bg/),
 ()=>assert.match(css,/tüm temel arayüz bileşenleri için bağımsız canlı ön izleme/)
];
for(const check of checks)check();
console.log(`V360_CONTRACT_TESTS=${checks.length}/${checks.length} OK`);

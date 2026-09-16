import fs from "fs";
import assert from "assert/strict";
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const config=read("src/config.js"),layout=read("views/layout.ejs"),app=read("public/js/app.js"),css=read("public/css/app.css"),quote=read("public/js/quote-form.js"),importView=read("views/products/import-proforma-preview.ejs"),parser=read("src/services/proforma-product-import.service.js"),theme=read("public/js/theme-studio.js"),setup=read("views/setup/index.ejs");
const checks=[
 ()=>assert.match(config,/3.8.57/),
 ()=>assert.match(config,/v3.8.57-crmv1.45-web-import-upsert-ui-document-fix/),
 ()=>assert.doesNotMatch(layout,/theme-loading-v372/),
 ()=>assert.doesNotMatch(layout,/appBootSplashV372/),
 ()=>assert.match(layout,/crm-dashboard-freeboard-v372/),
 ()=>assert.match(app,/dash-tools-v372/),
 ()=>assert.match(app,/dash-resize-v372/),
 ()=>assert.match(app,/pointerdown/),
 ()=>assert.match(app,/dashboard\/layout/),
 ()=>assert.match(app,/previewPrintUrl/),
 ()=>assert.match(app,/quotePdfDownload/),
 ()=>assert.match(app,/cardHead/),
 ()=>assert.match(css,/dashboard-freeboard-v372/),
 ()=>assert.match(css,/is-dashboard-locked-v372/),
 ()=>assert.match(parser,/isAncillaryProductText/),
 ()=>assert.match(parser,/En güçlü tek tablo stratejisi seçilir/),
 ()=>assert.match(parser,/parseEInvoiceProductTable/),
 ()=>assert.match(parser,/strictProductRows/),
 ()=>assert.match(importView,/import-image-file-v371/),
 ()=>assert.match(quote,/quoteAlternativeChooserV371/),
 ()=>assert.match(theme,/syncPreviewIcons/),
 ()=>assert.match(setup,/setup-wizard-v375/),
 ()=>assert.doesNotMatch(setup,/data-setup-accordion/)
];
for(const check of checks)check();
console.log(`V373_CONTRACTS ${checks.length}/${checks.length} OK`);

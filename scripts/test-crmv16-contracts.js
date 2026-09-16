import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pkg=JSON.parse(read('package.json'));
const config=read('src/config.js');
const app=read('public/js/app.js');
const routes=read('src/routes/products.js');
const worker=read('src/workers/proforma-import.worker.js');
const importer=read('src/services/proforma-product-import.service.js');
const importPage=read('views/products/import-proforma.ejs');
const quoteForm=read('views/quotes/form.ejs');
const productPreview=read('views/products/preview.ejs');
const themePage=read('views/settings/theme.ejs');
const themeService=read('src/services/theme.service.js');
const themeJs=read('public/js/theme-studio.js');
const css=read('public/css/app.css');
const checks=[
 ()=>assert.equal(pkg.version,'3.8.57'),
 ()=>assert.match(config,/v3.8.57-crmv1.45-web-import-upsert-ui-document-fix/),
 ()=>assert.match(app,/const isImportLanding=.*IMPORT_PATH/),
 ()=>assert.match(app,/if\(!active\|\|!isImportLanding\(\)\)return/),
 ()=>assert.match(app,/data-import-job-cancel/),
 ()=>assert.match(app,/worker, PDF\/OCR alt süreçleri/i),
 ()=>assert.match(importPage,/data-import-step=/),
 ()=>assert.match(importPage,/data-import-rule/),
 ()=>assert.match(routes,/ext\s*===\s*["']\.pdf["']\s*\?\s*600\s*:\s*180/),
 ()=>{assert.match(routes,/function verifiedImportPid/);assert.match(routes,/n\s*===\s*process\.pid/);assert.doesNotMatch(routes,/job\.controllerPid\s*,\s*job\.workerPid\s*,\s*job\.pid/)},
 ()=>assert.match(worker,/workerPid\s*:\s*process\.pid/),
 ()=>assert.match(importer,/pdftoppm[\s\S]{0,180}["']-r["']\s*,\s*["']180["']/),
 ()=>assert.match(quoteForm,/quick-product-modal-card-v16/),
 ()=>assert.match(productPreview,/product-card-preview-v16/),
 ()=>assert.match(app,/import-product-card-v16/),
 ()=>assert.match(themePage,/data-sidebar-select-v16/),
 ()=>assert.ok((themeService.match(/\bkey\s*:\s*"[^"]+"\s*,\s*name\s*:/g)||[]).length>=23),
 ()=>assert.match(themeService,/zigzag-flow/),
 ()=>assert.match(themeService,/icon-dock/),
 ()=>assert.match(themeService,/drawer-stack/),
 ()=>assert.match(themeJs,/data-sidebar-select-v16/),
 ()=>assert.match(css,/Theme\/sidebar studio: no horizontal drift/),
 ()=>assert.match(css,/sidebar--zigzag-flow/),
 ()=>assert.match(css,/quick-product-modal-card-v16/),
 ()=>assert.match(css,/product-import-steps-v16/)
];
for(const check of checks)check();
console.log(`CRMV16_CONTRACTS=${checks.length}/${checks.length} OK`);

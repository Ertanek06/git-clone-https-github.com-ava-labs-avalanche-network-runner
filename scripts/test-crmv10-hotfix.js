import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const routes=read('src/routes/products.js');
const preview=read('views/products/import-proforma-preview.ejs');
const productPreview=read('views/products/preview.ejs');
const app=read('public/js/app.js');
const dashboard=read('views/dashboard/index.ejs');
const layout=read('views/layout.ejs');
const css=read('public/css/crmv1-hotfix.css');
const install=read('KURULUM_KOMUTU.txt');
const installScript=read('scripts/install-test.sh');
const assetBuild=read('scripts/build-assets.js');

const checks=[
 ()=>assert.match(preview,/\/save\?_csrf=<%=encodeURIComponent\(csrfToken\)%>/),
 ()=>assert.match(routes,/function verifiedImportPid/),
 ()=>assert.match(routes,/n\s*===\s*process\.pid/),
 ()=>assert.match(routes,/command\.includes\(token\)/),
 ()=>assert.match(routes,/stopImportWorker\(job\)/),
 ()=>assert.doesNotMatch(routes,/\[child\?\.pid,job\.controllerPid,job\.workerPid,job\.pid\]/),
 ()=>assert.match(routes,/product-import-save/),
 ()=>assert.match(routes,/res\.redirect\(303,\s*`\/products\/import-proforma\/\$\{encodeURIComponent\(req\.params\.token\)\}\/preview`\)/),
 ()=>assert.match(routes,/res\.redirect\(303,\s*["']\/products\/import-proforma["']\)/),
 ()=>assert.match(app,/r\.status===404\|\|r\.status===410/),
 ()=>assert.match(app,/let layout=\{\.\.\.boot,\.\.\.local\}/),
 ()=>assert.doesNotMatch(app,/\}\);reflowLayout\(\);apply\(\);document\.body\?\.classList\.add\('dashboard-v372-ready'\)/),
 ()=>assert.match(dashboard,/mobile-dashboard-single-panel-v10/),
 ()=>assert.match(css,/restore the original dashboard widgets as separate, clean cards/),
 ()=>assert.match(css,/data-dashboard-widget="recent-proformas"/),
 ()=>assert.match(css,/data-dashboard-widget="recent-customers"/),
 ()=>assert.match(css,/data-dashboard-widget="recent-activity"/),
 ()=>assert.match(css,/data-dashboard-widget="alerts"/),
 ()=>assert.match(css,/data-dashboard-widget="live-proforma-tracking"/),
 ()=>assert.match(css,/body:not\(\.dashboard-v372-ready\)/),
 ()=>assert.match(app,/el\.hidden=!o\.visible/),
 ()=>assert.match(routes,/showMoney\s*:\s*true/),
 ()=>assert.match(productPreview,/data-product-price-card/),
 ()=>assert.match(productPreview,/product-preview-studio-v20__description-text/),
 ()=>assert.match(css,/max-height:none!important/),
 ()=>assert.match(layout,/assetBundle\.styles/),
 ()=>assert.match(assetBuild,/crmv1-hotfix\.css/),
	 ()=>assert.doesNotMatch(layout,/ui-stable-boot (?:body,)?ui-stable-boot \.app-shell\{visibility:hidden/),
	 ()=>assert.match(install,/crmv1.45\.zip/),
 ()=>assert.match(install,/bash scripts\/update-live\.sh/),
 ()=>assert.match(installScript,/node scripts\/online-backup\.js/)
];
for(const check of checks)check();
console.log(`CRMV10_HOTFIX=${checks.length}/${checks.length} OK`);

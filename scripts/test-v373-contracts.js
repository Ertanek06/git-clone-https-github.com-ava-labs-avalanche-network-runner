import fs from 'fs';
import assert from 'assert/strict';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const layout=read('views/layout.ejs');
const app=read('public/js/app.js');
const css=read('public/css/app.css');
const config=read('src/config.js');
const assetBuild=read('scripts/build-assets.js');
const checks=[
 ()=>assert.match(config,/appVersion: process\.env\.APP_VERSION \|\| "3.8.57"/),
 ()=>assert.match(config,/v3.8.57-crmv1.45-web-import-upsert-ui-document-fix/),
 ()=>assert.doesNotMatch(layout,/appBootSplashV372|Panel hazırlanıyor|theme-loading-v372/),
 ()=>assert.match(layout,/theme-first-paint-v373/),
 ()=>assert.match(layout,/assetBundle\.js/),
 ()=>assert.match(assetBuild,/"app\.js"/),
 ()=>assert.match(app,/previewPrintUrl/),
 ()=>assert.match(app,/quotePdfDownload/),
 ()=>assert.match(app,/download\.dataset\.downloadUrl/),
 ()=>assert.match(app,/const cardHead=event\.target\.closest\('\.card-head'\)/),
 ()=>assert.match(app,/setProperty\('left',o\.x\+'px','important'\)/),
 ()=>assert.match(app,/setProperty\('height',Math\.max\(560,bottom\+28\)\+'px','important'\)/),
 ()=>assert.match(css,/v3\.7\.3 FINAL/),
 ()=>assert.match(css,/cursor:nwse-resize!important/),
 ()=>assert.match(css,/#globalPreviewDownload\{pointer-events:auto!important/)
];
for(const check of checks)check();
console.log(`V373_CONTRACTS ${checks.length}/${checks.length} OK`);

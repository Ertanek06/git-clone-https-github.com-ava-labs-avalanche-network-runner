import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const config=read('src/config.js'),layout=read('views/layout.ejs'),app=read('public/js/app.js'),print=read('views/quotes/print.ejs'),quotes=read('src/routes/quotes.js'),render=read('src/services/quote-render.service.js'),parser=read('src/services/proforma-product-import.service.js'),setup=read('views/setup/index.ejs'),setupRoute=read('src/routes/setup.js'),css=read('public/css/app.css');
const checks=[
 ()=>assert.equal(pkg.version,'3.8.57'),
 ()=>assert.match(config,/v3.8.57-crmv1.45-web-import-upsert-ui-document-fix/),
 ()=>assert.match(layout,/id="globalPreviewDownload"[^>]*hidden/),
 ()=>assert.match(layout,/id="globalPreviewPrint"[^>]*hidden/),
 ()=>assert.match(app,/isQuotePdfPreview/),
 ()=>assert.match(app,/download\.hidden=!isQuotePdfPreview/),
 ()=>assert.match(app,/printBtn\.hidden=!\(isQuotePdfPreview\|\|isProductPreview\)/),
 ()=>assert.match(render,/embeddedPreview\s*=\s*false/),
 ()=>assert.match(quotes,/embeddedPreview\s*:\s*true/),
 ()=>assert.match(print,/!autoPrint&&!embeddedPreview/),
 ()=>assert.match(parser,/addressNoise/),
 ()=>assert.match(parser,/_tableBound/),
 ()=>assert.match(parser,/analysisScore/),
 ()=>assert.match(parser,/selectedSource/),
 ()=>assert.doesNotMatch(parser,/analyses\.flatMap\(x=>x\.rows\)/),
 ()=>assert.match(setup,/setup-wizard-v375/),
 ()=>assert.match(setup,/data-setup-studio-v375/),
 ()=>assert.doesNotMatch(setup,/data-setup-accordion/),
 ()=>assert.match(setupRoute,/setup_domain/),
 ()=>assert.match(setupRoute,/setup_port/),
 ()=>assert.match(css,/v3\.7\.5 — açık ve yeniden tasarlanmış İlk Kurulum Sihirbazı/)
];
for(const check of checks)check();
console.log(`V375_CONTRACTS ${checks.length}/${checks.length} OK`);

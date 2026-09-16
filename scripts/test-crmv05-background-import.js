import fs from 'fs';
import assert from 'assert/strict';
const products=fs.readFileSync(new URL('../src/routes/products.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../src/workers/proforma-import.worker.js',import.meta.url),'utf8');
const update=fs.readFileSync(new URL('./update-live.sh',import.meta.url),'utf8');
const tests=[
 ()=>assert.match(products,/spawn\('timeout'/),
 ()=>assert.match(products,/--kill-after=8s/),
 ()=>assert.match(products,/os\.setPriority\(child\.pid,15\)/),
 ()=>assert.match(products,/SIGKILL/),
 ()=>assert.match(products,/status:'CANCELLED'/),
 ()=>assert.match(app,/Arka Planda Devam Et/),
 ()=>assert.match(app,/İptal Et ve Çık/),
 ()=>assert.match(app,/beforeunload/),
 ()=>assert.match(app,/arteva\.lastProductImportResult/),
 ()=>assert.match(worker,/analyzeProformaFile/),
 ()=>assert.match(update,/emergency-recover\.sh/)
];
tests.forEach(fn=>fn());
console.log(`CRMV05_BACKGROUND_IMPORT_TESTS=${tests.length}/${tests.length} OK`);

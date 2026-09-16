import fs from 'fs';import assert from 'assert';import {db} from '../src/db/db.js';
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.equal(pkg.version,'3.8.57');
for(const table of ['product_import_templates','product_import_history']){const row=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);assert.ok(row,table+' missing')}
const products=fs.readFileSync(new URL('../src/routes/products.js',import.meta.url),'utf8');assert.ok(products.includes('productImportSchemaGuard'));
const print=fs.readFileSync(new URL('../views/quotes/print.ejs',import.meta.url),'utf8');assert.ok(print.includes('public-quote-actions-v365'));
const setup=fs.readFileSync(new URL('../views/setup/index.ejs',import.meta.url),'utf8');assert.ok(setup.includes('A–Z Kurulum ve Devir Kılavuzunu İndir'));
const themes=(await import('../src/services/theme.service.js')).themes;assert.ok(themes.length>=10);assert.equal(new Set(themes.map(x=>x.key)).size,themes.length);
console.log('V365 CONTRACTS 10/10 OK');

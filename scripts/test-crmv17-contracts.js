import fs from 'fs';
import vm from 'vm';
import assert from 'assert/strict';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const theme=read('views/settings/theme.ejs');
const css=read('public/css/app.css');
const importer=read('src/services/proforma-product-import.service.js');
assert.equal(pkg.version,'3.8.57');
assert.match(theme,/theme-sidebar-gallery-viewport-v3818/);
assert.match(theme,/data-sidebar-gallery-shift/);
assert.doesNotMatch(theme,/theme-hover-palette-v371/);
assert.doesNotMatch(theme,/theme-sidebar-quick-grid-v16/);
assert.match(css,/crmV17 — theme controls without horizontal drift/);
assert.match(css,/overflow-x:hidden!important/);
assert.match(importer,/function commercialNoiseOnly/);
const a=importer.indexOf('function commercialNoiseOnly');
const b=importer.indexOf('\nfunction splitImportedNameDescription',a);
assert.ok(a>=0&&b>a);
const block=importer.slice(a,b);
const context={};
vm.runInNewContext(`
const text=value=>String(value??'').replace(/\\u0000/g,'').replace(/\\r/g,'').trim();
const fold=value=>text(value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9%]+/g,' ').trim();
function isCode(value){const v=text(value);if(v.length<2||v.length>60||/^\\d+(?:[.,]\\d+)?$/.test(v))return false;return /^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\\d|[-_.\\/])[A-Za-z0-9ÇĞİÖŞÜçğıöşü._\\/@-]+$/.test(v)||/^[A-ZÇĞİÖŞÜ]{2,8}-?[A-Z0-9._\\/-]{2,}$/i.test(v)}
${block}
globalThis.clean=cleanImportedDescription;
`,context);
assert.equal(context.clean('— 20%','ÜRÜN','MS-H280-PRO'),'');
assert.equal(context.clean('MS- — 20%','ÜRÜN','MS-H280-PRO'),'');
assert.equal(context.clean('KDV %20','ÜRÜN','A-1'),'');
assert.equal(context.clean('45.000,00 EUR 20%','ÜRÜN','A-1'),'');
assert.equal(context.clean('Maksimum hız: 1400 rpm','ÜRÜN','A-1'),'Maksimum hız: 1400 rpm');
console.log('crmV17 contracts 11/11 OK');

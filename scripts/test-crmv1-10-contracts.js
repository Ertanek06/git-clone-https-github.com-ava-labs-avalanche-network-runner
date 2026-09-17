import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const build=JSON.parse(read('BUILD_INFO.json'));
const products=read('src/routes/products.js'),settings=read('src/routes/settings.js'),layout=read('views/layout.ejs'),theme=read('views/settings/theme.ejs'),preview=read('views/products/preview.ejs'),quotes=read('views/quotes/index.ejs'),css=read('public/css/crmv1.10.css'),js=read('public/js/crmv1.10.js'),assets=read('scripts/build-assets.js');
assert.equal(build.package,'crmv1.45');assert.equal(build.build,'crmv1.45');assert.equal(build.release,'v3.8.57-crmv1.45-web-import-upsert-ui-document-fix');
assert.match(products,/allBatch\s*=\s*120/);assert.match(products,/\/list-fragment/);assert.doesNotMatch(products,/showAll\s*\?\s*db\.prepare\(`SELECT \* FROM products WHERE \$\{where\} ORDER BY \$\{order\}`\)\.all/);
assert.ok(layout.indexOf('assetBundle.styles')<layout.indexOf('activeThemeCssV373'),'active theme CSS must load after the compiled stylesheet');
// crmv1.46 — Bu sözleşme eskiden /theme.css içindeki !important kural bloğunun
// METNİNİ doğruluyordu; o blok üretilip hiçbir yere gönderilmiyordu, yani
// sözleşme ölü kodu koruyordu. Aynı niyet (aktif tema son görsel otoritedir)
// artık mekanizmanın kendisinden doğrulanır ve kural daha sıkıdır:
// uç nokta YALNIZCA token yayımlayabilir, override zinciri geri getirilemez.
assert.match(settings,/--ds-bg:/);assert.match(settings,/--ds-surface:/);assert.match(settings,/--ds-ink:/);assert.match(settings,/--ds-line:/);
assert.match(settings,/\.send\(`:root\{\$\{root\};\$\{dsTokens\}\}/,'theme.css yalnızca token + özel CSS göndermelidir');
assert.equal(settings.split('!important').length-1,2,'/theme.css yeniden !important override bloğu üretmemelidir (yalnızca iki açıklama satırı geçer)');
for(const key of ['minimal-white','glass-panel','red-line','paket-erp','sidebar-card','technical-panel','dark-executive','gradient-pro','classic-office','neumorph-drawer'])assert.match(css,new RegExp(`data-sidebar-style="${key}"`));
assert.match(theme,/data-theme-section-toggle/);assert.match(js,/is-collapsed-v110/);assert.match(js,/requestIdleCallback/);assert.match(js,/\/products\/list-fragment/);
assert.doesNotMatch(preview,/data-product-price-head/);assert.doesNotMatch(preview,/data-product-price-summary-v13/);assert.match(preview,/data-product-preview-delete/);assert.match(preview,/name="stock_qty"/);assert.match(preview,/Ürün başarıyla güncellendi/);assert.match(products,/preview-archive\/\:id/);
assert.match(quotes,/slice\(0,3\)/);assert.match(css,/quote-customer-column-v110/);assert.match(css,/actions-cell/);
assert.match(assets,/crmv1\.10\.css/);assert.match(assets,/crmv1\.10\.js/);
console.log('CRMV1_10_CONTRACTS=OK');

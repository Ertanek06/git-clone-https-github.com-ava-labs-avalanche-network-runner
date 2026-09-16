import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const layout = read('views/layout.ejs');
const css = read('public/css/mobile-lists-v3823.css');
const products = read('views/products/index.ejs');
const customers = read('views/customers/index.ejs');
const quotes = read('views/quotes/index.ejs');
const assetBuild = read('scripts/build-assets.js');

assert.match(layout, /assetBundle\.styles/);
assert.match(assetBuild, /mobile-lists-v3823\.css/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /product-table tbody tr\.previewable-list-row[\s\S]*grid-template-columns: 50px minmax\(0, 1fr\) max-content max-content/);
assert.match(css, /customer-table tbody tr\.previewable-list-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) max-content/);
assert.match(css, /quotes-table tbody tr\.previewable-list-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) max-content max-content/);
assert.match(css, /product-table \.thumb img[\s\S]*object-fit: contain/);
assert.match(css, /product-table \.table-action\.is-preview[\s\S]*display: none/);
assert.match(products, /is-mobile-delete mobile-list-only[\s\S]*formaction="\/products\/bulk-delete"/);
assert.match(customers, /is-mobile-delete mobile-list-only[\s\S]*formaction="\/customers\/bulk-delete"/);
assert.match(quotes, /is-mobile-delete mobile-list-only[\s\S]*formaction="\/quotes\/<%=qt\.id%>\/delete"/);
assert.doesNotMatch(css.split('@media (max-width: 760px)')[0], /\.product-table tbody tr\.previewable-list-row/);

console.log('v3.8.25 mobile single-line list contracts 11/11 OK');

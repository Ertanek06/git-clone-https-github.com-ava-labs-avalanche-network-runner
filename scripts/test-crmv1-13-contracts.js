import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const build=JSON.parse(read('BUILD_INFO.json'));
const css=read('public/css/crmv1.13.css');
const js=read('public/js/crmv1.13.js');
const app=read('public/js/app.js');
const customer=read('views/customers/preview.ejs');
const print=read('views/quotes/print.ejs');
const layout=read('views/layout.ejs');
const productPreview=read('views/products/preview.ejs');
const assets=read('scripts/build-assets.js');
const update=read('scripts/update-live.sh');

assert.equal(build.package,'crmv1.45');
assert.equal(build.build,'crmv1.45');
assert.equal(build.release,'v3.8.57-crmv1.45-web-import-upsert-ui-document-fix');

assert.match(customer,/data-url="\/quotes\/<%=q\.id%>\/preview\?customer_embed=1"/);
assert.match(customer,/assetBundle\?\.styles/);
assert.match(customer,/assetBundle\?\.js/);
assert.doesNotMatch(customer,/_preview_ts/);
assert.doesNotMatch(customer,/frame\.src='about:blank'/);
assert.match(customer,/scrollIntoView\(\{behavior:'auto'/);

assert.match(js,/crm:quote-preview-ready-v114/);
assert.match(js,/print-pagination-ready/);
assert.match(js,/style\.setProperty\('zoom',String\(scale\),'important'\)/);
assert.match(js,/overflow-y','auto','important'/);
assert.match(js,/frame\.setAttribute\('scrolling','yes'\)/);
assert.doesNotMatch(js,/_preview_retry_v113/);
assert.doesNotMatch(js,/setTimeout\([\s\S]*8000/);
assert.doesNotMatch(js,/postMessage\(\{type:messageType,height/);

assert.match(css,/#customerInlinePreviewFrame[\s\S]*overflow:auto!important/);
assert.match(css,/\.customer-inline-preview:not\(\[hidden\]\)[\s\S]*height:100dvh!important/);
assert.match(css,/#customerInlinePreviewFrame[\s\S]*height:100%!important/);
assert.doesNotMatch(css,/visibility:hidden!important/);
assert.match(css,/is-preview-loading-v113[\s\S]*content:none!important/);

assert.doesNotMatch(app,/_preview_ts/);
assert.doesNotMatch(app,/closePreview=.*about:blank/);
assert.match(app,/currentUrl!==next\.href/);
assert.match(print,/assetBundle\?\.printJs/);
assert.match(assets,/const printJs = \["print-paginator\.js", "crmv1\.13\.js"\]/);
assert.match(layout,/meta name="crm-build" content="crmv1.45"/);
assert.match(layout,/&amp;b=crmv1.45/);
assert.match(productPreview,/meta name="crm-build" content="crmv1.45"/);
assert.match(productPreview,/&amp;b=crmv1.45/);
assert.match(update,/EXPECTED_RELEASE=v3.8.57-crmv1.45-web-import-upsert-ui-document-fix EXPECTED_BUILD=crmv1.45/);

console.log('crmv1.45 preview contracts: ok');

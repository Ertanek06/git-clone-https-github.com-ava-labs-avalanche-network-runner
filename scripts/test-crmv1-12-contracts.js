import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const build=JSON.parse(read('BUILD_INFO.json'));
const css=read('public/css/crmv1.12.css');
const js=read('public/js/crmv1.12.js');
const print=read('views/quotes/print.ejs');
const layout=read('views/layout.ejs');
const assets=read('scripts/build-assets.js');
const fallback=read('src/services/asset-manifest.service.js');
const update=read('scripts/update-live.sh');

assert.equal(build.package,'crmv1.45');
assert.equal(build.build,'crmv1.45');
assert.equal(build.release,'v3.8.57-crmv1.45-web-import-upsert-ui-document-fix');

assert.match(css,/#globalPreviewModal\.is-quote-preview-v112 \.preview-modal__card/);
assert.match(css,/height:100dvh!important/);
assert.match(css,/#globalPreviewModal\.is-quote-preview-v112 #globalPreviewFrame[\s\S]*touch-action:pan-x pan-y!important/);
assert.match(css,/#globalPreviewModal\.is-quote-preview-v112 \.preview-modal__actions[\s\S]*display:flex!important/);
assert.match(css,/overflow-x:auto!important/);

assert.match(js,/\/quotes\\\/\[\^\/\]\+\\\/preview/);
assert.match(js,/is-quote-preview-v112/);
assert.match(js,/frame\.setAttribute\('scrolling','yes'\)/);
assert.doesNotMatch(js,/print-pagination-ready/);
assert.doesNotMatch(js,/style\.setProperty\('zoom'/);

assert.match(print,/assetBundle\?\.printJs/);
assert.match(assets,/"crmv1\.12\.css"/);
assert.match(assets,/"crmv1\.12\.js"/);
assert.match(layout,/meta name="crm-build" content="crmv1.45"/);
assert.match(layout,/settings\/theme\.css\?v=<%=ui\.updated_at\|\|'default'%>&amp;b=crmv1.45/);
assert.match(fallback,/styles\s*:\s*"\/public\/css\/app\.css"/);
assert.match(fallback,/print\s*:\s*"\/public\/css\/print\.css"/);
assert.match(fallback,/js\s*:\s*"\/public\/js\/app\.js"/);
assert.match(update,/EXPECTED_RELEASE=v3.8.57-crmv1.45-web-import-upsert-ui-document-fix EXPECTED_BUILD=crmv1.45/);

console.log('crmv1.12 contracts: ok');

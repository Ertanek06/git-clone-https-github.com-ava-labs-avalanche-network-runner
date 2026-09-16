import assert from "node:assert/strict";
import fs from "node:fs";

const read=(file)=>fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const build=JSON.parse(read("BUILD_INFO.json"));
const css=read("public/css/crmv1.5.css");
const layout=read("views/layout.ejs");
const quoteForm=read("views/quotes/form.ejs");
const quoteJs=read("public/js/quote-form.js");
const quoteService=read("src/services/quote.service.js");
const migration=read("src/db/migrate.js");
const print=read("views/quotes/print.ejs");
const templateHtml=read("src/services/template-html.service.js");
const install=read("KURULUM_KOMUTU.txt");
const assetBuild=read("scripts/build-assets.js");

assert.equal(pkg.version,"3.8.57");
assert.equal(build.build,"crmv1.45");
assert.equal(build.release,"v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");
assert.ok(assetBuild.indexOf("crmv1.5.css")>assetBuild.indexOf("crmv1.4.css"));
assert.match(css,/tbody td\[class\]\{display:block!important;width:100%!important/);
assert.match(css,/pill--date[\s\S]*pill--time[\s\S]*pill--currency/);
assert.match(css,/\.quote-product-picker\.is-open\{position:fixed!important/);
assert.match(quoteJs,/function ensurePickerShell\(query=''/);
assert.match(quoteJs,/pickerAbort=new AbortController\(\)/);
assert.match(quoteJs,/data-picker-results/);
assert.doesNotMatch(quoteJs,/portal\.innerHTML=`<div class="quote-product-picker__state">\$\{esc\(L\.loading\)\}<\/div>`/);
assert.match(quoteForm,/name="quote_discount_type"/);
assert.match(quoteForm,/name="quote_discount_value"/);
assert.match(quoteService,/calcQuote\(items\s*=\s*\[\]\s*,\s*quoteDiscount\s*=\s*\{\}\)/);
assert.match(quoteService,/quote_discount_type=\?,quote_discount_value=\?,quote_discount_total=\?/);
assert.match(migration,/ensureColumn\(["']quotes["']\s*,\s*["']quote_discount_total["']\s*,\s*["']REAL NOT NULL DEFAULT 0["']\)/);
assert.match(print,/hasLineDiscount=\(row\.items\|\|\[\]\)\.some/);
assert.match(print,/class="print-discount-col" <%=hasLineDiscount\?'':'hidden'%>/);
assert.match(templateHtml,/const discountHead\s*=\s*hasLineDiscount\s*\?/);
assert.match(install,/EXPECTED_VERSION=3.8.57[\s\S]*EXPECTED_BUILD=crmv1.45/);

console.log("CRMV15_CONTRACTS=20/20 OK");

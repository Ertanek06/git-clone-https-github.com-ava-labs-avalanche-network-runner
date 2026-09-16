import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const layout = read("views/layout.ejs");
const quoteJs = read("public/js/quote-form.js");
const productRoute = read("src/routes/products.js");
const paginator = read("public/js/print-paginator.js");
const printCss = read("public/css/print.css");
const mobileCss = read("public/css/crmv1.4.css");
const install = read("KURULUM_KOMUTU.txt");
const assetBuild = read("scripts/build-assets.js");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.package,"crmv1.45");
assert.equal(build.build,"crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");
assert.ok(assetBuild.indexOf("crmv1.4.css") > assetBuild.indexOf("crmv1.3.css"));
assert.match(productRoute, /ORDER BY COALESCE\(updated_at,created_at\) DESC,created_at DESC/);
assert.match(productRoute, /productLikelihood\(a, needle\) - productLikelihood\(b, needle\)/);
assert.match(quoteJs, /Math\.max\(280,window\.innerWidth-20\)/);
assert.doesNotMatch(quoteJs, /Math\.max\(560,window\.innerWidth-24\)/);
assert.match(quoteJs, /data-picker-search/);
assert.match(quoteJs, /Ürün kodu veya adıyla ara/);
assert.match(paginator, /function appendPriceAndFinalAtomic/);
assert.match(paginator, /function appendAtomicFinalBlock/);
assert.match(printCss, /\.final-page-block--with-totals\{[^}]*page-break-before:auto!important/);
assert.match(mobileCss, /#sidebar\.sidebar\.is-open\{transform:translateX\(0\)!important\}/);
assert.match(mobileCss, /table\.quote-items--v90\{display:block!important;width:100%!important;min-width:0!important/);
assert.match(mobileCss, /\.quote-product-picker\{left:10px!important;right:auto!important;width:calc\(100vw - 20px\)!important/);
assert.match(install, /crmv1.45\.zip/);
assert.match(install, /rm\s+-rf\s+\/home\/arteva\/crmv1.45/);
assert.equal(pkg.overrides["brace-expansion"], "2.1.4");

console.log("CRMV14_CONTRACTS=20/20 OK");

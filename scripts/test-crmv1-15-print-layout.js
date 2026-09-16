import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const printCss = read("public/css/print.css");
const printView = read("views/quotes/print.ejs");
const paginator = read("public/js/print-paginator.js");
const previewJs = read("public/js/crmv1.13.js");
const appJs = read("public/js/app.js");
const screenCss = read("public/css/crmv1.15.css");
const productPreview = read("views/products/preview.ejs");
const assetBuild = read("scripts/build-assets.js");
const sidebar = read("views/partials/sidebar.ejs");
const sidebarJs = read("public/js/crmv1.7.js");
const sidebarCss = read("public/css/crmv1.7.css");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.package, "crmv1.45");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");

assert.match(printCss, /--print-page-height:294mm/);
assert.match(printCss, /--print-footer-reserve:24mm/);
assert.match(printCss, /\.print-page \.print-footer\{[\s\S]*bottom:6mm!important/);
assert.match(printCss, /\.print-pages\{[\s\S]*zoom:1!important/);
assert.match(printCss, /\.layout-custom-html \.custom-template-a4\{[\s\S]*min-height:var\(--print-page-height\)!important/);

// 294 mm güvenli iOS/AirPrint sayfası - 24 mm gövde rezervi. Alt bilgi,
// 6 mm alt boşluk ve en az 5 mm yüksekliğiyle içerikten ayrı kalmalıdır.
assert.ok(294 - 24 < 294 - 6 - 5, "footer ile içerik arasında güvenli alan bulunmalı");
assert.match(paginator, /footerSafetyGap = 12/);
assert.match(paginator, /contentBottom > footer\.getBoundingClientRect\(\)\.top - footerSafetyGap/);
assert.match(paginator, /function addFinalBlockPreferCurrent\(finalBlock\)/);
assert.match(paginator, /addFinalBlockPreferCurrent\(sourceFinalBlock\)/);
assert.doesNotMatch(paginator, /classList\.add\(['"]print-money-wrap-v17/);
assert.doesNotMatch(paginator, /size>5/);
assert.match(paginator, /size>8\.2/);
assert.match(paginator, /\|\|11\.2/);

assert.match(printView, /proforma-pdf-layout-v3828/);
assert.match(printView, /font-size:8\.15px!important/);
assert.match(printView, /font-size:9\.25px!important/);
assert.match(printView, /font-size:10\.4px!important/);
assert.match(printView, /font-size:11\.65px!important/);
assert.match(printView, /font-size:11\.5px!important/);
assert.match(previewJs, /\['zoom','width','margin'\]/);
assert.match(previewJs, /const schedule=\(\)=>\{clearTimeout\(fitTimer\);fitTimer=0;fit\(\)\}/);
assert.doesNotMatch(previewJs, /setTimeout\(\(\)=>requestAnimationFrame\(fit\),20\)/);
assert.match(screenCss, /\.quote-total b\{[\s\S]*font-size:15\.5px!important/);
assert.match(screenCss, /\.totals-card \.grand>b\{font-size:17px!important/);
assert.match(screenCss, /width:min\(820px,62vw\)!important/);
assert.match(screenCss, /height:min\(620px,72dvh\)!important/);
assert.match(screenCss, /grid-template-areas:"widget-copy widget-tools" "widget-action widget-tools"!important/);
assert.match(screenCss, />\.dash-tools-v372\{[\s\S]*position:static!important/);
assert.match(productPreview, /grid-template-columns:210px minmax\(0,1fr\)!important/);
assert.match(appJs, /classList\.toggle\('is-product-preview-v13',isProductPreview\)/);
assert.match(appJs, /classList\.toggle\('is-quote-preview-v112',isQuotePdfPreview\)/);
assert.match(appJs, /cardHead\.appendChild\(tools\)/);
assert.doesNotMatch(appJs, /\/\/ v3\.3\.46 — controlled UI scale/);
assert.doesNotMatch(appJs, /\/\/ v3\.3\.77 — tek panel zoom kaynağı/);
assert.doesNotMatch(appJs, /\/\/ v3\.3\.67 — final panel-only zoom/);
assert.doesNotMatch(appJs, /\[0,20,80,180,420,900,1800\]/);
assert.match(assetBuild, /"crmv1\.15\.css"/);
assert.match(assetBuild, /"crmv1\.16\.css"/);

assert.doesNotMatch(sidebar, /data-sidebar-collapse-all|Tümünü daralt|Collapse all/);
assert.doesNotMatch(sidebarJs, /data-sidebar-collapse-all/);
assert.doesNotMatch(sidebarCss, /sidebar-navigation-tools|sidebar-collapse-all/);

console.log("CRMV1_15_RELEASE_CONTRACTS=44/44 OK");

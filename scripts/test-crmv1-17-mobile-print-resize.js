import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));

const pkg = json("package.json");
const build = json("BUILD_INFO.json");
const config = read("src/config.js");
const printCss = read("public/css/print.css");
const paginator = read("public/js/print-paginator.js");
const previewCss = read("public/css/crmv1.16.css");
const previewJs = read("public/js/crmv1.16.js");
const productPreview = read("views/products/preview.ejs");
const compactProductCss = read("public/css/crmv1.10.css");
const templateView = read("views/templates/index.ejs");
const templateModal = read("public/js/template-modal.js");
const templateRoutes = read("src/routes/templates.js");
const templateLibrary = read("src/services/template-library.service.js");
const quoteRender = read("src/services/quote-render.service.js");
const migrations = read("src/db/migrate.js");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.package, "crmv1.45");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");
assert.match(config, /v3.8.57-crmv1.45-web-import-upsert-ui-document-fix/);

assert.match(printCss, /--print-page-height:294mm/);
assert.match(
  printCss,
  /\.layout-custom-html \.custom-template-a4\{[\s\S]*?height:var\(--print-page-height\)!important;[\s\S]*?max-height:var\(--print-page-height\)!important;[\s\S]*?overflow:hidden!important/
);
assert.match(
  printCss,
  /\.layout-custom-html \.manual-footer\{[\s\S]*?position:absolute!important;[\s\S]*?bottom:6mm!important;[\s\S]*?page-break-inside:avoid!important/
);
assert.match(paginator, /function removeFooterOnlyPages\(\)/);
assert.match(paginator, /function addFinalBlockPreferCurrent\(finalBlock\)/);
assert.match(paginator, /removeFooterOnlyPages\(\);/);

assert.match(previewCss, /\.preview-layout-resizer-v20/);
assert.match(previewCss, /resize:\s*none\s*!important/);
assert.match(productPreview, /product-inline-description-v133/);
assert.match(productPreview, /resize:vertical!important/);
assert.match(previewJs, /window\.addEventListener\("pointermove"/);
assert.match(previewJs, /window\.addEventListener\("mousemove"/);
assert.match(previewJs, /crm-preview-layout-v21/);
assert.doesNotMatch(previewJs, /--preview-width-v16/);
assert.match(productPreview, /data-resizable-description/);
assert.match(productPreview, /const fitDescription=/);
assert.match(productPreview, /description\?\.addEventListener\('input',fitDescription\)/);
assert.doesNotMatch(compactProductCss, /product-preview-editor-v20__form textarea\{height:82px!important/);

assert.match(templateView, /data-template-fullscreen/);
assert.match(templateView, /id="tplTitleVariant"/);
assert.match(templateView, /id="tplTotalsVariant"/);
assert.match(templateView, /id="tplFooterVariant"/);
assert.match(templateView, /id="tplSpacingVariant"/);
assert.match(templateView, /id="tplTableDensity"/);
assert.match(templateView, /id="tplImageVariant"/);
assert.match(templateView, /data-template-preview-zoom/);
assert.match(previewCss, /is-fullscreen-v17/);
assert.match(previewCss, /height:\s*clamp\(760px,\s*78vh,\s*1120px\)\s*!important/);
assert.match(templateModal, /crm-template-studio-fullscreen-v17/);
assert.match(templateModal, /setPreviewFocus/);
assert.match(templateModal, /tplTotalsVariant: "totals_variant"/);
assert.match(templateRoutes, /design_version: structuralEnabled \? 2 : 1/);
assert.match(templateRoutes, /\/live-preview/);
assert.match(templateRoutes, /\["right", "band", "cards", "full"\]/);
assert.match(quoteRender, /design-totals-\$\{design\.totals\}/);
assert.match(quoteRender, /design-footer-\$\{design\.footer\}/);

assert.match(templateLibrary, /export const builtInTemplateKeys/);
assert.match(templateLibrary, /"silver-executive"/);
assert.match(templateLibrary, /"skyline-blue"/);
assert.match(templateLibrary, /"clean-lab-plus"/);
assert.doesNotMatch(templateLibrary, /featuredTemplateKeys/);
assert.doesNotMatch(templateLibrary, /!used\)[\s\S]{0,100}deleted_at/);
assert.match(migrations, /\[\s*46,[\s\S]*?builtInTemplateKeys/);

console.log("crmv1.45 mobile print, resize and template studio contracts: ok");

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const productRoute = read("src/routes/products.js");
const customerRoute = read("src/routes/customers.js");
const templateRoute = read("src/routes/templates.js");
const templateLibrary = read("src/services/template-library.service.js");
const quoteRender = read("src/services/quote-render.service.js");
const migration = read("src/db/migrate.js");
const app = read("public/js/app.js");
const preview = read("public/js/crmv1.16.js");
const css = read("public/css/crmv1.16.css");
const printCss = read("public/css/print.css");
const productPreview = read("views/products/preview.ejs");
const customerPreview = read("views/customers/preview.ejs");
const quoteList = read("views/quotes/index.ejs");
const templates = read("views/templates/index.ejs");
const templateModal = read("public/js/template-modal.js");
const assets = read("scripts/build-assets.js");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.package, "crmv1.45");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");

assert.match(migration, /45,[\s\S]*product_price_history/);
assert.match(productRoute, /recordProductPriceChange/);
assert.match(productRoute, /\/:id\/price-adjust/);
assert.match(productRoute, /COUNT\(DISTINCT q\.id\)/);
assert.match(productPreview, /data-product-price-adjust/);
assert.match(productPreview, /data-product-price-revert/);
assert.match(productPreview, /data-product-usage-list/);
assert.match(productPreview, /Eski fiyat/);

assert.match(preview, /crm-preview-layout-v21/);
assert.match(preview, /ResizeObserver/);
assert.match(preview, /pointerdown/);
assert.match(preview, /stopImmediatePropagation/);
assert.match(preview, /window\.addEventListener\("pointermove"/);
assert.match(preview, /window\.addEventListener\("mousemove"/);
assert.match(css, /resize:\s*none\s*!important/);
assert.match(css, /width:\s*760px\s*!important/);
assert.doesNotMatch(preview, /--preview-width-v16/);
assert.match(css, /preview-layout-delete-v16/);
assert.match(app, /normalizePaste/);
assert.match(app, /Math\.round\(window\.innerHeight\*1\.35\)/);

assert.match(customerRoute, /\/:id\/preview-update/);
assert.match(customerPreview, /data-customer-inline-editor/);
assert.match(customerPreview, /data-customer-card-form/);
assert.match(quoteList, /Müşteri Kimlik Kartı/);
assert.match(quoteList, /\/customers\/<%=qt\.customer_id%>\/preview/);

for (const token of [
  "header_variant",
  "customer_variant",
  "item_variant",
  "terms_variant",
  "bank_variant",
  "signature_variant",
  "border_style",
  "logo_position"
]) {
  assert.match(templateRoute, new RegExp(token));
  assert.match(templates, new RegExp(token));
}
assert.match(templateLibrary, /builtInTemplateKeys/);
assert.match(templateLibrary, /restoreLegacyTemplateLibrary/);
assert.match(templates, /templateStudioDeleteForm/);
assert.match(templateModal, /fetch\("\/templates\/live-preview"/);
assert.match(templates, /sandbox="allow-scripts allow-same-origin"/);
assert.doesNotMatch(templateModal, /const structured\s*=/);
assert.match(quoteRender, /templateDesignClass/);
assert.match(printCss, /design-head-sidebar/);
assert.match(printCss, /design-items-cards/);
assert.match(printCss, /design-terms-timeline/);
assert.match(printCss, /design-bank-cards/);
assert.match(printCss, /design-signature-approval/);
assert.match(css, /dashboard-widget-manager-head-v18/);
assert.match(assets, /"crmv1\.16\.css"/);
assert.match(assets, /"crmv1\.16\.js"/);

console.log("CRMV1_16_PREVIEW_TEMPLATE_STUDIO_CONTRACTS=58/58 OK");

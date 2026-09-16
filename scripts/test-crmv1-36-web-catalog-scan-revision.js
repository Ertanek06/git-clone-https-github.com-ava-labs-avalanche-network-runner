import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const routes = read("src/routes/products.js");
const quotes = read("src/routes/quotes.js");
const service = read("src/services/web-product-import.service.js");
const jobs = read("src/services/web-product-import-job.service.js");
const worker = read("src/workers/web-product-import.worker.js");
const page = read("views/products/import-web.ejs");
const scan = read("views/products/import-web-scan.ejs");
const preview = read("views/products/import-web-preview.ejs");
const js = read("public/js/web-import-v37.js");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");
assert.match(page, /Sitedeki Tüm Ürünleri Tara/);
assert.match(page, /Ana sayfa adresi/);
assert.match(page, /Tarama arka planda çalışır/);
assert.match(routes, /\/import-web\/scan/);
assert.match(routes, /web-product-import\.worker\.js/);
assert.match(routes, /readWebImportRows/);
assert.match(scan, /webScanProgress/);
assert.match(preview, /Ürün Kontrol Tablosu/);
assert.match(preview, /Ürün Kodu/);
assert.match(preview, /Ürün Adı \/ Açıklama Ön İzleme/);
assert.match(preview, /Detay \/ Düzenle/);
assert.match(js, /setInterval\(poll,1100\)/);
assert.match(jobs, /web-product-import-jobs/);
assert.match(worker, /discoverAllProductUrls/);
assert.match(service, /export async function discoverAllProductUrls/);
assert.match(service, /robotsSitemaps/);
assert.match(service, /sitemap_index\.xml/);
assert.match(quotes, /DRAFT: new Set\(\["PREPARING", "SENT", "WAITING_CUSTOMER", "REVISION_REQUESTED"/);
assert.match(quotes, /PREPARING: new Set\(\["DRAFT", "SENT", "WAITING_CUSTOMER", "REVISION_REQUESTED"/);

assert.match(service, /for \(let i = 0; i < lines\.length; i\+\+\) \{[\s\S]*sectionStartMarkers/);
assert.match(service, /candidates\.sort\(\(a, b\) => b\.score - a\.score\)/);
assert.match(service, /en dolu içerik bloğunu seçmek/);

console.log("CRMV1.36_WEB_CATALOG_SCAN_REVISION=27/27 OK");

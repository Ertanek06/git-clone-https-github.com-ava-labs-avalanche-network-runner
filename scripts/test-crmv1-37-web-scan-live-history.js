import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const routes = read("src/routes/products.js");
const service = read("src/services/web-product-import.service.js");
const worker = read("src/workers/web-product-import.worker.js");
const page = read("views/products/import-web.ejs");
const scan = read("views/products/import-web-scan.ejs");
const history = read("views/products/import-web-history.ejs");
const js = read("public/js/web-import-v37.js");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");

assert.match(routes, /webImportHistoryRows/);
assert.match(routes, /open_url/);
assert.match(routes, /\/import-web\/scan\/:jobId\/cancel/);
assert.match(routes, /reconcileWebImportJob/);
assert.match(routes, /Tarama 3 dakikadan uzun süredir yeni veri üretemediği için durduruldu/);
assert.match(routes, /sitemap_valid: looksLikeSitemapUrl/);

assert.match(service, /export function looksLikeSitemapUrl/);
assert.match(service, /Promise\.all\(batch\.map/);
assert.match(service, /probeProductCandidates/);
assert.match(service, /Sitemap'leri tek tek 16 saniye beklemek yerine kontrollü paralel partiler halinde tarar/);
assert.match(service, /Ana sayfa ve kategori sayfaları her durumda taranır/);

assert.match(worker, /writeWebImportRows\(jobId, allRows\);/);
assert.match(worker, /recentProducts/);
assert.match(worker, /lastProduct/);
assert.match(worker, /analysisCursor/);
assert.match(worker, /batchSize = 36/);
assert.match(worker, /progress: null/);

assert.match(scan, /Canlı bulunan ürünler/);
assert.match(scan, /webLiveTrack/);
assert.match(scan, /Tarama Geçmişi/);
assert.match(scan, /Bu sayfadan çıkabilirsiniz/);
assert.match(scan, /Kontrol Tablosunu Aç/);
assert.match(js, /renderRecent/);
assert.match(js, /setInterval\(poll,1100\)/);
assert.match(js, /webLiveNext/);
assert.doesNotMatch(js, /window\.location\.replace\("\/products\/import-web\/scan/);

assert.match(history, /Canlı Durumu Aç/);
assert.match(history, /Sonuçları Aç/);
assert.match(history, /Taramayı Durdur|Durdur/);
assert.match(history, /İşlem devam ediyor/);
assert.match(history, /Bulunan \/ Analiz/);

assert.match(page, /Tedarikçi Ürün Kataloğu/);
assert.match(page, /ornek-site\.com/);
assert.match(page, /Tüm Geçmişi Aç/);
assert.match(page, /Canlı Durumu Aç/);
assert.doesNotMatch(page, /placeholder="Örn\. ArtLab Market"/);
assert.doesNotMatch(page, /placeholder="https:\/\/www\.artlabmarket\.com/);

console.log("CRMV1.37_WEB_SCAN_LIVE_HISTORY=44/44 OK");

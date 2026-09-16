import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { variantAwareDescription } from "../src/services/web-product-variant.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const profiles = read("src/routes/profiles.js");
const upload = read("src/middleware/upload.js");
const profileForm = read("views/profiles/form.ejs");
const products = read("src/routes/products.js");
const worker = read("src/workers/web-product-import.worker.js");
const history = read("views/products/import-web-history.ejs");
const report = read("docs/CRMV1.40_RELEASE_REPORT.md");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.package, "crmv1.45");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");
assert.match(report, /Baz paket:[\s\S]*crmv1\.39/);
assert.match(report, /crmv1\.35 veya daha eski bir paketten türetilmemiştir/i);

// crmv1.39 içindeki yeni web tarama/geçmiş altyapısı korunmalı.
assert.match(products, /\/import-web\/scan/);
assert.match(products, /web-product-import\.worker\.js/);
assert.match(worker, /discoverAllProductUrls/);
assert.match(history, /web-history-progress/);

// Firma profili görsel yükleme/silme hataları genel hata sayfasına düşmemeli.
assert.match(profiles, /profileUploadGuard/);
assert.match(profiles, /cleanupUploadedFiles/);
assert.match(profiles, /JPG, JPEG, JFIF, PNG, WEBP, GIF veya AVIF/);
assert.match(profileForm, /formenctype="application\/x-www-form-urlencoded" formnovalidate name="asset" value="logo"/);
assert.match(profileForm, /formenctype="application\/x-www-form-urlencoded" formnovalidate name="asset" value="stamp"/);
assert.match(profileForm, /\.jfif/);
assert.match(profileForm, /\.avif/);
assert.match(upload, /image\/pjpeg/);
assert.match(upload, /image\/x-png/);
assert.match(upload, /GIF87a/);
assert.match(upload, /avif\|avis/);

// Başlık 120 cm ise, 120'ye ait başlık ve özellik bloğu birebir korunmalı.
const exact = [
  "GENEL ÜRÜN BİLGİSİ",
  "Bu seri 90, 120 ve 150 cm seçenekleriyle üretilir.",
  "90 CM ÖZELLİKLERİ",
  "Model AEÇOD90",
  "Çalışma genişliği 88 cm",
  "Fan 800 m³/h",
  "120 CM ÖZELLİKLERİ",
  "TEKNİK ÖZELLİKLER",
  "Model AEÇOD120",
  "Kabin Ölçüsü 118 x 60 x 90 cm",
  "Dış Ölçü 120 x 75 x 230 cm",
  "Fan 1080 – 2300 m³/h",
  "Çalışma yüksekliği 90 cm",
  "150 CM ÖZELLİKLERİ",
  "Model AEÇOD150",
  "Fan 3000 m³/h"
].join("\n");
const focused = variantAwareDescription(exact, "Arteva Çeker Ocak Dolaplı 120 cm");
assert.equal(focused.variant.status, "MATCHED");
assert.ok(focused.variant.confidence >= 0.99);
assert.ok(focused.description.startsWith("120 CM ÖZELLİKLERİ"));
assert.match(focused.description, /TEKNİK ÖZELLİKLER/);
assert.match(focused.description, /Model AEÇOD120/);
assert.match(focused.description, /Kabin Ölçüsü 118 x 60 x 90 cm/);
assert.match(focused.description, /Dış Ölçü 120 x 75 x 230 cm/);
assert.match(focused.description, /Çalışma yüksekliği 90 cm/);
assert.doesNotMatch(focused.description, /90 CM ÖZELLİKLERİ/);
assert.doesNotMatch(focused.description, /AEÇOD90/);
assert.doesNotMatch(focused.description, /150 CM ÖZELLİKLERİ/);
assert.doesNotMatch(focused.description, /AEÇOD150/);
assert.match(focused.variant.note, /başlık ve özellik bloğu birebir korundu/);

// Ayrı varyant başlığı yoksa crmv1.39 fallback davranışı bozulmamalı.
const fallback = variantAwareDescription("TEKNİK BİLGİLER\nModel A120\nGüç 500 W", "Cihaz 120 cm");
assert.match(fallback.description, /Güç 500 W/);

console.log("CRMV1.40_CURRENT_BASE_HOTFIX=36/36 OK");

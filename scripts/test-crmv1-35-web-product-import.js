import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { targetVariantTokens, variantAwareDescription } from "../src/services/web-product-variant.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const routes = read("src/routes/products.js");
const sidebar = read("views/partials/sidebar.ejs");
const page = read("views/products/import-web.ejs");
const preview = read("views/products/import-web-preview.ejs");
const migration = read("src/db/migrate.js");
const service = read("src/services/web-product-import.service.js");
const variantModule = read("src/services/web-product-variant.js");
const install = read("scripts/install-test.sh");
const seed = read("src/db/seed.js");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");
assert.match(routes, /\/import-web/);
assert.match(routes, /web_import: true/);
assert.match(routes, /webImport \? text\(row\.name\) : upperTr\(row\.name\)/);
assert.match(routes, /webImport && prior \? num\(prior\.purchase_price\)/);
assert.match(sidebar, /Web Sitesinden Ürün Aktar/);
assert.match(page, /Bir Sitenin Tüm Ürünlerini Tara/);
assert.match(page, /Tedarikçi Ürün Kataloğu/);
assert.doesNotMatch(page, /placeholder="Örn\. ArtLab Market"/);
assert.match(preview, /Ürün Kontrol Tablosu/);
assert.match(preview, /Görseli CRM'e indir/);
assert.match(migration, /web_product_sources/);
assert.match(migration, /web_product_import_history/);
assert.match(service, /downloadProductImage/);
assert.match(service, /config\.publicUploadDir/);
assert.match(variantModule, /rakip ölçü\/model blokları ayıklandı/);
assert.match(install, /DATABASE_FILE=\$SHARED\/data\/crm-erp\.sqlite/);
assert.match(install, /PUBLIC_UPLOAD_DIR=\$SHARED\/uploads/);
assert.match(install, /Canlı DATABASE_FILE shared veritabanını göstermiyor/);
assert.match(seed, /mevcut kullanıcı korundu/);

const description = [
  "Çeker Ocak Dolaplı 120 cm",
  "TEKNİK BİLGİLER",
  "Model AEÇOD120",
  "Kabin Ölçüsü 118 x 60 x 90 cm",
  "Dış Ölçü 120 x 75 x 230 cm",
  "Fan 1080 – 2300 m³/h",
  "Çeker Ocak Dolaplı 150 cm",
  "TEKNİK BİLGİLER",
  "Model AEÇOD150",
  "Dış Ölçü 150 x 75 x 230 cm",
  "Fan 1500 – 3000 m³/h",
  "KULLANIM ALANLARI",
  "Kimya ve Ar-Ge laboratuvarları"
].join("\n");
const focused = variantAwareDescription(description, "Arteva Çeker Ocak Dolaplı 120 cm");
assert.equal(focused.variant.status, "MATCHED");
assert.match(focused.description, /AEÇOD120/);
assert.match(focused.description, /120 x 75 x 230 cm/);
assert.match(focused.description, /TEKNİK BİLGİLER/);
assert.match(focused.description, /Kabin Ölçüsü 118 x 60 x 90 cm/);
assert.match(focused.description, /Fan 1080 – 2300 m³\/h/);
assert.doesNotMatch(focused.description, /AEÇOD150/);
assert.doesNotMatch(focused.description, /150 x 75 x 230 cm/);
assert.match(focused.description, /KULLANIM ALANLARI/);

const generic = variantAwareDescription("Teknik Bilgiler\nGüç 500 W", "Manyetik Karıştırıcı");
assert.equal(generic.variant.status, "NONE");
assert.match(generic.description, /Güç 500 W/);

console.log("CRMV1.35_WEB_PRODUCT_IMPORT_VARIANT_MATCH=34/34 OK");

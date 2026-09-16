import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { db } from "../src/db/db.js";
import { sanitizeWebProductDescription, webImportInternals } from "../src/services/web-product-import.service.js";
import { saveWebImportRows } from "../src/services/web-product-import-save.service.js";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const routes = read("src/routes/products.js");
const worker = read("src/workers/web-product-import.worker.js");
const preview = read("views/products/import-web-preview.ejs");
const client = read("public/js/web-import-v45.js");
const history = read("views/products/import-web-history.ejs");

assert.match(routes, /const selectable = !row\.ignored && !fatalError/);
assert.match(routes, /webImportUrlKey/);
assert.match(routes, /rankedProductMatches/);
assert.ok(routes.includes('r.post("/import-web/scan/:jobId/retry"'));
assert.match(routes, /retryCount < 2/);
assert.match(worker, /analysisCursor/);
assert.match(worker, /batchSize = 36/);
assert.match(worker, /readWebImportRows/);
assert.match(preview, /data-web-bulk-select="PAGE"/);
assert.match(preview, /Filtredeki Tümünü Seç/);
assert.match(preview, /webDockSelected/);
assert.match(client, /Kaydetmeden önce en az bir ürün seçin/);
assert.match(client, /webBulkState/);
assert.match(history, /Kaldığı Yerden Devam Et/);

const cleaned = sanitizeWebProductDescription([
  "TEKNİK ÖZELLİKLER",
  "Kapasite 55 L",
  "Çalışma sıcaklığı 5 °C - 250 °C",
  "WhatsApp: 0555 111 22 33",
  "www.ornek-site.com",
  "Web sitemiz üzerinden sipariş verebilirsiniz"
].join("\n"));
assert.match(cleaned, /Kapasite 55 L/);
assert.match(cleaned, /250 °C/);
assert.doesNotMatch(cleaned, /whatsapp|ornek-site|web site|sipariş/i);
assert.equal(webImportInternals.brandFromHtml('<a href="/marka/arteva">ARTEVA</a>'), "ARTEVA");

const suffix = crypto.randomBytes(6).toString("hex");
const tenantId = `tenant_web43_${suffix}`;
const productId = `prd_web43_${suffix}`;
const now = Date.now();
db.prepare("INSERT INTO tenants(id,name,slug,status,created_at,updated_at) VALUES(?,?,?,?,?,?)")
  .run(tenantId, "Web Import Test", `web-import-${suffix}`, "ACTIVE", now, now);
db.prepare(`INSERT INTO products(
  id,tenant_id,code,name,brand,model,category,short_description,technical_description,product_url,
  unit,vat_rate,sale_price,currency,status,created_at,updated_at
) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  productId, tenantId, `OLD-${suffix}`, "Eski Ürün", "ARTEVA", "A55", "Etüv",
  "WhatsApp ve web sitesi menüsü yanlışlıkla açıklamaya kaydedilmişti.", "Eski teknik açıklama",
  `https://example.com/urun/${suffix}`, "ADET", 20, 100, "TRY", "ACTIVE", now, now
);

try {
  const result = await saveWebImportRows({
    tenantId,
    rows: [{
      selected: true,
      code: `NEW-${suffix}`,
      name: "Etüv 55 Litre",
      description: "TEKNİK ÖZELLİKLER\nKapasite 55 L\nWhatsApp: 0555 000 00 00\nwww.example.com",
      brand: "",
      model: "",
      category: "",
      price: 125,
      currency: "TRY",
      unit: "ADET",
      vat_rate: 20,
      product_url: `https://example.com/urun/${suffix}?utm_source=test`,
      download_image: false,
      duplicate_action: "UPDATE"
    }]
  });
  assert.equal(result.updated, 1);
  assert.equal(result.added, 0);
  const row = db.prepare("SELECT * FROM products WHERE tenant_id=? AND id=?").get(tenantId, productId);
  assert.equal(row.code, `NEW-${suffix}`.toUpperCase());
  assert.equal(row.name, "Etüv 55 Litre");
  assert.match(row.short_description, /Kapasite 55 L/);
  assert.doesNotMatch(row.short_description, /whatsapp|example\.com/i);
  assert.equal(row.technical_description, "");
  assert.equal(row.brand, "ARTEVA");
} finally {
  db.prepare("DELETE FROM products WHERE tenant_id=?").run(tenantId);
  db.prepare("DELETE FROM tenants WHERE id=?").run(tenantId);
}

console.log("CRMV1_43_PRODUCT_WEB_IMPORT_REPAIR=30/30 OK");

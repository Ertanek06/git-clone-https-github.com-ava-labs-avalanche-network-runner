import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { db } from "../src/db/db.js";
import { brandFromTitle, sanitizeWebProductDescription } from "../src/services/web-product-import.service.js";
import { saveWebImportRows } from "../src/services/web-product-import-save.service.js";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const preview = read("views/products/import-web-preview.ejs");
const productPreview = read("views/products/preview.ejs");
const routes = read("src/routes/products.js");
const worker = read("src/workers/web-product-import-save.worker.js");
const css = read("public/css/app.css");

assert.match(preview, /data-no-collapse="1"/);
assert.doesNotMatch(preview, /web-table-disclosure|Ürünlerin Tümünü Göster|Listeyi Kapat/);
assert.match(preview, /web-table-heading/);
assert.match(preview, /web-import-v45\.js/);
assert.doesNotMatch(preview, /<style/);
assert.match(css, /stable, direct-open web import review/);
assert.match(css, /#webLiveEmpty\[hidden\]/);
assert.match(routes, /\/:id\/document\/:kind\/preview/);
assert.match(routes, /Content-Disposition", `inline/);
assert.match(productPreview, /doc\.previewUrl/);
assert.match(worker, /persistHistory\("IMPORTED", result\)/);
assert.match(routes, /jobMaxAgeMs = 30/);
assert.match(routes, /Kalıcı denetim kaydı silinmez/);

assert.equal(brandFromTitle("Arteva Çeker Ocak Dolabı 120 cm", "AEÇOBTD120"), "Arteva");
assert.equal(brandFromTitle("Dlab 3D Shaker Çalkalayıcı SK-D3309-Pro", "SK-D3309-Pro"), "Dlab");
assert.equal(brandFromTitle("Merck 104817 Potasyum Klorür 250 ml", "104817.0250"), "Merck");
assert.equal(brandFromTitle("Laboratuvar Hassas Terazisi 0.001 g", "HT-1"), "");

const cleaned = sanitizeWebProductDescription([
  "Ay Sonuna Kadar Geçerli Tüm Siparişlerde Havale/EFT Ödemelere Özel %10 Ek İndirim Fırsatını Kaçırma!",
  "WhatsApp Sipariş 0 532 344 06 85",
  "satis@artlabmarket.com",
  "Tüm Kategoriler",
  "Laboratuvar Sarf Malzemeleri",
  "Merck Potasyum Klorür 250 ml | ArtLab Market",
  "Saflık ≥ %99,5",
  "Ambalaj 250 ml"
].join("\n"), { forbiddenNames: ["ArtLab Market", "artlabmarket.com"], productTitle: "Merck Potasyum Klorür 250 ml" });
assert.match(cleaned, /Saflık/);
assert.match(cleaned, /250 ml/i);
assert.doesNotMatch(cleaned, /Ay Sonuna|WhatsApp|@|Tüm Kategoriler|ArtLab Market/i);

const suffix = crypto.randomBytes(6).toString("hex");
const tenantId = `tenant_web45_${suffix}`;
const exactId = `prd_exact_${suffix}`;
const variantId = `prd_variant_${suffix}`;
const now = Date.now();
db.prepare("INSERT INTO tenants(id,name,slug,status,created_at,updated_at) VALUES(?,?,?,?,?,?)")
  .run(tenantId, "Web 45 Test", `web45-${suffix}`, "ACTIVE", now, now);
const insertProduct = db.prepare(`INSERT INTO products(
  id,tenant_id,code,name,brand,short_description,unit,vat_rate,sale_price,currency,status,created_at,updated_at
) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
insertProduct.run(exactId, tenantId, "SK-D3309-PRO", "Eski DLAB Ürünü", "DLAB", "Eski açıklama", "ADET", 20, 100, "TRY", "ACTIVE", now, now);
insertProduct.run(variantId, tenantId, "SK-D3309-Pro", "Tekrar DLAB Ürünü", "", "Tekrar", "ADET", 20, 120, "TRY", "ACTIVE", now, now);

try {
  const result = await saveWebImportRows({
    tenantId,
    source: { name: "ArtLab Market", base_url: "https://www.artlabmarket.com" },
    rows: [
      { selected: true, code: "SK-D3309-Pro", name: "Dlab Eski Tarama", description: "Eski tarama", price: 200, currency: "TRY", download_image: false },
      { selected: true, code: "sk-d3309-pro", name: "Dlab 3D Shaker Çalkalayıcı", brand: "DLAB", description: "WhatsApp Sipariş 0 532 344 06 85\nDevir aralığı 10–70 rpm\nTaşıma kapasitesi 5 kg", price: 735, currency: "USD", unit: "ADET", download_image: false }
    ]
  });
  assert.equal(result.added, 0);
  assert.equal(result.updated, 1);
  assert.equal(result.skipped, 1);
  const active = db.prepare("SELECT * FROM products WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND UPPER(code)=?").all(tenantId, "SK-D3309-PRO");
  assert.equal(active.length, 1);
  assert.equal(active[0].code, "SK-D3309-PRO");
  assert.equal(active[0].name, "Dlab 3D Shaker Çalkalayıcı");
  assert.equal(active[0].brand, "DLAB");
  assert.equal(active[0].sale_price, 735);
  assert.equal(active[0].currency, "USD");
  assert.match(active[0].short_description, /10–70 rpm/);
  assert.doesNotMatch(active[0].short_description, /WhatsApp/i);
  const archived = db.prepare("SELECT * FROM products WHERE tenant_id=? AND id=?").get(tenantId, variantId);
  assert.equal(archived.status, "ARCHIVED");
  assert.ok(Number(archived.deleted_at) > 0);

  insertProduct.run(`prd_old_arch_${suffix}`, tenantId, "CASE-X", "Arşiv Eski", "", "", "ADET", 20, 1, "TRY", "ARCHIVED", now, now);
  db.prepare("UPDATE products SET deleted_at=? WHERE tenant_id=? AND id=?").run(now, tenantId, `prd_old_arch_${suffix}`);
  insertProduct.run(`prd_live_case_${suffix}`, tenantId, "Case-X", "Aktif Harf Farkı", "", "", "ADET", 20, 2, "TRY", "ACTIVE", now, now);
  const resurrected = await saveWebImportRows({ tenantId, rows: [{ selected: true, code: "case-x", name: "Merck Güncel Ürün", brand: "Merck", description: "Teknik değer 42 mm", price: 3, currency: "TRY", download_image: false }] });
  assert.equal(resurrected.updated, 1);
  const caseRows = db.prepare("SELECT * FROM products WHERE tenant_id=? AND UPPER(code)=?").all(tenantId, "CASE-X");
  assert.equal(caseRows.filter((row) => !Number(row.deleted_at || 0)).length, 1);
  assert.equal(caseRows.find((row) => !Number(row.deleted_at || 0)).code, "CASE-X");
} finally {
  db.prepare("DELETE FROM products WHERE tenant_id=?").run(tenantId);
  db.prepare("DELETE FROM tenants WHERE id=?").run(tenantId);
}

console.log("CRMV1_45_WEB_IMPORT_UPSERT_UI_DOCS=35/35 OK");

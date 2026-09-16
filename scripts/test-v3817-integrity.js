import assert from "node:assert/strict";
import fs from "node:fs";
import { db } from "../src/db/db.js";
import { saveContacts } from "../src/routes/customers.js";
import { sanitizeTemplateHtml } from "../src/services/template-html.service.js";
import { dataIntegrityReport } from "../src/services/data-integrity.service.js";

const source = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const now = Date.now();
for (const tenantId of ["ten_v3817_a", "ten_v3817_b"]) {
  db.prepare("INSERT OR IGNORE INTO tenants(id,name,slug,status,plan,created_at,updated_at) VALUES(?,?,?,'ACTIVE','PRO',?,?)")
    .run(tenantId, tenantId, tenantId, now, now);
}
for (const [customerId, tenantId, code] of [["cus_v3817_a", "ten_v3817_a", "V3817-A"], ["cus_v3817_b", "ten_v3817_b", "V3817-B"]]) {
  db.prepare("INSERT OR IGNORE INTO customers(id,tenant_id,code,company_name,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
    .run(customerId, tenantId, code, code, "ACTIVE", now, now);
}
db.prepare("INSERT OR REPLACE INTO customer_contacts(id,tenant_id,customer_id,full_name,role_key,status,created_at,updated_at) VALUES(?,?,?,?,?,'ACTIVE',?,?)")
  .run("cnt_v3817_stable", "ten_v3817_a", "cus_v3817_a", "ESKİ AD", "GENEL", now, now);
db.prepare("INSERT OR REPLACE INTO customer_contacts(id,tenant_id,customer_id,full_name,role_key,status,created_at,updated_at) VALUES(?,?,?,?,?,'ACTIVE',?,?)")
  .run("cnt_v3817_other", "ten_v3817_b", "cus_v3817_b", "DİĞER FİRMA", "GENEL", now, now);

saveContacts("ten_v3817_a", "cus_v3817_a", {
  contact_id: ["cnt_v3817_stable", "cnt_v3817_other"],
  contact_full_name: ["Yeni Ad", "Yeni Kişi"],
  contact_extra_title: ["Satın Alma", "Teknik"],
  contact_extra_phone: ["03120000000", ""],
  contact_extra_mobile: ["", "05320000000"],
  contact_extra_email: ["yeni@example.com", "teknik@example.com"],
  contact_role: ["SATIN ALMA", "TEKNIK"],
  contact_note: ["Korunan kimlik", ""]
}, "usr_v3817");

const stable = db.prepare("SELECT * FROM customer_contacts WHERE id=?").get("cnt_v3817_stable");
assert.equal(stable.full_name, "YENİ AD");
assert.equal(stable.customer_id, "cus_v3817_a");
assert.equal(stable.deleted_at, null);
assert.equal(db.prepare("SELECT full_name FROM customer_contacts WHERE id=?").get("cnt_v3817_other").full_name, "DİĞER FİRMA");
const ownContacts = db.prepare("SELECT * FROM customer_contacts WHERE tenant_id=? AND customer_id=? AND COALESCE(deleted_at,0)=0").all("ten_v3817_a", "cus_v3817_a");
assert.equal(ownContacts.length, 2);
assert.ok(ownContacts.some(row => row.id === "cnt_v3817_stable"));
assert.ok(ownContacts.some(row => row.id !== "cnt_v3817_other" && row.full_name === "YENİ KİŞİ"));

const clean = sanitizeTemplateHtml('<section class="ok" style="color:red" onclick="x()"><h2>Başlık</h2><script>alert(1)</script><a href="javascript:alert(1)">Bağlantı</a><img src="/public/uploads/test.png" onerror="x()"></section>');
assert.match(clean, /class="ok"/);
assert.doesNotMatch(clean, /style=|onclick=|<script|javascript:|onerror=/i);
assert.match(clean, /src="\/public\/uploads\/test\.png"/);

const report = dataIntegrityReport("ten_v3817_a");
assert.equal(typeof report.missing_files, "number");
assert.equal(typeof report.orphan_public_files, "number");
assert.equal(typeof report.broken_relations, "number");

assert.match(source("views/layout.ejs"), /assetBundle\.styles/);
assert.match(source("views/layout.ejs"), /assetBundle\.js/);
assert.match(source("scripts/build-assets.js"), /fonts-v3817\.css/);
assert.match(source("scripts/build-assets.js"), /table-preferences-v3817\.js/);
assert.match(source("views/customers/index.ejs"), /data-mobile-cards/);
assert.match(source("views/products/index.ejs"), /data-table-preferences="products"/);
assert.match(source("views/quotes/index.ejs"), /data-mobile-cards/);
assert.match(source("scripts/online-backup.js"), /ARTEVA_FULL_SYSTEM_BACKUP/);
assert.match(source("scripts/online-backup.js"), /config\.publicUploadDir/);
assert.match(source("scripts/online-backup.js"), /config\.privateUploadDir/);
assert.match(source("scripts/online-backup.js"), /aes-256-gcm/);
assert.match(source("views/partials/topbar.ejs"), /topbar-search/);

console.log("V3817_INTEGRITY_TESTS=22/22 OK");

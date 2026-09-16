import assert from "node:assert/strict";
import crypto from "node:crypto";
import { db } from "../src/db/db.js";
import {
  artevaClassicTemplate,
  currentTemplatePresets,
  ensureProfessionalTemplateLibrary,
  legacyV112TemplatePresets,
  professionalTemplatePresets,
  restoreArtevaClassicTemplate,
  restoreV112TemplateLibrary
} from "../src/services/template-library.service.js";

const sourceHash = crypto
  .createHash("sha256")
  .update(JSON.stringify(legacyV112TemplatePresets))
  .digest("hex");
assert.equal(
  sourceHash,
  "6c94c522901c4d7e76fbe0c65ec7409e5d8852c3c2328eeb1b441ced308846d3",
  "crmv1.12 içindeki 32 özgün şablon tanımı değişti"
);
assert.equal(legacyV112TemplatePresets.length, 32);
assert.equal(currentTemplatePresets.length, 12);
assert.equal(professionalTemplatePresets.length, 45);

const stamp = Date.now();
const tenantId = `tenant_template_v19_${stamp}`;
const userId = `user_template_v19_${stamp}`;
db.prepare("INSERT INTO tenants(id,name,slug,status,plan,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(
  tenantId,
  "Template V19 Test",
  `template-v19-${stamp}`,
  "ACTIVE",
  "PRO",
  stamp,
  stamp
);
db.prepare(
  `INSERT INTO users(id,tenant_id,username,password_hash,role,is_active,created_at,updated_at)
   VALUES(?,?,?,?,?,?,?,?)`
).run(userId, tenantId, `template-v19-${stamp}`, "test-hash", "ADMIN", 1, stamp, stamp);
db.prepare("INSERT INTO user_ui_settings(user_id,updated_at) VALUES(?,?)").run(userId, stamp);

assert.equal(ensureProfessionalTemplateLibrary(tenantId), 45);
db.prepare(
  `UPDATE quote_templates
   SET name='BOZUK',layout_key='minimal',deleted_at=?,deleted_by='test'
   WHERE tenant_id=? AND template_key='corporate-main'`
).run(stamp, tenantId);

assert.equal(restoreV112TemplateLibrary(tenantId), 32);
assert.equal(restoreArtevaClassicTemplate(tenantId, true), 1);

const rows = db
  .prepare(
    `SELECT template_key,name,description,layout_key,primary_color,accent_color,font_family,is_default,deleted_at
     FROM quote_templates WHERE tenant_id=?`
  )
  .all(tenantId);
assert.equal(rows.length, 45);
const byKey = new Map(rows.map((row) => [row.template_key, row]));
for (const [key, name, description, layout, primary, accent, font] of legacyV112TemplatePresets) {
  const row = byKey.get(key);
  assert.ok(row, `${key}: eski şablon eklenmedi`);
  assert.deepEqual(
    [row.name, row.description, row.layout_key, row.primary_color, row.accent_color, row.font_family],
    [name, description, layout, primary, accent, font],
    `${key}: crmv1.12 tanımı birebir geri yüklenmedi`
  );
  assert.equal(row.deleted_at, null, `${key}: arşivden geri gelmedi`);
}
assert.ok(byKey.has("clean-lab-plus"), "yeni şablonlar korunmadı");
assert.equal(byKey.get(artevaClassicTemplate.template_key)?.layout_key, "arteva-classic");
assert.equal(byKey.get(artevaClassicTemplate.template_key)?.is_default, 1);
assert.equal(rows.filter((row) => row.is_default).length, 1);
assert.equal(
  db.prepare("SELECT default_template_key FROM user_ui_settings WHERE user_id=?").get(userId)
    .default_template_key,
  artevaClassicTemplate.template_key
);

console.log("CRMV1_19_TEMPLATES=32_OLD_EXACT+12_NEW+1_PDF_ORIGINAL; DEFAULT=TEK260075; DB_RESTORE=OK");

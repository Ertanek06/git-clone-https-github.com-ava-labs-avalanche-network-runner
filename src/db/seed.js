import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { id } from "../utils/id.js";

const now = Date.now();
// Güncelleme sırasında dolu bir canlı veritabanında ten_default/crmadmin gibi
// ikinci bir örnek tenant oluşturma. Önce mevcut aktif kullanıcının tenantını
// koru; ortam değişkenleri yalnızca gerçekten boş ilk kurulumda devreye girer.
const existingUserTenant = db
  .prepare(`SELECT tenant_id FROM users WHERE COALESCE(is_active,1)=1 ORDER BY CASE WHEN role='SUPER_ADMIN' THEN 0 ELSE 1 END,created_at ASC LIMIT 1`)
  .get()?.tenant_id;
const existingActiveTenant = db
  .prepare(`SELECT id FROM tenants WHERE UPPER(COALESCE(status,'ACTIVE'))='ACTIVE' ORDER BY created_at ASC LIMIT 1`)
  .get()?.id;
const desiredTenantId = existingUserTenant || existingActiveTenant || process.env.TENANT_ID || "ten_default";
const tenantSlug =
  (process.env.TENANT_SLUG || desiredTenantId || "default")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";

function ensureTenant() {
  let row = db.prepare("SELECT id FROM tenants WHERE id=?").get(desiredTenantId);
  if (row?.id) return row.id;
  row = db.prepare("SELECT id FROM tenants WHERE slug=?").get(tenantSlug);
  if (row?.id) return row.id;
  let slug = tenantSlug;
  if (db.prepare("SELECT 1 FROM tenants WHERE slug=?").get(slug)) {
    slug = `${tenantSlug}-${String(desiredTenantId).slice(-6)}`;
  }
  db.prepare(`INSERT INTO tenants(id,name,slug,status,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(
    desiredTenantId,
    process.env.COMPANY_NAME || "Örnek İşletme",
    slug,
    "ACTIVE",
    now,
    now
  );
  return desiredTenantId;
}

const tenantId = ensureTenant();
db.prepare(`INSERT OR IGNORE INTO login_settings(tenant_id,updated_at) VALUES(?,?)`).run(tenantId, now);

const username = process.env.ADMIN_USERNAME || "crmadmin";
const password = process.env.ADMIN_PASSWORD || "";
const anyExistingUser = db.prepare("SELECT id,tenant_id,username FROM users LIMIT 1").get();
if (!anyExistingUser) {
  if (!password || password === "CHANGE_THIS_TEMP_PASSWORD")
    throw new Error("ADMIN_PASSWORD ayarlanmalıdır. .env dosyasını düzenleyin.");
  const userId = id("usr"),
    hash = await bcrypt.hash(password, 12);
  db.prepare(
    `INSERT INTO users(id,tenant_id,username,email,full_name,password_hash,role,is_active,session_version,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    userId,
    tenantId,
    username,
    process.env.ADMIN_EMAIL || null,
    "CRM Yöneticisi",
    hash,
    "SUPER_ADMIN",
    1,
    1,
    1,
    now,
    now
  );
  console.log(`admin created: ${username}`);
} else {
  console.log(`seed: mevcut kullanıcı korundu (${anyExistingUser.username} / ${anyExistingUser.tenant_id})`);
}

if (!db.prepare("SELECT 1 FROM profiles WHERE tenant_id=? AND COALESCE(deleted_at,0)=0").get(tenantId)) {
  db.prepare(
    `INSERT INTO profiles(id,tenant_id,company_name,short_name,authorized_person,email,website,city,country,is_active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id("pro"),
    tenantId,
    process.env.COMPANY_NAME || "ÖRNEK FİRMA PROFİLİ",
    process.env.COMPANY_SHORT_NAME || "ÖRNEK FİRMA",
    "",
    process.env.COMPANY_EMAIL || "",
    process.env.PUBLIC_BASE_URL || "",
    "Ankara",
    "Türkiye",
    1,
    now,
    now
  );
}

const templates = [
  [
    "corporate-main",
    "Kurumsal Ana Şablon",
    "Kurumsal dengeli proforma tasarımı",
    "classic",
    "#245ba7",
    "#d83238"
  ],
  [
    "silver-executive",
    "Silver Executive",
    "Yönetici sunumları için ince çizgili düzen",
    "executive",
    "#64748b",
    "#1f4f8f"
  ],
  ["navy-corporate", "Navy Corporate", "Lacivert teknik kurumsal görünüm", "navy", "#123b73", "#3b82f6"],
  ["red-line", "Red Line", "Satış teklifleri için kırmızı vurgu", "redline", "#c9272e", "#172554"],
  ["graphite-pro", "Graphite Pro", "Koyu üst bloklu modern tasarım", "graphite", "#334155", "#0f766e"],
  ["export-fca", "Export FCA", "İhracat ve FCA teslim odaklı tasarım", "export", "#0f766e", "#0f172a"],
  [
    "visual-product",
    "Visual Product",
    "Ürün görsellerine öncelik veren düzen",
    "visual",
    "#7c3aed",
    "#2563eb"
  ],
  ["minimal-offer", "Minimal Offer", "Sade ve ferah ticari teklif düzeni", "minimal", "#0284c7", "#111827"],
  [
    "technical-lab",
    "Technical Lab",
    "Teknik açıklamalar için laboratuvar düzeni",
    "technical",
    "#0f4c81",
    "#d97706"
  ],
  [
    "compact-corporate",
    "Compact Corporate",
    "Uzun kalemli tekliflerde kompakt yapı",
    "compact",
    "#475569",
    "#0f766e"
  ],
  [
    "skyline-blue",
    "Skyline Blue",
    "Üst bantlı mavi kurumsal teklif tasarımı",
    "skyline",
    "#1d4ed8",
    "#0ea5e9"
  ],
  [
    "emerald-frame",
    "Emerald Frame",
    "Yeşil çerçeveli dengeli teklif düzeni",
    "emerald",
    "#047857",
    "#14b8a6"
  ],
  [
    "gold-balance",
    "Gold Balance",
    "Prestijli tekliflerde altın vurgu ve sade tablo",
    "gold",
    "#92400e",
    "#d97706"
  ],
  [
    "slate-matrix",
    "Slate Matrix",
    "Teknik satırlarda net çizgili modern tablo",
    "matrix",
    "#1f2937",
    "#64748b"
  ],
  [
    "clean-lab-plus",
    "Clean Lab Plus",
    "Laboratuvar teklifleri için ferah ve simetrik düzen",
    "cleanlab",
    "#0369a1",
    "#38bdf8"
  ]
];
const insert = db.prepare(
  `INSERT OR IGNORE INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,is_default,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`
);
const allTenants = db
  .prepare("SELECT id FROM tenants")
  .all()
  .map((x) => x.id);
allTenants.forEach((tid) =>
  templates.forEach((t, i) => insert.run(id("tpl"), tid, ...t, tid === tenantId && i === 0 ? 1 : 0, now, now))
);
console.log("seed complete");

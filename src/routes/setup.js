import bcrypt from "bcryptjs";
import { Router } from "express";
import { db } from "../db/db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { id } from "../utils/id.js";
import { safeText, upperTr } from "../utils/text.js";
const r = Router();
r.use(requireAuth, requirePermission("settings", "admin"));
function setting(tenantId, key) {
  const row = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
    .get(tenantId, key);
  try {
    return JSON.parse(row?.value_json || "null");
  } catch {
    return null;
  }
}
r.get("/", (req, res) => {
  const profile =
    db
      .prepare(
        "SELECT * FROM profiles WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_active DESC,created_at LIMIT 1"
      )
      .get(req.tenantId) || {};
  const setup = {
    domain: setting(req.tenantId, "setup_domain") || "",
    port: Number(setting(req.tenantId, "setup_port") || 3120),
    approval_amount_limit: Number(setting(req.tenantId, "approval_amount_limit") || 0),
    approval_discount_limit: Number(setting(req.tenantId, "approval_discount_limit") || 0)
  };
  res.render("setup/index", {
    title: "İlk Kurulum Sihirbazı",
    profile,
    setup,
    completed: !!setting(req.tenantId, "setup_completed")
  });
});

r.post("/guide", (req, res) => {
  const company = safeText(req.body.company_name) || "Firma",
    domain = safeText(req.body.domain) || "crm.firma.com",
    port = Number(req.body.port || 3120),
    username = safeText(req.body.admin_username) || "admin";
  const body = `${company} CRM / ERP KURULUM VE DEVİR KILAVUZU\n\n1. Sunucu gereksinimi: Ubuntu 22.04/24.04, Node.js 20+, Nginx ve SQLite.\n2. Paket dosyasını /home/arteva dizinine yükleyin.\n3. ZIP dosyasını açın ve paket klasörüne girin.\n4. Aşağıdaki komutu çalıştırın:\n\nBASE=/home/arteva/arteva-crm-erp-efsana36 PORT=${port} DOMAIN=${domain} bash scripts/update-live.sh\n\n5. Sağlık kontrolü:\nBASE=/home/arteva/arteva-crm-erp-efsana36 PORT=${port} EXPECTED_VERSION=3.8.57 EXPECTED_RELEASE=v3.8.57-crmv1.45-web-import-upsert-ui-document-fix EXPECTED_BUILD=crmv1.45 bash scripts/health-check.sh\n\n6. Yönetici kullanıcı adı: ${username}\n7. Güvenlik: Parolayı yalnızca yetkili kişiye güvenli kanaldan iletin; bu belge parolayı içermez.\n8. İlk girişten sonra Firma Profilleri, SMTP, yedekleme ve alan adı SSL kontrollerini tamamlayın.\n9. Günlük otomatik yedekleme cron'unu scripts/install-backup-cron.sh ile kurun.\n10. Devir öncesi e-posta, PDF, WhatsApp, yedek indir/geri yükle ve yetki testlerini yapın.\n`;
  res.type("text/plain; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${company.replace(/[^a-z0-9_-]+/gi, "_")}_KURULUM_DEVIR_KILAVUZU.txt"`
  );
  res.send(body);
});

r.post("/", async (req, res, next) => {
  try {
    const now = Date.now();
    db.prepare("UPDATE tenants SET name=?,slug=?,updated_at=? WHERE id=?").run(
      safeText(req.body.company_name) || "Firma",
      safeText(req.body.company_slug) || "company",
      now,
      req.tenantId
    );
    let p = db
      .prepare(
        "SELECT * FROM profiles WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_active DESC,created_at LIMIT 1"
      )
      .get(req.tenantId);
    const pid = p?.id || id("pro");
    db.prepare(
      `INSERT INTO profiles(id,tenant_id,company_name,short_name,authorized_person,phone,mobile,email,website,tax_office,tax_no,address,city,country,bank_name,iban_try,iban_eur,iban_usd,is_active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET company_name=excluded.company_name,short_name=excluded.short_name,authorized_person=excluded.authorized_person,phone=excluded.phone,mobile=excluded.mobile,email=excluded.email,website=excluded.website,tax_office=excluded.tax_office,tax_no=excluded.tax_no,address=excluded.address,city=excluded.city,country=excluded.country,bank_name=excluded.bank_name,iban_try=excluded.iban_try,iban_eur=excluded.iban_eur,iban_usd=excluded.iban_usd,is_active=1,updated_at=excluded.updated_at`
    ).run(
      pid,
      req.tenantId,
      upperTr(req.body.company_name),
      upperTr(req.body.short_name),
      upperTr(req.body.authorized_person),
      safeText(req.body.phone),
      safeText(req.body.mobile),
      safeText(req.body.email).toLowerCase(),
      safeText(req.body.website),
      upperTr(req.body.tax_office),
      safeText(req.body.tax_no),
      upperTr(req.body.address),
      upperTr(req.body.city),
      upperTr(req.body.country) || "TÜRKİYE",
      upperTr(req.body.bank_name),
      safeText(req.body.iban_try),
      safeText(req.body.iban_eur),
      safeText(req.body.iban_usd),
      1,
      p?.created_at || now,
      now
    );
    db.prepare("UPDATE profiles SET is_active=0 WHERE tenant_id=? AND id<>?").run(req.tenantId, pid);
    const up = db.prepare(
      "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
    );
    up.run(req.tenantId, "setup_completed", JSON.stringify(true), now);
    up.run(
      req.tenantId,
      "approval_amount_limit",
      JSON.stringify(Number(req.body.approval_amount_limit || 0)),
      now
    );
    up.run(
      req.tenantId,
      "approval_discount_limit",
      JSON.stringify(Number(req.body.approval_discount_limit || 0)),
      now
    );
    up.run(req.tenantId, "setup_domain", JSON.stringify(safeText(req.body.domain)), now);
    up.run(req.tenantId, "setup_port", JSON.stringify(Number(req.body.port || 3120)), now);
    const adminUsername = safeText(req.body.admin_username);
    const adminPassword = String(req.body.admin_password || "");
    if (adminUsername) {
      const exists = db
        .prepare("SELECT id FROM users WHERE username=? AND id<>?")
        .get(adminUsername, req.user.id);
      if (exists)
        throw Object.assign(new Error("Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor."), {
          status: 409,
          expose: true
        });
      db.prepare(
        "UPDATE users SET username=?,email=COALESCE(NULLIF(?,''),email),updated_at=? WHERE id=? AND tenant_id=?"
      ).run(adminUsername, safeText(req.body.admin_email).toLowerCase(), now, req.user.id, req.tenantId);
    }
    if (adminPassword) {
      if (adminPassword.length < 10)
        throw Object.assign(new Error("Yönetici parolası en az 10 karakter olmalıdır."), {
          status: 422,
          expose: true
        });
      db.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=? AND tenant_id=?").run(
        await bcrypt.hash(adminPassword, 12),
        now,
        req.user.id,
        req.tenantId
      );
    }
    audit(req, { action: "SETUP_WIZARD_SAVE", module: "SETUP", newValue: req.body });
    flash(req, "success", "İlk kurulum bilgileri ve yönetici erişimi kaydedildi.");
    res.redirect("/setup");
  } catch (error) {
    next(error);
  }
});
export default r;

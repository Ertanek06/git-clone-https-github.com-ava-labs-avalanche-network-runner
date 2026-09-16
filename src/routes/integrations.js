import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { sendMail } from "../services/mail.service.js";
import { encryptSecret, maskedSecret } from "../utils/secrets.js";
const r = Router();
r.use(requireAuth, requirePermission("integrations", "admin"));
const text = (v) => String(v ?? "").trim();
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
function rawSmtp(tenantId) {
  return (
    db.prepare("SELECT * FROM smtp_settings WHERE tenant_id=?").get(tenantId) || {
      host: "",
      port: 587,
      secure: 0,
      username: "",
      password: "",
      from_name: "",
      from_email: "",
      reply_to: "",
      is_active: 0
    }
  );
}
function rawIntegration(tenantId) {
  return (
    db.prepare("SELECT * FROM integration_settings WHERE tenant_id=?").get(tenantId) || {
      provider: "MANUAL",
      api_url: "",
      api_key: "",
      company_code: "",
      settings_json: "{}",
      is_active: 0
    }
  );
}
const publicSmtp = (row) => ({ ...row, password: maskedSecret(row.password) });
const publicIntegration = (row) => ({ ...row, api_key: maskedSecret(row.api_key) });
r.get("/", (req, res) => {
  const smtp = publicSmtp(rawSmtp(req.tenantId)),
    integration = publicIntegration(rawIntegration(req.tenantId)),
    recentLogs = db
      .prepare(
        "SELECT l.*,q.quote_no,q.revision_no FROM quote_send_logs l LEFT JOIN quotes q ON q.id=l.quote_id WHERE l.tenant_id=? AND COALESCE(l.deleted_at,0)=0 ORDER BY l.created_at DESC LIMIT 30"
      )
      .all(req.tenantId);
  res.setHeader("Cache-Control", "no-store");
  res.render("integrations/index", { title: "Entegrasyonlar", smtp, integration, recentLogs });
});
r.post("/smtp", (req, res) => {
  const now = Date.now(),
    old = rawSmtp(req.tenantId),
    newPassword = text(req.body.password);
  const row = {
    id: old.id || id("smtp"),
    tenant_id: req.tenantId,
    host: text(req.body.host),
    port: num(req.body.port, 587),
    secure: req.body.secure === "1" ? 1 : 0,
    username: text(req.body.username),
    password: newPassword && !/^•+$/.test(newPassword) ? encryptSecret(newPassword) : old.password,
    from_name: text(req.body.from_name),
    from_email: text(req.body.from_email),
    reply_to: text(req.body.reply_to),
    is_active: req.body.is_active === "1" ? 1 : 0,
    created_at: old.created_at || now,
    updated_at: now
  };
  db.prepare(
    `INSERT INTO smtp_settings(id,tenant_id,host,port,secure,username,password,from_name,from_email,reply_to,is_active,created_at,updated_at) VALUES(@id,@tenant_id,@host,@port,@secure,@username,@password,@from_name,@from_email,@reply_to,@is_active,@created_at,@updated_at) ON CONFLICT(tenant_id) DO UPDATE SET host=excluded.host,port=excluded.port,secure=excluded.secure,username=excluded.username,password=excluded.password,from_name=excluded.from_name,from_email=excluded.from_email,reply_to=excluded.reply_to,is_active=excluded.is_active,updated_at=excluded.updated_at`
  ).run(row);
  audit(req, {
    action: "SMTP_SETTINGS_SAVE",
    module: "INTEGRATIONS",
    oldValue: { ...old, password: old.password ? "***" : "" },
    newValue: { ...row, password: row.password ? "***" : "" }
  });
  flash(req, "success", "SMTP ayarları şifrelenerek kaydedildi.");
  res.redirect("/integrations");
});
r.post("/smtp-test", async (req, res, next) => {
  try {
    const to = text(req.body.test_email || req.user.email);
    if (!to) throw Object.assign(new Error("Test e-posta adresi zorunludur."), { status: 422, expose: true });
    const info = await sendMail(req.tenantId, {
      to,
      subject: "CRM SMTP Test",
      body: "CRM / ERP SMTP bağlantısı başarıyla çalışıyor."
    });
    audit(req, {
      action: "SMTP_TEST_SEND",
      module: "INTEGRATIONS",
      newValue: { to, messageId: info.messageId }
    });
    flash(req, "success", "Test e-postası gönderildi.");
    res.redirect("/integrations");
  } catch (e) {
    next(e);
  }
});
r.post("/invoice", (req, res) => {
  const now = Date.now(),
    old = rawIntegration(req.tenantId),
    newKey = text(req.body.api_key);
  const row = {
    id: old.id || id("int"),
    tenant_id: req.tenantId,
    provider: text(req.body.provider) || "MANUAL",
    api_url: text(req.body.api_url),
    api_key: newKey && !/^•+$/.test(newKey) ? encryptSecret(newKey) : old.api_key,
    company_code: text(req.body.company_code),
    settings_json: JSON.stringify({ note: text(req.body.note) }),
    is_active: req.body.is_active === "1" ? 1 : 0,
    created_at: old.created_at || now,
    updated_at: now
  };
  db.prepare(
    `INSERT INTO integration_settings(id,tenant_id,provider,api_url,api_key,company_code,settings_json,is_active,created_at,updated_at) VALUES(@id,@tenant_id,@provider,@api_url,@api_key,@company_code,@settings_json,@is_active,@created_at,@updated_at) ON CONFLICT(tenant_id) DO UPDATE SET provider=excluded.provider,api_url=excluded.api_url,api_key=excluded.api_key,company_code=excluded.company_code,settings_json=excluded.settings_json,is_active=excluded.is_active,updated_at=excluded.updated_at`
  ).run(row);
  audit(req, {
    action: "INVOICE_INTEGRATION_SAVE",
    module: "INTEGRATIONS",
    oldValue: { ...old, api_key: old.api_key ? "***" : "" },
    newValue: { ...row, api_key: row.api_key ? "***" : "" }
  });
  flash(req, "success", "Fatura/e-fatura entegrasyon ayarları şifrelenerek kaydedildi.");
  res.redirect("/integrations");
});
export default r;

import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { upload, publicFile, validateUploads, cleanupUploadedFiles } from "../middleware/upload.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
const r = Router();
r.use(requireAuth, requirePermission("settings", "view"));
const adminOnly = requirePermission("settings", "admin");
const activeWhere = "COALESCE(deleted_at,0)=0";
const clean = (s) => String(s || "").trim();
const liveSiteFor = (tenantId, profileId) =>
  db.prepare("SELECT * FROM live_sites WHERE tenant_id=? AND profile_id=? LIMIT 1").get(tenantId, profileId);

const profileAssetUpload = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "stamp", maxCount: 1 },
  { name: "signature", maxCount: 1 }
]);
function profileEditRedirect(req) {
  const pid = clean(req.body?.id);
  if (pid) return `/profiles/${encodeURIComponent(pid)}/edit`;
  const referer = String(req.get?.("referer") || "");
  const match = referer.match(/\/profiles\/([^/?#]+)\/edit(?:[?#]|$)/);
  return match?.[1] ? `/profiles/${encodeURIComponent(match[1])}/edit` : "/profiles/new";
}
function profileUploadGuard(req, res, next) {
  profileAssetUpload(req, res, (uploadError) => {
    if (uploadError) {
      cleanupUploadedFiles(req);
      const message = uploadError?.code === "LIMIT_FILE_SIZE"
        ? "Logo / kaşe / imza dosyası 50 MB sınırını aşıyor."
        : uploadError?.message || "Görsel yüklenemedi.";
      flash(req, "error", `${message} JPG, JPEG, JFIF, PNG, WEBP, GIF veya AVIF kullanın.`);
      return res.redirect(profileEditRedirect(req));
    }
    validateUploads(req, res, (validationError) => {
      if (!validationError) return next();
      cleanupUploadedFiles(req);
      flash(req, "error", `${validationError.message || "Görsel doğrulanamadı."} JPG, JPEG, JFIF, PNG, WEBP, GIF veya AVIF kullanın.`);
      return res.redirect(profileEditRedirect(req));
    });
  });
}
r.use((req, res, next) => (req.method === "GET" ? next() : adminOnly(req, res, next)));

r.get("/", (req, res) =>
  res.render("profiles/index", {
    title: "Firma Profilleri",
    rows: db
      .prepare(
        "SELECT * FROM profiles WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_active DESC,company_name"
      )
      .all(req.tenantId)
  })
);
r.get("/new", adminOnly, (req, res) =>
  res.render("profiles/form", { title: "Yeni Firma Profili", row: { country: "Türkiye" }, liveSite: null })
);
r.get("/:id/edit", adminOnly, (req, res) => {
  const row = db
    .prepare("SELECT * FROM profiles WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Firma profili bulunamadı."), { status: 404, expose: true });
  res.render("profiles/form", {
    title: "Firma Profilini Düzenle",
    row,
    liveSite: liveSiteFor(req.tenantId, row.id)
  });
});

r.post("/:id/remove-asset", (req, res) => {
  const row = db
    .prepare("SELECT * FROM profiles WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Firma profili bulunamadı."), { status: 404, expose: true });
  const asset = String(req.body?.asset || "").toLowerCase();
  if (asset === "logo")
    db.prepare(
      "UPDATE profiles SET logo_url=NULL,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
    ).run(Date.now(), req.tenantId, row.id);
  else if (asset === "stamp")
    db.prepare(
      "UPDATE profiles SET stamp_url=NULL,signature_url=NULL,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
    ).run(Date.now(), req.tenantId, row.id);
  else throw Object.assign(new Error("Kaldırılacak görsel seçilemedi."), { status: 422, expose: true });
  audit(req, { action: "PROFILE_ASSET_REMOVE", module: "PROFILES", entityId: row.id, newValue: { asset } });
  flash(req, "success", asset === "logo" ? "Logo kaldırıldı." : "Kaşe / imza görseli kaldırıldı.");
  res.redirect(`/profiles/${row.id}/edit`);
});

r.post(
  "/save",
  profileUploadGuard,
  (req, res) => {
    const row = req.body.id
      ? db
          .prepare("SELECT * FROM profiles WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
          .get(req.tenantId, req.body.id)
      : null;
    const now = Date.now(),
      pid = row?.id || id("pro");
    const uploadedStamp = publicFile(req.files?.stamp?.[0]) || publicFile(req.files?.signature?.[0]);
    const billingAddress = String(req.body.billing_address ?? req.body.address ?? "").trim(),
      deliveryAddress = String(req.body.delivery_address ?? "").trim();
    const v = {
      ...row,
      ...req.body,
      address: billingAddress,
      billing_address: billingAddress,
      delivery_address: deliveryAddress,
      id: pid,
      tenant_id: req.tenantId,
      logo_url: publicFile(req.files?.logo?.[0]) || row?.logo_url || null,
      stamp_url: uploadedStamp || row?.stamp_url || row?.signature_url || null,
      signature_url: null,
      updated_at: now,
      created_at: row?.created_at || now
    };
    db.prepare(
      `INSERT INTO profiles(id,tenant_id,company_name,short_name,quote_prefix,logo_url,stamp_url,signature_url,authorized_person,tax_office,tax_no,phone,mobile,email,website,address,billing_address,delivery_address,district,city,country,bank_name,iban_try,iban_eur,iban_usd,swift_bic,footer_address,footer_phone,footer_email,note,is_active,deleted_at,deleted_by,created_at,updated_at) VALUES(@id,@tenant_id,@company_name,@short_name,@quote_prefix,@logo_url,@stamp_url,@signature_url,@authorized_person,@tax_office,@tax_no,@phone,@mobile,@email,@website,@address,@billing_address,@delivery_address,@district,@city,@country,@bank_name,@iban_try,@iban_eur,@iban_usd,@swift_bic,@footer_address,@footer_phone,@footer_email,@note,0,NULL,NULL,@created_at,@updated_at) ON CONFLICT(id) DO UPDATE SET company_name=excluded.company_name,short_name=excluded.short_name,quote_prefix=excluded.quote_prefix,logo_url=excluded.logo_url,stamp_url=excluded.stamp_url,signature_url=NULL,authorized_person=excluded.authorized_person,tax_office=excluded.tax_office,tax_no=excluded.tax_no,phone=excluded.phone,mobile=excluded.mobile,email=excluded.email,website=excluded.website,address=excluded.address,billing_address=excluded.billing_address,delivery_address=excluded.delivery_address,district=excluded.district,city=excluded.city,country=excluded.country,bank_name=excluded.bank_name,iban_try=excluded.iban_try,iban_eur=excluded.iban_eur,iban_usd=excluded.iban_usd,swift_bic=excluded.swift_bic,footer_address=excluded.footer_address,footer_phone=excluded.footer_phone,footer_email=excluded.footer_email,note=excluded.note,updated_at=excluded.updated_at`
    ).run(v);
    const liveEnabled = req.body.live_enabled ? 1 : 0;
    const liveSiteUrl = clean(req.body.live_site_url || req.body.website);
    if (liveEnabled || liveSiteUrl) {
      const existing = db
        .prepare("SELECT * FROM live_sites WHERE tenant_id=? AND profile_id=? LIMIT 1")
        .get(req.tenantId, pid);
      const siteId = existing?.id || id("lsit"),
        siteKey = existing?.site_key || id("site");
      const siteName = clean(req.body.live_site_name) || v.short_name || v.company_name || liveSiteUrl;
      db.prepare(
        `INSERT INTO live_sites(id,tenant_id,profile_id,site_name,site_url,site_key,allowed_domain,is_active,widget_title,welcome_message,offline_message,widget_color,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET site_name=excluded.site_name,site_url=excluded.site_url,allowed_domain=excluded.allowed_domain,is_active=excluded.is_active,widget_title=excluded.widget_title,welcome_message=excluded.welcome_message,offline_message=excluded.offline_message,widget_color=excluded.widget_color,updated_at=excluded.updated_at`
      ).run(
        siteId,
        req.tenantId,
        pid,
        siteName,
        liveSiteUrl || v.website || "",
        siteKey,
        liveSiteUrl || v.website || "",
        liveEnabled,
        clean(req.body.live_widget_title) || "Canlı Destek",
        clean(req.body.live_welcome_message) || "Merhaba, size nasıl yardımcı olabiliriz?",
        clean(req.body.live_offline_message) ||
          "Şu anda çevrimdışıyız. Mesajınızı bırakın, size dönüş yapalım.",
        clean(req.body.live_widget_color) || "#245ba7",
        now,
        now
      );
    }
    audit(req, {
      action: row ? "PROFILE_UPDATE" : "PROFILE_CREATE",
      module: "PROFILES",
      entityId: pid,
      newValue: v
    });
    flash(req, "success", "Firma profili kaydedildi.");
    res.redirect("/profiles");
  }
);
r.post("/:id/activate", (req, res) => {
  db.transaction(() => {
    db.prepare("UPDATE profiles SET is_active=0 WHERE tenant_id=? AND COALESCE(deleted_at,0)=0").run(
      req.tenantId
    );
    db.prepare(
      "UPDATE profiles SET is_active=1,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
    ).run(Date.now(), req.tenantId, req.params.id);
  })();
  audit(req, { action: "PROFILE_ACTIVATE", module: "PROFILES", entityId: req.params.id });
  flash(req, "success", "Aktif firma değiştirildi.");
  res.redirect("/profiles");
});
r.post("/:id/delete", adminOnly, (req, res) => {
  const row = db
    .prepare("SELECT id,is_active FROM profiles WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Firma profili bulunamadı."), { status: 404, expose: true });
  if (row.is_active) {
    flash(req, "error", "Aktif firma profili silinemez. Önce başka bir profili aktif yapın.");
    return res.redirect("/profiles");
  }
  db.prepare(
    "UPDATE profiles SET is_active=0,deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
  ).run(Date.now(), req.user.id, Date.now(), req.tenantId, row.id);
  audit(req, { action: "PROFILE_ARCHIVE", module: "PROFILES", entityId: row.id });
  flash(req, "success", "Firma profili arşivlendi.");
  res.redirect("/profiles");
});
export default r;

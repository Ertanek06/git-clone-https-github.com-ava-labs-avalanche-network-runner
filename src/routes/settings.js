import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { db } from "../db/db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { upload, publicFile, validateUploads } from "../middleware/upload.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import {
  getUi,
  saveUi,
  resetUi,
  themes,
  sidebars,
  sidebarCatalog,
  iconPacks,
  advancedDefaults,
  getSidebarCatalog,
  updateSidebarPreset,
  hideSidebarPreset,
  restoreSidebarPresets,
  listThemeDesigns,
  saveThemeDesign,
  deleteThemeDesign,
  getThemeDesign,
  sanitizeThemeCss
} from "../services/theme.service.js";
import { normalizeLocale } from "../services/locale.service.js";
import { cleanReturnPath } from "../utils/text.js";
import { getLoginStudioState, saveLoginStudio, deleteLoginMedia } from "../services/login-studio.service.js";
const r = Router();
r.use(requireAuth);
const adminOnly = requirePermission("settings", "admin");
const clamp = (v, min, max, d) => Math.min(max, Math.max(min, Number.isFinite(Number(v)) ? Number(v) : d));
const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v) : d);
const font = (v) =>
  String(v || "Inter")
    .replace(/[^a-z0-9 ,_-]/gi, "")
    .slice(0, 60) || "Inter";
const themeRanges = {
  content_max_width: [980, 2400],
  content_padding_x: [0, 60],
  content_padding_y: [0, 60],
  body_line_height: [1, 2.2],
  page_header_radius: [0, 40],
  page_header_padding: [0, 32],
  card_radius: [0, 40],
  card_border_width: [0, 4],
  card_shadow: [0, 40],
  card_padding: [4, 40],
  inner_panel_radius: [0, 40],
  metric_radius: [0, 40],
  topbar_height: [48, 100],
  topbar_blur: [0, 30],
  sidebar_padding: [0, 30],
  brand_radius: [0, 40],
  brand_height: [55, 160],
  brand_logo_width: [80, 240],
  menu_radius: [0, 30],
  menu_height: [34, 70],
  menu_gap: [0, 24],
  menu_icon_size: [18, 44],
  menu_icon_radius: [0, 24],
  submenu_indent: [0, 40],
  button_radius: [0, 30],
  button_height: [30, 60],
  button_shadow: [0, 30],
  button_font_size: [10, 20],
  button_font_weight: [400, 900],
  action_btn_size: [26, 52],
  action_btn_radius: [0, 24],
  input_radius: [0, 30],
  input_height: [30, 60],
  input_border_width: [0, 4],
  input_focus_ring: [0, 10],
  table_row_height: [30, 76],
  table_font_size: [10, 18],
  table_cell_padding: [2, 24],
  table_radius: [0, 30],
  badge_radius: [0, 999],
  badge_font_size: [9, 18],
  modal_radius: [0, 40],
  toast_radius: [0, 40],
  heading_weight: [400, 900],
  h1_size: [18, 42],
  h2_size: [14, 32],
  h3_size: [12, 28],
  body_weight: [300, 800],
  small_size: [9, 18],
  scrollbar_width: [4, 20],
  animation_speed: [0, 1000]
};
const themeColorKeys = new Set([
  ...Object.keys(advancedDefaults).filter((k) =>
    /(?:_bg|_text|_border|_color|_focus|_track|_thumb)$/.test(k)
  ),
  "input_placeholder",
  "input_label",
  "modal_overlay"
]);
const cleanThemeCss = sanitizeThemeCss;
function sanitizeAdvancedTheme(body, current) {
  const out = {};
  for (const [key, def] of Object.entries(advancedDefaults)) {
    if (key === "custom_css") {
      out[key] = cleanThemeCss(body[key] ?? current[key] ?? def);
      continue;
    }
    if (key.endsWith("_font_family")) {
      out[key] = font(body[key] ?? current[key] ?? def);
      continue;
    }
    if (key === "topbar_sticky" || key === "animations_enabled") {
      out[key] = String(body[key] ?? "0") === "1" ? 1 : 0;
      continue;
    }
    if (themeColorKeys.has(key)) {
      out[key] = hex(body[key], current[key] || def);
      continue;
    }
    if (themeRanges[key]) {
      const [min, max] = themeRanges[key];
      out[key] = clamp(body[key], min, max, current[key] ?? def);
      continue;
    }
    out[key] = body[key] ?? current[key] ?? def;
  }
  return out;
}
function sanitizeThemeInput(body, current) {
  const advanced = sanitizeAdvancedTheme(body, current);
  return {
    ...current,
    ...body,
    ...advanced,
    locale: normalizeLocale(current.locale),
    font_family: font(body.font_family ?? current.font_family),
    sidebar_width: clamp(body.sidebar_width, 210, 340, current.sidebar_width ?? 252),
    font_size: clamp(body.font_size, 11, 22, current.font_size ?? 14),
    radius: clamp(body.radius, 0, 28, current.radius ?? 14),
    primary_color: hex(body.primary_color, current.primary_color),
    accent_color: hex(body.accent_color, current.accent_color),
    page_bg: hex(body.page_bg, current.page_bg),
    card_bg: hex(body.card_bg, current.card_bg),
    border_color: hex(body.border_color, current.border_color),
    text_color: hex(body.text_color, current.text_color),
    muted_color: hex(body.muted_color, current.muted_color)
  };
}
const themeImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 1, fields: 8 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    if (
      name.endsWith(".json") &&
      (mime === "application/json" ||
        mime === "text/json" ||
        mime === "text/plain" ||
        mime === "application/octet-stream")
    )
      return cb(null, true);
    const error = Object.assign(new Error("Yalnızca ARTEVA tema JSON dosyası yüklenebilir."), {
      status: 415,
      expose: true
    });
    cb(error);
  }
}).single("theme_file");
const TERMS = {
  payment_terms: [
    "PEŞİN ÖDEME",
    "SİPARİŞTE %50, TESLİMAT ÖNCESİ %50 OLARAK TAMAMLANACAKTIR.",
    "SİPARİŞTE %50, KURULUM SONRASI %50 OLARAK TAMAMLANACAKTIR.",
    "VADELİ ÖDEME"
  ],
  delivery_terms: [
    "SİPARİŞİ MÜTEAKİBEN 2-3 HAFTA",
    "SİPARİŞİ MÜTEAKİBEN 3-4 HAFTA",
    "SİPARİŞİ MÜTEAKİBEN 4-6 HAFTA",
    "STOKTAN TESLİM"
  ],
  shipping_terms: [
    "NAKLİYE ALICI FİRMAYA AİTTİR.",
    "NAKLİYE FİYATIMIZA DAHİLDİR.",
    "NAKLİYE HARİÇTİR.",
    "FCA ANKARA",
    "FCA İSTANBUL",
    "EXW",
    "FOB",
    "CIF",
    "DDP"
  ],
  installation_terms: [
    "KURULUM VE EĞİTİM FİYATIMIZA DAHİLDİR.",
    "KURULUM FİYATIMIZA DAHİLDİR.",
    "KURULUM VE EĞİTİM FİYATIMIZA DAHİL DEĞİLDİR.",
    "KURULUM ALICI FİRMAYA AİTTİR."
  ],
  warranty_terms: [
    "CİHAZLAR İMALAT HATALARINA KARŞI 2 YIL SÜRE İLE GARANTİLİDİR.",
    "ÜRÜNLER 2 YIL GARANTİLİDİR.",
    "GARANTİ SÜRESİ 1 YILDIR."
  ],
  legal_terms: []
};
const readSettings = (tenantId) => {
  const rows = db.prepare("SELECT key,value_json FROM app_settings WHERE tenant_id=?").all(tenantId),
    values = Object.fromEntries(
      rows.map((x) => {
        try {
          return [x.key, JSON.parse(x.value_json)];
        } catch {
          return [x.key, x.value_json];
        }
      })
    );
  values.payment_terms_default = values.payment_terms_default || values.payment_default || "";
  values.delivery_terms_default = values.delivery_terms_default || values.delivery_default || "";
  values.warranty_terms_default = values.warranty_terms_default || values.warranty_default || "";
  const histories = {};
  for (const [k, base] of Object.entries(TERMS)) {
    const saved = Array.isArray(values[k + "_history"]) ? values[k + "_history"] : [];
    histories[k] = [
      ...new Set(
        [values[k + "_default"], ...saved, ...base].map((x) => String(x || "").trim()).filter(Boolean)
      )
    ];
  }
  return { values, histories };
};
const localeRedirect = (req, res, locale, nextUrl) => {
  const current = getUi(req.user.id);
  saveUi(req.user.id, { ...current, locale });
  req.session.locale = locale;
  audit(req, { action: "LOCALE_UPDATE", module: "SETTINGS", newValue: { locale } });
  const safeNext = cleanReturnPath(nextUrl || req.get("referer") || "/");
  req.session.save((err) => {
    if (err) return res.redirect("/");
    res.redirect(safeNext);
  });
};

r.get("/locale/:locale", (req, res) =>
  localeRedirect(req, res, normalizeLocale(req.params.locale), req.query.next)
);
r.post("/locale", (req, res) => localeRedirect(req, res, normalizeLocale(req.body.locale), req.body.next));
r.use(requirePermission("settings", "view"));
r.get("/", (req, res) => res.render("settings/index", { title: res.locals.t("settings") }));
r.get("/general", adminOnly, (req, res) => {
  const { values, histories } = readSettings(req.tenantId);
  res.render("settings/general", {
    title: "Genel Ayarlar",
    section: req.query.section || "general",
    values,
    histories
  });
});
r.post("/general", adminOnly, (req, res) => {
  const now = Date.now(),
    body = {
      ...req.body,
      quote_reminder_enabled: String(req.body.quote_reminder_enabled || "0") === "1" ? "1" : "0"
    },
    up = db.prepare(
      "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
    );
  for (const [key, value] of Object.entries(body)) {
    if (key === "_csrf") continue;
    up.run(req.tenantId, key, JSON.stringify(value), now);
  }
  for (const k of Object.keys(TERMS)) {
    const value = String(body[k + "_default"] || "").trim();
    if (!value) continue;
    const old = db
      .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
      .get(req.tenantId, k + "_history");
    let arr = [];
    try {
      arr = JSON.parse(old?.value_json || "[]");
    } catch {}
    arr = [value, ...arr, ...TERMS[k]].map((x) => String(x || "").trim()).filter(Boolean);
    arr = [...new Set(arr)].slice(0, 25);
    up.run(req.tenantId, k + "_history", JSON.stringify(arr), now);
  }
  audit(req, { action: "SETTINGS_UPDATE", module: "SETTINGS", newValue: body });
  flash(
    req,
    "success",
    req.locale === "en"
      ? "General settings saved."
      : "Genel ayarlar kaydedildi. Yeni proformalar bu varsayılanlarla başlayacaktır."
  );
  res.redirect(`/settings/general?section=${encodeURIComponent(body.section || "general")}`);
});
r.get("/theme", (req, res) =>
  res.render("settings/theme", {
    title: res.locals.t("theme"),
    themes,
    sidebars,
    sidebarCatalog: getSidebarCatalog(req.tenantId),
    hiddenSidebarCount: getSidebarCatalog(req.tenantId, { includeHidden: true }).filter((x) => x.hidden)
      .length,
    iconPacks,
    current: getUi(req.user.id),
    savedThemeDesigns: listThemeDesigns(req.tenantId, req.user.id)
  })
);
r.post("/theme", (req, res) => {
  try {
    const current = getUi(req.user.id);
    const v = sanitizeThemeInput(req.body, current);
    saveUi(req.user.id, v);
    const designName = String(req.body.design_name || "").trim();
    if (designName) saveThemeDesign(req.tenantId, req.user.id, designName, v);
    audit(req, {
      action: "THEME_UPDATE",
      module: "SETTINGS",
      newValue: { ...v, design_name: designName, custom_css: v.custom_css ? "[CUSTOM_CSS]" : "" }
    });
    const message = designName
      ? `Tema “${designName}” adıyla kaydedildi ve aktif edildi.`
      : req.locale === "en"
        ? "Every theme component was saved and applied to all pages."
        : "Tema bileşenlerinin tamamı kaydedildi ve tüm sayfalara uygulandı.";
    if (req.accepts(["json", "html"]) === "json")
      return res.json({ ok: true, message, theme_key: v.theme_key, sidebar_key: v.sidebar_key });
    flash(req, "success", message);
    res.redirect("/settings/theme");
  } catch (error) {
    console.error("[theme-save]", error);
    if (req.accepts(["json", "html"]) === "json")
      return res.status(500).json({
        ok: false,
        message: req.locale === "en" ? "Theme settings could not be saved." : "Tema ayarları kaydedilemedi."
      });
    throw error;
  }
});

r.post("/theme/design/:id/activate", (req, res) => {
  const design = getThemeDesign(req.tenantId, req.user.id, req.params.id);
  if (!design) {
    flash(req, "error", "Kayıtlı tema tasarımı bulunamadı.");
    return res.redirect("/settings/theme");
  }
  saveUi(req.user.id, { ...getUi(req.user.id), ...design.settings });
  audit(req, {
    action: "THEME_DESIGN_ACTIVATE",
    module: "SETTINGS",
    entityId: req.params.id,
    newValue: { name: design.name }
  });
  flash(req, "success", `“${design.name}” tema tasarımı aktif edildi.`);
  res.redirect("/settings/theme");
});
r.post("/theme/design/:id/delete", (req, res) => {
  deleteThemeDesign(req.tenantId, req.user.id, req.params.id);
  audit(req, { action: "THEME_DESIGN_DELETE", module: "SETTINGS", entityId: req.params.id });
  flash(req, "success", "Kayıtlı tema tasarımı silindi.");
  res.redirect("/settings/theme");
});
r.get("/theme/design/:id/export", (req, res) => {
  const design = getThemeDesign(req.tenantId, req.user.id, req.params.id);
  if (!design) {
    flash(req, "error", "Dışa aktarılacak tema tasarımı bulunamadı.");
    return res.redirect("/settings/theme");
  }
  const safeName =
    String(design.name || "arteva-theme")
      .normalize("NFKD")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "arteva-theme";
  const payload = {
    format: "ARTEVA_THEME_DESIGN",
    schema_version: 1,
    name: design.name,
    exported_at: new Date().toISOString(),
    app_version: res.locals.appVersion || null,
    settings: design.settings
  };
  audit(req, {
    action: "THEME_DESIGN_EXPORT",
    module: "SETTINGS",
    entityId: design.id,
    newValue: { name: design.name }
  });
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}.arteva-theme.json"`);
  res.send(JSON.stringify(payload, null, 2));
});
r.post("/theme/design/import", (req, res, next) => {
  themeImportUpload(req, res, (error) => {
    if (error) return next(error);
    try {
      if (!req.file)
        throw Object.assign(new Error("İçe aktarılacak tema JSON dosyasını seçin."), {
          status: 422,
          expose: true
        });
      let payload;
      try {
        payload = JSON.parse(req.file.buffer.toString("utf8"));
      } catch {
        throw Object.assign(new Error("Tema dosyası geçerli JSON biçiminde değil."), {
          status: 422,
          expose: true
        });
      }
      if (
        payload?.format !== "ARTEVA_THEME_DESIGN" ||
        Number(payload?.schema_version) !== 1 ||
        !payload.settings ||
        typeof payload.settings !== "object" ||
        Array.isArray(payload.settings)
      )
        throw Object.assign(new Error("Dosya geçerli bir ARTEVA tema tasarımı değil."), {
          status: 422,
          expose: true
        });
      const current = getUi(req.user.id);
      const settings = sanitizeThemeInput(payload.settings, current);
      const requestedName = String(req.body.import_name || payload.name || "İçe Aktarılan Tema")
        .trim()
        .slice(0, 80);
      const design = saveThemeDesign(req.tenantId, req.user.id, requestedName, settings);
      const activate = String(req.body.activate_after_import || "0") === "1";
      if (activate) saveUi(req.user.id, { ...current, ...settings });
      audit(req, {
        action: "THEME_DESIGN_IMPORT",
        module: "SETTINGS",
        entityId: design.id,
        newValue: { name: design.name, activated: activate }
      });
      flash(
        req,
        "success",
        activate
          ? `“${design.name}” içe aktarıldı ve aktif edildi.`
          : `“${design.name}” içe aktarıldı. Kayıtlı Tasarımlar bölümünden aktif edebilirsiniz.`
      );
      res.redirect("/settings/theme");
    } catch (error) {
      next(error);
    }
  });
});

r.post("/theme/sidebar/:key/default", (req, res) => {
  const preset = getSidebarCatalog(req.tenantId).find((x) => x.key === req.params.key);
  if (!preset) {
    flash(req, "error", "Sidebar tasarımı bulunamadı.");
    return res.redirect("/settings/theme");
  }
  const current = getUi(req.user.id);
  saveUi(req.user.id, {
    ...current,
    sidebar_key: preset.key,
    menu_mode: preset.menu_mode,
    density: preset.density,
    sidebar_width: preset.sidebar_width
  });
  audit(req, { action: "SIDEBAR_DEFAULT_UPDATE", module: "SETTINGS", newValue: preset });
  flash(req, "success", `${preset.name} varsayılan sidebar olarak kaydedildi.`);
  res.redirect("/settings/theme");
});
r.post("/theme/sidebar/:key/edit", adminOnly, (req, res) => {
  const preset = updateSidebarPreset(req.tenantId, req.params.key, req.body);
  if (!preset) {
    flash(req, "error", "Sidebar tasarımı bulunamadı.");
    return res.redirect("/settings/theme");
  }
  const current = getUi(req.user.id);
  if (current.sidebar_key === preset.key)
    saveUi(req.user.id, {
      ...current,
      menu_mode: preset.menu_mode,
      density: preset.density,
      sidebar_width: preset.sidebar_width
    });
  audit(req, { action: "SIDEBAR_PRESET_UPDATE", module: "SETTINGS", newValue: preset });
  flash(req, "success", `${preset.name} sidebar ayarları güncellendi.`);
  res.redirect("/settings/theme");
});
r.post("/theme/sidebar/:key/delete", adminOnly, (req, res) => {
  const current = getUi(req.user.id);
  if (!hideSidebarPreset(req.tenantId, req.params.key)) {
    flash(req, "error", "Silver Tree korumalı tasarımdır ve silinemez.");
    return res.redirect("/settings/theme");
  }
  if (current.sidebar_key === req.params.key)
    saveUi(req.user.id, {
      ...current,
      sidebar_key: "silver-tree",
      menu_mode: "accordion",
      density: "compact",
      sidebar_width: 252
    });
  audit(req, { action: "SIDEBAR_PRESET_HIDE", module: "SETTINGS", entityId: req.params.key });
  flash(
    req,
    "success",
    "Sidebar seçeneği listeden kaldırıldı. İsterseniz gizlenen seçenekleri geri yükleyebilirsiniz."
  );
  res.redirect("/settings/theme");
});
r.post("/theme/sidebar/restore", adminOnly, (req, res) => {
  restoreSidebarPresets(req.tenantId);
  audit(req, { action: "SIDEBAR_PRESET_RESTORE", module: "SETTINGS" });
  flash(req, "success", "Sidebar seçenekleri yeniden yüklendi.");
  res.redirect("/settings/theme");
});
r.post("/theme/reset", async (req, res) => {
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT id,password_hash FROM users WHERE id=?").get(req.user.id);
  if (!password || !user || !(await bcrypt.compare(password, user.password_hash))) {
    audit(req, { action: "THEME_RESET_FAILED", module: "SETTINGS", result: "FAIL" });
    flash(
      req,
      "error",
      req.locale === "en"
        ? "Password verification failed. Theme settings were not changed."
        : "Şifre doğrulaması başarısız. Tema ayarları değiştirilmedi."
    );
    return res.redirect("/settings/theme");
  }
  const locale = getUi(req.user.id).locale;
  resetUi(req.user.id);
  saveUi(req.user.id, { locale });
  req.session.locale = locale;
  audit(req, { action: "THEME_RESET", module: "SETTINGS" });
  flash(
    req,
    "success",
    "Yalnızca tema ayarlarınız fabrika değerlerine döndürüldü. Diğer kayıtlar değiştirilmedi."
  );
  res.redirect("/settings/theme");
});
r.get("/login", adminOnly, (req, res) => {
  const state = getLoginStudioState(req.tenantId);
  res.render("settings/login", { title: "Login Sayfası Tasarımı", ...state });
});
r.post(
  "/login",
  adminOnly,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "left_image", maxCount: 1 },
    { name: "login_media", maxCount: 1 }
  ]),
  validateUploads,
  (req, res, next) => {
    try {
      const result = saveLoginStudio(req.tenantId, req.body, {
        logoUrl: publicFile(req.files?.logo?.[0]),
        leftImageUrl: publicFile(req.files?.left_image?.[0]),
        uploadedMedia: req.files?.login_media?.[0] || null
      });
      audit(req, {
        action: "LOGIN_STUDIO_UPDATE",
        module: "SETTINGS",
        newValue: { ...result.studio, uploaded_media_id: result.uploaded?.id || null }
      });
      flash(
        req,
        "success",
        result.uploaded ? "Login tasarımı ve yeni animasyon kaydedildi." : "Login tasarımı kaydedildi."
      );
      res.redirect("/settings/login");
    } catch (error) {
      next(error);
    }
  }
);
r.post("/login/media/:id/delete", adminOnly, (req, res, next) => {
  try {
    const result = deleteLoginMedia(req.tenantId, req.params.id);
    audit(req, {
      action: "LOGIN_MEDIA_ARCHIVE",
      module: "SETTINGS",
      entityId: req.params.id,
      result: result.deleted ? "SUCCESS" : "FAIL",
      newValue: { quarantined: Boolean(result.quarantined) }
    });
    if (req.accepts(["json", "html"]) === "json")
      return res.status(result.deleted ? 200 : 404).json({
        ok: result.deleted,
        reason: result.reason || null,
        quarantined: Boolean(result.quarantined)
      });
    flash(
      req,
      result.deleted ? "success" : "error",
      result.deleted
        ? "Animasyon bu firmaya ait kütüphaneden kaldırıldı; yüklenen dosya kurtarma karantinasında korunur."
        : "Animasyon bulunamadı veya kaldırılamaz."
    );
    res.redirect("/settings/login");
  } catch (error) {
    next(error);
  }
});
r.get("/theme.css", (req, res) => {
  const u = getUi(req.user.id),
    preset = getSidebarCatalog(req.tenantId, { includeHidden: true }).find((x) => x.key === u.sidebar_key);
  const vars = {
    "--primary": u.primary_color,
    "--accent": u.accent_color,
    "--page": u.page_bg,
    "--card": u.card_bg,
    "--border": u.border_color,
    "--text": u.text_color,
    "--muted": u.muted_color,
    "--radius": `${u.radius}px`,
    "--sidebar": `${u.sidebar_width}px`,
    "--fs": `${u.font_size}px`,
    "--font": JSON.stringify(u.font_family),
    "--body-weight": u.body_weight,
    "--line-height": u.body_line_height,
    "--content-max": `${u.content_max_width}px`,
    "--content-px": `${u.content_padding_x}px`,
    "--content-py": `${u.content_padding_y}px`,
    "--page-head-bg": u.page_header_bg,
    "--page-head-text": u.page_header_text,
    "--page-head-muted": u.page_header_muted,
    "--page-head-border": u.page_header_border,
    "--page-head-radius": `${u.page_header_radius}px`,
    "--page-head-padding": `${u.page_header_padding}px`,
    "--card-radius": `${u.card_radius}px`,
    "--card-border-width": `${u.card_border_width}px`,
    "--card-shadow": `0 ${Math.max(1, Math.round(u.card_shadow / 2))}px ${Math.max(0, u.card_shadow * 4)}px rgba(15,42,75,${Math.min(0.24, u.card_shadow / 100).toFixed(2)})`,
    "--card-padding": `${u.card_padding}px`,
    "--inner-bg": u.inner_panel_bg,
    "--inner-border": u.inner_panel_border,
    "--inner-radius": `${u.inner_panel_radius}px`,
    "--metric-bg": u.metric_bg,
    "--metric-text": u.metric_text,
    "--metric-icon-bg": u.metric_icon_bg,
    "--metric-icon-text": u.metric_icon_text,
    "--metric-radius": `${u.metric_radius}px`,
    "--topbar-bg": u.topbar_bg,
    "--topbar-text": u.topbar_text,
    "--topbar-border": u.topbar_border,
    "--topbar-height": `${u.topbar_height}px`,
    "--topbar-blur": `${u.topbar_blur}px`,
    "--topbar-position": u.topbar_sticky ? "sticky" : "relative",
    "--sidebar-bg": u.sidebar_bg,
    "--sidebar-text": u.sidebar_text,
    "--sidebar-muted": u.sidebar_muted,
    "--sidebar-border": u.sidebar_border,
    "--sidebar-padding": `${u.sidebar_padding}px`,
    "--brand-bg": u.brand_bg,
    "--brand-border": u.brand_border,
    "--brand-radius": `${u.brand_radius}px`,
    "--brand-height": `${u.brand_height}px`,
    "--brand-logo-width": `${u.brand_logo_width}px`,
    "--sidebar-status-bg": u.sidebar_status_bg,
    "--sidebar-status-text": u.sidebar_status_text,
    "--menu-bg": u.menu_bg,
    "--menu-text": u.menu_text,
    "--menu-border": u.menu_border,
    "--menu-radius": `${u.menu_radius}px`,
    "--menu-height": `${u.menu_height}px`,
    "--menu-gap": `${u.menu_gap}px`,
    "--menu-hover-bg": u.menu_hover_bg,
    "--menu-hover-text": u.menu_hover_text,
    "--menu-active-bg": u.menu_active_bg,
    "--menu-active-text": u.menu_active_text,
    "--menu-active-border": u.menu_active_border,
    "--menu-icon-bg": u.menu_icon_bg,
    "--menu-icon-text": u.menu_icon_text,
    "--menu-icon-size": `${u.menu_icon_size}px`,
    "--menu-icon-radius": `${u.menu_icon_radius}px`,
    "--submenu-bg": u.submenu_bg,
    "--submenu-text": u.submenu_text,
    "--submenu-active-bg": u.submenu_active_bg,
    "--submenu-active-text": u.submenu_active_text,
    "--submenu-indent": `${u.submenu_indent}px`,
    "--btn-bg": u.primary_btn_bg,
    "--btn-text": u.primary_btn_text,
    "--btn-border": u.primary_btn_border,
    "--btn-soft-bg": u.soft_btn_bg,
    "--btn-soft-text": u.soft_btn_text,
    "--btn-soft-border": u.soft_btn_border,
    "--success-btn-bg": u.success_btn_bg,
    "--success-btn-text": u.success_btn_text,
    "--danger-bg": u.danger_btn_bg,
    "--danger-text": u.danger_btn_text,
    "--button-radius": `${u.button_radius}px`,
    "--button-height": `${u.button_height}px`,
    "--button-shadow": `0 ${Math.max(0, Math.round(u.button_shadow / 3))}px ${u.button_shadow}px rgba(15,42,75,.16)`,
    "--button-font-size": `${u.button_font_size}px`,
    "--button-font-weight": u.button_font_weight,
    "--action-bg": u.action_btn_bg,
    "--action-text": u.action_btn_text,
    "--action-border": u.action_btn_border,
    "--action-size": `${u.action_btn_size}px`,
    "--action-radius": `${u.action_btn_radius}px`,
    "--input-bg": u.input_bg,
    "--input-text": u.input_text,
    "--input-border": u.input_border,
    "--input-focus": u.input_focus,
    "--input-placeholder": u.input_placeholder,
    "--input-label": u.input_label,
    "--input-disabled-bg": u.input_disabled_bg,
    "--input-disabled-text": u.input_disabled_text,
    "--input-radius": `${u.input_radius}px`,
    "--input-height": `${u.input_height}px`,
    "--input-border-width": `${u.input_border_width}px`,
    "--input-focus-ring": `${u.input_focus_ring}px`,
    "--table-head-bg": u.table_header_bg,
    "--table-head-text": u.table_header_text,
    "--table-row-bg": u.table_row_bg,
    "--table-alt-bg": u.table_alt_bg,
    "--table-hover-bg": u.table_hover_bg,
    "--table-border": u.table_border,
    "--table-row-height": `${u.table_row_height}px`,
    "--table-font-size": `${u.table_font_size}px`,
    "--table-cell-padding": `${u.table_cell_padding}px`,
    "--table-radius": `${u.table_radius}px`,
    "--success-bg": u.success_bg,
    "--success-text": u.success_text,
    "--warning-bg": u.warning_bg,
    "--warning-text": u.warning_text,
    "--error-bg": u.error_bg,
    "--error-text": u.error_text,
    "--info-bg": u.info_bg,
    "--info-text": u.info_text,
    "--badge-radius": `${u.badge_radius}px`,
    "--badge-font-size": `${u.badge_font_size}px`,
    "--modal-bg": u.modal_bg,
    "--modal-text": u.modal_text,
    "--modal-border": u.modal_border,
    "--modal-overlay": u.modal_overlay,
    "--modal-radius": `${u.modal_radius}px`,
    "--dropdown-bg": u.dropdown_bg,
    "--dropdown-text": u.dropdown_text,
    "--dropdown-border": u.dropdown_border,
    "--tooltip-bg": u.tooltip_bg,
    "--tooltip-text": u.tooltip_text,
    "--toast-bg": u.toast_bg,
    "--toast-text": u.toast_text,
    "--toast-border": u.toast_border,
    "--toast-radius": `${u.toast_radius}px`,
    "--heading-color": u.heading_color,
    "--heading-weight": u.heading_weight,
    "--heading-font": JSON.stringify(u.heading_font_family || u.font_family),
    "--sidebar-font": JSON.stringify(u.sidebar_font_family || u.font_family),
    "--table-font": JSON.stringify(u.table_font_family || u.font_family),
    "--button-font": JSON.stringify(u.button_font_family || u.font_family),
    "--h1-size": `${u.h1_size}px`,
    "--h2-size": `${u.h2_size}px`,
    "--h3-size": `${u.h3_size}px`,
    "--small-size": `${u.small_size}px`,
    "--label-color": u.label_color,
    "--link-color": u.link_color,
    "--scrollbar-track": u.scrollbar_track,
    "--scrollbar-thumb": u.scrollbar_thumb,
    "--scrollbar-width": `${u.scrollbar_width}px`,
    "--motion": u.animations_enabled ? `${u.animation_speed}ms` : "0ms"
  };
  // Kullanıcının seçtiği tema renkleri tasarım sisteminin tokenlarını besler.
  const dsTokens = [
    `--ds-bg:${u.page_bg}`,
    `--ds-surface:${u.card_bg}`,
    `--ds-surface-2:${u.table_alt_bg || u.inner_panel_bg}`,
    `--ds-line:${u.border_color}`,
    `--ds-ink:${u.text_color}`,
    `--ds-ink-3:${u.muted_color}`
  ].join(";");
  const root = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  const rules = `
 html,body{font-family:var(--font)!important;font-size:var(--fs)!important;font-weight:var(--body-weight);line-height:var(--line-height);background:var(--page);color:var(--text)}
 .page-wrap{max-width:var(--content-max)!important;padding:var(--content-py) var(--content-px) 88px!important}.page-head{background:var(--page-head-bg);color:var(--page-head-text);border:1px solid var(--page-head-border);border-radius:var(--page-head-radius);padding:var(--page-head-padding)}.page-head h1,.page-head h2{color:var(--page-head-text)!important}.page-head p,.page-head small{color:var(--page-head-muted)!important}
 .card{padding:var(--card-padding);border-width:var(--card-border-width)!important;border-radius:var(--card-radius)!important;box-shadow:var(--card-shadow)!important;background:var(--card)!important}.panel,.subcard,.summary-box,.workflow-card{background:var(--inner-bg)!important;border-color:var(--inner-border)!important;border-radius:var(--inner-radius)!important}.metric-card,.dashboard-stat,.stat-card{background:var(--metric-bg)!important;color:var(--metric-text)!important;border-radius:var(--metric-radius)!important}.metric-card__icon,.stat-card__icon{background:var(--metric-icon-bg)!important;color:var(--metric-icon-text)!important}
 .topbar{position:var(--topbar-position)!important;min-height:var(--topbar-height)!important;background:var(--topbar-bg)!important;color:var(--topbar-text)!important;border-color:var(--topbar-border)!important;backdrop-filter:blur(var(--topbar-blur))!important}.sidebar{padding:var(--sidebar-padding)!important;background:var(--sidebar-bg)!important;color:var(--sidebar-text)!important;border-color:var(--sidebar-border)!important}.brand-logo{height:var(--brand-height)!important;background:var(--brand-bg)!important;border-color:var(--brand-border)!important;border-radius:var(--brand-radius)!important}.brand-logo img,.brand-card img{max-width:var(--brand-logo-width)!important}.brand-card small,.brand-card__top{color:var(--sidebar-muted)!important}.brand-card .status,.brand-card .tag--success{background:var(--sidebar-status-bg)!important;color:var(--sidebar-status-text)!important}
 .sidebar,.sidebar .menu{font-family:var(--sidebar-font)!important}.menu{gap:var(--menu-gap)!important}.menu__item,.menu summary{min-height:var(--menu-height)!important;background:var(--menu-bg)!important;color:var(--menu-text)!important;border-color:var(--menu-border)!important;border-radius:var(--menu-radius)!important}.menu__item:hover,.menu summary:hover{background:var(--menu-hover-bg)!important;color:var(--menu-hover-text)!important}.menu__item.is-active,.menu details[open]>summary{background:var(--menu-active-bg)!important;color:var(--menu-active-text)!important;border-color:var(--menu-active-border)!important}.menu__icon,.menu__item>span:first-child,.menu summary>span:first-child{width:var(--menu-icon-size)!important;height:var(--menu-icon-size)!important;background:var(--menu-icon-bg)!important;color:var(--menu-icon-text)!important;border-radius:var(--menu-icon-radius)!important}.menu details>a{padding-left:var(--submenu-indent)!important;background:var(--submenu-bg)!important;color:var(--submenu-text)!important}.menu details>a:hover,.menu details>a.is-active{background:var(--submenu-active-bg)!important;color:var(--submenu-active-text)!important}
 .btn{font-family:var(--button-font)!important;min-height:var(--button-height);border-radius:var(--button-radius)!important;box-shadow:var(--button-shadow);font-size:var(--button-font-size)!important;font-weight:var(--button-font-weight)!important}.btn--primary{background:var(--btn-bg)!important;color:var(--btn-text)!important;border-color:var(--btn-border)!important}.btn--soft{background:var(--btn-soft-bg)!important;color:var(--btn-soft-text)!important;border-color:var(--btn-soft-border)!important}.btn--success,.btn--whatsapp{background:var(--success-btn-bg)!important;color:var(--success-btn-text)!important}.btn--danger{background:var(--danger-bg)!important;color:var(--danger-text)!important}.table-action,.icon-btn,.action-icon{width:var(--action-size)!important;height:var(--action-size)!important;min-width:var(--action-size)!important;background:var(--action-bg)!important;color:var(--action-text)!important;border-color:var(--action-border)!important;border-radius:var(--action-radius)!important}
 label{color:var(--input-label)!important}input:not([type=color]):not([type=checkbox]):not([type=radio]),select,textarea{min-height:var(--input-height);background:var(--input-bg)!important;color:var(--input-text)!important;border-color:var(--input-border)!important;border-width:var(--input-border-width)!important;border-radius:var(--input-radius)!important}::placeholder{color:var(--input-placeholder)!important}input:disabled,select:disabled,textarea:disabled{background:var(--input-disabled-bg)!important;color:var(--input-disabled-text)!important}input:focus,select:focus,textarea:focus{border-color:var(--input-focus)!important;box-shadow:0 0 0 var(--input-focus-ring) color-mix(in srgb,var(--input-focus) 18%,transparent)!important}
 .table-scroll,table,.table{border-radius:var(--table-radius)!important}table,.table{font-family:var(--table-font)!important;font-size:var(--table-font-size)!important}table thead th,.table th{background:var(--table-head-bg)!important;color:var(--table-head-text)!important;border-color:var(--table-border)!important;padding:var(--table-cell-padding)!important}table tbody tr,.table tbody tr{min-height:var(--table-row-height);background:var(--table-row-bg)}table tbody tr:nth-child(even),.table tbody tr:nth-child(even){background:var(--table-alt-bg)}table tbody tr:hover,.table tbody tr:hover{background:var(--table-hover-bg)!important}table td,.table td{height:var(--table-row-height);padding:var(--table-cell-padding)!important;border-color:var(--table-border)!important}
 h1{font-family:var(--heading-font)!important;color:var(--heading-color)!important;font-size:var(--h1-size)!important;font-weight:var(--heading-weight)!important}h2{font-family:var(--heading-font)!important;color:var(--heading-color)!important;font-size:var(--h2-size)!important;font-weight:var(--heading-weight)!important}h3{font-family:var(--heading-font)!important;color:var(--heading-color)!important;font-size:var(--h3-size)!important;font-weight:var(--heading-weight)!important}small,.small{font-size:var(--small-size)!important}a{color:var(--link-color)}.tag,.status,.badge{border-radius:var(--badge-radius)!important;font-size:var(--badge-font-size)!important}.tag--success,.status--success{background:var(--success-bg)!important;color:var(--success-text)!important}.toast--error,.tag--danger,.status--danger{background:var(--error-bg)!important;color:var(--error-text)!important}.tag--warning,.status--warning{background:var(--warning-bg)!important;color:var(--warning-text)!important}.tag--info,.status--info{background:var(--info-bg)!important;color:var(--info-text)!important}
 .modal{background:color-mix(in srgb,var(--modal-overlay) 76%,transparent)!important}.modal-card,.dialog,.popover{background:var(--modal-bg)!important;color:var(--modal-text)!important;border-color:var(--modal-border)!important;border-radius:var(--modal-radius)!important}.dropdown,.select-menu,.menu-popover{background:var(--dropdown-bg)!important;color:var(--dropdown-text)!important;border-color:var(--dropdown-border)!important}.toast,.flash{background:var(--toast-bg)!important;color:var(--toast-text)!important;border-color:var(--toast-border)!important;border-radius:var(--toast-radius)!important}[data-tooltip]:after,.tooltip{background:var(--tooltip-bg)!important;color:var(--tooltip-text)!important}
 *{transition-duration:var(--motion)}*{scrollbar-color:var(--scrollbar-thumb) var(--scrollbar-track);scrollbar-width:auto}*::-webkit-scrollbar{width:var(--scrollbar-width);height:var(--scrollbar-width)}*::-webkit-scrollbar-track{background:var(--scrollbar-track)}*::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:999px}
 /* crmv1.11: active theme is the final visual authority. Legacy UI files must never turn
    dark themes back into white cards, dashboard surfaces, menus or mobile panels. */
 body .app-main,body .page-wrap,body .app-content{background:var(--page)!important;color:var(--text)!important}
 body .card,body .panel,body .subcard,body .table-scroll,body .list-table-card,body .dashboard-widget,body .dashboard-widget-card,body .form-card,body .toolbar,body .filters-card,body .setting-card,body .profile-card,body .template-card,body .workspace-toolbar,body .shortcut-manager-grid section,body .dashboard-widget-manager-card-v18,body .dashboard-widget-catalog-v18>button,body .table-column-menu-v3817__panel,body .table-preference-bar-v3817{background-color:var(--card)!important;color:var(--text)!important;border-color:var(--border)!important}
 body .metric,body .metric-card,body .dashboard-stat,body .stat-card{background:var(--metric-bg)!important;color:var(--metric-text)!important;border-color:var(--border)!important}body .metric__icon,body .metric-card__icon,body .stat-card__icon,body .decision-card__icon{background:var(--metric-icon-bg)!important;color:var(--metric-icon-text)!important;border-color:var(--border)!important}
 body .decision-card{background:var(--card)!important;color:var(--text)!important;border-color:var(--border)!important}body .decision-card--approved .decision-card__icon{background:var(--success-bg)!important;color:var(--success-text)!important}body .decision-card--quote .decision-card__icon{background:var(--warning-bg)!important;color:var(--warning-text)!important}body .decision-card--payment .decision-card__icon,body .decision-card--rate .decision-card__icon{background:var(--info-bg)!important;color:var(--info-text)!important}
 body .dashboard-shortcuts-dynamic,body .dashboard-shortcuts-dynamic>a,body .shortcut-row{background:var(--card)!important;color:var(--text)!important;border-color:var(--border)!important}body .dashboard-shortcuts-dynamic>a>span,body .shortcut-row>span{background:var(--inner-bg)!important;color:var(--link-color)!important}
 body .mobile-home-v4__panel,body .mobile-home-v4__stats>a,body .mobile-home-v4__list>a,body .mobile-home-v4__list>div{background:var(--card)!important;color:var(--text)!important;border-color:var(--border)!important}body .mobile-home-v4__panel>header,body .mobile-home-v4__go{background:var(--inner-bg)!important;color:var(--text)!important;border-color:var(--inner-border)!important}
 body .theme-design-library-v363,body .theme-preset-hub-v18,body .theme-login-studio-v359 .theme-studio-preview-card-v359,body .theme-login-studio-v359 .theme-studio-controls-v359,body .login-studio-controls-head,body .login-studio-controls details,body .login-studio-savebar{background:var(--card)!important;color:var(--text)!important;border-color:var(--border)!important}
 body .theme-live-modal-v359,body .theme-live-modal-stage-v359{background:var(--page)!important;color:var(--text)!important}body .login-live-modal-bar{background:var(--card)!important;color:var(--text)!important;border-color:var(--border)!important}
 body table tbody tr,body .table tbody tr{background:var(--table-row-bg)!important;color:var(--text)!important}body table tbody tr:nth-child(even),body .table tbody tr:nth-child(even){background:var(--table-alt-bg)!important}body table td,body .table td{color:var(--text)!important;background-color:transparent!important}
 body .sidebar{background-color:var(--sidebar-bg)!important;color:var(--sidebar-text)!important;border-color:var(--sidebar-border)!important}body .sidebar .brand-card,body .sidebar .brand-logo{background-color:var(--brand-bg)!important;border-color:var(--brand-border)!important;color:var(--sidebar-text)!important}
 body .sidebar .menu__item,body .sidebar .menu summary{background-color:var(--menu-bg)!important;color:var(--menu-text)!important;border-color:var(--menu-border)!important}body .sidebar .menu__item:hover,body .sidebar .menu summary:hover{background-color:var(--menu-hover-bg)!important;color:var(--menu-hover-text)!important}body .sidebar .menu__item.is-active,body .sidebar .menu details[open]>summary{background-color:var(--menu-active-bg)!important;color:var(--menu-active-text)!important;border-color:var(--menu-active-border)!important}body .sidebar .menu details>a{background-color:var(--submenu-bg)!important;color:var(--submenu-text)!important}body .sidebar .menu details>a:hover,body .sidebar .menu details>a.is-active{background-color:var(--submenu-active-bg)!important;color:var(--submenu-active-text)!important}
 body input:not([type=color]):not([type=checkbox]):not([type=radio]),body select,body textarea{background-color:var(--input-bg)!important;color:var(--input-text)!important;border-color:var(--input-border)!important}body .modal-card,body .dialog,body .popover{background-color:var(--modal-bg)!important;color:var(--modal-text)!important;border-color:var(--modal-border)!important}
 `;
  const custom = [String(preset?.custom_css || ""), String(u.custom_css || "")].join("\n"),
    themeVersion = String(u.updated_at || "default");
  res
    .set(
      "Cache-Control",
      String(req.query.v || "") === themeVersion
        ? "private, max-age=31536000, immutable"
        : "private, no-cache"
    )
    .type("css")
    // crmv1.46 — tek tema motoru: bu uç nokta artık yalnızca token yayımlar.
    // Görünümün tamamı tasarım sisteminden (arteva-ds-v2.css) gelir; buradaki
    // eski !important kural bloğu kaldırıldı, kullanıcı renkleri DS tokenlarına
    // bağlanır. `rules` yalnızca özel CSS'i sıraya sokmak için korunur.
    .send(`:root{${root};${dsTokens}}\n${custom}`);
});
export default r;

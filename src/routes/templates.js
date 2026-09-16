import { Router } from "express";
import { db } from "../db/db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { jsonParse } from "../utils/json.js";
import {
  allowedLayouts,
  safeLayout,
  sanitizeTemplateHtml,
  sanitizeTemplateCss,
  starterCustomHtml,
  starterCustomCss
} from "../services/template-html.service.js";
import { quotePrintData } from "../services/quote-render.service.js";
import {
  artevaClassicTemplate,
  ensureProfessionalTemplateLibrary,
  legacyV112TemplateKeys,
  reconcileTemplateLibraryV120
} from "../services/template-library.service.js";
import { id } from "../utils/id.js";
const r = Router();
r.use(requireAuth, requirePermission("settings", "view"));
const wantsJson = (req) =>
  String(req.get("accept") || "").includes("application/json") ||
  req.xhr ||
  String(req.body?._ajax || "") === "1";
const defaultBlocks = ["header", "customer", "items", "totals", "terms", "bank", "signature", "footer"];
const asObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const defaultTemplateSettings = {
  show_logo: true,
  show_images: true,
  show_code: true,
  show_vat: true,
  show_discount: true,
  show_fx: true,
  show_bank: true,
  show_stamp: true,
  show_customer_approval: true,
  show_alternative_badge: true,
  alternative_badge_color: "#f59e0b",
  alternative_badge_text_color: "#3b2200",
  alternative_badge_position: "top-left",
  watermark: "",
  footer: "",
  table_color: "#245ba7",
  column_widths: "",
  design_version: 1,
  header_variant: "split",
  customer_variant: "card",
  item_variant: "grid",
  terms_variant: "boxed",
  bank_variant: "table",
  signature_variant: "split",
  border_style: "solid",
  logo_position: "left",
  logo_width_mm: 34,
  logo_height_mm: 15,
  logo_offset_x_mm: 0,
  logo_offset_y_mm: 0,
  title_variant: "boxed",
  totals_variant: "right",
  footer_variant: "line",
  spacing_variant: "balanced",
  table_density: "balanced",
  image_variant: "contain",
  show_footer: true,
  card_radius: 4,
  custom_palette_enabled: false,
  page_bg_color: "#ffffff",
  body_text_color: "#111827",
  muted_text_color: "#64748b",
  border_color: "#cbd5e1",
  company_bg_color: "#ffffff",
  company_text_color: "#111827",
  meta_bg_color: "#ffffff",
  meta_text_color: "#111827",
  title_bg_color: "#ffffff",
  title_text_color: "#245ba7",
  customer_bg_color: "#ffffff",
  customer_text_color: "#111827",
  table_header_bg_color: "#245ba7",
  table_header_text_color: "#ffffff",
  table_row_bg_color: "#ffffff",
  table_alt_bg_color: "#f8fafc",
  table_text_color: "#111827",
  link_color: "#245ba7",
  totals_bg_color: "#ffffff",
  totals_text_color: "#111827",
  grand_total_bg_color: "#eff6ff",
  grand_total_text_color: "#17345d",
  discount_color: "#f05252",
  terms_bg_color: "#ffffff",
  terms_header_bg_color: "#245ba7",
  terms_header_text_color: "#ffffff",
  terms_text_color: "#111827",
  bank_bg_color: "#ffffff",
  bank_header_bg_color: "#245ba7",
  bank_header_text_color: "#ffffff",
  bank_text_color: "#111827",
  signature_bg_color: "#ffffff",
  signature_text_color: "#111827",
  footer_bg_color: "#ffffff",
  footer_text_color: "#475569",
  use_custom_html: false,
  custom_html: "",
  custom_css: ""
};
const templateSettings = (v) => ({ ...defaultTemplateSettings, ...asObject(jsonParse(v, {})) });
const adminOnly = requirePermission("settings", "admin");
const activeTemplateWhere = "COALESCE(deleted_at,0)=0";
const safeBlocks = (v) => {
  const x = jsonParse(v, defaultBlocks);
  return Array.isArray(x) && x.length ? x.filter((b) => defaultBlocks.includes(b)) : defaultBlocks;
};
const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v) : d);
const font = (v) =>
  String(v || "Inter")
    .replace(/[^a-z0-9 ,_-]/gi, "")
    .slice(0, 60) || "Inter";
const alternativePosition = (v) =>
  ["top-left", "top-right", "bottom-left", "bottom-right", "inline"].includes(String(v || ""))
    ? String(v)
    : "top-left";
const choice = (value, allowed, fallback) =>
  allowed.includes(String(value || "")) ? String(value) : fallback;
function templateSettingsFromBody(previous, body) {
  const current = templateSettings(previous);
  const structuralEnabled =
    body.enable_structural_design == null
      ? Number(current.design_version || 0) >= 2
      : String(body.enable_structural_design) === "1";
  return {
    ...current,
    design_version: structuralEnabled ? 2 : 1,
    header_variant: choice(
      body.header_variant,
      ["split", "centered", "band", "sidebar", "letterhead", "corner"],
      current.header_variant
    ),
    customer_variant: choice(
      body.customer_variant,
      ["card", "strip", "two-column", "minimal", "banner", "ledger"],
      current.customer_variant
    ),
    item_variant: choice(
      body.item_variant,
      ["grid", "lines", "cards", "catalog", "zebra", "brochure"],
      current.item_variant
    ),
    terms_variant: choice(
      body.terms_variant,
      ["boxed", "timeline", "columns", "plain", "numbered", "band"],
      current.terms_variant
    ),
    bank_variant: choice(
      body.bank_variant,
      ["table", "band", "compact", "cards", "ledger", "inline"],
      current.bank_variant
    ),
    signature_variant: choice(
      body.signature_variant,
      ["split", "stacked", "approval", "minimal", "seal", "single"],
      current.signature_variant
    ),
    border_style: choice(
      body.border_style,
      ["solid", "soft", "none", "double", "accent", "dashed"],
      current.border_style
    ),
    logo_position: choice(body.logo_position, ["left", "center", "right", "floating"], current.logo_position),
    logo_width_mm: Math.max(18, Math.min(64, Number(body.logo_width_mm ?? current.logo_width_mm) || 34)),
    logo_height_mm: Math.max(8, Math.min(30, Number(body.logo_height_mm ?? current.logo_height_mm) || 15)),
    logo_offset_x_mm: Math.max(-35, Math.min(35, Number(body.logo_offset_x_mm ?? current.logo_offset_x_mm) || 0)),
    logo_offset_y_mm: Math.max(-18, Math.min(24, Number(body.logo_offset_y_mm ?? current.logo_offset_y_mm) || 0)),
    title_variant: choice(
      body.title_variant,
      ["boxed", "underline", "pill", "plain", "split"],
      current.title_variant
    ),
    totals_variant: choice(body.totals_variant, ["right", "band", "cards", "full"], current.totals_variant),
    footer_variant: choice(body.footer_variant, ["line", "band", "split", "minimal"], current.footer_variant),
    spacing_variant: choice(
      body.spacing_variant,
      ["compact", "balanced", "spacious"],
      current.spacing_variant
    ),
    table_density: choice(body.table_density, ["compact", "balanced", "comfortable"], current.table_density),
    image_variant: choice(
      body.image_variant,
      ["contain", "square", "rounded", "circle"],
      current.image_variant
    ),
    card_radius: Math.max(0, Math.min(24, Number(body.card_radius ?? current.card_radius) || 0)),
    show_logo: body.show_logo == null ? current.show_logo : String(body.show_logo) === "1",
    show_images: body.show_images == null ? current.show_images : String(body.show_images) === "1",
    show_code: body.show_code == null ? current.show_code : String(body.show_code) === "1",
    show_vat: body.show_vat == null ? current.show_vat : String(body.show_vat) === "1",
    show_discount: body.show_discount == null ? current.show_discount : String(body.show_discount) === "1",
    show_fx: body.show_fx == null ? current.show_fx : String(body.show_fx) === "1",
    show_bank: body.show_bank == null ? current.show_bank : String(body.show_bank) === "1",
    show_stamp: body.show_stamp == null ? current.show_stamp : String(body.show_stamp) === "1",
    show_footer: body.show_footer == null ? current.show_footer : String(body.show_footer) === "1",
    show_customer_approval:
      body.show_customer_approval == null
        ? current.show_customer_approval
        : String(body.show_customer_approval) === "1",
    show_alternative_badge:
      body.show_alternative_badge == null
        ? current.show_alternative_badge
        : String(body.show_alternative_badge) === "1",
    alternative_badge_color: hex(body.alternative_badge_color, "#f59e0b"),
    alternative_badge_text_color: hex(body.alternative_badge_text_color, "#3b2200"),
    alternative_badge_position: alternativePosition(body.alternative_badge_position),
    custom_palette_enabled:
      body.custom_palette_enabled == null
        ? Boolean(current.custom_palette_enabled)
        : String(body.custom_palette_enabled) === "1",
    page_bg_color: hex(body.page_bg_color, current.page_bg_color || "#ffffff"),
    body_text_color: hex(body.body_text_color, current.body_text_color || "#111827"),
    muted_text_color: hex(body.muted_text_color, current.muted_text_color || "#64748b"),
    border_color: hex(body.border_color, current.border_color || "#cbd5e1"),
    company_bg_color: hex(body.company_bg_color, current.company_bg_color || "#ffffff"),
    company_text_color: hex(body.company_text_color, current.company_text_color || "#111827"),
    meta_bg_color: hex(body.meta_bg_color, current.meta_bg_color || "#ffffff"),
    meta_text_color: hex(body.meta_text_color, current.meta_text_color || "#111827"),
    title_bg_color: hex(body.title_bg_color, current.title_bg_color || "#ffffff"),
    title_text_color: hex(body.title_text_color, current.title_text_color || "#245ba7"),
    customer_bg_color: hex(body.customer_bg_color, current.customer_bg_color || "#ffffff"),
    customer_text_color: hex(body.customer_text_color, current.customer_text_color || "#111827"),
    table_header_bg_color: hex(body.table_header_bg_color, current.table_header_bg_color || "#245ba7"),
    table_header_text_color: hex(body.table_header_text_color, current.table_header_text_color || "#ffffff"),
    table_row_bg_color: hex(body.table_row_bg_color, current.table_row_bg_color || "#ffffff"),
    table_alt_bg_color: hex(body.table_alt_bg_color, current.table_alt_bg_color || "#f8fafc"),
    table_text_color: hex(body.table_text_color, current.table_text_color || "#111827"),
    link_color: hex(body.link_color, current.link_color || "#245ba7"),
    totals_bg_color: hex(body.totals_bg_color, current.totals_bg_color || "#ffffff"),
    totals_text_color: hex(body.totals_text_color, current.totals_text_color || "#111827"),
    grand_total_bg_color: hex(body.grand_total_bg_color, current.grand_total_bg_color || "#eff6ff"),
    grand_total_text_color: hex(body.grand_total_text_color, current.grand_total_text_color || "#17345d"),
    discount_color: hex(body.discount_color, current.discount_color || "#f05252"),
    terms_bg_color: hex(body.terms_bg_color, current.terms_bg_color || "#ffffff"),
    terms_header_bg_color: hex(body.terms_header_bg_color, current.terms_header_bg_color || "#245ba7"),
    terms_header_text_color: hex(body.terms_header_text_color, current.terms_header_text_color || "#ffffff"),
    terms_text_color: hex(body.terms_text_color, current.terms_text_color || "#111827"),
    bank_bg_color: hex(body.bank_bg_color, current.bank_bg_color || "#ffffff"),
    bank_header_bg_color: hex(body.bank_header_bg_color, current.bank_header_bg_color || "#245ba7"),
    bank_header_text_color: hex(body.bank_header_text_color, current.bank_header_text_color || "#ffffff"),
    bank_text_color: hex(body.bank_text_color, current.bank_text_color || "#111827"),
    signature_bg_color: hex(body.signature_bg_color, current.signature_bg_color || "#ffffff"),
    signature_text_color: hex(body.signature_text_color, current.signature_text_color || "#111827"),
    footer_bg_color: hex(body.footer_bg_color, current.footer_bg_color || "#ffffff"),
    footer_text_color: hex(body.footer_text_color, current.footer_text_color || "#475569"),
    use_custom_html: String(body.use_custom_html || "") === "1",
    custom_html: sanitizeTemplateHtml(body.custom_html || starterCustomHtml),
    custom_css: sanitizeTemplateCss(body.custom_css || starterCustomCss)
  };
}
const sample = {
  quote_no: "TEK260001",
  revision_no: 0,
  quote_date: "2026-06-10",
  valid_until: "2026-06-20",
  currency: "EUR",
  fx_rate: 53.29,
  subject: "Örnek Ürün ve Hizmet Teklifi",
  subtotal: 2150,
  discount_total: 100,
  vat_total: 410,
  grand_total: 2460,
  profile_snapshot: {
    company_name: "ÖRNEK FİRMA PROFİLİ",
    short_name: "ÖRNEK",
    quote_prefix: "ORNEK",
    authorized_person: "Ad Soyad / Unvan",
    address: "Örnek Adres / Ankara",
    phone: "0312 000 00 00",
    email: "info@example.com",
    website: "www.example.com",
    logo_url: "/public/img/demo-logo.svg",
    bank_name: "Örnek Banka / Merkez Şube",
    iban_try: "TR00 0000 0000 0000 0000 0000 01",
    iban_eur: "TR00 0000 0000 0000 0000 0000 02",
    iban_usd: "TR00 0000 0000 0000 0000 0000 03",
    swift_bic: "ORNEKTRISXXX"
  },
  customer_snapshot: {
    company_name: "ÖRNEK MÜŞTERİ A.Ş.",
    contact_name: "Satın Alma Yetkilisi",
    address1: "Örnek Mah. Teknoloji Cad. No:1",
    city: "İstanbul",
    phone: "0212 000 00 00",
    email: "satinalma@example.com",
    tax_no: "1234567890"
  },
  payment_terms: "Sipariş ile birlikte %50 peşin, bakiye teslimattan önce.",
  delivery_terms: "Sipariş tarihinden itibaren 4-6 hafta.",
  shipping_terms: "Nakliye hariçtir.",
  installation_terms: "Kurulum ve eğitim dahildir.",
  warranty_terms: "Ürünler 2 yıl garantilidir.",
  items: [
    {
      product_snapshot: {
        code: "ORN-URUN-001",
        name: "Örnek Laboratuvar Cihazı",
        image_url: "/public/img/demo-product.svg",
        short_description:
          "Örnek ürün açıklaması. Ürün özellikleri ve teklif kapsamı bu alanda tam olarak gösterilir.",
        technical_description: "Örnek teknik açıklama: ölçü, kapasite ve çalışma aralığı bilgileri."
      },
      quantity: 1,
      unit: "ADET",
      unit_price: 1250,
      discount_type: "PERCENT",
      discount_value: 5,
      vat_rate: 20,
      line_net: 1187.5,
      line_vat: 237.5,
      line_total: 1425,
      show_image: 1,
      show_description: 1,
      show_technical: 1
    },
    {
      product_snapshot: {
        code: "ORN-MDL-002",
        name: "ARTEVA UF1060 Fanlı Etüv",
        image_url: "/public/img/demo-product.svg",
        short_description: "Memmert UF1060 modeline yerli üretim teknik muadil olarak sunulmuştur.",
        technical_description: "Örnek teknik not: +10…+300 °C, fanlı hava dolaşımı."
      },
      quantity: 1,
      unit: "ADET",
      unit_price: 1000,
      discount_type: "AMOUNT",
      discount_value: 50,
      vat_rate: 20,
      line_net: 950,
      line_vat: 190,
      line_total: 1140,
      show_image: 1,
      show_description: 1,
      show_technical: 1,
      is_alternative: 1,
      alternative_to_name: "Memmert UF1060",
      alternative_type: "LOCAL",
      alternative_note: "Yerli üretim muadil",
      include_total: 0
    }
  ]
};
function sampleForTenant(tenantId) {
  const active = db
    .prepare("SELECT logo_url FROM profiles WHERE tenant_id=? AND is_active=1 AND COALESCE(deleted_at,0)=0 LIMIT 1")
    .get(tenantId);
  return {
    ...sample,
    profile_snapshot: {
      ...sample.profile_snapshot,
      logo_url: String(active?.logo_url || sample.profile_snapshot.logo_url || "/public/img/demo-logo.svg")
    }
  };
}
r.get("/", (req, res) => {
  const templateRestoreReport = reconcileTemplateLibraryV120(req.tenantId);
  ensureProfessionalTemplateLibrary(req.tenantId);
  const legacyKeys = new Set(legacyV112TemplateKeys);
  const rows = db
    .prepare(
      "SELECT * FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_default DESC,name"
    )
    .all(req.tenantId)
    .map((row) => ({
      ...row,
      template_origin:
        row.template_key === artevaClassicTemplate.template_key
          ? "reference"
          : legacyKeys.has(row.template_key)
            ? "legacy-v112"
            : "current"
    }))
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return Number(b.is_default) - Number(a.is_default);
      const rank = { reference: 0, "legacy-v112": 1, current: 2 };
      return rank[a.template_origin] - rank[b.template_origin] || a.name.localeCompare(b.name, "tr");
    });
  let editRow = null,
    editSettings = null;
  if (req.query.edit) {
    const found = db
      .prepare("SELECT * FROM quote_templates WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
      .get(req.tenantId, String(req.query.edit));
    if (found) {
      editRow = {
        ...found,
        layout_key: safeLayout(found.layout_key, "classic"),
        primary_color: hex(found.primary_color, "#245ba7"),
        accent_color: hex(found.accent_color, "#d83238"),
        font_family: font(found.font_family || "Inter"),
        font_size: Number(found.font_size) || 11
      };
      editSettings = templateSettings(found.settings_json);
    }
  }
  res.render("templates/index", {
    title: "Proforma Şablonları",
    rows,
    templateRestoreReport,
    editRow,
    editSettings,
    starterCustomHtml,
    starterCustomCss
  });
});
r.post("/restore-builtins", adminOnly, (req, res) => {
  const report = reconcileTemplateLibraryV120(req.tenantId, { force: true });
  flash(req, "success", `${report.old} eski şablon geri yüklendi; toplam ${report.total} şablon hazır.`);
  res.redirect("/templates");
});
r.post("/live-preview", adminOnly, (req, res, next) => {
  try {
    const source = req.body.template_id
      ? db
          .prepare("SELECT * FROM quote_templates WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
          .get(req.tenantId, String(req.body.template_id))
      : db
          .prepare(
            "SELECT * FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_default DESC,created_at ASC LIMIT 1"
          )
          .get(req.tenantId);
    const settings = templateSettingsFromBody(source?.settings_json, req.body);
    const template = {
      ...(source || {}),
      id: "live-template-preview",
      template_key: source?.template_key || "live-template-preview",
      name: String(req.body.name || source?.name || "Taslak Proforma").slice(0, 120),
      description: String(req.body.description || source?.description || ""),
      layout_key: safeLayout(req.body.layout_key || source?.layout_key, "classic"),
      primary_color: hex(req.body.primary_color, source?.primary_color || "#245ba7"),
      accent_color: hex(req.body.accent_color, source?.accent_color || "#d83238"),
      font_family: font(req.body.font_family || source?.font_family || "Inter"),
      font_size: Math.min(16, Math.max(8, Number(req.body.font_size) || source?.font_size || 11)),
      settings_json: JSON.stringify(settings)
    };
    const row = { ...sampleForTenant(req.tenantId), template_key: template.template_key };
    res.setHeader("Cache-Control", "no-store");
    res.render("quotes/print", {
      layout: false,
      row,
      isPreview: true,
      autoPrint: false,
      publicView: false,
      embeddedPreview: true,
      templateStudioPreview: true,
      ...quotePrintData(template, row, req.locale)
    });
  } catch (error) {
    next(error);
  }
});
r.post("/create", adminOnly, (req, res, next) => {
  try {
    const now = Date.now(),
      source = db
        .prepare(
          "SELECT * FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_default DESC,created_at ASC LIMIT 1"
        )
        .get(req.tenantId),
      tid = id("tpl"),
      key = `custom-${Date.now().toString(36)}`;
    const settings = templateSettingsFromBody(source?.settings_json, req.body);
    db.prepare(
      `INSERT INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      tid,
      req.tenantId,
      key,
      String(req.body.name || "Yeni Özel Şablon")
        .trim()
        .slice(0, 120) || "Yeni Özel Şablon",
      String(req.body.description || "HTML / CSS ile düzenlenebilir özel proforma şablonu")
        .trim()
        .slice(0, 240),
      safeLayout(req.body.layout_key || source?.layout_key, "classic"),
      hex(req.body.primary_color, source?.primary_color || "#245ba7"),
      hex(req.body.accent_color, source?.accent_color || "#d83238"),
      font(req.body.font_family || source?.font_family || "Inter"),
      Math.min(16, Math.max(8, Number(req.body.font_size) || 11)),
      JSON.stringify(settings),
      JSON.stringify(safeBlocks(source?.block_order_json)),
      0,
      now,
      now
    );
    audit(req, {
      action: "TEMPLATE_CREATE",
      module: "TEMPLATES",
      entityId: tid,
      newValue: { template_key: key }
    });
    const message = "Yeni özel proforma şablonu kaydedildi.";
    if (wantsJson(req)) return res.json({ ok: true, id: tid, message, redirect: "/templates" });
    flash(req, "success", message);
    res.redirect(`/templates?edit=${encodeURIComponent(tid)}`);
  } catch (e) {
    next(e);
  }
});
r.get("/:id/edit", adminOnly, (req, res) =>
  res.redirect(`/templates?edit=${encodeURIComponent(req.params.id)}`)
);
r.post("/:id/save", adminOnly, (req, res, next) => {
  try {
    const old = db
      .prepare("SELECT * FROM quote_templates WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
      .get(req.tenantId, req.params.id);
    if (!old) throw Object.assign(new Error("Şablon bulunamadı."), { status: 404, expose: true });
    const previous = templateSettings(old.settings_json);
    const settings = templateSettingsFromBody(previous, req.body);
    db.prepare(
      "UPDATE quote_templates SET name=?,description=?,layout_key=?,primary_color=?,accent_color=?,font_family=?,font_size=?,settings_json=?,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
    ).run(
      String(req.body.name || old.name)
        .trim()
        .slice(0, 120) || old.name,
      String(req.body.description || old.description || "")
        .trim()
        .slice(0, 240),
      safeLayout(req.body.layout_key, old.layout_key),
      hex(req.body.primary_color, old.primary_color),
      hex(req.body.accent_color, old.accent_color),
      font(req.body.font_family || old.font_family),
      Math.min(16, Math.max(8, Number(req.body.font_size) || old.font_size || 11)),
      JSON.stringify(settings),
      Date.now(),
      req.tenantId,
      req.params.id
    );
    audit(req, {
      action: "TEMPLATE_UPDATE",
      module: "TEMPLATES",
      entityId: req.params.id,
      newValue: { name: req.body.name }
    });
    const message = "Proforma şablonu kaydedildi.";
    if (wantsJson(req)) return res.json({ ok: true, id: req.params.id, message, redirect: "/templates" });
    flash(req, "success", message);
    res.redirect(`/templates?edit=${encodeURIComponent(req.params.id)}`);
  } catch (e) {
    next(e);
  }
});

r.post("/:id/delete", adminOnly, (req, res, next) => {
  try {
    const row = db
      .prepare("SELECT * FROM quote_templates WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
      .get(req.tenantId, req.params.id);
    if (!row) throw Object.assign(new Error("Şablon bulunamadı."), { status: 404, expose: true });
    const count = Number(
      db
        .prepare("SELECT COUNT(*) AS n FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0")
        .get(req.tenantId).n || 0
    );
    if (count <= 1) {
      const message = "En az bir proforma şablonu sistemde kalmalıdır.";
      if (wantsJson(req)) return res.status(409).json({ ok: false, message });
      flash(req, "error", message);
      return res.redirect("/templates");
    }
    db.transaction(() => {
      db.prepare(
        "UPDATE quote_templates SET is_default=0,deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
      ).run(Date.now(), req.user.id, Date.now(), req.tenantId, req.params.id);
      if (row.is_default) {
        const replacement = db
          .prepare(
            "SELECT id FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY created_at ASC LIMIT 1"
          )
          .get(req.tenantId);
        if (replacement)
          db.prepare(
            "UPDATE quote_templates SET is_default=1 WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
          ).run(req.tenantId, replacement.id);
      }
    })();
    audit(req, {
      action: "TEMPLATE_ARCHIVE",
      module: "TEMPLATES",
      entityId: req.params.id,
      oldValue: { name: row.name }
    });
    const message = "Proforma şablonu arşivlendi.";
    if (wantsJson(req)) return res.json({ ok: true, message, redirect: "/templates" });
    flash(req, "success", message);
    res.redirect("/templates");
  } catch (e) {
    next(e);
  }
});
r.post("/:id/default", adminOnly, (req, res) => {
  db.transaction(() => {
    db.prepare("UPDATE quote_templates SET is_default=0 WHERE tenant_id=? AND COALESCE(deleted_at,0)=0").run(
      req.tenantId
    );
    db.prepare(
      "UPDATE quote_templates SET is_default=1 WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
    ).run(req.tenantId, req.params.id);
  })();
  flash(req, "success", "Varsayılan proforma şablonu değiştirildi.");
  res.redirect("/templates");
});
r.get("/:id/preview", (req, res) => {
  const template = db
    .prepare("SELECT * FROM quote_templates WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!template) throw Object.assign(new Error("Şablon bulunamadı."), { status: 404, expose: true });
  const row = { ...sampleForTenant(req.tenantId), template_key: template.template_key };
  res.setHeader("Cache-Control", "no-store");
  res.render("quotes/print", {
    layout: false,
    row,
    isPreview: true,
    autoPrint: false,
    publicView: false,
    embeddedPreview: false,
    templateStudioPreview: true,
    ...quotePrintData(template, row, req.locale)
  });
});

// v3.7.0 — şablonları güvenli JSON olarak dışa/içe aktar ve kopyala.
r.get("/:id/export", adminOnly, (req, res) => {
  const row = db
    .prepare("SELECT * FROM quote_templates WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Şablon bulunamadı."), { status: 404, expose: true });
  const payload = {
    format: "ARTEVA_QUOTE_TEMPLATE",
    version: 1,
    exported_at: new Date().toISOString(),
    template: {
      name: row.name,
      description: row.description,
      layout_key: row.layout_key,
      primary_color: row.primary_color,
      accent_color: row.accent_color,
      font_family: row.font_family,
      font_size: row.font_size,
      settings: templateSettings(row.settings_json),
      blocks: safeBlocks(row.block_order_json)
    }
  };
  const filename =
    String(row.name || "proforma-sablonu")
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, "-")
      .replace(/^-|-$/g, "") || "proforma-sablonu";
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.arteva-template.json"`);
  res.type("application/json").send(JSON.stringify(payload, null, 2));
});
r.post("/import", adminOnly, (req, res, next) => {
  try {
    let payload;
    try {
      payload = JSON.parse(String(req.body.template_json || ""));
    } catch {
      throw Object.assign(new Error("Şablon JSON dosyası okunamadı."), { status: 422, expose: true });
    }
    if (payload?.format !== "ARTEVA_QUOTE_TEMPLATE" || !payload.template)
      throw Object.assign(new Error("Bu dosya geçerli bir ARTEVA proforma şablonu değil."), {
        status: 422,
        expose: true
      });
    const x = payload.template,
      now = Date.now(),
      tid = id("tpl"),
      key = `imported-${Date.now().toString(36)}`;
    const settings = {
      ...defaultTemplateSettings,
      ...asObject(x.settings),
      custom_html: sanitizeTemplateHtml(x.settings?.custom_html || ""),
      custom_css: sanitizeTemplateCss(x.settings?.custom_css || "")
    };
    db.prepare(
      `INSERT INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      tid,
      req.tenantId,
      key,
      String(x.name || "İçe Aktarılan Şablon").slice(0, 120),
      String(x.description || "").slice(0, 240),
      safeLayout(x.layout_key, "classic"),
      hex(x.primary_color, "#245ba7"),
      hex(x.accent_color, "#d83238"),
      font(x.font_family),
      Math.min(16, Math.max(8, Number(x.font_size) || 11)),
      JSON.stringify(settings),
      JSON.stringify(
        Array.isArray(x.blocks) ? x.blocks.filter((v) => defaultBlocks.includes(v)) : defaultBlocks
      ),
      0,
      now,
      now
    );
    audit(req, { action: "TEMPLATE_IMPORT", module: "TEMPLATES", entityId: tid, newValue: { name: x.name } });
    flash(req, "success", "Proforma şablonu içe aktarıldı.");
    res.redirect(`/templates?edit=${encodeURIComponent(tid)}`);
  } catch (e) {
    next(e);
  }
});
r.post("/:id/clone", adminOnly, (req, res, next) => {
  try {
    const source = db
      .prepare("SELECT * FROM quote_templates WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
      .get(req.tenantId, req.params.id);
    if (!source) throw Object.assign(new Error("Şablon bulunamadı."), { status: 404, expose: true });
    const now = Date.now(),
      tid = id("tpl"),
      key = `copy-${Date.now().toString(36)}`;
    db.prepare(
      `INSERT INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      tid,
      req.tenantId,
      key,
      `${source.name} Kopyası`.slice(0, 120),
      source.description,
      source.layout_key,
      source.primary_color,
      source.accent_color,
      source.font_family,
      source.font_size,
      source.settings_json,
      source.block_order_json,
      0,
      now,
      now
    );
    flash(req, "success", "Şablon kopyalandı.");
    res.redirect(`/templates?edit=${encodeURIComponent(tid)}`);
  } catch (e) {
    next(e);
  }
});
export default r;

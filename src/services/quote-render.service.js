import fs from "fs";
import path from "path";
import { db } from "../db/db.js";
import { config } from "../config.js";
import { jsonParse } from "../utils/json.js";
import { renderCustomTemplate, sanitizeTemplateCss } from "./template-html.service.js";
import { quoteDisplayNo } from "./locale.service.js";

const VIRTUAL_TEMPLATE = {
  id: "virtual-default-template",
  template_key: "arteva-tek260075-original",
  name: "ARTEVA TEK260075 Klasik (Orijinal)",
  description: "Şablon kaydı bulunamadığında kullanılan özgün ARTEVA düzeni.",
  layout_key: "arteva-classic",
  primary_color: "#1f2937",
  accent_color: "#d83238",
  font_family: "Arial",
  font_size: 11,
  settings_json: "{}",
  block_order_json: '["header","customer","items","totals","terms","bank","signature","footer"]',
  is_default: 1
};
const object = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

const PRINT_IMAGE_MIME = Object.freeze({
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif"
});
const PRINT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PRINT_IMAGE_TOTAL_BYTES = 24 * 1024 * 1024;

function printImageRelative(value) {
  let raw = String(value || "").trim();
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return "";
  try {
    const parsed = new URL(raw, config.publicBaseUrl);
    if (/^\/q\/[^/]+\/asset$/i.test(parsed.pathname)) {
      raw = String(parsed.searchParams.get("path") || "");
    } else {
      raw = parsed.pathname;
    }
  } catch {}
  raw = raw.split(/[?#]/, 1)[0];
  if (/^\/public\/uploads\//i.test(raw)) raw = raw.replace(/^\/public\/uploads\//i, "");
  else if (/^\/uploads\//i.test(raw)) raw = raw.replace(/^\/uploads\//i, "");
  else return "";
  try { raw = decodeURIComponent(raw); } catch { return ""; }
  raw = raw.replaceAll("\\", "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("\0")) return "";
  return normalized;
}

export function inlineQuotePrintImages(row) {
  if (!row) return row;
  const root = config.publicUploadDir;
  const cache = new Map();
  let usedBytes = 0;
  const inline = (value) => {
    const original = String(value || "");
    if (!original || original.startsWith("data:") || original.startsWith("blob:")) return original;
    const relative = printImageRelative(original);
    if (!relative) return original;
    if (cache.has(relative)) return cache.get(relative);
    const absolute = path.resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return original;
    const mime = PRINT_IMAGE_MIME[path.extname(absolute).toLowerCase()];
    if (!mime) return original;
    try {
      const stat = fs.statSync(absolute);
      if (!stat.isFile() || stat.size <= 0 || stat.size > PRINT_IMAGE_MAX_BYTES || usedBytes + stat.size > PRINT_IMAGE_TOTAL_BYTES) {
        cache.set(relative, original);
        return original;
      }
      const encoded = `data:${mime};base64,${fs.readFileSync(absolute).toString("base64")}`;
      usedBytes += stat.size;
      cache.set(relative, encoded);
      return encoded;
    } catch {
      cache.set(relative, original);
      return original;
    }
  };
  const profile = { ...(row.profile_snapshot || {}) };
  for (const key of ["logo_url", "stamp_url", "signature_url", "left_image_url"]) profile[key] = inline(profile[key]);
  const customer = { ...(row.customer_snapshot || {}) };
  customer.logo_url = inline(customer.logo_url);
  const items = (row.items || []).map((item) => {
    const product = { ...(item.product_snapshot || {}) };
    product.image_url = inline(product.image_url);
    return { ...item, product_snapshot: product };
  });
  return { ...row, profile_snapshot: profile, customer_snapshot: customer, items };
}

function templateSnapshotObject(template) {
  const source = template || VIRTUAL_TEMPLATE;
  return {
    id: source.id || null,
    template_key: source.template_key || VIRTUAL_TEMPLATE.template_key,
    name: source.name || VIRTUAL_TEMPLATE.name,
    description: source.description || "",
    layout_key: source.layout_key || VIRTUAL_TEMPLATE.layout_key,
    primary_color: source.primary_color || VIRTUAL_TEMPLATE.primary_color,
    accent_color: source.accent_color || VIRTUAL_TEMPLATE.accent_color,
    font_family: source.font_family || VIRTUAL_TEMPLATE.font_family,
    font_size: Number(source.font_size || VIRTUAL_TEMPLATE.font_size),
    settings_json: String(source.settings_json || "{}"),
    block_order_json: String(source.block_order_json || VIRTUAL_TEMPLATE.block_order_json),
    is_default: Number(source.is_default || 0)
  };
}

function snapshotTemplate(raw, tenantId) {
  const parsed = object(typeof raw === "string" ? jsonParse(raw, {}) : raw);
  if (!parsed.template_key && !parsed.layout_key) return null;
  return { ...VIRTUAL_TEMPLATE, ...parsed, tenant_id: tenantId, id: parsed.id || "quote-template-snapshot" };
}

export function serializeQuoteTemplate(template) {
  return JSON.stringify(templateSnapshotObject(template));
}

export function resolveQuoteTemplate(tenantId, templateKey, templateSnapshotRaw = null) {
  const frozen = snapshotTemplate(templateSnapshotRaw, tenantId);
  if (frozen) return frozen;
  let row = null;
  if (templateKey) {
    row = db
      .prepare(
        "SELECT * FROM quote_templates WHERE tenant_id=? AND template_key=? AND COALESCE(deleted_at,0)=0 LIMIT 1"
      )
      .get(tenantId, templateKey);
  }
  if (!row) {
    row = db
      .prepare(
        "SELECT * FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_default DESC,updated_at DESC,created_at ASC LIMIT 1"
      )
      .get(tenantId);
  }
  return row || { ...VIRTUAL_TEMPLATE, tenant_id: tenantId };
}

export function ensureQuoteTemplateSnapshot(tenantId, row) {
  if (!row) return null;
  const existing = snapshotTemplate(row.template_snapshot_json, tenantId);
  if (existing) return String(row.template_snapshot_json || serializeQuoteTemplate(existing));
  const raw = serializeQuoteTemplate(resolveQuoteTemplate(tenantId, row.template_key));
  if (row.id) {
    try {
      db.prepare(
        `UPDATE quotes SET template_snapshot_json=?
         WHERE tenant_id=? AND id=? AND (template_snapshot_json IS NULL OR TRIM(template_snapshot_json)='')`
      ).run(raw, tenantId, row.id);
    } catch (error) {
      console.error("[quote-render] Şablon anlık görüntüsü teklif kaydına yazılamadı:", error?.message || error);
    }
  }
  row.template_snapshot_json = raw;
  return raw;
}

export function quotePrintData(template, row, locale = "tr") {
  const safeTemplate = template || VIRTUAL_TEMPLATE;
  const settings = object(jsonParse(safeTemplate.settings_json, {}));

  const safeHex = (value, fallback) =>
    /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  const primary = safeHex(safeTemplate.primary_color, "#245ba7");
  const palette = {
    enabled: Boolean(settings.custom_palette_enabled),
    pageBg: safeHex(settings.page_bg_color, "#ffffff"),
    bodyText: safeHex(settings.body_text_color, "#111827"),
    mutedText: safeHex(settings.muted_text_color, "#64748b"),
    border: safeHex(settings.border_color, "#cbd5e1"),
    companyBg: safeHex(settings.company_bg_color, "#ffffff"),
    companyText: safeHex(settings.company_text_color, "#111827"),
    metaBg: safeHex(settings.meta_bg_color, "#ffffff"),
    metaText: safeHex(settings.meta_text_color, "#111827"),
    titleBg: safeHex(settings.title_bg_color, "#ffffff"),
    titleText: safeHex(settings.title_text_color, primary),
    customerBg: safeHex(settings.customer_bg_color, "#ffffff"),
    customerText: safeHex(settings.customer_text_color, "#111827"),
    tableHeaderBg: safeHex(settings.table_header_bg_color, primary),
    tableHeaderText: safeHex(settings.table_header_text_color, "#ffffff"),
    tableRowBg: safeHex(settings.table_row_bg_color, "#ffffff"),
    tableAltBg: safeHex(settings.table_alt_bg_color, "#f8fafc"),
    tableText: safeHex(settings.table_text_color, "#111827"),
    link: safeHex(settings.link_color, primary),
    totalsBg: safeHex(settings.totals_bg_color, "#ffffff"),
    totalsText: safeHex(settings.totals_text_color, "#111827"),
    grandBg: safeHex(settings.grand_total_bg_color, "#eff6ff"),
    grandText: safeHex(settings.grand_total_text_color, "#17345d"),
    discount: safeHex(settings.discount_color, "#f05252"),
    termsBg: safeHex(settings.terms_bg_color, "#ffffff"),
    termsHeaderBg: safeHex(settings.terms_header_bg_color, primary),
    termsHeaderText: safeHex(settings.terms_header_text_color, "#ffffff"),
    termsText: safeHex(settings.terms_text_color, "#111827"),
    bankBg: safeHex(settings.bank_bg_color, "#ffffff"),
    bankHeaderBg: safeHex(settings.bank_header_bg_color, primary),
    bankHeaderText: safeHex(settings.bank_header_text_color, "#ffffff"),
    bankText: safeHex(settings.bank_text_color, "#111827"),
    signatureBg: safeHex(settings.signature_bg_color, "#ffffff"),
    signatureText: safeHex(settings.signature_text_color, "#111827"),
    footerBg: safeHex(settings.footer_bg_color, "#ffffff"),
    footerText: safeHex(settings.footer_text_color, "#475569")
  };

  const requested = Boolean(settings.use_custom_html && String(settings.custom_html || "").trim());
  const displayNo = quoteDisplayNo(row);
  let enabled = requested,
    html = "",
    css = "";
  if (requested) {
    try {
      html = renderCustomTemplate({
        html: settings.custom_html,
        row,
        locale,
        publicBaseUrl: config.publicBaseUrl,
        displayNo
      });
      css = sanitizeTemplateCss(settings.custom_css || "");
    } catch (error) {
      console.error("[quote-render] Özel şablon render edilemedi; güvenli standart şablona dönüldü:", error);
      enabled = false;
      html = "";
      css = "";
    }
  }
  const pick = (value, allowed, fallback) =>
    allowed.includes(String(value || "")) ? String(value) : fallback;
  const design = {
    header: pick(
      settings.header_variant,
      ["split", "centered", "band", "sidebar", "letterhead", "corner"],
      "split"
    ),
    customer: pick(
      settings.customer_variant,
      ["card", "strip", "two-column", "minimal", "banner", "ledger"],
      "card"
    ),
    items: pick(settings.item_variant, ["grid", "lines", "cards", "catalog", "zebra", "brochure"], "grid"),
    terms: pick(
      settings.terms_variant,
      ["boxed", "timeline", "columns", "plain", "numbered", "band"],
      "boxed"
    ),
    bank: pick(settings.bank_variant, ["table", "band", "compact", "cards", "ledger", "inline"], "table"),
    signature: pick(
      settings.signature_variant,
      ["split", "stacked", "approval", "minimal", "seal", "single"],
      "split"
    ),
    border: pick(settings.border_style, ["solid", "soft", "none", "double", "accent", "dashed"], "solid"),
    logo: pick(settings.logo_position, ["left", "center", "right", "floating"], "left"),
    title: pick(settings.title_variant, ["boxed", "underline", "pill", "plain", "split"], "boxed"),
    totals: pick(settings.totals_variant, ["right", "band", "cards", "full"], "right"),
    footer: pick(settings.footer_variant, ["line", "band", "split", "minimal"], "line"),
    spacing: pick(settings.spacing_variant, ["compact", "balanced", "spacious"], "balanced"),
    density: pick(settings.table_density, ["compact", "balanced", "comfortable"], "balanced"),
    image: pick(settings.image_variant, ["contain", "square", "rounded", "circle"], "contain"),
    radius: Math.max(0, Math.min(24, Number(settings.card_radius) || 0))
  };
  const structuralEnabled = Number(settings.design_version || 0) >= 2;
  const structuralClasses = structuralEnabled
    ? `design-head-${design.header} design-customer-${design.customer} design-items-${design.items} design-terms-${design.terms} design-bank-${design.bank} design-signature-${design.signature} design-border-${design.border} design-logo-${design.logo} design-title-${design.title} design-totals-${design.totals} design-footer-${design.footer} design-spacing-${design.spacing} design-density-${design.density} design-image-${design.image} design-radius-${design.radius}`
    : "";
  const visibilityClasses = `${settings.show_logo === false ? " design-hide-logo" : ""}${settings.show_images === false ? " design-hide-images" : ""}${settings.show_code === false ? " design-hide-code" : ""}${settings.show_vat === false ? " design-hide-vat" : ""}${settings.show_discount === false ? " design-hide-discount" : ""}${settings.show_fx === false ? " design-hide-fx" : ""}${settings.show_bank === false ? " design-hide-bank" : ""}${settings.show_stamp === false ? " design-hide-stamp" : ""}${settings.show_footer === false ? " design-hide-footer" : ""}${settings.show_customer_approval === false ? " design-hide-customer-approval" : ""}`;
  return {
    template: safeTemplate,
    templateSettings: settings,
    templatePalette: palette,
    manualTemplate: { enabled, html, css },
    templateDesignClass: `${structuralClasses}${visibilityClasses}`.trim()
  };
}

export function quotePrintLocals({
  tenantId,
  row,
  locale = "tr",
  isPreview = false,
  autoPrint = false,
  publicView = false,
  embeddedPreview = false,
  inlineAssets = !embeddedPreview
}) {
  // Canlı modal ön izlemesinde diskten bütün ürün görsellerini okuyup base64'e
  // çevirmek gereksiz ve özellikle çok satırlı proformalarda ciddi gecikme
  // oluşturuyordu. Yazdır/PDF ve public görünümde ise bağımsız çıktı için
  // görseller gömülü kalır.
  const printRow = inlineAssets ? inlineQuotePrintImages(row) : row;
  const template = resolveQuoteTemplate(tenantId, printRow?.template_key, printRow?.template_snapshot_json);
  return {
    layout: false,
    row: printRow,
    isPreview,
    autoPrint,
    publicView,
    embeddedPreview,
    ...quotePrintData(template, printRow, locale)
  };
}

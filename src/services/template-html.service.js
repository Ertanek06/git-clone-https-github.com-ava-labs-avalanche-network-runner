import sanitizeHtml from "sanitize-html";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );
const attr = (v) => esc(v).replace(/`/g, "&#96;");
const num = (v) => Number(v || 0) || 0;
const fmt = (v, locale = "tr") => {
  const value = num(v);
  return value.toLocaleString(locale === "en" ? "en-GB" : "tr-TR", {
    minimumFractionDigits: Math.abs(value - Math.trunc(value)) > 1e-9 ? 2 : 0,
    maximumFractionDigits: 2
  });
};
const upper = (v, locale = "tr") => String(v ?? "").toLocaleUpperCase(locale === "en" ? "en-GB" : "tr-TR");
const join = (xs, sep = " · ") => xs.filter(Boolean).join(sep) || "-";
export const allowedLayouts = [
  "arteva-classic",
  "classic",
  "executive",
  "navy",
  "redline",
  "graphite",
  "export",
  "visual",
  "minimal",
  "technical",
  "compact",
  "skyline",
  "emerald",
  "gold",
  "matrix",
  "cleanlab"
];
export const safeLayout = (v, fallback = "classic") =>
  allowedLayouts.includes(String(v || "")) ? String(v) : fallback;
export function sanitizeTemplateHtml(raw = "") {
  return sanitizeHtml(String(raw || ""), {
    allowedTags: [
      "header",
      "section",
      "footer",
      "main",
      "article",
      "aside",
      "div",
      "span",
      "p",
      "br",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "small",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "dl",
      "dt",
      "dd",
      "ol",
      "ul",
      "li",
      "a",
      "img",
      "hr"
    ],
    allowedAttributes: {
      "*": ["class", "title", "aria-label"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "class", "width", "height"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"]
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}) }
      })
    }
  });
}
export function sanitizeTemplateCss(raw = "") {
  return String(raw || "")
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/url\s*\(\s*['"]?data:text\/html[\s\S]*?\)/gi, "")
    .slice(0, 24000);
}
function publicDocumentHref(publicBaseUrl, value) {
  const url = String(value || "").trim();
  if (!url) return "#";
  if (/^https?:\/\//i.test(url) || /^(?:mailto|tel):/i.test(url)) return url;
  const base = String(publicBaseUrl || "").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}
function imageTag(url, cls = "manual-logo") {
  const clean = String(url || "").trim();
  return clean ? `<img class="${cls}" src="${attr(clean)}" alt="" data-empty-image-on-error>` : "";
}
function itemsTable(row, locale, publicBaseUrl) {
  const items = row.items || [],
    hasLineDiscount = items.some((i) => num(i.discount_value) > 0);
  const rows = items
    .map((i, n) => {
      const x = i.product_snapshot || {};
      const isAlternative = Number(i.is_alternative || 0) === 1;
      const altBadge = isAlternative
        ? `<span class="manual-alternative-badge">${locale === "en" ? "ALTERNATIVE PRODUCT" : "MUADİL ÜRÜN"}</span>`
        : "";
      const altDetail = isAlternative
        ? `<small class="manual-alternative-detail"><b>${locale === "en" ? "Alternative to" : "Muadili olduğu ürün"}:</b> ${esc(i.alternative_to_name || "-")}${i.alternative_note ? ` · ${esc(i.alternative_note)}` : ""}${Number(i.include_total ?? 1) !== 1 ? ` · ${locale === "en" ? "Not included in total" : "Genel toplama dahil değil"}` : ""}</small>`
        : "";
      const docs = [
        x.brochure_url ? [x.brochure_url, locale === "en" ? "Download brochure" : "Broşürü indir"] : null,
        x.ce_certificate_url ? [x.ce_certificate_url, "CE Belgesi"] : null,
        x.manual_url ? [x.manual_url, locale === "en" ? "User manual" : "Kullanma Kılavuzu"] : null
      ]
        .filter(Boolean)
        .map(
          ([url, label]) =>
            `<a class="manual-brochure" href="${attr(publicDocumentHref(publicBaseUrl, url))}" target="_blank" rel="noopener">${esc(label)}</a>`
        )
        .join("");
      const image = i.show_image && x.image_url ? imageTag(x.image_url, "manual-item-image") : "";
      const desc =
        [x.short_description, i.show_technical ? x.technical_description : ""]
          .filter(Boolean)
          .map((v) => `<small>${esc(upper(v, locale))}</small>`)
          .join("") + altDetail;
      const hasDisc = num(i.discount_value) > 0;
      const disc = hasDisc
        ? `<span class="manual-money-v3819"><span>${fmt(i.discount_value, locale)}</span><small>${i.discount_type === "PERCENT" ? "%" : esc(row.currency)}</small></span>`
        : "—";
      const discountCell = hasLineDiscount
        ? `<td class="${hasDisc ? "manual-discount has-discount" : ""}">${disc}</td>`
        : "";
      return `<tr class="${hasDisc ? "has-line-discount" : ""}"><td>${n + 1}</td><td class="manual-image">${image}</td><td><b>${esc(x.code || "-")}</b>${docs}</td><td>${altBadge}<strong>${esc(upper(x.name || "-", locale))}</strong>${desc}</td><td>${fmt(i.quantity, locale)}</td><td>${esc(i.unit || "-")}</td><td><span class="manual-money-v3819"><span>${fmt(i.unit_price, locale)}</span><small>${esc(row.currency || "")}</small></span></td>${discountCell}<td><span class="manual-money-v3819"><span>${fmt(i.line_net, locale)}</span><small>${esc(row.currency || "")}</small></span></td></tr>`;
    })
    .join("");
  const discountHead = hasLineDiscount ? `<th>${locale === "en" ? "Discount" : "İndirim"}</th>` : "";
  return `<table class="manual-items"><thead><tr><th>No</th><th>${locale === "en" ? "Image" : "Görsel"}</th><th>${locale === "en" ? "Code" : "Kod"}</th><th>${locale === "en" ? "Product / Description" : "Ürün / Açıklama"}</th><th>${locale === "en" ? "Qty" : "Miktar"}</th><th>${locale === "en" ? "Unit" : "Birim"}</th><th>${locale === "en" ? "Unit Price" : "Birim Fiyat"}</th>${discountHead}<th>${locale === "en" ? "Total" : "Toplam"}</th></tr></thead><tbody>${rows || `<tr><td colspan="${hasLineDiscount ? 9 : 8}">${locale === "en" ? "No product line" : "Ürün satırı yok"}</td></tr>`}</tbody></table>`;
}
function totalsTable(row, locale) {
  const tryTotal = num(row.grand_total) * num(row.fx_rate || 1);
  const vatRates = [
    ...new Set((row.items || []).map((i) => num(i.vat_rate)).filter((v) => Number.isFinite(v)))
  ];
  const vatLabel =
    vatRates.length === 1
      ? locale === "en"
        ? `VAT %${vatRates[0]}`
        : `KDV %${vatRates[0]}`
      : locale === "en"
        ? "VAT"
        : "KDV";
  const hasDiscount = num(row.discount_total) > 0;
  const money = (value, currency = row.currency || "") =>
    `<span class="manual-money-v3819"><span>${fmt(value, locale)}</span><small>${esc(currency)}</small></span>`;
  return `<div class="manual-totals"><div><span>${locale === "en" ? "Total" : "Toplam"}</span><b>${money(hasDiscount ? num(row.subtotal) + num(row.discount_total) : num(row.subtotal))}</b></div>${hasDiscount ? `<div class="manual-discount has-discount"><span>${locale === "en" ? "Discount" : "İndirim / İskonto"}</span><b>${money(-num(row.discount_total))}</b></div>` : ""}<div><span>${vatLabel}</span><b>${money(row.vat_total)}</b></div><div class="manual-grand"><span>${locale === "en" ? "Grand total" : "Genel Toplam"}</span><b>${money(row.grand_total)}</b></div>${row.currency !== "TRY" && num(row.fx_rate) > 0 ? `<div class="manual-try"><span>${locale === "en" ? "TRY equivalent" : "TL karşılığı"}</span><b>${money(tryTotal, "₺")}</b></div>` : ""}</div>`;
}
function termsBlock(row, locale) {
  const x = [
    [locale === "en" ? "Payment" : "Ödeme", row.payment_terms],
    [locale === "en" ? "Delivery" : "Teslimat", row.delivery_terms],
    [locale === "en" ? "Shipping" : "Nakliye", row.shipping_terms],
    [locale === "en" ? "Installation" : "Kurulum", row.installation_terms],
    [locale === "en" ? "Warranty" : "Garanti", row.warranty_terms],
    [locale === "en" ? "Legal note" : "Yasal açıklama", row.legal_note],
    [locale === "en" ? "Additional note" : "Ek not", row.extra_note]
  ].filter(([, v]) => v);
  return `<section class="manual-terms"><h3>${locale === "en" ? "DELIVERY, PAYMENT AND WARRANTY TERMS" : "TESLİMAT, ÖDEME VE GARANTİ KOŞULLARI"}</h3>${x.map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}</section>`;
}
function bankBlock(p, locale) {
  return `<section class="manual-bank"><h3>${locale === "en" ? "BANK ACCOUNT INFORMATION" : "BANKA HESAP BİLGİLERİ"}</h3><dl><dt>${locale === "en" ? "Bank / Branch" : "Banka / Şube"}</dt><dd>${esc(p.bank_name || "-")}</dd><dt>TL IBAN</dt><dd>${esc(p.iban_try || "-")}</dd><dt>EUR IBAN</dt><dd>${esc(p.iban_eur || "-")}</dd><dt>USD IBAN</dt><dd>${esc(p.iban_usd || "-")}</dd><dt>SWIFT / BIC</dt><dd>${esc(p.swift_bic || "-")}</dd></dl></section>`;
}
function signatureBlock(p, locale) {
  return `<section class="manual-signatures"><div><b>${locale === "en" ? "Offerer / Authorized Person" : "Teklifi Veren / Yetkili"}</b><span>${esc(p.authorized_person || (locale === "en" ? "Full Name / Title" : "Ad Soyad / Unvan"))}</span><div class="manual-sign-assets"><div><small>${locale === "en" ? "Stamp / Signature" : "Kaşe / İmza"}</small>${imageTag(p.stamp_url || p.signature_url, "manual-stamp")}</div></div></div><div><b>${locale === "en" ? "Customer Authorized Person" : "Müşteri Adına Yetkili Kişi"}</b><span>${locale === "en" ? "Stamp / Signature" : "Kaşe / İmza"}</span><span>__/__/____</span></div></section>`;
}
function preferredAddress(x = {}) {
  const address = [x.delivery_address, x.billing_address, x.address, x.address1, x.address2]
    .map((value) => String(value || "").replace(/\uFFFD/g, "").trim())
    .find((value) => /[\p{L}\p{N}]/u.test(value));
  return join([address, x.district, x.city, x.country]);
}
function footerBlock(p, locale) {
  return `<footer class="manual-footer"><span>⌖ ${esc(p.footer_address || preferredAddress(p) || "")}</span><span>✉ ${esc(p.footer_email || p.email || "")}</span><span>☎ ${esc(p.footer_phone || p.phone || p.mobile || "")}</span><span>${locale === "en" ? "Page" : "Sayfa"}</span></footer>`;
}
export const starterCustomHtml = `<header class="manual-hero">
  <div>{{COMPANY_LOGO}}</div>
  <div><h1>PROFORMA / FİYAT TEKLİFİ</h1><b>{{DISPLAY_NO}}</b></div>
</header>
<section class="manual-two-col">
  <div><h3>FİRMA BİLGİLERİ</h3><p><b>{{COMPANY_NAME}}</b><br>{{COMPANY_ADDRESS}}<br>{{COMPANY_PHONE}} · {{COMPANY_EMAIL}}</p></div>
  <div><h3>MÜŞTERİ BİLGİLERİ</h3><p><b>{{CUSTOMER_NAME}}</b><br>{{CUSTOMER_ADDRESS}}<br>{{CUSTOMER_PHONE}} · {{CUSTOMER_EMAIL}}</p></div>
</section>
{{ITEMS_TABLE}}
{{TOTALS_TABLE}}
{{FINAL_LEGAL_BLOCK}}
{{FOOTER_BLOCK}}`;
export const starterCustomCss = `.manual-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border-bottom:3px solid var(--print-primary)}.manual-logo{width:150px;height:62px;object-fit:contain}.manual-two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.manual-two-col>div{padding:10px;border:1px solid #cbd5e1;border-radius:10px}.manual-items{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.2px}.manual-items th,.manual-items td{padding:5px 4px;border:1px solid #cbd5e1;vertical-align:top;overflow:hidden}.manual-items th{background:#eaf2ff}.manual-item-image{display:block;width:66px;height:88px;margin:auto;object-fit:contain}.manual-items small,.manual-brochure{display:block;margin-top:4px}.manual-totals{display:grid;justify-content:end;margin:12px 0}.manual-totals div{display:grid;grid-template-columns:140px 150px;gap:10px;padding:5px 8px;border-bottom:1px solid #dbe5f2}.manual-totals b{text-align:right}.manual-grand{background:#eff6ff}.manual-discount{color:#f05252;font-weight:700}.manual-items .manual-discount{color:#f05252;font-weight:700}.manual-items strong,.manual-items small{text-transform:uppercase}.manual-terms,.manual-bank{margin-top:12px;padding:10px;border:1px solid #cbd5e1;border-radius:10px}.manual-bank dl{display:grid;grid-template-columns:120px 1fr;gap:5px;margin:0}.manual-bank dt{font-weight:800}.manual-bank dd{margin:0}.manual-signatures{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.manual-signatures>div{min-height:90px;padding:10px;border:1px dashed #94a3b8}.manual-sign-assets{display:flex;gap:12px}.manual-sign,.manual-stamp{max-width:90px;max-height:50px;object-fit:contain}.manual-footer{position:absolute;left:7mm;right:7mm;bottom:5mm;display:grid;grid-template-columns:1fr auto auto auto;gap:10px;padding-top:5px;border-top:1px solid #cbd5e1;font-size:8px}.manual-image{position:relative}.manual-alternative-badge{display:inline-flex;margin:0 0 4px;background:#f59e0b;color:#3b2200;border-radius:999px;padding:2px 6px;font-size:8px;font-weight:900}.manual-alternative-detail{display:block;margin-top:4px;padding:4px;border-left:3px solid #f59e0b;background:#fff8e8;color:#5f3b00}`;
export function renderCustomTemplate({ html, row, locale = "tr", publicBaseUrl = "", displayNo = "" }) {
  const p = row.profile_snapshot || {},
    c = row.customer_snapshot || {};
  const raw = {
    DISPLAY_NO: displayNo || row.quote_no || "",
    QUOTE_NO: row.quote_no || "",
    REVISION_NO: row.revision_no || 0,
    QUOTE_DATE: row.quote_date || "",
    VALID_UNTIL: row.valid_until || "",
    DELIVERY_DATE: row.delivery_date || "",
    CURRENCY: row.currency || "",
    FX_RATE: row.fx_rate || "",
    SUBJECT: row.subject || "",
    PROJECT_NAME: row.project_name || "",
    PROJECT_CODE: row.project_code || "",
    COMPANY_NAME: p.company_name || "",
    COMPANY_SHORT_NAME: p.short_name || "",
    COMPANY_PHONE: p.phone || p.mobile || "",
    COMPANY_EMAIL: p.email || "",
    COMPANY_ADDRESS: preferredAddress(p),
    COMPANY_TAX_NO: p.tax_no || "",
    COMPANY_TAX_OFFICE: p.tax_office || "",
    COMPANY_LOGO_URL: p.logo_url || "",
    CUSTOMER_NAME: c.company_name || "",
    CUSTOMER_CONTACT: c.contact_name || "",
    CUSTOMER_PHONE: c.phone || c.mobile || "",
    CUSTOMER_EMAIL: c.email || "",
    CUSTOMER_ADDRESS: preferredAddress(c),
    CUSTOMER_TAX_NO: c.tax_no || ""
  };
  const rich = {
    COMPANY_LOGO: imageTag(p.logo_url, "manual-logo"),
    ITEMS_TABLE: itemsTable(row, locale, publicBaseUrl),
    TOTALS_TABLE: totalsTable(row, locale),
    TERMS_BLOCK: termsBlock(row, locale),
    BANK_BLOCK: bankBlock(p, locale),
    SIGNATURE_BLOCK: signatureBlock(p, locale),
    FINAL_LEGAL_BLOCK: `<section class="manual-final-block">${termsBlock(row, locale)}${bankBlock(p, locale)}${signatureBlock(p, locale)}</section>`,
    FOOTER_BLOCK: footerBlock(p, locale)
  };
  const rendered = sanitizeTemplateHtml(html || starterCustomHtml).replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, key) =>
    key in rich ? rich[key] : esc(raw[key] ?? "")
  );
  // crmv1.25: Eski özel şablonlarda üç ayrı token kullanılmış olsa bile
  // koşullar + banka + imza ardışık ise tek, bölünmez bir son blok haline getir.
  return rendered.replace(
    /(<section class="manual-terms">[\s\S]*?<\/section>)\s*(<section class="manual-bank">[\s\S]*?<\/section>)\s*(<section class="manual-signatures">[\s\S]*?<\/section>)/,
    '<section class="manual-final-block">$1$2$3</section>'
  );
}

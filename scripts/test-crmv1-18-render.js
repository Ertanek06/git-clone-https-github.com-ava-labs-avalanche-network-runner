import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ejs from "ejs";
import {
  artevaClassicTemplate,
  currentTemplatePresets,
  legacyV112TemplateKeys,
  legacyV112TemplatePresets,
  legacyTemplateSettings,
  professionalTemplatePresets
} from "../src/services/template-library.service.js";
import { quotePrintData } from "../src/services/quote-render.service.js";

const root = path.resolve(import.meta.dirname, "..");
const printView = path.join(root, "views/quotes/print.ejs");
const printCss = fs.readFileSync(path.join(root, "public/css/print.css"), "utf8");
const printSource = fs.readFileSync(printView, "utf8");
const row = {
  id: "quo_render_v18",
  quote_no: "TEK260018",
  revision_no: 0,
  quote_date: "2026-08-09",
  valid_until: "2026-08-19",
  currency: "EUR",
  fx_rate: 53.29,
  subject: "Gerçek Şablon Render Testi",
  subtotal: 2250,
  discount_total: 100,
  vat_total: 430,
  grand_total: 2580,
  show_try_total: 1,
  profile_snapshot: {
    company_name: "ARTEVA TEST FİRMASI",
    authorized_person: "Test Yetkilisi",
    tax_office: "İVEDİK",
    tax_no: "12001167378",
    address: "Ankara / Türkiye",
    phone: "0312 000 00 00",
    email: "info@example.com",
    bank_name: "Test Bankası",
    iban_try: "TR00 0000 0000 0000 0000 0000 01",
    iban_eur: "TR00 0000 0000 0000 0000 0000 02",
    iban_usd: "TR00 0000 0000 0000 0000 0000 03",
    swift_bic: "TESTTRISXXX"
  },
  customer_snapshot: {
    company_name: "GERÇEK ÖRNEK MÜŞTERİ A.Ş.",
    contact_name: "Satın Alma Yetkilisi",
    tax_no: "1234567890",
    address1: "İstanbul / Türkiye",
    phone: "0212 000 00 00",
    email: "satinalma@example.com"
  },
  payment_terms: "%50 peşin, bakiye teslimattan önce.",
  delivery_terms: "4-6 hafta.",
  shipping_terms: "Nakliye alıcıya aittir.",
  installation_terms: "Kurulum dahildir.",
  warranty_terms: "2 yıl garanti.",
  items: [
    {
      product_snapshot: {
        code: "TEST-001",
        name: "Normal Laboratuvar Ürünü",
        short_description: "Normal ürün açıklaması eksiksiz görünür.",
        technical_description: "Teknik değer 10-300 °C."
      },
      quantity: 1,
      unit: "ADET",
      unit_price: 1250,
      discount_type: "PERCENT",
      discount_value: 4,
      vat_rate: 20,
      line_net: 1200,
      line_vat: 240,
      line_total: 1440,
      show_image: 1,
      show_description: 1,
      show_technical: 1,
      include_total: 1
    },
    {
      product_snapshot: {
        code: "TEST-MDL-002",
        name: "Muadil Laboratuvar Ürünü",
        short_description: "Muadil ürün açıklaması eksiksiz görünür."
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
      is_alternative: 1,
      alternative_to_name: "Yabancı Marka Model",
      alternative_note: "Yerli üretim muadil",
      include_total: 1
    }
  ]
};

const common = {
  layout: false,
  isPreview: true,
  autoPrint: false,
  publicView: false,
  embeddedPreview: true,
  locale: "tr",
  t: (key) => key,
  appVersion: "3.8.57",
  publicBaseUrl: "https://crm.example.com",
  cspNonce: "render-test-nonce",
  csrfToken: "render-test-csrf",
  assetBundle: { print: "/public/build/test.css", printJs: "/public/build/test.js" },
  quoteDisplayNo: (value) => value.quote_no,
  quotePrintDisplayNo: (value) => value.quote_no
};

assert.equal(new Set(professionalTemplatePresets.map((preset) => preset[0])).size, 45);
assert.equal(legacyV112TemplatePresets.length, 32);
assert.equal(legacyV112TemplateKeys.length, 32);
assert.equal(currentTemplatePresets.length, 12);
assert.equal(artevaClassicTemplate.template_key, "arteva-tek260075-original");
assert.doesNotMatch(printSource, /document\.body\.classList\.add/);

let rendered = 0;
for (const [key, name, description, layout, primary, accent, font] of professionalTemplatePresets) {
  assert.match(printCss, new RegExp(`\\.layout-${layout}\\b`), `${key}: eski layout CSS'i bulunamadı`);
  const template = {
    id: `tpl_${key}`,
    template_key: key,
    name,
    description,
    layout_key: layout,
    primary_color: primary,
    accent_color: accent,
    font_family: font,
    font_size: 11,
    settings_json: JSON.stringify({ ...legacyTemplateSettings, design_version: 1 })
  };
  const data = quotePrintData(template, row, "tr");
  assert.doesNotMatch(data.templateDesignClass, /design-head-/, `${key}: eski tasarıma v2 sınıfı sızdı`);
  const html = await ejs.renderFile(printView, { ...common, row, ...data }, { filename: printView });
  assert.match(html, new RegExp(`layout-${layout}\\b`), `${key}: body layout sınıfı eksik`);
  assert.match(html, /id="print-source"/, `${key}: baskı kaynağı oluşmadı`);
  assert.match(html, /ARTEVA TEST FİRMASI/, `${key}: firma bilgisi görünmedi`);
  assert.match(html, /GERÇEK ÖRNEK MÜŞTERİ/, `${key}: müşteri bilgisi görünmedi`);
  assert.match(html, /NORMAL LABORATUVAR ÜRÜNÜ/, `${key}: ürün görünmedi`);
  assert.match(html, /MUADİL LABORATUVAR ÜRÜNÜ/, `${key}: muadil ürün görünmedi`);
  assert.match(html, /2\.580/, `${key}: genel toplam görünmedi`);
  assert.doesNotMatch(html, />\s*(?:undefined|NaN)\s*</, `${key}: geçersiz çıktı değeri`);
  rendered += 1;
}

const structuralTemplate = {
  id: "tpl_structural_v2",
  template_key: "structural-v2",
  name: "Yapısal V2",
  layout_key: "classic",
  primary_color: "#245ba7",
  accent_color: "#d83238",
  font_family: "Inter",
  font_size: 11,
  settings_json: JSON.stringify({
    ...legacyTemplateSettings,
    design_version: 2,
    header_variant: "band",
    item_variant: "cards",
    totals_variant: "full"
  })
};
const structuralData = quotePrintData(structuralTemplate, row, "tr");
assert.match(structuralData.templateDesignClass, /design-head-band/);
assert.match(structuralData.templateDesignClass, /design-items-cards/);
const structuralHtml = await ejs.renderFile(
  printView,
  { ...common, row, ...structuralData },
  { filename: printView }
);
assert.match(structuralHtml.match(/<body class="([^"]+)"/)?.[1] || "", /design-head-band/);

const previewJs = fs.readFileSync(path.join(root, "public/js/crmv1.16.js"), "utf8");
const previewCss = fs.readFileSync(path.join(root, "public/css/crmv1.16.css"), "utf8");
assert.match(previewJs, /crm-preview-layout-v21/);
assert.match(previewJs, /window\.addEventListener\("pointermove"/);
assert.match(previewJs, /window\.addEventListener\("pointerup"/);
assert.match(previewJs, /window\.addEventListener\("mousemove"/);
assert.match(previewJs, /style\.setProperty\("height", `\$\{Math\.round\(height\)\}px`, "important"\)/);
assert.doesNotMatch(previewJs, /--preview-width-v16/);
assert.match(previewCss, /resize:\s*none\s*!important/);
assert.match(previewCss, /is-preview-resizing-v20/);

console.log(
  `CRMV1_18_REAL_TEMPLATE_RENDER=${rendered}/${professionalTemplatePresets.length} OK; STRUCTURAL_V2=OK; PRODUCT_RESIZE_ENGINE=WINDOW_LEVEL`
);

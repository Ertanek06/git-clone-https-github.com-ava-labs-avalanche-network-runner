import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config.js";
import { publicUploadUrl, tenantUploadSegment } from "./upload-access.service.js";
import { targetVariantTokens, variantAwareDescription } from "./web-product-variant.js";

const MAX_HTML_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_BYTES = 30 * 1024 * 1024;
const USER_AGENT = "ArtevaCRM-WebProductImporter/1.0 (+https://crm.artevapp.com.tr)";

const entityMap = Object.freeze({
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", times: "×", deg: "°", micro: "µ"
});

function decodeEntities(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, key) => entityMap[key.toLowerCase()] ?? m);
}

function compact(value = "") {
  return decodeEntities(String(value || ""))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function fold(value = "") {
  return compact(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isPrivateV4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return (
    p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    p[0] >= 224
  );
}

function isPrivateAddress(address = "") {
  const ip = String(address || "").toLowerCase();
  if (ip.includes(":")) {
    return ip === "::1" || ip === "::" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd");
  }
  return isPrivateV4(ip);
}

export async function validateRemoteUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw Object.assign(new Error("Geçerli bir web adresi girin."), { status: 422, expose: true });
  }
  if (!["https:", "http:"].includes(url.protocol))
    throw Object.assign(new Error("Yalnızca http veya https adresleri desteklenir."), { status: 422, expose: true });
  if (!url.hostname || url.username || url.password)
    throw Object.assign(new Error("Kaynak web adresi güvenli biçimde doğrulanamadı."), { status: 422, expose: true });
  if (["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase()))
    throw Object.assign(new Error("Yerel ağ adreslerinden ürün aktarımı yapılamaz."), { status: 422, expose: true });
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((x) => isPrivateAddress(x.address)))
    throw Object.assign(new Error("Özel/yerel ağ adreslerinden ürün aktarımı engellendi."), { status: 422, expose: true });
  url.hash = "";
  return url;
}

async function responseBuffer(response, maxBytes) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length > maxBytes) throw Object.assign(new Error("Kaynak yanıt boyutu izin verilen sınırı aşıyor."), { status: 413, expose: true });
    return buf;
  }
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw Object.assign(new Error("Kaynak yanıt boyutu izin verilen sınırı aşıyor."), { status: 413, expose: true });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function safeFetch(value, { accept = "text/html,*/*;q=0.8", maxBytes = MAX_HTML_BYTES, timeoutMs = 15000 } = {}) {
  let url = await validateRemoteUrl(value);
  for (let redirect = 0; redirect < 5; redirect++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept, "accept-language": "tr-TR,tr;q=0.9,en;q=0.6" }
      });
    } catch (error) {
      const message = error?.name === "AbortError" ? "Kaynak site zaman aşımına uğradı." : "Kaynak siteye bağlanılamadı.";
      throw Object.assign(new Error(message), { status: 502, expose: true });
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw Object.assign(new Error("Kaynak site geçersiz yönlendirme döndürdü."), { status: 502, expose: true });
      url = await validateRemoteUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok)
      throw Object.assign(new Error(`Kaynak site HTTP ${response.status} yanıtı verdi.`), { status: 502, expose: true });
    const body = await responseBuffer(response, maxBytes);
    return { response, body, finalUrl: url.toString() };
  }
  throw Object.assign(new Error("Kaynak site çok fazla yönlendirme yaptı."), { status: 502, expose: true });
}

function metaContent(html, keys = []) {
  for (const key of keys) {
    const escaped = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]*>`, "i")
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) return compact(m[1]);
    }
  }
  return "";
}

function titleTag(html) {
  return compact((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
}

function headingOne(html) {
  return compact(((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "").replace(/<[^>]+>/g, " "));
}

function jsonLdObjects(html) {
  const out = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeEntities(match[1] || "").trim().replace(/^<!--|-->$/g, "").trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const walk = (value) => {
        if (!value) return;
        if (Array.isArray(value)) return value.forEach(walk);
        if (typeof value !== "object") return;
        out.push(value);
        if (Array.isArray(value["@graph"])) value["@graph"].forEach(walk);
      };
      walk(parsed);
    } catch {}
  }
  return out;
}

function typeHas(obj, type) {
  const v = obj?.["@type"];
  return (Array.isArray(v) ? v : [v]).some((x) => String(x || "").toLowerCase() === String(type).toLowerCase());
}

function absoluteUrl(value, base) {
  const raw = compact(Array.isArray(value) ? value[0] : value);
  if (!raw) return "";
  try { return new URL(raw, base).toString(); } catch { return ""; }
}

function productJsonLd(html) {
  return jsonLdObjects(html).find((x) => typeHas(x, "Product")) || null;
}

function offerFromProduct(product, objects) {
  const raw = product?.offers;
  const offers = Array.isArray(raw) ? raw : raw ? [raw] : objects.filter((x) => typeHas(x, "Offer"));
  return offers.find((x) => x && (x.price != null || x.lowPrice != null)) || offers[0] || null;
}

function priceNumber(value) {
  const raw = compact(value).replace(/[^0-9,.-]/g, "");
  if (!raw) return 0;
  const comma = raw.lastIndexOf(","), dot = raw.lastIndexOf(".");
  let normalized = raw;
  if (comma >= 0 && dot >= 0) normalized = comma > dot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  else if (comma >= 0) normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function currencyCode(value, fallbackText = "") {
  const raw = `${value || ""} ${fallbackText || ""}`.toUpperCase();
  if (/\bEUR\b|€/.test(raw)) return "EUR";
  if (/\bUSD\b|\$/.test(raw)) return "USD";
  return "TRY";
}

function structuredText(html) {
  let raw = String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(h[1-6]|p|div|section|article|header|footer|table|thead|tbody|tr)\b[^>]*>/gi, "\n")
    .replace(/<\/(h[1-6]|p|div|section|article|header|footer|table|thead|tbody|tr)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<(th|td)\b[^>]*>/gi, "\t")
    .replace(/<\/(th|td)>/gi, "\t");
  raw = raw.replace(/<[^>]+>/g, " ");
  return decodeEntities(raw)
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const sectionEndMarkers = [
  "yorumlar", "soru & cevap", "soru ve cevap", "taksit seçenekleri", "önerileriniz", "alışveriş deneyimi",
  "reviews", "questions & answers", "related products", "benzer ürünler", "müşteri yorumları"
];
const sectionStartMarkers = ["ürün bilgisi", "ürün açıklaması", "ürün detayları", "product information", "product details", "description"];

function findDescriptionSection(text, title, jsonDescription = "") {
  const lines = String(text || "").split("\n").map((x) => compact(x)).filter(Boolean);
  const jsonText = compact(jsonDescription);
  const candidates = [];
  const noise = new Set([
    "sepete ekle", "hızlı ekle", "teklif al", "stok sorunuz", "tavsiye et", "karşılaştır",
    "fiyat alarmı", "yazdır", "yorum yaz", "soru sor", "sınırlı stok", "ön siparişli ürün"
  ].map(fold));
  const isEnd = (line) => {
    const f = fold(line);
    return sectionEndMarkers.some((m) => { const fm = fold(m); return f === fm || f.startsWith(`${fm} `); });
  };
  const collect = (start, source) => {
    let end = lines.length;
    for (let i = Math.max(start + 1, 0); i < lines.length; i++) {
      if (isEnd(lines[i])) { end = i; break; }
    }
    const picked = lines.slice(Math.max(0, start), end)
      .filter((line, idx) => idx > 4 || !noise.has(fold(line)))
      .filter((line) => !/^https?:\/\//i.test(line));
    const value = picked.join("\n").trim();
    if (value) candidates.push({ value, source, score: value.length + picked.length * 10 });
  };

  // Ürün sitelerinde "Ürün Bilgisi" sekmesi çoğu zaman iki kez görünür:
  // ilk kopya sekme menüsüdür, ikinci kopya gerçek içeriktir. Her adayı çıkarıp
  // en dolu içerik bloğunu seçmek menü/benzer ürün karmaşasını engeller.
  for (let i = 0; i < lines.length; i++) {
    if (sectionStartMarkers.some((m) => fold(lines[i]) === fold(m))) collect(i + 1, "section");
  }

  // Ürün açıklaması bölümü açıkça bulunmuyorsa tüm sayfa metnini açıklama diye kullanma.
  // Bu tercih menü, iletişim, kategori ve footer bilgilerinin ürün açıklamasına karışmasını engeller.

  candidates.sort((a, b) => b.score - a.score);
  let result = candidates.find((x) => x.value.length >= 80)?.value || candidates[0]?.value || "";
  if (result.length < 80 && jsonText.length > result.length) result = jsonText;
  return result.slice(0, 60000);
}


function isUrlLikeText(value = "") {
  const raw = compact(value);
  if (!raw) return false;
  if (/^https?:\/\//i.test(raw)) return true;
  if (/^www\./i.test(raw)) return true;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw) && !/\s/.test(raw)) return true;
  return false;
}

function normalizeMeasureLine(value = "") {
  return String(value || "")
    .replace(/(\d)\s*(kg)\b/gi, "$1 kg")
    .replace(/(\d)\s*(mg)\b/gi, "$1 mg")
    .replace(/(\d)\s*(µg|ug)\b/gi, "$1 µg")
    .replace(/(\d)\s*(ml)\b/gi, "$1 mL")
    .replace(/(\d)\s*(lt|litre|liter)\b/gi, "$1 L")
    .replace(/(\d)\s*(cm)\b/gi, "$1 cm")
    .replace(/(\d)\s*(mm)\b/gi, "$1 mm")
    .replace(/(\d)\s*(rpm)\b/gi, "$1 rpm")
    .replace(/(\d)\s*(kw)\b/gi, "$1 kW")
    .replace(/(\d)\s*(w)\b/gi, "$1 W")
    .replace(/(\d)\s*(hz)\b/gi, "$1 Hz")
    .replace(/(\d)\s*(°\s*c|°c)\b/gi, "$1 °C")
    .replace(/\s*:\s*/g, " : ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const descriptionNoisePatterns = [
  /whatsapp/i, /telefon/i, /phone/i, /e-?posta/i, /e-?mail/i, /@/, /müşteri hizmet/i,
  /satış@/i, /destek@/i, /sipariş/i, /sepete ekle/i, /hemen al/i, /hızlı kargo/i,
  /aynı gün kargo/i, /kampanya/i, /fırsatı kaçırma/i, /indirim/i, /hesabım/i,
  /üye ol/i, /giriş yap/i, /tüm kategoriler/i, /alışveriş/i, /sepetim/i, /favori/i,
  /bizi takip/i, /sosyal medya/i, /iletişim/i, /adres/i, /iban/i, /banka hesap/i,
  /laboratuvar sarf malzemeleri/i, /bunzen beki/i, /beherler/i, /büret/i,
  /oturum aç/i, /copyright/i, /tüm hakları saklıdır/i, /web\s*site(?:si)?/i,
  /siteye hoş geldiniz/i, /web sitemiz/i, /çerez politikası/i, /gizlilik politikası/i,
  /gelince haber ver/i, /teklif al/i, /zorunlu alanları doldurunuz/i, /vergi daire/i,
  /adınız ve soyadınız/i, /unvan adı/i, /ürün açıklaması/i, /teknik ve kısa açıklama/i
];

const descriptionMenuStartKeys = new Set([
  "tum kategoriler", "butun kategoriler", "all categories", "urun kategorileri"
]);
const descriptionSectionKeys = new Set([
  "urun bilgisi", "urun aciklamasi", "urun detaylari", "product information",
  "product details", "description", "teknik ve kisa aciklama"
]);
const descriptionFormStopKeys = new Set([
  "gelince haber ver", "teklif al", "merhabalar", "paylas", "iptal", "gonder"
]);
const descriptionMetadataKeys = new Set([
  "stok kodu", "urun kodu", "sku", "marka", "brand", "model", "fiyat", "price"
]);

function descriptionKey(value = "") {
  return fold(value).replace(/[^a-z0-9]+/g, " ").trim();
}

export function sanitizeWebProductTitle(value = "", forbiddenNames = []) {
  let result = compact(value);
  for (const name of forbiddenNames) {
    const identity = compact(name);
    if (!identity || identity.length < 4) continue;
    const escaped = identity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\s*(?:\\||[-–—]|·)\\s*${escaped}\\s*$`, "i"), "").trim();
  }
  return result;
}

const genericBrandLeadKeys = new Set([
  "urun", "laboratuvar", "lab", "dijital", "digital", "otomatik", "automatic", "manuel",
  "cam", "plastik", "paslanmaz", "manyetik", "mekanik", "elektronik", "portatif", "profesyonel",
  "hassas", "analitik", "cerrahi", "steril", "tek", "cok", "yuksek", "dusuk", "mini", "set",
  "cihaz", "cihazi", "kabin", "kabini", "test", "olcer", "metre", "terazi", "mikroskop",
  "etuv", "santrifuj", "otoklav", "inkubator", "karistirici", "spektrofotometre", "termometre"
]);

export function brandFromTitle(value = "", code = "") {
  const title = compact(value).replace(/^[\s|·–—-]+/, "");
  if (!title) return "";
  const candidate = compact((title.match(/^([\p{L}][\p{L}\p{N}.&+-]{1,29})(?:\s|$)/u) || [])[1] || "");
  if (!candidate || genericBrandLeadKeys.has(fold(candidate)) || /^\d/.test(candidate)) return "";
  if (code && fold(candidate) === fold(code)) return "";
  return candidate;
}

const cleanProductTitle = sanitizeWebProductTitle;

function siteIdentityNames(objects = [], finalUrl = "") {
  const names = [];
  for (const item of objects) {
    if (!typeHas(item, "WebSite") && !typeHas(item, "Organization")) continue;
    const value = compact(item?.name || item?.legalName || "");
    if (value) names.push(value);
  }
  try {
    const host = new URL(finalUrl).hostname.replace(/^www\./i, "");
    if (host) {
      names.push(host);
      const stem = host.split(".")[0].replace(/[-_]+/g, " ");
      if (stem.length >= 4) names.push(stem);
    }
  } catch {}
  return [...new Set(names.map(compact).filter((x) => x.length >= 4))];
}

function lineIsDescriptionNoise(line = "", forbiddenNames = []) {
  const value = compact(line);
  if (!value) return true;
  if (/^https?:\/\//i.test(value) || /^www\./i.test(value)) return true;
  if (/(?:https?:\/\/|www\.)?\b[a-z0-9][a-z0-9.-]+\.(?:com(?:\.tr)?|net(?:\.tr)?|org(?:\.tr)?|edu(?:\.tr)?|gov(?:\.tr)?|io|co|de|uk)\b/i.test(value)) return true;
  if (/^\+?[\d\s().-]{10,}$/.test(value) && value.replace(/\D/g, "").length >= 10) return true;
  if (/\b\d{2,4}\s*\d{2,4}\s*\d{2,4}\b/.test(value) && /(?:tel|gsm|whatsapp|sipariş)/i.test(value)) return true;
  if (descriptionNoisePatterns.some((rx) => rx.test(value))) return true;
  const folded = fold(value);
  if (value.length <= 160 && !/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m|ml|l|mg|kg|w|kw|v|hz|rpm|°c)\b/i.test(value)) {
    for (const name of forbiddenNames) {
      const identity = fold(name);
      if (identity.length >= 4 && (folded === identity || folded === `${identity} ana sayfa` || folded === `${identity} hos geldiniz`)) return true;
    }
  }
  return false;
}

export function sanitizeWebProductDescription(value = "", { forbiddenNames = [], productTitle = "" } = {}) {
  const seen = new Set();
  const rawLines = String(value || "").replace(/\r\n?/g, "\n").split("\n");
  const kept = [];
  const titleKey = descriptionKey(productTitle);
  let suppressMenu = false;
  let skipMetadataValue = false;
  for (let raw of rawLines) {
    let line = normalizeMeasureLine(compact(raw));
    if (!line) continue;
    const normalizedKey = descriptionKey(line);
    if (descriptionMenuStartKeys.has(normalizedKey)) {
      suppressMenu = true;
      skipMetadataValue = false;
      continue;
    }
    if (suppressMenu) {
      const reachedProduct = titleKey.length >= 8 && (
        normalizedKey === titleKey || normalizedKey.startsWith(`${titleKey} `) || titleKey.startsWith(`${normalizedKey} `)
      );
      if (reachedProduct || descriptionSectionKeys.has(normalizedKey)) suppressMenu = false;
      continue;
    }
    if (descriptionSectionKeys.has(normalizedKey)) continue;
    if (descriptionFormStopKeys.has(normalizedKey) || /^urun\s+\d+$/i.test(normalizedKey)) {
      if (kept.length) break;
      continue;
    }
    if (descriptionMetadataKeys.has(normalizedKey)) {
      skipMetadataValue = true;
      continue;
    }
    if (skipMetadataValue) {
      skipMetadataValue = false;
      continue;
    }
    if (titleKey && (normalizedKey === titleKey || normalizedKey.startsWith(`${titleKey} `))) continue;
    if (/^[\d.,\s]+\s*(?:tl|try|eur|usd|₺|€|\$)$/i.test(line)) continue;
    if (lineIsDescriptionNoise(line, forbiddenNames)) continue;
    if (/^[^\p{L}\p{N}]+$/u.test(line)) continue;
    if (/^[•·\-–—*]+$/.test(line)) continue;
    if (/^[•·\-–—*]\s*/.test(line)) line = "• " + line.replace(/^[•·\-–—*]\s*/, "");
    const key = fold(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(line);
  }
  const text = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 24) return "";
  return text.slice(0, 16000);
}

const cleanProductDescription = sanitizeWebProductDescription;

function htmlDescriptionCandidates(html = "", options = {}) {
  const source = String(html || "");
  const candidates = [];
  const rx = /<(div|section|article|table)\b[^>]*(?:id|class)=["'][^"']*(?:description|aciklama|açıklama|product[-_ ]?(?:detail|info|description)|urun[-_ ]?(?:detay|aciklama)|technical|specification|specs|tab[-_ ]?content)[^"']*["'][^>]*>([\s\S]{0,140000}?)<\/\1>/gi;
  for (const m of source.matchAll(rx)) {
    const value = cleanProductDescription(structuredText(m[2] || ""), options);
    if (value) candidates.push(value);
    if (candidates.length >= 24) break;
  }
  return candidates;
}

function extractProductDescription(html, pageText, title, jsonDescription = "", options = {}) {
  const candidates = [];
  const jsonRaw = String(jsonDescription || "").trim();
  if (jsonRaw) {
    const v = cleanProductDescription(/<[^>]+>/.test(jsonRaw) ? structuredText(jsonRaw) : jsonRaw, options);
    if (v) candidates.push({ value: v, score: 100000 + v.length });
  }
  for (const v of htmlDescriptionCandidates(html, options)) candidates.push({ value: v, score: 80000 + v.length });
  const legacy = cleanProductDescription(findDescriptionSection(pageText, title, ""), options);
  if (legacy) candidates.push({ value: legacy, score: 10000 + legacy.length });
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0]?.value || "";
  if (!best) return "";
  // Sayfanın menü/footer içeriği açıklama diye geldiyse hiç kayıt etme.
  const lines = best.split("\n").filter(Boolean);
  const noisy = lines.filter((line) => lineIsDescriptionNoise(line, options.forbiddenNames || [])).length;
  if (lines.length && noisy / lines.length > 0.15) return "";
  return best;
}

function labeledValue(text, labels = []) {
  for (const label of labels) {
    const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = String(text || "").match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*[:\\-]?\\s*([^\\n]{1,120})`, "i"));
    if (m?.[1]) {
      const v = compact(m[1]);
      if (v && !lineIsDescriptionNoise(v)) return v;
    }
  }
  return "";
}

function pdfLinks(html, base) {
  const docs = { brochure_url: "", manual_url: "", ce_certificate_url: "" };
  for (const m of String(html || "").matchAll(/<a\b[^>]+href=["']([^"'#?]+(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = absoluteUrl(decodeEntities(m[1] || ""), base);
    if (!href || !/\.pdf(?:$|[?#])/i.test(href)) continue;
    const label = fold(`${structuredText(m[2] || "")} ${href}`);
    if (!docs.ce_certificate_url && /\bce\b|sertifika|certificate|uygunluk/.test(label)) docs.ce_certificate_url = href;
    else if (!docs.manual_url && /kilavuz|kullanim|manual|user guide|instruction/.test(label)) docs.manual_url = href;
    else if (!docs.brochure_url && /brosur|brochure|katalog|catalog|datasheet|teknik foy|teknik dokuman/.test(label)) docs.brochure_url = href;
    else if (!docs.brochure_url) docs.brochure_url = href;
  }
  return docs;
}

function skuFromText(text) {
  const patterns = [
    /(?:stok\s*kodu|ürün\s*kodu|product\s*code|sku)\s*[:\-]?\s*([A-Z0-9ÇĞİÖŞÜ._\/-]{2,80})/i,
    /(?:model\s*kodu|model\s*code)\s*[:\-]?\s*([A-Z0-9ÇĞİÖŞÜ._\/-]{2,80})/i
  ];
  for (const p of patterns) {
    const m = text.match(p); if (m?.[1]) return compact(m[1]).replace(/[|,;]+$/, "");
  }
  return "";
}

function categoryFromLd(objects) {
  const breadcrumb = objects.find((x) => typeHas(x, "BreadcrumbList"));
  const items = Array.isArray(breadcrumb?.itemListElement) ? breadcrumb.itemListElement : [];
  const names = items.map((x) => compact(x?.name || x?.item?.name)).filter(Boolean);
  return names.length > 1 ? names[names.length - 2] : "";
}

function additionalProductProperty(product, labels = []) {
  const wanted = new Set(labels.map((x) => fold(x)));
  const props = Array.isArray(product?.additionalProperty) ? product.additionalProperty : [];
  for (const prop of props) {
    const key = fold(prop?.name || prop?.propertyID || prop?.identifier || "");
    if (!key || !wanted.has(key)) continue;
    const value = compact(prop?.value || prop?.valueReference?.name || prop?.description || "");
    if (value) return value;
  }
  return "";
}

function entityName(value) {
  if (Array.isArray(value)) return value.map(entityName).find(Boolean) || "";
  if (value && typeof value === "object") return compact(value.name || value.legalName || value.value || "");
  return compact(value);
}

function brandFromHtml(html = "") {
  const source = String(html || "");
  const candidates = [
    metaContent(source, ["product:brand", "brand", "manufacturer"]),
    compact((source.match(/<meta\b[^>]*itemprop=["']brand["'][^>]*content=["']([^"']+)["']/i) || [])[1] || ""),
    compact((source.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*itemprop=["']brand["']/i) || [])[1] || ""),
    compact(structuredText((source.match(/<[^>]+itemprop=["']brand["'][^>]*>([\s\S]{0,500}?)<\/[^>]+>/i) || [])[1] || "")),
    compact(structuredText((source.match(/<a\b[^>]+href=["'][^"']*\/(?:marka|brand)\/[^"']+["'][^>]*>([\s\S]{0,300}?)<\/a>/i) || [])[1] || "")),
    compact(structuredText((source.match(/<[^>]+(?:class|id)=["'][^"']*(?:product[-_ ]?brand|brand[-_ ]?name|manufacturer)[^"']*["'][^>]*>([\s\S]{0,500}?)<\/[^>]+>/i) || [])[1] || "")),
    compact(structuredText((source.match(/(?:Marka|Brand|Üretici|Manufacturer)\s*<\/[^>]+>\s*<[^>]+>([\s\S]{0,180}?)<\/[^>]+>/i) || [])[1] || "")),
    compact((source.match(/\bdata-(?:brand|manufacturer)=["']([^"']{1,100})["']/i) || [])[1] || "")
  ];
  return candidates.find(Boolean) || "";
}

function cleanProductIdentityValue(value, { code = "", kind = "" } = {}) {
  const raw = compact(value);
  if (!raw || raw.length > 160 || isUrlLikeText(raw) || lineIsDescriptionNoise(raw)) return "";
  // Kod, SKU veya stok kodu hiçbir zaman marka/model/kategori alanına otomatik kopyalanmaz.
  if (code && fold(raw) === fold(code)) return "";
  if (/^(?:sku|stok kodu|ürün kodu|product code|kod|code)\s*[:#-]?/i.test(raw)) return "";
  if (kind === "category" && /^(?:ana sayfa|home|ürünler|products|tüm ürünler)$/i.test(raw)) return "";
  return raw;
}

export async function analyzeProductUrl(value) {
  const { response, body, finalUrl } = await safeFetch(value);
  const type = String(response.headers.get("content-type") || "").toLowerCase();
  if (type && !type.includes("text/html") && !type.includes("application/xhtml"))
    throw Object.assign(new Error("Bu adres HTML ürün sayfası olarak görünmüyor."), { status: 415, expose: true });
  const html = body.toString("utf8");
  const objects = jsonLdObjects(html);
  const product = objects.find((x) => typeHas(x, "Product")) || productJsonLd(html);
  const offer = offerFromProduct(product, objects);
  const identityNames = siteIdentityNames(objects, finalUrl);
  const rawTitle = compact(product?.name) || metaContent(html, ["og:title", "twitter:title"]) || headingOne(html) || titleTag(html);
  const title = sanitizeWebProductTitle(rawTitle, identityNames);
  if (!title || isUrlLikeText(title)) {
    return { discarded: true, selected: false, product_url: finalUrl, warning: "Ürün adı yerine bağlantı döndüren kayıt sonuçlara alınmadı." };
  }
  const pageText = structuredText(html);
  const code = compact(product?.sku || product?.mpn || metaContent(html, ["sku", "product:retailer_item_id"])) || skuFromText(pageText);
  const priceText = offer?.price ?? offer?.lowPrice ?? metaContent(html, ["product:price:amount", "og:price:amount", "price"]);
  const currencyRaw = offer?.priceCurrency || metaContent(html, ["product:price:currency", "og:price:currency"]);
  let image = product?.image || metaContent(html, ["og:image", "twitter:image"]);
  if (image && typeof image === "object") image = image.url || image.contentUrl || "";
  const brand = cleanProductIdentityValue(
    entityName(product?.brand) ||
    entityName(product?.manufacturer) ||
    additionalProductProperty(product, ["Marka", "Brand", "Üretici", "Manufacturer"]) ||
    brandFromHtml(html) ||
    labeledValue(pageText, ["Marka", "Brand", "Üretici", "Manufacturer"]) ||
    brandFromTitle(title, code),
    { code, kind: "brand" }
  );
  const model = cleanProductIdentityValue(
    product?.model ||
    additionalProductProperty(product, ["Model", "Model Kodu", "Model Code"]) ||
    labeledValue(pageText, ["Model", "Model Kodu", "Model Code"]),
    { code, kind: "model" }
  );
  const category = cleanProductIdentityValue(
    product?.category || categoryFromLd(objects) ||
    additionalProductProperty(product, ["Kategori", "Category"]) ||
    metaContent(html, ["product:category", "article:section"]) || labeledValue(pageText, ["Kategori", "Category"]),
    { code, kind: "category" }
  );
  const jsonDescription = product?.description || "";
  const descriptionOptions = { forbiddenNames: identityNames, productTitle: title };
  const descriptionBase = extractProductDescription(html, pageText, title, jsonDescription, descriptionOptions);
  const focused = variantAwareDescription(descriptionBase, title);
  const description = cleanProductDescription(focused.description || descriptionBase, descriptionOptions);
  const docs = pdfLinks(html, finalUrl);
  const row = {
    selected: true,
    importable: true,
    code,
    name: title,
    description,
    brand,
    model,
    category,
    price: priceNumber(priceText),
    currency: currencyCode(currencyRaw, `${priceText || ""} ${pageText.slice(0, 1000)}`),
    vat_rate: 20,
    unit: "ADET",
    image_url: absoluteUrl(image, finalUrl),
    product_url: finalUrl,
    ...docs,
    variant: focused.variant,
    source_method: product ? "JSON-LD + ürün sayfası" : "Ürün sayfası / meta etiketleri",
    warning: ""
  };
  const warnings = [];
  if (!row.code) warnings.push("Ürün kodu bulunamadı.");
  if (!row.price) warnings.push("Fiyat bulunamadı veya sıfır.");
  if (!row.brand) warnings.push("Marka bulunamadı.");
  if (!row.model) warnings.push("Model bulunamadı.");
  if (!row.category) warnings.push("Kategori bulunamadı.");
  if (row.variant.status === "REVIEW") warnings.push(row.variant.note);
  row.warning = warnings.filter(Boolean).join(" ");
  // Yeni kayıt için yalnız ürün kodu ve gerçek ürün adı zorunludur. Marka/model/kategori
  // kaynakta yoksa alan boş kalır; bu eksikler seçim kutusunu kilitlemez.
  if (!row.code) row.selected = false;
  return row;
}

function xmlLocations(xml) {
  return [...String(xml || "").matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map((m) => compact(m[1])).filter(Boolean);
}

function hrefLocations(html, base) {
  const out = [];
  for (const match of String(html || "").matchAll(/<a\b[^>]+href=["']([^"'#]+)["'][^>]*>/gi)) {
    try { out.push(new URL(decodeEntities(match[1]), base).toString()); } catch {}
  }
  return out;
}

async function robotsSitemaps(base) {
  try {
    const result = await safeFetch(new URL("/robots.txt", base).toString(), {
      accept: "text/plain,*/*;q=0.5", maxBytes: 512 * 1024, timeoutMs: 9000
    });
    return String(result.body.toString("utf8")).split(/\r?\n/)
      .map((line) => line.match(/^\s*Sitemap\s*:\s*(.+)\s*$/i)?.[1])
      .filter(Boolean)
      .map((x) => { try { return new URL(x, base).toString(); } catch { return ""; } })
      .filter(Boolean);
  } catch { return []; }
}

function productRegex(pattern = "") {
  try { return new RegExp(pattern || "/urun/|/product/|/products/|/p/|/item/", "i"); }
  catch { return /\/urun\/|\/product\/|\/products\/|\/p\/|\/item\//i; }
}

export function looksLikeSitemapUrl(value = "") {
  if (!value) return false;
  try {
    const u = new URL(String(value));
    return /sitemap/i.test(u.pathname) || /\.xml(?:\.gz)?$/i.test(u.pathname);
  } catch {
    return /sitemap/i.test(String(value)) || /\.xml(?:\.gz)?(?:$|\?)/i.test(String(value));
  }
}

function pageHasProductSignals(html = "") {
  const source = String(html || "");
  if (!source) return false;
  if (/itemtype=["'][^"']*schema\.org\/Product/i.test(source)) return true;
  if (/<meta[^>]+(?:property|name)=["']product:price:amount["']/i.test(source)) return true;
  if (/data-(?:product|product-id|productid|sku)=/i.test(source)) return true;
  try {
    return jsonLdObjects(source).some((x) => typeHas(x, "Product"));
  } catch {
    return false;
  }
}

function likelyCatalogLink(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (!path || path === "/") return false;
    if (/\.(?:jpg|jpeg|png|webp|gif|svg|pdf|css|js|xml|txt|ico)(?:$|\?)/i.test(path)) return false;
    if (/\/(?:blog|haber|news|sayfa|page|iletisim|contact|hakkimizda|about|login|giris|uye|member|sepet|cart|favori|wishlist|arama|search)(?:\/|$)/i.test(path)) return false;
    return path.split("/").filter(Boolean).length >= 1;
  } catch {
    return false;
  }
}

async function probeProductCandidates(candidates, { origin, discovered, max, onProgress }) {
  const queue = [...new Set(candidates)].filter((raw) => {
    try { return new URL(raw).origin === origin && likelyCatalogLink(raw); } catch { return false; }
  }).slice(0, 160);
  if (!queue.length || discovered.size >= max) return;
  let cursor = 0;
  let checked = 0;
  async function worker() {
    while (cursor < queue.length && discovered.size < max) {
      const index = cursor++;
      const url = queue[index];
      try {
        const result = await safeFetch(url, { maxBytes: MAX_HTML_BYTES, timeoutMs: 9000 });
        const html = result.body.toString("utf8");
        if (pageHasProductSignals(html)) discovered.add(result.finalUrl);
      } catch {}
      checked++;
      onProgress?.({ stage: "probe", pages: checked, products: discovered.size, message: "Ürün sayfası yapısı doğrulanıyor" });
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, queue.length || 1) }, worker));
}

export async function discoverAllProductUrls({ baseUrl, sitemapUrl = "", pattern = "/urun/|/product/|/products/", maxUrls = 10000, onProgress = null }) {
  const base = await validateRemoteUrl(baseUrl);
  const origin = base.origin;
  const regex = productRegex(pattern);
  const max = Math.min(20000, Math.max(50, Number(maxUrls) || 10000));
  const discovered = new Set();
  const allPageUrls = new Set();
  const probeCandidates = new Set();
  const warnings = [];

  const sitemapSeeds = [];
  if (sitemapUrl) {
    const manual = new URL(sitemapUrl, base).toString();
    if (looksLikeSitemapUrl(manual)) sitemapSeeds.push(manual);
    else warnings.push("Girilen sitemap adresi XML/sitemap adresi görünmediği için otomatik sitemap keşfi kullanıldı.");
  }
  sitemapSeeds.push(...await robotsSitemaps(base));
  sitemapSeeds.push(new URL("/sitemap.xml", base).toString(), new URL("/sitemap_index.xml", base).toString());
  const sitemapQueue = [...new Set(sitemapSeeds.filter((x) => {
    try { return new URL(x).origin === origin && looksLikeSitemapUrl(x); } catch { return false; }
  }))];
  const seenSitemaps = new Set();
  let primarySitemap = sitemapQueue[0] || "";

  // İlk gerçek veriyi mümkün olduğunca erken üret: sitemap beklemeden ana sayfadaki
  // ürün linklerini yakala. Böylece kullanıcı tarama ekranında 0 sayısına uzun süre bakmaz.
  const earlyCategoryLinks = [];
  try {
    const firstPage = await safeFetch(base.toString(), { maxBytes: MAX_HTML_BYTES, timeoutMs: 9000 });
    const links = hrefLocations(firstPage.body.toString("utf8"), firstPage.finalUrl);
    for (const raw of links) {
      let u;
      try { u = new URL(raw); } catch { continue; }
      if (u.origin !== origin) continue;
      u.hash = "";
      const absolute = u.toString();
      if (regex.test(`${u.pathname}${u.search}`)) discovered.add(absolute);
      else if (/\/(kategori|category|collections?|shop|magaza|urunler|products|catalog|catalogue)(\/|$)/i.test(u.pathname)) {
        if (earlyCategoryLinks.length < 120) earlyCategoryLinks.push(absolute);
      } else if (probeCandidates.size < 120 && likelyCatalogLink(absolute)) {
        probeCandidates.add(absolute);
      }
      if (discovered.size >= max) break;
    }
    onProgress?.({ stage: "crawl", pages: 1, products: discovered.size, sitemaps: 0, message: "Ana sayfadaki ürün bağlantıları tarandı" });
  } catch (error) {
    warnings.push(`Ana sayfa hızlı keşfi tamamlanamadı: ${String(error?.message || error)}`);
  }

  // Sitemap'leri tek tek 16 saniye beklemek yerine kontrollü paralel partiler halinde tarar.
  // Böylece hatalı/yanıt vermeyen bir sitemap tüm taramayı kilitlemez.
  while (sitemapQueue.length && seenSitemaps.size < 80 && allPageUrls.size < max * 4 && discovered.size < max) {
    const batch = [];
    while (sitemapQueue.length && batch.length < 6) {
      const current = sitemapQueue.shift();
      if (!current || seenSitemaps.has(current)) continue;
      seenSitemaps.add(current);
      batch.push(current);
    }
    if (!batch.length) break;
    const results = await Promise.all(batch.map(async (current) => {
      try {
        const result = await safeFetch(current, {
          accept: "application/xml,text/xml,text/plain,*/*;q=0.5",
          maxBytes: 12 * 1024 * 1024,
          timeoutMs: 9000
        });
        return { current, ok: true, body: result.body.toString("utf8") };
      } catch (error) {
        return { current, ok: false, error: String(error?.message || error) };
      }
    }));
    for (const item of results) {
      if (!item.ok) continue;
      const locations = xmlLocations(item.body);
      for (const raw of locations) {
        let u;
        try { u = new URL(raw, base); } catch { continue; }
        if (u.origin !== origin) continue;
        const absolute = u.toString();
        if (looksLikeSitemapUrl(absolute)) {
          if (!seenSitemaps.has(absolute) && sitemapQueue.length < 300) sitemapQueue.push(absolute);
          continue;
        }
        allPageUrls.add(absolute);
        if (regex.test(`${u.pathname}${u.search}`)) discovered.add(absolute);
        else if (probeCandidates.size < 180) probeCandidates.add(absolute);
        if (discovered.size >= max) break;
      }
    }
    onProgress?.({
      stage: "sitemap",
      sitemaps: seenSitemaps.size,
      pages: allPageUrls.size,
      products: discovered.size,
      message: "Sitemap dosyaları taranıyor"
    });
  }

  // Ana sayfa ve kategori sayfaları her durumda taranır. Sitemap eksik olsa bile
  // ekranda ürün sayısı gerçek zamanlı artmaya başlar.
  if (discovered.size < max) {
    const queue = [base.toString(), ...earlyCategoryLinks];
    const visited = new Set();
    while (queue.length && visited.size < 180 && discovered.size < max) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      try {
        const result = await safeFetch(current, { maxBytes: MAX_HTML_BYTES, timeoutMs: 9000 });
        const links = hrefLocations(result.body.toString("utf8"), result.finalUrl);
        for (const raw of links) {
          let u;
          try { u = new URL(raw); } catch { continue; }
          if (u.origin !== origin) continue;
          u.hash = "";
          const absolute = u.toString();
          if (regex.test(`${u.pathname}${u.search}`)) discovered.add(absolute);
          else if (/\/(kategori|category|collections?|shop|magaza|urunler|products|catalog|catalogue)(\/|$)/i.test(u.pathname)) {
            if (!visited.has(absolute) && queue.length < 300) queue.push(absolute);
          } else if (probeCandidates.size < 240 && likelyCatalogLink(absolute)) {
            probeCandidates.add(absolute);
          }
          if (discovered.size >= max) break;
        }
        onProgress?.({
          stage: "crawl",
          pages: visited.size,
          products: discovered.size,
          sitemaps: seenSitemaps.size,
          message: "Site ve kategori bağlantıları taranıyor"
        });
      } catch {}
    }
  }

  // Ürün yolu standart değilse sınırlı sayıda aday sayfayı JSON-LD / Product sinyaliyle doğrula.
  if (discovered.size < Math.min(max, 10) && probeCandidates.size) {
    await probeProductCandidates(probeCandidates, { origin, discovered, max, onProgress });
  }

  const urls = [...discovered].slice(0, max);
  return {
    total: urls.length,
    offset: 0,
    limit: urls.length,
    urls,
    sitemap: primarySitemap,
    sitemap_count: seenSitemaps.size,
    page_count: allPageUrls.size,
    warnings,
    truncated: urls.length >= max
  };
}

export async function discoverProductUrls({ baseUrl, sitemapUrl = "", pattern = "/urun/|/product/|/products/", offset = 0, limit = 20 }) {
  const all = await discoverAllProductUrls({ baseUrl, sitemapUrl, pattern, maxUrls: 10000 });
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  return { ...all, offset: safeOffset, limit: safeLimit, urls: all.urls.slice(safeOffset, safeOffset + safeLimit) };
}

export async function analyzeUrls(urls, concurrency = 4, onRow = null) {
  const queue = [...new Set((urls || []).filter(Boolean))];
  const rows = new Array(queue.length);
  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      const index = cursor++;
      const url = queue[index];
      try { rows[index] = await analyzeProductUrl(url); }
      catch (error) {
        rows[index] = {
          discarded: true, selected: false, importable: false, code: "", name: "", description: "", brand: "", model: "", category: "",
          price: 0, currency: "TRY", vat_rate: 20, unit: "ADET", image_url: "", product_url: url,
          variant: { status: "ERROR", tokens: [], confidence: 0, note: String(error?.message || error) },
          source_method: "Hata", warning: String(error?.message || "Ürün sayfası okunamadı.")
        };
      }
      if (typeof onRow === "function") {
        try { await onRow(rows[index], index, queue.length); } catch {}
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), queue.length || 1) }, worker));
  return rows.filter((row) => row && !row.discarded && row.name && !isUrlLikeText(row.name));
}

function imageMagic(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { ext: ".jpg", mime: "image/jpeg" };
  if (buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return { ext: ".png", mime: "image/png" };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { ext: ".webp", mime: "image/webp" };
  return null;
}

export async function downloadProductImage(value, tenantId) {
  if (!value) return "";
  const { response, body } = await safeFetch(value, { accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8", maxBytes: MAX_IMAGE_BYTES, timeoutMs: 18000 });
  const magic = imageMagic(body);
  if (!magic) throw Object.assign(new Error("Kaynak ürün görseli JPG, PNG veya WEBP formatında değil."), { status: 415, expose: true });
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.startsWith("image/") && !contentType.includes("octet-stream"))
    throw Object.assign(new Error("Kaynak görsel geçerli bir image yanıtı döndürmedi."), { status: 415, expose: true });
  const segment = tenantUploadSegment(tenantId);
  const relativeDir = path.join(segment, "products");
  const dir = path.join(config.publicUploadDir, relativeDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const name = `${Date.now()}-web-${crypto.randomUUID()}${magic.ext}`;
  const full = path.join(dir, name);
  fs.writeFileSync(full, body, { mode: 0o600 });
  return publicUploadUrl(path.posix.join(segment, "products", name));
}


export async function downloadProductPdf(value, tenantId, kind = "document") {
  if (!value) return "";
  const { response, body } = await safeFetch(value, { accept: "application/pdf,*/*;q=0.5", maxBytes: MAX_PDF_BYTES, timeoutMs: 22000 });
  if (body.length < 5 || body.subarray(0, 5).toString("ascii") !== "%PDF-")
    throw Object.assign(new Error("Kaynak belge geçerli PDF değil."), { status: 415, expose: true });
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("pdf") && !contentType.includes("octet-stream"))
    throw Object.assign(new Error("Kaynak belge PDF yanıtı döndürmedi."), { status: 415, expose: true });
  const segment = tenantUploadSegment(tenantId);
  const relativeDir = path.join(segment, "products", "documents");
  const dir = path.join(config.publicUploadDir, relativeDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const safeKind = String(kind || "document").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const name = `${Date.now()}-web-${safeKind}-${crypto.randomUUID()}.pdf`;
  fs.writeFileSync(path.join(dir, name), body, { mode: 0o600 });
  return publicUploadUrl(path.posix.join(segment, "products", "documents", name));
}

export const webImportInternals = {
  structuredText,
  targetVariantTokens,
  variantAwareDescription,
  findDescriptionSection,
  priceNumber,
  currencyCode,
  cleanProductDescription,
  sanitizeWebProductDescription,
  sanitizeWebProductTitle,
  brandFromHtml,
  brandFromTitle,
  isUrlLikeText,
  pdfLinks
};

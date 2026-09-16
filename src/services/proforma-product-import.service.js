import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { config } from "../config.js";

const require = createRequire(import.meta.url);
const text = (value) =>
  String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .trim();
const fold = (value) =>
  text(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
const importsDir = path.join(config.privateUploadDir, "product-imports");
fs.mkdirSync(importsDir, { recursive: true, mode: 0o700 });

const synonyms = {
  code: [
    "kod",
    "urun kodu",
    "stok kodu",
    "malzeme kodu",
    "item code",
    "product code",
    "item no",
    "item number",
    "product no",
    "stock code",
    "sku",
    "ref",
    "reference",
    "model kodu",
    "catalog no",
    "catalogue no",
    "part no",
    "parca no"
  ],
  name: [
    "urun adi",
    "urun hizmet adi",
    "malzeme adi",
    "product name",
    "item name",
    "material name",
    "urun tanimi",
    "malzeme tanimi",
    "ticari tanim",
    "urun",
    "malzeme",
    "product",
    "item",
    "hizmet"
  ],
  description: [
    "urun aciklamasi",
    "urun hizmet aciklamasi",
    "malzeme aciklamasi",
    "aciklama",
    "teknik aciklama",
    "detay",
    "ozellik",
    "specification",
    "technical description",
    "description",
    "details",
    "item description",
    "product description"
  ],
  qty: ["miktar", "adet", "qty", "quantity", "amount", "count"],
  unit: ["birim", "unit", "olcu birimi", "uom"],
  price: [
    "birim fiyat",
    "birim fiyati",
    "unit price",
    "unit cost",
    "liste fiyati",
    "net fiyat",
    "satis fiyati",
    "fiyat",
    "price"
  ],
  currency: ["para birimi", "doviz", "currency", "curr", "pb"],
  image_url: ["gorsel", "gorsel baglantisi", "resim", "image", "image url", "photo", "foto", "picture"],
  vat_rate: ["kdv", "kdv orani", "vat", "tax", "tax rate"]
};
const unitWords = new Set([
  "ADET",
  "PCS",
  "PC",
  "SET",
  "TAKIM",
  "KG",
  "GR",
  "G",
  "LT",
  "L",
  "ML",
  "M",
  "METRE",
  "CM",
  "MM",
  "KUTU",
  "PAKET",
  "PAIR",
  "ÇİFT",
  "CIFT"
]);
const currencyWords = new Set(["TRY", "TL", "EUR", "USD", "GBP", "₺", "€", "$", "£"]);
const rejectLine =
  /^(toplam|ara toplam|subtotal|kdv|vat|genel toplam|grand total|total|tarih|date|adres|address|telefon|phone|email|e posta|vergi|tax office|banka|iban|teslim|odeme|payment|aciklama ve sartlar|terms)/i;
const ancillaryLine =
  /^(?:not|notlar|aciklama|aciklamalar|sartlar|kosullar|teklif sartlari|odeme|odeme sekli|vade|teslim|teslimat|termin|nakliye|kargo|sevk|montaj|kurulum|garanti|garanti suresi|servis|gecerlilik|teklif gecerlilik|fatura|irsaliye|banka|iban|hesap|vergi|kdv|vat|iskonto|indirim|ara toplam|genel toplam|toplam|odenecek|matrah|doviz kuru|kur bilgisi|yalniz|ettn|sayfa|page)\b/i;
function isAncillaryProductText(value) {
  const raw = text(value).replace(/\s+/g, " ").trim();
  if (!raw) return false;
  const f = fold(raw);
  if (ancillaryLine.test(f) || rejectLine.test(f)) return true;
  const addressNoise =
    /\b(?:mahallesi|mahalle|mah\.?|sokak|sok\.?|cadde|cad\.?|bulvar|blv\.?|caddesi|sitesi|plaza|organize sanayi|sanayi bolgesi|kat\s*[:\-]?\s*\d+|daire\s*[:\-]?\s*\d+|no\s*[:\-]?\s*\d+|posta kodu|yenimahalle|ostim|ivedikkoy|ivedik|ankara|istanbul|izmir|antalya|turkiye)\b/i;
  const identityNoise =
    /\b(?:vergi dairesi|vergi kimlik|ticaret sicil|mersis|telefon|e posta|eposta|web sitesi|yetkili kisi|firma adi|unvan|fatura tarihi|teklif tarihi|seri no|sayfa no)\b/i;
  const productWords =
    /\b(?:cihaz|makine|dolap|masa|tezgah|etuv|firin|pompa|motor|terazi|mikser|karistirici|kabin|sandalye|raf|huni|banyo|santrifuj|spektro|analizor|mikroskop|inkubator|otoklav|desikator|hortum|bunsen|fan|filtre|vibrator|vibrat|numune|kap|termometre|sensor|elek|kefe|su banyosu|ocak|duşu|dusu|profil|tabure|sehpa|lavabo|evye)\b/i;
  if ((addressNoise.test(f) || identityNoise.test(f)) && !productWords.test(f)) return true;
  if (
    /\b(?:garanti|warranty|teslimat?|delivery|odeme|payment|vade|nakliye|freight|kargo|sevk|montaj|installation|kurulum|teklif|quotation|gecerlilik|validity|banka|iban|vergi|tax|kdv|vat|toplam|total|tutar|amount|matrah|doviz kuru|exchange rate|irsaliye|ettn)\b/.test(
      f
    ) &&
    !productWords.test(f)
  )
    return true;
  if (/^(?:yalniz|not)\s*[:\-]/.test(f)) return true;
  if (/\b(?:yil|ay|gun|hafta)\b/.test(f) && /\b(?:garanti|sure|gecerli|teslim)\b/.test(f)) return true;
  if (raw.length > 180 && !/[0-9]{2,}\s*(?:CM|MM|ML|L|LT|KG|G|W|V|HZ|°C|C)\b/i.test(raw)) return true;
  return false;
}

function fieldForHeader(header) {
  const h = fold(header);
  if (!h) return "";
  // Toplam/tutar sütunları ürün birim fiyatı değildir; fiyat alanına bağlanmaz.
  if (/^(toplam|tutar|amount|total|net amount|satir toplam|line total|genel toplam)$/.test(h)) return "";
  const exactPriority = [
    ["code", synonyms.code],
    ["name", synonyms.name],
    ["description", synonyms.description],
    ["qty", synonyms.qty],
    ["unit", synonyms.unit],
    ["price", synonyms.price],
    ["currency", synonyms.currency],
    ["vat_rate", synonyms.vat_rate],
    ["image_url", synonyms.image_url]
  ];
  for (const [field, items] of exactPriority) if (items.some((item) => h === fold(item))) return field;
  let best = "",
    score = 0;
  for (const [field, items] of exactPriority)
    for (const item of items) {
      const n = fold(item);
      let sc = 0;
      if (h.startsWith(n) || n.startsWith(h)) sc = 80;
      else if (h.includes(n) || n.includes(h)) sc = 55;
      if (field === "name" && /(aciklama|description|detay|ozellik|specification)/.test(h)) sc = 0;
      if (field === "price" && /(toplam|tutar|amount|total)/.test(h) && !/(birim|unit)/.test(h)) sc = 0;
      if (sc > score) {
        best = field;
        score = sc;
      }
    }
  return score >= 55 ? best : "";
}
function normalizeCurrency(value, priceText = "") {
  const raw = `${value ?? ""} ${priceText ?? ""}`;
  const v = fold(raw).toUpperCase();
  if (v.includes("EUR") || raw.includes("€")) return "EUR";
  if (v.includes("USD") || raw.includes("$")) return "USD";
  if (v.includes("GBP") || raw.includes("£")) return "GBP";
  return "TRY";
}
function parseNumber(value, defaultValue = 0) {
  let raw = text(value)
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "");
  if (!raw) return defaultValue;
  const comma = raw.lastIndexOf(","),
    dot = raw.lastIndexOf(".");
  if (comma >= 0 && dot >= 0)
    raw = comma > dot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  else if (comma >= 0) raw = raw.replace(/\./g, "").replace(",", ".");
  else if ((raw.match(/\./g) || []).length > 1) raw = raw.replace(/\./g, "");
  else if (dot >= 0 && /^[-+]?\d{1,3}\.\d{3}$/.test(raw)) raw = raw.replace(".", "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}
function generatedCode(index, sourceHash = "") {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `IMP-${day}-${String(index + 1).padStart(4, "0")}${sourceHash ? "-" + sourceHash.slice(0, 3).toUpperCase() : ""}`;
}
function rowQuality(row) {
  let score = 0;
  if (row.code && !row.code.startsWith("IMP-")) score += 20;
  if (row.name) score += 35;
  if (row.price > 0) score += 25;
  if (row.description) score += 8;
  if (row.unit) score += 5;
  if (row.currency) score += 7;
  return Math.min(100, score);
}

function commercialNoiseOnly(value) {
  const raw = text(value)
    .replace(/[％﹪٪]/g, "%")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return true;
  if (
    /^(?:[-:|;,./\s]*)(?:(?:KDV|VAT|VERG[Iİ]|TAX|ISKONTO|İSKONTO|INDIRIM|İNDİRİM|DISCOUNT)\s*[:\-]?\s*)?(?:%\s*)?\d{1,3}(?:[.,]\d+)?\s*%?(?:[-:|;,./\s]*)$/i.test(
      raw
    )
  )
    return true;
  const residue = raw
    .replace(
      /\b(?:KDV|VAT|VERG[Iİ]|TAX|ISKONTO|İSKONTO|INDIRIM|İNDİRİM|DISCOUNT|BIRIM FIYAT|BİRİM FİYAT|UNIT PRICE|PRICE|FIYAT|FİYAT|TOPLAM|TOTAL|TUTAR|AMOUNT)\b/gi,
      " "
    )
    .replace(/\b(?:TRY|TL|EUR|USD|GBP)\b|[₺€$£]/gi, " ")
    .replace(/%\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*%/g, " ")
    .replace(/\d[\d.,]*/g, " ")
    .replace(/[-:|;,./%\s]+/g, "")
    .trim();
  return residue.length === 0;
}
function cleanImportedDescription(value, name = "", code = "") {
  const raw = text(value)
    .replace(/[％﹪٪]/g, "%")
    .replace(/[–—−]/g, "—");
  if (!raw) return "";
  const nameFold = fold(name),
    codeFold = fold(code);
  const chunks = raw
    .split(/(?:\r?\n|\t+|\s{2,}|\s*\|\s*)/)
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const kept = [];
  for (let chunk of chunks) {
    const original = chunk;
    if (commercialNoiseOnly(chunk)) continue;
    // Sütun kaymalarında açıklamanın sonuna taşınan fiyat/KDV kalıntılarını temizle.
    chunk = chunk
      .replace(
        /(?:\s+|^)(?:[-—:]\s*)?(?:(?:KDV|VAT|VERG[Iİ]|TAX)\s*[:\-]?\s*)?(?:%\s*)?\d{1,3}(?:[.,]\d+)?\s*%\s*$/i,
        ""
      )
      .replace(/(?:\s+|^)[0-9][0-9., ]*\s*(?:TRY|TL|EUR|USD|GBP|₺|€|\$|£)\s*$/i, "")
      .trim();
    if (!chunk || commercialNoiseOnly(chunk)) continue;
    const f = fold(chunk);
    if (nameFold && f === nameFold) continue;
    if (codeFold && (f === codeFold || f === `${codeFold} 20`)) continue;
    // "MS- — 20%" benzeri kod+KDV artıkları açıklama değildir.
    if (
      /%/.test(original) &&
      chunk.length < 12 &&
      (isCode(chunk.replace(/[—-]+$/, "")) || /^[A-ZÇĞİÖŞÜ]{1,8}[—-]?$/.test(chunk))
    )
      continue;
    kept.push(chunk);
  }
  const result = kept.join("\n").trim();
  return commercialNoiseOnly(result) ? "" : result;
}

function splitImportedNameDescription(rawName, rawDescription = "", rawCode = "") {
  const original = text(rawName);
  let description = cleanImportedDescription(rawDescription, original, rawCode);
  const lines = original
    .split(/\n+/)
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let name = lines.shift() || "";
  if (lines.length && !description) description = cleanImportedDescription(lines.join(" "), name, rawCode);
  const marker =
    /(?:^|\s)(TEKNİK ÖZELLİKLER|TEKNIK OZELLIKLER|ÖZELLİKLER|OZELLIKLER|SPECIFICATIONS?|TECHNICAL DETAILS?)\b/i;
  const match = name.match(marker);
  if (match && match.index > 8) {
    const tail = name.slice(match.index).trim();
    name = name.slice(0, match.index).trim();
    description = cleanImportedDescription([tail, description].filter(Boolean).join(" "), name, rawCode);
  }
  return { name, description };
}

function normalizeImportRow(raw, index, sourceHash) {
  const priceRaw = text(raw.price),
    parts = splitImportedNameDescription(raw.name, raw.description, raw.code),
    name = parts.name,
    description = cleanImportedDescription(parts.description, name, raw.code);
  const row = {
    selected: true,
    code: text(raw.code) || generatedCode(index, sourceHash),
    name,
    description,
    qty: Math.max(0.0001, parseNumber(raw.qty, 1)),
    unit: text(raw.unit).toLocaleUpperCase("tr-TR") || "ADET",
    price: Math.max(0, parseNumber(priceRaw, 0)),
    currency: normalizeCurrency(raw.currency, priceRaw),
    vat_rate: Math.max(0, parseNumber(raw.vat_rate, 20)),
    image_url: text(raw.image_url),
    warning: ""
  };
  if (!row.name) row.warning = "Ürün adı bulunamadı; bu satır kaydedilemez.";
  else if (row.price <= 0) row.warning = "Fiyat bulunamadı veya sıfır; kaydetmeden önce kontrol edin.";
  if (row.code.startsWith("IMP-"))
    row.warning = [row.warning, "Ürün kodu bulunamadığı için geçici kod üretildi."].filter(Boolean).join(" ");
  row.confidence = rowQuality(row);
  return row;
}
function isCode(value) {
  const v = text(value);
  if (v.length < 2 || v.length > 60 || /^\d+(?:[.,]\d+)?$/.test(v)) return false;
  return (
    /^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d|[-_.\/])[A-Za-z0-9ÇĞİÖŞÜçğıöşü._\/@-]+$/.test(v) ||
    /^[A-ZÇĞİÖŞÜ]{2,8}-?[A-Z0-9._\/-]{2,}$/i.test(v)
  );
}
function looksLikeProduct(row) {
  const name = text(row?.name).replace(/\s+/g, " ").trim(),
    code = text(row?.code),
    price = parseNumber(row?.price, 0),
    qty = parseNumber(row?.qty, 0),
    unit = text(row?.unit).toLocaleUpperCase("tr-TR");
  if (
    !name ||
    name.length < 2 ||
    name.length > 240 ||
    rejectLine.test(fold(name)) ||
    isAncillaryProductText(name)
  )
    return false;
  if (/^%?\s*\d+(?:[.,]\d+)?\s*%?$/.test(name)) return false;
  if (
    /^(?:adres|address|garanti|teslimat|odeme|not|banka|iban|vergi|toplam|tutar|kdv|matrah|kur)\b/i.test(
      fold(name)
    )
  )
    return false;
  const codeMirrorsName = /^[A-ZÇĞİÖŞÜ]{3,12}$/.test(code) && fold(name).startsWith(fold(code) + " ");
  // PDF sütun kaymalarında ürün adının ilk kelimesi yanlışlıkla ürün kodu olur
  // (örn. TAŞIYICI / TAŞIYICI PROFİLLER). Böyle bir satır güvenilir ürün değildir.
  if (codeMirrorsName) return false;
  const realCode = isCode(code),
    invoiceBound = Boolean(row?._invoiceBound),
    tableBound = Boolean(row?._tableBound || invoiceBound),
    explicit = Boolean(row?._explicitCommercial),
    currencyExplicit = Boolean(text(row?.currency));
  const unitValid = unitWords.has(unit),
    commercial = price > 0 && qty > 0 && unitValid;
  const safeNoCodeUnits = new Set([
    "ADET",
    "PCS",
    "PC",
    "SET",
    "TAKIM",
    "KG",
    "GR",
    "G",
    "LT",
    "L",
    "ML",
    "KUTU",
    "PAKET",
    "PAIR",
    "ÇİFT",
    "CIFT"
  ]);
  if (!realCode && !tableBound && !explicit) return false;
  if (!realCode && !commercial) return false;
  if (!realCode && !invoiceBound) {
    if (!safeNoCodeUnits.has(unit)) return false;
    if (!currencyExplicit && price < 10) return false;
    if (name.length > 140 && !currencyExplicit) return false;
  }
  if (realCode && price <= 0 && !tableBound) return false;
  return price > 0 || realCode;
}
function strictProductRows(rows) {
  return dedupeRows(
    (rows || [])
      .map((row) => {
        const name = text(row?.name).replace(/\s+/g, " ").trim();
        let description = cleanImportedDescription(row?.description, name, row?.code);
        if (isAncillaryProductText(description)) description = "";
        return { ...row, name, description };
      })
      .filter(looksLikeProduct)
  );
}
function cleanMatrix(matrix) {
  return (matrix || [])
    .slice(0, 10000)
    .map((row) => (Array.isArray(row) ? row : []).slice(0, 100).map((value) => text(value)));
}
function assignMappedCell(obj, field, value) {
  const val = text(value);
  if (!field || !val) return;
  if (!obj[field]) obj[field] = val;
  else if (field === "description" && obj[field] !== val) obj[field] = `${obj[field]} ${val}`.trim();
}
function mappedRows(matrix, headerIndex, headers) {
  const mappedFields = new Set(headers.filter(Boolean));
  return matrix
    .slice(headerIndex + 1)
    .map((cells) => {
      const obj = {
        _tableBound: true,
        _explicitCommercial: mappedFields.has("name") && mappedFields.has("price")
      };
      headers.forEach((field, index) => assignMappedCell(obj, field, cells[index]));
      return obj;
    })
    .filter((row) => Object.values(row).some((value) => text(value)))
    .filter(looksLikeProduct);
}
function numericCandidate(value, index) {
  const raw = text(value);
  if (!raw) return null;
  const hasCurrency = /\b(?:TRY|TL|EUR|USD|GBP)\b|[₺€$£]/i.test(raw);
  if (
    !hasCurrency &&
    !/^[-+]?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,4})?$/.test(raw) &&
    !/^[-+]?\d+(?:[.,]\d{1,4})?$/.test(raw)
  )
    return null;
  const number = parseNumber(raw, NaN);
  if (!Number.isFinite(number) || number < 0) return null;
  return { index, raw, number, hasCurrency };
}
function inferMatrixRows(matrix) {
  const rows = [];
  for (const cells0 of matrix) {
    const cells = cells0.map(text);
    const nonempty = cells.map((value, index) => ({ value, index })).filter((x) => x.value);
    if (nonempty.length < 2) continue;
    const joined = fold(nonempty.map((x) => x.value).join(" "));
    if (rejectLine.test(joined) || joined.length < 4) continue;
    const candidates = nonempty.map((x) => numericCandidate(x.value, x.index)).filter(Boolean);
    const priced = candidates.filter(
      (x) => x.hasCurrency || /[.,]\d{2,4}\s*(?:TRY|TL|EUR|USD|GBP|₺|€|\$|£)?$/i.test(x.raw)
    );
    const priceCell = (priced.length ? priced : candidates.filter((x) => x.number > 1)).at(-1);
    if (!priceCell) continue;
    const before = nonempty.filter((x) => x.index < priceCell.index);
    let code = "";
    const codeCell = before.find((x) => isCode(x.value));
    if (codeCell) code = codeCell.value;
    let unit = "ADET",
      qty = 1;
    const unitCell = before.find((x) => unitWords.has(text(x.value).toLocaleUpperCase("tr-TR")));
    if (unitCell) {
      unit = text(unitCell.value).toLocaleUpperCase("tr-TR");
      const q = candidates
        .filter((x) => x.index < unitCell.index && x.number > 0 && x.number < 100000)
        .at(-1);
      if (q) qty = q.number;
    }
    const textCells = before.filter(
      (x) =>
        x.value !== code &&
        x.index !== unitCell?.index &&
        !numericCandidate(x.value, x.index) &&
        !currencyWords.has(x.value.toLocaleUpperCase("tr-TR"))
    );
    if (!textCells.length) continue;
    textCells.sort((a, b) => b.value.length - a.value.length);
    const name = textCells[0].value;
    const description = textCells
      .slice(1)
      .sort((a, b) => a.index - b.index)
      .map((x) => x.value)
      .join(" ");
    const currencyCell = nonempty.find(
      (x) =>
        currencyWords.has(text(x.value).toLocaleUpperCase("tr-TR")) &&
        Math.abs(x.index - priceCell.index) <= 2
    );
    const row = {
      code,
      name,
      description,
      qty,
      unit,
      price: priceCell.raw,
      currency: normalizeCurrency(currencyCell?.value || "", priceCell.raw),
      _explicitCommercial: Boolean(unitCell && (priceCell.hasCurrency || currencyCell))
    };
    if (looksLikeProduct(row)) rows.push(row);
  }
  return rows;
}
function dedupeRows(rows) {
  const seen = new Set(),
    out = [];
  for (const row of rows) {
    const key = `${fold(row.code)}|${fold(row.name)}|${parseNumber(row.price, 0).toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function dedupeProductRows(rows) {
  const out = [],
    byKey = new Map();
  for (const row of rows) {
    const code = text(row?.code);
    const key = isCode(code)
      ? `code:${fold(code)}`
      : `name:${fold(row?.name)}|${parseNumber(row?.price, 0).toFixed(4)}`;
    if (!key || key === "name:|0.0000") continue;
    if (!byKey.has(key)) {
      const copy = { ...row };
      byKey.set(key, copy);
      out.push(copy);
      continue;
    }
    const current = byKey.get(key);
    if (!current.name && row.name) current.name = row.name;
    if (!current.description && row.description) current.description = row.description;
    if (parseNumber(current.price, 0) <= 0 && parseNumber(row.price, 0) > 0) {
      current.price = row.price;
      current.currency = row.currency;
    }
    if ((!current.qty || Number(current.qty) === 1) && Number(row.qty) > 1) current.qty = row.qty;
    if (!current.unit && row.unit) current.unit = row.unit;
  }
  return out;
}
async function xlsxApi() {
  const module = await import("xlsx");
  const api = module?.default || module;
  if (!api?.read || !api?.utils?.sheet_to_json)
    throw new Error("XLSX modülü yüklenemedi. Sunucuda npm ci çalıştırılmalıdır.");
  return api;
}
async function parseWorkbook(filePath) {
  const XLSX = await xlsxApi();
  const buffer = fs.readFileSync(filePath);
  let wb;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: false, raw: false, dense: true, codepage: 65001 });
  } catch (error) {
    const e = new Error(
      `Excel dosyası açılamadı. Dosya bozuk, parola korumalı veya desteklenmeyen biçimde olabilir: ${text(error?.message).slice(0, 180)}`
    );
    e.status = 422;
    e.expose = true;
    e.code = "WORKBOOK_READ_FAILED";
    throw e;
  }
  let best = { score: -1, rows: [], sheet: "", headers: [], rawHeaders: [] };
  let fallback = [];
  for (const sheetName of wb.SheetNames || []) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = cleanMatrix(
      XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: false })
    );
    fallback.push(...inferMatrixRows(matrix));
    for (let i = 0; i < Math.min(50, matrix.length); i++) {
      const headers = (matrix[i] || []).map(fieldForHeader),
        unique = new Set(headers.filter(Boolean));
      const score =
        unique.size * 12 +
        (unique.has("name") ? 28 : 0) +
        (unique.has("price") ? 24 : 0) +
        (unique.has("code") ? 12 : 0) +
        (unique.has("qty") ? 5 : 0) +
        (unique.has("unit") ? 5 : 0);
      const rows = mappedRows(matrix, i, headers);
      const qualified = rows.filter(looksLikeProduct);
      const total = score + Math.min(60, qualified.length * 3);
      if (total > best.score)
        best = { score: total, rows: qualified, sheet: sheetName, headers, rawHeaders: matrix[i] || [] };
    }
  }
  let rows = best.score >= 70 ? dedupeRows(best.rows || []) : [],
    warnings = [];
  if (!rows.length) {
    rows = dedupeRows(fallback.filter(looksLikeProduct));
    if (rows.length)
      warnings.push(
        "Excel sütun başlıkları standart değildi; ürün satırları içerik yapısına göre çıkarıldı. Kaydetmeden önce tüm alanları kontrol edin."
      );
  }
  if (!rows.length)
    return {
      rows: [],
      warnings: [
        "Excel dosyasında doğrulanabilir ürün satırı bulunamadı. Dosya kaydedilmeden işlem durduruldu."
      ],
      meta: { sheet: best.sheet || wb.SheetNames?.[0] || "", headers: best.rawHeaders || [] }
    };
  return {
    rows,
    warnings,
    meta: {
      sheet: best.sheet || wb.SheetNames?.[0] || "",
      headers: best.rawHeaders || [],
      matchedRows: rows.length
    }
  };
}

async function parsePdfWithJavascript(filePath) {
  try {
    // Paket kökü ESM içe aktarımında örnek/debug dosyasını çalıştırabildiği için
    // doğrudan üretim parser'ı yüklenir.
    const loaded = require("pdf-parse/lib/pdf-parse.js");
    const parse = loaded?.default || loaded;
    if (typeof parse !== "function") return { text: "", warning: "PDF JavaScript okuyucusu yüklenemedi." };
    const result = await parse(fs.readFileSync(filePath), { max: 120 });
    const value = String(result?.text || "").replace(/\u0000/g, "");
    return {
      text: value,
      warning: value.trim() ? "PDF metni dahili JavaScript okuyucusuyla çıkarıldı." : ""
    };
  } catch (error) {
    return {
      text: "",
      warning: `PDF JavaScript okuyucusu dosyayı açamadı: ${text(error?.message).slice(0, 160)}`
    };
  }
}
function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" }).status === 0;
}
function ocrPdf(filePath, onProgress = () => {}) {
  if (!commandExists("pdftoppm") || !commandExists("tesseract"))
    return { text: "", warning: "Taranmış PDF algılandı ancak sunucuda OCR araçları bulunamadı." };
  const tmp = fs.mkdtempSync(path.join(importsDir, "ocr-")),
    prefix = path.join(tmp, "page");
  try {
    onProgress({ stage: "ocr", progress: 56, message: "Taranmış PDF sayfaları OCR için hazırlanıyor." });
    const render = spawnSync("pdftoppm", ["-png", "-r", "180", "-f", "1", "-l", "24", filePath, prefix], {
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 32 * 1024 * 1024
    });
    if (render.status !== 0) return { text: "", warning: "PDF sayfaları OCR için hazırlanamadı." };
    const images = fs
      .readdirSync(tmp)
      .filter((name) => name.endsWith(".png"))
      .sort();
    let output = "";
    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      const image = images[imageIndex];
      onProgress({
        stage: "ocr",
        progress: Math.min(78, 58 + Math.round((imageIndex / Math.max(1, images.length)) * 20)),
        message: `OCR sayfası ${imageIndex + 1}/${images.length} okunuyor.`
      });
      let run = spawnSync(
        "tesseract",
        [path.join(tmp, image), "stdout", "-l", "tur+eng", "--psm", "6", "preserve_interword_spaces=1"],
        { encoding: "utf8", timeout: 45000, maxBuffer: 32 * 1024 * 1024 }
      );
      if (run.status !== 0)
        run = spawnSync("tesseract", [path.join(tmp, image), "stdout", "-l", "eng", "--psm", "6"], {
          encoding: "utf8",
          timeout: 45000,
          maxBuffer: 32 * 1024 * 1024
        });
      if (run.status === 0) output += `\n${run.stdout || ""}`;
    }
    return {
      text: output,
      warning: output.trim()
        ? "Taranmış PDF için OCR uygulandı; tüm satırları kontrol edin."
        : "OCR çalıştı ancak okunabilir ürün satırı bulunamadı."
    };
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {}
  }
}

function parseOcrMoney(value) {
  const raw = text(value)
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "");
  if (!raw) return 0;
  if (!/[.,]/.test(raw) && /^\d{4,}$/.test(raw) && raw.endsWith("00")) return Number(raw) / 100;
  return parseNumber(raw, 0);
}
function parseOcrQuantity(value) {
  const raw = text(value)
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "");
  if (!raw) return 1;
  if (!/[.,]/.test(raw) && /^\d{3,}$/.test(raw) && raw.endsWith("00"))
    return Math.max(0.0001, Number(raw) / 100);
  return Math.max(0.0001, parseNumber(raw, 1));
}
function parseOcrOfferRows(rawText) {
  const lines = String(rawText || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((v) => v.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const productHint =
    /\b(?:tezgah|masa|dolap|duşu|dusu|terazi|raf|nakliye|cihaz|kabin|pompa|motor|etuv|firin|sandalye|huni|banyo|santrifuj|mikroskop|inkubator|otoklav|desikator|fan|filtre|vibrator|numune|ocak)\b/i;
  const tail =
    /(.*?)\s+(\d+(?:[.,]\d+)?)\s+(ADET|PCS|PC|SET|TAKIM|KG|GR|G|LT|L|ML|M|METRE|CM|MM|KUTU|PAKET|PAIR|ÇİFT|CIFT)\s+([0-9][0-9.,]*)\s*(TRY|TL|EUR|USD|GBP|₺|€|\$|£)\s+(?:%?\s*20|9?6?20|%?\s*\d{1,2})\s+([0-9][0-9.,]*)/i;
  const genericStart = new Set([
    "KENAR",
    "ORTA",
    "YAN",
    "ACIL",
    "HASSAS",
    "KIMYASAL",
    "ASIT",
    "BAZ",
    "KURUM",
    "CELIK",
    "LABORATUVAR",
    "MASA",
    "DOLAP",
    "TEZGAH",
    "GOZ",
    "DUSU"
  ]);
  let pendingTitle = "",
    last = null;
  for (const original of lines) {
    const line = original.replace(/^[_()|\\/\-\s]+/, "").trim();
    const f = fold(line);
    if (!line || /^(urun|gorseli|kodu|urun adi|miktar|birim|birim fiyat|vergi|toplam)\b/.test(f)) continue;
    const m = line.match(tail);
    if (m) {
      let prefix = text(m[1])
        .replace(/^\d+[.)-]?\s+/, "")
        .replace(/^[=|IlWw_\s]+(?=[A-ZÇĞİÖŞÜ0-9])/, "")
        .trim();
      let code = "";
      const tokens = prefix.split(/\s+/).filter(Boolean);
      for (let i = 0; i < Math.min(3, tokens.length); i++) {
        const candidate = tokens[i].replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü._\/@-]/g, "");
        const rest = tokens.slice(i + 1).join(" ");
        const upper = fold(candidate).toUpperCase();
        const shaped =
          /[0-9._\/@-]/.test(candidate) ||
          (/^[A-ZÇĞİÖŞÜ]{3,12}$/.test(candidate.toLocaleUpperCase("tr-TR")) && !genericStart.has(upper));
        if (shaped && productHint.test(rest)) {
          code = candidate;
          prefix = rest;
          break;
        }
      }
      let name = prefix
          .replace(/\s+[|Il]$/, "")
          .replace(/\s+\d$/, "")
          .trim(),
        description = "";
      if (
        pendingTitle &&
        (!productHint.test(prefix) ||
          /^(?:16|1mm|çelik|celik|c frame|elektrostatik|kapak|dolap|polipropilen|fan sistemi|monofaze)\b/i.test(
            prefix
          ))
      ) {
        name = pendingTitle;
        description = prefix;
      }
      if (!name && pendingTitle) name = pendingTitle;
      name = name.replace(/\s+[0-9]$/, "").trim();
      const row = {
        code,
        name,
        description,
        qty: parseOcrQuantity(m[2]),
        unit: text(m[3]).toLocaleUpperCase("tr-TR"),
        price: parseOcrMoney(m[4]),
        currency: normalizeCurrency(m[5], m[4]),
        vat_rate: 20,
        _tableBound: true,
        _explicitCommercial: true,
        _ocrBound: true
      };
      if (looksLikeProduct(row) || (/nakliye/i.test(name) && row.price > 0 && row.qty > 0)) {
        rows.push(row);
        last = row;
      }
      pendingTitle = "";
      continue;
    }
    if (isAncillaryProductText(line)) continue;
    const upperLetters = (line.match(/[A-ZÇĞİÖŞÜ]/g) || []).length,
      letters = (line.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) || []).length;
    const titleLike =
      line.length >= 4 &&
      line.length <= 150 &&
      letters > 2 &&
      upperLetters / Math.max(1, letters) > 0.58 &&
      productHint.test(line) &&
      !isAncillaryProductText(line);
    if (titleLike) {
      pendingTitle = line;
      last = null;
      continue;
    }
    if (last && line.length < 260 && !isAncillaryProductText(line) && !tail.test(line)) {
      const extra = cleanImportedDescription(line, last.name, last.code);
      if (extra)
        last.description = cleanImportedDescription(
          [last.description, extra].filter(Boolean).join("\n"),
          last.name,
          last.code
        );
    }
  }
  return dedupeRows(rows);
}

function priceCandidates(line) {
  const regex =
    /(?:^|\s)(₺|TL|TRY|EUR|USD|GBP|€|\$|£)?\s*([0-9]{1,3}(?:[.\s][0-9]{3})*(?:,[0-9]{1,4})|[0-9]+(?:[.,][0-9]{1,4})?)\s*(TL|TRY|EUR|USD|GBP|€|\$|£)?(?=\s|$)/gi;
  const out = [];
  let m;
  while ((m = regex.exec(line)))
    out.push({
      index: m.index,
      end: regex.lastIndex,
      raw: m[0].trim(),
      currency: m[1] || m[3] || "",
      number: m[2]
    });
  return out;
}
function parsePdfLines(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  let pending = "";
  for (const line0 of lines) {
    const line = line0.replace(/^\s*\d+[.)-]\s+/, "");
    const folded = fold(line);
    if (rejectLine.test(folded)) {
      pending = "";
      continue;
    }
    const prices = priceCandidates(line);
    const candidate = [...prices].reverse().find((item) => item.currency || /[.,]\d{2,4}$/.test(item.number));
    if (!candidate) {
      if (line.length > 8) pending = pending ? `${pending} ${line}` : line;
      continue;
    }
    let prefix = line.slice(0, candidate.index).trim();
    if (pending && prefix.length < 45) prefix = `${pending} ${prefix}`.trim();
    pending = "";
    let parts = prefix
      .split(/\s{2,}|\t|\s+\|\s+/)
      .map(text)
      .filter(Boolean);
    if (parts.length < 2) parts = prefix.split(" ").filter(Boolean);
    let code = "";
    if (parts[0] && isCode(parts[0])) code = parts.shift();
    let qty = 1,
      unit = "ADET";
    const unitMatch = prefix.match(
      /(?:^|\s)([0-9]+(?:[.,][0-9]+)?)\s*(ADET|PCS|PC|SET|TAKIM|KG|GR|G|LT|L|ML|M|METRE|KUTU|PAKET)\s*$/i
    );
    if (unitMatch) {
      qty = parseNumber(unitMatch[1], 1);
      unit = unitMatch[2].toLocaleUpperCase("tr-TR");
      prefix = prefix.slice(0, unitMatch.index).trim();
    }
    if (code) prefix = prefix.replace(new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`), "");
    const name = prefix.trim();
    const row = {
      code,
      name,
      description: "",
      qty,
      unit,
      price: candidate.number,
      currency: candidate.currency,
      _explicitCommercial: Boolean(unitMatch && candidate.currency)
    };
    if (looksLikeProduct(row)) rows.push(row);
  }
  return dedupeRows(rows);
}
function pdfMatrix(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\u00a0/g, " ")
        .replace(/[ ]{1,}/g, (m) => (m.length > 1 ? "  " : " "))
        .trimEnd()
    )
    .filter((line) => line.trim());
  return cleanMatrix(
    lines.map((line) => {
      let cells = line
        .trim()
        .split(/\t+|\s{2,}|\s+\|\s+/)
        .map(text)
        .filter(Boolean);
      if (cells.length < 2) {
        const tokens = line.trim().split(/\s+/).filter(Boolean);
        const curr = tokens.findIndex(
          (x) => currencyWords.has(text(x).toLocaleUpperCase("tr-TR")) || /[₺€$£]/.test(x)
        );
        if (curr > 0) cells = [tokens.slice(0, curr).join(" "), tokens.slice(curr).join(" ")];
      }
      return cells;
    })
  );
}
function parsePdfTable(rawText) {
  const matrix = pdfMatrix(rawText);
  let best = { score: -1, rows: [] };
  for (let i = 0; i < Math.min(80, matrix.length); i++) {
    const headers = (matrix[i] || []).map(fieldForHeader),
      unique = new Set(headers.filter(Boolean));
    const score =
      unique.size * 12 +
      (unique.has("name") ? 28 : 0) +
      (unique.has("price") ? 24 : 0) +
      (unique.has("code") ? 10 : 0) +
      (unique.has("qty") ? 5 : 0) +
      (unique.has("unit") ? 5 : 0);
    if (score < 24) continue;
    const rows = mappedRows(matrix, i, headers);
    const total = score + Math.min(80, rows.length * 4);
    if (total > best.score) best = { score: total, rows };
  }
  const mapped = strictProductRows(best.rows || []);
  return mapped.length ? mapped : strictProductRows(inferMatrixRows(matrix));
}
function parsePdfContinuous(rawText) {
  const compact = String(rawText || "")
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/\r/g, "\n");
  const chunks = compact
    .split(/(?=(?:\b[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9._\/-]{2,}\b))/)
    .map(text)
    .filter((x) => x.length > 8 && x.length < 1400);
  const rows = [];
  for (const chunk0 of chunks) {
    const chunk = chunk0.replace(/\n+/g, " ");
    if (rejectLine.test(fold(chunk))) continue;
    const prices = priceCandidates(chunk);
    const price = [...prices]
      .reverse()
      .find((x) => x.currency || /[.,]\d{2,4}$/.test(x.number) || x.number > 0);
    if (!price) continue;
    const before = chunk.slice(0, price.index).trim();
    if (before.length < 3) continue;
    const codeMatch = before.match(/^([A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9._\/@-]{1,59})\s+/i);
    const code = codeMatch && isCode(codeMatch[1]) ? codeMatch[1] : "";
    let rest = code ? before.slice(codeMatch[0].length).trim() : before;
    const qtyUnit = rest.match(
      /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(ADET|PCS|PC|SET|TAKIM|KG|GR|G|LT|L|ML|M|METRE|CM|MM|KUTU|PAKET|PAIR|ÇİFT|CIFT)\s*$/i
    );
    const qty = qtyUnit ? parseNumber(qtyUnit[1], 1) : 1,
      unit = qtyUnit ? qtyUnit[2].toLocaleUpperCase("tr-TR") : "ADET";
    if (qtyUnit) rest = rest.slice(0, qtyUnit.index).trim();
    const pieces = rest
      .split(/\s{2,}|\s+-\s+|\s+\|\s+/)
      .map(text)
      .filter(Boolean);
    const name = (pieces.shift() || rest).trim();
    const description = pieces.join(" ");
    const row = {
      code,
      name,
      description,
      qty,
      unit,
      price: price.number,
      currency: price.currency,
      _explicitCommercial: Boolean(qtyUnit && price.currency)
    };
    if (looksLikeProduct(row)) rows.push(row);
  }
  return dedupeRows(rows);
}

function commerceContextScore(rawText) {
  const f = fold(rawText);
  let score = 0;
  if (
    /\b(proforma|fiyat teklifi|price quotation|quotation|commercial invoice|teklif no|offer no|quote no)\b/.test(
      f
    )
  )
    score += 4;
  if (/\b(urun|malzeme|product|item|hizmet|description|aciklama)\b/.test(f)) score += 1;
  if (/\b(birim fiyat|fiyat|unit price|price|tutar|amount|total)\b/.test(f)) score += 1;
  if (/\b(miktar|adet|qty|quantity|unit|birim)\b/.test(f)) score += 1;
  if (/\b(kdv|vat|currency|para birimi|eur|usd|try|tl)\b/.test(f)) score += 1;
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .slice(0, 600);
  for (const line of lines) {
    const fields = new Set(
      fixedColumns(line)
        .map((x) => fieldForHeader(x.value))
        .filter(Boolean)
    );
    if (
      (fields.has("name") || fields.has("description")) &&
      fields.has("price") &&
      (fields.has("qty") || fields.has("unit") || fields.has("code"))
    ) {
      score = Math.max(score, 5);
      break;
    }
  }
  return score;
}
function fixedColumns(line) {
  const spans = [];
  const re = /\S(?:.*?\S)?(?=\s{2,}|\t+|$)/g;
  let m;
  while ((m = re.exec(String(line || "")))) spans.push({ value: text(m[0]), start: m.index });
  return spans;
}
function parsePdfColumnBlocks(rawText) {
  const lines = String(rawText || "")
    .replace(/\r/g, "")
    .split("\n");
  const rows = [];
  for (let h = 0; h < Math.min(lines.length, 500); h++) {
    const spans = fixedColumns(lines[h]);
    if (spans.length < 2) continue;
    const mapped = spans.map((x) => ({ ...x, field: fieldForHeader(x.value) }));
    const fields = new Set(mapped.map((x) => x.field).filter(Boolean));
    const hasName = fields.has("name") || fields.has("description");
    if (!hasName || !fields.has("price") || fields.size < 2) continue;
    const columns = mapped.map((x, i) => ({ ...x, end: mapped[i + 1]?.start ?? Infinity }));
    let pending = null,
      lastRow = null;
    for (let i = h + 1; i < Math.min(lines.length, h + 500); i++) {
      const line = lines[i];
      const trimmed = text(line);
      if (!trimmed) continue;
      const f = fold(trimmed);
      if (/^(ara toplam|subtotal|kdv|vat|genel toplam|grand total|toplam|total)\b/.test(f)) break;
      // Yeni bir başlık başladığında aynı tabloyu iki kez okumayı bırak.
      const headerFields = new Set(
        fixedColumns(line)
          .map((x) => fieldForHeader(x.value))
          .filter(Boolean)
      );
      if ((headerFields.has("name") || headerFields.has("description")) && headerFields.has("price")) break;
      const obj = { _tableBound: true, _explicitCommercial: fields.has("name") && fields.has("price") };
      for (const col of columns) {
        if (!col.field) continue;
        const value = text(line.slice(col.start, Number.isFinite(col.end) ? col.end : undefined));
        assignMappedCell(obj, col.field, value);
      }
      const hasPrice = parseNumber(obj.price, 0) > 0;
      const hasText = text(obj.name || obj.description);
      if (!hasPrice && hasText) {
        const continuation = text([obj.name, obj.description].filter(Boolean).join(" "));
        if (lastRow && continuation && !isAncillaryProductText(continuation)) {
          lastRow.description = cleanImportedDescription(
            [lastRow.description, continuation].filter(Boolean).join(" "),
            lastRow.name,
            lastRow.code
          );
        } else if (!pending) pending = obj;
        else {
          pending.name = text([pending.name, obj.name].filter(Boolean).join(" "));
          pending.description = text([pending.description, obj.description].filter(Boolean).join(" "));
        }
        continue;
      }
      if (hasPrice) {
        if (pending) {
          obj.name = text([pending.name, obj.name].filter(Boolean).join(" "));
          obj.description = text([pending.description, obj.description].filter(Boolean).join(" "));
          obj.code = obj.code || pending.code;
          pending = null;
        }
        if (looksLikeProduct(obj)) {
          rows.push(obj);
          lastRow = obj;
        }
      }
    }
  }
  return dedupeRows(rows);
}
function parseCommonOfferLines(rawText) {
  const lines = String(rawText || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((x) =>
      x
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter(Boolean);
  const rows = [];
  let continuation = "";
  const unitRe = /\b(ADET|PCS|PC|SET|TAKIM|KG|GR|G|LT|L|ML|M|METRE|CM|MM|KUTU|PAKET|PAIR|ÇİFT|CIFT)\b/i;
  for (const original of lines) {
    const f = fold(original);
    if (rejectLine.test(f)) {
      continuation = "";
      continue;
    }
    const unitMatch = unitRe.exec(original);
    const prices = priceCandidates(original);
    if (!unitMatch || !prices.length) {
      if (original.length > 7 && !/^(sayfa|page)\s*\d+/i.test(original))
        continuation = continuation ? `${continuation} ${original}` : original;
      continue;
    }
    const afterUnit = prices.filter((x) => x.index > unitMatch.index);
    if (!afterUnit.length) continue;
    const chosen = afterUnit[0];
    const beforeUnit = original.slice(0, unitMatch.index).trim();
    const qtyMatch = beforeUnit.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*$/);
    const qty = qtyMatch ? parseNumber(qtyMatch[1], 1) : 1;
    let prefix = qtyMatch ? beforeUnit.slice(0, qtyMatch.index).trim() : beforeUnit;
    if (continuation && prefix.length < 12) prefix = `${continuation} ${prefix}`.trim();
    continuation = "";
    prefix = prefix.replace(/^\d+[.)-]?\s+/, "").trim();
    const parts = prefix
      .split(/\s{2,}|\s+\|\s+/)
      .map(text)
      .filter(Boolean);
    let code = "";
    if (parts[0] && isCode(parts[0])) code = parts.shift();
    else {
      const first = prefix.split(/\s+/)[0];
      if (isCode(first)) {
        code = first;
        prefix = prefix.slice(first.length).trim();
      }
    }
    const name = (parts.join(" ") || prefix).trim();
    const row = {
      code,
      name,
      description: "",
      qty,
      unit: unitMatch[1].toLocaleUpperCase("tr-TR"),
      price: chosen.number,
      currency: chosen.currency,
      _explicitCommercial: Boolean(chosen.currency)
    };
    if (looksLikeProduct(row)) rows.push(row);
  }
  return dedupeRows(rows);
}

function parseEInvoiceProductTable(rawText) {
  const lines = String(rawText || "")
    .replace(/\r/g, "")
    .split("\n");
  const rows = [];
  let inTable = false;
  const rowRe =
    /^\s*(\d{1,4})\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(ADET|PCS|PC|SET|TAKIM|KG|GR|G|LT|L|ML|M|METRE|CM|MM|KUTU|PAKET|PAIR|ÇİFT|CIFT)\s+([0-9][0-9.,]*)\s*(TRY|TL|EUR|USD|GBP|₺|€|\$|£)\s+%?\s*([0-9][0-9.,]*)\s+([0-9][0-9.,]*)\s*(?:TRY|TL|EUR|USD|GBP|₺|€|\$|£)\s+([0-9][0-9.,]*)\s*(?:TRY|TL|EUR|USD|GBP|₺|€|\$|£)\s*$/i;
  for (const line of lines) {
    const f = fold(line);
    if (!inTable) {
      if (/mal hizmet/.test(f) && /miktar/.test(f) && /birim fiyat/.test(f) && /(kdv|vat)/.test(f)) {
        inTable = true;
      }
      continue;
    }
    if (
      /^(ettn|yalniz|mal hizmet toplam|ara toplam|kdv|hesaplanan|vergiler dahil|odenecek|banka hesabi|not)\b/.test(
        f
      )
    )
      break;
    const m = line.match(rowRe);
    if (!m) continue;
    const [, lineNo, name, qty, unit, unitPrice, currency, vatRate] = m;
    if (!name || rejectLine.test(fold(name))) continue;
    rows.push({
      code: "",
      name: text(name).replace(/\s+/g, " "),
      description: "",
      qty: parseNumber(qty, 1),
      unit: text(unit).toLocaleUpperCase("tr-TR"),
      price: parseNumber(unitPrice, 0),
      currency: normalizeCurrency(currency, unitPrice),
      vat_rate: parseNumber(vatRate, 20),
      source_line: Number(lineNo),
      _invoiceBound: true,
      _tableBound: true,
      _explicitCommercial: true
    });
  }
  return dedupeRows(rows);
}

function joinOfferCode(parts) {
  const clean = (parts || [])
    .map(text)
    .filter(Boolean)
    .filter((value) => !/(broşürü|brosuru|menşei|mensei)/i.test(value));
  if (!clean.length) return "";
  if (/^[A-ZÇĞİÖŞÜ]{1,3}$/i.test(clean[0]) && clean.length > 1) return clean.join(" ");
  return clean.join("");
}
function isOfferTechnicalLine(value) {
  const f = fold(value);
  if (!f || /^[-—]$/.test(f)) return true;
  if (/[:：]/.test(value)) return true;
  return /^(teknik|ozellik|model|hiz |motor|sicaklik|karistirma|maksimum|minimum|kapasite|hassasiyet|dogruluk|cozunurluk|olcum|fanli sistem|tum dolap|raf |kapak|yuzey|uyari|uya |aydinlatma|numune|odaklama|kondansor|aeev|dus |calisma|guc |gerilim|boyut|agirlik|koruma|veri |baglanti|ekran|kalibrasyon|tekrarlanabilirlik|dogrusallik|cevap |pan |arayuz|dara |brut |net |usb |programlanabilir|otomatik dijital|kirılma|kirilma|brix|ri )\b/.test(
    f
  );
}
function parsePaginatedOfferTable(rawText) {
  const source = String(rawText || "").replace(/\r/g, "");
  if (!/Ürün Kodu/i.test(source) || !/Ürün Adı ve Açıklama/i.test(source) || !/Birim Fiyat/i.test(source))
    return [];
  const currency = normalizeCurrency(source.match(/Para birimi\s+(TRY|TL|EUR|USD|GBP)/i)?.[1] || "", "");
  const lines = source.split("\n");
  const rowRe =
    /^(.*?)\s{2,}(\d+(?:[.,]\d+)?)\s{2,}(ADET|PCS|PC|SET|TAKIM|KG|GR|G|LT|L|ML|M|METRE|KUTU|PAKET)\s{2,}([\d.,]+)(?:\s+(TRY|TL|EUR|USD|GBP))?\s{2,}(?:—|-|[\d.,]+%?)\s{2,}(\d+(?:[.,]\d+)?)%?\s{2,}([\d.,]+)(?:\s+(TRY|TL|EUR|USD|GBP))?\s*$/i;
  const starters = [];
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(rowRe);
    if (match) starters.push({ index, match });
  }
  const rows = [];
  for (let n = 0; n < starters.length; n++) {
    const { index, match } = starters[n];
    const prefix = match[1],
      prefixParts = prefix
        .trim()
        .split(/\s{2,}/)
        .map(text)
        .filter(Boolean);
    if (prefixParts.length < 2) continue;
    const initialCode = prefixParts.shift();
    const initialName = prefixParts.join(" ");
    const codeParts = [initialCode],
      nameParts = [initialName],
      descriptionParts = [];
    let descriptionStarted = false;
    const end = starters[n + 1]?.index ?? Math.min(lines.length, index + 220);
    for (let lineIndex = index + 1; lineIndex < end; lineIndex++) {
      const line = lines[lineIndex];
      if (/\f|Toplam|Genel Toplam|KDV %|Ödenecek Tutar/i.test(line)) break;
      if (/Ürün Kodu|Seri No:|Sayfa \d+\s*\//i.test(line)) continue;
      const leftArea = line.slice(0, Math.min(97, line.length)).replace(/\s+$/, "");
      if (!leftArea.trim() || /^\s*(Menşei|Mensei)[:\s]/i.test(leftArea)) continue;
      const leading = leftArea.search(/\S/);
      const pieces = leftArea
        .trim()
        .split(/\s{2,}/)
        .map(text)
        .filter(Boolean);
      let content = "";
      if (pieces.length > 1) {
        if (leading < 24) {
          const possibleCode = pieces.shift();
          if (
            !/(broşürü|brosuru|menşei|mensei)/i.test(possibleCode) &&
            /^[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9._\/-]{0,23}$/i.test(possibleCode)
          )
            codeParts.push(possibleCode);
          content = pieces.join(" ");
        } else content = pieces.join(" ");
      } else if (leading >= 24) {
        content = pieces[0] || "";
      } else {
        continue;
      }
      if (!content || /^(EUR|USD|TRY|TL)$/i.test(content)) continue;
      if (!descriptionStarted && (isOfferTechnicalLine(content) || nameParts.length >= 3))
        descriptionStarted = true;
      if (descriptionStarted) {
        if (!/^[-—]$/.test(content)) descriptionParts.push(content);
      } else nameParts.push(content);
    }
    const row = {
      code: joinOfferCode(codeParts),
      name: nameParts.join(" ").replace(/\s+/g, " ").trim(),
      description: descriptionParts.join("\n").trim(),
      qty: parseNumber(match[2], 1),
      unit: text(match[3]).toLocaleUpperCase("tr-TR"),
      price: parseNumber(match[4], 0),
      currency: normalizeCurrency(match[5] || match[8] || currency, match[4]),
      vat_rate: parseNumber(match[6], 20),
      _tableBound: true,
      _explicitCommercial: true
    };
    if (looksLikeProduct(row)) rows.push(row);
  }
  return dedupeRows(rows);
}

function parsePdfSource(rawText) {
  if (!String(rawText || "").trim())
    return {
      rows: [],
      paginatedRows: 0,
      tableRows: 0,
      lineRows: 0,
      continuousRows: 0,
      columnRows: 0,
      commonRows: 0,
      invoiceRows: 0,
      context: 0,
      strategy: "none"
    };
  const context = commerceContextScore(rawText);
  if (context < 4)
    return {
      rows: [],
      paginatedRows: 0,
      tableRows: 0,
      lineRows: 0,
      continuousRows: 0,
      columnRows: 0,
      commonRows: 0,
      invoiceRows: 0,
      context,
      strategy: "context-rejected"
    };
  const invoice = strictProductRows(parseEInvoiceProductTable(rawText));
  // Resmî e-fatura/e-arşiv ürün tablosu bulunduğunda yalnızca ana ürün satırları kullanılır.
  if (invoice.length)
    return {
      rows: invoice,
      paginatedRows: 0,
      columnRows: 0,
      tableRows: 0,
      commonRows: 0,
      lineRows: 0,
      continuousRows: 0,
      invoiceRows: invoice.length,
      context,
      strategy: "einvoice"
    };
  const paginated = strictProductRows(parsePaginatedOfferTable(rawText));
  const column = strictProductRows(parsePdfColumnBlocks(rawText));
  const table = strictProductRows(parsePdfTable(rawText));
  const common = strictProductRows(parseCommonOfferLines(rawText));
  const line = strictProductRows(parsePdfLines(rawText));
  const continuous = strictProductRows(parsePdfContinuous(rawText));
  // Aynı PDF'yi beş farklı okuyucunun sonuçlarıyla birleştirmek, garanti/not/toplam satırlarını
  // ürün gibi çoğaltıyordu. En güçlü tek tablo stratejisi seçilir; sonuçlar karıştırılmaz.
  const strategyRank = { paginated: 900, column: 500, table: 480, common: 300, line: 220, continuous: 160 };
  const candidates = [
    ["paginated", paginated],
    ["column", column],
    ["table", table],
    ["common", common],
    ["line", line],
    ["continuous", continuous]
  ]
    .map(([key, items]) => {
      const realCodes = items.filter((item) => isCode(item.code)).length,
        noCodes = items.length - realCodes;
      const avg = items.length
        ? items.reduce(
            (sum, item) =>
              sum +
              rowQuality({
                code: item.code,
                name: item.name,
                price: parseNumber(item.price, 0),
                description: item.description,
                unit: item.unit,
                currency: item.currency
              }),
            0
          ) / items.length
        : 0;
      return {
        key,
        items,
        score: items.length
          ? (strategyRank[key] || 0) + items.length * 18 + realCodes * 20 - noCodes * 10 + avg
          : -10000
      };
    })
    .sort((a, b) => b.score - a.score);
  const best = candidates[0] || { key: "none", items: [] };
  return {
    rows: dedupeProductRows(best.items),
    paginatedRows: paginated.length,
    columnRows: column.length,
    tableRows: table.length,
    commonRows: common.length,
    lineRows: line.length,
    continuousRows: continuous.length,
    invoiceRows: 0,
    context,
    strategy: best.key
  };
}
function analysisScore(analysis) {
  const strategyWeight = {
    einvoice: 1400,
    paginated: 1250,
    "ocr-table": 1050,
    column: 900,
    table: 850,
    common: 600,
    line: 420,
    continuous: 300,
    none: 0,
    "context-rejected": -1000
  };
  const rows = analysis?.rows || [],
    realCodes = rows.filter((row) => isCode(row.code)).length,
    generatedCandidates = rows.length - realCodes;
  const average = rows.length
    ? rows.reduce(
        (sum, row) =>
          sum +
          rowQuality({
            code: row.code,
            name: row.name,
            price: parseNumber(row.price, 0),
            description: row.description,
            unit: row.unit,
            currency: row.currency
          }),
        0
      ) / rows.length
    : 0;
  const sourceWeight =
    analysis?.source?.kind === "pdftotext-layout" ? 80 : analysis?.source?.kind === "javascript" ? 40 : 0;
  return (
    (strategyWeight[analysis?.strategy] || 0) +
    rows.length * 20 +
    realCodes * 20 -
    generatedCandidates * 18 +
    average +
    sourceWeight
  );
}
async function parsePdf(filePath, onProgress = () => {}) {
  const sources = [];
  const warnings = [];
  onProgress({ stage: "extracting", progress: 20, message: "PDF metin katmanı kontrol ediliyor." });
  if (commandExists("pdftotext")) {
    const direct = spawnSync("pdftotext", ["-layout", "-enc", "UTF-8", filePath, "-"], {
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 128 * 1024 * 1024
    });
    if (direct.status === 0 && String(direct.stdout || "").trim())
      sources.push({ kind: "pdftotext-layout", text: String(direct.stdout || "") });
    else
      warnings.push(
        `PDF metni doğrudan okunamadı (${String(direct.stderr || "pdftotext hatası").slice(0, 160)}).`
      );
  } else warnings.push("Sunucuda pdftotext bulunamadı; dahili PDF okuyucusu kullanılacak.");
  onProgress({ stage: "reading", progress: 38, message: "Dahili PDF okuyucusu metin bloklarını çıkarıyor." });
  const js = await parsePdfWithJavascript(filePath);
  if (js.text) sources.push({ kind: "javascript", text: js.text });
  if (js.warning) warnings.push(js.warning);
  onProgress({ stage: "mapping", progress: 52, message: "Ürün tablosu ve sütun başlıkları eşleştiriliyor." });
  let analyses = sources.map((source) => ({ source, ...parsePdfSource(source.text) }));
  const strongestText = Math.max(0, ...sources.map((x) => String(x.text || "").replace(/\s/g, "").length));
  let best = [...analyses].sort((a, b) => analysisScore(b) - analysisScore(a))[0] || null;
  let rows = dedupeProductRows(best?.rows || []);
  const strongestContext = Math.max(0, ...analyses.map((x) => Number(x.context || 0)));
  if (strongestText < 120 || (!rows.length && strongestContext >= 4)) {
    const ocr = ocrPdf(filePath, onProgress);
    if (ocr.text) {
      const source = { kind: "ocr", text: ocr.text };
      let analysis = { source, ...parsePdfSource(source.text) };
      const ocrRows = strictProductRows(parseOcrOfferRows(source.text));
      if (
        ocrRows.length >= 2 &&
        analysisScore({ source, strategy: "ocr-table", rows: ocrRows }) > analysisScore(analysis)
      )
        analysis = { source, ...analysis, rows: ocrRows, strategy: "ocr-table", ocrRows: ocrRows.length };
      sources.push(source);
      analyses.push(analysis);
      best = [...analyses].sort((a, b) => analysisScore(b) - analysisScore(a))[0] || best;
      rows = dedupeProductRows(best?.rows || []);
    }
    if (ocr.warning) warnings.push(ocr.warning);
  }
  onProgress({
    stage: "validating",
    progress: 82,
    message: "Ürün dışı satırlar eleniyor ve alanlar doğrulanıyor."
  });
  const summary = analyses.reduce(
    (a, x) => ({
      paginatedRows: a.paginatedRows + Number(x.paginatedRows || 0),
      tableRows: a.tableRows + x.tableRows,
      lineRows: a.lineRows + x.lineRows,
      continuousRows: a.continuousRows + x.continuousRows,
      columnRows: a.columnRows + x.columnRows,
      commonRows: a.commonRows + x.commonRows,
      invoiceRows: a.invoiceRows + Number(x.invoiceRows || 0),
      context: Math.max(a.context, x.context)
    }),
    {
      paginatedRows: 0,
      tableRows: 0,
      lineRows: 0,
      continuousRows: 0,
      columnRows: 0,
      commonRows: 0,
      invoiceRows: 0,
      context: 0
    }
  );
  if (!rows.length)
    warnings.push(
      "PDF içinde gerçek ürün tablosuna bağlı ürün adı, miktar, birim ve fiyat içeren doğrulanabilir satır bulunamadı. Adres, garanti, not ve toplam satırları ürün oluşturulmadan elendi."
    );
  else if (!["einvoice", "paginated", "column", "table"].includes(best?.strategy))
    warnings.push(
      "PDF tablo yapısı standart değildi; yalnızca miktar, birim, fiyat ve ürün adı birlikte doğrulanabilen satırlar gösterildi. Kaydetmeden önce kontrol edin."
    );
  return {
    rows,
    warnings: [...new Set(warnings.filter(Boolean))],
    meta: {
      textLength: sources.reduce((n, x) => n + String(x.text || "").length, 0),
      sources: sources.map((x) => x.kind),
      selectedSource: best?.source?.kind || "",
      selectedStrategy: best?.strategy || "none",
      strategies: [...new Set(analyses.map((x) => x.strategy).filter(Boolean))],
      ...summary
    }
  };
}

export function parseProformaTextForTest(rawText) {
  return parsePdfSource(rawText);
}

export async function analyzeProformaFile(file, onProgress = () => {}) {
  onProgress({ stage: "starting", progress: 8, message: "Dosya türü, boyutu ve bütünlüğü doğrulandı." });
  const ext = path.extname(file.originalname || "").toLowerCase(),
    sourceHash = crypto.createHash("sha256").update(fs.readFileSync(file.path)).digest("hex");
  if (![".pdf", ".xlsx", ".xls", ".csv", ".txt"].includes(ext)) {
    const e = new Error("Yalnızca PDF, XLSX, XLS veya CSV proforma dosyaları desteklenir.");
    e.status = 415;
    e.expose = true;
    throw e;
  }
  const parsed =
    ext === ".pdf"
      ? await parsePdf(file.path, onProgress)
      : await (onProgress({
          stage: "extracting",
          progress: 28,
          message: "Excel çalışma sayfaları ve başlıklar okunuyor."
        }),
        parseWorkbook(file.path));
  onProgress({
    stage: "mapping",
    progress: 76,
    message: "Ürün kodu, adı, açıklaması, miktarı ve fiyatı doğru alanlara eşleştiriliyor."
  });
  const rows = (parsed.rows || [])
    .map((row, index) => normalizeImportRow(row, index, sourceHash))
    .filter((row) => row.name && (row.price > 0 || !row.code.startsWith("IMP-")));
  if (!rows.length) {
    const e = new Error(
      ext === ".pdf"
        ? "PDF proformada ürün satırı bulunamadı. Dahili PDF okuyucu, tablo analizi ve OCR denemesinden sonra ürün adı ile fiyat/kod içeren doğrulanabilir satır oluşmadığı için işlem durduruldu."
        : "Excel proformada ürün satırı bulunamadı. Ürün adı ile fiyat/kod içeren doğrulanabilir satır bulunmadığı için işlem durduruldu. Sütun başlıklarını ve dosya içeriğini kontrol edin."
    );
    e.status = 422;
    e.expose = true;
    e.code = "NO_PRODUCT_ROWS";
    e.importWarnings = parsed.warnings || [];
    throw e;
  }
  return {
    source: {
      name: file.originalname,
      size: file.size,
      type: ext.slice(1).toUpperCase(),
      sha256: sourceHash
    },
    warnings: parsed.warnings || [],
    meta: parsed.meta || {},
    rows
  };
}

function sessionPath(token) {
  return path.join(importsDir, `${String(token).replace(/[^a-zA-Z0-9_-]/g, "")}.json`);
}
export function saveImportSession({ tenantId, userId, data }) {
  const token = crypto.randomBytes(24).toString("base64url");
  fs.writeFileSync(sessionPath(token), JSON.stringify({ tenantId, userId, createdAt: Date.now(), ...data }), {
    mode: 0o600
  });
  return token;
}
export function readImportSession({ token, tenantId, userId }) {
  const file = sessionPath(token);
  if (!fs.existsSync(file)) return null;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  if (
    data.tenantId !== tenantId ||
    data.userId !== userId ||
    Date.now() - Number(data.createdAt || 0) > 2 * 60 * 60 * 1000
  ) {
    try {
      fs.rmSync(file, { force: true });
    } catch {}
    return null;
  }
  return data;
}
export function deleteImportSession(token) {
  try {
    fs.rmSync(sessionPath(token), { force: true });
  } catch {}
}

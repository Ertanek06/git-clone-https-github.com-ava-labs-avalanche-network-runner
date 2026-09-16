import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/auth.js";
import { hasPermission } from "../services/permission.service.js";
import { upload, productUpload, documentImportUpload, publicFile, validateUploads, cleanupUploadedFiles } from "../middleware/upload.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import fs from "fs";
import crypto from "crypto";
import { spawn } from "child_process";
import os from "os";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "../config.js";
import { normalizeUploadRelative } from "../services/upload-access.service.js";
import {
  createImportJob,
  readImportJob,
  writeImportJob,
  ownsImportJob
} from "../services/product-import-job.service.js";
import { safeText, upperTr, foldTR, searchText, safePublicUrl } from "../utils/text.js";
import {
  analyzeProformaFile,
  saveImportSession,
  readImportSession,
  deleteImportSession
} from "../services/proforma-product-import.service.js";
import {
  analyzeProductUrl,
  analyzeUrls,
  discoverProductUrls,
  downloadProductImage,
  downloadProductPdf,
  validateRemoteUrl,
  looksLikeSitemapUrl
} from "../services/web-product-import.service.js";
import {
  createWebImportJob,
  readWebImportJob,
  writeWebImportJob,
  readWebImportRows,
  writeWebImportRows,
  patchWebImportRow,
  deleteWebImportJob,
  cleanupWebImportJobs,
  ownsWebImportJob
} from "../services/web-product-import-job.service.js";
const r = Router();
r.use(requireAuth);
const productView = requirePermission("products", "view"),
  productCreate = requirePermission("products", "create"),
  productEdit = requirePermission("products", "edit"),
  productArchive = requirePermission("products", "archive"),
  productExport = requirePermission("products", "export"),
  financialEdit = requirePermission("financials", "edit");
const canSeeFinancials = (req) => hasPermission(req.user, "financials", "view");
const text = safeText;
const importId = (prefix) => `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
const json = (value) => {
  try {
    return JSON.parse(String(value || "{}"));
  } catch {
    return {};
  }
};
function ensureProductImportSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_import_templates(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, source_pattern TEXT,
      mapping_json TEXT NOT NULL DEFAULT '{}', defaults_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(tenant_id,name)
    );
    CREATE INDEX IF NOT EXISTS idx_product_import_templates_tenant ON product_import_templates(tenant_id,updated_at DESC);
    CREATE TABLE IF NOT EXISTS product_import_history(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT, source_name TEXT, source_type TEXT,
      source_size INTEGER NOT NULL DEFAULT 0, template_name TEXT, status TEXT NOT NULL,
      detected_count INTEGER NOT NULL DEFAULT 0, selected_count INTEGER NOT NULL DEFAULT 0,
      added_count INTEGER NOT NULL DEFAULT 0, updated_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0, warning_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0, details_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_product_import_history_tenant ON product_import_history(tenant_id,created_at DESC);
  `);
}
ensureProductImportSchema();
function ensureProductAlternativeSchema() {
  db.exec(`
 CREATE TABLE IF NOT EXISTS product_alternatives(
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,product_id TEXT NOT NULL,alternative_product_id TEXT NOT NULL,
  alternative_type TEXT NOT NULL DEFAULT 'EQUIVALENT',note TEXT,created_by TEXT,created_at INTEGER NOT NULL,
  UNIQUE(tenant_id,product_id,alternative_product_id)
 );
 CREATE INDEX IF NOT EXISTS idx_product_alternatives_product ON product_alternatives(tenant_id,product_id);
`);
}
ensureProductAlternativeSchema();
function productImportSchemaGuard(req, res, next) {
  try {
    ensureProductImportSchema();
    next();
  } catch (error) {
    console.error("[product-import-schema]", error);
    error.status = 500;
    error.expose = true;
    error.message =
      "Ürün aktarım veritabanı hazırlanamadı. Güncelleme migration işlemini yeniden çalıştırın.";
    next(error);
  }
}
r.use("/import-proforma", productImportSchemaGuard);
function recordImportHistory(req, data = {}) {
  try {
    db.prepare(
      `INSERT INTO product_import_history(id,tenant_id,user_id,source_name,source_type,source_size,template_name,status,detected_count,selected_count,added_count,updated_count,skipped_count,warning_count,duration_ms,details_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      importId("pih"),
      req.tenantId,
      req.user?.id || null,
      text(data.source_name),
      text(data.source_type),
      Number(data.source_size || 0),
      text(data.template_name),
      text(data.status || "UNKNOWN"),
      Number(data.detected_count || 0),
      Number(data.selected_count || 0),
      Number(data.added_count || 0),
      Number(data.updated_count || 0),
      Number(data.skipped_count || 0),
      Number(data.warning_count || 0),
      Number(data.duration_ms || 0),
      JSON.stringify(data.details || {}),
      Date.now()
    );
  } catch (e) {
    console.error("[product-import-history]", e);
  }
}
function importTemplates(tenantId) {
  return db
    .prepare(
      "SELECT * FROM product_import_templates WHERE tenant_id=? ORDER BY updated_at DESC,name COLLATE NOCASE"
    )
    .all(tenantId)
    .map((row) => ({ ...row, mapping: json(row.mapping_json), defaults: json(row.defaults_json) }));
}
const num = (v, d = 0) => {
  const raw = String(v ?? "")
    .trim()
    .replace(",", ".");
  if (raw === "") return d;
  const n = Number(raw);
  return Number.isFinite(n) ? n : d;
};
const wantsJson = (req) => req.accepts(["json", "html"]) === "json";
const recordProductPriceChange = (
  req,
  productId,
  oldPrice,
  newPrice,
  currency,
  changeType = "DIRECT",
  changeValue = null
) => {
  const before = Number(oldPrice || 0),
    after = Number(newPrice || 0);
  if (
    !productId ||
    !Number.isFinite(before) ||
    !Number.isFinite(after) ||
    Math.abs(before - after) < 0.000001
  )
    return;
  db.prepare(
    `INSERT INTO product_price_history(id,tenant_id,product_id,old_price,new_price,currency,change_type,change_value,changed_by,created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id("pph"),
    req.tenantId,
    productId,
    before,
    after,
    upperTr(currency || "TRY") || "TRY",
    changeType,
    changeValue,
    req.user?.id || null,
    Date.now()
  );
};
const safeAssetUrl = (v) => safePublicUrl(v);
const deletedWhere =
  "COALESCE(deleted_at,0)=0 AND UPPER(COALESCE(status,'ACTIVE')) NOT IN ('DELETED','SILINDI','ARCHIVED','ARSIVLENDI')";
const combinedDescription = (row) =>
  [text(row?.short_description), text(row?.technical_description)].filter(Boolean).join("\n");
const normalizeProduct = (row, canSeeFinancials = true) => {
  const base = {
    id: row?.id || "",
    code: row?.code || "",
    gtip_no: row?.gtip_no || "",
    origin_country: row?.origin_country || "",
    name: row?.name || "",
    brand: row?.brand || "",
    model: row?.model || "",
    category: row?.category || "",
    short_description: combinedDescription(row),
    technical_description: "",
    image_url: safeAssetUrl(row?.image_url),
    brochure_url: safeAssetUrl(row?.brochure_url),
    ce_certificate_url: safeAssetUrl(row?.ce_certificate_url),
    manual_url: safeAssetUrl(row?.manual_url),
    unit: row?.unit || "ADET",
    vat_rate: num(row?.vat_rate, 20),
    currency: row?.currency || "TRY",
    status: row?.status || "ACTIVE",
    created_at: Number(row?.created_at || 0),
    updated_at: Number(row?.updated_at || 0)
  };
  if (canSeeFinancials) {
    Object.assign(base, {
      sale_price: num(row?.sale_price),
      purchase_price: num(row?.purchase_price),
      stock_qty: num(row?.stock_qty),
      supplier_name: row?.supplier_name || "",
      min_stock_qty: num(row?.min_stock_qty),
      profit_rate: num(row?.profit_rate)
    });
  }
  return base;
};
const productSearch = (row) =>
  searchText(
    row.code,
    row.barcode,
    row.gtip_no,
    row.origin_country,
    row.name,
    row.brand,
    row.model,
    row.category,
    row.short_description,
    row.technical_description,
    row.unit,
    row.currency,
    row.status
  );
function productBody(body = {}) {
  const description = text(body.description_combined ?? body.short_description);
  return {
    code: upperTr(body.code),
    barcode: text(body.barcode),
    gtip_no: upperTr(body.gtip_no),
    origin_country: upperTr(body.origin_country),
    name: upperTr(body.name),
    brand: upperTr(body.brand),
    model: upperTr(body.model),
    category: upperTr(body.category),
    short_description: description,
    technical_description: "",
    product_url: safePublicUrl(body.product_url),
    unit: upperTr(body.unit) || "ADET",
    vat_rate: num(body.vat_rate, 20),
    sale_price: num(body.sale_price),
    currency: upperTr(body.currency) || "TRY",
    purchase_price: num(body.purchase_price),
    stock_qty: num(body.stock_qty),
    supplier_name: upperTr(body.supplier_name),
    min_stock_qty: num(body.min_stock_qty),
    profit_rate: num(body.profit_rate),
    status: upperTr(body.status) || "ACTIVE"
  };
}
function backfillSearch(tenantId) {
  const rows = db
    .prepare(
      `SELECT * FROM products WHERE tenant_id=? AND ${deletedWhere} AND (search_text IS NULL OR search_text='') LIMIT 250`
    )
    .all(tenantId);
  if (!rows.length) return;
  const upd = db.prepare("UPDATE products SET search_text=? WHERE tenant_id=? AND id=?");
  db.transaction(() => rows.forEach((row) => upd.run(productSearch(row), tenantId, row.id)))();
}
function buildProductSearchWhere(req) {
  const q = text(req.query.q),
    tokens = searchText(q).split(/\s+/).filter(Boolean),
    params = { t: req.tenantId };
  let where = `tenant_id=@t AND ${deletedWhere}`;
  if (tokens.length) {
    where += tokens.map((_, i) => ` AND search_text LIKE @q${i}`).join("");
    tokens.forEach((token, i) => (params[`q${i}`] = `%${token}%`));
  }
  return { q, tokens, where, params };
}
function typoDistance(left, right, max = 3) {
  const a = String(left || "").slice(0, 80),
    b = String(right || "").slice(0, 80);
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
    }
  return matrix[a.length][b.length];
}
function productLikelihood(row, needle) {
  const parts = [
    row.code,
    row.name,
    row.brand,
    row.model,
    row.category,
    row.gtip_no,
    row.origin_country,
    row.short_description,
    row.technical_description
  ].map(foldTR);
  const [code, name] = parts;
  if (code === needle) return 0;
  if (name === needle) return 1;
  if (code.startsWith(needle)) return 2;
  if (name.startsWith(needle)) return 3;
  if (name.split(/\s+/).some((word) => word.startsWith(needle))) return 4;
  if (code.includes(needle)) return 5;
  if (name.includes(needle)) return 6;
  if (parts.slice(2, 5).some((value) => value.includes(needle))) return 12;
  const queryWords = needle.split(/\s+/).filter(Boolean);
  if (!queryWords.length || queryWords.some((word) => word.length < 2)) return Number.POSITIVE_INFINITY;
  const targetWords = parts.flatMap((value) => value.split(/[^a-z0-9]+/).filter(Boolean));
  let penalty = 0;
  for (const queryWord of queryWords) {
    const allowed = queryWord.length <= 4 ? 1 : queryWord.length <= 8 ? 2 : 3;
    let best = allowed + 1;
    for (const targetWord of targetWords) {
      if (targetWord.startsWith(queryWord) || queryWord.startsWith(targetWord)) {
        best = 0;
        break;
      }
      best = Math.min(best, typoDistance(queryWord, targetWord, allowed));
    }
    if (best > allowed) return Number.POSITIVE_INFINITY;
    penalty += best / Math.max(1, queryWord.length);
  }
  return 30 + penalty * 20;
}
function productCoreSearch(row) {
  return searchText(row.code, row.name, row.brand, row.model, row.category, row.gtip_no, row.origin_country);
}
function productDescriptionSearch(row) {
  return searchText(row.short_description, row.technical_description);
}
function rankedProductMatches(tenantId, query) {
  const needle = searchText(query);
  const tokens = needle.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const pool = db
    .prepare(`SELECT * FROM products WHERE tenant_id=? AND ${deletedWhere}`)
    .all(tenantId);
  const containsAll = (value) => tokens.every((token) => value.includes(token));
  const coreMatches = pool.filter((row) => containsAll(productCoreSearch(row)));
  // Eski web aktarımlarındaki ortak menü/footer metinleri her ürünü eşleştirmesin.
  // Kod, ad, marka, model veya kategoride sonuç varsa açıklama alanına hiç düşülmez.
  const candidates = coreMatches.length
    ? coreMatches
    : pool.filter((row) => containsAll(productDescriptionSearch(row)));
  return candidates.sort((a, b) => {
    const score = productLikelihood(a, needle) - productLikelihood(b, needle);
    if (Number.isFinite(score) && score !== 0) return score;
    return (
      Number(b.updated_at || b.created_at || 0) - Number(a.updated_at || a.created_at || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""), "tr-TR", { sensitivity: "base", numeric: true })
    );
  });
}
function productSearchRows(req, res) {
  backfillSearch(req.tenantId);
  const limit = Math.min(120, Math.max(5, Number(req.query.limit) || 60));
  try {
    const { q, tokens, where, params } = buildProductSearchWhere(req);
    if (!tokens.length) {
      const rows = db
        .prepare(
          `SELECT * FROM products WHERE ${where} ORDER BY COALESCE(updated_at,created_at) DESC,created_at DESC,name COLLATE NOCASE ASC,code COLLATE NOCASE ASC LIMIT @limit`
        )
        .all({ ...params, limit });
      res.set("Cache-Control", "no-store");
      return res.json(rows.map((row) => normalizeProduct(row, canSeeFinancials(req))));
    }
    const ranked = rankedProductMatches(req.tenantId, q)
      .slice(0, limit)
      .map((row) => normalizeProduct(row, canSeeFinancials(req)));
    res.set("Cache-Control", "no-store");
    return res.json(ranked);
  } catch (e) {
    console.error("[products lookup]", e);
    return res.status(500).json({ error: "product_lookup_failed", message: "Ürün listesi yüklenemedi." });
  }
}
const decodeXml = (v) =>
  String(v || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
function parseSpreadsheetXml(raw) {
  const rows = [...raw.matchAll(/<Row\b[^>]*>([\s\S]*?)<\/Row>/gi)].map((m) =>
    [...m[1].matchAll(/<Cell\b[^>]*>([\s\S]*?)<\/Cell>/gi)].map((c) =>
      decodeXml((c[1].match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i) || [])[1] || "")
    )
  );
  if (rows.length < 2) return [];
  const head = rows.shift().map((x) => text(x));
  return rows.map((c) => Object.fromEntries(head.map((h, i) => [h, text(c[i])])));
}
function parseCsv(raw) {
  const lines = raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  const head = (lines.shift() || "").split(";").map((x) => text(x));
  return lines.map((line) => {
    const cells = line.split(";");
    return Object.fromEntries(head.map((h, i) => [h, text(cells[i])]));
  });
}

async function parseWorkbookXlsx(filePath) {
  const module = await import("xlsx"),
    XLSX = module.default || module;
  if (!XLSX?.read || !XLSX?.utils?.sheet_to_json)
    throw Object.assign(new Error("Excel okuma modülü yüklenemedi."), { status: 500, expose: true });
  const wb = XLSX.read(fs.readFileSync(filePath), {
    type: "buffer",
    cellDates: false,
    raw: false,
    codepage: 65001
  });
  const name = wb.SheetNames[0];
  return XLSX.utils
    .sheet_to_json(wb.Sheets[name], { defval: "", raw: false })
    .map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [text(k), text(v)])));
}
async function readImportRows(file) {
  const ext = (file.originalname || "").toLowerCase();
  if (ext.endsWith(".xlsx")) return parseWorkbookXlsx(file.path);
  const raw = fs.readFileSync(file.path, "utf8");
  return /^\s*<\?xml/i.test(raw) ? parseSpreadsheetXml(raw) : parseCsv(raw);
}
function upsertImported(tenantId, rows, allowFinancial = false) {
  const stmt = db.prepare(
    `INSERT INTO products(id,tenant_id,code,gtip_no,origin_country,name,brand,model,category,unit,vat_rate,sale_price,currency,purchase_price,short_description,technical_description,image_url,brochure_url,ce_certificate_url,manual_url,product_url,supplier_name,min_stock_qty,profit_rate,status,search_text,created_at,updated_at) VALUES(@id,@tenant_id,@code,@gtip_no,@origin_country,@name,@brand,@model,@category,@unit,@vat_rate,@sale_price,@currency,@purchase_price,@short_description,@technical_description,@image_url,@brochure_url,@ce_certificate_url,@manual_url,@product_url,@supplier_name,@min_stock_qty,@profit_rate,'ACTIVE',@search_text,@created_at,@updated_at) ON CONFLICT(tenant_id,code) DO UPDATE SET gtip_no=excluded.gtip_no,origin_country=excluded.origin_country,name=excluded.name,brand=excluded.brand,model=excluded.model,category=excluded.category,unit=excluded.unit,vat_rate=excluded.vat_rate,sale_price=excluded.sale_price,currency=excluded.currency,purchase_price=excluded.purchase_price,short_description=excluded.short_description,technical_description=excluded.technical_description,image_url=CASE WHEN excluded.image_url<>'' THEN excluded.image_url ELSE products.image_url END,brochure_url=CASE WHEN excluded.brochure_url<>'' THEN excluded.brochure_url ELSE products.brochure_url END,ce_certificate_url=CASE WHEN excluded.ce_certificate_url<>'' THEN excluded.ce_certificate_url ELSE products.ce_certificate_url END,manual_url=CASE WHEN excluded.manual_url<>'' THEN excluded.manual_url ELSE products.manual_url END,product_url=CASE WHEN excluded.product_url<>'' THEN excluded.product_url ELSE products.product_url END,supplier_name=excluded.supplier_name,min_stock_qty=excluded.min_stock_qty,profit_rate=excluded.profit_rate,status='ACTIVE',deleted_at=NULL,deleted_by=NULL,search_text=excluded.search_text,updated_at=excluded.updated_at`
  );
  let added = 0,
    updated = 0,
    skipped = 0;
  const exists = db.prepare(
    "SELECT purchase_price,supplier_name,min_stock_qty,profit_rate,gtip_no,origin_country FROM products WHERE tenant_id=? AND code=?"
  );
  db.transaction(() =>
    rows.forEach((row) => {
      const code = upperTr(row.code),
        webImport = Boolean(row.web_import),
        name = webImport ? text(row.name) : upperTr(row.name);
      if (!code || !name) {
        skipped++;
        return;
      }
      const prior = exists.get(tenantId, code),
        had = !!prior,
        now = Date.now(),
        record = {
          id: id("prd"),
          tenant_id: tenantId,
          code,
          gtip_no: webImport && prior ? upperTr(prior.gtip_no) : upperTr(row.gtip_no),
          origin_country: webImport && prior ? upperTr(prior.origin_country) : upperTr(row.origin_country),
          name,
          brand: webImport ? text(row.brand) : upperTr(row.brand),
          model: webImport ? text(row.model) : upperTr(row.model),
          category: webImport ? text(row.category) : upperTr(row.category),
          unit: upperTr(row.unit) || "ADET",
          vat_rate: num(row.vat_rate, 20),
          sale_price: num(row.sale_price),
          currency: upperTr(row.currency) || "TRY",
          purchase_price: webImport && prior ? num(prior.purchase_price) : allowFinancial ? num(row.purchase_price) : num(prior?.purchase_price),
          short_description: text(row.description_combined || row.short_description || row.note),
          technical_description: "",
          image_url: safePublicUrl(row.image_url || row.image),
          brochure_url: safePublicUrl(row.brochure_url),
          ce_certificate_url: safePublicUrl(row.ce_certificate_url),
          manual_url: safePublicUrl(row.manual_url),
          product_url: safePublicUrl(row.product_url),
          supplier_name: webImport && prior ? upperTr(prior.supplier_name) : allowFinancial ? upperTr(row.supplier_name) : upperTr(prior?.supplier_name),
          min_stock_qty: webImport && prior ? num(prior.min_stock_qty) : allowFinancial ? num(row.min_stock_qty) : num(prior?.min_stock_qty),
          profit_rate: webImport && prior ? num(prior.profit_rate) : allowFinancial ? num(row.profit_rate) : num(prior?.profit_rate),
          created_at: now,
          updated_at: now
        };
      record.search_text = productSearch(record);
      stmt.run(record);
      had ? updated++ : added++;
    })
  )();
  return { added, updated, skipped, total: added + updated };
}
const trCompare = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "tr-TR", { sensitivity: "base", numeric: true });
const productListSort = (v) => (String(v || "recent") === "alpha" ? "alpha" : "recent");
function productFormRelations(tenantId, productId) {
  ensureProductAlternativeSchema();
  const alternatives = productId
    ? db
        .prepare(
          `SELECT pa.*,p.code,p.name,p.brand,p.model,p.image_url,p.sale_price,p.currency,p.unit FROM product_alternatives pa JOIN products p ON p.tenant_id=pa.tenant_id AND p.id=pa.alternative_product_id WHERE pa.tenant_id=? AND pa.product_id=? AND COALESCE(p.deleted_at,0)=0 ORDER BY pa.created_at DESC`
        )
        .all(tenantId, productId)
    : [];
  const candidates = productId
    ? db
        .prepare(
          `SELECT id,code,name,brand,model,sale_price,currency FROM products WHERE tenant_id=? AND id<>? AND ${deletedWhere} ORDER BY name COLLATE NOCASE LIMIT 500`
        )
        .all(tenantId, productId)
    : [];
  return { alternatives, candidates };
}
r.get("/", productView, (req, res) => {
  backfillSearch(req.tenantId);
  const sort = productListSort(req.query.sort),
    showAll = String(req.query.show || "").toLowerCase() === "all",
    page = showAll ? 1 : Math.max(1, Number(req.query.page) || 1),
    limit = Math.min(100, Math.max(10, Number(req.query.limit) || 30)),
    off = (page - 1) * limit,
    allBatch = 120;
  const { q, where, params } = buildProductSearchWhere(req);
  const order =
    sort === "alpha"
      ? "name COLLATE NOCASE ASC, code COLLATE NOCASE ASC"
      : "created_at DESC, updated_at DESC, name COLLATE NOCASE ASC";
  const matched = q ? rankedProductMatches(req.tenantId, q) : null;
  const total = matched
    ? matched.length
    : Number(db.prepare(`SELECT COUNT(*) AS n FROM products WHERE ${where}`).get(params).n || 0);
  const pageLimit = showAll ? allBatch : limit,
    pageOff = showAll ? 0 : off;
  const rows = matched
    ? matched.slice(pageOff, pageOff + pageLimit)
    : db
        .prepare(`SELECT * FROM products WHERE ${where} ORDER BY ${order} LIMIT @limit OFFSET @off`)
        .all({ ...params, limit: pageLimit, off: pageOff });
  res.render("products/index", {
    title: req.locale === "en" ? "Products & Services" : "Ürün ve Hizmetler",
    rows,
    q,
    sort,
    page,
    limit,
    total,
    showAll,
    allBatch
  });
});
r.get("/list-fragment", productView, (req, res) => {
  const sort = productListSort(req.query.sort),
    offset = Math.max(0, Number(req.query.offset) || 0),
    limit = Math.min(120, Math.max(20, Number(req.query.limit) || 120));
  const { q, where, params } = buildProductSearchWhere(req),
    order =
      sort === "alpha"
        ? "name COLLATE NOCASE ASC, code COLLATE NOCASE ASC"
        : "created_at DESC, updated_at DESC, name COLLATE NOCASE ASC";
  const matched = q ? rankedProductMatches(req.tenantId, q) : null;
  const rows = matched
    ? matched.slice(offset, offset + limit)
    : db
        .prepare(`SELECT * FROM products WHERE ${where} ORDER BY ${order} LIMIT @limit OFFSET @off`)
        .all({ ...params, limit, off: offset });
  res.setHeader("Cache-Control", "no-store");
  res.render("products/_list-rows", {
    layout: false,
    rows,
    showMoney: canSeeFinancials(req),
    canEdit: hasPermission(req.user, "products", "edit"),
    canArchive: hasPermission(req.user, "products", "archive"),
    en: req.locale === "en"
  });
});
r.get("/new", productCreate, (req, res) =>
  res.render("products/form", {
    title: "Yeni Ürün veya Hizmet",
    row: { unit: "ADET", currency: "TRY", vat_rate: 20, status: "ACTIVE" },
    canFinancials: hasPermission(req.user, "financials", "view"),
    canEditFinancials: hasPermission(req.user, "financials", "edit"),
    alternatives: [],
    candidates: []
  })
);
r.get(
  "/import-proforma",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  (req, res) =>
    res.render("products/import-proforma", {
      title: req.locale === "en" ? "Import Products from Proforma" : "Proformadan Ürün Aktar"
    })
);
r.get(
  "/import-proforma/history",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  (req, res) => {
    const history = db
      .prepare("SELECT * FROM product_import_history WHERE tenant_id=? ORDER BY created_at DESC LIMIT 200")
      .all(req.tenantId);
    res.render("products/import-proforma-history", { title: "Ürün Aktarım Geçmişi", history });
  }
);
r.get(
  "/import-proforma/history.xls",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  (req, res) => {
    const rows = db
      .prepare("SELECT * FROM product_import_history WHERE tenant_id=? ORDER BY created_at DESC LIMIT 1000")
      .all(req.tenantId);
    const esc = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const tr = (a) =>
      `<Row>${a.map((v) => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`).join("")}</Row>`;
    res.type("application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=proforma_urun_aktarim_gecmisi.xls");
    res.send(
      `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Aktarim Gecmisi"><Table>${tr(["Tarih", "Dosya", "Durum", "Bulunan", "Seçilen", "Yeni", "Güncellenen", "Atlanan", "Uyarı", "Süre sn"])}${rows.map((x) => tr([new Date(x.created_at).toLocaleString("tr-TR"), x.source_name, x.status, x.detected_count, x.selected_count, x.added_count, x.updated_count, x.skipped_count, x.warning_count, (x.duration_ms / 1000).toFixed(2)])).join("")}</Table></Worksheet></Workbook>`
    );
  }
);

function webImportSources(tenantId) {
  return db
    .prepare(
      `SELECT * FROM web_product_sources
       WHERE tenant_id=?
       ORDER BY is_active DESC,updated_at DESC,name COLLATE NOCASE`
    )
    .all(tenantId)
    .map((row) => {
      let settings = {};
      try {
        settings = JSON.parse(row.settings_json || "{}");
      } catch {}
      return { ...row, settings, sitemap_valid: looksLikeSitemapUrl(row.sitemap_url || "") };
    });
}
function webImportSource(tenantId, sourceId) {
  if (!sourceId) return null;
  return db
    .prepare("SELECT * FROM web_product_sources WHERE tenant_id=? AND id=? LIMIT 1")
    .get(tenantId, sourceId);
}
function webImportHistory(req, data = {}) {
  const historyId = text(data.history_id) || id("wih");
  try {
    db.prepare(
      `INSERT INTO web_product_import_history(
        id,tenant_id,user_id,source_id,source_name,base_url,status,
        discovered_count,analyzed_count,selected_count,added_count,updated_count,
        skipped_count,warning_count,details_json,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      historyId,
      req.tenantId,
      req.user?.id || null,
      data.source_id || null,
      text(data.source_name),
      text(data.base_url),
      text(data.status || "UNKNOWN"),
      Number(data.discovered_count || 0),
      Number(data.analyzed_count || 0),
      Number(data.selected_count || 0),
      Number(data.added_count || 0),
      Number(data.updated_count || 0),
      Number(data.skipped_count || 0),
      Number(data.warning_count || 0),
      JSON.stringify(data.details || {}),
      Date.now()
    );
    return historyId;
  } catch (error) {
    console.error("[web-product-import-history]", error);
    return "";
  }
}
function parseWebImportHistoryDetails(row) {
  try {
    const value = JSON.parse(String(row?.details_json || "{}"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}
function webImportPidAlive(pid) {
  const value = Number(pid || 0);
  if (!Number.isInteger(value) || value <= 1) return false;
  try {
    process.kill(value, 0);
    return true;
  } catch {
    return false;
  }
}
function launchWebImportWorker(jobId) {
  const workerPath = fileURLToPath(new URL("../workers/web-product-import.worker.js", import.meta.url));
  const child = spawn(process.execPath, [workerPath, jobId], {
    cwd: path.resolve(path.dirname(workerPath), "../.."),
    env: { ...process.env },
    detached: true,
    stdio: "ignore"
  });
  child.unref();
  return child;
}
function reconcileWebImportJob(job) {
  if (!job) return null;
  if (["QUEUED", "RUNNING", "IMPORTING"].includes(job.status)) {
    const age = Date.now() - Number(job.updatedAt || job.createdAt || 0);
    const pid = job.status === "IMPORTING" ? job.importPid : job.pid;
    const dead = pid && !webImportPidAlive(pid);
    const staleLimit = job.status === "IMPORTING" ? 15 * 60 * 1000 : 3 * 60 * 1000;
    const stale = age > staleLimit;
    if (dead || stale) {
      if (stale && pid && webImportPidAlive(pid)) {
        try { process.kill(Number(pid), "SIGTERM"); } catch {}
      }
      if (job.status === "IMPORTING") {
        return writeWebImportJob(job.id, {
          status: "READY", stage: "ready", progress: 100,
          importError: stale ? "Aktarım uzun süre yeni veri üretmediği için durduruldu." : "Aktarım işlemi beklenmedik şekilde durdu.",
          importPid: null,
          message: "Aktarım tamamlanamadı. Seçimler korunuyor; yeniden kaydetmeyi deneyebilirsiniz."
        });
      }
      const retryCount = Math.max(0, Number(job.retryCount || 0));
      if (retryCount < 2) {
        try {
          const child = launchWebImportWorker(job.id);
          return writeWebImportJob(job.id, {
            status: "QUEUED",
            stage: job.analysisCursor ? "analyze" : "queued",
            progress: job.analysisCursor && job.discovered
              ? Math.min(99, Math.round((Number(job.analysisCursor) / Number(job.discovered)) * 100))
              : null,
            pid: child.pid,
            retryCount: retryCount + 1,
            error: null,
            message: `Tarama bağlantısı kesildi; kayıtlı ilerlemeden otomatik yeniden başlatıldı (${retryCount + 1}/2).`
          });
        } catch (error) {
          console.error("[web-product-import-auto-retry]", error);
        }
      }
      return writeWebImportJob(job.id, {
        status: "ERROR", stage: "error", progress: null,
        error: stale
          ? "Tarama 3 dakikadan uzun süredir yeni veri üretemediği için durduruldu. Kaynak siteyi kontrol edip yeniden tarayın."
          : "Tarama işlemi beklenmedik şekilde durdu. Yeniden tarama başlatabilirsiniz.",
        completedAt: Date.now(), pid: null
      });
    }
  }
  return job;
}
function updateWebImportHistoryFromJob(historyId, tenantId, job, extra = {}) {
  if (!historyId || !job) return;
  try {
    const old = db.prepare("SELECT * FROM web_product_import_history WHERE tenant_id=? AND id=? LIMIT 1").get(tenantId, historyId);
    if (!old) return;
    const details = { ...parseWebImportHistoryDetails(old), job_id: job.id, ...(extra.details || {}) };
    const imported = job.importResult || {};
    db.prepare(
      `UPDATE web_product_import_history SET
        status=?,discovered_count=?,analyzed_count=?,selected_count=?,added_count=?,updated_count=?,skipped_count=?,warning_count=?,details_json=?
       WHERE tenant_id=? AND id=?`
    ).run(
      text(extra.status || job.status || old.status),
      Number(job.discovered ?? old.discovered_count ?? 0),
      Number(job.analyzed ?? old.analyzed_count ?? 0),
      Number(job.selected ?? old.selected_count ?? 0),
      Number(extra.added_count ?? imported.added ?? old.added_count ?? 0),
      Number(extra.updated_count ?? imported.updated ?? old.updated_count ?? 0),
      Number(extra.skipped_count ?? imported.skipped ?? old.skipped_count ?? 0),
      Number(extra.warning_count ?? job.warnings ?? old.warning_count ?? 0),
      JSON.stringify(details),
      tenantId,
      historyId
    );
  } catch (error) {
    console.error("[web-product-import-history-sync]", error);
  }
}
function webImportHistoryRows(tenantId, limit = 200) {
  const rows = db.prepare(
    `SELECT * FROM web_product_import_history WHERE tenant_id=? ORDER BY created_at DESC LIMIT ?`
  ).all(tenantId, Math.min(500, Math.max(1, Number(limit) || 200)));
  return rows.map((row) => {
    const details = parseWebImportHistoryDetails(row);
    const rawJob = details.job_id ? readWebImportJob(details.job_id) : null;
    const job = rawJob && rawJob.tenantId === tenantId ? reconcileWebImportJob(rawJob) : null;
    if (job) updateWebImportHistoryFromJob(row.id, tenantId, job);
    const status = job?.status || row.status;
    return {
      ...row,
      details,
      job,
      job_id: job?.id || details.job_id || "",
      status,
      live_status: status,
      stage: job?.stage || "",
      progress: job?.progress ?? null,
      discovered_count: Number(job?.discovered ?? row.discovered_count ?? 0),
      analyzed_count: Number(job?.analyzed ?? row.analyzed_count ?? 0),
      selected_count: Number(job?.selected ?? row.selected_count ?? 0),
      added_count: Number(job?.importResult?.added ?? row.added_count ?? 0),
      updated_count: Number(job?.importResult?.updated ?? row.updated_count ?? 0),
      skipped_count: Number(job?.importResult?.skipped ?? row.skipped_count ?? 0),
      warning_count: Number(job?.warnings ?? row.warning_count ?? 0),
      started_at: Number(job?.startedAt || 0),
      updated_at: Number(job?.updatedAt || row.created_at || 0),
      completed_at: Number(job?.completedAt || job?.importedAt || 0),
      error: text(job?.error || ""),
      open_url: job ? (["READY", "IMPORTED"].includes(job.status) ? `/products/import-web/scan/${job.id}/preview` : `/products/import-web/scan/${job.id}`) : ""
    };
  });
}

function webImportNameLooksLikeUrl(value = "") {
  const raw = text(value);
  if (!raw) return false;
  return /^https?:\/\//i.test(raw) || /^www\./i.test(raw) || (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw) && !/\s/.test(raw));
}
function webImportUrlKey(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return "";
  }
}
function webImportExistingMaps(tenantId) {
  const records = db.prepare(`SELECT id,code,name,brand,model,category,unit,sale_price,currency,short_description,technical_description,image_url,brochure_url,ce_certificate_url,manual_url,product_url FROM products WHERE tenant_id=? AND ${deletedWhere}`).all(tenantId);
  return {
    codes: new Map(records.map((x) => [upperTr(x.code), x]).filter(([k]) => k)),
    names: new Map(records.map((x) => [foldTR(x.name), x]).filter(([k]) => k)),
    urls: new Map(records.map((x) => [webImportUrlKey(x.product_url), x]).filter(([k]) => k))
  };
}
function webImportRowDuplicate(tenantId, row, maps = null) {
  const cache = maps || webImportExistingMaps(tenantId);
  const byCode = cache.codes.get(upperTr(row?.code));
  const byUrl = cache.urls.get(webImportUrlKey(row?.product_url));
  const byName = cache.names.get(foldTR(row?.name));
  return {
    duplicate: !!(byCode || byUrl || byName),
    reason: byCode ? "CODE" : byUrl ? "URL" : byName ? "NAME" : "",
    existing: byCode || byUrl || byName || null,
    byCode: byCode || null,
    byUrl: byUrl || null,
    byName: byName || null
  };
}
function webImportComparable(value = "") {
  return foldTR(text(value)).replace(/\s+/g, " ").trim();
}
function webImportRowChanges(row, existing) {
  if (!existing) return [];
  const changes = [];
  const compare = (label, incoming, current) => {
    const next = text(incoming);
    if (next && webImportComparable(next) !== webImportComparable(current)) changes.push(label);
  };
  compare("ürün adı", row.name, existing.name);
  compare("marka", row.brand, existing.brand);
  compare("model", row.model, existing.model);
  compare("kategori", row.category, existing.category);
  compare("birim", row.unit, existing.unit);
  compare("açıklama", row.description, [existing.short_description, existing.technical_description].filter(Boolean).join("\n"));
  compare("ürün linki", row.product_url, existing.product_url);
  const incomingPrice = Number(row.price || 0);
  if (incomingPrice > 0 && Math.abs(incomingPrice - Number(existing.sale_price || 0)) > 0.009) changes.push("fiyat");
  const incomingCurrency = upperTr(row.currency);
  if (incomingPrice > 0 && incomingCurrency && incomingCurrency !== upperTr(existing.currency)) changes.push("para birimi");
  if (text(row.brochure_url) && !text(existing.brochure_url)) changes.push("broşür");
  if (text(row.manual_url) && !text(existing.manual_url)) changes.push("kullanım kılavuzu");
  if (text(row.ce_certificate_url) && !text(existing.ce_certificate_url)) changes.push("CE belgesi");
  return [...new Set(changes)];
}
function webImportDecoratedRows(tenantId, allRows = [], maps = null) {
  const cache = maps || webImportExistingMaps(tenantId);
  return allRows.map((row, mapIndex) => {
    const index = Number.isInteger(Number(row?.index)) ? Number(row.index) : mapIndex;
    const dup = webImportRowDuplicate(tenantId, row, cache);
    const existing = dup.existing;
    const nameConflict = dup.reason === "NAME" && !dup.byCode && !dup.byUrl;
    const brand = text(row.brand) || text(existing?.brand);
    const model = text(row.model) || text(existing?.model);
    const category = text(row.category) || text(existing?.category);
    const missingMeta = !brand || !model || !category;
    const fatalError = !text(row.code) || !text(row.name) || webImportNameLooksLikeUrl(row.name) || nameConflict;
    const priceAvailable = Number(row.price || 0) > 0 || Number(existing?.sale_price || 0) > 0;
    const changes = existing ? webImportRowChanges(row, existing) : [];
    const selectable = !row.ignored && !fatalError;
    let statusKey = "NEW";
    if (row.ignored) statusKey = "REMOVED";
    else if (fatalError) statusKey = "ERROR";
    else if (existing) statusKey = changes.length ? "UPDATE" : "CURRENT";
    else if (row.warning || missingMeta || !priceAvailable) statusKey = "WARNING";
    return {
      ...row, index, duplicate: dup.duplicate, duplicate_reason: dup.reason, existing_product: existing || null,
      display_brand: brand, display_model: model, display_category: category,
      missingMeta, fatalError, selectable, ready: selectable, statusKey, change_fields: changes,
      hasImage: !!text(row.image_url), hasDocs: !!(text(row.brochure_url)||text(row.manual_url)||text(row.ce_certificate_url))
    };
  });
}
function webImportFilterRows(rows = [], q = "", filter = "ALL") {
  let out = rows;
  const needle = foldTR(text(q));
  const key = upperTr(filter || "ALL");
  if (needle) out = out.filter((row) => foldTR(`${row.code} ${row.name} ${row.display_brand||row.brand} ${row.display_model||row.model} ${row.display_category||row.category} ${row.description}`).includes(needle));
  if (key === "REMOVED") return out.filter((row) => row.statusKey === "REMOVED");
  out = out.filter((row) => row.statusKey !== "REMOVED");
  if (key === "WARNING") return out.filter((row) => !!row.warning || row.missingMeta || (!row.existing_product && Number(row.price||0)<=0));
  if (key === "ERROR") return out.filter((row) => row.statusKey === "ERROR");
  if (key === "NEW") return out.filter((row) => !row.duplicate && row.statusKey !== "ERROR");
  if (key === "UPDATE") return out.filter((row) => row.statusKey === "UPDATE");
  if (key === "CURRENT") return out.filter((row) => row.statusKey === "CURRENT");
  if (key === "EXISTING") return out.filter((row) => row.duplicate);
  if (key === "SELECTED") return out.filter((row) => row.selected !== false && row.selectable);
  if (key === "IMAGE") return out.filter((row) => row.hasImage);
  if (key === "NO_IMAGE") return out.filter((row) => !row.hasImage);
  if (key === "DOCS") return out.filter((row) => row.hasDocs);
  if (key === "MISSING_META") return out.filter((row) => row.missingMeta);
  if (key === "PRICE_ZERO") return out.filter((row) => Number(row.price||0)<=0);
  if (key === "READY") return out.filter((row) => row.ready);
  return out;
}
function cleanupWebImportHistory(_tenantId, jobMaxAgeMs = 30 * 24 * 60 * 60 * 1000) {
  // Kalıcı denetim kaydı silinmez; yalnızca büyük geçici iş dosyaları zaman aşımında temizlenir.
  try { cleanupWebImportJobs(jobMaxAgeMs); } catch {}
}
function webImportPermissions() {
  return requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]);
}
r.get("/import-web", webImportPermissions(), (req, res) => {
  cleanupWebImportHistory(req.tenantId);
  res.render("products/import-web", {
    title: req.locale === "en" ? "Import Products from Website" : "Web Sitesinden Ürün Aktar",
    sources: webImportSources(req.tenantId),
    history: webImportHistoryRows(req.tenantId, 20)
  });
});
r.post("/import-web/source/save", webImportPermissions(), async (req, res, next) => {
  try {
    const sourceId = text(req.body.source_id) || id("wps"),
      name = text(req.body.name),
      base = await validateRemoteUrl(req.body.base_url),
      sitemapRaw = text(req.body.sitemap_url),
      sitemapCandidate = sitemapRaw ? (await validateRemoteUrl(new URL(sitemapRaw, base).toString())).toString() : "",
      sitemap = sitemapCandidate && looksLikeSitemapUrl(sitemapCandidate) ? sitemapCandidate : "",
      pattern = text(req.body.product_path_pattern) || "/urun/|/product/|/products/",
      batchSize = Math.min(30, Math.max(1, Number(req.body.batch_size) || 20));
    if (!name)
      throw Object.assign(new Error("Kaynak site adı zorunludur."), { status: 422, expose: true });
    const now = Date.now();
    db.prepare(
      `INSERT INTO web_product_sources(
        id,tenant_id,name,base_url,sitemap_url,product_path_pattern,settings_json,is_active,created_by,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(tenant_id,name) DO UPDATE SET
        base_url=excluded.base_url,
        sitemap_url=excluded.sitemap_url,
        product_path_pattern=excluded.product_path_pattern,
        settings_json=excluded.settings_json,
        is_active=1,
        updated_at=excluded.updated_at`
    ).run(
      sourceId,
      req.tenantId,
      name,
      base.origin,
      sitemap,
      pattern,
      JSON.stringify({
        batch_size: batchSize,
        auto_new_scan: sitemap ? selectedValue(req.body.auto_new_scan) : false,
        auto_price_sync: sitemap ? selectedValue(req.body.auto_price_sync) : false,
        new_scan_interval_days: 15,
        price_sync_interval_hours: 24
      }),
      1,
      req.user.id,
      now,
      now
    );
    audit(req, {
      action: "WEB_PRODUCT_SOURCE_SAVE",
      module: "PRODUCTS",
      entityId: sourceId,
      newValue: { name, base_url: base.origin, sitemap_url: sitemap, product_path_pattern: pattern }
    });
    flash(req, sitemapRaw && !sitemap ? "warning" : "success", sitemapRaw && !sitemap
      ? "Kaynak site kaydedildi. Girilen sitemap adresi sitemap/XML görünmediği için otomatik sitemap keşfi kullanılacak."
      : "Kaynak web sitesi kaydedildi.");
    res.redirect(303, "/products/import-web");
  } catch (error) {
    next(error);
  }
});

function webImportJobForReq(req) {
  const rawJob = readWebImportJob(req.params.jobId);
  const sameTenant = !!rawJob && rawJob.tenantId === req.tenantId;
  const ownJob = sameTenant && rawJob.userId === req.user?.id;
  const tenantAdmin = sameTenant && String(req.user?.role || "").toUpperCase() === "SUPER_ADMIN";
  if (!(ownJob || tenantAdmin))
    throw Object.assign(new Error("Web ürün tarama işi bulunamadı."), { status: 404, expose: true });
  const job = reconcileWebImportJob(rawJob);
  if (job?.historyId) updateWebImportHistoryFromJob(job.historyId, req.tenantId, job);
  return job;
}
function webImportRowPatch(body = {}) {
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, "selected")) patch.selected = selectedValue(body.selected);
  if (Object.prototype.hasOwnProperty.call(body, "ignored")) patch.ignored = selectedValue(body.ignored);
  if (Object.prototype.hasOwnProperty.call(body, "download_image")) patch.download_image = selectedValue(body.download_image);
  if (Object.prototype.hasOwnProperty.call(body, "duplicate_action")) {
    const action = upperTr(body.duplicate_action);
    patch.duplicate_action = ["UPDATE", "SKIP", "NEW"].includes(action) ? action : "UPDATE";
  }
  if (Object.prototype.hasOwnProperty.call(body, "code")) patch.code = text(body.code);
  if (Object.prototype.hasOwnProperty.call(body, "name")) patch.name = text(body.name);
  if (Object.prototype.hasOwnProperty.call(body, "description")) patch.description = text(body.description);
  if (Object.prototype.hasOwnProperty.call(body, "brand")) patch.brand = text(body.brand);
  if (Object.prototype.hasOwnProperty.call(body, "model")) patch.model = text(body.model);
  if (Object.prototype.hasOwnProperty.call(body, "category")) patch.category = text(body.category);
  if (Object.prototype.hasOwnProperty.call(body, "price")) patch.price = num(body.price);
  if (Object.prototype.hasOwnProperty.call(body, "currency")) patch.currency = upperTr(body.currency) || "TRY";
  if (Object.prototype.hasOwnProperty.call(body, "vat_rate")) patch.vat_rate = num(body.vat_rate, 20);
  if (Object.prototype.hasOwnProperty.call(body, "unit")) patch.unit = upperTr(body.unit) || "ADET";
  return patch;
}
function preparedWebRowsFromJob(rows = []) {
  return rows.filter((row) => row?.selected !== false).map((row) => ({
    code: upperTr(row.code),
    name: text(row.name),
    description_combined: text(row.description),
    brand: text(row.brand),
    model: text(row.model),
    category: text(row.category),
    unit: upperTr(row.unit) || "ADET",
    vat_rate: num(row.vat_rate, 20),
    sale_price: num(row.price),
    currency: upperTr(row.currency) || "TRY",
    image_url: safePublicUrl(row.image_url),
    product_url: safePublicUrl(row.product_url),
    brochure_url: safePublicUrl(row.brochure_url),
    manual_url: safePublicUrl(row.manual_url),
    ce_certificate_url: safePublicUrl(row.ce_certificate_url),
    duplicate_action: upperTr(row.duplicate_action) || "UPDATE",
    download_image: row.download_image !== false,
    web_import: true
  }));
}

r.post("/import-web/scan", webImportPermissions(), async (req, res, next) => {
  try {
    const saved = webImportSource(req.tenantId, text(req.body.source_id));
    let source;
    if (saved) {
      source = {
        id: saved.id,
        name: saved.name,
        base_url: saved.base_url,
        sitemap_url: looksLikeSitemapUrl(saved.sitemap_url || "") ? saved.sitemap_url : "",
        product_path_pattern: saved.product_path_pattern || "/urun/|/product/|/products/",
        max_products: 10000
      };
    } else {
      const base = await validateRemoteUrl(req.body.base_url);
      const sourceName = text(req.body.source_name) || base.hostname.replace(/^www\./i, "");
      const sitemapRaw = text(req.body.sitemap_url);
      source = {
        id: "",
        name: sourceName,
        base_url: base.origin,
        sitemap_url: sitemapRaw ? (() => {
          const candidate = new URL(sitemapRaw, base).toString();
          return looksLikeSitemapUrl(candidate) ? candidate : "";
        })() : "",
        product_path_pattern: text(req.body.product_path_pattern) || "/urun/|/product/|/products/",
        max_products: Math.min(20000, Math.max(100, Number(req.body.max_products) || 10000))
      };
    }
    const job = createWebImportJob({ tenantId: req.tenantId, userId: req.user.id, source });
    const child = launchWebImportWorker(job.id);
    const historyId = webImportHistory(req, {
      source_id: source.id || null,
      source_name: source.name,
      base_url: source.base_url,
      status: "QUEUED",
      details: { job_id: job.id }
    });
    writeWebImportJob(job.id, { pid: child.pid, historyId });
    res.redirect(303, `/products/import-web/scan/${job.id}`);
  } catch (error) { next(error); }
});

r.post("/import-web/scan/:jobId/retry", webImportPermissions(), (req, res, next) => {
  try {
    const job = webImportJobForReq(req);
    if (!["ERROR", "CANCELLED"].includes(job.status)) {
      throw Object.assign(new Error("Bu tarama şu anda yeniden başlatılabilir durumda değil."), { status: 409, expose: true });
    }
    const child = launchWebImportWorker(job.id);
    const nextJob = writeWebImportJob(job.id, {
      status: "QUEUED", stage: job.analysisCursor ? "analyze" : "queued", progress: null,
      pid: child.pid, error: null, completedAt: null,
      retryCount: Math.max(0, Number(job.retryCount || 0)) + 1,
      message: job.analysisCursor
        ? `${Number(job.analysisCursor)} sayfalık ilerleme korunarak tarama sürdürülecek.`
        : "Tarama yeniden başlatıldı."
    });
    if (job.historyId) updateWebImportHistoryFromJob(job.historyId, req.tenantId, nextJob);
    audit(req, { action: "WEB_PRODUCT_SCAN_RETRY", module: "PRODUCTS", entityId: job.id });
    res.redirect(303, `/products/import-web/scan/${job.id}`);
  } catch (error) { next(error); }
});

r.get("/import-web/scan/:jobId", webImportPermissions(), (req, res) => {
  const job = webImportJobForReq(req);
  res.render("products/import-web-scan", {
    title: "Web Sitesi Ürün Taraması", job
  });
});

r.get("/import-web/scan/:jobId/status", webImportPermissions(), (req, res) => {
  const job = webImportJobForReq(req);
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, job });
});

r.post("/import-web/scan/:jobId/cancel", webImportPermissions(), (req, res, next) => {
  try {
    const job = webImportJobForReq(req);
    if (!["QUEUED", "RUNNING"].includes(job.status)) {
      return res.status(409).json({ ok: false, message: "Bu tarama artık durdurulabilir durumda değil." });
    }
    const nextJob = writeWebImportJob(job.id, {
      status: "CANCELLED",
      stage: "cancelled",
      progress: null,
      message: "Tarama kullanıcı tarafından durduruldu.",
      completedAt: Date.now(),
      pid: null
    });
    if (job.pid && webImportPidAlive(job.pid)) {
      try { process.kill(Number(job.pid), "SIGTERM"); } catch {}
    }
    if (job.historyId) updateWebImportHistoryFromJob(job.historyId, req.tenantId, nextJob);
    audit(req, { action: "WEB_PRODUCT_SCAN_CANCEL", module: "PRODUCTS", entityId: job.id });
    if (wantsJson(req)) return res.json({ ok: true, job: nextJob });
    flash(req, "success", "Tarama durduruldu.");
    res.redirect(303, "/products/import-web/history");
  } catch (error) { next(error); }
});

r.get("/import-web/scan/:jobId/preview", webImportPermissions(), (req, res) => {
  const job = webImportJobForReq(req);
  if (!['READY','IMPORTED'].includes(job.status)) return res.redirect(`/products/import-web/scan/${job.id}`);
  const allRows = readWebImportRows(job.id);
  const q = foldTR(text(req.query.q));
  const filter = upperTr(req.query.filter || "ALL");
  const page = Math.max(1, Number(req.query.page) || 1);
  const maps = webImportExistingMaps(req.tenantId);
  const decorated = webImportDecoratedRows(req.tenantId, allRows, maps).filter((row) => row.name && !webImportNameLooksLikeUrl(row.name));
  let rows = webImportFilterRows(decorated, q, filter);
  const filteredTotal = rows.length;
  const requestedPerPage = upperTr(req.query.per_page || "50");
  const perPageValue = requestedPerPage === "ALL" ? "ALL" : [50, 100, 250].includes(Number(requestedPerPage)) ? String(Number(requestedPerPage)) : "50";
  const perPage = perPageValue === "ALL" ? Math.max(1, filteredTotal) : Number(perPageValue);
  const pages = Math.max(1, Math.ceil(filteredTotal / perPage));
  const safePage = Math.min(page, pages);
  const pageRows = rows.slice((safePage - 1) * perPage, safePage * perPage);
  res.render("products/import-web-preview", {
    title: "Web Sitesi Ürün Ön İzlemesi", source: job.source, job, rows: pageRows,
    totalRows: decorated.filter((row)=>row.statusKey!=="REMOVED").length, filteredTotal, page: safePage, pages, perPage, perPageValue, q: text(req.query.q), filter,
    selectedTotal: decorated.filter((row) => row.selected !== false && row.selectable).length,
    warningTotal: decorated.filter((row) => !!row.warning || row.missingMeta).length,
    existingTotal: decorated.filter((row) => row.duplicate && row.statusKey!=="REMOVED").length,
    newTotal: decorated.filter((row) => !row.duplicate && !["ERROR","REMOVED"].includes(row.statusKey)).length,
    updateTotal: decorated.filter((row) => row.statusKey==="UPDATE").length,
    currentTotal: decorated.filter((row) => row.statusKey==="CURRENT").length,
    errorTotal: decorated.filter((row) => row.statusKey==="ERROR").length
  });
});

r.post("/import-web/scan/:jobId/rows/select", webImportPermissions(), (req, res) => {
  const job = webImportJobForReq(req);
  if (job.status !== "READY") return res.status(409).json({ ok: false, message: "Tarama henüz düzenlemeye hazır değil." });
  const selected = selectedValue(req.body.selected);
  const rows = readWebImportRows(job.id);
  const maps = webImportExistingMaps(req.tenantId);
  const decorated = webImportDecoratedRows(req.tenantId, rows, maps);
  let wanted;
  if (upperTr(req.body.scope) === "FILTERED") {
    wanted = new Set(webImportFilterRows(decorated, text(req.body.q), upperTr(req.body.filter || "ALL")).map((row) => row.index));
  } else {
    wanted = new Set(String(req.body.indices || "").split(",").map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0));
  }
  const byIndex = new Map(decorated.map((row) => [row.index, row]));
  let changed = 0;
  rows.forEach((row, index) => {
    if (!wanted.has(index)) return;
    const view = byIndex.get(index);
    const nextSelected = !!(selected && view?.selectable);
    if (row.selected !== nextSelected) changed++;
    row.selected = nextSelected;
    row.duplicate_match = !!view?.duplicate;
    row.duplicate_reason = view?.duplicate_reason || "";
    if (["CODE", "URL"].includes(view?.duplicate_reason) && !row.duplicate_action) row.duplicate_action = "UPDATE";
  });
  writeWebImportRows(job.id, rows);
  const nextDecorated = webImportDecoratedRows(req.tenantId, rows, maps);
  const selectedCount = nextDecorated.filter((row) => row.selected !== false && row.selectable).length;
  writeWebImportJob(job.id, { selected: selectedCount });
  res.json({ ok: true, selected: selectedCount, changed });
});

r.post("/import-web/scan/:jobId/row/:index", webImportPermissions(), (req, res) => {
  const job = webImportJobForReq(req);
  if (job.status !== "READY") return res.status(409).json({ ok: false, message: "Tarama henüz düzenlemeye hazır değil." });
  let row = patchWebImportRow(job.id, req.params.index, webImportRowPatch(req.body));
  if (!row) return res.status(404).json({ ok: false, message: "Ürün satırı bulunamadı." });
  const dup = webImportRowDuplicate(req.tenantId, row);
  const decorated = webImportDecoratedRows(req.tenantId, [{ ...row, index:Number(req.params.index) }])[0];
  const patch = { duplicate_match:dup.duplicate, duplicate_reason:dup.reason };
  if (["CODE", "URL"].includes(dup.reason) && !row.duplicate_action) patch.duplicate_action = "UPDATE";
  if (!decorated.selectable) patch.selected = false;
  row = patchWebImportRow(job.id, req.params.index, patch);
  const rows = readWebImportRows(job.id);
  const views = webImportDecoratedRows(req.tenantId, rows);
  const selectedCount = views.filter((x) => x.selected !== false && x.selectable).length;
  writeWebImportJob(job.id, { selected: selectedCount });
  res.json({ ok: true, row, duplicate:dup.duplicate, duplicate_reason:dup.reason, status:decorated.statusKey, selectable:decorated.selectable, selected:selectedCount });
});

r.post("/import-web/scan/:jobId/save", webImportPermissions(), async (req, res, next) => {
  try {
    const job = webImportJobForReq(req);
    if (job.status !== "READY") throw Object.assign(new Error("Tarama sonucu kaydetmeye hazır değil."), { status: 409, expose: true });
    const rawRows = readWebImportRows(job.id);
    const maps = webImportExistingMaps(req.tenantId);
    const views = webImportDecoratedRows(req.tenantId, rawRows, maps);
    const allowed = new Set(views.filter((row) => row.selectable).map((row) => row.index));
    const selectedRows = rawRows.filter((row, index) => row?.selected !== false && allowed.has(index));
    if (!selectedRows.length) throw Object.assign(new Error("Kaydedilecek seçili ürün yok. Yeni veya mevcut ürünlerden aktarılacak satırları seçin."), { status: 422, expose: true });
    const invalid = selectedRows.find((row) => !text(row.code) || !text(row.name) || webImportNameLooksLikeUrl(row.name));
    if (invalid) throw Object.assign(new Error("Seçili ürünlerde gerçek ürün kodu ve ürün adı zorunludur."), { status: 422, expose: true });
    writeWebImportJob(job.id, { status:"IMPORTING", stage:"import", progress:0, importTotal:selectedRows.length, importProcessed:0, message:`${selectedRows.length} ürün aktarım kuyruğuna alındı.` });
    const workerPath = fileURLToPath(new URL("../workers/web-product-import-save.worker.js", import.meta.url));
    const child = spawn(process.execPath, [workerPath, job.id], { cwd:path.resolve(path.dirname(workerPath),"../.."), env:{...process.env}, detached:true, stdio:"ignore" });
    child.unref();
    writeWebImportJob(job.id, { importPid: child.pid });
    audit(req, { action:"PRODUCT_WEB_IMPORT_QUEUE", module:"PRODUCTS", newValue:{ job_id:job.id, selected:selectedRows.length } });
    res.redirect(303, `/products/import-web/scan/${job.id}`);
  } catch (error) { next(error); }
});

r.post("/import-web/source/:id/delete", webImportPermissions(), (req, res, next) => {
  try {
    const source = webImportSource(req.tenantId, req.params.id);
    if (!source)
      throw Object.assign(new Error("Kaynak site bulunamadı."), { status: 404, expose: true });
    db.prepare("UPDATE web_product_sources SET is_active=0,updated_at=? WHERE tenant_id=? AND id=?").run(
      Date.now(),
      req.tenantId,
      source.id
    );
    audit(req, { action: "WEB_PRODUCT_SOURCE_DISABLE", module: "PRODUCTS", entityId: source.id });
    flash(req, "success", "Kaynak site pasif duruma alındı.");
    res.redirect(303, "/products/import-web");
  } catch (error) {
    next(error);
  }
});
r.post("/import-web/analyze", webImportPermissions(), async (req, res, next) => {
  try {
    const source = webImportSource(req.tenantId, text(req.body.source_id));
    const directUrl = text(req.body.product_url);
    let rows = [],
      discovery = { total: 1, offset: 0, limit: 1, urls: directUrl ? [directUrl] : [], sitemap: "" },
      sourceView = source || {
        id: "",
        name: text(req.body.source_name) || "Tek Ürün Adresi",
        base_url: directUrl ? new URL((await validateRemoteUrl(directUrl)).toString()).origin : "",
        sitemap_url: "",
        product_path_pattern: ""
      };
    if (directUrl) {
      {
        const directRow = await analyzeProductUrl(directUrl);
        rows = directRow && !directRow.discarded && directRow.name && !webImportNameLooksLikeUrl(directRow.name) ? [directRow] : [];
      }
      if (!rows.length) throw Object.assign(new Error("Bu bağlantıdan güvenilir ürün adı ve ürün bilgisi alınamadı; bağlantı satırı sonuçlara eklenmedi."), { status: 422, expose: true });
    } else {
      if (!source)
        throw Object.assign(new Error("Site taraması için kayıtlı bir kaynak site seçin."), {
          status: 422,
          expose: true
        });
      let settings = {};
      try {
        settings = JSON.parse(source.settings_json || "{}");
      } catch {}
      discovery = await discoverProductUrls({
        baseUrl: source.base_url,
        sitemapUrl: source.sitemap_url,
        pattern: source.product_path_pattern,
        offset: Number(req.body.offset || 0),
        limit: Number(req.body.batch_size || settings.batch_size || 20)
      });
      if (!discovery.urls.length)
        throw Object.assign(
          new Error("Sitemap içinde ürün URL'si bulunamadı. Ürün URL kalıbını veya sitemap adresini kontrol edin."),
          { status: 422, expose: true }
        );
      rows = await analyzeUrls(discovery.urls, 4);
    }
    const warningCount = rows.filter((row) => row.warning).length;
    webImportHistory(req, {
      source_id: source?.id,
      source_name: sourceView.name,
      base_url: sourceView.base_url,
      status: "PREVIEW",
      discovered_count: discovery.total,
      analyzed_count: rows.length,
      warning_count: warningCount,
      details: { offset: discovery.offset, urls: discovery.urls }
    });
    res.render("products/import-web-preview", {
      title: req.locale === "en" ? "Website Import Preview" : "Web Sitesi Ürün Ön İzlemesi",
      source: sourceView,
      discovery,
      rows,
      existingCodes: new Set(
        db
          .prepare(`SELECT code FROM products WHERE tenant_id=? AND ${deletedWhere}`)
          .all(req.tenantId)
          .map((x) => String(x.code || "").toLocaleUpperCase("tr-TR"))
      )
    });
  } catch (error) {
    console.error("[web-product-import-analyze]", error);
    next(error);
  }
});
function submittedWebRows(bodyRows) {
  const entries = Array.isArray(bodyRows)
    ? bodyRows
    : Object.keys(bodyRows || {})
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => bodyRows[key]);
  return entries
    .filter((row) => selectedValue(row?.selected))
    .map((row) => ({
      code: upperTr(row.code),
      name: upperTr(row.name),
      description_combined: text(row.description),
      brand: upperTr(row.brand),
      model: upperTr(row.model),
      category: upperTr(row.category),
      unit: upperTr(row.unit) || "ADET",
      vat_rate: num(row.vat_rate, 20),
      sale_price: num(row.price),
      currency: upperTr(row.currency) || "TRY",
      image_url: safePublicUrl(row.image_url),
      product_url: safePublicUrl(row.product_url),
      duplicate_action: upperTr(row.duplicate_action) || "UPDATE",
      download_image: selectedValue(row.download_image),
      web_import: true
    }));
}
r.post("/import-web/save", webImportPermissions(), async (req, res, next) => {
  try {
    const source = webImportSource(req.tenantId, text(req.body.source_id)),
      sourceName = text(req.body.source_name) || source?.name || "Web sitesi",
      baseUrl = text(req.body.base_url) || source?.base_url || "";
    let rows = submittedWebRows(req.body.rows);
    if (!rows.length)
      throw Object.assign(new Error("Kaydedilecek en az bir ürün seçin."), { status: 422, expose: true });
    const invalid = rows.find((row) => !row.code || !row.name);
    if (invalid)
      throw Object.assign(
        new Error("Seçili her üründe ürün kodu ve ürün adı zorunludur. Ön izlemede eksik kodları tamamlayın."),
        { status: 422, expose: true }
      );
    let duplicateSkipped = 0,
      imageWarnings = 0;
    const prepared = [];
    for (const row of rows) {
      const exists = db.prepare("SELECT * FROM products WHERE tenant_id=? AND code=?").get(req.tenantId, row.code);
      if (exists && row.duplicate_action === "SKIP") {
        duplicateSkipped++;
        continue;
      }
      let next = { ...row };
      if (exists && row.duplicate_action === "NEW") {
        let n = 2,
          code = `${row.code}-${n}`;
        while (db.prepare("SELECT 1 FROM products WHERE tenant_id=? AND code=?").get(req.tenantId, code))
          code = `${row.code}-${++n}`;
        next.code = code;
      }
      if (row.download_image && /^https?:\/\//i.test(row.image_url || "")) {
        try {
          next.image_url = await downloadProductImage(row.image_url, req.tenantId);
        } catch (error) {
          imageWarnings++;
          console.warn("[web-product-image]", row.code, error?.message || error);
          next.image_url = exists?.image_url || "";
        }
      }
      prepared.push(next);
    }
    const before = new Map(
      prepared.map((row) => [
        row.code,
        !!db.prepare("SELECT 1 FROM products WHERE tenant_id=? AND code=?").get(req.tenantId, row.code)
      ])
    );
    const result = upsertImported(req.tenantId, prepared, hasPermission(req.user, "financials", "edit"));
    const updated = [...before.values()].filter(Boolean).length,
      added = Math.max(0, result.total - updated);
    result.added = added;
    result.updated = updated;
    result.skipped += duplicateSkipped;
    webImportHistory(req, {
      source_id: source?.id,
      source_name: sourceName,
      base_url: baseUrl,
      status: "SAVED",
      analyzed_count: rows.length,
      selected_count: rows.length,
      added_count: result.added,
      updated_count: result.updated,
      skipped_count: result.skipped,
      warning_count: imageWarnings,
      details: { image_warnings: imageWarnings }
    });
    audit(req, {
      action: "PRODUCT_WEB_IMPORT_SAVE",
      module: "PRODUCTS",
      newValue: {
        source: sourceName,
        base_url: baseUrl,
        selected: rows.length,
        added: result.added,
        updated: result.updated,
        skipped: result.skipped,
        image_warnings: imageWarnings
      }
    });
    flash(
      req,
      imageWarnings ? "warning" : "success",
      `${result.added} yeni ürün eklendi, ${result.updated} ürün güncellendi, ${result.skipped} ürün atlandı.${imageWarnings ? ` ${imageWarnings} görsel indirilemedi; ürün verisi yine kaydedildi.` : ""}`
    );
    res.redirect(303, "/products");
  } catch (error) {
    console.error("[web-product-import-save]", error);
    next(error);
  }
});
r.post("/import-web/history/:id/delete", webImportPermissions(), (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM web_product_import_history WHERE tenant_id=? AND id=?").get(req.tenantId, req.params.id);
    if (!row) throw Object.assign(new Error("Tarama geçmişi bulunamadı."), { status:404, expose:true });
    const details = parseWebImportHistoryDetails(row);
    const job = details.job_id ? readWebImportJob(details.job_id) : null;
    if (job && ["QUEUED","RUNNING","IMPORTING"].includes(job.status)) throw Object.assign(new Error("Çalışan tarama/aktarım silinemez; önce durdurun."), {status:409,expose:true});
    if (details.job_id) { try { deleteWebImportJob(details.job_id); } catch {} }
    db.prepare("DELETE FROM web_product_import_history WHERE tenant_id=? AND id=?").run(req.tenantId, row.id);
    flash(req,"success","Tarama geçmişi ve geçici sonuç dosyaları silindi.");
    res.redirect(303,"/products/import-web/history");
  } catch (error) { next(error); }
});
r.post("/import-web/history-cleanup", webImportPermissions(), (req, res) => {
  cleanupWebImportHistory(req.tenantId, 30*24*60*60*1000);
  flash(req,"success","Geçici tarama dosyaları temizlendi; kalıcı aktarım sayaçları korundu.");
  res.redirect(303,"/products/import-web/history");
});

r.get("/import-web/history", webImportPermissions(), (req, res) => {
  cleanupWebImportHistory(req.tenantId);
  res.render("products/import-web-history", {
    title: req.locale === "en" ? "Website Import History" : "Web Sitesi Tarama / Aktarım Geçmişi",
    history: webImportHistoryRows(req.tenantId, 200)
  });
});

r.get("/picker-json", productView, productSearchRows);
r.get("/lookup-json", productView, productSearchRows);
r.get("/api/search", productView, productSearchRows);

r.get("/:id/alternatives", productView, (req, res) => {
  ensureProductAlternativeSchema();
  const main = db
    .prepare(`SELECT id,code,name FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
    .get(req.tenantId, req.params.id);
  if (!main) return res.status(404).json({ ok: false, message: "Ana ürün bulunamadı." });
  const items = db
    .prepare(
      `SELECT pa.id AS relation_id,pa.alternative_type,pa.note,p.* FROM product_alternatives pa JOIN products p ON p.tenant_id=pa.tenant_id AND p.id=pa.alternative_product_id WHERE pa.tenant_id=? AND pa.product_id=? AND ${deletedWhere.replaceAll("deleted_at", "p.deleted_at").replaceAll("status,'ACTIVE'", "p.status,'ACTIVE'")} ORDER BY pa.created_at DESC`
    )
    .all(req.tenantId, req.params.id)
    .map((row) => ({
      ...normalizeProduct(row, canSeeFinancials(req)),
      relation_id: row.relation_id,
      alternative_type: row.alternative_type,
      note: row.note,
      main_product: main
    }));
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, main, items });
});
r.post("/:id/alternatives", productEdit, (req, res, next) => {
  try {
    ensureProductAlternativeSchema();
    const main = db
        .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
        .get(req.tenantId, req.params.id),
      alt = db
        .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
        .get(req.tenantId, String(req.body.alternative_product_id || ""));
    if (!main || !alt)
      throw Object.assign(new Error("Ana ürün veya muadil ürün bulunamadı."), { status: 404, expose: true });
    if (main.id === alt.id)
      throw Object.assign(new Error("Bir ürün kendisinin muadili olamaz."), { status: 422, expose: true });
    const type = ["LOCAL", "ECONOMIC", "PREMIUM", "EQUIVALENT", "IN_STOCK"].includes(
      String(req.body.alternative_type || "")
    )
      ? String(req.body.alternative_type)
      : "EQUIVALENT";
    db.prepare(
      `INSERT INTO product_alternatives(id,tenant_id,product_id,alternative_product_id,alternative_type,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,product_id,alternative_product_id) DO UPDATE SET alternative_type=excluded.alternative_type,note=excluded.note`
    ).run(id("pal"), req.tenantId, main.id, alt.id, type, text(req.body.note), req.user.id, Date.now());
    audit(req, {
      action: "PRODUCT_ALTERNATIVE_SAVE",
      module: "PRODUCTS",
      entityId: main.id,
      newValue: { alternative_product_id: alt.id, type }
    });
    flash(req, "success", "Muadil ürün bağlantısı kaydedildi.");
    res.redirect(`/products/${main.id}/edit`);
  } catch (e) {
    next(e);
  }
});
r.post("/:id/alternatives/:relationId/delete", productEdit, (req, res, next) => {
  try {
    const old = db
      .prepare("SELECT * FROM product_alternatives WHERE tenant_id=? AND product_id=? AND id=?")
      .get(req.tenantId, req.params.id, req.params.relationId);
    if (!old) throw Object.assign(new Error("Muadil bağlantısı bulunamadı."), { status: 404, expose: true });
    db.prepare("DELETE FROM product_alternatives WHERE tenant_id=? AND product_id=? AND id=?").run(
      req.tenantId,
      req.params.id,
      req.params.relationId
    );
    audit(req, {
      action: "PRODUCT_ALTERNATIVE_DELETE",
      module: "PRODUCTS",
      entityId: req.params.id,
      oldValue: old
    });
    flash(req, "success", "Muadil ürün bağlantısı kaldırıldı.");
    res.redirect(`/products/${req.params.id}/edit`);
  } catch (e) {
    next(e);
  }
});
r.get("/:id/edit", productEdit, (req, res) => {
  const row = db
    .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Ürün bulunamadı."), { status: 404, expose: true });
  res.render("products/form", {
    title: "Ürün veya Hizmeti Düzenle",
    row,
    canFinancials: hasPermission(req.user, "financials", "view"),
    canEditFinancials: hasPermission(req.user, "financials", "edit"),
    ...productFormRelations(req.tenantId, row.id)
  });
});
r.get("/:id/catalog-print", productView, (req, res) => {
  const row = db
    .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Ürün bulunamadı."), { status: 404, expose: true });
  res.setHeader("Cache-Control", "no-store");
  res.render("products/catalog-print", {
    layout: false,
    row,
    locale: req.locale || "tr",
    autoPrint: String(req.query.auto || "") === "1"
  });
});
r.get("/:id/document/:kind/preview", productView, (req, res, next) => {
  const fields = { brochure: "brochure_url", ce: "ce_certificate_url", manual: "manual_url" };
  const field = fields[String(req.params.kind || "").toLowerCase()];
  if (!field) throw Object.assign(new Error("Belge türü geçersiz."), { status: 404, expose: true });
  const row = db.prepare(`SELECT ${field} AS document_url FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`).get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Ürün bulunamadı."), { status: 404, expose: true });
  const relative = normalizeUploadRelative(row.document_url);
  if (!relative || path.extname(relative).toLowerCase() !== ".pdf")
    throw Object.assign(new Error("Ön izlenecek PDF belge bulunamadı."), { status: 404, expose: true });
  const root = path.resolve(config.publicUploadDir);
  const full = path.resolve(root, relative);
  const relation = path.relative(root, full);
  if (!relation || relation.startsWith("..") || path.isAbsolute(relation) || !fs.existsSync(full))
    throw Object.assign(new Error("Belge dosyası bulunamadı."), { status: 404, expose: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${path.basename(full).replace(/["\\]/g, "-")}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self'; object-src 'self'");
  res.sendFile(full, (error) => { if (error) next(error); });
});
r.get("/:id/preview", productView, (req, res) => {
  const row = db
    .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Ürün bulunamadı."), { status: 404, expose: true });
  const priceHistory = db
    .prepare(
      `SELECT * FROM product_price_history WHERE tenant_id=? AND product_id=? ORDER BY created_at DESC LIMIT 12`
    )
    .all(req.tenantId, row.id);
  const quoteUsage = db
    .prepare(
      `SELECT DISTINCT q.id,q.quote_no,q.revision_no,q.quote_date,q.status,q.currency,q.grand_total,q.updated_at,q.customer_snapshot_json
       FROM quote_items qi JOIN quotes q ON q.id=qi.quote_id
      WHERE q.tenant_id=? AND qi.product_id=? AND COALESCE(qi.deleted_at,0)=0 AND COALESCE(q.deleted_at,0)=0
      ORDER BY q.updated_at DESC LIMIT 50`
    )
    .all(req.tenantId, row.id)
    .map((quote) => {
      let customer = {};
      try {
        customer = JSON.parse(quote.customer_snapshot_json || "{}");
      } catch {}
      return { ...quote, customer_name: customer.company_name || "-" };
    });
  const usageCount = Number(
    db
      .prepare(
        `SELECT COUNT(DISTINCT q.id) AS n FROM quote_items qi JOIN quotes q ON q.id=qi.quote_id WHERE q.tenant_id=? AND qi.product_id=? AND COALESCE(qi.deleted_at,0)=0 AND COALESCE(q.deleted_at,0)=0`
      )
      .get(req.tenantId, row.id)?.n || 0
  );
  res.setHeader("Cache-Control", "no-store");
  res.render("products/preview", {
    layout: false,
    row,
    canEdit: hasPermission(req.user, "products", "edit"),
    canEditFinancials: hasPermission(req.user, "financials", "edit"),
    canArchive: hasPermission(req.user, "products", "archive"),
    priceHistory,
    lastPriceHistory: priceHistory[0] || null,
    quoteUsage,
    usageCount,
    showMoney: true,
    locale: req.locale || "tr"
  });
});
r.post(
  "/:id/image",
  productEdit,
  productUpload.single("image"),
  validateUploads,
  (req, res, next) => {
    try {
      const old = db
        .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
        .get(req.tenantId, req.params.id);
      if (!old)
        throw Object.assign(new Error("Ürün bulunamadı."), { status: 404, expose: true });
      const imageUrl = publicFile(req.file);
      if (!imageUrl)
        throw Object.assign(new Error("Yüklenecek ürün görselini seçin."), { status: 422, expose: true });
      const now = Date.now();
      db.prepare(
        "UPDATE products SET image_url=?,image_path=?,updated_at=? WHERE tenant_id=? AND id=?"
      ).run(imageUrl, imageUrl, now, req.tenantId, old.id);
      const row = db
        .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
        .get(req.tenantId, old.id);
      audit(req, {
        action: "PRODUCT_IMAGE_UPDATE",
        module: "PRODUCTS",
        entityId: old.id,
        oldValue: { image_url: old.image_url, image_path: old.image_path },
        newValue: { image_url: row?.image_url, image_path: row?.image_path }
      });
      return res.json({ ok: true, image_url: safeAssetUrl(row?.image_url || imageUrl) });
    } catch (e) {
      if (req.accepts(["json", "html"]) === "json")
        return res.status(e.status || 500).json({
          error: "image_upload_failed",
          message: e.expose ? e.message : "Ürün görseli yüklenemedi."
        });
      next(e);
    }
  }
);
r.post(
  "/save",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  productUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "brochure", maxCount: 1 },
    { name: "ce_certificate", maxCount: 1 },
    { name: "user_manual", maxCount: 1 }
  ]),
  validateUploads,
  (req, res, next) => {
    let persisted = false;
    try {
      const b = productBody(req.body || {});
      if (!b.code || !b.name)
        throw Object.assign(new Error("Ürün kodu ve ürün adı zorunludur."), { status: 422, expose: true });
      const oldById = req.body.id
        ? db.prepare(`SELECT * FROM products WHERE tenant_id=? AND id=?`).get(req.tenantId, req.body.id)
        : null;
      const oldByCode = !oldById
        ? db.prepare(`SELECT * FROM products WHERE tenant_id=? AND code=?`).get(req.tenantId, b.code)
        : null;
      const old = oldById || oldByCode || null;
      if (old && !hasPermission(req.user, "products", "edit"))
        throw Object.assign(new Error("Mevcut ürünü düzenleme yetkiniz yok."), { status: 403, expose: true });
      if (!old && !hasPermission(req.user, "products", "create"))
        throw Object.assign(new Error("Yeni ürün oluşturma yetkiniz yok."), { status: 403, expose: true });
      const canEditFinancials = hasPermission(req.user, "financials", "edit");
      const now = Date.now(),
        pid = old?.id || id("prd");
      const uploadedImage = publicFile(req.files?.image?.[0]);
      const uploadedBrochure = publicFile(req.files?.brochure?.[0]);
      const uploadedCe = publicFile(req.files?.ce_certificate?.[0]);
      const uploadedManual = publicFile(req.files?.user_manual?.[0]);
      const v = {
        ...b,
        barcode: req.body.barcode !== undefined ? b.barcode : old?.barcode || "",
        id: pid,
        tenant_id: req.tenantId,
        product_code: b.code,
        image_url: uploadedImage || old?.image_url || null,
        brochure_url:
          uploadedBrochure || (String(req.body.remove_brochure || "") === "1" ? null : old?.brochure_url || null),
        image_path: uploadedImage || old?.image_path || old?.image_url || null,
        brochure_path:
          uploadedBrochure || (String(req.body.remove_brochure || "") === "1" ? null : old?.brochure_path || old?.brochure_url || null),
        ce_certificate_url:
          uploadedCe ||
          (String(req.body.remove_ce_certificate || "") === "1" ? null : old?.ce_certificate_url || null),
        manual_url:
          uploadedManual ||
          (String(req.body.remove_user_manual || "") === "1" ? null : old?.manual_url || null),
        ce_certificate_path:
          uploadedCe ||
          (String(req.body.remove_ce_certificate || "") === "1"
            ? null
            : old?.ce_certificate_path || old?.ce_certificate_url || null),
        manual_path:
          uploadedManual ||
          (String(req.body.remove_user_manual || "") === "1"
            ? null
            : old?.manual_path || old?.manual_url || null),
        gtip: b.gtip_no || old?.gtip || "",
        origin: b.origin_country || old?.origin || "",
        purchase_price: canEditFinancials
          ? req.body.purchase_price !== undefined
            ? num(b.purchase_price, 0)
            : num(old?.purchase_price, 0)
          : num(old?.purchase_price, 0),
        stock_qty: canEditFinancials ? num(b.stock_qty, 0) : num(old?.stock_qty, 0),
        supplier_name: canEditFinancials ? b.supplier_name : old?.supplier_name || "",
        min_stock_qty: canEditFinancials ? num(b.min_stock_qty, 0) : num(old?.min_stock_qty, 0),
        profit_rate: canEditFinancials
          ? req.body.profit_rate !== undefined
            ? num(b.profit_rate, 0)
            : num(old?.profit_rate, 0)
          : num(old?.profit_rate, 0),
        vat_rate: req.body.vat_rate !== undefined ? num(b.vat_rate, 20) : num(old?.vat_rate, 20),
        sale_price: canEditFinancials ? num(b.sale_price, 0) : num(old?.sale_price, 0),
        currency: canEditFinancials ? b.currency : old?.currency || b.currency || "TRY",
        deleted_at: null,
        deleted_by: null,
        created_at: old?.created_at || now,
        updated_at: now
      };
      v.search_text = productSearch(v);
      db.prepare(
        `INSERT INTO products(id,tenant_id,code,barcode,gtip_no,origin_country,name,brand,model,category,short_description,technical_description,image_url,brochure_url,product_url,unit,vat_rate,sale_price,currency,purchase_price,stock_qty,supplier_name,min_stock_qty,profit_rate,status,deleted_at,deleted_by,search_text,created_at,updated_at,product_code,image_path,brochure_path,ce_certificate_url,manual_url,ce_certificate_path,manual_path,gtip,origin)
    VALUES(@id,@tenant_id,@code,@barcode,@gtip_no,@origin_country,@name,@brand,@model,@category,@short_description,@technical_description,@image_url,@brochure_url,@product_url,@unit,@vat_rate,@sale_price,@currency,@purchase_price,@stock_qty,@supplier_name,@min_stock_qty,@profit_rate,@status,@deleted_at,@deleted_by,@search_text,@created_at,@updated_at,@product_code,@image_path,@brochure_path,@ce_certificate_url,@manual_url,@ce_certificate_path,@manual_path,@gtip,@origin)
    ON CONFLICT(id) DO UPDATE SET code=excluded.code,barcode=excluded.barcode,gtip_no=excluded.gtip_no,origin_country=excluded.origin_country,name=excluded.name,brand=excluded.brand,model=excluded.model,category=excluded.category,short_description=excluded.short_description,technical_description=excluded.technical_description,image_url=excluded.image_url,brochure_url=excluded.brochure_url,product_url=excluded.product_url,unit=excluded.unit,vat_rate=excluded.vat_rate,sale_price=excluded.sale_price,currency=excluded.currency,purchase_price=excluded.purchase_price,stock_qty=excluded.stock_qty,supplier_name=excluded.supplier_name,min_stock_qty=excluded.min_stock_qty,profit_rate=excluded.profit_rate,status=excluded.status,deleted_at=NULL,deleted_by=NULL,search_text=excluded.search_text,updated_at=excluded.updated_at,product_code=excluded.product_code,image_path=excluded.image_path,brochure_path=excluded.brochure_path,ce_certificate_url=excluded.ce_certificate_url,manual_url=excluded.manual_url,ce_certificate_path=excluded.ce_certificate_path,manual_path=excluded.manual_path,gtip=excluded.gtip,origin=excluded.origin`
      ).run(v);
      persisted = true;
      if (old && canEditFinancials)
        recordProductPriceChange(req, pid, old.sale_price, v.sale_price, v.currency, "DIRECT");
      const row = db.prepare(`SELECT * FROM products WHERE tenant_id=? AND id=?`).get(req.tenantId, pid) || v;
      audit(req, {
        action: old ? "PRODUCT_UPDATE" : "PRODUCT_CREATE",
        module: "PRODUCTS",
        entityId: pid,
        oldValue: old,
        newValue: row
      });
      if (wantsJson(req))
        return res.json({
          ...normalizeProduct(row, canSeeFinancials(req)),
          ok: true,
          message: old ? "Ürün başarıyla güncellendi." : "Ürün başarıyla kaydedildi.",
          documents: {
            brochure_url: row.brochure_url || "",
            ce_certificate_url: row.ce_certificate_url || "",
            manual_url: row.manual_url || ""
          }
        });
      flash(req, "success", "Ürün veya hizmet kaydedildi.");
      res.redirect("/products");
    } catch (e) {
      if (!persisted) cleanupUploadedFiles(req);
      console.error("[product save failed]", e);
      if (String(e.message).includes("UNIQUE")) {
        e.status = 409;
        e.expose = true;
        e.message = "Bu ürün kodu daha önce kullanılmış veya arşivde kayıtlı. Kayıt güncellenemedi.";
      }
      const msg = e.expose
        ? e.message
        : e.message && /no such column|has no column|NOT NULL|FOREIGN KEY|constraint|SQLITE/i.test(e.message)
          ? `Ürün kaydedilemedi: ${e.message}`
          : "Ürün kaydedilemedi.";
      if (wantsJson(req)) return res.status(e.status || 500).json({ error: "save_failed", message: msg });
      next(Object.assign(e, { message: msg, expose: true }));
    }
  }
);
r.post(
  "/line-update",
  productEdit,
  productUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "brochure", maxCount: 1 },
    { name: "ce_certificate", maxCount: 1 },
    { name: "user_manual", maxCount: 1 }
  ]),
  validateUploads,
  (req, res) => {
    try {
      const pid = text(req.body.product_id),
        old = pid
          ? db
              .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
              .get(req.tenantId, pid)
          : null;
      const patch = {
        code: upperTr(req.body.code || old?.code),
        gtip_no: upperTr(req.body.gtip_no ?? old?.gtip_no),
        origin_country: upperTr(req.body.origin_country ?? old?.origin_country),
        name: upperTr(req.body.name || old?.name),
        short_description: text(
          req.body.description_combined ?? req.body.short_description ?? old?.short_description
        ),
        technical_description: "",
        image_url:
          publicFile(req.files?.image?.[0]) ||
          safeAssetUrl(req.body.image_url) ||
          safeAssetUrl(old?.image_url),
        brochure_url:
          publicFile(req.files?.brochure?.[0]) ||
          safeAssetUrl(req.body.brochure_url) ||
          safeAssetUrl(old?.brochure_url),
        ce_certificate_url:
          publicFile(req.files?.ce_certificate?.[0]) ||
          safeAssetUrl(req.body.ce_certificate_url) ||
          safeAssetUrl(old?.ce_certificate_url),
        manual_url:
          publicFile(req.files?.user_manual?.[0]) ||
          safeAssetUrl(req.body.manual_url) ||
          safeAssetUrl(old?.manual_url),
        sale_price: num(req.body.sale_price, old?.sale_price || 0),
        currency: upperTr(req.body.currency || old?.currency) || "TRY",
        unit: upperTr(req.body.unit || old?.unit) || "ADET",
        vat_rate: num(req.body.vat_rate, old?.vat_rate ?? 20)
      };
      patch.search_text = productSearch({ ...old, ...patch });
      if (!patch.code || !patch.name)
        throw Object.assign(new Error("Ürün kodu ve ürün adı zorunludur."), { status: 422, expose: true });
      if (old) {
        db.prepare(
          "UPDATE products SET code=?,gtip_no=?,origin_country=?,name=?,short_description=?,technical_description=?,image_url=?,brochure_url=?,ce_certificate_url=?,manual_url=?,sale_price=?,currency=?,unit=?,vat_rate=?,search_text=?,updated_at=? WHERE tenant_id=? AND id=?"
        ).run(
          patch.code,
          patch.gtip_no,
          patch.origin_country,
          patch.name,
          patch.short_description,
          patch.technical_description,
          patch.image_url || null,
          patch.brochure_url || null,
          patch.ce_certificate_url || null,
          patch.manual_url || null,
          patch.sale_price,
          patch.currency,
          patch.unit,
          patch.vat_rate,
          patch.search_text,
          Date.now(),
          req.tenantId,
          old.id
        );
        recordProductPriceChange(req, old.id, old.sale_price, patch.sale_price, patch.currency, "QUOTE_LINE");
        const row = db
          .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
          .get(req.tenantId, old.id);
        audit(req, {
          action: "PRODUCT_UPDATE_FROM_QUOTE",
          module: "PRODUCTS",
          entityId: old.id,
          oldValue: old,
          newValue: row
        });
        return res.json({ ...normalizeProduct(row, canSeeFinancials(req)), updated_master: true });
      }
      return res.json({ ...patch, id: "", updated_master: false });
    } catch (e) {
      if (String(e.message).includes("UNIQUE")) {
        e.status = 409;
        e.expose = true;
        e.message = "Bu ürün kodu daha önce kullanılmış.";
      }
      return res
        .status(e.status || 500)
        .json({ error: "line_update_failed", message: e.expose ? e.message : "Ürün satırı güncellenemedi." });
    }
  }
);

function proformaImportUpload(req, res, next) {
  documentImportUpload.single("proforma_file")(req, res, (uploadError) => {
    if (uploadError) {
      const code = String(uploadError.code || "");
      const message =
        code === "LIMIT_FILE_SIZE"
          ? req.locale === "en"
            ? "The proforma file is larger than 100 MB."
            : "Proforma dosyası 100 MB sınırını aşıyor."
          : String(
              uploadError.message ||
                (req.locale === "en"
                  ? "The proforma file could not be uploaded."
                  : "Proforma dosyası yüklenemedi.")
            );
      try {
        if (req.file?.path) fs.rmSync(req.file.path, { force: true });
      } catch {}
      flash(req, "error", message);
      return res.redirect(303, "/products/import-proforma");
    }
    validateUploads(req, res, (validationError) => {
      if (validationError) {
        try {
          if (req.file?.path) fs.rmSync(req.file.path, { force: true });
        } catch {}
        flash(req, "error", String(validationError.message || "Yüklenen dosya doğrulanamadı."));
        return res.redirect(303, "/products/import-proforma");
      }
      next();
    });
  });
}
const importWorkers = new Map();
function importProcessCommand(pid) {
  try {
    return fs
      .readFileSync(`/proc/${Number(pid)}/cmdline`, "utf8")
      .replace(/\0/g, " ")
      .trim();
  } catch {
    return "";
  }
}
function verifiedImportPid(pid, jobId) {
  const n = Number(pid),
    token = String(jobId || "");
  if (!Number.isInteger(n) || n <= 1 || n === process.pid || !token) return false;
  const command = importProcessCommand(n);
  return Boolean(
    command &&
      command.includes(token) &&
      (command.includes("proforma-import.worker.js") || /(^|\s)timeout(\s|$)/.test(command))
  );
}
function signalImportPid(pid, jobId, signal, { group = false } = {}) {
  const n = Number(pid);
  if (!verifiedImportPid(n, jobId)) return false;
  try {
    process.kill(group ? -n : n, signal);
    return true;
  } catch {
    return false;
  }
}
function stopImportWorker(job) {
  const child = importWorkers.get(job.id),
    controllerPid = Number(child?.pid || job.controllerPid),
    workerPid = Number(job.workerPid);
  // Yalnızca komut satırında bu aktarım işinin kimliği doğrulanan alt süreçler durdurulur.
  // Eski/stale PID değerlerine körlemesine sinyal gönderilmez; ana CRM süreci veya başka servis öldürülemez.
  signalImportPid(controllerPid, job.id, "SIGTERM", { group: true }) ||
    signalImportPid(controllerPid, job.id, "SIGTERM");
  if (workerPid !== controllerPid) signalImportPid(workerPid, job.id, "SIGTERM");
  const forceTimer = setTimeout(() => {
    signalImportPid(controllerPid, job.id, "SIGKILL", { group: true }) ||
      signalImportPid(controllerPid, job.id, "SIGKILL");
    if (workerPid !== controllerPid) signalImportPid(workerPid, job.id, "SIGKILL");
  }, 1600);
  forceTimer.unref?.();
  importWorkers.delete(job.id);
}
function startImportWorker(job) {
  const workerPath = fileURLToPath(new URL("../workers/proforma-import.worker.js", import.meta.url));
  // PDF/OCR işi ayrı process grubunda çalışır. PDF için geniş ama kontrollü süre,
  // Excel/CSV için daha kısa süre uygulanır; ana Express süreci hiçbir zaman beklemez.
  const ext = path.extname(job?.file?.originalname || "").toLowerCase();
  const timeoutSeconds = ext === ".pdf" ? 600 : 180;
  const child = spawn(
    "timeout",
    ["--signal=TERM", "--kill-after=8s", `${timeoutSeconds}s`, process.execPath, workerPath, job.id],
    {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, PRODUCT_IMPORT_WORKER: "1", PRODUCT_IMPORT_TIMEOUT: String(timeoutSeconds) }
    }
  );
  child.unref();
  importWorkers.set(job.id, child);
  try {
    os.setPriority(child.pid, 15);
  } catch {}
  writeImportJob(job.id, {
    controllerPid: child.pid,
    status: "RUNNING",
    stage: "starting",
    progress: 5,
    timeoutSeconds,
    message: "Dosya doğrulandı; arka plan okuyucusu başlatıldı."
  });
  child.once("exit", (code, signal) => {
    importWorkers.delete(job.id);
    const current = readImportJob(job.id);
    if (current && current.status === "RUNNING") {
      const timedOut = code === 124 || code === 137;
      writeImportJob(job.id, {
        status: "FAILED",
        stage: "failed",
        progress: Number(current.progress || 0),
        error: timedOut
          ? `Tarama ${timeoutSeconds} saniyelik güvenli süre sınırını aştığı için durduruldu.`
          : "Tarama alt işlemi beklenmedik biçimde kapandı.",
        exitCode: code,
        exitSignal: signal
      });
    }
  });
}
r.post(
  "/import-proforma/analyze",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  proformaImportUpload,
  (req, res, next) => {
    try {
      if (!req.file)
        throw Object.assign(
          new Error(
            req.locale === "en"
              ? "No PDF or Excel proforma file was selected."
              : "PDF veya Excel proforma dosyası seçilmedi."
          ),
          { status: 422, expose: true }
        );
      const job = createImportJob({ tenantId: req.tenantId, userId: req.user.id, file: req.file });
      startImportWorker(job);
      try {
        audit(req, {
          action: "PRODUCT_PROFORMA_IMPORT_QUEUED",
          module: "PRODUCTS",
          newValue: { jobId: job.id, file: req.file.originalname, size: req.file.size }
        });
      } catch {}
      if (
        req.get("X-Requested-With") === "XMLHttpRequest" ||
        String(req.get("accept") || "").includes("application/json")
      )
        return res.status(202).json({
          ok: true,
          jobId: job.id,
          statusUrl: `/products/import-proforma/jobs/${job.id}`,
          cancelUrl: `/products/import-proforma/jobs/${job.id}/cancel`
        });
      return res.redirect(303, `/products/import-proforma?job=${encodeURIComponent(job.id)}`);
    } catch (error) {
      try {
        if (req.file?.path) fs.rmSync(req.file.path, { force: true });
      } catch {}
      next(error);
    }
  }
);
r.get(
  "/import-proforma/jobs/:jobId",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  (req, res) => {
    const job = readImportJob(req.params.jobId);
    if (!ownsImportJob(job, req.tenantId, req.user.id))
      return res.status(404).json({ ok: false, error: "not_found" });
    res.setHeader("Cache-Control", "no-store");
    res.json({
      ok: true,
      id: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress || 0,
      message: job.message || null,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      detectedCount: job.detectedCount || 0,
      previewUrl: job.previewUrl || null,
      error: job.error || null,
      code: job.code || null,
      ocrUsed: Boolean(job.ocrUsed),
      sourceKind: job.sourceKind || null,
      timeoutSeconds: job.timeoutSeconds || null
    });
  }
);
r.post(
  "/import-proforma/jobs/:jobId/cancel",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  (req, res) => {
    const job = readImportJob(req.params.jobId);
    if (!ownsImportJob(job, req.tenantId, req.user.id))
      return res.status(404).json({ ok: false, error: "not_found" });
    if (job.status === "COMPLETED") return res.json({ ok: true, status: job.status });
    writeImportJob(job.id, {
      status: "CANCELLED",
      stage: "cancelled",
      progress: 0,
      message: "İşlem kullanıcı tarafından iptal edildi.",
      error: "İşlem kullanıcı tarafından iptal edildi.",
      cancelledAt: Date.now()
    });
    stopImportWorker(job);
    // Geçici kaynak dosya yalnızca aktarım işine aittir. Silme hatası sayfayı veya sunucuyu düşürmez.
    try {
      if (job.file?.path) fs.rmSync(job.file.path, { force: true });
    } catch (error) {
      console.warn("[product-import-cancel-file]", error?.message || error);
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, status: "CANCELLED" });
  }
);

r.get(
  "/import-proforma/:token/preview",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  (req, res) => {
    try {
      const session = readImportSession({
        token: req.params.token,
        tenantId: req.tenantId,
        userId: req.user.id
      });
      if (!session)
        throw Object.assign(
          new Error(
            req.locale === "en"
              ? "The product import preview was not found or has expired. Upload the file again."
              : "Ürün aktarım ön izlemesi bulunamadı veya süresi doldu. Dosyayı yeniden yükleyin."
          ),
          { status: 404, expose: true }
        );
      const safeRows = Array.isArray(session.rows)
        ? session.rows.map((row, index) => ({
            selected: row?.selected !== false,
            code: text(row?.code),
            name: text(row?.name),
            description: text(row?.description),
            brand: text(row?.brand),
            category: text(row?.category),
            qty: Number(row?.qty) || 1,
            unit: text(row?.unit) || "ADET",
            price: Number(row?.price) || 0,
            currency: text(row?.currency) || "TRY",
            vat_rate: Number.isFinite(Number(row?.vat_rate)) ? Number(row.vat_rate) : 20,
            image_url: safePublicUrl(row?.image_url),
            warning: text(row?.warning),
            confidence: Number(row?.confidence) || 0
          }))
        : [];
      res.render("products/import-proforma-preview", {
        title: req.locale === "en" ? "Import Products from Proforma" : "Proformadan Ürün Aktar",
        token: req.params.token,
        source: session.source || {},
        warnings: Array.isArray(session.warnings) ? session.warnings : [],
        rows: safeRows,
        templates: importTemplates(req.tenantId),
        existingCodes: new Set(
          db
            .prepare(`SELECT code FROM products WHERE tenant_id=? AND ${deletedWhere}`)
            .all(req.tenantId)
            .map((x) => String(x.code || "").toLocaleUpperCase("tr-TR"))
        )
      });
    } catch (error) {
      console.error("[product-import-preview]", error);
      flash(
        req,
        "error",
        `Ürün aktarım ön izlemesi açılamadı: ${String(error?.message || error).slice(0, 300)}`
      );
      res.redirect(303, "/products/import-proforma");
    }
  }
);

function selectedValue(value) {
  return Array.isArray(value)
    ? value.some((v) => String(v) === "1" || String(v).toLowerCase() === "on")
    : String(value) === "1" || String(value).toLowerCase() === "on";
}
function submittedImportRows(bodyRows, files = []) {
  const entries = Array.isArray(bodyRows)
    ? bodyRows.map((row, index) => [String(index), row])
    : Object.keys(bodyRows || {})
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => [key, bodyRows[key]]);
  const fileMap = new Map(
    (files || [])
      .map((file) => {
        const m = String(file.fieldname || "").match(/^rows\[(\d+)\]\[image_file\]$/);
        return [m?.[1] || "", file];
      })
      .filter((x) => x[0])
  );
  return entries
    .filter(([, row]) => selectedValue(row?.selected))
    .map(([index, row]) => ({
      code: upperTr(row.code),
      name: upperTr(row.name),
      description_combined: text(row.description),
      brand: upperTr(row.brand),
      category: upperTr(row.category),
      unit: upperTr(row.unit) || "ADET",
      vat_rate: num(row.vat_rate, 20),
      sale_price: num(row.price),
      currency: upperTr(row.currency) || "TRY",
      image_url: publicFile(fileMap.get(index)) || safePublicUrl(row.image_url),
      duplicate_action: upperTr(row.duplicate_action) || "UPDATE"
    }));
}
r.post(
  "/import-proforma/:token/save",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  upload.any(),
  validateUploads,
  (req, res, next) => {
    try {
      const started = Date.now(),
        session = readImportSession({ token: req.params.token, tenantId: req.tenantId, userId: req.user.id });
      if (!session)
        throw Object.assign(new Error("Ürün aktarım ön izlemesi bulunamadı veya süresi doldu."), {
          status: 404,
          expose: true
        });
      let rows = submittedImportRows(req.body.rows, req.files);
      if (!rows.length)
        throw Object.assign(new Error("Kaydedilecek en az bir ürün satırı seçilmelidir."), {
          status: 422,
          expose: true
        });
      const invalid = rows.find((row) => !row.code || !row.name || Number(row.sale_price) <= 0);
      if (invalid)
        throw Object.assign(
          new Error("Seçili tüm satırlarda ürün kodu, ürün adı ve sıfırdan büyük fiyat zorunludur."),
          { status: 422, expose: true }
        );
      let duplicateSkipped = 0;
      rows = rows.flatMap((row) => {
        const exists = db
          .prepare("SELECT 1 FROM products WHERE tenant_id=? AND code=?")
          .get(req.tenantId, row.code);
        if (!exists) return [row];
        if (row.duplicate_action === "SKIP") {
          duplicateSkipped++;
          return [];
        }
        if (row.duplicate_action === "NEW") {
          let base = row.code,
            n = 2,
            next = `${base}-${n}`;
          while (db.prepare("SELECT 1 FROM products WHERE tenant_id=? AND code=?").get(req.tenantId, next))
            next = `${base}-${++n}`;
          return [{ ...row, code: next }];
        }
        return [row];
      });
      const result = upsertImported(req.tenantId, rows, hasPermission(req.user, "financials", "edit"));
      result.skipped += duplicateSkipped;
      result.total = result.added + result.updated;
      const templateName = text(req.body.template_name);
      if (selectedValue(req.body.remember_template) && templateName) {
        const now = Date.now(),
          defaults = {
            unit: text(req.body.bulk_unit),
            currency: text(req.body.bulk_currency),
            vat_rate: num(req.body.bulk_vat, 20),
            brand: text(req.body.bulk_brand),
            category: text(req.body.bulk_category)
          };
        db.prepare(
          `INSERT INTO product_import_templates(id,tenant_id,name,source_pattern,mapping_json,defaults_json,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,name) DO UPDATE SET source_pattern=excluded.source_pattern,mapping_json=excluded.mapping_json,defaults_json=excluded.defaults_json,updated_at=excluded.updated_at`
        ).run(
          importId("pit"),
          req.tenantId,
          templateName,
          text(session.source?.name).replace(/\d+/g, "*"),
          JSON.stringify({ code: "code", name: "name", description: "description", price: "price" }),
          JSON.stringify(defaults),
          req.user.id,
          now,
          now
        );
      }
      recordImportHistory(req, {
        source_name: session.source?.name,
        source_type: session.source?.type,
        source_size: session.source?.size,
        template_name: templateName,
        status: "SAVED",
        detected_count: (session.rows || []).length,
        selected_count: rows.length + duplicateSkipped,
        added_count: result.added,
        updated_count: result.updated,
        skipped_count: result.skipped,
        warning_count: (session.warnings || []).length,
        duration_ms: Date.now() - Number(session.startedAt || started),
        details: { result }
      });
      deleteImportSession(req.params.token);
      audit(req, {
        action: "PRODUCT_PROFORMA_IMPORT_SAVE",
        module: "PRODUCTS",
        newValue: { ...result, source: session.source?.name || "", selected: rows.length }
      });
      flash(
        req,
        "success",
        `${result.total} ürün kartı kaydedildi. Yeni: ${result.added}, güncellenen: ${result.updated}, atlanan: ${result.skipped}.`
      );
      res.redirect(303, "/products/import-proforma/history");
    } catch (error) {
      console.error("[product-import-save]", error);
      const message = error?.expose
        ? String(error.message || "Ürünler kaydedilemedi.")
        : "Ürünler kaydedilemedi. Ön izlemedeki veriler korundu; tekrar deneyin.";
      flash(req, "error", message);
      return res.redirect(303, `/products/import-proforma/${encodeURIComponent(req.params.token)}/preview`);
    }
  }
);
r.post(
  "/import-proforma/:token/cancel",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  (req, res) => {
    const session = readImportSession({
      token: req.params.token,
      tenantId: req.tenantId,
      userId: req.user.id
    });
    recordImportHistory(req, {
      source_name: session?.source?.name,
      source_type: session?.source?.type,
      source_size: session?.source?.size,
      status: "CANCELLED",
      detected_count: (session?.rows || []).length,
      warning_count: (session?.warnings || []).length
    });
    deleteImportSession(req.params.token);
    try {
      audit(req, { action: "PRODUCT_PROFORMA_IMPORT_CANCEL", module: "PRODUCTS" });
    } catch (auditError) {
      console.error("[product-import] Vazgeç audit kaydı atlandı:", auditError);
    }
    flash(
      req,
      "success",
      req.locale === "en"
        ? "Product import was cancelled; no product was saved."
        : "Ürün aktarımı vazgeçilerek kapatıldı; hiçbir ürün kaydedilmedi."
    );
    res.redirect(303, "/products/import-proforma");
  }
);

r.get("/import-template.xls", productExport, (req, res) => {
  const financial = canSeeFinancials(req);
  const columns = [
    "code",
    "name",
    "gtip_no",
    "origin_country",
    "brand",
    "model",
    "category",
    "unit",
    "vat_rate",
    "sale_price",
    ...(financial ? ["purchase_price"] : []),
    "currency",
    ...(financial ? ["supplier_name", "min_stock_qty", "profit_rate"] : []),
    "description_combined",
    "image",
    "brochure_url",
    "ce_certificate_url",
    "manual_url"
  ];
  const example = [
    "ORN-001",
    "Örnek Ürün",
    "8419.89.98.90.19",
    "TÜRKİYE",
    "Örnek Marka",
    "Model-1",
    "Kategori",
    "ADET",
    "20",
    "1000",
    ...(financial ? ["700"] : []),
    "EUR",
    ...(financial ? ["Örnek Tedarikçi", "5", "30"] : []),
    "Örnek ürün açıklaması",
    "/public/uploads/products/ornek.png",
    "",
    "",
    ""
  ];
  res.type("application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=urun_toplu_yukleme_sablonu.xls");
  res.send(
    `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="products"><Table><Row>${columns.map((x) => `<Cell><Data ss:Type="String">${x}</Data></Cell>`).join("")}</Row><Row>${example.map((x) => `<Cell><Data ss:Type="String">${x}</Data></Cell>`).join("")}</Row></Table></Worksheet></Workbook>`
  );
});
const spreadsheetColumns = [
  "code",
  "name",
  "gtip_no",
  "origin_country",
  "brand",
  "model",
  "category",
  "unit",
  "vat_rate",
  "sale_price",
  "purchase_price",
  "currency",
  "supplier_name",
  "min_stock_qty",
  "profit_rate",
  "description_combined",
  "image",
  "brochure_url",
  "ce_certificate_url",
  "manual_url"
];
const xmlEsc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const spreadsheetRow = (values) =>
  `<Row>${values.map((x) => `<Cell><Data ss:Type="String">${xmlEsc(x)}</Data></Cell>`).join("")}</Row>`;
r.get("/export.xls", productExport, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM products WHERE tenant_id=? AND ${deletedWhere} ORDER BY created_at DESC,updated_at DESC,name COLLATE NOCASE ASC`
    )
    .all(req.tenantId);
  const financial = canSeeFinancials(req);
  const body = rows
    .map((row) =>
      spreadsheetRow([
        row.code,
        row.name,
        row.gtip_no || "",
        row.origin_country || "",
        row.brand,
        row.model,
        row.category,
        row.unit,
        row.vat_rate,
        row.sale_price,
        financial ? row.purchase_price : "",
        row.currency,
        financial ? row.supplier_name || "" : "",
        financial ? row.min_stock_qty || 0 : "",
        financial ? row.profit_rate || 0 : "",
        combinedDescription(row),
        row.image_url || "",
        row.brochure_url || "",
        row.ce_certificate_url || "",
        row.manual_url || ""
      ])
    )
    .join("");
  res.type("application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=urun_listesi_yukleme_formatinda.xls");
  res.send(
    `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="products"><Table>${spreadsheetRow(spreadsheetColumns)}${body}</Table></Worksheet></Workbook>`
  );
});
r.post("/:id/price-adjust", productEdit, financialEdit, (req, res, next) => {
  try {
    const row = db
      .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
      .get(req.tenantId, req.params.id);
    if (!row) throw Object.assign(new Error("Ürün bulunamadı."), { status: 404, expose: true });
    const action = upperTr(req.body.action || "ADJUST"),
      mode = upperTr(req.body.mode || "PERCENT"),
      direction = upperTr(req.body.direction || "INCREASE");
    const value = Math.max(0, Math.min(100000000, num(req.body.value, 0)));
    let nextPrice = Number(row.sale_price || 0),
      changeType = `${direction}_${mode}`,
      changeValue = value;
    if (action === "REVERT") {
      const latest = db
        .prepare(
          `SELECT old_price FROM product_price_history WHERE tenant_id=? AND product_id=? ORDER BY created_at DESC LIMIT 1`
        )
        .get(req.tenantId, row.id);
      if (!latest)
        throw Object.assign(new Error("Geri dönülecek eski fiyat bulunamadı."), {
          status: 422,
          expose: true
        });
      nextPrice = Number(latest.old_price || 0);
      changeType = "REVERT";
      changeValue = null;
    } else {
      if (!(value > 0))
        throw Object.assign(new Error("Fiyat değişiklik değeri sıfırdan büyük olmalıdır."), {
          status: 422,
          expose: true
        });
      const delta = mode === "AMOUNT" ? value : (nextPrice * value) / 100;
      nextPrice = direction === "DECREASE" ? nextPrice - delta : nextPrice + delta;
    }
    nextPrice = Math.max(0, Math.round(nextPrice * 100) / 100);
    const now = Date.now();
    db.transaction(() => {
      db.prepare("UPDATE products SET sale_price=?,updated_at=? WHERE tenant_id=? AND id=?").run(
        nextPrice,
        now,
        req.tenantId,
        row.id
      );
      recordProductPriceChange(req, row.id, row.sale_price, nextPrice, row.currency, changeType, changeValue);
    })();
    audit(req, {
      action: "PRODUCT_PRICE_ADJUST",
      module: "PRODUCTS",
      entityId: row.id,
      oldValue: { sale_price: row.sale_price },
      newValue: { sale_price: nextPrice, mode, direction, value, changeType }
    });
    res.json({ ok: true, sale_price: nextPrice, currency: row.currency });
  } catch (error) {
    if (wantsJson(req))
      return res
        .status(error.status || 500)
        .json({ ok: false, message: error.expose ? error.message : "Fiyat güncellenemedi." });
    next(error);
  }
});
r.post("/preview-archive/:id", productArchive, (req, res) => {
  const old = db
    .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
    .get(req.tenantId, req.params.id);
  if (!old) return res.status(404).json({ ok: false, message: "Ürün bulunamadı." });
  const now = Date.now();
  db.prepare(
    "UPDATE products SET status='ARCHIVED',deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=?"
  ).run(now, req.user.id, now, req.tenantId, req.params.id);
  audit(req, {
    action: "PRODUCT_ARCHIVE_FROM_PREVIEW",
    module: "PRODUCTS",
    entityId: req.params.id,
    oldValue: old
  });
  res.json({ ok: true, message: req.locale === "en" ? "Product archived." : "Ürün arşivlendi." });
});
r.post("/bulk-delete", productArchive, (req, res) => {
  const ids = [].concat(req.body.ids || []).filter(Boolean);
  const now = Date.now(),
    upd = db.prepare(
      "UPDATE products SET status='ARCHIVED',deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=?"
    );
  db.transaction(() => ids.forEach((x) => upd.run(now, req.user.id, now, req.tenantId, x)))();
  audit(req, { action: "PRODUCT_BULK_ARCHIVE", module: "PRODUCTS", newValue: { count: ids.length } });
  flash(req, "success", `${ids.length} ürün arşivlendi.`);
  res.redirect("/products");
});
r.post("/bulk-price", productEdit, financialEdit, (req, res) => {
  const ids = [].concat(req.body.ids || []).filter(Boolean),
    pct = Math.max(-100, Math.min(1000, num(req.body.percent, 0)));
  const get = db.prepare(
      `SELECT id,sale_price,currency FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`
    ),
    upd = db.prepare(
      `UPDATE products SET sale_price=?,updated_at=? WHERE tenant_id=? AND id=? AND ${deletedWhere}`
    );
  db.transaction(() =>
    ids.forEach((x) => {
      const row = get.get(req.tenantId, x);
      if (!row) return;
      const nextPrice = Math.max(0, Math.round(Number(row.sale_price || 0) * (1 + pct / 100) * 100) / 100);
      upd.run(nextPrice, Date.now(), req.tenantId, x);
      recordProductPriceChange(req, x, row.sale_price, nextPrice, row.currency, "BULK_PERCENT", pct);
    })
  )();
  audit(req, {
    action: "PRODUCT_BULK_PRICE",
    module: "PRODUCTS",
    newValue: { count: ids.length, percent: pct }
  });
  flash(req, "success", `${ids.length} ürün için fiyat ayarı uygulandı.`);
  res.redirect("/products");
});
r.post(
  "/import-excel",
  requireAnyPermission([
    ["products", "create"],
    ["products", "edit"]
  ]),
  upload.single("excel"),
  validateUploads,
  async (req, res, next) => {
    try {
      if (!req.file)
        throw Object.assign(new Error("Excel dosyası seçilmedi."), { status: 422, expose: true });
      const rows = await readImportRows(req.file),
        result = upsertImported(req.tenantId, rows, hasPermission(req.user, "financials", "edit"));
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
      audit(req, {
        action: "PRODUCT_EXCEL_IMPORT",
        module: "PRODUCTS",
        newValue: { ...result, file: req.file.originalname }
      });
      flash(
        req,
        "success",
        `${result.total} ürün aktarıldı. Yeni: ${result.added}, güncellenen: ${result.updated}, atlanan: ${result.skipped}.`
      );
      res.redirect("/products");
    } catch (e) {
      try {
        if (req.file?.path) fs.unlinkSync(req.file.path);
      } catch {}
      if (String(e.message || "").includes("Cannot find package")) {
        e.message =
          "XLSX desteği için npm install çalıştırılmalıdır. CSV ve XML .xls dosyaları yine desteklenir.";
        e.status = 500;
        e.expose = true;
      }
      next(e);
    }
  }
);
r.get("/api/:id", productView, (req, res) =>
  res.json(
    normalizeProduct(
      db
        .prepare(`SELECT * FROM products WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
        .get(req.tenantId, req.params.id) || {},
      canSeeFinancials(req)
    )
  )
);
export default r;

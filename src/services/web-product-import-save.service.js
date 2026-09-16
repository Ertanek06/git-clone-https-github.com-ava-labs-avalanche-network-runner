import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { foldTR, safePublicUrl, safeText, searchText, upperTr } from "../utils/text.js";
import {
  brandFromTitle,
  downloadProductImage,
  downloadProductPdf,
  sanitizeWebProductDescription,
  sanitizeWebProductTitle
} from "./web-product-import.service.js";

const text = safeText;
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const deletedWhere = "COALESCE(deleted_at,0)=0";
function looksLikeUrlName(value = "") {
  const raw = text(value);
  if (!raw) return false;
  return /^https?:\/\//i.test(raw) || /^www\./i.test(raw) || (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw) && !/\s/.test(raw));
}

function productUrlKey(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch { return ""; }
}


function productSearch(row) {
  return searchText(
    row.code,row.barcode,row.gtip_no,row.origin_country,row.name,row.brand,row.model,row.category,
    row.short_description,row.technical_description,row.unit,row.currency,row.status
  );
}

function existingMaps(tenantId) {
  const rows = db.prepare("SELECT * FROM products WHERE tenant_id=?").all(tenantId);
  const byCode = new Map();
  const byName = new Map();
  const byUrl = new Map();
  const codeGroups = new Map();
  for (const row of rows) {
    const code = upperTr(row.code);
    const active = !Number(row.deleted_at || 0) && !["ARCHIVED", "ARSIVLENDI", "DELETED", "SILINDI"].includes(upperTr(row.status));
    if (code) {
      const group = codeGroups.get(code) || [];
      group.push(row);
      codeGroups.set(code, group);
    }
    if (!active) continue;
    const name = foldTR(row.name);
    const url = productUrlKey(row.product_url);
    if (code) {
      const previous = byCode.get(code);
      if (!previous || (row.code === code && previous.code !== code)) byCode.set(code, row);
    }
    if (name && !byName.has(name)) byName.set(name, row);
    if (url && !byUrl.has(url)) byUrl.set(url, row);
  }
  return { byCode, byName, byUrl, codeGroups };
}

function sourceIdentityNames(source = {}, rows = []) {
  const values = [source?.name, source?.base_url, source?.url];
  for (const row of rows.slice(0, 5)) values.push(row?.source_name, row?.source_site);
  for (const raw of [...values]) {
    try {
      const host = new URL(String(raw || "")).hostname.replace(/^www\./i, "");
      if (host) values.push(host, host.split(".")[0].replace(/[-_]+/g, " "));
    } catch {}
  }
  return [...new Set(values.map(text).filter((value) => value.length >= 4))];
}

function consolidateCodeVariants(tenantId, code, maps) {
  const group = (maps.codeGroups?.get(code) || []).filter(Boolean);
  if (!group.length) return null;
  const isActive = (row) => !Number(row.deleted_at || 0) && !["ARCHIVED", "ARSIVLENDI", "DELETED", "SILINDI"].includes(upperTr(row.status));
  const canonical = group.find((row) => isActive(row) && row.code === code) || group.find((row) => row.code === code) || group.find(isActive) || group[0];
  const duplicates = group.filter((row) => row.id !== canonical.id);
  if (!duplicates.length) return canonical;
  const merge = db.transaction(() => {
    const now = Date.now();
    for (const duplicate of duplicates) {
      db.prepare("UPDATE quote_items SET product_id=?,updated_at=? WHERE product_id=?").run(canonical.id, now, duplicate.id);
      db.prepare(`UPDATE products SET status='ARCHIVED',deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=?`).run(
        now, "web-import-code-merge", now, tenantId, duplicate.id
      );
      const nameKey = foldTR(duplicate.name);
      const urlKey = productUrlKey(duplicate.product_url);
      if (maps.byName.get(nameKey)?.id === duplicate.id) maps.byName.delete(nameKey);
      if (maps.byUrl.get(urlKey)?.id === duplicate.id) maps.byUrl.delete(urlKey);
    }
  });
  merge();
  maps.byCode.set(code, canonical);
  maps.codeGroups.set(code, [canonical]);
  return canonical;
}

export function webImportDuplicateInfo(tenantId, row, maps = null) {
  const cache = maps || existingMaps(tenantId);
  const code = upperTr(row?.code);
  const name = foldTR(row?.name);
  const url = productUrlKey(row?.product_url);
  const byCode = code ? cache.byCode.get(code) : null;
  const byUrl = url ? cache.byUrl.get(url) : null;
  const byName = name ? cache.byName.get(name) : null;
  const match = byCode || byUrl || byName || null;
  return {
    duplicate: !!match,
    duplicate_reason: byCode ? "CODE" : byUrl ? "URL" : byName ? "NAME" : "",
    existing: match
  };
}

async function persistRemoteMedia(row, tenantId, existing, onProgress) {
  const next = { ...row };
  let imageWarnings = 0;
  let documentWarnings = 0;
  if (row.download_image !== false && /^https?:\/\//i.test(row.image_url || "")) {
    try {
      onProgress?.({ kind: "image", message: "Ürün görseli indiriliyor" });
      next.image_url = await downloadProductImage(row.image_url, tenantId);
    } catch (error) {
      imageWarnings++;
      next.image_url = existing?.image_url || "";
    }
  }
  for (const [field, kind] of [["brochure_url","brochure"],["manual_url","manual"],["ce_certificate_url","ce"]]) {
    const raw = text(row[field]);
    if (!/^https?:\/\//i.test(raw)) continue;
    try {
      onProgress?.({ kind: "document", message: `${kind.toUpperCase()} PDF indiriliyor` });
      next[field] = await downloadProductPdf(raw, tenantId, kind);
    } catch (error) {
      documentWarnings++;
      next[field] = existing?.[field] || "";
    }
  }
  return { row: next, imageWarnings, documentWarnings };
}

function upsertOne(tenantId, row, existingByCode = null, descriptionOptions = {}) {
  const now = Date.now();
  const code = upperTr(row.code);
  const name = sanitizeWebProductTitle(row.name, descriptionOptions.forbiddenNames || []);
  const prior = existingByCode;
  const incomingPrice = num(row.price ?? row.sale_price);
  const record = {
    id: prior?.id || id("prd"), tenant_id: tenantId, code,
    gtip_no: prior?.gtip_no || "", origin_country: prior?.origin_country || "",
    name: name || prior?.name || "", brand: text(row.brand) || prior?.brand || brandFromTitle(name, code) || "", model: text(row.model) || prior?.model || "", category: text(row.category) || prior?.category || "",
    unit: upperTr(row.unit) || prior?.unit || "ADET", vat_rate: num(row.vat_rate, prior?.vat_rate ?? 20),
    sale_price: incomingPrice > 0 ? incomingPrice : num(prior?.sale_price), currency: upperTr(row.currency) || prior?.currency || "TRY",
    purchase_price: num(prior?.purchase_price), short_description: sanitizeWebProductDescription(row.description || row.description_combined, { ...descriptionOptions, productTitle: name }),
    technical_description: "", image_url: safePublicUrl(row.image_url) || prior?.image_url || "",
    brochure_url: safePublicUrl(row.brochure_url) || prior?.brochure_url || "",
    ce_certificate_url: safePublicUrl(row.ce_certificate_url) || prior?.ce_certificate_url || "",
    manual_url: safePublicUrl(row.manual_url) || prior?.manual_url || "",
    product_url: safePublicUrl(row.product_url) || prior?.product_url || "",
    supplier_name: prior?.supplier_name || "", min_stock_qty: num(prior?.min_stock_qty),
    profit_rate: num(prior?.profit_rate), status: "ACTIVE", created_at: prior?.created_at || now, updated_at: now
  };
  record.search_text = productSearch(record);
  if (prior) {
    db.prepare(`UPDATE products SET
      code=@code,name=@name,brand=@brand,model=@model,category=@category,unit=@unit,vat_rate=@vat_rate,
      sale_price=@sale_price,currency=@currency,short_description=@short_description,technical_description='',
      image_url=@image_url,brochure_url=@brochure_url,ce_certificate_url=@ce_certificate_url,manual_url=@manual_url,
      product_url=@product_url,status='ACTIVE',deleted_at=NULL,deleted_by=NULL,search_text=@search_text,updated_at=@updated_at
      WHERE tenant_id=@tenant_id AND id=@id`).run(record);
    return "updated";
  }
  db.prepare(`INSERT INTO products(
    id,tenant_id,code,gtip_no,origin_country,name,brand,model,category,unit,vat_rate,sale_price,currency,purchase_price,
    short_description,technical_description,image_url,brochure_url,ce_certificate_url,manual_url,product_url,supplier_name,min_stock_qty,profit_rate,
    status,search_text,created_at,updated_at
  ) VALUES(
    @id,@tenant_id,@code,@gtip_no,@origin_country,@name,@brand,@model,@category,@unit,@vat_rate,@sale_price,@currency,@purchase_price,
    @short_description,@technical_description,@image_url,@brochure_url,@ce_certificate_url,@manual_url,@product_url,@supplier_name,@min_stock_qty,@profit_rate,
    @status,@search_text,@created_at,@updated_at
  ) ON CONFLICT(tenant_id,code) DO UPDATE SET
    name=excluded.name,brand=excluded.brand,model=excluded.model,category=excluded.category,unit=excluded.unit,vat_rate=excluded.vat_rate,
    sale_price=excluded.sale_price,currency=excluded.currency,
    short_description=excluded.short_description,technical_description='',
    image_url=CASE WHEN excluded.image_url<>'' THEN excluded.image_url ELSE products.image_url END,
    brochure_url=CASE WHEN excluded.brochure_url<>'' THEN excluded.brochure_url ELSE products.brochure_url END,
    ce_certificate_url=CASE WHEN excluded.ce_certificate_url<>'' THEN excluded.ce_certificate_url ELSE products.ce_certificate_url END,
    manual_url=CASE WHEN excluded.manual_url<>'' THEN excluded.manual_url ELSE products.manual_url END,
    product_url=CASE WHEN excluded.product_url<>'' THEN excluded.product_url ELSE products.product_url END,
    status='ACTIVE',deleted_at=NULL,deleted_by=NULL,search_text=excluded.search_text,updated_at=excluded.updated_at`).run(record);
  return "added";
}

export async function saveWebImportRows({ tenantId, rows, source = {}, onProgress = null }) {
  const maps = existingMaps(tenantId);
  let added = 0, updated = 0, skipped = 0, imageWarnings = 0, documentWarnings = 0;
  const rawSelected = (rows || []).filter((r) => r && r.selected !== false);
  const selected = [];
  const selectedByCode = new Map();
  for (const row of rawSelected) {
    const code = upperTr(row.code);
    if (!code) { selected.push(row); continue; }
    if (selectedByCode.has(code)) {
      selected[selectedByCode.get(code)] = row;
      skipped++;
    } else {
      selectedByCode.set(code, selected.length);
      selected.push(row);
    }
  }
  const forbiddenNames = sourceIdentityNames(source, selected);
  for (let i = 0; i < selected.length; i++) {
    const row = selected[i];
    const code = upperTr(row.code);
    const cleanName = sanitizeWebProductTitle(row.name, forbiddenNames);
    const nameKey = foldTR(cleanName);
    if (!code || !nameKey || looksLikeUrlName(cleanName)) { skipped++; continue; }
    const byCode = consolidateCodeVariants(tenantId, code, maps) || maps.byCode.get(code) || null;
    const byUrl = maps.byUrl.get(productUrlKey(row.product_url)) || null;
    const byName = maps.byName.get(nameKey) || null;
    // Aynı başlık farklı kodla mevcutsa ikinci bir kayıt oluşturma.
    if (!byCode && !byUrl && byName) { skipped++; continue; }
    const prior = byCode || byUrl || null;
    const duplicateAction = upperTr(row.duplicate_action || "UPDATE");
    if (prior && duplicateAction === "SKIP") { skipped++; continue; }
    const effective = {
      ...row,
      name: cleanName,
      brand: text(row.brand) || prior?.brand || brandFromTitle(cleanName, code) || "",
      model: text(row.model) || prior?.model || "",
      category: text(row.category) || prior?.category || "",
      unit: upperTr(row.unit) || prior?.unit || "ADET",
      price: num(row.price) > 0 ? num(row.price) : num(prior?.sale_price),
      currency: upperTr(row.currency) || prior?.currency || "TRY"
    };
    onProgress?.({ index: i, total: selected.length, row:effective, message: `${row.name} hazırlanıyor` });
    const media = await persistRemoteMedia(effective, tenantId, prior, (p) => onProgress?.({ index: i, total: selected.length, row:effective, ...p }));
    imageWarnings += media.imageWarnings;
    documentWarnings += media.documentWarnings;
    const action = upsertOne(tenantId, media.row, prior, { forbiddenNames });
    if (action === "added") {
      added++;
      const inserted = db.prepare("SELECT * FROM products WHERE tenant_id=? AND code=?").get(tenantId, code);
      maps.byCode.set(code, inserted);
      maps.codeGroups.set(code, [inserted]);
      maps.byName.set(nameKey, inserted);
      if (productUrlKey(inserted?.product_url)) maps.byUrl.set(productUrlKey(inserted.product_url), inserted);
    } else {
      updated++;
      const changed = db.prepare("SELECT * FROM products WHERE tenant_id=? AND code=?").get(tenantId, code);
      if (prior && upperTr(prior.code) !== code && maps.byCode.get(upperTr(prior.code))?.id === prior.id) maps.byCode.delete(upperTr(prior.code));
      if (prior && foldTR(prior.name) !== foldTR(changed?.name) && maps.byName.get(foldTR(prior.name))?.id === prior.id) maps.byName.delete(foldTR(prior.name));
      maps.byCode.set(code, changed);
      maps.codeGroups.set(code, [changed]);
      maps.byName.set(foldTR(changed.name), changed);
      if (productUrlKey(changed?.product_url)) maps.byUrl.set(productUrlKey(changed.product_url), changed);
    }
    onProgress?.({ index: i + 1, total: selected.length, row, message: `${row.name} kaydedildi` });
  }
  return { added, updated, skipped, total: added + updated, imageWarnings, documentWarnings };
}

export async function syncWebRows({ tenantId, rows, mode = "FULL", onProgress = null }) {
  const maps = existingMaps(tenantId);
  let added = 0, updated = 0, skipped = 0, imageWarnings = 0, documentWarnings = 0;
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const code = upperTr(row.code); const nameKey = foldTR(row.name);
    if (!code || !nameKey || looksLikeUrlName(row.name)) { skipped++; continue; }
    const byCode = consolidateCodeVariants(tenantId, code, maps) || maps.byCode.get(code) || null;
    const byName = maps.byName.get(nameKey) || null;
    if (!byCode && byName) { skipped++; continue; }
    if (mode === "PRICE") {
      const existing = byCode || byName;
      if (!existing || !num(row.price)) { skipped++; continue; }
      db.prepare(`UPDATE products SET sale_price=?,currency=?,brand=CASE WHEN ?<>'' THEN ? ELSE brand END,model=CASE WHEN ?<>'' THEN ? ELSE model END,category=CASE WHEN ?<>'' THEN ? ELSE category END,product_url=CASE WHEN ?<>'' THEN ? ELSE product_url END,updated_at=? WHERE tenant_id=? AND id=?`).run(
        num(row.price), upperTr(row.currency)||existing.currency||"TRY", text(row.brand),text(row.brand),text(row.model),text(row.model),text(row.category),text(row.category),safePublicUrl(row.product_url),safePublicUrl(row.product_url),Date.now(),tenantId,existing.id
      );
      updated++; onProgress?.({ index:i+1,total:list.length,row,message:"Fiyat güncellendi" }); continue;
    }
    if (byCode || byName) { skipped++; continue; }
    if (!row.brand || !row.model || !row.category || !num(row.price)) { skipped++; continue; }
    const media = await persistRemoteMedia({ ...row, download_image: true }, tenantId, null, (p)=>onProgress?.({ index:i,total:list.length,row,...p }));
    imageWarnings += media.imageWarnings; documentWarnings += media.documentWarnings;
    upsertOne(tenantId, media.row, null); added++;
    const inserted=db.prepare("SELECT * FROM products WHERE tenant_id=? AND code=?").get(tenantId,code); maps.byCode.set(code,inserted);maps.codeGroups.set(code,[inserted]);maps.byName.set(nameKey,inserted);
    onProgress?.({ index:i+1,total:list.length,row,message:"Yeni ürün eklendi" });
  }
  return { added, updated, skipped, total: added+updated, imageWarnings, documentWarnings };
}

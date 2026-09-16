import crypto from "crypto";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";

export const DATA_BACKUP_FORMAT = "ARTEVA_CRM_DATA_BACKUP";
export const DATA_BACKUP_VERSION = 1;
export const backupScopes = {
  profiles: { label: "Firma profilleri", tables: ["profiles"] },
  products: { label: "Ürün ve hizmetler", tables: ["products"] },
  customers: { label: "Müşteriler ve yetkililer", tables: ["customers", "customer_contacts"] },
  quotes: { label: "Proformalar ve satırlar", tables: ["quotes", "quote_items"] },
  templates: { label: "Proforma şablonları", tables: ["quote_templates"] }
};

const validScopes = (value) => [
  ...new Set(
    []
      .concat(value || [])
      .map(String)
      .filter((key) => backupScopes[key])
  )
];
const q = (name) => `"${String(name).replace(/"/g, '""')}"`;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => JSON.stringify(value);
const tableExists = (name) =>
  Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
const tableColumns = (name) =>
  tableExists(name)
    ? db
        .prepare(`PRAGMA table_info(${q(name)})`)
        .all()
        .map((row) => row.name)
    : [];

function readTable(tenantId, table) {
  if (!tableExists(table)) return [];
  if (table === "quote_items")
    return db
      .prepare(
        `SELECT i.* FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE q.tenant_id=? ORDER BY i.quote_id,i.sort_order,i.id`
      )
      .all(tenantId);
  const columns = new Set(tableColumns(table));
  if (!columns.has("tenant_id")) return [];
  const order = columns.has("created_at") ? "created_at,id" : "id";
  return db.prepare(`SELECT * FROM ${q(table)} WHERE tenant_id=? ORDER BY ${order}`).all(tenantId);
}

export function createBackupPayload({ tenantId, userId, scopes }) {
  const selected = validScopes(scopes);
  if (!selected.length)
    throw Object.assign(new Error("Yedeklenecek en az bir veri bölümü seçilmelidir."), {
      status: 422,
      expose: true
    });
  const tables = {};
  for (const scope of selected)
    for (const table of backupScopes[scope].tables) tables[table] = readTable(tenantId, table);
  const tenant = db.prepare("SELECT id,name,slug,status,plan FROM tenants WHERE id=?").get(tenantId) || {
    id: tenantId
  };
  const core = {
    format: DATA_BACKUP_FORMAT,
    version: DATA_BACKUP_VERSION,
    created_at: new Date().toISOString(),
    tenant: { name: tenant.name || "", slug: tenant.slug || "" },
    created_by: userId || null,
    scopes: selected,
    tables
  };
  return { ...core, checksum: { algorithm: "SHA-256", value: sha256(canonical(core)) } };
}

export function verifyBackupPayload(payload) {
  if (!payload || payload.format !== DATA_BACKUP_FORMAT)
    throw Object.assign(new Error("Dosya geçerli bir ARTEVA veri yedeği değil."), {
      status: 422,
      expose: true
    });
  if (Number(payload.version) !== DATA_BACKUP_VERSION)
    throw Object.assign(new Error(`Desteklenmeyen veri yedeği sürümü: ${payload.version}.`), {
      status: 422,
      expose: true
    });
  if (!payload.tables || typeof payload.tables !== "object" || Array.isArray(payload.tables))
    throw Object.assign(new Error("Yedek içeriğindeki tablo verileri geçersiz."), {
      status: 422,
      expose: true
    });
  const checksum = String(payload.checksum?.value || "");
  const core = { ...payload };
  delete core.checksum;
  const expected = sha256(canonical(core));
  if (!checksum || checksum !== expected)
    throw Object.assign(
      new Error("Yedek dosyası bütünlük doğrulamasından geçemedi; dosya eksik veya değiştirilmiş olabilir."),
      { status: 422, expose: true }
    );
  return { ...payload, scopes: validScopes(payload.scopes) };
}

const excelSheetNames = {
  profiles: "Firma Profilleri",
  products: "Ürünler",
  customers: "Müşteriler",
  customer_contacts: "Yetkililer",
  quotes: "Proformalar",
  quote_items: "Proforma Satırları",
  quote_templates: "Şablonlar"
};
function cleanSheetName(name) {
  return (
    String(name)
      .replace(/[\\/?*\[\]:]/g, "_")
      .slice(0, 31) || "Veri"
  );
}
export async function backupToXlsxBuffer(payload) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const meta = [
    { Alan: "Format", Değer: payload.format },
    { Alan: "Sürüm", Değer: payload.version },
    { Alan: "Oluşturulma", Değer: payload.created_at },
    { Alan: "Firma", Değer: payload.tenant?.name || "" },
    { Alan: "Firma Kodu", Değer: payload.tenant?.slug || "" },
    { Alan: "Bölümler", Değer: payload.scopes.join(", ") },
    { Alan: "SHA-256", Değer: payload.checksum?.value || "" }
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meta), cleanSheetName("Yedek Bilgisi"));
  for (const [table, rows] of Object.entries(payload.tables)) {
    const safeRows = rows.length ? rows : [{ Bilgi: "Bu bölümde kayıt bulunmuyor." }];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(safeRows),
      cleanSheetName(excelSheetNames[table] || table)
    );
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
}

const prefixFor = {
  profiles: "prf",
  products: "prd",
  customers: "cus",
  customer_contacts: "cct",
  quotes: "quo",
  quote_items: "qit",
  quote_templates: "tpl"
};
function uniqueId(table, incoming) {
  const raw = String(incoming || "").trim();
  if (raw && !db.prepare(`SELECT 1 FROM ${q(table)} WHERE id=?`).get(raw)) return raw;
  return id(prefixFor[table] || "row");
}
function selectExisting(table, tenantId, row, natural) {
  const cols = tableColumns(table);
  if (row.id) {
    const byId =
      table === "quote_items"
        ? db
            .prepare(
              "SELECT i.* FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE i.id=? AND q.tenant_id=? LIMIT 1"
            )
            .get(row.id, tenantId)
        : db
            .prepare(
              `SELECT * FROM ${q(table)} WHERE id=?${cols.includes("tenant_id") ? " AND tenant_id=?" : ""}`
            )
            .get(...(cols.includes("tenant_id") ? [row.id, tenantId] : [row.id]));
    if (byId) return byId;
  }
  const pairs = natural.filter(
    (name) => row[name] !== undefined && row[name] !== null && String(row[name]) !== ""
  );
  if (!pairs.length) return null;
  const params = [];
  let where = "";
  if (table === "quote_items") {
    where = pairs.map((name) => `i.${q(name)}=?`).join(" AND ");
    params.push(tenantId, ...pairs.map((name) => row[name]));
    return (
      db
        .prepare(
          `SELECT i.* FROM quote_items i JOIN quotes owner ON owner.id=i.quote_id WHERE owner.tenant_id=? AND ${where} LIMIT 1`
        )
        .get(...params) || null
    );
  }
  if (cols.includes("tenant_id")) {
    where = "tenant_id=? AND ";
    params.push(tenantId);
  }
  where += pairs.map((name) => `${q(name)}=?`).join(" AND ");
  params.push(...pairs.map((name) => row[name]));
  return db.prepare(`SELECT * FROM ${q(table)} WHERE ${where} LIMIT 1`).get(...params) || null;
}
function writeRow(table, tenantId, incoming, natural, { forceId, mapRow } = {}) {
  if (!tableExists(table)) return { status: "skipped", id: null };
  const cols = tableColumns(table),
    allowed = new Set(cols),
    row = { ...incoming };
  if (typeof mapRow === "function") Object.assign(row, mapRow(row) || {});
  if (allowed.has("tenant_id")) row.tenant_id = tenantId;
  // İlişkili kayıtlar hiçbir koşulda başka firmanın satırına bağlanamaz.
  if (
    table === "customer_contacts" &&
    row.customer_id &&
    !db.prepare("SELECT 1 FROM customers WHERE id=? AND tenant_id=?").get(row.customer_id, tenantId)
  )
    throw new Error("Yetkili kaydının bağlı olduğu müşteri bu firmada bulunamadı.");
  if (table === "quotes") {
    if (
      row.customer_id &&
      !db.prepare("SELECT 1 FROM customers WHERE id=? AND tenant_id=?").get(row.customer_id, tenantId)
    )
      row.customer_id = null;
    if (
      row.profile_id &&
      !db.prepare("SELECT 1 FROM profiles WHERE id=? AND tenant_id=?").get(row.profile_id, tenantId)
    )
      row.profile_id = null;
  }
  if (table === "quote_items") {
    if (
      !row.quote_id ||
      !db.prepare("SELECT 1 FROM quotes WHERE id=? AND tenant_id=?").get(row.quote_id, tenantId)
    )
      throw new Error("Proforma satırının bağlı olduğu proforma bu firmada bulunamadı.");
    if (
      row.product_id &&
      !db.prepare("SELECT 1 FROM products WHERE id=? AND tenant_id=?").get(row.product_id, tenantId)
    )
      row.product_id = null;
  }
  const existing = selectExisting(table, tenantId, row, natural);
  const actualId = forceId || existing?.id || uniqueId(table, row.id);
  if (allowed.has("id")) row.id = actualId;
  const now = Date.now();
  if (allowed.has("updated_at")) row.updated_at = Math.max(Number(row.updated_at || 0), now);
  if (allowed.has("created_at") && !row.created_at) row.created_at = existing?.created_at || now;
  const names = cols.filter((name) => row[name] !== undefined && name !== "id" && name !== "tenant_id");
  if (existing) {
    if (names.length) {
      const sql = `UPDATE ${q(table)} SET ${names.map((name) => `${q(name)}=?`).join(",")} WHERE id=?`;
      db.prepare(sql).run(...names.map((name) => row[name]), existing.id);
    }
    return { status: "updated", id: existing.id };
  }
  const insertNames = cols.filter((name) => row[name] !== undefined);
  db.prepare(
    `INSERT INTO ${q(table)}(${insertNames.map(q).join(",")}) VALUES(${insertNames.map(() => "?").join(",")})`
  ).run(...insertNames.map((name) => row[name]));
  return { status: "added", id: actualId };
}

function tableRows(payload, table) {
  return Array.isArray(payload.tables?.[table]) ? payload.tables[table] : [];
}
export function restoreBackupPayload({ tenantId, payload, scopes }) {
  const verified = verifyBackupPayload(payload),
    selected = validScopes(scopes?.length ? scopes : verified.scopes);
  if (!selected.length)
    throw Object.assign(new Error("Geri yüklenecek en az bir veri bölümü seçilmelidir."), {
      status: 422,
      expose: true
    });
  const allowedTables = new Set(selected.flatMap((scope) => backupScopes[scope].tables));
  const result = { added: 0, updated: 0, skipped: 0, tables: {}, scopes: selected };
  const customerMap = new Map(),
    productMap = new Map(),
    quoteMap = new Map();
  const count = (table, state) => {
    result[state]++;
    result.tables[table] ??= { added: 0, updated: 0, skipped: 0 };
    result.tables[table][state]++;
  };
  const process = (table, rows, natural, opts = {}) =>
    rows.forEach((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row))
        throw Object.assign(new Error(`${table} tablosunda ${index + 1}. satır geçersiz.`), {
          status: 422,
          expose: true
        });
      try {
        const written = writeRow(table, tenantId, row, natural, opts);
        if (written.status === "skipped") throw new Error(`${table} tablosu mevcut değil veya yazılamıyor.`);
        count(table, written.status);
        if (opts.map && row.id && written.id) opts.map.set(row.id, written.id);
      } catch (error) {
        const wrapped = Object.assign(
          new Error(`${table} tablosundaki ${index + 1}. kayıt geri yüklenemedi: ${error?.message || error}`),
          { status: 422, expose: true, cause: error }
        );
        throw wrapped;
      }
    });

  db.transaction(() => {
    if (allowedTables.has("profiles"))
      process("profiles", tableRows(verified, "profiles"), ["company_name", "tax_no"]);
    if (allowedTables.has("products"))
      process("products", tableRows(verified, "products"), ["code"], { map: productMap });
    if (allowedTables.has("customers"))
      process("customers", tableRows(verified, "customers"), ["code"], { map: customerMap });
    if (allowedTables.has("customer_contacts"))
      process(
        "customer_contacts",
        tableRows(verified, "customer_contacts"),
        ["customer_id", "full_name", "email"],
        { mapRow: (row) => ({ customer_id: customerMap.get(row.customer_id) || row.customer_id }) }
      );
    if (allowedTables.has("quote_templates"))
      process("quote_templates", tableRows(verified, "quote_templates"), ["template_key"]);
    if (allowedTables.has("quotes"))
      process("quotes", tableRows(verified, "quotes"), ["quote_no", "revision_no"], {
        map: quoteMap,
        mapRow: (row) => ({ customer_id: customerMap.get(row.customer_id) || row.customer_id })
      });
    if (allowedTables.has("quote_items"))
      process("quote_items", tableRows(verified, "quote_items"), ["quote_id", "sort_order"], {
        mapRow: (row) => ({
          quote_id: quoteMap.get(row.quote_id) || row.quote_id,
          product_id: productMap.get(row.product_id) || row.product_id
        })
      });
  })();
  return result;
}

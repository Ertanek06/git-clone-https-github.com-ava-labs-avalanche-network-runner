import fs from "fs";
import path from "path";
import { db } from "../db/db.js";
import { config } from "../config.js";
import { tenantUploadSegment } from "./upload-access.service.js";

const publicRoot = config.publicUploadDir;
const privateLiveRoot = path.resolve(config.privateUploadDir, "live");
const tableExists = (name) =>
  Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
const publicColumns = {
  profiles: ["logo_url", "stamp_url", "signature_url", "left_image_url"],
  customers: ["logo_url"],
  products: [
    "image_url",
    "brochure_url",
    "ce_certificate_url",
    "manual_url",
    "image_path",
    "brochure_path",
    "ce_certificate_path",
    "manual_path"
  ],
  live_sites: ["operator_avatar_url"],
  login_settings: ["logo_url", "left_image_url"]
};
const tableColumns = (name) =>
  new Set(
    db
      .prepare(`PRAGMA table_info("${String(name).replaceAll('"', '""')}")`)
      .all()
      .map((row) => row.name)
  );
const safeInside = (root, relative) => {
  const full = path.resolve(root, relative);
  return full.startsWith(`${root}${path.sep}`) ? full : null;
};
function storedPath(value) {
  const raw = String(value || "").trim();
  if (raw.startsWith("private:")) return safeInside(privateLiveRoot, path.basename(raw.slice(8)));
  const match = raw.match(/^\/(?:public\/)?uploads\/([^?#]+)/i);
  if (!match) return null;
  let relative;
  try {
    relative = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  relative = path.posix.normalize(relative.replaceAll("\\", "/")).replace(/^\/+/, "");
  if (!relative || relative.startsWith("../")) return null;
  return safeInside(publicRoot, relative);
}
function addReference(map, value, source, id) {
  const file = storedPath(value);
  if (!file) return;
  const key = path.resolve(file);
  const current = map.get(key) || { file: key, stored_value: String(value), references: [] };
  current.references.push({ source, id: String(id || "") });
  map.set(key, current);
}
function walkFiles(root, files = []) {
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkFiles(full, files);
    else if (entry.isFile()) files.push(full);
  }
  return files;
}
function relationCount(sql, tenantId) {
  try {
    return Number(db.prepare(sql).get(tenantId)?.count || 0);
  } catch {
    return 0;
  }
}

export function dataIntegrityReport(tenantId) {
  const references = new Map();
  for (const [table, wanted] of Object.entries(publicColumns)) {
    if (!tableExists(table)) continue;
    const columns = tableColumns(table),
      selected = wanted.filter((column) => columns.has(column));
    if (!selected.length || !columns.has("tenant_id")) continue;
    const idColumn = columns.has("id") ? "id" : "tenant_id";
    for (const row of db
      .prepare(
        `SELECT ${[idColumn, ...selected].map((name) => `"${name}"`).join(",")} FROM "${table}" WHERE tenant_id=?`
      )
      .all(tenantId)) {
      for (const column of selected)
        addReference(references, row[column], `${table}.${column}`, row[idColumn]);
    }
  }
  if (tableExists("live_messages")) {
    for (const row of db
      .prepare(
        "SELECT id,attachment_url FROM live_messages WHERE tenant_id=? AND attachment_url IS NOT NULL AND attachment_url<>''"
      )
      .all(tenantId)) {
      addReference(references, row.attachment_url, "live_messages.attachment_url", row.id);
    }
  }
  if (tableExists("quote_items") && tableExists("quotes")) {
    const rows = db
      .prepare(
        "SELECT i.id,i.product_snapshot_json FROM quote_items i JOIN quotes q ON q.id=i.quote_id WHERE q.tenant_id=?"
      )
      .all(tenantId);
    for (const row of rows) {
      let snapshot = {};
      try {
        snapshot = JSON.parse(row.product_snapshot_json || "{}");
      } catch {}
      for (const key of [
        "image_url",
        "brochure_url",
        "ce_certificate_url",
        "manual_url",
        "image_path",
        "brochure_path"
      ]) {
        addReference(references, snapshot[key], `quote_items.snapshot.${key}`, row.id);
      }
    }
  }
  if (tableExists("app_settings")) {
    for (const row of db.prepare("SELECT key,value_json FROM app_settings WHERE tenant_id=?").all(tenantId)) {
      const values = String(row.value_json || "").match(/\/public\/uploads\/[^"'\\\s)]+/g) || [];
      for (const value of values) addReference(references, value, `app_settings.${row.key}`, row.key);
    }
  }
  const missing = [...references.values()].filter((item) => !fs.existsSync(item.file));
  const tenantPublicRoot = path.join(publicRoot, tenantUploadSegment(tenantId));
  const referencedPublic = new Set(
    [...references.keys()].filter((file) => file.startsWith(`${tenantPublicRoot}${path.sep}`))
  );
  const publicFiles = walkFiles(tenantPublicRoot);
  const orphanPublic = publicFiles
    .filter((file) => !referencedPublic.has(path.resolve(file)))
    .map((file) => ({
      file,
      relative: path.relative(publicRoot, file).split(path.sep).join("/"),
      size: fs.statSync(file).size,
      modified_at: fs.statSync(file).mtimeMs
    }));
  const relations = {
    contacts_without_customer: relationCount(
      "SELECT COUNT(*) count FROM customer_contacts c LEFT JOIN customers owner ON owner.id=c.customer_id AND owner.tenant_id=c.tenant_id WHERE c.tenant_id=? AND owner.id IS NULL",
      tenantId
    ),
    quote_customer_mismatch: relationCount(
      "SELECT COUNT(*) count FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id AND c.tenant_id=q.tenant_id WHERE q.tenant_id=? AND q.customer_id IS NOT NULL AND q.customer_id<>'' AND c.id IS NULL",
      tenantId
    ),
    invoice_quote_mismatch: relationCount(
      "SELECT COUNT(*) count FROM invoices i LEFT JOIN quotes q ON q.id=i.quote_id AND q.tenant_id=i.tenant_id WHERE i.tenant_id=? AND i.quote_id IS NOT NULL AND i.quote_id<>'' AND q.id IS NULL",
      tenantId
    )
  };
  const brokenRelations = Object.values(relations).reduce((sum, count) => sum + count, 0);
  return {
    ok: missing.length === 0 && brokenRelations === 0,
    checked_at: Date.now(),
    referenced_files: references.size,
    missing_files: missing.length,
    missing: missing
      .slice(0, 100)
      .map((item) => ({ ...item, file: path.relative(config.root, item.file).split(path.sep).join("/") })),
    orphan_public_files: orphanPublic.length,
    orphan_public: orphanPublic.slice(0, 100),
    relations,
    broken_relations: brokenRelations
  };
}

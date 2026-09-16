import { Router } from "express";
import { db } from "../db/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";

const r = Router();
r.use(requireAuth, requireRole("SUPER_ADMIN", "TENANT_ADMIN"));

const definitions = Object.freeze({
  customers: {
    label: "Müşteriler",
    icon: "👥",
    table: "customers",
    select: "id,code,company_name AS title,city AS detail,deleted_at,deleted_by",
    search: ["code", "company_name", "city", "tax_no"],
    restore:
      "UPDATE customers SET status='ACTIVE',deleted_at=NULL,deleted_by=NULL,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0",
    href: (row) => `/customers/${row.id}/edit`
  },
  products: {
    label: "Ürün ve Hizmetler",
    icon: "📦",
    table: "products",
    select: "id,code,name AS title,brand AS detail,deleted_at,deleted_by",
    search: ["code", "name", "brand", "model"],
    restore:
      "UPDATE products SET status='ACTIVE',deleted_at=NULL,deleted_by=NULL,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0",
    href: (row) => `/products/${row.id}/edit`
  },
  quotes: {
    label: "Proformalar",
    icon: "📄",
    table: "quotes",
    select: "id,quote_no AS code,subject AS title,project_name AS detail,order_status,deleted_at,deleted_by",
    search: ["quote_no", "subject", "project_name", "project_code", "customer_snapshot_json"],
    restore: null,
    href: (row) => `/quotes/${row.id}`
  },
  profiles: {
    label: "Firma Profilleri",
    icon: "🏢",
    table: "profiles",
    select: "id,quote_prefix AS code,company_name AS title,city AS detail,deleted_at,deleted_by",
    search: ["company_name", "short_name", "quote_prefix", "city"],
    restore:
      "UPDATE profiles SET is_active=0,deleted_at=NULL,deleted_by=NULL,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0",
    href: (row) => `/profiles/${row.id}/edit`
  },
  templates: {
    label: "Proforma Şablonları",
    icon: "🎨",
    table: "quote_templates",
    select: "id,template_key AS code,name AS title,description AS detail,deleted_at,deleted_by",
    search: ["template_key", "name", "description"],
    restore:
      "UPDATE quote_templates SET is_default=0,deleted_at=NULL,deleted_by=NULL,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0",
    href: (row) => `/templates?edit=${encodeURIComponent(row.id)}`
  }
});

function archivedRows(tenantId, definition, q, limit = 50) {
  const params = { tenantId, limit };
  const search = q
    ? ` AND (${definition.search
        .map((column, index) => {
          params[`q${index}`] = `%${q}%`;
          return `${column} LIKE @q${index}`;
        })
        .join(" OR ")})`
    : "";
  return db
    .prepare(
      `SELECT ${definition.select} FROM ${definition.table}
    WHERE tenant_id=@tenantId AND COALESCE(deleted_at,0)<>0${search}
    ORDER BY deleted_at DESC,updated_at DESC LIMIT @limit`
    )
    .all(params);
}

function archiveCount(tenantId, definition) {
  return Number(
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM ${definition.table} WHERE tenant_id=? AND COALESCE(deleted_at,0)<>0`
      )
      .get(tenantId)?.n || 0
  );
}

r.get("/", (req, res) => {
  const q = String(req.query.q || "")
    .trim()
    .slice(0, 120);
  const selectedType = definitions[req.query.type] ? String(req.query.type) : "all";
  const sections = Object.entries(definitions)
    .filter(([key]) => selectedType === "all" || key === selectedType)
    .map(([key, definition]) => {
      const rows = archivedRows(req.tenantId, definition, q).map((row) => ({
        ...row,
        href: definition.href(row)
      }));
      return { key, ...definition, rows, total: archiveCount(req.tenantId, definition) };
    });
  const counts = Object.fromEntries(
    Object.entries(definitions).map(([key, definition]) => [key, archiveCount(req.tenantId, definition)])
  );
  res.setHeader("Cache-Control", "no-store");
  res.render("recovery/index", {
    title: req.locale === "en" ? "Archive & Recovery Center" : "Arşiv ve Kurtarma Merkezi",
    q,
    selectedType,
    sections,
    counts,
    grandTotal: Object.values(counts).reduce((sum, value) => sum + value, 0)
  });
});

r.post("/:type/:id/restore", (req, res, next) => {
  try {
    const definition = definitions[req.params.type];
    if (!definition) throw Object.assign(new Error("Kurtarma türü geçersiz."), { status: 404, expose: true });
    const old = db
      .prepare(`SELECT * FROM ${definition.table} WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0`)
      .get(req.tenantId, req.params.id);
    if (!old)
      throw Object.assign(new Error("Arşiv kaydı bulunamadı veya daha önce geri alındı."), {
        status: 404,
        expose: true
      });
    const now = Date.now();
    let result;
    if (req.params.type === "quotes") {
      const restoredStatus =
        String(old.order_status || "NONE").toUpperCase() !== "NONE" &&
        String(old.order_status || "NONE").toUpperCase() !== "ORDER_CANCELLED"
          ? "ORDERED"
          : "DRAFT";
      result = db
        .prepare(
          "UPDATE quotes SET status=?,deleted_at=NULL,deleted_by=NULL,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0"
        )
        .run(restoredStatus, now, req.tenantId, old.id);
    } else {
      result = db.prepare(definition.restore).run(now, req.tenantId, old.id);
    }
    if (!result.changes)
      throw Object.assign(new Error("Kayıt geri alınamadı; işlem sırasında kayıt değişmiş olabilir."), {
        status: 409,
        expose: true
      });
    audit(req, {
      action: "RECOVERY_RESTORE",
      module: "RECOVERY",
      entityId: old.id,
      oldValue: old,
      newValue: { type: req.params.type, restored_at: now }
    });
    flash(req, "success", `${definition.label} kaydı güvenli biçimde arşivden çıkarıldı.`);
    res.redirect(`/recovery?type=${encodeURIComponent(req.params.type)}`);
  } catch (error) {
    next(error);
  }
});

export default r;

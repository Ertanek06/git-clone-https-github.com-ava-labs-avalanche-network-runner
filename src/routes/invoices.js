import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { loadQuote } from "../services/quote.service.js";
const r = Router();
r.use(requireAuth);
const text = (v) => String(v ?? "").trim();
const now = () => Date.now();
const notFound = () => Object.assign(new Error("Fatura bulunamadı."), { status: 404, expose: true });
function nextInvoiceNo(tenantId) {
  const year = new Date().getFullYear();
  return db.transaction(() => {
    const current = db
      .prepare("SELECT last_value FROM invoice_counters WHERE tenant_id=? AND year=?")
      .get(tenantId, year);
    if (!current) {
      const rows = db
        .prepare("SELECT invoice_no FROM invoices WHERE tenant_id=? AND invoice_no LIKE ?")
        .all(tenantId, `INV-${year}-%`);
      const max = rows.reduce(
        (m, x) => Math.max(m, Number(String(x.invoice_no || "").match(/^(?:INV)-\d{4}-(\d+)/)?.[1] || 0)),
        0
      );
      db.prepare("INSERT INTO invoice_counters(tenant_id,year,last_value) VALUES(?,?,?)").run(
        tenantId,
        year,
        max
      );
    }
    db.prepare("UPDATE invoice_counters SET last_value=last_value+1 WHERE tenant_id=? AND year=?").run(
      tenantId,
      year
    );
    const value = Number(
      db.prepare("SELECT last_value FROM invoice_counters WHERE tenant_id=? AND year=?").get(tenantId, year)
        .last_value
    );
    return `INV-${year}-${String(value).padStart(5, "0")}`;
  })();
}
r.get("/", requirePermission("invoices", "view"), (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1),
    limit = 100,
    offset = (page - 1) * limit;
  const total = Number(
    db.prepare("SELECT COUNT(*) n FROM invoices WHERE tenant_id=?").get(req.tenantId).n || 0
  );
  const rows = db
    .prepare(
      "SELECT i.*,q.quote_no,q.revision_no FROM invoices i LEFT JOIN quotes q ON q.id=i.quote_id WHERE i.tenant_id=? ORDER BY i.created_at DESC LIMIT ? OFFSET ?"
    )
    .all(req.tenantId, limit, offset);
  res.render("invoices/index", {
    title: "Fatura Entegrasyonu",
    rows,
    page,
    pages: Math.max(1, Math.ceil(total / limit))
  });
});
r.post("/from-quote/:quoteId", requirePermission("invoices", "create"), (req, res) => {
  const q = loadQuote(req.tenantId, req.params.quoteId);
  if (!q) throw Object.assign(new Error("Proforma bulunamadı."), { status: 404, expose: true });
  const existing = db
    .prepare("SELECT * FROM invoices WHERE tenant_id=? AND quote_id=? ORDER BY created_at DESC LIMIT 1")
    .get(req.tenantId, q.id);
  if (existing) {
    flash(req, "success", `Bu teklif için fatura taslağı zaten var: ${existing.invoice_no}`);
    return res.redirect("/invoices");
  }
  const inv = {
    id: id("inv"),
    tenant_id: req.tenantId,
    quote_id: q.id,
    invoice_no: nextInvoiceNo(req.tenantId),
    invoice_type: ["EARSIV", "EFATURA"].includes(String(req.body.invoice_type || "").toUpperCase())
      ? String(req.body.invoice_type).toUpperCase()
      : "EARSIV",
    status: "DRAFT",
    customer_snapshot_json: JSON.stringify(q.customer_snapshot || {}),
    items_json: JSON.stringify(q.items || []),
    subtotal: q.subtotal || 0,
    vat_total: q.vat_total || 0,
    discount_total: q.discount_total || 0,
    grand_total: q.grand_total || 0,
    currency: q.currency || "TRY",
    integration_provider: "MANUAL",
    created_by: req.user.id,
    created_at: now(),
    updated_at: now()
  };
  db.prepare(
    `INSERT INTO invoices(id,tenant_id,quote_id,invoice_no,invoice_type,status,customer_snapshot_json,items_json,subtotal,vat_total,discount_total,grand_total,currency,integration_provider,created_by,created_at,updated_at) VALUES(@id,@tenant_id,@quote_id,@invoice_no,@invoice_type,@status,@customer_snapshot_json,@items_json,@subtotal,@vat_total,@discount_total,@grand_total,@currency,@integration_provider,@created_by,@created_at,@updated_at)`
  ).run(inv);
  audit(req, {
    action: "INVOICE_DRAFT_CREATE",
    module: "INVOICES",
    entityId: inv.id,
    newValue: { invoice_no: inv.invoice_no, quote_no: q.quote_no }
  });
  flash(req, "success", `Fatura taslağı oluşturuldu: ${inv.invoice_no}`);
  res.redirect("/invoices");
});
r.post("/:id/status", requirePermission("invoices", "edit"), (req, res) => {
  const row = db
    .prepare("SELECT * FROM invoices WHERE tenant_id=? AND id=?")
    .get(req.tenantId, req.params.id);
  if (!row) throw notFound();
  const status = ["DRAFT", "READY", "EXPORTED", "SENT", "CANCELLED"].includes(
    String(req.body.status || "").toUpperCase()
  )
    ? String(req.body.status).toUpperCase()
    : row.status;
  db.prepare(
    'UPDATE invoices SET status=?,external_status=?,error_message=?,updated_at=?,exported_at=CASE WHEN ?="EXPORTED" THEN COALESCE(exported_at,?) ELSE exported_at END,sent_at=CASE WHEN ?="SENT" THEN COALESCE(sent_at,?) ELSE sent_at END WHERE tenant_id=? AND id=?'
  ).run(
    status,
    text(req.body.external_status),
    text(req.body.error_message),
    now(),
    status,
    now(),
    status,
    now(),
    req.tenantId,
    row.id
  );
  audit(req, {
    action: "INVOICE_STATUS_UPDATE",
    module: "INVOICES",
    entityId: row.id,
    oldValue: { status: row.status },
    newValue: { status }
  });
  flash(req, "success", "Fatura durumu güncellendi.");
  res.redirect("/invoices");
});
r.post("/:id/export.json", requirePermission("invoices", "export"), (req, res) => {
  const row = db
    .prepare("SELECT * FROM invoices WHERE tenant_id=? AND id=?")
    .get(req.tenantId, req.params.id);
  if (!row) throw notFound();
  const payload = {
    invoice_no: row.invoice_no,
    invoice_type: row.invoice_type,
    status: row.status,
    customer: JSON.parse(row.customer_snapshot_json || "{}"),
    items: JSON.parse(row.items_json || "[]"),
    totals: {
      subtotal: row.subtotal,
      discount_total: row.discount_total,
      vat_total: row.vat_total,
      grand_total: row.grand_total,
      currency: row.currency
    }
  };
  db.prepare(
    "UPDATE invoices SET status=?,exported_at=COALESCE(exported_at,?),updated_at=? WHERE tenant_id=? AND id=?"
  ).run("EXPORTED", now(), now(), req.tenantId, row.id);
  audit(req, {
    action: "INVOICE_JSON_EXPORT",
    module: "INVOICES",
    entityId: row.id,
    newValue: { invoice_no: row.invoice_no }
  });
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${String(row.invoice_no).replace(/[^A-Za-z0-9._-]/g, "_")}.json"`
  );
  res.type("application/json").send(JSON.stringify(payload, null, 2));
});
export default r;

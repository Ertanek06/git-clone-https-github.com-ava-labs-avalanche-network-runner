import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/auth.js";
import { upload, publicFile, validateUploads } from "../middleware/upload.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { hasPermission } from "../services/permission.service.js";
import fs from "fs";
import { runWithNewCustomerCode } from "../services/customer-code.service.js";
import { safeText, upperTr, foldTR, searchText } from "../utils/text.js";
const r = Router();
r.use(requireAuth);
const customerView = requirePermission("customers", "view"),
  customerCreate = requirePermission("customers", "create"),
  customerEdit = requirePermission("customers", "edit"),
  customerArchive = requirePermission("customers", "archive"),
  customerExport = requirePermission("customers", "export");
const text = safeText;
const wantsJson = (req) => req.accepts(["json", "html"]) === "json";
const trCompare = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "tr-TR", { sensitivity: "base", numeric: true });
const customerListSort = (v) => (String(v || "recent") === "alpha" ? "alpha" : "recent");
const deletedWhere =
  "COALESCE(deleted_at,0)=0 AND UPPER(COALESCE(status,'ACTIVE')) NOT IN ('DELETED','SILINDI')";
const customerSearch = (row) =>
  searchText(
    row.code,
    row.company_name,
    row.short_name,
    row.contact_name,
    row.contact_title,
    row.phone,
    row.mobile,
    row.email,
    row.tax_office,
    row.tax_no,
    row.billing_address,
    row.delivery_address,
    row.address1,
    row.address2,
    row.district,
    row.city,
    row.country,
    row.postal_code,
    row.sector,
    row.payment_method,
    row.note
  );
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
function readContacts(tenantId, customerId) {
  return db
    .prepare(
      "SELECT * FROM customer_contacts WHERE tenant_id=? AND customer_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_default_quote DESC,is_billing DESC,is_technical DESC,created_at ASC"
    )
    .all(tenantId, customerId);
}
export function saveContacts(tenantId, customerId, body, userId) {
  const contactIds = arr(body.contact_id),
    names = arr(body.contact_full_name),
    titles = arr(body.contact_extra_title),
    phones = arr(body.contact_extra_phone),
    mobiles = arr(body.contact_extra_mobile),
    emails = arr(body.contact_extra_email),
    roles = arr(body.contact_role),
    notes = arr(body.contact_note);
  const now = Date.now();
  const existing = db
    .prepare(
      "SELECT id FROM customer_contacts WHERE tenant_id=? AND customer_id=? AND COALESCE(deleted_at,0)=0"
    )
    .all(tenantId, customerId);
  const existingIds = new Set(existing.map((row) => row.id)),
    kept = new Set();
  const update = db.prepare(
    "UPDATE customer_contacts SET full_name=?,title=?,phone=?,mobile=?,email=?,role_key=?,is_default_quote=?,is_billing=?,is_technical=?,note=?,status='ACTIVE',deleted_at=NULL,deleted_by=NULL,updated_at=? WHERE id=? AND tenant_id=? AND customer_id=?"
  );
  const insert = db.prepare(
    "INSERT INTO customer_contacts(id,tenant_id,customer_id,full_name,title,phone,mobile,email,role_key,is_default_quote,is_billing,is_technical,note,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  );
  const archive = db.prepare(
    "UPDATE customer_contacts SET status='ARCHIVED',deleted_at=?,deleted_by=?,updated_at=? WHERE id=? AND tenant_id=? AND customer_id=? AND COALESCE(deleted_at,0)=0"
  );
  db.transaction(() => {
    names.forEach((rawName, i) => {
      const name = upperTr(rawName);
      if (!name) return;
      const role = upperTr(roles[i] || "GENERAL"),
        flags = [
          role === "TEKLIF" || role === "SATIN ALMA" ? 1 : 0,
          role === "MUHASEBE" ? 1 : 0,
          role === "TEKNIK" ? 1 : 0
        ];
      const incomingId = text(contactIds[i]),
        contactId =
          incomingId && existingIds.has(incomingId) && !kept.has(incomingId) ? incomingId : id("cnt");
      const values = [
        name,
        upperTr(titles[i]),
        text(phones[i]),
        text(mobiles[i]),
        text(emails[i]).toLowerCase(),
        role,
        ...flags,
        text(notes[i])
      ];
      if (existingIds.has(contactId)) update.run(...values, now, contactId, tenantId, customerId);
      else insert.run(contactId, tenantId, customerId, ...values, "ACTIVE", now, now);
      kept.add(contactId);
    });
    for (const row of existing)
      if (!kept.has(row.id)) archive.run(now, userId, now, row.id, tenantId, customerId);
  })();
}
function customerStats(quotes) {
  const isOrder = (q) =>
    (String(q.status || "").toUpperCase() === "ORDERED" ||
      String(q.order_status || "NONE").toUpperCase() !== "NONE") &&
    String(q.order_status || "NONE").toUpperCase() !== "ORDER_CANCELLED";
  const isDelivered = (q) =>
    String(q.status || "").toUpperCase() === "DELIVERED" ||
    String(q.order_status || "").toUpperCase() === "SHIPPED" ||
    String(q.production_status || "").toUpperCase() === "COMPLETED";
  const total = quotes.reduce((a, q) => a + Number(q.grand_total || 0), 0),
    paid = quotes.reduce((a, q) => a + Number(q.paid_amount || 0), 0),
    remaining = quotes.reduce(
      (a, q) => a + Math.max(0, Number(q.grand_total || 0) - Number(q.paid_amount || 0)),
      0
    );
  const ordered = quotes.filter(isOrder).length,
    delivered = quotes.filter((q) => isOrder(q) && isDelivered(q)).length,
    openOrders = quotes.filter((q) => isOrder(q) && !isDelivered(q)).length;
  const won = quotes.filter(
    (q) =>
      ["APPROVED", "ORDERED", "DELIVERED"].includes(String(q.status || "").toUpperCase()) &&
      String(q.order_status || "NONE").toUpperCase() !== "ORDER_CANCELLED"
  ).length;
  const lost = quotes.filter(
    (q) =>
      ["REJECTED", "EXPIRED"].includes(String(q.status || "").toUpperCase()) ||
      String(q.order_status || "NONE").toUpperCase() === "ORDER_CANCELLED"
  ).length;
  const pendingApproval = quotes.filter(
    (q) => String(q.approval_status || "").toUpperCase() === "PENDING"
  ).length;
  const paidCount = quotes.filter((q) => String(q.payment_status || "").toUpperCase() === "PAID").length;
  const cancelledOrders = quotes.filter(
    (q) => String(q.order_status || "NONE").toUpperCase() === "ORDER_CANCELLED"
  ).length;
  return {
    count: quotes.length,
    won,
    lost,
    total,
    paid,
    remaining,
    waiting: remaining,
    ordered,
    openOrders,
    delivered,
    pendingApproval,
    paidCount,
    cancelledOrders,
    last: quotes[0]?.quote_date || quotes[0]?.created_at || null
  };
}
const actionLabels = {
  CUSTOMER_CREATE: "Müşteri oluşturuldu",
  CUSTOMER_UPDATE: "Müşteri bilgileri güncellendi",
  CUSTOMER_BULK_ARCHIVE: "Müşteri arşivlendi",
  QUOTE_CREATE: "Proforma oluşturuldu",
  QUOTE_UPDATE: "Proforma güncellendi",
  QUOTE_STATUS: "Süreç durumu güncellendi",
  QUOTE_TO_ORDER: "Siparişe dönüştürüldü",
  QUOTE_REVISION: "Revizyon oluşturuldu",
  QUOTE_APPROVAL: "Onay işlemi yapıldı",
  QUOTE_FOLLOW_UP: "Takip bilgisi güncellendi"
};
function customerActivities(tenantId, row, quotes) {
  const ids = quotes.map((q) => q.id).filter(Boolean),
    rows = [];
  rows.push(
    ...db
      .prepare(
        "SELECT * FROM audit_logs WHERE tenant_id=? AND module='CUSTOMERS' AND entity_id=? ORDER BY created_at DESC LIMIT 30"
      )
      .all(tenantId, row.id)
  );
  if (ids.length) {
    const ph = ids.map(() => "?").join(",");
    rows.push(
      ...db
        .prepare(
          `SELECT * FROM audit_logs WHERE tenant_id=? AND module='QUOTES' AND entity_id IN (${ph}) ORDER BY created_at DESC LIMIT 50`
        )
        .all(tenantId, ...ids)
    );
  }
  return rows
    .sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0))
    .slice(0, 18)
    .map((a) => {
      let next = {},
        old = {};
      try {
        next = JSON.parse(a.new_json || "{}");
      } catch {}
      try {
        old = JSON.parse(a.old_json || "{}");
      } catch {}
      const title = actionLabels[a.action] || a.action;
      let detail = "";
      if (a.module === "QUOTES") {
        const q = quotes.find((x) => x.id === a.entity_id);
        detail = [
          q?.quote_no,
          next.orderNo,
          next.status,
          next.order_status,
          next.payment_status,
          next.production_status
        ]
          .filter(Boolean)
          .join(" · ");
      } else {
        detail = [next.company_name || old.company_name, next.code || old.code].filter(Boolean).join(" · ");
      }
      return { ...a, title, detail };
    });
}

function customerBody(body = {}) {
  const billing_address = upperTr(body.billing_address ?? body.address1),
    delivery_address = upperTr(body.delivery_address);
  return {
    company_name: upperTr(body.company_name),
    short_name: upperTr(body.short_name),
    contact_name: upperTr(body.contact_name),
    contact_title: upperTr(body.contact_title),
    phone: text(body.phone),
    mobile: text(body.mobile),
    email: text(body.email).toLowerCase(),
    website: text(body.website),
    tax_office: upperTr(body.tax_office),
    tax_no: text(body.tax_no),
    billing_address,
    delivery_address,
    address1: billing_address,
    address2: "",
    district: upperTr(body.district),
    city: upperTr(body.city),
    country: upperTr(body.country) || "TÜRKİYE",
    postal_code: text(body.postal_code),
    sector: upperTr(body.sector),
    currency: upperTr(body.currency) || "TRY",
    payment_method: upperTr(body.payment_method),
    note: text(body.note),
    status: upperTr(body.status) || "ACTIVE"
  };
}
function duplicate(t, b, ignore = "") {
  const first = text(b.company_name).split(/\s+/).slice(0, 2).join(" ");
  return db
    .prepare(
      `SELECT id,code,company_name FROM customers WHERE tenant_id=? AND id<>? AND ${deletedWhere} AND ((tax_no<>'' AND tax_no=?) OR (phone<>'' AND phone=?) OR (mobile<>'' AND mobile=?) OR (email<>'' AND lower(email)=lower(?)) OR (company_name<>'' AND lower(company_name) LIKE lower(?))) LIMIT 1`
    )
    .get(t, ignore, b.tax_no || "", b.phone || "", b.mobile || "", b.email || "", `${first}%`);
}
const searchIndexRefreshed = new Set();
function backfillSearch(tenantId) {
  const once = !searchIndexRefreshed.has(tenantId);
  const rows = db
    .prepare(
      once
        ? `SELECT * FROM customers WHERE tenant_id=? AND ${deletedWhere}`
        : `SELECT * FROM customers WHERE tenant_id=? AND ${deletedWhere} AND (search_text IS NULL OR search_text='') LIMIT 500`
    )
    .all(tenantId);
  if (!rows.length) {
    searchIndexRefreshed.add(tenantId);
    return;
  }
  const upd = db.prepare("UPDATE customers SET search_text=? WHERE tenant_id=? AND id=?");
  db.transaction(() =>
    rows.forEach((row) => {
      const next = customerSearch(row);
      if (row.search_text !== next) upd.run(next, tenantId, row.id);
    })
  )();
  searchIndexRefreshed.add(tenantId);
}
function quoteRowsForCustomer(tenantId, row) {
  /* The indexed customer_id path handles normal records immediately. Legacy
     snapshot matching is limited to rows that genuinely have no customer_id;
     the previous OR expression forced a JSON text scan across every quote. */
  const direct = db
    .prepare(
      `SELECT * FROM quotes WHERE tenant_id=? AND customer_id=? AND COALESCE(deleted_at,0)=0 ORDER BY updated_at DESC,created_at DESC LIMIT 250`
    )
    .all(tenantId, row.id);
  if (direct.length >= 250) return direct;
  const legacy = db
    .prepare(
      `SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND COALESCE(customer_id,'')='' AND (customer_snapshot_json LIKE ? OR customer_snapshot_json LIKE ? OR customer_snapshot_json LIKE ? OR customer_snapshot_json LIKE ?) ORDER BY updated_at DESC,created_at DESC LIMIT 250`
    )
    .all(
      tenantId,
      `%${row.company_name || ""}%`,
      row.code ? `%${row.code}%` : "__NO_CODE__",
      row.tax_no ? `%${row.tax_no}%` : "__NO_TAX__",
      row.email ? `%${row.email}%` : "__NO_EMAIL__"
    );
  const candidates = [...direct, ...legacy];
  const needles = [row.id, row.code, row.company_name, row.tax_no, row.email].map(foldTR).filter(Boolean);
  const seen = new Set(),
    out = [];
  for (const q of candidates) {
    let snap = {};
    try {
      snap = JSON.parse(q.customer_snapshot_json || "{}");
    } catch {}
    const hay = searchText(
      q.customer_id,
      snap.id,
      snap.code,
      snap.company_name,
      snap.short_name,
      snap.tax_no,
      snap.email
    );
    if (q.customer_id === row.id || needles.some((n) => n && hay.includes(n))) {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        out.push(q);
      }
    }
  }
  return out
    .sort((a, b) => Number(b.updated_at || b.created_at || 0) - Number(a.updated_at || a.created_at || 0))
    .slice(0, 250);
}

const xmlEsc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const spreadsheetRow = (values) =>
  `<Row>${values.map((x) => `<Cell><Data ss:Type="String">${xmlEsc(x)}</Data></Cell>`).join("")}</Row>`;
const customerColumns = [
  "code",
  "company_name",
  "short_name",
  "contact_name",
  "contact_title",
  "phone",
  "mobile",
  "email",
  "website",
  "tax_office",
  "tax_no",
  "billing_address",
  "delivery_address",
  "district",
  "city",
  "country",
  "postal_code",
  "sector",
  "currency",
  "payment_method",
  "note"
];
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
  const XLSX = await import("xlsx");
  const wb = XLSX.readFile(filePath);
  const name = wb.SheetNames[0];
  return XLSX.utils
    .sheet_to_json(wb.Sheets[name], { defval: "" })
    .map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [text(k), text(v)])));
}
async function readCustomerImportRows(file) {
  const ext = (file.originalname || "").toLowerCase();
  if (ext.endsWith(".xlsx")) return parseWorkbookXlsx(file.path);
  const raw = fs.readFileSync(file.path, "utf8");
  return /^\s*<\?xml/i.test(raw) ? parseSpreadsheetXml(raw) : parseCsv(raw);
}
function upsertImportedCustomers(tenantId, rows) {
  let added = 0,
    updated = 0,
    skipped = 0;
  const exists = db.prepare("SELECT * FROM customers WHERE tenant_id=? AND code=?");
  const stmt = db.prepare(
    `INSERT INTO customers(id,tenant_id,code,company_name,short_name,contact_name,contact_title,phone,mobile,email,website,tax_office,tax_no,billing_address,delivery_address,address1,address2,district,city,country,postal_code,sector,currency,payment_method,note,status,search_text,created_at,updated_at) VALUES(@id,@tenant_id,@code,@company_name,@short_name,@contact_name,@contact_title,@phone,@mobile,@email,@website,@tax_office,@tax_no,@billing_address,@delivery_address,@address1,'',@district,@city,@country,@postal_code,@sector,@currency,@payment_method,@note,'ACTIVE',@search_text,@created_at,@updated_at) ON CONFLICT(tenant_id,code) DO UPDATE SET company_name=excluded.company_name,short_name=excluded.short_name,contact_name=excluded.contact_name,contact_title=excluded.contact_title,phone=excluded.phone,mobile=excluded.mobile,email=excluded.email,website=excluded.website,tax_office=excluded.tax_office,tax_no=excluded.tax_no,billing_address=excluded.billing_address,delivery_address=excluded.delivery_address,address1=excluded.address1,district=excluded.district,city=excluded.city,country=excluded.country,postal_code=excluded.postal_code,sector=excluded.sector,currency=excluded.currency,payment_method=excluded.payment_method,note=excluded.note,status='ACTIVE',deleted_at=NULL,deleted_by=NULL,search_text=excluded.search_text,updated_at=excluded.updated_at`
  );
  db.transaction(() =>
    rows.forEach((row) => {
      const company_name = upperTr(row.company_name || row.unvan || row.firma),
        code = upperTr(row.code || row.musteri_kodu);
      if (!company_name) {
        skipped++;
        return;
      }
      const now = Date.now();
      const finalCode = code || runWithNewCustomerCode(tenantId, (nextCode) => nextCode);
      const had = !!exists.get(tenantId, finalCode);
      const rec = {
        id: id("cus"),
        tenant_id: tenantId,
        code: finalCode,
        company_name,
        short_name: upperTr(row.short_name),
        contact_name: upperTr(row.contact_name),
        contact_title: upperTr(row.contact_title),
        phone: text(row.phone),
        mobile: text(row.mobile),
        email: text(row.email).toLowerCase(),
        website: text(row.website),
        tax_office: upperTr(row.tax_office),
        tax_no: text(row.tax_no),
        billing_address: upperTr(row.billing_address || row.address1),
        delivery_address: upperTr(row.delivery_address),
        address1: upperTr(row.billing_address || row.address1),
        district: upperTr(row.district),
        city: upperTr(row.city),
        country: upperTr(row.country) || "TÜRKİYE",
        postal_code: text(row.postal_code),
        sector: upperTr(row.sector),
        currency: upperTr(row.currency) || "TRY",
        payment_method: upperTr(row.payment_method),
        note: text(row.note),
        created_at: now,
        updated_at: now
      };
      rec.search_text = customerSearch(rec);
      stmt.run(rec);
      had ? updated++ : added++;
    })
  )();
  return { added, updated, skipped, total: added + updated };
}

r.get("/", customerView, (req, res) => {
  backfillSearch(req.tenantId);
  const q = text(req.query.q),
    sort = customerListSort(req.query.sort),
    showAll = String(req.query.show || "").toLowerCase() === "all",
    page = showAll ? 1 : Math.max(1, Number(req.query.page) || 1),
    limit = Math.min(100, Math.max(10, Number(req.query.limit) || 30)),
    off = (page - 1) * limit;
  const tokens = searchText(q).split(/\s+/).filter(Boolean);
  const order =
    sort === "alpha"
      ? "company_name COLLATE NOCASE ASC, code COLLATE NOCASE ASC"
      : "created_at DESC, updated_at DESC, company_name COLLATE NOCASE ASC";
  let where = `tenant_id=@t AND ${deletedWhere}`,
    params = { t: req.tenantId };
  if (tokens.length) {
    where += tokens.map((_, i) => ` AND search_text LIKE @q${i}`).join("");
    tokens.forEach((token, i) => (params[`q${i}`] = `%${token}%`));
  }
  const total = Number(db.prepare(`SELECT COUNT(*) AS n FROM customers WHERE ${where}`).get(params).n || 0);
  /* customer_id is indexed. Snapshot LIKE fallbacks inside this correlated
     subquery made the quotes table scan once for every visible customer. */
  const selectSql = `SELECT c.*,(SELECT COUNT(*) FROM quotes q WHERE q.tenant_id=c.tenant_id AND q.customer_id=c.id AND COALESCE(q.deleted_at,0)=0) AS quote_count FROM customers c WHERE ${where} ORDER BY ${order}`;
  const rows = showAll
    ? db.prepare(selectSql).all(params)
    : db.prepare(`${selectSql} LIMIT @limit OFFSET @off`).all({ ...params, limit, off });
  res.render("customers/index", { title: "Müşteriler", rows, q, sort, page, limit, total, showAll });
});
r.get("/new", customerCreate, (req, res) =>
  res.render("customers/form", {
    title: "Yeni Müşteri",
    row: { country: "Türkiye", currency: "TRY", status: "ACTIVE", contacts: [] }
  })
);
r.get("/:id/preview", customerView, (req, res) => {
  const row = db
    .prepare(`SELECT * FROM customers WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Müşteri bulunamadı."), { status: 404, expose: true });
  const quotes = quoteRowsForCustomer(req.tenantId, row);
  const contacts = readContacts(req.tenantId, row.id);
  const stats = customerStats(quotes);
  const activities = customerActivities(req.tenantId, row, quotes);
  const capabilities = {
    financials: hasPermission(req.user, "financials", "view"),
    customerEdit: hasPermission(req.user, "customers", "edit"),
    quoteCreate: hasPermission(req.user, "quotes", "create"),
    quoteEdit: hasPermission(req.user, "quotes", "edit"),
    quoteArchive: hasPermission(req.user, "quotes", "archive"),
    quoteExport: hasPermission(req.user, "quotes", "export")
  };
  res.setHeader("Cache-Control", "no-store");
  res.render("customers/preview", {
    layout: false,
    title: "Müşteri Ön İzleme",
    row,
    quotes,
    contacts,
    stats,
    activities,
    capabilities
  });
});
r.post("/:id/preview-update", customerEdit, (req, res, next) => {
  try {
    const old = db
      .prepare(`SELECT * FROM customers WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
      .get(req.tenantId, req.params.id);
    if (!old) throw Object.assign(new Error("Müşteri bulunamadı."), { status: 404, expose: true });
    const incoming = customerBody(req.body),
      b = {};
    for (const key of Object.keys(incoming)) b[key] = req.body[key] == null ? old[key] : incoming[key];
    if (!b.company_name)
      throw Object.assign(new Error("Firma unvanı zorunludur."), { status: 422, expose: true });
    const dup = duplicate(req.tenantId, b, old.id);
    if (dup)
      return res
        .status(409)
        .json({ ok: false, message: "Bu bilgiler başka bir müşteri kaydıyla eşleşiyor.", duplicate: dup });
    const nextRow = { ...old, ...b, address1: b.billing_address, updated_at: Date.now() };
    nextRow.search_text = customerSearch(nextRow);
    db.prepare(
      `UPDATE customers SET company_name=@company_name,short_name=@short_name,contact_name=@contact_name,contact_title=@contact_title,phone=@phone,mobile=@mobile,email=@email,website=@website,tax_office=@tax_office,tax_no=@tax_no,billing_address=@billing_address,delivery_address=@delivery_address,address1=@address1,district=@district,city=@city,country=@country,postal_code=@postal_code,sector=@sector,currency=@currency,payment_method=@payment_method,note=@note,status=@status,search_text=@search_text,updated_at=@updated_at WHERE tenant_id=@tenant_id AND id=@id`
    ).run({ ...nextRow, tenant_id: req.tenantId, id: old.id });
    audit(req, {
      action: "CUSTOMER_PREVIEW_UPDATE",
      module: "CUSTOMERS",
      entityId: old.id,
      oldValue: old,
      newValue: nextRow
    });
    res.json({ ok: true, row: nextRow, message: "Müşteri kartı güncellendi." });
  } catch (error) {
    if (wantsJson(req))
      return res
        .status(error.status || 500)
        .json({ ok: false, message: error.expose ? error.message : "Müşteri kartı güncellenemedi." });
    next(error);
  }
});
r.get("/:id/edit", customerEdit, (req, res) => {
  const row = db
    .prepare(`SELECT * FROM customers WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
    .get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Müşteri bulunamadı."), { status: 404, expose: true });
  row.contacts = readContacts(req.tenantId, row.id);
  res.render("customers/form", { title: "Müşteri Düzenle", row });
});
r.post(
  "/save",
  requireAnyPermission([
    ["customers", "create"],
    ["customers", "edit"]
  ]),
  upload.single("logo"),
  validateUploads,
  (req, res, next) => {
    try {
      const old = req.body.id
        ? db
            .prepare(`SELECT * FROM customers WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
            .get(req.tenantId, req.body.id)
        : null;
      if (old && !hasPermission(req.user, "customers", "edit"))
        throw Object.assign(new Error("Müşteri düzenleme yetkiniz yok."), { status: 403, expose: true });
      if (!old && !hasPermission(req.user, "customers", "create"))
        throw Object.assign(new Error("Müşteri oluşturma yetkiniz yok."), { status: 403, expose: true });
      const b = customerBody(req.body),
        dup = duplicate(req.tenantId, b, old?.id || "");
      if (!b.company_name)
        throw Object.assign(new Error("Firma unvanı zorunludur."), { status: 422, expose: true });
      if (dup) {
        if (wantsJson(req))
          return res.status(409).json({
            error: "duplicate",
            message: "Bu müşteri daha önce kaydedilmiş olabilir.",
            duplicate: dup
          });
        return res.status(409).render("customers/form", {
          title: "Müşteri Kaydı",
          row: { ...req.body, ...b },
          error: "Bu müşteri daha önce kaydedilmiş olabilir.",
          duplicate: dup
        });
      }
      const now = Date.now(),
        cid = old?.id || id("cus"),
        base = {
          ...b,
          id: cid,
          tenant_id: req.tenantId,
          logo_url: publicFile(req.file) || old?.logo_url || null,
          deleted_at: null,
          deleted_by: null,
          created_at: old?.created_at || now,
          updated_at: now
        };
      base.search_text = customerSearch({ ...old, ...base, code: old?.code || "" });
      const save = db.prepare(
        `INSERT INTO customers(id,tenant_id,code,company_name,short_name,contact_name,contact_title,phone,mobile,email,website,tax_office,tax_no,billing_address,delivery_address,address1,address2,district,city,country,postal_code,sector,currency,payment_method,note,logo_url,status,deleted_at,deleted_by,search_text,created_at,updated_at) VALUES(@id,@tenant_id,@code,@company_name,@short_name,@contact_name,@contact_title,@phone,@mobile,@email,@website,@tax_office,@tax_no,@billing_address,@delivery_address,@address1,@address2,@district,@city,@country,@postal_code,@sector,@currency,@payment_method,@note,@logo_url,@status,@deleted_at,@deleted_by,@search_text,@created_at,@updated_at) ON CONFLICT(id) DO UPDATE SET company_name=excluded.company_name,short_name=excluded.short_name,contact_name=excluded.contact_name,contact_title=excluded.contact_title,phone=excluded.phone,mobile=excluded.mobile,email=excluded.email,website=excluded.website,tax_office=excluded.tax_office,tax_no=excluded.tax_no,billing_address=excluded.billing_address,delivery_address=excluded.delivery_address,address1=excluded.address1,address2=excluded.address2,district=excluded.district,city=excluded.city,country=excluded.country,postal_code=excluded.postal_code,sector=excluded.sector,currency=excluded.currency,payment_method=excluded.payment_method,note=excluded.note,logo_url=excluded.logo_url,status=excluded.status,deleted_at=NULL,deleted_by=NULL,search_text=excluded.search_text,updated_at=excluded.updated_at`
      );
      let v;
      if (old) {
        v = { ...base, code: old.code, search_text: customerSearch({ ...base, code: old.code }) };
        save.run(v);
      } else {
        const code = runWithNewCustomerCode(req.tenantId, (nextCode) =>
          save.run({ ...base, code: nextCode, search_text: customerSearch({ ...base, code: nextCode }) })
        );
        v = { ...base, code, search_text: customerSearch({ ...base, code }) };
      }
      saveContacts(req.tenantId, cid, req.body, req.user.id);
      audit(req, {
        action: old ? "CUSTOMER_UPDATE" : "CUSTOMER_CREATE",
        module: "CUSTOMERS",
        entityId: cid,
        oldValue: old,
        newValue: { ...v, contacts: readContacts(req.tenantId, cid) }
      });
      if (wantsJson(req)) return res.json(v);
      flash(req, "success", "Müşteri kaydedildi.");
      res.redirect("/customers");
    } catch (e) {
      if (wantsJson(req))
        return res
          .status(e.status || 500)
          .json({ error: "save_failed", message: e.expose ? e.message : "Müşteri kaydedilemedi." });
      next(e);
    }
  }
);
r.post("/bulk-delete", customerArchive, (req, res) => {
  const ids = [].concat(req.body.ids || []).filter(Boolean);
  const now = Date.now(),
    upd = db.prepare(
      "UPDATE customers SET status='ARCHIVED',deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=?"
    );
  db.transaction(() => ids.forEach((x) => upd.run(now, req.user.id, now, req.tenantId, x)))();
  audit(req, { action: "CUSTOMER_BULK_ARCHIVE", module: "CUSTOMERS", newValue: { count: ids.length } });
  flash(req, "success", `${ids.length} müşteri arşivlendi.`);
  res.redirect("/customers");
});
r.get("/api/search", customerView, (req, res) => {
  backfillSearch(req.tenantId);
  const q = text(req.query.q),
    tokens = searchText(q).split(/\s+/).filter(Boolean),
    params = { t: req.tenantId };
  let where = `tenant_id=@t AND status='ACTIVE' AND ${deletedWhere}`;
  if (tokens.length) {
    where += tokens.map((_, i) => ` AND search_text LIKE @q${i}`).join("");
    tokens.forEach((token, i) => (params[`q${i}`] = `%${token}%`));
  }
  const rows = db
    .prepare(`SELECT * FROM customers WHERE ${where} ORDER BY company_name COLLATE NOCASE ASC LIMIT 60`)
    .all(params);
  if (!tokens.length) return res.json(rows.slice(0, 30));
  const needle = searchText(q);
  const ranked = rows
    .map((row) => {
      const parts = [
        row.company_name,
        row.short_name,
        row.code,
        row.contact_name,
        row.phone,
        row.mobile,
        row.tax_no,
        row.email,
        row.city
      ].map(foldTR);
      let score = 40;
      if (parts[2] === needle) score = 0;
      else if (parts[0] === needle || parts[1] === needle) score = 1;
      else if (parts[2].startsWith(needle)) score = 2;
      else if (parts[0].startsWith(needle) || parts[1].startsWith(needle)) score = 3;
      else score = 10;
      return { row, score };
    })
    .sort((a, b) => a.score - b.score || trCompare(a.row.company_name, b.row.company_name))
    .slice(0, 30)
    .map((x) => x.row);
  res.json(ranked);
});
r.get("/api/:id", customerView, (req, res) =>
  res.json(
    db
      .prepare(`SELECT * FROM customers WHERE tenant_id=? AND id=? AND ${deletedWhere}`)
      .get(req.tenantId, req.params.id) || {}
  )
);
r.get("/import-template.xls", customerExport, (_req, res) => {
  res.type("application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=musteri_toplu_yukleme_sablonu.xls");
  res.send(
    `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="customers"><Table>${spreadsheetRow(customerColumns)}${spreadsheetRow(["MUS-001", "ÖRNEK FİRMA LTD. ŞTİ.", "ÖRNEK", "ALİ VELİ", "SATIN ALMA", "03120000000", "05320000000", "info@example.com", "www.example.com", "ANKARA", "1234567890", "Örnek adres", "Sevk adresi", "ÇANKAYA", "ANKARA", "TÜRKİYE", "06000", "LABORATUVAR", "TRY", "PEŞİN", "Not"])}</Table></Worksheet></Workbook>`
  );
});
r.get("/export.xls", customerExport, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM customers WHERE tenant_id=? AND ${deletedWhere} ORDER BY created_at DESC,company_name COLLATE NOCASE ASC`
    )
    .all(req.tenantId);
  const body = rows
    .map((row) =>
      spreadsheetRow([
        row.code,
        row.company_name,
        row.short_name,
        row.contact_name,
        row.contact_title,
        row.phone,
        row.mobile,
        row.email,
        row.website,
        row.tax_office,
        row.tax_no,
        row.billing_address || row.address1,
        row.delivery_address,
        row.district,
        row.city,
        row.country,
        row.postal_code,
        row.sector,
        row.currency,
        row.payment_method,
        row.note
      ])
    )
    .join("");
  res.type("application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=musteri_listesi_yukleme_formatinda.xls");
  res.send(
    `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="customers"><Table>${spreadsheetRow(customerColumns)}${body}</Table></Worksheet></Workbook>`
  );
});
r.post(
  "/import-excel",
  requireAnyPermission([
    ["customers", "create"],
    ["customers", "edit"]
  ]),
  upload.single("excel"),
  validateUploads,
  async (req, res, next) => {
    try {
      if (!hasPermission(req.user, "customers", "create") || !hasPermission(req.user, "customers", "edit"))
        throw Object.assign(
          new Error(
            "Toplu müşteri aktarımı yeni ve mevcut kayıtları birlikte işleyebildiği için oluşturma ve düzenleme yetkilerinin ikisi de gereklidir."
          ),
          { status: 403, expose: true }
        );
      if (!req.file)
        throw Object.assign(new Error("Excel dosyası seçilmedi."), { status: 422, expose: true });
      const rows = await readCustomerImportRows(req.file),
        result = upsertImportedCustomers(req.tenantId, rows);
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
      audit(req, {
        action: "CUSTOMER_EXCEL_IMPORT",
        module: "CUSTOMERS",
        newValue: { ...result, file: req.file.originalname }
      });
      flash(
        req,
        "success",
        `${result.total} müşteri aktarıldı. Yeni: ${result.added}, güncellenen: ${result.updated}, atlanan: ${result.skipped}.`
      );
      res.redirect("/customers");
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

export default r;

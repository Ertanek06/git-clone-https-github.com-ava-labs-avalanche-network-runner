import { Router } from "express";
import { db } from "../db/db.js";
import { requireAuth } from "../middleware/auth.js";
import { hasPermission } from "../services/permission.service.js";
import { id } from "../utils/id.js";
import { ensureOperationalSchema } from "../services/operational-schema.service.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { addIsoDays, istanbulDateIso, istanbulMonthStartEpoch } from "../utils/date.js";

const r = Router();
r.use(requireAuth);

const active = "COALESCE(deleted_at,0)=0";
const statSql = {
  customers: `SELECT id,code,company_name,contact_name,city FROM customers WHERE tenant_id=? AND ${active} ORDER BY created_at DESC LIMIT 100`,
  products: `SELECT id,code,name,brand,sale_price,currency FROM products WHERE tenant_id=? AND ${active} ORDER BY created_at DESC LIMIT 100`,
  quotes: `SELECT id,quote_no,customer_snapshot_json,status,grand_total,currency FROM quotes WHERE tenant_id=? AND ${active} ORDER BY created_at DESC LIMIT 100`,
  expired: `SELECT id,quote_no,customer_snapshot_json,status,valid_until,grand_total,currency FROM quotes WHERE tenant_id=? AND ${active} AND valid_until<date('now','+3 hours') AND status NOT IN ('APPROVED','ORDERED','DELIVERED','ARCHIVED') ORDER BY valid_until`,
  pending: `SELECT id,quote_no,customer_snapshot_json,status,grand_total,currency FROM quotes WHERE tenant_id=? AND ${active} AND status IN ('SENT','WAITING_CUSTOMER','REVISION_REQUESTED') ORDER BY updated_at DESC`,
  orders: `SELECT id,quote_no,order_no,customer_snapshot_json,status,order_status,grand_total,currency FROM quotes WHERE tenant_id=? AND ${active} AND ((status='ORDERED' OR COALESCE(order_status,'NONE')<>'NONE') AND COALESCE(order_status,'NONE')<>'ORDER_CANCELLED') ORDER BY updated_at DESC`,
  delivery: `SELECT id,quote_no,customer_snapshot_json,delivery_date,status FROM quotes WHERE tenant_id=? AND ${active} AND delivery_date BETWEEN date('now','+3 hours') AND date('now','+3 hours','+14 days') ORDER BY delivery_date`,
  payments: `SELECT id,quote_no,customer_snapshot_json,payment_status,grand_total,paid_amount,currency FROM quotes WHERE tenant_id=? AND ${active} AND payment_status NOT IN ('PAID','CANCELLED') AND COALESCE(order_status,'NONE')<>'ORDER_CANCELLED' ORDER BY updated_at DESC`
};
const statPermissions = {
  customers: ["customers", "view"],
  products: ["products", "view"],
  quotes: ["quotes", "view"],
  expired: ["quotes", "view"],
  pending: ["quotes", "view"],
  orders: ["orders", "view"],
  delivery: ["quotes", "view"],
  payments: ["financials", "view"]
};

function can(req, module, action = "view") {
  return hasPermission(req.user, module, action);
}

const istanbulDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});
const istanbulTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});
function safeSnapshot(raw) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}
function visitRowPayload(row) {
  if (!row) return null;
  const customer = safeSnapshot(row.customer_snapshot_json),
    visitedAt = Number(row.created_at || 0),
    revision = Number(row.revision_no || 0);
  return {
    id: row.id,
    quote_id: row.quote_id,
    quote_no: row.quote_no || "-",
    revision_no: revision,
    display_no: revision > 0 ? `${row.quote_no || "-"} / Rev ${revision}` : row.quote_no || "-",
    company_name: customer.company_name || customer.name || "-",
    recipient_email: row.recipient_email || customer.email || "",
    visited_at: visitedAt,
    date: istanbulDateFormatter.format(new Date(visitedAt)),
    time: istanbulTimeFormatter.format(new Date(visitedAt))
  };
}
function quoteVisitRows(tenantId, latestOnly = false, limit = 1000) {
  const safeLimit = latestOnly ? 1 : Math.max(1, Math.min(2000, Number(limit) || 1000));
  return db
    .prepare(
      `SELECT e.id,e.quote_id,e.created_at,q.quote_no,q.revision_no,q.customer_snapshot_json,l.recipient_email
    FROM quote_view_events e
    JOIN quotes q ON q.tenant_id=e.tenant_id AND q.id=e.quote_id
    LEFT JOIN quote_send_logs l ON l.tenant_id=e.tenant_id AND l.id=e.send_log_id
    WHERE e.tenant_id=? AND COALESCE(q.deleted_at,0)=0 AND COALESCE(e.event_type,'HUMAN_VIEW')='HUMAN_VIEW'
    ORDER BY e.created_at DESC LIMIT ${safeLimit}`
    )
    .all(tenantId);
}
function quoteVisitHistory(tenantId, limit = 1000) {
  const rows = quoteVisitRows(tenantId, false, limit),
    quotes = new Map();
  for (const raw of rows) {
    const row = visitRowPayload(raw);
    let quote = quotes.get(row.quote_id);
    if (!quote) {
      quote = {
        quote_id: row.quote_id,
        quote_no: row.quote_no,
        display_no: row.display_no,
        company_name: row.company_name,
        recipient_email: row.recipient_email,
        total: 0,
        latest_at: row.visited_at,
        latest_date: row.date,
        latest_time: row.time,
        days: new Map()
      };
      quotes.set(row.quote_id, quote);
    }
    quote.total += 1;
    let day = quote.days.get(row.date);
    if (!day) {
      day = { date: row.date, count: 0, times: [] };
      quote.days.set(row.date, day);
    }
    day.count += 1;
    day.times.push(row.time);
  }
  const totals = db
    .prepare(
      `SELECT COUNT(*) total,COUNT(DISTINCT e.quote_id) unique_quotes FROM quote_view_events e JOIN quotes q ON q.tenant_id=e.tenant_id AND q.id=e.quote_id WHERE e.tenant_id=? AND COALESCE(q.deleted_at,0)=0 AND COALESCE(e.event_type,'HUMAN_VIEW')='HUMAN_VIEW'`
    )
    .get(tenantId);
  const totalVisits = Number(totals?.total || 0);
  return {
    totalVisits,
    uniqueQuotes: Number(totals?.unique_quotes || 0),
    historyTruncated: totalVisits > rows.length,
    historyRows: rows.length,
    quotes: [...quotes.values()].map((quote) => ({ ...quote, days: [...quote.days.values()] }))
  };
}

r.get("/dashboard/proforma-visits/latest", (req, res) => {
  if (!can(req, "quotes", "view")) return res.status(403).json({ ok: false, error: "forbidden" });
  ensureOperationalSchema();
  const latest = quoteVisitRows(req.tenantId, true)[0];
  const total = Number(
    db
      .prepare(
        `SELECT COUNT(*) n FROM quote_view_events e JOIN quotes q ON q.tenant_id=e.tenant_id AND q.id=e.quote_id WHERE e.tenant_id=? AND COALESCE(q.deleted_at,0)=0 AND COALESCE(e.event_type,'HUMAN_VIEW')='HUMAN_VIEW'`
      )
      .get(req.tenantId)?.n || 0
  );
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, totalVisits: total, latest: visitRowPayload(latest) });
});
r.get("/dashboard/proforma-visits/history", (req, res) => {
  if (!can(req, "quotes", "view")) return res.status(403).json({ ok: false, error: "forbidden" });
  ensureOperationalSchema();
  const limit = Math.max(100, Math.min(2000, Number(req.query.limit) || 1000));
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, ...quoteVisitHistory(req.tenantId, limit) });
});

const shortcutSettingKey = (userId) => `dashboard_shortcuts:${String(userId || "").slice(0, 120)}`;
function cleanShortcutKeys(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => String(item || "").trim())
        .filter((item) => item && item.length <= 220 && /^[\w:./?=&%+-]+$/u.test(item))
    )
  ].slice(0, 100);
}

r.get("/dashboard/shortcuts", (req, res) => {
  const row = db
    .prepare("SELECT value_json,updated_at FROM app_settings WHERE tenant_id=? AND key=?")
    .get(req.tenantId, shortcutSettingKey(req.user.id));
  let keys = [];
  try {
    keys = cleanShortcutKeys(JSON.parse(row?.value_json || "[]"));
  } catch {}
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, configured: Boolean(row), keys, updatedAt: Number(row?.updated_at || 0) });
});

r.post("/dashboard/shortcuts", (req, res) => {
  if (!Array.isArray(req.body?.keys))
    return res.status(422).json({ ok: false, message: "Kısayol listesi geçersiz." });
  const keys = cleanShortcutKeys(req.body.keys),
    updatedAt = Date.now();
  db.prepare(
    "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
  ).run(req.tenantId, shortcutSettingKey(req.user.id), JSON.stringify(keys), updatedAt);
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, configured: true, keys, updatedAt });
});

const widgetKey = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, 80);
const bounded = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
};
function dashboardLayoutRows(tenantId, userId) {
  ensureOperationalSchema();
  return db
    .prepare(
      `SELECT widget_key,x_px,y_px,width_px,height_px,is_visible,is_locked,is_collapsed,order_no,column_no,width,updated_at
    FROM dashboard_widget_layouts WHERE tenant_id=? AND user_id=? ORDER BY order_no,updated_at`
    )
    .all(tenantId, userId);
}
r.get("/dashboard/layout", (req, res) => {
  const rows = dashboardLayoutRows(req.tenantId, req.user.id),
    layout = {};
  for (const row of rows)
    layout[row.widget_key] = {
      x: row.x_px,
      y: row.y_px,
      w: row.width_px,
      h: row.height_px,
      visible: Number(row.is_visible) !== 0,
      locked: Number(row.is_locked) === 1,
      collapsed: Number(row.is_collapsed) === 1,
      order: Number(row.order_no || 0)
    };
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, layout, updatedAt: Math.max(0, ...rows.map((x) => Number(x.updated_at || 0))) });
});
r.post("/dashboard/workflow/:id/complete", (req, res) => {
  ensureOperationalSchema();
  const task = db
    .prepare("SELECT * FROM quote_followup_tasks WHERE tenant_id=? AND id=?")
    .get(req.tenantId, req.params.id);
  if (!task) throw Object.assign(new Error("Takip görevi bulunamadı."), { status: 404, expose: true });
  const now = Date.now();
  db.prepare(
    "UPDATE quote_followup_tasks SET status='COMPLETED',completed_at=?,completed_by=?,updated_at=? WHERE tenant_id=? AND id=?"
  ).run(now, req.user.id, now, req.tenantId, task.id);
  audit(req, {
    action: "WORKFLOW_TASK_COMPLETE",
    module: "QUOTES",
    entityId: task.quote_id,
    oldValue: task,
    newValue: { status: "COMPLETED" }
  });
  flash(req, "success", "Takip görevi tamamlandı olarak kaydedildi.");
  res.redirect(303, "/");
});
r.post("/dashboard/workflow/:id/snooze", (req, res) => {
  ensureOperationalSchema();
  const task = db
    .prepare("SELECT * FROM quote_followup_tasks WHERE tenant_id=? AND id=?")
    .get(req.tenantId, req.params.id);
  if (!task) throw Object.assign(new Error("Takip görevi bulunamadı."), { status: 404, expose: true });
  const days = Math.max(1, Math.min(30, Number(req.body.days) || 1)),
    until = addIsoDays(istanbulDateIso(), days),
    now = Date.now();
  db.prepare(
    "UPDATE quote_followup_tasks SET status='OPEN',snoozed_until=?,updated_at=? WHERE tenant_id=? AND id=?"
  ).run(until, now, req.tenantId, task.id);
  audit(req, {
    action: "WORKFLOW_TASK_SNOOZE",
    module: "QUOTES",
    entityId: task.quote_id,
    newValue: { days, snoozed_until: until }
  });
  flash(req, "success", `Takip görevi ${days} gün ertelendi.`);
  res.redirect(303, "/");
});
r.post("/dashboard/workflow/:id/note", (req, res) => {
  ensureOperationalSchema();
  const task = db
    .prepare("SELECT * FROM quote_followup_tasks WHERE tenant_id=? AND id=?")
    .get(req.tenantId, req.params.id);
  if (!task) return res.status(404).json({ ok: false, message: "Takip görevi bulunamadı." });
  const note = String(req.body.note || "")
      .trim()
      .slice(0, 1000),
    now = Date.now();
  db.prepare("UPDATE quote_followup_tasks SET note=?,updated_at=? WHERE tenant_id=? AND id=?").run(
    note,
    now,
    req.tenantId,
    task.id
  );
  audit(req, { action: "WORKFLOW_TASK_NOTE", module: "QUOTES", entityId: task.quote_id, newValue: { note } });
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, note });
});

r.post("/dashboard/layout", (req, res) => {
  ensureOperationalSchema();
  const raw = req.body?.layout;
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return res.status(422).json({ ok: false, message: "Dashboard düzeni geçersiz." });
  const now = Date.now(),
    upsert =
      db.prepare(`INSERT INTO dashboard_widget_layouts(id,tenant_id,user_id,widget_key,order_no,column_no,width,x_px,y_px,width_px,height_px,is_visible,is_locked,is_collapsed,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,user_id,widget_key) DO UPDATE SET order_no=excluded.order_no,column_no=excluded.column_no,width=excluded.width,x_px=excluded.x_px,y_px=excluded.y_px,width_px=excluded.width_px,height_px=excluded.height_px,is_visible=excluded.is_visible,is_locked=excluded.is_locked,is_collapsed=excluded.is_collapsed,updated_at=excluded.updated_at`);
  const before = dashboardLayoutRows(req.tenantId, req.user.id),
    oldMap = Object.fromEntries(before.map((x) => [x.widget_key, x]));
  db.transaction(() => {
    let order = 0;
    for (const [rawKey, value] of Object.entries(raw).slice(0, 80)) {
      const key = widgetKey(rawKey);
      if (!key) continue;
      const v = value && typeof value === "object" ? value : {};
      upsert.run(
        id("dwl"),
        req.tenantId,
        req.user.id,
        key,
        bounded(v.order, 0, 999, order++),
        bounded(v.column, 1, 6, 1),
        bounded(v.width, 1, 6, 1),
        bounded(v.x, 0, 10000, 0),
        bounded(v.y, 0, 30000, 0),
        bounded(v.w, 220, 3000, 420),
        bounded(v.h, 140, 2000, 220),
        v.visible === false ? 0 : 1,
        v.locked ? 1 : 0,
        v.collapsed ? 1 : 0,
        now
      );
    }
    db.prepare(
      "INSERT INTO dashboard_widget_events(id,tenant_id,user_id,widget_key,event_type,old_json,new_json,created_at) VALUES(?,?,?,?,?,?,?,?)"
    ).run(
      id("dwe"),
      req.tenantId,
      req.user.id,
      "*",
      "LAYOUT_SAVE",
      JSON.stringify(oldMap),
      JSON.stringify(raw),
      now
    );
  })();
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, updatedAt: now });
});

r.get("/dashboard/stat/:key", (req, res) => {
  const key = req.params.key;
  const sql = statSql[key];
  const permission = statPermissions[key];
  if (!sql || !permission) return res.status(404).json({ error: "not_found" });
  if (!can(req, permission[0], permission[1])) return res.status(403).json({ error: "forbidden" });
  const rows = db.prepare(sql).all(req.tenantId);
  if (key === "products" && !can(req, "financials", "view")) {
    return res.json(rows.map(({ sale_price, currency, ...row }) => row));
  }
  return res.json(rows);
});

r.get("/", (req, res) => {
  const t = req.tenantId;
  const capabilities = {
    customers: can(req, "customers", "view"),
    products: can(req, "products", "view"),
    quotes: can(req, "quotes", "view"),
    quoteCreate: can(req, "quotes", "create"),
    orders: can(req, "orders", "view"),
    financials: can(req, "financials", "view"),
    live: can(req, "live", "view"),
    audit: can(req, "audit", "view"),
    backups: can(req, "backups", "admin")
  };
  const count = (sql, ...p) => Number(db.prepare(sql).get(...p)?.n || 0);
  const sum = (sql, ...p) => Number(db.prepare(sql).get(...p)?.v || 0);
  const ms = istanbulMonthStartEpoch();
  const todayIso = istanbulDateIso();
  const deliveryEndIso = addIsoDays(todayIso, 14);

  const stats = {
    customers: capabilities.customers
      ? count(`SELECT COUNT(*) n FROM customers WHERE tenant_id=? AND ${active}`, t)
      : 0,
    products: capabilities.products
      ? count(`SELECT COUNT(*) n FROM products WHERE tenant_id=? AND ${active}`, t)
      : 0,
    quotes: capabilities.quotes
      ? count(`SELECT COUNT(*) n FROM quotes WHERE tenant_id=? AND ${active}`, t)
      : 0,
    expired: capabilities.quotes
      ? count(
          `SELECT COUNT(*) n FROM quotes WHERE tenant_id=? AND ${active} AND valid_until<? AND status NOT IN ('APPROVED','ORDERED','DELIVERED','ARCHIVED')`,
          t,
          todayIso
        )
      : 0,
    pending: capabilities.quotes
      ? count(
          `SELECT COUNT(*) n FROM quotes WHERE tenant_id=? AND ${active} AND status IN ('SENT','WAITING_CUSTOMER','REVISION_REQUESTED')`,
          t
        )
      : 0,
    orders: capabilities.orders
      ? count(
          `SELECT COUNT(*) n FROM quotes WHERE tenant_id=? AND ${active} AND ((status='ORDERED' OR COALESCE(order_status,'NONE')<>'NONE') AND COALESCE(order_status,'NONE')<>'ORDER_CANCELLED')`,
          t
        )
      : 0,
    delivery: capabilities.quotes
      ? count(
          `SELECT COUNT(*) n FROM quotes WHERE tenant_id=? AND ${active} AND delivery_date BETWEEN ? AND ?`,
          t,
          todayIso,
          deliveryEndIso
        )
      : 0,
    payments: capabilities.financials
      ? count(
          `SELECT COUNT(*) n FROM quotes WHERE tenant_id=? AND ${active} AND payment_status NOT IN ('PAID','CANCELLED') AND COALESCE(order_status,'NONE')<>'ORDER_CANCELLED'`,
          t
        )
      : 0,
    monthQuoteTry: capabilities.financials
      ? sum(
          `SELECT SUM(grand_total*COALESCE(NULLIF(fx_rate,0),1)) v FROM quotes WHERE tenant_id=? AND ${active} AND created_at>=?`,
          t,
          ms
        )
      : 0,
    monthApprovedTry: capabilities.financials
      ? sum(
          `SELECT SUM(grand_total*COALESCE(NULLIF(fx_rate,0),1)) v FROM quotes WHERE tenant_id=? AND ${active} AND status IN ('APPROVED','ORDERED','DELIVERED') AND COALESCE(delivered_at,ordered_at,approved_at,0)>=?`,
          t,
          ms
        )
      : 0,
    paymentWaitingTry: capabilities.financials
      ? sum(
          `SELECT SUM(MAX(grand_total-COALESCE(paid_amount,0),0)*COALESCE(NULLIF(fx_rate,0),1)) v FROM quotes WHERE tenant_id=? AND ${active} AND payment_status NOT IN ('PAID','CANCELLED') AND COALESCE(order_status,'NONE')<>'ORDER_CANCELLED'`,
          t
        )
      : 0,
    won: capabilities.quotes
      ? count(
          `SELECT COUNT(*) n FROM quotes WHERE tenant_id=? AND ${active} AND (status IN ('APPROVED','ORDERED','DELIVERED') OR (COALESCE(order_status,'NONE') NOT IN ('NONE','ORDER_CANCELLED')))`,
          t
        )
      : 0,
    lost: capabilities.quotes
      ? count(
          `SELECT COUNT(*) n FROM quotes WHERE tenant_id=? AND ${active} AND COALESCE(order_status,'NONE') IN ('NONE','ORDER_CANCELLED') AND status NOT IN ('APPROVED','ORDERED','DELIVERED','ARCHIVED') AND (status IN ('REJECTED','EXPIRED') OR (COALESCE(valid_until,'')<>'' AND valid_until<? AND status NOT IN ('DRAFT','REVISION_REQUESTED')))`,
          t,
          todayIso
        )
      : 0
  };
  stats.winRate =
    capabilities.quotes && stats.won + stats.lost
      ? Math.round((stats.won / Math.max(1, stats.won + stats.lost)) * 100)
      : 0;

  const recentQuotes = capabilities.quotes
    ? db
        .prepare(
          `SELECT * FROM quotes WHERE tenant_id=? AND ${active} ORDER BY COALESCE(updated_at,created_at) DESC, created_at DESC LIMIT 100`
        )
        .all(t)
    : [];
  const recentCustomers = capabilities.customers
    ? db
        .prepare(`SELECT * FROM customers WHERE tenant_id=? AND ${active} ORDER BY created_at DESC LIMIT 7`)
        .all(t)
    : [];
  const alerts = db
    .prepare(
      "SELECT * FROM notifications WHERE tenant_id=? AND (user_id IS NULL OR user_id=?) ORDER BY created_at DESC LIMIT 10"
    )
    .all(t, req.user.id)
    .map((item) => ({
      ...item,
      href:
        String(item.href || "/").startsWith("/") && !String(item.href || "").startsWith("//")
          ? item.href
          : "/"
    }));

  let audits = [];
  if (capabilities.audit) {
    const rawAudits = db
      .prepare(
        "SELECT * FROM audit_logs WHERE tenant_id=? AND action IN ('CUSTOMER_CREATE','QUOTE_CREATE','QUOTE_TO_ORDER','QUOTE_STATUS') ORDER BY created_at DESC LIMIT 40"
      )
      .all(t);
    audits = rawAudits
      .map((a) => {
        let v = {};
        try {
          v = JSON.parse(a.new_json || "{}");
        } catch {}
        if (
          a.action === "QUOTE_STATUS" &&
          !["APPROVED", "ORDERED"].includes(v.status) &&
          !["STARTED", "QUALITY_CONTROL", "COMPLETED"].includes(v.production_status)
        )
          return null;
        let title = a.action;
        let detail = "";
        if (a.action === "CUSTOMER_CREATE") {
          const c = db
            .prepare(`SELECT company_name FROM customers WHERE tenant_id=? AND id=? AND ${active}`)
            .get(t, a.entity_id);
          title = "Yeni müşteri eklendi";
          detail = c?.company_name || "";
        } else {
          const q = db
            .prepare(
              `SELECT quote_no,customer_snapshot_json,status,production_status FROM quotes WHERE tenant_id=? AND id=? AND ${active}`
            )
            .get(t, a.entity_id);
          let c = {};
          try {
            c = JSON.parse(q?.customer_snapshot_json || "{}");
          } catch {}
          detail = [c.company_name, q?.quote_no].filter(Boolean).join(" · ");
          if (a.action === "QUOTE_CREATE") title = "Yeni proforma oluşturuldu";
          if (a.action === "QUOTE_TO_ORDER") title = "Proforma siparişe dönüştürüldü";
          if (a.action === "QUOTE_STATUS" && v.status === "APPROVED") title = "Proforma onaylandı";
          if (a.action === "QUOTE_STATUS" && v.production_status === "STARTED")
            title = "Üretim süreci başladı";
          if (a.action === "QUOTE_STATUS" && v.production_status === "QUALITY_CONTROL")
            title = "Kalite kontrol aşamasına geçti";
          if (a.action === "QUOTE_STATUS" && v.production_status === "COMPLETED") title = "Üretim tamamlandı";
        }
        return { ...a, title, detail };
      })
      .filter(Boolean)
      .slice(0, 30);
  }

  let liveStats = { online: 0, waiting: 0, open: 0 };
  let liveVisitors = [];
  let liveChats = [];
  let chatWindowHours = 24;
  if (capabilities.live) {
    const liveSince = Date.now() - 3 * 60 * 1000;
    liveStats = {
      online: count(
        "SELECT COUNT(*) n FROM live_visitors WHERE tenant_id=? AND last_seen_at>=?",
        t,
        liveSince
      ),
      waiting: count("SELECT COUNT(*) n FROM live_conversations WHERE tenant_id=? AND status='WAITING'", t),
      open: count(
        "SELECT COUNT(*) n FROM live_conversations WHERE tenant_id=? AND status IN ('OPEN','WAITING')",
        t
      )
    };
    liveVisitors = db
      .prepare(
        `SELECT v.*,s.site_name,(SELECT id FROM live_conversations c WHERE c.visitor_id=v.id AND c.status IN ('OPEN','WAITING') ORDER BY c.last_message_at DESC LIMIT 1) conversation_id FROM live_visitors v LEFT JOIN live_sites s ON s.id=v.site_id WHERE v.tenant_id=? AND v.last_seen_at>=? ORDER BY v.last_seen_at DESC LIMIT 6`
      )
      .all(t, liveSince);
    chatWindowHours =
      Number(
        db
          .prepare(
            "SELECT dashboard_chat_window_hours FROM live_sites WHERE tenant_id=? AND is_active=1 ORDER BY updated_at DESC LIMIT 1"
          )
          .get(t)?.dashboard_chat_window_hours
      ) || 24;
    const chatWindowSince = Date.now() - Math.max(1, chatWindowHours) * 60 * 60 * 1000;
    liveChats = db
      .prepare(
        `SELECT c.id,c.status,c.last_message_at,v.contact_name,v.visitor_token,s.site_name,(SELECT message FROM live_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) last_message,(SELECT COUNT(*) FROM live_messages m2 WHERE m2.conversation_id=c.id AND m2.sender_type='VISITOR' AND m2.is_read=0) unread FROM live_conversations c LEFT JOIN live_visitors v ON v.id=c.visitor_id LEFT JOIN live_sites s ON s.id=c.site_id WHERE c.tenant_id=? AND c.status IN ('OPEN','WAITING') AND c.last_message_at>=? ORDER BY c.last_message_at DESC LIMIT 6`
      )
      .all(t, chatWindowSince);
  }

  let backupReminderDue = false;
  if (capabilities.backups) {
    const key = `backup_reminder:${String(req.user.id || "").slice(0, 120)}`;
    const setting = db.prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?").get(t, key);
    let state = {};
    try {
      state = JSON.parse(setting?.value_json || "{}");
    } catch {}
    const now = Date.now(),
      last = Number(state.last_backup_at || 0),
      snoozed = Number(state.snoozed_until || 0),
      interval = 15 * 24 * 60 * 60 * 1000;
    backupReminderDue = now >= snoozed && (!last || now - last >= interval);
  }

  let sentStats = { total: 0, sent: 0, read_count: 0, unread_count: 0, failed: 0, visit_count: 0 };
  let latestProformaVisit = null;
  if (capabilities.quotes) {
    try {
      sentStats =
        db
          .prepare(
            `SELECT COUNT(*) total,
             SUM(CASE WHEN UPPER(l.status)='SENT' THEN 1 ELSE 0 END) sent,
             SUM(CASE WHEN EXISTS(SELECT 1 FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') THEN 1 ELSE 0 END) read_count,
             SUM(CASE WHEN UPPER(l.status)='SENT' AND NOT EXISTS(SELECT 1 FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') THEN 1 ELSE 0 END) unread_count,
             SUM(CASE WHEN UPPER(l.status)='FAILED' THEN 1 ELSE 0 END) failed
             FROM quote_send_logs l JOIN quotes q ON q.tenant_id=l.tenant_id AND q.id=l.quote_id WHERE l.tenant_id=? AND COALESCE(l.deleted_at,0)=0 AND COALESCE(q.deleted_at,0)=0`
          )
          .get(t) || sentStats;
      sentStats.visit_count = Number(
        db
          .prepare(
            `SELECT COUNT(*) n FROM quote_view_events e JOIN quotes q ON q.tenant_id=e.tenant_id AND q.id=e.quote_id WHERE e.tenant_id=? AND COALESCE(q.deleted_at,0)=0 AND COALESCE(e.event_type,'HUMAN_VIEW')='HUMAN_VIEW'`
          )
          .get(t)?.n || 0
      );
      latestProformaVisit = visitRowPayload(quoteVisitRows(t, true)[0]);
    } catch {}
  }

  let workflowTasks = [];
  if (capabilities.quotes) {
    const todayIso = istanbulDateIso();
    const rows = db
      .prepare(
        `SELECT q.id,q.quote_no,q.valid_until,q.status,q.customer_snapshot_json,
      COALESCE((SELECT COUNT(*) FROM quote_view_events v WHERE v.tenant_id=q.tenant_id AND v.quote_id=q.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW'),0) view_count,
      COALESCE((SELECT MAX(created_at) FROM quote_send_logs l WHERE l.tenant_id=q.tenant_id AND l.quote_id=q.id AND COALESCE(l.deleted_at,0)=0),0) last_sent_at
      FROM quotes q WHERE q.tenant_id=? AND COALESCE(q.deleted_at,0)=0 AND q.status NOT IN ('APPROVED','ORDERED','DELIVERED','ARCHIVED','REJECTED')
      AND q.valid_until IS NOT NULL AND q.valid_until<>'' AND q.valid_until>=? ORDER BY q.valid_until ASC,COALESCE(q.updated_at,q.created_at) DESC`
      )
      .all(t, todayIso);
    const dayNumber = (value) => {
        const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000 : 0;
      },
      todayDay = dayNumber(todayIso);
    const computed = rows.map((q) => {
      let c = {};
      try {
        c = JSON.parse(q.customer_snapshot_json || "{}");
      } catch {}
      const days = Math.max(0, Math.round(dayNumber(q.valid_until) - todayDay));
      let priority = "normal",
        text = "Teklif takibi",
        task_type = "FOLLOW_UP";
      if (days <= 3) {
        priority = "warning";
        task_type = "EXPIRY_REMINDER";
        text =
          days === 0 ? "Teklifin son geçerlilik günü." : `Teklif geçerliliğinin bitmesine ${days} gün kaldı.`;
      } else if (Number(q.view_count) > 0) {
        priority = "info";
        task_type = "VIEWED_NO_RESPONSE";
        text = "Teklif görüntülendi; müşteri cevabı bekleniyor.";
      } else if (q.last_sent_at) {
        task_type = "UNOPENED";
        text = "Teklif gönderildi; henüz görüntülenmedi.";
      }
      return { ...q, company_name: c.company_name || "-", days, priority, text, task_type };
    });
    ensureOperationalSchema();
    const now = Date.now();
    const upsert =
      db.prepare(`INSERT INTO quote_followup_tasks(id,tenant_id,quote_id,task_type,due_date,status,assigned_user_id,note,created_at,updated_at,priority,metadata_json)
      VALUES(?,?,?,?,?,'OPEN',?, '',?,?,?,?) ON CONFLICT(tenant_id,quote_id,task_type,due_date)
      DO UPDATE SET priority=excluded.priority,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`);
    const getTask = db.prepare(
      "SELECT * FROM quote_followup_tasks WHERE tenant_id=? AND quote_id=? AND task_type=? AND due_date=?"
    );
    workflowTasks = [];
    db.transaction(() => {
      for (const task of computed) {
        upsert.run(
          id("qft"),
          t,
          task.id,
          task.task_type,
          task.valid_until,
          req.user.id,
          now,
          now,
          task.priority,
          JSON.stringify({ text: task.text, company_name: task.company_name, quote_no: task.quote_no })
        );
        const saved = getTask.get(t, task.id, task.task_type, task.valid_until);
        if (saved && saved.status === "OPEN" && (!saved.snoozed_until || saved.snoozed_until <= todayIso))
          workflowTasks.push({ ...task, task_id: saved.id, task_note: saved.note || "" });
      }
    })();
  }

  const dashboardLayout = Object.fromEntries(
    dashboardLayoutRows(t, req.user.id).map((row) => [
      row.widget_key,
      {
        x: row.x_px,
        y: row.y_px,
        w: row.width_px,
        h: row.height_px,
        visible: Number(row.is_visible) !== 0,
        locked: Number(row.is_locked) === 1,
        collapsed: Number(row.is_collapsed) === 1,
        order: Number(row.order_no || 0)
      }
    ])
  );

  res.render("dashboard/index", {
    title: "İşletme Genel Bakış",
    stats,
    capabilities,
    recentQuotes,
    recentCustomers,
    alerts,
    audits,
    liveStats,
    liveVisitors,
    liveChats,
    chatWindowHours,
    sentStats,
    latestProformaVisit,
    backupReminderDue,
    workflowTasks,
    dashboardLayout
  });
});

export default r;

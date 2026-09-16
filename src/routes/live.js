import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { config } from "../config.js";
import fs from "fs";
import {
  upload,
  publicFile,
  privateUpload,
  privateFile,
  resolvePrivateFile,
  validateUploads
} from "../middleware/upload.js";

const r = Router();
r.use(requireAuth, requirePermission("live", "view"));
const canManage = requirePermission("live", "admin");
r.use((req, res, next) => {
  if (req.method === "GET") return next();
  return requirePermission("live", "edit")(req, res, next);
});
const now = () => Date.now();
const ONLINE_MS = 3 * 60 * 1000;
const CHAT_ACTIVE_MS = 5 * 60 * 1000;
const LEFT_MS = 10 * 60 * 1000;
const NOTIFY_WINDOW_MS = 24 * 60 * 60 * 1000;
const clean = (s) => String(s || "").trim();
const limit = (s, n = 500) => clean(s).slice(0, n);
const escLike = (s) => `%${String(s || "").replace(/[%_]/g, (m) => "\\" + m)}%`;
const safeExternalUrl = (value) => {
  try {
    const parsed = new URL(clean(value));
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
};
const safeNavigationFields = (row) => ({
  ...row,
  current_url: safeExternalUrl(row?.current_url),
  source_url: safeExternalUrl(row?.source_url),
  site_url: safeExternalUrl(row?.site_url)
});

const SOUND_OPTIONS = [
  "bell-soft",
  "msn",
  "ding",
  "chime",
  "digital",
  "pulse",
  "office",
  "pop",
  "alert",
  "wa-pop",
  "wa-chime",
  "wa-soft",
  "none"
];
const statusLabel = (s) => ({ WAITING: "Bekliyor", OPEN: "Açık", CLOSED: "Kapalı" })[s] || s || "-";
function siteRows(tenantId) {
  return db
    .prepare(
      "SELECT ls.*,p.company_name,p.short_name,p.logo_url FROM live_sites ls LEFT JOIN profiles p ON p.id=ls.profile_id WHERE ls.tenant_id=? ORDER BY ls.is_active DESC,ls.updated_at DESC"
    )
    .all(tenantId);
}
function activeProfile(tenantId) {
  return db
    .prepare(
      "SELECT * FROM profiles WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_active DESC,updated_at DESC LIMIT 1"
    )
    .get(tenantId);
}
function activeSite(tenantId) {
  const p = activeProfile(tenantId);
  if (!p) return null;
  return (
    db
      .prepare(
        "SELECT ls.*,p.company_name,p.short_name,p.logo_url FROM live_sites ls LEFT JOIN profiles p ON p.id=ls.profile_id WHERE ls.tenant_id=? AND ls.profile_id=? LIMIT 1"
      )
      .get(tenantId, p.id) || null
  );
}
function liveStats(tenantId) {
  const t = now();
  const since = t - ONLINE_MS;
  const dayStart = new Date().setHours(0, 0, 0, 0);
  return {
    online:
      db
        .prepare(
          "SELECT COUNT(DISTINCT COALESCE(NULLIF(contact_email,''),NULLIF(contact_phone,''),NULLIF(last_group_key,''),NULLIF(ip,''),visitor_token)) c FROM live_visitors WHERE tenant_id=? AND last_seen_at>=?"
        )
        .get(tenantId, since)?.c || 0,
    waiting:
      db
        .prepare(
          "SELECT COUNT(DISTINCT c.id) c FROM live_conversations c LEFT JOIN live_messages m ON m.conversation_id=c.id AND m.sender_type='VISITOR' AND m.is_read=0 AND m.created_at>=? WHERE c.tenant_id=? AND c.status IN ('OPEN','WAITING') AND (c.status='WAITING' OR m.id IS NOT NULL)"
        )
        .get(t - NOTIFY_WINDOW_MS, tenantId)?.c || 0,
    open:
      db
        .prepare(
          "SELECT COUNT(*) c FROM live_conversations WHERE tenant_id=? AND status IN ('OPEN','WAITING')"
        )
        .get(tenantId)?.c || 0,
    newMessages:
      db
        .prepare(
          "SELECT COUNT(*) c FROM live_messages WHERE tenant_id=? AND sender_type='VISITOR' AND is_read=0 AND created_at>=?"
        )
        .get(tenantId, t - NOTIFY_WINDOW_MS)?.c || 0,
    today:
      db
        .prepare("SELECT COUNT(*) c FROM live_messages WHERE tenant_id=? AND created_at>=?")
        .get(tenantId, dayStart)?.c || 0,
    todayVisitors:
      db
        .prepare(
          "SELECT COUNT(DISTINCT COALESCE(NULLIF(contact_email,''),NULLIF(contact_phone,''),NULLIF(last_group_key,''),NULLIF(ip,''),visitor_token)) c FROM live_visitors WHERE tenant_id=? AND last_seen_at>=?"
        )
        .get(tenantId, dayStart)?.c || 0,
    sites:
      db.prepare("SELECT COUNT(*) c FROM live_sites WHERE tenant_id=? AND is_active=1").get(tenantId)?.c || 0
  };
}
function conversations(tenantId, { limitRows = 30, status = null } = {}) {
  let where = "c.tenant_id=?",
    p = [tenantId];
  if (status) {
    where += " AND c.status=?";
    p.push(status);
  }
  return db
    .prepare(
      `SELECT c.*,s.site_name,s.site_url,v.visitor_token,v.current_url,v.current_title,v.ip,v.city,v.country,v.device_type,v.last_seen_at,v.contact_name,v.contact_title,v.contact_company,v.contact_email,v.contact_phone,v.typing_text,v.typing_at,v.avatar_emoji,v.visitor_label,u.full_name assigned_name,(SELECT COUNT(*) FROM live_messages m WHERE m.conversation_id=c.id AND m.sender_type='VISITOR' AND m.is_read=0) unread,(SELECT message FROM live_messages m2 WHERE m2.conversation_id=c.id ORDER BY m2.created_at DESC LIMIT 1) last_message FROM live_conversations c LEFT JOIN live_sites s ON s.id=c.site_id LEFT JOIN live_visitors v ON v.id=c.visitor_id LEFT JOIN users u ON u.id=c.assigned_user_id WHERE ${where} ORDER BY COALESCE(c.pinned,0) DESC, CASE WHEN COALESCE(v.last_seen_at,0) >= ${now() - CHAT_ACTIVE_MS} THEN 0 WHEN COALESCE(v.last_seen_at,0) >= ${now() - LEFT_MS} THEN 1 ELSE 2 END ASC, c.last_message_at DESC LIMIT ?`
    )
    .all(...p, limitRows)
    .map(safeNavigationFields);
}
function conversation(tenantId, idv) {
  const row = db
    .prepare(
      `SELECT c.*,s.site_name,s.site_url,v.id visitor_id,v.visitor_token,v.current_url,v.current_title,v.ip,v.city,v.country,v.device_type,v.last_seen_at,v.contact_name,v.contact_title,v.contact_company,v.contact_email,v.contact_phone,v.typing_text,v.typing_at,v.avatar_emoji,v.visitor_label,u.full_name assigned_name FROM live_conversations c LEFT JOIN live_sites s ON s.id=c.site_id LEFT JOIN live_visitors v ON v.id=c.visitor_id LEFT JOIN users u ON u.id=c.assigned_user_id WHERE c.tenant_id=? AND c.id=?`
    )
    .get(tenantId, idv);
  if (!row) throw Object.assign(new Error("Sohbet kaydı bulunamadı."), { status: 404, expose: true });
  return safeNavigationFields(row);
}
function messages(tenantId, conversationId, after = 0) {
  return db
    .prepare(
      "SELECT m.*,u.full_name operator_name FROM live_messages m LEFT JOIN users u ON u.id=m.sender_id WHERE m.tenant_id=? AND m.conversation_id=? AND m.created_at>? ORDER BY m.created_at ASC LIMIT 200"
    )
    .all(tenantId, conversationId, Number(after || 0));
}
function touchRead(tenantId, conversationId) {
  db.prepare(
    "UPDATE live_messages SET is_read=1 WHERE tenant_id=? AND conversation_id=? AND sender_type='VISITOR'"
  ).run(tenantId, conversationId);
}
function visitorPages(tenantId, visitorId, limitRows = 5) {
  return db
    .prepare(
      "SELECT page_title,page_url,created_at FROM live_visitor_events WHERE tenant_id=? AND visitor_id=? ORDER BY created_at DESC LIMIT ?"
    )
    .all(tenantId, visitorId, limitRows)
    .map((row) => ({ ...row, page_url: safeExternalUrl(row.page_url) }));
}
function startConversationForVisitor(
  req,
  visitorId,
  proactiveMessage = "Merhaba, nasıl yardımcı olabiliriz?"
) {
  const visitor = db
    .prepare("SELECT * FROM live_visitors WHERE tenant_id=? AND id=? LIMIT 1")
    .get(req.tenantId, visitorId);
  if (!visitor) throw Object.assign(new Error("Ziyaretçi bulunamadı."), { status: 404 });
  const site = db
    .prepare("SELECT * FROM live_sites WHERE tenant_id=? AND id=? LIMIT 1")
    .get(req.tenantId, visitor.site_id);
  if (!site) throw Object.assign(new Error("Site kaydı bulunamadı."), { status: 404 });
  const t = now();
  let conv = db
    .prepare(
      "SELECT * FROM live_conversations WHERE tenant_id=? AND site_id=? AND visitor_id=? AND status IN ('OPEN','WAITING') ORDER BY last_message_at DESC LIMIT 1"
    )
    .get(req.tenantId, site.id, visitor.id);
  if (!conv) {
    conv = {
      id: id("lcon"),
      tenant_id: req.tenantId,
      site_id: site.id,
      visitor_id: visitor.id,
      customer_id: visitor.customer_id || null,
      assigned_user_id: req.user.id,
      status: "OPEN",
      source_url: visitor.current_url || "",
      source_title: visitor.current_title || "",
      first_message: proactiveMessage,
      started_at: t,
      last_message_at: t,
      closed_at: null,
      proactive_started: 1
    };
    db.prepare(
      `INSERT INTO live_conversations(id,tenant_id,site_id,visitor_id,customer_id,assigned_user_id,status,source_url,source_title,first_message,started_at,last_message_at,closed_at,proactive_started) VALUES(@id,@tenant_id,@site_id,@visitor_id,@customer_id,@assigned_user_id,@status,@source_url,@source_title,@first_message,@started_at,@last_message_at,@closed_at,@proactive_started)`
    ).run(conv);
  } else {
    db.prepare(
      "UPDATE live_conversations SET status='OPEN',assigned_user_id=COALESCE(assigned_user_id,?),last_message_at=?,source_url=COALESCE(NULLIF(?,''),source_url),source_title=COALESCE(NULLIF(?,''),source_title) WHERE tenant_id=? AND id=?"
    ).run(req.user.id, t, visitor.current_url || "", visitor.current_title || "", req.tenantId, conv.id);
  }
  const exists = db
    .prepare("SELECT id FROM live_messages WHERE conversation_id=? AND sender_type='OPERATOR' LIMIT 1")
    .get(conv.id);
  if (!exists && proactiveMessage) {
    db.prepare(
      "INSERT INTO live_messages(id,tenant_id,conversation_id,sender_type,sender_id,message,is_read,created_at,client_uid,attachment_url,attachment_name) VALUES(?,?,?,?,?,?,0,?,NULL,NULL,NULL)"
    ).run(id("lmsg"), req.tenantId, conv.id, "OPERATOR", req.user.id, proactiveMessage, t);
  }
  return conv;
}

r.get("/", (req, res) => {
  const since = now() - ONLINE_MS;
  const visitors = db
    .prepare(
      `SELECT v.*,s.site_name,s.site_url,(SELECT COUNT(*) FROM live_visitor_events e WHERE e.visitor_id=v.id) event_count,(SELECT COUNT(DISTINCT date(e.created_at/1000,'unixepoch')) FROM live_visitor_events e WHERE e.visitor_id=v.id) visit_days,(SELECT COUNT(*) FROM live_conversations c WHERE c.visitor_id=v.id) conversation_count,(SELECT id FROM live_conversations c WHERE c.visitor_id=v.id AND c.status IN ('OPEN','WAITING') ORDER BY c.last_message_at DESC LIMIT 1) conversation_id FROM live_visitors v JOIN (SELECT COALESCE(NULLIF(contact_email,''),NULLIF(contact_phone,''),NULLIF(last_group_key,''),NULLIF(ip,''),visitor_token) gkey,MAX(last_seen_at) mx FROM live_visitors WHERE tenant_id=? AND last_seen_at>=? GROUP BY gkey) g ON COALESCE(NULLIF(v.contact_email,''),NULLIF(v.contact_phone,''),NULLIF(v.last_group_key,''),NULLIF(v.ip,''),v.visitor_token)=g.gkey AND v.last_seen_at=g.mx LEFT JOIN live_sites s ON s.id=v.site_id WHERE v.tenant_id=? ORDER BY v.last_seen_at DESC`
    )
    .all(req.tenantId, since, req.tenantId)
    .map((v) => ({ ...safeNavigationFields(v), pages: visitorPages(req.tenantId, v.id, 8) }));
  res.render("live/visitors", {
    title: "Canlı Ziyaretçiler",
    stats: liveStats(req.tenantId),
    visitors,
    sites: siteRows(req.tenantId),
    conversations: conversations(req.tenantId, { limitRows: 12 })
  });
});
r.get("/chats", (req, res) =>
  res.render("live/chats", {
    title: "Canlı Destek Sohbetleri",
    stats: liveStats(req.tenantId),
    rows: conversations(req.tenantId, { limitRows: 120, status: req.query.status || null }),
    status: String(req.query.status || ""),
    statusLabel
  })
);
r.get("/history", (req, res) => {
  const q = limit(req.query.q, 80);
  const where = ["e.tenant_id=?"],
    p = [req.tenantId];
  if (q) {
    where.push(
      "(e.page_url LIKE ? ESCAPE '\\' OR e.page_title LIKE ? ESCAPE '\\' OR v.visitor_token LIKE ? ESCAPE '\\' OR v.contact_name LIKE ? ESCAPE '\\' OR v.contact_phone LIKE ? ESCAPE '\\' OR s.site_name LIKE ? ESCAPE '\\')"
    );
    p.push(escLike(q), escLike(q), escLike(q), escLike(q), escLike(q), escLike(q));
  }
  const rows = db
    .prepare(
      `SELECT e.*,v.visitor_token,v.ip,v.device_type,v.contact_name,v.contact_email,v.contact_phone,s.site_name,s.site_url FROM live_visitor_events e LEFT JOIN live_visitors v ON v.id=e.visitor_id LEFT JOIN live_sites s ON s.id=e.site_id WHERE ${where.join(" AND ")} ORDER BY e.created_at DESC LIMIT 200`
    )
    .all(...p)
    .map((row) => ({ ...safeNavigationFields(row), page_url: safeExternalUrl(row.page_url) }));
  res.render("live/history", { title: "Ziyaretçi Geçmişi", stats: liveStats(req.tenantId), rows, q });
});
r.get("/settings", (req, res) => {
  const profile = activeProfile(req.tenantId);
  const site = activeSite(req.tenantId);
  res.render("live/settings", {
    title: "Canlı Destek Ayarları",
    stats: liveStats(req.tenantId),
    site,
    activeProfile: profile,
    publicBaseUrl: config.publicBaseUrl.replace(/\/$/, ""),
    soundOptions: SOUND_OPTIONS
  });
});

r.get("/poll", (req, res) => {
  const since = Number(req.query.since || 0);
  const notifySince = Math.max(Number(since || 0), now() - NOTIFY_WINDOW_MS);
  const recent = db
    .prepare(
      `SELECT c.id,c.id conversation_id,c.status,c.source_title,c.source_url,c.last_message_at,s.site_name,v.visitor_token,v.current_url,v.current_title,v.contact_name,v.contact_phone,v.typing_text,v.typing_at,m.id message_id,m.message,m.created_at FROM live_messages m JOIN live_conversations c ON c.id=m.conversation_id LEFT JOIN live_sites s ON s.id=c.site_id LEFT JOIN live_visitors v ON v.id=c.visitor_id WHERE m.tenant_id=? AND m.sender_type='VISITOR' AND m.created_at>? ORDER BY m.created_at DESC LIMIT 10`
    )
    .all(req.tenantId, notifySince)
    .map(safeNavigationFields);
  const sinceOnline = now() - ONLINE_MS;
  const visitors = db
    .prepare(
      `SELECT v.id,v.visitor_token,v.current_url,v.current_title,v.last_seen_at,v.contact_name,v.contact_phone,v.typing_text,v.typing_at,v.avatar_emoji,v.visitor_label,s.site_name,(SELECT id FROM live_conversations c WHERE c.visitor_id=v.id AND c.status IN ('OPEN','WAITING') ORDER BY c.last_message_at DESC LIMIT 1) conversation_id FROM live_visitors v JOIN (SELECT COALESCE(NULLIF(contact_email,''),NULLIF(contact_phone,''),NULLIF(last_group_key,''),NULLIF(ip,''),visitor_token) gkey,MAX(last_seen_at) mx FROM live_visitors WHERE tenant_id=? AND last_seen_at>=? GROUP BY gkey) g ON COALESCE(NULLIF(v.contact_email,''),NULLIF(v.contact_phone,''),NULLIF(v.last_group_key,''),NULLIF(v.ip,''),v.visitor_token)=g.gkey AND v.last_seen_at=g.mx LEFT JOIN live_sites s ON s.id=v.site_id WHERE v.tenant_id=? ORDER BY v.last_seen_at DESC LIMIT 20`
    )
    .all(req.tenantId, sinceOnline, req.tenantId)
    .map(safeNavigationFields);
  res.json({ ok: true, now: now(), stats: liveStats(req.tenantId), messages: recent, visitors });
});
r.get("/conversations/:id/messages", (req, res) => {
  const conv = conversation(req.tenantId, req.params.id);
  touchRead(req.tenantId, conv.id);
  const age = now() - Number(conv.last_seen_at || 0);
  const visitor_state = age < CHAT_ACTIVE_MS ? "ONLINE" : age < LEFT_MS ? "PASSIVE" : "LEFT";
  const safeMessages = messages(req.tenantId, conv.id, req.query.after).map((x) =>
    x.attachment_url?.startsWith("private:") ? { ...x, attachment_url: `/live/attachments/${x.id}` } : x
  );
  res.json({
    ok: true,
    conversation: { ...conv, visitor_state, visitor_age_ms: age },
    pages: visitorPages(req.tenantId, conv.visitor_id, 10),
    messages: safeMessages,
    typing: conv.typing_at && now() - Number(conv.typing_at) < 10000 ? conv.typing_text : ""
  });
});
r.post("/visitors/:id/start", (req, res) => {
  try {
    const conv = startConversationForVisitor(
      req,
      req.params.id,
      limit(req.body.greeting, 500) || "Merhaba, nasıl yardımcı olabiliriz?"
    );
    audit(req, {
      action: "LIVE_CHAT_START",
      module: "LIVE",
      entityId: conv.id,
      newValue: { visitor_id: req.params.id }
    });
    res.json({ ok: true, conversation_id: conv.id });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
r.post("/conversations/:id/accept", (req, res) => {
  const conv = conversation(req.tenantId, req.params.id);
  db.prepare("UPDATE live_conversations SET status='OPEN',assigned_user_id=? WHERE tenant_id=? AND id=?").run(
    req.user.id,
    req.tenantId,
    conv.id
  );
  touchRead(req.tenantId, conv.id);
  audit(req, {
    action: "LIVE_CHAT_ACCEPT",
    module: "LIVE",
    entityId: conv.id,
    newValue: { assigned_user_id: req.user.id }
  });
  res.json({ ok: true });
});
r.post("/conversations/:id/reply", (req, res) => {
  const conv = conversation(req.tenantId, req.params.id);
  const msg = limit(req.body.message, 2000);
  if (!msg) return res.status(422).json({ ok: false, error: "Mesaj boş olamaz." });
  const t = now();
  db.transaction(() => {
    db.prepare(
      "UPDATE live_conversations SET status='OPEN',assigned_user_id=COALESCE(assigned_user_id,?),last_message_at=?,last_operator_message_at=? WHERE tenant_id=? AND id=?"
    ).run(req.user.id, t, t, req.tenantId, conv.id);
    db.prepare(
      "INSERT INTO live_messages(id,tenant_id,conversation_id,sender_type,sender_id,message,is_read,created_at,client_uid,attachment_url,attachment_name) VALUES(?,?,?,?,?,?,0,?,NULL,NULL,NULL)"
    ).run(id("lmsg"), req.tenantId, conv.id, "OPERATOR", req.user.id, msg, t);
  })();
  res.json({ ok: true });
});
r.get("/attachments/:messageId", (req, res) => {
  const row = db
    .prepare(
      `SELECT m.* FROM live_messages m JOIN live_conversations c ON c.id=m.conversation_id WHERE m.id=? AND m.tenant_id=? LIMIT 1`
    )
    .get(req.params.messageId, req.tenantId);
  const full = resolvePrivateFile(row?.attachment_url);
  if (!row || !full || !fs.existsSync(full)) return res.status(404).end();
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(full);
});
r.post("/conversations/:id/upload", privateUpload.single("attachment"), validateUploads, (req, res) => {
  const conv = conversation(req.tenantId, req.params.id);
  if (!req.file) return res.status(422).json({ ok: false, error: "Dosya seçilmedi." });
  const url = privateFile(req.file),
    name = limit(req.file.originalname || req.file.filename, 200),
    t = now();
  db.transaction(() => {
    db.prepare(
      "UPDATE live_conversations SET status='OPEN',assigned_user_id=COALESCE(assigned_user_id,?),last_message_at=?,last_operator_message_at=? WHERE tenant_id=? AND id=?"
    ).run(req.user.id, t, t, req.tenantId, conv.id);
    db.prepare(
      "INSERT INTO live_messages(id,tenant_id,conversation_id,sender_type,sender_id,message,is_read,created_at,client_uid,attachment_url,attachment_name) VALUES(?,?,?,?,?,?,0,?,NULL,?,?)"
    ).run(id("lmsg"), req.tenantId, conv.id, "OPERATOR", req.user.id, `📎 ${name}`, t, url, name);
  })();
  res.json({ ok: true });
});
r.post("/conversations/:id/pin", (req, res) => {
  const conv = conversation(req.tenantId, req.params.id);
  const next = Number(req.body.pinned ?? req.query.pinned ?? 1) ? 1 : 0;
  db.prepare("UPDATE live_conversations SET pinned=? WHERE tenant_id=? AND id=?").run(
    next,
    req.tenantId,
    conv.id
  );
  audit(req, { action: next ? "LIVE_CHAT_PIN" : "LIVE_CHAT_UNPIN", module: "LIVE", entityId: conv.id });
  res.json({ ok: true, pinned: next });
});
r.post("/conversations/:id/close", (req, res) => {
  const conv = conversation(req.tenantId, req.params.id);
  db.prepare("UPDATE live_conversations SET status='CLOSED',closed_at=? WHERE tenant_id=? AND id=?").run(
    now(),
    req.tenantId,
    conv.id
  );
  audit(req, { action: "LIVE_CHAT_CLOSE", module: "LIVE", entityId: conv.id });
  res.json({ ok: true });
});

r.post("/sites/save", canManage, upload.single("operator_avatar"), validateUploads, (req, res) => {
  const nowv = now();
  const profile = activeProfile(req.tenantId);
  if (!profile) {
    flash(req, "error", "Önce aktif firma profili oluşturun.");
    return res.redirect("/live/settings");
  }
  const existing = db
    .prepare("SELECT * FROM live_sites WHERE tenant_id=? AND profile_id=? LIMIT 1")
    .get(req.tenantId, profile.id);
  const siteKey = existing?.site_key || id("site");
  const sid = existing?.id || id("lsit");
  const avatar = publicFile(req.file) || existing?.operator_avatar_url || null;
  const siteUrl = limit(req.body.site_url || profile.website, 300);
  const v = {
    id: sid,
    tenant_id: req.tenantId,
    profile_id: profile.id,
    site_name: limit(req.body.site_name, 120) || profile.short_name || profile.company_name || siteUrl,
    site_url: siteUrl,
    site_key: siteKey,
    allowed_domain: siteUrl,
    is_active: req.body.is_active ? 1 : 0,
    widget_title: limit(req.body.widget_title, 80) || "Canlı Destek",
    widget_bubble_text: limit(req.body.widget_bubble_text, 120) || "Bize yazabilirsiniz, çevrimiçiyiz!",
    welcome_message: limit(req.body.welcome_message, 500) || "Merhaba, size nasıl yardımcı olabiliriz?",
    offline_message:
      limit(req.body.offline_message, 500) ||
      "Şu anda çevrimdışıyız. Mesajınızı bırakın, size dönüş yapalım.",
    widget_color: limit(req.body.widget_color, 40) || "#245ba7",
    operator_name: limit(req.body.operator_name, 120) || "Satış Temsilcisi",
    operator_avatar_url: avatar,
    widget_position: limit(req.body.widget_position, 40) || "RIGHT_BOTTOM",
    widget_design: limit(req.body.widget_design, 40) || "PRO_GRADIENT",
    quick_replies_enabled: req.body.quick_replies_enabled ? 1 : 0,
    quick_reply_1: limit(req.body.quick_reply_1, 120) || "Merhaba!",
    quick_reply_2: limit(req.body.quick_reply_2, 120) || "Merhaba, yardıma ihtiyacım var.",
    quick_reply_3: limit(req.body.quick_reply_3, 120) || "Merhaba, bilgi alabilir miyim?",
    whatsapp_url: limit(req.body.whatsapp_url, 500),
    contact_form_enabled: req.body.contact_form_enabled ? 1 : 0,
    contact_form_mode: limit(req.body.contact_form_mode, 40) || "AFTER_FIRST_MESSAGE",
    contact_form_after_messages: Math.max(1, Math.min(10, Number(req.body.contact_form_after_messages || 3))),
    business_hours_enabled: req.body.business_hours_enabled ? 1 : 0,
    business_days: limit(req.body.business_days || "1,2,3,4,5", 30),
    business_start: limit(req.body.business_start || "09:00", 8),
    business_end: limit(req.body.business_end || "18:00", 8),
    manual_online: req.body.manual_online ? 1 : 0,
    notification_sound: SOUND_OPTIONS.includes(clean(req.body.notification_sound))
      ? clean(req.body.notification_sound)
      : "bell-soft",
    welcome_repeat_hours: Math.max(1, Math.min(168, Number(req.body.welcome_repeat_hours || 24))),
    dashboard_chat_window_hours: Math.max(
      1,
      Math.min(168, Number(req.body.dashboard_chat_window_hours || 24))
    ),
    timezone: limit(req.body.timezone || existing?.timezone || "Europe/Istanbul", 80),
    privacy_notice: limit(
      req.body.privacy_notice ||
        existing?.privacy_notice ||
        "Kişisel verileriniz talebinizi yanıtlamak amacıyla işlenir.",
      1000
    ),
    consent_required: req.body.consent_required ? 1 : 0,
    retention_days: Math.max(
      30,
      Math.min(3650, Number(req.body.retention_days || existing?.retention_days || 365))
    ),
    widget_font_family: limit(req.body.widget_font_family || "Inter", 60),
    widget_font_size: Math.max(12, Math.min(20, Number(req.body.widget_font_size || 14))),
    widget_font_weight: Math.max(300, Math.min(900, Number(req.body.widget_font_weight || 700))),
    widget_header_height: Math.max(72, Math.min(130, Number(req.body.widget_header_height || 92))),
    widget_header_pattern: limit(req.body.widget_header_pattern || "LAB_DARK", 40),
    operator_title: limit(req.body.operator_title || "Satış Temsilcisi çevrimiçi", 120),
    widget_radius: Math.max(10, Math.min(32, Number(req.body.widget_radius || 22))),
    created_at: existing?.created_at || nowv,
    updated_at: nowv
  };
  if (!v.site_url) {
    flash(req, "error", "Web sitesi adresi zorunludur.");
    return res.redirect("/live/settings");
  }
  db.prepare(
    `INSERT INTO live_sites(id,tenant_id,profile_id,site_name,site_url,site_key,allowed_domain,is_active,widget_title,welcome_message,offline_message,widget_color,operator_name,operator_avatar_url,widget_position,contact_form_enabled,contact_form_mode,notification_sound,created_at,updated_at,widget_design,quick_replies_enabled,quick_reply_1,quick_reply_2,quick_reply_3,whatsapp_url,widget_bubble_text,contact_form_after_messages,business_hours_enabled,business_days,business_start,business_end,manual_online,welcome_repeat_hours,widget_font_family,widget_font_size,widget_font_weight,widget_header_height,widget_header_pattern,operator_title,widget_radius,dashboard_chat_window_hours,timezone,privacy_notice,consent_required,retention_days)
    VALUES(@id,@tenant_id,@profile_id,@site_name,@site_url,@site_key,@allowed_domain,@is_active,@widget_title,@welcome_message,@offline_message,@widget_color,@operator_name,@operator_avatar_url,@widget_position,@contact_form_enabled,@contact_form_mode,@notification_sound,@created_at,@updated_at,@widget_design,@quick_replies_enabled,@quick_reply_1,@quick_reply_2,@quick_reply_3,@whatsapp_url,@widget_bubble_text,@contact_form_after_messages,@business_hours_enabled,@business_days,@business_start,@business_end,@manual_online,@welcome_repeat_hours,@widget_font_family,@widget_font_size,@widget_font_weight,@widget_header_height,@widget_header_pattern,@operator_title,@widget_radius,@dashboard_chat_window_hours,@timezone,@privacy_notice,@consent_required,@retention_days)
    ON CONFLICT(id) DO UPDATE SET site_name=excluded.site_name,site_url=excluded.site_url,allowed_domain=excluded.allowed_domain,is_active=excluded.is_active,widget_title=excluded.widget_title,welcome_message=excluded.welcome_message,offline_message=excluded.offline_message,widget_color=excluded.widget_color,operator_name=excluded.operator_name,operator_avatar_url=excluded.operator_avatar_url,widget_position=excluded.widget_position,contact_form_enabled=excluded.contact_form_enabled,contact_form_mode=excluded.contact_form_mode,notification_sound=excluded.notification_sound,updated_at=excluded.updated_at,widget_design=excluded.widget_design,quick_replies_enabled=excluded.quick_replies_enabled,quick_reply_1=excluded.quick_reply_1,quick_reply_2=excluded.quick_reply_2,quick_reply_3=excluded.quick_reply_3,whatsapp_url=excluded.whatsapp_url,widget_bubble_text=excluded.widget_bubble_text,contact_form_after_messages=excluded.contact_form_after_messages,business_hours_enabled=excluded.business_hours_enabled,business_days=excluded.business_days,business_start=excluded.business_start,business_end=excluded.business_end,manual_online=excluded.manual_online,welcome_repeat_hours=excluded.welcome_repeat_hours,widget_font_family=excluded.widget_font_family,widget_font_size=excluded.widget_font_size,widget_font_weight=excluded.widget_font_weight,widget_header_height=excluded.widget_header_height,widget_header_pattern=excluded.widget_header_pattern,operator_title=excluded.operator_title,widget_radius=excluded.widget_radius,dashboard_chat_window_hours=excluded.dashboard_chat_window_hours,timezone=excluded.timezone,privacy_notice=excluded.privacy_notice,consent_required=excluded.consent_required,retention_days=excluded.retention_days`
  ).run(v);
  audit(req, { action: "LIVE_SITE_SAVE", module: "LIVE", entityId: sid, newValue: v });
  flash(req, "success", "Canlı destek görünüm ayarları aktif firma için kaydedildi.");
  res.redirect("/live/settings");
});
export default r;

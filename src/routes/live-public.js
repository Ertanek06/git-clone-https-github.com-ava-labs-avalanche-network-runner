import fs from "fs";
import path from "path";
import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { config } from "../config.js";
import { privateUpload, privateFile, resolvePrivateFile, validateUploads } from "../middleware/upload.js";
import { livePublicRateLimit } from "../middleware/rate-limit.js";

const r = Router();
const now = () => Date.now();
const ONLINE_MS = 3 * 60 * 1000;
const clean = (s) => String(s || "").trim();
const limit = (s, n = 500) => clean(s).slice(0, n);
const ipOf = (req) => String(req.ip || req.socket?.remoteAddress || "").trim();
const publicBase = (req) => {
  const cfg = String(config.publicBaseUrl || "").replace(/\/$/, "");
  if (cfg && !/example\.com/i.test(cfg)) return cfg;
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${proto}://${req.get("host")}`.replace(/\/$/, "");
};
const absUrl = (u, req) => {
  u = clean(u);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return publicBase(req) + u;
  return u;
};
const originHost = (value) => {
  try {
    return new URL(String(value || "")).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};
const originAllowed = (site, origin) => {
  if (!origin) return true;
  const incoming = originHost(origin);
  if (!incoming) return false;
  const hosts = [site?.allowed_domain, site?.site_url].map(originHost).filter(Boolean);
  return hosts.some((host) => incoming === host || incoming.endsWith(`.${host}`));
};
const cors = (req, res, next) => {
  const origin = req.get("origin") || "";
  const key = clean(req.query.site || req.body?.site_key || req.body?.site);
  const site = key ? siteByKey(key) : null;
  if (origin && (!site || !originAllowed(site, origin)))
    return res.status(403).json({ ok: false, error: "Bu alan adı canlı destek için yetkili değil." });
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Visitor-Token");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
};
// Bu router "/live" prefix'i altında, oturum/CSRF katmanlarından ÖNCE mount edilir (bkz. server.js),
// çünkü ziyaretçi widget'ı farklı bir origin'den, çerezsiz/CSRF'siz çağrı yapar. Sorun: eskiden
// r.use(cors) tüm "/live/*" isteklerinde (yani giriş yapmış operatörlerin kullandığı /live/chats,
// /live/visitors gibi admin sayfalarında da) çalışıp gereksiz/karışık CORS başlıkları ekliyordu.
// Bu router'daki tüm gerçek route'lar zaten "/public/..." ile başladığı için CORS'u da yalnızca o
// path'e uyguluyoruz; böylece admin rotaları bu router'dan sessizce geçip session/auth zincirine düşer.
r.use("/public", cors, livePublicRateLimit);

const SOUND_OPTIONS = [
  { key: "bell-soft", label: "Yumuşak Zil" },
  { key: "msn", label: "MSN Tarzı" },
  { key: "ding", label: "Ding" },
  { key: "chime", label: "Chime" },
  { key: "digital", label: "Dijital" },
  { key: "pulse", label: "Pulse" },
  { key: "office", label: "Ofis" },
  { key: "pop", label: "Pop" },
  { key: "alert", label: "Uyarı" },
  { key: "wa-pop", label: "WhatsApp Pop" },
  { key: "wa-chime", label: "WhatsApp Chime" },
  { key: "wa-soft", label: "WhatsApp Soft" },
  { key: "none", label: "Sessiz" }
];

function siteByKey(key) {
  return db
    .prepare(
      `SELECT ls.*,p.logo_url,p.company_name,p.short_name,p.authorized_person
    FROM live_sites ls
    LEFT JOIN profiles p ON p.id=ls.profile_id
    WHERE ls.site_key=? AND ls.is_active=1 LIMIT 1`
    )
    .get(clean(key));
}
const consentGiven = (body) =>
  body?.consent === true || ["1", "true", "yes", "on"].includes(clean(body?.consent).toLowerCase());
function assertConsent(site, body = {}) {
  if (Number(site?.consent_required || 0) && !consentGiven(body)) {
    const err = new Error("Mesaj göndermek için kişisel veri bilgilendirmesini onaylamanız gerekir.");
    err.status = 422;
    throw err;
  }
}

function assertSite(key) {
  const site = siteByKey(key);
  if (!site) {
    const err = new Error("Canlı destek sitesi bulunamadı veya pasif.");
    err.status = 404;
    throw err;
  }
  return site;
}
function parseDevice(ua) {
  ua = String(ua || "");
  const l = ua.toLowerCase();
  return l.includes("mobile") || l.includes("android") || l.includes("iphone") ? "Mobil" : "Masaüstü";
}
function contactFrom(body = {}) {
  const c = body.contact && typeof body.contact === "object" ? body.contact : body;
  return {
    contact_name: limit(c.contact_name || c.name || c.full_name, 160),
    contact_title: limit(c.contact_title || c.title, 120),
    contact_company: limit(c.contact_company || c.company || c.company_name, 180),
    contact_email: limit(c.contact_email || c.email, 180),
    contact_phone: limit(c.contact_phone || c.phone || c.mobile, 80)
  };
}
const AVATARS = [
  "🐭",
  "🍎",
  "🐯",
  "🍕",
  "☂️",
  "🧪",
  "🔬",
  "🦊",
  "🍉",
  "🌲",
  "🧿",
  "🚀",
  "🧊",
  "🌿",
  "⚡",
  "🧡"
];
function visitorAvatar(token = "") {
  let n = 0;
  for (const ch of String(token)) n = (n + ch.charCodeAt(0)) % 997;
  return AVATARS[n % AVATARS.length];
}
function visitorLabel(v = {}) {
  if (v.contact_name) return v.contact_name;
  const city = v.city || v.country || "Ziyaretçi";
  return `${city} ${String(v.visitor_token || "").slice(-4)}`.trim();
}
function isBusinessOnline(site) {
  if (Number(site.manual_online || 0)) return true;
  if (!Number(site.business_hours_enabled || 0)) return true;
  const zone = String(site.timezone || "Europe/Istanbul");
  let day = "1",
    hm = "00:00";
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      })
        .formatToParts(new Date())
        .filter((x) => x.type !== "literal")
        .map((x) => [x.type, x.value])
    );
    const map = { Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6", Sun: "7" };
    day = map[parts.weekday] || "1";
    hm = `${parts.hour}:${parts.minute}`;
  } catch {}
  const days = String(site.business_days || "1,2,3,4,5")
    .split(",")
    .map((x) => x.trim());
  if (!days.includes(day)) return false;
  const start = site.business_start || "09:00",
    end = site.business_end || "18:00";
  return hm >= start && hm <= end;
}
function upsertVisitor(req, site, body = {}, { countPage = false } = {}) {
  const t = now();
  const token = limit(body.visitor_token || req.get("x-visitor-token") || id("vis"), 80);
  let visitor = db
    .prepare("SELECT * FROM live_visitors WHERE site_id=? AND visitor_token=? LIMIT 1")
    .get(site.id, token);
  const contact = contactFrom(body);
  const data = {
    tenant_id: site.tenant_id,
    site_id: site.id,
    visitor_token: token,
    ip: ipOf(req),
    user_agent: limit(req.get("user-agent") || "", 1000),
    device_type: parseDevice(req.get("user-agent") || ""),
    current_url: limit(body.url, 1000),
    current_title: limit(body.title, 300),
    referrer: limit(body.referrer || req.get("referer") || "", 1000),
    last_seen_at: t,
    is_online: 1,
    ...contact
  };
  const groupKey = contact.contact_email || contact.contact_phone || data.ip || token;
  data.last_group_key = groupKey;
  data.visitor_label = visitorLabel({ ...data, visitor_token: token });
  data.avatar_emoji = visitorAvatar(token);
  if (visitor) {
    db.prepare(
      `UPDATE live_visitors SET
      ip=@ip,user_agent=@user_agent,device_type=@device_type,
      current_url=COALESCE(NULLIF(@current_url,''),current_url),
      current_title=COALESCE(NULLIF(@current_title,''),current_title),
      referrer=COALESCE(NULLIF(@referrer,''),referrer),
      contact_name=COALESCE(NULLIF(@contact_name,''),contact_name),
      contact_title=COALESCE(NULLIF(@contact_title,''),contact_title),
      contact_company=COALESCE(NULLIF(@contact_company,''),contact_company),
      contact_email=COALESCE(NULLIF(@contact_email,''),contact_email),
      contact_phone=COALESCE(NULLIF(@contact_phone,''),contact_phone),
      visitor_label=COALESCE(NULLIF(@visitor_label,''),visitor_label),
      avatar_emoji=COALESCE(NULLIF(@avatar_emoji,''),avatar_emoji),
      last_group_key=@last_group_key,
      last_seen_at=@last_seen_at,is_online=1,page_count=COALESCE(page_count,0)+@page_increment,visit_count=COALESCE(visit_count,1)
      WHERE id=@id`
    ).run({ ...data, page_increment: countPage ? 1 : 0, id: visitor.id });
    visitor = {
      ...visitor,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== "")),
      page_count: Number(visitor.page_count || 0) + (countPage ? 1 : 0)
    };
  } else {
    visitor = {
      id: id("lvis"),
      ...data,
      first_seen_at: t,
      page_count: countPage ? 1 : 0,
      visit_count: 1,
      customer_id: null,
      city: null,
      country: null,
      browser: null,
      typing_text: null,
      typing_at: null
    };
    db.prepare(
      `INSERT INTO live_visitors(id,tenant_id,site_id,visitor_token,ip,user_agent,country,city,device_type,browser,first_seen_at,last_seen_at,current_url,current_title,referrer,page_count,is_online,customer_id,contact_name,contact_title,contact_company,contact_email,contact_phone,typing_text,typing_at,visit_count,visitor_label,avatar_emoji,last_group_key)
      VALUES(@id,@tenant_id,@site_id,@visitor_token,@ip,@user_agent,@country,@city,@device_type,@browser,@first_seen_at,@last_seen_at,@current_url,@current_title,@referrer,@page_count,@is_online,@customer_id,@contact_name,@contact_title,@contact_company,@contact_email,@contact_phone,@typing_text,@typing_at,@visit_count,@visitor_label,@avatar_emoji,@last_group_key)`
    ).run(visitor);
  }
  if (data.current_url) {
    const last = db
      .prepare(
        "SELECT page_url,created_at FROM live_visitor_events WHERE visitor_id=? ORDER BY created_at DESC LIMIT 1"
      )
      .get(visitor.id);
    if (!last || last.page_url !== data.current_url || t - Number(last.created_at || 0) > 5000) {
      db.prepare(
        `INSERT INTO live_visitor_events(id,tenant_id,site_id,visitor_id,event_type,page_url,page_title,referrer,created_at) VALUES(?,?,?,?,?,?,?,?,?)`
      ).run(
        id("levt"),
        site.tenant_id,
        site.id,
        visitor.id,
        "PAGE_VIEW",
        data.current_url,
        data.current_title,
        data.referrer,
        t
      );
    }
  }
  return visitor;
}
function openConversation(site, visitor, firstMessage, body = {}, proactive = 0) {
  let conv = db
    .prepare(
      "SELECT * FROM live_conversations WHERE tenant_id=? AND site_id=? AND visitor_id=? AND status IN ('OPEN','WAITING') ORDER BY last_message_at DESC LIMIT 1"
    )
    .get(site.tenant_id, site.id, visitor.id);
  const t = now();
  if (!conv) {
    conv = {
      id: id("lcon"),
      tenant_id: site.tenant_id,
      site_id: site.id,
      visitor_id: visitor.id,
      customer_id: visitor.customer_id || null,
      assigned_user_id: null,
      status: "WAITING",
      source_url: limit(body.url || visitor.current_url, 1000),
      source_title: limit(body.title || visitor.current_title, 300),
      first_message: limit(firstMessage, 1000),
      started_at: t,
      last_message_at: t,
      closed_at: null,
      proactive_started: proactive
    };
    db.prepare(
      `INSERT INTO live_conversations(id,tenant_id,site_id,visitor_id,customer_id,assigned_user_id,status,source_url,source_title,first_message,started_at,last_message_at,closed_at,proactive_started) VALUES(@id,@tenant_id,@site_id,@visitor_id,@customer_id,@assigned_user_id,@status,@source_url,@source_title,@first_message,@started_at,@last_message_at,@closed_at,@proactive_started)`
    ).run(conv);
  }
  return conv;
}
function insertMessage({
  tenantId,
  convId,
  senderType,
  senderId,
  message,
  clientUid = null,
  attachmentUrl = null,
  attachmentName = null
}) {
  const t = now();
  const msgId = id("lmsg");
  db.prepare(
    `INSERT INTO live_messages(id,tenant_id,conversation_id,sender_type,sender_id,message,is_read,created_at,client_uid,attachment_url,attachment_name)
    VALUES(?,?,?,?,?,?,0,?,?,?,?)`
  ).run(msgId, tenantId, convId, senderType, senderId, message, t, clientUid, attachmentUrl, attachmentName);
  db.prepare(
    "UPDATE live_conversations SET last_message_at=?,status=CASE WHEN ?='VISITOR' THEN 'WAITING' WHEN status='CLOSED' THEN 'WAITING' ELSE status END WHERE id=?"
  ).run(t, senderType, convId);
  return { id: msgId, created_at: t };
}

r.get("/embed.js", (_req, res) => {
  const file = path.join(config.root, "public/live/embed.js");
  res.type("application/javascript; charset=utf-8").send(fs.readFileSync(file, "utf8"));
});
r.get("/widget.css", (_req, res) => {
  const file = path.join(config.root, "public/live/widget.css");
  res.type("text/css; charset=utf-8").send(fs.readFileSync(file, "utf8"));
});
r.get("/public/bootstrap", (req, res) => {
  try {
    const site = assertSite(req.query.site);
    const token = limit(req.query.visitor_token || req.get("x-visitor-token"), 80);
    let knownVisitor = null;
    let hasConversation = false;
    let hideWelcome = false;
    const repeatMs = Math.max(1, Number(site.welcome_repeat_hours || 24)) * 60 * 60 * 1000;
    if (token) {
      knownVisitor = db
        .prepare("SELECT * FROM live_visitors WHERE site_id=? AND visitor_token=? LIMIT 1")
        .get(site.id, token);
    }
    if (knownVisitor) {
      const recentConv = db
        .prepare(
          "SELECT id,last_message_at,status FROM live_conversations WHERE site_id=? AND visitor_id=? AND last_message_at>=? ORDER BY last_message_at DESC LIMIT 1"
        )
        .get(site.id, knownVisitor.id, now() - repeatMs);
      hasConversation = !!recentConv;
      hideWelcome = !!recentConv;
    }
    const quickReplies = [site.quick_reply_1, site.quick_reply_2, site.quick_reply_3]
      .map((x) => clean(x))
      .filter(Boolean);
    res.json({
      ok: true,
      site: {
        key: site.site_key,
        name: site.site_name,
        url: site.site_url,
        color: site.widget_color || "#245ba7",
        title: site.widget_title || "Canlı Destek",
        bubble_text: site.widget_bubble_text || "Bize yazabilirsiniz, çevrimiçiyiz!",
        welcome: site.welcome_message || "Merhaba, size nasıl yardımcı olabiliriz?",
        offline: site.offline_message || "Şu anda çevrimdışıyız. Mesajınızı bırakın, size dönüş yapalım.",
        logo: absUrl(site.logo_url, req),
        avatar: absUrl(site.operator_avatar_url, req) || absUrl(site.logo_url, req),
        company: site.short_name || site.company_name || site.site_name,
        operator: site.operator_name || site.authorized_person || "Satış Temsilcisi",
        operator_title: site.operator_title || "Satış Temsilcisi çevrimiçi",
        contact_form_enabled: Number(site.contact_form_enabled ?? 1),
        contact_form_mode: site.contact_form_mode || "AFTER_FIRST_MESSAGE",
        contact_form_after_messages: Number(site.contact_form_after_messages || 3),
        welcome_repeat_hours: Number(site.welcome_repeat_hours || 24),
        notification_sound: site.notification_sound || "bell-soft",
        widget_position:
          (site.widget_position === "RIGHT"
            ? "RIGHT_BOTTOM"
            : site.widget_position === "LEFT"
              ? "LEFT_BOTTOM"
              : site.widget_position) || "RIGHT_BOTTOM",
        widget_design: site.widget_design || "PRO_GRADIENT",
        widget_font_family: site.widget_font_family || "Inter",
        widget_font_size: Number(site.widget_font_size || 14),
        widget_font_weight: Number(site.widget_font_weight || 700),
        widget_header_height: Number(site.widget_header_height || 92),
        widget_header_pattern: site.widget_header_pattern || "LAB_DARK",
        widget_radius: Number(site.widget_radius || 22),
        quick_replies_enabled: Number(site.quick_replies_enabled ?? 1),
        quick_replies: quickReplies.length
          ? quickReplies
          : ["Merhaba!", "Merhaba, yardıma ihtiyacım var.", "Merhaba, bilgi alabilir miyim?"],
        whatsapp_url: site.whatsapp_url || "",
        online_now: isBusinessOnline(site) ? 1 : 0,
        business_hours_enabled: Number(site.business_hours_enabled || 0),
        business_start: site.business_start || "09:00",
        business_end: site.business_end || "18:00",
        has_conversation: hasConversation ? 1 : 0,
        hide_welcome: hideWelcome ? 1 : 0,
        privacy_notice: site.privacy_notice || "Kişisel verileriniz talebinizi yanıtlamak amacıyla işlenir.",
        consent_required: Number(site.consent_required || 0),
        retention_days: Number(site.retention_days || 365),
        sounds: SOUND_OPTIONS
      }
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
r.post("/public/track", (req, res) => {
  try {
    const site = assertSite(req.body.site_key || req.query.site);
    const visitor = upsertVisitor(req, site, req.body || {}, { countPage: true });
    const online =
      db
        .prepare(
          "SELECT COUNT(*) AS c FROM live_visitors WHERE tenant_id=? AND site_id=? AND last_seen_at>=?"
        )
        .get(site.tenant_id, site.id, now() - ONLINE_MS)?.c || 0;
    const repeatMs = Math.max(1, Number(site.welcome_repeat_hours || 24)) * 60 * 60 * 1000;
    const hasConversation = !!db
      .prepare(
        "SELECT id FROM live_conversations WHERE site_id=? AND visitor_id=? AND last_message_at>=? ORDER BY last_message_at DESC LIMIT 1"
      )
      .get(site.id, visitor.id, now() - repeatMs);
    res.json({
      ok: true,
      visitor_token: visitor.visitor_token,
      visitor_id: visitor.id,
      online,
      has_conversation: hasConversation ? 1 : 0,
      hide_welcome: hasConversation ? 1 : 0
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
r.post("/public/contact", (req, res) => {
  try {
    const site = assertSite(req.body.site_key || req.query.site);
    assertConsent(site, req.body || {});
    const visitor = upsertVisitor(req, site, req.body || {});
    res.json({ ok: true, visitor_token: visitor.visitor_token, visitor_id: visitor.id });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
r.post("/public/typing", (req, res) => {
  try {
    const site = assertSite(req.body.site_key || req.query.site);
    const visitor = upsertVisitor(req, site, req.body || {});
    const text = limit(req.body.text, 500);
    db.prepare("UPDATE live_visitors SET typing_text=?,typing_at=? WHERE id=?").run(
      text,
      text ? now() : 0,
      visitor.id
    );
    res.json({ ok: true, visitor_token: visitor.visitor_token });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
r.post("/public/message", (req, res) => {
  try {
    const site = assertSite(req.body.site_key || req.query.site);
    assertConsent(site, req.body || {});
    const visitor = upsertVisitor(req, site, req.body || {});
    const message = limit(req.body.message, 2000);
    if (!message) throw Object.assign(new Error("Mesaj boş olamaz."), { status: 422 });
    db.prepare("UPDATE live_visitors SET typing_text='',typing_at=0 WHERE id=?").run(visitor.id);
    const conv = openConversation(site, visitor, message, req.body || {});
    const clientUid = limit(req.body.client_uid, 120) || null;
    if (clientUid) {
      const existing = db
        .prepare("SELECT id,created_at FROM live_messages WHERE conversation_id=? AND client_uid=? LIMIT 1")
        .get(conv.id, clientUid);
      if (existing)
        return res.json({
          ok: true,
          visitor_token: visitor.visitor_token,
          conversation_id: conv.id,
          message_id: existing.id,
          created_at: existing.created_at,
          duplicate: true
        });
    }
    const saved = insertMessage({
      tenantId: site.tenant_id,
      convId: conv.id,
      senderType: "VISITOR",
      senderId: visitor.id,
      message,
      clientUid
    });
    db.prepare("UPDATE live_conversations SET last_visitor_seen_at=? WHERE id=?").run(
      visitor.last_seen_at || now(),
      conv.id
    );
    res.json({
      ok: true,
      visitor_token: visitor.visitor_token,
      conversation_id: conv.id,
      message_id: saved.id,
      created_at: saved.created_at
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
r.post("/public/upload", privateUpload.single("attachment"), validateUploads, (req, res) => {
  try {
    const site = assertSite(req.body.site_key || req.query.site);
    assertConsent(site, req.body || {});
    const visitor = upsertVisitor(req, site, req.body || {});
    if (!req.file) throw Object.assign(new Error("Dosya seçilmedi."), { status: 422 });
    const conv = openConversation(site, visitor, "Dosya gönderildi", req.body || {});
    const attachmentUrl = privateFile(req.file);
    const attachmentName = limit(req.file.originalname || req.file.filename, 200);
    const saved = insertMessage({
      tenantId: site.tenant_id,
      convId: conv.id,
      senderType: "VISITOR",
      senderId: visitor.id,
      message: `📎 ${attachmentName}`,
      attachmentUrl,
      attachmentName
    });
    res.json({
      ok: true,
      visitor_token: visitor.visitor_token,
      conversation_id: conv.id,
      message_id: saved.id,
      created_at: saved.created_at,
      attachment_url: `/live/public/attachments/${saved.id}?site=${encodeURIComponent(site.site_key)}&visitor_token=${encodeURIComponent(visitor.visitor_token)}`,
      attachment_name: attachmentName
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
r.get("/public/attachments/:messageId", (req, res) => {
  try {
    const site = assertSite(req.query.site);
    const token = limit(req.query.visitor_token || req.get("x-visitor-token"), 80);
    const visitor = db
      .prepare("SELECT * FROM live_visitors WHERE site_id=? AND visitor_token=? LIMIT 1")
      .get(site.id, token);
    if (!visitor) return res.status(404).end();
    const row = db
      .prepare(
        `SELECT m.* FROM live_messages m JOIN live_conversations c ON c.id=m.conversation_id WHERE m.id=? AND m.tenant_id=? AND c.site_id=? AND c.visitor_id=? LIMIT 1`
      )
      .get(req.params.messageId, site.tenant_id, site.id, visitor.id);
    const full = resolvePrivateFile(row?.attachment_url);
    if (!row || !full || !fs.existsSync(full)) return res.status(404).end();
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(full);
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
r.get("/public/messages", (req, res) => {
  try {
    const site = assertSite(req.query.site);
    const token = limit(req.query.visitor_token || req.get("x-visitor-token"), 80);
    const visitor = db
      .prepare("SELECT * FROM live_visitors WHERE site_id=? AND visitor_token=? LIMIT 1")
      .get(site.id, token);
    if (!visitor) return res.json({ ok: true, messages: [] });
    const conv = db
      .prepare(
        "SELECT * FROM live_conversations WHERE site_id=? AND visitor_id=? ORDER BY last_message_at DESC LIMIT 1"
      )
      .get(site.id, visitor.id);
    if (!conv) return res.json({ ok: true, messages: [] });
    const after = Number(req.query.after || 0);
    db.prepare(
      "UPDATE live_messages SET read_by_visitor_at=COALESCE(read_by_visitor_at,?) WHERE conversation_id=? AND sender_type='OPERATOR'"
    ).run(now(), conv.id);
    const rows = db
      .prepare(
        "SELECT id,sender_type,message,created_at,attachment_url,attachment_name FROM live_messages WHERE conversation_id=? AND created_at>? ORDER BY created_at ASC LIMIT 100"
      )
      .all(conv.id, after)
      .map((x) =>
        x.attachment_url?.startsWith("private:")
          ? {
              ...x,
              attachment_url: `/live/public/attachments/${x.id}?site=${encodeURIComponent(site.site_key)}&visitor_token=${encodeURIComponent(visitor.visitor_token)}`
            }
          : x
      );
    const age = now() - Number(visitor.last_seen_at || 0);
    res.json({
      ok: true,
      conversation_id: conv.id,
      messages: rows,
      visitor: {
        online: age < ONLINE_MS,
        passive: age >= ONLINE_MS && age < 10 * 60 * 1000,
        left: age >= 10 * 60 * 1000,
        last_seen_at: visitor.last_seen_at,
        current_url: visitor.current_url,
        current_title: visitor.current_title
      }
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});
export default r;

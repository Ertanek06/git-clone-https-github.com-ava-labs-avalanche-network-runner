import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import {
  loadQuote,
  saveQuote,
  createRevision,
  calcQuote,
  customerSnapshotFromPayload,
  profileSnapshot
} from "../services/quote.service.js";
import { jsonParse } from "../utils/json.js";
import { quoteDisplayNo } from "../services/locale.service.js";
import { nextOrderNo } from "../services/numbering.service.js";
import { config } from "../config.js";
import crypto from "crypto";
import { sendMail, publicUrl, buildQuoteEmail } from "../services/mail.service.js";
import { hasPermission } from "../services/permission.service.js";
import { encryptSecret, decryptSecret } from "../utils/secrets.js";
import { parseEmailList, emailListText } from "../utils/email-list.js";
import { ensureOperationalSchema } from "../services/operational-schema.service.js";
import { quotePrintLocals, ensureQuoteTemplateSnapshot } from "../services/quote-render.service.js";
import { ensureProfessionalTemplateLibrary } from "../services/template-library.service.js";
import { addIsoDays, istanbulDateIso } from "../utils/date.js";
const r = Router();
r.use(requireAuth);
const quoteView = requirePermission("quotes", "view"),
  quoteCreate = requirePermission("quotes", "create"),
  quoteEdit = requirePermission("quotes", "edit"),
  quoteArchive = requirePermission("quotes", "archive"),
  quoteExport = requirePermission("quotes", "export"),
  quoteApprove = requirePermission("approvals", "approve"),
  orderCreate = requirePermission("orders", "create");
const operationalOnly = requireAnyPermission([
  ["quotes", "create"],
  ["quotes", "edit"],
  ["quotes", "archive"],
  ["quotes", "export"],
  ["approvals", "approve"],
  ["orders", "create"]
]);
r.use((req, res, next) =>
  req.method === "GET" ? quoteView(req, res, next) : operationalOnly(req, res, next)
);
const today = () => istanbulDateIso();
const asObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const jsonValue = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
function quoteDefaults(tenantId) {
  const values = Object.fromEntries(
    db
      .prepare("SELECT key,value_json FROM app_settings WHERE tenant_id=?")
      .all(tenantId)
      .map((x) => [x.key, jsonValue(x.value_json, x.value_json)])
  );
  values.payment_terms_default = values.payment_terms_default || values.payment_default || "";
  values.delivery_terms_default = values.delivery_terms_default || values.delivery_default || "";
  values.warranty_terms_default = values.warranty_terms_default || values.warranty_default || "";
  const base = {
    payment_terms_default: "PEŞİN ÖDEME",
    delivery_terms_default: "SİPARİŞİ MÜTEAKİBEN 2-3 HAFTA",
    shipping_terms_default: "NAKLİYE ALICI FİRMAYA AİTTİR.",
    installation_terms_default: "KURULUM VE EĞİTİM FİYATIMIZA DAHİLDİR.",
    warranty_terms_default: "CİHAZLAR İMALAT HATALARINA KARŞI 2 YIL SÜRE İLE GARANTİLİDİR.",
    legal_terms_default: ""
  };
  const keys = [
      "payment_terms",
      "delivery_terms",
      "shipping_terms",
      "installation_terms",
      "warranty_terms",
      "legal_terms"
    ],
    histories = {};
  for (const k of keys)
    histories[k] = [
      ...new Set(
        [
          values[k + "_default"],
          ...(Array.isArray(values[k + "_history"]) ? values[k + "_history"] : []),
          base[k + "_default"]
        ]
          .map((x) => String(x || "").trim())
          .filter(Boolean)
      )
    ];
  return { values: { ...base, ...values }, histories };
}
function formData(req, row = null) {
  ensureProfessionalTemplateLibrary(req.tenantId);
  ensureOperationalSchema();
  const defaults = quoteDefaults(req.tenantId);
  const formInstanceId = String(row?.form_instance_id || id("qform")).slice(0, 100);
  const todayIso = today();
  return {
    row,
    formInstanceId,
    profiles: db
      .prepare(
        "SELECT * FROM profiles WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_active DESC,company_name"
      )
      .all(req.tenantId),
    templates: db
      .prepare(
        "SELECT * FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY is_default DESC,name"
      )
      .all(req.tenantId),
    today: todayIso,
    defaultValidUntil: addIsoDays(todayIso, 10),
    defaults: defaults.values,
    termHistories: defaults.histories
  };
}

const trCompare = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "tr-TR", { sensitivity: "base", numeric: true });
const quoteListSort = (v) =>
  ["recent", "customer-alpha", "quote-desc"].includes(String(v || "")) ? String(v) : "recent";
const quoteCustomerName = (row) =>
  String(asObject(jsonValue(row?.customer_snapshot_json, {})).company_name || "");
const activeQuoteWhere = "COALESCE(deleted_at,0)=0";
const quoteStatusList = [
  "DRAFT",
  "PREPARING",
  "SENT",
  "WAITING_CUSTOMER",
  "REVISION_REQUESTED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "ORDERED",
  "DELIVERED",
  "ARCHIVED"
];
const allProcessStatuses = quoteStatusList.filter((x) => x !== "ARCHIVED");
const allowedTransitions = {
  DRAFT: new Set(["PREPARING", "SENT", "WAITING_CUSTOMER", "REVISION_REQUESTED", "APPROVED", "ORDERED", "ARCHIVED", "REJECTED"]),
  PREPARING: new Set(["DRAFT", "SENT", "WAITING_CUSTOMER", "REVISION_REQUESTED", "APPROVED", "ORDERED", "REJECTED", "ARCHIVED"]),
  SENT: new Set([
    "WAITING_CUSTOMER",
    "REVISION_REQUESTED",
    "APPROVED",
    "ORDERED",
    "REJECTED",
    "EXPIRED",
    "ARCHIVED"
  ]),
  WAITING_CUSTOMER: new Set(["REVISION_REQUESTED", "APPROVED", "ORDERED", "REJECTED", "EXPIRED", "ARCHIVED"]),
  REVISION_REQUESTED: new Set(["PREPARING", "SENT", "APPROVED", "ORDERED", "REJECTED", "ARCHIVED"]),
  APPROVED: new Set(["ORDERED", "ARCHIVED"]),
  ORDERED: new Set(["DELIVERED", "ARCHIVED"]),
  DELIVERED: new Set(["ARCHIVED"]),
  REJECTED: new Set(["ARCHIVED", "REVISION_REQUESTED"]),
  EXPIRED: new Set(["REVISION_REQUESTED", "ORDERED", "ARCHIVED"]),
  ARCHIVED: new Set(["DRAFT"])
};
function assertTransition(from, to) {
  from = String(from || "DRAFT").toUpperCase();
  to = String(to || from).toUpperCase();
  if (from === to) return to;
  if (!quoteStatusList.includes(to))
    throw Object.assign(new Error(`Geçersiz durum: ${to}.`), { status: 422, expose: true });
  if (!allowedTransitions[from]?.has(to))
    throw Object.assign(new Error(`${from} durumundan ${to} durumuna doğrudan geçişe izin verilmiyor.`), {
      status: 422,
      expose: true
    });
  return to;
}
function nextStatusOptions(status) {
  const current = String(status || "DRAFT").toUpperCase();
  return [current, ...[...(allowedTransitions[current] || [])].filter((x) => x !== "ARCHIVED")];
}
function appSettingNumber(tenantId, key, d = 0) {
  const row = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
    .get(tenantId, key);
  try {
    const v = JSON.parse(row?.value_json || "0");
    return Number.isFinite(Number(v)) ? Number(v) : d;
  } catch {
    return d;
  }
}
function approvalReason(req, row) {
  const amountLimit = appSettingNumber(req.tenantId, "approval_amount_limit", 0),
    discountLimit = appSettingNumber(req.tenantId, "approval_discount_limit", 0);
  const gross = Number(row.subtotal || 0) + Number(row.discount_total || 0),
    discPct = gross > 0 ? (Number(row.discount_total || 0) / gross) * 100 : 0;
  const reasons = [];
  if (amountLimit > 0 && Number(row.grand_total || 0) >= amountLimit)
    reasons.push(`Teklif tutarı ${amountLimit} sınırını aşıyor`);
  if (discountLimit > 0 && discPct >= discountLimit)
    reasons.push(`İskonto oranı %${discountLimit} sınırını aşıyor`);
  return reasons.join(" · ");
}
function syncQuoteControls(req, row) {
  const reason = approvalReason(req, row);
  const current =
    db.prepare("SELECT approval_status FROM quotes WHERE tenant_id=? AND id=?").get(req.tenantId, row.id)
      ?.approval_status || "NOT_REQUIRED";
  let nextStatus = reason ? (current === "APPROVED" ? "APPROVED" : "PENDING") : "NOT_REQUIRED";
  db.prepare(
    "UPDATE quotes SET follow_up_date=?,follow_up_note=?,approval_status=?,approval_reason=?,approval_requested_at=CASE WHEN ?='PENDING' AND COALESCE(approval_requested_at,0)=0 THEN ? ELSE approval_requested_at END,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
  ).run(
    req.body.follow_up_date || null,
    String(req.body.follow_up_note || ""),
    nextStatus,
    reason,
    nextStatus,
    Date.now(),
    Date.now(),
    req.tenantId,
    row.id
  );
}
function ensureApprovalAllowed(row, target = "APPROVED") {
  if (
    ["APPROVED", "ORDERED"].includes(String(target || "").toUpperCase()) &&
    String(row.approval_status || "NOT_REQUIRED") === "PENDING"
  )
    throw Object.assign(
      new Error("Bu teklif yönetici onayı bekliyor. Onaylanmadan bu aşamaya geçirilemez."),
      { status: 422, expose: true }
    );
}

function emailLogsWhere(extra = "") {
  return `COALESCE(l.deleted_at,0)=0 ${extra ? ` AND ${extra}` : ""}`;
}
function revisionMailText(shareUrl) {
  return `Sn. Yetkili,\n\nİsteğiniz üzerine fiyat teklifimiz revize edilmiştir. Güncel teklifimize aşağıdaki güvenli bağlantı üzerinden ulaşabilirsiniz.\n\n${shareUrl}\n\nHer türlü teknik soru ve ek talepleriniz için memnuniyetle destek vermeye hazırız.\n\nİyi çalışmalar dileriz\nSaygılarımla...`;
}
function revisionSubject(row) {
  return `${quoteDisplayNo(row)} revize fiyat teklifimiz`;
}
async function createAndSendQuoteMail({
  req,
  row,
  to,
  cc = [],
  subject,
  body,
  mailType = "QUOTE",
  expiresDays = null
}) {
  ensureOperationalSchema();
  const templateSnapshot = ensureQuoteTemplateSnapshot(req.tenantId, row);
  const isEn = req.locale === "en",
    toList = parseEmailList(to, { required: true, label: isEn ? "To" : "Kime" }),
    ccList = parseEmailList(cc, { label: isEn ? "Cc" : "Bilgi" }),
    recipientText = emailListText(toList),
    ccText = emailListText(ccList);
  const rawToken = crypto.randomBytes(32).toString("base64url"),
    tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex"),
    now = Date.now(),
    tokenId = id("qtk"),
    logId = id("qsl");
  const expiry = String(expiresDays ?? "").trim(),
    days = expiry ? Math.min(90, Math.max(1, Number(expiry) || 14)) : null,
    expiresAt = days ? now + days * 86400000 : null;
  const shareUrl = publicUrl(`/q/${rawToken}${req.locale === "en" ? "?lang=en" : ""}`),
    finalSubject = String(
      subject || `${quoteDisplayNo(row)} ${isEn ? "price offer" : "fiyat teklifimiz"}`
    ).trim();
  let finalBody = buildQuoteEmail({ row, shareUrl, body });
  finalBody = String(finalBody).replace(/\{\{TEKLIF_LINKI\}\}/g, shareUrl);
  const storedShareUrl = publicUrl("/q/[REDACTED]"),
    storedBody = String(finalBody).split(shareUrl).join("[GÜVENLİ TEKLİF BAĞLANTISI]");
  // Eski kurulumlarda gönderim günlüğü şeması yarım kalmış olsa bile token oluşturmayı ikinci kez dener.
  let recordedLogId = logId,
    logWarning = "";
  try {
    db.transaction(() => {
      db.prepare(
        "INSERT INTO quote_send_logs(id,tenant_id,quote_id,recipient_email,cc_email,subject,body,share_url,share_url_secret,status,created_by,created_at,mail_type,template_snapshot_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).run(
        logId,
        req.tenantId,
        row.id,
        recipientText,
        ccText || null,
        finalSubject,
        storedBody,
        storedShareUrl,
        encryptSecret(shareUrl),
        "PENDING",
        req.user.id,
        now,
        mailType,
        templateSnapshot
      );
      db.prepare(
        "INSERT INTO quote_share_tokens(id,tenant_id,quote_id,token,token_hash,recipient_email,expires_at,is_active,created_by,created_at,send_log_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
      ).run(
        tokenId,
        req.tenantId,
        row.id,
        `sha256:${tokenHash}`,
        tokenHash,
        [...toList, ...ccList].join(", "),
        expiresAt,
        0,
        req.user.id,
        now,
        logId
      );
    })();
  } catch (logError) {
    console.error("[quote-mail] Gönderim günlüğü yazılamadı; token-only koruma deneniyor:", logError);
    ensureOperationalSchema();
    recordedLogId = null;
    logWarning = String(logError?.message || logError).slice(0, 500);
    db.prepare(
      "INSERT INTO quote_share_tokens(id,tenant_id,quote_id,token,token_hash,recipient_email,expires_at,is_active,created_by,created_at,send_log_id) VALUES(?,?,?,?,?,?,?,?,?,?,NULL)"
    ).run(
      tokenId,
      req.tenantId,
      row.id,
      `sha256:${tokenHash}`,
      tokenHash,
      [...toList, ...ccList].join(", "),
      expiresAt,
      0,
      req.user.id,
      now
    );
  }
  let info;
  try {
    info = await sendMail(req.tenantId, {
      to: toList,
      cc: ccList,
      subject: finalSubject,
      body: finalBody,
      shareUrl
    });
  } catch (sendErr) {
    try {
      db.transaction(() => {
        if (recordedLogId)
          db.prepare("UPDATE quote_send_logs SET status=?,error_message=? WHERE id=?").run(
            "FAILED",
            String(sendErr.message || sendErr).slice(0, 1000),
            recordedLogId
          );
        db.prepare("UPDATE quote_share_tokens SET is_active=0,revoked_at=? WHERE id=?").run(
          Date.now(),
          tokenId
        );
      })();
    } catch (logErr) {
      console.error("[quote-mail] Başarısız gönderim logu güncellenemedi:", logErr);
    }
    throw sendErr;
  }
  // SMTP başarılıysa günlük/audit sorunu kullanıcıya yanlış bir “e-posta gönderilemedi” uyarısı vermez.
  try {
    db.transaction(() => {
      if (recordedLogId)
        db.prepare("UPDATE quote_send_logs SET status=?,provider_message_id=?,sent_at=? WHERE id=?").run(
          "SENT",
          info.messageId || "",
          Date.now(),
          recordedLogId
        );
      db.prepare("UPDATE quote_share_tokens SET is_active=1,revoked_at=NULL WHERE id=?").run(tokenId);
    })();
  } catch (postSendError) {
    console.error("[quote-mail] E-posta gönderildi fakat gönderim günlüğü güncellenemedi:", postSendError);
    logWarning = [logWarning, String(postSendError?.message || postSendError).slice(0, 500)]
      .filter(Boolean)
      .join(" | ");
    // Bağlantının kullanılabilir kalması için aktivasyonu bağımsız olarak yeniden dene.
    try {
      ensureOperationalSchema();
      db.prepare("UPDATE quote_share_tokens SET is_active=1,revoked_at=NULL WHERE id=?").run(tokenId);
    } catch (activationError) {
      console.error("[quote-mail] Güvenli bağlantı aktivasyonu yeniden denenemedi:", activationError);
    }
  }
  return { ok: true, logId: recordedLogId, shareUrl, subject: finalSubject, expiresAt, logWarning };
}

function whatsappNumber(value) {
  const source = String(value || "").trim();
  let digits = source.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return /^\d{10,15}$/.test(digits) ? digits : "";
}

function quoteCustomerMobile(row) {
  const customer = asObject(row?.customer_snapshot) || asObject(jsonValue(row?.customer_snapshot_json, {}));
  return whatsappNumber(customer.mobile || customer.phone);
}

function createWhatsAppQuoteShare({ req, row, phone }) {
  ensureOperationalSchema();
  const templateSnapshot = ensureQuoteTemplateSnapshot(req.tenantId, row);
  const isEn = req.locale === "en";
  const rawToken = crypto.randomBytes(32).toString("base64url"),
    tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex"),
    now = Date.now(),
    tokenId = id("qtk"),
    logId = id("qsl");
  const shareUrl = publicUrl(`/q/${rawToken}${req.locale === "en" ? "?lang=en" : ""}`),
    displayNo = quoteDisplayNo(row),
    recipient = `WhatsApp: +${phone}`,
    subject = isEn ? `${displayNo} WhatsApp share` : `${displayNo} WhatsApp paylaşımı`;
  const body = isEn
    ? `${displayNo} proforma was shared via a secure WhatsApp link. [SECURE OFFER LINK]`
    : `${displayNo} numaralı proforma WhatsApp üzerinden güvenli bağlantı ile paylaşıldı. [GÜVENLİ TEKLİF BAĞLANTISI]`;
  let recordedLogId = logId,
    logWarning = "";
  try {
    db.transaction(() => {
      db.prepare(
        "INSERT INTO quote_send_logs(id,tenant_id,quote_id,recipient_email,cc_email,subject,body,share_url,share_url_secret,status,created_by,created_at,sent_at,mail_type,template_snapshot_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).run(
        logId,
        req.tenantId,
        row.id,
        recipient,
        null,
        subject,
        body,
        publicUrl("/q/[REDACTED]"),
        encryptSecret(shareUrl),
        "SENT",
        req.user.id,
        now,
        now,
        "WHATSAPP",
        templateSnapshot
      );
      db.prepare(
        "INSERT INTO quote_share_tokens(id,tenant_id,quote_id,token,token_hash,recipient_email,expires_at,is_active,created_by,created_at,send_log_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
      ).run(
        tokenId,
        req.tenantId,
        row.id,
        `sha256:${tokenHash}`,
        tokenHash,
        recipient,
        null,
        1,
        req.user.id,
        now,
        logId
      );
    })();
  } catch (logError) {
    // İletişim günlüğü onarılamasa bile geçerli teklif bağlantısını engelleme.
    console.error(
      "[quote-whatsapp] İletişim günlüğü yazılamadı; yalnız güvenli bağlantı oluşturuluyor:",
      logError
    );
    recordedLogId = null;
    logWarning = String(logError?.message || logError).slice(0, 500);
    ensureOperationalSchema();
    try {
      db.prepare(
        "INSERT INTO quote_share_tokens(id,tenant_id,quote_id,token,token_hash,recipient_email,expires_at,is_active,created_by,created_at,send_log_id) VALUES(?,?,?,?,?,?,?,?,?,?,NULL)"
      ).run(
        tokenId,
        req.tenantId,
        row.id,
        `sha256:${tokenHash}`,
        tokenHash,
        recipient,
        null,
        1,
        req.user.id,
        now
      );
    } catch (tokenError) {
      tokenError.cause = logError;
      throw tokenError;
    }
  }
  return { shareUrl, logId: recordedLogId, subject, logWarning };
}

function mailFailureText(error, locale = "tr") {
  const isEn = locale === "en";
  const code = String(error?.code || error?.responseCode || "").toUpperCase(),
    message = String(error?.message || "");
  if (error?.expose && Number(error?.status || 0) < 500) return message;
  if (code === "EAUTH" || code === "535" || /auth|authentication|username|password|login/i.test(message))
    return isEn
      ? "Email could not be sent: the SMTP username or password was rejected. Check and save the SMTP password again under Settings > Integrations."
      : "E-posta gönderilemedi: SMTP kullanıcı adı veya şifre kabul edilmedi. Ayarlar > Entegrasyonlar bölümündeki SMTP şifresini kontrol edip yeniden kaydedin.";
  if (
    ["ECONNECTION", "ECONNREFUSED", "ETIMEDOUT", "ESOCKET", "ENOTFOUND", "EAI_AGAIN"].includes(code) ||
    /connect|timeout|socket|network|dns/i.test(message)
  )
    return isEn
      ? "Email could not be sent: the SMTP server could not be reached. Check host, port and SSL/STARTTLS selection."
      : "E-posta gönderilemedi: SMTP sunucusuna bağlantı kurulamadı. Host, port ve SSL/STARTTLS seçimini kontrol edin.";
  if (code === "EENVELOPE" || code === "EADDRESS" || /recipient|envelope|mailbox|address/i.test(message))
    return isEn
      ? "Email could not be sent: at least one recipient was rejected by the SMTP server. Check the To and Cc addresses."
      : "E-posta gönderilemedi: Alıcı adreslerinden en az biri SMTP sunucusu tarafından reddedildi. Kime ve Bilgi adreslerini kontrol edin.";
  if (/certificate|self.signed|hostname|tls|ssl/i.test(message))
    return isEn
      ? "Email could not be sent: SMTP SSL/TLS certificate validation failed. Check the SMTP host name and security type."
      : "E-posta gönderilemedi: SMTP SSL/TLS sertifika doğrulaması başarısız. SMTP host adını ve güvenlik türünü kontrol edin.";
  if (/no such table|no such column|has no column|schema|SQLITE_ERROR/i.test(message))
    return isEn
      ? "Email could not be sent: the secure-link database schema could not be repaired. Restart the application with the new package and try again."
      : "E-posta gönderilemedi: güvenli bağlantı veritabanı şeması onarılamadı. Uygulamayı yeni paketle yeniden başlatın ve tekrar deneyin.";
  return isEn
    ? "Email could not be sent. The attempt was recorded as Failed; verify SMTP settings with Test Email and try again."
    : "E-posta gönderilemedi. Gönderim kaydı Başarısız olarak kaydedildi; SMTP ayarlarını Test E-postası ile doğrulayıp yeniden deneyin.";
}

function copyableShareUrl(log) {
  if (String(log?.status || "").toUpperCase() !== "SENT") return "";
  const candidate = decryptSecret(log?.share_url_secret || "");
  try {
    const actual = new URL(candidate),
      expected = new URL(config.publicBaseUrl);
    if (
      actual.origin !== expected.origin ||
      !actual.pathname.startsWith("/q/") ||
      actual.pathname.includes("[REDACTED]")
    )
      return "";
    return actual.toString();
  } catch {
    return "";
  }
}

const TERM_KEYS = [
  "payment_terms",
  "delivery_terms",
  "shipping_terms",
  "installation_terms",
  "warranty_terms",
  "legal_terms"
];
function termHistoryKey(k) {
  return k + "_history";
}
function cleanTermValue(v) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}
function readSettingJson(tenantId, key, fallback) {
  const row = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
    .get(tenantId, key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value_json);
  } catch {
    return fallback;
  }
}
function writeSettingJson(tenantId, key, value) {
  db.prepare(
    "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
  ).run(tenantId, key, JSON.stringify(value), Date.now());
}
function rememberTermHistories(tenantId, payload) {
  for (const key of TERM_KEYS) {
    const val = cleanTermValue(payload[key]);
    if (!val) continue;
    const settingKey = termHistoryKey(key);
    const existing = Array.isArray(readSettingJson(tenantId, settingKey, []))
      ? readSettingJson(tenantId, settingKey, [])
      : [];
    const next = [
      val,
      ...existing.filter((x) => cleanTermValue(x).toLowerCase() !== val.toLowerCase())
    ].slice(0, 30);
    writeSettingJson(tenantId, settingKey, next);
  }
}
function deleteTermHistory(tenantId, key, value) {
  if (!TERM_KEYS.includes(key))
    throw Object.assign(new Error("Geçersiz hazır metin alanı."), { status: 422, expose: true });
  const val = cleanTermValue(value).toLowerCase();
  const settingKey = termHistoryKey(key);
  const existing = Array.isArray(readSettingJson(tenantId, settingKey, []))
    ? readSettingJson(tenantId, settingKey, [])
    : [];
  writeSettingJson(
    tenantId,
    settingKey,
    existing.filter((x) => cleanTermValue(x).toLowerCase() !== val)
  );
}

r.get("/", (req, res) => {
  const status = String(req.query.status || ""),
    q = String(req.query.q || "").trim(),
    sort = quoteListSort(req.query.sort),
    showAll = String(req.query.show || "").toLowerCase() === "all",
    page = showAll ? 1 : Math.max(1, Number(req.query.page) || 1),
    limit = Math.min(100, Math.max(10, Number(req.query.limit) || 30)),
    off = (page - 1) * limit;
  const params = { t: req.tenantId, status, q: `%${q}%`, limit, off };
  const where = [
    activeQuoteWhere,
    status ? "status=@status" : "1=1",
    q
      ? "(quote_no LIKE @q OR order_no LIKE @q OR customer_snapshot_json LIKE @q OR subject LIKE @q OR project_name LIKE @q OR project_code LIKE @q)"
      : "1=1"
  ].join(" AND ");
  const order =
    sort === "customer-alpha"
      ? "json_extract(customer_snapshot_json,'$.company_name') COLLATE NOCASE ASC, created_at DESC"
      : sort === "quote-desc"
        ? "quote_no DESC, revision_no DESC"
        : "created_at DESC, updated_at DESC";
  const total = Number(
    db.prepare(`SELECT COUNT(*) AS n FROM quotes WHERE tenant_id=@t AND ${where}`).get(params).n || 0
  );
  const rows = showAll
    ? db.prepare(`SELECT * FROM quotes WHERE tenant_id=@t AND ${where} ORDER BY ${order}`).all(params)
    : db
        .prepare(
          `SELECT * FROM quotes WHERE tenant_id=@t AND ${where} ORDER BY ${order} LIMIT @limit OFFSET @off`
        )
        .all(params);
  res.render("quotes/index", {
    title: req.locale === "en" ? "Proformas & Offers" : "Proforma ve Teklifler",
    rows,
    total,
    status,
    q,
    sort,
    page,
    limit,
    showAll
  });
});
r.get("/new", quoteCreate, (req, res) =>
  res.render("quotes/form", { title: "Yeni Proforma Oluştur", ...formData(req, null) })
);
r.post("/term-history/delete", quoteEdit, (req, res) => {
  try {
    deleteTermHistory(req.tenantId, String(req.body.key || ""), String(req.body.value || ""));
    return res.json({ ok: true });
  } catch (e) {
    return res.status(e.status || 400).json({ ok: false, message: e.message || "Hazır metin silinemedi." });
  }
});

r.post("/preview-draft", quoteCreate, (req, res, next) => {
  try {
    const profile =
      db
        .prepare("SELECT * FROM profiles WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
        .get(req.tenantId, req.body.profile_id) ||
      db
        .prepare(
          "SELECT * FROM profiles WHERE tenant_id=? AND is_active=1 AND COALESCE(deleted_at,0)=0 LIMIT 1"
        )
        .get(req.tenantId);
    if (!profile)
      throw Object.assign(new Error("Aktif firma profili bulunamadı."), { status: 422, expose: true });
    let raw = [];
    try {
      raw = JSON.parse(req.body.items_json || "[]");
    } catch {
      raw = [];
    }
    const totals = calcQuote(Array.isArray(raw) ? raw : [], {
        type: req.body.quote_discount_type,
        value: req.body.quote_discount_value
      }),
      customer = customerSnapshotFromPayload(req.body, {});
    const row = {
      quote_no: "TEK-ÖNİZLEME",
      revision_no: 0,
      profile_id: profile.id,
      profile_snapshot: {
        ...profileSnapshot(profile),
        footer_address:
          req.body.footer_address ||
          profile.footer_address ||
          profile.delivery_address ||
          profile.billing_address ||
          profile.address ||
          "",
        footer_email: req.body.footer_email || profile.footer_email || profile.email || "",
        footer_phone: req.body.footer_phone || profile.footer_phone || profile.phone || profile.mobile || ""
      },
      customer_snapshot: customer,
      quote_date: req.body.quote_date || today(),
      valid_until: req.body.valid_until || today(),
      delivery_date: req.body.delivery_date || null,
      status: req.body.status || "DRAFT",
      payment_status: req.body.payment_status || "UNPAID",
      order_status: req.body.order_status || "NONE",
      production_status: req.body.production_status || "NOT_STARTED",
      currency: req.body.currency || "TRY",
      fx_rate: Number(req.body.fx_rate || 1),
      fx_source: req.body.fx_source || "TCMB",
      fx_date: req.body.fx_date || today(),
      subject: req.body.subject || "",
      description: req.body.description || "",
      project_name: req.body.project_name || "",
      project_code: req.body.project_code || "",
      payment_terms: req.body.payment_terms || "",
      delivery_terms: req.body.delivery_terms || "",
      shipping_terms: req.body.shipping_terms || "",
      installation_terms: req.body.installation_terms || "",
      warranty_terms: req.body.warranty_terms || "",
      legal_note: req.body.legal_note || "",
      extra_note: req.body.extra_note || "",
      template_key: req.body.template_key || "corporate-main",
      ...totals
    };
    res.setHeader("Cache-Control", "no-store");
    res.render(
      "quotes/print",
      quotePrintLocals({
        tenantId: req.tenantId,
        row,
        locale: req.locale,
        isPreview: true,
        autoPrint: false,
        embeddedPreview: true
      }),
      (err, html) => {
        if (err) return next(err);
        res.type("html").send(html);
      }
    );
  } catch (e) {
    next(e);
  }
});
const workflowSql = {
  all: "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 ORDER BY updated_at DESC",
  pending:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND status IN ('SENT','WAITING_CUSTOMER') ORDER BY updated_at DESC",
  approved:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND status='APPROVED' ORDER BY updated_at DESC",
  revision:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND status='REVISION_REQUESTED' ORDER BY updated_at DESC",
  ordered:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND (status='ORDERED' OR COALESCE(order_status,'NONE')<>'NONE') ORDER BY updated_at DESC",
  production:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND production_status IN ('PLANNED','STARTED','QUALITY_CONTROL') ORDER BY updated_at DESC",
  delivered:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND (status='DELIVERED' OR production_status='COMPLETED') ORDER BY updated_at DESC",
  rejected:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND status='REJECTED' ORDER BY updated_at DESC",
  payments:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND payment_status IN ('UNPAID','PARTIAL') AND (status='ORDERED' OR COALESCE(order_status,'NONE')<>'NONE') ORDER BY updated_at DESC",
  approvals:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND approval_status='PENDING' ORDER BY updated_at DESC",
  followups:
    "SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND follow_up_date IS NOT NULL AND follow_up_date<=date('now','+3 hours','+7 days') ORDER BY follow_up_date ASC"
};
const workflowKeys = Object.keys(workflowSql);
function allowedWorkflowKeys(req) {
  const allowed = new Set(["all", "pending", "approved", "revision", "rejected", "followups"]);
  if (hasPermission(req.user, "orders", "view"))
    ["ordered", "production", "delivered"].forEach((x) => allowed.add(x));
  if (hasPermission(req.user, "financials", "view")) allowed.add("payments");
  if (hasPermission(req.user, "approvals", "view") || hasPermission(req.user, "approvals", "approve"))
    allowed.add("approvals");
  return allowed;
}
r.get("/processes/stat/:key", (req, res) => {
  const key = String(req.params.key || ""),
    sql = workflowSql[key];
  if (!sql) return res.status(404).json({ error: "not_found" });
  if (!allowedWorkflowKeys(req).has(key)) return res.status(403).json({ error: "forbidden" });
  const limit = Math.max(10, Math.min(500, Number(req.query.limit) || 250));
  const rows = db.prepare(`${sql} LIMIT ?`).all(req.tenantId, limit);
  const total = Number(
    db.prepare(`SELECT COUNT(*) AS n FROM (${sql.replace(/ ORDER BY[\s\S]*$/, "")})`).get(req.tenantId)?.n ||
      0
  );
  res.setHeader("X-Total-Count", String(total));
  if (total > rows.length) res.setHeader("X-Result-Truncated", "1");
  if (!hasPermission(req.user, "financials", "view"))
    return res.json(
      rows.map(
        ({
          payment_status,
          paid_amount,
          payment_note,
          subtotal,
          discount_total,
          vat_total,
          grand_total,
          revision_old_total,
          revision_new_total,
          ...row
        }) => row
      )
    );
  return res.json(rows);
});
r.get("/processes", (req, res) => {
  const allowed = allowedWorkflowKeys(req),
    requested = String(req.query.flow || "all"),
    flow = workflowKeys.includes(requested) && allowed.has(requested) ? requested : "all";
  const count = (key) =>
    allowed.has(key)
      ? Number(
          db
            .prepare(`SELECT COUNT(*) AS n FROM (${workflowSql[key].replace(/ ORDER BY[\s\S]*$/, "")})`)
            .get(req.tenantId).n || 0
        )
      : 0;
  const stats = {
    pending: count("pending"),
    approved: count("approved"),
    revision: count("revision"),
    ordered: count("ordered"),
    production: count("production"),
    delivered: count("delivered"),
    rejected: count("rejected"),
    payments: count("payments"),
    approvals: count("approvals"),
    followups: count("followups")
  };
  const total = count(flow),
    showAll = String(req.query.show || "").toLowerCase() === "all",
    page = showAll ? 1 : Math.max(1, Number(req.query.page) || 1),
    limit = Math.max(10, Math.min(100, Number(req.query.limit) || 50)),
    offset = (page - 1) * limit;
  const rows = showAll
    ? db.prepare(workflowSql[flow]).all(req.tenantId)
    : db.prepare(`${workflowSql[flow]} LIMIT ? OFFSET ?`).all(req.tenantId, limit, offset);
  res.render("quotes/processes", {
    title: "Teklif ve Sipariş Süreçleri",
    rows,
    flow,
    stats,
    total,
    page,
    limit,
    showAll,
    q: "",
    allowedFlows: [...allowed],
    processCapabilities: {
      quoteCreate: hasPermission(req.user, "quotes", "create"),
      quoteEdit: hasPermission(req.user, "quotes", "edit"),
      quoteExport: hasPermission(req.user, "quotes", "export"),
      financials: hasPermission(req.user, "financials", "view"),
      orders: hasPermission(req.user, "orders", "view"),
      approvals:
        hasPermission(req.user, "approvals", "view") || hasPermission(req.user, "approvals", "approve")
    }
  });
});
r.get("/archives", quoteArchive, (req, res) => {
  const q = String(req.query.q || "").trim(),
    showAll = String(req.query.show || "").toLowerCase() === "all",
    page = showAll ? 1 : Math.max(1, Number(req.query.page) || 1),
    limit = Math.min(100, Math.max(10, Number(req.query.limit) || 30)),
    off = (page - 1) * limit;
  const params = { t: req.tenantId, q: `%${q}%`, limit, off };
  const where = [
    "COALESCE(deleted_at,0)<>0",
    "COALESCE(status,'')<>'ARCHIVE_HIDDEN'",
    q
      ? "(quote_no LIKE @q OR order_no LIKE @q OR customer_snapshot_json LIKE @q OR subject LIKE @q OR project_name LIKE @q OR project_code LIKE @q)"
      : "1=1"
  ].join(" AND ");
  const total = Number(
    db.prepare(`SELECT COUNT(*) n FROM quotes WHERE tenant_id=@t AND ${where}`).get(params).n || 0
  );
  const rows = showAll
    ? db
        .prepare(
          `SELECT * FROM quotes WHERE tenant_id=@t AND ${where} ORDER BY deleted_at DESC, updated_at DESC`
        )
        .all(params)
    : db
        .prepare(
          `SELECT * FROM quotes WHERE tenant_id=@t AND ${where} ORDER BY deleted_at DESC, updated_at DESC LIMIT @limit OFFSET @off`
        )
        .all(params);
  res.render("quotes/archives", { title: "Proforma Arşivleri", rows, total, q, page, limit, showAll });
});

r.get("/sent", quoteExport, (req, res) => {
  const q = String(req.query.q || "").trim(),
    filter = ["all", "read", "unread", "failed", "revision"].includes(String(req.query.filter || ""))
      ? String(req.query.filter)
      : "all",
    showAll = String(req.query.show || "").toLowerCase() === "all",
    page = showAll ? 1 : Math.max(1, Number(req.query.page) || 1),
    limit = Math.max(10, Math.min(100, Number(req.query.limit) || 40)),
    off = (page - 1) * limit;
  const params = { t: req.tenantId, q: `%${q}%`, limit, off };
  const filters = [emailLogsWhere("COALESCE(q.deleted_at,0)=0")];
  if (q)
    filters.push(
      "(q.quote_no LIKE @q OR l.recipient_email LIKE @q OR l.subject LIKE @q OR q.customer_snapshot_json LIKE @q)"
    );
  if (filter === "read")
    filters.push("EXISTS(SELECT 1 FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW')");
  if (filter === "unread")
    filters.push("UPPER(l.status)='SENT' AND NOT EXISTS(SELECT 1 FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW')");
  if (filter === "failed") filters.push("UPPER(l.status)='FAILED'");
  if (filter === "revision")
    filters.push(
      "(UPPER(q.status)='REVISION_REQUESTED' OR COALESCE(q.revision_no,0)>0 OR UPPER(COALESCE(l.mail_type,''))='REVISION')"
    );
  const where = filters.join(" AND ");
  const total = Number(
    db
      .prepare(
        `SELECT COUNT(*) n FROM quote_send_logs l JOIN quotes q ON q.tenant_id=l.tenant_id AND q.id=l.quote_id WHERE l.tenant_id=@t AND ${where}`
      )
      .get(params)?.n || 0
  );
  const base = `SELECT l.*,q.quote_no,q.revision_no,q.status AS quote_status,q.customer_id,q.customer_snapshot_json,q.currency,q.grand_total,q.updated_at AS quote_updated_at,
    (SELECT COUNT(*) FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') AS verified_view_count,
    (SELECT MIN(v.created_at) FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') AS verified_first_viewed_at,
    (SELECT MAX(v.created_at) FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') AS verified_last_viewed_at
    FROM quote_send_logs l JOIN quotes q ON q.tenant_id=l.tenant_id AND q.id=l.quote_id WHERE l.tenant_id=@t AND ${where}
    ORDER BY CASE WHEN verified_last_viewed_at IS NULL THEN 1 ELSE 0 END ASC, verified_last_viewed_at DESC, l.created_at DESC`;
  const rows = showAll
    ? db.prepare(base).all(params)
    : db.prepare(`${base} LIMIT @limit OFFSET @off`).all(params);
  const viewEventsByLog = new Map();
  if (rows.length) {
    const ids = rows.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(",");
    const events = db
      .prepare(
        `SELECT send_log_id,created_at FROM quote_view_events
         WHERE tenant_id=? AND COALESCE(event_type,'HUMAN_VIEW')='HUMAN_VIEW'
           AND send_log_id IN (${placeholders}) ORDER BY created_at DESC,id DESC`
      )
      .all(req.tenantId, ...ids);
    for (const event of events) {
      if (!viewEventsByLog.has(event.send_log_id)) viewEventsByLog.set(event.send_log_id, []);
      viewEventsByLog.get(event.send_log_id).push(Number(event.created_at || 0));
    }
  }
  for (const row of rows) row.view_events = viewEventsByLog.get(row.id) || [];
  const statWhere = emailLogsWhere("COALESCE(q.deleted_at,0)=0");
  const stats = db
    .prepare(
      `SELECT COUNT(*) total,
       SUM(CASE WHEN UPPER(l.status)='SENT' THEN 1 ELSE 0 END) sent,
       SUM(CASE WHEN UPPER(l.status)='FAILED' THEN 1 ELSE 0 END) failed,
       SUM(CASE WHEN EXISTS(SELECT 1 FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') THEN 1 ELSE 0 END) read_count,
       SUM(CASE WHEN UPPER(l.status)='SENT' AND NOT EXISTS(SELECT 1 FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') THEN 1 ELSE 0 END) unread_count
       FROM quote_send_logs l JOIN quotes q ON q.tenant_id=l.tenant_id AND q.id=l.quote_id WHERE l.tenant_id=? AND ${statWhere}`
    )
    .get(req.tenantId);
  res.render("quotes/sent", {
    title: "Gönderilen Proformalar",
    rows,
    stats,
    total,
    q,
    filter,
    page,
    limit,
    showAll
  });
});
r.post("/sent/:logId/archive", quoteArchive, (req, res) => {
  const old = db
    .prepare("SELECT * FROM quote_send_logs WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.logId);
  if (!old) throw Object.assign(new Error("Gönderim kaydı bulunamadı."), { status: 404, expose: true });
  db.prepare("UPDATE quote_send_logs SET deleted_at=?,deleted_by=? WHERE tenant_id=? AND id=?").run(
    Date.now(),
    req.user.id,
    req.tenantId,
    req.params.logId
  );
  audit(req, { action: "QUOTE_SEND_LOG_ARCHIVE", module: "QUOTES", entityId: old.quote_id, oldValue: old });
  flash(req, "success", "Gönderim kaydı takip listesinden kaldırıldı. Ana proforma kaydı silinmedi.");
  res.redirect("/quotes/sent");
});
r.post("/sent/:logId/revision-mail", quoteExport, async (req, res) => {
  try {
    const old = db
      .prepare(
        "SELECT l.*,q.quote_no,q.revision_no,q.status AS quote_status FROM quote_send_logs l JOIN quotes q ON q.tenant_id=l.tenant_id AND q.id=l.quote_id WHERE l.tenant_id=? AND l.id=? AND COALESCE(l.deleted_at,0)=0 AND COALESCE(q.deleted_at,0)=0"
      )
      .get(req.tenantId, req.params.logId);
    if (!old) throw Object.assign(new Error("Gönderim kaydı bulunamadı."), { status: 404, expose: true });
    const row = loadQuote(req.tenantId, old.quote_id),
      to = parseEmailList(old.recipient_email, { required: true, label: "Kime" }),
      cc = parseEmailList(old.cc_email, { label: "Bilgi" });
    const result = await createAndSendQuoteMail({
      req,
      row,
      to,
      cc,
      subject: revisionSubject(row),
      body: revisionMailText("{{TEKLIF_LINKI}}"),
      mailType: "REVISION"
    });
    audit(req, {
      action: "QUOTE_REVISION_EMAIL_SENT",
      module: "QUOTES",
      entityId: row.id,
      newValue: {
        to: emailListText(to),
        cc: emailListText(cc),
        shareTokenId: result.logId,
        expiresAt: result.expiresAt
      }
    });
    flash(req, "success", "Revizyon bilgilendirme e-postası müşteriye gönderildi.");
    res.redirect("/quotes/sent?filter=revision");
  } catch (e) {
    console.error("[quote-mail] Revizyon e-postası gönderilemedi:", e);
    flash(req, "error", mailFailureText(e, req.locale));
    res.redirect(303, "/quotes/sent?filter=revision");
  }
});

r.post("/archives/bulk-hide", quoteArchive, (req, res) => {
  const ids = [].concat(req.body.ids || []).filter(Boolean);
  if (!ids.length) {
    flash(req, "error", "İşlem için proforma seçilmedi.");
    return res.redirect("/quotes/archives");
  }
  const old = db.prepare(
    "SELECT id,quote_no,revision_no FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0"
  ).get;
  const upd = db.prepare(
    "UPDATE quotes SET status='ARCHIVE_HIDDEN',updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0"
  );
  let count = 0;
  db.transaction(() => {
    for (const x of ids) {
      const row = old(req.tenantId, x);
      if (row) {
        upd.run(Date.now(), req.tenantId, x);
        audit(req, {
          action: "QUOTE_ARCHIVE_HIDE",
          module: "QUOTES",
          entityId: x,
          oldValue: row,
          newValue: { status: "ARCHIVE_HIDDEN" }
        });
        count++;
      }
    }
  })();
  flash(req, "success", `${count} arşiv kaydı listeden kaldırıldı. Ana kayıt veritabanında korunur.`);
  res.redirect("/quotes/archives");
});
r.post("/:id/archive-hide", quoteArchive, (req, res) => {
  const old = db
    .prepare("SELECT * FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0")
    .get(req.tenantId, req.params.id);
  if (!old) throw Object.assign(new Error("Arşiv kaydı bulunamadı."), { status: 404, expose: true });
  db.prepare("UPDATE quotes SET status='ARCHIVE_HIDDEN',updated_at=? WHERE tenant_id=? AND id=?").run(
    Date.now(),
    req.tenantId,
    req.params.id
  );
  audit(req, {
    action: "QUOTE_ARCHIVE_HIDE",
    module: "QUOTES",
    entityId: req.params.id,
    oldValue: old,
    newValue: { status: "ARCHIVE_HIDDEN" }
  });
  flash(req, "success", "Arşiv kaydı listeden kaldırıldı. Ana proforma veritabanında korunur.");
  res.redirect("/quotes/archives");
});

r.post("/:id/restore", quoteArchive, (req, res) => {
  const old = db
    .prepare("SELECT * FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)<>0")
    .get(req.tenantId, req.params.id);
  if (!old) throw Object.assign(new Error("Arşiv kaydı bulunamadı."), { status: 404, expose: true });
  const restoredStatus =
    String(old.order_status || "NONE").toUpperCase() !== "NONE" &&
    String(old.order_status || "NONE").toUpperCase() !== "ORDER_CANCELLED"
      ? "ORDERED"
      : "DRAFT";
  db.prepare(
    "UPDATE quotes SET status=?,deleted_at=NULL,deleted_by=NULL,updated_at=? WHERE tenant_id=? AND id=?"
  ).run(restoredStatus, Date.now(), req.tenantId, req.params.id);
  audit(req, {
    action: "QUOTE_RESTORE",
    module: "QUOTES",
    entityId: req.params.id,
    oldValue: old,
    newValue: { status: restoredStatus }
  });
  flash(req, "success", "Proforma arşivden çıkarıldı ve listeye geri alındı.");
  res.redirect(`/quotes/${req.params.id}`);
});

r.get("/:id/edit", quoteEdit, (req, res) => {
  const row = loadQuote(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Proforma bulunamadı."), { status: 404 });
  res.render("quotes/form", { title: `${row.quote_no} Düzenle`, ...formData(req, row) });
});
r.post(
  "/save",
  requireAnyPermission([
    ["quotes", "create"],
    ["quotes", "edit"]
  ]),
  (req, res, next) => {
    try {
      ensureOperationalSchema();
      const formInstanceId = String(req.body.form_instance_id || "")
        .trim()
        .slice(0, 100);
      const postedId = String(req.body.id || "").trim();
      const originalId = String(req.body.original_quote_id || "").trim();
      if (postedId && originalId && postedId !== originalId)
        throw Object.assign(new Error("Proforma kimliği doğrulanamadı. Sayfayı yenileyip yeniden deneyin."), {
          status: 409,
          expose: true
        });
      let resolvedId = postedId || originalId || null;
      // Aynı form örneği ikinci kez gönderilirse yeni numara üretmek yerine ilk kaydı günceller.
      if (!resolvedId && formInstanceId) {
        const prior = db
          .prepare(
            "SELECT id FROM quotes WHERE tenant_id=? AND form_instance_id=? AND COALESCE(deleted_at,0)=0 LIMIT 1"
          )
          .get(req.tenantId, formInstanceId);
        resolvedId = prior?.id || null;
      }
      const editing = Boolean(resolvedId);
      if (editing && !hasPermission(req.user, "quotes", "edit"))
        throw Object.assign(new Error("Mevcut proformayı düzenleme yetkiniz yok."), {
          status: 403,
          expose: true
        });
      if (!editing && !hasPermission(req.user, "quotes", "create"))
        throw Object.assign(new Error("Yeni proforma oluşturma yetkiniz yok."), {
          status: 403,
          expose: true
        });
      const payload = {
        ...req.body,
        form_instance_id: formInstanceId,
        items: JSON.parse(req.body.items_json || "[]")
      };
      rememberTermHistories(req.tenantId, payload);
      let quote;
      try {
        quote = saveQuote({ tenantId: req.tenantId, userId: req.user.id, quoteId: resolvedId, payload });
      } catch (error) {
        // Eşzamanlı iki kaydetme isteği aynı form anahtarıyla yarışırsa mevcut kaydı güvenle güncelle.
        if (!resolvedId && formInstanceId && /UNIQUE|constraint/i.test(String(error?.message || ""))) {
          const prior = db
            .prepare(
              "SELECT id FROM quotes WHERE tenant_id=? AND form_instance_id=? AND COALESCE(deleted_at,0)=0 LIMIT 1"
            )
            .get(req.tenantId, formInstanceId);
          if (prior?.id) {
            resolvedId = prior.id;
            quote = saveQuote({ tenantId: req.tenantId, userId: req.user.id, quoteId: resolvedId, payload });
          } else throw error;
        } else throw error;
      }
      syncQuoteControls(req, quote);
      audit(req, {
        action: editing || resolvedId ? "QUOTE_UPDATE" : "QUOTE_CREATE",
        module: "QUOTES",
        entityId: quote.id,
        newValue: {
          quote_no: quote.quote_no,
          revision_no: quote.revision_no,
          total: quote.grand_total,
          form_instance_id: formInstanceId
        }
      });
      const updated = editing || Boolean(resolvedId && postedId !== ""),
        message = updated ? "Proforma güncellendi." : "Proforma kaydedildi.";
      flash(req, "success", message);
      const json = req.get("accept")?.includes("application/json") || req.body._ajax === "1";
      if (json)
        return res.json({
          ok: true,
          message,
          redirect: `/quotes/${quote.id}`,
          id: quote.id,
          quote_no: quote.quote_no,
          updated,
          clearDraft: true,
          formInstanceId
        });
      res.redirect(`/quotes/${quote.id}`);
    } catch (e) {
      if (req.get("accept")?.includes("application/json") || req.body?._ajax === "1")
        return res
          .status(e.status || 400)
          .json({ ok: false, message: e.message || "Proforma kaydedilemedi." });
      next(e);
    }
  }
);
r.get("/:id", (req, res) => {
  const row = loadQuote(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Proforma bulunamadı."), { status: 404 });
  res.render("quotes/show", { title: row.quote_no, row, allowedNextStatuses: nextStatusOptions(row.status) });
});
r.get("/:id/preview", quoteExport, (req, res, next) => {
  try {
    const row = loadQuote(req.tenantId, req.params.id, { includeArchived: true });
    if (!row) throw Object.assign(new Error("Proforma bulunamadı."), { status: 404, expose: true });
    res.setHeader("Cache-Control", "no-store");
    res.render(
      "quotes/print",
      quotePrintLocals({
        tenantId: req.tenantId,
        row,
        locale: req.locale,
        isPreview: true,
        autoPrint: false,
        embeddedPreview: true
      })
    );
  } catch (error) {
    next(error);
  }
});
r.get("/:id/print", quoteExport, (req, res, next) => {
  try {
    const row = loadQuote(req.tenantId, req.params.id, { includeArchived: true });
    if (!row) throw Object.assign(new Error("Proforma bulunamadı."), { status: 404, expose: true });
    res.setHeader("Cache-Control", "no-store");
    res.render(
      "quotes/print",
      quotePrintLocals({
        tenantId: req.tenantId,
        row,
        locale: req.locale,
        isPreview: false,
        autoPrint: req.query.auto === "1"
      })
    );
  } catch (error) {
    next(error);
  }
});
r.post("/:id/revision", quoteEdit, (req, res) => {
  const row = createRevision(req.tenantId, req.user.id, req.params.id);
  audit(req, {
    action: "QUOTE_REVISION",
    module: "QUOTES",
    entityId: row.id,
    newValue: { quote_no: row.quote_no, revision_no: row.revision_no }
  });
  flash(req, "success", `Revizyon oluşturuldu: Rev ${row.revision_no}`);
  res.redirect(`/quotes/${row.id}/edit`);
});
r.post("/:id/status", quoteEdit, (req, res) => {
  const old = db
    .prepare("SELECT * FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!old)
    throw Object.assign(new Error("Proforma bulunamadı veya arşivlenmiş."), { status: 404, expose: true });
  const nextStatus = assertTransition(old.status, req.body.status || old.status);
  if (nextStatus === "ARCHIVED" && !hasPermission(req.user, "quotes", "archive"))
    throw Object.assign(new Error("Arşivleme yetkiniz yok."), { status: 403, expose: true });
  if (nextStatus === "APPROVED" && !hasPermission(req.user, "approvals", "approve"))
    throw Object.assign(new Error("Onay yetkiniz yok."), { status: 403, expose: true });
  if (nextStatus === "ORDERED" && !hasPermission(req.user, "orders", "create"))
    throw Object.assign(new Error("Sipariş oluşturma yetkiniz yok."), { status: 403, expose: true });
  ensureApprovalAllowed(old, nextStatus);
  let nextOrderStatus = hasPermission(req.user, "orders", "edit")
    ? req.body.order_status || old.order_status || "NONE"
    : old.order_status || "NONE";
  if (nextStatus === "ORDERED" && (!nextOrderStatus || nextOrderStatus === "NONE"))
    nextOrderStatus = "ORDER_RECEIVED";
  const deletedAt = nextStatus === "ARCHIVED" ? Date.now() : old.deleted_at;
  const deletedBy = nextStatus === "ARCHIVED" ? req.user.id : old.deleted_by;
  db.prepare(
    "UPDATE quotes SET status=?,payment_status=?,order_status=?,production_status=?,paid_amount=?,payment_note=?,deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
  ).run(
    nextStatus,
    hasPermission(req.user, "financials", "edit")
      ? req.body.payment_status || old.payment_status
      : old.payment_status,
    nextOrderStatus,
    hasPermission(req.user, "orders", "edit")
      ? req.body.production_status || old.production_status
      : old.production_status,
    hasPermission(req.user, "financials", "edit")
      ? Number(req.body.paid_amount || old.paid_amount || 0)
      : Number(old.paid_amount || 0),
    hasPermission(req.user, "financials", "edit")
      ? String(req.body.payment_note || old.payment_note || "")
      : String(old.payment_note || ""),
    deletedAt,
    deletedBy,
    Date.now(),
    req.tenantId,
    req.params.id
  );
  audit(req, {
    action: "QUOTE_STATUS",
    module: "QUOTES",
    entityId: req.params.id,
    oldValue: old,
    newValue: req.body
  });
  const statusMsg =
    nextStatus === "ARCHIVED"
      ? "Proforma arşivlendi."
      : nextOrderStatus === "ORDER_CANCELLED"
        ? "Sipariş iptal edildi."
        : nextStatus === "ORDERED"
          ? "Proforma siparişe dönüştürüldü."
          : "Proforma durumu güncellendi.";
  flash(req, "success", statusMsg);
  res.redirect(nextStatus === "ARCHIVED" ? "/quotes" : `/quotes/${req.params.id}`);
});
r.post("/:id/order", orderCreate, (req, res) => {
  const old = db
    .prepare("SELECT * FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!old)
    throw Object.assign(new Error("Proforma bulunamadı veya arşivlenmiş."), { status: 404, expose: true });
  const current = String(old.status || "DRAFT").toUpperCase();
  if (["ARCHIVED", "REJECTED", "DELIVERED"].includes(current))
    throw Object.assign(
      new Error(`Bu durumdaki proforma siparişe dönüştürülemez: ${current}. Önce uygun süreç adımına alın.`),
      { status: 422, expose: true }
    );
  if (current !== "ORDERED") assertTransition(current, "ORDERED");
  ensureApprovalAllowed(old, "ORDERED");
  const orderNo = old.order_no || nextOrderNo(req.tenantId);
  db.prepare(
    "UPDATE quotes SET status='ORDERED',order_status='ORDER_RECEIVED',order_no=?,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
  ).run(orderNo, Date.now(), req.tenantId, req.params.id);
  audit(req, {
    action: "QUOTE_TO_ORDER",
    module: "QUOTES",
    entityId: req.params.id,
    newValue: { orderNo, fromStatus: current, toStatus: "ORDERED" }
  });
  flash(req, "success", `Sipariş kaydı oluşturuldu: ${orderNo}`);
  res.redirect(`/quotes/${req.params.id}`);
});

r.post("/:id/approval", quoteApprove, (req, res) => {
  const old = db
    .prepare("SELECT * FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!old) throw Object.assign(new Error("Proforma bulunamadı."), { status: 404, expose: true });
  if (old.created_by === req.user.id)
    throw Object.assign(
      new Error("Dört göz kuralı gereği teklifi hazırlayan kullanıcı kendi teklifini onaylayamaz."),
      { status: 403, expose: true }
    );
  const decision =
    String(req.body.decision || "APPROVED").toUpperCase() === "REJECTED" ? "REJECTED" : "APPROVED";
  db.prepare(
    "UPDATE quotes SET approval_status=?,approval_decided_at=?,approval_decided_by=?,approval_reason=COALESCE(NULLIF(?,''),NULLIF(approval_reason,''),'Yönetici kararı'),updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
  ).run(
    decision,
    Date.now(),
    req.user.id,
    String(req.body.note || ""),
    Date.now(),
    req.tenantId,
    req.params.id
  );
  audit(req, {
    action: "QUOTE_APPROVAL_" + decision,
    module: "QUOTES",
    entityId: req.params.id,
    oldValue: old,
    newValue: { decision, note: req.body.note || "" }
  });
  flash(
    req,
    decision === "APPROVED" ? "success" : "error",
    decision === "APPROVED" ? "Teklif onaylandı." : "Teklif onayı reddedildi."
  );
  res.redirect("/quotes/" + req.params.id);
});
r.post("/:id/follow-up", quoteEdit, (req, res) => {
  const old = db
    .prepare("SELECT * FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.id);
  if (!old) throw Object.assign(new Error("Proforma bulunamadı."), { status: 404, expose: true });
  db.prepare(
    "UPDATE quotes SET follow_up_date=?,follow_up_note=?,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
  ).run(
    req.body.follow_up_date || null,
    String(req.body.follow_up_note || ""),
    Date.now(),
    req.tenantId,
    req.params.id
  );
  audit(req, {
    action: "QUOTE_FOLLOWUP_UPDATE",
    module: "QUOTES",
    entityId: req.params.id,
    newValue: { follow_up_date: req.body.follow_up_date, follow_up_note: req.body.follow_up_note }
  });
  flash(req, "success", "Takip bilgisi güncellendi.");
  res.redirect("/quotes/" + req.params.id);
});

r.post("/email-logs/:logId/archive", quoteArchive, (req, res) => {
  const old = db
    .prepare("SELECT * FROM quote_send_logs WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
    .get(req.tenantId, req.params.logId);
  if (!old) throw Object.assign(new Error("Gönderim kaydı bulunamadı."), { status: 404, expose: true });
  db.prepare("UPDATE quote_send_logs SET deleted_at=?,deleted_by=? WHERE tenant_id=? AND id=?").run(
    Date.now(),
    req.user.id,
    req.tenantId,
    req.params.logId
  );
  audit(req, { action: "QUOTE_SEND_LOG_ARCHIVE", module: "QUOTES", entityId: old.quote_id, oldValue: old });
  flash(req, "success", "Gönderim kaydı listeden kaldırıldı. Ana proforma kaydı silinmedi.");
  res.redirect(req.get("referer") || `/quotes/${old.quote_id}/email`);
});
r.post("/email-logs/bulk-archive", quoteArchive, (req, res) => {
  const ids = [].concat(req.body.ids || []).filter(Boolean);
  if (!ids.length) {
    flash(req, "error", "Silmek için kayıt seçilmedi.");
    return res.redirect(req.get("referer") || "/quotes/sent");
  }
  const now = Date.now(),
    upd = db.prepare(
      "UPDATE quote_send_logs SET deleted_at=?,deleted_by=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
    );
  db.transaction(() => ids.forEach((x) => upd.run(now, req.user.id, req.tenantId, x)))();
  audit(req, { action: "QUOTE_SEND_LOG_BULK_ARCHIVE", module: "QUOTES", newValue: { count: ids.length } });
  flash(req, "success", `${ids.length} gönderim kaydı listeden kaldırıldı. Ana proformalar silinmedi.`);
  res.redirect(req.get("referer") || "/quotes/sent");
});

r.get("/:id/email", quoteExport, (req, res) => {
  const row = loadQuote(req.tenantId, req.params.id);
  if (!row)
    throw Object.assign(new Error(req.locale === "en" ? "Proforma not found." : "Proforma bulunamadı."), {
      status: 404,
      expose: true
    });
  const logs = db
    .prepare(
      `SELECT l.*,
       (SELECT COUNT(*) FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') AS verified_view_count,
       (SELECT MIN(v.created_at) FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') AS verified_first_viewed_at,
       (SELECT MAX(v.created_at) FROM quote_view_events v WHERE v.tenant_id=l.tenant_id AND v.send_log_id=l.id AND COALESCE(v.event_type,'HUMAN_VIEW')='HUMAN_VIEW') AS verified_last_viewed_at
       FROM quote_send_logs l WHERE l.tenant_id=? AND l.quote_id=? AND COALESCE(l.deleted_at,0)=0 ORDER BY l.created_at DESC LIMIT 30`
    )
    .all(req.tenantId, row.id)
    .map((log) => ({ ...log, copy_url: copyableShareUrl(log), view_events: [] }));
  if (logs.length) {
    const ids = logs.map((log) => log.id);
    const placeholders = ids.map(() => "?").join(",");
    const events = db
      .prepare(
        `SELECT send_log_id,created_at FROM quote_view_events WHERE tenant_id=?
         AND COALESCE(event_type,'HUMAN_VIEW')='HUMAN_VIEW' AND send_log_id IN (${placeholders})
         ORDER BY created_at ASC,id ASC`
      )
      .all(req.tenantId, ...ids);
    const byLog = new Map();
    for (const event of events) {
      if (!byLog.has(event.send_log_id)) byLog.set(event.send_log_id, []);
      byLog.get(event.send_log_id).push(Number(event.created_at || 0));
    }
    for (const log of logs) log.view_events = byLog.get(log.id) || [];
  }
  res.render("quotes/email", {
    title: req.locale === "en" ? "Send Proforma by Email" : "Proforma E-posta Gönder",
    row,
    logs,
    mode: String(req.query.mode || "")
  });
});
r.post("/:id/email", quoteExport, async (req, res) => {
  try {
    const row = loadQuote(req.tenantId, req.params.id);
    if (!row)
      throw Object.assign(new Error(req.locale === "en" ? "Proforma not found." : "Proforma bulunamadı."), {
        status: 404,
        expose: true
      });
    const to = parseEmailList(req.body.to, { required: true, label: req.locale === "en" ? "To" : "Kime" }),
      cc = parseEmailList(req.body.cc, { label: req.locale === "en" ? "Cc" : "Bilgi" }),
      subject = String(
        req.body.subject ||
          `${quoteDisplayNo(row)} ${req.locale === "en" ? "price offer" : "fiyat teklifimiz"}`
      ).trim();
    const mailType =
      String(req.body.mail_type || "QUOTE").toUpperCase() === "REVISION" ? "REVISION" : "QUOTE";
    const result = await createAndSendQuoteMail({
      req,
      row,
      to,
      cc,
      subject,
      body: req.body.body,
      mailType,
      expiresDays: req.body.expires_days
    });
    try {
      audit(req, {
        action: mailType === "REVISION" ? "QUOTE_REVISION_EMAIL_SENT" : "QUOTE_EMAIL_SENT",
        module: "QUOTES",
        entityId: row.id,
        newValue: {
          to: emailListText(to),
          cc: emailListText(cc),
          subject,
          shareTokenId: result.logId || null,
          expiresAt: result.expiresAt,
          logWarning: result.logWarning || ""
        }
      });
    } catch (auditError) {
      console.error("[quote-mail] Audit kaydı başarılı gönderimi engellemeden atlandı:", auditError);
    }
    flash(
      req,
      "success",
      req.locale === "en"
        ? mailType === "REVISION"
          ? "Revision notification email was sent."
          : "The proforma was emailed and view tracking was started."
        : mailType === "REVISION"
          ? "Revizyon bilgilendirme e-postası gönderildi."
          : "Proforma e-posta ile gönderilmiştir. Gönderilen Proformalar listesine kaydedildi ve gerçek görüntülenme takibi başlatıldı."
    );
    res.redirect(303, "/quotes/sent");
  } catch (e) {
    console.error("[quote-mail] Proforma e-postası gönderilemedi:", e);
    flash(req, "error", mailFailureText(e, req.locale));
    res.redirect(303, `/quotes/${encodeURIComponent(req.params.id)}/email`);
  }
});
r.post("/:id/whatsapp", quoteExport, (req, res) => {
  try {
    const row = loadQuote(req.tenantId, req.params.id);
    if (!row)
      throw Object.assign(new Error(req.locale === "en" ? "Proforma not found." : "Proforma bulunamadı."), {
        status: 404,
        expose: true
      });
    const phone = quoteCustomerMobile(row);
    if (!phone)
      throw Object.assign(
        new Error(
          req.locale === "en"
            ? "The customer record has no valid mobile number. Save the number with its country code and try again."
            : "Müşteri kartında geçerli bir cep telefonu yok. Cep telefonunu ülke koduyla kaydedip yeniden deneyin."
        ),
        { status: 422, expose: true }
      );
    const result = createWhatsAppQuoteShare({ req, row, phone });
    const message =
      req.locale === "en"
        ? `Hello,\n\nYou can access our price offer ${quoteDisplayNo(row)} through the secure link below:\n${result.shareUrl}\n\nBest regards.`
        : `Merhaba,\n\n${quoteDisplayNo(row)} numaralı fiyat teklifimize aşağıdaki güvenli bağlantıdan ulaşabilirsiniz:\n${result.shareUrl}\n\nİyi çalışmalar dileriz.`;
    try {
      audit(req, {
        action: "QUOTE_WHATSAPP_SHARE_CREATED",
        module: "QUOTES",
        entityId: row.id,
        newValue: {
          recipient: `+${phone}`,
          shareTokenId: result.logId || null,
          logWarning: result.logWarning || ""
        }
      });
    } catch (auditError) {
      console.error("[quote-whatsapp] Audit kaydı paylaşımı engellemeden atlandı:", auditError);
    }
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    if (
      req.accepts(["json", "html"]) === "json" ||
      String(req.get("x-requested-with") || "").toLowerCase() === "fetch"
    )
      return res.json({ ok: true, url: whatsappUrl });
    return res.redirect(303, whatsappUrl);
  } catch (e) {
    console.error("[quote-whatsapp] Paylaşım bağlantısı oluşturulamadı:", e);
    const message = e?.expose
      ? e.message
      : req.locale === "en"
        ? "WhatsApp share link could not be created. Please try again."
        : "WhatsApp paylaşım bağlantısı oluşturulamadı. Lütfen yeniden deneyin.";
    const wantsJson =
      req.accepts(["json", "html"]) === "json" ||
      String(req.get("x-requested-with") || "").toLowerCase() === "fetch";
    if (wantsJson) return res.status(Number(e?.status) || 500).json({ ok: false, message });
    flash(req, "error", message);
    const target = String(req.body.return_to || "");
    const safeTarget =
      target === `/quotes/${req.params.id}/email` ? target : `/quotes/${encodeURIComponent(req.params.id)}`;
    return res.redirect(303, safeTarget);
  }
});

r.post("/bulk-delete", quoteArchive, (req, res) => {
  const ids = [].concat(req.body.ids || []).filter(Boolean);
  const now = Date.now(),
    upd = db.prepare(
      "UPDATE quotes SET status='ARCHIVED',deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=?"
    );
  db.transaction(() => ids.forEach((x) => upd.run(now, req.user.id, now, req.tenantId, x)))();
  audit(req, { action: "QUOTE_BULK_ARCHIVE", module: "QUOTES", newValue: { count: ids.length } });
  flash(req, "success", `${ids.length} proforma arşivlendi.`);
  res.redirect("/quotes");
});
r.post("/:id/delete", quoteArchive, (req, res) => {
  db.prepare(
    "UPDATE quotes SET status='ARCHIVED',deleted_at=?,deleted_by=?,updated_at=? WHERE tenant_id=? AND id=?"
  ).run(Date.now(), req.user.id, Date.now(), req.tenantId, req.params.id);
  audit(req, { action: "QUOTE_ARCHIVE", module: "QUOTES", entityId: req.params.id });
  flash(req, "success", "Proforma arşivlendi.");
  res.redirect("/quotes");
});
export default r;

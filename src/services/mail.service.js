import nodemailer from "nodemailer";
import { db } from "../db/db.js";
import { config } from "../config.js";
import { decryptSecret } from "../utils/secrets.js";

const text = (v) => String(v ?? "").trim();
const bool = (v) => Number(v || 0) === 1;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]
  );
const nl2br = (v) => esc(v).replace(/\n/g, "<br>");
function fullUrl(url) {
  const v = text(url);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const base = String(config.publicBaseUrl || "").replace(/\/$/, "");
  return `${base}${v.startsWith("/") ? v : `/${v}`}`;
}
export function getSmtpSettings(tenantId) {
  const row = db.prepare("SELECT * FROM smtp_settings WHERE tenant_id=?").get(tenantId) || null;
  return row ? { ...row, password: decryptSecret(row.password) } : null;
}
export function getActiveProfile(tenantId) {
  return (
    db
      .prepare(
        "SELECT * FROM profiles WHERE tenant_id=? AND is_active=1 AND COALESCE(deleted_at,0)=0 ORDER BY updated_at DESC LIMIT 1"
      )
      .get(tenantId) || null
  );
}
export function publicUrl(path) {
  const base = String(config.publicBaseUrl || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
export function defaultQuoteEmailText({ row, shareUrl }) {
  return `Sn. Yetkili,\n\nİstemiş olduğunuz fiyat teklifi aşağıdaki güvenli bağlantı üzerinden bilgilerinize sunulmuştur.\n\n${shareUrl}\n\nHer türlü teknik soru ve ek talepleriniz için memnuniyetle destek vermeye hazırız.\n\nİyi çalışmalar dileriz\nSaygılarımla...`;
}
export function buildQuoteEmail({ row, shareUrl, body }) {
  return text(body) || defaultQuoteEmailText({ row, shareUrl });
}
function disclaimer(profile) {
  const company = profile?.short_name || profile?.company_name || "firmamız";
  return `Bu e-posta ve ekleri gizlidir. Yanlışlıkla tarafınıza ulaştıysa lütfen göndereni bilgilendirip mesajı siliniz.\n\nBu elektronik posta ve onunla iletilen tüm dosyalar yalnızca gönderildikleri kişi veya kuruluşun kullanımı için tasarlanmıştır. Amaçlanan alıcı değilseniz, bu e-postanın içeriğini açıklamanız, kopyalamanız, yönlendirmeniz veya kullanmanız kesinlikle yasaktır ve e-postayı derhal silmeniz gerekmektedir. ${company}, bu mesajda yer alan bilgilerin doğruluğu veya eksiksizliği konusunda garanti vermez ve bu bilgilerin iletilmesi, alınması, saklanması veya kullanılmasından dolayı sorumluluk kabul etmez. Bu mesajdaki görüşler yalnızca gönderene ait olabilir ve ${company} görüşlerini yansıtmayabilir.\n\nÇıktı almadan önce çevreyi düşünün! Consider the environment before you print!`;
}
function signatureHtml(profile, settings) {
  const p = profile || {};
  const logo = fullUrl(p.logo_url);
  const website = text(p.website) || "www.artevalab.com";
  const websiteUrl = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  const email = text(p.email) || text(settings?.from_email);
  const phone = text(p.mobile) || text(p.phone);
  const address = [p.address || p.delivery_address || p.billing_address, p.district, p.city, p.country]
    .filter(Boolean)
    .join(" / ");
  const person = text(p.authorized_person) || text(settings?.from_name) || "ARTEVA";
  const whatsapp = phone ? `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "90")}` : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:1px solid #e5e7eb;padding-top:16px;width:100%;max-width:760px;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><tr><td style="width:280px;vertical-align:middle;padding-right:20px">${logo ? `<img src="${esc(logo)}" alt="${esc(p.company_name || "ARTEVA")}" style="max-width:260px;height:auto;display:block">` : ""}</td><td style="vertical-align:top;font-size:13px;line-height:1.5"><div style="font-weight:700;color:#dc2626;font-size:15px">${esc(person)}</div><div style="color:#6b7280;margin-bottom:6px">General Manager</div>${phone ? `<div>☎ ${esc(phone)}</div>` : ""}${website ? `<div>🌐 <a href="${esc(websiteUrl)}" style="color:#0b55b7">${esc(website.replace(/^https?:\/\//i, ""))}</a></div>` : ""}${email ? `<div>✉ <a href="mailto:${esc(email)}" style="color:#0b55b7">${esc(email)}</a></div>` : ""}${address ? `<div style="color:#b91c1c;margin-top:4px">📍 ${esc(address)}</div>` : ""}<div style="margin-top:12px">${whatsapp ? `<a href="${esc(whatsapp)}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;padding:8px 14px;margin-right:8px">WhatsApp ile yazın</a>` : ""}${email ? `<a href="mailto:${esc(email)}" style="display:inline-block;border:1px solid #ef4444;color:#166534;text-decoration:none;border-radius:6px;padding:7px 14px">İletişim</a>` : ""}</div></td></tr></table>`;
}
export function buildCorporateMailHtml(
  tenantId,
  { body, shareUrl, buttonText = "Fiyat Teklifini Görüntüle" } = {}
) {
  const profile = getActiveProfile(tenantId);
  const settings = getSmtpSettings(tenantId);
  const safeBody = nl2br(body || "");
  const link = shareUrl
    ? `<p style="margin:18px 0"><a href="${esc(shareUrl)}" style="display:inline-block;background:#245ba7;color:#fff;text-decoration:none;border-radius:8px;padding:10px 16px;font-weight:700">${esc(buttonText)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fb"><div style="max-width:820px;margin:0 auto;background:#fff;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:14px;line-height:1.55"><div>${safeBody}</div>${link}${signatureHtml(profile, settings)}<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:11px;line-height:1.45;white-space:pre-line">${esc(disclaimer(profile))}</div></div></body></html>`;
}
export function createTransport(settings) {
  if (!settings || !bool(settings.is_active))
    throw Object.assign(new Error("SMTP ayarları aktif değil."), { status: 422, expose: true });
  if (!settings.host || !settings.from_email)
    throw Object.assign(new Error("SMTP host ve gönderen e-posta zorunludur."), {
      status: 422,
      expose: true
    });
  return nodemailer.createTransport({
    host: settings.host,
    port: Number(settings.port || 587),
    secure: bool(settings.secure),
    auth: settings.username ? { user: settings.username, pass: settings.password || "" } : undefined,
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" }
  });
}
export async function sendMail(tenantId, { to, cc = [], subject, body, html, shareUrl, corporate = true }) {
  const settings = getSmtpSettings(tenantId);
  const transporter = createTransport(settings);
  const fromName = settings.from_name || "CRM ERP";
  const from = `${fromName} <${settings.from_email}>`;
  const finalHtml =
    html ||
    (corporate
      ? buildCorporateMailHtml(tenantId, { body, shareUrl })
      : String(body || "").replace(/\n/g, "<br>"));
  return transporter.sendMail({
    from,
    to,
    cc: Array.isArray(cc) && cc.length ? cc : undefined,
    replyTo: settings.reply_to || settings.from_email,
    subject,
    text: body,
    html: finalHtml
  });
}

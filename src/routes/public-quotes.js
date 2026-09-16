import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Router } from "express";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { loadQuote } from "../services/quote.service.js";
import { translator, quoteDisplayNo, quotePrintDisplayNo } from "../services/locale.service.js";
import { config } from "../config.js";
import { ensureOperationalSchema } from "../services/operational-schema.service.js";
import { quotePrintLocals } from "../services/quote-render.service.js";
import {
  createAssetGrant,
  setAssetGrantCookie,
  normalizeUploadRelative,
  publicUploadUrl,
  uploadAccessInternals
} from "../services/upload-access.service.js";
const r = Router();
const sha256 = (v) =>
  crypto
    .createHash("sha256")
    .update(String(v || ""))
    .digest("hex");
function secureHeaders(res) {
  res.setHeader("Cache-Control", "no-store, private, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("Referrer-Policy", "no-referrer");
}
function publicLocals(locale = "tr", extra = {}) {
  const t = translator(locale);
  return {
    locale,
    t,
    appVersion: config.appVersion,
    publicBaseUrl: config.publicBaseUrl.replace(/\/$/, ""),
    quoteDisplayNo: (row) => quoteDisplayNo(row),
    quotePrintDisplayNo: (row, profile) => quotePrintDisplayNo(row, profile),
    ...extra
  };
}
function publicError(res, message, status = 404, locale = "tr") {
  secureHeaders(res);
  const en = locale === "en",
    safe = String(
      message || (en ? "The link is invalid or has expired." : "Bağlantı geçersiz veya süresi dolmuş.")
    ).replace(/[<>&]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[m]);
  res
    .status(status)
    .type("html")
    .send(
      `<!doctype html><html lang="${en ? "en" : "tr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${en ? "Offer link" : "Teklif bağlantısı"}</title><style>body{font-family:Arial,sans-serif;background:#f5f7fb;color:#14233d;margin:0;padding:28px}.box{max-width:680px;margin:40px auto;background:#fff;border:1px solid #dbe5f2;border-radius:18px;padding:24px;box-shadow:0 12px 28px rgba(20,35,61,.08)}h1{font-size:22px;margin:0 0 10px}.muted{color:#65758b}</style></head><body><main class="box"><h1>${en ? "The offer link could not be opened" : "Teklif bağlantısı açılamadı"}</h1><p>${safe}</p><p class="muted">${en ? "Please contact the company that sent the offer." : "Lütfen teklifi gönderen firma ile iletişime geçiniz."}</p></main></body></html>`
    );
}
function findToken(raw) {
  const hash = sha256(raw);
  return db
    .prepare(
      `SELECT * FROM quote_share_tokens
    WHERE is_active=1 AND COALESCE(revoked_at,0)=0
      AND (token_hash=? OR (token_hash IS NULL AND token=?))
    LIMIT 1`
    )
    .get(hash, raw);
}
function localUploadPath(value) {
  let raw = String(value || "").trim();
  if (!raw) return "";
  if (/^public\/uploads\//i.test(raw)) raw = `/${raw}`;
  if (/^uploads\//i.test(raw)) raw = `/${raw}`;
  if (raw.startsWith("/public/uploads/") || raw.startsWith("/uploads/")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith("/public/uploads/") || parsed.pathname.startsWith("/uploads/"))
      return parsed.pathname;
  } catch {}
  return "";
}
function publicAssetProxyUrl(rawToken, value) {
  const local = localUploadPath(value);
  if (!local) return value;
  return `/q/${encodeURIComponent(rawToken)}/asset?path=${encodeURIComponent(local)}`;
}
function publicDocumentProxyUrl(rawToken, value, kind = "document") {
  const local = localUploadPath(value);
  if (!local) return value;
  return `/q/${encodeURIComponent(rawToken)}/download?path=${encodeURIComponent(local)}&kind=${encodeURIComponent(kind)}`;
}
function rewritePublicQuoteAssets(row, rawToken) {
  if (!row) return row;
  const profile = { ...(row.profile_snapshot || {}) };
  for (const key of ["logo_url", "stamp_url", "signature_url", "left_image_url"])
    profile[key] = publicAssetProxyUrl(rawToken, profile[key]);
  const customer = { ...(row.customer_snapshot || {}) };
  customer.logo_url = publicAssetProxyUrl(rawToken, customer.logo_url);
  const items = (row.items || []).map((item) => {
    const product = { ...(item.product_snapshot || {}) };
    product.image_url = publicAssetProxyUrl(rawToken, product.image_url);
    product.brochure_url = publicDocumentProxyUrl(rawToken, product.brochure_url, "brochure");
    product.ce_certificate_url = publicDocumentProxyUrl(rawToken, product.ce_certificate_url, "ce");
    product.manual_url = publicDocumentProxyUrl(rawToken, product.manual_url, "manual");
    return { ...item, product_snapshot: product };
  });
  return { ...row, profile_snapshot: profile, customer_snapshot: customer, items };
}
function recordHumanView(req, token, log, pageViewId) {
  const now = Date.now();
  const ipHash = sha256(`${req.ip || req.socket?.remoteAddress || ""}|${config.sessionSecret}`);
  const userAgent = String(req.get("user-agent") || "").slice(0, 500);
  return db.transaction(() => {
    const inserted = db
      .prepare(
        `INSERT OR IGNORE INTO quote_view_events(
      id,tenant_id,quote_id,send_log_id,token_id,ip,user_agent,event_type,page_view_id,created_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        id("qvw"),
        token.tenant_id,
        token.quote_id,
        log?.id || null,
        token.id,
        ipHash,
        userAgent,
        "HUMAN_VIEW",
        pageViewId,
        now
      );
    if (!inserted.changes) return false;
    db.prepare("UPDATE quote_share_tokens SET view_count=view_count+1,last_viewed_at=? WHERE id=?").run(
      now,
      token.id
    );
    if (log)
      db.prepare(
        "UPDATE quote_send_logs SET view_count=view_count+1,viewed_at=COALESCE(viewed_at,?) WHERE id=?"
      ).run(now, log.id);
    return true;
  })();
}
function resolveOwnedQuoteUpload(token, requestedPath) {
  const relative = normalizeUploadRelative(requestedPath);
  if (!relative) return null;
  const canonicalUrl = publicUploadUrl(relative);
  if (!uploadAccessInternals.quoteReferenceOwned(token.tenant_id, token.quote_id, canonicalUrl)) return null;
  const root = config.publicUploadDir;
  const absolute = path.resolve(root, relative);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return null;
  let stat;
  try {
    stat = fs.statSync(absolute);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  return { relative, canonicalUrl, absolute, stat };
}
function publicDocumentName(kind = "document") {
  if (kind === "brochure") return "brosur.pdf";
  if (kind === "ce") return "ce-belgesi.pdf";
  if (kind === "manual") return "kullanma-kilavuzu.pdf";
  return "dokuman.pdf";
}
r.get("/:token/download", (req, res) => {
  ensureOperationalSchema();
  secureHeaders(res);
  const raw = String(req.params.token || "");
  if (raw.length < 24 || raw.length > 256) return res.status(404).end();
  const token = findToken(raw);
  if (!token || (token.expires_at && Number(token.expires_at) < Date.now())) return res.status(404).end();
  const owned = resolveOwnedQuoteUpload(token, req.query.path);
  if (!owned) return res.status(404).type("text/plain").send("Dosya bulunamadı veya erişim süresi sona erdi.");
  const kind = ["brochure", "ce", "manual"].includes(String(req.query.kind || ""))
    ? String(req.query.kind)
    : "document";
  const ext = path.extname(owned.absolute).toLowerCase();
  if (ext !== ".pdf") return res.status(415).type("text/plain").send("Bu belge PDF biçiminde değildir.");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${publicDocumentName(kind)}"`);
  res.setHeader("Content-Length", String(owned.stat.size));
  return res.sendFile(owned.absolute, (error) => {
    if (!error || res.headersSent) return;
    console.error("[public-quote-download] Belge gönderilemedi:", error?.message || error);
    if (!res.headersSent) res.status(404).end();
  });
});
r.get("/:token/asset", (req, res, next) => {
  try {
    ensureOperationalSchema();
    secureHeaders(res);
    const raw = String(req.params.token || "");
    if (raw.length < 24 || raw.length > 256) return res.status(404).end();
    const token = findToken(raw);
    if (!token || (token.expires_at && Number(token.expires_at) < Date.now())) return res.status(404).end();
    const owned = resolveOwnedQuoteUpload(token, req.query.path);
    if (!owned) return res.status(404).end();
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Cache-Control", "private, max-age=600");
    return res.sendFile(owned.absolute, (error) => {
      if (!error || res.headersSent) return;
      console.error("[public-quote-asset] Dosya gönderilemedi:", error?.message || error);
      if (!res.headersSent) res.status(404).end();
    });
  } catch (error) {
    next(error);
  }
});
r.post("/:token/view", (req, res, next) => {
  try {
    ensureOperationalSchema();
    secureHeaders(res);
    const raw = String(req.params.token || ""),
      pageViewId = String(req.body?.page_view_id || "").trim();
    if (raw.length < 24 || raw.length > 256 || !/^[A-Za-z0-9_-]{20,80}$/.test(pageViewId))
      return res.status(400).json({ ok: false });
    const origin = String(req.get("origin") || "");
    if (origin) {
      const expected = `${req.protocol}://${req.get("host")}`;
      if (origin !== expected) return res.status(403).json({ ok: false });
    }
    const token = findToken(raw);
    if (!token || (token.expires_at && Number(token.expires_at) < Date.now()))
      return res.status(404).json({ ok: false });
    if (!loadQuote(token.tenant_id, token.quote_id)) return res.status(404).json({ ok: false });
    const log = token.send_log_id
      ? db
          .prepare(
            "SELECT * FROM quote_send_logs WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0 LIMIT 1"
          )
          .get(token.tenant_id, token.send_log_id)
      : null;
    const recorded = recordHumanView(req, token, log, pageViewId);
    return res.status(recorded ? 201 : 200).json({ ok: true, recorded });
  } catch (e) {
    next(e);
  }
});
r.get("/:token", (req, res, next) => {
  try {
    ensureOperationalSchema();
    secureHeaders(res);
    const locale = String(req.query.lang || "").toLowerCase() === "en" ? "en" : "tr",
      raw = String(req.params.token || "");
    if (raw.length < 24 || raw.length > 256)
      return publicError(
        res,
        locale === "en"
          ? "This offer link is invalid or has expired."
          : "Bu teklif bağlantısı geçersiz veya süresi dolmuş.",
        404,
        locale
      );
    const token = findToken(raw);
    if (!token || (token.expires_at && Number(token.expires_at) < Date.now()))
      return publicError(
        res,
        locale === "en"
          ? "This offer link is invalid or has expired."
          : "Bu teklif bağlantısı geçersiz veya süresi dolmuş.",
        404,
        locale
      );
    let row = loadQuote(token.tenant_id, token.quote_id);
    if (row && token.send_log_id) {
      const sendLog = db
        .prepare(
          "SELECT template_snapshot_json FROM quote_send_logs WHERE tenant_id=? AND id=? AND quote_id=? AND COALESCE(deleted_at,0)=0 LIMIT 1"
        )
        .get(token.tenant_id, token.send_log_id, token.quote_id);
      if (sendLog?.template_snapshot_json) row.template_snapshot_json = sendLog.template_snapshot_json;
    }
    if (!row)
      return publicError(
        res,
        locale === "en"
          ? "The proforma was not found or is no longer available."
          : "Proforma bulunamadı veya artık görüntülenemiyor.",
        404,
        locale
      );
    row = rewritePublicQuoteAssets(row, raw);
    const basePath = `/q/${encodeURIComponent(raw)}`;
    const langQuery = locale === "en" ? "lang=en" : "";
    const publicShareUrl = `${config.publicBaseUrl.replace(/\/$/, "")}${basePath}${langQuery ? `?${langQuery}` : ""}`;
    const publicPrintUrl = `${basePath}?${[langQuery, "print=1"].filter(Boolean).join("&")}`;
    const autoPrint = String(req.query.print || "") === "1";
    const assetTtl = 30 * 60 * 1000;
    setAssetGrantCookie(
      res,
      createAssetGrant({ tenantId: token.tenant_id, scope: "quote", quoteId: row.id, ttlMs: assetTtl }),
      assetTtl
    );
    res.render("quotes/print", {
      ...quotePrintLocals({
        tenantId: token.tenant_id,
        row,
        locale,
        isPreview: false,
        autoPrint,
        publicView: true
      }),
      ...publicLocals(locale, { publicShareUrl, publicPrintUrl, publicViewEndpoint: `${basePath}/view` })
    });
  } catch (e) {
    next(e);
  }
});
export default r;

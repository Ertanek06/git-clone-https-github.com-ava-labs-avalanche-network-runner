import crypto from "crypto";
import path from "path";
import { db } from "../db/db.js";
import { config } from "../config.js";
import { getLoginStudioState } from "./login-studio.service.js";

export const ASSET_GRANT_COOKIE = "efsana36.asset";
const GRANT_VERSION = 1;
const PUBLIC_PREFIX = "/public/uploads/";

export function tenantUploadSegment(tenantId) {
  const raw = String(tenantId || "").trim();
  if (/^[a-z0-9][a-z0-9_-]{0,100}$/i.test(raw)) return raw;
  return `tenant-${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

export function normalizeUploadRelative(value) {
  let raw = String(value || "").split(/[?#]/, 1)[0];
  if (raw.startsWith(PUBLIC_PREFIX)) raw = raw.slice(PUBLIC_PREFIX.length);
  if (raw.startsWith("/uploads/")) raw = raw.slice("/uploads/".length);
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return "";
  }
  raw = raw.replaceAll("\\", "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("\0"))
    return "";
  return normalized;
}

export function publicUploadUrl(relative) {
  const safe = normalizeUploadRelative(relative);
  return safe ? `${PUBLIC_PREFIX}${safe.split("/").map(encodeURIComponent).join("/")}` : "";
}

function signature(payload) {
  return crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
}

export function createAssetGrant({ tenantId, scope, quoteId = null, ttlMs = 2 * 60 * 60 * 1000 }) {
  const body = Buffer.from(
    JSON.stringify({
      v: GRANT_VERSION,
      tenantId: String(tenantId || ""),
      scope: String(scope || ""),
      quoteId: quoteId ? String(quoteId) : null,
      exp: Date.now() + Math.max(60_000, Number(ttlMs) || 0)
    })
  ).toString("base64url");
  return `${body}.${signature(body)}`;
}

export function verifyAssetGrant(value) {
  const [body, supplied, extra] = String(value || "").split(".");
  if (!body || !supplied || extra) return null;
  const expected = signature(body);
  const a = Buffer.from(supplied),
    b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (Number(parsed.v) !== GRANT_VERSION || Number(parsed.exp) <= Date.now()) return null;
    if (!parsed.tenantId || !["login", "quote"].includes(parsed.scope)) return null;
    if (parsed.scope === "quote" && !parsed.quoteId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readCookie(req, name) {
  const header = String(req?.headers?.cookie || "");
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

export function setAssetGrantCookie(res, grant, maxAgeMs) {
  res.cookie(ASSET_GRANT_COOKIE, grant, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/public/uploads",
    maxAge: Math.max(60_000, Number(maxAgeMs) || 0)
  });
}

function tableHasColumn(table, column) {
  try {
    return db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .some((row) => row.name === column);
  } catch {
    return false;
  }
}

const directAssetColumns = Object.freeze({
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
});

function directReferenceOwned(tenantId, url) {
  for (const [table, candidates] of Object.entries(directAssetColumns)) {
    const columns = candidates.filter((column) => tableHasColumn(table, column));
    if (!columns.length) continue;
    const where = columns.map((column) => `${column}=?`).join(" OR ");
    if (
      db
        .prepare(`SELECT 1 FROM ${table} WHERE tenant_id=? AND (${where}) LIMIT 1`)
        .get(tenantId, ...columns.map(() => url))
    )
      return true;
  }
  return false;
}

function collectLocalAssetUrls(value, out = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectLocalAssetUrls(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectLocalAssetUrls(item, out);
    return out;
  }
  if (typeof value === "string") {
    let candidate = value;
    if (!(candidate.startsWith(PUBLIC_PREFIX) || candidate.startsWith("/uploads/"))) {
      try {
        const parsed = new URL(candidate);
        candidate = parsed.pathname;
      } catch {}
    }
    if ((candidate.startsWith(PUBLIC_PREFIX) || candidate.startsWith("/uploads/")) && normalizeUploadRelative(candidate))
      out.add(publicUploadUrl(candidate));
  }
  return out;
}

function parseJson(value) {
  try {
    return JSON.parse(String(value || "{}"));
  } catch {
    return {};
  }
}

function quoteReferenceOwned(tenantId, quoteId, url) {
  const quote = db
    .prepare(
      `SELECT profile_snapshot_json,customer_snapshot_json
    FROM quotes WHERE tenant_id=? AND id=? LIMIT 1`
    )
    .get(tenantId, quoteId);
  if (!quote) return false;
  const urls = collectLocalAssetUrls([
    parseJson(quote.profile_snapshot_json),
    parseJson(quote.customer_snapshot_json)
  ]);
  const items = db
    .prepare(
      `SELECT i.product_snapshot_json
       FROM quote_items i
       JOIN quotes q ON q.id=i.quote_id
       WHERE q.tenant_id=? AND i.quote_id=?`
    )
    .all(tenantId, quoteId);
  for (const item of items) collectLocalAssetUrls(parseJson(item.product_snapshot_json), urls);
  return urls.has(url);
}

function loginReferenceOwned(tenantId, url) {
  try {
    const state = getLoginStudioState(tenantId);
    const allowed = new Set(
      [
        state.legacy?.logo_url,
        state.legacy?.left_image_url,
        state.selectedMedia?.url,
        state.selectedMedia?.thumbnail_url
      ]
        .filter((value) => String(value).startsWith(PUBLIC_PREFIX) || String(value).startsWith("/uploads/"))
        .map(publicUploadUrl)
    );
    return allowed.has(url);
  } catch {
    return false;
  }
}

export function authenticatedTenantForRequest(req) {
  const userId = String(req?.session?.userId || "");
  if (!userId) return null;
  const row = db.prepare("SELECT tenant_id FROM users WHERE id=? AND is_active=1 LIMIT 1").get(userId);
  return row?.tenant_id || null;
}

export function tenantOwnsUpload(tenantId, relative) {
  const safe = normalizeUploadRelative(relative);
  if (!tenantId || !safe) return false;
  if (safe.startsWith(`${tenantUploadSegment(tenantId)}/`)) return true;
  const url = publicUploadUrl(safe);
  if (safe.startsWith("login-library/")) {
    try {
      const state = getLoginStudioState(tenantId);
      if (
        [...state.library, state.selectedMedia]
          .filter(Boolean)
          .some((item) => [item.url, item.thumbnail_url].filter(Boolean).map(publicUploadUrl).includes(url))
      )
        return true;
    } catch {}
  }
  return directReferenceOwned(tenantId, url);
}

export function authorizeUploadRequest(req, res, next) {
  const relative = normalizeUploadRelative(req.path);
  if (!relative) return res.status(404).end();
  const url = publicUploadUrl(relative);
  const tenantId = authenticatedTenantForRequest(req);
  if (tenantId && tenantOwnsUpload(tenantId, relative)) {
    req.assetTenantId = tenantId;
    return next();
  }
  const grant = verifyAssetGrant(readCookie(req, ASSET_GRANT_COOKIE));
  const permitted =
    grant?.scope === "login"
      ? loginReferenceOwned(grant.tenantId, url)
      : grant?.scope === "quote"
        ? quoteReferenceOwned(grant.tenantId, grant.quoteId, url)
        : false;
  if (!permitted) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).end();
  }
  req.assetTenantId = grant.tenantId;
  return next();
}

export const uploadAccessInternals = {
  collectLocalAssetUrls,
  directReferenceOwned,
  quoteReferenceOwned,
  loginReferenceOwned
};

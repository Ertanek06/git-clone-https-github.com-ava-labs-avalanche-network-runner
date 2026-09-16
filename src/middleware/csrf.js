import crypto from "crypto";

const AUTH_GRACE_PATHS = new Set(["/login", "/logout"]);

function freshToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function csrfToken(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = freshToken();
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function sameOrigin(req) {
  const host = String(req.get?.("host") || req.headers?.host || "").toLowerCase();
  if (!host) return false;
  const source = String(
    req.get?.("origin") || req.get?.("referer") || req.headers?.origin || req.headers?.referer || ""
  );
  if (!source) return false;
  try {
    return new URL(source).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function verifyCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const token = req.body?._csrf || req.query?._csrf || req.get("x-csrf-token");
  if (token && req.session.csrfToken && safeEqual(token, req.session.csrfToken)) return next();

  // Giriş/çıkış formlarında eski sekme veya bfcache kaynaklı token eskimesi olabilir.
  // Yalnızca aynı kaynaktan gelen POST isteğine sınırlı güvenli tolerans uygulanır.
  if (AUTH_GRACE_PATHS.has(req.path) && sameOrigin(req)) return next();

  const err = new Error("Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.");
  err.status = 403;
  err.code = "CSRF_INVALID";
  err.expose = true;
  next(err);
}

export const csrfInternals = { safeEqual, sameOrigin };

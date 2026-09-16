import crypto from "crypto";
import { db } from "../db/db.js";

function clientKey(req, scope = "global") {
  const ip = String(req.ip || req.socket?.remoteAddress || "unknown").trim();
  return crypto.createHash("sha256").update(`${scope}:${ip}`).digest("hex");
}
const consume = db.transaction((key, scope, windowMs) => {
  const now = Date.now();
  const row = db.prepare("SELECT request_count,reset_at FROM rate_limits WHERE bucket_key=?").get(key);
  if (!row || Number(row.reset_at) <= now) {
    const resetAt = now + windowMs;
    db.prepare(
      "INSERT INTO rate_limits(bucket_key,scope,request_count,reset_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(bucket_key) DO UPDATE SET scope=excluded.scope,request_count=1,reset_at=excluded.reset_at,updated_at=excluded.updated_at"
    ).run(key, scope, 1, resetAt, now);
    return { count: 1, resetAt };
  }
  const count = Number(row.request_count || 0) + 1;
  db.prepare("UPDATE rate_limits SET request_count=?,updated_at=? WHERE bucket_key=?").run(count, now, key);
  return { count, resetAt: Number(row.reset_at) };
});

export function createRateLimit({
  windowMs = 60_000,
  max = 60,
  scope = "global",
  message = "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin."
} = {}) {
  return (req, res, next) => {
    try {
      const current = consume(clientKey(req, scope), scope, windowMs);
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - current.count)));
      if (current.count > max) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil((current.resetAt - Date.now()) / 1000))));
        const err = new Error(message);
        err.status = 429;
        err.expose = true;
        return next(err);
      }
      return next();
    } catch (e) {
      return next(e);
    }
  };
}

setInterval(
  () => {
    try {
      db.prepare("DELETE FROM rate_limits WHERE reset_at<?").run(Date.now() - 24 * 60 * 60 * 1000);
    } catch {}
  },
  60 * 60 * 1000
).unref?.();

export const loginRateLimit = createRateLimit({
  scope: "login",
  windowMs: 15 * 60_000,
  max: 10,
  message: "Çok fazla giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin."
});
export const livePublicRateLimit = createRateLimit({
  scope: "live-public",
  windowMs: 60_000,
  max: 120,
  message: "Canlı destek için çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin."
});

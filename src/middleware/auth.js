import { hasPermission } from "../services/permission.service.js";

export function requireAuth(req, res, next) {
  if (req.user) return next();
  const target = encodeURIComponent(req.originalUrl || "/");
  res.redirect(`/login?next=${target}`);
}
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) return next();
    const err = new Error("Bu işlem için yetkiniz bulunmuyor.");
    err.status = 403;
    err.expose = true;
    next(err);
  };
export const requirePermission =
  (module, action = "view") =>
  (req, res, next) => {
    if (hasPermission(req.user, module, action)) return next();
    const err = new Error("Bu modülde istenen işlem için yetkiniz bulunmuyor.");
    err.status = 403;
    err.expose = true;
    next(err);
  };
export const requireAnyPermission =
  (checks = []) =>
  (req, res, next) => {
    if (checks.some(([module, action]) => hasPermission(req.user, module, action || "view"))) return next();
    const err = new Error("Bu işlem için gerekli yetkilerden hiçbiri hesabınızda bulunmuyor.");
    err.status = 403;
    err.expose = true;
    next(err);
  };
export const allowOperationalWrite = requireRole("SUPER_ADMIN", "TENANT_ADMIN", "STAFF");
export const allowAdmin = requireRole("SUPER_ADMIN", "TENANT_ADMIN");

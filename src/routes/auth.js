import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/db.js";
import { audit } from "../services/audit.service.js";
import { cleanReturnPath } from "../utils/text.js";
import { loginRateLimit } from "../middleware/rate-limit.js";
import { flash } from "../middleware/context.js";
import { getLoginStudioState } from "../services/login-studio.service.js";
import { createAssetGrant, setAssetGrantCookie } from "../services/upload-access.service.js";

const r = Router();
const strongPassword = (value) =>
  String(value || "").length >= 12 && /[a-zçğıöşü]/i.test(value) && /\d/.test(value);
const getLoginState = (tenantId = null) => getLoginStudioState(tenantId);
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("invalid-login-sentinel-2026", 12);
const LOGIN_ASSET_TTL = 15 * 60 * 1000;
const genericLoginError = "Kimlik veya şifre hatalı ya da hesap kullanıma açık değil.";
const grantLoginAssets = (res, state) => {
  if (!state?.tenantId) return;
  setAssetGrantCookie(
    res,
    createAssetGrant({ tenantId: state.tenantId, scope: "login", ttlMs: LOGIN_ASSET_TTL }),
    LOGIN_ASSET_TTL
  );
};

r.get("/login", (req, res) => {
  if (req.user) return res.redirect(req.user.must_change_password ? "/change-password" : "/");
  res.setHeader("Cache-Control", "no-store");
  const state = getLoginState();
  grantLoginAssets(res, state);
  res.render("auth/login", {
    title: "Kullanıcı Girişi",
    isLogin: true,
    ...state,
    branding: state.legacy,
    next: cleanReturnPath(req.query.next || "/")
  });
});

r.post("/login", loginRateLimit, async (req, res, next) => {
  try {
    const login = String(req.body.login || "").trim();
    const password = String(req.body.password || "");
    const nextPath = cleanReturnPath(req.body.next || "/");
    const u = db
      .prepare("SELECT * FROM users WHERE username=? OR email=? OR phone=?")
      .get(login, login, login);
    const renderLoginError = (status, message, target = nextPath) => {
      const state = getLoginState(u?.tenant_id || null);
      grantLoginAssets(res, state);
      return res.status(status).render("auth/login", {
        title: "Kullanıcı Girişi",
        isLogin: true,
        ...state,
        branding: state.legacy,
        next: target,
        error: message,
        loginValue: login,
        rememberRequested: String(req.body.remember || "") === "1"
      });
    };
    res.setHeader("Cache-Control", "no-store");
    const ok = await bcrypt.compare(password, u?.password_hash || DUMMY_PASSWORD_HASH);
    if (!u || !ok || Number(u.is_active) !== 1) {
      if (!u) return renderLoginError(401, genericLoginError, "/");
      const failures = (u.failed_login_count || 0) + 1;
      db.prepare("UPDATE users SET failed_login_count=?,locked_until=NULL,updated_at=? WHERE id=?").run(
        failures,
        Date.now(),
        u.id
      );
      req.user = u;
      req.tenantId = u.tenant_id;
      audit(req, { action: "LOGIN_FAILED", module: "AUTH", entityId: u.id, result: "FAIL" });
      return renderLoginError(401, genericLoginError, "/");
    }
    db.prepare(
      "UPDATE users SET failed_login_count=0,locked_until=NULL,last_login_at=?,updated_at=? WHERE id=?"
    ).run(Date.now(), Date.now(), u.id);
    const preservedCsrfToken = req.session.csrfToken || null;
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = u.id;
      req.session.sessionVersion = Number(u.session_version || 1);
      // Oturum kimliği yenilenirken açık sekmelerdeki giriş/çıkış formları geçersiz kalmasın.
      req.session.csrfToken = preservedCsrfToken;
      req.user = u;
      req.tenantId = u.tenant_id;
      audit(req, { action: "LOGIN", module: "AUTH", entityId: u.id });
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        return res.redirect(Number(u.must_change_password) === 1 ? "/change-password" : nextPath);
      });
    });
  } catch (e) {
    next(e);
  }
});

r.get("/change-password", (req, res) => {
  if (!req.user) return res.redirect("/login");
  res.setHeader("Cache-Control", "no-store");
  res.render("auth/change-password", {
    title: "Şifre Değiştir",
    forced: Number(req.user.must_change_password) === 1
  });
});

r.post("/change-password", async (req, res, next) => {
  try {
    if (!req.user) return res.redirect("/login");
    const currentPassword = String(req.body.current_password || "");
    const newPassword = String(req.body.new_password || "");
    const confirmPassword = String(req.body.confirm_password || "");
    const row = db
      .prepare("SELECT * FROM users WHERE id=? AND tenant_id=? AND is_active=1")
      .get(req.user.id, req.tenantId);
    if (!row || !(await bcrypt.compare(currentPassword, row.password_hash)))
      throw Object.assign(new Error("Mevcut şifreniz hatalı."), { status: 422, expose: true });
    if (!strongPassword(newPassword))
      throw Object.assign(
        new Error("Yeni şifre en az 12 karakter olmalı ve en az bir harf ile bir rakam içermelidir."),
        { status: 422, expose: true }
      );
    if (newPassword !== confirmPassword)
      throw Object.assign(new Error("Yeni şifre ve doğrulama alanı eşleşmiyor."), {
        status: 422,
        expose: true
      });
    if (await bcrypt.compare(newPassword, row.password_hash))
      throw Object.assign(new Error("Yeni şifre mevcut şifreyle aynı olamaz."), {
        status: 422,
        expose: true
      });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const version = Number(row.session_version || 1) + 1;
    db.prepare(
      "UPDATE users SET password_hash=?,must_change_password=0,session_version=?,failed_login_count=0,locked_until=NULL,updated_at=? WHERE id=? AND tenant_id=?"
    ).run(passwordHash, version, Date.now(), row.id, row.tenant_id);
    req.session.sessionVersion = version;
    req.user.must_change_password = 0;
    audit(req, {
      action: "PASSWORD_CHANGE",
      module: "AUTH",
      entityId: row.id,
      newValue: { sessions_revoked: true }
    });
    flash(req, "success", "Şifreniz güvenli biçimde değiştirildi. Diğer açık oturumlar kapatıldı.");
    res.redirect("/");
  } catch (e) {
    next(e);
  }
});

r.post("/logout", (req, res, next) => {
  audit(req, { action: "LOGOUT", module: "AUTH", entityId: req.user?.id });
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("efsana36.sid", { httpOnly: true, sameSite: "lax", secure: Boolean(req.secure) });
    return res.redirect("/login?reason=logout");
  });
});

export default r;

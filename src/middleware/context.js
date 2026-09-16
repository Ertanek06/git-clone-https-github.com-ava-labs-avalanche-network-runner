import { db } from "../db/db.js";
import { config } from "../config.js";
import { getUi } from "../services/theme.service.js";
import {
  normalizeLocale,
  translator,
  statusLabel,
  statusClass,
  roleLabel,
  roleHelp,
  quoteDisplayNo,
  quotePrintDisplayNo,
  translateRenderedHtml
} from "../services/locale.service.js";
import { hasPermission } from "../services/permission.service.js";
import { getAssetManifest } from "../services/asset-manifest.service.js";
export function context(req, res, next) {
  try {
    req.user = req.session.userId
      ? db
          .prepare(
            "SELECT id,tenant_id,username,email,phone,full_name,role,is_active,session_version,must_change_password FROM users WHERE id=?"
          )
          .get(req.session.userId)
      : null;
    if (req.session.userId && (!req.user || Number(req.user.is_active) !== 1)) {
      return req.session.destroy(() => res.redirect("/login?reason=inactive"));
    }
    if (req.user) {
      const currentVersion = Number(req.user.session_version || 1);
      if (req.session.sessionVersion == null) req.session.sessionVersion = currentVersion;
      else if (Number(req.session.sessionVersion) !== currentVersion)
        return req.session.destroy(() => res.redirect("/login?reason=session-revoked"));
    }
    req.tenantId = req.user?.tenant_id || null;
    if (
      req.user &&
      Number(req.user.must_change_password) === 1 &&
      !["/change-password", "/logout"].includes(req.path)
    )
      return res.redirect("/change-password");
    const ui = getUi(req.user?.id);
    const locale = normalizeLocale(req.session.locale || ui.locale || "tr");
    req.locale = locale;
    res.locals.user = req.user;
    res.locals.canSeeFinancials = hasPermission(req.user, "financials", "view");
    res.locals.can = (module, action = "view") => hasPermission(req.user, module, action);
    res.locals.path = req.path;
    res.locals.query = req.query || {};
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    res.locals.ui = { ...ui, locale };
    res.locals.locale = locale;
    res.locals.t = translator(locale);
    res.locals.statusLabel = (value) => statusLabel(locale, value);
    res.locals.statusClass = (value) => statusClass(value);
    res.locals.roleLabel = (value) => roleLabel(locale, value);
    res.locals.roleHelp = (value) => roleHelp(locale, value);
    res.locals.quoteDisplayNo = (row, profile) => quoteDisplayNo(row, profile);
    res.locals.quotePrintDisplayNo = (row, profile) => quotePrintDisplayNo(row, profile);
    res.locals.publicBaseUrl = config.publicBaseUrl.replace(/\/$/, "");
    res.locals.appVersion = config.appVersion;
    res.locals.assetBundle = getAssetManifest(req.path);
    // Translate legacy/raw EJS labels on the server. This avoids browser-wide DOM scans,
    // keeps cards stable and makes every rendered panel follow the selected locale.
    if (locale === "en" && !res.locals.__serverI18nWrapped) {
      res.locals.__serverI18nWrapped = true;
      const originalSend = res.send.bind(res);
      res.send = (body) => {
        if (typeof body === "string" && (/<html[\s>]/i.test(body) || /<!doctype\s+html/i.test(body)))
          body = translateRenderedHtml(body, locale);
        return originalSend(body);
      };
    }
    const activeProfile = req.tenantId
      ? db.prepare("SELECT * FROM profiles WHERE tenant_id=? AND is_active=1 LIMIT 1").get(req.tenantId)
      : null;
    res.locals.activeProfile = activeProfile;
    const rawSupportPhone = String(activeProfile?.mobile || activeProfile?.phone || "").replace(/\D/g, "");
    const country = String(activeProfile?.country || "Türkiye").toLowerCase();
    const defaultCountryCode = country.includes("tür") || country.includes("tur") ? "90" : "";
    const supportPhone = rawSupportPhone.startsWith("00")
      ? rawSupportPhone.slice(2)
      : rawSupportPhone.startsWith("+")
        ? rawSupportPhone.slice(1)
        : rawSupportPhone.startsWith("0") && defaultCountryCode
          ? `${defaultCountryCode}${rawSupportPhone.slice(1)}`
          : rawSupportPhone.length === 10 && defaultCountryCode
            ? `${defaultCountryCode}${rawSupportPhone}`
            : rawSupportPhone;
    const supportText = encodeURIComponent(
      `${activeProfile?.short_name || activeProfile?.company_name || "Firma"} için destek talebi oluşturmak istiyorum.`
    );
    res.locals.supportWhatsAppUrl = supportPhone ? `https://wa.me/${supportPhone}?text=${supportText}` : null;
    res.locals.notifications = req.tenantId
      ? db
          .prepare(
            "SELECT * FROM notifications WHERE tenant_id=? AND (user_id IS NULL OR user_id=?) AND is_read=0 ORDER BY created_at DESC LIMIT 8"
          )
          .all(req.tenantId, req.user?.id)
      : [];
    next();
  } catch (e) {
    next(e);
  }
}
export const flash = (req, type, message) => {
  req.session.flash = { type, message };
};

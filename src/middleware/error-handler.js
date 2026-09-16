function safeBack(req) {
  const ref = req.get?.("referer") || req.headers?.referer || "";
  try {
    if (ref) {
      const u = new URL(
        ref,
        `${req.protocol || "http"}://${req.get?.("host") || req.headers?.host || "localhost"}`
      );
      if (u.host === (req.get?.("host") || req.headers?.host) && u.pathname !== req.originalUrl)
        return u.pathname + u.search;
    }
  } catch {}
  const path = String(req.originalUrl || req.path || "");
  if (path.startsWith("/quotes")) return "/quotes";
  if (path.startsWith("/customers")) return "/customers";
  if (path.startsWith("/products")) return "/products";
  if (path.startsWith("/profiles")) return "/profiles";
  if (path.startsWith("/templates")) return "/templates";
  if (path.startsWith("/settings")) return "/settings";
  if (path.startsWith("/users")) return "/users";
  if (path.startsWith("/audit")) return "/audit";
  if (path.startsWith("/recovery")) return "/recovery";
  if (path.startsWith("/search")) return "/search";
  return "/";
}
export function notFound(req, res) {
  res.status(404).render("errors/404", { title: "Sayfa Bulunamadı", backUrl: safeBack(req) });
}
export function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}]`, err);
  if (err?.code === "CSRF_INVALID" && (req.path === "/login" || req.path === "/logout")) {
    const redirect = () =>
      res.redirect(303, req.path === "/logout" ? "/login?reason=logout" : "/login?reason=session-refresh");
    if (req.path === "/logout" && req.session) return req.session.destroy(() => redirect());
    return redirect();
  }
  const tooLarge = err?.status === 413 || err?.type === "entity.too.large" || err?.code === "LIMIT_FILE_SIZE";
  const uploadFieldError = err?.code === "LIMIT_UNEXPECTED_FILE";
  const status = tooLarge ? 413 : uploadFieldError ? 422 : err.status || 500;
  const message = tooLarge
    ? "Yüklenen dosya izin verilen boyutu aşıyor. Ürün PDF dosyalarında üst sınır 120 MB'dir."
    : uploadFieldError
      ? "Dosya alanı tanınmadı veya aynı alana izin verilenden fazla dosya seçildi."
      : err.expose
        ? err.message
        : err.status && err.status < 500
          ? err.message
          : "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.";
  const accepts = String(req.get?.("accept") || "");
  if (accepts.includes("application/json") || req.xhr)
    return res.status(status).json({ error: err.code || err.type || "request_failed", message });
  res
    .status(status)
    .render("errors/error", { title: "İşlem Tamamlanamadı", message, backUrl: safeBack(req) });
}

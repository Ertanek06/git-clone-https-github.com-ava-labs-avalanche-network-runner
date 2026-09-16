(() => {
  const safeValue = (value) =>
    value.length <= 1000 &&
    !/[<>\\]/.test(value) &&
    !/(?:url\s*\(|@import|expression\s*\(|javascript\s*:|data\s*:|-moz-binding\s*:|behavior\s*:)/i.test(
      value
    );

  const apply = (root = document) => {
    root.querySelectorAll("[data-csp-style]").forEach((element) => {
      const declaration = String(element.getAttribute("data-csp-style") || "").slice(0, 20000);
      for (const candidate of declaration.split(";")) {
        const separator = candidate.indexOf(":");
        if (separator < 1) continue;
        const property = candidate.slice(0, separator).trim().toLowerCase();
        const value = candidate.slice(separator + 1).trim();
        if (!(property === "width" || /^--[a-z0-9_-]+$/i.test(property))) continue;
        if (!value || !safeValue(value)) continue;
        element.style.setProperty(property, value);
      }
      element.removeAttribute("data-csp-style");
    });
  };

  window.CRM_APPLY_CSP_STYLES = apply;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => apply(document), { once: true });
  } else {
    apply(document);
  }
})();

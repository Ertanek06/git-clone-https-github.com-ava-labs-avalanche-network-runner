export const safeText = (value = "") => String(value ?? "").trim();
export const upperTr = (value = "") => safeText(value).toLocaleUpperCase("tr-TR");
export const foldTR = (value = "") =>
  safeText(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
export const searchText = (...parts) =>
  foldTR(parts.filter((v) => v != null).join(" "))
    .replace(/\s+/g, " ")
    .trim();
export const cleanReturnPath = (value = "/") => {
  const raw = safeText(value) || "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  try {
    const u = new URL(raw, "http://local");
    return u.origin === "http://local" ? `${u.pathname}${u.search}${u.hash}` : "/";
  } catch {
    return "/";
  }
};

export const safePublicUrl = (value = "") => {
  const raw = safeText(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/public/uploads/") || raw.startsWith("/uploads/")) return raw;
  return "";
};

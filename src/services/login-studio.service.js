import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../db/db.js";
import { config } from "../config.js";

const SETTINGS_KEY = "login_studio_v1";
const PUBLIC_ACTIVE_KEY = "login_studio_public_active";
const LIBRARY_DIR = path.join(config.sharedDir, "uploads", "login-library");
const CATALOG_FILE = path.join(LIBRARY_DIR, "catalog.json");
const TENANT_LIBRARY_DIR = path.join(LIBRARY_DIR, "tenants");
const QUARANTINE_DIR = path.join(config.privateUploadDir, "quarantine", "login-media");
const PUBLIC_PREFIX = "/public/uploads/login-library/";

export const LOGIN_FONTS = [
  "Inter",
  "Arial",
  "Segoe UI",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Courier New"
];

export const LOGIN_CARD_STYLES = Object.freeze([
  { id: "classic", name: "Kurumsal Klasik", description: "Açık, derinlikli ve dengeli kurumsal kart" },
  { id: "glass", name: "Kristal Cam", description: "Hafif şeffaf, modern ve yumuşak görünüm" },
  { id: "executive", name: "Yönetici Lacivert", description: "Koyu kurumsal başlık ve güçlü kontrast" },
  { id: "minimal", name: "Minimal Çizgi", description: "Temiz, sade ve ince çerçeveli model" },
  { id: "embedded", name: "Duvara Gömülü", description: "Kart hissi azaltılmış bütünleşik giriş alanı" }
]);

const CARD_STYLE_IDS = new Set(LOGIN_CARD_STYLES.map((item) => item.id));

const DEFAULTS = Object.freeze({
  media_id: "none",
  overlay_opacity: 0.28,
  left_title_text: "İş süreçlerinizi tek merkezden yönetin.",
  left_title_x: 8,
  left_title_y: 70,
  left_title_size: 47,
  left_title_color: "#ffffff",
  left_title_font: "Inter",
  left_text_text:
    "Müşteri yönetimi, ürün takibi, profesyonel proforma oluşturma, sipariş süreçleri ve firma ayarları için geliştirilen CRM / ERP platformuna güvenli giriş yapın.",
  left_text_x: 8,
  left_text_y: 82,
  left_text_size: 18,
  left_text_color: "#dbeafe",
  left_text_font: "Inter",
  eyebrow_text: "GÜVENLİ OTURUM AÇMA",
  eyebrow_size: 14,
  eyebrow_color: "#245ba7",
  eyebrow_font: "Inter",
  title_text: "Hesabınıza giriş yapın",
  title_size: 40,
  title_color: "#14233d",
  title_font: "Inter",
  subtitle_text: "Yönetim paneline erişmek için kullanıcı bilgilerinizi girin.",
  subtitle_size: 16,
  subtitle_color: "#5d6f89",
  subtitle_font: "Inter",
  button_text: "CRM / ERP PANELİNE GİRİŞ",
  button_size: 15,
  button_color: "#ffffff",
  button_font: "Inter",
  button_bg: "#245ba7",
  button_radius: 13,

  card_style: "classic",
  card_width: 520,
  card_radius: 28,
  card_bg: "#ffffff",
  card_border: "#c7d5e7",
  logo_height: 118,

  login_label_text: "Kullanıcı adı, e-posta veya telefon",
  login_placeholder_text: "Kullanıcı bilginizi girin",
  password_label_text: "Şifre",
  password_placeholder_text: "Şifrenizi girin",
  password_toggle_text: "Göster",
  password_hide_text: "Gizle",
  remember_text: "Beni hatırla",
  note_text: "Giriş bilgileriniz güvenli oturum altyapısı üzerinden doğrulanır.",

  field_label_size: 13,
  field_label_color: "#17243a",
  field_label_font: "Inter",
  input_text_size: 15,
  input_text_color: "#17243a",
  input_text_font: "Inter",
  input_bg: "#ffffff",
  input_border: "#becde0",
  input_radius: 13,
  remember_size: 13,
  remember_color: "#22334f",
  remember_font: "Inter",
  note_size: 12,
  note_color: "#667a95",
  note_font: "Inter"
});

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const cleanText = (value, fallback = "", max = 600) =>
  String(value ?? fallback)
    .replace(/\r/g, "")
    .slice(0, max);
const cleanHex = (value, fallback) =>
  /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;
const cleanFont = (value, fallback = "Inter") =>
  LOGIN_FONTS.includes(String(value || "")) ? String(value) : fallback;
const cleanCardStyle = (value, fallback = "classic") =>
  CARD_STYLE_IDS.has(String(value || "")) ? String(value) : fallback;
const cleanId = (value) =>
  /^[a-z0-9][a-z0-9_-]{0,100}$/i.test(String(value || "")) ? String(value) : "none";
const safeFileName = (value) => path.basename(String(value || "")).replace(/[^a-z0-9._-]/gi, "");
const tenantSegment = (tenantId) => {
  const raw = String(tenantId || "").trim();
  return /^[a-z0-9][a-z0-9_-]{0,100}$/i.test(raw)
    ? raw
    : `tenant-${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
};
const tenantLibraryDir = (tenantId) => path.join(TENANT_LIBRARY_DIR, tenantSegment(tenantId));
const tenantCatalogFile = (tenantId) => path.join(tenantLibraryDir(tenantId), "catalog.json");
const mediaUrl = (filename, scope = "root", tenantId = null) => {
  if (!filename) return null;
  if (scope === "tenant")
    return `${PUBLIC_PREFIX}tenants/${encodeURIComponent(tenantSegment(tenantId))}/${encodeURIComponent(filename)}`;
  return `${PUBLIC_PREFIX}${encodeURIComponent(filename)}`;
};

function ensureLibraryDir(tenantId = null) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true, mode: 0o700 });
  fs.mkdirSync(TENANT_LIBRARY_DIR, { recursive: true, mode: 0o700 });
  if (tenantId) fs.mkdirSync(tenantLibraryDir(tenantId), { recursive: true, mode: 0o700 });
}
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJsonAtomic(file, value, tenantId = null) {
  ensureLibraryDir(tenantId);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}
function normalizedCatalog(raw = {}) {
  const deleted = [
    ...new Set(
      Array.isArray(raw.deleted_builtin_ids)
        ? raw.deleted_builtin_ids.map(cleanId).filter((x) => x !== "none")
        : []
    )
  ];
  const items = [];
  const seen = new Set();
  for (const source of Array.isArray(raw.items) ? raw.items : []) {
    const id = cleanId(source?.id);
    const filename = safeFileName(source?.filename);
    if (id === "none" || !filename || seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      name: cleanText(source?.name, "Animasyon", 90),
      filename,
      thumbnail: safeFileName(source?.thumbnail) || null,
      kind: source?.kind === "builtin" ? "builtin" : "uploaded",
      created_at: Number(source?.created_at) || Date.now()
    });
  }
  return { version: 1, items, deleted_builtin_ids: deleted };
}
function readRootCatalog() {
  ensureLibraryDir();
  const raw = normalizedCatalog(readJson(CATALOG_FILE, { version: 1, items: [], deleted_builtin_ids: [] }));
  return { ...raw, items: raw.items.filter((item) => fs.existsSync(path.join(LIBRARY_DIR, item.filename))) };
}
function readTenantCatalog(tenantId, { persistCleanup = true } = {}) {
  ensureLibraryDir(tenantId);
  const file = tenantCatalogFile(tenantId);
  const raw = normalizedCatalog(readJson(file, { version: 1, items: [], deleted_builtin_ids: [] }));
  const items = raw.items.filter((item) =>
    fs.existsSync(path.join(tenantLibraryDir(tenantId), item.filename))
  );
  if (persistCleanup && items.length !== raw.items.length) writeJsonAtomic(file, { ...raw, items }, tenantId);
  return { ...raw, items };
}
function saveTenantCatalog(tenantId, catalog) {
  writeJsonAtomic(tenantCatalogFile(tenantId), normalizedCatalog(catalog), tenantId);
}
function readCatalog(tenantId, { persistCleanup = true, includeLegacyId = null } = {}) {
  const root = readRootCatalog();
  const own = readTenantCatalog(tenantId, { persistCleanup });
  const hidden = new Set(own.deleted_builtin_ids);
  const rootItems = root.items
    .filter((item) =>
      item.kind === "builtin" ? !hidden.has(item.id) : item.id === includeLegacyId && !hidden.has(item.id)
    )
    .map((item) => ({ ...item, _scope: "root" }));
  const tenantItems = own.items
    .filter((item) => !hidden.has(item.id))
    .map((item) => ({ ...item, kind: "uploaded", _scope: "tenant" }));
  return {
    version: 2,
    items: [...rootItems, ...tenantItems],
    deleted_builtin_ids: own.deleted_builtin_ids,
    tenantCatalog: own
  };
}

export function resolveLoginTenantId(tenantId = null) {
  const explicit = String(tenantId || "").trim();
  if (explicit && db.prepare("SELECT 1 FROM tenants WHERE id=?").get(explicit)) return explicit;

  // Public /login must use the tenant whose Login Studio was saved as active.
  // TENANT_ID used to have priority here; when it pointed at an old/default tenant,
  // the settings preview saved correctly but the real login page read another row.
  const marked = db
    .prepare(
      `SELECT tenant_id FROM app_settings
    WHERE key=? AND value_json='true'
    ORDER BY updated_at DESC LIMIT 1`
    )
    .get(PUBLIC_ACTIVE_KEY);
  if (marked?.tenant_id && db.prepare("SELECT 1 FROM tenants WHERE id=?").get(marked.tenant_id))
    return marked.tenant_id;

  // Backward-compatible recovery for installations saved before the active marker existed.
  const latestStudio = db
    .prepare(
      `SELECT tenant_id FROM app_settings
    WHERE key=? ORDER BY updated_at DESC LIMIT 1`
    )
    .get(SETTINGS_KEY);
  if (latestStudio?.tenant_id && db.prepare("SELECT 1 FROM tenants WHERE id=?").get(latestStudio.tenant_id))
    return latestStudio.tenant_id;

  const envTenant = String(process.env.TENANT_ID || "").trim();
  if (envTenant && db.prepare("SELECT 1 FROM tenants WHERE id=?").get(envTenant)) return envTenant;
  const latest = db.prepare("SELECT tenant_id FROM login_settings ORDER BY updated_at DESC LIMIT 1").get();
  if (latest?.tenant_id) return latest.tenant_id;
  return (
    db
      .prepare(
        "SELECT id FROM tenants WHERE COALESCE(status,'ACTIVE')='ACTIVE' ORDER BY updated_at DESC,created_at ASC LIMIT 1"
      )
      .get()?.id || null
  );
}
function legacyBranding(tenantId = null) {
  const resolved = resolveLoginTenantId(tenantId);
  if (!resolved) return {};
  return db.prepare("SELECT * FROM login_settings WHERE tenant_id=?").get(resolved) || {};
}
function savedStudio(tenantId) {
  const resolved = resolveLoginTenantId(tenantId);
  if (!resolved) return {};
  const row = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
    .get(resolved, SETTINGS_KEY);
  if (!row) return {};
  try {
    return JSON.parse(row.value_json) || {};
  } catch {
    return {};
  }
}
function sanitizeStudio(input = {}, legacy = {}) {
  const base = {
    ...DEFAULTS,
    media_id: legacy.left_image_url ? "image" : DEFAULTS.media_id,
    overlay_opacity: legacy.overlay_opacity ?? DEFAULTS.overlay_opacity,
    left_title_text: legacy.left_title || DEFAULTS.left_title_text,
    left_text_text: legacy.left_text || DEFAULTS.left_text_text,
    eyebrow_text: legacy.eyebrow || DEFAULTS.eyebrow_text,
    title_text: legacy.title || DEFAULTS.title_text,
    subtitle_text: legacy.subtitle || DEFAULTS.subtitle_text,
    button_text: legacy.button_text || DEFAULTS.button_text
  };
  const v = { ...base, ...input };
  return {
    media_id: cleanId(v.media_id),
    overlay_opacity: clamp(v.overlay_opacity, 0, 0.9, base.overlay_opacity),
    left_title_text: cleanText(v.left_title_text, base.left_title_text, 240),
    left_title_x: clamp(v.left_title_x, 0, 92, base.left_title_x),
    left_title_y: clamp(v.left_title_y, 0, 92, base.left_title_y),
    left_title_size: clamp(v.left_title_size, 16, 84, base.left_title_size),
    left_title_color: cleanHex(v.left_title_color, base.left_title_color),
    left_title_font: cleanFont(v.left_title_font, base.left_title_font),
    left_text_text: cleanText(v.left_text_text, base.left_text_text, 900),
    left_text_x: clamp(v.left_text_x, 0, 92, base.left_text_x),
    left_text_y: clamp(v.left_text_y, 0, 94, base.left_text_y),
    left_text_size: clamp(v.left_text_size, 10, 42, base.left_text_size),
    left_text_color: cleanHex(v.left_text_color, base.left_text_color),
    left_text_font: cleanFont(v.left_text_font, base.left_text_font),
    eyebrow_text: cleanText(v.eyebrow_text, base.eyebrow_text, 100),
    eyebrow_size: clamp(v.eyebrow_size, 10, 28, base.eyebrow_size),
    eyebrow_color: cleanHex(v.eyebrow_color, base.eyebrow_color),
    eyebrow_font: cleanFont(v.eyebrow_font, base.eyebrow_font),
    title_text: cleanText(v.title_text, base.title_text, 180),
    title_size: clamp(v.title_size, 20, 64, base.title_size),
    title_color: cleanHex(v.title_color, base.title_color),
    title_font: cleanFont(v.title_font, base.title_font),
    subtitle_text: cleanText(v.subtitle_text, base.subtitle_text, 360),
    subtitle_size: clamp(v.subtitle_size, 11, 30, base.subtitle_size),
    subtitle_color: cleanHex(v.subtitle_color, base.subtitle_color),
    subtitle_font: cleanFont(v.subtitle_font, base.subtitle_font),
    button_text: cleanText(v.button_text, base.button_text, 100),
    button_size: clamp(v.button_size, 11, 24, base.button_size),
    button_color: cleanHex(v.button_color, base.button_color),
    button_font: cleanFont(v.button_font, base.button_font),
    button_bg: cleanHex(v.button_bg, base.button_bg),
    button_radius: clamp(v.button_radius, 0, 30, base.button_radius),

    card_style: cleanCardStyle(v.card_style, base.card_style),
    card_width: clamp(v.card_width, 440, 620, base.card_width),
    card_radius: clamp(v.card_radius, 0, 48, base.card_radius),
    card_bg: cleanHex(v.card_bg, base.card_bg),
    card_border: cleanHex(v.card_border, base.card_border),
    logo_height: clamp(v.logo_height, 58, 160, base.logo_height),

    login_label_text: cleanText(v.login_label_text, base.login_label_text, 120),
    login_placeholder_text: cleanText(v.login_placeholder_text, base.login_placeholder_text, 120),
    password_label_text: cleanText(v.password_label_text, base.password_label_text, 80),
    password_placeholder_text: cleanText(v.password_placeholder_text, base.password_placeholder_text, 120),
    password_toggle_text: cleanText(v.password_toggle_text, base.password_toggle_text, 40),
    password_hide_text: cleanText(v.password_hide_text, base.password_hide_text, 40),
    remember_text: cleanText(v.remember_text, base.remember_text, 80),
    note_text: cleanText(v.note_text, base.note_text, 220),

    field_label_size: clamp(v.field_label_size, 10, 24, base.field_label_size),
    field_label_color: cleanHex(v.field_label_color, base.field_label_color),
    field_label_font: cleanFont(v.field_label_font, base.field_label_font),
    input_text_size: clamp(v.input_text_size, 11, 24, base.input_text_size),
    input_text_color: cleanHex(v.input_text_color, base.input_text_color),
    input_text_font: cleanFont(v.input_text_font, base.input_text_font),
    input_bg: cleanHex(v.input_bg, base.input_bg),
    input_border: cleanHex(v.input_border, base.input_border),
    input_radius: clamp(v.input_radius, 0, 28, base.input_radius),
    remember_size: clamp(v.remember_size, 10, 22, base.remember_size),
    remember_color: cleanHex(v.remember_color, base.remember_color),
    remember_font: cleanFont(v.remember_font, base.remember_font),
    note_size: clamp(v.note_size, 9, 20, base.note_size),
    note_color: cleanHex(v.note_color, base.note_color),
    note_font: cleanFont(v.note_font, base.note_font)
  };
}
function selectedMedia(studio, legacy, library) {
  if (studio.media_id === "image" && legacy.left_image_url)
    return {
      id: "image",
      kind: "image",
      name: "Sabit Görsel",
      url: legacy.left_image_url,
      thumbnail_url: legacy.left_image_url
    };
  const item = library.find((x) => x.id === studio.media_id);
  if (!item) return { id: "none", kind: "none", name: "Animasyonsuz", url: null, thumbnail_url: null };
  // Katalogdaki `kind` alanı kaynağı belirtir (builtin/uploaded).
  // Giriş tuvali ise render türü olarak `video` bekler. Bu normalizasyon
  // yapılmadığında seçim veritabanına kaydolsa bile gerçek /login sayfasında
  // video gizli kalıyor ve lacivert zemin görünüyordu.
  return {
    ...item,
    source_kind: item.kind,
    kind: "video",
    url: item.url || null,
    thumbnail_url: item.thumbnail_url || null
  };
}

export function getLoginStudioState(tenantId = null) {
  const resolvedTenantId = resolveLoginTenantId(tenantId);
  const legacy = legacyBranding(resolvedTenantId);
  const studio = sanitizeStudio(savedStudio(resolvedTenantId), legacy);
  const catalog = readCatalog(resolvedTenantId, { includeLegacyId: studio.media_id });
  const library = catalog.items.map((item) => ({
    ...item,
    url: mediaUrl(item.filename, item._scope, resolvedTenantId),
    thumbnail_url: mediaUrl(item.thumbnail, item._scope, resolvedTenantId)
  }));
  const selected = selectedMedia(studio, legacy, library);
  if (studio.media_id !== selected.id) studio.media_id = selected.id;
  return {
    tenantId: resolvedTenantId,
    legacy,
    studio,
    library,
    selectedMedia: selected,
    fonts: LOGIN_FONTS,
    cardStyles: LOGIN_CARD_STYLES
  };
}

function persistStudio(tenantId, studio, now = Date.now()) {
  db.prepare(
    "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
  ).run(tenantId, SETTINGS_KEY, JSON.stringify(studio), now);
}
function markPublicLoginTenant(tenantId, now = Date.now()) {
  // This key is only a public-login selector; no business record is deleted.
  db.prepare("UPDATE app_settings SET value_json='false',updated_at=? WHERE key=?").run(
    now,
    PUBLIC_ACTIVE_KEY
  );
  db.prepare(
    "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
  ).run(tenantId, PUBLIC_ACTIVE_KEY, "true", now);
}

function moveFile(source, target) {
  ensureLibraryDir();
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  try {
    fs.renameSync(source, target);
  } catch (error) {
    if (error?.code !== "EXDEV") throw error;
    fs.copyFileSync(source, target);
    fs.unlinkSync(source);
  }
}

export function addUploadedLoginMedia(file, tenantId) {
  if (!file?.path) return null;
  if (!tenantId)
    throw Object.assign(new Error("Animasyon için geçerli firma bulunamadı."), { status: 422, expose: true });
  const catalog = readTenantCatalog(tenantId);
  const ext =
    path.extname(file.originalname || file.filename || "").toLowerCase() === ".webm" ? ".webm" : ".mp4";
  const id = `upload-${crypto.randomUUID()}`;
  const filename = `${id}${ext}`;
  const target = path.join(tenantLibraryDir(tenantId), filename);
  moveFile(file.path, target);
  fs.chmodSync(target, 0o600);
  const item = {
    id,
    name: cleanText(path.parse(file.originalname || "Yeni animasyon").name, "Yeni animasyon", 90),
    filename,
    thumbnail: null,
    kind: "uploaded",
    created_at: Date.now()
  };
  catalog.items.push(item);
  saveTenantCatalog(tenantId, catalog);
  return { ...item, _scope: "tenant", url: mediaUrl(filename, "tenant", tenantId), thumbnail_url: null };
}

export function saveLoginStudio(
  tenantId,
  body,
  { logoUrl = null, leftImageUrl = null, uploadedMedia = null } = {}
) {
  const resolvedTenantId = resolveLoginTenantId(tenantId);
  if (!resolvedTenantId)
    throw Object.assign(new Error("Login tasarımının kaydedileceği firma bulunamadı."), {
      status: 422,
      expose: true
    });
  let payload = {};
  try {
    payload = JSON.parse(String(body?.studio_payload || "{}")) || {};
  } catch {
    payload = {};
  }
  const submitted = { ...body, ...payload };
  const oldLegacy = legacyBranding(resolvedTenantId);
  const previous = sanitizeStudio(savedStudio(resolvedTenantId), oldLegacy);
  const media = uploadedMedia ? addUploadedLoginMedia(uploadedMedia, resolvedTenantId) : null;
  const nextLegacy = {
    logo_url: logoUrl || oldLegacy.logo_url || null,
    left_image_url: leftImageUrl || oldLegacy.left_image_url || null
  };
  const requestedMedia =
    media?.id || cleanId(submitted.selected_media_id || submitted.media_id || previous.media_id);
  const library = readCatalog(resolvedTenantId, { includeLegacyId: requestedMedia }).items;
  const validMedia =
    requestedMedia === "none" ||
    (requestedMedia === "image" && nextLegacy.left_image_url) ||
    library.some((x) => x.id === requestedMedia);
  const studio = sanitizeStudio(
    { ...previous, ...submitted, media_id: validMedia ? requestedMedia : previous.media_id },
    nextLegacy
  );
  const now = Date.now();
  const persist = db.transaction(() => {
    db.prepare(
      `INSERT INTO login_settings(tenant_id,logo_url,left_image_url,overlay_opacity,eyebrow,title,subtitle,left_title,left_text,button_text,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(tenant_id) DO UPDATE SET logo_url=excluded.logo_url,left_image_url=excluded.left_image_url,overlay_opacity=excluded.overlay_opacity,eyebrow=excluded.eyebrow,title=excluded.title,subtitle=excluded.subtitle,left_title=excluded.left_title,left_text=excluded.left_text,button_text=excluded.button_text,updated_at=excluded.updated_at`
    ).run(
      resolvedTenantId,
      nextLegacy.logo_url,
      nextLegacy.left_image_url,
      studio.overlay_opacity,
      studio.eyebrow_text,
      studio.title_text,
      studio.subtitle_text,
      studio.left_title_text,
      studio.left_text_text,
      studio.button_text,
      now
    );
    persistStudio(resolvedTenantId, studio, now);
    markPublicLoginTenant(resolvedTenantId, now);
  });
  persist();
  const verified = sanitizeStudio(savedStudio(resolvedTenantId), nextLegacy);
  if (verified.media_id !== studio.media_id)
    throw Object.assign(new Error("Animasyon seçimi doğrulanamadı; kayıt geri çevrildi."), {
      status: 500,
      expose: true
    });
  const publicTenantId = resolveLoginTenantId(null);
  if (publicTenantId !== resolvedTenantId)
    throw Object.assign(new Error("Kaydedilen login tasarımı genel giriş sayfasına bağlanamadı."), {
      status: 500,
      expose: true
    });
  return { studio: verified, uploaded: media, tenantId: resolvedTenantId, publicTenantId };
}

export function deleteLoginMedia(tenantId, mediaId) {
  const resolvedTenantId = resolveLoginTenantId(tenantId);
  if (!resolvedTenantId) return { deleted: false, reason: "tenant_missing" };
  const id = cleanId(mediaId);
  if (id === "none" || id === "image") return { deleted: false, reason: "protected" };
  const catalog = readCatalog(resolvedTenantId, { persistCleanup: false, includeLegacyId: id });
  const item = catalog.items.find((x) => x.id === id);
  if (!item) return { deleted: false, reason: "missing" };
  const tenantCatalog = catalog.tenantCatalog;
  let quarantined = false;
  if (item._scope === "tenant") {
    const quarantine = path.join(QUARANTINE_DIR, tenantSegment(resolvedTenantId));
    for (const name of [item.filename, item.thumbnail].filter(Boolean)) {
      const safeName = safeFileName(name);
      const full = path.join(tenantLibraryDir(resolvedTenantId), safeName);
      if (!full.startsWith(`${tenantLibraryDir(resolvedTenantId)}${path.sep}`) || !fs.existsSync(full))
        continue;
      moveFile(full, path.join(quarantine, `${Date.now()}-${safeName}`));
      quarantined = true;
    }
    tenantCatalog.items = tenantCatalog.items.filter((x) => x.id !== id);
  } else if (!tenantCatalog.deleted_builtin_ids.includes(id)) {
    tenantCatalog.deleted_builtin_ids.push(id);
  }
  saveTenantCatalog(resolvedTenantId, tenantCatalog);
  const row = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
    .get(resolvedTenantId, SETTINGS_KEY);
  let value;
  try {
    value = JSON.parse(row?.value_json || "{}");
  } catch {
    value = {};
  }
  if (value?.media_id === id) {
    value.media_id = "none";
    db.prepare("UPDATE app_settings SET value_json=?,updated_at=? WHERE tenant_id=? AND key=?").run(
      JSON.stringify(value),
      Date.now(),
      resolvedTenantId,
      SETTINGS_KEY
    );
  }
  return { deleted: true, quarantined, item };
}

export const loginMediaPaths = {
  libraryDir: LIBRARY_DIR,
  catalogFile: CATALOG_FILE,
  tenantLibraryDir: TENANT_LIBRARY_DIR,
  quarantineDir: QUARANTINE_DIR,
  publicPrefix: PUBLIC_PREFIX
};

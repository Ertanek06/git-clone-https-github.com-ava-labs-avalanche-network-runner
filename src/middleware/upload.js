import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../config.js";
import { publicUploadUrl, tenantUploadSegment } from "../services/upload-access.service.js";

const publicRoot = config.publicUploadDir;
const privateRoot = path.resolve(config.privateUploadDir, "live");
const privateImportRoot = path.resolve(config.privateUploadDir, "imports");
fs.mkdirSync(publicRoot, { recursive: true });
fs.mkdirSync(privateRoot, { recursive: true });
fs.mkdirSync(privateImportRoot, { recursive: true });

const imageMime = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/jfif",
  "image/x-jpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/octet-stream"
]);
const imageExts = new Set([".jpg", ".jpeg", ".jfif", ".png", ".webp", ".gif", ".avif"]);
const videoMime = new Set(["video/mp4", "video/webm", "application/octet-stream"]);
const pdfMime = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
  "text/x-pdf",
  "application/octet-stream"
]);
const sheetMime = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "application/zip",
  "application/x-ole-storage",
  "text/plain"
]);
const imageFields = new Set(["image", "logo", "stamp", "signature", "left_image", "operator_avatar"]);
const isImportRowImageField = (field) => /^rows\[\d+\]\[image_file\]$/.test(String(field || ""));
const videoFields = new Set(["login_media"]);
const pdfFields = new Set(["brochure", "ce_certificate", "user_manual"]);
const sheetFields = new Set(["excel"]);
const documentImportFields = new Set(["proforma_file"]);

const extOk = (file, exts) => exts.has(path.extname(file.originalname || "").toLowerCase());
const allowedByField = (file) => {
  const field = String(file.fieldname || "").toLowerCase();
  if (imageFields.has(field) || isImportRowImageField(file.fieldname)) {
    // Windows, iOS ve bazı tarayıcılar aynı gerçek görseli image/jpg,
    // image/x-png veya application/octet-stream olarak bildirebilir.
    // Uzantıyı burada kabul eder, gerçek dosya türünü magic-byte doğrulamasında kesinleştiririz.
    return extOk(file, imageExts) && (!file.mimetype || imageMime.has(String(file.mimetype).toLowerCase()));
  }
  if (videoFields.has(field)) return videoMime.has(file.mimetype) && extOk(file, new Set([".mp4", ".webm"]));
  if (pdfFields.has(field))
    return extOk(file, new Set([".pdf"])) && (pdfMime.has(String(file.mimetype || "").toLowerCase()) || !file.mimetype);
  // Excel dosyalarının MIME bilgisi tarayıcıya ve işletim sistemine göre
  // application/octet-stream veya application/zip gelebilir. Burada uzantıyı
  // kabul eder, gerçek içeriği aşağıdaki magic-byte doğrulamasına bırakırız.
  if (sheetFields.has(field)) return extOk(file, new Set([".csv", ".xls", ".xlsx", ".txt"]));
  if (documentImportFields.has(field)) return extOk(file, new Set([".csv", ".xls", ".xlsx", ".txt", ".pdf"]));
  if (field === "attachment")
    return (
      (imageMime.has(String(file.mimetype || "").toLowerCase()) && extOk(file, imageExts)) ||
      (pdfMime.has(file.mimetype) && extOk(file, new Set([".pdf"])))
    );
  return false;
};
const safeExt = (file) => {
  const ext = path
    .extname(file.originalname || "")
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, "");
  return ext || ".bin";
};
const storageFor = (root, { tenantScoped = false } = {}) =>
  multer.diskStorage({
    destination: (req, _file, cb) => {
      if (!tenantScoped) return cb(null, root);
      if (!req.tenantId)
        return cb(
          Object.assign(new Error("Dosya yüklemek için geçerli firma oturumu bulunamadı."), {
            status: 401,
            expose: true
          })
        );
      const destination = path.join(root, tenantUploadSegment(req.tenantId));
      try {
        fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
      } catch (error) {
        return cb(error);
      }
      return cb(null, destination);
    },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExt(file)}`)
  });
const fileFilter = (_req, file, cb) => {
  if (allowedByField(file)) return cb(null, true);
  const error = new Error("Desteklenmeyen veya alanla uyumsuz dosya türü.");
  error.status = 415;
  error.expose = true;
  cb(error);
};

export const upload = multer({
  storage: storageFor(publicRoot, { tenantScoped: true }),
  limits: { fileSize: 50 * 1024 * 1024, files: 120, fields: 3000, parts: 3200 },
  fileFilter
});

// Ürün katalog/broşür PDF dosyaları saha kullanımında 50 MB sınırını aşabiliyor.
// Nginx canlı limiti 128 MB olduğundan ürün düzenleme akışı için güvenli pay
// bırakarak 120 MB kabul edilir; gerçek dosya tipi aşağıdaki magic-byte
// doğrulamasından yine geçmek zorundadır.
export const productUpload = multer({
  storage: storageFor(publicRoot, { tenantScoped: true }),
  limits: { fileSize: 120 * 1024 * 1024, files: 4, fields: 3000, parts: 3040 },
  fileFilter
});
export const privateUpload = multer({
  storage: storageFor(privateRoot),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter
});
export const documentImportUpload = multer({
  storage: storageFor(privateImportRoot),
  limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 24, parts: 30 },
  fileFilter
});
export const publicFile = (file) => {
  if (!file?.path) return null;
  const relative = path.relative(publicRoot, path.resolve(file.path));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return publicUploadUrl(relative.split(path.sep).join("/")) || null;
};
export const privateFile = (file) => (file ? `private:${file.filename}` : null);
export function resolvePrivateFile(value) {
  const raw = String(value || "");
  if (!raw.startsWith("private:")) return null;
  const name = path.basename(raw.slice(8));
  const full = path.join(privateRoot, name);
  return full.startsWith(`${privateRoot}${path.sep}`) ? full : null;
}

const allFiles = (req) => {
  const out = [];
  if (req.file) out.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) out.push(...req.files);
    else for (const list of Object.values(req.files)) out.push(...[].concat(list || []));
  }
  return out;
};
const firstBytes = (file, size = 1024) => {
  const fd = fs.openSync(file.path, "r");
  try {
    const buffer = Buffer.alloc(size);
    const read = fs.readSync(fd, buffer, 0, size, 0);
    return buffer.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
};
const starts = (buffer, hex) => buffer.subarray(0, hex.length / 2).equals(Buffer.from(hex, "hex"));
const isImageMagic = (buffer) => {
  if (starts(buffer, "ffd8ff")) return true; // JPEG / JFIF
  if (starts(buffer, "89504e470d0a1a0a")) return true; // PNG
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return true;
  const gif = buffer.subarray(0, 6).toString("ascii");
  if (gif === "GIF87a" || gif === "GIF89a") return true;
  // AVIF, ISO-BMFF/ftyp kapsayıcısında avif/avis markası taşır.
  if (buffer.length >= 16 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 16).toString("ascii");
    if (/avif|avis/.test(brand)) return true;
  }
  return false;
};
const isVideoMagic = (buffer, ext) =>
  ext === ".webm"
    ? starts(buffer, "1a45dfa3")
    : buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
const isPdfMagic = (buffer) => {
  const marker = Buffer.from("%PDF-", "ascii");
  const index = buffer.indexOf(marker);
  return index >= 0 && index < 1024;
};
const isOleMagic = (buffer) => starts(buffer, "d0cf11e0a1b11ae1");
function magicOk(file) {
  const buffer = firstBytes(file, 1024);
  const field = String(file.fieldname || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mimetype = String(file.mimetype || "");
  if (imageFields.has(field) || isImportRowImageField(file.fieldname)) return isImageMagic(buffer);
  if (videoFields.has(field)) return isVideoMagic(buffer, ext);
  if (pdfFields.has(field)) return isPdfMagic(buffer);
  if (field === "attachment") return imageMime.has(mimetype) ? isImageMagic(buffer) : isPdfMagic(buffer);
  if (field === "excel")
    return (
      ext === ".csv" ||
      ext === ".txt" ||
      (ext === ".xlsx" && starts(buffer, "504b0304")) ||
      (ext === ".xls" && isOleMagic(buffer)) ||
      buffer.toString("utf8", 0, 32).trimStart().startsWith("<?xml") ||
      buffer.toString("utf8", 0, 32).includes("<Workbook")
    );
  if (field === "proforma_file")
    return (
      isPdfMagic(buffer) ||
      ext === ".csv" ||
      ext === ".txt" ||
      (ext === ".xlsx" && starts(buffer, "504b0304")) ||
      (ext === ".xls" && isOleMagic(buffer)) ||
      buffer.toString("utf8", 0, 32).trimStart().startsWith("<?xml") ||
      buffer.toString("utf8", 0, 32).includes("<Workbook")
    );
  return false;
}
export function cleanupUploadedFiles(req) {
  for (const file of allFiles(req)) {
    if (!file?.path) continue;
    try {
      fs.unlinkSync(file.path);
    } catch {}
  }
}

export function validateUploads(req, _res, next) {
  try {
    for (const file of allFiles(req)) {
      if (!magicOk(file)) {
        try {
          fs.unlinkSync(file.path);
        } catch {}
        const error = new Error("Yüklenen dosyanın gerçek içeriği uzantı/tür bilgisiyle uyumlu değil.");
        error.status = 415;
        error.expose = true;
        throw error;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

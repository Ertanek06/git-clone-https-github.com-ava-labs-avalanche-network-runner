import { Router } from "express";
import crypto from "crypto";
import multer from "multer";
import { db } from "../db/db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { id } from "../utils/id.js";
import {
  backupScopes,
  createBackupPayload,
  backupToXlsxBuffer,
  restoreBackupPayload,
  verifyBackupPayload
} from "../services/data-backup.service.js";
import { ensureOperationalSchema } from "../services/operational-schema.service.js";

const r = Router();
r.use(requireAuth, requirePermission("backups", "admin"));
const en = (req) => req.locale === "en";
const restoreUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const name = String(file.originalname || "").toLowerCase(),
      mime = String(file.mimetype || "");
    if (
      name.endsWith(".json") &&
      (mime.includes("json") || mime === "application/octet-stream" || mime === "text/plain")
    )
      return cb(null, true);
    const error = Object.assign(
      new Error(
        en(req)
          ? "Only an ARTEVA JSON data backup downloaded from this panel is accepted."
          : "Yalnızca panelden indirilmiş ARTEVA JSON veri yedeği kabul edilir."
      ),
      { status: 415, expose: true }
    );
    cb(error);
  }
});
const reminderKey = (userId) => `backup_reminder:${String(userId || "").slice(0, 120)}`;
const readSetting = (tenantId, key, fallback = {}) => {
  const row = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
    .get(tenantId, key);
  try {
    return row ? JSON.parse(row.value_json) : fallback;
  } catch {
    return fallback;
  }
};
const writeSetting = (tenantId, key, value) =>
  db
    .prepare(
      "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
    )
    .run(tenantId, key, JSON.stringify(value), Date.now());
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
function selectedScopes(body) {
  return [
    ...new Set(
      []
        .concat(body.scopes || [])
        .map(String)
        .filter((key) => backupScopes[key])
    )
  ];
}
function history(req) {
  ensureOperationalSchema();
  return db
    .prepare(
      "SELECT * FROM backup_jobs WHERE tenant_id=? AND backup_scope IN ('DATA_JSON','DATA_XLSX','DATA_RESTORE') ORDER BY created_at DESC LIMIT 100"
    )
    .all(req.tenantId);
}
function recordJob(req, { fileName, size, status, note, hash, scope, integrity = "OK" }) {
  db.prepare(
    "INSERT INTO backup_jobs(id,tenant_id,user_id,file_path,file_name,size_bytes,status,note,created_at,sha256,integrity_status,verified_at,backup_scope) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id("bkp"),
    req.tenantId,
    req.user.id,
    "",
    fileName,
    size,
    status,
    note || "",
    Date.now(),
    hash || "",
    integrity,
    Date.now(),
    scope
  );
}
function markBackedUp(req) {
  const current = readSetting(req.tenantId, reminderKey(req.user.id), {});
  writeSetting(req.tenantId, reminderKey(req.user.id), {
    ...current,
    last_backup_at: Date.now(),
    snoozed_until: 0
  });
}

r.get("/", (req, res) => {
  const rows = history(req),
    exports = rows.filter((row) => ["DATA_JSON", "DATA_XLSX"].includes(row.backup_scope)),
    restores = rows.filter((row) => row.backup_scope === "DATA_RESTORE");
  const totalSize = exports.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0);
  res.render("backups/index", {
    title:
      req.locale === "en" ? "Company Data Export and Restore" : "Firma İş Verisi Yedekleme ve Geri Yükleme",
    rows,
    backupScopes,
    summary: { count: exports.length, restoreCount: restores.length, totalSize, latest: exports[0] || null }
  });
});

r.post("/export", async (req, res, next) => {
  try {
    ensureOperationalSchema();
    const scopes = selectedScopes(req.body),
      format = String(req.body.format || "json").toLowerCase() === "xlsx" ? "xlsx" : "json";
    const payload = createBackupPayload({ tenantId: req.tenantId, userId: req.user.id, scopes });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-"),
      base = `ARTEVA-VERI-YEDEGI-${stamp}`;
    const buffer =
      format === "xlsx"
        ? await backupToXlsxBuffer(payload)
        : Buffer.from(JSON.stringify(payload, null, 2), "utf8");
    const fileName = `${base}.${format}`,
      hash = sha256(buffer);
    try {
      recordJob(req, {
        fileName,
        size: buffer.length,
        status: "DOWNLOADED",
        note: `${scopes.map((key) => backupScopes[key].label).join(", ")} · ${format.toUpperCase()}`,
        hash,
        scope: format === "xlsx" ? "DATA_XLSX" : "DATA_JSON"
      });
    } catch (logError) {
      console.error("[data-backup] İndirme geçmişi yazılamadı; dosya indirmesi devam ediyor:", logError);
    }
    try {
      markBackedUp(req);
    } catch (reminderError) {
      console.error("[data-backup] Hatırlatma durumu güncellenemedi:", reminderError);
    }
    try {
      audit(req, {
        action: format === "xlsx" ? "DATA_BACKUP_XLSX_DOWNLOAD" : "DATA_BACKUP_JSON_DOWNLOAD",
        module: "BACKUPS",
        newValue: { fileName, size: buffer.length, sha256: hash, scopes }
      });
    } catch (auditError) {
      console.error("[data-backup] İndirme audit kaydı atlandı:", auditError);
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Type",
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/json; charset=utf-8"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

r.post("/restore", restoreUpload.single("backup_file"), (req, res, next) => {
  try {
    ensureOperationalSchema();
    if (!req.file)
      throw Object.assign(
        new Error(
          en(req)
            ? "No JSON data backup was selected for restore."
            : "Geri yükleme için JSON veri yedeği seçilmedi."
        ),
        { status: 422, expose: true }
      );
    const raw = req.file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw Object.assign(
        new Error(
          en(req)
            ? "The uploaded file does not contain readable JSON."
            : "Yüklenen dosyanın JSON yapısı okunamadı."
        ),
        { status: 422, expose: true }
      );
    }
    const verified = verifyBackupPayload(payload),
      scopes = selectedScopes(req.body);
    const result = restoreBackupPayload({
      tenantId: req.tenantId,
      payload: verified,
      scopes: scopes.length ? scopes : verified.scopes
    });
    const hash = sha256(req.file.buffer),
      note = en(req)
        ? `New: ${result.added}, updated: ${result.updated}`
        : `Yeni: ${result.added}, güncellenen: ${result.updated}`;
    try {
      recordJob(req, {
        fileName: String(req.file.originalname || "ARTEVA-VERI-YEDEGI.json").replace(/[^a-zA-Z0-9._-]/g, "_"),
        size: req.file.size,
        status: "RESTORED",
        note,
        hash,
        scope: "DATA_RESTORE",
        integrity: "OK"
      });
    } catch (logError) {
      console.error("[data-backup] Geri yükleme geçmişi yazılamadı; başarılı işlem korunuyor:", logError);
    }
    try {
      audit(req, {
        action: "DATA_BACKUP_RESTORE_MERGE",
        module: "BACKUPS",
        newValue: { ...result, file: req.file.originalname, sha256: hash }
      });
    } catch (auditError) {
      console.error("[data-backup] Geri yükleme audit kaydı atlandı:", auditError);
    }
    flash(
      req,
      "success",
      en(req)
        ? `The data backup was verified and merged in one transaction. New: ${result.added}, updated: ${result.updated}. Existing records were not deleted.`
        : `Veri yedeği tek işlem içinde doğrulandı ve birleştirildi. Yeni: ${result.added}, güncellenen: ${result.updated}. Mevcut kayıtlar silinmedi.`
    );
    res.redirect(303, "/backups");
  } catch (error) {
    next(error);
  }
});

r.post("/reminder/snooze", (req, res) => {
  const current = readSetting(req.tenantId, reminderKey(req.user.id), {}),
    until = Date.now() + 15 * 24 * 60 * 60 * 1000;
  writeSetting(req.tenantId, reminderKey(req.user.id), { ...current, snoozed_until: until });
  try {
    audit(req, {
      action: "DATA_BACKUP_REMINDER_SNOOZE",
      module: "BACKUPS",
      newValue: { snoozed_until: until }
    });
  } catch (auditError) {
    console.error("[data-backup] Erteleme audit kaydı atlandı:", auditError);
  }
  flash(
    req,
    "success",
    en(req) ? "The backup reminder was postponed for 15 days." : "Yedekleme hatırlatması 15 gün ertelendi."
  );
  res.redirect(303, "/");
});

r.use((error, req, res, next) => {
  if (req.method !== "POST") return next(error);
  const fallback = en(req)
    ? "The backup operation could not be completed."
    : "Yedekleme işlemi tamamlanamadı.";
  let message = error?.expose
    ? String(error.message || fallback)
    : en(req)
      ? "The backup operation could not be completed. Check the file and selected data sections."
      : "Yedekleme işlemi tamamlanamadı. Dosyayı ve seçilen veri bölümlerini kontrol edin.";
  if (error?.code === "LIMIT_FILE_SIZE")
    message = en(req)
      ? "The uploaded data backup exceeds the 100 MB limit."
      : "Yüklenen veri yedeği 100 MB sınırını aşıyor.";
  console.error("[data-backup] İşlem başarısız:", error);
  try {
    audit(req, {
      action: "DATA_BACKUP_OPERATION_FAILED",
      module: "BACKUPS",
      result: "FAIL",
      newValue: {
        path: req.path,
        code: error?.code || "",
        message: String(error?.message || error).slice(0, 500)
      }
    });
  } catch {}
  flash(req, "error", message);
  res.redirect(303, "/backups");
});
export default r;

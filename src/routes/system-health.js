import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { db } from "../db/db.js";
import { config } from "../config.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBackupPayload, verifyBackupPayload } from "../services/data-backup.service.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import { dataIntegrityReport } from "../services/data-integrity.service.js";

const r = Router();
r.use(requireAuth, requireRole("SUPER_ADMIN", "TENANT_ADMIN"));
const canWrite = (p) => {
  try {
    fs.mkdirSync(p, { recursive: true });
    fs.accessSync(p, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};
const command = (name) => {
  const result = spawnSync("sh", ["-lc", `command -v ${name}`], { encoding: "utf8", timeout: 2500 });
  return result.status === 0 ? String(result.stdout || "").trim() : "";
};
const bytes = (n) => {
  const v = Number(n || 0);
  if (v < 1024) return `${v} B`;
  if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1)} MB`;
  return `${(v / 1024 ** 3).toFixed(1)} GB`;
};
function report(req) {
  let dbOk = false,
    integrity = "UNKNOWN",
    migration = 0,
    dbSize = 0,
    lastBackup = null,
    lastRestoreTest = null,
    mailConfigured = false;
  try {
    integrity = String(db.pragma("integrity_check", { simple: true }) || "UNKNOWN");
    dbOk = integrity.toLowerCase() === "ok";
    migration = db.prepare("SELECT MAX(version) version FROM schema_migrations").get()?.version || 0;
    dbSize = fs.statSync(config.dbFile).size;
  } catch {}
  try {
    lastBackup = db
      .prepare(
        "SELECT * FROM backup_jobs WHERE tenant_id=? AND backup_scope IN ('DATA_JSON','DATA_XLSX','SYSTEM') AND status IN ('DOWNLOADED','READY','COMPLETED') ORDER BY created_at DESC LIMIT 1"
      )
      .get(req.tenantId);
  } catch {}
  try {
    lastRestoreTest = db
      .prepare(
        "SELECT * FROM backup_jobs WHERE tenant_id=? AND backup_scope='RESTORE_TEST' ORDER BY created_at DESC LIMIT 1"
      )
      .get(req.tenantId);
  } catch {}
  try {
    const row = db
      .prepare("SELECT host,from_email,is_active FROM smtp_settings WHERE tenant_id=? LIMIT 1")
      .get(req.tenantId);
    mailConfigured = Boolean(Number(row?.is_active) === 1 && row?.host && row?.from_email);
  } catch {}
  let diskFree = 0,
    diskTotal = 0;
  try {
    const stat = fs.statfsSync(config.backupDir);
    diskFree = Number(stat.bavail) * Number(stat.bsize);
    diskTotal = Number(stat.blocks) * Number(stat.bsize);
  } catch {}
  const publicUploads = config.publicUploadDir;
  let dataIntegrity = {
    ok: false,
    referenced_files: 0,
    missing_files: 0,
    orphan_public_files: 0,
    broken_relations: 0,
    relations: {}
  };
  try {
    dataIntegrity = dataIntegrityReport(req.tenantId);
  } catch (error) {
    console.error("[health] data integrity report failed", error);
  }
  return {
    dbOk,
    integrity,
    migration,
    dbSize: bytes(dbSize),
    diskFree: bytes(diskFree),
    diskTotal: bytes(diskTotal),
    memoryFree: bytes(os.freemem()),
    memoryTotal: bytes(os.totalmem()),
    storage: {
      database: canWrite(path.dirname(config.dbFile)),
      uploads: canWrite(config.privateUploadDir) && canWrite(publicUploads),
      backups: canWrite(config.backupDir)
    },
    tools: {
      pdftotext: Boolean(command("pdftotext")),
      tesseract: Boolean(command("tesseract")),
      node: process.version
    },
    mailConfigured,
    lastBackup,
    lastRestoreTest,
    dataIntegrity,
    version: config.appVersion,
    release: config.releaseId,
    buildTime: config.buildTime
  };
}
r.get("/", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.render("system-health/index", {
    title: req.locale === "en" ? "System Health Center" : "Sistem Sağlık Merkezi",
    report: report(req)
  });
});
r.post("/backup-test", (req, res) => {
  try {
    const started = Date.now();
    const payload = createBackupPayload({
      tenantId: req.tenantId,
      userId: req.user.id,
      scopes: ["profiles", "customers", "products", "quotes", "templates"]
    });
    const verified = verifyBackupPayload(JSON.parse(JSON.stringify(payload)));
    const summary = {
      scopes: verified.scopes || [],
      records: Object.fromEntries(
        Object.entries(verified.tables || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      ),
      duration_ms: Date.now() - started
    };
    db.prepare(
      `INSERT INTO backup_jobs(id,tenant_id,user_id,file_path,file_name,size_bytes,status,note,created_at,sha256,integrity_status,verified_at,backup_scope)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      `bkt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      req.tenantId,
      req.user.id,
      "",
      "OTOMATIK-GERI-YUKLEME-TESTI.json",
      Buffer.byteLength(JSON.stringify(payload)),
      "COMPLETED",
      JSON.stringify(summary),
      Date.now(),
      "",
      "OK",
      Date.now(),
      "RESTORE_TEST"
    );
    try {
      audit(req, { action: "BACKUP_RESTORE_DRY_RUN", module: "BACKUPS", newValue: summary });
    } catch {}
    flash(
      req,
      "success",
      req.locale === "en"
        ? "Backup structure was generated, serialized and verified successfully. No live data was changed."
        : "Yedek yapısı üretildi, yeniden okundu ve başarıyla doğrulandı. Canlı veriler değiştirilmedi."
    );
  } catch (error) {
    console.error("[health] backup self-test failed", error);
    flash(
      req,
      "error",
      req.locale === "en" ? "Backup verification failed." : "Yedek doğrulama testi başarısız oldu."
    );
  }
  res.redirect(303, "/system-health");
});
export default r;

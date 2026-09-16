import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const asBool = (v, d = false) =>
  v == null ? d : ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
const asInt = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const isProd = (process.env.NODE_ENV || "development") === "production";
const sessionSecret = process.env.SESSION_SECRET || "CHANGE_ME_NOW";
const dataEncryptionKey = process.env.DATA_ENCRYPTION_KEY || "";
const sharedDir = path.resolve(process.env.SHARED_DIR || path.join(root, "shared"));
if (isProd && (!sessionSecret || /^CHANGE(_|_THIS|_ME)?/i.test(sessionSecret) || sessionSecret.length < 32)) {
  throw new Error(
    "Production ortamında güçlü SESSION_SECRET zorunludur. .env içinde en az 32 karakterlik gizli anahtar tanımlayın."
  );
}
if (isProd && (!dataEncryptionKey || /^CHANGE/i.test(dataEncryptionKey) || dataEncryptionKey.length < 32)) {
  throw new Error(
    "Production ortamında DATA_ENCRYPTION_KEY zorunludur. .env içinde en az 32 karakterlik ayrı bir şifreleme anahtarı tanımlayın."
  );
}
export const config = {
  root,
  appVersion: process.env.APP_VERSION || "3.8.57",
  buildTime: process.env.BUILD_TIME || "2026-08-14T22:30:00+03:00",
  releaseId: "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix",
  buildId: "crmv1.45",
  host: process.env.HOST || "127.0.0.1",
  port: asInt(process.env.PORT, 3120),
  dbFile: path.resolve(root, process.env.DATABASE_FILE || "./data/crm-erp.sqlite"),
  sharedDir,
  publicUploadDir: path.resolve(process.env.PUBLIC_UPLOAD_DIR || path.join(sharedDir, "uploads")),
  privateUploadDir: path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(root, "private-uploads")),
  backupDir: path.resolve(process.env.BACKUP_DIR || path.join(root, "backups")),
  sessionSecret,
  dataEncryptionKey,
  cookieSecure: asBool(process.env.COOKIE_SECURE, isProd),
  sessionHours: asInt(process.env.SESSION_HOURS, 24),
  trustProxy: asInt(process.env.TRUST_PROXY, 1),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "https://crm.artevapp.com.tr").trim().replace(/\/+$/, ""),
  isProd
};

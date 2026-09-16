import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { spawnSync } from "child_process";
import Database from "better-sqlite3";
import { config } from "../src/config.js";

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const outDir = path.resolve(process.env.SAFE || config.backupDir);
const retentionDays = Math.max(1, Number(process.env.RETENTION_DAYS || 365));
const mirrorDir = String(process.env.BACKUP_MIRROR_DIR || "").trim()
  ? path.resolve(process.env.BACKUP_MIRROR_DIR)
  : null;
const publicUploads = config.publicUploadDir;
const sha256File = file => {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let read;
    while ((read = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, read));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
};
const directoryBytes = root => {
  if (!fs.existsSync(root)) return 0;
  let total = 0;
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) total += fs.statSync(full).size;
    }
  };
  walk(root);
  return total;
};
const real = value => {
  try { return fs.realpathSync(value); } catch { return path.resolve(value); }
};
const uploadSources = [
  { name: "uploads", source: publicUploads },
  { name: "private-uploads", source: config.privateUploadDir }
].filter((item, index, rows) =>
  fs.existsSync(item.source) && rows.findIndex(candidate => real(candidate.source) === real(item.source)) === index
);
const listFiles = root => {
  const rows = [];
  const walk = (current, relative = "") => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full, nextRelative);
      else if (entry.isFile()) rows.push({ path: nextRelative, size: fs.statSync(full).size, sha256: sha256File(full) });
    }
  };
  walk(root);
  return rows.sort((a, b) => a.path.localeCompare(b.path));
};
async function encryptBundle(source, target) {
  const secret = String(process.env.BACKUP_ENCRYPTION_KEY || config.dataEncryptionKey || "");
  if (secret.length < 32) throw new Error("Tam sistem yedeği için en az 32 karakterlik DATA_ENCRYPTION_KEY veya BACKUP_ENCRYPTION_KEY zorunludur.");
  const magic = Buffer.from("ARTEVA_FULL_BACKUP_V1\n", "utf8");
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secret, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const output = fs.createWriteStream(target, { mode: 0o600 });
  output.write(Buffer.concat([magic, salt, iv]));
  await pipeline(fs.createReadStream(source), cipher, output);
  fs.appendFileSync(target, cipher.getAuthTag());
  fs.chmodSync(target, 0o600);
}
function mirrorFiles(files) {
  if (!mirrorDir) return null;
  if (real(mirrorDir) === real(outDir)) return { directory: mirrorDir, skipped: "same_directory" };
  fs.mkdirSync(mirrorDir, { recursive: true, mode: 0o700 });
  fs.accessSync(mirrorDir, fs.constants.R_OK | fs.constants.W_OK);
  for (const source of files) {
    const target = path.join(mirrorDir, path.basename(source));
    const partial = `${target}.${process.pid}.part`;
    fs.copyFileSync(source, partial);
    fs.chmodSync(partial, 0o600);
    fs.renameSync(partial, target);
  }
  return { directory: mirrorDir, files: files.map(file => path.basename(file)) };
}

fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
if (!fs.existsSync(config.dbFile)) {
  console.error(`Veritabanı bulunamadı: ${config.dbFile}`);
  process.exit(1);
}

const dbStat = fs.statSync(config.dbFile);
const uploadBytes = uploadSources.reduce((sum, item) => sum + directoryBytes(item.source), 0);
const disk = fs.statfsSync(outDir);
const free = Number(disk.bavail) * Number(disk.bsize);
const required = Math.max(dbStat.size * 3 + uploadBytes * 2, 100 * 1024 * 1024);
if (free < required) {
  console.error(`Yetersiz disk alanı. Gerekli: ${required}, kullanılabilir: ${free}`);
  process.exit(1);
}

const output = path.join(outDir, `crm-erp-${stamp}.sqlite`);
const source = new Database(config.dbFile, { readonly: false, fileMustExist: true });
try {
  source.pragma("busy_timeout = 10000");
  await source.backup(output);
} finally {
  source.close();
}

const verify = new Database(output, { readonly: true, fileMustExist: true });
let integrity;
try {
  integrity = String(verify.pragma("integrity_check", { simple: true }) || "").toLowerCase();
  if (integrity !== "ok") throw new Error(`SQLite integrity_check başarısız: ${integrity}`);
  const foreignKeyErrors = verify.pragma("foreign_key_check");
  if (foreignKeyErrors.length) throw new Error(`SQLite foreign_key_check ${foreignKeyErrors.length} hata bildirdi.`);
} finally {
  verify.close();
}

const dbSha256 = sha256File(output);
fs.writeFileSync(`${output}.sha256`, `${dbSha256}  ${path.basename(output)}\n`, { mode: 0o600 });
fs.chmodSync(output, 0o600);

const stage = fs.mkdtempSync(path.join(outDir, `.full-backup-${stamp}-`));
const tarFile = path.join(outDir, `crm-erp-full-${stamp}.tar.gz`);
const encryptedFile = `${tarFile}.enc`;
const encryptedPartial = `${encryptedFile}.${process.pid}.part`;
let bundleSha256 = "";
let manifest = null;
try {
  fs.copyFileSync(output, path.join(stage, "database.sqlite"));
  fs.chmodSync(path.join(stage, "database.sqlite"), 0o600);
  for (const item of uploadSources) {
    fs.cpSync(item.source, path.join(stage, item.name), {
      recursive: true,
      dereference: true,
      preserveTimestamps: true,
      errorOnExist: false
    });
  }
  manifest = {
    format: "ARTEVA_FULL_SYSTEM_BACKUP",
    version: 1,
    created_at: new Date().toISOString(),
    application: { version: config.appVersion, release: config.releaseId },
    database: { integrity: "ok", sha256: dbSha256 },
    includes: ["database.sqlite", ...uploadSources.map(item => item.name)],
    files: listFiles(stage)
  };
  fs.writeFileSync(path.join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  const tar = spawnSync("tar", ["-czf", tarFile, "-C", stage, "."], { encoding: "utf8", timeout: 30 * 60 * 1000 });
  if (tar.status !== 0) throw new Error(`Tam sistem yedeği paketlenemedi: ${String(tar.stderr || tar.stdout || "tar hatası").trim()}`);
  await encryptBundle(tarFile, encryptedPartial);
  fs.renameSync(encryptedPartial, encryptedFile);
  bundleSha256 = sha256File(encryptedFile);
  fs.writeFileSync(`${encryptedFile}.sha256`, `${bundleSha256}  ${path.basename(encryptedFile)}\n`, { mode: 0o600 });
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
  fs.rmSync(tarFile, { force: true });
  fs.rmSync(encryptedPartial, { force: true });
}

const mirrored = mirrorFiles([encryptedFile, `${encryptedFile}.sha256`]);
const cutoff = Date.now() - retentionDays * 86400000;
for (const name of fs.readdirSync(outDir)) {
  if (!/^crm-erp-(?:full-)?\d{8}-\d{6}\.(?:sqlite|tar\.gz\.enc)(?:\.sha256)?$/.test(name)) continue;
  const file = path.join(outDir, name);
  if (fs.statSync(file).mtimeMs < cutoff) fs.rmSync(file, { force: true });
}

console.log(JSON.stringify({
  ok: true,
  file: output,
  sha256: dbSha256,
  integrity: "ok",
  full_bundle: encryptedFile,
  full_bundle_sha256: bundleSha256,
  full_bundle_files: manifest?.files?.length || 0,
  upload_bytes: uploadBytes,
  encrypted: true,
  mirrored,
  retention_days: retentionDays
}));

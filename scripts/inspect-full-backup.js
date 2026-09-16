import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { spawnSync } from "child_process";
import Database from "better-sqlite3";
import { config } from "../src/config.js";

const args = Object.fromEntries(process.argv.slice(2).map((value, index, rows) =>
  value.startsWith("--") ? [value.slice(2), rows[index + 1] && !rows[index + 1].startsWith("--") ? rows[index + 1] : "1"] : null
).filter(Boolean));
const input = args.file ? path.resolve(args.file) : "";
const destination = args.out ? path.resolve(args.out) : "";
const magic = Buffer.from("ARTEVA_FULL_BACKUP_V1\n", "utf8");
if (!input || !destination) throw new Error("Kullanım: node scripts/inspect-full-backup.js --file YEDEK.tar.gz.enc --out /guvenli/inceleme-dizini");
if (!fs.existsSync(input) || !fs.statSync(input).isFile()) throw new Error(`Yedek dosyası bulunamadı: ${input}`);
if (destination === path.parse(destination).root || destination === path.resolve(config.root) || fs.existsSync(destination)) {
  throw new Error("İnceleme hedefi mevcut olmayan, boş ve özel bir dizin olmalıdır.");
}
const secret = String(process.env.BACKUP_ENCRYPTION_KEY || config.dataEncryptionKey || "");
if (secret.length < 32) throw new Error("Yedeği açmak için doğru DATA_ENCRYPTION_KEY veya BACKUP_ENCRYPTION_KEY gereklidir.");
const size = fs.statSync(input).size;
if (size <= magic.length + 16 + 12 + 16) throw new Error("Yedek dosyası eksik veya geçersiz.");
const fd = fs.openSync(input, "r");
const header = Buffer.alloc(magic.length + 16 + 12), tag = Buffer.alloc(16);
try {
  fs.readSync(fd, header, 0, header.length, 0);
  fs.readSync(fd, tag, 0, tag.length, size - tag.length);
} finally {
  fs.closeSync(fd);
}
if (!header.subarray(0, magic.length).equals(magic)) throw new Error("Dosya ARTEVA tam sistem yedeği değil.");
const salt = header.subarray(magic.length, magic.length + 16);
const iv = header.subarray(magic.length + 16);
const key = crypto.scryptSync(secret, salt, 32);
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(tag);
fs.mkdirSync(destination, { recursive: false, mode: 0o700 });
const tarFile = path.join(destination, ".verified-backup.tar.gz");
try {
  await pipeline(
    fs.createReadStream(input, { start: header.length, end: size - tag.length - 1 }),
    decipher,
    fs.createWriteStream(tarFile, { mode: 0o600 })
  );
  const extracted = path.join(destination, "contents");
  fs.mkdirSync(extracted, { mode: 0o700 });
  const tar = spawnSync("tar", ["-xzf", tarFile, "-C", extracted, "--no-same-owner", "--no-same-permissions"], { encoding: "utf8", timeout: 30 * 60 * 1000 });
  if (tar.status !== 0) throw new Error(`Yedek açılamadı: ${String(tar.stderr || tar.stdout || "tar hatası").trim()}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(extracted, "manifest.json"), "utf8"));
  if (manifest?.format !== "ARTEVA_FULL_SYSTEM_BACKUP" || Number(manifest.version) !== 1) throw new Error("Tam sistem yedeği manifesti geçersiz.");
  for (const item of manifest.files || []) {
    const file = path.resolve(extracted, item.path);
    if (!file.startsWith(`${extracted}${path.sep}`) || !fs.existsSync(file)) throw new Error(`Yedekte eksik dosya: ${item.path}`);
    const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    if (actual !== item.sha256) throw new Error(`Dosya bütünlük hatası: ${item.path}`);
  }
  const database = new Database(path.join(extracted, "database.sqlite"), { readonly: true, fileMustExist: true });
  const integrity = String(database.pragma("integrity_check", { simple: true }) || "").toLowerCase();
  const foreignKeys = database.pragma("foreign_key_check");
  database.close();
  if (integrity !== "ok" || foreignKeys.length) throw new Error("Yedek veritabanı bütünlük kontrolünden geçemedi.");
  console.log(JSON.stringify({ ok: true, destination: extracted, files: manifest.files?.length || 0, database_integrity: "ok" }, null, 2));
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  fs.rmSync(tarFile, { force: true });
}

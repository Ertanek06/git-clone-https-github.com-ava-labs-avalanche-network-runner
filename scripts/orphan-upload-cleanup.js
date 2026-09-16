import fs from "fs";
import path from "path";
import { db } from "../src/db/db.js";
import { config } from "../src/config.js";
const apply = process.argv.includes("--apply");
const minAgeDays = Math.max(7, Number(process.env.ORPHAN_MIN_AGE_DAYS || 30));
const root = config.publicUploadDir;
const quarantineRoot = path.resolve(config.privateUploadDir, "quarantine", "orphan-uploads");
const refs = new Set();
const add = value => {
  const raw = String(value || "");
  const marker = "/public/uploads/";
  const i = raw.indexOf(marker);
  if (i < 0) return;
  let relative = raw.slice(i + marker.length).split(/[?#]/, 1)[0].replaceAll("\\", "/");
  try { relative = decodeURIComponent(relative); } catch { return; }
  relative = path.posix.normalize(relative).replace(/^\/+/, "");
  if (relative && !relative.startsWith("../")) refs.add(relative);
};
const sources = [
  ["profiles", ["logo_url", "stamp_url", "signature_url", "left_image_url"]],
  ["customers", ["logo_url"]],
  ["products", ["image_url", "brochure_url", "ce_certificate_url", "manual_url", "image_path", "brochure_path", "ce_certificate_path", "manual_path"]],
  ["live_sites", ["operator_avatar_url"]],
  ["login_settings", ["logo_url", "left_image_url"]]
];
for (const [table, wanted] of sources) {
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if (!exists) continue;
  const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(x => x.name));
  const selected = wanted.filter(x => columns.has(x));
  if (!selected.length) continue;
  for (const row of db.prepare(`SELECT ${selected.join(",")} FROM ${table}`).all()) for (const value of Object.values(row)) add(value);
}
const cutoff = Date.now() - minAgeDays * 86_400_000;
const files = [];
const walk = (dir, relative = "") => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (rel === "login-library" || rel.startsWith("login-library/") || rel === ".quarantine" || rel.startsWith(".quarantine/")) continue;
      walk(path.join(dir, entry.name), rel);
    } else if (entry.isFile()) files.push({ path: path.join(dir, entry.name), relative: rel });
  }
};
walk(root);
const orphan = files.filter(file => !refs.has(file.relative) && fs.statSync(file.path).mtimeMs < cutoff);
let quarantined = 0;
if (apply) {
  fs.mkdirSync(quarantineRoot, { recursive: true, mode: 0o700 });
  for (const file of orphan) {
    const target = path.join(quarantineRoot, `${Date.now()}-${file.relative.replaceAll("/", "__")}`);
    try { fs.renameSync(file.path, target); }
    catch (error) {
      if (error?.code !== "EXDEV") throw error;
      fs.copyFileSync(file.path, target);
      fs.unlinkSync(file.path);
    }
    fs.chmodSync(target, 0o600);
    quarantined++;
  }
}
console.log(JSON.stringify({ mode: apply ? "QUARANTINE" : "DRY_RUN", referenced: refs.size, scanned_files: files.length, orphan_candidates: orphan.length, quarantined, min_age_days: minAgeDays, quarantine_root: apply ? quarantineRoot : null }, null, 2));
if (!apply) console.log("Değişiklik uygulanmadı. Uygulamak için: node scripts/orphan-upload-cleanup.js --apply");
db.close();

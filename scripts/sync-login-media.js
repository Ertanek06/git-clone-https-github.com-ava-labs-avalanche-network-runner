import fs from "fs";
import path from "path";
import crypto from "crypto";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envFile = path.join(root, ".env");
const env = {};
try {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
} catch {}
const sharedRaw = process.env.SHARED_DIR || env.SHARED_DIR || path.join(root, "shared");
const sharedDir = path.isAbsolute(sharedRaw) ? sharedRaw : path.resolve(root, sharedRaw);
const seedRoot = path.resolve(process.env.SEED_LOGIN_MEDIA_DIR || path.join(root, "seed-login-media"));
const libraryDir = path.join(sharedDir, "uploads", "login-library");
const catalogFile = path.join(libraryDir, "catalog.json");
const pruneSeed = process.argv.includes("--prune-seed");
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };
const atomicWrite = (file, value) => {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
};

fs.mkdirSync(libraryDir, { recursive: true, mode: 0o700 });
const seed = readJson(path.join(seedRoot, "catalog.json"), { version: 1, items: [] });
const current = readJson(catalogFile, { version: 1, items: [], deleted_builtin_ids: [] });
const deleted = new Set(Array.isArray(current.deleted_builtin_ids) ? current.deleted_builtin_ids : []);
const itemsById = new Map((Array.isArray(current.items) ? current.items : []).map(item => [item.id, item]));
let copied = 0;
let updated = 0;
let retained = 0;
const digest = file => {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let read = 0;
    while ((read = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, read));
  } finally { fs.closeSync(fd); }
  return hash.digest("hex");
};
const sameFile = (a, b) => {
  try {
    const sa = fs.statSync(a), sb = fs.statSync(b);
    return sa.size === sb.size && digest(a) === digest(b);
  } catch { return false; }
};
const replaceFile = (source, target) => {
  const temp = `${target}.${process.pid}.tmp`;
  fs.copyFileSync(source, temp);
  fs.chmodSync(temp, 0o600);
  fs.renameSync(temp, target);
};

for (const item of Array.isArray(seed.items) ? seed.items : []) {
  if (!item?.id || deleted.has(item.id)) continue;
  const mediaSource = path.join(seedRoot, path.basename(item.filename || ""));
  const mediaTarget = path.join(libraryDir, path.basename(item.filename || ""));
  const thumbSource = item.thumbnail ? path.join(seedRoot, path.basename(item.thumbnail)) : null;
  const thumbTarget = item.thumbnail ? path.join(libraryDir, path.basename(item.thumbnail)) : null;
  const previousItem = itemsById.get(item.id);
  if (fs.existsSync(mediaSource) && !fs.existsSync(mediaTarget)) { replaceFile(mediaSource, mediaTarget); copied += 1; }
  else if (fs.existsSync(mediaSource) && fs.existsSync(mediaTarget) && !sameFile(mediaSource, mediaTarget)) { replaceFile(mediaSource, mediaTarget); updated += 1; }
  else if (fs.existsSync(mediaTarget)) retained += 1;
  if (thumbSource && fs.existsSync(thumbSource) && (!fs.existsSync(thumbTarget) || !sameFile(thumbSource, thumbTarget))) replaceFile(thumbSource, thumbTarget);
  if (fs.existsSync(mediaTarget)) {
    itemsById.set(item.id, { ...item, kind: "builtin", created_at: Number(previousItem?.created_at) || Date.now() });
    if (previousItem?.kind === "builtin" && previousItem.filename && path.basename(previousItem.filename) !== path.basename(item.filename)) {
      const oldTarget = path.join(libraryDir, path.basename(previousItem.filename));
      try { fs.unlinkSync(oldTarget); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    }
  }
}

const knownFiles = new Set([...itemsById.values()].flatMap(item => [item.filename, item.thumbnail].filter(Boolean)));
for (const entry of fs.readdirSync(libraryDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.(mp4|webm)$/i.test(entry.name) || knownFiles.has(entry.name)) continue;
  const id = `recovered-${entry.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 70)}`;
  if (!itemsById.has(id)) itemsById.set(id, { id, name: path.parse(entry.name).name, filename: entry.name, thumbnail: null, kind: "uploaded", created_at: Date.now() });
}

const items = [...itemsById.values()].filter(item => item?.filename && fs.existsSync(path.join(libraryDir, path.basename(item.filename))));
atomicWrite(catalogFile, { version: 1, items, deleted_builtin_ids: [...deleted] });
if (pruneSeed && fs.existsSync(seedRoot)) fs.rmSync(seedRoot, { recursive: true, force: true });
console.log(`LOGIN_MEDIA_SYNC_COMPLETE copied=${copied} updated=${updated} retained=${retained} available=${items.length} root=${libraryDir}`);

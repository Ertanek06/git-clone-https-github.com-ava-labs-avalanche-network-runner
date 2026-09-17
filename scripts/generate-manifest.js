// crmv1.46 — teslim paketi bütünlük listesi.
// MANIFEST.sha256 elle güncellenmez: build sonrası bu script çalışır ve
// paketin gerçek içeriğini yazar. Böylece "listede var ama pakette yok" ya da
// "checksum tutmuyor" durumu bir daha oluşmaz.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipDirs = new Set(["node_modules", ".git", "data", "backups", "private-uploads", "logs", "releases"]);
const skipFiles = new Set(["MANIFEST.sha256"]);

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && !skipFiles.has(rel)) {
      out.push(rel);
    }
  }
  return out;
};

const files = walk(root).sort();
const lines = files.map(
  (rel) =>
    `${crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, rel)))
      .digest("hex")}  ./${rel}`
);
fs.writeFileSync(path.join(root, "MANIFEST.sha256"), `${lines.join("\n")}\n`);
console.log(`manifest written: ${files.length} files`);

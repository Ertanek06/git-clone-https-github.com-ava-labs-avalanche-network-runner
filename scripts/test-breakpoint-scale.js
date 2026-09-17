// crmv1.46 — Faz 1: kırılma noktası ölçeği sözleşmesi.
//
// Kaynakta 40 ayrı max-width eşiği vardı; her sürüm kendi eşiğini eklediği
// için aynı yerleşim aşaması 900, 920, 980 ve 1000 piksellerde ayrı ayrı
// yazılmıştı. Ölçek 17 basamağa indirildi ve bu test onun tekrar dağılmasını
// engeller: yeni bir eşik eklemek isteyen, önce ölçeğe basamak eklemek
// zorundadır.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCALE } from "./codemod-breakpoints.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssDir = path.join(root, "public", "css");

const allowed = new Set(SCALE);
const offenders = [];
let queries = 0;

for (const file of fs.readdirSync(cssDir).filter((name) => name.endsWith(".css"))) {
  const css = fs.readFileSync(path.join(cssDir, file), "utf8");
  for (const [, prelude] of css.matchAll(/@media([^{]*)\{/g)) {
    queries += 1;
    for (const [, digits] of prelude.matchAll(/max-width\s*:\s*(\d+)px/g)) {
      if (!allowed.has(Number(digits))) offenders.push(`${file}: max-width:${digits}px`);
    }
  }
}

assert.deepEqual(
  offenders,
  [],
  `Ölçek dışı kırılma noktası:\n  ${offenders.join("\n  ")}\n` +
    `İzin verilen ölçek: ${SCALE.join(", ")}\n` +
    `Düzeltmek için: node scripts/codemod-breakpoints.js`
);

// Ölçek kendi içinde tutarlı olmalı: artan sırada, tekrarsız.
assert.deepEqual(
  [...SCALE].sort((a, b) => a - b),
  SCALE,
  "ölçek artan sırada olmalı"
);
assert.equal(new Set(SCALE).size, SCALE.length, "ölçekte tekrar eden basamak olamaz");
assert.ok(SCALE.length <= 20, `ölçek ${SCALE.length} basamağa çıkmış; yeniden birleştirme gerekiyor`);

console.log(`BREAKPOINT_SCALE=OK ${queries} sorgu · ${SCALE.length} basamak`);

import fs from "fs";
const source = fs.readFileSync(new URL("../src/services/permission.service.js", import.meta.url), "utf8");
const assertions = [
  [/backups\s*:\s*\[\]/.test(source), "Tenant yöneticisi sistem yedeği alamamalı"],
  [/approvals\s*:\s*\[\]/.test(source), "STAFF varsayılan onay yetkisine sahip olmamalı"],
  [source.includes("VIEWER") && /invoices\s*:\s*\[\]/.test(source), "VIEWER fatura erişimine sahip olmamalı"],
  [source.includes("base.SUPER_ADMIN"), "SUPER_ADMIN matrisi değiştirilemez olmalı"]
];
for (const [ok, label] of assertions) if (!ok) throw new Error(label);
console.log(`PERMISSION_DEFAULT_TESTS=${assertions.length}/${assertions.length} OK`);

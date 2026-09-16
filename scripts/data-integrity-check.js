import { db } from "../src/db/db.js";
import { dataIntegrityReport } from "../src/services/data-integrity.service.js";

const tenantArgIndex = process.argv.indexOf("--tenant");
const tenantId = tenantArgIndex >= 0 ? String(process.argv[tenantArgIndex + 1] || "") : String(process.env.TENANT_ID || "");
if (!tenantId) throw new Error("Firma kimliği gerekli: npm run integrity:check -- --tenant TENANT_ID");
const tenant = db.prepare("SELECT id,name FROM tenants WHERE id=?").get(tenantId);
if (!tenant) throw new Error(`Firma bulunamadı: ${tenantId}`);
const report = dataIntegrityReport(tenantId);
console.log(JSON.stringify({ tenant, ...report }, null, 2));
db.close();
if (!report.ok) process.exitCode = 2;

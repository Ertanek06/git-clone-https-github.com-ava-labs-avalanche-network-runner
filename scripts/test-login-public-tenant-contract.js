import fs from "fs";
const service = fs.readFileSync(new URL("../src/services/login-studio.service.js", import.meta.url), "utf8");
for (const token of [
  'PUBLIC_ACTIVE_KEY = "login_studio_public_active"',
  "WHERE key=? AND value_json='true'",
  "WHERE key=? ORDER BY updated_at DESC LIMIT 1",
  "markPublicLoginTenant(resolvedTenantId, now)",
  "publicTenantId !== resolvedTenantId"
]) if (!service.includes(token)) throw new Error(`Public login tenant contract missing: ${token}`);
const markerIndex = service.indexOf("const marked =");
const envIndex = service.indexOf("const envTenant =");
if (markerIndex < 0 || envIndex < 0 || markerIndex > envIndex) throw new Error("Public marker must be resolved before TENANT_ID");
console.log("LOGIN_PUBLIC_TENANT_CONTRACT=6/6 OK");

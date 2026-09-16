import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { db } from "../src/db/db.js";
import { addUploadedLoginMedia,deleteLoginMedia,getLoginStudioState,loginMediaPaths } from "../src/services/login-studio.service.js";
import { createAssetGrant,normalizeUploadRelative,tenantUploadSegment,verifyAssetGrant } from "../src/services/upload-access.service.js";

const source = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const server = source("src/server.js");
const auth = source("src/routes/auth.js");
const recovery = source("src/routes/recovery.js");
const health = source("src/routes/system-health.js");
const orphan = source("scripts/orphan-upload-cleanup.js");
const layout = source("views/layout.ejs");
const sidebar = source("views/partials/sidebar.ejs");
const assetBuild = source("scripts/build-assets.js");

assert.match(server, /app\.use\(\s*["']\/public\/uploads["']\s*,\s*sessionMiddleware\s*,\s*authorizeUploadRequest/);
assert.doesNotMatch(server, /Access-Control-Allow-Origin["']\s*,\s*["']\*/);
assert.match(auth, /genericLoginError/);
assert.doesNotMatch(auth, /failures\s*>=\s*5/);
assert.match(recovery, /WHERE tenant_id=@tenantId AND COALESCE\(deleted_at,0\)<>0/);
assert.doesNotMatch(recovery, /DELETE\s+FROM/i);
assert.match(health, /FROM smtp_settings WHERE tenant_id=\?/);
assert.match(health, /fs\.statfsSync\(config\.backupDir\)/);
assert.match(orphan, /quarantineRoot/);
assert.doesNotMatch(orphan, /fs\.unlinkSync\(path\.join\(root/);
assert.match(layout, /assetBundle\.styles/);
assert.match(assetBuild, /ui-integrity-v3817\.css/);
assert.match(sidebar, /href="\/recovery"/);

const grant = createAssetGrant({ tenantId: "ten_test", scope: "quote", quoteId: "quo_test", ttlMs: 60_000 });
assert.deepEqual(verifyAssetGrant(grant)?.quoteId, "quo_test");
assert.equal(verifyAssetGrant(`${grant}x`), null);
assert.equal(normalizeUploadRelative("../../etc/passwd"), "");
assert.equal(tenantUploadSegment("tenant-a"), "tenant-a");

const now = Date.now();
for (const tenantId of ["ten_v3816_a", "ten_v3816_b"]) {
  db.prepare(`INSERT OR IGNORE INTO tenants(id,name,slug,status,plan,created_at,updated_at)
    VALUES(?,?,?,'ACTIVE','PRO',?,?)`).run(tenantId, tenantId, tenantId, now, now);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v3816-media-"));
try {
  const mediaPath = path.join(temp, "tenant-a.mp4");
  fs.writeFileSync(mediaPath, Buffer.from("00000018667479706d703432", "hex"));
  const uploaded = addUploadedLoginMedia({ path: mediaPath, originalname: "tenant-a.mp4", filename: "tenant-a.mp4" }, "ten_v3816_a");
  assert.ok(uploaded?.id);
  assert.ok(getLoginStudioState("ten_v3816_a").library.some(item => item.id === uploaded.id));
  assert.ok(!getLoginStudioState("ten_v3816_b").library.some(item => item.id === uploaded.id));
  const removed = deleteLoginMedia("ten_v3816_a", uploaded.id);
  assert.equal(removed.deleted, true);
  assert.equal(removed.quarantined, true);
  assert.ok(fs.existsSync(loginMediaPaths.quarantineDir));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("V3816_SECURITY_RECOVERY=23/23 OK");

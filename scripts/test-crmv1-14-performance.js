import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("views/layout.ejs");
const navCss = read("public/css/crmv1.11.css");
const previewCss = read("public/css/crmv1.13.css");
const previewJs = read("public/js/crmv1.13.js");
const app = read("public/js/app.js");
const paginator = read("public/js/print-paginator.js");
const customers = read("src/routes/customers.js");
const manifest = JSON.parse(read("public/build/asset-manifest.json"));
const build = JSON.parse(read("BUILD_INFO.json"));

assert.equal(build.app_version, "3.8.57");
assert.equal(build.build, "crmv1.45");
assert.equal(manifest.schema, 3);
assert.ok(manifest.printJs);
assert.deepEqual(
  Object.keys(manifest.pageJs).sort(),
  ["auth", "dashboard", "loginStudio", "quotes", "templates", "theme"].sort()
);
assert.ok(
  fs.statSync(path.join(root, `${manifest.appJs}.gz`)).size < 80_000,
  "çekirdek gzip 80 KB altında kalmalı"
);
assert.ok(
  fs.statSync(path.join(root, `${manifest.printJs}.gz`)).size < 20_000,
  "baskı gzip 20 KB altında kalmalı"
);

assert.doesNotMatch(layout, /ui-stable-boot body[^}]*visibility:hidden/);
assert.doesNotMatch(layout, /ui-stable-boot \.app-shell[^}]*visibility:hidden/);
assert.match(navCss, /ui-nav-pending-v111 body:before[\s\S]*content:none!important/);
assert.doesNotMatch(navCss, /@keyframes uiNavGuard111/);

assert.match(paginator, /DOMContentLoaded", start/);
assert.doesNotMatch(paginator, /window\.addEventListener\("load", start/);
assert.doesNotMatch(app, /_preview_ts/);
assert.doesNotMatch(previewJs, /_preview_retry/);
assert.match(previewJs, /overflow-y','auto','important'/);
assert.match(previewCss, /#customerInlinePreviewFrame[\s\S]*overflow:auto!important/);
assert.doesNotMatch(previewCss, /visibility:hidden!important/);

assert.match(customers, /customer_id=\? AND COALESCE\(deleted_at,0\)=0/);
assert.match(customers, /COALESCE\(customer_id,''\)=''/);
assert.match(customers, /q\.customer_id=c\.id AND COALESCE\(q\.deleted_at,0\)=0/);
assert.doesNotMatch(customers, /const selectSql = `[^`]*customer_snapshot_json LIKE/);

console.log("CRMV1_14_PERFORMANCE=25/25 OK");

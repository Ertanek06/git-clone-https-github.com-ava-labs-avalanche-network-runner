import assert from "node:assert/strict";
import fs from "node:fs";
import { contrastRatio, sanitizeThemeCss, sidebarCatalog, themes } from "../src/services/theme.service.js";

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const build=JSON.parse(read("BUILD_INFO.json"));
const migration=read("src/db/migrate.js");
const operational=read("src/services/operational-schema.service.js");
const publicQuotes=read("src/routes/public-quotes.js");
const dashboard=read("src/routes/dashboard.js");
const quotes=read("src/routes/quotes.js");
const paginator=read("public/js/print-paginator.js");
const server=read("src/server.js");
const sidebarView=read("views/partials/sidebar.ejs");
const sidebarJs=read("public/js/crmv1.7.js");
const topbar=read("views/partials/topbar.ejs");
const layout=read("views/layout.ejs");
const assetBuild=read("scripts/build-assets.js");
const rateLimit=read("src/middleware/rate-limit.js");
const install=read("KURULUM_KOMUTU.txt");
const assetManifest=JSON.parse(read("public/build/asset-manifest.json"));

assert.equal(pkg.version,"3.8.57");
assert.equal(build.package,"crmv1.45");
assert.equal(build.build,"crmv1.45");
assert.equal(build.release,"v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");

assert.match(migration,/\[\s*44\s*,\s*\(\)\s*=>/);
assert.match(migration,/quote_view_events["']\s*,\s*["']event_type/);
assert.match(migration,/quote_view_events["']\s*,\s*["']page_view_id/);
assert.match(migration,/idx_quote_view_events_page/);
assert.match(migration,/approved_at/);
assert.match(operational,/trg_quotes_stage_timestamps/);

assert.match(publicQuotes,/r\.post\(["']\/:token\/view["']/);
assert.match(publicQuotes,/recordHumanView/);
assert.match(publicQuotes,/["']HUMAN_VIEW["']\s*,\s*pageViewId/);
const publicGetStart=publicQuotes.search(/r\.get\(["']\/:token["']/);
const publicGet=publicQuotes.slice(publicGetStart);
assert.doesNotMatch(publicGet,/recordHumanView|view_count=view_count\+1/);
assert.match(paginator,/visibilityState!=="visible"/);
assert.match(paginator,/get\("print"\)==="1"/);
assert.match(paginator,/page_view_id:pageViewId/);
assert.match(dashboard,/COALESCE\(e\.event_type,'HUMAN_VIEW'\)='HUMAN_VIEW'/);

assert.match(dashboard,/istanbulMonthStartEpoch/);
assert.match(dashboard,/COALESCE\(delivered_at,ordered_at,approved_at,0\)>=\?/);
assert.match(dashboard,/stats\.won\s*\+\s*stats\.lost/);
assert.doesNotMatch(dashboard,/monthApprovedTry:[^\n]*updated_at>=/);
assert.doesNotMatch(quotes,/workflowSql[\s\S]{0,500}LIMIT 250/);
assert.match(quotes,/X-Total-Count/);
assert.match(quotes,/showAll\s*=\s*String\(req\.query\.show\s*\|\|\s*["']["']\)/);

assert.equal(themes.length,35);
for(const theme of themes){
  for(const key of ["sidebar_key","icon_pack","density","radius","font_family","table_row_height"])assert.ok(theme[key]!==undefined,`${theme.key}: ${key} eksik`);
  assert.ok(contrastRatio(theme.muted,theme.page)>=4.5,`${theme.key}: muted/page kontrastı AA altında`);
}
for(const key of ["light-corporate","dark-executive","classic-office","soft-blue","slim-rail"])assert.ok(sidebarCatalog.some(item=>item.key===key),`${key} katalogda yok`);
assert.equal(sidebarCatalog.length,28);
for(const [key,name] of Object.entries({"apple-glass":"Cam Zarif","tesla-crimson":"Kızıl Çizgi","microsoft-fluent":"Mavi Akış","google-material":"Canlı Modern","bosch-engineering":"Endüstriyel Mavi"}))assert.equal(themes.find(x=>x.key===key)?.name,name);
for(const [key,sidebarKey] of Object.entries({"laboratory-sterile":"light-corporate","dark-pro":"dark-executive","classic-paper":"classic-office"}))assert.equal(themes.find(x=>x.key===key)?.sidebar_key,sidebarKey);
const dirtyCss='@import url(https://evil.test/x.css);.x{background:url(data:text/html,<script>x</script>);behavior:url(x);color:red}';
const cleanCss=sanitizeThemeCss(dirtyCss);
assert.doesNotMatch(cleanCss,/@import|\burl\s*\(|data\s*:\s*text\/html|behavior\s*:|<script|https?:\/\//i);

assert.doesNotMatch(sidebarView,/data-sidebar-collapse-all|Tümünü daralt|Collapse all/);
assert.doesNotMatch(sidebarView,/data-sidebar-(?:menu-search|pin-current|favorites)|sidebar-(?:search|favorites)/i);
assert.match(sidebarView,/Kayıtlar/);
assert.match(sidebarView,/Satış Süreci/);
assert.doesNotMatch(sidebarView,/menu__item--tool/);
assert.match(sidebarJs,/sidebar-flyout/);
assert.match(sidebarJs,/aria-current/);
assert.doesNotMatch(sidebarJs,/favorites|menu-search|searchInput/i);
assert.match(topbar,/Menüyü aç\/kapat/);

assert.match(server,/["']script-src["']\s*:\s*\["'self'",/);
assert.match(server,/["']script-src-attr["']\s*:\s*\["'none'"\]/);
assert.match(server,/["']style-src["']\s*:\s*\["'self'",/);
assert.doesNotMatch(server,/["']script-src["']\s*:\s*\[[^\]]*unsafe-inline/);
assert.doesNotMatch(server,/["']style-src["']\s*:\s*\[[^\]]*unsafe-inline/);
assert.match(server,/crypto\.randomBytes\(18\)/);
assert.doesNotMatch(layout,/document\.write/);
assert.doesNotMatch(read("views/partials/sidebar.ejs"),/\sonclick=|\sonsubmit=/i);

assert.match(layout,/assetBundle\.styles/);
assert.match(layout,/assetBundle\.js/);
assert.match(assetBuild,/createHash\("sha256"\)/);
assert.match(assetBuild,/crmv1\.7\.css/);
assert.match(assetBuild,/crmv1\.7\.js/);
for(const asset of [assetManifest.stylesCss,assetManifest.printCss,assetManifest.appJs])assert.equal(fs.existsSync(new URL(`..${asset}.gz`,import.meta.url)),true,`${asset}.gz eksik`);
assert.equal(fs.existsSync(new URL("../src/vendor/pdf-parse/pdf.js/v1.10.100/build/pdf.cjs",import.meta.url)),false);
assert.equal(fs.existsSync(new URL("../src/vendor/pdf-parse/pdf.js/v1.10.100/build/pdf.worker.cjs",import.meta.url)),false);
assert.match(rateLimit,/scope\s*:\s*"login"[\s\S]{0,120}windowMs\s*:\s*15\s*\*\s*60_000[\s\S]{0,120}max\s*:\s*10/);
assert.match(install,/EXPECTED_VERSION=3.8.57[\s\S]*EXPECTED_BUILD=crmv1.45/);

assert.match(paginator,/size>8\.2/);
assert.match(paginator,/print-money-wrap-v17/);
assert.match(read("public/css/print.css"),/print-money-wrap-v17/);

console.log("CRMV1_7_CONTRACTS=OK");

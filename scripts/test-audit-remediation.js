import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  contrastRatio,
  sanitizeThemeCss,
  sidebarCatalog,
  themes
} from "../src/services/theme.service.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const walk = (folder) =>
  fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });

assert.equal(themes.length, 35);
const structuralKeys = [
  "sidebar_key",
  "icon_pack",
  "menu_mode",
  "density",
  "radius",
  "card_radius",
  "button_radius",
  "input_radius",
  "font_family",
  "table_row_height"
];
for (const theme of themes) {
  for (const key of structuralKeys) {
    assert.notEqual(theme[key], undefined, `${theme.key}: ${key} eksik`);
  }
  assert.ok(sidebarCatalog.some((sidebar) => sidebar.key === theme.sidebar_key), `${theme.key}: sidebar geçersiz`);
  assert.ok(contrastRatio(theme.muted, theme.page) >= 4.5, `${theme.key}: muted/page WCAG AA altında`);
  assert.ok(contrastRatio(theme.text, theme.page) >= 4.5, `${theme.key}: text/page WCAG AA altında`);
  assert.ok(contrastRatio(theme.text, theme.card) >= 4.5, `${theme.key}: text/card WCAG AA altında`);
}
assert.equal(sidebarCatalog.length, 28);
for (const key of ["light-corporate", "dark-executive", "classic-office", "soft-blue", "slim-rail"]) {
  assert.ok(sidebarCatalog.some((sidebar) => sidebar.key === key), `${key}: katalogda yok`);
  assert.match(read("public/css/app.css"), new RegExp(`\\.sidebar--${key}\\b`), `${key}: CSS görünümü yok`);
}
assert.equal(new Set(sidebarCatalog.map((sidebar) => sidebar.key)).size, sidebarCatalog.length);
assert.doesNotMatch(themes.map((theme) => theme.name).join("\n"), /\b(?:Apple|Tesla|Microsoft|Google|Bosch)\b/i);
const themeByKey = new Map(themes.map((theme) => [theme.key, theme]));
for (const [themeKey, sidebarKey] of Object.entries({
  "laboratory-sterile": "light-corporate",
  "dark-pro": "dark-executive",
  "classic-paper": "classic-office"
})) {
  assert.equal(themeByKey.get(themeKey)?.sidebar_key, sidebarKey, `${themeKey}: sidebar eşlemesi hatalı`);
}
for (const [themeKey, visibleName] of Object.entries({
  "apple-glass": "Cam Zarif",
  "tesla-crimson": "Kızıl Çizgi",
  "microsoft-fluent": "Mavi Akış",
  "google-material": "Canlı Modern",
  "bosch-engineering": "Endüstriyel Mavi"
})) {
  assert.equal(themeByKey.get(themeKey)?.name, visibleName, `${themeKey}: görünen isim hatalı`);
}

assert.equal(
  sanitizeThemeCss(".card{color:#123456;position:fixed;z-index:999999;left:0}"),
  ".card{color:#123456}"
);
assert.equal(
  sanitizeThemeCss(
    '.x{background:url("javascript:alert(1)");width:expression(alert(1));behavior:url(data:text/html,x);-moz-binding:url(x)}a:visited{color:red}'
  ),
  ""
);
assert.doesNotMatch(
  sanitizeThemeCss('@import url("https://evil.test/x.css");.x{color:red}'),
  /@import|url\s*\(|https?:/i
);

const sidebarView = read("views/partials/sidebar.ejs");
const sidebarJs = read("public/js/crmv1.7.js");
const sidebarCss = `${read("public/css/crmv1.7.css")}\n${read("public/css/crmv1.8.css")}\n${read("public/css/crmv1.9.css")}`;
for (const marker of ["menu-section-label"]) {
  assert.match(sidebarView, new RegExp(marker));
}
assert.doesNotMatch(sidebarView, /data-sidebar-collapse-all|Tümünü daralt|Collapse all/);
assert.doesNotMatch(sidebarView, /sidebar-(?:search|favorites)|data-sidebar-(?:menu-search|pin-current|favorites)/i);
assert.match(sidebarView, /aria-current=/);
assert.doesNotMatch(sidebarView, /menu__item--tool/);
const recordsSection = sidebarView.indexOf("'Kayıtlar'");
const excelLink = sidebarView.indexOf('href="/excel"');
const salesSection = sidebarView.indexOf("'Satış Süreci'");
assert.ok(recordsSection >= 0 && recordsSection < excelLink && excelLink < salesSection);
const sidebarWithoutEjs = sidebarView.replace(/<%[\s\S]*?%>/g, "EJS");
for (const detail of sidebarWithoutEjs.match(/<details\b[\s\S]*?<\/details>/gi) || []) {
  for (const link of detail.match(/<a\b[^>]*>/gi) || []) assert.match(link, /\baria-current=/i);
}
assert.match(sidebarJs, /sidebar-flyout/);
assert.doesNotMatch(sidebarJs, /favorites|menu-search|searchInput/i);
assert.match(sidebarJs, /aria-expanded/);
assert.match(sidebarJs, /event\.preventDefault\(\)/);
assert.doesNotMatch(sidebarCss, /sidebar-navigation-tools|sidebar-collapse-all/i);
assert.match(read("views/partials/topbar.ejs"), /Menüyü aç\/kapat/);

const server = read("src/server.js");
assert.doesNotMatch(server, /unsafe-inline/);
assert.doesNotMatch(server, /res\.send\s*=/);
assert.match(server, /["']script-src-attr["']\s*:\s*\["'none'"\]/);
assert.match(server, /["']style-src-attr["']\s*:\s*\["'none'"\]/);
for (const directive of ["object-src", "base-uri", "form-action", "frame-ancestors"]) {
  assert.match(server, new RegExp(`["']${directive}["']\\s*:`));
}
assert.match(server, /crypto\.randomBytes\(18\)/);

const viewFiles = walk(path.join(root, "views")).filter((file) => file.endsWith(".ejs"));
let protectedInlineTags = 0;
for (const file of viewFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /<(?!%)[a-z][^>]*\sstyle\s*=/i, `${path.relative(root, file)}: style niteliği`);
  for (const tag of source.match(/<(?:script|style)\b[^>]*>/gi) || []) {
    protectedInlineTags += 1;
    assert.match(tag, /\bnonce=/i, `${path.relative(root, file)}: nonce eksik`);
  }
}
assert.ok(protectedInlineTags >= 30);
assert.doesNotMatch(read("views/layout.ejs"), /document\.write/);
const cspStyleRuntime = read("public/js/csp-style-runtime.js");
assert.match(cspStyleRuntime, /data-csp-style/);
assert.match(cspStyleRuntime, /style\.setProperty/);
assert.doesNotMatch(cspStyleRuntime, /cssText|setAttribute\(["']style/);

const buildSource = read("scripts/build-assets.js");
assert.match(buildSource, /csp-style-runtime\.js/);
assert.match(buildSource, /createHash\("sha256"\)/);
assert.match(buildSource, /gzipSync/);
const manifest = JSON.parse(read("public/build/asset-manifest.json"));
assert.equal(manifest.schema, 3);
for (const asset of [manifest.stylesCss, manifest.printCss, manifest.appJs, manifest.printJs, ...Object.values(manifest.pageJs)]) {
  assert.match(asset, /^\/public\/build\/crm-[a-z]+\.[a-f0-9]{16}\.(?:css|js)$/);
  assert.ok(fs.existsSync(path.join(root, asset)));
  assert.ok(fs.existsSync(`${path.join(root, asset)}.gz`));
}
const layout = read("views/layout.ejs");
assert.equal((layout.match(/assetBundle\.styles/g) || []).length, 1);
assert.equal((layout.match(/assetBundle\.js/g) || []).length, 1);
assert.doesNotMatch(layout, /\/public\/(?:css|js)\//);

assert.equal(fs.existsSync(path.join(root, "src/vendor/pdf-parse")), false);
for (const deadFile of [
  "public/css/crmv1.2.css",
  "public/js/crmv1.2.js",
  "public/js/login-page.js",
  "public/js/login-studio.js"
]) {
  assert.equal(fs.existsSync(path.join(root, deadFile)), false, `${deadFile}: ölü kaynak kaldırılmadı`);
}
const auditArchive = path.join(root, "docs/archive/release-audits");
assert.ok(fs.existsSync(auditArchive));
assert.ok(fs.readdirSync(auditArchive).filter((file) => /^FINAL_/.test(file)).length >= 37);

const rateLimit = read("src/middleware/rate-limit.js");
assert.match(rateLimit, /scope\s*:\s*"login"[\s\S]{0,140}windowMs\s*:\s*15\s*\*\s*60_000[\s\S]{0,140}max\s*:\s*10/);
const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.dependencies.esbuild, "0.25.9");
assert.equal(packageJson.devDependencies.prettier, "3.6.2");
assert.ok(packageJson.scripts["build:assets"]);
assert.ok(packageJson.scripts["format:check"]);

console.log(
  `AUDIT_REMEDIATION=OK themes=${themes.length} sidebars=${sidebarCatalog.length} protected_inline_tags=${protectedInlineTags}`
);

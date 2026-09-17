import crypto from "crypto";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { transformSync } from "esbuild";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const buildDir = path.join(publicDir, "build");

// Source files stay separated by responsibility. Browsers receive a small core
// plus a page-specific, content-addressed script only where it is needed.
// crmv1.46 — tek tasarım katmanı.
// Eski hotfix / override / ui-consistency / ui-integrity zinciri paketten
// çıkarıldı; görünümün tamamı arteva-ds-v2.css'ten gelir. Burada yalnızca
// yapıyı taşıyan taban dosyalar kalır.
// crmv1.46 — tek tasarım katmanı.
// Eski dosyalar pakette kalır (yapı ve sayfaya özel yerleşim onlardan gelir),
// ancak `@layer legacy` içine alınıp `!important`leri sökülür. Görünümün
// sahibi, katmansız olarak en sonda duran arteva-ds-v2.css'tir.
const appCss = [
  "fonts-v3817.css",
  "app.css",
  "ui-consistency-v3814.css",
  "ui-consistency-v3815.css",
  "ui-integrity-v3817.css",
  "ui-integrity-v3818.css",
  "product-media-v3820.css",
  "product-media-v3821.css",
  "mobile-lists-v3822.css",
  "mobile-lists-v3823.css",
  "crmv1-hotfix.css",
  "crmv1.3.css",
  "crmv1.4.css",
  "crmv1.5.css",
  "crmv1.6.css",
  "crmv1.7.css",
  "crmv1.8.css",
  "crmv1.9.css",
  "crmv1.10.css",
  "crmv1.11.css",
  "crmv1.12.css",
  "crmv1.13.css",
  "crmv1.15.css",
  "crmv1.16.css",
  "login-studio-v356.css",
  "arteva-ds-v2.css"
];

const appJs = [
  "csp-style-runtime.js",
  "product-media-v3821.js",
  "csrf-session-v355.js",
  "i18n-runtime.js",
  "app.js",
  "crmv1-mobile-v3.js",
  "crmv1.3.js",
  "address-helper.js",
  "table-preferences-v3817.js",
  "live-operator.js",
  "crmv1.7.js",
  "crmv1.9.js",
  "crmv1.10.js",
  "crmv1.11.js",
  "crmv1.12.js",
  "crmv1.13.js",
  "crmv1.16.js"
];
const pageJs = {
  dashboard: ["dashboard-proforma-visits-v16.js"],
  quotes: ["quote-check-assistant.js", "quote-email.js", "quote-form.js", "template-modal.js"],
  templates: ["template-modal.js", "template-studio.js"],
  theme: ["theme-studio.js", "theme-studio-v18.js"],
  loginStudio: ["login-studio-v356.js"],
  auth: ["login-page-v356.js"]
};
const printJs = ["print-paginator.js", "crmv1.13.js"];

const read = (folder, file) => fs.readFileSync(path.join(publicDir, folder, file), "utf8");
// crmv1.46 — tek tasarım katmanı, kesin sıralama.
// Eski dosyalar `@layer legacy` içine alınır ve içlerindeki `!important`
// sökülür; tasarım sistemi katmansız kalır. Katmansız + important bildirim,
// katmanlı normal bildirimlerin tamamını yener. Böylece görünümün sahibi
// özgüllük yarışına girmeden tek dosya olur.
const DESIGN_SYSTEM = "arteva-ds-v2.css";
const stripImportant = (css) => css.replace(/\s*!\s*important/gi, "");
const joinCss = (files) => {
  const legacy = files.filter((file) => file !== DESIGN_SYSTEM);
  const layered = legacy
    .map((file) => `/* source:${file} */\n${stripImportant(read("css", file))}`)
    .join("\n");
  const system = files.includes(DESIGN_SYSTEM)
    ? `\n/* source:${DESIGN_SYSTEM} */\n${read("css", DESIGN_SYSTEM)}`
    : "";
  return `@layer legacy;\n@layer legacy{\n${layered}\n}\n${system}`;
};
const joinJs = (files) =>
  files.map((file) => `;(()=>{\n/* source:${file} */\n${read("js", file)}\n})();`).join("\n");
const minify = (source, loader) =>
  transformSync(source, {
    loader,
    minify: true,
    legalComments: "none",
    target: "es2020",
    charset: "utf8"
  }).code;
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
const writeHashed = (prefix, extension, content) => {
  const name = `${prefix}.${hash(content)}.${extension}`;
  const target = path.join(buildDir, name);
  fs.writeFileSync(target, content);
  fs.writeFileSync(`${target}.gz`, zlib.gzipSync(Buffer.from(content), { level: 9 }));
  return `/public/build/${name}`;
};

fs.mkdirSync(buildDir, { recursive: true });
for (const file of fs.readdirSync(buildDir)) {
  if (/^crm-[a-z]+\.[a-f0-9]{16}\.(?:css|js)(?:\.gz)?$/.test(file)) {
    fs.unlinkSync(path.join(buildDir, file));
  }
}

const styles = minify(joinCss(appCss), "css");
const print = minify(read("css", "print.css"), "css");
const script = minify(joinJs(appJs), "js");
const pageBundles = Object.fromEntries(
  Object.entries(pageJs).map(([name, files]) => [
    name,
    writeHashed(`crm-${name.toLowerCase()}`, "js", minify(joinJs(files), "js"))
  ])
);
const manifest = {
  schema: 3,
  generatedAt: new Date().toISOString(),
  stylesCss: writeHashed("crm-styles", "css", styles),
  printCss: writeHashed("crm-print", "css", print),
  appJs: writeHashed("crm-app", "js", script),
  printJs: writeHashed("crm-print", "js", minify(joinJs(printJs), "js")),
  pageJs: pageBundles,
  sources: { css: appCss, print: ["print.css"], js: appJs, printJs, pageJs }
};

fs.writeFileSync(path.join(buildDir, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `assets built: ${path.basename(manifest.stylesCss)}, ${path.basename(manifest.printCss)}, ${path.basename(manifest.appJs)}`
);

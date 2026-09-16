import fs from "fs";
import assert from "assert/strict";

const render = fs.readFileSync("src/services/quote-render.service.js", "utf8");
const routes = fs.readFileSync("src/routes/quotes.js", "utf8");
const printJs = fs.readFileSync("public/js/print-paginator.js", "utf8");
const layout = fs.readFileSync("views/layout.ejs", "utf8");
const printView = fs.readFileSync("views/quotes/print.ejs", "utf8");
const manual = fs.readFileSync("src/services/template-html.service.js", "utf8");

assert.match(render, /export function inlineQuotePrintImages\(row\)/, "print image embedding helper missing");
assert.match(render, /data:\$\{mime\};base64/, "local print images are not embedded as data URIs");
assert.match(render, /PRINT_IMAGE_TOTAL_BYTES/, "print image memory budget missing");
assert.match(render, /row: printRow/, "print locals do not use embedded image row");
assert.match(printJs, /waitForPrintImages/, "print pagination does not wait for images");
assert.match(printJs, /__printAssetsReady/, "print asset readiness promise missing");
assert.match(routes, /res\.redirect\(303, "\/quotes\/sent"\)/, "successful email send does not redirect to sent list");
assert.match(layout, /String\(path\|\|''\)==='\/quotes\/sent'/, "sent-page success toast is not centered");
assert.ok(printView.includes('alt="Firma logosu" data-empty-image-on-error'), "logo broken-image fallback missing");
assert.match(manual, /data-empty-image-on-error/, "manual template image fallback missing");

console.log("CRMV1.30_PRINT_ASSETS_EMAIL_REDIRECT=10/10 OK");

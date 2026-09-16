import fs from "fs";
import assert from "assert";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const pub = read("src/routes/public-quotes.js");
const print = read("views/quotes/print.ejs");
const custom = read("src/services/template-html.service.js");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");
assert.match(pub, /r\.get\("\/:token\/download"/);
assert.match(pub, /publicDocumentProxyUrl/);
assert.match(pub, /resolveOwnedQuoteUpload/);
assert.match(pub, /Content-Disposition/);
assert.match(pub, /brosur\.pdf/);
assert.match(pub, /fs\.statSync/);
assert.match(pub, /product\.brochure_url = publicDocumentProxyUrl/);
assert.match(pub, /product\.ce_certificate_url = publicDocumentProxyUrl/);
assert.match(pub, /product\.manual_url = publicDocumentProxyUrl/);
assert.match(pub, /\^public\\\/uploads\\\//);
assert.match(print, /publicDocumentHref/);
assert.match(print, /href="<%=publicDocumentHref\(x\.brochure_url\)%>"/);
assert.match(custom, /function publicDocumentHref/);
assert.match(custom, /attr\(publicDocumentHref\(publicBaseUrl, url\)\)/);
assert.doesNotMatch(print, /publicBaseUrl%><%=x\.brochure_url/);

console.log("crmv1.45 mobile brochure download contracts: ok");

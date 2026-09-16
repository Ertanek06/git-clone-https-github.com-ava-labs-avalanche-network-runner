import assert from "node:assert/strict";
import fs from "node:fs";
import { sanitizeWebProductDescription } from "../src/services/web-product-import.service.js";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const preview = read("views/products/import-web-preview.ejs");
const productPreview = read("views/products/preview.ejs");
const scan = read("views/products/import-web-scan.ejs");
const client = read("public/js/web-import-v45.js");
const routes = read("src/routes/products.js");
const css = read("public/css/app.css");

assert.equal(pkg.version, "3.8.57");
assert.equal(build.build, "crmv1.45");
assert.equal(build.release, "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix");
assert.match(preview, /data-no-collapse/);
assert.doesNotMatch(preview, /class="web-table-disclosure"/);
assert.match(preview, /class="web-table-heading"/);
assert.match(preview, /name="per_page"/);
assert.match(preview, /Tümünü Göster/);
assert.match(preview, /webControlSelected/);
assert.match(css, /web-no-image\[hidden\].*display:none!important/);
assert.match(preview, /src="\/public\/js\/web-import-v45\.js"/);
assert.match(scan, /src="\/public\/js\/web-import-v45\.js"/);
assert.match(productPreview, /\[data-product-image-empty\]\[hidden\].*display:none!important/);
assert.match(client, /"webSelectedTotal","webControlSelected","webDockSelected"/);
assert.match(client, /data-web-bulk-select/);
assert.match(routes, /requestedPerPage/);
assert.match(routes, /perPageValue === "ALL"/);

const productTitle = "Damasilk Cerrahi Sütür - Emilmeyen Dikiş İpliği - İpek İplik - USP:4-0 - 75 cm";
const contaminated = [
  "Ürün Açıklaması",
  "Teknik ve kısa açıklama",
  "Ay Sonuna Kadar Geçerli Tüm Siparişlerde Havale/EFT Ödemelere Özel %10 Ek İndirim Fırsatını Kaçırma!",
  "0212 438 74 57",
  "satis@beyanlab.com",
  "Hesabım",
  "Sepetim",
  "Tüm Kategoriler",
  "•",
  "Laboratuvar Sarf Malzemeleri",
  "•",
  "Bant",
  "•",
  "Beherler",
  "•",
  "Laboratuvar Cihazları",
  "•",
  "Laminar Flow Kabini / Çeker Ocak",
  `${productTitle} | BlabMarket`,
  productTitle,
  "Cerrahi Dikiş İpliği – Ameliyat İpliği – Atravmatik İğne - Emilmeyen Cerrahi Sütür - 12 Steril Paket/Kutu",
  "Stok Kodu",
  "DK40DS17",
  "Marka",
  "GMD",
  "621,40 TL",
  "GELİNCE HABER VER",
  "Teklif Al",
  "Merhabalar",
  "BlabMarket'e Hoş Geldiniz",
  "Ürün 1",
  "Adınız ve Soyadınız",
  "Telefon",
  "E-Mail",
  "Vergi Daire / No",
  "Gönder"
].join("\n");

const cleaned = sanitizeWebProductDescription(contaminated, {
  productTitle,
  forbiddenNames: ["BlabMarket", "blabmarket.com"]
});
assert.match(cleaned, /Cerrahi Dikiş İpliği/);
assert.match(cleaned, /12 Steril Paket\/Kutu/);
assert.doesNotMatch(cleaned, /Ay Sonuna|0212|@|Hesabım|Sepetim|Tüm Kategoriler/i);
assert.doesNotMatch(cleaned, /Laboratuvar Sarf|Bant|Beherler|Çeker Ocak/i);
assert.doesNotMatch(cleaned, /BlabMarket|Stok Kodu|DK40DS17|Marka|GMD|621,40|Teklif|Merhabalar|Vergi/i);

console.log("CRMV1_44_WEB_IMPORT_UI_SANITIZER=28/28 OK");

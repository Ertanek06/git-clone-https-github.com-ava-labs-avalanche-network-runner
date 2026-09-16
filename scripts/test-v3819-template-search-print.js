import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import { renderCustomTemplate } from "../src/services/template-html.service.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const quoteJs=read("public/js/quote-form.js");
const productRoute=read("src/routes/products.js");
const printView=read("views/quotes/print.ejs");
const printCss=read("public/css/print.css");
const templateService=read("src/services/template-html.service.js");
const topbar=read("views/partials/topbar.ejs");

assert.doesNotMatch(quoteJs,/en az 5 karakter/i);
assert.doesNotMatch(quoteJs,/query\.length\s*<\s*5/);
assert.match(quoteJs,/Kayıtlı ürünler · yazdıkça liste filtrelenir/);
assert.match(quoteJs,/fetchProducts\(query,signal\)/);
assert.match(quoteJs,/\/auth\/csrf-token/);
assert.match(quoteJs,/response\.status===403/);
assert.match(quoteJs,/nativeFrameFallback/);
assert.match(quoteJs,/fallback\.target=target/);
assert.match(productRoute,/function typoDistance/);
assert.match(productRoute,/function productLikelihood/);
assert.match(productRoute,/String\(a\.name \|\| ""\)\.localeCompare\(String\(b\.name/);
assert.match(productRoute,/ORDER BY COALESCE\(updated_at,created_at\) DESC,created_at DESC,name COLLATE NOCASE ASC,code COLLATE NOCASE ASC/);
assert.match(productRoute,/const coreMatches = pool\.filter/);

const row={id:"quo_v3819",quote_no:"TEK260050",revision_no:0,profile_snapshot:{company_name:"ARTEVA LABORATUVAR",address:"ANKARA"},customer_snapshot:{company_name:"ÖRNEK MÜŞTERİ"},quote_date:"2026-07-24",valid_until:"2026-08-03",currency:"TRY",fx_rate:1,subtotal:1950,discount_total:0,vat_total:390,grand_total:2340,items:[{product_snapshot:{code:"AFCBOTD120",name:"ARTEVA ÇEKER OCAK DOLAPLI 120CM",short_description:"Kabın ölçüsü ve teknik açıklama",image_url:"/public/uploads/products/example.png"},quantity:1,unit:"ADET",unit_price:1950,discount_type:"PERCENT",discount_value:0,vat_rate:20,line_net:1950,line_vat:390,line_total:2340,show_image:1,is_alternative:1,include_total:1,alternative_to_name:"Ana ürün"}]};
const html=await ejs.renderFile(path.join(root,"views/quotes/print.ejs"),{layout:false,row,template:{layout_key:"classic",primary_color:"#245ba7",accent_color:"#d83238",font_family:"Inter",font_size:11},templateSettings:{show_alternative_badge:true,alternative_badge_color:"#f59e0b",alternative_badge_text_color:"#3b2200"},templatePalette:{},manualTemplate:{enabled:false,html:"",css:""},isPreview:true,autoPrint:false,publicView:false,embeddedPreview:true,locale:"tr",t:key=>key,appVersion:"3.8.57",publicBaseUrl:"https://crm.artevapp.com.tr",quoteDisplayNo:value=>value.quote_no,quotePrintDisplayNo:value=>value.quote_no},{filename:path.join(root,"views/quotes/print.ejs")});
const imageCell=(html.match(/<td class="print-image">([\s\S]*?)<\/td>/)||[])[1]||"";
assert.doesNotMatch(imageCell,/MUADİL|quote-alternative-print-badge/);
assert.equal((html.match(/MUADİL ÜRÜN/g)||[]).length,1);
assert.match(html,/1\.950<\/span><small>TRY<\/small>/);
assert.match(html,/print-money-cell-v3819/);
assert.match(printCss,/\.print-description>b\{[^}]*font-weight:700!important/);
assert.match(printCss,/\.print-description>small\{[^}]*font-weight:400!important/);
assert.match(printCss,/body\.print-layout \.print-items th:nth-child\(1\)\{width:20mm!important/);
assert.match(printCss,/body\.print-layout \.print-image img\{[^}]*width:17\.5mm!important[^}]*height:24mm!important/);
assert.match(printCss,/body\.print-layout \.print-description>b\{[^}]*font-size:9\.2px!important[^}]*font-weight:700!important/);
assert.match(printCss,/body\.print-layout \.print-description>small\{[^}]*font-size:7\.75px!important[^}]*font-weight:400!important/);
assert.match(printCss,/body\.print-layout \.print-money-v3819,[^{]*\{[^}]*white-space:nowrap!important/);

const manual=renderCustomTemplate({html:"{{ITEMS_TABLE}}{{TOTALS_TABLE}}",row,locale:"tr",publicBaseUrl:"https://crm.artevapp.com.tr",displayNo:"TEK260050"});
const manualImage=(manual.match(/<td class="manual-image">([\s\S]*?)<\/td>/)||[])[1]||"";
assert.doesNotMatch(manualImage,/MUADİL|manual-alternative-badge/);
assert.equal((manual.match(/MUADİL ÜRÜN/g)||[]).length,1);
assert.match(manual,/manual-money-v3819/);
assert.match(manual,/1\.950<\/span><small>TRY<\/small>/);
assert.doesNotMatch(manual,/1\.950,00/);
assert.match(templateService,/const\s+image\s*=\s*i\.show_image\s*&&\s*x\.image_url\s*\?\s*imageTag/);
assert.match(printView,/class="print-money-v3819"/);
assert.match(printView,/Math\.abs\(amount-Math\.trunc\(amount\)\)>1e-9\?2:0/);
assert.match(printView,/\.print-pages \.print-money-v3819/);
assert.match(printView,/cell\.clientWidth<4/);

assert.match(topbar,/topbar-search/);
assert.match(topbar,/data-live-date/);
assert.match(topbar,/data-live-time/);
assert.match(topbar,/WhatsApp|whatsapp/i);

console.log("V3819_TEMPLATE_SEARCH_PRINT=40/40 OK");

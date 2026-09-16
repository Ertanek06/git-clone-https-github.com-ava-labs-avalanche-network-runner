import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const pkg=JSON.parse(read('package.json'));
const config=read('src/config.js'),quotes=read('src/routes/quotes.js'),render=read('src/services/quote-render.service.js'),print=read('views/quotes/print.ejs');
const sent=read('views/quotes/sent.ejs'),archives=read('views/quotes/archives.ejs'),products=read('src/routes/products.js'),productForm=read('views/products/form.ejs'),quoteForm=read('public/js/quote-form.js');
const migrate=read('src/db/migrate.js'),dashboard=read('src/routes/dashboard.js'),dashboardJs=read('public/js/app.js'),dashboardView=read('views/dashboard/index.ejs');
const templates=read('src/routes/templates.js'),templateView=read('views/templates/index.ejs'),library=read('src/services/template-library.service.js'),followup=read('scripts/quote-followup-run.js');
const settings=read('src/routes/settings.js'),themeView=read('views/settings/theme.ejs'),themeService=read('src/services/theme.service.js'),themeJs=read('public/js/theme-studio.js'),quoteService=read('src/services/quote.service.js');
const checks=[
 ()=>assert.equal(pkg.version,'3.8.57'),
 ()=>assert.match(config,/v3.8.57-crmv1.45-web-import-upsert-ui-document-fix/),
 ()=>assert.match(render,/resolveQuoteTemplate/),
 ()=>assert.match(render,/güvenli standart şablona dönüldü/),
 ()=>assert.match(quotes,/includeArchived\s*:\s*true/),
 ()=>assert.match(quotes,/quotePrintLocals/),
 ()=>assert.match(sent,/\/quotes\/<%=row\.quote_id%>\/preview/),
 ()=>assert.match(archives,/data-preview-url="\/quotes\/<%=qt\.id%>\/preview"/),
 ()=>assert.match(print,/public-quote-actions-v365/),
 ()=>assert.match(print,/MUADİL ÜRÜN/),
 ()=>assert.match(print,/alternative_to_name/),
 ()=>assert.match(products,/product_alternatives/),
 ()=>assert.match(productForm,/Ürün Alternatifi ve Muadil Sistemi/),
 ()=>assert.match(quoteForm,/Muadil Ürün Ekle/),
 ()=>assert.match(quoteForm,/Toplama dahil/),
 ()=>assert.match(migrate,/\[\s*40\s*,\s*\(\)\s*=>\s*\{/),
 ()=>assert.match(migrate,/dashboard_widget_layouts/),
 ()=>assert.match(dashboard,/\/dashboard\/layout/),
 ()=>assert.match(dashboardJs,/DASHBOARD_LAYOUT_BOOT/),
 ()=>assert.match(dashboardJs,/dash-lock-v370/),
 ()=>assert.match(dashboardView,/smart-workflow/),
 ()=>assert.match(templateView,/TASLAK ÖRNEK PROFORMA/),
 ()=>assert.match(templateView,/Şablon İçe Aktar/),
 ()=>assert.match(templateView,/Dışa Aktar/),
 ()=>assert.match(templates,/ensureProfessionalTemplateLibrary/),
 ()=>assert.match(templates,/\/:id\/export/),
 ()=>assert.match(templates,/\/:id\/clone/),
 ()=>assert.ok((library.match(/^  \[/gm)||[]).length>=30),
 ()=>assert.match(templateView,/Muadil Ürün Rozeti/),
 ()=>assert.match(print,/meta name="viewport"/),
 ()=>assert.match(followup,/publicUrl\s*\(\s*`\/q\/\$\{raw\}`\s*\)/),
 ()=>assert.match(followup,/quote_share_tokens/),
 ()=>assert.ok(migrate.indexOf('CREATE TABLE IF NOT EXISTS dashboard_widget_layouts')<migrate.indexOf('ensureColumn("dashboard_widget_layouts", "x_px"')),
 ()=>assert.match(dashboard,/dashboard\/workflow\/:id\/complete/),
 ()=>assert.match(dashboard,/dashboard\/workflow\/:id\/snooze/),
 ()=>assert.match(dashboardView,/data-workflow-note/),
 ()=>assert.match(settings,/ARTEVA_THEME_DESIGN/),
 ()=>assert.match(settings,/theme\/design\/:id\/export/),
 ()=>assert.match(settings,/theme\/design\/import/),
 ()=>assert.match(themeView,/Tema Tasarımını İçe Aktar/),
 ()=>assert.match(themeView,/Dışa Aktar/),
 ()=>assert.ok((themeService.match(/\bkey\s*:\s*"/g)||[]).length>=35),
 ()=>assert.match(themeService,/key\s*:\s*"apple-glass"[\s\S]{0,80}name\s*:\s*"Cam Zarif"/),
 ()=>assert.match(themeService,/name\s*:\s*"Industrial"/),
 ()=>assert.match(themeJs,/sidebar_key/),
 ()=>assert.match(themeJs,/icon_pack/),
 ()=>assert.match(themeJs,/table_row_height/),
 ()=>assert.match(migrate,/\[\s*41\s*,\s*\(\)\s*=>\s*\{/),
 ()=>assert.match(quoteService,/QUOTE_CONTENT_UPDATE/),
 ()=>assert.match(quoteService,/UPDATE quote_items SET deleted_at=\?/),
 ()=>assert.doesNotMatch(quoteService,/DELETE\s+FROM\s+quote_items/i),
 ()=>assert.match(quoteService,/COALESCE\(deleted_at,0\)=0/)
];
for(const check of checks)check();
console.log(`V370_CONTRACT_TESTS=${checks.length}/${checks.length} OK`);

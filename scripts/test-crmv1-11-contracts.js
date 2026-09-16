import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const build=JSON.parse(read('BUILD_INFO.json'));
const view=read('views/settings/theme.ejs'),service=read('src/services/theme.service.js'),css=read('public/css/crmv1.11.css'),js=read('public/js/crmv1.11.js'),themeJs=read('public/js/theme-studio.js'),settings=read('src/routes/settings.js'),layout=read('views/layout.ejs'),assets=read('scripts/build-assets.js');

assert.equal(build.package,'crmv1.45');
assert.equal(build.build,'crmv1.45');
assert.equal(build.release,'v3.8.57-crmv1.45-web-import-upsert-ui-document-fix');

const studio=view.match(/studioThemeKeys=\[([^\]]+)\]/)?.[1]||'';
const keys=[...studio.matchAll(/'([^']+)'/g)].map(x=>x[1]);
assert.equal(keys.length,20,'Tema Stüdyosu tam 20 sistem göstermeli');
assert.equal(new Set(keys).size,20,'20 sistem birbirinden bağımsız anahtarlara sahip olmalı');
for(const label of ['Sade Yönetim','Lacivert Kurumsal','Kompakt Operasyon','Akış Yönetimi','Yaratıcı Yönetim','Gece Operasyon','Endüstri Kontrol','Laboratuvar Yönetim','Editoryal Sade','Saha Komuta','Dinamik Satış','Sakin Ofis','Cam Zarif','Kızıl Çizgi','Mavi Akış','Canlı Modern','Endüstriyel Mavi','Gece Kurumsal','Klasik Ofis','Yönetici Premium'])assert.match(service,new RegExp(`name\\s*:\\s*"${label}"`),`${label} eksik`);
assert.match(view,/Bu 20 sistem yalnız rengi değil/);
assert.match(css,/\.theme-select-v17\{display:none!important\}/);
for(const sidebar of ['navy-rail','graphite-compact','booking-clean','blue-glass','dark-trip','light-corporate','ideasoft-clean','accordion-tree','soft-blue','collapsible-pro'])assert.ok(css.includes(`data-sidebar-style="${sidebar}"`),`${sidebar} canlı ön izlemede eksik`);

assert.match(css,/customer-table th:nth-child\(3\)[\s\S]*min-width:190px/);
assert.match(js,/slice\(0,3\)\.join\(' '\)/);
assert.match(js,/customer-company-column-v111/);
assert.match(css,/menu__item\[href="\/"\][\s\S]*position:sticky/);

assert.match(themeJs,/const isDark=/);
assert.match(themeJs,/success_bg:'#123528'/);
assert.match(settings,/mobile-home-v4__stats>a/);
assert.match(settings,/dashboard-shortcuts-dynamic/);
assert.match(settings,/decision-card--approved/);
assert.match(layout,/settings\/theme\.css\?v=<%=ui\.updated_at\|\|'default'%>&amp;b=crmv1.45/);

assert.match(css,/dashboard-widget-v63>.card-head h2[\s\S]*-webkit-line-clamp:2/);
assert.match(css,/@media\(max-width:760px\)/);
assert.doesNotMatch(js,/ui-nav-pending-v111/);
assert.match(css,/ui-nav-pending-v111 body:before[\s\S]*content:none!important/);
assert.match(assets,/"crmv1\.11\.css"/);
assert.match(assets,/"crmv1\.11\.js"/);

console.log('crmv1.11 contracts: ok');

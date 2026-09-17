import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pkg=JSON.parse(read('package.json')),build=JSON.parse(read('BUILD_INFO.json'));
const sidebar=read('views/partials/sidebar.ejs'),dashboard=read('views/dashboard/index.ejs'),app=read('public/js/app.js'),themeView=read('views/settings/theme.ejs'),themeJs=read('public/js/theme-studio.js'),themeCss=read('public/css/crmv1.8.css'),themeService=read('src/services/theme.service.js'),settings=read('src/routes/settings.js'),assetBuild=read('scripts/build-assets.js');

assert.equal(pkg.version,'3.8.57');
assert.equal(build.package,'crmv1.45');
assert.equal(build.build,'crmv1.45');
assert.equal(build.release,'v3.8.57-crmv1.45-web-import-upsert-ui-document-fix');

assert.doesNotMatch(sidebar,/data-sidebar-collapse-all|Tümünü daralt|Collapse all/);
assert.doesNotMatch(sidebar,/data-sidebar-(?:menu-search|pin-current|favorites)|sidebar-(?:search|favorites)/i);

for(const key of ['recent-proformas','recent-customers','smart-workflow','live-proforma-tracking','recent-activity','alerts','live-support'])assert.match(dashboard,new RegExp(`data-dashboard-widget-toggle="${key}"`));
assert.match(dashboard,/data-dashboard-widget-reset-all/);
assert.match(app,/data-dash-v372="remove"/);
assert.match(app,/action==='remove'\)o\.visible=false/);
assert.match(app,/el\.hidden=!o\.visible/);

const studioKeys=['minimal-air','navy-corporate','graphite-pro','emerald-flow','violet-studio','midnight-ops','amber-industry','cyan-lab','mono-editorial','forest-command','electric-pop','sandstone-calm','apple-glass','tesla-crimson','microsoft-fluent','google-material','bosch-engineering','dark-pro','classic-paper','premium-plum'];
for(const key of studioKeys)assert.match(themeView,new RegExp(`'${key}'`));
assert.match(themeView,/studioThemes\.forEach/);
assert.match(themeView,/data-theme-hover/);
assert.match(themeCss,/\.theme-sidebar-library-v17\{display:none!important\}/);
assert.match(themeCss,/theme-sidebar-input-grid-v16>label\.wide:first-child/);
assert.match(themeView,/name="icon_pack"/);

for(const name of ['heading_font_family','sidebar_font_family','table_font_family','button_font_family']){assert.match(themeView,new RegExp(`name="${name}"`));assert.match(themeService,new RegExp(`${name}:`));assert.match(settings,/_font_family/);}
assert.match(themeJs,/theme-point-editor-v18/);
assert.match(themeJs,/themeEditBg/);
assert.match(themeJs,/themeEditText/);
assert.match(themeJs,/themeEditFont/);
assert.match(themeJs,/theme-demo-submenu-v18/);
assert.match(themeCss,/--pv-sidebar-font/);
assert.match(settings,/--heading-font/);
assert.match(settings,/--sidebar-font/);
assert.match(settings,/--table-font/);
assert.match(settings,/--button-font/);
assert.match(assetBuild,/"crmv1\.8\.css"/);

console.log('CRMV1_8_CONTRACTS=OK');

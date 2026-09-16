import fs from 'fs';import assert from 'assert';
const layout=fs.readFileSync(new URL('../views/layout.ejs',import.meta.url),'utf8');
const dashboard=fs.readFileSync(new URL('../views/dashboard/index.ejs',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../public/js/i18n-runtime.js',import.meta.url),'utf8');
const assetBuild=fs.readFileSync(new URL('../scripts/build-assets.js',import.meta.url),'utf8');
[
 ()=>assert.match(layout,/data-locale="<%=locale%>"/),
 ()=>assert.match(layout,/assetBundle\.js/),
 ()=>assert.match(assetBuild,/i18n-runtime\.js/),
 ()=>assert.match(layout,/CRM_TRANSLATE_PAGE/),
 ()=>assert.match(runtime,/lightweight UI translation fallback/),
 ()=>assert.match(runtime,/childElementCount<250/),
 ()=>assert.doesNotMatch(runtime,/attributes:true/),
 ()=>assert.match(dashboard,/Add \/ Remove Shortcut/),
 ()=>assert.match(dashboard,/Offers This Month/),
 ()=>assert.match(dashboard,/Priority follow-ups/),
 ()=>assert.match(dashboard,/Live Support/)
].forEach((t,i)=>{t();console.log(`[${i+1}/10] OK`)})

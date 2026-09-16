import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json')),build=JSON.parse(read('BUILD_INFO.json'));
const products=read('src/routes/products.js'),customers=read('src/routes/customers.js'),quotes=read('src/routes/quotes.js'),dashboard=read('src/routes/dashboard.js'),publicQuotes=read('src/routes/public-quotes.js');
const pager=read('views/partials/pager.ejs'),dashboardView=read('views/dashboard/index.ejs'),visitJs=read('public/js/dashboard-proforma-visits-v16.js'),css=read('public/css/crmv1.6.css'),install=read('KURULUM_KOMUTU.txt');

assert.equal(pkg.version,'3.8.57');
assert.equal(build.package,'crmv1.45');
assert.equal(build.release,'v3.8.57-crmv1.45-web-import-upsert-ui-document-fix');
for(const source of [products,customers,quotes])assert.match(source,/showAll=String\(req\.query\.show\|\|''\)\.toLowerCase\(\)==='all'/);
assert.match(pager,/Tümünü Göster/);
assert.match(pager,/Sonraki|Önceki/);
assert.match(read('views/quotes/index.ejs'),/partials\/pager/);
assert.match(dashboard,/q\.valid_until>=\?/);
assert.doesNotMatch(dashboard,/slice\(0,12\)/);
assert.doesNotMatch(dashboard,/q\.valid_until ASC LIMIT 40/);
assert.match(dashboard,/dashboard\/proforma-visits\/latest/);
assert.match(dashboard,/dashboard\/proforma-visits\/history/);
assert.match(dashboard,/quoteVisitHistory/);
assert.match(publicQuotes,/INSERT INTO quote_view_events/);
assert.doesNotMatch(publicQuotes,/const duplicate=/);
assert.match(dashboardView,/data-proforma-visit-history/);
assert.match(dashboardView,/data-proforma-visit-alert/);
assert.match(dashboardView,/proformaVisitHistoryModal/);
assert.match(visitJs,/crm-proforma-visit-ack-v16/);
assert.match(visitJs,/setInterval\(pollLatest,10000\)/);
assert.match(visitJs,/day\.times/);
assert.match(css,/dashboard-workflow-card \.workflow-task-list/);
assert.match(css,/proforma-visit-history-card-v16/);
assert.match(install,/rm -rf \/home\/arteva\/crmv1.45/);
assert.match(install,/EXPECTED_VERSION=3.8.57[\s\S]*EXPECTED_BUILD=crmv1.45/);

console.log('CRMV1_6_CONTRACTS=27/27 OK');

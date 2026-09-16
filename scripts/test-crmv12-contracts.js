import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));assert.equal(pkg.version,'3.8.57');
const app=read('public/js/app.js');
assert.match(app,/Kaydetme Onayı/);assert.match(app,/Silme Onayı/);assert.match(app,/Onaylama Onayı/);
assert.match(app,/excluded=\(form,submitter\)/);assert.doesNotMatch(app,/method!=='get'.*form\.dataset\.confirm=mutationMessage/s);
assert.match(read('src/config.js'),/v3.8.57-crmv1.45-web-import-upsert-ui-document-fix/);
console.log('crmV13 contextual confirmation tests 7\/7 OK');

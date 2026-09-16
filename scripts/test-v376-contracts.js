import assert from 'assert';import fs from 'fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));assert.equal(pkg.version,'3.8.57');
assert.match(read('src/server.js'),/systemHealth/);assert.match(read('src/routes/system-health.js'),/BACKUP_RESTORE_DRY_RUN/);assert.match(read('views/system-health/index.ejs'),/Sistem Sağlık Merkezi/);assert.match(read('views/quotes/form.ejs'),/quoteCheckAssistant/);assert.match(read('public/js/quote-check-assistant.js'),/Teklif geçerlilik tarihi/);console.log('v3.8.25 contracts 6/6 OK');

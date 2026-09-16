import fs from "node:fs";
import path from "node:path";
import { db } from "../src/db/db.js";
import { id } from "../src/utils/id.js";
import { analyzeUrls, discoverAllProductUrls, looksLikeSitemapUrl } from "../src/services/web-product-import.service.js";
import { syncWebRows } from "../src/services/web-product-import-save.service.js";
import { cleanupWebImportJobs } from "../src/services/web-product-import-job.service.js";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const lockDir = path.resolve(process.env.SHARED_DIR || path.join(process.cwd(), "shared"), "locks");
fs.mkdirSync(lockDir, { recursive: true });
const lock = path.join(lockDir, "web-product-auto-sync.lock");
try {
  const stat = fs.statSync(lock);
  if (now - stat.mtimeMs < 12 * 60 * 60 * 1000) process.exit(0);
} catch {}
fs.writeFileSync(lock, String(process.pid));

function parseSettings(raw) { try { const v=JSON.parse(raw||"{}"); return v&&typeof v==="object"?v:{}; } catch { return {}; } }
function saveSettings(source, settings) {
  db.prepare("UPDATE web_product_sources SET settings_json=?,updated_at=? WHERE id=? AND tenant_id=?").run(JSON.stringify(settings),Date.now(),source.id,source.tenant_id);
}
function history(source, status, counts = {}, details = {}) {
  db.prepare(`INSERT INTO web_product_import_history(id,tenant_id,user_id,source_id,source_name,base_url,status,discovered_count,analyzed_count,selected_count,added_count,updated_count,skipped_count,warning_count,details_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id("wih"),source.tenant_id,null,source.id,source.name,source.base_url,status,
    Number(counts.discovered||0),Number(counts.analyzed||0),Number(counts.selected||0),Number(counts.added||0),Number(counts.updated||0),Number(counts.skipped||0),Number(counts.warning||0),JSON.stringify({automatic:true,...details}),Date.now()
  );
}
function cleanupHistory() {
  const cutoff=Date.now()-3*DAY;
  db.prepare("DELETE FROM web_product_import_history WHERE created_at<? AND status NOT IN ('QUEUED','RUNNING','IMPORTING')").run(cutoff);
  try { cleanupWebImportJobs(3*DAY); } catch {}
}

try {
  cleanupHistory();
  const sources=db.prepare("SELECT * FROM web_product_sources WHERE is_active=1 ORDER BY updated_at").all();
  for (const source of sources) {
    if (!source.sitemap_url || !looksLikeSitemapUrl(source.sitemap_url)) continue;
    const settings=parseSettings(source.settings_json);
    const autoNew=settings.auto_new_scan !== false;
    const autoPrice=settings.auto_price_sync !== false;
    const newDue=autoNew && now-Number(settings.last_auto_new_scan_at||0) >= Number(settings.new_scan_interval_days||15)*DAY;
    const priceDue=autoPrice && now-Number(settings.last_auto_price_sync_at||0) >= Number(settings.price_sync_interval_hours||24)*60*60*1000;
    if (!newDue && !priceDue) continue;

    if (newDue) {
      try {
        const discovery=await discoverAllProductUrls({baseUrl:source.base_url,sitemapUrl:source.sitemap_url,pattern:source.product_path_pattern,maxUrls:20000});
        const existingUrls=new Set(db.prepare("SELECT product_url FROM products WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND product_url IS NOT NULL AND product_url<>''").all(source.tenant_id).map(x=>String(x.product_url||"").replace(/\/$/,"")));
        const newUrls=discovery.urls.filter(u=>!existingUrls.has(String(u).replace(/\/$/,"")));
        const rows=await analyzeUrls(newUrls,3);
        const result=await syncWebRows({tenantId:source.tenant_id,rows,mode:"FULL"});
        settings.last_auto_new_scan_at=Date.now();
        saveSettings(source,settings);
        history(source,"AUTO_NEW_SYNC",{discovered:discovery.total,analyzed:rows.length,selected:rows.length,...result,warning:result.imageWarnings+result.documentWarnings},{kind:"15_DAY_NEW_PRODUCT_SCAN"});
      } catch (error) {
        history(source,"AUTO_ERROR",{}, {kind:"15_DAY_NEW_PRODUCT_SCAN",error:String(error?.message||error)});
      }
    }

    if (priceDue) {
      try {
        const origin=new URL(source.base_url).origin;
        const productUrls=db.prepare("SELECT product_url FROM products WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND product_url LIKE ?").all(source.tenant_id,`${origin}%`).map(x=>x.product_url).filter(Boolean);
        const rows=await analyzeUrls(productUrls,3);
        const result=await syncWebRows({tenantId:source.tenant_id,rows,mode:"PRICE"});
        settings.last_auto_price_sync_at=Date.now();
        saveSettings(source,settings);
        history(source,"AUTO_PRICE_SYNC",{discovered:productUrls.length,analyzed:rows.length,selected:rows.length,...result},{kind:"24_HOUR_PRICE_SYNC"});
      } catch (error) {
        history(source,"AUTO_ERROR",{}, {kind:"24_HOUR_PRICE_SYNC",error:String(error?.message||error)});
      }
    }
  }
} finally {
  try { fs.unlinkSync(lock); } catch {}
}

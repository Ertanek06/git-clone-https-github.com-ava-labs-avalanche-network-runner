import { db } from "../db/db.js";
import { foldTR, upperTr } from "../utils/text.js";
import { analyzeUrls, discoverAllProductUrls } from "../services/web-product-import.service.js";
import { readWebImportJob, writeWebImportJob, readWebImportRows, writeWebImportRows } from "../services/web-product-import-job.service.js";

const jobId = process.argv[2];
const job = readWebImportJob(jobId);
if (!job) process.exit(2);

const recentProduct = (row, index) => ({
  index,
  name: String(row?.name || "").trim(),
  code: String(row?.code || "").trim(),
  image_url: String(row?.image_url || "").trim(),
  product_url: String(row?.product_url || "").trim(),
  price: Number(row?.price || 0),
  currency: String(row?.currency || "TRY"),
  brand: String(row?.brand || "").trim(),
  model: String(row?.model || "").trim(),
  category: String(row?.category || "").trim(),
  warning: String(row?.warning || "").trim()
});

const fail = (error) => {
  writeWebImportJob(jobId, {
    status: "ERROR", stage: "error", progress: null,
    error: String(error?.message || error || "Tarama başarısız."),
    completedAt: Date.now(), pid: null
  });
};

function productUrlKey(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch { return ""; }
}

let heartbeatTimer = null;
try {
  writeWebImportJob(jobId, {
    status: "RUNNING", stage: job.analysisCursor ? "analyze" : "discover", progress: null,
    startedAt: job.startedAt || Date.now(), pid: process.pid, error: null,
    message: job.analysisCursor ? "Kayıtlı tarama ilerlemesinden devam ediliyor." : "Kaynak siteye bağlanılıyor."
  });
  heartbeatTimer = setInterval(() => {
    try { writeWebImportJob(jobId, { heartbeatAt: Date.now(), pid: process.pid }); } catch {}
  }, 15000);

  const source = job.source || {};
  const discovery = Array.isArray(job.discovery?.urls) && job.discovery.urls.length
    ? job.discovery
    : await discoverAllProductUrls({
        baseUrl: source.base_url,
        sitemapUrl: source.sitemap_url || "",
        pattern: source.product_path_pattern || "/urun/|/product/|/products/",
        maxUrls: Number(source.max_products || 10000),
        onProgress: (p) => writeWebImportJob(jobId, {
          stage: p.stage || "discover", discovered: Number(p.products || 0),
          discoveryPages: Number(p.pages || 0), discoverySitemaps: Number(p.sitemaps || 0), progress: null,
          message: p.message || "Ürün bağlantıları aranıyor."
        })
      });

  if (!discovery.urls.length) throw new Error("Kaynak sitede ürün sayfası bulunamadı. Ana sayfa, sitemap ve ürün URL kalıbını kontrol edin.");

  writeWebImportJob(jobId, {
    stage: "analyze", discovered: discovery.total, discovery, discoveryWarnings: discovery.warnings || [],
    progress: 0, message: `${discovery.total} gerçek ürün sayfası bulundu. Ürün bilgileri analiz ediliyor.`
  });

  let allRows = readWebImportRows(jobId);
  let cursor = Math.max(0, Number(job.analysisCursor || 0));
  if (cursor > discovery.urls.length) { cursor = 0; allRows = []; writeWebImportRows(jobId, allRows); }
  let warningCompleted = Math.max(0, Number(job.warnings || 0));
  let discardedCompleted = Math.max(0, Number(job.discarded || 0));
  const recentProducts = Array.isArray(job.recentProducts) ? job.recentProducts.slice(-10) : [];
  const batchSize = 36;
  for (let start = cursor; start < discovery.urls.length; start += batchSize) {
    const batch = discovery.urls.slice(start, Math.min(discovery.urls.length, start + batchSize));
    const batchRows = await analyzeUrls(batch, 6, async (row, sourceIndex) => {
      if (row?.warning) warningCompleted++;
      if (row?.discarded) discardedCompleted++;
      if (row && !row.discarded && row.name) {
        recentProducts.push(recentProduct(row, start + sourceIndex));
        if (recentProducts.length > 10) recentProducts.shift();
      }
      const analyzedNow = start + sourceIndex + 1;
      writeWebImportJob(jobId, {
        stage: "analyze", analyzed: analyzedNow, warnings: warningCompleted, discarded: discardedCompleted,
        selected: allRows.filter((item) => item?.selected !== false).length, recentProducts: [...recentProducts],
        lastProduct: recentProducts.at(-1) || null,
        progress: Math.min(99, Math.round((analyzedNow / discovery.urls.length) * 100)),
        message: `${analyzedNow} / ${discovery.urls.length} sayfa işlendi · ${allRows.length} gerçek ürün kabul edildi.`
      });
    });
    for (const row of batchRows) allRows.push({ ...row, index: allRows.length });
    cursor = start + batch.length;
    writeWebImportRows(jobId, allRows);
    writeWebImportJob(jobId, {
      analysisCursor: cursor, analyzed: cursor, validProducts: allRows.length,
      warnings: warningCompleted, discarded: discardedCompleted,
      progress: Math.min(99, Math.round((cursor / discovery.urls.length) * 100)),
      message: `${cursor} / ${discovery.urls.length} sayfa işlendi · ${allRows.length} gerçek ürün kontrol tablosuna hazırlandı.`
    });
  }

  const existing = db.prepare("SELECT code,name,product_url FROM products WHERE tenant_id=? AND COALESCE(deleted_at,0)=0").all(job.tenantId);
  const existingCodes = new Set(existing.map((x) => upperTr(x.code)).filter(Boolean));
  const existingNames = new Set(existing.map((x) => foldTR(x.name)).filter(Boolean));
  const existingUrls = new Set(existing.map((x) => productUrlKey(x.product_url)).filter(Boolean));

  allRows = allRows.map((row, index) => {
    const codeDup = existingCodes.has(upperTr(row.code));
    const urlDup = existingUrls.has(productUrlKey(row.product_url));
    const nameDup = existingNames.has(foldTR(row.name));
    const duplicate = codeDup || urlDup || nameDup;
    const requiredOk = !!row.code && !!row.name;
    return {
      ...row,
      index,
      duplicate_match: duplicate,
      duplicate_reason: codeDup ? "CODE" : urlDup ? "URL" : nameDup ? "NAME" : "",
      selected: !duplicate && requiredOk && row.selected !== false,
      duplicate_action: "UPDATE",
      download_image: !!row.image_url
    };
  });

  writeWebImportRows(jobId, allRows);
  writeWebImportJob(jobId, {
    status: "READY", stage: "ready", progress: 100, analyzed: discovery.urls.length,
    validProducts: allRows.length, discarded: discardedCompleted,
    warnings: warningCompleted,
    selected: allRows.filter((row) => row.selected !== false).length,
    recentProducts: allRows.slice(-10).map((row, idx) => recentProduct(row, allRows.length - Math.min(10, allRows.length) + idx)),
    lastProduct: allRows.length ? recentProduct(allRows.at(-1), allRows.length - 1) : null,
    completedAt: Date.now(),
    message: `${allRows.length} gerçek ürün kontrol tablosuna alındı. ${discardedCompleted} hatalı/bağlantı satırı sonuçlardan çıkarıldı.`,
    pid: null
  });
} catch (error) {
  console.error("[web-product-import-worker]", error);
  fail(error);
  process.exitCode = 1;
} finally {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
}

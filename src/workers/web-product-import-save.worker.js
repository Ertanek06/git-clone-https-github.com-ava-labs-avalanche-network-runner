import { readWebImportJob, readWebImportRows, writeWebImportJob } from "../services/web-product-import-job.service.js";
import { saveWebImportRows } from "../services/web-product-import-save.service.js";
import { db } from "../db/db.js";

const jobId = process.argv[2];
const job = readWebImportJob(jobId);
if (!job) process.exit(2);

function persistHistory(status, result = {}, error = "") {
  if (!job.historyId) return;
  const current = db.prepare("SELECT details_json FROM web_product_import_history WHERE tenant_id=? AND id=? LIMIT 1").get(job.tenantId, job.historyId);
  if (!current) return;
  let details = {};
  try { details = JSON.parse(current.details_json || "{}"); } catch {}
  details = { ...details, job_id: job.id, import_result: result, import_error: error || "", imported_at: status === "IMPORTED" ? Date.now() : null };
  db.prepare(`UPDATE web_product_import_history SET status=?,selected_count=?,added_count=?,updated_count=?,skipped_count=?,details_json=? WHERE tenant_id=? AND id=?`).run(
    status,
    Number(result.selected ?? job.selected ?? 0),
    Number(result.added || 0),
    Number(result.updated || 0),
    Number(result.skipped || 0),
    JSON.stringify(details),
    job.tenantId,
    job.historyId
  );
}

const fail = (error) => {
  persistHistory("READY", {}, String(error?.message || error || "Aktarım başarısız."));
  writeWebImportJob(jobId, {
    status: "READY",
    stage: "ready",
    progress: 100,
    importError: String(error?.message || error || "Aktarım başarısız."),
    importPid: null,
    message: "Aktarım tamamlanamadı. Kontrol tablosundaki seçimler korunuyor."
  });
};

try {
  const rows = readWebImportRows(jobId);
  const selected = rows.filter((r) => r && r.selected !== false);
  writeWebImportJob(jobId, {
    status: "IMPORTING",
    stage: "import",
    progress: 0,
    importStartedAt: Date.now(),
    importProcessed: 0,
    importTotal: selected.length,
    importPid: process.pid,
    importError: null,
    message: `${selected.length} seçili ürün CRM'e aktarılıyor.`
  });

  const result = await saveWebImportRows({
    tenantId: job.tenantId,
    rows,
    source: job.source || {},
    onProgress: (p) => {
      const total = Number(p.total || selected.length || 1);
      const processed = Math.max(0, Number(p.index || 0));
      writeWebImportJob(jobId, {
        status: "IMPORTING",
        stage: "import",
        progress: Math.min(99, Math.round((processed / total) * 100)),
        importProcessed: processed,
        importTotal: total,
        lastProduct: p.row ? {
          name: String(p.row.name || ""),
          code: String(p.row.code || ""),
          image_url: String(p.row.image_url || ""),
          product_url: String(p.row.product_url || "")
        } : null,
        message: p.message || `${processed} / ${total} ürün kaydediliyor.`
      });
    }
  });

  result.selected = selected.length;
  persistHistory("IMPORTED", result);

  writeWebImportJob(jobId, {
    status: "IMPORTED",
    stage: "imported",
    progress: 100,
    importedAt: Date.now(),
    completedAt: Date.now(),
    importProcessed: selected.length,
    importTotal: selected.length,
    importPid: null,
    importResult: result,
    message: `${result.added} yeni ürün eklendi, ${result.updated} ürün güncellendi, ${result.skipped} ürün atlandı.`
  });
} catch (error) {
  console.error("[web-product-import-save-worker]", error);
  fail(error);
  process.exitCode = 1;
}

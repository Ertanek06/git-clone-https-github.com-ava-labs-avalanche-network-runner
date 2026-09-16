import fs from "fs";
import { analyzeProformaFile, saveImportSession } from "../services/proforma-product-import.service.js";
import { readImportJob, writeImportJob } from "../services/product-import-job.service.js";
const jobId = process.argv[2];
const job = readImportJob(jobId);
if (!job) process.exit(2);
let finishing = false;
const finish = (code = 0) => {
  if (finishing) return;
  finishing = true;
  try {
    if (job.file?.path) fs.rmSync(job.file.path, { force: true });
  } catch {}
  process.exit(code);
};
const cancelled = () => readImportJob(jobId)?.status === "CANCELLED";
process.on("SIGTERM", () => {
  if (!cancelled())
    writeImportJob(jobId, {
      status: "CANCELLED",
      stage: "cancelled",
      progress: 0,
      message: "İşlem kullanıcı tarafından iptal edildi.",
      error: "İşlem kullanıcı tarafından iptal edildi."
    });
  finish(0);
});
process.on("SIGINT", () => {
  if (!cancelled())
    writeImportJob(jobId, {
      status: "CANCELLED",
      stage: "cancelled",
      progress: 0,
      message: "İşlem kullanıcı tarafından iptal edildi.",
      error: "İşlem kullanıcı tarafından iptal edildi."
    });
  finish(0);
});
try {
  writeImportJob(jobId, {
    status: "RUNNING",
    stage: "extracting",
    progress: 15,
    workerPid: process.pid,
    startedAt: Date.now(),
    message: "Dosya metni ve tablo yapısı okunuyor."
  });
  const report = (payload) => {
    if (cancelled()) {
      const e = new Error("İşlem kullanıcı tarafından iptal edildi.");
      e.code = "IMPORT_CANCELLED";
      throw e;
    }
    writeImportJob(jobId, { status: "RUNNING", ...payload });
  };
  const data = await analyzeProformaFile(job.file, report);
  if (cancelled()) finish(0);
  writeImportJob(jobId, {
    stage: "validating",
    progress: 88,
    message: "Gerçek ürün satırları doğrulanıyor ve ön izleme hazırlanıyor.",
    ocrUsed: Boolean(data.meta?.sources?.includes("ocr")),
    sourceKind: data.meta?.selectedSource || null
  });
  data.startedAt = job.createdAt;
  const token = saveImportSession({ tenantId: job.tenantId, userId: job.userId, data });
  writeImportJob(jobId, {
    status: "COMPLETED",
    stage: "completed",
    progress: 100,
    message: "Tarama tamamlandı; ön izleme hazır.",
    token,
    previewUrl: `/products/import-proforma/${token}/preview`,
    detectedCount: data.rows?.length || 0,
    ocrUsed: Boolean(data.meta?.sources?.includes("ocr")),
    sourceKind: data.meta?.selectedSource || null,
    completedAt: Date.now()
  });
  finish(0);
} catch (error) {
  if (error?.code === "IMPORT_CANCELLED" || cancelled()) finish(0);
  writeImportJob(jobId, {
    status: "FAILED",
    stage: "failed",
    progress: Number(readImportJob(jobId)?.progress || 0),
    message: "Tarama tamamlanamadı.",
    error: String(error?.message || error).slice(0, 600),
    code: error?.code || ""
  });
  finish(1);
}

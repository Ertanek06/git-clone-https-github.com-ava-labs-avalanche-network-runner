import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config.js";

const dir = path.join(config.privateUploadDir, "web-product-import-jobs");
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const clean = (value) => String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
const jobPath = (jobId) => path.join(dir, `${clean(jobId)}.json`);
const rowsPath = (jobId) => path.join(dir, `${clean(jobId)}.rows.json`);

export function createWebImportJob({ tenantId, userId, source }) {
  const id = crypto.randomBytes(18).toString("base64url");
  const now = Date.now();
  const job = {
    id,
    tenantId,
    userId,
    source,
    status: "QUEUED",
    stage: "queued",
    progress: 0,
    discovered: 0,
    analyzed: 0,
    warnings: 0,
    selected: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    error: null,
    pid: null
  };
  fs.writeFileSync(jobPath(id), JSON.stringify(job), { mode: 0o600 });
  fs.writeFileSync(rowsPath(id), "[]", { mode: 0o600 });
  return job;
}

export function readWebImportJob(jobId) {
  try { return JSON.parse(fs.readFileSync(jobPath(jobId), "utf8")); }
  catch { return null; }
}

export function writeWebImportJob(jobId, patch = {}) {
  const old = readWebImportJob(jobId) || { id: clean(jobId) };
  const next = { ...old, ...patch, updatedAt: Date.now() };
  fs.writeFileSync(jobPath(jobId), JSON.stringify(next), { mode: 0o600 });
  return next;
}

export function readWebImportRows(jobId) {
  try {
    const rows = JSON.parse(fs.readFileSync(rowsPath(jobId), "utf8"));
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

export function writeWebImportRows(jobId, rows = []) {
  const tmp = `${rowsPath(jobId)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(Array.isArray(rows) ? rows : []), { mode: 0o600 });
  fs.renameSync(tmp, rowsPath(jobId));
  return rows;
}

export function patchWebImportRow(jobId, index, patch = {}) {
  const rows = readWebImportRows(jobId);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= rows.length) return null;
  rows[i] = { ...rows[i], ...patch, index: i };
  writeWebImportRows(jobId, rows);
  return rows[i];
}

export function deleteWebImportJob(jobId) {
  const paths = [jobPath(jobId), rowsPath(jobId)];
  let removed = 0;
  for (const file of paths) {
    try { fs.unlinkSync(file); removed++; } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  return removed;
}

export function cleanupWebImportJobs(maxAgeMs = 3 * 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - Math.max(60_000, Number(maxAgeMs) || 0);
  let removed = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!/^[a-zA-Z0-9_-]+(?:\.rows)?\.json$/.test(name)) continue;
    const full = path.join(dir, name);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) { fs.unlinkSync(full); removed++; }
    } catch {}
  }
  return removed;
}

export function ownsWebImportJob(job, tenantId, userId) {
  return !!job && job.tenantId === tenantId && job.userId === userId;
}

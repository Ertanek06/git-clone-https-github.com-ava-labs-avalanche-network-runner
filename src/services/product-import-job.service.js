import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../config.js";

const dir = path.join(config.privateUploadDir, "product-import-jobs");
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const clean = (id) => String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
const jobPath = (id) => path.join(dir, `${clean(id)}.json`);
export function createImportJob({ tenantId, userId, file }) {
  const id = crypto.randomBytes(18).toString("base64url");
  const job = {
    id,
    tenantId,
    userId,
    status: "QUEUED",
    stage: "queued",
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    file: { path: file.path, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
    pid: null,
    previewUrl: null,
    error: null
  };
  fs.writeFileSync(jobPath(id), JSON.stringify(job), { mode: 0o600 });
  return job;
}
export function readImportJob(id) {
  try {
    return JSON.parse(fs.readFileSync(jobPath(id), "utf8"));
  } catch {
    return null;
  }
}
export function writeImportJob(id, patch) {
  const old = readImportJob(id) || { id: clean(id) };
  const next = { ...old, ...patch, updatedAt: Date.now() };
  fs.writeFileSync(jobPath(id), JSON.stringify(next), { mode: 0o600 });
  return next;
}
export function ownsImportJob(job, tenantId, userId) {
  return job && job.tenantId === tenantId && job.userId === userId;
}
export function removeImportJob(id) {
  try {
    fs.rmSync(jobPath(id), { force: true });
  } catch {}
}

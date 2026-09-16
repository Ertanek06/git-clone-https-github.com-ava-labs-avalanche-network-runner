import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../src/config.js";

const target = process.env.PREINSTALL_DB_BACKUP || path.join(config.backupDir, `pre-install-${Date.now()}.sqlite`);
fs.mkdirSync(path.dirname(target), { recursive:true, mode:0o700 });
const db = new Database(config.dbFile, { fileMustExist:true });
try { db.pragma("busy_timeout = 10000"); await db.backup(target); } finally { db.close(); }
const verify = new Database(target, { readonly:true, fileMustExist:true });
const integrity = String(verify.pragma("integrity_check", { simple:true }));
verify.close();
if (integrity.toLowerCase() !== "ok") throw new Error("Kurulum öncesi DB yedeği integrity kontrolünden geçemedi.");
fs.chmodSync(target, 0o600);
console.log(`PREINSTALL_DB_BACKUP_OK=${target}`);

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { config } from "../config.js";
fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
export const db = new Database(config.dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
export const hasTable = (name) =>
  !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
export const columns = (name) =>
  new Set(
    db
      .prepare(`PRAGMA table_info(${name})`)
      .all()
      .map((x) => x.name)
  );

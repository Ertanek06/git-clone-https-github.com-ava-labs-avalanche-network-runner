import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import session from "express-session";

const now = () => Date.now();
const callback = (cb, error, value) => {
  if (typeof cb === "function") cb(error, value);
};
const sessionExpiry = (value) => {
  const cookie = value?.cookie || {};
  const expires = cookie.expires ? new Date(cookie.expires).getTime() : NaN;
  if (Number.isFinite(expires)) return expires;
  const maxAge = Number(cookie.originalMaxAge ?? cookie.maxAge);
  return now() + (Number.isFinite(maxAge) && maxAge > 0 ? maxAge : 24 * 60 * 60 * 1000);
};

export class BetterSqliteSessionStore extends session.Store {
  constructor({ file, cleanupIntervalMs = 60 * 60 * 1000 } = {}) {
    super();
    if (!file) throw new Error("Oturum veritabanı yolu zorunludur.");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS sessions(sid TEXT PRIMARY KEY,expired INTEGER NOT NULL,sess TEXT NOT NULL)"
    );
    const columns = new Set(
      this.db
        .prepare("PRAGMA table_info(sessions)")
        .all()
        .map((row) => row.name)
    );
    if (!columns.has("updated_at"))
      this.db.exec("ALTER TABLE sessions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0");
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired)");
    this.read = this.db.prepare("SELECT sess,expired FROM sessions WHERE sid=?");
    this.write = this.db.prepare(
      "INSERT INTO sessions(sid,expired,sess,updated_at) VALUES(?,?,?,?) ON CONFLICT(sid) DO UPDATE SET expired=excluded.expired,sess=excluded.sess,updated_at=excluded.updated_at"
    );
    this.remove = this.db.prepare("DELETE FROM sessions WHERE sid=?");
    this.touchRow = this.db.prepare("UPDATE sessions SET expired=?,updated_at=? WHERE sid=?");
    this.removeExpired = this.db.prepare("DELETE FROM sessions WHERE expired<?");
    this.timer = setInterval(
      () => {
        try {
          this.removeExpired.run(now());
        } catch (error) {
          this.emit("disconnect", error);
        }
      },
      Math.max(60_000, Number(cleanupIntervalMs) || 60 * 60 * 1000)
    );
    this.timer.unref?.();
  }

  get(sid, cb) {
    try {
      const row = this.read.get(String(sid));
      if (!row) return callback(cb, null, null);
      if (Number(row.expired) <= now()) {
        this.remove.run(String(sid));
        return callback(cb, null, null);
      }
      return callback(cb, null, JSON.parse(row.sess));
    } catch (error) {
      return callback(cb, error);
    }
  }

  set(sid, value, cb) {
    try {
      this.write.run(String(sid), sessionExpiry(value), JSON.stringify(value || {}), now());
      return callback(cb, null);
    } catch (error) {
      return callback(cb, error);
    }
  }

  touch(sid, value, cb) {
    try {
      const result = this.touchRow.run(sessionExpiry(value), now(), String(sid));
      if (!result.changes) return this.set(sid, value, cb);
      return callback(cb, null);
    } catch (error) {
      return callback(cb, error);
    }
  }

  destroy(sid, cb) {
    try {
      this.remove.run(String(sid));
      return callback(cb, null);
    } catch (error) {
      return callback(cb, error);
    }
  }

  clear(cb) {
    try {
      this.db.prepare("DELETE FROM sessions").run();
      return callback(cb, null);
    } catch (error) {
      return callback(cb, error);
    }
  }

  length(cb) {
    try {
      this.removeExpired.run(now());
      return callback(
        cb,
        null,
        Number(this.db.prepare("SELECT COUNT(*) AS count FROM sessions").get().count || 0)
      );
    } catch (error) {
      return callback(cb, error);
    }
  }

  all(cb) {
    try {
      this.removeExpired.run(now());
      const rows = this.db
        .prepare("SELECT sess FROM sessions ORDER BY updated_at DESC")
        .all()
        .map((row) => JSON.parse(row.sess));
      return callback(cb, null, rows);
    } catch (error) {
      return callback(cb, error);
    }
  }

  close() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.db?.open) this.db.close();
  }
}

export const createSessionStore = (dbFile) =>
  new BetterSqliteSessionStore({ file: path.join(path.dirname(dbFile), "sessions.sqlite") });

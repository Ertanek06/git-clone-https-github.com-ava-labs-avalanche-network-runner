import crypto from "crypto";
import { db } from "../db/db.js";
import { encryptSecret } from "../utils/secrets.js";

const tokenHash = (value) =>
  crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest("hex");
const redactLinks = (value) =>
  String(value || "")
    .replace(/https?:\/\/[^\s<>"']+\/q\/[A-Za-z0-9_-]+/gi, "[GÜVENLİ TEKLİF BAĞLANTISI]")
    .replace(/\/q\/[A-Za-z0-9_-]+/g, "/q/[REDACTED]");

export function migrateStoredSecrets() {
  const smtp = db.prepare("SELECT id,password FROM smtp_settings WHERE COALESCE(password,'')<>''").all();
  const smtpUpdate = db.prepare("UPDATE smtp_settings SET password=?,updated_at=? WHERE id=?");
  const integrations = db
    .prepare("SELECT id,api_key FROM integration_settings WHERE COALESCE(api_key,'')<>''")
    .all();
  const integrationUpdate = db.prepare("UPDATE integration_settings SET api_key=?,updated_at=? WHERE id=?");
  const tokens = db
    .prepare("SELECT id,token,token_hash FROM quote_share_tokens WHERE COALESCE(token,'')<>''")
    .all();
  const tokenUpdate = db.prepare("UPDATE quote_share_tokens SET token=?,token_hash=? WHERE id=?");
  const logs = db
    .prepare(
      "SELECT id,body,share_url FROM quote_send_logs WHERE COALESCE(body,'')<>'' OR COALESCE(share_url,'')<>''"
    )
    .all();
  const logUpdate = db.prepare("UPDATE quote_send_logs SET body=?,share_url=? WHERE id=?");
  const now = Date.now();
  db.transaction(() => {
    for (const row of smtp) {
      const encrypted = encryptSecret(row.password);
      if (encrypted !== row.password) smtpUpdate.run(encrypted, now, row.id);
    }
    for (const row of integrations) {
      const encrypted = encryptSecret(row.api_key);
      if (encrypted !== row.api_key) integrationUpdate.run(encrypted, now, row.id);
    }
    for (const row of tokens) {
      if (row.token.startsWith("sha256:")) {
        const hash = row.token_hash || row.token.slice(7);
        if (hash !== row.token_hash) tokenUpdate.run(`sha256:${hash}`, hash, row.id);
        continue;
      }
      const hash = tokenHash(row.token);
      tokenUpdate.run(`sha256:${hash}`, hash, row.id);
    }
    for (const row of logs) {
      const body = redactLinks(row.body),
        shareUrl = redactLinks(row.share_url);
      if (body !== String(row.body || "") || shareUrl !== String(row.share_url || ""))
        logUpdate.run(body, shareUrl, row.id);
    }
  })();
}

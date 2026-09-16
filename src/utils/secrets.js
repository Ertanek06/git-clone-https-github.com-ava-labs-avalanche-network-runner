import crypto from "crypto";
import { config } from "../config.js";

const PREFIX = "enc:v1:";
function key() {
  return crypto
    .createHash("sha256")
    .update(String(config.dataEncryptionKey || config.sessionSecret))
    .digest();
}
export function encryptSecret(value) {
  const text = String(value ?? "");
  if (!text || text.startsWith(PREFIX)) return text;
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]),
    tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}
export function decryptSecret(value) {
  const text = String(value ?? "");
  if (!text.startsWith(PREFIX)) return text;
  try {
    const raw = Buffer.from(text.slice(PREFIX.length), "base64url"),
      iv = raw.subarray(0, 12),
      tag = raw.subarray(12, 28),
      encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
export function maskedSecret(value) {
  return value ? "••••••••" : "";
}

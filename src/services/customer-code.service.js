import { db } from "../db/db.js";
import { customerCodeNumber, nextCustomerCodeFromCodes } from "../utils/customer-code.js";

export function isCustomerCodeConflict(error) {
  return /UNIQUE constraint failed:\s*customers\.tenant_id,\s*customers\.code/i.test(
    String(error?.message || error || "")
  );
}

export function nextCustomerCode(tenantId, { minimum = 1 } = {}) {
  const rows = db.prepare("SELECT code FROM customers WHERE tenant_id=?").all(tenantId);
  return nextCustomerCodeFromCodes(
    rows.map((row) => row.code),
    { minimum }
  );
}

export function runWithNewCustomerCode(tenantId, runner, { maxAttempts = 25 } = {}) {
  let minimum = 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = nextCustomerCode(tenantId, { minimum });
    try {
      runner(code);
      return code;
    } catch (error) {
      if (!isCustomerCodeConflict(error)) throw error;
      minimum = customerCodeNumber(code) + 1;
    }
  }
  throw Object.assign(new Error("Yeni müşteri kodu üretilemedi. Lütfen tekrar deneyin."), {
    status: 409,
    expose: true
  });
}

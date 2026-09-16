import { db } from "../db/db.js";
export function nextQuoteNo(tenantId, date = new Date()) {
  const year = date.getFullYear(),
    yy = String(year).slice(-2);
  let val;
  db.transaction(() => {
    const row = db
      .prepare("SELECT last_value FROM quote_counters WHERE tenant_id=? AND year=?")
      .get(tenantId, year);
    val = (row?.last_value || 0) + 1;
    db.prepare(
      "INSERT INTO quote_counters(tenant_id,year,last_value) VALUES(?,?,?) ON CONFLICT(tenant_id,year) DO UPDATE SET last_value=excluded.last_value"
    ).run(tenantId, year, val);
  })();
  return `TEK${yy}${String(val).padStart(4, "0")}`;
}
export function nextOrderNo(tenantId, date = new Date()) {
  const year = date.getFullYear();
  let val;
  db.transaction(() => {
    const row = db
      .prepare("SELECT last_value FROM order_counters WHERE tenant_id=? AND year=?")
      .get(tenantId, year);
    val = (row?.last_value || 0) + 1;
    db.prepare(
      "INSERT INTO order_counters(tenant_id,year,last_value) VALUES(?,?,?) ON CONFLICT(tenant_id,year) DO UPDATE SET last_value=excluded.last_value"
    ).run(tenantId, year, val);
  })();
  return `SIP${String(year).slice(-2)}${String(val).padStart(4, "0")}`;
}

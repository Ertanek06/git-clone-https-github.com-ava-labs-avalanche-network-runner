import { Router } from "express";
import { db } from "../db/db.js";
import { requireAuth } from "../middleware/auth.js";
import { hasPermission } from "../services/permission.service.js";
import { searchText, safeText } from "../utils/text.js";
import { jsonParse } from "../utils/json.js";
const r = Router();
r.use(requireAuth);
const active = "COALESCE(deleted_at,0)=0";
function likeTokens(q) {
  return searchText(q).split(/\s+/).filter(Boolean).slice(0, 6);
}
function whereSearch(column, tokens, prefix = "s") {
  const params = {};
  const parts = tokens.map((tok, i) => {
    params[`${prefix}${i}`] = `%${tok}%`;
    return `${column} LIKE @${prefix}${i}`;
  });
  return { sql: parts.length ? parts.join(" AND ") : "1=1", params };
}
function result(req, q, limit) {
  const tokens = likeTokens(q);
  let customers = [],
    products = [],
    quotes = [];
  if (!tokens.length) return { customers, products, quotes };
  if (hasPermission(req.user, "customers", "view")) {
    const w = whereSearch("search_text", tokens, "c");
    customers = db
      .prepare(
        `SELECT id,code,company_name,contact_name,phone,mobile,email,tax_no,city FROM customers WHERE tenant_id=@t AND ${active} AND ${w.sql} ORDER BY updated_at DESC LIMIT @limit`
      )
      .all({ ...w.params, t: req.tenantId, limit });
  }
  if (hasPermission(req.user, "products", "view")) {
    const w = whereSearch("search_text", tokens, "p"),
      financial = hasPermission(req.user, "financials", "view");
    products = db
      .prepare(
        `SELECT id,code,name,brand,model,category,sale_price,currency,stock_qty FROM products WHERE tenant_id=@t AND ${active} AND ${w.sql} ORDER BY updated_at DESC LIMIT @limit`
      )
      .all({ ...w.params, t: req.tenantId, limit })
      .map((x) =>
        financial
          ? x
          : {
              id: x.id,
              code: x.code,
              name: x.name,
              brand: x.brand,
              model: x.model,
              category: x.category,
              currency: x.currency
            }
      );
  }
  if (hasPermission(req.user, "quotes", "view")) {
    const raw = `%${q}%`;
    quotes = db
      .prepare(
        `SELECT id,quote_no,revision_no,order_no,status,grand_total,currency,customer_snapshot_json,subject,project_name FROM quotes WHERE tenant_id=@t AND ${active} AND (quote_no LIKE @raw OR order_no LIKE @raw OR customer_snapshot_json LIKE @raw OR subject LIKE @raw OR project_name LIKE @raw OR project_code LIKE @raw) ORDER BY updated_at DESC LIMIT @limit`
      )
      .all({ t: req.tenantId, raw, limit })
      .map((x) => ({ ...x, customer_snapshot: jsonParse(x.customer_snapshot_json, {}) }));
  }
  return { customers, products, quotes };
}
r.get("/", (req, res) => {
  const q = safeText(req.query.q),
    limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
  res.setHeader("Cache-Control", "no-store");
  res.render("search/index", { title: "Genel Arama", q, ...result(req, q, limit) });
});
r.get("/json", (req, res) => {
  const q = safeText(req.query.q),
    limit = Math.min(8, Math.max(1, Number(req.query.limit) || 6));
  res.setHeader("Cache-Control", "no-store");
  res.json(result(req, q, limit));
});
export default r;

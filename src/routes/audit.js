import { Router } from "express";
import { db } from "../db/db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
const r = Router();
r.use(requireAuth, requirePermission("audit", "view"));
function loadRows(tenantId) {
  return db
    .prepare(
      `SELECT a.*,COALESCE(u.full_name,u.username,a.user_id,'-') user_label FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.tenant_id=? ORDER BY a.created_at DESC LIMIT 1000`
    )
    .all(tenantId);
}
r.get("/", (req, res) => {
  const rows = loadRows(req.tenantId);
  const summary = {
    total: rows.length,
    success: rows.filter((x) => String(x.result || "OK") === "OK").length,
    users: new Set(rows.map((x) => x.user_label).filter(Boolean)).size,
    modules: {}
  };
  for (const x of rows) summary.modules[x.module] = (summary.modules[x.module] || 0) + 1;
  summary.topModule = Object.entries(summary.modules).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
  res.setHeader("Cache-Control", "no-store");
  res.render("audit/index", { title: "İşlem Kayıtları", rows, summary });
});
r.all(["/delete-selected", "/delete-all"], (_req, res) =>
  res.status(405).send("İşlem kayıtları değiştirilemez ve silinemez.")
);
export default r;

import { Router } from "express";
import { db } from "../db/db.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { hasPermission } from "../services/permission.service.js";
const r = Router();
r.use(
  requireAuth,
  requireAnyPermission([
    ["customers", "export"],
    ["products", "export"],
    ["customers", "create"],
    ["customers", "edit"],
    ["products", "create"],
    ["products", "edit"]
  ])
);
r.get("/", (req, res) => {
  const capabilities = {
    customersExport: hasPermission(req.user, "customers", "export"),
    customersImport:
      hasPermission(req.user, "customers", "create") || hasPermission(req.user, "customers", "edit"),
    productsExport: hasPermission(req.user, "products", "export"),
    productsImport:
      hasPermission(req.user, "products", "create") || hasPermission(req.user, "products", "edit")
  };
  const stats = {
    customers:
      capabilities.customersExport || capabilities.customersImport
        ? Number(
            db
              .prepare("SELECT COUNT(*) n FROM customers WHERE tenant_id=? AND COALESCE(deleted_at,0)=0")
              .get(req.tenantId).n || 0
          )
        : 0,
    products:
      capabilities.productsExport || capabilities.productsImport
        ? Number(
            db
              .prepare("SELECT COUNT(*) n FROM products WHERE tenant_id=? AND COALESCE(deleted_at,0)=0")
              .get(req.tenantId).n || 0
          )
        : 0
  };
  res.render("excel/index", { title: "Excel İçe / Dışa Aktarma", stats, capabilities });
});
export default r;

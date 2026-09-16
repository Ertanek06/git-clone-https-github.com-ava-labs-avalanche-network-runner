import { db } from "../db/db.js";

export const permissionModules = [
  "customers",
  "products",
  "quotes",
  "approvals",
  "orders",
  "invoices",
  "financials",
  "live",
  "settings",
  "integrations",
  "backups",
  "users",
  "audit"
];
export const permissionActions = ["view", "create", "edit", "archive", "approve", "export", "admin"];

const all = [...permissionActions];
const defaults = {
  SUPER_ADMIN: Object.fromEntries(permissionModules.map((module) => [module, all])),
  TENANT_ADMIN: {
    customers: all,
    products: all,
    quotes: all,
    approvals: all,
    orders: all,
    invoices: all,
    financials: ["view", "export"],
    live: all,
    settings: ["view", "edit", "admin"],
    integrations: ["view", "edit", "admin"],
    backups: ["view", "export", "admin"],
    users: ["view", "create", "edit", "admin"],
    audit: ["view", "export"]
  },
  STAFF: {
    customers: ["view", "create", "edit"],
    products: ["view", "create", "edit", "export"],
    quotes: ["view", "create", "edit", "export"],
    approvals: [],
    orders: ["view", "create", "edit"],
    invoices: ["view", "create", "edit", "export"],
    financials: ["view", "edit"],
    live: ["view", "create", "edit"],
    settings: ["view"],
    integrations: [],
    backups: [],
    users: [],
    audit: []
  },
  VIEWER: {
    customers: ["view"],
    products: ["view"],
    quotes: ["view"],
    approvals: [],
    orders: ["view"],
    invoices: [],
    financials: [],
    live: [],
    settings: [],
    integrations: [],
    backups: [],
    users: [],
    audit: []
  }
};

export function defaultPermissionMatrix() {
  return Object.fromEntries(
    Object.entries(defaults).map(([role, modules]) => [
      role,
      Object.fromEntries(permissionModules.map((module) => [module, [...(modules[module] || [])]]))
    ])
  );
}

export function readPermissionMatrix(tenantId) {
  const base = defaultPermissionMatrix();
  if (!tenantId) return base;
  const row = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key='permission_matrix'")
    .get(tenantId);
  if (!row?.value_json) return base;
  try {
    const saved = JSON.parse(row.value_json);
    for (const role of Object.keys(base))
      for (const module of permissionModules) {
        const list = saved?.[role]?.[module];
        if (Array.isArray(list))
          base[role][module] = [...new Set(list.filter((action) => permissionActions.includes(action)))];
      }
    base.SUPER_ADMIN = Object.fromEntries(permissionModules.map((module) => [module, [...all]]));
    return base;
  } catch {
    return base;
  }
}

export function hasPermission(user, module, action = "view") {
  if (!user || !module) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const matrix = readPermissionMatrix(user.tenant_id);
  const list = matrix?.[user.role]?.[module] || [];
  return list.includes(action) || list.includes("admin");
}

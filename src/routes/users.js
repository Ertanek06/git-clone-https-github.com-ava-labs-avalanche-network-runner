import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { flash } from "../middleware/context.js";
import { audit } from "../services/audit.service.js";
import {
  permissionModules as modules,
  permissionActions as actions,
  readPermissionMatrix
} from "../services/permission.service.js";

const r = Router();
r.use(requireAuth, requirePermission("users", "admin"));
const allowedRoles = new Set(["SUPER_ADMIN", "TENANT_ADMIN", "STAFF", "VIEWER"]);
const strongPassword = (value) =>
  String(value || "").length >= 12 && /[a-zçğıöşü]/i.test(value) && /\d/.test(value);

function normalizeRole(req, requested, old) {
  const role = allowedRoles.has(requested) ? requested : "STAFF";
  if (req.user.role !== "SUPER_ADMIN" && role === "SUPER_ADMIN")
    throw Object.assign(
      new Error("SUPER_ADMIN rolünü yalnızca SUPER_ADMIN kullanıcı oluşturabilir veya atayabilir."),
      { status: 403, expose: true }
    );
  if (req.user.role !== "SUPER_ADMIN" && old?.role === "SUPER_ADMIN")
    throw Object.assign(new Error("SUPER_ADMIN kullanıcısını yalnızca SUPER_ADMIN düzenleyebilir."), {
      status: 403,
      expose: true
    });
  return role;
}
function ensureAdminContinuity(tenantId, old, nextRole, nextActive) {
  if (!old || !["SUPER_ADMIN", "TENANT_ADMIN"].includes(old.role) || Number(old.is_active) !== 1) return;
  if (["SUPER_ADMIN", "TENANT_ADMIN"].includes(nextRole) && Number(nextActive) === 1) return;
  const other = Number(
    db
      .prepare(
        "SELECT COUNT(*) n FROM users WHERE tenant_id=? AND id<>? AND is_active=1 AND role IN ('SUPER_ADMIN','TENANT_ADMIN')"
      )
      .get(tenantId, old.id).n || 0
  );
  if (other < 1)
    throw Object.assign(
      new Error("Firma içindeki son aktif yönetici pasifleştirilemez veya yönetici rolünden çıkarılamaz."),
      { status: 422, expose: true }
    );
}

r.get("/", (req, res) => {
  const rows = db
    .prepare(
      "SELECT id,username,email,phone,full_name,role,is_active,last_login_at,created_at FROM users WHERE tenant_id=? ORDER BY created_at DESC"
    )
    .all(req.tenantId);
  const activityStmt = db.prepare(
    "SELECT action,module,entity_id,ip,result,created_at FROM audit_logs WHERE tenant_id=? AND user_id=? ORDER BY created_at DESC LIMIT 12"
  );
  const activityByUser = Object.fromEntries(
    rows.map((user) => [user.id, activityStmt.all(req.tenantId, user.id)])
  );
  res.render("users/index", { title: "Kullanıcı Yönetimi", rows, activityByUser });
});
r.get("/permissions", (req, res) =>
  res.render("users/permissions", {
    title: "Rol ve Yetki Matrisi",
    matrix: readPermissionMatrix(req.tenantId),
    modules,
    actions
  })
);
r.post("/permissions", (req, res) => {
  const matrix = {};
  for (const role of ["SUPER_ADMIN", "TENANT_ADMIN", "STAFF", "VIEWER"]) {
    matrix[role] = {};
    for (const module of modules)
      matrix[role][module] =
        role === "SUPER_ADMIN"
          ? [...actions]
          : [
              ...new Set(
                [].concat(req.body?.[role]?.[module] || []).filter((action) => actions.includes(action))
              )
            ];
  }
  db.prepare(
    "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
  ).run(req.tenantId, "permission_matrix", JSON.stringify(matrix), Date.now());
  audit(req, { action: "PERMISSION_MATRIX_UPDATE", module: "USERS", newValue: matrix });
  flash(req, "success", "Rol ve yetki matrisi kaydedildi ve sunucu tarafında etkinleştirildi.");
  res.redirect("/users/permissions");
});
r.get("/new", (req, res) =>
  res.render("users/form", { title: "Yeni Kullanıcı", row: { role: "STAFF", is_active: 1 } })
);
r.get("/:id/edit", (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE tenant_id=? AND id=?").get(req.tenantId, req.params.id);
  if (!row) throw Object.assign(new Error("Kullanıcı bulunamadı."), { status: 404 });
  if (req.user.role !== "SUPER_ADMIN" && row.role === "SUPER_ADMIN")
    throw Object.assign(new Error("SUPER_ADMIN kullanıcısını düzenleme yetkiniz yok."), {
      status: 403,
      expose: true
    });
  res.render("users/form", { title: "Kullanıcı Düzenle", row });
});
r.post("/save", async (req, res, next) => {
  try {
    const old = req.body.id
      ? db.prepare("SELECT * FROM users WHERE tenant_id=? AND id=?").get(req.tenantId, req.body.id)
      : null;
    const uid = old?.id || id("usr"),
      now = Date.now(),
      role = normalizeRole(req, req.body.role, old),
      nextActive = Number(req.body.is_active || 0) === 1 ? 1 : 0;
    const plainPassword = String(req.body.password || "");
    if (!old && !plainPassword)
      throw Object.assign(new Error("Yeni kullanıcı için şifre zorunludur."), { status: 422, expose: true });
    if (plainPassword && !strongPassword(plainPassword))
      throw Object.assign(
        new Error("Şifre en az 12 karakter olmalı ve en az bir harf ile bir rakam içermelidir."),
        { status: 422, expose: true }
      );
    if (uid === req.user.id && nextActive !== 1)
      throw Object.assign(new Error("Kendi hesabınızı pasifleştiremezsiniz."), { status: 422, expose: true });
    ensureAdminContinuity(req.tenantId, old, role, nextActive);
    const password = plainPassword ? await bcrypt.hash(plainPassword, 12) : old?.password_hash;
    const securityChanged =
      !!old && (!!plainPassword || old.role !== role || Number(old.is_active) !== nextActive);
    const sessionVersion = securityChanged
      ? Number(old.session_version || 1) + 1
      : Number(old?.session_version || 1);
    if (old?.role !== role)
      audit(req, {
        action: "USER_ROLE_CHANGE",
        module: "USERS",
        entityId: uid,
        oldValue: { role: old?.role },
        newValue: { role }
      });
    const mustChangePassword = !old
      ? 1
      : plainPassword && uid !== req.user.id
        ? 1
        : Number(old.must_change_password || 0);
    db.prepare(
      `INSERT INTO users(id,tenant_id,username,email,phone,full_name,password_hash,role,is_active,session_version,must_change_password,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET username=excluded.username,email=excluded.email,phone=excluded.phone,full_name=excluded.full_name,password_hash=excluded.password_hash,role=excluded.role,is_active=excluded.is_active,session_version=excluded.session_version,must_change_password=excluded.must_change_password,updated_at=excluded.updated_at`
    ).run(
      uid,
      req.tenantId,
      String(req.body.username || "").trim(),
      req.body.email || null,
      req.body.phone || null,
      req.body.full_name || "",
      password,
      role,
      nextActive,
      sessionVersion,
      mustChangePassword,
      old?.created_at || now,
      now
    );
    audit(req, {
      action: old ? "USER_UPDATE" : "USER_CREATE",
      module: "USERS",
      entityId: uid,
      newValue: {
        username: req.body.username,
        role,
        is_active: nextActive,
        session_revoked: securityChanged,
        password: plainPassword ? "[CHANGED]" : "[UNCHANGED]"
      }
    });
    flash(
      req,
      "success",
      securityChanged
        ? "Kullanıcı kaydedildi; açık oturumları güvenlik nedeniyle sonlandırıldı."
        : "Kullanıcı kaydedildi."
    );
    res.redirect("/users");
  } catch (e) {
    if (String(e.message || "").includes("UNIQUE")) {
      e.status = 409;
      e.expose = true;
      e.message = "Kullanıcı adı, e-posta veya telefon başka bir hesapta kullanılıyor.";
    }
    next(e);
  }
});
export default r;

import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { jsonString } from "../utils/json.js";
export function audit(
  req,
  { action, module, entityId = null, oldValue = null, newValue = null, result = "OK" }
) {
  try {
    const tenantId = req.user?.tenant_id || req.tenantId || null;
    db.prepare(
      `INSERT INTO audit_logs(id,tenant_id,user_id,action,module,entity_id,ip,old_json,new_json,result,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id("aud"),
      tenantId,
      req.user?.id || null,
      action,
      module,
      entityId,
      req.ip,
      jsonString(oldValue),
      jsonString(newValue),
      result,
      Date.now()
    );
    // Audit kayıtları append-only tutulur. Ana işlem geçmişinde otomatik veya kullanıcı tetiklemeli hard-delete yapılmaz.
  } catch (e) {
    console.error("audit error", e.message);
  }
}

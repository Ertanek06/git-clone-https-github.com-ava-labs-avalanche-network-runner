import { db } from "../db/db.js";

function tableExists(name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function ensureColumn(table, name, ddl) {
  if (!tableExists(table)) return;
  const columns = new Set(
    db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((row) => row.name)
  );
  if (!columns.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
}

function safeExec(sql) {
  try {
    db.exec(sql);
  } catch (error) {
    console.error("[schema-repair] SQL uygulanamadı:", error?.message || error);
  }
}

export function ensureOperationalSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS quote_share_tokens(
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      quote_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      token_hash TEXT,
      recipient_email TEXT,
      expires_at INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      last_viewed_at INTEGER,
      view_count INTEGER NOT NULL DEFAULT 0,
      revoked_at INTEGER,
      send_log_id TEXT
    );
    CREATE TABLE IF NOT EXISTS quote_send_logs(
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      quote_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL DEFAULT '',
      cc_email TEXT,
      subject TEXT,
      body TEXT,
      share_url TEXT,
      share_url_secret TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      provider_message_id TEXT,
      error_message TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      sent_at INTEGER,
      viewed_at INTEGER,
      view_count INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER,
      deleted_by TEXT,
      mail_type TEXT NOT NULL DEFAULT 'QUOTE',
      template_snapshot_json TEXT
    );
    CREATE TABLE IF NOT EXISTS quote_view_events(
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      quote_id TEXT NOT NULL,
      send_log_id TEXT,
      token_id TEXT,
      ip TEXT,
      user_agent TEXT,
      event_type TEXT NOT NULL DEFAULT 'HUMAN_VIEW',
      page_view_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS backup_jobs(
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      user_id TEXT,
      file_path TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'READY',
      note TEXT,
      created_at INTEGER NOT NULL,
      sha256 TEXT,
      integrity_status TEXT,
      verified_at INTEGER,
      backup_scope TEXT NOT NULL DEFAULT 'SYSTEM'
    );
    CREATE TABLE IF NOT EXISTS product_alternatives(
      id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,product_id TEXT NOT NULL,alternative_product_id TEXT NOT NULL,
      alternative_type TEXT NOT NULL DEFAULT 'EQUIVALENT',note TEXT,created_by TEXT,created_at INTEGER NOT NULL,
      UNIQUE(tenant_id,product_id,alternative_product_id)
    );
    CREATE TABLE IF NOT EXISTS quote_followup_tasks(
      id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT NOT NULL,task_type TEXT NOT NULL,due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',assigned_user_id TEXT,note TEXT,completed_at INTEGER,snoozed_until TEXT,
      created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,priority TEXT NOT NULL DEFAULT 'NORMAL',
      metadata_json TEXT NOT NULL DEFAULT '{}',completed_by TEXT,UNIQUE(tenant_id,quote_id,task_type,due_date)
    );
    CREATE TABLE IF NOT EXISTS dashboard_widget_layouts(
      id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,user_id TEXT NOT NULL,widget_key TEXT NOT NULL,
      order_no INTEGER NOT NULL DEFAULT 0,column_no INTEGER NOT NULL DEFAULT 1,width INTEGER NOT NULL DEFAULT 1,
      x_px INTEGER NOT NULL DEFAULT 0,y_px INTEGER NOT NULL DEFAULT 0,width_px INTEGER NOT NULL DEFAULT 420,height_px INTEGER NOT NULL DEFAULT 220,
      is_visible INTEGER NOT NULL DEFAULT 1,is_locked INTEGER NOT NULL DEFAULT 0,is_collapsed INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,UNIQUE(tenant_id,user_id,widget_key)
    );
    CREATE TABLE IF NOT EXISTS dashboard_widget_events(
      id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,user_id TEXT NOT NULL,widget_key TEXT NOT NULL,event_type TEXT NOT NULL,
      old_json TEXT,new_json TEXT,created_at INTEGER NOT NULL
    );
  `);

  const tokenColumns = {
    tenant_id: "TEXT NOT NULL DEFAULT ''",
    quote_id: "TEXT NOT NULL DEFAULT ''",
    token: "TEXT",
    token_hash: "TEXT",
    recipient_email: "TEXT",
    expires_at: "INTEGER",
    is_active: "INTEGER NOT NULL DEFAULT 1",
    created_by: "TEXT",
    created_at: "INTEGER NOT NULL DEFAULT 0",
    last_viewed_at: "INTEGER",
    view_count: "INTEGER NOT NULL DEFAULT 0",
    revoked_at: "INTEGER",
    send_log_id: "TEXT"
  };
  const logColumns = {
    tenant_id: "TEXT NOT NULL DEFAULT ''",
    quote_id: "TEXT NOT NULL DEFAULT ''",
    recipient_email: "TEXT NOT NULL DEFAULT ''",
    cc_email: "TEXT",
    subject: "TEXT",
    body: "TEXT",
    share_url: "TEXT",
    share_url_secret: "TEXT",
    status: "TEXT NOT NULL DEFAULT 'PENDING'",
    provider_message_id: "TEXT",
    error_message: "TEXT",
    created_by: "TEXT",
    created_at: "INTEGER NOT NULL DEFAULT 0",
    sent_at: "INTEGER",
    viewed_at: "INTEGER",
    view_count: "INTEGER NOT NULL DEFAULT 0",
    deleted_at: "INTEGER",
    deleted_by: "TEXT",
    mail_type: "TEXT NOT NULL DEFAULT 'QUOTE'",
    template_snapshot_json: "TEXT"
  };
  const viewColumns = { event_type: "TEXT NOT NULL DEFAULT 'HUMAN_VIEW'", page_view_id: "TEXT" };
  const backupColumns = {
    tenant_id: "TEXT",
    user_id: "TEXT",
    file_path: "TEXT NOT NULL DEFAULT ''",
    file_name: "TEXT NOT NULL DEFAULT ''",
    size_bytes: "INTEGER NOT NULL DEFAULT 0",
    status: "TEXT NOT NULL DEFAULT 'READY'",
    note: "TEXT",
    created_at: "INTEGER NOT NULL DEFAULT 0",
    sha256: "TEXT",
    integrity_status: "TEXT",
    verified_at: "INTEGER",
    backup_scope: "TEXT NOT NULL DEFAULT 'SYSTEM'"
  };
  for (const [name, ddl] of Object.entries(tokenColumns)) ensureColumn("quote_share_tokens", name, ddl);
  for (const [name, ddl] of Object.entries(logColumns)) ensureColumn("quote_send_logs", name, ddl);
  for (const [name, ddl] of Object.entries(viewColumns)) ensureColumn("quote_view_events", name, ddl);
  for (const [name, ddl] of Object.entries({
    approved_at: "INTEGER",
    ordered_at: "INTEGER",
    delivered_at: "INTEGER",
    rejected_at: "INTEGER"
  }))
    ensureColumn("quotes", name, ddl);
  for (const [name, ddl] of Object.entries(backupColumns)) ensureColumn("backup_jobs", name, ddl);
  ensureColumn("quotes", "form_instance_id", "TEXT");
  ensureColumn("quotes", "template_snapshot_json", "TEXT");
  ensureColumn("quote_items", "alternative_to_product_id", "TEXT");
  ensureColumn("quote_items", "alternative_to_name", "TEXT");
  ensureColumn("quote_items", "alternative_type", "TEXT NOT NULL DEFAULT 'EQUIVALENT'");
  ensureColumn("quote_items", "alternative_note", "TEXT");
  ensureColumn("quote_followup_tasks", "priority", "TEXT NOT NULL DEFAULT 'NORMAL'");
  ensureColumn("quote_followup_tasks", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("quote_followup_tasks", "completed_by", "TEXT");
  ensureColumn("dashboard_widget_layouts", "x_px", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("dashboard_widget_layouts", "y_px", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("dashboard_widget_layouts", "width_px", "INTEGER NOT NULL DEFAULT 420");
  ensureColumn("dashboard_widget_layouts", "height_px", "INTEGER NOT NULL DEFAULT 220");

  safeExec(`
    UPDATE quote_send_logs SET status='PENDING' WHERE status IS NULL OR status='';
    UPDATE quote_send_logs SET mail_type='QUOTE' WHERE mail_type IS NULL OR mail_type='';
    UPDATE quote_send_logs SET recipient_email='' WHERE recipient_email IS NULL;
    UPDATE quote_share_tokens SET is_active=1 WHERE is_active IS NULL;
    UPDATE quote_share_tokens SET view_count=0 WHERE view_count IS NULL;
    UPDATE backup_jobs SET backup_scope='SYSTEM' WHERE backup_scope IS NULL OR backup_scope='';
    CREATE INDEX IF NOT EXISTS idx_quote_share_tokens_quote ON quote_share_tokens(tenant_id,quote_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quote_share_tokens_send_log ON quote_share_tokens(tenant_id,send_log_id);
    CREATE INDEX IF NOT EXISTS idx_quote_send_logs_quote ON quote_send_logs(tenant_id,quote_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quote_send_logs_tracking ON quote_send_logs(tenant_id,status,view_count,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quote_view_events_quote ON quote_view_events(tenant_id,quote_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quote_view_events_dedupe ON quote_view_events(token_id,ip,created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_view_events_page ON quote_view_events(token_id,page_view_id) WHERE page_view_id IS NOT NULL AND page_view_id<>'';
    CREATE INDEX IF NOT EXISTS idx_quote_view_events_human ON quote_view_events(tenant_id,event_type,created_at DESC);
    CREATE TRIGGER IF NOT EXISTS trg_quotes_stage_timestamps AFTER UPDATE OF status ON quotes
    WHEN NEW.status<>OLD.status BEGIN
      UPDATE quotes SET
        approved_at=CASE WHEN NEW.status='APPROVED' THEN COALESCE(approved_at,NEW.updated_at) ELSE approved_at END,
        ordered_at=CASE WHEN NEW.status='ORDERED' THEN COALESCE(ordered_at,NEW.updated_at) ELSE ordered_at END,
        delivered_at=CASE WHEN NEW.status='DELIVERED' THEN COALESCE(delivered_at,NEW.updated_at) ELSE delivered_at END,
        rejected_at=CASE WHEN NEW.status='REJECTED' THEN COALESCE(rejected_at,NEW.updated_at) ELSE rejected_at END
      WHERE id=NEW.id;
    END;
    CREATE INDEX IF NOT EXISTS idx_backup_jobs ON backup_jobs(tenant_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_product_alternatives_product ON product_alternatives(tenant_id,product_id);
    CREATE INDEX IF NOT EXISTS idx_quote_followup_tasks_due ON quote_followup_tasks(tenant_id,status,due_date);
    CREATE INDEX IF NOT EXISTS idx_dashboard_widget_layout_user ON dashboard_widget_layouts(tenant_id,user_id,order_no);
    CREATE INDEX IF NOT EXISTS idx_dashboard_widget_events_user ON dashboard_widget_events(tenant_id,user_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quote_items_alternative ON quote_items(quote_id,is_alternative,alternative_to_product_id);
    CREATE INDEX IF NOT EXISTS idx_quote_items_product_lookup ON quote_items(product_id,quote_id,deleted_at);
    CREATE INDEX IF NOT EXISTS idx_quotes_customer_lookup ON quotes(tenant_id,customer_id,deleted_at,updated_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_form_instance ON quotes(tenant_id,form_instance_id) WHERE form_instance_id IS NOT NULL AND form_instance_id<>'';
  `);
  try {
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_share_token_hash ON quote_share_tokens(token_hash) WHERE token_hash IS NOT NULL"
    );
  } catch (error) {
    // Eski yarım kayıtlar aynı hash'i taşıyorsa yalnızca en yeni kaydı aktif bırak.
    try {
      db.exec(`UPDATE quote_share_tokens SET token_hash=NULL,is_active=0,revoked_at=COALESCE(revoked_at,CAST(strftime('%s','now') AS INTEGER)*1000)
        WHERE id IN (SELECT id FROM (SELECT id,ROW_NUMBER() OVER(PARTITION BY token_hash ORDER BY created_at DESC,id DESC) rn FROM quote_share_tokens WHERE token_hash IS NOT NULL) WHERE rn>1)`);
      db.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_share_token_hash ON quote_share_tokens(token_hash) WHERE token_hash IS NOT NULL"
      );
    } catch (second) {
      console.error("[schema-repair] token hash indeksi onarılamadı:", second?.message || second);
    }
  }
}

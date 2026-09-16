#!/usr/bin/env python3
from pathlib import Path
import json, re, sqlite3, tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "src/db/migrate.js").read_text(encoding="utf-8")
SQL_MIGRATIONS = [
    (int(v), sql)
    for v, sql in re.findall(r"\[\s*(\d+)\s*,\s*`([\s\S]*?)`\s*\]", SOURCE)
]
EXPECTED_SQL = list(range(1, 30)) + [51, 52]
if [v for v, _ in SQL_MIGRATIONS] != EXPECTED_SQL:
    raise SystemExit(f"SQL migration zinciri beklenenden farklı: {[v for v,_ in SQL_MIGRATIONS]}")
BASE_SQL_MIGRATIONS = [(v, sql) for v, sql in SQL_MIGRATIONS if v < 30]
TAIL_SQL_MIGRATIONS = [(v, sql) for v, sql in SQL_MIGRATIONS if v >= 51]

def has_column(conn, table, column):
    return column in {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}

def apply_30(conn):
    columns = {
        "products": {
            "product_code": "TEXT", "image_path": "TEXT", "brochure_path": "TEXT",
            "ce_certificate_url": "TEXT", "manual_url": "TEXT", "ce_certificate_path": "TEXT",
            "manual_path": "TEXT", "gtip": "TEXT", "origin": "TEXT"
        },
        "live_sites": {
            "privacy_notice": "TEXT NOT NULL DEFAULT 'Kişisel verileriniz talebinizi yanıtlamak amacıyla işlenir.'",
            "consent_required": "INTEGER NOT NULL DEFAULT 0", "retention_days": "INTEGER NOT NULL DEFAULT 365"
        }
    }
    for table, entries in columns.items():
        for name, ddl in entries.items():
            if not has_column(conn, table, name):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
    conn.executescript("""
      UPDATE products SET product_code=code WHERE (product_code IS NULL OR product_code='') AND code IS NOT NULL AND code<>'';
      UPDATE products SET image_path=image_url WHERE (image_path IS NULL OR image_path='') AND image_url IS NOT NULL;
      UPDATE products SET brochure_path=brochure_url WHERE (brochure_path IS NULL OR brochure_path='') AND brochure_url IS NOT NULL;
      UPDATE products SET ce_certificate_path=ce_certificate_url WHERE (ce_certificate_path IS NULL OR ce_certificate_path='') AND ce_certificate_url IS NOT NULL;
      UPDATE products SET manual_path=manual_url WHERE (manual_path IS NULL OR manual_path='') AND manual_url IS NOT NULL;
      UPDATE products SET gtip=gtip_no WHERE (gtip IS NULL OR gtip='') AND gtip_no IS NOT NULL;
      UPDATE products SET origin=origin_country WHERE (origin IS NULL OR origin='') AND origin_country IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
      CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
      CREATE TABLE IF NOT EXISTS rate_limits(bucket_key TEXT PRIMARY KEY,scope TEXT NOT NULL,request_count INTEGER NOT NULL DEFAULT 0,reset_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
    """)

def apply_31(conn):
    columns = {
        "quote_send_logs": {"cc_email": "TEXT", "share_url_secret": "TEXT"},
        "quote_share_tokens": {"send_log_id": "TEXT"}
    }
    for table, entries in columns.items():
        for name, ddl in entries.items():
            if not has_column(conn, table, name):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_quote_share_tokens_send_log ON quote_share_tokens(tenant_id,send_log_id)")

def apply_32(conn):
    columns = {
        "quote_send_logs": {"cc_email": "TEXT", "share_url_secret": "TEXT"},
        "quote_share_tokens": {"send_log_id": "TEXT"},
        "backup_jobs": {
            "sha256": "TEXT", "integrity_status": "TEXT", "verified_at": "INTEGER",
            "backup_scope": "TEXT NOT NULL DEFAULT 'SYSTEM'"
        }
    }
    for table, entries in columns.items():
        for name, ddl in entries.items():
            if not has_column(conn, table, name):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
    conn.execute("UPDATE backup_jobs SET backup_scope='SYSTEM' WHERE backup_scope IS NULL OR backup_scope=''")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_quote_share_tokens_send_log ON quote_share_tokens(tenant_id,send_log_id)")


def apply_33(conn):
    conn.executescript("""
      CREATE TABLE IF NOT EXISTS quote_share_tokens(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT NOT NULL,token TEXT NOT NULL UNIQUE,recipient_email TEXT,expires_at INTEGER,is_active INTEGER NOT NULL DEFAULT 1,created_by TEXT,created_at INTEGER NOT NULL,last_viewed_at INTEGER,view_count INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS quote_send_logs(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT NOT NULL,recipient_email TEXT NOT NULL DEFAULT '',subject TEXT,body TEXT,share_url TEXT,status TEXT NOT NULL DEFAULT 'PENDING',provider_message_id TEXT,error_message TEXT,created_by TEXT,created_at INTEGER NOT NULL,sent_at INTEGER,viewed_at INTEGER,view_count INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS quote_view_events(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT NOT NULL,send_log_id TEXT,token_id TEXT,ip TEXT,user_agent TEXT,created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS backup_jobs(id TEXT PRIMARY KEY,tenant_id TEXT,user_id TEXT,file_path TEXT NOT NULL DEFAULT '',file_name TEXT NOT NULL DEFAULT '',size_bytes INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'READY',note TEXT,created_at INTEGER NOT NULL DEFAULT 0);
    """)
    columns = {
        "quote_share_tokens": {"token_hash":"TEXT","revoked_at":"INTEGER","send_log_id":"TEXT"},
        "quote_send_logs": {"cc_email":"TEXT","share_url_secret":"TEXT","deleted_at":"INTEGER","deleted_by":"TEXT","mail_type":"TEXT NOT NULL DEFAULT 'QUOTE'"},
        "backup_jobs": {"sha256":"TEXT","integrity_status":"TEXT","verified_at":"INTEGER","backup_scope":"TEXT NOT NULL DEFAULT 'SYSTEM'"}
    }
    for table, entries in columns.items():
        for name, ddl in entries.items():
            if not has_column(conn, table, name): conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
    conn.executescript("""
      UPDATE quote_send_logs SET status='PENDING' WHERE status IS NULL OR status='';
      UPDATE quote_send_logs SET mail_type='QUOTE' WHERE mail_type IS NULL OR mail_type='';
      UPDATE backup_jobs SET backup_scope='SYSTEM' WHERE backup_scope IS NULL OR backup_scope='';
      CREATE INDEX IF NOT EXISTS idx_quote_share_tokens_send_log ON quote_share_tokens(tenant_id,send_log_id);
      CREATE INDEX IF NOT EXISTS idx_quote_send_logs_tracking ON quote_send_logs(tenant_id,status,view_count,created_at DESC);
    """)
    try:
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_share_token_hash ON quote_share_tokens(token_hash) WHERE token_hash IS NOT NULL")
    except sqlite3.IntegrityError:
        conn.execute("""UPDATE quote_share_tokens SET token_hash=NULL,is_active=0,revoked_at=COALESCE(revoked_at,0)
          WHERE id IN (SELECT id FROM (SELECT id,ROW_NUMBER() OVER(PARTITION BY token_hash ORDER BY created_at DESC,id DESC) rn FROM quote_share_tokens WHERE token_hash IS NOT NULL) WHERE rn>1)""")
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_share_token_hash ON quote_share_tokens(token_hash) WHERE token_hash IS NOT NULL")

def apply_34(conn):
    # v3.5.8 repeats the operational repair so half-applied live schemas are repaired again.
    apply_33(conn)

def apply_35(conn):
    if not has_column(conn, 'user_ui_settings', 'custom_json'):
        conn.execute("ALTER TABLE user_ui_settings ADD COLUMN custom_json TEXT NOT NULL DEFAULT '{}'")

def apply_36_37(conn):
    conn.executescript("""
      CREATE TABLE IF NOT EXISTS product_import_templates(
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, source_pattern TEXT,
        mapping_json TEXT NOT NULL DEFAULT '{}', defaults_json TEXT NOT NULL DEFAULT '{}',
        created_by TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(tenant_id,name));
      CREATE INDEX IF NOT EXISTS idx_product_import_templates_tenant ON product_import_templates(tenant_id,updated_at DESC);
      CREATE TABLE IF NOT EXISTS product_import_history(
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT, source_name TEXT, source_type TEXT,
        source_size INTEGER NOT NULL DEFAULT 0, template_name TEXT, status TEXT NOT NULL,
        detected_count INTEGER NOT NULL DEFAULT 0, selected_count INTEGER NOT NULL DEFAULT 0,
        added_count INTEGER NOT NULL DEFAULT 0, updated_count INTEGER NOT NULL DEFAULT 0,
        skipped_count INTEGER NOT NULL DEFAULT 0, warning_count INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0, details_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_product_import_history_tenant ON product_import_history(tenant_id,created_at DESC);
    """)


def apply_38(conn):
    apply_36_37(conn)

def apply_39(conn):
    conn.executescript("""
      CREATE TABLE IF NOT EXISTS product_alternatives(
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, product_id TEXT NOT NULL, alternative_product_id TEXT NOT NULL,
        alternative_type TEXT NOT NULL DEFAULT 'EQUIVALENT', note TEXT, created_by TEXT, created_at INTEGER NOT NULL,
        UNIQUE(tenant_id,product_id,alternative_product_id));
      CREATE INDEX IF NOT EXISTS idx_product_alternatives_product ON product_alternatives(tenant_id,product_id);
      CREATE TABLE IF NOT EXISTS quote_followup_tasks(
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, quote_id TEXT NOT NULL, task_type TEXT NOT NULL,
        due_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN', assigned_user_id TEXT, note TEXT,
        completed_at INTEGER, snoozed_until TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        UNIQUE(tenant_id,quote_id,task_type,due_date));
      CREATE INDEX IF NOT EXISTS idx_quote_followup_tasks_due ON quote_followup_tasks(tenant_id,status,due_date);
      CREATE TABLE IF NOT EXISTS quote_followup_mail_logs(
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, quote_id TEXT NOT NULL, mail_type TEXT NOT NULL,
        recipient TEXT, status TEXT NOT NULL, error_text TEXT, sent_at INTEGER NOT NULL,
        UNIQUE(tenant_id,quote_id,mail_type));
    """)

def apply_40(conn):
    columns={
      'quote_items':{
        'alternative_to_product_id':'TEXT','alternative_to_name':'TEXT',
        'alternative_type':"TEXT NOT NULL DEFAULT 'EQUIVALENT'",'alternative_note':'TEXT'
      },
      'quote_followup_tasks':{
        'priority':"TEXT NOT NULL DEFAULT 'NORMAL'",'metadata_json':"TEXT NOT NULL DEFAULT '{}'",'completed_by':'TEXT'
      }
    }
    for table,entries in columns.items():
      for name,ddl in entries.items():
        if not has_column(conn,table,name): conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
    conn.executescript("""
      CREATE TABLE IF NOT EXISTS dashboard_widget_layouts(
        id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,user_id TEXT NOT NULL,widget_key TEXT NOT NULL,
        order_no INTEGER NOT NULL DEFAULT 0,column_no INTEGER NOT NULL DEFAULT 1,width INTEGER NOT NULL DEFAULT 1,
        x_px INTEGER NOT NULL DEFAULT 0,y_px INTEGER NOT NULL DEFAULT 0,width_px INTEGER NOT NULL DEFAULT 420,height_px INTEGER NOT NULL DEFAULT 220,
        is_visible INTEGER NOT NULL DEFAULT 1,is_locked INTEGER NOT NULL DEFAULT 0,is_collapsed INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,UNIQUE(tenant_id,user_id,widget_key));
      CREATE INDEX IF NOT EXISTS idx_dashboard_widget_layout_user ON dashboard_widget_layouts(tenant_id,user_id,order_no);
      CREATE TABLE IF NOT EXISTS dashboard_widget_events(
        id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,user_id TEXT NOT NULL,widget_key TEXT NOT NULL,event_type TEXT NOT NULL,
        old_json TEXT,new_json TEXT,created_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_dashboard_widget_events_user ON dashboard_widget_events(tenant_id,user_id,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_quote_items_alternative ON quote_items(quote_id,is_alternative,alternative_to_product_id);
    """)

def apply_41(conn):
    for name,ddl in {
      'deleted_at':'INTEGER','deleted_by':'TEXT','created_at':'INTEGER','updated_at':'INTEGER'
    }.items():
      if not has_column(conn,'quote_items',name): conn.execute(f"ALTER TABLE quote_items ADD COLUMN {name} {ddl}")
    conn.executescript("""
      UPDATE quote_items SET created_at=COALESCE(created_at,(SELECT created_at FROM quotes WHERE quotes.id=quote_items.quote_id),CAST(strftime('%s','now') AS INTEGER)*1000);
      UPDATE quote_items SET updated_at=COALESCE(updated_at,created_at,CAST(strftime('%s','now') AS INTEGER)*1000);
      CREATE INDEX IF NOT EXISTS idx_quote_items_active ON quote_items(quote_id,deleted_at,sort_order);
      CREATE INDEX IF NOT EXISTS idx_quote_events_history ON quote_events(tenant_id,quote_id,created_at DESC);
    """)


def apply_42(conn):
    if not has_column(conn, "quotes", "form_instance_id"):
        conn.execute("ALTER TABLE quotes ADD COLUMN form_instance_id TEXT")
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_form_instance ON quotes(tenant_id,form_instance_id) WHERE form_instance_id IS NOT NULL AND form_instance_id<>''")

def apply_43(conn):
    for name, ddl in {
        "quote_discount_type": "TEXT NOT NULL DEFAULT 'PERCENT'",
        "quote_discount_value": "REAL NOT NULL DEFAULT 0",
        "quote_discount_total": "REAL NOT NULL DEFAULT 0",
    }.items():
        if not has_column(conn, "quotes", name):
            conn.execute(f"ALTER TABLE quotes ADD COLUMN {name} {ddl}")

def apply_44(conn):
    for table, columns in {
        "quote_view_events": {"event_type": "TEXT NOT NULL DEFAULT 'HUMAN_VIEW'", "page_view_id": "TEXT"},
        "quotes": {"approved_at": "INTEGER", "ordered_at": "INTEGER", "delivered_at": "INTEGER", "rejected_at": "INTEGER"},
    }.items():
        for name, ddl in columns.items():
            if not has_column(conn, table, name):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
    conn.executescript("""
      UPDATE quote_view_events SET event_type='HUMAN_VIEW' WHERE event_type IS NULL OR event_type='';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_view_events_page ON quote_view_events(token_id,page_view_id) WHERE page_view_id IS NOT NULL AND page_view_id<>'';
      CREATE INDEX IF NOT EXISTS idx_quote_view_events_human ON quote_view_events(tenant_id,event_type,created_at DESC);
      UPDATE quotes SET approved_at=COALESCE(approved_at,updated_at) WHERE status='APPROVED';
      UPDATE quotes SET ordered_at=COALESCE(ordered_at,updated_at) WHERE status='ORDERED';
      UPDATE quotes SET delivered_at=COALESCE(delivered_at,updated_at) WHERE status='DELIVERED';
      UPDATE quotes SET rejected_at=COALESCE(rejected_at,updated_at) WHERE status='REJECTED';
      CREATE TRIGGER IF NOT EXISTS trg_quotes_stage_timestamps AFTER UPDATE OF status ON quotes
      WHEN NEW.status<>OLD.status BEGIN
        UPDATE quotes SET
          approved_at=CASE WHEN NEW.status='APPROVED' THEN COALESCE(approved_at,NEW.updated_at) ELSE approved_at END,
          ordered_at=CASE WHEN NEW.status='ORDERED' THEN COALESCE(ordered_at,NEW.updated_at) ELSE ordered_at END,
          delivered_at=CASE WHEN NEW.status='DELIVERED' THEN COALESCE(delivered_at,NEW.updated_at) ELSE delivered_at END,
          rejected_at=CASE WHEN NEW.status='REJECTED' THEN COALESCE(rejected_at,NEW.updated_at) ELSE rejected_at END
        WHERE id=NEW.id;
      END;
    """)

def apply_45(conn):
    conn.executescript("""
      CREATE TABLE IF NOT EXISTS product_price_history(
        id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,product_id TEXT NOT NULL,
        old_price REAL NOT NULL,new_price REAL NOT NULL,currency TEXT NOT NULL DEFAULT 'TRY',
        change_type TEXT NOT NULL DEFAULT 'DIRECT',change_value REAL,changed_by TEXT,created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_product_price_history_product ON product_price_history(tenant_id,product_id,created_at DESC);
    """)

def apply_46(conn):
    keys = (
      "corporate-main", "executive-slate", "medical-clean", "laboratory-blue",
      "industrial-carbon", "export-navy", "minimal-white", "red-line",
      "silver-executive", "navy-corporate", "graphite-pro", "export-fca",
      "minimal-offer", "technical-lab", "compact-corporate", "skyline-blue",
      "emerald-frame", "gold-balance", "slate-matrix", "clean-lab-plus"
    )
    placeholders = ",".join("?" for _ in keys)
    conn.execute(
      f"UPDATE quote_templates SET deleted_at=NULL,deleted_by=NULL WHERE template_key IN ({placeholders}) AND COALESCE(deleted_at,0)<>0",
      keys
    )

def apply_47(conn):
    rows = conn.execute(
      "SELECT id,settings_json FROM quote_templates WHERE template_key NOT LIKE 'custom-%'"
    ).fetchall()
    structural = {
      "header_variant", "customer_variant", "item_variant", "terms_variant",
      "bank_variant", "signature_variant", "border_style", "logo_position",
      "card_radius", "title_variant", "totals_variant", "footer_variant",
      "spacing_variant", "table_density", "image_variant"
    }
    for row_id, raw in rows:
        try: settings = json.loads(raw or "{}")
        except Exception: settings = {}
        for key in structural: settings.pop(key, None)
        settings["design_version"] = 1
        conn.execute(
          "UPDATE quote_templates SET settings_json=?,deleted_at=NULL,deleted_by=NULL WHERE id=?",
          (json.dumps(settings), row_id)
        )

def run_case(preexisting=False, duplicate_hash=False):
    with tempfile.TemporaryDirectory() as tmp:
        conn = sqlite3.connect(str(Path(tmp) / "test.sqlite"))
        conn.execute("PRAGMA foreign_keys=ON")
        for version, sql in BASE_SQL_MIGRATIONS:
            conn.executescript(sql)
            conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,0)", (version,))
        if preexisting:
            conn.execute("ALTER TABLE products ADD COLUMN product_code TEXT")
            conn.execute("ALTER TABLE live_sites ADD COLUMN consent_required INTEGER NOT NULL DEFAULT 0")
            conn.execute("ALTER TABLE quote_send_logs ADD COLUMN cc_email TEXT")
        if duplicate_hash:
            conn.execute("DROP INDEX IF EXISTS idx_quote_share_token_hash")
            conn.execute("INSERT INTO quote_share_tokens(id,tenant_id,quote_id,token,token_hash,is_active,created_at) VALUES('dup-old','ten','quo','token-old','same-hash',1,1)")
            conn.execute("INSERT INTO quote_share_tokens(id,tenant_id,quote_id,token,token_hash,is_active,created_at) VALUES('dup-new','ten','quo','token-new','same-hash',1,2)")
        apply_30(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(30,0)")
        apply_31(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(31,0)")
        apply_32(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(32,0)")
        apply_33(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(33,0)")
        apply_34(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(34,0)")
        apply_35(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(35,0)")
        apply_36_37(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(36,0)")
        apply_36_37(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(37,0)")
        apply_38(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(38,0)")
        apply_39(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(39,0)")
        apply_40(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(40,0)")
        apply_41(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(41,0)")
        apply_42(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(42,0)")
        apply_43(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(43,0)")
        apply_44(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(44,0)")
        apply_45(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(45,0)")
        apply_46(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(46,0)")
        apply_47(conn)
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(47,0)")
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(48,0)")
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(49,0)")
        if not has_column(conn, "quotes", "template_snapshot_json"):
            conn.execute("ALTER TABLE quotes ADD COLUMN template_snapshot_json TEXT")
        if not has_column(conn, "quote_send_logs", "template_snapshot_json"):
            conn.execute("ALTER TABLE quote_send_logs ADD COLUMN template_snapshot_json TEXT")
        conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(50,0)")
        for tail_version, tail_sql in TAIL_SQL_MIGRATIONS:
            conn.executescript(tail_sql)
            conn.execute("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,0)", (tail_version,))
        conn.commit()
        version = conn.execute("SELECT MAX(version) FROM schema_migrations").fetchone()[0]
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        foreign = conn.execute("PRAGMA foreign_key_check").fetchall()
        if version != 52 or integrity != "ok" or foreign:
            raise AssertionError((version, integrity, foreign))
        for col in ("privacy_notice", "consent_required", "retention_days"):
            if not has_column(conn, "live_sites", col): raise AssertionError(col)
        for col in ("cc_email", "share_url_secret"):
            if not has_column(conn, "quote_send_logs", col): raise AssertionError(col)
        if not has_column(conn, "quote_share_tokens", "send_log_id"): raise AssertionError("send_log_id")
        if not has_column(conn, "user_ui_settings", "custom_json"): raise AssertionError("custom_json")
        for col in ('deleted_at','deleted_by','created_at','updated_at'):
            if not has_column(conn,'quote_items',col): raise AssertionError('quote_items.'+col)
        if not has_column(conn,'quotes','form_instance_id'): raise AssertionError('quotes.form_instance_id')
        for col in ('quote_discount_type','quote_discount_value','quote_discount_total','approved_at','ordered_at','delivered_at','rejected_at'):
            if not has_column(conn,'quotes',col): raise AssertionError('quotes.'+col)
        for col in ('event_type','page_view_id'):
            if not has_column(conn,'quote_view_events',col): raise AssertionError('quote_view_events.'+col)
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_quote_view_events_page'").fetchone(): raise AssertionError('idx_quote_view_events_page')
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='trg_quotes_stage_timestamps'").fetchone(): raise AssertionError('trg_quotes_stage_timestamps')
        for table in ('product_import_templates','product_import_history','product_alternatives','quote_followup_tasks','quote_followup_mail_logs','dashboard_widget_layouts','dashboard_widget_events','web_product_sources','web_product_import_history'):
            if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone(): raise AssertionError(table)
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='product_price_history'").fetchone(): raise AssertionError('product_price_history')
        if duplicate_hash:
            kept=conn.execute("SELECT COUNT(*) FROM quote_share_tokens WHERE token_hash='same-hash'").fetchone()[0]
            disabled=conn.execute("SELECT COUNT(*) FROM quote_share_tokens WHERE id IN ('dup-old','dup-new') AND is_active=0").fetchone()[0]
            if kept != 1 or disabled != 1: raise AssertionError((kept,disabled))
        conn.close()

run_case(False)
run_case(True)
run_case(False,True)
print("MIGRATION_TESTS=3/3 OK; SCHEMA_VERSION=52; DUPLICATE_HASH_REPAIR=OK; INTEGRITY=OK; FOREIGN_KEYS=0")

import { db } from "./db.js";
import { ensureOperationalSchema } from "../services/operational-schema.service.js";
import {
  builtInTemplateKeys,
  ensureProfessionalTemplateLibrary,
  reconcileTemplateLibraryV120,
  restoreArtevaClassicTemplate,
  restoreLegacyTemplateLibrary,
  restoreV112TemplateLibrary
} from "../services/template-library.service.js";
const migrations = [
  [
    1,
    `CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'ACTIVE',plan TEXT NOT NULL DEFAULT 'PRO',expires_at INTEGER,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,tenant_id TEXT,username TEXT NOT NULL UNIQUE,email TEXT UNIQUE,phone TEXT UNIQUE,full_name TEXT, password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'STAFF',is_active INTEGER NOT NULL DEFAULT 1,locked_until INTEGER,failed_login_count INTEGER NOT NULL DEFAULT 0,last_login_at INTEGER,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(tenant_id) REFERENCES tenants(id));
CREATE TABLE IF NOT EXISTS user_ui_settings(user_id TEXT PRIMARY KEY,theme_key TEXT NOT NULL DEFAULT 'silver-executive',sidebar_key TEXT NOT NULL DEFAULT 'silver-tree',icon_pack TEXT NOT NULL DEFAULT 'line',menu_mode TEXT NOT NULL DEFAULT 'accordion',density TEXT NOT NULL DEFAULT 'compact',sidebar_width INTEGER NOT NULL DEFAULT 252,font_family TEXT NOT NULL DEFAULT 'Inter',font_size INTEGER NOT NULL DEFAULT 14,radius INTEGER NOT NULL DEFAULT 14,primary_color TEXT NOT NULL DEFAULT '#245ba7',accent_color TEXT NOT NULL DEFAULT '#e23b3f',page_bg TEXT NOT NULL DEFAULT '#f4f7fb',card_bg TEXT NOT NULL DEFAULT '#ffffff',border_color TEXT NOT NULL DEFAULT '#dbe5f2',text_color TEXT NOT NULL DEFAULT '#14233d',muted_color TEXT NOT NULL DEFAULT '#718198',default_template_key TEXT NOT NULL DEFAULT 'corporate-main',updated_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS login_settings(tenant_id TEXT PRIMARY KEY,logo_url TEXT,left_image_url TEXT,eyebrow TEXT NOT NULL DEFAULT 'GÜVENLİ OTURUM AÇMA',title TEXT NOT NULL DEFAULT 'Hesabınıza giriş yapın',subtitle TEXT NOT NULL DEFAULT 'Yönetim paneline erişmek için kullanıcı bilgilerinizi girin.',left_title TEXT NOT NULL DEFAULT 'İş süreçlerinizi tek merkezden yönetin.',left_text TEXT NOT NULL DEFAULT 'Müşteri yönetimi, ürün takibi, profesyonel proforma oluşturma, sipariş süreçleri ve firma ayarları için geliştirilen CRM / ERP platformuna güvenli giriş yapın.',button_text TEXT NOT NULL DEFAULT 'CRM / ERP PANELİNE GİRİŞ',updated_at INTEGER NOT NULL);`
  ],
  [
    2,
    `CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,company_name TEXT NOT NULL,short_name TEXT,logo_url TEXT,stamp_url TEXT,signature_url TEXT,authorized_person TEXT,tax_office TEXT,tax_no TEXT,phone TEXT,mobile TEXT,email TEXT,website TEXT,address TEXT,district TEXT,city TEXT,country TEXT DEFAULT 'Türkiye',bank_name TEXT,iban_try TEXT,iban_eur TEXT,iban_usd TEXT,note TEXT,is_active INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(tenant_id) REFERENCES tenants(id));
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_active ON profiles(tenant_id,is_active);
CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,code TEXT NOT NULL,company_name TEXT NOT NULL,short_name TEXT,contact_name TEXT,contact_title TEXT,phone TEXT,mobile TEXT,email TEXT,website TEXT,tax_office TEXT,tax_no TEXT,address1 TEXT,address2 TEXT,district TEXT,city TEXT,country TEXT DEFAULT 'Türkiye',postal_code TEXT,sector TEXT,currency TEXT DEFAULT 'TRY',payment_method TEXT,note TEXT,logo_url TEXT,status TEXT NOT NULL DEFAULT 'ACTIVE',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(tenant_id,code),FOREIGN KEY(tenant_id) REFERENCES tenants(id));
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(tenant_id,company_name,contact_name,phone,email,tax_no,city);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,code TEXT NOT NULL,barcode TEXT,name TEXT NOT NULL,brand TEXT,model TEXT,category TEXT,short_description TEXT,technical_description TEXT,image_url TEXT,brochure_url TEXT,product_url TEXT,unit TEXT DEFAULT 'ADET',vat_rate REAL DEFAULT 20,sale_price REAL DEFAULT 0,currency TEXT DEFAULT 'TRY',purchase_price REAL DEFAULT 0,stock_qty REAL DEFAULT 0,status TEXT NOT NULL DEFAULT 'ACTIVE',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(tenant_id,code),FOREIGN KEY(tenant_id) REFERENCES tenants(id));
CREATE INDEX IF NOT EXISTS idx_products_search ON products(tenant_id,code,name,brand,model,category,status);`
  ],
  [
    3,
    `CREATE TABLE IF NOT EXISTS quote_counters(tenant_id TEXT NOT NULL,year INTEGER NOT NULL,last_value INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(tenant_id,year));
CREATE TABLE IF NOT EXISTS quotes(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_no TEXT NOT NULL,revision_no INTEGER NOT NULL DEFAULT 0,revision_parent_id TEXT,order_no TEXT,profile_id TEXT,customer_id TEXT,profile_snapshot_json TEXT NOT NULL,customer_snapshot_json TEXT NOT NULL,quote_date TEXT NOT NULL,valid_until TEXT,delivery_date TEXT,status TEXT NOT NULL DEFAULT 'DRAFT',payment_status TEXT NOT NULL DEFAULT 'UNPAID',order_status TEXT NOT NULL DEFAULT 'NONE',production_status TEXT NOT NULL DEFAULT 'NOT_STARTED',currency TEXT NOT NULL DEFAULT 'TRY',fx_rate REAL NOT NULL DEFAULT 1,fx_source TEXT,fx_date TEXT,subject TEXT,description TEXT,project_name TEXT,project_code TEXT,payment_terms TEXT,delivery_terms TEXT,shipping_terms TEXT,installation_terms TEXT,warranty_terms TEXT,legal_note TEXT,extra_note TEXT,template_key TEXT NOT NULL DEFAULT 'corporate-main',subtotal REAL NOT NULL DEFAULT 0,discount_total REAL NOT NULL DEFAULT 0,vat_total REAL NOT NULL DEFAULT 0,grand_total REAL NOT NULL DEFAULT 0,created_by TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(tenant_id,quote_no,revision_no),FOREIGN KEY(tenant_id) REFERENCES tenants(id));
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(tenant_id,status,order_status,production_status,valid_until);
CREATE TABLE IF NOT EXISTS quote_items(id TEXT PRIMARY KEY,quote_id TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,product_id TEXT,product_snapshot_json TEXT NOT NULL,quantity REAL NOT NULL DEFAULT 1,unit TEXT,unit_price REAL NOT NULL DEFAULT 0,currency TEXT,discount_type TEXT NOT NULL DEFAULT 'PERCENT',discount_value REAL NOT NULL DEFAULT 0,vat_rate REAL NOT NULL DEFAULT 20,line_net REAL NOT NULL DEFAULT 0,line_vat REAL NOT NULL DEFAULT 0,line_total REAL NOT NULL DEFAULT 0,is_optional INTEGER NOT NULL DEFAULT 0,is_alternative INTEGER NOT NULL DEFAULT 0,include_total INTEGER NOT NULL DEFAULT 1,show_image INTEGER NOT NULL DEFAULT 1,show_description INTEGER NOT NULL DEFAULT 1,show_technical INTEGER NOT NULL DEFAULT 0,deleted_at INTEGER,deleted_by TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id,sort_order);
CREATE TABLE IF NOT EXISTS quote_events(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT NOT NULL,event_type TEXT NOT NULL,old_json TEXT,new_json TEXT,note TEXT,created_by TEXT,created_at INTEGER NOT NULL,FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS quote_templates(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,template_key TEXT NOT NULL,name TEXT NOT NULL,description TEXT,layout_key TEXT NOT NULL,primary_color TEXT NOT NULL,accent_color TEXT NOT NULL,font_family TEXT NOT NULL DEFAULT 'Inter',font_size INTEGER NOT NULL DEFAULT 11,settings_json TEXT NOT NULL DEFAULT '{}',block_order_json TEXT NOT NULL DEFAULT '["header","customer","items","totals","terms","bank","signature","footer"]',is_default INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(tenant_id,template_key));`
  ],
  [
    4,
    `CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,user_id TEXT,type TEXT NOT NULL,title TEXT NOT NULL,message TEXT,href TEXT,is_read INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(tenant_id,user_id,is_read,created_at);
CREATE TABLE IF NOT EXISTS audit_logs(id TEXT PRIMARY KEY,tenant_id TEXT,user_id TEXT,action TEXT NOT NULL,module TEXT NOT NULL,entity_id TEXT,ip TEXT,old_json TEXT,new_json TEXT,result TEXT NOT NULL DEFAULT 'OK',created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_audit_logs ON audit_logs(tenant_id,created_at DESC,module,action);
CREATE TABLE IF NOT EXISTS app_settings(tenant_id TEXT NOT NULL,key TEXT NOT NULL,value_json TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(tenant_id,key));`
  ],
  [
    5,
    `ALTER TABLE quotes ADD COLUMN revision_old_total REAL;
ALTER TABLE quotes ADD COLUMN revision_new_total REAL;`
  ],
  [
    6,
    `UPDATE login_settings SET left_text=REPLACE(left_text,'ARTEVA CRM / ERP','CRM / ERP');
UPDATE quote_templates SET template_key='corporate-main',name='Kurumsal Ana Şablon' WHERE template_key='arteva-main';
UPDATE quote_templates SET template_key='red-line',name='Red Line' WHERE template_key='arteva-red-line';
UPDATE quote_templates SET name='Kurumsal Ana Şablon' WHERE name LIKE '%ARTEVA Ana Şablon%';
UPDATE quote_templates SET name='Red Line' WHERE name LIKE '%ARTEVA Red Line%';
UPDATE quotes SET template_key='corporate-main' WHERE template_key='arteva-main';
UPDATE quotes SET template_key='red-line' WHERE template_key='arteva-red-line';
UPDATE user_ui_settings SET default_template_key='corporate-main' WHERE default_template_key='arteva-main';`
  ],
  [
    7,
    `ALTER TABLE user_ui_settings ADD COLUMN locale TEXT NOT NULL DEFAULT 'tr';
ALTER TABLE profiles ADD COLUMN quote_prefix TEXT;
UPDATE profiles SET authorized_person='' WHERE authorized_person='Yetkili Kişi';`
  ],
  [
    8,
    `ALTER TABLE profiles ADD COLUMN swift_bic TEXT;
ALTER TABLE profiles ADD COLUMN footer_address TEXT;
ALTER TABLE profiles ADD COLUMN footer_phone TEXT;
ALTER TABLE profiles ADD COLUMN footer_email TEXT;
ALTER TABLE login_settings ADD COLUMN overlay_opacity REAL NOT NULL DEFAULT 0.62;
ALTER TABLE quotes ADD COLUMN paid_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD COLUMN payment_note TEXT;`
  ],
  [
    9,
    `UPDATE products SET status='ACTIVE' WHERE status IS NULL OR TRIM(status)='' OR UPPER(TRIM(status)) IN ('AKTIF','ACTIVE');
CREATE INDEX IF NOT EXISTS idx_products_tenant_status_name ON products(tenant_id,status,name);`
  ],
  [
    10,
    `ALTER TABLE products ADD COLUMN gtip_no TEXT;
ALTER TABLE products ADD COLUMN origin_country TEXT;`
  ],
  [
    11,
    `ALTER TABLE customers ADD COLUMN billing_address TEXT;
ALTER TABLE customers ADD COLUMN delivery_address TEXT;
ALTER TABLE profiles ADD COLUMN billing_address TEXT;
ALTER TABLE profiles ADD COLUMN delivery_address TEXT;
UPDATE customers SET billing_address=TRIM(COALESCE(NULLIF(address1,''),'') || CASE WHEN TRIM(COALESCE(address2,''))<>'' THEN ' ' || TRIM(address2) ELSE '' END) WHERE TRIM(COALESCE(billing_address,''))='';
UPDATE profiles SET billing_address=address WHERE TRIM(COALESCE(billing_address,''))='';`
  ],
  [
    12,
    `CREATE TABLE IF NOT EXISTS order_counters(tenant_id TEXT NOT NULL,year INTEGER NOT NULL,last_value INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(tenant_id,year));
ALTER TABLE customers ADD COLUMN deleted_at INTEGER;
ALTER TABLE customers ADD COLUMN deleted_by TEXT;
ALTER TABLE customers ADD COLUMN search_text TEXT;
ALTER TABLE products ADD COLUMN deleted_at INTEGER;
ALTER TABLE products ADD COLUMN deleted_by TEXT;
ALTER TABLE products ADD COLUMN search_text TEXT;
ALTER TABLE quotes ADD COLUMN deleted_at INTEGER;
ALTER TABLE quotes ADD COLUMN deleted_by TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_searchtext ON customers(tenant_id,search_text);
CREATE INDEX IF NOT EXISTS idx_products_tenant_searchtext ON products(tenant_id,search_text);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_status ON quotes(tenant_id,customer_id,status,updated_at);
UPDATE customers SET search_text=lower(COALESCE(code,'')||' '||COALESCE(company_name,'')||' '||COALESCE(short_name,'')||' '||COALESCE(contact_name,'')||' '||COALESCE(phone,'')||' '||COALESCE(mobile,'')||' '||COALESCE(email,'')||' '||COALESCE(tax_no,'')||' '||COALESCE(city,'')) WHERE search_text IS NULL;
UPDATE products SET search_text=lower(COALESCE(code,'')||' '||COALESCE(name,'')||' '||COALESCE(brand,'')||' '||COALESCE(model,'')||' '||COALESCE(category,'')||' '||COALESCE(gtip_no,'')||' '||COALESCE(origin_country,'')||' '||COALESCE(short_description,'')||' '||COALESCE(technical_description,'')) WHERE search_text IS NULL;`
  ],
  [
    13,
    `ALTER TABLE profiles ADD COLUMN deleted_at INTEGER;
ALTER TABLE profiles ADD COLUMN deleted_by TEXT;
ALTER TABLE quote_templates ADD COLUMN deleted_at INTEGER;
ALTER TABLE quote_templates ADD COLUMN deleted_by TEXT;
CREATE INDEX IF NOT EXISTS idx_quotes_active_list ON quotes(tenant_id,deleted_at,status,created_at,updated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(tenant_id,deleted_at,is_active);
CREATE INDEX IF NOT EXISTS idx_quote_templates_active ON quote_templates(tenant_id,deleted_at,is_default);`
  ],
  [
    14,
    `CREATE TABLE IF NOT EXISTS customer_contacts(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,customer_id TEXT NOT NULL,full_name TEXT NOT NULL,title TEXT,phone TEXT,mobile TEXT,email TEXT,role_key TEXT NOT NULL DEFAULT 'GENERAL',is_default_quote INTEGER NOT NULL DEFAULT 0,is_billing INTEGER NOT NULL DEFAULT 0,is_technical INTEGER NOT NULL DEFAULT 0,note TEXT,status TEXT NOT NULL DEFAULT 'ACTIVE',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,deleted_by TEXT,FOREIGN KEY(customer_id) REFERENCES customers(id));
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(tenant_id,customer_id,deleted_at,role_key);
ALTER TABLE quotes ADD COLUMN follow_up_date TEXT;
ALTER TABLE quotes ADD COLUMN follow_up_note TEXT;
ALTER TABLE quotes ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE quotes ADD COLUMN approval_reason TEXT;
ALTER TABLE quotes ADD COLUMN approval_requested_at INTEGER;
ALTER TABLE quotes ADD COLUMN approval_decided_at INTEGER;
ALTER TABLE quotes ADD COLUMN approval_decided_by TEXT;
CREATE INDEX IF NOT EXISTS idx_quotes_followup ON quotes(tenant_id,follow_up_date,status,deleted_at);
CREATE INDEX IF NOT EXISTS idx_quotes_approval ON quotes(tenant_id,approval_status,status,deleted_at);
ALTER TABLE products ADD COLUMN supplier_name TEXT;
ALTER TABLE products ADD COLUMN min_stock_qty REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN profit_rate REAL NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS backup_jobs(id TEXT PRIMARY KEY,tenant_id TEXT,user_id TEXT,file_path TEXT NOT NULL,file_name TEXT NOT NULL,size_bytes INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'READY',note TEXT,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_backup_jobs ON backup_jobs(tenant_id,created_at DESC);`
  ],
  [
    15,
    `CREATE TABLE IF NOT EXISTS live_sites(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,profile_id TEXT,site_name TEXT NOT NULL,site_url TEXT NOT NULL,site_key TEXT NOT NULL UNIQUE,allowed_domain TEXT,is_active INTEGER NOT NULL DEFAULT 1,widget_title TEXT NOT NULL DEFAULT 'Canlı Destek',welcome_message TEXT NOT NULL DEFAULT 'Merhaba, size nasıl yardımcı olabiliriz?',offline_message TEXT NOT NULL DEFAULT 'Şu anda çevrimdışıyız. Mesajınızı bırakın, size dönüş yapalım.',widget_color TEXT NOT NULL DEFAULT '#245ba7',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(tenant_id) REFERENCES tenants(id),FOREIGN KEY(profile_id) REFERENCES profiles(id));
CREATE INDEX IF NOT EXISTS idx_live_sites_tenant_active ON live_sites(tenant_id,is_active,profile_id);
CREATE TABLE IF NOT EXISTS live_visitors(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,site_id TEXT NOT NULL,visitor_token TEXT NOT NULL,ip TEXT,user_agent TEXT,country TEXT,city TEXT,device_type TEXT,browser TEXT,first_seen_at INTEGER NOT NULL,last_seen_at INTEGER NOT NULL,current_url TEXT,current_title TEXT,referrer TEXT,page_count INTEGER NOT NULL DEFAULT 0,is_online INTEGER NOT NULL DEFAULT 1,customer_id TEXT,UNIQUE(site_id,visitor_token),FOREIGN KEY(tenant_id) REFERENCES tenants(id),FOREIGN KEY(site_id) REFERENCES live_sites(id));
CREATE INDEX IF NOT EXISTS idx_live_visitors_online ON live_visitors(tenant_id,site_id,last_seen_at DESC);
CREATE TABLE IF NOT EXISTS live_visitor_events(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,site_id TEXT NOT NULL,visitor_id TEXT NOT NULL,event_type TEXT NOT NULL,page_url TEXT,page_title TEXT,referrer TEXT,created_at INTEGER NOT NULL,FOREIGN KEY(visitor_id) REFERENCES live_visitors(id),FOREIGN KEY(site_id) REFERENCES live_sites(id));
CREATE INDEX IF NOT EXISTS idx_live_events_visitor_time ON live_visitor_events(tenant_id,visitor_id,created_at DESC);
CREATE TABLE IF NOT EXISTS live_conversations(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,site_id TEXT NOT NULL,visitor_id TEXT NOT NULL,customer_id TEXT,assigned_user_id TEXT,status TEXT NOT NULL DEFAULT 'WAITING',source_url TEXT,source_title TEXT,first_message TEXT,started_at INTEGER NOT NULL,last_message_at INTEGER NOT NULL,closed_at INTEGER,FOREIGN KEY(site_id) REFERENCES live_sites(id),FOREIGN KEY(visitor_id) REFERENCES live_visitors(id),FOREIGN KEY(customer_id) REFERENCES customers(id),FOREIGN KEY(assigned_user_id) REFERENCES users(id));
CREATE INDEX IF NOT EXISTS idx_live_conversations_status ON live_conversations(tenant_id,status,last_message_at DESC);
CREATE TABLE IF NOT EXISTS live_messages(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,conversation_id TEXT NOT NULL,sender_type TEXT NOT NULL,sender_id TEXT,message TEXT NOT NULL,is_read INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,FOREIGN KEY(conversation_id) REFERENCES live_conversations(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_live_messages_conv ON live_messages(tenant_id,conversation_id,created_at);`
  ],
  [
    16,
    `ALTER TABLE live_sites ADD COLUMN operator_name TEXT NOT NULL DEFAULT 'Satış Temsilcisi';
ALTER TABLE live_sites ADD COLUMN contact_form_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE live_sites ADD COLUMN contact_form_mode TEXT NOT NULL DEFAULT 'AFTER_FIRST_MESSAGE';
ALTER TABLE live_sites ADD COLUMN notification_sound TEXT NOT NULL DEFAULT 'bell-soft';
ALTER TABLE live_visitors ADD COLUMN contact_name TEXT;
ALTER TABLE live_visitors ADD COLUMN contact_title TEXT;
ALTER TABLE live_visitors ADD COLUMN contact_company TEXT;
ALTER TABLE live_visitors ADD COLUMN contact_email TEXT;
ALTER TABLE live_visitors ADD COLUMN contact_phone TEXT;
ALTER TABLE live_messages ADD COLUMN client_uid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_messages_client_uid ON live_messages(conversation_id,client_uid) WHERE client_uid IS NOT NULL;`
  ],
  [
    17,
    `ALTER TABLE live_sites ADD COLUMN operator_avatar_url TEXT;
ALTER TABLE live_sites ADD COLUMN widget_position TEXT NOT NULL DEFAULT 'RIGHT';
ALTER TABLE live_sites ADD COLUMN sound_preview_note TEXT;
ALTER TABLE live_visitors ADD COLUMN typing_text TEXT;
ALTER TABLE live_visitors ADD COLUMN typing_at INTEGER;
ALTER TABLE live_visitors ADD COLUMN visit_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE live_conversations ADD COLUMN proactive_started INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_live_visitors_typing ON live_visitors(tenant_id,typing_at);`
  ],
  [
    18,
    `ALTER TABLE live_sites ADD COLUMN widget_design TEXT NOT NULL DEFAULT 'PRO_GRADIENT';
ALTER TABLE live_sites ADD COLUMN quick_replies_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE live_sites ADD COLUMN quick_reply_1 TEXT NOT NULL DEFAULT 'Merhaba!';
ALTER TABLE live_sites ADD COLUMN quick_reply_2 TEXT NOT NULL DEFAULT 'Merhaba, yardıma ihtiyacım var.';
ALTER TABLE live_sites ADD COLUMN quick_reply_3 TEXT NOT NULL DEFAULT 'Merhaba, bilgi alabilir miyim?';
ALTER TABLE live_sites ADD COLUMN whatsapp_url TEXT;
ALTER TABLE live_sites ADD COLUMN widget_bubble_text TEXT NOT NULL DEFAULT 'Bize yazabilirsiniz, çevrimiçiyiz!';
ALTER TABLE live_messages ADD COLUMN attachment_url TEXT;
ALTER TABLE live_messages ADD COLUMN attachment_name TEXT;
CREATE INDEX IF NOT EXISTS idx_live_messages_unread ON live_messages(tenant_id,conversation_id,sender_type,is_read,created_at);
CREATE INDEX IF NOT EXISTS idx_live_events_recent ON live_visitor_events(tenant_id,site_id,created_at DESC);
UPDATE live_sites SET widget_position='RIGHT_BOTTOM' WHERE widget_position='RIGHT';
UPDATE live_sites SET widget_position='LEFT_BOTTOM' WHERE widget_position='LEFT';`
  ],
  [
    19,
    `ALTER TABLE live_sites ADD COLUMN contact_form_after_messages INTEGER NOT NULL DEFAULT 3;
ALTER TABLE live_sites ADD COLUMN business_hours_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE live_sites ADD COLUMN business_days TEXT NOT NULL DEFAULT '1,2,3,4,5';
ALTER TABLE live_sites ADD COLUMN business_start TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE live_sites ADD COLUMN business_end TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE live_sites ADD COLUMN manual_online INTEGER NOT NULL DEFAULT 1;
ALTER TABLE live_visitors ADD COLUMN visitor_label TEXT;
ALTER TABLE live_visitors ADD COLUMN avatar_emoji TEXT;
ALTER TABLE live_visitors ADD COLUMN last_group_key TEXT;
CREATE INDEX IF NOT EXISTS idx_live_visitors_group ON live_visitors(tenant_id,last_group_key,last_seen_at DESC);
UPDATE live_visitors SET last_group_key=COALESCE(NULLIF(contact_email,''),NULLIF(contact_phone,''),NULLIF(ip,''),visitor_token) WHERE last_group_key IS NULL;`
  ],
  [
    20,
    `ALTER TABLE live_sites ADD COLUMN welcome_repeat_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE live_sites ADD COLUMN widget_font_family TEXT NOT NULL DEFAULT 'Inter';
ALTER TABLE live_sites ADD COLUMN widget_font_size INTEGER NOT NULL DEFAULT 14;
ALTER TABLE live_sites ADD COLUMN widget_font_weight INTEGER NOT NULL DEFAULT 700;
ALTER TABLE live_sites ADD COLUMN widget_header_height INTEGER NOT NULL DEFAULT 92;
ALTER TABLE live_sites ADD COLUMN widget_header_pattern TEXT NOT NULL DEFAULT 'LAB_DARK';
ALTER TABLE live_sites ADD COLUMN operator_title TEXT NOT NULL DEFAULT 'Satış Temsilcisi çevrimiçi';
ALTER TABLE live_sites ADD COLUMN widget_radius INTEGER NOT NULL DEFAULT 22;
ALTER TABLE live_visitors ADD COLUMN last_online_status TEXT NOT NULL DEFAULT 'ONLINE';
ALTER TABLE live_conversations ADD COLUMN last_visitor_seen_at INTEGER;
UPDATE live_conversations SET last_visitor_seen_at=(SELECT last_seen_at FROM live_visitors WHERE live_visitors.id=live_conversations.visitor_id) WHERE last_visitor_seen_at IS NULL;`
  ],
  [
    21,
    `ALTER TABLE live_conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE live_conversations ADD COLUMN last_operator_message_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_live_conversations_pin ON live_conversations(tenant_id,pinned,last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_messages_unread_global ON live_messages(tenant_id,sender_type,is_read,created_at DESC);`
  ],
  [
    22,
    `ALTER TABLE products ADD COLUMN ce_certificate_url TEXT;
ALTER TABLE products ADD COLUMN manual_url TEXT;
ALTER TABLE products ADD COLUMN ce_certificate_path TEXT;
ALTER TABLE products ADD COLUMN manual_path TEXT;
UPDATE products SET ce_certificate_path=ce_certificate_url WHERE (ce_certificate_path IS NULL OR ce_certificate_path='') AND ce_certificate_url IS NOT NULL;
UPDATE products SET manual_path=manual_url WHERE (manual_path IS NULL OR manual_path='') AND manual_url IS NOT NULL;`
  ],
  [
    23,
    `ALTER TABLE live_messages ADD COLUMN read_by_visitor_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_live_messages_read_by_visitor ON live_messages(tenant_id,conversation_id,sender_type,read_by_visitor_at,created_at);
CREATE INDEX IF NOT EXISTS idx_live_messages_recent_notify ON live_messages(tenant_id,sender_type,is_read,created_at DESC);`
  ],
  [
    24,
    `-- v3.3.44: Yeni proforma şablonlarını mevcut tüm tenantlara zorunlu ekle.
-- Sadece seed'e bağlı kalmasın; canlıda farklı tenant varsa da şablonlar görünür.
INSERT OR IGNORE INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at)
SELECT 'tpl_skyline_blue_' || REPLACE(t.id,'-','_'),t.id,'skyline-blue','Skyline Blue','Üst bantlı mavi kurumsal teklif tasarımı','skyline','#1d4ed8','#0ea5e9','Inter',11,'{}','["header","customer","items","totals","terms","bank","signature","footer"]',0,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM tenants t;
INSERT OR IGNORE INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at)
SELECT 'tpl_emerald_frame_' || REPLACE(t.id,'-','_'),t.id,'emerald-frame','Emerald Frame','Yeşil çerçeveli dengeli teklif düzeni','emerald','#047857','#14b8a6','Inter',11,'{}','["header","customer","items","totals","terms","bank","signature","footer"]',0,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM tenants t;
INSERT OR IGNORE INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at)
SELECT 'tpl_gold_balance_' || REPLACE(t.id,'-','_'),t.id,'gold-balance','Gold Balance','Prestijli tekliflerde altın vurgu ve sade tablo','gold','#92400e','#d97706','Inter',11,'{}','["header","customer","items","totals","terms","bank","signature","footer"]',0,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM tenants t;
INSERT OR IGNORE INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at)
SELECT 'tpl_slate_matrix_' || REPLACE(t.id,'-','_'),t.id,'slate-matrix','Slate Matrix','Teknik satırlarda net çizgili modern tablo','matrix','#1f2937','#64748b','Inter',11,'{}','["header","customer","items","totals","terms","bank","signature","footer"]',0,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM tenants t;
INSERT OR IGNORE INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at)
SELECT 'tpl_clean_lab_plus_' || REPLACE(t.id,'-','_'),t.id,'clean-lab-plus','Clean Lab Plus','Laboratuvar teklifleri için ferah ve simetrik düzen','cleanlab','#0369a1','#38bdf8','Inter',11,'{}','["header","customer","items","totals","terms","bank","signature","footer"]',0,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000 FROM tenants t;
`
  ],
  [
    25,
    `-- v3.3.45: Anasayfa "Canlı Destek" kutusunda eski sohbetlerin süresiz görünmesini önlemek için
-- her site'a ayrı ayarlanabilir bir görünürlük penceresi eklenir. Varsayılan 24 saat.
-- Bu sütun yalnızca ANASAYFA LİSTESİNİN süzülmesinde kullanılır; sohbet/mesaj kayıtları asla silinmez.
ALTER TABLE live_sites ADD COLUMN dashboard_chat_window_hours INTEGER NOT NULL DEFAULT 24;`
  ],
  [
    26,
    `-- v3.3.47: Revizyon karşılaştırma ve proformada TL karşılığı görünürlük ayarı.
ALTER TABLE quotes ADD COLUMN revision_compare_json TEXT;
ALTER TABLE quotes ADD COLUMN show_try_total INTEGER NOT NULL DEFAULT 1;`
  ],
  [
    27,
    `-- v3.3.51: e-posta gönderim, görüntülendi takibi, fatura entegrasyonu ve Excel panel altyapısı.
CREATE TABLE IF NOT EXISTS smtp_settings(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL UNIQUE,host TEXT,port INTEGER NOT NULL DEFAULT 587,secure INTEGER NOT NULL DEFAULT 0,username TEXT,password TEXT,from_name TEXT,from_email TEXT,reply_to TEXT,is_active INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS quote_share_tokens(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT NOT NULL,token TEXT NOT NULL UNIQUE,recipient_email TEXT,expires_at INTEGER,is_active INTEGER NOT NULL DEFAULT 1,created_by TEXT,created_at INTEGER NOT NULL,last_viewed_at INTEGER,view_count INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_quote_share_tokens_quote ON quote_share_tokens(tenant_id,quote_id,created_at DESC);
CREATE TABLE IF NOT EXISTS quote_send_logs(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT NOT NULL,recipient_email TEXT NOT NULL,subject TEXT,body TEXT,share_url TEXT,status TEXT NOT NULL DEFAULT 'PENDING',provider_message_id TEXT,error_message TEXT,created_by TEXT,created_at INTEGER NOT NULL,sent_at INTEGER,viewed_at INTEGER,view_count INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_quote_send_logs_quote ON quote_send_logs(tenant_id,quote_id,created_at DESC);
CREATE TABLE IF NOT EXISTS quote_view_events(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT NOT NULL,send_log_id TEXT,token_id TEXT,ip TEXT,user_agent TEXT,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_quote_view_events_quote ON quote_view_events(tenant_id,quote_id,created_at DESC);
CREATE TABLE IF NOT EXISTS integration_settings(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL UNIQUE,provider TEXT NOT NULL DEFAULT 'MANUAL',api_url TEXT,api_key TEXT,company_code TEXT,settings_json TEXT NOT NULL DEFAULT '{}',is_active INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS invoices(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,quote_id TEXT,invoice_no TEXT,invoice_type TEXT NOT NULL DEFAULT 'EARSIV',status TEXT NOT NULL DEFAULT 'DRAFT',customer_snapshot_json TEXT,items_json TEXT,subtotal REAL NOT NULL DEFAULT 0,vat_total REAL NOT NULL DEFAULT 0,discount_total REAL NOT NULL DEFAULT 0,grand_total REAL NOT NULL DEFAULT 0,currency TEXT NOT NULL DEFAULT 'TRY',integration_provider TEXT,external_id TEXT,external_status TEXT,error_message TEXT,created_by TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,exported_at INTEGER,sent_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON invoices(tenant_id,quote_id);
`
  ],
  [
    28,
    `-- v3.3.55: Gönderilen proforma takip paneli için gönderim loglarında soft-delete ve tür alanı.
ALTER TABLE quote_send_logs ADD COLUMN deleted_at INTEGER;
ALTER TABLE quote_send_logs ADD COLUMN deleted_by TEXT;
ALTER TABLE quote_send_logs ADD COLUMN mail_type TEXT NOT NULL DEFAULT 'QUOTE';
CREATE INDEX IF NOT EXISTS idx_quote_send_logs_tracking ON quote_send_logs(tenant_id,status,view_count,created_at DESC);
`
  ],
  [
    29,
    `-- v3.4.0: Güvenlik, oturum iptali, güvenli numaralandırma ve doğrulanmış yedek altyapısı.
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quote_share_tokens ADD COLUMN token_hash TEXT;
ALTER TABLE quote_share_tokens ADD COLUMN revoked_at INTEGER;
ALTER TABLE backup_jobs ADD COLUMN sha256 TEXT;
ALTER TABLE backup_jobs ADD COLUMN integrity_status TEXT;
ALTER TABLE backup_jobs ADD COLUMN verified_at INTEGER;
ALTER TABLE backup_jobs ADD COLUMN backup_scope TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE live_sites ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul';
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_share_token_hash ON quote_share_tokens(token_hash) WHERE token_hash IS NOT NULL;
UPDATE invoices SET invoice_no=invoice_no || '-DUP-' || substr(id,-6) WHERE id IN (SELECT id FROM (SELECT id,ROW_NUMBER() OVER (PARTITION BY tenant_id,invoice_no ORDER BY created_at,id) AS rn FROM invoices WHERE invoice_no IS NOT NULL AND invoice_no<>'') WHERE rn>1);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_tenant_invoice_no ON invoices(tenant_id,invoice_no) WHERE invoice_no IS NOT NULL AND invoice_no<>'';
CREATE TABLE IF NOT EXISTS invoice_counters(tenant_id TEXT NOT NULL,year INTEGER NOT NULL,last_value INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(tenant_id,year));
CREATE INDEX IF NOT EXISTS idx_quote_view_events_dedupe ON quote_view_events(token_id,ip,created_at DESC);
`
  ],
  [
    30,
    () => {
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("products", "product_code", "TEXT");
      ensureColumn("products", "image_path", "TEXT");
      ensureColumn("products", "brochure_path", "TEXT");
      ensureColumn("products", "ce_certificate_url", "TEXT");
      ensureColumn("products", "manual_url", "TEXT");
      ensureColumn("products", "ce_certificate_path", "TEXT");
      ensureColumn("products", "manual_path", "TEXT");
      ensureColumn("products", "gtip", "TEXT");
      ensureColumn("products", "origin", "TEXT");
      ensureColumn(
        "live_sites",
        "privacy_notice",
        "TEXT NOT NULL DEFAULT 'Kişisel verileriniz talebinizi yanıtlamak amacıyla işlenir.'"
      );
      ensureColumn("live_sites", "consent_required", "INTEGER NOT NULL DEFAULT 0");
      ensureColumn("live_sites", "retention_days", "INTEGER NOT NULL DEFAULT 365");
      db.exec(`
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
  `);
    }
  ],
  [
    31,
    () => {
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("quote_send_logs", "cc_email", "TEXT");
      ensureColumn("quote_send_logs", "share_url_secret", "TEXT");
      ensureColumn("quote_share_tokens", "send_log_id", "TEXT");
      db.exec(`
    CREATE INDEX IF NOT EXISTS idx_quote_share_tokens_send_log ON quote_share_tokens(tenant_id,send_log_id);
  `);
    }
  ],
  [
    32,
    () => {
      // v3.5.6 operasyon onarımı: Daha önce yarım kalmış/elle işaretlenmiş şema
      // geçişlerinde e-posta ve yedekleme ekranlarının 500 vermesini engeller.
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("quote_send_logs", "deleted_at", "INTEGER");
      ensureColumn("quote_send_logs", "deleted_by", "TEXT");
      ensureColumn("quote_send_logs", "mail_type", "TEXT NOT NULL DEFAULT 'QUOTE'");
      ensureColumn("quote_send_logs", "cc_email", "TEXT");
      ensureColumn("quote_send_logs", "share_url_secret", "TEXT");
      ensureColumn("quote_share_tokens", "token_hash", "TEXT");
      ensureColumn("quote_share_tokens", "revoked_at", "INTEGER");
      ensureColumn("quote_share_tokens", "send_log_id", "TEXT");
      ensureColumn("backup_jobs", "sha256", "TEXT");
      ensureColumn("backup_jobs", "integrity_status", "TEXT");
      ensureColumn("backup_jobs", "verified_at", "INTEGER");
      ensureColumn("backup_jobs", "backup_scope", "TEXT NOT NULL DEFAULT 'SYSTEM'");
      db.exec(`
    UPDATE backup_jobs SET backup_scope='SYSTEM' WHERE backup_scope IS NULL OR backup_scope='';
    CREATE INDEX IF NOT EXISTS idx_quote_share_tokens_send_log ON quote_share_tokens(tenant_id,send_log_id);
    CREATE INDEX IF NOT EXISTS idx_quote_send_logs_tracking ON quote_send_logs(tenant_id,status,view_count,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quote_share_token_hash_lookup ON quote_share_tokens(token_hash) WHERE token_hash IS NOT NULL;
  `);
    }
  ],
  [
    33,
    () => {
      // v3.5.7: E-posta, WhatsApp ve veri yedeği tablolarını mevcut kurulumlarda zorunlu onar.
      ensureOperationalSchema();
    }
  ],
  [
    34,
    () => {
      // v3.5.8: WhatsApp/e-posta güvenli bağlantı kayıtlarını ve veri yedeği sütunlarını yeniden doğrula.
      // Migration 33 daha önce işaretlenmiş olsa bile yarım kalan canlı kurulumlar burada tekrar onarılır.
      ensureOperationalSchema();
    }
  ],
  [
    35,
    () => {
      // v3.6.0: Tema stüdyosundaki tüm bağımsız görünüm kontrollerini kullanıcı bazında sakla.
      const cols = new Set(
        db
          .prepare(`PRAGMA table_info(user_ui_settings)`)
          .all()
          .map((x) => x.name)
      );
      if (!cols.has("custom_json"))
        db.exec(`ALTER TABLE user_ui_settings ADD COLUMN custom_json TEXT NOT NULL DEFAULT '{}'`);
    }
  ],
  [
    36,
    () => {
      // v3.6.2: Proformadan ürün aktarım şablon hafızası ve ayrıntılı işlem geçmişi.
      db.exec(`
    CREATE TABLE IF NOT EXISTS product_import_templates(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, source_pattern TEXT,
      mapping_json TEXT NOT NULL DEFAULT '{}', defaults_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(tenant_id,name)
    );
    CREATE INDEX IF NOT EXISTS idx_product_import_templates_tenant ON product_import_templates(tenant_id,updated_at DESC);
    CREATE TABLE IF NOT EXISTS product_import_history(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT, source_name TEXT, source_type TEXT,
      source_size INTEGER NOT NULL DEFAULT 0, template_name TEXT, status TEXT NOT NULL,
      detected_count INTEGER NOT NULL DEFAULT 0, selected_count INTEGER NOT NULL DEFAULT 0,
      added_count INTEGER NOT NULL DEFAULT 0, updated_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0, warning_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0, details_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_product_import_history_tenant ON product_import_history(tenant_id,created_at DESC);
  `);
    }
  ],
  [
    37,
    () => {
      // v3.6.4: Canlıda migration 36 atlanmış/yarım kalmış kurulumları zorunlu onar.
      db.exec(`
    CREATE TABLE IF NOT EXISTS product_import_templates(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, source_pattern TEXT,
      mapping_json TEXT NOT NULL DEFAULT '{}', defaults_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(tenant_id,name)
    );
    CREATE INDEX IF NOT EXISTS idx_product_import_templates_tenant ON product_import_templates(tenant_id,updated_at DESC);
    CREATE TABLE IF NOT EXISTS product_import_history(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT, source_name TEXT, source_type TEXT,
      source_size INTEGER NOT NULL DEFAULT 0, template_name TEXT, status TEXT NOT NULL,
      detected_count INTEGER NOT NULL DEFAULT 0, selected_count INTEGER NOT NULL DEFAULT 0,
      added_count INTEGER NOT NULL DEFAULT 0, updated_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0, warning_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0, details_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_product_import_history_tenant ON product_import_history(tenant_id,created_at DESC);
  `);
    }
  ],
  [
    38,
    () => {
      // v3.6.5: Proforma ürün aktarımı canlı kurulum güvenlik ağı ve tasarım/kurulum kayıtları.
      db.exec(`
    CREATE TABLE IF NOT EXISTS product_import_templates(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, source_pattern TEXT,
      mapping_json TEXT NOT NULL DEFAULT '{}', defaults_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(tenant_id,name)
    );
    CREATE INDEX IF NOT EXISTS idx_product_import_templates_tenant ON product_import_templates(tenant_id,updated_at DESC);
    CREATE TABLE IF NOT EXISTS product_import_history(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT, source_name TEXT, source_type TEXT,
      source_size INTEGER NOT NULL DEFAULT 0, template_name TEXT, status TEXT NOT NULL,
      detected_count INTEGER NOT NULL DEFAULT 0, selected_count INTEGER NOT NULL DEFAULT 0,
      added_count INTEGER NOT NULL DEFAULT 0, updated_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0, warning_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0, details_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_product_import_history_tenant ON product_import_history(tenant_id,created_at DESC);
  `);
    }
  ],
  [
    39,
    () => {
      // v3.6.9: Muadil ürün bağlantıları, akıllı teklif takibi ve düzenlenebilir otomatik hatırlatmalar.
      db.exec(`
    CREATE TABLE IF NOT EXISTS product_alternatives(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, product_id TEXT NOT NULL, alternative_product_id TEXT NOT NULL,
      alternative_type TEXT NOT NULL DEFAULT 'EQUIVALENT', note TEXT, created_by TEXT, created_at INTEGER NOT NULL,
      UNIQUE(tenant_id,product_id,alternative_product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_product_alternatives_product ON product_alternatives(tenant_id,product_id);
    CREATE TABLE IF NOT EXISTS quote_followup_tasks(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, quote_id TEXT NOT NULL, task_type TEXT NOT NULL,
      due_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN', assigned_user_id TEXT, note TEXT,
      completed_at INTEGER, snoozed_until TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(tenant_id,quote_id,task_type,due_date)
    );
    CREATE INDEX IF NOT EXISTS idx_quote_followup_tasks_due ON quote_followup_tasks(tenant_id,status,due_date);
    CREATE TABLE IF NOT EXISTS quote_followup_mail_logs(
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, quote_id TEXT NOT NULL, mail_type TEXT NOT NULL,
      recipient TEXT, status TEXT NOT NULL, error_text TEXT, sent_at INTEGER NOT NULL,
      UNIQUE(tenant_id,quote_id,mail_type)
    );
  `);
    }
  ],
  [
    40,
    () => {
      // v3.7.0: bütün proforma ön izlemeleri, ayrıntılı muadil ürün bilgisi ve kalıcı kullanıcı dashboard düzeni.
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("quote_items", "alternative_to_product_id", "TEXT");
      ensureColumn("quote_items", "alternative_to_name", "TEXT");
      ensureColumn("quote_items", "alternative_type", "TEXT NOT NULL DEFAULT 'EQUIVALENT'");
      ensureColumn("quote_items", "alternative_note", "TEXT");
      ensureColumn("quote_followup_tasks", "priority", "TEXT NOT NULL DEFAULT 'NORMAL'");
      ensureColumn("quote_followup_tasks", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
      ensureColumn("quote_followup_tasks", "completed_by", "TEXT");
      db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_widget_layouts(
      id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,user_id TEXT NOT NULL,widget_key TEXT NOT NULL,
      order_no INTEGER NOT NULL DEFAULT 0,column_no INTEGER NOT NULL DEFAULT 1,width INTEGER NOT NULL DEFAULT 1,
      x_px INTEGER NOT NULL DEFAULT 0,y_px INTEGER NOT NULL DEFAULT 0,width_px INTEGER NOT NULL DEFAULT 420,height_px INTEGER NOT NULL DEFAULT 220,
      is_visible INTEGER NOT NULL DEFAULT 1,is_locked INTEGER NOT NULL DEFAULT 0,is_collapsed INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,UNIQUE(tenant_id,user_id,widget_key)
    );
    CREATE INDEX IF NOT EXISTS idx_dashboard_widget_layout_user ON dashboard_widget_layouts(tenant_id,user_id,order_no);
    CREATE TABLE IF NOT EXISTS dashboard_widget_events(
      id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,user_id TEXT NOT NULL,widget_key TEXT NOT NULL,event_type TEXT NOT NULL,
      old_json TEXT,new_json TEXT,created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dashboard_widget_events_user ON dashboard_widget_events(tenant_id,user_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quote_items_alternative ON quote_items(quote_id,is_alternative,alternative_to_product_id);
  `);
      // Eski/yarım kurulumlarda tablo var fakat piksel alanları eksik olabilir; tablo oluşturulduktan sonra tamamla.
      ensureColumn("dashboard_widget_layouts", "x_px", "INTEGER NOT NULL DEFAULT 0");
      ensureColumn("dashboard_widget_layouts", "y_px", "INTEGER NOT NULL DEFAULT 0");
      ensureColumn("dashboard_widget_layouts", "width_px", "INTEGER NOT NULL DEFAULT 420");
      ensureColumn("dashboard_widget_layouts", "height_px", "INTEGER NOT NULL DEFAULT 220");
      for (const tenant of db.prepare("SELECT id FROM tenants").all())
        ensureProfessionalTemplateLibrary(tenant.id);
      ensureOperationalSchema();
    }
  ],
  [
    41,
    () => {
      // v3.7.0 veri koruma: proforma satırları artık silinip yeniden oluşturulmaz; kimliği korunur ve kaldırılan satır soft-delete olur.
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("quote_items", "deleted_at", "INTEGER");
      ensureColumn("quote_items", "deleted_by", "TEXT");
      ensureColumn("quote_items", "created_at", "INTEGER");
      ensureColumn("quote_items", "updated_at", "INTEGER");
      db.exec(`
    UPDATE quote_items SET created_at=COALESCE(created_at,(SELECT created_at FROM quotes WHERE quotes.id=quote_items.quote_id),CAST(strftime('%s','now') AS INTEGER)*1000);
    UPDATE quote_items SET updated_at=COALESCE(updated_at,created_at,CAST(strftime('%s','now') AS INTEGER)*1000);
    CREATE INDEX IF NOT EXISTS idx_quote_items_active ON quote_items(quote_id,deleted_at,sort_order);
    CREATE INDEX IF NOT EXISTS idx_quote_events_history ON quote_events(tenant_id,quote_id,created_at DESC);
  `);
    }
  ],
  [
    42,
    () => {
      // crmV20: aynı form örneğinin tekrar kaydedilmesi ikinci proforma oluşturmaz.
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("quotes", "form_instance_id", "TEXT");
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_form_instance ON quotes(tenant_id,form_instance_id) WHERE form_instance_id IS NOT NULL AND form_instance_id<>'';`
      );
    }
  ],
  [
    43,
    () => {
      // crmv1.5: teklif geneli indirimi satır indirimlerinden ayrı ve kalıcı tutulur.
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("quotes", "quote_discount_type", "TEXT NOT NULL DEFAULT 'PERCENT'");
      ensureColumn("quotes", "quote_discount_value", "REAL NOT NULL DEFAULT 0");
      ensureColumn("quotes", "quote_discount_total", "REAL NOT NULL DEFAULT 0");
    }
  ],
  [
    44,
    () => {
      // crmv1.7: doğrulanmış insan görüntülenmesi ve gerçek süreç geçiş zamanları.
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("quote_view_events", "event_type", "TEXT NOT NULL DEFAULT 'HUMAN_VIEW'");
      ensureColumn("quote_view_events", "page_view_id", "TEXT");
      ensureColumn("quotes", "approved_at", "INTEGER");
      ensureColumn("quotes", "ordered_at", "INTEGER");
      ensureColumn("quotes", "delivered_at", "INTEGER");
      ensureColumn("quotes", "rejected_at", "INTEGER");
      db.exec(`
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
  `);
    }
  ],
  [
    45,
    () => {
      // crmv1.17: ürün fiyat değişiklik geçmişi ve ön izlemeden geri alma.
      db.exec(`
    CREATE TABLE IF NOT EXISTS product_price_history(
      id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,product_id TEXT NOT NULL,
      old_price REAL NOT NULL,new_price REAL NOT NULL,currency TEXT NOT NULL DEFAULT 'TRY',
      change_type TEXT NOT NULL DEFAULT 'DIRECT',change_value REAL,changed_by TEXT,created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_product_price_history_product
      ON product_price_history(tenant_id,product_id,created_at DESC);
      `);
    }
  ],
  [
    46,
    () => {
      // crmv1.17: Önceki sürümün otomatik arşivlediği hazır proforma şablonlarını bir kez geri getir.
      // Sonraki kullanıcı silmeleri tekrar açılmaz; bu migration yalnızca bir defa çalışır.
      if (builtInTemplateKeys.length) {
        const placeholders = builtInTemplateKeys.map(() => "?").join(",");
        db.prepare(
          `UPDATE quote_templates
           SET deleted_at=NULL,deleted_by=NULL,updated_at=?
           WHERE template_key IN (${placeholders}) AND COALESCE(deleted_at,0)<>0`
        ).run(Date.now(), ...builtInTemplateKeys);
      }
      for (const tenant of db.prepare("SELECT id FROM tenants").all())
        ensureProfessionalTemplateLibrary(tenant.id);
    }
  ],
  [
    47,
    () => {
      // crmv1.19: v1.17'nin hazır şablonlara zorla uyguladığı yapısal v2
      // sınıflarını kaldır ve özgün layout-* tasarımlarını geri getir.
      // Kullanıcının oluşturduğu özel şablonlara dokunulmaz.
      for (const tenant of db.prepare("SELECT id FROM tenants").all())
        restoreLegacyTemplateLibrary(tenant.id);
    }
  ],
  [
    48,
    () => {
      // crmv1.19: crmv1.12 paketindeki 32 özgün hazır şablonu ad, layout,
      // renk ve yazı tipiyle aynen geri yükle; kullanıcının TEK260075 PDF
      // düzenini ise yenileri silmeden ayrı bir seçilebilir şablon olarak ekle.
      for (const tenant of db.prepare("SELECT id FROM tenants").all()) {
        restoreV112TemplateLibrary(tenant.id);
        restoreArtevaClassicTemplate(tenant.id, false);
      }
    }
  ],
  [
    49,
    () => {
      // crmv1.22: Eski şablon geri yüklemesini önceki tek seferlik migration
      // kaydından bağımsızlaştır. Aynı numarayı daha önce kullanan/atlayan canlı
      // veritabanlarında tenant bazlı release işaretiyle zorunlu uzlaştır.
      for (const tenant of db.prepare("SELECT id FROM tenants").all())
        reconcileTemplateLibraryV120(tenant.id, { force: true });
    }
  ],
  [
    50,
    () => {
      // crmv1.22: Gönderilmiş teklif, gönderildiği andaki proforma tasarımını
      // dondurur. Revizyon yeni kayıt olduğundan kendi ilk gönderiminde yeni
      // tasarım anlık görüntüsünü alır; eski gönderimin görünümü değişmez.
      const ensureColumn = (table, name, ddl) => {
        const cols = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((x) => x.name)
        );
        if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
      };
      ensureColumn("quotes", "template_snapshot_json", "TEXT");
      ensureColumn("quote_send_logs", "template_snapshot_json", "TEXT");

      const sentQuotes = db
        .prepare(
          `SELECT q.id,q.tenant_id,q.template_key
           FROM quotes q
           WHERE EXISTS(SELECT 1 FROM quote_send_logs l WHERE l.tenant_id=q.tenant_id AND l.quote_id=q.id)`
        )
        .all();
      const byKey = db.prepare(
        `SELECT * FROM quote_templates
         WHERE tenant_id=? AND template_key=? AND COALESCE(deleted_at,0)=0 LIMIT 1`
      );
      const fallback = db.prepare(
        `SELECT * FROM quote_templates
         WHERE tenant_id=? AND COALESCE(deleted_at,0)=0
         ORDER BY is_default DESC,updated_at DESC,created_at ASC LIMIT 1`
      );
      const updateQuote = db.prepare(
        `UPDATE quotes SET template_snapshot_json=?
         WHERE tenant_id=? AND id=? AND (template_snapshot_json IS NULL OR TRIM(template_snapshot_json)='')`
      );
      for (const quote of sentQuotes) {
        const template = (quote.template_key && byKey.get(quote.tenant_id, quote.template_key)) || fallback.get(quote.tenant_id);
        if (!template) continue;
        const snapshot = JSON.stringify({
          id: template.id || null,
          template_key: template.template_key,
          name: template.name,
          description: template.description || "",
          layout_key: template.layout_key,
          primary_color: template.primary_color,
          accent_color: template.accent_color,
          font_family: template.font_family,
          font_size: Number(template.font_size || 11),
          settings_json: String(template.settings_json || "{}"),
          block_order_json: String(template.block_order_json || '[]'),
          is_default: Number(template.is_default || 0)
        });
        updateQuote.run(snapshot, quote.tenant_id, quote.id);
      }
      db.exec(`
        UPDATE quote_send_logs
        SET template_snapshot_json=(
          SELECT q.template_snapshot_json FROM quotes q
          WHERE q.tenant_id=quote_send_logs.tenant_id AND q.id=quote_send_logs.quote_id
        )
        WHERE (template_snapshot_json IS NULL OR TRIM(template_snapshot_json)='')
          AND EXISTS(SELECT 1 FROM quotes q WHERE q.tenant_id=quote_send_logs.tenant_id AND q.id=quote_send_logs.quote_id);
      `);
    }
  ]  ,
  [
    51,
    `CREATE INDEX IF NOT EXISTS idx_quote_items_product_lookup ON quote_items(product_id,quote_id,deleted_at);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_lookup ON quotes(tenant_id,customer_id,deleted_at,updated_at DESC);`
  ],
  [
    52,
    `CREATE TABLE IF NOT EXISTS web_product_sources(
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      sitemap_url TEXT,
      product_path_pattern TEXT NOT NULL DEFAULT '/urun/|/product/|/products/',
      settings_json TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(tenant_id,name)
    );
CREATE INDEX IF NOT EXISTS idx_web_product_sources_tenant ON web_product_sources(tenant_id,is_active,updated_at DESC);
CREATE TABLE IF NOT EXISTS web_product_import_history(
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT,
      source_id TEXT,
      source_name TEXT,
      base_url TEXT,
      status TEXT NOT NULL,
      discovered_count INTEGER NOT NULL DEFAULT 0,
      analyzed_count INTEGER NOT NULL DEFAULT 0,
      selected_count INTEGER NOT NULL DEFAULT 0,
      added_count INTEGER NOT NULL DEFAULT 0,
      updated_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
CREATE INDEX IF NOT EXISTS idx_web_product_import_history_tenant ON web_product_import_history(tenant_id,created_at DESC);`
  ]

];
db.exec(
  "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,applied_at INTEGER NOT NULL)"
);
const applied = new Set(
  db
    .prepare("SELECT version FROM schema_migrations")
    .all()
    .map((x) => x.version)
);
const ins = db.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)");
for (const [version, migration] of migrations) {
  if (!applied.has(version)) {
    db.transaction(() => {
      if (typeof migration === "function") migration();
      else db.exec(migration);
      ins.run(version, Date.now());
    })();
    console.log(`migration ${version} applied`);
  }
}
console.log("migrations complete");

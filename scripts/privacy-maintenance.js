import fs from "fs";
import crypto from "crypto";
import { db, hasTable } from "../src/db/db.js";
import { resolvePrivateFile } from "../src/middleware/upload.js";

const apply = process.argv.includes("--apply");
const now = Date.now();
const DAY = 86_400_000;
const placeholder = "[Saklama süresi dolduğu için anonimleştirildi]";

if (!hasTable("live_sites") || !hasTable("live_conversations") || !hasTable("live_messages")) {
  console.log("Canlı destek tabloları bulunmadı; işlem yapılmadı.");
  process.exit(0);
}

const sites = db.prepare(`SELECT id,tenant_id,site_name,COALESCE(retention_days,365) retention_days
  FROM live_sites WHERE COALESCE(retention_days,365) BETWEEN 30 AND 3650`).all();
let conversationCount = 0;
let messageCount = 0;
let visitorCount = 0;
let attachmentCount = 0;

const anonymize = db.transaction((site, cutoff) => {
  const conversations = db.prepare(`SELECT id,visitor_id FROM live_conversations
    WHERE tenant_id=? AND site_id=? AND status='CLOSED' AND COALESCE(closed_at,last_message_at,started_at,0)<?`).all(site.tenant_id, site.id, cutoff);
  for (const conv of conversations) {
    const attachments = db.prepare(`SELECT attachment_url FROM live_messages
      WHERE tenant_id=? AND conversation_id=? AND attachment_url LIKE 'private:%'`).all(site.tenant_id, conv.id);
    attachmentCount += attachments.length;
    if (apply) {
      for (const row of attachments) {
        const full = resolvePrivateFile(row.attachment_url);
        if (full && fs.existsSync(full)) {
          try { fs.unlinkSync(full); } catch (error) { console.error("Ek silinemedi:", error.message); }
        }
      }
      const changed = db.prepare(`UPDATE live_messages SET message=?,attachment_url=NULL,attachment_name=NULL,
        sender_id=NULL,client_uid=NULL WHERE tenant_id=? AND conversation_id=?`).run(placeholder, site.tenant_id, conv.id);
      messageCount += changed.changes;
      db.prepare(`UPDATE live_conversations SET first_message=?,source_url=NULL,source_title=NULL
        WHERE tenant_id=? AND id=?`).run(placeholder, site.tenant_id, conv.id);
      const hasRecent = db.prepare(`SELECT 1 FROM live_conversations WHERE tenant_id=? AND visitor_id=?
        AND (status<>'CLOSED' OR COALESCE(closed_at,last_message_at,started_at,0)>=?) LIMIT 1`).get(site.tenant_id, conv.visitor_id, cutoff);
      if (!hasRecent) {
        const changedVisitor = db.prepare(`UPDATE live_visitors SET ip=NULL,user_agent=NULL,country=NULL,city=NULL,browser=NULL,
          current_url=NULL,current_title=NULL,referrer=NULL,customer_id=NULL,contact_name=NULL,contact_title=NULL,
          contact_company=NULL,contact_email=NULL,contact_phone=NULL,typing_text=NULL,typing_at=0,
          visitor_label='Anonim ziyaretçi',last_group_key=visitor_token WHERE tenant_id=? AND id=?`).run(site.tenant_id, conv.visitor_id);
        visitorCount += changedVisitor.changes;
      }
    } else {
      messageCount += db.prepare("SELECT COUNT(*) c FROM live_messages WHERE tenant_id=? AND conversation_id=?").get(site.tenant_id, conv.id)?.c || 0;
      const hasRecent = db.prepare(`SELECT 1 FROM live_conversations WHERE tenant_id=? AND visitor_id=?
        AND (status<>'CLOSED' OR COALESCE(closed_at,last_message_at,started_at,0)>=?) LIMIT 1`).get(site.tenant_id, conv.visitor_id, cutoff);
      if (!hasRecent) visitorCount += 1;
    }
    conversationCount += 1;
  }
  if (apply && conversations.length && hasTable("audit_logs")) {
    db.prepare(`INSERT INTO audit_logs(id,tenant_id,user_id,action,module,entity_id,ip,old_json,new_json,result,created_at)
      VALUES(?, ?, NULL, 'LIVE_PRIVACY_RETENTION', 'LIVE', ?, NULL, NULL, ?, 'OK', ?)`).run(
        `aud_${crypto.randomUUID().replaceAll("-", "")}`, site.tenant_id, site.id,
        JSON.stringify({ retention_days: site.retention_days, conversations: conversations.length }), now
      );
  }
});

for (const site of sites) {
  const cutoff = now - Math.max(30, Math.min(3650, Number(site.retention_days || 365))) * DAY;
  anonymize(site, cutoff);
}

console.log(JSON.stringify({
  mode: apply ? "APPLY" : "DRY_RUN",
  sites: sites.length,
  conversations: conversationCount,
  messages: messageCount,
  visitors: visitorCount,
  attachments: attachmentCount
}, null, 2));
if (!apply) console.log("Değişiklik uygulanmadı. Uygulamak için: npm run privacy:apply");
db.close();

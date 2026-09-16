import crypto from "crypto";
import { db } from "../src/db/db.js";
import { sendMail,publicUrl } from "../src/services/mail.service.js";
import { ensureOperationalSchema } from "../src/services/operational-schema.service.js";
import { id } from "../src/utils/id.js";

const parse=v=>{try{return JSON.parse(v||'{}')}catch{return {}}};
const setting=(tenant,key,def='')=>{const r=db.prepare('SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?').get(tenant,key);if(!r)return def;try{return JSON.parse(r.value_json)}catch{return def}};
const fill=(tpl,data)=>String(tpl||'').replace(/{{\s*(TEKLIF_NO|MUSTERI|SON_GUN|TEKLIF_LINKI)\s*}}/g,(_,k)=>data[k]||'');
const dayStart=value=>{const d=value?new Date(value):new Date();d.setHours(0,0,0,0);return d};
const iso=d=>d.toISOString().slice(0,10);
const today=dayStart();

function createPublicShare({tenant,quote,recipient,mailType}){
  ensureOperationalSchema();
  const raw=crypto.randomBytes(32).toString('base64url');
  const hash=crypto.createHash('sha256').update(raw).digest('hex');
  const tokenId=id('qtk'),logId=id('qsl'),now=Date.now();
  const shareUrl=publicUrl(`/q/${raw}`);
  db.transaction(()=>{
    db.prepare(`INSERT INTO quote_send_logs(id,tenant_id,quote_id,recipient_email,subject,body,share_url,status,created_at,mail_type)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(logId,tenant,quote.id,recipient,'','',publicUrl('/q/[REDACTED]'),'PENDING',now,mailType);
    db.prepare(`INSERT INTO quote_share_tokens(id,tenant_id,quote_id,token,token_hash,recipient_email,is_active,created_at,send_log_id)
      VALUES(?,?,?,?,?,?,?,?,?)`).run(tokenId,tenant,quote.id,`sha256:${hash}`,hash,recipient,0,now,logId);
  })();
  return {raw,shareUrl,tokenId,logId};
}

function finalizeShare(share,{ok,messageId='',error=''}){
  const now=Date.now();
  db.transaction(()=>{
    db.prepare('UPDATE quote_send_logs SET status=?,provider_message_id=?,error_message=?,sent_at=? WHERE id=?')
      .run(ok?'SENT':'FAILED',messageId||'',error||null,ok?now:null,share.logId);
    db.prepare('UPDATE quote_share_tokens SET is_active=?,revoked_at=? WHERE id=?')
      .run(ok?1:0,ok?null:now,share.tokenId);
  })();
}

const tenants=db.prepare("SELECT id FROM tenants WHERE status='ACTIVE'").all();
let sent=0,failed=0,skipped=0;
for(const {id:tenant} of tenants){
  if(String(setting(tenant,'quote_reminder_enabled','1'))!=='1')continue;
  const before=Math.max(1,Math.min(30,Number(setting(tenant,'quote_reminder_days_before',3))||3));
  const reminderDate=new Date(today);reminderDate.setDate(reminderDate.getDate()+before);
  const expiredDate=new Date(today);expiredDate.setDate(expiredDate.getDate()-1);
  const quotes=db.prepare(`SELECT * FROM quotes WHERE tenant_id=? AND COALESCE(deleted_at,0)=0
    AND status NOT IN ('APPROVED','ORDERED','DELIVERED','ARCHIVED','REJECTED')
    AND valid_until IN (?,?)`).all(tenant,iso(reminderDate),iso(expiredDate));

  for(const q of quotes){
    const expired=String(q.valid_until)<iso(today),type=expired?'EXPIRED':'BEFORE_EXPIRY';
    const delivered=db.prepare("SELECT 1 FROM quote_followup_mail_logs WHERE tenant_id=? AND quote_id=? AND mail_type=? AND status='SENT'").get(tenant,q.id,type);
    if(delivered){skipped++;continue}
    const c=parse(q.customer_snapshot_json),to=String(c.email||'').trim();
    if(!to){skipped++;continue}
    let share;
    try{
      share=createPublicShare({tenant,quote:q,recipient:to,mailType:`FOLLOWUP_${type}`});
      const data={TEKLIF_NO:q.quote_no,MUSTERI:c.company_name||'',SON_GUN:q.valid_until,TEKLIF_LINKI:share.shareUrl};
      const defaultSubject=expired?'Fiyat teklifimizin geçerlilik süresi sona erdi':'Fiyat teklifimizin geçerlilik süresi hakkında';
      const defaultBody=expired
        ?`Sn. Yetkili,\n\n{{TEKLIF_NO}} numaralı fiyat teklifimizin geçerlilik süresi sona ermiştir. Güncel fiyat ve koşullar için yeni talebinizi iletebilirsiniz.\n\n{{TEKLIF_LINKI}}\n\nİyi çalışmalar dileriz.`
        :`Sn. Yetkili,\n\n{{TEKLIF_NO}} numaralı fiyat teklifimizin son geçerlilik tarihi {{SON_GUN}} olup, geçerlilik süresinin bitmesine ${before} gün kalmıştır.\n\n{{TEKLIF_LINKI}}\n\nİyi çalışmalar dileriz.`;
      const subject=fill(setting(tenant,expired?'quote_expired_subject':'quote_reminder_subject',defaultSubject),data);
      const body=fill(setting(tenant,expired?'quote_expired_body':'quote_reminder_body',defaultBody),data);
      db.prepare('UPDATE quote_send_logs SET subject=?,body=? WHERE id=?').run(subject,body.split(share.shareUrl).join('[GÜVENLİ TEKLİF BAĞLANTISI]'),share.logId);
      const info=await sendMail(tenant,{to,subject,body,shareUrl:share.shareUrl});
      finalizeShare(share,{ok:true,messageId:info?.messageId||''});
      db.prepare(`INSERT INTO quote_followup_mail_logs(id,tenant_id,quote_id,mail_type,recipient,status,error_text,sent_at)
        VALUES(?,?,?,?,?,'SENT',NULL,?) ON CONFLICT(tenant_id,quote_id,mail_type)
        DO UPDATE SET recipient=excluded.recipient,status='SENT',error_text=NULL,sent_at=excluded.sent_at`)
        .run(id('qfm'),tenant,q.id,type,to,Date.now());
      sent++;
    }catch(e){
      const message=String(e?.message||e).slice(0,500);
      try{if(share)finalizeShare(share,{ok:false,error:message})}catch(logError){console.error('[followup-share-log]',logError)}
      db.prepare(`INSERT INTO quote_followup_mail_logs(id,tenant_id,quote_id,mail_type,recipient,status,error_text,sent_at)
        VALUES(?,?,?,?,?,'FAILED',?,?) ON CONFLICT(tenant_id,quote_id,mail_type)
        DO UPDATE SET recipient=excluded.recipient,status='FAILED',error_text=excluded.error_text,sent_at=excluded.sent_at`)
        .run(id('qfm'),tenant,q.id,type,to,message,Date.now());
      failed++;
    }
  }
}
console.log(JSON.stringify({ok:failed===0,sent,failed,skipped,date:iso(today)}));

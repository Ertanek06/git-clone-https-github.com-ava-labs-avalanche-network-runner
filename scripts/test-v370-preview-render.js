import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const statuses=['DRAFT','SENT','APPROVED','REVISION_REQUESTED','ARCHIVED'];
const base={id:'quo_preview_test',quote_no:'TEK260999',revision_no:1,profile_snapshot:{company_name:'ARTEVA LABORATUVAR',address:'ANKARA',phone:'0541',email:'info@example.com',tax_office:'İVEDİK',tax_no:'1200'},customer_snapshot:{company_name:'ÖRNEK MÜŞTERİ',address1:'ANKARA',phone:'0312',email:'satinalma@example.com'},quote_date:'2026-07-21',valid_until:'2026-07-31',currency:'EUR',fx_rate:53.4,subject:'Örnek teklif',subtotal:1000,discount_total:0,vat_total:200,grand_total:1200,items:[{product_snapshot:{code:'NORMAL-01',name:'Normal ürün',short_description:'Açıklama'},quantity:1,unit:'ADET',unit_price:500,currency:'EUR',discount_type:'PERCENT',discount_value:0,vat_rate:20,line_net:500,line_vat:100,line_total:600,show_image:1,is_alternative:0,include_total:1},{product_snapshot:{code:'MUADIL-01',name:'Muadil ürün',short_description:'Teknik eş değer'},quantity:1,unit:'ADET',unit_price:500,currency:'EUR',discount_type:'PERCENT',discount_value:0,vat_rate:20,line_net:500,line_vat:100,line_total:600,show_image:1,is_alternative:1,include_total:1,alternative_to_name:'Ana ürün',alternative_note:'Yerli üretim muadil'}]};
const common={layout:false,template:{layout_key:'classic',primary_color:'#245ba7',accent_color:'#d83238',font_family:'Inter',font_size:11,name:'Kurumsal'},templateSettings:{show_alternative_badge:true,alternative_badge_color:'#f59e0b',alternative_badge_text_color:'#3b2200',alternative_badge_position:'top-left'},templatePalette:{},manualTemplate:{enabled:false,html:'',css:''},isPreview:true,autoPrint:false,publicView:false,embeddedPreview:false,locale:'tr',t:k=>k,appVersion:'3.8.57',publicBaseUrl:'https://crm.artevapp.com.tr',quoteDisplayNo:r=>r.quote_no,quotePrintDisplayNo:r=>r.quote_no};
for(const status of statuses){
 const html=await ejs.renderFile(path.join(root,'views/quotes/print.ejs'),{...common,row:{...base,status}},{filename:path.join(root,'views/quotes/print.ejs')});
 assert.match(html,/MUADİL ÜRÜN/);assert.match(html,/İndir \/ PDF/);assert.match(html,/WhatsApp/);assert.match(html,/E-posta/);
}
console.log(`V370_PREVIEW_RENDER=${statuses.length}/${statuses.length} OK`);

import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const partial=fs.readFileSync(path.join(root,'views/partials/login-canvas.ejs'),'utf8');
const authSource=fs.readFileSync(path.join(root,'views/auth/login.ejs'),'utf8');
const settingsSource=fs.readFileSync(path.join(root,'views/settings/login.ejs'),'utf8');
const studioJs=fs.readFileSync(path.join(root,'public/js/login-studio-v356.js'),'utf8');
const studioCss=fs.readFileSync(path.join(root,'public/css/login-studio-v356.css'),'utf8');
const assetBuild=fs.readFileSync(path.join(root,'scripts/build-assets.js'),'utf8');
for(const token of ['login-pro-canvas','data-draggable="left_title"','data-draggable="left_text"','data-preview-role="subtitle"','data-preview-role="login_label"','data-preview-role="note"'])if(!partial.includes(token))throw new Error(`Ortak login canvas eksik: ${token}`);
if(!authSource.includes("include('../partials/login-canvas'"))throw new Error('Gerçek login ortak canvas kullanmıyor');
if(!settingsSource.includes("include('../partials/login-canvas'"))throw new Error('Ön izleme ortak canvas kullanmıyor');
for(const token of ['data-studio-text','data-studio-size','data-studio-color','data-studio-font','data-delete-media','data-card-model','data-open-live-preview'])if(!settingsSource.includes(token))throw new Error(`Login Studio kontrolü eksik: ${token}`);
for(const token of ['setPosition','clampPosition','applyMedia','addEventListener(\'wheel\'','refreshModalClone','applyModel'])if(!studioJs.includes(token))throw new Error(`Login Studio JS davranışı eksik: ${token}`);
for(const token of ['.login-pro-card','.login-studio-pro','.login-media-grid','.login-card-style--glass','.login-live-modal'])if(!studioCss.includes(token))throw new Error(`Ayrık Login Studio CSS eksik: ${token}`);
const studio={
 media_id:'none',overlay_opacity:.28,left_title_text:'Başlık',left_title_x:8,left_title_y:70,left_title_size:47,left_title_color:'#ffffff',left_title_font:'Inter',left_text_text:'Açıklama',left_text_x:8,left_text_y:82,left_text_size:18,left_text_color:'#dbeafe',left_text_font:'Inter',
 eyebrow_text:'GÜVENLİ OTURUM',eyebrow_size:14,eyebrow_color:'#245ba7',eyebrow_font:'Inter',title_text:'Hesabınıza giriş yapın',title_size:40,title_color:'#14233d',title_font:'Inter',subtitle_text:'Bilgilerinizi girin.',subtitle_size:16,subtitle_color:'#5d6f89',subtitle_font:'Inter',
 button_text:'GİRİŞ',button_size:15,button_color:'#ffffff',button_font:'Inter',button_bg:'#245ba7',button_radius:13,card_style:'classic',card_width:520,card_radius:28,card_bg:'#ffffff',card_border:'#c7d5e7',logo_height:118,
 login_label_text:'Kullanıcı adı',login_placeholder_text:'Kullanıcı bilginizi girin',password_label_text:'Şifre',password_placeholder_text:'Şifrenizi girin',password_toggle_text:'Göster',password_hide_text:'Gizle',remember_text:'Beni hatırla',note_text:'Güvenli giriş.',
 field_label_size:13,field_label_color:'#17243a',field_label_font:'Inter',input_text_size:15,input_text_color:'#17243a',input_text_font:'Inter',input_bg:'#ffffff',input_border:'#becde0',input_radius:13,remember_size:13,remember_color:'#22334f',remember_font:'Inter',note_size:12,note_color:'#667a95',note_font:'Inter'
};
const legacy={logo_url:'/public/favicon-512.png',left_image_url:null};
const cardStyles=[{id:'classic',name:'Klasik',description:'Test'},{id:'glass',name:'Cam',description:'Test'},{id:'executive',name:'Yönetici',description:'Test'},{id:'minimal',name:'Minimal',description:'Test'},{id:'embedded',name:'Gömülü',description:'Test'}];
const locals={appVersion:'3.6.0',assetBundle:{styles:'/public/build/crm-styles.0123456789abcdef.css',js:'/public/build/crm-app.0123456789abcdef.js'},studio,legacy,branding:legacy,selectedMedia:{id:'none',kind:'none',url:null,thumbnail_url:null},library:[],fonts:['Inter','Arial'],cardStyles,csrfToken:'token',next:'/',error:null,title:'Test',t:x=>x,layout:()=>{}};
const authHtml=await ejs.renderFile(path.join(root,'views/auth/login.ejs'),locals,{filename:path.join(root,'views/auth/login.ejs')});
const settingsHtml=await ejs.renderFile(path.join(root,'views/settings/login.ejs'),locals,{filename:path.join(root,'views/settings/login.ejs')});
const formCount=html=>(html.match(/<form\b/gi)||[]).length;
if(formCount(authHtml)!==1)throw new Error(`Login sayfasında form sayısı hatalı: ${formCount(authHtml)}`);
if(formCount(settingsHtml)!==1)throw new Error(`Studio sayfasında iç içe form oluştu: ${formCount(settingsHtml)}`);
if(!authHtml.includes('login-pro-card')||!authHtml.includes('name="login"')||!authHtml.includes('name="password"'))throw new Error('Giriş kartı veya alanları render edilmedi');
if(!settingsHtml.includes('loginStudioForm')||!settingsHtml.includes('loginStudioViewport'))throw new Error('Studio ana formu/ön izlemesi render edilmedi');
if(!settingsHtml.includes('name="selected_media_id"')||!settingsHtml.includes('name="studio_payload"'))throw new Error('Güvenilir kayıt alanları render edilmedi');
if(!authHtml.includes('crm-styles.0123456789abcdef.css')||!authHtml.includes('crm-app.0123456789abcdef.js'))throw new Error('Giriş sayfası birleşik varlıkları kullanmıyor');
if(!assetBuild.includes('login-studio-v356.css')||!assetBuild.includes('login-page-v356.js'))throw new Error('Login kaynakları birleşik paket girdilerinde yok');
if(settingsSource.includes('/public/css/login-studio-v356.css'))throw new Error('Tema stüdyosu ayrık CSS isteği yapıyor');
if((settingsHtml.match(/data-card-model=/g)||[]).length!==5)throw new Error('Beş kart modeli render edilmedi');
console.log('LOGIN_STUDIO_RENDER_TESTS=3/3 OK');

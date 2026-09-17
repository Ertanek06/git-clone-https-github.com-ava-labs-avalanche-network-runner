(()=>{
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 $$('img[data-empty-image-on-error]').forEach(image=>{const empty=()=>{image.hidden=true;image.removeAttribute('src')};image.addEventListener('error',empty,{once:true});if(image.complete&&!image.naturalWidth)empty()});
 $('[data-sidebar-toggle]')?.addEventListener('click',()=>$('#sidebar')?.classList.toggle('is-open'));
 const modal=$('#globalPreviewModal'),frame=$('#globalPreviewFrame'),title=$('#globalPreviewTitle'),edit=$('#globalPreviewEdit'),open=$('#globalPreviewOpen'),download=$('#globalPreviewDownload'),printBtn=$('#globalPreviewPrint'),email=$('#globalPreviewEmail'),whatsapp=$('#globalPreviewWhatsapp');
 let previewLoadTimer=0;
 const revealPreview=()=>{clearTimeout(previewLoadTimer);modal?.classList.remove('is-preview-loading-v113','is-preview-loading-v114');frame?.removeAttribute('aria-busy');frame?.style.removeProperty('visibility');frame?.style.removeProperty('opacity')};
 frame?.addEventListener('load',revealPreview);
 frame?.addEventListener('error',revealPreview);
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame?.contentWindow&&event.data?.type==='crm:preview-dom-ready-v132')revealPreview()});
 const closePreview=()=>{modal?.classList.remove('is-open');modal?.setAttribute('aria-hidden','true')};
 const previewPrintUrl=(url,openUrl)=>{const raw=String(openUrl||url||'');let base=raw;if(/\/preview(?:\?.*)?$/.test(base))base=base.replace(/\/preview(?:\?.*)?$/,'/print');else if(!/\/print(?:\?|$)/.test(base)&&/\/quotes\/[^/?#]+/.test(base))base=base.replace(/(\/quotes\/[^/?#]+)(?:[/?#].*)?$/,'$1/print');const join=base.includes('?')?'&':'?';return base+join+'auto=1'};
 const openPreview=(url,opts={})=>{
  if(!modal||!frame||!url)return;
  title.textContent=opts.title||'Ön İzleme';
  const openUrl=opts.open||url;
  open.href=openUrl;
  let previewPath='';
  try{previewPath=new URL(url,location.origin).pathname}catch{previewPath=String(url||'').split('?')[0]}
  const isQuotePdfPreview=/^\/quotes\/[^/]+\/preview$/.test(previewPath);
  const isProductPreview=/^\/products\/[^/]+\/preview$/.test(previewPath);
  modal.dataset.previewArchive=opts.archive||'';
  /* Apply the product geometry before the modal becomes visible. Waiting for
     the iframe src observer made the card render fullscreen for one frame and
     then snap down to its product size. */
  modal.classList.toggle('is-product-preview-v3',isProductPreview);
  modal.classList.toggle('is-product-preview-v13',isProductPreview);
  modal.classList.toggle('is-quote-preview-v112',isQuotePdfPreview);
  if(download){download.hidden=!isQuotePdfPreview;if(isQuotePdfPreview){const downloadUrl=previewPrintUrl(url,openUrl);download.href=downloadUrl;download.dataset.downloadUrl=downloadUrl}else{download.removeAttribute('data-download-url');download.removeAttribute('href')}}
  if(printBtn){printBtn.hidden=!(isQuotePdfPreview||isProductPreview);printBtn.textContent=isProductPreview?(document.documentElement.lang==='en'?'🖨 Print Catalog Output':'🖨 Katalog Çıktısı Yazdır'):(document.documentElement.lang==='en'?'🖨 Print / Save PDF':'🖨 Yazdır / PDF Kaydet')}
  if(opts.email&&email&&isQuotePdfPreview){email.href=opts.email;email.hidden=false}else if(email)email.hidden=true;
  if(opts.whatsapp&&whatsapp&&isQuotePdfPreview){whatsapp.action=opts.whatsapp;whatsapp.hidden=false}else if(whatsapp)whatsapp.hidden=true;
  if(opts.edit){edit.href=opts.edit;edit.hidden=false}else edit.hidden=true;
  /* Stable URLs let the already loaded iframe be reused when a preview is
     closed and opened again. Timestamp cache-busting forced a full render on
     every tap and made nested mobile previews especially expensive. */
  const next=new URL(url,location.origin);
  const current=frame.getAttribute('src');
  let currentUrl='';
  try{currentUrl=current?new URL(current,location.origin).href:''}catch{}
  const changed=currentUrl!==next.href;
  if(changed){
   /* Never expose the previous product/proforma while the next document is
      loading. The modal keeps its final size and shows only a small toolbar
      status until the new iframe is ready. */
   clearTimeout(previewLoadTimer);modal.classList.add('is-preview-loading-v114');frame.setAttribute('aria-busy','true');
   frame.style.setProperty('visibility','hidden','important');frame.style.setProperty('opacity','0','important');
  }else revealPreview();
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
  if(changed){frame.src=next.pathname+next.search+next.hash;previewLoadTimer=setTimeout(revealPreview,4500)}
 };
 if(whatsapp){whatsapp.addEventListener('submit',async e=>{e.preventDefault();const popup=window.open('about:blank','quoteWhatsApp','width=560,height=760,resizable=yes,scrollbars=yes');try{const body=new FormData(whatsapp),response=await fetch(whatsapp.action,{method:'POST',body,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-Requested-With':'fetch'}}),data=await response.json();if(!response.ok||!data.url)throw new Error(data.message||'WhatsApp bağlantısı oluşturulamadı.');if(popup)popup.location.href=data.url;else window.open(data.url,'_blank','noopener')}catch(error){popup?.close();window.CRM_TOAST?.error?.(error.message||'WhatsApp bağlantısı oluşturulamadı.')||alert(error.message||'WhatsApp bağlantısı oluşturulamadı.')}})}
 printBtn?.addEventListener('click',()=>{const src=String(frame?.getAttribute('src')||'');let path='';try{path=new URL(src,location.origin).pathname}catch{}if(/^\/quotes\/[^/]+\/preview$/.test(path)){const url=previewPrintUrl(src,open?.href||src);const popup=window.open(url,'quotePrint','noopener,noreferrer');if(!popup)window.location.assign(url);return}const product=path.match(/^\/products\/([^/]+)\/preview$/);if(product){const url=`/products/${encodeURIComponent(product[1])}/catalog-print?auto=1`;const popup=window.open(url,'productCatalogPrint','noopener,noreferrer');if(!popup)window.location.assign(url);return}try{const w=frame?.contentWindow;w?.focus();if(typeof w?.printDocument==='function'){w.printDocument();return}w?.print()}catch{window.open(open?.href||frame?.src,'_blank')}});
 download?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const url=download.dataset.downloadUrl||download.href;if(!url)return;const popup=window.open(url,'quotePdfDownload');if(!popup)window.location.assign(url)});
 document.addEventListener('click',e=>{
  if(innerWidth<=1000&&$('#sidebar')?.classList.contains('is-open')&&!e.target.closest('#sidebar')&&!e.target.closest('[data-sidebar-toggle]'))$('#sidebar').classList.remove('is-open');
  const modalOpen=e.target.closest('[data-modal-open]');if(modalOpen){e.preventDefault();const target=document.getElementById(modalOpen.dataset.modalOpen);target?.classList.add('is-open');target?.setAttribute('aria-hidden','false');setTimeout(()=>window.CRM_AUTO_GROW?.refresh(target||document),40);return}
  const modalClose=e.target.closest('[data-modal-close]');if(modalClose){e.preventDefault();modalClose.closest('.modal')?.classList.remove('is-open');return}
  const preview=e.target.closest('[data-preview-url]');if(preview){const rowPreview=preview.matches('tr.previewable-list-row');const interactive=e.target.closest('a,button,input,select,textarea,label,summary,details,[data-no-row-preview]');if(rowPreview&&interactive)return;e.preventDefault();e.stopPropagation();openPreview(preview.dataset.previewUrl,{title:preview.dataset.previewTitle,edit:preview.dataset.previewEdit,open:preview.dataset.previewOpen,email:preview.dataset.previewEmail,whatsapp:preview.dataset.previewWhatsapp,archive:preview.dataset.previewArchive});return}
  if(e.target.closest('[data-preview-close]')){e.preventDefault();closePreview();return}
  if(e.target.classList.contains('modal')){if(e.target.id==='globalPreviewModal')closePreview();else e.target.classList.remove('is-open')}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){$$('.modal.is-open').forEach(m=>m.classList.remove('is-open'));closePreview();return}const row=e.target.closest?.('tr.previewable-list-row[data-preview-url]');if(row&&e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openPreview(row.dataset.previewUrl,{title:row.dataset.previewTitle,edit:row.dataset.previewEdit,open:row.dataset.previewOpen,email:row.dataset.previewEmail,whatsapp:row.dataset.previewWhatsapp,archive:row.dataset.previewArchive})}});
 const selectionForm=el=>document.getElementById(el?.dataset?.targetForm||el?.dataset?.selectionForm||'')||el?.form||el?.closest?.('form');
 const listChecks=form=>form?[...form.elements].filter(element=>element?.matches?.('input[type="checkbox"][name="ids"]')):[];
 const syncListSelection=form=>{if(!form)return;const checks=listChecks(form),count=checks.filter(x=>x.checked).length,id=form.id;$$(`[data-selection-count="${id}"]`).forEach(x=>x.textContent=String(count));$$(`[data-requires-selection="${id}"]`).forEach(x=>x.disabled=count===0);$$(`[data-check-all][data-target-form="${id}"]`).forEach(x=>{x.checked=checks.length>0&&count===checks.length;x.indeterminate=count>0&&count<checks.length})};
 $$('[data-check-all]').forEach(master=>master.addEventListener('change',()=>{const form=selectionForm(master);listChecks(form).forEach(x=>x.checked=master.checked);syncListSelection(form)}));
 $$('input[name="ids"]').forEach(x=>x.addEventListener('change',()=>syncListSelection(selectionForm(x))));
 $$('form[id]').forEach(form=>{if(listChecks(form).length)syncListSelection(form)});
 $$('[data-list-sort-autosubmit]').forEach(select=>select.addEventListener('change',()=>select.form?.requestSubmit()));
 const showProductSaveMessage=(form,message,error=false)=>{const status=form.querySelector('[data-product-save-status]');if(status){status.textContent=message||'';status.classList.toggle('is-error',error)}let toast=document.querySelector('[data-product-save-toast-v132]');if(!toast){toast=document.createElement('div');toast.dataset.productSaveToastV132='';toast.className='product-save-toast-v132';document.body.append(toast)}toast.textContent=message||'';toast.classList.toggle('is-error',error);toast.classList.add('is-visible');clearTimeout(showProductSaveMessage.timer);showProductSaveMessage.timer=setTimeout(()=>toast.classList.remove('is-visible'),2600)};
 $$('form[data-product-save-form]').forEach(form=>form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type="submit"]');const files=[...form.querySelectorAll('input[type="file"]')].flatMap(input=>[...(input.files||[])]);const oversized=files.find(file=>file.size>120*1024*1024);if(oversized){showProductSaveMessage(form,'Dosya 120 MB sınırını aşıyor: '+oversized.name,true);return}button&& (button.disabled=true);showProductSaveMessage(form,'Kaydediliyor…');try{const csrf=String(form.elements._csrf?.value||document.querySelector('meta[name=\"csrf-token\"]')?.content||'');const response=await fetch(form.action||'/products/save',{method:'POST',body:new FormData(form),credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-Requested-With':'fetch','X-CSRF-Token':csrf}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||('Ürün kaydedilemedi (HTTP '+response.status+').'));showProductSaveMessage(form,data.message||'Ürün başarıyla kaydedildi.');setTimeout(()=>{const id=data.id||form.elements.id?.value;if(id)location.href='/products/'+encodeURIComponent(id)+'/edit';else location.href='/products'},500)}catch(error){if(button)button.disabled=false;showProductSaveMessage(form,error.message||'Ürün kaydedilemedi.',true)}}));
 const compactPreviewUrls=new WeakMap();
 $$('[data-preview-file]').forEach(input=>input.addEventListener('change',()=>{const img=document.getElementById(input.dataset.previewFile);if(!img)return;const previous=compactPreviewUrls.get(input);if(previous)URL.revokeObjectURL(previous);const file=input.files?.[0];if(!file)return;const url=URL.createObjectURL(file);compactPreviewUrls.set(input,url);img.src=url;img.hidden=false;img.closest('.asset-preview')?.querySelector('em')?.remove()}));
 window.addEventListener('beforeunload',()=>$$('[data-preview-file]').forEach(input=>{const url=compactPreviewUrls.get(input);if(url)URL.revokeObjectURL(url)}));
 const toast=$('.toast');if(toast)setTimeout(()=>toast.remove(),5200);
 // Cep telefonu alanında Türkiye kodunu yazmaya hazırlar; değer serbestçe düzenlenebilir.
 $$('input').filter(input=>['mobile','customer_mobile','contact_extra_mobile[]'].includes(input.name)).forEach(input=>{
  input.inputMode='tel';input.autocomplete='tel';if(!input.placeholder)input.placeholder='+90 5xx xxx xx xx';
  input.addEventListener('focus',()=>{if(!String(input.value||'').trim()){input.value='+90 ';input.dispatchEvent(new Event('input',{bubbles:true}));requestAnimationFrame(()=>input.setSelectionRange?.(input.value.length,input.value.length))}});
  input.addEventListener('blur',()=>{if(/^\+?90\s*$/.test(String(input.value||'').trim())){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}))}});
 });
 const liveDate=$('[data-live-date]'),liveTime=$('[data-live-time]');
 const topbarLocale=document.documentElement.lang==='en'?'en-GB':'tr-TR';
 const syncClock=()=>{const now=new Date();if(liveDate)liveDate.textContent=now.toLocaleDateString(topbarLocale,{weekday:'long',year:'numeric',month:'long',day:'2-digit'});if(liveTime)liveTime.textContent=now.toLocaleTimeString(topbarLocale,{hour:'2-digit',minute:'2-digit',second:'2-digit'})};
 syncClock();setInterval(syncClock,1000);
 fetch('/api/currency',{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(x=>{window.CRM_CURRENCY_RATES=x;if($('[data-eur]'))$('[data-eur]').textContent=x.eur?Number(x.eur).toLocaleString('tr-TR',{minimumFractionDigits:2}):'—';if($('[data-usd]'))$('[data-usd]').textContent=x.usd?Number(x.usd).toLocaleString('tr-TR',{minimumFractionDigits:2}):'—';window.dispatchEvent(new CustomEvent('crm:currency-rates',{detail:x}))}).catch(()=>{});
 $$('.metric[data-stat]').forEach(b=>b.addEventListener('click',async()=>{const m=$('#statModal'),body=$('#statBody'),h=$('#statTitle');if(!m||!body)return;h.textContent=b.querySelector('small')?.textContent||'Detaylar';body.replaceChildren();const loading=document.createElement('p');loading.className='loading-note';loading.textContent='Yükleniyor...';body.append(loading);m.classList.add('is-open');const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);try{const statUrl=b.dataset.statUrl||('/dashboard/stat/'+encodeURIComponent(b.dataset.stat));const r=await fetch(statUrl,{headers:{Accept:'application/json'},signal:ctrl.signal,cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const rows=await r.json();body.replaceChildren();for(const x of rows||[]){let c={};try{c=JSON.parse(x.customer_snapshot_json||'{}')}catch{}const a=document.createElement('a'),strong=document.createElement('b'),small=document.createElement('small');a.href=x.quote_no?'/quotes/'+encodeURIComponent(x.id):x.code&&x.name?'/products/'+encodeURIComponent(x.id)+'/edit':'/customers/'+encodeURIComponent(x.id)+'/edit';strong.textContent=c.company_name||x.company_name||x.name||x.quote_no||'-';small.textContent=[x.code,x.quote_no,x.status,x.payment_status,x.currency&&x.grand_total!=null?Number(x.grand_total).toFixed(2)+' '+x.currency:''].filter(Boolean).join(' · ');a.append(strong,small);body.append(a)}if(!body.children.length){const empty=document.createElement('p');empty.textContent='Kayıt bulunamadı.';body.append(empty)}}catch(e){body.replaceChildren();const error=document.createElement('p');error.className='toast toast--error';error.textContent='Liste yüklenemedi. Pencereyi kapatıp tekrar deneyin.';body.append(error)}finally{clearTimeout(timer)}}));
 const search=$('.global-search');search?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();location.href='/search?q='+encodeURIComponent(search.value)}});
})();

// v3.2.1 — all forms use the same filled / empty field feedback.
(()=>{
 const selector='input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]),select,textarea';
 const hasValue=el=>el.tagName==='SELECT'?String(el.value||'').trim()!=='' : String(el.value||'').trim()!=='';
 const sync=el=>{if(!el?.matches?.(selector))return;el.classList.toggle('is-filled',hasValue(el));el.classList.toggle('is-empty',!hasValue(el))};
 document.querySelectorAll(selector).forEach(sync);
 document.addEventListener('input',e=>sync(e.target));
 document.addEventListener('change',e=>sync(e.target));
 document.addEventListener('crm:sync-fields',()=>document.querySelectorAll(selector).forEach(sync));
})();


// crmv1.45 — global textarea auto-grow. Narrative fields can expand far enough
// to expose their content; only extremely long values receive an inner scroll.
(()=>{
 const selector='textarea';
 const maxFor=el=>Math.max(520,Math.min(Math.round(window.innerHeight*1.35),1200));
 const isNarrative=el=>{
  const hint=[el.name,el.id,el.getAttribute('aria-label'),el.closest('label')?.textContent].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
  return /description|açıklama|aciklama|details|note|not\b|terms|koşul|kosul|şart|sart/.test(hint)&&!/custom_css|custom_html|template|json|code|script/.test(hint);
 };
 const normalizePaste=value=>String(value||'').replace(/\r\n?/g,'\n').split('\n').map(line=>line.trim()).filter(Boolean).join('\n');
 const grow=el=>{
  if(!el?.matches?.(selector))return;
  if(el.dataset?.noGlobalGrow==='1'||el.closest?.('.quote-items'))return;
  el.classList.add('textarea-autogrow');
  const min=Number(el.dataset.minHeight||0)||Math.max(58,Math.min(96,Number(el.getAttribute('rows')||3)*24));
  const max=Number(el.dataset.maxHeight||0)||maxFor(el);
  el.style.height='auto';
  const next=Math.max(min,Math.min(max,el.scrollHeight+2));
  el.style.height=next+'px';
  el.style.overflowY=el.scrollHeight>max?'auto':'hidden';
 };
 const refresh=(root=document)=>root.querySelectorAll?.(selector).forEach(grow);
 window.CRM_AUTO_GROW={refresh,grow};
 document.addEventListener('input',e=>grow(e.target));
 document.addEventListener('change',e=>grow(e.target));
 document.addEventListener('paste',e=>{
  const el=e.target;
  if(!el?.matches?.(selector)||!isNarrative(el))return;
  const plain=e.clipboardData?.getData('text/plain');
  if(typeof plain!=='string')return;
  e.preventDefault();
  const clean=normalizePaste(plain),start=el.selectionStart??el.value.length,end=el.selectionEnd??start;
  el.setRangeText(clean,start,end,'end');
  el.dispatchEvent(new Event('input',{bubbles:true}));
  grow(el);
 });
 document.addEventListener('crm:sync-fields',()=>refresh());
 window.addEventListener('crm:ui-scale',()=>refresh());
 window.addEventListener('resize',()=>refresh());
 refresh();
 setTimeout(refresh,250);
})();


// v3.2.7 — consistent live emojis in page titles and accessible accordion sidebar behavior.
(()=>{
 const iconFor=text=>{const t=String(text||'').toLocaleLowerCase('tr-TR');if(t.includes('firma profil'))return '🏢';if(t.includes('müşteri'))return '👥';if(t.includes('ürün')||t.includes('hizmet'))return '📦';if(t.includes('şablon'))return '🎨';if(t.includes('proforma')||t.includes('teklif'))return '📄';if(t.includes('sipariş')||t.includes('süreç'))return '🔄';if(t.includes('ayar'))return '⚙️';if(t.includes('tema')||t.includes('görünüm'))return '🎨';if(t.includes('kullanıcı')||t.includes('yönetici'))return '🛡️';if(t.includes('işlem')||t.includes('audit'))return '🧾';return '✨'};
 document.querySelectorAll('.page-wrap .page-head h1').forEach(h=>{if(h.querySelector('.page-title-emoji'))return;const raw=String(h.textContent||'').trim();if(/^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(raw))return;const i=document.createElement('span');i.className='page-title-emoji';i.setAttribute('aria-hidden','true');i.textContent=iconFor(raw);h.prepend(i)});
 const menu=document.querySelector('#sidebar .menu');
 document.querySelectorAll('#sidebar details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open&&menu){requestAnimationFrame(()=>{const y=d.offsetTop+d.offsetHeight-menu.clientHeight;if(y>menu.scrollTop)menu.scrollTo({top:y+10,behavior:'smooth'})})}}));
})();


// v3.3.1 — desktop sidebar can collapse to an emoji rail and re-open on click.
(()=>{
 const sidebar=document.getElementById('sidebar');
 const toggle=document.querySelector('[data-sidebar-collapse]');
 if(!sidebar||!toggle)return;
 const key='crm-sidebar-collapsed-v1';
 const mq=window.matchMedia('(max-width:1000px)');
 const icon=toggle.querySelector('[data-sidebar-collapse-icon]');
 const setCollapsed=(collapsed,{persist=true}={})=>{
  const active=!mq.matches&&Boolean(collapsed);
  document.body.classList.toggle('sidebar-is-collapsed',active);
  toggle.setAttribute('aria-expanded',String(!active));
  toggle.title=mq.matches?'Menüyü kapat':(active?'Menüyü genişlet':'Menüyü daralt');
  if(icon)icon.textContent=mq.matches?'×':(active?'›':'‹');
  if(persist)localStorage.setItem(key,active?'1':'0');
 };
 setCollapsed(localStorage.getItem(key)==='1',{persist:false});
 window.CRM_SET_SIDEBAR_COLLAPSED=setCollapsed;
 toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(mq.matches){sidebar.classList.remove('is-open');return}setCollapsed(!document.body.classList.contains('sidebar-is-collapsed'))});
 // crmv1.7: dar ray kalıcıdır; alt menü tıklamaları flyout içinde açılır.
 mq.addEventListener?.('change',()=>setCollapsed(localStorage.getItem(key)==='1',{persist:false}));
})();


// v3.3.21 PRO — compact adaptive forms, growing notes and collapsible top-bar search.
(()=>{
 const grow=el=>{if(!el?.matches?.('textarea[data-auto-grow],.entity-form textarea,.quote-top-grid textarea,.terms-form-grid textarea'))return;el.style.height='auto';el.style.height=Math.min(1200,Math.max(62,el.scrollHeight+2))+'px';el.style.overflowY=el.scrollHeight>1200?'auto':'hidden'};
 document.querySelectorAll('textarea[data-auto-grow],.entity-form textarea,.quote-top-grid textarea,.terms-form-grid textarea').forEach(grow);
 document.addEventListener('input',e=>grow(e.target));
 const search=document.querySelector('[data-topbar-search]'),input=search?.querySelector('.global-search');
 search?.addEventListener('toggle',()=>{if(search.open)setTimeout(()=>input?.focus(),0)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&search?.open)search.open=false});
 document.addEventListener('click',e=>{if(search?.open&&!search.contains(e.target))search.open=false});
})();

// v3.3.28 — süreç güncellemelerinde onay/toast ve üst yatay kaydırma çubuğu
(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function confirmBox({title='İşlem onayı',message='Bu işlem uygulanacaktır. Onaylıyor musunuz?',ok='Onayla',danger=false}={}){
  return new Promise(resolve=>{
   document.getElementById('globalConfirmToast')?.remove();
   const host=document.createElement('div');host.id='globalConfirmToast';host.className='confirm-toast';
   host.innerHTML=`<div class="confirm-toast__card"><b>${esc(title)}</b><span>${esc(message)}</span><div><button type="button" class="btn btn--sm" data-no>Vazgeç</button><button type="button" class="btn btn--sm ${danger?'btn--danger':'btn--success'}" data-yes>${esc(ok)}</button></div></div>`;
   document.body.append(host);
   const done=v=>{host.remove();resolve(v)};
   host.querySelector('[data-no]').onclick=()=>done(false);
   host.querySelector('[data-yes]').onclick=()=>done(true);
   host.onclick=e=>{if(e.target===host)done(false)};
  });
 }
 document.addEventListener('submit',async e=>{
  const form=e.target;
  if(!form?.matches?.('[data-confirm-submit],[data-process-confirm]')||form.dataset.confirmed==='1')return;
  e.preventDefault();
  let title=form.dataset.confirmTitle||'İşlem onayı',message=form.dataset.confirmMessage||'Bu işlem uygulanacaktır. Onaylıyor musunuz?',ok=form.dataset.confirmOk||'Onayla',danger=false;
  if(form.matches('[data-process-confirm]')){
   const status=form.querySelector('[name="status"]')?.value;
   const orderStatus=form.querySelector('[name="order_status"]')?.value;
   if(orderStatus==='ORDER_CANCELLED'){title='Sipariş iptal edilsin mi?';message='Bu teklifin sipariş durumu “Sipariş iptal edildi” olarak kaydedilecektir. Onaylıyor musunuz?';ok='Evet, Siparişi İptal Et';danger=true;}
   else if(status==='ORDERED'){title='Siparişe dönüştürülsün mü?';message='Bu proforma siparişe dönüştürülecek / sipariş durumunda kaydedilecektir. Onaylıyor musunuz?';ok='Evet, Siparişe Dönüştür';}
   else if(status==='ARCHIVED'){title='Arşivlensin mi?';message='Bu proforma arşive taşınacaktır. Onaylıyor musunuz?';ok='Evet, Arşivle';danger=true;}
   else {title='Süreç güncellensin mi?';message='Durum, ödeme, sipariş ve üretim bilgileri seçtiğiniz şekilde güncellenecektir. Onaylıyor musunuz?';ok='Evet, Güncelle';}
  }
  const yes=await confirmBox({title,message,ok,danger});
  if(!yes)return;
  form.dataset.confirmed='1';
  const toast=document.createElement('div');toast.className='toast toast--success process-action-toast';toast.textContent='İşlem onaylandı, kaydediliyor...';document.body.append(toast);setTimeout(()=>toast.remove(),2500);
  form.requestSubmit ? form.requestSubmit() : form.submit();
 });
 function syncProxy(proxy,target){if(!proxy||!target)return;const inner=proxy.firstElementChild;if(!inner)return;const table=target.querySelector('table');const set=()=>{inner.style.width=(table?.scrollWidth||target.scrollWidth||target.clientWidth)+'px'};set();new ResizeObserver(set).observe(target);if(table)new ResizeObserver(set).observe(table);let lock=false;proxy.addEventListener('scroll',()=>{if(lock)return;lock=true;target.scrollLeft=proxy.scrollLeft;lock=false});target.addEventListener('scroll',()=>{if(lock)return;lock=true;proxy.scrollLeft=target.scrollLeft;lock=false})}
 document.querySelectorAll('[data-scroll-proxy]').forEach(proxy=>syncProxy(proxy,document.querySelector(`[data-scroll-target="${proxy.dataset.scrollProxy}"]`)));
})();

// crmV13 — contextual confirmations: only save/approve/delete-style actions, with action-specific titles.
(()=>{
 const $=(s,r=document)=>r.querySelector(s);
 const lang=(document.documentElement.lang||'tr').toLowerCase().startsWith('en')?'en':'tr';
 const L=lang==='en'?{
  cancel:'Cancel',cancelTitle:'Cancel import',cancelMsg:'Discard all unsaved changes and leave this import preview?',cancelOk:'Yes, discard',saveTitle:'Save confirmation',saveMsg:'Save the entered information?',saveOk:'Save',
  deleteTitle:'Delete confirmation',deleteMsg:'This record will be deleted. This action may not be reversible.',deleteOk:'Delete',
  archiveTitle:'Archive confirmation',archiveMsg:'Move this record to the archive?',archiveOk:'Archive',
  approveTitle:'Approval confirmation',approveMsg:'Approve this record?',approveOk:'Approve',
  rejectTitle:'Rejection confirmation',rejectMsg:'Reject this record?',rejectOk:'Reject',
  restoreTitle:'Restore confirmation',restoreMsg:'Restore the selected record?',restoreOk:'Restore',
  importTitle:'Import confirmation',importMsg:'Save the selected records to the system?',importOk:'Import',
  updateTitle:'Update confirmation',updateMsg:'Apply and save the changes?',updateOk:'Update'
 }:{
  cancel:'Vazgeç',cancelTitle:'Aktarımdan Vazgeçme Onayı',cancelMsg:'Kaydedilmemiş tüm düzenlemeler silinecek ve hiçbir kayıt oluşturulmayacaktır. Vazgeçilsin mi?',cancelOk:'Evet, Vazgeç',saveTitle:'Kaydetme Onayı',saveMsg:'Girilen bilgiler kaydedilsin mi?',saveOk:'Kaydet',
  deleteTitle:'Silme Onayı',deleteMsg:'Bu kayıt silinecektir. Bu işlem geri alınamayabilir.',deleteOk:'Sil',
  archiveTitle:'Arşivleme Onayı',archiveMsg:'Bu kayıt arşive taşınsın mı?',archiveOk:'Arşivle',
  approveTitle:'Onaylama Onayı',approveMsg:'Bu kayıt onaylansın mı?',approveOk:'Onayla',
  rejectTitle:'Reddetme Onayı',rejectMsg:'Bu kayıt reddedilsin mi?',rejectOk:'Reddet',
  restoreTitle:'Geri Yükleme Onayı',restoreMsg:'Seçilen kayıt geri yüklensin mi?',restoreOk:'Geri Yükle',
  importTitle:'Aktarım Onayı',importMsg:'Seçilen kayıtlar sisteme kaydedilsin mi?',importOk:'İçe Aktar',
  updateTitle:'Güncelleme Onayı',updateMsg:'Yapılan değişiklikler uygulanıp kaydedilsin mi?',updateOk:'Güncelle'
 };
 let modal=null;
 const normalize=v=>String(v||'').toLocaleLowerCase(lang==='en'?'en-US':'tr-TR');
 const actionText=(form,submitter)=>normalize([
  form?.getAttribute('action'), form?.dataset?.confirmKind, form?.dataset?.confirmTitle,
  submitter?.name, submitter?.value, submitter?.textContent, submitter?.getAttribute?.('aria-label'), submitter?.title
 ].filter(Boolean).join(' '));
 const excluded=(form,submitter)=>{
  const a=actionText(form,submitter);
  return form?.dataset?.noConfirm!==undefined || /search|filter|preview|print|download|export|test|login|logout|health|lookup|autocomplete|calculate|hesapla|ara|filtre|ön izle|yazdır|indir/.test(a);
 };
 const classify=(form,submitter)=>{
  if(!form||String(form.method||'get').toLowerCase()==='get'||excluded(form,submitter))return null;
  const a=actionText(form,submitter);
  if(form.dataset.confirmKind)return form.dataset.confirmKind;
  if(/cancel|discard|vazgeç|vazgec|iptal et ve çık|iptal et ve cik/.test(a))return 'cancel';
  if(/delete|remove|trash|destroy|sil|kaldır/.test(a))return 'delete';
  if(/archive|arşiv/.test(a))return 'archive';
  if(/reject|decline|reddet/.test(a))return 'reject';
  if(/approve|accept|confirm|onayla|kabul/.test(a))return 'approve';
  if(/restore|geri yükle/.test(a))return 'restore';
  if(/import|aktar|yükle/.test(a))return 'import';
  if(/update|edit|status|güncelle|düzenle/.test(a))return 'update';
  if(/save|create|new|kaydet|oluştur|ekle/.test(a))return 'save';
  return null;
 };
 const defaults=kind=>({
  cancel:{title:L.cancelTitle,message:L.cancelMsg,ok:L.cancelOk,danger:true},
  save:{title:L.saveTitle,message:L.saveMsg,ok:L.saveOk,danger:false},
  delete:{title:L.deleteTitle,message:L.deleteMsg,ok:L.deleteOk,danger:true},
  archive:{title:L.archiveTitle,message:L.archiveMsg,ok:L.archiveOk,danger:true},
  approve:{title:L.approveTitle,message:L.approveMsg,ok:L.approveOk,danger:false},
  reject:{title:L.rejectTitle,message:L.rejectMsg,ok:L.rejectOk,danger:true},
  restore:{title:L.restoreTitle,message:L.restoreMsg,ok:L.restoreOk,danger:false},
  import:{title:L.importTitle,message:L.importMsg,ok:L.importOk,danger:false},
  update:{title:L.updateTitle,message:L.updateMsg,ok:L.updateOk,danger:false}
 }[kind]||null);
 const ensure=()=>{
  if(modal)return modal;
  modal=document.createElement('div');
  modal.className='confirm-modal';
  modal.innerHTML='<div class="confirm-card" role="dialog" aria-modal="true"><div class="confirm-ico">⚠️</div><h2></h2><p></p><div class="confirm-actions"><button type="button" class="btn btn--soft" data-confirm-cancel></button><button type="button" class="btn btn--primary" data-confirm-ok></button></div></div>';
  document.body.appendChild(modal);return modal;
 };
 const ask=opts=>new Promise(resolve=>{
  const m=ensure(),card=$('.confirm-card',m),title=$('h2',m),msg=$('p',m),cancel=$('[data-confirm-cancel]',m),ok=$('[data-confirm-ok]',m);
  title.textContent=opts.title;msg.textContent=opts.message;cancel.textContent=L.cancel;ok.textContent=opts.ok;
  ok.className='btn '+(opts.danger?'btn--danger':'btn--primary');
  m.classList.add('is-open');
  const done=v=>{m.classList.remove('is-open');m.onclick=null;document.removeEventListener('keydown',key);resolve(v)};
  const key=e=>{if(e.key==='Escape')done(false);if(e.key==='Enter'&&document.activeElement===ok)done(true)};
  document.addEventListener('keydown',key);
  m.onclick=e=>{if(e.target===m||e.target.closest('[data-confirm-cancel]'))done(false);else if(e.target.closest('[data-confirm-ok]'))done(true)};
  setTimeout(()=>ok.focus(),0);
 });
 const optionsFor=(form,submitter,kind)=>{
  const d=defaults(kind);
  return {
   title:submitter?.dataset?.confirmTitle||form.dataset.confirmTitle||d.title,
   message:submitter?.dataset?.confirmMessage||submitter?.dataset?.confirm||form.dataset.confirmMessage||form.dataset.confirm||d.message,
   ok:submitter?.dataset?.confirmOk||form.dataset.confirmOk||d.ok,
   danger:submitter?.dataset?.confirmDanger==='1'||form.dataset.confirmDanger==='1'||d.danger
  };
 };
 document.addEventListener('submit',async e=>{
  const form=e.target.closest('form');if(!form||form.dataset.confirmed==='1'||form.dataset.noConfirm!==undefined)return;
  if(form.matches('[data-confirm-submit],[data-process-confirm]'))return; // handled by process-specific confirmation
  const submitter=e.submitter||form._lastSubmitter||null;
  const kind=classify(form,submitter);
  if(!kind&&!form.dataset.confirm)return;
  e.preventDefault();
  const yes=await ask(optionsFor(form,submitter,kind||'save'));
  if(!yes)return;
  form.dataset.confirmed='1';
  try{form.requestSubmit?form.requestSubmit(submitter||undefined):form.submit()}finally{setTimeout(()=>delete form.dataset.confirmed,1500)}
 },true);
 document.addEventListener('click',e=>{
  const b=e.target.closest('button[type="submit"],input[type="submit"]');if(b?.form)b.form._lastSubmitter=b;
 },true);
 document.addEventListener('click',async e=>{
  const btn=e.target.closest('a[data-confirm],button[data-confirm]:not([type="submit"])');if(!btn||btn.dataset.confirmed==='1')return;
  const fake={method:'post',dataset:btn.dataset,getAttribute:n=>n==='action'?btn.getAttribute('href')||'':null};
  const kind=classify(fake,btn)||btn.dataset.confirmKind||'update';e.preventDefault();
  if(await ask(optionsFor(fake,btn,kind))){btn.dataset.confirmed='1';if(btn.tagName==='A')location.href=btn.href;else btn.click();setTimeout(()=>delete btn.dataset.confirmed,1000)}
 });
 document.addEventListener('click',e=>{const a=e.target.closest('a.js-back,[data-history-back]');if(!a)return;const ref=document.referrer;if(ref&&new URL(ref,location.href).origin===location.origin){e.preventDefault();history.back();return}const fallback=a.dataset.historyFallback;if(fallback&&fallback.startsWith('/')){e.preventDefault();location.href=fallback}});
})();

/* v3.3.57 — universal open/close cards, sidebar stability, dashboard drag/drop */
(()=>{
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const tr=document.documentElement.lang!=='en';
 const text={toggle:tr?'Aç / kapa':'Open / close', drag:tr?'Sürükleyerek yerini değiştirebilirsiniz.':'Drag to reorder.'};
 // Sidebar submenu links must not accidentally collapse their tree before navigation.
 $$('#sidebar details a').forEach(a=>a.addEventListener('click',e=>e.stopPropagation(),{capture:true}));
 function titleFor(card){return card.querySelector(':scope > .card-head')||card.querySelector(':scope > header')||card.querySelector(':scope > h2')?.parentElement||card.querySelector(':scope > h2')||card.querySelector(':scope > .theme-panel-title')||card.querySelector(':scope > .sidebar-manager-head')}
 function makeCardCollapsible(scope=document){
  $$('.card, .live-settings-card, .theme-card, .setting-section, .quote-panel',scope).forEach((card,i)=>{
    if(card.dataset.noCollapse||card.dataset.collapseReady57||card.closest('[data-dashboard-widget-zone]')||card.matches('[data-dashboard-widget]')||card.closest('[data-dashboard-widget]')||card.closest('.preview-modal')||card.closest('.modal .modal-card')&& !card.classList.contains('theme-card'))return;
    const head=titleFor(card); if(!head||head.querySelector('.card-collapse-toggle'))return;
    card.dataset.collapseReady57='1';card.classList.add('js-collapse-card');
    const key=location.pathname+'::'+(card.dataset.cardKey||card.id||head.textContent.trim().slice(0,60)||i);
    const btn=document.createElement('button');btn.type='button';btn.className='card-collapse-toggle';btn.title=text.toggle;btn.setAttribute('aria-label',text.toggle);btn.textContent='⌄';
    head.appendChild(btn);
    if(localStorage.getItem('crm-card-collapsed:'+key)==='1'){card.classList.add('is-collapsed');btn.textContent='›'}
    btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();card.classList.toggle('is-collapsed');const off=card.classList.contains('is-collapsed');btn.textContent=off?'›':'⌄';localStorage.setItem('crm-card-collapsed:'+key,off?'1':'0')});
  });
 }
 function makeZonesCollapsible(){
  $$('.metric-grid.dashboard-sortable,.decision-grid.dashboard-sortable').forEach((zone,i)=>{
    if(zone.dataset.zoneReady57)return; zone.dataset.zoneReady57='1';
    const head=document.createElement('div');head.className='zone-head';head.innerHTML=`<h2>${zone.classList.contains('metric-grid')?'📊 CRM / ERP Kartları':'📈 İşlem Özeti'}</h2>`;
    const btn=document.createElement('button');btn.type='button';btn.className='card-collapse-toggle';btn.title=text.toggle;btn.textContent='⌄';head.appendChild(btn);
    zone.parentNode.insertBefore(head,zone);zone.classList.add('collapsible-zone');
    const key=location.pathname+'::zone::'+(zone.dataset.sortableZone||i);
    if(localStorage.getItem('crm-zone-collapsed:'+key)==='1'){zone.classList.add('is-collapsed');btn.textContent='›'}
    btn.addEventListener('click',()=>{zone.classList.toggle('is-collapsed');const off=zone.classList.contains('is-collapsed');btn.textContent=off?'›':'⌄';localStorage.setItem('crm-zone-collapsed:'+key,off?'1':'0')});
  });
 }
 function makeDashboardSortable(){
  $$('.dashboard-sortable').forEach(zone=>{
    if(zone.dataset.dragReady57)return; zone.dataset.dragReady57='1';
    const zkey='crm-dashboard-order:'+location.pathname+'::'+(zone.dataset.sortableZone||'zone');
    [...zone.children].forEach((el,i)=>{ if(!el.dataset.cardKey) el.dataset.cardKey=el.getAttribute('href')||el.querySelector('h2,small,b')?.textContent?.trim()?.slice(0,50)||('card-'+i); el.draggable=true; el.title=el.title||text.drag; });
    const apply=()=>{const order=(localStorage.getItem(zkey)||'').split('|').filter(Boolean); if(!order.length)return; order.map(k=>[k,[...zone.children].find(x=>x.dataset.cardKey===k)]).filter(x=>x[1]).forEach(([,el])=>zone.appendChild(el));};
    apply(); let dragged=null;
    zone.addEventListener('dragstart',e=>{dragged=e.target.closest('[data-card-key]'); if(!dragged)return; dragged.classList.add('is-dragging'); e.dataTransfer.effectAllowed='move';});
    zone.addEventListener('dragend',()=>{dragged?.classList.remove('is-dragging');$$('.drag-over',zone).forEach(x=>x.classList.remove('drag-over'));dragged=null;localStorage.setItem(zkey,[...zone.children].map(x=>x.dataset.cardKey).join('|'));});
    zone.addEventListener('dragover',e=>{if(!dragged)return;e.preventDefault();const over=e.target.closest('[data-card-key]');if(!over||over===dragged)return;over.classList.add('drag-over');const r=over.getBoundingClientRect();const before=(e.clientY-r.top)<r.height/2;zone.insertBefore(dragged,before?over:over.nextSibling);});
    zone.addEventListener('dragleave',e=>e.target.closest('[data-card-key]')?.classList.remove('drag-over'));
  });
 }
 function init(){makeCardCollapsible();makeZonesCollapsible();makeDashboardSortable();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 setTimeout(init,600);
})();


// v3.3.61 — final UI consistency: compact toast, stable dashboard shortcuts, no accidental dashboard open, live scale/theme.
(()=>{
  // v3.3.62 yöneticisi kullanılan sayfada eski motor aynı kısayolları yeniden
  // oluşturmamalı; aksi halde × ile kaldırılan öğe 900 ms sonra geri geliyordu.
  if(document.querySelector('[data-dashboard-shortcut-add-v62]'))return;
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const lang=(document.documentElement.lang||'tr').toLowerCase();
  const isTR=!lang.startsWith('en');
  const L=isTR?{
    shortcuts:'Ana sayfaya eklenecek kısayolu seç',active:'Ana sayfada görünenler',available:'Eklenebilir kısayollar',added:'Eklendi',removed:'Kaldırıldı',saved:'Kaydedildi',close:'Kapat'
  }:{shortcuts:'Select dashboard shortcuts',active:'Visible on dashboard',available:'Available shortcuts',added:'Added',removed:'Removed',saved:'Saved',close:'Close'};
  const shortcuts=[
    ['customers','👥','Müşteriler','/customers'],['customers-new','➕','Yeni Müşteri','/customers/new'],['products','📦','Ürünler','/products'],['products-new','➕','Yeni Ürün veya Hizmet','/products/new'],['quotes','📄','Proforma Listesi','/quotes'],['quote-new','➕','Yeni Proforma','/quotes/new'],['sent','📨','Gönderilen Proformalar','/quotes/sent'],['archives','🗃️','Arşivlenen Proformalar','/quotes/archives'],['templates','🎨','Proforma Şablonları','/templates'],['processes','🔄','Teklif ve Sipariş Süreçleri','/quotes/processes'],['invoices','🧾','Fatura Entegrasyonu','/invoices'],['integrations','✉️','E-posta / SMTP Entegrasyonu','/integrations'],['excel','📊','Excel Paneli','/excel'],['live','💬','Canlı Ziyaretçiler','/live'],['live-chats','📥','Sohbetler','/live/chats'],['live-settings','⚙️','Canlı Destek Ayarları','/live/settings'],['settings','⚙️','Ayarlar','/settings'],['theme','🎨','Tema ve Görünüm','/settings/theme'],['backups','💾','Yedekleme','/backups'],['audit','🧾','İşlem Kayıtları','/audit'],['users','🛡️','Kullanıcılar','/users']
  ];
  const hiddenKey='crm-dashboard-shortcut-hidden-v361';
  const customKey='crm-dashboard-shortcut-custom-v361';
  const oldHidden=['crm-dashboard-shortcut-hidden-v359','crm-dashboard-shortcut-hidden-v360'];
  const oldCustom=['crm-dashboard-shortcut-custom-v359','crm-dashboard-shortcut-custom-v360'];
  const get=(key,def=[])=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(def))}catch{return def}};
  const set=(key,val)=>localStorage.setItem(key,JSON.stringify(val));
  function migrate(){
    if(!localStorage.getItem(hiddenKey)){const h=[...new Set(oldHidden.flatMap(k=>get(k,[])))];set(hiddenKey,h)}
    if(!localStorage.getItem(customKey)){const c=[...new Set(oldCustom.flatMap(k=>get(k,[])))];set(customKey,c)}
  }
  function miniToast(message,type='success'){
    document.querySelectorAll('.toast,.floating-toast,.process-action-toast,.toast-mini-v60,.crm-toast-v361').forEach(x=>x.remove());
    const el=document.createElement('div');
    el.className='crm-toast-v361 '+(type==='error'?'is-error':'is-success');
    el.innerHTML='<span>'+(type==='error'?'⚠️':'✓')+'</span><b></b>';
    el.querySelector('b').textContent=message||L.saved;
    document.body.append(el);
    setTimeout(()=>el.classList.add('is-out'),1650);
    setTimeout(()=>el.remove(),2050);
  }
  window.CRM_MINI_TOAST=miniToast;
  function zone(){return $('[data-shortcut-zone]')}
  function renderShortcuts(){
    const z=zone(); if(!z) return;
    migrate();
    const hidden=new Set(get(hiddenKey,[]));
    const custom=get(customKey,[]);
    const baseKeys=$$('a[data-shortcut-key]',z).map(a=>a.dataset.shortcutKey);
    [...new Set([...baseKeys,...custom])].forEach(k=>{
      const def=shortcuts.find(x=>x[0]===k); if(!def) return;
      let a=z.querySelector(`a[data-shortcut-key="${CSS.escape(k)}"]`);
      if(!a){a=document.createElement('a');a.dataset.shortcutKey=k;a.href=def[3];z.append(a)}
      a.innerHTML=`<span aria-hidden="true">${def[1]}</span><b>${def[2]}</b>`;
      a.hidden=hidden.has(k);
    });
  }
  function openShortcuts(){
    document.querySelectorAll('#dashboardShortcutModal,#dashboardShortcutModal59,#dashboardShortcutModal60,#dashboardShortcutModal61').forEach(x=>x.remove());
    const z=zone(); if(!z) return;
    migrate();
    const hidden=new Set(get(hiddenKey,[]));
    const visible=new Set($$('a[data-shortcut-key]',z).filter(a=>!a.hidden).map(a=>a.dataset.shortcutKey));
    const active=shortcuts.filter(x=>visible.has(x[0]));
    const available=shortcuts.filter(x=>!visible.has(x[0]) || hidden.has(x[0]));
    const row=(x,on)=>`<button type="button" class="shortcut-choice-v361" data-${on?'remove':'add'}="${x[0]}"><i>${x[1]}</i><span><b>${x[2]}</b><small>${x[3]}</small></span><em>${on?'×':'+'}</em></button>`;
    const modal=document.createElement('div');
    modal.id='dashboardShortcutModal61';
    modal.className='modal is-open shortcut-modal-shell-v361';
    modal.innerHTML=`<div class="modal-card shortcut-modal-v361"><button type="button" class="modal-close" data-close aria-label="${L.close}">×</button><header><h2>＋ ${L.shortcuts}</h2><p>Eklenenler ana sayfada kalır; kaldırılanlar tekrar eklenebilir listeye döner.</p></header><div class="shortcut-board-v361"><section><h3>✅ ${L.active}</h3><div>${active.map(x=>row(x,true)).join('')||'<p class="empty">-</p>'}</div></section><section><h3>➕ ${L.available}</h3><div>${available.map(x=>row(x,false)).join('')||'<p class="empty">-</p>'}</div></section></div></div>`;
    document.body.append(modal);
  }
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-dashboard-shortcut-add]');
    if(open){e.preventDefault();e.stopPropagation();openShortcuts();return;}
    const modal=e.target.closest('#dashboardShortcutModal61');
    if(e.target.matches('#dashboardShortcutModal61') || e.target.closest('#dashboardShortcutModal61 [data-close]')){e.preventDefault();e.stopPropagation();$('#dashboardShortcutModal61')?.remove();return;}
    const add=e.target.closest('#dashboardShortcutModal61 [data-add]');
    if(add){e.preventDefault();e.stopPropagation();let h=get(hiddenKey,[]).filter(x=>x!==add.dataset.add);let c=get(customKey,[]);if(!c.includes(add.dataset.add))c.push(add.dataset.add);set(hiddenKey,h);set(customKey,c);renderShortcuts();openShortcuts();miniToast(L.added);return;}
    const rem=e.target.closest('#dashboardShortcutModal61 [data-remove]');
    if(rem){e.preventDefault();e.stopPropagation();let h=get(hiddenKey,[]);if(!h.includes(rem.dataset.remove))h.push(rem.dataset.remove);set(hiddenKey,h);renderShortcuts();openShortcuts();miniToast(L.removed);return;}
  },true);
  // No dashboard card move/resize anymore; prevent old injected handlers/tools from breaking layout.
  function cleanDashboard(){
    document.body.classList.remove('dashboard-editing');
    document.querySelectorAll('.dashboard-card-tools,.dashboard-card-tools--v60,#dashboardShortcutModal,#dashboardShortcutModal59,#dashboardShortcutModal60,#dashboardShortcutModal61').forEach(x=>x.remove());
    document.querySelectorAll('[data-card-key]').forEach(el=>{el.draggable=false;el.classList.remove('card-drag-armed','dashboard-card-wide','dashboard-card-compact')});
    renderShortcuts();
  }
  /* The outer shell must never inherit the user's panel zoom. The canonical
     v3.3.79 engine below owns all panel variables; this legacy dashboard hook
     only preserves the fixed shell contract. */
  function syncScale(){
    const root=document.documentElement;
    root.style.setProperty('--ui-scale','1');
    root.style.setProperty('--ui-font-scale','1');
    root.style.setProperty('--ui-design-scale','1');
    root.style.setProperty('--ui-space-scale','1');
    root.style.setProperty('--ui-font-real','14px');
    root.style.setProperty('--ui-control-h','36px');
  }
  window.addEventListener('crm:ui-scale',syncScale);
  function applySystemTheme(){
    let vars={};try{vars=JSON.parse(localStorage.getItem('crm-system-theme-vars-v361')||localStorage.getItem('crm-system-theme-vars-v359')||'{}')}catch{}
    Object.entries(vars).forEach(([k,v])=>{if(k.startsWith('--'))document.documentElement.style.setProperty(k,v)});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{syncScale();applySystemTheme();cleanDashboard()}):(syncScale(),applySystemTheme(),cleanDashboard());
  setTimeout(cleanDashboard,250);setTimeout(cleanDashboard,900);
})();

// v3.5.7 — tek kısayol motoru: masaüstü/mobil ortak, veritabanında kalıcı.
(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const manager=$('[data-dashboard-shortcut-add-v62]'),shortcutZone=$('[data-shortcut-zone]');if(!manager||!shortcutZone)return;
  const tr=!(document.documentElement.lang||'tr').toLowerCase().startsWith('en');
  const T=tr?{title:'Ana sayfaya eklenecek kısayolu seç',active:'Ana sayfada olanlar',available:'Eklenebilir kısayollar',added:'Eklendi ve tüm cihazlara kaydedildi',removed:'Ana sayfadan kaldırıldı',saveError:'Kısayol tercihi sunucuya kaydedilemedi.',close:'Kapat'}:{title:'Select shortcuts for dashboard',active:'Visible shortcuts',available:'Available shortcuts',added:'Added and saved for all devices',removed:'Removed from dashboard',saveError:'Shortcut preference could not be saved.',close:'Close'};
  const presets=[['home','🏠','Ana Sayfa','/'],['customers','👥','Müşteriler','/customers'],['customers-new','➕','Yeni Müşteri','/customers/new'],['products','📦','Ürünler','/products'],['products-new','➕','Yeni Ürün veya Hizmet','/products/new'],['quotes','📄','Proforma Listesi','/quotes'],['quote-new','➕','Yeni Proforma','/quotes/new'],['sent','📨','Gönderilen Proformalar','/quotes/sent'],['archives','🗃️','Arşivlenen Proformalar','/quotes/archives'],['templates','🎨','Proforma Şablonları','/templates'],['processes','🔄','Teklif ve Sipariş Süreçleri','/quotes/processes'],['invoices','🧾','Fatura Entegrasyonu','/invoices'],['integrations','✉️','E-posta / SMTP','/integrations'],['excel','📊','Excel Paneli','/excel'],['live','💬','Canlı Ziyaretçiler','/live'],['live-chats','📥','Sohbetler','/live/chats'],['live-settings','⚙️','Canlı Destek Ayarları','/live/settings'],['settings','⚙️','Ayarlar','/settings'],['theme','🎨','Tema ve Görünüm','/settings/theme'],['backups','💾','Yedekleme','/backups'],['audit','🧾','İşlem Kayıtları','/audit'],['users','🛡️','Kullanıcılar','/users']];
  const items=[],groupIcons={home:'🏠',profile:'🏢',customers:'👥',products:'📦',quotes:'📄',process:'🔄',support:'💬',settings:'⚙️',admin:'🛡️'};
  const hiddenKey='crm-dashboard-shortcut-hidden-v62',customKey='crm-dashboard-shortcut-custom-v62';
  const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}},write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  function syncSidebarItems(){
    $$('#sidebar .menu a[href]').forEach(link=>{
      const href=String(link.getAttribute('href')||'').trim();if(!href.startsWith('/')||href.startsWith('//'))return;
      const label=String(link.textContent||link.title||href).replace(/\s+/g,' ').trim()||href;
      const iconKey=link.querySelector('[data-icon]')?.dataset.icon||link.closest('details')?.querySelector('summary [data-icon]')?.dataset.icon||'home';
      const preset=presets.find(x=>x[3]===href),key=preset?.[0]||`sidebar:${href}`,icon=preset?.[1]||groupIcons[iconKey]||'🔗',existing=items.find(x=>x[0]===key);
      if(existing){existing[1]=icon;existing[2]=label;existing[3]=href}else items.push([key,icon,label,href]);
    });
  }
  syncSidebarItems();
  const allowed=keys=>[...new Set((Array.isArray(keys)?keys:[]).filter(key=>items.some(item=>item[0]===key)))];
  const initialKeys=$$('a[data-shortcut-key]',shortcutZone).map(a=>a.dataset.shortcutKey);
  const legacyHidden=new Set(read(hiddenKey,[])),legacyCustom=read(customKey,[]);
  let visibleKeys=allowed([...initialKeys,...legacyCustom].filter(key=>!legacyHidden.has(key))),serverSignature='',pendingSaves=0,saveChain=Promise.resolve();
  function rememberLocal(){const active=new Set(visibleKeys);write(hiddenKey,items.map(x=>x[0]).filter(key=>!active.has(key)));write(customKey,visibleKeys)}
  function render(){
    syncSidebarItems();visibleKeys=allowed(visibleKeys);shortcutZone.replaceChildren();
    visibleKeys.forEach(key=>{const def=items.find(x=>x[0]===key);if(!def)return;const a=document.createElement('a');a.dataset.shortcutKey=key;a.href=def[3];const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=def[1];const label=document.createElement('b');label.textContent=def[2];a.append(icon,label);shortcutZone.append(a)});
    rememberLocal();
  }
  function toast(message,type='success'){
    $$('.toast,.crm-toast-v361,.crm-toast-v62,.floating-toast,.process-action-toast').forEach(x=>x.remove());const el=document.createElement('div');el.className='crm-toast-v62 '+(type==='error'?'is-error':'is-success');el.innerHTML='<span></span><b></b>';el.querySelector('span').textContent=type==='error'?'⚠️':'✓';el.querySelector('b').textContent=message;document.body.append(el);setTimeout(()=>el.style.opacity='0',1800);setTimeout(()=>el.remove(),2200);
  }
  window.CRM_MINI_TOAST=toast;
  const signature=keys=>JSON.stringify(allowed(keys));
  function openModal(){
    $$('#dashboardShortcutModal,#dashboardShortcutModal59,#dashboardShortcutModal60,#dashboardShortcutModal61,#dashboardShortcutModal62').forEach(x=>x.remove());
    const activeSet=new Set(visibleKeys),active=items.filter(x=>activeSet.has(x[0])),available=items.filter(x=>!activeSet.has(x[0]));
    const row=(item,on)=>{const button=document.createElement('button');button.type='button';button.className='shortcut-choice-v62';button.dataset[on?'remove':'add']=item[0];const icon=document.createElement('i');icon.textContent=item[1];const copy=document.createElement('span'),title=document.createElement('b'),url=document.createElement('small'),action=document.createElement('em');title.textContent=item[2];url.textContent=item[3];action.textContent=on?'×':'+';copy.append(title,url);button.append(icon,copy,action);return button};
    const modal=document.createElement('div');modal.id='dashboardShortcutModal62';modal.className='modal is-open shortcut-modal-shell-v62';const card=document.createElement('div');card.className='modal-card shortcut-modal-v62';const header=document.createElement('header'),headCopy=document.createElement('div'),h2=document.createElement('h2'),p=document.createElement('p'),close=document.createElement('button');h2.textContent=`＋ ${T.title}`;p.className='muted';p.textContent=tr?'Soldaki × ana sayfadan kaldırır ve sağ listeye taşır. Sağdaki + yeniden ekler.':'× removes from the dashboard; + adds it again.';close.type='button';close.className='modal-close';close.dataset.close='1';close.setAttribute('aria-label',T.close);close.textContent='×';headCopy.append(h2,p);header.append(headCopy,close);
    const board=document.createElement('div');board.className='shortcut-board-v62';for(const [titleText,list,on] of [[`✅ ${T.active}`,active,true],[`➕ ${T.available}`,available,false]]){const section=document.createElement('section'),h3=document.createElement('h3'),body=document.createElement('div');h3.textContent=titleText;if(list.length)list.forEach(item=>body.append(row(item,on)));else{const empty=document.createElement('p');empty.className='empty';empty.textContent='—';body.append(empty)}section.append(h3,body);board.append(section)}card.append(header,board);modal.append(card);document.body.append(modal);
  }
  function postSnapshot(snapshot){
    pendingSaves++;
    return fetch('/dashboard/shortcuts',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-Token':document.querySelector('meta[name="csrf-token"]')?.content||''},body:JSON.stringify({keys:snapshot})}).then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.message||'save_failed');serverSignature=signature(data.keys);return data}).finally(()=>{pendingSaves--});
  }
  function persist(){const snapshot=[...visibleKeys];saveChain=saveChain.then(()=>postSnapshot(snapshot)).catch(()=>toast(T.saveError,'error'));return saveChain}
  function applyServer(keys){const next=allowed(keys),nextSignature=signature(next);if(nextSignature===signature(visibleKeys)){serverSignature=nextSignature;return}visibleKeys=next;serverSignature=nextSignature;render();if($('#dashboardShortcutModal62'))openModal()}
  async function syncFromServer(){
    if(pendingSaves)return;
    try{const response=await fetch('/dashboard/shortcuts',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});const data=await response.json();if(response.ok&&data.ok&&data.configured&&signature(data.keys)!==serverSignature)applyServer(data.keys)}catch{}
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-dashboard-shortcut-add-v62]')){event.preventDefault();event.stopPropagation();openModal();return}
    if(event.target.matches('#dashboardShortcutModal62')||event.target.closest('#dashboardShortcutModal62 [data-close]')){event.preventDefault();event.stopPropagation();$('#dashboardShortcutModal62')?.remove();return}
    const add=event.target.closest('#dashboardShortcutModal62 [data-add]');if(add){event.preventDefault();event.stopPropagation();if(!visibleKeys.includes(add.dataset.add))visibleKeys.push(add.dataset.add);render();openModal();persist();toast(T.added);return}
    const remove=event.target.closest('#dashboardShortcutModal62 [data-remove]');if(remove){event.preventDefault();event.stopPropagation();visibleKeys=visibleKeys.filter(key=>key!==remove.dataset.remove);render();openModal();persist();toast(T.removed);return}
  },true);
  render();syncFromServer();setInterval(()=>{if(document.visibilityState==='visible')syncFromServer()},4000);window.addEventListener('focus',syncFromServer);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncFromServer()});
})();

// v3.3.63 dashboard engine disabled in v3.3.76 to prevent reload flicker.


// v3.3.65 — final stabilizer: icon-only action labels, dashboard resize reset,
// compact shortcut modal, panel-only zoom, and no accidental old dashboard state.
(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const tr=!(document.documentElement.lang||'tr').toLowerCase().startsWith('en');
  const T=tr?{saved:'Kaydedildi',reset:'Düzen sıfırlandı',move:'Taşı',resize:'Boyutlandır',preview:'Ön İzleme',edit:'Düzenle',open:'Aç',pdf:'PDF',archive:'Arşivle',delete:'Sil',copy:'Kopyala'}:{saved:'Saved',reset:'Layout reset',move:'Move',resize:'Resize',preview:'Preview',edit:'Edit',open:'Open',pdf:'PDF',archive:'Archive',delete:'Delete',copy:'Copy'};
  function toast(msg,type='success'){
    if(window.CRM_MINI_TOAST) return window.CRM_MINI_TOAST(msg,type);
    const el=document.createElement('div'); el.className='crm-toast-v65 '+(type==='error'?'is-error':'is-success'); el.textContent=msg;
    Object.assign(el.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:'999999',padding:'9px 12px',borderRadius:'12px',fontWeight:'850',fontSize:'12px',background:type==='error'?'#fff1f2':'#ecfdf3',color:type==='error'?'#b42318':'#067647',border:'1px solid '+(type==='error'?'#fecdd3':'#a7f3d0'),boxShadow:'0 12px 30px rgba(15,23,42,.16)'});
    document.body.append(el); setTimeout(()=>el.remove(),1800);
  }
  function actionLabel(el){
    const txt=(el.getAttribute('data-label')||el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').replace(/^[◉✎↗⎙🗑＋+\s]+/,'').trim();
    const lower=txt.toLowerCase();
    let label=txt;
    if(!label){
      if(el.classList.contains('is-preview')) label=T.preview;
      else if(el.classList.contains('is-edit')) label=T.edit;
      else if(el.classList.contains('is-open')) label=T.open;
      else if(el.classList.contains('is-print')) label=T.pdf;
      else if(el.classList.contains('is-delete')||el.classList.contains('is-danger')) label=T.archive;
    }
    if(lower.includes('ön')||lower.includes('preview')) label=T.preview;
    if(lower.includes('düzen')||lower.includes('edit')) label=T.edit;
    if(lower==='aç'||lower.includes('open')) label=T.open;
    if(lower.includes('pdf')||lower.includes('print')) label=T.pdf;
    if(lower.includes('arşiv')||lower.includes('archive')) label=T.archive;
    if(lower.includes('sil')||lower.includes('delete')) label=T.delete;
    el.dataset.label=label||txt||'İşlem';
    el.title=el.dataset.label;
    if(!el.querySelector('span')){
      const icon=document.createElement('span'); icon.setAttribute('aria-hidden','true');
      icon.textContent=el.classList.contains('is-edit')?'✎':el.classList.contains('is-open')?'↗':el.classList.contains('is-print')?'⎙':(el.classList.contains('is-delete')||el.classList.contains('is-danger'))?'🗑':'◉';
      el.prepend(icon);
    }
  }
  function normalizeActions(){
    $$('.table-action').forEach(actionLabel);
    $$('.table-action.is-preview span').forEach(s=>{if(!s.textContent.trim())s.textContent='◉'});
  }
  function resetBadDashboardSizes(){
    // Eski sürümlerin çok küçük px ölçü kaydetmesi ana sayfayı bozuyordu.
    try{localStorage.removeItem('crm-dashboard-widget-size-v63');}catch(e){}
    $$('.dashboard-widget-v63').forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.width<260 || r.height<120){el.style.width='';el.style.height='';}
      // Eski inline ölçüler yerine kartların doğal ızgara ölçüsüne dön.
      // Eşikler serbest yerleşim motorunun kendi alt sınırlarının ALTINDA
      // olmalıdır. Önceden 300/170 idi; normalize() ise genişliği en az 280,
      // yüksekliği en az 160 piksele sabitliyor. Dar bir sütuna düşen kartın
      // 280 piksellik genişliği "bozuk eski değer" sanılıp siliniyor, kart
      // CSS'ten %100 genişlik alıyor ama left değeri yerinde kalıyordu:
      // 1380 pikselin üstünde "Canlı Proforma Takibi" ve "Son Eklenen
      // Müşteriler" kartları ekranın dışına taşıp kesiliyordu.
      if(el.style.width && parseFloat(el.style.width)<260) el.style.width='';
      if(el.style.height && parseFloat(el.style.height)<160) el.style.height='';
    });
  }
  function dashboardDragFix(){
    const zone=$('[data-dashboard-widget-zone]'); if(!zone || zone.dataset.ready65) return; zone.dataset.ready65='1';
    // Eski handlerlar kalsın ama sadece handle ile sürüklemeye izin ver.
    $$('.dashboard-widget-v63',zone).forEach((el,i)=>{
      const key=el.dataset.dashboardWidget||el.dataset.cardKey||('card-'+i); el.dataset.dashboardWidget=key;
      const head=el.querySelector('.dash-widget-tools-v63');
      if(head){
        const mv=head.querySelector('.dash-widget-handle-v63'); if(mv){mv.title=T.move; mv.setAttribute('aria-label',T.move);}
        const rs=head.querySelector('.dash-widget-reset-v63'); if(rs){rs.title=T.reset; rs.setAttribute('aria-label',T.reset);}
      }
      el.draggable=false;
      el.addEventListener('click',e=>{
        if(e.target.closest('.dash-widget-tools-v63')) return;
        // Kart boşluğuna tıklayınca eski modal/istatistik açılmasın.
        if(e.target===el || e.target.classList.contains('card-head')) e.stopPropagation();
      },true);
    });
  }
  function syncZoom(){
    /* Kept as a compatibility hook for this cleanup block. Zoom variables are
       written once by the canonical engine, so delayed dashboard passes cannot
       resize the page after first paint. */
  }
  function killOldShortcutModals(){
    ['#dashboardShortcutModal','#dashboardShortcutModal59','#dashboardShortcutModal60','#dashboardShortcutModal61','#dashboardShortcutModal62'].forEach(sel=>$$(sel).forEach(x=>{if(!x.classList.contains('shortcut-modal-shell-v62'))x.remove()}));
  }
  function init(){syncZoom();normalizeActions();resetBadDashboardSizes();dashboardDragFix();killOldShortcutModals();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('crm:ui-scale',()=>setTimeout(init,20));
  setTimeout(init,350); setTimeout(init,1100);
})();

// v3.3.66 — scroll/overflow stabilizer. Keeps sidebar/topbar fixed and restores panel scrolling.
(()=>{
  const apply=()=>{
    const root=document.documentElement;
    const body=document.body;
    if(!body) return;
    root.style.overflow='hidden';
    body.style.overflow='hidden';
    const shell=document.querySelector('.app-shell');
    const main=document.querySelector('.app-main');
    const page=document.querySelector('.page-wrap');
    const sidebar=document.querySelector('.sidebar');
    if(shell){shell.style.height='100vh';shell.style.overflow='hidden';}
    if(main){main.style.height='100vh';main.style.overflow='hidden';main.style.display='flex';main.style.flexDirection='column';}
    if(sidebar){sidebar.style.height='100vh';sidebar.style.overflowY='auto';sidebar.style.overflowX='hidden';}
    if(page){page.style.overflowY='auto';page.style.overflowX='hidden';page.style.minHeight='0';}
    document.querySelectorAll('.table-scroll,.quote-items-scroll,.products-table-card,.list-table-card--quote,.list-table-card--workflow').forEach(el=>{
      el.style.overflow='auto';
      el.style.maxWidth='100%';
    });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
  window.addEventListener('resize',apply,{passive:true});
  window.addEventListener('crm:ui-scale',()=>setTimeout(apply,10));
  setTimeout(apply,250); setTimeout(apply,1000);
})();

/* v3.3.76 — eski serbest pano motoru. v3.7.1 kalıcı/sıralı widget motoru bulunan ana sayfada devre dışıdır. */
(function(){
  'use strict';
  if(document.querySelector('[data-dashboard-widget-zone]'))return;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const tr=!(document.documentElement.lang||'tr').toLowerCase().startsWith('en');
  const L=tr?{move:'Taşı',resize:'Boyutlandır',reset:'Sıfırla',lock:'Sabitle',unlock:'Kilidi aç',saved:'Ana sayfa düzeni kaydedildi'}:{move:'Move',resize:'Resize',reset:'Reset',lock:'Lock',unlock:'Unlock',saved:'Dashboard layout saved'};
  const uid=()=>document.body?.dataset?.userId||'guest';
  const key=()=>`crm-dashboard-freeboard-v76:${uid()}`;
  const oldKey=()=>`crm-dashboard-freeboard-v75:${uid()}`;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  let persisted=(()=>{const boot=window.DASHBOARD_LAYOUT_BOOT;return boot&&typeof boot==='object'&&!Array.isArray(boot)?JSON.parse(JSON.stringify(boot)):null})();
  const read=()=>{if(persisted&&Object.keys(persisted).length)return JSON.parse(JSON.stringify(persisted));try{return JSON.parse(localStorage.getItem(key())||localStorage.getItem(oldKey())||'{}')||{}}catch{return {}}};
  let serverSaveTimer=null;
  const write=v=>{persisted=JSON.parse(JSON.stringify(v||{}));try{localStorage.setItem(key(),JSON.stringify(persisted))}catch(e){}clearTimeout(serverSaveTimer);serverSaveTimer=setTimeout(()=>fetch('/dashboard/layout',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-Token':document.querySelector('meta[name="csrf-token"]')?.content||''},body:JSON.stringify({layout:persisted})}).catch(()=>{}),180)};
  let layout=null, drag=null, resize=null, raf=0, saveTimer=null, blockUntil=0;
  function zone(){return $('[data-dashboard-widget-zone]');}
  function cards(){const z=zone(); return z?$$('.dashboard-widget-v63',z):[];}
  function idOf(el,i){const id=el.dataset.dashboardWidget||el.dataset.cardKey||`card-${i}`; el.dataset.dashboardWidget=id; return id;}
  function base(){
    const z=zone(); const W=Math.max(980,z?.clientWidth||1280); const gap=14;
    const col=Math.max(290,Math.floor((W-gap*2)/3));
    const half=Math.floor((W-gap)/2);
    return {
      'live-support':{x:0,y:0,w:half,h:230},
      'live-proforma-tracking':{x:half+gap,y:0,w:col,h:190},
      'recent-customers':{x:Math.max(0,W-col),y:0,w:col,h:330},
      'recent-proformas':{x:0,y:260,w:Math.min(W,Math.max(760,Math.floor(W*.62))),h:360},
      'recent-activity':{x:Math.min(Math.floor(W*.64),Math.max(0,W-col)),y:260,w:col,h:230},
      'alerts':{x:Math.min(Math.floor(W*.64),Math.max(0,W-col)),y:510,w:col,h:190},
      'smart-workflow':{x:0,y:640,w:Math.min(W,Math.max(760,Math.floor(W*.72))),h:280}
    };
  }
  function get(){ if(!layout) layout=Object.assign({},read()); return layout; }
  function norm(o,f){
    const z=zone(); const W=Math.max(320,z?.clientWidth||1200); f=f||{x:0,y:0,w:420,h:220};
    const minW=Math.min(260,Math.max(220,W-20));
    const w=clamp(Math.round(Number(o?.w||f.w)),minW,Math.max(minW,W));
    const h=clamp(Math.round(Number(o?.h||f.h)),140,820);
    const x=clamp(Math.round(Number(o?.x??f.x)),0,Math.max(0,W-w));
    const y=Math.max(0,Math.round(Number(o?.y??f.y)));
    return {x,y,w,h,locked:Boolean(o?.locked??f.locked),visible:o?.visible!==false,collapsed:Boolean(o?.collapsed??f.collapsed),order:Number(o?.order??f.order??0)};
  }
  function overlap(a,b){return !(a.x+a.w+14<=b.x||b.x+b.w+14<=a.x||a.y+a.h+14<=b.y||b.y+b.h+14<=a.y);}
  function resolve(active){
    const l=get(), defs=base(), ids=cards().map((el,i)=>idOf(el,i));
    ids.forEach(id=>l[id]=norm(l[id],defs[id]));
    let changed=true, guard=0;
    while(changed && guard++<140){
      changed=false;
      for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){
        const aId=ids[i], bId=ids[j], a=l[aId], b=l[bId]; if(!overlap(a,b)) continue;
        const pushed=(aId===active)?bId:(bId===active)?aId:(a.y<=b.y?bId:aId);
        const anchor=pushed===aId?b:a;
        l[pushed].y=anchor.y+anchor.h+14; changed=true;
      }
    }
  }
  function height(){
    const l=get(); return Math.max(560,cards().reduce((m,el,i)=>{const id=idOf(el,i),o=l[id]||{};return Math.max(m,(o.y||0)+(o.h||220)+28)},0));
  }
  function cleanup(z){
    z.querySelectorAll('.dash-tools-v63,.dash-tools-v68,.dash-tools-v69,.dash-tools-v70,.dash-tools-v71,.dash-tools-v72,.dash-tools-v74,.dash-tools-v75,.dash-widget-tools-v63,.dash-resizer-v68,.dash-resize-v69,.dash-resize-v70,.dash-resize-v71,.dash-size-v72,.dash-resize-v74,.dash-resize-v75').forEach(x=>x.remove());
    cards().forEach(el=>{el.draggable=false;el.removeAttribute('draggable');el.classList.remove('is-dragging','is-moving-v69','is-dragging-v72','is-dragging-v74','is-dragging-v75','is-resizing-v75','dashboard-card-wide','dashboard-card-compact')});
  }
  function apply(active,save){
    const z=zone(); if(!z) return;
    cleanup(z);
    z.className=z.className.replace(/\bdashboard-(freeboard-v69|freeboard-v70|freeboard-v71|stable-grid-v72|v74|freeboard-v75)\b/g,'').trim();
    z.classList.add('dashboard-freeboard-v76');
    if(window.matchMedia('(max-width:1000px)').matches){
      z.querySelectorAll('.dash-tools-v76,.dash-resize-v76').forEach(x=>x.remove());
      for(const el of cards())for(const prop of ['position','left','top','width','height','transform','grid-column'])el.style.removeProperty(prop);
      for(const prop of ['height','min-height','position','overflow'])z.style.removeProperty(prop);
      document.documentElement.classList.remove('dash-v75-preload','dash-v76-preload','dash-v76-boot');
      document.body.classList.add('dashboard-v76-ready');
      document.getElementById('dash-v76-early')?.remove();
      return;
    }
    const defs=base(), l=get();
    cards().forEach((el,i)=>{const id=idOf(el,i); l[id]=norm(l[id],defs[id]||{x:0,y:i*235,w:420,h:220});});
    if(active) resolve(active);
    cards().forEach((el,i)=>{
      const id=idOf(el,i); const o=norm(l[id],defs[id]); l[id]=o;
      el.hidden=o.visible===false;el.classList.toggle('is-dashboard-locked-v370',o.locked);el.classList.toggle('is-dashboard-collapsed-v370',o.collapsed);
      el.style.setProperty('--dash-x',o.x+'px'); el.style.setProperty('--dash-y',o.y+'px'); el.style.setProperty('--dash-w',o.w+'px'); el.style.setProperty('--dash-h',o.h+'px');
      el.style.position='absolute'; el.style.left=o.x+'px'; el.style.top=o.y+'px'; el.style.width=o.w+'px'; el.style.height=o.h+'px';
      el.style.removeProperty('grid-column'); el.style.removeProperty('order'); el.style.removeProperty('transform');
    });
    z.style.height=height()+'px'; z.style.minHeight='0'; z.style.position='relative'; z.style.overflow='visible';
    addTools();
    if(save){write(l);}
    document.documentElement.classList.remove('dash-v75-preload','dash-v76-preload','dash-v76-boot');
    document.body.classList.add('dashboard-v76-ready');
    const early=document.getElementById('dash-v76-early'); if(early) early.remove();
  }
  function addTools(){
    cards().forEach((el,i)=>{
      const id=idOf(el,i);
      if(!el.querySelector('.dash-tools-v76')){
        const tools=document.createElement('div'); tools.className='dash-tools-v76';
        tools.innerHTML=`<button type="button" class="dash-move-v76" title="${L.move}" aria-label="${L.move}">↕</button><button type="button" class="dash-lock-v370" title="${L.lock}" aria-label="${L.lock}">🔓</button><button type="button" class="dash-reset-v76" title="${L.reset}" aria-label="${L.reset}">↺</button>`;
        const h=document.createElement('i'); h.className='dash-resize-v76'; h.title=L.resize; h.setAttribute('aria-hidden','true');
        el.append(tools,h);
      }
      const m=el.querySelector('.dash-move-v76'), r=el.querySelector('.dash-resize-v76'), rs=el.querySelector('.dash-reset-v76'),lk=el.querySelector('.dash-lock-v370');
      const state=get()[id]||{};if(lk){lk.textContent=state.locked?'🔒':'🔓';lk.title=state.locked?L.unlock:L.lock}m.disabled=Boolean(state.locked);r.hidden=Boolean(state.locked);
      if(!m.dataset.v76){m.dataset.v76='1'; m.addEventListener('pointerdown',e=>startDrag(e,el),true); m.addEventListener('click',block,true);}
      if(!r.dataset.v76){r.dataset.v76='1'; r.addEventListener('pointerdown',e=>startResize(e,el),true); r.addEventListener('click',block,true);}
      if(lk&&!lk.dataset.v370){lk.dataset.v370='1';lk.addEventListener('click',e=>{block(e);const l=get(),o=norm(l[id],base()[id]);o.locked=!o.locked;l[id]=o;layout=l;write(l);apply(null,false)},true)}
      if(!rs.dataset.v76){rs.dataset.v76='1'; rs.addEventListener('click',e=>{block(e); const l=get(); delete l[id]; persisted=l; write(l); layout=Object.assign({},l); apply(null,true);},true);}
      if(!el.dataset.v76Block){el.dataset.v76Block='1'; el.addEventListener('click',e=>{if(Date.now()<blockUntil||e.target.closest('.dash-tools-v76,.dash-resize-v76')) block(e);},true);}
    });
  }
  function block(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();}
  function startDrag(e,el){
    block(e); const z=zone(); if(!z) return; const id=idOf(el,0), o=norm(get()[id],base()[id]);if(o.locked)return;
    drag={el,id,sx:e.clientX,sy:e.clientY,ox:o.x,oy:o.y,w:o.w,h:o.h}; el.classList.add('is-dragging-v76'); el.setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove',onDrag,true); window.addEventListener('pointerup',endDrag,true);
  }
  function onDrag(e){
    if(!drag) return; block(e); const z=zone(); if(!z) return; const l=get();
    const x=clamp(drag.ox+e.clientX-drag.sx,0,Math.max(0,z.clientWidth-drag.w));
    const y=Math.max(0,drag.oy+e.clientY-drag.sy); l[drag.id]=Object.assign({},l[drag.id]||{}, {x:Math.round(x),y:Math.round(y),w:drag.w,h:drag.h});
    if(!raf){raf=requestAnimationFrame(()=>{raf=0; const o=l[drag.id]; drag?.el.style.setProperty('--dash-x',o.x+'px');drag?.el.style.setProperty('--dash-y',o.y+'px'); if(drag?.el){drag.el.style.left=o.x+'px';drag.el.style.top=o.y+'px'} z.style.height=height()+'px';});}
  }
  function endDrag(e){
    if(!drag) return; block(e); const id=drag.id; drag.el.classList.remove('is-dragging-v76'); drag=null; blockUntil=Date.now()+280;
    window.removeEventListener('pointermove',onDrag,true); window.removeEventListener('pointerup',endDrag,true); apply(id,true);
  }
  function startResize(e,el){
    block(e); const id=idOf(el,0), o=norm(get()[id],base()[id]);if(o.locked)return; resize={el,id,sx:e.clientX,sy:e.clientY,ow:o.w,oh:o.h}; el.classList.add('is-resizing-v76'); el.setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove',onResize,true); window.addEventListener('pointerup',endResize,true);
  }
  function onResize(e){
    if(!resize) return; block(e); const z=zone(); if(!z) return; const l=get(), o=norm(l[resize.id],base()[resize.id]);
    o.w=clamp(resize.ow+e.clientX-resize.sx,260,Math.max(260,z.clientWidth-o.x)); o.h=clamp(resize.oh+e.clientY-resize.sy,140,820); l[resize.id]=o;
    if(!raf){raf=requestAnimationFrame(()=>{raf=0; if(resize?.el){resize.el.style.width=o.w+'px';resize.el.style.height=o.h+'px';resize.el.style.setProperty('--dash-w',o.w+'px');resize.el.style.setProperty('--dash-h',o.h+'px');} z.style.height=height()+'px';});}
  }
  function endResize(e){
    if(!resize) return; block(e); const id=resize.id; resize.el.classList.remove('is-resizing-v76'); resize=null; blockUntil=Date.now()+220;
    window.removeEventListener('pointermove',onResize,true); window.removeEventListener('pointerup',endResize,true); apply(id,true);
  }
  async function init(){const z=zone(); if(!z) return; layout=read(); apply(null,false);try{const response=await fetch('/dashboard/layout',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});const data=await response.json();if(response.ok&&data?.ok&&data.layout&&Object.keys(data.layout).length){persisted=data.layout;layout=read();apply(null,false)}}catch{}}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  window.addEventListener('resize',()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>{layout=read();apply(null,true);},120)},{passive:true});
})();


// v3.3.79 — gerçek panel zoom motoru: üst bar/sidebar sabit, panel içeriği büyür/küçülür.
(()=>{
  'use strict';
  const root=document.documentElement;
  const uid=()=>document.body?.dataset?.userId||'guest';
  const key=()=>`crm-ui-zoom-v4:${uid()}`;
  const clamp=v=>Math.max(60,Math.min(200,Number(v)||100));
  const label=()=>document.querySelector('[data-ui-zoom-label]');
  const store=z=>{try{localStorage.setItem(key(),String(z));localStorage.setItem('crm-ui-zoom-v4',String(z));localStorage.setItem('crm-panel-zoom',String(z));}catch{}};
  const read=()=>{
    const txt=label()?.textContent||'';
    const val=localStorage.getItem(key())||String(txt).match(/\d+/)?.[0]||100;
    return clamp(val);
  };
  function apply(value){
    const z=clamp(value==null?read():value);
    const s=z/100;
    // Dış iskelet hiç ölçeklenmez.
    root.style.removeProperty('zoom');
    root.style.setProperty('--ui-scale','1');
    root.style.setProperty('--ui-font-scale','1');
    root.style.setProperty('--ui-design-scale','1');
    root.style.setProperty('--ui-space-scale','1');
    // Panel metni tam oranda, kutular kontrollü düşük oranda ölçeklenir.
    const box=(1+((s-1)*0.20));
    root.style.setProperty('--panel-z79',s.toFixed(3));
    root.style.setProperty('--panel-box-z79',box.toFixed(3));
    root.style.setProperty('--panel-font-scale',s.toFixed(3));
    root.style.setProperty('--panel-zoom',s.toFixed(3));
    root.style.setProperty('--content-scale',s.toFixed(3));
    root.style.setProperty('--content-font-size',(14*s).toFixed(2)+'px');
    root.style.setProperty('--content-small-size',(12*s).toFixed(2)+'px');
    root.style.setProperty('--content-label-size',(12*s).toFixed(2)+'px');
    root.style.setProperty('--content-h1-size',(24*s).toFixed(2)+'px');
    root.style.setProperty('--content-h2-size',(17*s).toFixed(2)+'px');
    root.style.setProperty('--content-h3-size',(15*s).toFixed(2)+'px');
    root.style.setProperty('--content-control-height',(36*box).toFixed(2)+'px');
    root.dataset.panelZoom=String(z);
    const l=label(); if(l) l.textContent=z+'%';
    document.body?.classList.add('panel-zoom-v79-active');
    const detail={level:z,scale:s,boxScale:box};
    window.dispatchEvent(new CustomEvent('crm:panel-zoom-v79',{detail}));
    window.dispatchEvent(new CustomEvent('crm:ui-scale',{detail}));
  }
  window.CRM_APPLY_PANEL_ZOOM=(value)=>{ if(value!=null) store(clamp(value)); apply(value); };
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-ui-zoom]');
    if(!btn) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.();
    let z=read();
    const a=btn.dataset.uiZoom;
    if(a==='in') z=clamp(z+5); else if(a==='out') z=clamp(z-5); else z=100;
    store(z); apply(z);
  },true);
  window.addEventListener('storage',()=>apply(),{passive:true});
  /* Deferred core script runs after the document is parsed. One application is
     enough; the early head variables already match it, so there is no resize
     cascade at 20/80/420/1800 ms anymore. */
  apply();
})();

// v3.3.79 — liste aksiyonlarında yazı gösterme, anlamı tooltipte tut.
(()=>{
  const apply=()=>{
    document.querySelectorAll('.table-action').forEach(btn=>{
      if(!btn.dataset.label){
        const t=(btn.getAttribute('title')||btn.textContent||'İşlem').trim().replace(/\s+/g,' ');
        btn.dataset.label=t;
        if(!btn.getAttribute('title')) btn.setAttribute('title',t);
      }
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  setTimeout(apply,300);setTimeout(apply,900);
})();

// v3.3.95 — mobile app guard: viewport height, active bottom nav, safe sidebar behavior.
(()=>{
 const mq=window.matchMedia('(max-width:1000px)');
 const apply=()=>{
  const h=Math.round(window.visualViewport?.height||window.innerHeight||0);
  if(h>0)document.documentElement.style.setProperty('--mobile-vh',h+'px');
  document.documentElement.classList.toggle('crm-mobile-v95',mq.matches);
  if(!mq.matches)document.getElementById('sidebar')?.classList.remove('is-open');
  document.querySelectorAll('.mobile-nav a').forEach(a=>{
   const href=a.getAttribute('href')||'';
   const path=location.pathname||'/';
   const active=href==='/'?path==='/'||path==='/dashboard':path===href||path.startsWith(href+'/');
   a.classList.toggle('is-active',active);
  });
 };
 mq.addEventListener?.('change',apply);
 window.addEventListener('resize',apply,{passive:true});
 window.visualViewport?.addEventListener?.('resize',apply,{passive:true});
 document.addEventListener('DOMContentLoaded',apply,{once:true});
 document.addEventListener('click',e=>{
  if(!mq.matches)return;
  if(e.target.closest('.mobile-nav a'))document.getElementById('sidebar')?.classList.remove('is-open');
 },true);
 apply();
})();


// v3.5.7 — Mobil ana sayfa kartları doğal akışta, açık ve tek sütun görünür.
(()=>{
  'use strict';
  const mq=window.matchMedia('(max-width:1000px)');
  function cards(){return [...document.querySelectorAll('.dashboard-overview-grid .dashboard-widget-v63')];}
  function apply(){
    const isMobile=mq.matches;
    cards().forEach(card=>{
      card.classList.toggle('dashboard-mobile-accordion-v96',isMobile);
      if(isMobile){
        card.style.removeProperty('left');card.style.removeProperty('top');card.style.removeProperty('width');card.style.removeProperty('height');card.style.removeProperty('position');
        card.classList.add('is-mobile-open');
      }else{
        card.classList.remove('is-mobile-open','dashboard-mobile-accordion-v96');
      }
    });
  }
  mq.addEventListener?.('change',apply);
  window.addEventListener('resize',()=>setTimeout(apply,80),{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  setTimeout(apply,250);setTimeout(apply,900);
})();

// v3.6.0 — WhatsApp paylaşımı: güncel CSRF anahtarı ve ayrı güvenli pencere.
const crmUiEnglish=()=>String(document.documentElement.lang||'tr').toLowerCase().startsWith('en');
(()=>{
  let csrfRefreshPromise=null;
  function applyCsrf(token){
    if(!token)return '';
    document.querySelectorAll('input[name="_csrf"]').forEach(input=>{input.value=token});
    const meta=document.querySelector('meta[name="csrf-token"]');if(meta)meta.content=token;
    return token;
  }
  async function currentCsrf(){
    if(csrfRefreshPromise)return csrfRefreshPromise;
    csrfRefreshPromise=fetch('/auth/csrf-token',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-Requested-With':'fetch'}})
      .then(async response=>{if(!response.ok)throw new Error('csrf_refresh_failed');const data=await response.json();return applyCsrf(data.csrfToken||'')})
      .catch(()=>document.querySelector('meta[name="csrf-token"]')?.content||document.querySelector('input[name="_csrf"]')?.value||'')
      .finally(()=>{csrfRefreshPromise=null});
    return csrfRefreshPromise;
  }
  function encodedBody(source){
    const out=new URLSearchParams();
    if(source instanceof FormData){for(const [key,value] of source.entries())if(typeof value==='string')out.append(key,value)}
    else if(source instanceof URLSearchParams){for(const [key,value] of source.entries())out.append(key,value)}
    else if(source&&typeof source==='object'){for(const [key,value] of Object.entries(source))if(value!=null)out.append(key,String(value))}
    return out;
  }
  async function openWhatsapp(action,source,button){
    if(button?.disabled||!action)return;
    const oldText=button?.innerHTML;
    // Pencere kullanıcı tıklaması sırasında açılır; fetch tamamlandıktan sonra
    // açılırsa Chrome/Edge bunu popup olarak engelleyebilir.
    const popup=window.open('about:blank','crm_whatsapp_share','width=1120,height=760,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes');
    if(!popup){
      window.alert(crmUiEnglish()?'Allow pop-ups for this site to open WhatsApp in a separate window.':'WhatsApp’ın ayrı pencerede açılması için bu siteye açılır pencere izni verin.');
      return;
    }
    try{
      popup.opener=null;
      popup.document.title=crmUiEnglish()?'Preparing WhatsApp…':'WhatsApp hazırlanıyor…';
      popup.document.body.replaceChildren();
      const loadingMessage=popup.document.createElement('div');
      loadingMessage.textContent=crmUiEnglish()?'Preparing the secure WhatsApp link…':'Güvenli WhatsApp bağlantısı hazırlanıyor…';
      loadingMessage.style.font='700 16px Arial';
      loadingMessage.style.padding='32px';
      loadingMessage.style.color='#17324f';
      popup.document.body.append(loadingMessage);
    }catch{}
    if(button){button.disabled=true;button.setAttribute('aria-busy','true')}
    try{
      const csrf=await currentCsrf();
      const body=encodedBody(source);if(csrf){body.set('_csrf',csrf)}
      const response=await fetch(action,{method:'POST',body,headers:{Accept:'application/json','X-Requested-With':'fetch','X-CSRF-Token':csrf,'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},credentials:'same-origin',cache:'no-store',redirect:'follow'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.url)throw new Error(data.message||(crmUiEnglish()?'WhatsApp link could not be created.':'WhatsApp bağlantısı oluşturulamadı.'));
      const target=new URL(data.url,window.location.origin);
      if(!['https:','http:'].includes(target.protocol)||!/(^|\.)wa\.me$|(^|\.)whatsapp\.com$/i.test(target.hostname))throw new Error(crmUiEnglish()?'The WhatsApp target is invalid.':'WhatsApp hedefi geçersiz.');
      popup.location.replace(target.toString());
    }catch(error){
      try{popup.close()}catch{}
      window.alert(error?.message||(crmUiEnglish()?'WhatsApp link could not be created. Please try again.':'WhatsApp bağlantısı oluşturulamadı. Lütfen yeniden deneyin.'));
    }finally{
      if(button){button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=oldText}
    }
  }
  document.addEventListener('submit',async event=>{
    const form=event.target.closest?.('form[data-whatsapp-share]');
    if(!form)return;
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    await openWhatsapp(form.action,new FormData(form),button);
  },true);
  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-whatsapp-action]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    await openWhatsapp(button.dataset.whatsappAction,{return_to:button.dataset.whatsappReturn||location.pathname},button);
  },true);
})();

// v3.5.7 — Proformadan ürün aktarımı: canlı kart ön izlemesi ve manuel boş satır ekleme.
(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const field=(row,name)=>row.querySelector(`[data-field="${name}"]`)?.value||'';
  function showPreview(row){
    const modal=document.getElementById('importProductPreviewModal'),content=modal?.querySelector('[data-import-preview-content]');if(!modal||!content)return;
    const image=field(row,'image_url')||row.querySelector('.import-product-image-box img')?.src||'',en=crmUiEnglish();
    const words=en?{eyebrow:'PRODUCT CARD PREVIEW',noCode:'NO CODE',noName:'NO PRODUCT NAME',noDescription:'No description entered.',quantity:'Quantity',unitPrice:'Unit Price',vat:'VAT',unit:'PCS',currency:'Currency',review:'This card reflects the current edited row.'}:{eyebrow:'ÜRÜN KARTI ÖN İZLEMESİ',noCode:'KOD YOK',noName:'ÜRÜN ADI YOK',noDescription:'Açıklama girilmedi.',quantity:'Miktar',unitPrice:'Birim Fiyat',vat:'KDV',unit:'ADET',currency:'Para Birimi',review:'Bu kart, düzenlediğiniz satırın güncel halini gösterir.'};
    const code=field(row,'code')||words.noCode,name=field(row,'name')||words.noName,description=field(row,'description')||words.noDescription,qty=field(row,'qty')||'1',unit=field(row,'unit')||words.unit,price=field(row,'price')||'0',currency=field(row,'currency')||'TRY',vat=field(row,'vat_rate')||'20';
    content.innerHTML=`<article class="import-product-card-v16"><header><div><span class="eyebrow">${words.eyebrow}</span><h2 title="${esc(name)}">${esc(name)}</h2><p><b>${esc(code)}</b> · ${esc(qty)} ${esc(unit)}</p></div><span class="import-product-card-v16__status">CANLI</span></header><div class="import-product-card-v16__body"><aside><div class="import-product-card-v16__image">${image?`<img src="${esc(image)}" alt="">`:'<span>📦</span>'}</div><div class="import-product-card-v16__price"><small>${words.unitPrice}</small><b>${esc(price)} ${esc(currency)}</b><span>${words.vat} %${esc(vat)}</span></div></aside><main><dl><div><dt>${words.quantity}</dt><dd>${esc(qty)} ${esc(unit)}</dd></div><div><dt>${words.currency}</dt><dd>${esc(currency)}</dd></div><div><dt>${words.vat}</dt><dd>%${esc(vat)}</dd></div><div><dt>SKU</dt><dd>${esc(code)}</dd></div></dl><section><h3>${en?'Description':'Açıklama'}</h3><p>${esc(description).replace(/\n/g,'<br>')}</p></section><small class="import-product-card-v16__note">${words.review}</small></main></div></article>`;
    modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');
  }
  function addRow(){
    const body=document.querySelector('[data-import-rows]');if(!body)return;const index=body.querySelectorAll('[data-import-row]').length;
    const day=new Date().toISOString().slice(0,10).replace(/-/g,'');const code=`IMP-${day}-${String(index+1).padStart(4,'0')}`;
    const tr=document.createElement('tr');tr.dataset.importRow='';tr.dataset.rowIndex=String(index);tr.className='has-warning';
    const en=crmUiEnglish(),selectText=en?'Select row':'Satırı seç',previewText=en?'Preview product card':'Ürün kartını ön izle',manualText=en?'Manually added row; complete the fields.':'Manuel eklenen satır; alanları tamamlayın.',defaultUnit=en?'PCS':'ADET';
    tr.innerHTML=`<td><input type="hidden" name="rows[${index}][selected]" value="0"><input type="checkbox" name="rows[${index}][selected]" value="1" checked aria-label="${selectText}"></td><td class="actions-cell"><button type="button" class="table-action is-preview" data-import-preview data-label="${previewText}" title="${previewText}" aria-label="${previewText}"><span aria-hidden="true">◉</span></button></td><td><label class="import-product-image-cell"><span class="import-product-image-box"><span>Görsel</span></span><input type="file" name="rows[${index}][image_file]" accept="image/jpeg,image/png,image/webp" data-field="image_file"><small data-image-file-name>Görsel seç</small></label><input type="hidden" name="rows[${index}][image_url]" value="" data-field="image_url"></td><td><input required name="rows[${index}][code]" value="${code}" data-field="code"></td><td><div class="import-name-description"><textarea required rows="2" name="rows[${index}][name]" data-field="name" placeholder="Ürün adı"></textarea><textarea rows="3" name="rows[${index}][description]" data-field="description" placeholder="Açıklama"></textarea></div></td><td><input type="number" min="0.0001" step="0.0001" name="rows[${index}][qty]" value="1" data-field="qty"></td><td><input name="rows[${index}][unit]" value="${defaultUnit}" data-field="unit"></td><td><input type="number" min="0" step="0.01" name="rows[${index}][price]" value="0" data-field="price"></td><td><select name="rows[${index}][currency]" data-field="currency"><option>TRY</option><option>EUR</option><option>USD</option></select></td><td><input type="number" min="0" step="0.01" name="rows[${index}][vat_rate]" value="20" data-field="vat_rate"></td><td><select name="rows[${index}][duplicate_action]" data-field="duplicate_action"><option value="update">Yeni ekle</option><option value="new">Yeni kodla oluştur</option><option value="skip">Atla</option></select></td><td><span class="import-warning">⚠️ ${manualText}</span></td>`;
    body.appendChild(tr);document.querySelector('[data-import-row-count]')?.replaceChildren(document.createTextNode(String(index+1)));tr.querySelector('[data-field="name"]')?.focus();
  }
  document.addEventListener('click',event=>{
    const preview=event.target.closest?.('[data-import-preview]');if(preview){event.preventDefault();showPreview(preview.closest('[data-import-row]'));return}
    if(event.target.closest?.('[data-import-add-row]')){event.preventDefault();addRow();return}
    if(event.target.closest?.('[data-import-preview-close]')||event.target.id==='importProductPreviewModal'){const modal=document.getElementById('importProductPreviewModal');modal?.classList.remove('is-open');modal?.setAttribute('aria-hidden','true')}
  });
})();


/* crmV13 — mark only explicit state-changing forms; ordinary navigation/search/filter forms never show confirmation. */
(()=>{
 const forms=document.querySelectorAll('form');
 forms.forEach(form=>{
  if(String(form.method||'get').toLowerCase()==='get'||form.dataset.noConfirm!==undefined)return;
  const action=String(form.getAttribute('action')||'').toLowerCase();
  if(/search|filter|preview|print|download|export|test|login|logout|health|lookup|autocomplete/.test(action))return;
  if(form.matches('[data-confirm-submit],[data-process-confirm],[data-confirm]'))return;
  if(/delete|remove|trash|archive|restore|approve|reject|save|update|create|import/.test(action))form.dataset.autoConfirm='1';
 });
 document.addEventListener('change',e=>{
  const input=e.target.closest('.import-image-editor input[type="file"]');if(!input)return;
  const label=input.closest('.import-image-editor')?.querySelector('[data-image-file-name]');
  if(label)label.textContent=input.files?.[0]?.name||((document.documentElement.lang||'tr').startsWith('en')?'URL or file':'URL veya dosya');
 });
})();

// v3.6.2 proforma product import bulk tools and validation tabs
document.addEventListener('click',e=>{const apply=e.target.closest('[data-apply-bulk]');if(apply){document.querySelectorAll('[data-import-row]').forEach(row=>{if(!row.querySelector('[name$="[selected]"]:checked'))return;document.querySelectorAll('[data-bulk-source]').forEach(src=>{if(!src.value)return;const dest=row.querySelector(`[data-field="${src.dataset.bulkSource}"]`);if(dest){dest.value=src.value;dest.dispatchEvent(new Event('input',{bubbles:true}))}})});return}const tab=e.target.closest('[data-validation-filter]');if(tab){document.querySelectorAll('[data-validation-filter]').forEach(x=>x.classList.toggle('is-active',x===tab));const mode=tab.dataset.validationFilter;document.querySelectorAll('[data-import-row]').forEach(row=>{const code=(row.querySelector('[data-field="code"]')?.value||'').trim(),name=(row.querySelector('[data-field="name"]')?.value||'').trim(),desc=(row.querySelector('[data-field="description"]')?.value||'').trim(),price=Number(row.querySelector('[data-field="price"]')?.value||0),dup=row.dataset.existingCode==='1';const show=mode==='all'||(mode==='missing'&&(!code||!name))||(mode==='price'&&price<=0)||(mode==='duplicate'&&dup)||(mode==='description'&&!desc);row.classList.toggle('is-filtered-out',!show)})}});

document.addEventListener('change',e=>{const sel=e.target.closest('[data-import-template-select]');if(!sel)return;const opt=sel.selectedOptions[0];let d={};try{d=JSON.parse(opt?.dataset.defaults||'{}')}catch{};const name=document.querySelector('[name="template_name"]');if(name&&opt?.textContent&&sel.value)name.value=opt.textContent.trim();Object.entries(d).forEach(([key,value])=>{if(value===undefined||value===null||value==='')return;const source=document.querySelector(`[data-bulk-source="${key}"]`);if(source)source.value=value})});


/* crmV17 — proforma aktarımı: yalnızca aktarım sayfasında çıkış onayı,
   canlı işlem adımları, kalıcı arka plan durumu ve gerçekten çalışan iptal. */
(()=>{
 const STORAGE='arteva.activeProductImportJob';
 const IMPORT_PATH='/products/import-proforma';
 let active=null,pollTimer=null,pendingNavigation=null,cancelInFlight=false;
 const csrf=()=>document.querySelector('meta[name="csrf-token"]')?.content||document.querySelector('input[name="_csrf"]')?.value||'';
 const isImportLanding=()=>location.pathname.replace(/\/+$/,'')===IMPORT_PATH;
 const elapsed=job=>((Date.now()-Number(job?.startedAt||job?.createdAt||Date.now()))/1000).toLocaleString('tr-TR',{maximumFractionDigits:1});
 const terminal=status=>['COMPLETED','FAILED','CANCELLED'].includes(String(status||'').toUpperCase());
 function ensureToast(){
  let t=document.getElementById('importProgressToast');
  if(!t){
   t=document.createElement('div');t.id='importProgressToast';t.className='import-progress-toast-v367 import-progress-toast-v16';
   t.innerHTML='<b>Proforma taranıyor</b><span>Arka plan işi hazırlanıyor…</span><div class="import-progress-track-v16"><i></i></div><strong>0% · 0,0 sn</strong><button type="button" class="btn btn--danger btn--sm" data-import-job-cancel>İptal Et</button>';
   document.body.appendChild(t);
  }
  return t;
 }
 function stageText(stage){
  return ({
   queued:'Kuyrukta bekliyor…',
   starting:'Dosya doğrulandı; okuyucu hazırlanıyor…',
   extracting:'PDF/Excel metni, tablo ve başlıklar ayrıştırılıyor…',
   reading:'Metin blokları ve ürün sütunları okunuyor…',
   ocr:'Taranmış sayfalar OCR ile okunuyor…',
   mapping:'Ürün kodu, adı, açıklaması ve fiyat alanları eşleştiriliyor…',
   validating:'Gerçek ürün satırları doğrulanıyor ve ön izleme hazırlanıyor…',
   completed:'Tarama tamamlandı.',
   failed:'Tarama tamamlanamadı.',
   cancelled:'Tarama iptal edildi.'
  })[stage]||'Tarama devam ediyor…';
 }
 function syncProcessPanels(job={}){
  if(!isImportLanding())return;
  const progress=Number(job.progress||0),stage=String(job.stage||'queued');
  const completed=new Set();
  if(progress>=5||stage!=='queued')completed.add(1);
  if(['reading','ocr','mapping','validating','completed'].includes(stage)||progress>=45)completed.add(2);
  if(['mapping','validating','completed'].includes(stage)||progress>=72)completed.add(3);
  if(stage==='completed'){
   if(job.ocrUsed)completed.add(4);
   else document.querySelector('[data-import-step="4"]')?.classList.add('is-skipped');
  }
  if(['validating','completed'].includes(stage)||progress>=86)completed.add(5);
  if(stage==='completed')completed.add(6);
  let activeStep=1;
  if(['starting','extracting','reading'].includes(stage))activeStep=2;
  if(stage==='mapping')activeStep=3;
  if(stage==='ocr')activeStep=4;
  if(stage==='validating')activeStep=5;
  if(stage==='completed')activeStep=6;
  document.querySelectorAll('[data-import-step]').forEach(li=>{
   const n=Number(li.dataset.importStep);
   li.classList.toggle('is-complete',completed.has(n));
   li.classList.toggle('is-active',!completed.has(n)&&n===activeStep&&!terminal(job.status));
   li.classList.toggle('is-error',terminal(job.status)&&job.status==='FAILED'&&n===activeStep);
   const nextState=completed.has(n)?'Tamamlandı':(li.classList.contains('is-skipped')?'Gerekmedi':(n===activeStep?'İşleniyor':'Bekliyor'));
   li.dataset.stepState=nextState;
   const stateLabel=li.querySelector('.product-import-step-state-v18');if(stateLabel)stateLabel.textContent=nextState;
   const detail=li.querySelector('.product-import-step-copy-v18 small');if(detail)detail.textContent=completed.has(n)?'Sunucu doğrulaması tamamlandı':(li.classList.contains('is-skipped')?'Bu dosya için gerekli değil':(n===activeStep?'Sunucu bu adımı işliyor':'Sunucu doğrulaması bekleniyor'));
  });
  document.querySelectorAll('[data-import-rule]').forEach((el,index)=>{
   const verified=progress>=10&&(index<2||stage==='validating'||stage==='completed');
   el.classList.toggle('is-verified',verified);
  });
 }
 function setTerminalToast(t,{status,error,job}){
  const title=t.querySelector('b'),bar=t.querySelector('i'),pct=t.querySelector('strong'),msg=t.querySelector('span'),button=t.querySelector('[data-import-job-cancel],[data-import-job-dismiss]');
  t.classList.toggle('is-complete',status==='COMPLETED');
  t.classList.toggle('is-error',status==='FAILED'||status==='CANCELLED');
  if(bar)bar.style.width='100%';
  if(status==='COMPLETED'){if(title)title.textContent='Tarama tamamlandı';if(msg)msg.textContent='Ön izleme hazır.';if(pct)pct.textContent=`%100 · ${elapsed(job)} sn`}
  if(status==='FAILED'){if(title)title.textContent='Tarama tamamlanamadı';if(msg)msg.textContent=error||'Tarama alt işlemi tamamlanamadı.';if(pct)pct.textContent=`Hata · ${elapsed(job)} sn`}
  if(status==='CANCELLED'){if(title)title.textContent='Tarama iptal edildi';if(msg)msg.textContent='Arka plan işlemi ve geçici dosyalar durduruldu.';if(pct)pct.textContent='İptal edildi'}
  if(button){button.disabled=false;button.hidden=false;button.removeAttribute('data-import-job-cancel');button.setAttribute('data-import-job-dismiss','1');button.textContent='Kapat'}
 }
 async function poll(){
  if(!active?.statusUrl)return;
  try{
   const r=await fetch(active.statusUrl,{headers:{Accept:'application/json'},cache:'no-store',credentials:'same-origin'});
   if(!r.ok){
    if(r.status===404||r.status===410){
     const t=ensureToast(),last={...active,startedAt:active.startedAt||active.createdAt};
     localStorage.removeItem(STORAGE);clearInterval(pollTimer);active=null;
     setTerminalToast(t,{status:'FAILED',error:'Önceki aktarım işi artık bulunmuyor. Yeni bir dosya yükleyerek tekrar başlayın.',job:last});
     return;
    }
    throw new Error('İş durumu alınamadı');
   }
   const j=await r.json(),t=ensureToast(),bar=t.querySelector('i'),pct=t.querySelector('strong'),msg=t.querySelector('span');
   active={...active,status:j.status,stage:j.stage,progress:j.progress,startedAt:j.startedAt||active.startedAt,ocrUsed:Boolean(j.ocrUsed)};
   syncProcessPanels(j);
   if(bar)bar.style.width=Math.max(3,Number(j.progress||0))+'%';
   if(pct)pct.textContent=`${j.status==='COMPLETED'?'%100':`%${Number(j.progress||0)}`} · ${elapsed(j)} sn`;
   if(msg)msg.textContent=j.message||stageText(j.stage);
   if(j.status==='COMPLETED'){
    localStorage.removeItem(STORAGE);
    localStorage.setItem('arteva.lastProductImportResult',JSON.stringify({previewUrl:j.previewUrl,completedAt:Date.now(),detectedCount:j.detectedCount||0}));
    clearInterval(pollTimer);active=null;setTerminalToast(t,{status:'COMPLETED',job:j});
    let open=t.querySelector('[data-import-result-open]');
    if(!open){open=document.createElement('a');open.className='btn btn--primary btn--sm';open.dataset.importResultOpen='1';open.textContent='Ön İzlemeyi Aç';t.appendChild(open)}
    open.href=j.previewUrl;
    if(isImportLanding())setTimeout(()=>location.assign(j.previewUrl),350);
   }else if(j.status==='FAILED'||j.status==='CANCELLED'){
    localStorage.removeItem(STORAGE);clearInterval(pollTimer);active=null;
    setTerminalToast(t,{status:j.status,error:j.error,job:j});
   }else localStorage.setItem(STORAGE,JSON.stringify(active));
  }catch(error){
   const t=ensureToast(),msg=t.querySelector('span');
   if(msg)msg.textContent='Tarama arka planda sürüyor; durum bağlantısı yeniden deneniyor.';
  }
 }
 function begin(job){
  active=job;localStorage.setItem(STORAGE,JSON.stringify(job));ensureToast();syncProcessPanels({stage:'queued',progress:0,status:'QUEUED'});
  clearInterval(pollTimer);poll();pollTimer=setInterval(poll,1200);
 }
 async function cancelJob(){
  const t=ensureToast(),button=t.querySelector('[data-import-job-cancel]');
  if(!active?.cancelUrl){t.remove();return true}
  if(cancelInFlight)return false;
  cancelInFlight=true;
  if(button){button.disabled=true;button.textContent='İptal ediliyor…'}
  const msg=t.querySelector('span');if(msg)msg.textContent='Worker, OCR ve geçici dosyalar durduruluyor…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const token=csrf();
   const response=await fetch(active.cancelUrl,{
    method:'POST',credentials:'same-origin',signal:controller.signal,
    headers:{'X-CSRF-Token':token,'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({_csrf:token})
   });
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const last={...active,startedAt:active.startedAt||active.createdAt};
   localStorage.removeItem(STORAGE);active=null;clearInterval(pollTimer);
   setTerminalToast(t,{status:'CANCELLED',job:last});
   return true;
  }catch(error){
   if(msg)msg.textContent='İptal isteği gönderilemedi. Tekrar deneyin.';
   if(button){button.disabled=false;button.textContent='İptal Et'}
   return false;
  }finally{clearTimeout(timer);cancelInFlight=false}
 }
 function closeLeaveDialog(){const d=document.getElementById('importLeaveDialog');if(d){d.classList.remove('is-open');d.setAttribute('aria-hidden','true')}}
 function openLeaveDialog(url){
  pendingNavigation=url;let d=document.getElementById('importLeaveDialog');
  if(!d){
   d=document.createElement('div');d.id='importLeaveDialog';d.className='import-leave-dialog-v06 import-leave-dialog-v16';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
   d.innerHTML='<div class="import-navigation-dialog-v16"><header><i>⌛</i><div><h2>Proforma taraması devam ediyor</h2><p>Bu uyarı yalnızca Proformadan Ürün Aktar ekranından ayrılırken gösterilir. İşlemin nasıl devam etmesini istediğinizi seçin.</p></div></header><div class="import-navigation-options-v16"><button type="button" class="btn btn--primary" data-import-leave-background><span>↗</span><span><b>Arka Planda Devam Et</b><small>Başka menüye geçin; geri döndüğünüzde güncel aşama ve sonuç korunur.</small></span></button><button type="button" class="btn btn--danger" data-import-leave-cancel><span>■</span><span><b>İptal Et ve Çık</b><small>Worker, PDF/OCR alt süreçleri ve geçici dosyalar tamamen durdurulur.</small></span></button><button type="button" class="btn btn--soft" data-import-leave-stay><span>←</span><span><b>Sayfada Kal</b><small>Aktarım ekranında kalıp canlı işlem adımlarını izlemeye devam edin.</small></span></button></div></div>';
   document.body.appendChild(d);
  }
  d.classList.add('is-open');d.setAttribute('aria-hidden','false');d.querySelector('[data-import-leave-background]')?.focus();
 }
 document.addEventListener('click',e=>{
  const dismiss=e.target.closest('[data-import-job-dismiss]');if(dismiss){e.preventDefault();document.getElementById('importProgressToast')?.remove();return}
  const cancel=e.target.closest('[data-import-job-cancel]');if(cancel){e.preventDefault();cancelJob();return}
  if(!isImportLanding()||!active||e.target.closest('#importLeaveDialog'))return;
  const link=e.target.closest('a[href],button[data-href]');if(!link)return;
  const href=link.tagName==='A'?link.href:link.dataset.href;if(!href)return;
  let target;try{target=new URL(href,location.href)}catch{return}
  if(link.target==='_blank'||target.origin!==location.origin||target.href===location.href)return;
  e.preventDefault();e.stopImmediatePropagation();openLeaveDialog(target.href);
 },true);
 document.addEventListener('click',async e=>{
  if(e.target.closest('[data-import-leave-background]')){e.preventDefault();const u=pendingNavigation;pendingNavigation=null;closeLeaveDialog();if(u)location.assign(u)}
  else if(e.target.closest('[data-import-leave-cancel]')){e.preventDefault();const u=pendingNavigation;pendingNavigation=null;closeLeaveDialog();const ok=await cancelJob();if(ok&&u)location.assign(u)}
  else if(e.target.closest('[data-import-leave-stay]')){e.preventDefault();pendingNavigation=null;closeLeaveDialog()}
 },true);
 const form=document.querySelector('[data-import-progress-form]');
 if(form&&!form.dataset.backgroundBound){
  form.dataset.backgroundBound='1';
  form.addEventListener('submit',event=>{
   if(event.defaultPrevented)return;
   const file=form.querySelector('input[type="file"]')?.files?.[0];if(!file)return;
   event.preventDefault();
   const t=ensureToast(),bar=t.querySelector('i'),pct=t.querySelector('strong'),msg=t.querySelector('span'),submit=form.querySelector('[type="submit"]');
   t.classList.remove('is-error','is-complete');const old=t.querySelector('[data-import-job-dismiss]');if(old){old.removeAttribute('data-import-job-dismiss');old.setAttribute('data-import-job-cancel','1');old.textContent='İptal Et'}
   if(submit)submit.disabled=true;syncProcessPanels({stage:'queued',progress:0,status:'QUEUED'});
   const xhr=new XMLHttpRequest();xhr.open((form.method||'POST').toUpperCase(),form.action,true);xhr.setRequestHeader('X-Requested-With','XMLHttpRequest');xhr.setRequestHeader('Accept','application/json');xhr.responseType='json';
   xhr.upload.onprogress=e=>{
    if(!e.lengthComputable)return;const n=Math.round(e.loaded/e.total*100);
    if(bar)bar.style.width=n+'%';if(pct)pct.textContent=`Yükleme %${n}`;if(msg)msg.textContent=n<100?'Dosya sunucuya yükleniyor…':'Yükleme tamamlandı; arka plan taraması başlatılıyor…';
    syncProcessPanels({stage:n<100?'queued':'starting',progress:n<100?Math.min(4,n/25):5,status:'RUNNING'});
   };
   xhr.onload=()=>{
    if(submit)submit.disabled=false;
    if(xhr.status!==202||!xhr.response?.jobId){t.classList.add('is-error');if(msg)msg.textContent=xhr.response?.message||'Tarama işi başlatılamadı.';const b=t.querySelector('[data-import-job-cancel]');if(b){b.removeAttribute('data-import-job-cancel');b.setAttribute('data-import-job-dismiss','1');b.textContent='Kapat'}return}
    begin({jobId:xhr.response.jobId,statusUrl:xhr.response.statusUrl,cancelUrl:xhr.response.cancelUrl,createdAt:Date.now()});
   };
   xhr.onerror=()=>{if(submit)submit.disabled=false;t.classList.add('is-error');if(msg)msg.textContent='Dosya yüklenemedi.'};
   xhr.send(new FormData(form));
  });
 }
 try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved?.jobId)begin(saved)}catch{localStorage.removeItem(STORAGE)}
 window.addEventListener('beforeunload',event=>{if(!active||!isImportLanding())return;event.preventDefault();event.returnValue='';});
 document.addEventListener('change',e=>{
  const input=e.target.closest('.import-image-file-v367');if(!input)return;
  const file=input.files?.[0],row=input.closest('tr'),img=row?.querySelector('.import-image-preview-v367 img'),empty=row?.querySelector('.import-image-preview-v367 span');
  if(!file||!img)return;const url=URL.createObjectURL(file);img.src=url;img.hidden=false;if(empty)empty.hidden=true;img.onload=()=>URL.revokeObjectURL(url);
 });
})();


// v3.7.1 — son katman: görsel ön izlemesi, kurulum akordiyonu ve kalıcı dashboard kontrolleri.
(()=>{
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  document.addEventListener('change',event=>{
    const input=event.target.closest?.('.import-image-file-v371,[name$="[image_file]"]');if(!input)return;
    const row=input.closest('[data-import-row]'),box=row?.querySelector('.import-product-image-box'),label=row?.querySelector('[data-image-file-name]'),file=input.files?.[0];
    if(!file){if(label)label.textContent='Görsel seç';return}
    if(!(/^image\/(jpeg|png|webp)$/i.test(file.type)||(!file.type&&/\.(?:jpe?g|png|webp)$/i.test(file.name)))){input.value='';window.CRM_TOAST?.error?.('Yalnızca JPG, PNG veya WEBP görsel seçebilirsiniz.');return}
    const old=input.dataset.objectUrl;if(old)URL.revokeObjectURL(old);const url=URL.createObjectURL(file);input.dataset.objectUrl=url;
    if(box)box.innerHTML=`<img src="${esc(url)}" alt="Seçilen ürün görseli">`;if(label)label.textContent=file.name;
  });
  document.querySelectorAll('[data-setup-accordion]').forEach(section=>{
    const head=section.querySelector('[data-setup-toggle]');if(!head)return;
    head.addEventListener('click',()=>{const open=section.classList.toggle('is-open');head.setAttribute('aria-expanded',String(open))});
  });
})();


// v3.7.3 — çalışan serbest dashboard: başlıktan taşı, köşeden boyutlandır, kilitle ve kalıcı sakla.
(()=>{
 'use strict';
 const zone=document.querySelector('[data-dashboard-widget-zone]');if(!zone)return;
 const csrf=document.querySelector('meta[name="csrf-token"]')?.content||'';
 const uid=document.body?.dataset?.userId||'guest';
 const key=`crm-dashboard-freeboard-v372:${uid}`;
 const widthKey=`crm-dashboard-freeboard-v3818-width:${uid}`;
 const oldKeys=[`crm-dashboard-layout-v371:${uid}`,`crm-dashboard-freeboard-v76:${uid}`];
 const widgets=()=>[...zone.querySelectorAll('[data-dashboard-widget]')];
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const snap=v=>Math.round(Number(v||0)/8)*8;
 const zoneWidth=()=>Math.max(320,zone.clientWidth||0);
 const desktop=()=>window.matchMedia('(min-width:1001px)').matches&&zoneWidth()>=1040;
 let local={};
 for(const k of [key,...oldKeys]){try{const value=JSON.parse(localStorage.getItem(k)||'{}');if(value&&typeof value==='object'){local={...value,...local}}}catch{}}
 const boot=(window.DASHBOARD_LAYOUT_BOOT&&typeof window.DASHBOARD_LAYOUT_BOOT==='object'&&!Array.isArray(window.DASHBOARD_LAYOUT_BOOT))?window.DASHBOARD_LAYOUT_BOOT:{};
 let layout={...boot,...local};
 let storedWidth=0;try{storedWidth=Number(localStorage.getItem(widthKey)||0)}catch{}
 let saveTimer=0,active=null;
 function defaults(){
   const W=Math.max(920,zone.clientWidth||1200),gap=16;
   const left=Math.round(W*.28),center=Math.round(W*.45),right=Math.max(280,W-left-center-gap*2);
   const secondLeft=Math.round(W*.69),secondRight=Math.max(280,W-secondLeft-gap);
   return {
    'live-support':{x:0,y:0,w:left,h:336},
    'smart-workflow':{x:left+gap,y:0,w:center,h:336},
    'live-proforma-tracking':{x:left+center+gap*2,y:0,w:right,h:336},
    'recent-proformas':{x:0,y:352,w:secondLeft,h:392},
    'recent-customers':{x:secondLeft+gap,y:352,w:secondRight,h:188},
    'alerts':{x:secondLeft+gap,y:556,w:secondRight,h:188},
    'recent-activity':{x:0,y:760,w:W,h:264}
   };
 }
 function defaultFor(id,index){
   const d=defaults();return d[id]||{x:0,y:index*250,w:Math.max(360,zone.clientWidth||900),h:230};
 }
 function reflowLayout(){
   const W=zoneWidth();if(!desktop())return false;
   const rightEdges=Object.values(layout).map(item=>Number(item?.x||0)+Number(item?.w||0)).filter(Number.isFinite);
   const previous=storedWidth>=1040?storedWidth:Math.max(0,...rightEdges);
   if(previous<1040){storedWidth=W;try{localStorage.setItem(widthKey,String(W))}catch{}return false}
   const ratio=W/previous;
   if(Math.abs(1-ratio)<.025){storedWidth=W;try{localStorage.setItem(widthKey,String(W))}catch{}return false}
   for(const [id,item] of Object.entries(layout)){
     if(!item||!Number.isFinite(Number(item.x))||!Number.isFinite(Number(item.w)))continue;
     const nextWidth=clamp(snap(Number(item.w)*ratio),260,W);
     layout[id]={...item,x:clamp(snap(Number(item.x)*ratio),0,Math.max(0,W-nextWidth)),w:nextWidth};
   }
   storedWidth=W;try{localStorage.setItem(widthKey,String(W));localStorage.setItem(key,JSON.stringify(layout))}catch{}
   return true;
 }
 function normalize(id,index){
   const f=defaultFor(id,index),raw=layout[id]||{};
   const spatial=Number.isFinite(Number(raw.x))&&Number.isFinite(Number(raw.y))&&Number(raw.w)>=220&&Number(raw.h)>=140;
   const legacyBlank=Number(raw.x||0)===0&&Number(raw.y||0)===0&&Number(raw.w||420)===420&&Number(raw.h||220)===220;
   const source=spatial&&!legacyBlank?raw:f;
   const W=Math.max(320,zone.clientWidth||1200);
   const w=clamp(snap(source.w||f.w),280,W);
   const h=clamp(snap(source.h||f.h),160,1200);
   return {x:clamp(snap(source.x??f.x),0,Math.max(0,W-w)),y:Math.max(0,snap(source.y??f.y)),w,h,locked:Boolean(raw.locked),collapsed:false,visible:raw.visible!==false,order:Number(raw.order??index)};
 }
 function refreshHeight(){
   if(!desktop()){zone.style.removeProperty('height');return}
   const bottom=widgets().reduce((max,el,i)=>{const id=el.dataset.dashboardWidget,o=normalize(id,i);return Math.max(max,o.y+o.h)},0);
   zone.style.setProperty('height',Math.max(560,bottom+28)+'px','important');
 }
 function apply(){
   const list=widgets();
   document.documentElement.classList.remove('dash-v372-boot','dash-v76-boot','dash-v75-preload','dash-v76-preload');
   document.getElementById('dash-v372-early')?.remove();document.getElementById('dash-v76-early')?.remove();
   zone.classList.toggle('dashboard-freeboard-v372',desktop());
   zone.classList.toggle('dashboard-stack-v372',!desktop());
   list.forEach((el,i)=>{
     const id=el.dataset.dashboardWidget,o=normalize(id,i);layout[id]=o;el.hidden=!o.visible;
     el.classList.toggle('is-dashboard-locked-v372',o.locked);
     el.classList.remove('is-dashboard-collapsed-v372','is-collapsed','js-collapse-card');
     const lock=el.querySelector('[data-dash-v372="lock"]');
     if(lock){lock.textContent=o.locked?'🔒':'🔓';lock.title=o.locked?'Kartın kilidini aç':'Kartı kilitle'}
     if(desktop()){
       el.style.setProperty('left',o.x+'px','important');el.style.setProperty('top',o.y+'px','important');el.style.setProperty('width',o.w+'px','important');el.style.setProperty('height',o.h+'px','important');el.style.order='0';
     }else{
       for(const prop of ['left','top','width','height'])el.style.removeProperty(prop);el.style.order=String(o.order);
     }
   });
   document.querySelectorAll('[data-dashboard-widget-toggle]').forEach(button=>{const id=button.dataset.dashboardWidgetToggle,o=layout[id];const visible=!o||o.visible!==false;button.classList.toggle('is-active',visible);button.setAttribute('aria-pressed',String(visible));const state=button.querySelector('i');if(state)state.textContent=visible?'✓ Görünüyor':'＋ Ekle'});
   refreshHeight();
 }
 function persist(){
   try{localStorage.setItem(key,JSON.stringify(layout));if(desktop()){storedWidth=zoneWidth();localStorage.setItem(widthKey,String(storedWidth))}}catch{}
   clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await fetch('/dashboard/layout',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({_csrf:csrf,layout})})}catch{}},180);
 }
 function install(){
   widgets().forEach((el,i)=>{
     el.querySelectorAll('.dash-tools-v371,.dash-tools-v76,.dash-resize-v76,.dash-tools-v75,.dash-resize-v75,.card-collapse-toggle,[data-dash-v372="collapse"]').forEach(x=>x.remove());
     el.classList.remove('is-collapsed','is-dashboard-collapsed-v372','js-collapse-card');
     delete el.dataset.collapseReady57;
     let tools=el.querySelector('.dash-tools-v372');
     if(!tools){tools=document.createElement('div');tools.className='dash-tools-v372';tools.innerHTML='<button type="button" data-dash-v372="move" class="dash-move-v372" title="Kartı taşı" aria-label="Kartı taşı">⠿</button><button type="button" data-dash-v372="lock" title="Kartı kilitle" aria-label="Kartı kilitle">🔓</button><button type="button" data-dash-v372="reset" title="Kartı varsayılan boyutuna getir" aria-label="Kartı sıfırla">↺</button><button type="button" data-dash-v372="remove" class="dash-remove-v18" title="Kartı ana sayfadan kaldır" aria-label="Kartı ana sayfadan kaldır">×</button>'}
     /* Controls belong to the header grid, not to an absolute overlay. This
        keeps titles, summaries and navigation actions visible at every saved
        widget width. */
     const cardHead=el.querySelector(':scope > .card-head');
     if(cardHead&&tools.parentElement!==cardHead)cardHead.appendChild(tools);else if(!cardHead&&!tools.parentElement)el.appendChild(tools);
     if(!el.querySelector('.dash-resize-v372')){const grip=document.createElement('button');grip.type='button';grip.className='dash-resize-v372';grip.setAttribute('aria-label','Kartı boyutlandır');grip.title='Kartı boyutlandır';el.appendChild(grip)}
     const id=el.dataset.dashboardWidget;if(!layout[id])layout[id]=normalize(id,i);
   });apply();document.body?.classList.add('dashboard-v372-ready');
 }
 function resolveOverlap(id){
   const current=layout[id];if(!current)return;
   const hit=widgets().map(el=>el.dataset.dashboardWidget).filter(other=>other!==id).map(other=>layout[other]).filter(Boolean).find(o=>!(current.x+current.w<=o.x+12||o.x+o.w<=current.x+12||current.y+current.h<=o.y+12||o.y+o.h<=current.y+12));
   if(hit){current.y=snap(hit.y+hit.h+16);current.x=clamp(current.x,0,Math.max(0,(zone.clientWidth||1200)-current.w));}
 }
 zone.addEventListener('click',event=>{
   const btn=event.target.closest('[data-dash-v372]');if(!btn)return;
   const action=btn.dataset.dashV372;if(action==='move')return;
   event.preventDefault();event.stopPropagation();const el=btn.closest('[data-dashboard-widget]'),id=el?.dataset.dashboardWidget;if(!id)return;
   const o=normalize(id,widgets().indexOf(el));
   if(action==='lock')o.locked=!o.locked;
   if(action==='reset'){const f=defaultFor(id,widgets().indexOf(el));Object.assign(o,f,{locked:false,collapsed:false,visible:true})}
   if(action==='remove')o.visible=false;
   layout[id]=o;apply();persist();
 });
 document.addEventListener('click',event=>{
   const toggle=event.target.closest('[data-dashboard-widget-toggle]');
   if(toggle){event.preventDefault();const id=toggle.dataset.dashboardWidgetToggle,el=zone.querySelector(`[data-dashboard-widget="${CSS.escape(id)}"]`);if(!el)return;const o=normalize(id,widgets().indexOf(el));o.visible=!o.visible;layout[id]=o;apply();persist();return}
   if(event.target.closest('[data-dashboard-widget-reset-all]')){event.preventDefault();layout={};widgets().forEach((el,i)=>{const id=el.dataset.dashboardWidget;layout[id]={...defaultFor(id,i),locked:false,collapsed:false,visible:true,order:i}});apply();persist();}
 });
 zone.addEventListener('pointerdown',event=>{
   if(!desktop())return;
   const resize=event.target.closest('.dash-resize-v372');const moveButton=event.target.closest('[data-dash-v372="move"]');const cardHead=event.target.closest('.card-head');const blocked=event.target.closest('a,button,input,select,textarea,form,label,summary,details');const move=moveButton||(!blocked&&cardHead);if(!move&&!resize)return;
   const el=event.target.closest('[data-dashboard-widget]'),id=el?.dataset.dashboardWidget;if(!id)return;const o=normalize(id,widgets().indexOf(el));if(o.locked)return;
   event.preventDefault();event.stopPropagation();const pointerId=event.pointerId;event.target.setPointerCapture?.(pointerId);
   active={type:resize?'resize':'move',id,startX:event.clientX,startY:event.clientY,start:{...o},target:event.target,pointerId};el.classList.add(active.type==='move'?'is-dashboard-moving-v372':'is-dashboard-resizing-v372');
 });
 const onMove=event=>{if(!active||event.pointerId!==active.pointerId)return;event.preventDefault();const W=Math.max(320,zone.clientWidth||1200),dx=event.clientX-active.startX,dy=event.clientY-active.startY,o={...active.start};if(active.type==='move'){o.x=clamp(snap(active.start.x+dx),0,Math.max(0,W-o.w));o.y=Math.max(0,snap(active.start.y+dy))}else{o.w=clamp(snap(active.start.w+dx),280,Math.max(280,W-o.x));o.h=clamp(snap(active.start.h+dy),160,1200)}layout[active.id]={...layout[active.id],...o};apply()};
 const onEnd=event=>{if(!active||event.pointerId!==active.pointerId)return;const el=zone.querySelector(`[data-dashboard-widget="${CSS.escape(active.id)}"]`);el?.classList.remove('is-dashboard-moving-v372','is-dashboard-resizing-v372');if(active.type==='move')resolveOverlap(active.id);try{active.target.releasePointerCapture?.(active.pointerId)}catch{}active=null;apply();persist()};
 window.addEventListener('pointermove',onMove,{passive:false});window.addEventListener('pointerup',onEnd);window.addEventListener('pointercancel',onEnd);
 let resizeTimer=0;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const changed=reflowLayout();apply();if(changed)persist()},100)});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();


// v3.8.0 — ilk kurulum stüdyosu: tüm bölümler açık, canlı kontrol ve komut ön izlemesi.
(()=>{
 'use strict';
 const form=document.querySelector('[data-setup-studio-v375]');if(!form)return;
 const domain=form.querySelector('[name="domain"]'),port=form.querySelector('[name="port"]'),command=form.querySelector('[data-setup-command]'),health=form.querySelector('[data-setup-health-command]');
 const esc=v=>String(v||'').trim().replace(/[^a-zA-Z0-9._:-]/g,'');
 const sync=()=>{
   const d=esc(domain?.value)||'crm.firma.com',p=Number(port?.value)||3120;
   if(command)command.textContent=`BASE=/home/arteva/arteva-crm-erp-efsana36 PORT=${p} DOMAIN=${d} bash scripts/update-live.sh`;
   if(health)health.textContent=`BASE=/home/arteva/arteva-crm-erp-efsana36 PORT=${p} EXPECTED_VERSION=3.8.57 EXPECTED_RELEASE=v3.8.57-crmv1.45-web-import-upsert-ui-document-fix EXPECTED_BUILD=crmv1.45 bash scripts/health-check.sh`;
   const required=[...form.querySelectorAll('[data-setup-required]')],filled=required.filter(x=>String(x.value||'').trim()).length,total=required.length||1,pct=Math.round(filled/total*100);
   const meter=form.closest('.setup-wizard-v375')?.querySelector('[data-setup-progress]');if(meter){meter.style.setProperty('--setup-progress',pct+'%');meter.querySelector('b').textContent=pct+'%'}
 };
 form.addEventListener('input',sync);form.addEventListener('change',sync);sync();
 document.querySelectorAll('[data-copy-setup-command]').forEach(btn=>btn.addEventListener('click',async()=>{const target=document.querySelector(btn.dataset.copySetupCommand);if(!target)return;try{await navigator.clipboard.writeText(target.textContent||'');window.CRM_TOAST?.success?.('Komut panoya kopyalandı.')}catch{window.CRM_TOAST?.error?.('Komut kopyalanamadı.')}}));
})();

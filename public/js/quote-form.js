(()=>{
  'use strict';
  const cspNonce=document.currentScript?.nonce||'';
  const ready=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const boot=window.QUOTE_BOOTSTRAP||{};
    const form=document.getElementById('quoteForm');
    const tbody=document.getElementById('quoteItems');
    const itemsJson=document.getElementById('itemsJson');
    if(!form||!tbody||!itemsJson)return;

    const lang=boot.locale==='en'?'en':'tr';
    const L=lang==='en'?{
      image:'Image',code:'Product code',name:'Product name',description:'Description',search:'Click to select a saved product or start typing',browse:'Saved products · type to filter',brochure:'Download brochure',ce:'CE certificate',manual:'User manual',loading:'Loading saved products…',empty:'No matching saved product was found.',error:'Product list could not be loaded.',pick:'Select',moveUp:'Move up',moveDown:'Move down',copy:'Copy line',remove:'Remove line',alternative:'Mark / unmark as an alternative product',removeTitle:'Remove this product line?',removeText:'The selected line will be removed from the quotation.',cancel:'Cancel',confirm:'Remove',amount:'Amount',draft:'Draft auto-saved',customerCompany:'Company',contact:'Contact',phone:'Phone',email:'Email',tax:'Tax',address:'Address',failed:'Operation could not be completed.',customerFailed:'Customer could not be saved.',productFailed:'Product could not be saved.',duplicate:'This customer may already exist: ',fxApplied:'TCMB rate updated successfully.',fxManual:'Manual rate mode is active.',fxTry:'TRY selected. Exchange rate is fixed at 1.',fxFailed:'Current TCMB rate could not be retrieved. The existing rate was preserved.',fxStale:'Last available TCMB rate was used.',edit:'Edit',editLine:'Edit quotation line',productAdded:'Product was successfully added to the quotation line.',editProduct:'Edit product'
    }:{
      image:'Görsel',code:'Ürün kodu',name:'Ürün adı',description:'Açıklama',search:'Kayıtlı ürünü seçmek için tıklayın veya yazmaya başlayın',browse:'Kayıtlı ürünler · yazdıkça liste filtrelenir',brochure:'Broşürü İndir',ce:'CE Belgesi',manual:'Kullanma Kılavuzu',loading:'Kayıtlı ürünler yükleniyor…',empty:'Eşleşen kayıtlı ürün bulunamadı. Yazımı değiştirerek yeniden deneyin.',error:'Ürün listesi yüklenemedi.',pick:'Seç',moveUp:'Yukarı taşı',moveDown:'Aşağı taşı',copy:'Satırı kopyala',remove:'Satırı kaldır',alternative:'Muadil ürün olarak işaretle / işareti kaldır',removeTitle:'Bu ürün satırı kaldırılsın mı?',removeText:'Seçili satır proformadan kaldırılacaktır.',cancel:'Vazgeç',confirm:'Kaldır',amount:'Tutar',draft:'Taslak otomatik kaydedildi',customerCompany:'Firma',contact:'Yetkili',phone:'Telefon',email:'E-posta',tax:'Vergi',address:'Adres',failed:'İşlem tamamlanamadı.',customerFailed:'Müşteri kaydedilemedi.',productFailed:'Ürün kaydedilemedi.',duplicate:'Bu müşteri daha önce kaydedilmiş olabilir: ',fxApplied:'TCMB kuru güncellendi.',fxManual:'Manuel kur modu aktif.',fxTry:'TRY seçildi. Kur değeri 1 olarak sabitlendi.',fxFailed:'Güncel TCMB kuru alınamadı. Mevcut kur değeri korundu.',fxStale:'Son erişilebilen TCMB kuru kullanıldı.',edit:'Düzenle',editLine:'Proforma satırını düzenle',productAdded:'Ürün başarıyla satıra eklenmiştir.',editProduct:'Ürünü düzenle'
    };
    const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const num=v=>Number(String(v??0).replace(',','.'))||0;
    const money=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
    const fmt=v=>money(v).toLocaleString(lang==='en'?'en-GB':'tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
    const clone=v=>JSON.parse(JSON.stringify(v));
    const safeAssetUrl=v=>/^data:/i.test(String(v||'').trim())?'':String(v||'').trim();
    const sanitizeSnap=s=>({...s,image_url:safeAssetUrl(s?.image_url),brochure_url:safeAssetUrl(s?.brochure_url),ce_certificate_url:safeAssetUrl(s?.ce_certificate_url),manual_url:safeAssetUrl(s?.manual_url)});
    const sanitizeItem=x=>({...x,product_snapshot:sanitizeSnap(x?.product_snapshot||{})});
    const scope=[document.body?.dataset?.tenantId||'guest',document.body?.dataset?.userId||'guest'].map(encodeURIComponent).join(':');
    const draftKey='crm-quote-draft-v2:'+scope+':'+(boot.row?.id||'new');
    let quoteSaved=false,saveInFlight=false;
    function clearSavedDraftState(){
      try{
        localStorage.removeItem(draftKey);
        localStorage.removeItem('crm-quote-draft-new');
        localStorage.removeItem('crm-quote-draft-'+String(boot.row?.id||''));
        if(!boot.row){
          for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key&&key.startsWith('crm-quote-draft-v2:'+scope+':new'))localStorage.removeItem(key)}
        }
      }catch{}
    }

    const blankRow=()=>({product_id:'',product_snapshot:{},manual_text:'',quantity:1,unit:'ADET',unit_price:0,currency:'TRY',discount_type:'PERCENT',discount_value:0,vat_rate:20,include_total:1,show_image:1,show_description:1,show_technical:0,is_alternative:0,alternative_to_product_id:'',alternative_to_name:'',alternative_type:'EQUIVALENT',alternative_note:''});
    const isBlank=x=>!x?.product_id&&!String(x?.product_snapshot?.code||'').trim()&&!String(x?.product_snapshot?.name||x?.manual_text||'').trim();
    let storedDraft=null;
    if(!boot.row){try{storedDraft=JSON.parse(localStorage.getItem(draftKey)||'null');if(storedDraft&&Date.now()-Number(storedDraft.at||0)>7*24*60*60*1000){localStorage.removeItem(draftKey);storedDraft=null}}catch{storedDraft=null}}
    let items=(boot.row?.items||[]).map(x=>sanitizeItem({...blankRow(),...x,product_snapshot:x.product_snapshot||{}}));
    if(!boot.row&&Array.isArray(storedDraft?.items))items=storedDraft.items.map(x=>sanitizeItem({...blankRow(),...x,product_snapshot:x.product_snapshot||{}}));
    function ensureSingleBlank(){const used=items.filter(x=>!isBlank(x));items=[...used,blankRow()]}
    let lastActiveRow=-1;
    const firstBlankIndex=()=>items.findIndex(x=>isBlank(x));
    function focusRowField(i,selector='.line-name'){requestAnimationFrame(()=>{const row=tbody.querySelector(`tr[data-row-index="${i}"]`);const el=row?.querySelector(selector)||row?.querySelector('.line-name,textarea,input');if(row)row.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'});if(el){el.focus({preventScroll:true});try{el.select?.()}catch{}}})}
    function addBlankAfterActive(){
      const blank=firstBlankIndex();
      const active=lastActiveRow>=0?Math.min(lastActiveRow,Math.max(items.length-1,0)):Math.max(items.length-1,0);
      if(blank>-1){
        if(blank===active){focusRowField(blank);return;}
        const row=items.splice(blank,1)[0]||blankRow();
        const target=Math.min((blank<active?active:active+1),items.length);
        items.splice(target,0,row);
        render();focusRowField(target);draft();return;
      }
      const base=lastActiveRow>=0?Math.min(lastActiveRow+1,items.length):items.length;
      items.splice(base,0,blankRow());render();focusRowField(base);draft();
    }
    if(!items.length)items=[blankRow()]; else ensureSingleBlank();

    function calc(x){
      const qty=Math.max(0,num(x.quantity));
      const price=Math.max(0,num(x.unit_price));
      const gross=money(qty*price);
      const d=Math.max(0,num(x.discount_value));
      const discount=money(x.discount_type==='AMOUNT'?Math.min(gross,d):gross*Math.min(100,d)/100);
      const lineNet=money(Math.max(0,gross-discount));
      const vat=money(lineNet*Math.max(0,num(x.vat_rate))/100);
      return {...x,line_net:lineNet,line_vat:vat,line_total:money(lineNet+vat),line_discount:discount};
    }
    function totals(){
      items=items.map(calc);
      const included=items.filter(x=>Number(x.include_total??1)===1&&!isBlank(x));
      const baseSubtotal=money(included.reduce((a,x)=>a+x.line_net,0));
      const lineDiscount=money(included.reduce((a,x)=>a+x.line_discount,0));
      const quoteDiscountType=String(form.elements.namedItem('quote_discount_type')?.value||'PERCENT').toUpperCase()==='AMOUNT'?'AMOUNT':'PERCENT';
      const quoteDiscountValue=Math.max(0,num(form.elements.namedItem('quote_discount_value')?.value));
      const quoteDiscount=money(Math.min(baseSubtotal,quoteDiscountType==='AMOUNT'?quoteDiscountValue:baseSubtotal*Math.min(100,quoteDiscountValue)/100));
      const baseCents=Math.max(0,Math.round(baseSubtotal*100));
      let remainingBaseCents=baseCents,remainingDiscountCents=Math.max(0,Math.round(quoteDiscount*100)),vatCents=0;
      included.forEach((x,index)=>{
        const rowNetCents=Math.max(0,Math.round(num(x.line_net)*100));
        let rowDiscountCents=0;
        if(remainingDiscountCents>0&&remainingBaseCents>0){
          rowDiscountCents=index===included.length-1?remainingDiscountCents:Math.min(remainingDiscountCents,Math.round(remainingDiscountCents*rowNetCents/remainingBaseCents));
        }
        const taxableCents=Math.max(0,rowNetCents-rowDiscountCents);
        vatCents+=Math.round(taxableCents*Math.max(0,num(x.vat_rate))/100);
        remainingBaseCents=Math.max(0,remainingBaseCents-rowNetCents);
        remainingDiscountCents=Math.max(0,remainingDiscountCents-rowDiscountCents);
      });
      const subtotal=money(baseSubtotal-quoteDiscount);
      const vat=money(vatCents/100);
      const grand=money(subtotal+vat);
      const discount=money(lineDiscount+quoteDiscount);
      const gross=money(subtotal+discount);
      const vatRates=[...new Set(included.map(x=>num(x.vat_rate)).filter(v=>Number.isFinite(v)))];
      const subtotalLabel=document.getElementById('subtotalLabel');
      if(subtotalLabel) subtotalLabel.textContent=lang==='en'?'Total':'Toplam';
      const vatTotalLabel=document.getElementById('vatTotalLabel');
      if(vatTotalLabel) vatTotalLabel.textContent=vatRates.length===1?(lang==='en'?`VAT %${vatRates[0]}`:`KDV %${vatRates[0]}`):(lang==='en'?'VAT':'KDV');
      document.getElementById('subtotal').textContent=fmt(discount>0?gross:subtotal);
      document.getElementById('vatTotal').textContent=fmt(vat);
      const discountTotalEl=document.getElementById('discountTotal');
      if(discountTotalEl){discountTotalEl.textContent=fmt(discount);discountTotalEl.classList.toggle('is-discount-red',discount>0)}
      document.querySelector('.quote-total')?.classList.toggle('has-discount',discount>0);
      const quoteDiscountApplied=document.getElementById('quoteDiscountApplied');
      const quoteDiscountCurrency=document.getElementById('quoteDiscountCurrency');
      const quoteGlobalDiscountStatus=document.getElementById('quoteGlobalDiscountStatus');
      const quoteGlobalDiscountPanel=document.getElementById('quoteGlobalDiscountPanel');
      if(quoteDiscountApplied)quoteDiscountApplied.textContent=fmt(quoteDiscount);
      if(quoteDiscountCurrency)quoteDiscountCurrency.textContent=form.elements.namedItem('currency')?.value||'TRY';
      if(quoteGlobalDiscountStatus)quoteGlobalDiscountStatus.textContent=quoteDiscount>0?(lang==='en'?'Applied':'Uygulandı'):(lang==='en'?'Optional':'İsteğe bağlı');
      quoteGlobalDiscountPanel?.classList.toggle('has-discount',quoteDiscount>0);
      document.getElementById('grandTotal').textContent=fmt(grand);
      const currency=form.elements.namedItem('currency')?.value||'TRY';
      const fx=Math.max(0,num(form.elements.namedItem('fx_rate')?.value)||1);
      document.getElementById('grandCurrency').textContent=currency;
      document.querySelectorAll('[data-unit-price-currency]').forEach(el=>{el.textContent=currency});
      const showTry=String(form.elements.namedItem('show_try_total')?.value??'1')!=='0';
      document.getElementById('tryEquivalent').textContent=(showTry&&currency!=='TRY')?'≈ '+fmt(grand*fx)+' TRY':'';
      tbody.querySelectorAll('[data-line-net]').forEach(el=>{const row=items[Number(el.dataset.lineNet)];el.textContent=fmt(row?.line_net||0)});
      itemsJson.value=JSON.stringify(items.filter(x=>!isBlank(x)).map(sanitizeItem));
    }
    function collectDraftFields(){const fields={},identityFields=new Set(['id','original_quote_id','form_instance_id','record_version']);for(const el of [...form.elements]){if(!el.name||identityFields.has(el.name)||['_csrf','items_json'].includes(el.name)||['file','submit','button'].includes(el.type))continue;if(el.type==='checkbox'||el.type==='radio')fields[el.name]=el.checked?el.value:'';else fields[el.name]=el.value}return fields}
    function restoreDraftFields(){if(boot.row||!storedDraft?.fields)return;const identityFields=new Set(['id','original_quote_id','form_instance_id','record_version']);for(const [name,value] of Object.entries(storedDraft.fields)){const el=form.elements.namedItem(name);if(!el||identityFields.has(name))continue;if(el instanceof RadioNodeList){[...el].forEach(x=>{x.checked=x.value===value})}else if(el.type==='checkbox'||el.type==='radio')el.checked=el.value===value||value==='on'||value===true;else el.value=value??''}}
    let draftTimer;
    function saveDraft(){try{localStorage.setItem(draftKey,JSON.stringify({items:items.map(sanitizeItem),fields:collectDraftFields(),at:Date.now()}))}catch{}const el=document.getElementById('draftState');if(el)el.textContent=L.draft+': '+new Date().toLocaleTimeString(lang==='en'?'en-GB':'tr-TR')}
    function draft(){clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,450)}
    const confirmClearQuoteForm=document.getElementById('confirmClearQuoteForm');
    confirmClearQuoteForm?.addEventListener('click',()=>{
      try{localStorage.removeItem(draftKey)}catch{}
      quoteSaved=true;
      clearTimeout(draftTimer);
      confirmClearQuoteForm.disabled=true;
      confirmClearQuoteForm.innerHTML=lang==='en'?'<span aria-hidden="true">🧹</span> Clearing…':'<span aria-hidden="true">🧹</span> Temizleniyor…';
      window.location.replace('/quotes/new?fresh=1');
    });

    const portal=document.createElement('div');
    portal.id='quoteProductPicker';
    portal.className='quote-product-picker';
    portal.setAttribute('role','listbox');
    portal.setAttribute('aria-label',lang==='en'?'Saved products':'Kayıtlı ürünler');
    document.body.append(portal);
    let anchor=null,activeIndex=-1,requestNo=0,searchTimer,pickerSearchTimer,pickerAbort=null,pickerData=[];
    function hidePicker(){clearTimeout(pickerSearchTimer);pickerAbort?.abort();pickerAbort=null;portal.classList.remove('is-open');portal.innerHTML='';anchor=null;activeIndex=-1;pickerData=[]}
    function placePicker(){
      if(!anchor)return;
      const r=anchor.getBoundingClientRect();
      const mobile=window.innerWidth<=760;
      const width=Math.min(780,Math.max(280,window.innerWidth-20));
      const left=mobile?10:Math.max(10,Math.min(r.left,window.innerWidth-width-10));
      const roomBelow=window.innerHeight-r.bottom-12;
      const desiredHeight=mobile?Math.min(520,Math.max(300,window.innerHeight*.62)):390;
      const top=roomBelow>=Math.min(300,desiredHeight)?r.bottom+7:Math.max(mobile?58:10,r.top-desiredHeight-7);
      Object.assign(portal.style,{left:left+'px',top:top+'px',width:width+'px',maxHeight:Math.min(desiredHeight,Math.max(220,window.innerHeight-top-10))+'px'});
    }
    async function fetchProducts(q='',signal){
      const qs='?q='+encodeURIComponent(q)+'&limit=60&_ts='+Date.now();
      const urls=['/products/picker-json'+qs,'/products/lookup-json'+qs,'/products/api/search'+qs];
      let last;
      for(const url of urls){
        try{
          const r=await fetch(url,{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store',signal});
          if(!r.ok)throw new Error('HTTP '+r.status);
          const body=await r.json();
          const rows=Array.isArray(body)?body:Array.isArray(body?.items)?body.items:null;
          if(rows)return rows;
          throw new Error('INVALID_PRODUCT_RESPONSE');
        }catch(e){if(e?.name==='AbortError')throw e;last=e}
      }
      throw last||new Error('PRODUCT_LOOKUP_FAILED');
    }
    function pickerOptions(rows){
      return rows.map((p,i)=>`<button type="button" class="quote-product-option" data-product-index="${i}" role="option">
        <span class="quote-product-option__thumb">${p.image_url?`<img loading="lazy" src="${esc(p.image_url)}" alt="">`:'<span>◻</span>'}</span>
        <span class="quote-product-option__body"><span class="quote-product-option__title">${esc(p.name||'-')}</span><span class="quote-product-option__meta"><b>${esc(p.code||'-')}</b>${[p.brand,p.model,p.category].filter(Boolean).length?' · '+esc([p.brand,p.model,p.category].filter(Boolean).join(' · ')):''}${p.origin_country?' · Menşei: '+esc(p.origin_country):''}</span><span class="quote-product-option__desc">${esc(p.short_description||'')}</span></span>
        <span class="quote-product-option__price">${fmt(p.sale_price||0)} ${esc(p.currency||'TRY')}<small>${esc(p.unit||'ADET')}</small></span>
      </button>`).join('');
    }
    function ensurePickerShell(query=''){
      let search=portal.querySelector('[data-picker-search]');
      if(search)return search;
      portal.innerHTML=`<div class="quote-product-picker__head"><span class="quote-product-picker__head-copy"><b>${esc(L.browse)}</b><small>${esc(lang==='en'?'Newest records are listed first':'En güncel kayıtlar önce listelenir')}</small></span><span data-picker-count>0</span></div>
      <label class="quote-product-picker__search"><span aria-hidden="true">⌕</span><input type="search" data-picker-search autocomplete="off" value="${esc(query)}" placeholder="${esc(lang==='en'?'Search by product code or name':'Ürün kodu veya adıyla ara')}"><button type="button" data-picker-clear aria-label="${esc(lang==='en'?'Clear search':'Aramayı temizle')}" title="${esc(lang==='en'?'Clear search':'Aramayı temizle')}">×</button></label>
      <div class="quote-product-picker__progress" data-picker-progress aria-live="polite"></div><div class="quote-product-picker__results" data-picker-results></div>`;
      search=portal.querySelector('[data-picker-search]');
      search?.addEventListener('click',e=>e.stopPropagation());
      search?.addEventListener('input',()=>{clearTimeout(pickerSearchTimer);pickerSearchTimer=setTimeout(()=>refreshPicker(search.value.trim(),true),160)});
      search?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();hidePicker()}else if(e.key==='Enter'){e.preventDefault();clearTimeout(pickerSearchTimer);refreshPicker(search.value.trim(),true)}});
      portal.querySelector('[data-picker-clear]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(search)search.value='';clearTimeout(pickerSearchTimer);refreshPicker('',true)});
      return search;
    }
    function bindPickerOptions(){
      portal.querySelectorAll('[data-product-index]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectProduct(pickerData[Number(btn.dataset.productIndex)])}));
    }
    function focusPickerSearch(search){
      if(!search)return;
      search.focus({preventScroll:true});
      try{search.setSelectionRange(search.value.length,search.value.length)}catch{}
    }
    async function refreshPicker(query='',focusSearch=false){
      if(!anchor)return;
      placePicker();portal.classList.add('is-open');
      const search=ensurePickerShell(query);
      if(search&&document.activeElement!==search)search.value=query;
      const progress=portal.querySelector('[data-picker-progress]');
      const count=portal.querySelector('[data-picker-count]');
      if(progress){progress.textContent=esc(L.loading);progress.classList.add('is-loading')}
      if(focusSearch)focusPickerSearch(search);
      pickerAbort?.abort();pickerAbort=new AbortController();
      const signal=pickerAbort.signal;
      const token=++requestNo;
      try{
        const rows=await fetchProducts(query,signal);
        if(token!==requestNo||!anchor||signal.aborted)return;
        pickerData=rows;
        const results=portal.querySelector('[data-picker-results]');
        if(results)results.innerHTML=rows.length?pickerOptions(rows):`<div class="quote-product-picker__state">${esc(L.empty)}</div>`;
        if(count)count.textContent=String(rows.length);
        if(progress){progress.textContent='';progress.classList.remove('is-loading')}
        bindPickerOptions();placePicker();
        if(focusSearch)focusPickerSearch(search);
      }catch(e){
        if(e?.name==='AbortError'||token!==requestNo)return;
        const results=portal.querySelector('[data-picker-results]');
        if(results)results.innerHTML=`<div class="quote-product-picker__state quote-product-picker__state--error">${esc(L.error)}<small>${esc(e?.message||'PRODUCT_LOOKUP_FAILED')}</small></div>`;
        if(progress){progress.textContent='';progress.classList.remove('is-loading')}
      }
    }
    function openPicker(input,index){
      const changed=anchor!==input||activeIndex!==index;
      anchor=input;activeIndex=index;placePicker();portal.classList.add('is-open');
      if(changed)portal.innerHTML='';
      refreshPicker(input.value.trim(),false);
    }
    function selectProduct(p){
      if(activeIndex<0||!p)return;
      items[activeIndex]={...blankRow(),...items[activeIndex],product_id:p.id,product_snapshot:{...p},manual_text:p.name||'',unit:p.unit||'ADET',unit_price:num(p.sale_price),currency:p.currency||'TRY',vat_rate:p.vat_rate??20};
      ensureSingleBlank();hidePicker();render();draft();
    }

    function imageCell(snap,i,editable=false){
      const origin=String(snap.origin_country||'').trim();
      const altBadge=Number(items[i]?.is_alternative||0)===1?'<b class="quote-alternative-badge">MUADİL</b>':'';
      const picture=snap.image_url?`<img loading="lazy" src="${esc(snap.image_url)}" alt="">`:`<span>${esc(L.image)}</span>`;
      const edit=editable?`<button type="button" class="quote-line-image-edit" data-row-action="edit" data-row="${i}" data-tooltip="${esc(L.editProduct||L.editLine)}" title="${esc(L.editProduct||L.editLine)}" aria-label="${esc(L.editProduct||L.editLine)}"><span aria-hidden="true">✎</span></button>`:'';
      const alternative=editable?`<button type="button" class="quote-line-image-edit quote-line-alternative-toggle ${Number(items[i]?.is_alternative||0)===1?'is-active':''}" data-row-action="alternative" data-row="${i}" data-tooltip="${esc(L.alternative)}" title="${esc(L.alternative)}" aria-label="${esc(L.alternative)}"><span aria-hidden="true">M</span></button>`:'';
      const tools=editable?`<span class="quote-line-image-tools">${edit}${alternative}</span>`:'';
      return `<span class="quote-line-image-stack">${altBadge}<span class="quote-line-image">${picture}</span>${origin?`<small class="quote-line-origin">${esc(origin)}</small>`:''}${tools}</span>`;
    }
    function docLinks(s){return [
      s.brochure_url?`<a class="brochure-link brochure-link--pdf" target="_blank" rel="noopener" href="${esc(s.brochure_url)}">📄 ${esc(L.brochure)}</a>`:'',
      s.ce_certificate_url?`<a class="brochure-link brochure-link--ce" target="_blank" rel="noopener" href="${esc(s.ce_certificate_url)}">✅ ${esc(L.ce)}</a>`:'',
      s.manual_url?`<a class="brochure-link brochure-link--manual" target="_blank" rel="noopener" href="${esc(s.manual_url)}">📘 ${esc(L.manual)}</a>`:''
    ].filter(Boolean).join('');}
    function rowHtml(x,i){
      const s=x.product_snapshot||{}; const line=calc(x);const altOf=String(x.alternative_to_name||'').trim();const altPill=Number(x.is_alternative||0)===1?`<span class="quote-alternative-pill-v371">${esc((altOf||'ANA ÜRÜN').toLocaleUpperCase('tr-TR'))} MUADİLİ</span>`:'';
      return `<tr data-row-index="${i}" class="${isBlank(x)?'is-empty-row':'is-filled-row'}">
        <td class="quote-image-cell">${imageCell(s,i,!isBlank(x))}</td>
        <td class="quote-product-code"><input data-product-search="1" data-row="${i}" data-kind="code" autocomplete="off" placeholder="${esc(L.code)}" value="${esc(s.code||'')}" title="${esc(s.code||'')}">${s.gtip_no?`<small class="quote-line-gtip">GTİP: ${esc(s.gtip_no)}</small>`:''}${docLinks(s)}</td>
        <td class="quote-product-main-cell"><div class="quote-product-main-stack">${altPill}<div class="quote-product-name__wrap"><div class="line-resize-box line-resize-box--name"><textarea data-no-global-grow="1" data-line-resizable="1" data-product-search="1" data-row="${i}" data-kind="name" class="line-name" rows="2" data-min-height="64" data-max-height="1200" autocomplete="off" placeholder="${esc(L.search)}" title="${esc(s.name||x.manual_text||'')}">${esc(s.name||x.manual_text||'')}</textarea></div><button type="button" class="quote-pick-btn" data-open-picker="${i}" title="${esc(L.pick)}" aria-label="${esc(L.pick)}">🔎</button></div><div class="line-resize-box line-resize-box--description"><textarea data-no-global-grow="1" data-line-resizable="1" data-field="short_description" data-row="${i}" class="line-description" rows="5" data-min-height="112" data-max-height="1800" placeholder="${esc(L.description)}">${esc(s.short_description||'')}</textarea></div>${Number(x.is_alternative||0)===1?`<div class="quote-alternative-info-v370"><b>MUADİL ÜRÜN</b><span>Muadili olduğu ürün: ${esc(x.alternative_to_name||'Belirtilmedi')}</span>${x.alternative_note?`<small>${esc(x.alternative_note)}</small>`:''}</div>`:''}</div></td>
        <td class="quote-qty-cell"><input class="quote-num-input" data-field="quantity" data-row="${i}" type="number" min="0" step="0.001" value="${esc(x.quantity??1)}" title="${esc(x.quantity??1)}"></td>
        <td class="quote-unit-cell"><input class="quote-unit-input" data-field="unit" data-row="${i}" value="${esc(x.unit||'ADET')}" title="${esc(x.unit||'ADET')}"></td>
        <td class="quote-price-cell"><input class="quote-money-input" data-field="unit_price" data-row="${i}" type="number" min="0" step="0.001" value="${esc(x.unit_price??0)}" title="${esc(x.unit_price??0)}"></td>
        <td class="quote-discount-cell ${num(x.discount_value)>0?'has-discount':''}"><div class="discount-box quote-discount-combo"><select data-field="discount_type" data-row="${i}" title="${x.discount_type==='AMOUNT'?esc(L.amount):'%'}"><option value="PERCENT" ${x.discount_type!=='AMOUNT'?'selected':''}>%</option><option value="AMOUNT" ${x.discount_type==='AMOUNT'?'selected':''}>${esc(L.amount)}</option></select><input class="quote-discount-input" data-field="discount_value" data-row="${i}" type="number" min="0" step="0.001" value="${esc(x.discount_value??0)}" title="${esc(x.discount_value??0)}"></div></td>
        <td class="quote-vat-cell"><input class="quote-vat-input" data-field="vat_rate" data-row="${i}" type="number" min="0" step="0.01" value="${esc(x.vat_rate??20)}" title="${esc(x.vat_rate??20)}"></td>
        <td class="quote-line-net"><b data-line-net="${i}" title="${fmt(line.line_net)} ${esc(form.currency?.value||x.currency||'')}">${fmt(line.line_net)}</b></td>
        <td class="quote-row-actions-cell"><div class="quote-inline-actions"><button type="button" class="quote-inline-action is-move" data-row-action="up" data-row="${i}" title="${esc(L.moveUp)}" aria-label="${esc(L.moveUp)}"><span aria-hidden="true">↑</span></button><button type="button" class="quote-inline-action is-move" data-row-action="down" data-row="${i}" title="${esc(L.moveDown)}" aria-label="${esc(L.moveDown)}"><span aria-hidden="true">↓</span></button><button type="button" class="quote-inline-action is-copy" data-row-action="copy" data-row="${i}" title="${esc(L.copy)}" aria-label="${esc(L.copy)}"><span aria-hidden="true">⧉</span></button><button type="button" class="quote-inline-action is-delete" data-row-action="remove" data-row="${i}" title="${esc(L.remove)}" aria-label="${esc(L.remove)}"><span aria-hidden="true">×</span></button></div>${Number(x.is_alternative||0)===1?`<label class="quote-alt-total-toggle-v370"><input type="checkbox" data-field="include_total" data-row="${i}" ${Number(x.include_total??0)===1?'checked':''}><span>Toplama dahil</span></label>`:''}</td>
      </tr>`;
    }
    function growLineTextarea(el){
      if(!el)return;
      const min=Number(el.dataset.minHeight||0)||(el.classList.contains('line-name')?64:112);
      const max=Number(el.dataset.maxHeight||0)||(el.classList.contains('line-name')?1200:1800);
      const computed=Number.parseFloat(getComputedStyle(el).height||'0')||0;
      const previous=Number.parseFloat(el.style.height||'0')||computed||0;
      if(el.dataset.manualResize==='1'){
        el.style.height=Math.max(min,previous)+'px';
        el.style.overflowY='auto';
        return;
      }
      el.style.height='auto';
      const full=Math.ceil(el.scrollHeight+10);
      const next=Math.max(min,Math.min(max,Math.max(full,previous)));
      el.style.height=next+'px';
      el.style.overflowY='auto';
    }
    function growTextareas(){tbody.querySelectorAll('.line-description,.line-name').forEach(growLineTextarea)}
    function render(){
      tbody.innerHTML=items.map(rowHtml).join('');
      growTextareas();
      requestAnimationFrame(growTextareas);
      setTimeout(growTextareas,60);
      totals();
      document.dispatchEvent(new CustomEvent('crm:sync-fields'));
      setTimeout(growTextareas,120);
    }

    const lineEditModal=document.getElementById('lineEditModal');
    const lineEditForm=document.getElementById('lineEditForm');
    const editGet=id=>document.getElementById(id);
    let lineEditPreviewObjectUrl='';
    function clearLineEditPreviewObjectUrl(){if(lineEditPreviewObjectUrl){URL.revokeObjectURL(lineEditPreviewObjectUrl);lineEditPreviewObjectUrl=''}}
    function setLineEditPreview(src=''){
      const img=editGet('lineEditImagePreview'),empty=editGet('lineEditImageEmpty');
      if(img){img.src=src||'';img.hidden=!src;requestAnimationFrame(()=>window.CRM_PRODUCT_IMAGE_FIT?.(img))}if(empty)empty.hidden=Boolean(src);
    }
    function openLineEditor(index){
      const x=items[index];if(!x)return;const snap=x.product_snapshot||{};
      clearLineEditPreviewObjectUrl();editGet('lineEditIndex').value=String(index);editGet('lineEditCode').value=snap.code||'';if(editGet('lineEditGtip'))editGet('lineEditGtip').value=snap.gtip_no||'';if(editGet('lineEditOrigin'))editGet('lineEditOrigin').value=snap.origin_country||'';editGet('lineEditName').value=snap.name||x.manual_text||'';editGet('lineEditDescription').value=[snap.short_description,snap.technical_description].filter(Boolean).join('\n');editGet('lineEditPrice').value=String(x.unit_price??snap.sale_price??0);editGet('lineEditCurrency').value=x.currency||snap.currency||'TRY';editGet('lineEditUnit').value=x.unit||snap.unit||'ADET';editGet('lineEditVat').value=String(x.vat_rate??snap.vat_rate??20);editGet('lineEditImageUrl').value=safeAssetUrl(snap.image_url);editGet('lineEditBrochureUrl').value=safeAssetUrl(snap.brochure_url);if(editGet('lineEditCeCertificateUrl'))editGet('lineEditCeCertificateUrl').value=safeAssetUrl(snap.ce_certificate_url);if(editGet('lineEditManualUrl'))editGet('lineEditManualUrl').value=safeAssetUrl(snap.manual_url);if(editGet('lineEditImage'))editGet('lineEditImage').value='';if(editGet('lineEditBrochure'))editGet('lineEditBrochure').value='';if(editGet('lineEditCeCertificate'))editGet('lineEditCeCertificate').value='';if(editGet('lineEditUserManual'))editGet('lineEditUserManual').value='';setLineEditPreview(safeAssetUrl(snap.image_url));lineEditModal?.classList.add('is-open');setTimeout(()=>window.CRM_AUTO_GROW?.refresh(lineEditModal||document),40);
    }
    editGet('lineEditImageUrl')?.addEventListener('input',e=>{if(!editGet('lineEditImage')?.files?.length)setLineEditPreview(safeAssetUrl(e.target.value))});
    editGet('lineEditImage')?.addEventListener('change',e=>{clearLineEditPreviewObjectUrl();const file=e.target.files?.[0];if(!file){setLineEditPreview(safeAssetUrl(editGet('lineEditImageUrl')?.value));return}lineEditPreviewObjectUrl=URL.createObjectURL(file);setLineEditPreview(lineEditPreviewObjectUrl)});
    lineEditForm?.addEventListener('submit',async e=>{e.preventDefault();const i=Number(editGet('lineEditIndex')?.value);if(!Number.isInteger(i)||!items[i])return;const button=e.currentTarget.querySelector('button[type="submit"]');if(button)button.disabled=true;try{const body=new FormData();body.append('product_id',items[i].product_id||'');body.append('code',editGet('lineEditCode').value.trim());body.append('gtip_no',editGet('lineEditGtip')?.value?.trim()||'');body.append('origin_country',editGet('lineEditOrigin')?.value?.trim()||'');body.append('name',editGet('lineEditName').value.trim());body.append('description_combined',editGet('lineEditDescription').value);body.append('sale_price',editGet('lineEditPrice').value||'0');body.append('currency',editGet('lineEditCurrency').value||'TRY');body.append('unit',editGet('lineEditUnit').value||'ADET');body.append('vat_rate',editGet('lineEditVat').value||'20');body.append('image_url',safeAssetUrl(editGet('lineEditImageUrl').value));body.append('brochure_url',safeAssetUrl(editGet('lineEditBrochureUrl').value));body.append('ce_certificate_url',safeAssetUrl(editGet('lineEditCeCertificateUrl')?.value));body.append('manual_url',safeAssetUrl(editGet('lineEditManualUrl')?.value));const image=editGet('lineEditImage')?.files?.[0],brochure=editGet('lineEditBrochure')?.files?.[0],ce=editGet('lineEditCeCertificate')?.files?.[0],manual=editGet('lineEditUserManual')?.files?.[0];if(image)body.append('image',image);if(brochure)body.append('brochure',brochure);if(ce)body.append('ce_certificate',ce);if(manual)body.append('user_manual',manual);const response=await fetch('/products/line-update',{method:'POST',headers:{Accept:'application/json','x-csrf-token':boot.csrfToken||''},body,credentials:'same-origin'});const updated=await response.json().catch(()=>({message:L.failed}));if(!response.ok)throw updated;const snap=sanitizeSnap({...items[i].product_snapshot,...updated});delete snap.updated_master;items[i].product_id=updated.id||items[i].product_id;items[i].product_snapshot=snap;items[i].manual_text=snap.name;items[i].unit_price=num(updated.sale_price??editGet('lineEditPrice').value);items[i].currency=updated.currency||editGet('lineEditCurrency').value||'TRY';items[i].unit=updated.unit||editGet('lineEditUnit').value||'ADET';items[i].vat_rate=num(updated.vat_rate??editGet('lineEditVat').value);clearLineEditPreviewObjectUrl();lineEditModal?.classList.remove('is-open');render();draft()}catch(x){alert(x.message||L.productFailed)}finally{if(button)button.disabled=false}});

    function askRemove(){return new Promise(resolve=>{document.getElementById('lineRemoveConfirm')?.remove();const host=document.createElement('div');host.id='lineRemoveConfirm';host.className='confirm-toast';host.innerHTML=`<div class="confirm-toast__card"><b>${esc(L.removeTitle)}</b><span>${esc(L.removeText)}</span><div><button type="button" class="btn btn--sm" data-no>${esc(L.cancel)}</button><button type="button" class="btn btn--sm btn--danger" data-yes>${esc(L.confirm)}</button></div></div>`;document.body.append(host);const done=v=>{host.remove();resolve(v)};host.querySelector('[data-no]').onclick=()=>done(false);host.querySelector('[data-yes]').onclick=()=>done(true);host.onclick=e=>{if(e.target===host)done(false)}})}

    tbody.addEventListener('focusin',e=>{const rowEl=e.target.closest('[data-row]');if(rowEl&&Number.isInteger(Number(rowEl.dataset.row)))lastActiveRow=Number(rowEl.dataset.row);const input=e.target.closest('[data-product-search]');if(input)openPicker(input,Number(input.dataset.row))});
    tbody.addEventListener('click',e=>{
      const open=e.target.closest('[data-open-picker]');if(open){e.preventDefault();e.stopPropagation();const i=Number(open.dataset.openPicker),input=tbody.querySelector(`[data-product-search][data-row="${i}"][data-kind="name"]`);if(input){input.focus();openPicker(input,i)}return}
      const input=e.target.closest('[data-product-search]');if(input){e.stopPropagation();openPicker(input,Number(input.dataset.row));return}
      const action=e.target.closest('[data-row-action]');if(!action)return;
      e.preventDefault();const i=Number(action.dataset.row),type=action.dataset.rowAction;
      if(type==='edit'){if(isBlank(items[i])){const pm=document.getElementById('productModal');pm?.classList.add('is-open');setTimeout(()=>window.CRM_AUTO_GROW?.refresh(pm||document),40)}else openLineEditor(i);return}
      if(type==='up'&&i>0)[items[i-1],items[i]]=[items[i],items[i-1]];
      if(type==='down'&&i<items.length-1)[items[i+1],items[i]]=[items[i],items[i+1]];
      if(type==='copy'&&!isBlank(items[i]))items.splice(i+1,0,clone(items[i]));
      if(type==='alternative'&&!isBlank(items[i])){const next=Number(items[i].is_alternative||0)!==1;items[i].is_alternative=next?1:0;if(next){const main=items[i-1]&&!isBlank(items[i-1])?items[i-1]:items.find((r,n)=>n!==i&&!isBlank(r));items[i].alternative_to_product_id=main?.product_id||'';items[i].alternative_to_name=main?.product_snapshot?.name||main?.manual_text||'';items[i].alternative_type=items[i].alternative_type||'EQUIVALENT';items[i].include_total=Number(items[i].include_total??0)}else{items[i].alternative_to_product_id='';items[i].alternative_to_name='';items[i].alternative_note='';items[i].include_total=1}}
      if(type==='remove'){askRemove().then(ok=>{if(ok){items.splice(i,1);ensureSingleBlank();render();draft()}});return}
      ensureSingleBlank();render();draft();
    });
    // v3.3.96 — Ürün adı/açıklama için sağlam mouse/touch büyütme: tutamacı sürükle, alan aşağı doğru uzar.
    let quoteLineResizeDrag=null;
    function startLineResize(e){
      const grip=e.target.closest?.('.line-resize-grip');
      if(!grip)return;
      const box=grip.closest('.line-resize-box');
      const ta=box?.querySelector('textarea.line-name,textarea.line-description');
      if(!ta)return;
      e.preventDefault();e.stopPropagation();
      ta.dataset.manualResize='1';
      const p=e.touches?.[0]||e;
      const r=ta.getBoundingClientRect();
      quoteLineResizeDrag={ta,startY:p.clientY,startH:r.height,min:Number(ta.dataset.minHeight||0)||60,max:Number(ta.dataset.maxHeight||0)||2600};
      ta.style.height=r.height+'px';
      ta.style.overflowY='auto';
      document.body.classList.add('quote-line-resizing');
    }
    function moveLineResize(e){
      if(!quoteLineResizeDrag)return;
      e.preventDefault();
      const p=e.touches?.[0]||e;
      const next=Math.max(quoteLineResizeDrag.min,Math.min(quoteLineResizeDrag.max,quoteLineResizeDrag.startH+(p.clientY-quoteLineResizeDrag.startY)));
      quoteLineResizeDrag.ta.style.height=next+'px';
      quoteLineResizeDrag.ta.style.overflowY='auto';
    }
    function endLineResize(){
      if(!quoteLineResizeDrag)return;
      quoteLineResizeDrag.ta.dataset.manualResize='1';
      quoteLineResizeDrag=null;
      document.body.classList.remove('quote-line-resizing');
      draft();
    }
    tbody.addEventListener('pointerdown',startLineResize,true);
    tbody.addEventListener('mousedown',startLineResize,true);
    tbody.addEventListener('touchstart',startLineResize,{passive:false,capture:true});
    document.addEventListener('pointermove',moveLineResize,true);
    document.addEventListener('mousemove',moveLineResize,true);
    document.addEventListener('touchmove',moveLineResize,{passive:false,capture:true});
    document.addEventListener('pointerup',endLineResize,true);
    document.addEventListener('mouseup',endLineResize,true);
    document.addEventListener('touchend',endLineResize,true);
    tbody.addEventListener('mousedown',e=>{const ta=e.target.closest?.('textarea.line-name,textarea.line-description');if(ta){ta.dataset.nativeResizeStartH=String(ta.getBoundingClientRect().height)}},true);
    document.addEventListener('mouseup',()=>{tbody.querySelectorAll('textarea.line-name,textarea.line-description').forEach(ta=>{const before=Number(ta.dataset.nativeResizeStartH||0);if(before&&Math.abs(ta.getBoundingClientRect().height-before)>4)ta.dataset.manualResize='1';delete ta.dataset.nativeResizeStartH})},true);

    tbody.addEventListener('input',e=>{
      const i=Number(e.target.dataset.row);if(!Number.isInteger(i)||!items[i])return;
      if(e.target.matches('[data-product-search]')){
        const kind=e.target.dataset.kind;items[i].product_id='';items[i].product_snapshot={...(items[i].product_snapshot||{}),[kind]:e.target.value};if(kind==='name'){items[i].manual_text=e.target.value;if(e.target.matches('textarea'))growLineTextarea(e.target)}
        clearTimeout(searchTimer);searchTimer=setTimeout(()=>openPicker(e.target,i),140);draft();return;
      }
      const field=e.target.dataset.field;if(!field)return;
      if(field==='short_description')items[i].product_snapshot={...(items[i].product_snapshot||{}),short_description:e.target.value};else items[i][field]=e.target.type==='checkbox'?(e.target.checked?1:0):e.target.value;
      if(field==='short_description')growLineTextarea(e.target)
      totals();draft();
    });
    tbody.addEventListener('change',e=>{if(e.target.dataset.field){const i=Number(e.target.dataset.row);items[i][e.target.dataset.field]=e.target.type==='checkbox'?(e.target.checked?1:0):e.target.value;totals();draft()}});
    document.addEventListener('click',e=>{if(!e.target.closest('#quoteProductPicker')&&!e.target.closest('[data-product-search]')&&!e.target.closest('[data-open-picker]'))hidePicker()});
    window.addEventListener('resize',placePicker);window.addEventListener('scroll',placePicker,true);
    document.getElementById('addBlank')?.addEventListener('click',()=>{addBlankAfterActive()});
    async function addDefinedAlternative(){
      const baseIndex=lastActiveRow>=0&&!isBlank(items[lastActiveRow])?lastActiveRow:items.findIndex(x=>!isBlank(x));
      const base=items[baseIndex];
      if(!base?.product_id){window.CRM_TOAST?.error?.('Önce muadil bağlanacak kayıtlı ana ürün satırını seçin.')||alert('Önce kayıtlı bir ana ürün satırı seçin.');return}
      document.getElementById('quoteAlternativeChooserV371')?.remove();
      const host=document.createElement('div');host.id='quoteAlternativeChooserV371';host.className='modal is-open quote-alternative-chooser-v371';
      host.innerHTML=`<div class="modal-card"><button type="button" class="modal-close" data-alt-close>×</button><div class="quote-alt-modal-head-v371"><div><small>ANA ÜRÜN</small><h2>🔄 Muadil Ürün Ekle</h2><h3>${esc(base.product_snapshot?.code||'')} · ${esc(base.product_snapshot?.name||base.manual_text||'')}</h3><p>Hızlı aramadan ürünü seçin; seçilen ürün ana satırın hemen altına <b>MUADİL</b> olarak eklenir.</p></div></div><label class="quote-alt-search-v371"><span>Muadil ürün adı veya kodu</span><div><input type="search" data-alt-search autocomplete="off" placeholder="Ürün adını yazın"><button type="button" data-alt-run>＋ Ara</button></div></label><div class="quote-alt-options-v371" data-alt-results><p class="empty">Tanımlı muadiller ve arama sonuçları burada gösterilecek.</p></div></div>`;
      document.body.append(host);const resultBox=host.querySelector('[data-alt-results]'),search=host.querySelector('[data-alt-search]');
      const close=()=>host.remove(),add=p=>{const next={...blankRow(),product_id:p.id,product_snapshot:{...p},manual_text:p.name||'',quantity:base.quantity||1,unit:p.unit||'ADET',unit_price:num(p.sale_price),currency:p.currency||form.currency?.value||'TRY',vat_rate:p.vat_rate??20,is_alternative:1,alternative_to_product_id:base.product_id,alternative_to_name:base.product_snapshot?.name||base.manual_text||'',alternative_type:p.alternative_type||'EQUIVALENT',alternative_note:p.note||'',include_total:0};items.splice(baseIndex+1,0,next);ensureSingleBlank();render();draft();close();focusRowField(baseIndex+1)};
      const renderResults=rows=>{resultBox.innerHTML=rows.length?rows.map((p,i)=>`<button type="button" data-alt-index="${i}"><span class="quote-alt-result-image-v371">${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:'📦'}</span><span><b>${esc(p.code||'-')} · ${esc(p.name||'-')}</b><small>${esc(p.note||p.brand||p.category||p.alternative_type||'Ürün kataloğu')}</small></span><em>${fmt(p.sale_price||0)} ${esc(p.currency||'TRY')}</em></button>`).join(''):'<p class="empty">Eşleşen ürün bulunamadı.</p>';resultBox.querySelectorAll('[data-alt-index]').forEach(btn=>btn.onclick=()=>add(rows[Number(btn.dataset.altIndex)]))};
      async function load(query=''){resultBox.innerHTML='<p class="loading-note">Ürünler aranıyor…</p>';try{const [definedResponse,searchResponse]=await Promise.all([fetch(`/products/${encodeURIComponent(base.product_id)}/alternatives`,{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'}),fetch('/products/picker-json?q='+encodeURIComponent(query)+'&limit=30',{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'})]);const defined=definedResponse.ok?(await definedResponse.json()).items||[]:[],found=searchResponse.ok?await searchResponse.json():[];const merged=[...defined,...found].filter(p=>p?.id&&p.id!==base.product_id);const seen=new Set();renderResults(merged.filter(p=>!seen.has(p.id)&&seen.add(p.id)))}catch(error){resultBox.innerHTML=`<p class="toast toast--error">${esc(error.message||'Ürünler yüklenemedi.')}</p>`}};
      host.querySelector('[data-alt-close]').onclick=close;host.onclick=e=>{if(e.target===host)close()};host.querySelector('[data-alt-run]').onclick=()=>load(search.value.trim());let timer;search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>load(search.value.trim()),180)});search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();load(search.value.trim())}});load('');setTimeout(()=>search.focus(),40)
    }
    document.getElementById('addAlternativeRow')?.addEventListener('click',addDefinedAlternative);

    restoreDraftFields();
    const quoteDiscountTypeInput=form.elements.namedItem('quote_discount_type');
    const quoteDiscountValueInput=form.elements.namedItem('quote_discount_value');
    const clearQuoteDiscount=document.getElementById('clearQuoteDiscount');
    const updateQuoteDiscount=()=>{totals();draft()};
    quoteDiscountTypeInput?.addEventListener('change',updateQuoteDiscount);
    quoteDiscountValueInput?.addEventListener('input',updateQuoteDiscount);
    quoteDiscountValueInput?.addEventListener('change',updateQuoteDiscount);
    clearQuoteDiscount?.addEventListener('click',()=>{if(quoteDiscountValueInput)quoteDiscountValueInput.value='0';totals();draft();quoteDiscountValueInput?.focus()});
    const csearch=document.getElementById('customerSearch'),cres=document.getElementById('customerResults'),cid=document.getElementById('customerId'),snapshot=document.getElementById('customerSnapshot');
    const customerFields=['company_name','contact_name','contact_title','phone','mobile','email','website','tax_office','tax_no','country','city','district','billing_address','delivery_address','note'];const customerInput=k=>form.querySelector(`[name="customer_${k}"]`);
    if(csearch&&!csearch.value&&customerInput('company_name')?.value)csearch.value=customerInput('company_name').value;document.dispatchEvent(new CustomEvent('crm:sync-fields'));
    const meaningfulCustomerAddress=v=>{const value=String(v||'').replace(/\uFFFD/g,'').trim();return /[\p{L}\p{N}]/u.test(value)?value:''};
    const customerFieldValue=(c,k)=>k==='billing_address'?(meaningfulCustomerAddress(c.billing_address)||meaningfulCustomerAddress(c.address1)||meaningfulCustomerAddress(c.address2)):k==='delivery_address'?(meaningfulCustomerAddress(c.delivery_address)||meaningfulCustomerAddress(c.address2)):c[k]||'';
    function updateSnapshot(){if(!snapshot)return;const c=Object.fromEntries(customerFields.map(k=>[k,customerInput(k)?.value||'']));const street=meaningfulCustomerAddress(c.delivery_address)||meaningfulCustomerAddress(c.billing_address);snapshot.innerHTML=[[L.customerCompany,c.company_name],[L.contact,c.contact_name],[L.phone,c.phone||c.mobile||'-'],[L.email,c.email],[L.tax,c.tax_no],[L.address,[street,c.district,c.city,c.country].filter(Boolean).join(' · ')]].map(x=>`<div><small>${esc(x[0])}</small><b>${esc(x[1]||'-')}</b></div>`).join('')}
    function closeCustomerResults(){if(!cres)return;cres.innerHTML='';cres.classList.remove('is-open')}
    function showCustomer(c){if(cid)cid.value=c.id||'';customerFields.forEach(k=>{const el=customerInput(k);if(el)el.value=customerFieldValue(c,k)});if(csearch)csearch.value=c.company_name||'';closeCustomerResults();updateSnapshot();document.dispatchEvent(new CustomEvent('crm:sync-fields'));draft()}
    customerFields.forEach(k=>customerInput(k)?.addEventListener('input',()=>{updateSnapshot();draft()}));
    async function loadCustomers(){if(!csearch||!cres)return;try{const r=await fetch('/customers/api/search?q='+encodeURIComponent(csearch.value.trim()),{headers:{Accept:'application/json'},cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error('HTTP '+r.status);const rows=await r.json();cres.innerHTML=rows.map((c,n)=>`<button type="button" data-n="${n}" class="suggest-card suggest-card--customer"><span class="suggest-customer"><b class="suggest-customer__name">${esc(c.company_name||'-')}</b><small>${esc([c.code,c.contact_name,c.phone||c.mobile,c.email,c.city].filter(Boolean).join(' · '))}</small>${c.tax_no?`<small>Vergi no: ${esc(c.tax_no)}</small>`:''}</span></button>`).join('');cres.classList.toggle('is-open',rows.length>0);cres.querySelectorAll('button').forEach(b=>b.onclick=()=>showCustomer(rows[Number(b.dataset.n)]))}catch{cres.innerHTML=`<p class="loading-note">${esc(L.failed)}</p>`;cres.classList.add('is-open')}}
    let customerTimer;if(csearch){csearch.addEventListener('focus',loadCustomers);csearch.addEventListener('click',e=>{e.stopPropagation();loadCustomers()});csearch.addEventListener('input',()=>{clearTimeout(customerTimer);customerTimer=setTimeout(loadCustomers,160)});csearch.addEventListener('keydown',e=>{if(e.key==='Escape')closeCustomerResults()});document.addEventListener('click',e=>{if(!e.target.closest('.quote-customer-card .lookup'))closeCustomerResults()})}updateSnapshot();

    async function postForm(url,formEl){const body=new FormData(formEl);const csrf=boot.csrfToken||formEl.querySelector('[name="_csrf"]')?.value||'';const r=await fetch(url,{method:'POST',headers:{Accept:'application/json','x-csrf-token':csrf},body,credentials:'same-origin',cache:'no-store'});const ct=r.headers.get('content-type')||'';let j;if(ct.includes('application/json')){j=await r.json().catch(()=>({message:L.failed}))}else{const txt=await r.text().catch(()=>'');const m=txt.match(/<p[^>]*>([\s\S]*?)<\/p>/i)||txt.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);j={message:(m?m[1].replace(/<[^>]+>/g,'').trim():'')||L.failed,status:r.status}}if(!r.ok)throw j;return j}

    // v3.3.5 — quick-product modal keeps unfinished entries, resets only after a successful save and previews selected images live.
    const quickCustomerForm=document.getElementById('quickCustomer');
    const quickProductForm=document.getElementById('quickProduct');
    const quickProductModal=document.getElementById('productModal');
    const quickProductImage=document.getElementById('quickProductImage');
    const quickProductImagePreview=document.getElementById('quickProductImagePreview');
    const quickProductImageEmpty=document.getElementById('quickProductImageEmpty');
    let quickProductPreviewObjectUrl='';
    function clearQuickProductPreviewObjectUrl(){if(quickProductPreviewObjectUrl){URL.revokeObjectURL(quickProductPreviewObjectUrl);quickProductPreviewObjectUrl=''}}
    function setQuickProductImagePreview(src=''){if(quickProductImagePreview){quickProductImagePreview.src=src||'';quickProductImagePreview.hidden=!src}if(quickProductImageEmpty)quickProductImageEmpty.hidden=Boolean(src)}
    function resetQuickProductForm(formEl=quickProductForm){clearQuickProductPreviewObjectUrl();formEl?.reset();setQuickProductImagePreview('');document.dispatchEvent(new CustomEvent('crm:sync-fields'))}
    quickProductImage?.addEventListener('change',e=>{clearQuickProductPreviewObjectUrl();const file=e.target.files?.[0];if(!file){setQuickProductImagePreview('');return}quickProductPreviewObjectUrl=URL.createObjectURL(file);setQuickProductImagePreview(quickProductPreviewObjectUrl)});

    quickCustomerForm?.addEventListener('submit',async e=>{e.preventDefault();const formEl=e.currentTarget;try{const c=await postForm('/customers/save',formEl);showCustomer(c);document.getElementById('customerModal')?.classList.remove('is-open');formEl.reset()}catch(x){alert(x.error==='duplicate'?L.duplicate+(x.duplicate?.company_name||''):(x.message||L.customerFailed))}});
    quickProductForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const formEl=e.currentTarget;
      const button=formEl.querySelector('button[type="submit"],button:not([type])');
      const old=button?.innerHTML;
      if(button){button.disabled=true;button.innerHTML=lang==='en'?'Saving…':'Kaydediliyor…'}
      try{
        const p=await postForm('/products/save',formEl);
        items=items.filter(x=>!isBlank(x));
        items.push({...blankRow(),product_id:p.id,product_snapshot:p,manual_text:p.name||'',unit:p.unit||'ADET',unit_price:p.sale_price||0,currency:p.currency||'TRY',vat_rate:p.vat_rate??20});
        ensureSingleBlank();render();quickProductModal?.classList.remove('is-open');resetQuickProductForm(formEl);draft();quoteSaveToast('success',L.productAdded,3300);
      }catch(x){quoteSaveToast('error',x.message||L.productFailed)}
      finally{if(button){button.disabled=false;button.innerHTML=old}}
    });
    const currencySelect=form.elements.namedItem('currency');
    const fxRateInput=form.elements.namedItem('fx_rate');
    const fxSourceSelect=form.elements.namedItem('fx_source');
    const fxDateInput=form.elements.namedItem('fx_date');
    const fxStatus=document.getElementById('fxRateStatus');
    const refreshFx=document.getElementById('refreshFxRate');
    let applyingFx=false;
    function setFxStatus(text,type='ok'){if(!fxStatus)return;fxStatus.textContent=text||'';fxStatus.className='fx-rate-status '+(type==='error'?'is-error':type==='warn'?'is-warn':'is-ok');if(text&&type==='ok'&&/TCMB kuru|TCMB rate/i.test(text)){try{quoteSaveToast('success',text,1800)}catch(_){}}}
    function selectedRate(rates,currency){if(currency==='EUR')return num(rates?.eur);if(currency==='USD')return num(rates?.usd);return 1}
    async function loadCurrencyRates(force=false){
      if(!force&&window.CRM_CURRENCY_RATES?.eur&&window.CRM_CURRENCY_RATES?.usd)return window.CRM_CURRENCY_RATES;
      const r=await fetch('/api/currency'+(force?'?refresh=1':''),{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();window.CRM_CURRENCY_RATES=data;return data;
    }
    async function applyCurrencyRate({force=false}={}){
      const currency=String(currencySelect?.value||'TRY').toUpperCase();
      if(currency==='TRY'){
        applyingFx=true;if(fxRateInput)fxRateInput.value='1';if(fxDateInput)fxDateInput.value=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());applyingFx=false;
        setFxStatus(L.fxTry);totals();draft();return;
      }
      if(String(fxSourceSelect?.value||'TCMB').toUpperCase()==='MANUAL'){
        setFxStatus(L.fxManual,'warn');totals();draft();return;
      }
      try{
        setFxStatus(lang==='en'?'Loading TCMB rate…':'TCMB kuru alınıyor…','warn');
        const rates=await loadCurrencyRates(force);const rate=selectedRate(rates,currency);
        if(!rate)throw new Error('RATE_NOT_AVAILABLE');
        applyingFx=true;if(fxRateInput)fxRateInput.value=String(rate);if(fxDateInput)fxDateInput.value=rates.date||new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());applyingFx=false;
        setFxStatus(rates.stale?L.fxStale:L.fxApplied,rates.stale?'warn':'ok');totals();draft();
      }catch(e){setFxStatus(L.fxFailed,'error');totals()}
    }
    currencySelect?.addEventListener('change',()=>applyCurrencyRate());
    fxSourceSelect?.addEventListener('change',()=>{if(String(fxSourceSelect.value).toUpperCase()==='TCMB')applyCurrencyRate({force:true});else{setFxStatus(L.fxManual,'warn');totals();draft()}});
    form.elements.namedItem('show_try_total')?.addEventListener('change',()=>{totals();draft()});
    fxRateInput?.addEventListener('input',()=>{totals();draft();if(!applyingFx&&fxSourceSelect){fxSourceSelect.value='MANUAL';setFxStatus(L.fxManual,'warn')}});
    refreshFx?.addEventListener('click',()=>{if(fxSourceSelect)fxSourceSelect.value='TCMB';applyCurrencyRate({force:true})});
    window.addEventListener('crm:currency-rates',()=>{if(!boot.row&&String(fxSourceSelect?.value||'TCMB').toUpperCase()==='TCMB')applyCurrencyRate()},{once:true});
    if(!boot.row&&String(fxSourceSelect?.value||'TCMB').toUpperCase()==='TCMB')applyCurrencyRate();else setFxStatus(String(fxSourceSelect?.value||'TCMB').toUpperCase()==='MANUAL'?L.fxManual:'');
    // v3.3.43 — hazır metin / önceki kayıt önerilerini kullanma ve minimal X ile silme.
    document.addEventListener('click',async e=>{
      const use=e.target.closest('[data-term-use]');
      if(use){
        e.preventDefault();
        const box=use.closest('.term-combo');
        const ta=box?.querySelector('textarea');
        if(ta){ta.value=use.dataset.value||use.textContent||'';ta.dispatchEvent(new Event('input',{bubbles:true}));draft()}
        return;
      }
      const del=e.target.closest('[data-term-delete]');
      if(del){
        e.preventDefault();
        const chip=del.closest('.term-chip');
        chip?.classList.add('is-removing');
        try{
          const body=new URLSearchParams();body.set('_csrf',boot.csrfToken||'');body.set('key',del.dataset.termDelete||'');body.set('value',del.dataset.value||'');
          const r=await fetch('/quotes/term-history/delete',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,credentials:'same-origin'});
          if(!r.ok)throw new Error('DELETE_FAILED');
          chip?.remove();
          const select=del.closest('.term-combo')?.querySelector('select');
          [...(select?.options||[])].forEach(o=>{if(o.value===(del.dataset.value||''))o.remove()});
        }catch(err){chip?.classList.remove('is-removing');quoteSaveToast('error',lang==='en'?'Suggested text could not be deleted.':'Önerilen metin silinemedi.',2800)}
      }
    });
    form.addEventListener('input',e=>{if(!e.target.closest('#quoteItems'))draft()});
    form.addEventListener('change',e=>{if(!e.target.closest('#quoteItems'))draft()});
    function quoteSaveToast(type,message,duration=5200){document.querySelectorAll('.quote-save-toast').forEach(x=>x.remove());const el=document.createElement('div');el.className=`toast toast--${type} quote-save-toast`;el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.innerHTML=`<b>${esc(message)}</b>`;document.body.appendChild(el);setTimeout(()=>el.remove(),duration)}
    form.addEventListener('submit',async e=>{
      e.preventDefault();e.stopPropagation();
      if(saveInFlight)return;
      saveInFlight=true;totals();saveDraft();
      const submit=e.submitter||form.querySelector('button[type="submit"],button:not([type])');
      const old=submit?.innerHTML;if(submit){submit.disabled=true;submit.innerHTML=lang==='en'?'Saving…':'Kaydediliyor…'}
      try{
        const data=new URLSearchParams(new FormData(form));data.set('_ajax','1');
        const response=await fetch(form.action,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:data,credentials:'same-origin'});
        const payload=await response.json().catch(()=>({ok:false,message:L.failed}));
        if(!response.ok||!payload.ok)throw new Error(payload.message||L.failed);
        quoteSaved=true;
        const idField=form.elements.namedItem('id'),originalField=form.elements.namedItem('original_quote_id'),instanceField=form.elements.namedItem('form_instance_id');
        if(idField&&payload.id)idField.value=payload.id;if(originalField&&payload.id)originalField.value=payload.id;if(instanceField&&payload.formInstanceId)instanceField.value=payload.formInstanceId;
        clearSavedDraftState();
        try{sessionStorage.setItem('crm-quote-last-saved',JSON.stringify({id:payload.id,formInstanceId:payload.formInstanceId,at:Date.now()}))}catch{}
        document.querySelectorAll('.modal.is-open').forEach(x=>x.classList.remove('is-open'));
        quoteSaveToast('success',payload.message||(lang==='en'?'Proforma saved.':'Proforma kaydedildi.'));
        setTimeout(()=>{window.location.replace(payload.redirect||'/quotes')},520);
      }catch(err){saveInFlight=false;quoteSaveToast('error',err.message||(lang==='en'?'Proforma could not be saved.':'Proforma kaydedilemedi.'));if(submit){submit.disabled=false;submit.innerHTML=old}}
    });
    window.addEventListener('beforeunload',e=>{if(!quoteSaved&&localStorage.getItem(draftKey)){e.preventDefault();e.returnValue='Unsaved draft.'}});
    const quoteProfileSelect=document.getElementById('quoteProfileSelect');
    const footerAddressInput=form.elements.namedItem('footer_address'),footerEmailInput=form.elements.namedItem('footer_email'),footerPhoneInput=form.elements.namedItem('footer_phone');
    const selectedFooterProfile=()=>(boot.profiles||[]).find(x=>String(x.id)===String(quoteProfileSelect?.value))||(boot.profiles||[]).find(x=>x.is_active)||{};
    function updateQuoteFooterPreview(){const profile=selectedFooterProfile();const set=(id,prefix,value)=>{const el=document.getElementById(id);if(el)el.textContent=prefix+' '+String(value||'—')};set('footerPreviewAddress','⌖',footerAddressInput?.value||profile.footer_address||profile.delivery_address||profile.billing_address||profile.address);set('footerPreviewEmail','✉',footerEmailInput?.value||profile.footer_email||profile.email);set('footerPreviewPhone','☎',footerPhoneInput?.value||profile.footer_phone||profile.phone||profile.mobile)}
    function fillQuoteFooterDefaults(overwrite=false){const profile=selectedFooterProfile(),put=(el,value)=>{if(el&&(overwrite||!String(el.value||'').trim()))el.value=value||''};put(footerAddressInput,profile.footer_address||profile.delivery_address||profile.billing_address||profile.address);put(footerEmailInput,profile.footer_email||profile.email);put(footerPhoneInput,profile.footer_phone||profile.phone||profile.mobile);updateQuoteFooterPreview();window.dispatchEvent(new CustomEvent('crm:sync-fields'))}
    quoteProfileSelect?.addEventListener('change',()=>{fillQuoteFooterDefaults(true);draft()});[footerAddressInput,footerEmailInput,footerPhoneInput].forEach(el=>el?.addEventListener('input',()=>{updateQuoteFooterPreview();draft()}));fillQuoteFooterDefaults(false);
    const quoteTemplateSelect=document.getElementById('quoteTemplateSelect');
    const quoteTemplateLivePreview=document.getElementById('quoteTemplateLivePreview');
    const quoteTemplatePreviewText=document.getElementById('quoteTemplatePreviewText');
    const quoteTemplateFullPreview=document.getElementById('quoteTemplateFullPreview');
    function updateQuoteTemplatePreview(){
      const opt=quoteTemplateSelect?.selectedOptions?.[0];
      if(!opt||!quoteTemplateLivePreview)return;
      quoteTemplateLivePreview.className='template-mini quote-template-live-preview layout-'+(opt.dataset.layout||'classic');
      quoteTemplateLivePreview.style.setProperty('--p',opt.dataset.primary||'#245ba7');
      quoteTemplateLivePreview.style.setProperty('--a',opt.dataset.accent||'#d83238');
      if(quoteTemplatePreviewText)quoteTemplatePreviewText.textContent=opt.dataset.description||'';
      if(quoteTemplateFullPreview)quoteTemplateFullPreview.dataset.previewUrl='/templates/'+encodeURIComponent(opt.dataset.id||'')+'/preview';
    }
    const quoteTemplateGalleryModal=document.getElementById('quoteTemplateGalleryModal');
    const openQuoteTemplateGallery=document.getElementById('openQuoteTemplateGallery');
    const quoteTemplateAppliedFrame=document.getElementById('quoteTemplateAppliedFrame');
    const quoteTemplateGalleryStatus=document.getElementById('quoteTemplateGalleryStatus');
    const acceptQuoteTemplate=document.getElementById('acceptQuoteTemplate');
    let previewTimer,previewRequest=0;
    function selectedTemplateKey(){return String(quoteTemplateSelect?.value||'')}
    function syncTemplateChoiceCards(){document.querySelectorAll('[data-template-choice]').forEach(btn=>btn.classList.toggle('is-selected',btn.dataset.templateChoice===selectedTemplateKey()))}
    quoteTemplateAppliedFrame?.addEventListener('load',()=>{
      if(!quoteTemplateGalleryModal?.classList.contains('is-open')||!quoteTemplateGalleryStatus)return;
      let failed=false;try{failed=/İşlem tamamlanamadı|Operation could not be completed|Güvenlik doğrulaması başarısız/i.test(quoteTemplateAppliedFrame.contentDocument?.body?.innerText||'')}catch{}
      quoteTemplateGalleryStatus.textContent=failed?(lang==='en'?'Preview could not be loaded.':'Ön izleme yüklenemedi.'):(lang==='en'?'Live preview is up to date.':'Canlı ön izleme güncel.');
    });
    async function refreshAppliedTemplatePreview(){
      if(!quoteTemplateAppliedFrame||!quoteTemplateGalleryModal?.classList.contains('is-open'))return;
      clearTimeout(previewTimer);previewTimer=setTimeout(async()=>{
        const request=++previewRequest;totals();if(quoteTemplateGalleryStatus)quoteTemplateGalleryStatus.textContent=lang==='en'?'Preparing current quotation preview…':'Mevcut proforma bilgileriyle ön izleme hazırlanıyor…';
        const buildData=()=>{const data=new URLSearchParams();for(const [key,value] of new FormData(form)){if(typeof value==='string')data.append(key,value)}data.set('_ajax','1');data.set('template_key',selectedTemplateKey());return data};
        const requestHtml=async(refreshToken=false)=>{
          const data=buildData();
          if(refreshToken){
            const tokenResponse=await fetch('/auth/csrf-token',{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'});
            if(tokenResponse.ok){const fresh=await tokenResponse.json();if(fresh?.csrfToken){data.set('_csrf',fresh.csrfToken);const hidden=form.elements.namedItem('_csrf');if(hidden)hidden.value=fresh.csrfToken}}
          }
          const response=await fetch('/quotes/preview-draft',{method:'POST',headers:{Accept:'text/html','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','X-Requested-With':'quote-template-preview','x-csrf-token':data.get('_csrf')||boot.csrfToken||''},body:data,credentials:'same-origin',cache:'no-store'});
          if(response.status===403&&!refreshToken)return requestHtml(true);
          if(!response.ok)throw new Error('HTTP '+response.status);
          const html=await response.text();
          return cspNonce?html.replace(/\bnonce="[^"]*"/g,`nonce="${cspNonce}"`):html;
        };
        const nativeFrameFallback=()=>{
          const target='quote-template-preview-'+Date.now();quoteTemplateAppliedFrame.name=target;
          const fallback=document.createElement('form');fallback.method='post';fallback.action='/quotes/preview-draft';fallback.target=target;fallback.hidden=true;
          for(const [key,value] of buildData()){const hidden=document.createElement('input');hidden.type='hidden';hidden.name=key;hidden.value=value;fallback.append(hidden)}
          document.body.append(fallback);fallback.submit();fallback.remove();
          if(quoteTemplateGalleryStatus)quoteTemplateGalleryStatus.textContent=lang==='en'?'Secure live preview is loading…':'Güvenli canlı ön izleme yükleniyor…';
        };
        try{const html=await requestHtml();if(request!==previewRequest)return;quoteTemplateAppliedFrame.srcdoc=html;if(quoteTemplateGalleryStatus)quoteTemplateGalleryStatus.textContent=lang==='en'?'Live preview is up to date.':'Canlı ön izleme güncel.'}catch(e){if(request!==previewRequest)return;nativeFrameFallback()}},180)
    }
    function showTemplateGallery(){syncTemplateChoiceCards();quoteTemplateGalleryModal?.classList.add('is-open');quoteTemplateGalleryModal?.setAttribute('aria-hidden','false');refreshAppliedTemplatePreview()}
    openQuoteTemplateGallery?.addEventListener('click',showTemplateGallery);
    quoteTemplateFullPreview?.addEventListener('click',showTemplateGallery);
    document.querySelectorAll('[data-template-choice]').forEach(btn=>btn.addEventListener('click',()=>{if(quoteTemplateSelect){quoteTemplateSelect.value=btn.dataset.templateChoice;updateQuoteTemplatePreview();syncTemplateChoiceCards();draft();refreshAppliedTemplatePreview()}}));
    acceptQuoteTemplate?.addEventListener('click',()=>{quoteTemplateGalleryModal?.classList.remove('is-open');quoteTemplateGalleryModal?.setAttribute('aria-hidden','true');draft()});
    quoteTemplateSelect?.addEventListener('change',()=>{updateQuoteTemplatePreview();syncTemplateChoiceCards();draft();refreshAppliedTemplatePreview()});
    form.addEventListener('input',e=>{if(quoteTemplateGalleryModal?.classList.contains('is-open')&&!e.target.closest('#quoteTemplateGalleryModal'))refreshAppliedTemplatePreview()});
    form.addEventListener('change',e=>{if(quoteTemplateGalleryModal?.classList.contains('is-open')&&!e.target.closest('#quoteTemplateGalleryModal'))refreshAppliedTemplatePreview()});
    updateQuoteTemplatePreview();syncTemplateChoiceCards();
    render();
  });
})();

// v3.3.58 — default validity date is quote date +10 days on new proforma, unless user edits manually
(()=>{
 const form=document.getElementById('quoteForm'); if(!form)return;
 const id=form.querySelector('[name="id"]')?.value;
 const qd=form.querySelector('[name="quote_date"]'); const vu=form.querySelector('[name="valid_until"]');
 if(!qd||!vu||id)return;
 const addDays=(iso,n)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return '';const [y,m,d]=iso.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10)};
 let manual=false; vu.addEventListener('input',()=>{manual=true});
 const set=()=>{if(!manual)vu.value=addDays(qd.value,10)};
 set(); qd.addEventListener('change',set);
})();

// v3.3.59 — city/district helper compatibility and automatic +10 days validity date.
(()=>{
 const form=document.getElementById('quoteForm'); if(!form)return;
 const qd=form.elements.namedItem('quote_date'), vu=form.elements.namedItem('valid_until');
 const plus10=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return'';const [y,m,d]=v.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));date.setUTCDate(date.getUTCDate()+10);return date.toISOString().slice(0,10)};
 if(qd&&vu){let auto=!vu.value||vu.value===plus10(qd.value); qd.addEventListener('change',()=>{if(auto||!vu.value)vu.value=plus10(qd.value)});vu.addEventListener('input',()=>{auto=false});vu.addEventListener('change',()=>{auto=false});if(!vu.value&&qd.value)vu.value=plus10(qd.value);}
 // Some older quote forms missed the address attributes. Re-add them so the city/district popup opens like the old system.
 const city=form.querySelector('[name="customer_city"]'), dist=form.querySelector('[name="customer_district"]'), country=form.querySelector('[name="customer_country"]');
 city?.setAttribute('data-tr-city','');dist?.setAttribute('data-tr-district','');country?.setAttribute('data-tr-country','');
 setTimeout(()=>document.dispatchEvent(new Event('crm:sync-fields')),60);
})();

// crmV13 — sabit ürün araç çubuğu, canlı özet ve klavye ile hızlı satır yönetimi
(()=>{
  'use strict';
  const init=()=>{
    const form=document.getElementById('quoteForm');
    const card=form?.querySelector('.quote-lines-workspace-v11');
    const toolbar=document.getElementById('quoteLinesToolbar');
    const tbody=document.getElementById('quoteItems');
    const scroll=card?.querySelector('.quote-items-scroll');
    if(!form||!card||!toolbar||!tbody||!scroll)return;
    const locale=(window.QUOTE_BOOTSTRAP?.locale==='en')?'en':'tr';
    const setToolbarTop=()=>{
      if(matchMedia('(max-width:900px)').matches){card.style.setProperty('--quote-toolbar-top','8px');return;}
      const candidates=[document.querySelector('.topbar'),document.querySelector('.app-topbar'),document.querySelector('header.site-header')].filter(Boolean);
      const h=candidates.reduce((m,el)=>Math.max(m,Math.ceil(el.getBoundingClientRect().bottom)),0);
      card.style.setProperty('--quote-toolbar-top',Math.max(8,h+8)+'px');
    };
    const updateDocked=()=>{const r=toolbar.getBoundingClientRect();card.classList.toggle('is-toolbar-docked',r.top<=parseFloat(getComputedStyle(card).getPropertyValue('--quote-toolbar-top'))+2)};
    const updateSummary=()=>{
      const rows=[...tbody.querySelectorAll('tr[data-row-index]')].filter(row=>{
        const name=row.querySelector('.line-name')?.value?.trim();
        const code=row.querySelector('.quote-product-code input')?.value?.trim();
        return Boolean(name||code);
      });
      const count=document.getElementById('quoteStickyItemCount');
      const total=document.getElementById('quoteStickyNetTotal');
      const currency=document.getElementById('quoteStickyCurrency');
      const grand=document.getElementById('grandTotal');
      const grandCurrency=document.getElementById('grandCurrency');
      if(count)count.textContent=String(rows.length);
      if(total)total.textContent=grand?.textContent||'0,00';
      if(currency)currency.textContent=grandCurrency?.textContent||form.elements.namedItem('currency')?.value||'TRY';
    };
    const focusLastName=()=>requestAnimationFrame(()=>{
      const rows=[...tbody.querySelectorAll('tr[data-row-index]')];
      const target=rows.at(-1)?.querySelector('.line-name');
      target?.focus({preventScroll:true});
      target?.select?.();
      rows.at(-1)?.scrollIntoView({block:'center',behavior:'smooth'});
    });
    const addBlank=document.getElementById('addBlank');
    addBlank?.addEventListener('click',()=>setTimeout(()=>{focusLastName();updateSummary()},80));
    form.addEventListener('input',()=>requestAnimationFrame(updateSummary),true);
    form.addEventListener('change',()=>requestAnimationFrame(updateSummary),true);
    new MutationObserver(()=>requestAnimationFrame(updateSummary)).observe(tbody,{childList:true,subtree:true});
    form.addEventListener('keydown',e=>{
      if(e.ctrlKey&&e.key==='Enter'){
        e.preventDefault();addBlank?.click();return;
      }
      if(e.ctrlKey&&e.key.toLowerCase()==='d'){
        const row=e.target.closest('tr[data-row-index]');
        const copy=row?.querySelector('[data-row-action="copy"]');
        if(copy){e.preventDefault();copy.click();setTimeout(focusLastName,80)}return;
      }
      if(e.shiftKey&&e.key==='Delete'){
        const row=e.target.closest('tr[data-row-index]');
        const del=row?.querySelector('[data-row-action="remove"]');
        if(del){e.preventDefault();del.click()}return;
      }
    },true);
    const ro=new ResizeObserver(()=>{setToolbarTop();updateDocked()});
    ro.observe(document.documentElement);ro.observe(toolbar);
    window.addEventListener('scroll',updateDocked,{passive:true});
    window.addEventListener('resize',()=>{setToolbarTop();updateDocked()},{passive:true});
    setToolbarTop();updateSummary();updateDocked();
    toolbar.title=locale==='en'?'Ctrl+Enter: new line · Ctrl+D: duplicate · Shift+Delete: remove':'Ctrl+Enter: yeni satır · Ctrl+D: kopyala · Shift+Delete: sil';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* crmV19 — keep the quick product modal outside transformed/transparent page containers */
(()=>{
  'use strict';
  const mount=()=>{
    const modal=document.getElementById('productModal');
    if(!modal)return;
    if(modal.parentElement!==document.body)document.body.appendChild(modal);
    const sync=()=>document.documentElement.classList.toggle('quick-product-modal-open',modal.classList.contains('is-open'));
    new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['class']});
    modal.addEventListener('click',e=>{if(e.target===modal){modal.classList.remove('is-open');sync()}});
    sync();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

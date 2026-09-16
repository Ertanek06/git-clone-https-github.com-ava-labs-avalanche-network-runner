// crmv1.10 — progressive lists, durable theme-studio toggles and product preview single-edit UX.
(()=>{
 'use strict';
 const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
 ready(()=>{
  /* Replace the old dynamically-created studio toggles with durable controls. */
  document.querySelectorAll('.theme-card-toggle-v19').forEach(button=>button.remove());
  const sections=[
   [document.querySelector('.theme-design-library-v363'),'.theme-section-head-v110','Kayıtlı tasarımlar'],
   [document.querySelector('.theme-preset-hub-v18'),'.theme-preset-hub-head-v18','Tema sistemleri'],
   [document.querySelector('.theme-studio-preview-card-v359'),'.theme-section-head-v110','Canlı panel ön izlemesi'],
   [document.querySelector('.theme-studio-controls-v359'),'.theme-section-head-v110','Tasarım kontrolleri']
  ];
  sections.forEach(([section,headSelector,label])=>{
   if(!section)return;section.classList.remove('theme-collapsible-v19','is-collapsed-v19');
   const head=section.querySelector(headSelector);if(!head)return;
   let button=head.querySelector('[data-theme-section-toggle]');
   if(!button){button=document.createElement('button');button.type='button';button.className='btn btn--sm btn--soft theme-section-toggle-v110';button.dataset.themeSectionToggle='';head.append(button)}
   button.setAttribute('aria-label',label+' aç/kapat');button.setAttribute('aria-expanded','true');button.textContent='− Kapat';
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const collapsed=section.classList.toggle('is-collapsed-v110');button.setAttribute('aria-expanded',String(!collapsed));button.textContent=collapsed?'＋ Aç':'− Kapat'});
  });

  /* Product preview owns editing; the outer generic modal must not offer a second Edit path. */
  document.addEventListener('click',event=>{const trigger=event.target.closest?.('[data-preview-url^="/products/"]');if(!trigger)return;setTimeout(()=>{const edit=document.getElementById('globalPreviewEdit');if(edit)edit.hidden=true},0)},true);

  /* "Tümünü Göster" paints 120 records first, then streams bounded fragments into the
     existing table. A failing batch leaves the current list usable and exposes Retry. */
  const loader=document.querySelector('[data-product-all-loader]');
  if(loader){
   const tbody=document.querySelector('.product-table tbody'),status=loader.querySelector('[data-product-all-status]'),retry=loader.querySelector('[data-product-all-retry]');
   let offset=Math.max(0,Number(loader.dataset.offset)||0),total=Math.max(offset,Number(loader.dataset.total)||0),busy=false,stopped=false;
   const labelRows=rows=>{const heads=[...document.querySelectorAll('.product-table thead th')].map(x=>String(x.textContent||'').trim());rows.forEach(row=>[...row.children].forEach((cell,index)=>{if(!cell.dataset.label&&heads[index])cell.dataset.label=heads[index]}))};
   const schedule=()=>{if(stopped||offset>=total){loader.classList.add('is-complete');if(status)status.textContent=`${total} / ${total} ürün hazır`;return}const run=()=>load();if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:250});else setTimeout(run,35)};
   const load=async()=>{if(busy||stopped||!tbody)return;busy=true;retry.hidden=true;try{const url=new URL('/products/list-fragment',location.origin);url.searchParams.set('offset',String(offset));url.searchParams.set('limit',String(Math.min(120,Number(loader.dataset.batch)||120)));if(loader.dataset.q)url.searchParams.set('q',loader.dataset.q);if(loader.dataset.sort)url.searchParams.set('sort',loader.dataset.sort);const response=await fetch(url,{headers:{Accept:'text/html','X-Requested-With':'fetch'},credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Liste dilimi yüklenemedi.');const html=await response.text(),holder=document.createElement('tbody');holder.innerHTML=html;const rows=[...holder.children];if(!rows.length){offset=total}else{rows.forEach(row=>tbody.append(row));labelRows(rows);offset+=rows.length}loader.dataset.offset=String(offset);if(status)status.textContent=`${Math.min(offset,total)} / ${total} ürün hazır`;loader.classList.remove('is-error');busy=false;schedule()}catch(error){busy=false;stopped=true;loader.classList.add('is-error');if(status)status.textContent=`${offset} ürün hazır — bağlantı kesildi`;retry.hidden=false}};
   retry?.addEventListener('click',()=>{stopped=false;retry.hidden=true;schedule()});labelRows([...tbody?.children||[]]);schedule();
  }
 });
})();

// crmv1.9 — theme studio ergonomics, resilient media and list presentation.
(()=>{
 'use strict';
 const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
 ready(()=>{
  const themeForm=document.getElementById('themeStudioForm');
  if(themeForm){
   const cards=[
    [document.querySelector('.theme-preset-hub-v18'),'.theme-preset-hub-head-v18','Tema sistemleri'],
    [document.querySelector('.theme-studio-preview-card-v359'),'.login-studio-preview-head','Canlı panel ön izlemesi'],
    [document.querySelector('.theme-studio-controls-v359'),'.login-studio-controls-head','Tasarım kontrolleri'],
    [document.querySelector('.theme-design-library-v363'),'.theme-design-save-v363','Kayıtlı tasarımlar']
   ];
   cards.forEach(([card,head,label],index)=>{
    const header=card?.querySelector(head);if(!card||!header)return;
    card.classList.add('theme-collapsible-v19');header.classList.add('theme-collapsible-head-v19');
    const button=document.createElement('button');button.type='button';button.className='btn btn--sm btn--soft theme-card-toggle-v19';button.dataset.themeCardToggle=String(index);button.setAttribute('aria-expanded','true');button.setAttribute('aria-label',`${label} aç/kapat`);button.textContent='− Kapat';
    header.append(button);button.addEventListener('click',()=>{const collapsed=card.classList.toggle('is-collapsed-v19');button.setAttribute('aria-expanded',String(!collapsed));button.textContent=collapsed?'＋ Aç':'− Kapat'});
   });
  }

  document.querySelectorAll('table').forEach(table=>{
   const headers=[...table.querySelectorAll('thead th')];
   headers.forEach((th,index)=>{const key=String(th.textContent||'').trim().toLocaleLowerCase('tr-TR');if(!/(müşteri|customer|firma|ünvan|unvan|company)/.test(key))return;th.classList.add('company-column-v19');table.querySelectorAll(`tbody tr > td:nth-child(${index+1})`).forEach(td=>{const full=String(td.textContent||'').replace(/\s+/g,' ').trim();if(!full)return;td.classList.add('company-column-v19');td.title=td.title||full})});
  });

  const fallbackText=img=>img.closest('.brand-logo,.product-preview-studio-v20__logo')?'Logo ekle':img.closest('[class*="signature"],[class*="imza"]')?'İmza ekle':'Görsel ekle';
  const mediaFallback=img=>{
   if(!img||img.dataset.mediaFallbackV19==='1')return;img.dataset.mediaFallbackV19='1';img.hidden=true;
   const holder=img.parentElement;if(!holder)return;if(holder.querySelector(':scope > .media-fallback-v19'))return;
   const box=document.createElement('span');box.className='media-fallback-v19';box.setAttribute('role','img');box.setAttribute('aria-label',fallbackText(img));box.innerHTML='<span aria-hidden="true">＋</span><small></small>';box.querySelector('small').textContent=fallbackText(img);holder.append(box);
  };
  const userMediaSelector='.brand-logo img,.thumb img,.product-preview-studio-v20__image img,.product-preview-studio-v20__logo,img[data-empty-image-on-error],[class*="signature"] img,[class*="imza"] img,[class*="logo-preview"] img';
  document.querySelectorAll(userMediaSelector).forEach(img=>{img.addEventListener('error',()=>mediaFallback(img),{once:true});if(img.complete&&(!img.naturalWidth||!img.getAttribute('src')))mediaFallback(img)});
  document.addEventListener('error',event=>{if(event.target?.matches?.(userMediaSelector))mediaFallback(event.target)},true);
  document.querySelectorAll('.thumb:empty').forEach(holder=>{const box=document.createElement('span');box.className='media-fallback-v19';box.innerHTML='<span aria-hidden="true">＋</span><small>Görsel ekle</small>';holder.append(box)});

  document.querySelectorAll('.pager a[href*="show=all"]').forEach(link=>link.addEventListener('click',()=>{document.body.classList.add('list-loading-v19');const veil=document.createElement('div');veil.className='list-loading-veil-v19';veil.innerHTML='<span class="list-loading-spinner-v19"></span><b>Tüm kayıtlar hazırlanıyor…</b><small>Mevcut sayfa kapanmadan liste yükleniyor.</small>';document.body.append(veil)}));
 });
})();

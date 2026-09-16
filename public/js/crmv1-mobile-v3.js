(()=>{
  'use strict';

  const isMobile=()=>window.matchMedia('(max-width: 760px)').matches;
  const locale=String(document.documentElement.lang||document.body?.dataset?.locale||'tr').toLowerCase();
  const text=(tr,en)=>locale.startsWith('en')?en:tr;

  // Every mobile page has one predictable back control. If the page was opened
  // directly, fall back to the dashboard instead of leaving the application.
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-mobile-back]');
    if(!button)return;
    event.preventDefault();
    const fallback=button.dataset.fallback||'/';
    try{
      const sameOriginReferrer=document.referrer&&new URL(document.referrer,location.href).origin===location.origin;
      if(history.length>1&&sameOriginReferrer)history.back();
      else location.assign(fallback);
    }catch{
      location.assign(fallback);
    }
  });

  // Mark product previews so their modal receives a dedicated, full-height
  // desktop canvas rather than inheriting document/PDF preview constraints.
  const previewModal=document.getElementById('globalPreviewModal');
  const previewFrame=document.getElementById('globalPreviewFrame');
  const syncPreviewKind=()=>{
    if(!previewModal||!previewFrame)return;
    const src=String(previewFrame.getAttribute('src')||'');
    previewModal.classList.toggle('is-product-preview-v3',/\/products\/[^/?#]+\/preview(?:[?#]|$)/.test(src));
  };
  if(previewFrame){
    new MutationObserver(syncPreviewKind).observe(previewFrame,{attributes:true,attributeFilter:['src']});
    previewFrame.addEventListener('load',syncPreviewKind);
    syncPreviewKind();
  }

  function nextPageLink(root=document){
    const links=[...root.querySelectorAll('.products-list-form + .pager a[href], .pager a[href]')];
    return links.find(link=>/Sonraki|Next/i.test(link.textContent||''))||null;
  }

  function absoluteLink(link){
    const raw=link?.getAttribute?.('href')||'';
    if(!raw)return '';
    try{return new URL(raw,location.href).href}catch{return raw}
  }

  function refreshProductSelection(){
    const form=document.getElementById('productBulkForm');
    if(!form)return;
    const checks=[...form.querySelectorAll('input[type="checkbox"][name="ids"]')];
    const selected=checks.filter(input=>input.checked).length;
    document.querySelectorAll('[data-selection-count="productBulkForm"]').forEach(node=>node.textContent=String(selected));
    document.querySelectorAll('[data-requires-selection="productBulkForm"]').forEach(node=>node.disabled=selected===0);
    document.querySelectorAll('[data-check-all][data-target-form="productBulkForm"]').forEach(master=>{
      master.checked=checks.length>0&&selected===checks.length;
      master.indeterminate=selected>0&&selected<checks.length;
    });
  }

  function initProductInfiniteScroll(){
    if(!isMobile())return;
    const form=document.getElementById('productBulkForm');
    const tbody=form?.querySelector('.product-table tbody');
    const pager=form?.nextElementSibling?.classList?.contains('pager')?form.nextElementSibling:document.querySelector('.products-list-form + .pager');
    if(!form||!tbody||!pager||form.dataset.mobileInfiniteReady==='1')return;
    form.dataset.mobileInfiniteReady='1';
    pager.classList.add('mobile-infinite-source-v3');

    let next=absoluteLink(nextPageLink(document));
    let loading=false;
    let finished=!next;
    const known=new Set([...tbody.querySelectorAll('tr[data-preview-url]')].map(row=>row.dataset.previewUrl).filter(Boolean));

    const sentinel=document.createElement('div');
    sentinel.className='mobile-product-infinite-v3';
    sentinel.setAttribute('role','status');
    sentinel.setAttribute('aria-live','polite');
    sentinel.innerHTML=`<span class="mobile-product-infinite-v3__spinner" aria-hidden="true"></span><b>${finished?text('Tüm ürünler gösterildi.','All products are displayed.'):text('Aşağı kaydırdıkça ürünler yüklenecek.','Products load as you scroll.')}</b>`;
    pager.insertAdjacentElement('afterend',sentinel);

    const setState=(state,message)=>{
      sentinel.dataset.state=state;
      const label=sentinel.querySelector('b');
      if(label)label.textContent=message;
    };

    const loadNext=async()=>{
      if(loading||finished||!next||!isMobile())return;
      loading=true;
      setState('loading',text('Ürünler yükleniyor…','Loading products…'));
      try{
        const response=await fetch(next,{credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html','X-Requested-With':'mobile-infinite-scroll'}});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const html=await response.text();
        const doc=new DOMParser().parseFromString(html,'text/html');
        const incoming=[...doc.querySelectorAll('#productBulkForm .product-table tbody tr.previewable-list-row')];
        let appended=0;
        for(const row of incoming){
          const key=row.dataset.previewUrl||'';
          if(key&&known.has(key))continue;
          if(key)known.add(key);
          tbody.append(document.importNode(row,true));
          appended++;
        }
        const nextLink=nextPageLink(doc);
        next=absoluteLink(nextLink);
        finished=!next;
        refreshProductSelection();
        document.dispatchEvent(new CustomEvent('crm:mobile-products-appended',{detail:{appended,finished}}));
        setState(finished?'done':'ready',finished?text('Tüm ürünler gösterildi.','All products are displayed.'):text('Daha fazla ürün için aşağı kaydırın.','Scroll for more products.'));
      }catch(error){
        console.error('[mobile product infinite scroll]',error);
        setState('error',text('Ürünler yüklenemedi. Yeniden denemek için dokunun.','Products could not be loaded. Tap to retry.'));
      }finally{
        loading=false;
      }
    };

    sentinel.addEventListener('click',()=>{if(sentinel.dataset.state==='error'||sentinel.dataset.state==='ready')loadNext()});
    form.addEventListener('change',event=>{if(event.target.matches('input[type="checkbox"][name="ids"], [data-check-all]'))queueMicrotask(refreshProductSelection)});

    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting))loadNext();
      },{root:null,rootMargin:'500px 0px 500px',threshold:0.01});
      observer.observe(sentinel);
    }else{
      const onScroll=()=>{
        if(sentinel.getBoundingClientRect().top<innerHeight+500)loadNext();
      };
      addEventListener('scroll',onScroll,{passive:true});
      onScroll();
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initProductInfiniteScroll,{once:true});
  else initProductInfiniteScroll();
})();

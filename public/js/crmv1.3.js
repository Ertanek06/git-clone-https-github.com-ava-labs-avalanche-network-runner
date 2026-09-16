(()=>{
  'use strict';
  const modal=document.getElementById('globalPreviewModal');
  const frame=document.getElementById('globalPreviewFrame');
  const isProduct=()=>/\/products\/[^/?#]+\/preview(?:[?#]|$)/.test(String(frame?.getAttribute('src')||frame?.src||''));
  const sync=()=>{
    if(!modal||!frame)return;
    const active=isProduct();
    modal.classList.toggle('is-product-preview-v13',active);
    if(active){
      frame.setAttribute('scrolling','yes');
      frame.style.overflow='auto';
    }
  };
  if(frame){
    new MutationObserver(sync).observe(frame,{attributes:true,attributeFilter:['src']});
    frame.addEventListener('load',()=>{
      sync();
      if(!isProduct())return;
      try{
        frame.contentDocument.documentElement.style.overflowY='scroll';
        frame.contentDocument.body.style.overflowY='auto';
      }catch{}
    });
    sync();
  }
})();

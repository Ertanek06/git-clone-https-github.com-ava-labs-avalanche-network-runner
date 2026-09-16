(()=>{
  'use strict';

  const quotePreviewPath=value=>{
    try{return /^\/quotes\/[^/]+\/preview$/.test(new URL(String(value||''),location.origin).pathname)}
    catch{return /\/quotes\/[^/?#]+\/preview(?:[?#]|$)/.test(String(value||''))}
  };
  const modal=document.getElementById('globalPreviewModal');
  const frame=document.getElementById('globalPreviewFrame');
  if(!modal||!frame)return;

  const sync=()=>{
    const active=quotePreviewPath(frame.getAttribute('src')||frame.src);
    modal.classList.toggle('is-quote-preview-v112',active);
    if(!active)return;
    frame.setAttribute('scrolling','yes');
    frame.style.setProperty('overflow','auto','important');
    frame.style.setProperty('touch-action','pan-x pan-y','important');
  };
  new MutationObserver(sync).observe(frame,{attributes:true,attributeFilter:['src']});
  frame.addEventListener('load',sync);
  sync();
})();

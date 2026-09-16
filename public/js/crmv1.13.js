(()=>{
  'use strict';

  const readyType='crm:quote-preview-ready-v114';
  const isQuotePreview=/^\/quotes\/[^/]+\/preview$/.test(location.pathname);

  /* Quote document: paginate immediately, keep one native scroll surface and
     fit A4 pages to narrow mobile frames without cropping their total height. */
  if(isQuotePreview){
    const pagesRoot=()=>document.getElementById('print-pages')||document.querySelector('.custom-template-a4,.a4');
    let fitTimer=0;
    const fit=()=>{
      const root=pagesRoot();
      if(!root)return;
      root.style.removeProperty('zoom');
      root.style.removeProperty('width');
      root.style.removeProperty('margin');
      const page=root.querySelector?.('.print-page')||document.querySelector('.custom-template-a4,.a4');
      if(!page)return;
      const narrow=matchMedia('(max-width:760px)').matches;
      if(narrow){
        const naturalWidth=Math.max(page.offsetWidth,Math.round(page.getBoundingClientRect().width));
        const available=Math.max(240,document.documentElement.clientWidth-12);
        if(naturalWidth>0){
          const scale=Math.max(.25,Math.min(1,available/naturalWidth));
          root.style.setProperty('width',`${naturalWidth}px`,'important');
          root.style.setProperty('zoom',String(scale),'important');
          root.style.setProperty('margin','0 auto','important');
          root.dataset.mobilePreviewScale=scale.toFixed(4);
        }
      }
      for(const el of [document.documentElement,document.body]){
        if(!el)continue;
        el.style.setProperty('height','auto','important');
        el.style.setProperty('min-height','100%','important');
        el.style.setProperty('overflow-x',narrow?'hidden':'auto','important');
        el.style.setProperty('overflow-y','auto','important');
        el.style.setProperty('touch-action','pan-x pan-y','important');
        el.style.setProperty('overscroll-behavior','auto','important');
        el.style.setProperty('-webkit-overflow-scrolling','touch','important');
      }
      if(window.parent!==window)window.parent.postMessage({type:readyType},location.origin);
    };
    /* Pagination dispatches its ready event synchronously during DOMContentLoaded.
       Fit in that same task so an unscaled A4 page is never painted first. */
    const schedule=()=>{clearTimeout(fitTimer);fitTimer=0;fit()};
    window.addEventListener('print-pagination-ready',schedule);
    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('orientationchange',schedule,{passive:true});
    window.addEventListener('beforeprint',()=>{
      const root=pagesRoot();
      for(const property of ['zoom','width','margin'])root?.style.removeProperty(property);
      for(const el of [document.documentElement,document.body]){
        for(const property of ['height','min-height','overflow-x','overflow-y','touch-action','overscroll-behavior','-webkit-overflow-scrolling'])el?.style.removeProperty(property);
      }
    });
    window.addEventListener('afterprint',schedule);
    if(window.__printPaginationReady)schedule();
    else document.addEventListener('DOMContentLoaded',schedule,{once:true});
    document.fonts?.ready?.then(schedule).catch(()=>{});
  }

  /* Main preview modal: never cover or hide the iframe. Its native scroll bar
     remains available while the document finishes paginating. */
  const globalModal=document.getElementById('globalPreviewModal');
  const globalFrame=document.getElementById('globalPreviewFrame');
  if(globalModal&&globalFrame){
    const clear=()=>{globalModal.classList.remove('is-preview-loading-v113');globalModal.classList.remove('is-preview-loading-v114');globalFrame.removeAttribute('aria-busy');globalFrame.style.removeProperty('visibility');globalFrame.style.removeProperty('opacity')};
    const arm=()=>{
      const src=String(globalFrame.getAttribute('src')||'');
      if(!globalModal.classList.contains('is-open')||!src||src==='about:blank'){clear();return}
      globalModal.classList.add('is-preview-loading-v114');
      globalFrame.setAttribute('aria-busy','true');
      globalFrame.setAttribute('scrolling','yes');
    };
    new MutationObserver(arm).observe(globalFrame,{attributes:true,attributeFilter:['src']});
    globalFrame.addEventListener('load',()=>{clear();globalFrame.setAttribute('scrolling','yes')});
    globalFrame.addEventListener('error',clear);
    window.addEventListener('message',event=>{
      if(event.origin===location.origin&&event.source===globalFrame.contentWindow&&[readyType,'crm:preview-dom-ready-v132'].includes(event.data?.type))clear();
    });
  }

  /* Customer card nested preview: the iframe owns vertical scrolling. No
     transform/height postMessage loop and no automatic reload watchdog. */
  const panel=document.getElementById('customerInlinePreview');
  const frame=document.getElementById('customerInlinePreviewFrame');
  if(!panel||!frame)return;
  const clearInline=()=>{panel.classList.remove('is-loading-v113');panel.classList.remove('is-loading-v114');frame.removeAttribute('aria-busy')};
  const armInline=()=>{
    const src=String(frame.getAttribute('src')||'');
    if(panel.hidden||!src||src==='about:blank'){clearInline();return}
    panel.classList.add('is-loading-v114');
    frame.setAttribute('aria-busy','true');
    frame.setAttribute('scrolling','yes');
  };
  new MutationObserver(armInline).observe(frame,{attributes:true,attributeFilter:['src']});
  frame.addEventListener('load',()=>{clearInline();frame.setAttribute('scrolling','yes')});
  frame.addEventListener('error',clearInline);
  window.addEventListener('message',event=>{
    if(event.origin===location.origin&&event.source===frame.contentWindow&&[readyType,'crm:preview-dom-ready-v132'].includes(event.data?.type))clearInline();
  });
  document.addEventListener('click',event=>{
    if(event.target.closest?.('.js-inline-quote-preview'))setTimeout(armInline,0);
    if(event.target.closest?.('#customerInlinePreviewClose'))clearInline();
  });
})();

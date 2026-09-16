(()=>{
  'use strict';
  const selector = [
    '.line-edit-preview img',
    '.quick-product-image-preview img',
    '.quote-product-option__thumb img',
    '.quote-line-image img',
    '.quote-detail-thumb img',
    '.import-product-image-box img',
    '.product-image-preview img',
    '.product-thumb img',
    '.thumb img',
    '[data-product-image-box] img',
    '.product-preview-studio-v20__image img'
  ].join(',');

  function fit(img){
    if(!(img instanceof HTMLImageElement)) return;
    const set=(name,value)=>img.style.setProperty(name,value,'important');
    set('position','static');
    set('inset','auto');
    set('display','block');
    set('width','auto');
    set('height','auto');
    set('min-width','0');
    set('min-height','0');
    set('max-width','100%');
    set('max-height','100%');
    set('aspect-ratio','auto');
    set('object-fit','contain');
    set('object-position','50% 50%');
    set('margin','auto');
    set('padding','0');
    set('transform','none');
    set('clip','auto');
    set('clip-path','none');
    img.dataset.fullProductImage='1';
  }

  function scan(root=document){
    if(root instanceof HTMLImageElement && root.matches(selector)) fit(root);
    root.querySelectorAll?.(selector).forEach(fit);
  }

  window.CRM_PRODUCT_IMAGE_FIT = fit;
  document.addEventListener('DOMContentLoaded',()=>scan());
  document.addEventListener('load',event=>{
    const img=event.target;
    if(img instanceof HTMLImageElement && img.matches(selector)) fit(img);
  },true);

  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='childList') record.addedNodes.forEach(node=>{
        if(node instanceof Element) scan(node);
      });
      if(record.type==='attributes' && record.target instanceof HTMLImageElement && record.target.matches(selector)) fit(record.target);
    }
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
})();

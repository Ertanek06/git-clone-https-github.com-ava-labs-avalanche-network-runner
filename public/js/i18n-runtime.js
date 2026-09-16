// crmV13 — lightweight UI translation fallback.
// Primary translations are rendered server-side. This file only handles small dynamic UI fragments.
(()=>{
  const getLocale=()=>document.body?.dataset?.locale||document.documentElement.lang||'tr';
  const EN={
    'İşlem onayı':'Confirm Action','Bu işlem uygulanacaktır. Onaylıyor musunuz?':'This action will be applied. Do you want to continue?',
    'Onayla':'Confirm','Vazgeç':'Cancel','İptal':'Cancel','Kapat':'Close','Kaydet':'Save','Sil':'Delete','Düzenle':'Edit',
    'Seçilenleri Sil':'Delete Selected','Tümünü Seç':'Select All','Temizle':'Clear','Filtrele':'Filter',
    'Arka Planda Devam Et':'Continue in Background','İptal Et ve Çık':'Cancel Task and Leave','Sayfada Kal':'Stay on Page',
    'Tarama işlemi devam ediyor':'Scanning is still in progress','Bu sayfadan ayrılmak istediğiniz işlemi seçin.':'Choose what should happen before leaving this page.',
    'İşlem arka planda devam eder. Geri döndüğünüzde aynı durumu görürsünüz.':'The task continues in the background. You will see the same status when you return.',
    'Worker ve OCR işlemleri durdurulur, geçici dosyalar temizlenir.':'The worker and OCR processes are stopped and temporary files are removed.',
    'Bu sayfada kalır ve taramayı izlemeye devam edersiniz.':'Stay on this page and continue monitoring the scan.',
    'Proforma taranıyor':'Scanning Proforma','İptal Et':'Cancel Task','Tarama tamamlandı. Ön izleme açılıyor...':'Scan complete. Opening preview...',
    'Tarama tamamlanamadı':'Scan Failed','Ön İzlemeyi Aç':'Open Preview','Arka planda çalışıyor':'Running in Background',
    'Tam Ekran Tema Ön İzlemesi':'Full-Screen Theme Preview','Kaydedilmemiş mevcut tasarım gösterilir.':'The current unsaved design is shown.',
    'Aç':'Open','Tamamla':'Complete','+1 Gün':'+1 Day','Not':'Note','Detaylar':'Details'
  };
  const attrs=['title','aria-label','placeholder','data-confirm','data-message','data-title'];
  const translateText=value=>{
    if(getLocale()!=='en')return value;
    const raw=String(value??''), core=raw.trim();
    if(!core)return raw;
    const mapped=EN[core];
    if(!mapped)return raw;
    return raw.replace(core,mapped);
  };
  const blocked=el=>!el||el.closest?.('script,style,textarea,[contenteditable="true"],.quote-print,.public-quote-sheet,[data-no-auto-i18n]');
  const translateElement=el=>{
    if(getLocale()!=='en'||!el||el.nodeType!==1||blocked(el))return;
    attrs.forEach(a=>{if(el.hasAttribute(a)){const old=el.getAttribute(a),next=translateText(old);if(next!==old)el.setAttribute(a,next)}});
    if(el.tagName==='INPUT'&&['button','submit','reset'].includes((el.type||'').toLowerCase())){const next=translateText(el.value);if(next!==el.value)el.value=next;}
    for(const node of el.childNodes){if(node.nodeType===3&&!blocked(el)){const next=translateText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}}
  };
  const translateTree=root=>{
    if(getLocale()!=='en'||!root)return;
    if(root.nodeType===1)translateElement(root);
    root.querySelectorAll?.('[title],[aria-label],[placeholder],[data-confirm],[data-message],[data-title],button,input[type="button"],input[type="submit"],input[type="reset"]').forEach(translateElement);
  };
  window.CRM_TRANSLATE_PAGE=translateTree;
  // Static page labels are translated on the server. Do not rescan the full document here.
  // Batch only newly inserted small UI roots. Never rescan the whole document and never observe attributes.
  let queue=new Set(),scheduled=false;
  const flush=()=>{scheduled=false;const items=[...queue];queue.clear();items.forEach(n=>translateTree(n));};
  const observer=new MutationObserver(records=>{
    if(getLocale()!=='en')return;
    for(const record of records){for(const node of record.addedNodes){if(node.nodeType===1&&node.childElementCount<250)queue.add(node);}}
    if(queue.size&&!scheduled){scheduled=true;requestAnimationFrame(flush);}
  });
  const start=()=>document.body&&observer.observe(document.body,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

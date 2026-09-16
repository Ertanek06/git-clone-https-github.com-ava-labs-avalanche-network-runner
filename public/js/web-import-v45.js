(function(){
  "use strict";
  function byId(id){return document.getElementById(id)}
  function csrf(){return document.querySelector('meta[name="csrf-token"]')?.content||document.getElementById("webImportPreview")?.dataset.csrf||document.querySelector('input[name="_csrf"]')?.value||""}
  function jsonPost(url,data){
    var body=new URLSearchParams();Object.keys(data||{}).forEach(function(k){body.set(k,data[k]==null?"":String(data[k]))});body.set("_csrf",csrf());
    return fetch(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8","accept":"application/json"},body:body.toString(),credentials:"same-origin"})
      .then(function(r){return r.json().catch(function(){return {ok:false,message:"Sunucu yanıtı okunamadı."}}).then(function(j){if(!r.ok||j.ok===false)throw new Error(j.message||"İşlem başarısız.");return j})});
  }
  function trDate(v){var n=Number(v||0);if(!n)return "-";try{return new Date(n).toLocaleString("tr-TR")}catch(_e){return "-"}}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]})}
  function centerToast(message,kind){
    var old=document.getElementById("webImportCenterToast");if(old)old.remove();
    var node=document.createElement("div");node.id="webImportCenterToast";node.className="web-import-center-toast "+(kind||"success");
    node.innerHTML='<b>'+esc(message)+'</b><small>Bu bildirim 10 saniye sonra otomatik kapanır.</small>';document.body.appendChild(node);
    requestAnimationFrame(function(){node.classList.add("show")});setTimeout(function(){node.classList.remove("show");setTimeout(function(){node.remove()},250)},10000);
  }

  var progress=byId("webScanProgress");
  if(progress){
    var jobId=progress.dataset.jobId,timer=null,carouselTimer=null,lastSignature="",lastImportedSignature="";
    var labels={queued:"Tarama hazırlanıyor…",discover:"Kaynak siteye bağlanılıyor…",sitemap:"Sitemap dosyaları taranıyor…",crawl:"Site ve kategori bağlantıları taranıyor…",probe:"Ürün sayfası yapısı doğrulanıyor…",analyze:"Ürün bilgileri analiz ediliyor…",ready:"Kontrol tablosu hazır",import:"Seçili ürünler CRM'e aktarılıyor…",imported:"Aktarım tamamlandı",error:"Tarama tamamlanamadı",cancelled:"Tarama durduruldu"};
    var track=byId("webLiveTrack"),empty=byId("webLiveEmpty"),current=byId("webLiveCurrent");
    function productCard(item,large){
      item=item||{};var media=item.image_url?'<img loading="lazy" referrerpolicy="no-referrer" src="'+esc(item.image_url)+'" alt="">':'<div class="web-live-noimg">📦</div>';
      var link=item.product_url?'<a href="'+esc(item.product_url)+'" target="_blank" rel="noopener">Kaynak sayfa ↗</a>':'';
      return media+'<div><b>'+esc(item.name||"Ürün adı bekleniyor")+'</b><small>'+(item.code?"Kod: "+esc(item.code):"Kod bekleniyor")+(item.brand?" · "+esc(item.brand):"")+(item.model?" · "+esc(item.model):"")+'</small>'+(item.price?'<strong>'+Number(item.price).toLocaleString("tr-TR",{maximumFractionDigits:2})+' '+esc(item.currency||"TRY")+'</strong>':'')+link+(item.warning?'<em>'+esc(item.warning)+'</em>':'')+'</div>';
    }
    function bindImgErrors(root){root?.querySelectorAll("img").forEach(function(img){img.addEventListener("error",function(){img.replaceWith(Object.assign(document.createElement("div"),{className:"web-live-noimg",textContent:"📦"}))},{once:true})})}
    function renderRecent(items,last){
      items=Array.isArray(items)?items:[];var sig=items.map(function(x){return [x.index,x.code,x.name,x.image_url].join("|")}).join(";")+"|"+String(last?.code||"");if(sig===lastSignature)return;lastSignature=sig;
      if(current){if(last&&last.name){current.hidden=false;current.innerHTML=productCard(last,true);bindImgErrors(current)}else current.hidden=true}
      if(!track)return;track.innerHTML="";if(empty)empty.hidden=items.length>0||!!last?.name;
      items.forEach(function(item){var card=document.createElement("article");card.className="web-live-product is-new";card.innerHTML=productCard(item,false);bindImgErrors(card);track.appendChild(card)});
      if(items.length)setTimeout(function(){track.scrollTo({left:track.scrollWidth,behavior:"smooth"})},50);
    }
    function moveCarousel(dir){if(!track)return;var card=track.querySelector(".web-live-product"),step=(card?card.getBoundingClientRect().width:240)+10;track.scrollBy({left:dir*step,behavior:"smooth"})}
    byId("webLivePrev")?.addEventListener("click",function(){moveCarousel(-1)});byId("webLiveNext")?.addEventListener("click",function(){moveCarousel(1)});
    carouselTimer=setInterval(function(){if(!track||track.children.length<2)return;var nearEnd=track.scrollLeft+track.clientWidth>=track.scrollWidth-20;track.scrollTo({left:nearEnd?0:track.scrollLeft+250,behavior:"smooth"})},3200);
    function setProgress(j){var running=["QUEUED","RUNNING","IMPORTING"].includes(j.status),pct=j.progress==null?null:Math.max(0,Math.min(100,Number(j.progress||0))),scanTrack=byId("webScanTrack"),bar=byId("webScanBar"),percent=byId("webScanPercent");if(scanTrack)scanTrack.classList.toggle("is-indeterminate",pct==null&&running);if(bar&&pct!=null)bar.style.width=pct+"%";if(percent)percent.textContent=pct==null?(running?"CANLI":"-"):pct+"%"}
    function finishPolling(){if(timer){clearInterval(timer);timer=null}if(carouselTimer){clearInterval(carouselTimer);carouselTimer=null}}
    function poll(){
      fetch("/products/import-web/scan/"+encodeURIComponent(jobId)+"/status",{headers:{accept:"application/json"},credentials:"same-origin"}).then(function(r){return r.json().then(function(j){if(!r.ok||j.ok===false)throw new Error(j.message||"Durum alınamadı");return j})}).then(function(data){
        var j=data.job||{};setProgress(j);
        if(byId("webFound"))byId("webFound").textContent=Number(j.validProducts||j.discovered||0);if(byId("webAnalyzed"))byId("webAnalyzed").textContent=Number(j.analyzed||0);if(byId("webWarnings"))byId("webWarnings").textContent=Number(j.warnings||0);if(byId("webStatus"))byId("webStatus").textContent=j.status||"-";if(byId("webSitemaps"))byId("webSitemaps").textContent=Number(j.discoverySitemaps||j.discovery?.sitemap_count||0);if(byId("webPages"))byId("webPages").textContent=Number(j.discoveryPages||j.discovery?.page_count||0);if(byId("webStarted"))byId("webStarted").textContent=trDate(j.startedAt||j.createdAt);if(byId("webUpdated"))byId("webUpdated").textContent=trDate(j.updatedAt);
        if(byId("webScanStage"))byId("webScanStage").textContent=labels[j.stage]||labels[String(j.status||"").toLowerCase()]||"Tarama devam ediyor…";if(byId("webScanMessage"))byId("webScanMessage").textContent=j.message||"İşlem devam ediyor.";
        renderRecent(j.recentProducts||[],j.lastProduct||null);
        var err=byId("webScanError"),ready=byId("webScanReady"),cancel=byId("webScanCancelForm"),retry=byId("webScanRetryForm");if(cancel)cancel.hidden=!["QUEUED","RUNNING"].includes(j.status);if(retry)retry.hidden=!["ERROR","CANCELLED"].includes(j.status);
        if(j.status==="READY"){if(ready)ready.hidden=false;if(err){err.hidden=!j.importError;err.textContent=j.importError||""}}
        else if(j.status==="IMPORTING"){if(ready)ready.hidden=true;if(err)err.hidden=true}
        else if(j.status==="IMPORTED"){
          finishPolling();if(ready)ready.hidden=true;if(err)err.hidden=true;var r=j.importResult||{},sig=[r.added,r.updated,r.skipped,r.imageWarnings,r.documentWarnings].join("|");if(sig!==lastImportedSignature){lastImportedSignature=sig;centerToast((Number(r.added||0))+" yeni ürün eklendi, "+Number(r.updated||0)+" ürün güncellendi, "+Number(r.skipped||0)+" ürün atlandı.","success");setTimeout(function(){window.location.href="/products"},10000)}
        } else if(j.status==="ERROR"||j.status==="CANCELLED"){finishPolling();if(ready)ready.hidden=true;if(err){err.hidden=false;err.textContent=j.error||j.message||(j.status==="CANCELLED"?"Tarama durduruldu.":"Tarama başarısız.")}}
      }).catch(function(e){var el=byId("webScanMessage");if(el)el.textContent="Canlı durum bağlantısı yeniden deneniyor: "+(e.message||"bağlantı hatası")})
    }
    poll();timer=setInterval(poll,1100);
  }

  var preview=byId("webImportPreview");if(!preview)return;
  preview.querySelectorAll("img.web-import-thumb").forEach(function(img){img.addEventListener("error",function(){img.hidden=true;var fallback=img.nextElementSibling;if(fallback)fallback.hidden=false},{once:true})});
  var previewJobId=preview.dataset.jobId,saving=0;
  preview.querySelectorAll(".web-row-selected").forEach(function(box){box.dataset.lastChecked=box.checked?"1":"0"});
  function selectedUi(total){["webSelectedTotal","webControlSelected","webDockSelected"].forEach(function(id){if(byId(id))byId(id).textContent=String(total)})}
  function bulkState(message,bad){var el=byId("webBulkState");if(el){el.textContent=message||"";el.style.color=bad?"#b91c1c":"#166534"}}
  function mainRow(index){return preview.querySelector('.web-main-row[data-row-index="'+index+'"]')}
  function state(index,text,bad){var el=mainRow(index)?.querySelector(".web-row-save-state");if(el){el.textContent=text||"";el.style.color=bad?"#b91c1c":"#166534"}}
  function saveField(el){var row=el.closest("tr"),index=(row?.dataset.detailIndex||row?.dataset.rowIndex||"");if(index==="")return;var field=el.dataset.webField;if(!field)return;var value=el.type==="checkbox"?(el.checked?"1":"0"):el.value,previous=el.type==="checkbox"?el.dataset.lastChecked:null;state(index,"Kaydediliyor…",false);saving++;jsonPost("/products/import-web/scan/"+encodeURIComponent(previewJobId)+"/row/"+encodeURIComponent(index),{[field]:value}).then(function(r){state(index,r.status==="UPDATE"?"✓ Mevcut ürün güncelleme için hazır":r.status==="CURRENT"?"✓ CRM ile güncel":"✓ Kaydedildi",false);var box=mainRow(index)?.querySelector(".web-row-selected");if(box){box.disabled=!r.selectable;if(!r.selectable)box.checked=false;box.dataset.lastChecked=box.checked?"1":"0"}if(r.selected!=null)selectedUi(Number(r.selected||0))}).catch(function(e){if(el.type==="checkbox"&&previous!=null)el.checked=previous==="1";state(index,e.message||"Kayıt hatası",true);centerToast(e.message||"Seçim kaydedilemedi.","error")}).finally(function(){saving=Math.max(0,saving-1)})}
  preview.addEventListener("change",function(e){var el=e.target.closest("[data-web-field]");if(el)saveField(el)});
  preview.addEventListener("click",function(e){var btn=e.target.closest(".web-detail-toggle");if(!btn)return;e.preventDefault();var row=btn.closest(".web-main-row"),idx=row?.dataset.rowIndex,detail=preview.querySelector('.web-detail-row[data-detail-index="'+idx+'"]');if(!detail)return;detail.hidden=!detail.hidden;btn.setAttribute("aria-expanded",String(!detail.hidden));btn.textContent=detail.hidden?"Detay / Düzenle":"Detayı Kapat"});
  var importForm=document.querySelector("form.web-import-dock");if(importForm)importForm.addEventListener("submit",function(e){var total=Number(byId("webSelectedTotal")?.textContent||0);if(total<=0){e.preventDefault();centerToast("Kaydetmeden önce en az bir ürün seçin.","error");return}var btn=importForm.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="Aktarım kuyruğa alınıyor…"}if(saving<=0)return;e.preventDefault();var wait=setInterval(function(){if(saving>0)return;clearInterval(wait);HTMLFormElement.prototype.submit.call(importForm)},120)});
  preview.addEventListener("click",function(event){var button=event.target.closest("[data-web-bulk-select]");if(!button)return;event.preventDefault();
    var scope=button.dataset.webBulkSelect||"PAGE",selected=button.dataset.selected!=="0",boxes=Array.from(preview.querySelectorAll(".web-row-selected:not(:disabled)"));
    var indices=boxes.map(function(box){return box.closest(".web-main-row")?.dataset.rowIndex}).filter(function(v){return v!==undefined&&v!==null&&v!==""});
    var before=boxes.map(function(box){return box.checked});
    if(scope==="PAGE") boxes.forEach(function(box){box.checked=selected});
    preview.querySelectorAll("[data-web-bulk-select]").forEach(function(btn){btn.disabled=true});bulkState("Seçim kaydediliyor…",false);saving++;
    jsonPost("/products/import-web/scan/"+encodeURIComponent(previewJobId)+"/rows/select",{indices:indices.join(","),scope:scope,q:preview.dataset.query||"",filter:preview.dataset.filter||"ALL",selected:selected?"1":"0"}).then(function(r){
      if(scope==="FILTERED") boxes.forEach(function(box){box.checked=selected});
      boxes.forEach(function(box){box.dataset.lastChecked=box.checked?"1":"0"});selectedUi(Number(r.selected||0));bulkState(Number(r.changed||0)+" ürün için seçim kaydedildi.",false);
      centerToast((selected?"Seçim yapıldı: ":"Seçim kaldırıldı: ")+Number(r.changed||0)+" ürün.","success");
    }).catch(function(e){boxes.forEach(function(box,index){box.checked=before[index]});bulkState(e.message||"Seçim kaydedilemedi.",true);centerToast(e.message||"Seçim kaydedilemedi.","error")}).finally(function(){preview.querySelectorAll("[data-web-bulk-select]").forEach(function(btn){btn.disabled=false});saving=Math.max(0,saving-1)})
  });
  preview.addEventListener("click",function(e){var btn=e.target.closest("[data-web-row-remove]");if(!btn)return;e.preventDefault();var row=btn.closest(".web-main-row"),index=row?.dataset.rowIndex,ignored=btn.dataset.nextIgnored||"1";if(index==null)return;if(ignored==="1"&&!confirm("Bu ürün yalnızca bu tarama listesinden kaldırılsın mı? CRM ürünü silinmez."))return;btn.disabled=true;saving++;jsonPost("/products/import-web/scan/"+encodeURIComponent(previewJobId)+"/row/"+encodeURIComponent(index),{ignored:ignored}).then(function(){centerToast(ignored==="1"?"Ürün tarama listesinden kaldırıldı.":"Ürün tarama listesine geri alındı.","success");setTimeout(function(){location.reload()},300)}).catch(function(err){btn.disabled=false;centerToast(err.message||"İşlem yapılamadı.","error")}).finally(function(){saving=Math.max(0,saving-1)})});
})();

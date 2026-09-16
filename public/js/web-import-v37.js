(function(){
  "use strict";
  function byId(id){return document.getElementById(id)}
  function csrf(){return document.querySelector('meta[name="csrf-token"]')?.content||""}
  function jsonPost(url,data){
    var body=new URLSearchParams();
    Object.keys(data||{}).forEach(function(k){body.set(k,data[k]==null?"":String(data[k]))});
    body.set("_csrf",csrf());
    return fetch(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8","accept":"application/json"},body:body.toString(),credentials:"same-origin"})
      .then(function(r){return r.json().catch(function(){return {ok:false,message:"Sunucu yanıtı okunamadı."}}).then(function(j){if(!r.ok||j.ok===false)throw new Error(j.message||"İşlem başarısız.");return j})});
  }
  function trDate(v){
    var n=Number(v||0); if(!n)return "-";
    try{return new Date(n).toLocaleString("tr-TR")}catch(_e){return "-"}
  }
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]})}

  var progress=byId("webScanProgress");
  if(progress){
    var jobId=progress.dataset.jobId, timer=null, carouselTimer=null, lastSignature="";
    var labels={queued:"Tarama hazırlanıyor…",discover:"Kaynak siteye bağlanılıyor…",sitemap:"Sitemap dosyaları taranıyor…",crawl:"Site ve kategori bağlantıları taranıyor…",probe:"Ürün sayfası yapısı doğrulanıyor…",analyze:"Ürün bilgileri analiz ediliyor…",ready:"Tarama tamamlandı",imported:"Ürünler CRM’e aktarıldı",error:"Tarama tamamlanamadı",cancelled:"Tarama durduruldu"};
    var track=byId("webLiveTrack"), empty=byId("webLiveEmpty");

    function renderRecent(items){
      if(!track)return;
      items=Array.isArray(items)?items:[];
      var sig=items.map(function(x){return [x.index,x.code,x.name,x.image_url].join("|")}).join(";");
      if(sig===lastSignature)return;
      lastSignature=sig;
      track.innerHTML="";
      if(empty)empty.hidden=items.length>0;
      items.forEach(function(item){
        var card=document.createElement("article"); card.className="web-live-product is-new";
        var media=item.image_url?'<img loading="lazy" referrerpolicy="no-referrer" src="'+esc(item.image_url)+'" alt="">':'<div class="web-live-noimg">📦</div>';
        card.innerHTML=media+'<div><b>'+esc(item.name||"Ürün adı alınamadı")+'</b><small>'+(item.code?"Kod: "+esc(item.code):"Ürün kodu bekleniyor")+'</small>'+(item.warning?'<em>'+esc(item.warning)+'</em>':'')+'</div>';
        var img=card.querySelector("img"); if(img)img.addEventListener("error",function(){img.replaceWith(Object.assign(document.createElement("div"),{className:"web-live-noimg",textContent:"📦"}))},{once:true});
        track.appendChild(card);
      });
      if(items.length){setTimeout(function(){track.scrollTo({left:track.scrollWidth,behavior:"smooth"})},60)}
    }
    function moveCarousel(dir){if(!track)return;var card=track.querySelector(".web-live-product");var step=(card?card.getBoundingClientRect().width:240)+10;track.scrollBy({left:dir*step,behavior:"smooth"})}
    byId("webLivePrev")?.addEventListener("click",function(){moveCarousel(-1)});
    byId("webLiveNext")?.addEventListener("click",function(){moveCarousel(1)});
    carouselTimer=setInterval(function(){if(!track||track.children.length<2)return;var nearEnd=track.scrollLeft+track.clientWidth>=track.scrollWidth-20;track.scrollTo({left:nearEnd?0:track.scrollLeft+250,behavior:"smooth"})},3200);

    function setProgress(j){
      var running=["QUEUED","RUNNING"].includes(j.status);
      var pct=j.progress==null?null:Math.max(0,Math.min(100,Number(j.progress||0)));
      var scanTrack=byId("webScanTrack"), bar=byId("webScanBar"), percent=byId("webScanPercent");
      if(scanTrack)scanTrack.classList.toggle("is-indeterminate",pct==null&&running);
      if(bar&&pct!=null)bar.style.width=pct+"%";
      if(percent)percent.textContent=pct==null?(running?"CANLI":"-"):pct+"%";
    }
    function finishPolling(){if(timer){clearInterval(timer);timer=null} if(carouselTimer){clearInterval(carouselTimer);carouselTimer=null}}
    function poll(){
      fetch("/products/import-web/scan/"+encodeURIComponent(jobId)+"/status",{headers:{accept:"application/json"},credentials:"same-origin"})
        .then(function(r){return r.json().then(function(j){if(!r.ok||j.ok===false)throw new Error(j.message||"Durum alınamadı");return j})})
        .then(function(data){
          var j=data.job||{}; setProgress(j);
          if(byId("webFound"))byId("webFound").textContent=Number(j.discovered||0);
          if(byId("webAnalyzed"))byId("webAnalyzed").textContent=Number(j.analyzed||0);
          if(byId("webWarnings"))byId("webWarnings").textContent=Number(j.warnings||0);
          if(byId("webStatus"))byId("webStatus").textContent=j.status||"-";
          if(byId("webSitemaps"))byId("webSitemaps").textContent=Number(j.discoverySitemaps||j.discovery?.sitemap_count||0);
          if(byId("webPages"))byId("webPages").textContent=Number(j.discoveryPages||j.discovery?.page_count||0);
          if(byId("webStarted"))byId("webStarted").textContent=trDate(j.startedAt||j.createdAt);
          if(byId("webUpdated"))byId("webUpdated").textContent=trDate(j.updatedAt);
          if(byId("webScanStage"))byId("webScanStage").textContent=labels[j.stage]||labels[String(j.status||"").toLowerCase()]||"Tarama devam ediyor…";
          if(byId("webScanMessage"))byId("webScanMessage").textContent=j.message||(j.stage==="analyze"?Number(j.analyzed||0)+" / "+Number(j.discovered||0)+" ürün sayfası işlendi.":"Gerçek ürün bağlantıları aranıyor.");
          renderRecent(j.recentProducts||[]);
          var err=byId("webScanError"), ready=byId("webScanReady");
          if(j.status==="READY"){
            finishPolling(); if(ready)ready.hidden=false; if(err)err.hidden=true;
          } else if(j.status==="IMPORTED"){
            finishPolling(); if(ready){ready.hidden=false;var b=ready.querySelector("b");if(b)b.textContent="✓ Ürünler CRM’e aktarıldı"}
          } else if(j.status==="ERROR"||j.status==="CANCELLED"){
            finishPolling(); if(err){err.hidden=false;err.textContent=j.error||j.message||(j.status==="CANCELLED"?"Tarama durduruldu.":"Tarama başarısız.")}
          }
        })
        .catch(function(e){var el=byId("webScanMessage");if(el)el.textContent="Canlı durum bağlantısı yeniden deneniyor: "+(e.message||"bağlantı hatası")});
    }
    poll(); timer=setInterval(poll,1100);
  }

  var preview=byId("webImportPreview");
  if(!preview)return;
  preview.querySelectorAll("img.web-import-thumb").forEach(function(img){img.addEventListener("error",function(){img.hidden=true;var fallback=img.nextElementSibling;if(fallback)fallback.hidden=false;},{once:true})});
  var previewJobId=preview.dataset.jobId;
  var saving=0;
  function mainRow(index){return preview.querySelector('.web-main-row[data-row-index="'+index+'"]')}
  function state(index,text,bad){var el=mainRow(index)?.querySelector(".web-row-save-state");if(el){el.textContent=text||"";el.style.color=bad?"#b91c1c":"#166534"}}
  function saveField(el){
    var row=el.closest("tr"),index=(row?.dataset.detailIndex||row?.dataset.rowIndex||"");if(index==="")return;
    var field=el.dataset.webField;if(!field)return;
    var value=el.type==="checkbox"?(el.checked?"1":"0"):el.value;
    state(index,"Kaydediliyor…",false);saving++;
    jsonPost("/products/import-web/scan/"+encodeURIComponent(previewJobId)+"/row/"+encodeURIComponent(index),{[field]:value}).then(function(){state(index,"✓ Kaydedildi",false);if(field==="selected"){var total=Number(byId("webSelectedTotal")?.textContent||0);byId("webSelectedTotal").textContent=Math.max(0,total+(value==="1"?1:-1));}}).catch(function(e){state(index,e.message||"Kayıt hatası",true)}).finally(function(){saving=Math.max(0,saving-1)});
  }
  preview.addEventListener("change",function(e){var el=e.target.closest("[data-web-field]");if(el)saveField(el)});
  preview.addEventListener("click",function(e){var btn=e.target.closest(".web-detail-toggle");if(!btn)return;var row=btn.closest(".web-main-row"),idx=row.dataset.rowIndex,detail=preview.querySelector('.web-detail-row[data-detail-index="'+idx+'"]');if(!detail)return;detail.hidden=!detail.hidden;btn.setAttribute("aria-expanded",String(!detail.hidden));btn.textContent=detail.hidden?"Detay / Düzenle":"Detayı Kapat"});
  var importForm=document.querySelector("form.web-import-dock");if(importForm)importForm.addEventListener("submit",function(e){if(saving<=0)return;e.preventDefault();var btn=importForm.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="Değişiklikler kaydediliyor…"}var wait=setInterval(function(){if(saving>0)return;clearInterval(wait);HTMLFormElement.prototype.submit.call(importForm)},120)});
  var master=byId("webSelectVisible");if(master)master.addEventListener("change",function(){var boxes=Array.from(preview.querySelectorAll(".web-row-selected"));var indices=boxes.map(function(box){return box.closest(".web-main-row")?.dataset.rowIndex}).filter(function(v){return v!==undefined&&v!==null&&v!==""});boxes.forEach(function(box){box.checked=master.checked});saving++;jsonPost("/products/import-web/scan/"+encodeURIComponent(previewJobId)+"/rows/select",{indices:indices.join(","),selected:master.checked?"1":"0"}).then(function(r){if(byId("webSelectedTotal"))byId("webSelectedTotal").textContent=String(r.selected||0)}).catch(function(e){boxes.forEach(function(box){box.checked=!master.checked});alert(e.message||"Seçim kaydedilemedi.")}).finally(function(){saving=Math.max(0,saving-1)})});
})();

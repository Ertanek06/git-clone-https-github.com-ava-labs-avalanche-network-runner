(function(){
  "use strict";
  function byId(id){return document.getElementById(id)}
  function csrf(){return document.querySelector('meta[name="csrf-token"]')?.content||""}
  function jsonPost(url,data){
    var body=new URLSearchParams(); Object.keys(data||{}).forEach(function(k){body.set(k,data[k]==null?"":String(data[k]))});
    body.set("_csrf",csrf());
    return fetch(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8","accept":"application/json"},body:body.toString(),credentials:"same-origin"}).then(function(r){return r.json().catch(function(){return {ok:false,message:"Sunucu yanıtı okunamadı."}}).then(function(j){if(!r.ok||j.ok===false)throw new Error(j.message||"İşlem başarısız.");return j})});
  }
  var progress=byId("webScanProgress");
  if(progress){
    var jobId=progress.dataset.jobId, timer=null;
    var labels={queued:"Tarama hazırlanıyor…",discover:"Ürün sayfaları bulunuyor…",crawl:"Site bağlantıları taranıyor…",analyze:"Ürün bilgileri analiz ediliyor…",ready:"Tarama tamamlandı",imported:"Ürünler kaydedildi",error:"Tarama tamamlanamadı"};
    var initialBar=byId("webScanBar"); if(initialBar) initialBar.style.width=String(Number(initialBar.dataset.progress||0))+"%";
    function poll(){fetch("/products/import-web/scan/"+encodeURIComponent(jobId)+"/status",{headers:{accept:"application/json"},credentials:"same-origin"}).then(function(r){return r.json()}).then(function(data){var j=data.job||{};var pct=Math.max(0,Math.min(100,Number(j.progress||0)));byId("webScanBar").style.width=pct+"%";byId("webScanPercent").textContent=pct+"%";byId("webFound").textContent=Number(j.discovered||0);byId("webAnalyzed").textContent=Number(j.analyzed||0);byId("webWarnings").textContent=Number(j.warnings||0);byId("webStatus").textContent=j.status||"-";byId("webScanStage").textContent=labels[j.stage]||labels[j.status?.toLowerCase()]||"Tarama devam ediyor…";if(j.stage==="analyze")byId("webScanMessage").textContent=Number(j.analyzed||0)+" / "+Number(j.discovered||0)+" ürün sayfası işlendi.";if(j.status==="READY"){clearInterval(timer);window.location.replace("/products/import-web/scan/"+encodeURIComponent(jobId)+"/preview");}else if(j.status==="ERROR"){clearInterval(timer);var e=byId("webScanError");e.hidden=false;e.textContent=j.error||"Tarama başarısız.";}}).catch(function(){})}
    poll();timer=setInterval(poll,1200);
  }

  var preview=byId("webImportPreview");
  if(!preview)return;
  preview.querySelectorAll("img.web-import-thumb").forEach(function(img){img.addEventListener("error",function(){img.hidden=true;var fallback=img.nextElementSibling;if(fallback)fallback.hidden=false;},{once:true})});
  var jobId=preview.dataset.jobId;
  var saving=0;
  function mainRow(index){return preview.querySelector('.web-main-row[data-row-index="'+index+'"]')}
  function state(index,text,bad){var el=mainRow(index)?.querySelector(".web-row-save-state");if(el){el.textContent=text||"";el.style.color=bad?"#b91c1c":"#166534"}}
  function saveField(el){
    var row=el.closest("tr"),index=(row?.dataset.detailIndex||row?.dataset.rowIndex||"");if(index==="")return;
    var field=el.dataset.webField;if(!field)return;
    var value=el.type==="checkbox"?(el.checked?"1":"0"):el.value;
    state(index,"Kaydediliyor…",false);saving++;
    jsonPost("/products/import-web/scan/"+encodeURIComponent(jobId)+"/row/"+encodeURIComponent(index),{[field]:value}).then(function(){state(index,"✓ Kaydedildi",false);if(field==="selected"){var total=Number(byId("webSelectedTotal")?.textContent||0);byId("webSelectedTotal").textContent=Math.max(0,total+(value==="1"?1:-1));}}).catch(function(e){state(index,e.message||"Kayıt hatası",true)}).finally(function(){saving=Math.max(0,saving-1)});
  }
  preview.addEventListener("change",function(e){var el=e.target.closest("[data-web-field]");if(el)saveField(el)});
  preview.addEventListener("click",function(e){var btn=e.target.closest(".web-detail-toggle");if(!btn)return;var row=btn.closest(".web-main-row"),idx=row.dataset.rowIndex,detail=preview.querySelector('.web-detail-row[data-detail-index="'+idx+'"]');if(!detail)return;detail.hidden=!detail.hidden;btn.setAttribute("aria-expanded",String(!detail.hidden));btn.textContent=detail.hidden?"Detay / Düzenle":"Detayı Kapat"});
  var importForm=document.querySelector("form.web-import-dock");if(importForm)importForm.addEventListener("submit",function(e){if(saving<=0)return;e.preventDefault();var btn=importForm.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="Değişiklikler kaydediliyor…"}var wait=setInterval(function(){if(saving>0)return;clearInterval(wait);HTMLFormElement.prototype.submit.call(importForm)},120)});
  var master=byId("webSelectVisible");if(master)master.addEventListener("change",function(){var boxes=Array.from(preview.querySelectorAll(".web-row-selected"));var indices=boxes.map(function(box){return box.closest(".web-main-row")?.dataset.rowIndex}).filter(Boolean);boxes.forEach(function(box){box.checked=master.checked});saving++;jsonPost("/products/import-web/scan/"+encodeURIComponent(jobId)+"/rows/select",{indices:indices.join(","),selected:master.checked?"1":"0"}).then(function(r){if(byId("webSelectedTotal"))byId("webSelectedTotal").textContent=String(r.selected||0)}).catch(function(e){boxes.forEach(function(box){box.checked=!master.checked});alert(e.message||"Seçim kaydedilemedi.")}).finally(function(){saving=Math.max(0,saving-1)})});
})();

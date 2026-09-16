(()=>{
 const FALLBACK=["ADANA","ADIYAMAN","AFYONKARAHİSAR","AĞRI","AKSARAY","AMASYA","ANKARA","ANTALYA","ARDAHAN","ARTVİN","AYDIN","BALIKESİR","BARTIN","BATMAN","BAYBURT","BİLECİK","BİNGÖL","BİTLİS","BOLU","BURDUR","BURSA","ÇANAKKALE","ÇANKIRI","ÇORUM","DENİZLİ","DİYARBAKIR","DÜZCE","EDİRNE","ELAZIĞ","ERZİNCAN","ERZURUM","ESKİŞEHİR","GAZİANTEP","GİRESUN","GÜMÜŞHANE","HAKKÂRİ","HATAY","IĞDIR","ISPARTA","İSTANBUL","İZMİR","KAHRAMANMARAŞ","KARABÜK","KARAMAN","KARS","KASTAMONU","KAYSERİ","KIRIKKALE","KIRKLARELİ","KIRŞEHİR","KİLİS","KOCAELİ","KONYA","KÜTAHYA","MALATYA","MANİSA","MARDİN","MERSİN","MUĞLA","MUŞ","NEVŞEHİR","NİĞDE","ORDU","OSMANİYE","RİZE","SAKARYA","SAMSUN","SİİRT","SİNOP","SİVAS","ŞANLIURFA","ŞIRNAK","TEKİRDAĞ","TOKAT","TRABZON","TUNCELİ","UŞAK","VAN","YALOVA","YOZGAT","ZONGULDAK"];
 const upper=v=>String(v||'').trim().toLocaleUpperCase('tr-TR');
 const fold=v=>upper(v).replace(/İ/g,'I').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S').replace(/Ö/g,'O').replace(/Ç/g,'C');
 const uniq=rows=>[...new Set((rows||[]).map(upper).filter(Boolean))];
 let provincesPromise;
 const getJson=url=>fetch(url,{headers:{Accept:'application/json'},credentials:'same-origin',cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()});
 const provinces=()=>provincesPromise||(provincesPromise=getJson('/api/locations/provinces').then(uniq).catch(()=>FALLBACK));
 function popupFor(input,load){
  if(input.dataset.addressAutocompleteBound)return;input.dataset.addressAutocompleteBound='1';input.autocomplete='off';
  const pop=document.createElement('div');pop.className='address-combobox-pop';pop.hidden=true;pop.setAttribute('role','listbox');document.body.appendChild(pop);
  let options=[],timer;
  const place=()=>{const r=input.getBoundingClientRect();pop.style.left=r.left+'px';pop.style.top=(r.bottom+4)+'px';pop.style.width=Math.max(r.width,220)+'px'};
  const render=()=>{const q=fold(input.value),shown=options.filter(x=>!q||fold(x).includes(q));pop.innerHTML=shown.map(x=>`<button type="button" role="option" data-value="${String(x).replace(/"/g,'&quot;')}">${x}</button>`).join('')||'<small class="address-combobox-empty">Sonuç bulunamadı; manuel yazabilirsiniz.</small>';place();pop.hidden=false};
  const refresh=async()=>{try{options=uniq(await load());render()}catch{options=[];render()}};
  input.addEventListener('focus',refresh);input.addEventListener('click',refresh);input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(refresh,80)});input.addEventListener('keydown',e=>{if(e.key==='Escape')pop.hidden=true});
  pop.addEventListener('mousedown',e=>{const b=e.target.closest('[data-value]');if(!b)return;e.preventDefault();input.value=b.dataset.value;input.dispatchEvent(new Event('change',{bubbles:true}));pop.hidden=true});
  document.addEventListener('mousedown',e=>{if(e.target!==input&&!pop.contains(e.target))pop.hidden=true});window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
 }
 function bind(scope){const city=scope.querySelector('[data-tr-city]'),district=scope.querySelector('[data-tr-district]'),country=scope.querySelector('[data-tr-country]');if(!city||!district)return;popupFor(city,()=>provinces());popupFor(district,async()=>{if(country&&!["TÜRKİYE","TURKIYE"].includes(upper(country.value)))return[];const p=upper(city.value);if(!p)return[];try{return await getJson('/api/locations/districts?province='+encodeURIComponent(p))}catch{return[]}});city.addEventListener('change',()=>{district.value='';district.dispatchEvent(new Event('input',{bubbles:true}))})}
 const init=()=>document.querySelectorAll('[data-address-scope]').forEach(bind);document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();

(()=>{
 const EMAIL=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/i;
 const split=value=>String(value||'').split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);

 document.querySelectorAll('[data-email-recipient-editor]').forEach(editor=>{
  const entry=editor.querySelector('[data-email-entry]'),hidden=editor.querySelector('[data-email-values]'),tags=editor.querySelector('[data-email-tags]');
  let values=[];
  const sync=()=>{hidden.value=values.join(', ');tags.replaceChildren(...values.map((address,index)=>{const tag=document.createElement('span');tag.className='email-recipient-tag';const text=document.createElement('span');text.textContent=address;const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label',`${address} adresini kaldır`);remove.textContent='×';remove.addEventListener('click',()=>{values.splice(index,1);sync();entry.focus()});tag.append(text,remove);return tag}))};
  const markInvalid=message=>{editor.classList.add('is-invalid');entry.setCustomValidity(message||editor.dataset.invalidMessage||'Geçersiz e-posta adresi.');entry.reportValidity()};
  const clearInvalid=()=>{editor.classList.remove('is-invalid');entry.setCustomValidity('')};
  const add=raw=>{
   const candidates=split(raw);if(!candidates.length)return true;
   for(const address of candidates){if(!EMAIL.test(address)){markInvalid(`${editor.dataset.invalidMessage||'Geçersiz e-posta adresi.'} (${address})`);return false}if(!values.some(x=>x.toLowerCase()===address.toLowerCase()))values.push(address)}
   if(values.length>25){values=values.slice(0,25);markInvalid('En fazla 25 e-posta adresi eklenebilir.');return false}
   entry.value='';clearInvalid();sync();return true;
  };
  values=split(hidden.value).filter(x=>EMAIL.test(x)).slice(0,25);sync();
  let autoTimer;
  entry.addEventListener('keydown',event=>{if(['Enter',',',';','Tab'].includes(event.key)&&entry.value.trim()){event.preventDefault();add(entry.value)}});
  entry.addEventListener('input',()=>{clearInvalid();clearTimeout(autoTimer);if(EMAIL.test(entry.value.trim()))autoTimer=setTimeout(()=>add(entry.value),650)});
  entry.addEventListener('blur',()=>{clearTimeout(autoTimer);if(entry.value.trim())add(entry.value)});
  entry.addEventListener('paste',event=>{const pasted=event.clipboardData?.getData('text')||'';if(/[\s,;]/.test(pasted.trim())){event.preventDefault();add(pasted)}});
  editor.closest('form')?.addEventListener('submit',event=>{if(entry.value.trim()&&!add(entry.value)){event.preventDefault();event.stopImmediatePropagation();return}if(editor.dataset.required==='1'&&!values.length){event.preventDefault();event.stopImmediatePropagation();markInvalid(editor.dataset.invalidMessage)}},true);
 });

 async function copyText(value){
  if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);return}
  const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.left='-9999px';area.style.top='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();if(!ok)throw new Error('copy_failed');
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-copy-quote-link]');if(!button||button.disabled)return;
  const input=button.closest('.email-log-row__link')?.querySelector('[data-quote-link]'),value=input?.value||'';if(!value)return;
  try{await copyText(value);const original=button.dataset.copyLabel||button.textContent;button.textContent=`✓ ${button.dataset.copyDone||original}`;setTimeout(()=>{button.textContent=original},1400)}catch{input.focus();input.select()}
 });
 document.addEventListener('click',event=>{const input=event.target.closest('[data-quote-link]:not(.is-unavailable)');if(input)input.select()});
})();

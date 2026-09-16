(()=>{
  const form=document.getElementById('quoteForm'),box=document.getElementById('quoteCheckResults'),run=document.getElementById('runQuoteCheck');
  if(!form||!box)return;
  const read=selectors=>{for(const sel of selectors.split(',')){const el=form.querySelector(sel.trim());if(el&&String(el.value||'').trim())return String(el.value||'').trim()}return''};
  const rows=()=>[...form.querySelectorAll('#quoteItems tr[data-row-index]')].filter(row=>{
    const name=String(row.querySelector('.line-name')?.value||'').trim();
    const code=String(row.querySelector('.quote-product-code input')?.value||'').trim();
    return Boolean(name||code);
  });
  function check(){
    const issues=[];
    const company=read('[name="customer_company_name"],[name="customer_company"],[name="company_name"],[name="customer_name"]');
    if(!company)issues.push(['error','Müşteri/Firma bilgisi eksik.','[name="customer_company_name"]']);
    const valid=read('[name="valid_until"],[name="validity_date"]');if(!valid)issues.push(['warn','Teklif geçerlilik tarihi girilmedi.','[name="valid_until"]']);
    const delivery=read('[name="delivery_terms"],[name="delivery_time"]');if(!delivery)issues.push(['warn','Teslimat bilgisi boş.','[name="delivery_terms"]']);
    const payment=read('[name="payment_terms"]');if(!payment)issues.push(['warn','Ödeme koşulu boş.','[name="payment_terms"]']);
    const productRows=rows();if(!productRows.length)issues.push(['error','En az bir ürün satırı ekleyin.','#quoteItems']);
    productRows.forEach((row,i)=>{
      const name=String(row.querySelector('.line-name,[data-kind="name"],[data-field="name"]')?.value||'').trim();
      const price=Number(String(row.querySelector('[data-field="unit_price"],[name*="[unit_price]"],[name*="[price]"]')?.value||0).replace(',','.'));
      if(!name)issues.push(['error',`${i+1}. ürünün adı boş.`,'']);
      if(!(price>0))issues.push(['warn',`${i+1}. ürünün fiyatı sıfır veya geçersiz.`,'']);
    });
    box.innerHTML=issues.length?`<div class="quote-check-list">${issues.map(([type,msg,sel])=>`<button type="button" class="quote-check-item is-${type}" data-focus-target="${String(sel).replace(/"/g,'&quot;')}"><span>${type==='error'?'⛔':'⚠️'}</span><b>${msg}</b></button>`).join('')}</div>`:'<div class="quote-check-success">✅ Kritik hata bulunmadı. Teklif kaydedilmeye hazır.</div>';
    box.querySelectorAll('[data-focus-target]').forEach(btn=>btn.addEventListener('click',()=>{const el=btn.dataset.focusTarget&&form.querySelector(btn.dataset.focusTarget);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus?.()}}));
    return !issues.some(x=>x[0]==='error');
  }
  run?.addEventListener('click',check);
  form.addEventListener('submit',event=>{if(form.dataset.quoteAssistantApproved==='1')return;if(!check()){event.preventDefault();event.stopImmediatePropagation();box.scrollIntoView({behavior:'smooth',block:'center'});return}form.dataset.quoteAssistantApproved='1'},{capture:true});
  form.addEventListener('input',()=>{delete form.dataset.quoteAssistantApproved},{passive:true});
})();

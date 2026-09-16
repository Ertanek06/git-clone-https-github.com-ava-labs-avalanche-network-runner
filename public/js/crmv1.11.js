// crmv1.11 — customer company sizing, dashboard copy polish and navigation flash guard.
(()=>{
 'use strict';
 const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

 /* Preserve the full customer title for accessibility/tooltip while keeping three
    useful words in the table so action/contact columns never get crushed. */
 function normalizeCustomerCompanies(){
  document.querySelectorAll('.customer-table').forEach(table=>{
   const headers=[...table.querySelectorAll('thead th')],index=headers.findIndex(th=>/firma|ünvan|unvan|company/i.test(String(th.textContent||'').trim()));
   if(index<0)return;
   headers[index].classList.add('customer-company-column-v111');
   table.querySelectorAll(`tbody tr > td:nth-child(${index+1})`).forEach(td=>{
    if(td.hasAttribute('colspan'))return;
    const label=td.querySelector('.customer-name-link b')||td.querySelector('b')||td;
    const full=String(label.textContent||'').replace(/\s+/g,' ').trim();
    if(!full)return;
    const words=full.split(' '),short=words.slice(0,3).join(' ')+(words.length>3?'…':'');
    if(label!==td)label.textContent=short;
    td.classList.add('customer-company-column-v111');td.title=full;
    const button=td.querySelector('.customer-name-link');
    if(button){button.title=full;button.setAttribute('aria-label',`${full} müşterisini ön izle`)}
   });
  });
 }

 function polishDashboardCopy(){
  const en=document.body?.dataset.locale==='en';
  const copy={
   'live-proforma-tracking':en?'Latest sends and visits.':'Son gönderim ve açılmalar.',
   'recent-proformas':en?'Latest offers and totals.':'Son teklifler ve toplamlar.',
   'smart-workflow':en?'Upcoming follow-up tasks.':'Yaklaşan takip görevleri.',
   'live-support':en?'Visitors and open chats.':'Ziyaretçiler ve açık sohbetler.'
  };
  for(const [key,text] of Object.entries(copy)){
   const small=document.querySelector(`[data-dashboard-widget="${key}"] > .card-head small`);
   if(small){small.textContent=text;small.title=text}
  }
 }

 ready(()=>{normalizeCustomerCompanies();polishDashboardCopy()});
})();

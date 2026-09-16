// crmv1.8 — simplified theme hub, point-and-edit preview and live menu behaviour.
(()=>{
 'use strict';
 const form=document.getElementById('themeStudioForm'),canvas=form?.querySelector('[data-theme-preview-canvas]');if(!form||!canvas)return;
 const field=name=>form.elements.namedItem(name);
 const fontOptions=[...form.querySelector('[name="font_family"]')?.options||[]].map(option=>({value:option.value,label:option.textContent.trim()}));
 const dispatch=el=>{el?.dispatchEvent(new Event('input',{bubbles:true}));el?.dispatchEvent(new Event('change',{bubbles:true}))};
 const set=name=>value=>{const el=field(name);if(!el)return;el.value=value;dispatch(el)};
 const textNodeSelector='b,strong,h1,h2,h3,small,th,td,button';
 function decorate(){
  const map=[
   ['.theme-preview-sidebar-v359','sidebar_bg','sidebar_text','sidebar_font_family','Sidebar'],
   ['.theme-preview-brand-v359','brand_bg','sidebar_text','sidebar_font_family','Logo kartı'],
   ['[data-theme-demo-menu] > a','menu_bg','menu_text','sidebar_font_family','Menü'],
   ['.theme-preview-top-v359','topbar_bg','topbar_text','font_family','Üst bar'],
   ['.theme-preview-content-v359','page_bg','text_color','font_family','Sayfa'],
   ['.theme-preview-title-v359 h2',null,'heading_color','heading_font_family','Başlık'],
   ['.theme-preview-title-v359 > button','primary_btn_bg','primary_btn_text','button_font_family','Ana buton'],
   ['.theme-preview-metrics-v359 article','metric_bg','metric_text','font_family','Sayaç kartı'],
   ['.theme-preview-grid-v359 > article','card_bg','text_color','font_family','Kart'],
   ['.theme-preview-grid-v359 button','soft_btn_bg','soft_btn_text','button_font_family','Buton'],
   ['.theme-preview-grid-v359 th','table_header_bg','table_header_text','table_font_family','Tablo başlığı'],
   ['.theme-preview-grid-v359 td','table_row_bg','text_color','table_font_family','Tablo satırı']
  ];
  for(const [selector,bg,text,font,label] of map)canvas.querySelectorAll(selector).forEach(el=>{if(bg)el.dataset.themeEditBg=bg;if(text)el.dataset.themeEditText=text;if(font)el.dataset.themeEditFont=font;el.dataset.themeEditLabel=label;el.classList.add('theme-editable-v18')});
  canvas.querySelectorAll(`[data-theme-demo-menu] > a ${textNodeSelector}`).forEach(el=>{el.dataset.themeEditText='menu_text';el.dataset.themeEditFont='sidebar_font_family';el.dataset.themeEditLabel='Menü yazısı';el.classList.add('theme-editable-v18')});
 }
 function syncFonts(target=canvas){target.style.setProperty('--pv-heading-font',field('heading_font_family')?.value||field('font_family')?.value||'Inter');target.style.setProperty('--pv-sidebar-font',field('sidebar_font_family')?.value||field('font_family')?.value||'Inter');target.style.setProperty('--pv-table-font',field('table_font_family')?.value||field('font_family')?.value||'Inter');target.style.setProperty('--pv-button-font',field('button_font_family')?.value||field('font_family')?.value||'Inter')}
 let inspector=null;
 function closeInspector(){inspector?.remove();inspector=null;canvas.querySelectorAll('.is-theme-editing-v18').forEach(el=>el.classList.remove('is-theme-editing-v18'))}
 function colorControl(label,name){const current=field(name);if(!current)return null;const row=document.createElement('label'),span=document.createElement('span'),input=document.createElement('input');span.textContent=label;input.type='color';input.value=/^#[0-9a-f]{6}$/i.test(current.value)?current.value:'#ffffff';input.addEventListener('input',()=>set(name)(input.value));row.append(span,input);return row}
 function fontControl(name){if(!field(name))return null;const row=document.createElement('label'),span=document.createElement('span'),select=document.createElement('select');span.textContent='Yazı stili';for(const option of fontOptions){const el=document.createElement('option');el.value=option.value;el.textContent=option.label;select.append(el)}const current=field(name).value;select.value=[...select.options].some(x=>x.value===current)?current:(fontOptions.find(x=>x.label.toLowerCase()===current.toLowerCase())?.value||fontOptions[0]?.value||'Inter');select.addEventListener('change',()=>set(name)(select.value));row.append(span,select);return row}
 function openInspector(el,event){closeInspector();el.classList.add('is-theme-editing-v18');const box=document.createElement('div');box.className='theme-point-editor-v18';box.setAttribute('role','dialog');box.setAttribute('aria-label','Canlı tema düzenleyici');const head=document.createElement('div'),title=document.createElement('b'),close=document.createElement('button');title.textContent=`✦ ${el.dataset.themeEditLabel||'Bileşen'}`;close.type='button';close.textContent='×';close.setAttribute('aria-label','Düzenleyiciyi kapat');close.addEventListener('click',closeInspector);head.append(title,close);box.append(head);const bg=colorControl('Zemin',el.dataset.themeEditBg),text=colorControl('Yazı / ikon',el.dataset.themeEditText),font=fontControl(el.dataset.themeEditFont);if(bg)box.append(bg);if(text)box.append(text);if(font)box.append(font);const note=document.createElement('small');note.textContent='Değişiklik ön izlemede anında görünür; “Temayı Kaydet” ile sisteme uygulanır.';box.append(note);document.body.append(box);const w=box.offsetWidth,h=box.offsetHeight;box.style.left=Math.max(10,Math.min(innerWidth-w-10,event.clientX+14))+'px';box.style.top=Math.max(10,Math.min(innerHeight-h-10,event.clientY+14))+'px';inspector=box}
 function menuDemo(anchor){const nav=anchor.closest('[data-theme-demo-menu]');if(!nav)return;nav.querySelectorAll(':scope > a').forEach(a=>a.classList.toggle('is-active',a===anchor));nav.querySelector('.theme-demo-submenu-v18')?.remove();const mode=canvas.dataset.menuMode||field('menu_mode')?.value||'accordion';if(mode==='static')return;const sub=document.createElement('div');sub.className='theme-demo-submenu-v18';['Liste','Yeni kayıt','Raporlar'].forEach((text,index)=>{const item=document.createElement('span');item.textContent=(index===0?'› ':'')+text;sub.append(item)});anchor.insertAdjacentElement('afterend',sub);requestAnimationFrame(()=>sub.classList.add('is-open'))}
 canvas.addEventListener('click',event=>{const menu=event.target.closest('[data-theme-demo-menu] > a');if(menu){event.preventDefault();menuDemo(menu)}const editable=event.target.closest('.theme-editable-v18');if(editable){event.preventDefault();event.stopPropagation();openInspector(editable,event)}});
 canvas.addEventListener('pointerover',event=>{const menu=event.target.closest('[data-theme-demo-menu] > a');if(menu&&(canvas.dataset.menuMode||field('menu_mode')?.value)==='hover')menuDemo(menu)});
 document.addEventListener('pointerdown',event=>{if(inspector&&!inspector.contains(event.target)&&!event.target.closest('.theme-editable-v18'))closeInspector()});
 form.addEventListener('input',()=>{syncFonts();setTimeout(()=>syncFonts(),0)});form.addEventListener('change',event=>{syncFonts();if(event.target.name==='theme_key'||event.target.closest?.('[data-theme-hover]')){const theme=window.THEME_PALETTES?.find(x=>x.key===field('theme_key')?.value);document.querySelector('[data-theme-preset-current]')?.replaceChildren(document.createTextNode(theme?.name||field('theme_key')?.value||''))}});
 document.querySelectorAll('[data-theme-hover]').forEach(button=>button.addEventListener('click',()=>{setTimeout(()=>{const baseFont=field('font_family')?.value||'Inter';for(const name of ['heading_font_family','sidebar_font_family','table_font_family','button_font_family']){const el=field(name);if(el)el.value=baseFont}document.querySelectorAll('[data-theme-hover]').forEach(x=>{x.classList.toggle('is-active',x===button);const mark=x.querySelector('em');if(mark)mark.textContent=x===button?'✓':''});const current=document.querySelector('[data-theme-preset-current]');if(current)current.textContent=button.querySelector('b')?.textContent||button.dataset.themeHover;syncFonts();dispatch(field('heading_font_family'))},0)}));
 decorate();syncFonts();
})();

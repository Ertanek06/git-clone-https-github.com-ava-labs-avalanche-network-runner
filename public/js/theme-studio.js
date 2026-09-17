(()=>{
  const form=document.getElementById('themeStudioForm');if(!form)return;
  const palettes=window.THEME_PALETTES||[],canvas=form.querySelector('[data-theme-preview-canvas]'),viewport=form.querySelector('[data-theme-preview-viewport]'),state=form.querySelector('[data-theme-save-state]');
  const field=name=>form.elements.namedItem(name),value=(name,fallback='')=>{const el=field(name);if(!el)return fallback;if(el.type==='checkbox')return el.checked?'1':'0';return el.value||fallback};
  const setField=(name,next)=>{const el=field(name);if(!el)return;if(el.type==='checkbox')el.checked=String(next)==='1'||next===true;else if(el.tagName==='SELECT'&&![...el.options].some(option=>option.value===String(next))){const match=[...el.options].find(option=>option.textContent.trim().toLocaleLowerCase('tr-TR')===String(next).trim().toLocaleLowerCase('tr-TR'));el.value=match?.value||el.value}else el.value=String(next)};
  const px=(name,fallback)=>`${Number(value(name,fallback))||fallback}px`;
  let modalCanvas=null,hoverSnapshot=null,hoveringTheme=null;
  const iconSets={
    line:{home:'⌂',company:'▥',customers:'♙',products:'◇',quotes:'▤',settings:'⚙'},
    color:{home:'🏠',company:'🏢',customers:'👥',products:'📦',quotes:'📄',settings:'🎛️'},
    sketch:{home:'⌂',company:'▱',customers:'♧',products:'◇',quotes:'▥',settings:'✎'},
    mono:{home:'■',company:'▦',customers:'●',products:'◆',quotes:'▰',settings:'✹'},
    'soft-card':{home:'⌂',company:'▣',customers:'◉',products:'⬢',quotes:'▧',settings:'⊙'},
    'emoji-live':{home:'🏡',company:'🏭',customers:'🧑‍🤝‍🧑',products:'🧪',quotes:'🧾',settings:'🛠️'},
    'outline-blue':{home:'⌂',company:'▥',customers:'♙',products:'◇',quotes:'▤',settings:'⚙'},
    'rounded-fill':{home:'●',company:'▣',customers:'◉',products:'⬢',quotes:'▰',settings:'✹'},
    'glass-icon':{home:'◌',company:'▦',customers:'◎',products:'◇',quotes:'▧',settings:'⊙'},
    corporate:{home:'H',company:'F',customers:'M',products:'Ü',quotes:'P',settings:'A'}
  };
  function syncPreviewIcons(target){const pack=String(value('icon_pack','line')).toLowerCase(),set=iconSets[pack]||iconSets.line;target?.querySelectorAll('[data-theme-preview-icon]').forEach(el=>{el.textContent=set[el.dataset.themePreviewIcon]||'•'})}
  function demoMenu(target){if(!target)return;target.classList.remove('menu-demo-v371');void target.offsetWidth;target.classList.add('menu-demo-v371');setTimeout(()=>target.classList.remove('menu-demo-v371'),900)}

  function markDirty(){if(state)state.textContent=(document.documentElement.lang||'tr').startsWith('en')?'Unsaved changes':'Kaydedilmemiş değişiklik'}
  function fit(targetViewport,targetCanvas){
    if(!targetViewport||!targetCanvas)return;
    const baseW=1400,baseH=800;
    const availableW=Math.max(280,targetViewport.clientWidth-8),availableH=Math.max(220,targetViewport.clientHeight-8);
    const scale=Math.max(.18,Math.min(1.22,availableW/baseW,availableH/baseH));
    targetCanvas.style.setProperty('position','absolute','important');targetCanvas.style.setProperty('width',`${baseW}px`,'important');targetCanvas.style.setProperty('height',`${baseH}px`,'important');
    targetCanvas.style.setProperty('transform-origin','center center','important');targetCanvas.style.setProperty('left','50%','important');targetCanvas.style.setProperty('top','50%','important');
    targetCanvas.style.setProperty('transform',`translate(-50%,-50%) scale(${scale})`,'important');targetCanvas.style.setProperty('margin','0','important');
  }
  function syncSidebarCards(){const selected=String(value('sidebar_key','silver-tree')),gallery=document.querySelector('[data-sidebar-gallery]');let selectedCard=null;document.querySelectorAll('[data-sidebar-preset]').forEach(card=>{const active=card.dataset.sidebarPreset===selected;card.classList.toggle('is-selected',active);if(active)selectedCard=card});const named=form.querySelector('[data-sidebar-select-v16]'),library=document.querySelector('[data-sidebar-library-select-v17]');if(named&&named.value!==selected)named.value=selected;if(library&&library.value!==selected)library.value=selected;const option=named?.selectedOptions?.[0]||library?.selectedOptions?.[0];const label=option?.textContent?.split('—')[0]?.trim()||selected;document.querySelectorAll('[data-sidebar-selected-name-v17],[data-sidebar-gallery-current]').forEach(el=>el.textContent=label);if(gallery&&gallery.dataset.activeSidebar!==selected){gallery.dataset.activeSidebar=selected;selectedCard?.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'})}}
  const previewMap={
    '--pv-primary':['primary_color','#245ba7'],'--pv-accent':['accent_color','#e23b3f'],'--pv-page':['page_bg','#f4f7fb'],'--pv-card':['card_bg','#ffffff'],'--pv-border':['border_color','#dbe5f2'],'--pv-text':['text_color','#14233d'],'--pv-muted':['muted_color','#718198'],
    '--pv-topbar-bg':['topbar_bg','#ffffff'],'--pv-topbar-text':['topbar_text','#14233d'],'--pv-topbar-border':['topbar_border','#dbe5f2'],'--pv-sidebar-bg':['sidebar_bg','#ffffff'],'--pv-sidebar-text':['sidebar_text','#14233d'],'--pv-sidebar-muted':['sidebar_muted','#718198'],'--pv-sidebar-border':['sidebar_border','#dbe5f2'],'--pv-brand-bg':['brand_bg','#f7f9fc'],'--pv-brand-border':['brand_border','#dbe5f2'],
    '--pv-menu-bg':['menu_bg','#ffffff'],'--pv-menu-text':['menu_text','#14233d'],'--pv-menu-border':['menu_border','#dbe5f2'],'--pv-hover-bg':['menu_hover_bg','#eff5ff'],'--pv-hover-text':['menu_hover_text','#245ba7'],'--pv-active-bg':['menu_active_bg','#edf5ff'],'--pv-active-text':['menu_active_text','#245ba7'],'--pv-active-border':['menu_active_border','#a7c8f8'],
    '--pv-btn-bg':['primary_btn_bg','#245ba7'],'--pv-btn-text':['primary_btn_text','#ffffff'],'--pv-btn-border':['primary_btn_border','#245ba7'],'--pv-soft-bg':['soft_btn_bg','#edf5ff'],'--pv-soft-text':['soft_btn_text','#245ba7'],'--pv-soft-border':['soft_btn_border','#bcd3ef'],'--pv-success-btn':['success_btn_bg','#16a66a'],'--pv-danger-bg':['danger_btn_bg','#fff1f2'],'--pv-danger-text':['danger_btn_text','#b42318'],
    '--pv-input-bg':['input_bg','#ffffff'],'--pv-input-text':['input_text','#14233d'],'--pv-input-border':['input_border','#c8d7e8'],'--pv-table-head-bg':['table_header_bg','#eef4fd'],'--pv-table-head-text':['table_header_text','#14233d'],'--pv-table-row':['table_row_bg','#ffffff'],'--pv-table-alt':['table_alt_bg','#f9fbfe'],'--pv-table-hover':['table_hover_bg','#f0f6ff'],'--pv-table-border':['table_border','#dbe5f2'],
    '--pv-success-bg':['success_bg','#ecfdf3'],'--pv-success-text':['success_text','#087443'],'--pv-warning-bg':['warning_bg','#fff8e6'],'--pv-warning-text':['warning_text','#9a6700'],'--pv-error-bg':['error_bg','#fff1f2'],'--pv-error-text':['error_text','#b42318'],'--pv-heading':['heading_color','#14233d'],'--pv-label':['label_color','#243650'],'--pv-link':['link_color','#245ba7']
  };
  Object.assign(previewMap,{
    '--pv-page-head-bg':['page_header_bg','#f4f7fb'],'--pv-page-head-text':['page_header_text','#14233d'],'--pv-page-head-muted':['page_header_muted','#718198'],'--pv-page-head-border':['page_header_border','#dbe5f2'],
    '--pv-inner-bg':['inner_panel_bg','#ffffff'],'--pv-inner-border':['inner_panel_border','#dbe5f2'],'--pv-metric-bg':['metric_bg','#ffffff'],'--pv-metric-text':['metric_text','#14233d'],'--pv-metric-icon-bg':['metric_icon_bg','#edf5ff'],'--pv-metric-icon-text':['metric_icon_text','#245ba7'],
    '--pv-status-bg':['sidebar_status_bg','#16a66a'],'--pv-status-text':['sidebar_status_text','#ffffff'],'--pv-menu-icon-bg':['menu_icon_bg','#f1f5fb'],'--pv-menu-icon-text':['menu_icon_text','#245ba7'],
    '--pv-action-bg':['action_btn_bg','#eef5ff'],'--pv-action-text':['action_btn_text','#245ba7'],'--pv-action-border':['action_btn_border','#c9dcf2'],'--pv-placeholder':['input_placeholder','#8292a8'],'--pv-label-color':['input_label','#243650'],'--pv-disabled-bg':['input_disabled_bg','#f1f4f8'],'--pv-disabled-text':['input_disabled_text','#8795a8'],
    '--pv-modal-bg':['modal_bg','#ffffff'],'--pv-modal-text':['modal_text','#14233d'],'--pv-modal-border':['modal_border','#dbe5f2'],'--pv-dropdown-bg':['dropdown_bg','#ffffff'],'--pv-dropdown-text':['dropdown_text','#14233d'],'--pv-dropdown-border':['dropdown_border','#dbe5f2'],'--pv-toast-bg':['toast_bg','#ffffff'],'--pv-toast-text':['toast_text','#14233d'],'--pv-toast-border':['toast_border','#dbe5f2']
  });
  function applyTo(target=canvas){if(!target)return;for(const [css,[name,fallback]] of Object.entries(previewMap))target.style.setProperty(css,value(name,fallback));const dims={'--pv-radius':px('radius',14),'--pv-card-radius':px('card_radius',14),'--pv-card-border':px('card_border_width',1),'--pv-card-padding':px('card_padding',16),'--pv-sidebar':px('sidebar_width',252),'--pv-sidebar-padding':px('sidebar_padding',10),'--pv-brand-radius':px('brand_radius',18),'--pv-brand-height':px('brand_height',95),'--pv-menu-radius':px('menu_radius',14),'--pv-menu-height':px('menu_height',48),'--pv-menu-gap':px('menu_gap',8),'--pv-topbar-height':px('topbar_height',60),'--pv-btn-radius':px('button_radius',12),'--pv-btn-height':px('button_height',38),'--pv-input-radius':px('input_radius',12),'--pv-input-height':px('input_height',38),'--pv-fs':px('font_size',14),'--pv-h1':px('h1_size',24),'--pv-h2':px('h2_size',18),'--pv-font':value('font_family','Inter'),'--pv-page-head-radius':px('page_header_radius',14),'--pv-page-head-padding':px('page_header_padding',8),'--pv-inner-radius':px('inner_panel_radius',12),'--pv-metric-radius':px('metric_radius',14),'--pv-brand-logo-width':px('brand_logo_width',170),'--pv-menu-icon-size':px('menu_icon_size',28),'--pv-menu-icon-radius':px('menu_icon_radius',9),'--pv-submenu-indent':px('submenu_indent',18),'--pv-btn-font-size':px('button_font_size',14),'--pv-action-size':px('action_btn_size',34),'--pv-action-radius':px('action_btn_radius',10),'--pv-input-border-width':px('input_border_width',1),'--pv-table-row-height':px('table_row_height',46),'--pv-table-font-size':px('table_font_size',13),'--pv-table-cell-padding':px('table_cell_padding',10),'--pv-table-radius':px('table_radius',12),'--pv-badge-radius':px('badge_radius',999),'--pv-badge-font-size':px('badge_font_size',12),'--pv-h3':px('h3_size',16),'--pv-small':px('small_size',12)};for(const [k,v] of Object.entries(dims))target.style.setProperty(k,v);target.style.setProperty('--pv-heading-weight',value('heading_weight','800'));target.style.setProperty('--pv-button-weight',value('button_font_weight','800'));target.style.setProperty('--pv-line-height',value('body_line_height','1.45'));target.style.setProperty('--pv-body-weight',value('body_weight','500'));target.style.setProperty('--pv-shadow',`0 ${Math.max(1,Number(value('card_shadow',7))/2)}px ${Math.max(0,Number(value('card_shadow',7))*4)}px rgba(15,42,75,.12)`);target.style.setProperty('--pv-motion',value('animations_enabled','1')==='1'?`${Number(value('animation_speed',180))||180}ms`:'0ms');target.dataset.sidebarStyle=String(value('sidebar_key','silver-tree'));target.dataset.density=String(value('density','compact'));target.dataset.menuMode=String(value('menu_mode','accordion'));target.dataset.iconPack=String(value('icon_pack','line'));target.dataset.themeKey=String(value('theme_key','silver-executive'));syncPreviewIcons(target);syncSidebarCards();if(target===canvas)fit(viewport,canvas);if(modalCanvas&&target!==modalCanvas){applyTo(modalCanvas);fit(modalCanvas.parentElement,modalCanvas)}}
  function basePaletteUpdates(p){
   const hex=String(p.page||'#ffffff').replace('#',''),rgb=hex.length===6?[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)): [255,255,255];
   const isDark=(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])<105;
   const states=isDark?{
    success_bg:'#123528',success_text:'#7ee2ad',warning_bg:'#3a3016',warning_text:'#ffd36a',error_bg:'#3b1e24',error_text:'#ff9da8',info_bg:'#172d49',info_text:'#9bc8ff',
    danger_btn_bg:'#3b1e24',danger_btn_text:'#ffadb6',scrollbar_track:'#151c27',scrollbar_thumb:'#526176',tooltip_bg:'#e8eef7',tooltip_text:'#111827',modal_overlay:'#02050a'
   }:{
    success_bg:'#ecfdf3',success_text:'#087443',warning_bg:'#fff8e6',warning_text:'#9a6700',error_bg:'#fff1f2',error_text:'#b42318',info_bg:'#eef5ff',info_text:p.primary,
    danger_btn_bg:'#fff1f2',danger_btn_text:'#b42318',scrollbar_track:'#edf2f7',scrollbar_thumb:'#9eb5d0',tooltip_bg:p.text,tooltip_text:'#ffffff',modal_overlay:'#17233a'
   };
   return {primary_color:p.primary,accent_color:p.accent,page_bg:p.page,card_bg:p.card,border_color:p.border,text_color:p.text,muted_color:p.muted,topbar_bg:p.card,topbar_text:p.text,topbar_border:p.border,sidebar_bg:p.card,sidebar_text:p.text,sidebar_muted:p.muted,sidebar_border:p.border,brand_bg:p.page,brand_border:p.border,menu_bg:p.card,menu_text:p.text,menu_border:p.border,menu_hover_bg:p.page,menu_hover_text:p.primary,menu_active_bg:p.page,menu_active_text:p.primary,menu_active_border:p.primary,primary_btn_bg:p.primary,primary_btn_text:isDark?'#08111f':'#ffffff',primary_btn_border:p.primary,soft_btn_bg:p.page,soft_btn_text:isDark?p.text:p.primary,soft_btn_border:p.border,input_bg:p.card,input_text:p.text,input_border:p.border,input_focus:p.primary,table_header_bg:p.page,table_header_text:p.text,table_row_bg:p.card,table_alt_bg:p.page,table_hover_bg:p.page,table_border:p.border,page_header_bg:p.page,page_header_text:p.text,page_header_muted:p.muted,page_header_border:p.border,inner_panel_bg:p.card,inner_panel_border:p.border,metric_bg:p.card,metric_text:p.text,metric_icon_bg:p.page,metric_icon_text:p.primary,sidebar_status_bg:'#16a66a',sidebar_status_text:'#ffffff',menu_icon_bg:p.page,menu_icon_text:p.primary,action_btn_bg:p.page,action_btn_text:p.primary,action_btn_border:p.border,input_placeholder:p.muted,input_label:p.text,input_disabled_bg:p.page,input_disabled_text:p.muted,modal_bg:p.card,modal_text:p.text,modal_border:p.border,dropdown_bg:p.card,dropdown_text:p.text,dropdown_border:p.border,toast_bg:p.card,toast_text:p.text,toast_border:p.border,heading_color:p.text,label_color:p.text,link_color:p.primary,...states}
  };
  function themeUpdates(p){const updates=basePaletteUpdates(p);for(const [k,v] of Object.entries(p)){if(field(k)&&v!=null&&!['key','name','primary','accent','page','card','border','text','muted'].includes(k))updates[k]=v}return updates}
  function formSnapshot(){const out={};for(const el of form.elements){if(!el.name)continue;out[el.name]=el.type==='checkbox'?el.checked:el.value}return out}
  function restoreSnapshot(snapshot){if(!snapshot)return;for(const [name,v] of Object.entries(snapshot)){const el=field(name);if(!el)continue;if(el.type==='checkbox')el.checked=Boolean(v);else el.value=String(v)}applyTo()}
  function applyPalette(key,{commit=true}={}){const p=palettes.find(x=>x.key===key);if(!p)return;Object.entries(themeUpdates(p)).forEach(([k,v])=>setField(k,v));canvas.dataset.themeKey=key;if(modalCanvas)modalCanvas.dataset.themeKey=key;if(commit){setField('theme_key',key);markDirty()}applyTo()}
  function chooseSidebar(control){const isSelect=control?.matches?.('[data-sidebar-select-v16],[data-sidebar-library-select-v17]');const option=isSelect?control.selectedOptions?.[0]:control;const key=isSelect?control.value:(option?.dataset.sidebarChoice||'silver-tree');setField('sidebar_key',key);setField('menu_mode',option?.dataset.menuMode||value('menu_mode','accordion'));setField('density',option?.dataset.density||value('density','compact'));setField('sidebar_width',option?.dataset.sidebarWidth||value('sidebar_width',252));document.querySelectorAll('[data-sidebar-select-v16],[data-sidebar-library-select-v17]').forEach(select=>{if(select.value!==key)select.value=key});markDirty();applyTo();syncSidebarCards()}
  const presets={corporate:{primary_btn_bg:'#245ba7',primary_btn_text:'#ffffff',primary_btn_border:'#245ba7',soft_btn_bg:'#edf5ff',soft_btn_text:'#245ba7',soft_btn_border:'#bcd3ef',success_btn_bg:'#16a66a',success_btn_text:'#ffffff',danger_btn_bg:'#fff1f2',danger_btn_text:'#b42318'},green:{primary_btn_bg:'#14875d',primary_btn_text:'#ffffff',primary_btn_border:'#14875d',soft_btn_bg:'#eafaf4',soft_btn_text:'#147456',soft_btn_border:'#b8ead8',success_btn_bg:'#14875d',success_btn_text:'#ffffff',danger_btn_bg:'#fff1f2',danger_btn_text:'#b42318'},slate:{primary_btn_bg:'#334155',primary_btn_text:'#ffffff',primary_btn_border:'#334155',soft_btn_bg:'#eef2f6',soft_btn_text:'#334155',soft_btn_border:'#cbd5e1',success_btn_bg:'#0f766e',success_btn_text:'#ffffff',danger_btn_bg:'#fff1f2',danger_btn_text:'#b42318'}};
  function applyPreset(name){const next=presets[name];if(!next)return;Object.entries(next).forEach(([k,v])=>setField(k,v));markDirty();applyTo()}
  function openLivePreview(){const modal=document.querySelector('[data-theme-live-preview-modal]'),stage=modal?.querySelector('[data-theme-live-preview-stage]');if(!modal||!stage||!canvas)return;stage.replaceChildren();modalCanvas=canvas.cloneNode(true);modalCanvas.removeAttribute('data-theme-preview-canvas');modalCanvas.classList.add('is-fullscreen-preview');stage.appendChild(modalCanvas);modal.hidden=false;modal.classList.add('is-open');document.body.classList.add('theme-preview-open');requestAnimationFrame(()=>{applyTo(modalCanvas);fit(stage,modalCanvas);requestAnimationFrame(()=>fit(stage,modalCanvas))})}
  function closeLivePreview(){const modal=document.querySelector('[data-theme-live-preview-modal]');if(modal){modal.classList.remove('is-open');modal.hidden=true}modalCanvas=null;document.body.classList.remove('theme-preview-open')}
  field('theme_key')?.addEventListener('change',e=>{applyPalette(e.target.value,{commit:true});document.querySelectorAll('[data-theme-hover]').forEach(b=>b.classList.toggle('is-active',b.dataset.themeHover===e.target.value))});form.addEventListener('input',e=>{if(hoveringTheme)return;markDirty();applyTo();if(e.target.name==='menu_mode'||e.target.name==='icon_pack')demoMenu(canvas)});form.addEventListener('change',e=>{if(hoveringTheme)return;if(e.target.name!=='theme_key'){markDirty();applyTo();if(e.target.name==='menu_mode'||e.target.name==='icon_pack')demoMenu(canvas)}});document.querySelectorAll('[data-theme-hover]').forEach(button=>{const preview=()=>{if(!hoverSnapshot)hoverSnapshot=formSnapshot();hoveringTheme=button.dataset.themeHover;applyPalette(hoveringTheme,{commit:false});if(state)state.textContent=(document.documentElement.lang||'tr').startsWith('en')?'Preview — click to select':'Ön izleme — seçmek için tıklayın'};const leave=()=>{if(!hoveringTheme)return;hoveringTheme=null;restoreSnapshot(hoverSnapshot);hoverSnapshot=null;if(state)state.textContent=(document.documentElement.lang||'tr').startsWith('en')?'Ready':'Hazır'};button.addEventListener('mouseenter',preview);button.addEventListener('focus',preview);button.addEventListener('mouseleave',leave);button.addEventListener('blur',leave);button.addEventListener('click',()=>{hoveringTheme=null;hoverSnapshot=null;applyPalette(button.dataset.themeHover,{commit:true});document.querySelectorAll('[data-theme-hover]').forEach(b=>b.classList.toggle('is-active',b===button))})});form.addEventListener('submit',()=>{hoveringTheme=null;hoverSnapshot=null;if(state)state.textContent=(document.documentElement.lang||'tr').startsWith('en')?'Saving…':'Kaydediliyor…'});
  document.addEventListener('change',e=>{const select=e.target.closest?.('[data-sidebar-select-v16],[data-sidebar-library-select-v17]');if(select){chooseSidebar(select);return}});
  document.addEventListener('click',e=>{const shift=e.target.closest('[data-sidebar-gallery-shift]');if(shift){e.preventDefault();const gallery=document.querySelector('[data-sidebar-gallery]');gallery?.scrollBy?.({left:Number(shift.dataset.sidebarGalleryShift||1)*Math.max(300,gallery.clientWidth*.78),behavior:'smooth'});return}const choice=e.target.closest('[data-sidebar-choice]');if(choice){e.preventDefault();chooseSidebar(choice);return}const preset=e.target.closest('[data-system-preset]');if(preset){e.preventDefault();applyPreset(preset.dataset.systemPreset);return}if(e.target.closest('[data-theme-open-live-preview]')){e.preventDefault();openLivePreview();return}if(e.target.closest('[data-theme-close-live-preview]')){e.preventDefault();closeLivePreview()}});
  
  document.querySelectorAll('.login-studio-controls-scroll > details').forEach(detail=>{
    detail.addEventListener('toggle',()=>{
      if(!detail.open)return;
      document.querySelectorAll('.login-studio-controls-scroll > details').forEach(other=>{if(other!==detail)other.open=false});
    });
  });

  window.addEventListener('resize',()=>{fit(viewport,canvas);if(modalCanvas)fit(modalCanvas.parentElement,modalCanvas)},{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLivePreview()});if(window.ResizeObserver&&viewport)new ResizeObserver(()=>fit(viewport,canvas)).observe(viewport);applyTo();
})();

// crmv1.7 — live WCAG AA feedback for the most frequently used secondary text.
(()=>{
 const form=document.getElementById('themeStudioForm'),status=document.querySelector('[data-theme-contrast-status]');if(!form||!status)return;
 const rgb=hex=>{const value=String(hex||'').replace('#','');return value.length===6?[0,2,4].map(i=>parseInt(value.slice(i,i+2),16)):null};
 const lum=hex=>{const value=rgb(hex);if(!value)return 0;const c=value.map(v=>{const x=v/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const update=()=>{const muted=form.elements.namedItem('muted_color')?.value,page=form.elements.namedItem('page_bg')?.value,value=ratio(muted,page),en=(document.documentElement.lang||'tr').startsWith('en'),ok=value>=4.5;status.classList.toggle('is-ok',ok);status.classList.toggle('is-warning',!ok);const out=status.querySelector('span');if(out)out.textContent=ok?(en?`WCAG AA passed · ${value.toFixed(2)}:1`:`WCAG AA uygun · ${value.toFixed(2)}:1`):(en?`Low contrast · ${value.toFixed(2)}:1 · target 4.50:1`:`Düşük kontrast · ${value.toFixed(2)}:1 · hedef 4,50:1`)};
 form.addEventListener('input',event=>{if(['muted_color','page_bg'].includes(event.target?.name))update()});
 form.addEventListener('change',()=>setTimeout(update,0));setTimeout(update,0);
})();

/* crmV18 — reliable direct theme save */
(()=>{
 const form=document.getElementById('themeStudioForm');if(!form||form.dataset.crmV18SaveReady==='1')return;form.dataset.crmV18SaveReady='1';
 const button=form.querySelector('[data-theme-save-button]'),label=button?.querySelector('[data-theme-save-label]'),state=form.querySelector('[data-theme-save-state]');
 const en=(document.documentElement.lang||'tr').toLowerCase().startsWith('en');
 const original=label?.textContent||'';let saving=false;
 const notify=(message,type='success')=>{const toast=document.createElement('div');toast.className=`toast toast--${type}`;toast.textContent=message;document.body.appendChild(toast);setTimeout(()=>toast.remove(),3200)};
 form.addEventListener('submit',async event=>{
  event.preventDefault();event.stopPropagation();
  if(saving)return;saving=true;
  if(button){button.disabled=true;button.classList.add('is-saving');button.classList.remove('is-saved')}
  if(label)label.textContent=en?'Saving theme…':'Tema kaydediliyor…';if(state)state.textContent=en?'Saving…':'Kaydediliyor…';
  try{
   const params=new URLSearchParams();new FormData(form).forEach((value,key)=>{if(typeof value==='string')params.append(key,value)});
   const response=await fetch(form.action,{method:'POST',body:params,credentials:'same-origin',headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'}});
   const data=await response.json().catch(()=>({ok:false,message:en?'The server returned an invalid response.':'Sunucu geçersiz yanıt döndürdü.'}));
   if(!response.ok||!data.ok)throw new Error(data.message||'Theme save failed');
   if(button){button.classList.remove('is-saving');button.classList.add('is-saved')}
   if(label)label.textContent=en?'Theme Saved':'Tema Kaydedildi';if(state)state.textContent=en?'Saved':'Kaydedildi';notify(data.message|| (en?'Theme saved.':'Tema kaydedildi.'));
   setTimeout(()=>location.reload(),650);
  }catch(error){
   if(button){button.disabled=false;button.classList.remove('is-saving','is-saved')}
   if(label)label.textContent=original;if(state)state.textContent=en?'Save failed':'Kayıt başarısız';notify(error?.message|| (en?'Theme could not be saved.':'Tema kaydedilemedi.'),'error');saving=false;
  }
 },true);
})();

/* ---------------------------------------------------------------------------
   crmv1.46 — Tema Stüdyosu tek modül.
   Aşağıdaki bölüm daha önce ayrı bir dosyada (theme-studio-v18.js) yükleniyordu;
   aynı form ve ön izleme üzerinde ikinci bir dinleyici ve ikinci bir state
   kuruyordu. Kod buraya taşındı, davranış birebir korundu.
   --------------------------------------------------------------------------- */
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

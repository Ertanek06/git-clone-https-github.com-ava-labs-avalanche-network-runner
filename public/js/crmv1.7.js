// Canonical sidebar controller: accordion and persistent icon-rail flyouts.
(()=>{
  "use strict";

  const sidebar=document.getElementById("sidebar");
  const menu=sidebar?.querySelector(".menu");
  if(!sidebar||!menu)return;

  const details=[...menu.querySelectorAll(":scope > details")];

  menu.querySelectorAll("a.is-active").forEach(link=>link.setAttribute("aria-current","page"));
  const syncExpanded=detail=>detail.querySelector(":scope > summary")?.setAttribute("aria-expanded",String(detail.open));
  details.forEach(detail=>{
    syncExpanded(detail);
    detail.addEventListener("toggle",()=>{
      syncExpanded(detail);
      if(detail.open&&!document.body.classList.contains("sidebar-is-collapsed")){
        details.forEach(other=>{if(other!==detail)other.open=false});
      }
    });
  });

  let flyout=null;
  let flyoutOwner=null;
  let flyoutTimer=0;
  const cancelFlyoutTimer=()=>{clearTimeout(flyoutTimer);flyoutTimer=0};
  const closeFlyout=({restoreFocus=false}={})=>{
    cancelFlyoutTimer();
    const owner=flyoutOwner;
    flyout?.remove();
    flyout=null;
    flyoutOwner=null;
    if(owner)owner.setAttribute("aria-expanded",String(Boolean(owner.closest("details")?.open)));
    if(restoreFocus)owner?.focus();
  };
  const placeFlyout=()=>{
    if(!flyout||!flyoutOwner)return;
    const rect=flyoutOwner.getBoundingClientRect();
    const maxTop=Math.max(8,innerHeight-flyout.offsetHeight-10);
    flyout.style.top=`${Math.min(Math.max(8,rect.top),maxTop)}px`;
    flyout.style.left=`${Math.max(8,Math.min(innerWidth-flyout.offsetWidth-10,rect.right+8))}px`;
  };
  const focusFlyoutItem=index=>{
    const links=[...flyout?.querySelectorAll("a")||[]];
    if(!links.length)return;
    links[(index+links.length)%links.length].focus({preventScroll:true});
  };
  const openFlyout=(summary,{focus=false}={})=>{
    if(!document.body.classList.contains("sidebar-is-collapsed"))return;
    if(flyoutOwner===summary){if(focus)focusFlyoutItem(0);return}
    closeFlyout();
    const links=[...summary.closest("details")?.querySelectorAll(":scope > a[href]")||[]].filter(link=>!link.hidden);
    if(!links.length)return;
    const panel=document.createElement("nav");
    panel.className="sidebar-flyout";
    panel.setAttribute("aria-label",String(summary.textContent||"").trim());
    const title=document.createElement("strong");
    title.textContent=String(summary.textContent||"").trim();
    panel.append(title);
    links.forEach(source=>{
      const link=document.createElement("a");
      link.href=source.getAttribute("href")||"#";
      link.textContent=String(source.textContent||"").trim();
      if(source.getAttribute("aria-current")==="page")link.setAttribute("aria-current","page");
      panel.append(link);
    });
    panel.addEventListener("pointerenter",cancelFlyoutTimer);
    panel.addEventListener("pointerleave",()=>{flyoutTimer=setTimeout(closeFlyout,220)});
    panel.addEventListener("keydown",event=>{
      const links=[...panel.querySelectorAll("a")];
      const index=links.indexOf(document.activeElement);
      if(event.key==="ArrowDown"){event.preventDefault();focusFlyoutItem(index+1)}
      else if(event.key==="ArrowUp"){event.preventDefault();focusFlyoutItem(index-1)}
      else if(event.key==="Home"){event.preventDefault();focusFlyoutItem(0)}
      else if(event.key==="End"){event.preventDefault();focusFlyoutItem(links.length-1)}
      else if(event.key==="Escape"||event.key==="ArrowLeft"){event.preventDefault();closeFlyout({restoreFocus:true})}
    });
    document.body.append(panel);
    flyout=panel;
    flyoutOwner=summary;
    summary.setAttribute("aria-expanded","true");
    placeFlyout();
    if(focus)focusFlyoutItem(0);
  };
  for(const summary of menu.querySelectorAll(":scope > details > summary")){
    summary.addEventListener("pointerenter",()=>{
      if(!document.body.classList.contains("sidebar-is-collapsed"))return;
      cancelFlyoutTimer();
      flyoutTimer=setTimeout(()=>openFlyout(summary),160);
    });
    summary.addEventListener("pointerleave",()=>{
      if(flyoutOwner===summary)flyoutTimer=setTimeout(closeFlyout,260);
      else cancelFlyoutTimer();
    });
    summary.addEventListener("keydown",event=>{
      if(!document.body.classList.contains("sidebar-is-collapsed"))return;
      if(event.key==="ArrowRight"||event.key==="ArrowDown"){
        event.preventDefault();
        openFlyout(summary,{focus:true});
      }
    });
  }
  sidebar.addEventListener("click",event=>{
    const summary=event.target.closest("summary");
    if(!summary||!document.body.classList.contains("sidebar-is-collapsed"))return;
    event.preventDefault();
    event.stopPropagation();
    if(flyoutOwner===summary)closeFlyout({restoreFocus:true});
    else openFlyout(summary,{focus:true});
  },true);
  document.addEventListener("pointerdown",event=>{
    if(flyout&&!flyout.contains(event.target)&&!event.target.closest("#sidebar summary"))closeFlyout();
  },{passive:true});
  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    if(flyout)closeFlyout({restoreFocus:true});
  });
  window.addEventListener("resize",closeFlyout,{passive:true});
  window.addEventListener("scroll",closeFlyout,{passive:true,capture:true});
  document.querySelector("[data-sidebar-collapse]")?.addEventListener("click",()=>setTimeout(()=>{
    if(!document.body.classList.contains("sidebar-is-collapsed"))closeFlyout();
  },0));
  new MutationObserver(()=>{
    if(!document.body.classList.contains("sidebar-is-collapsed"))closeFlyout();
  }).observe(document.body,{attributes:true,attributeFilter:["class"]});
})();

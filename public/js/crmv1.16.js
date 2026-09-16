(() => {
  "use strict";
  const modal = document.getElementById("globalPreviewModal"),
    frame = document.getElementById("globalPreviewFrame");
  if (!modal || !frame) return;
  const card = modal.querySelector(".preview-modal__card"),
    toolbar = modal.querySelector(".preview-modal__toolbar"),
    actions = modal.querySelector(".preview-modal__actions");
  if (!card || !toolbar || !actions) return;
  card.classList.add("preview-layout-v16");
  const user = document.body?.dataset.userId || "guest",
    mobile = () => matchMedia("(max-width:1000px)").matches;
  const type = () => {
    let path = "";
    try {
      path = new URL(frame.getAttribute("src") || frame.src, location.origin).pathname;
    } catch {}
    return /^\/products\//.test(path)
      ? "product"
      : /^\/customers\//.test(path)
        ? "customer"
        : /^\/quotes\//.test(path)
          ? "quote"
          : "general";
  };
  const key = () => `crm-preview-layout-v21:${user}:${type()}`;
  const defaults = {
    product: { w: 980, h: 760 },
    customer: { w: 1080, h: 760 },
    quote: { w: 1240, h: 860 },
    general: { w: 960, h: 700 }
  };
  let applying = false,
    saveTimer = 0;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(key()) || "null");
    } catch {
      return null;
    }
  };
  const current = () => ({
    left: Math.round(card.offsetLeft),
    top: Math.round(card.offsetTop),
    width: Math.round(card.offsetWidth),
    height: Math.round(card.offsetHeight)
  });
  const save = () => {
    if (mobile() || applying || !modal.classList.contains("is-open")) return;
    clearTimeout(saveTimer);
    const state = current();
    localStorage.setItem(key(), JSON.stringify(state));
  };
  const apply = (reset = false) => {
    if (mobile()) {
      card.style.removeProperty("left");
      card.style.removeProperty("top");
      card.style.removeProperty("width");
      card.style.removeProperty("height");
      return;
    }
    applying = true;
    const d = defaults[type()] || defaults.general,
      s = reset ? null : read(),
      minWidth = type() === "quote" ? 680 : type() === "product" ? 620 : 520,
      w = clamp(Number(s?.width || d.w), minWidth, innerWidth - 16),
      minHeight = type() === "quote" ? 480 : type() === "product" ? 420 : 300,
      h = clamp(Number(s?.height || d.h), minHeight, innerHeight - 16);
    const left = clamp(
      Number.isFinite(Number(s?.left)) ? Number(s.left) : Math.round((innerWidth - w) / 2),
      8,
      Math.max(8, innerWidth - w - 8)
    );
    const top = clamp(
      Number.isFinite(Number(s?.top)) ? Number(s.top) : Math.round((innerHeight - h) / 2),
      8,
      Math.max(8, innerHeight - h - 8)
    );
    /* Dashboard widget motoru gibi gerçek width/height değerini doğrudan karta
       yazarız. Ara CSS değişkeni tema/override katmanlarında boyutu kilitliyordu. */
    card.style.setProperty("width", `${w}px`, "important");
    card.style.setProperty("height", `${h}px`, "important");
    card.style.setProperty("left", `${left}px`, "important");
    card.style.setProperty("top", `${top}px`, "important");
    requestAnimationFrame(() => {
      applying = false;
      if (reset) save();
    });
  };
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "btn btn--sm btn--soft preview-layout-reset-v16";
  reset.title = "Pencere konumunu ve boyutunu sıfırla";
  reset.setAttribute("aria-label", reset.title);
  reset.textContent = "↺";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn btn--sm btn--danger preview-layout-delete-v16";
  remove.title = "Ön izlenen kaydı sil / arşivle";
  remove.setAttribute("aria-label", remove.title);
  remove.textContent = "🗑";
  remove.hidden = true;
  const resizer = document.createElement("button");
  resizer.type = "button";
  resizer.className = "dash-resize-v372 preview-layout-resizer-v20";
  resizer.dataset.previewResizeV20 = "1";
  resizer.title = "Sürükleyerek pencereyi büyüt / küçült";
  resizer.setAttribute("aria-label", resizer.title);
  resizer.textContent = "↘";
  card.append(resizer);
  const close = actions.querySelector("[data-preview-close]");
  actions.insertBefore(reset, close);
  actions.insertBefore(remove, close);
  reset.addEventListener("click", () => {
    localStorage.removeItem(key());
    apply(true);
  });
  remove.addEventListener("click", () => {
    const internal = frame.contentDocument?.querySelector("[data-product-preview-delete]");
    if (internal) {
      internal.click();
      return;
    }
    const archive = modal.dataset.previewArchive;
    if (!archive || !confirm("Bu proforma arşivlensin mi?")) return;
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
    fetch(archive, {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": csrf, "Content-Type": "application/x-www-form-urlencoded" },
      body: `_csrf=${encodeURIComponent(csrf)}`
    })
      .then((response) => {
        if (!response.ok) throw new Error("Arşivleme işlemi tamamlanamadı.");
        location.reload();
      })
      .catch((error) => alert(error.message));
  });
  /* Dashboard widget motoruyla aynı model: başlangıç tutamaçta, hareket ve
     bırakma pencere seviyesinde izlenir. Pointer Events yanında klasik fare
     olayları da ayrıca bağlıdır; tarayıcı/uzantı pointer akışını engellese bile
     masaüstü sürükleme çalışmaya devam eder. */
  let active = null;
  const block = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const startDrag = (event, dragType) => {
    if (mobile() || event.button !== 0 || active) return;
    if (dragType === "move" && event.target.closest?.("a,button,form,input,select,textarea,label")) return;
    block(event);
    const pointer = event.type.startsWith("pointer");
    active = {
      type: dragType,
      input: pointer ? "pointer" : "mouse",
      id: pointer ? event.pointerId : "mouse",
      startX: event.clientX,
      startY: event.clientY,
      width: card.offsetWidth,
      height: card.offsetHeight,
      left: card.offsetLeft,
      top: card.offsetTop,
      target: event.currentTarget || event.target
    };
    card.classList.add(dragType === "resize" ? "is-preview-resizing-v20" : "is-preview-moving-v20");
    if (pointer) active.target.setPointerCapture?.(event.pointerId);
  };
  toolbar.addEventListener("pointerdown", (event) => startDrag(event, "move"), true);
  toolbar.addEventListener("mousedown", (event) => startDrag(event, "move"), true);
  resizer.addEventListener("pointerdown", (event) => startDrag(event, "resize"), true);
  resizer.addEventListener("mousedown", (event) => startDrag(event, "resize"), true);
  const moveDrag = (event, input) => {
    if (!active || active.input !== input) return;
    if (input === "pointer" && active.id !== event.pointerId) return;
    block(event);
    const state = active,
      dx = event.clientX - state.startX,
      dy = event.clientY - state.startY;
    if (state.type === "move") {
      const left = clamp(state.left + dx, 8, Math.max(8, innerWidth - card.offsetWidth - 8));
      const top = clamp(state.top + dy, 8, Math.max(8, innerHeight - card.offsetHeight - 8));
      card.style.setProperty("left", `${Math.round(left)}px`, "important");
      card.style.setProperty("top", `${Math.round(top)}px`, "important");
    } else {
      const minWidth = type() === "quote" ? 680 : type() === "product" ? 620 : 520,
        minHeight = type() === "quote" ? 480 : type() === "product" ? 420 : 300;
      const maxWidth = Math.max(minWidth, innerWidth - state.left - 8),
        maxHeight = Math.max(minHeight, innerHeight - state.top - 8);
      const width = clamp(state.width + dx, minWidth, maxWidth),
        height = clamp(state.height + dy, minHeight, maxHeight);
      /* Dashboard kartlarında olduğu gibi her pointer hareketinde gerçek
         piksel boyutunu doğrudan karta uygula. */
      card.style.setProperty("width", `${Math.round(width)}px`, "important");
      card.style.setProperty("height", `${Math.round(height)}px`, "important");
    }
  };
  const endDrag = (event, input) => {
    if (!active || active.input !== input) return;
    if (input === "pointer" && active.id !== event.pointerId) return;
    block(event);
    try {
      if (input === "pointer") active.target.releasePointerCapture?.(active.id);
    } catch {}
    active = null;
    card.classList.remove("is-preview-moving-v20", "is-preview-resizing-v20");
    save();
  };
  window.addEventListener("pointermove", (event) => moveDrag(event, "pointer"), {
    passive: false,
    capture: true
  });
  window.addEventListener("pointerup", (event) => endDrag(event, "pointer"), { capture: true });
  window.addEventListener("pointercancel", (event) => endDrag(event, "pointer"), {
    capture: true
  });
  window.addEventListener("mousemove", (event) => moveDrag(event, "mouse"), {
    passive: false,
    capture: true
  });
  window.addEventListener("mouseup", (event) => endDrag(event, "mouse"), { capture: true });
  resizer.addEventListener("keydown", (event) => {
    if (mobile() || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    block(event);
    const step = event.shiftKey ? 40 : 12,
      minWidth = type() === "quote" ? 680 : type() === "product" ? 620 : 520,
      minHeight = type() === "quote" ? 480 : type() === "product" ? 420 : 300,
      widthDelta = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0,
      heightDelta = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    card.style.setProperty(
      "width",
      `${Math.round(clamp(card.offsetWidth + widthDelta, minWidth, innerWidth - card.offsetLeft - 8))}px`,
      "important"
    );
    card.style.setProperty(
      "height",
      `${Math.round(clamp(card.offsetHeight + heightDelta, minHeight, innerHeight - card.offsetTop - 8))}px`,
      "important"
    );
    save();
  });
  resizer.addEventListener("dragstart", (event) => event.preventDefault());
  new ResizeObserver(() => {
    if (!applying) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 180);
    }
  }).observe(card);
  const sync = () => {
    if (!modal.classList.contains("is-open")) return;
    requestAnimationFrame(() => apply(false));
    const previewType = type();
    document.getElementById("globalPreviewPrint")?.removeAttribute("hidden");
    remove.hidden = previewType === "quote" ? !modal.dataset.previewArchive : previewType !== "product";
    if (previewType === "product")
      setTimeout(() => {
        remove.hidden = !frame.contentDocument?.querySelector("[data-product-preview-delete]");
      }, 80);
  };
  new MutationObserver(sync).observe(frame, { attributes: true, attributeFilter: ["src"] });
  new MutationObserver(sync).observe(modal, { attributes: true, attributeFilter: ["class"] });
  frame.addEventListener("load", () => {
    sync();
    if (type() === "product")
      remove.hidden = !frame.contentDocument?.querySelector("[data-product-preview-delete]");
  });
  window.addEventListener("resize", () => apply(false), { passive: true });
  modal.addEventListener(
    "click",
    (event) => {
      if (event.target !== modal) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      save();
    },
    { capture: true }
  );
})();

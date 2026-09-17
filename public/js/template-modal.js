(() => {
  "use strict";

  const cspNonce = document.currentScript?.nonce || "";
  const boot = window.TEMPLATE_MODAL_BOOT || {};
  const modal = document.getElementById("templateCodeModal");
  const openButton = document.getElementById("openTemplateCreate");
  const closeButtons = [...document.querySelectorAll("[data-template-modal-close]")];
  const fullscreenButton = document.querySelector("[data-template-fullscreen]");
  const previewZoomButton = document.querySelector("[data-template-preview-zoom]");
  const resetButton = document.querySelector("[data-template-reset]");
  const form = document.getElementById("templateCodeForm");
  const html = document.getElementById("tplHtml");
  const css = document.getElementById("tplCss");
  const frame = document.getElementById("tplPreviewFrame");
  const name = document.getElementById("tplName");
  const description = document.getElementById("tplDescription");
  const primary = document.getElementById("tplPrimary");
  const accent = document.getElementById("tplAccent");
  const title = document.getElementById("templateModalTitle");
  const submit = form?.querySelector('button[type="submit"]');
  const altVisible = document.getElementById("tplAlternativeVisible");
  const altColor = document.getElementById("tplAlternativeColor");
  const altTextColor = document.getElementById("tplAlternativeTextColor");
  const altPosition = document.getElementById("tplAlternativePosition");
  const font = document.getElementById("tplFont");
  const fontSize = document.getElementById("tplFontSize");
  const layout = document.getElementById("tplLayout");
  const useCustom = document.getElementById("tplUseCustomHtml");
  const templateId = document.getElementById("tplTemplateId");
  const enableStructural = document.getElementById("tplEnableStructural");
  const radius = document.getElementById("tplCardRadius");
  const radiusOutput = document.getElementById("tplCardRadiusOutput");
  const logoWidth = document.getElementById("tplLogoWidth");
  const logoHeight = document.getElementById("tplLogoHeight");
  const logoOffsetX = document.getElementById("tplLogoOffsetX");
  const logoOffsetY = document.getElementById("tplLogoOffsetY");
  const logoWidthOutput = document.getElementById("tplLogoWidthOutput");
  const logoHeightOutput = document.getElementById("tplLogoHeightOutput");
  const logoOffsetXOutput = document.getElementById("tplLogoOffsetXOutput");
  const logoOffsetYOutput = document.getElementById("tplLogoOffsetYOutput");
  const paletteEnabled = document.getElementById("tplCustomPaletteEnabled");
  const paletteInputs = form ? [...form.querySelectorAll("[data-template-section-color]")] : [];
  const fullscreenStorageKey = "crm-template-studio-fullscreen-v17";
  const paletteStyleMap = {
    page_bg_color: [".a4", "backgroundColor"],
    body_text_color: [".a4", "color"],
    muted_text_color: [".print-description>small", "color"],
    border_color: [".customer-card", "borderTopColor"],
    company_bg_color: [".company-card", "backgroundColor"],
    company_text_color: [".company-card dd", "color"],
    meta_bg_color: [".meta-card", "backgroundColor"],
    meta_text_color: [".meta-card dd", "color"],
    title_bg_color: [".document-title", "backgroundColor"],
    title_text_color: [".document-title h1", "color"],
    customer_bg_color: [".customer-card", "backgroundColor"],
    customer_text_color: [".customer-card dd", "color"],
    table_header_bg_color: [".print-items th", "backgroundColor"],
    table_header_text_color: [".print-items th", "color"],
    table_row_bg_color: [".print-items tbody tr:first-child td", "backgroundColor"],
    table_alt_bg_color: [".print-items tbody tr:nth-child(even) td", "backgroundColor"],
    table_text_color: [".print-items tbody td", "color"],
    link_color: [".print-items a", "color"],
    totals_bg_color: [".totals>div:not(.grand)", "backgroundColor"],
    totals_text_color: [".totals>div:not(.grand)", "color"],
    grand_total_bg_color: [".totals>.grand", "backgroundColor"],
    grand_total_text_color: [".totals>.grand", "color"],
    discount_color: [".print-discount.has-discount,.totals .discount-total", "color"],
    terms_bg_color: [".terms-card", "backgroundColor"],
    terms_header_bg_color: [".terms-card>header", "backgroundColor"],
    terms_header_text_color: [".terms-card>header h2", "color"],
    terms_text_color: [".terms-card>div", "color"],
    bank_bg_color: [".bank-card", "backgroundColor"],
    bank_header_bg_color: [".bank-card>header", "backgroundColor"],
    bank_header_text_color: [".bank-card>header h2", "color"],
    bank_text_color: [".bank-card dd", "color"],
    signature_bg_color: [".signature-grid>div", "backgroundColor"],
    signature_text_color: [".signature-grid>div", "color"],
    footer_bg_color: [".print-footer,.print-footer--page", "backgroundColor"],
    footer_text_color: [".print-footer,.print-footer--page", "color"]
  };

  if (!modal || !form || !frame) return;

  function toast(type, message) {
    document.querySelectorAll(".template-save-toast").forEach((element) => element.remove());
    const element = document.createElement("div");
    element.className = `toast toast--${type} template-save-toast`;
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 4200);
  }

  let previewRequest = null,
    previewSerial = 0,
    initialFormState = null,
    shouldCapturePaletteBaseline = false;

  function cssColorToHex(value) {
    const raw = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
    if (/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0(?:\.0+)?\s*\)$/i.test(raw)) return "";
    const match = raw.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i);
    if (!match) return "";
    return `#${match
      .slice(1, 4)
      .map((part) => Math.max(0, Math.min(255, Math.round(Number(part) || 0))).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function syncPaletteInputsFromRenderedDesign() {
    if (!shouldCapturePaletteBaseline || paletteEnabled?.checked) return false;
    const doc = frame.contentDocument;
    if (!doc?.body?.classList?.contains("print-layout")) return false;
    let changed = false;
    paletteInputs.forEach((input) => {
      const mapping = paletteStyleMap[input.name];
      if (!mapping) return;
      const [selector, property] = mapping;
      const element = doc.querySelector(selector);
      if (!element) return;
      const color = cssColorToHex(doc.defaultView.getComputedStyle(element)[property]);
      if (!color) return;
      input.value = color;
      changed = true;
    });
    if (changed) shouldCapturePaletteBaseline = false;
    return changed;
  }

  function syncRangeOutputs() {
    if (radiusOutput) radiusOutput.textContent = `${radius?.value || 4} px`;
    if (logoWidthOutput) logoWidthOutput.textContent = `${logoWidth?.value || 34} mm`;
    if (logoHeightOutput) logoHeightOutput.textContent = `${logoHeight?.value || 15} mm`;
    if (logoOffsetXOutput) logoOffsetXOutput.textContent = `${logoOffsetX?.value || 0} mm`;
    if (logoOffsetYOutput) logoOffsetYOutput.textContent = `${logoOffsetY?.value || 0} mm`;
  }

  function captureFormState() {
    return [...form.elements]
      .filter((element) => element?.name)
      .map((element) => ({
        name: element.name,
        type: element.type,
        value: element.value,
        checked: Boolean(element.checked)
      }));
  }

  function restoreFormState(state) {
    if (!Array.isArray(state)) return;
    state.forEach((saved) => {
      const element = [...form.elements].find((candidate) => candidate?.name === saved.name);
      if (!element) return;
      if (element.type === "checkbox" || element.type === "radio") element.checked = saved.checked;
      else element.value = saved.value;
    });
    syncRangeOutputs();
  }

  async function render() {
    syncRangeOutputs();
    previewRequest?.abort();
    previewRequest = new AbortController();
    const serial = ++previewSerial;
    const data = new URLSearchParams(new FormData(form));
    for (const checkbox of form.querySelectorAll('input[type="checkbox"][name]'))
      data.set(checkbox.name, checkbox.checked ? "1" : "0");
    frame.setAttribute("aria-busy", "true");
    if (!frame.srcdoc)
      frame.srcdoc =
        '<!doctype html><html><body style="display:grid;place-items:center;min-height:100vh;margin:0;font:700 14px Arial;color:#345;background:#edf3f9">Gerçek proforma hazırlanıyor…</body></html>';
    try {
      const response = await fetch("/templates/live-preview", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: previewRequest.signal,
        headers: {
          Accept: "text/html",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: data
      });
      if (!response.ok) throw new Error(`Ön izleme oluşturulamadı (${response.status}).`);
      let output = await response.text();
      if (serial !== previewSerial) return;
      output = output.replace(/nonce=("[^"]*"|'[^']*')/g, `nonce="${cspNonce}"`);
      const studioCss = `<style nonce="${cspNonce}" id="template-live-side-by-side-v21">html{background:#e7edf5!important}body.print-layout{background:#e7edf5!important;overflow:auto!important;padding:8px!important}body.print-layout #print-pages{display:flex!important;align-items:flex-start!important;gap:14px!important;width:max-content!important;min-width:100%!important;padding:4px!important;zoom:.48}body.print-layout #print-pages>.a4{flex:0 0 210mm!important;margin:0!important;box-shadow:0 5px 18px #0f172a24!important}body.print-layout .custom-template-a4{margin:4px auto!important;zoom:.62}body.print-layout .template-draft-logo-label-v21{display:inline-flex!important}@media(max-width:760px){body.print-layout #print-pages{zoom:.36}}@media(min-width:1500px){body.print-layout #print-pages{zoom:.54}}</style>`;
      output = output.replace(/<head>/i, `<head><base href="${location.origin}/">${studioCss}`);
      frame.srcdoc = output;
    } catch (error) {
      if (error.name === "AbortError") return;
      frame.srcdoc = `<!doctype html><html><body style="padding:24px;font:700 14px Arial;color:#9b1c1c;background:#fff5f5">${String(error.message || "Ön izleme oluşturulamadı.").replace(/[<>&]/g, "")}</body></html>`;
    } finally {
      if (serial === previewSerial) frame.removeAttribute("aria-busy");
    }
  }

  frame.addEventListener("load", () => {
    requestAnimationFrame(() => syncPaletteInputsFromRenderedDesign());
  });
  paletteInputs.forEach((input) => {
    input.addEventListener("pointerdown", () => syncPaletteInputsFromRenderedDesign(), { passive: true });
    input.addEventListener("focus", () => syncPaletteInputsFromRenderedDesign());
  });

  function fill(mode) {
    const row = boot.row || {};
    const settings = boot.settings || {};
    form.action = mode === "edit" ? boot.action : "/templates/create";
    title.textContent = mode === "edit" ? "Proforma Şablonunu Düzenle" : "Proforma Şablonu Oluştur";
    name.value = mode === "edit" ? row.name || "" : "Yeni Kurumsal Şablon";
    description.value =
      mode === "edit" ? row.description || "" : "Yapısal olarak düzenlenebilir kurumsal proforma şablonu";
    primary.value = row.primary_color || "#245ba7";
    accent.value = primary.value;
    if (font) font.value = row.font_family || "Inter";
    if (fontSize) fontSize.value = row.font_size || 11;
    if (layout) layout.value = row.layout_key || "classic";
    if (templateId) templateId.value = mode === "edit" ? row.id || "" : "";
    if (enableStructural)
      enableStructural.checked = mode === "create" || Number(settings.design_version || 0) >= 2;
    const selectMap = {
      tplHeaderVariant: "header_variant",
      tplTitleVariant: "title_variant",
      tplCustomerVariant: "customer_variant",
      tplItemVariant: "item_variant",
      tplImageVariant: "image_variant",
      tplTableDensity: "table_density",
      tplTotalsVariant: "totals_variant",
      tplTermsVariant: "terms_variant",
      tplBankVariant: "bank_variant",
      tplSignatureVariant: "signature_variant",
      tplFooterVariant: "footer_variant",
      tplSpacingVariant: "spacing_variant",
      tplBorderStyle: "border_style",
      tplLogoPosition: "logo_position"
    };
    Object.entries(selectMap).forEach(([id, key]) => {
      const element = document.getElementById(id);
      if (element && settings[key]) element.value = settings[key];
    });
    if (radius) radius.value = settings.card_radius ?? 4;
    if (logoWidth) logoWidth.value = settings.logo_width_mm ?? 34;
    if (logoHeight) logoHeight.value = settings.logo_height_mm ?? 15;
    if (logoOffsetX) logoOffsetX.value = settings.logo_offset_x_mm ?? 0;
    if (logoOffsetY) logoOffsetY.value = settings.logo_offset_y_mm ?? 0;
    if (paletteEnabled) paletteEnabled.checked = Boolean(settings.custom_palette_enabled);
    shouldCapturePaletteBaseline = !Boolean(settings.custom_palette_enabled);
    paletteInputs.forEach((input) => {
      const value = settings[input.name];
      input.value = /^#[0-9a-f]{6}$/i.test(String(value || ""))
        ? String(value)
        : input.dataset.defaultColor || "#ffffff";
    });
    [
      ["tplShowLogo", "show_logo"],
      ["tplShowImages", "show_images"],
      ["tplShowCode", "show_code"],
      ["tplShowVat", "show_vat"],
      ["tplShowDiscount", "show_discount"],
      ["tplShowFx", "show_fx"],
      ["tplShowBank", "show_bank"],
      ["tplShowStamp", "show_stamp"],
      ["tplShowCustomerApproval", "show_customer_approval"],
      ["tplShowFooter", "show_footer"]
    ].forEach(([id, key]) => {
      const element = document.getElementById(id);
      if (element) element.checked = settings[key] !== false;
    });
    if (useCustom) useCustom.checked = Boolean(settings.use_custom_html);
    if (altVisible) altVisible.checked = settings.show_alternative_badge !== false;
    if (altColor) altColor.value = settings.alternative_badge_color || "#f59e0b";
    if (altTextColor) altTextColor.value = settings.alternative_badge_text_color || "#3b2200";
    if (altPosition) altPosition.value = settings.alternative_badge_position || "top-left";
    html.value = (mode === "edit" && settings.custom_html) || boot.starterHtml || "";
    css.value = (mode === "edit" && settings.custom_css) || boot.starterCss || "";
    syncRangeOutputs();
    initialFormState = captureFormState();
    render();
  }

  function setFullscreen(active, remember = true) {
    modal.classList.toggle("is-fullscreen-v17", active);
    fullscreenButton?.setAttribute("aria-pressed", String(active));
    if (fullscreenButton) fullscreenButton.textContent = active ? "▣ Pencereye Dön" : "⛶ Tam Ekran";
    if (remember) {
      try {
        localStorage.setItem(fullscreenStorageKey, active ? "1" : "0");
      } catch {}
    }
  }

  function setPreviewFocus(active) {
    if (active) setFullscreen(true);
    modal.classList.toggle("is-preview-focus-v17", active);
    if (previewZoomButton) previewZoomButton.textContent = active ? "Ayarları Göster" : "Ön İzlemeyi Büyüt";
  }

  function show(mode = "create") {
    fill(mode);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("template-editor-open-v17");
    let stored = null;
    try {
      stored = localStorage.getItem(fullscreenStorageKey);
    } catch {}
    const initialFullscreen = stored == null ? mode === "edit" && window.innerWidth >= 1050 : stored === "1";
    setFullscreen(initialFullscreen, false);
    setTimeout(() => name.focus(), 30);
  }

  function hide() {
    modal.classList.remove("is-open", "is-preview-focus-v17");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("template-editor-open-v17");
    if (previewZoomButton) previewZoomButton.textContent = "Ön İzlemeyi Büyüt";
  }

  openButton?.addEventListener("click", () => show("create"));
  closeButtons.forEach((button) => button.addEventListener("click", hide));
  fullscreenButton?.addEventListener("click", () =>
    setFullscreen(!modal.classList.contains("is-fullscreen-v17"))
  );
  previewZoomButton?.addEventListener("click", () =>
    setPreviewFocus(!modal.classList.contains("is-preview-focus-v17"))
  );
  resetButton?.addEventListener("click", () => {
    restoreFormState(initialFormState);
    shouldCapturePaletteBaseline = !paletteEnabled?.checked;
    render();
    toast("success", "Kaydedilmemiş değişiklikler sıfırlandı; şablon eski haline döndü.");
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) hide();
  });
  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      if (modal.classList.contains("is-preview-focus-v17")) setPreviewFocus(false);
      else hide();
    }
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "f") {
      event.preventDefault();
      setFullscreen(!modal.classList.contains("is-fullscreen-v17"));
    }
  });

  let timer;
  const queueRender = (event) => {
    const target = event?.target;
    const isSectionColor = target?.matches?.("[data-template-section-color]");
    if (target === primary && accent) accent.value = primary.value;
    if (isSectionColor && paletteEnabled) {
      syncPaletteInputsFromRenderedDesign();
      paletteEnabled.checked = true;
      shouldCapturePaletteBaseline = false;
    } else if (target !== paletteEnabled && !paletteEnabled?.checked) {
      shouldCapturePaletteBaseline = true;
    }
    if (target?.closest?.(".template-structure-controls-v16") && target !== enableStructural && enableStructural)
      enableStructural.checked = true;
    syncRangeOutputs();
    clearTimeout(timer);
    timer = setTimeout(render, 45);
  };
  [...form.querySelectorAll("input,select,textarea")].forEach((element) => {
    element.addEventListener("input", queueRender);
    element.addEventListener("change", queueRender);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const oldLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = "Kaydediliyor…";
    try {
      const data = new URLSearchParams(new FormData(form));
      for (const checkbox of form.querySelectorAll('input[type="checkbox"][name]'))
        data.set(checkbox.name, checkbox.checked ? "1" : "0");
      data.set("_ajax", "1");
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: data
      });
      const payload = await response.json().catch(() => ({ ok: false, message: "Sunucu yanıtı okunamadı." }));
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Şablon kaydedilemedi.");
      hide();
      toast("success", payload.message || "Proforma şablonu kaydedildi.");
      setTimeout(() => {
        window.location.href = payload.redirect || "/templates";
      }, 900);
    } catch (error) {
      toast("error", error.message || "Şablon kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      submit.disabled = false;
      submit.textContent = oldLabel;
    }
  });

  document.querySelectorAll("[data-template-delete]").forEach((deleteForm) =>
    deleteForm.addEventListener("submit", (event) => {
      if (!confirm("Bu proforma şablonu kalıcı olarak silinsin mi?")) event.preventDefault();
    })
  );

  if (boot.open) show("edit");
})();

(() => {
  const form = document.getElementById('loginStudioForm');
  const viewport = document.getElementById('loginStudioViewport');
  const canvas = document.getElementById('loginStudioCanvas');
  const grid = document.getElementById('loginMediaGrid');
  if (!form || !viewport || !canvas || !grid) return;

  const DESIGN_WIDTH = 1600;
  const DESIGN_HEIGHT = 900;
  const LEFT_WIDTH = 850;
  const MOBILE_BREAKPOINT = 1100;
  const cssRole = { left_title: 'left-title', left_text: 'left-text', eyebrow: 'eyebrow', title: 'title', subtitle: 'subtitle', button: 'button' };
  const roleTarget = role => canvas.querySelector(`[data-preview-role="${role}"]`);
  const selectedMediaInput = form.querySelector('[data-selected-media-id]');
  const payloadInput = form.querySelector('[data-studio-payload]');
  const modal = document.querySelector('[data-live-preview-modal]');
  const modalStage = modal?.querySelector('[data-live-preview-stage]');
  let pendingObjectUrl = null;
  let fitFrame = 0;
  let modalFrame = 0;
  let previewVisible = true;

  function viewportRatio() {
    const width = Math.max(320, window.innerWidth || DESIGN_WIDTH);
    const height = Math.max(320, window.innerHeight || DESIGN_HEIGHT);
    return width / height;
  }

  function fitCanvas(targetCanvas, box, mode = 'cover') {
    if (!targetCanvas || !box) return null;
    const width = Math.max(1, box.clientWidth);
    const height = Math.max(1, box.clientHeight);
    const sx = width / DESIGN_WIDTH;
    const sy = height / DESIGN_HEIGHT;
    const scale = mode === 'contain' ? Math.min(sx, sy) : Math.max(sx, sy);
    const renderedWidth = DESIGN_WIDTH * scale;
    const renderedHeight = DESIGN_HEIGHT * scale;
    const left = (width - renderedWidth) / 2;
    const top = (height - renderedHeight) / 2;
    targetCanvas.style.transform = `scale(${scale})`;
    targetCanvas.style.left = `${left}px`;
    targetCanvas.style.top = `${top}px`;
    targetCanvas.dataset.fitScale = String(scale);
    targetCanvas.dataset.fitLeft = String(left);
    targetCanvas.dataset.fitTop = String(top);
    return { width, height, scale, left, top };
  }

  function fitPreview() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      const width = Math.max(1, viewport.clientWidth);
      const preferred = width / viewportRatio();
      const compact = width <= 680;
      viewport.style.height = `${compact ? Math.max(190, Math.min(280, width * 0.5625)) : Math.max(300, Math.min(520, preferred))}px`;
      canvas.classList.remove('is-mobile-layout');
      fitCanvas(canvas, viewport, compact ? 'contain' : 'cover');
      clampAllPositions();
    });
  }

  function getFitState(targetCanvas = canvas, box = viewport) {
    const scale = Number(targetCanvas.dataset.fitScale || 1);
    const left = Number(targetCanvas.dataset.fitLeft || 0);
    const top = Number(targetCanvas.dataset.fitTop || 0);
    return { scale, left, top, width: box.clientWidth, height: box.clientHeight };
  }

  function visibleLeftBounds() {
    const { scale, left, top, width, height } = getFitState();
    return {
      xMin: Math.max(0, -left / scale),
      xMax: Math.min(LEFT_WIDTH, (width - left) / scale),
      yMin: Math.max(0, -top / scale),
      yMax: Math.min(DESIGN_HEIGHT, (height - top) / scale)
    };
  }

  function positionInputs(role) {
    return {
      x: form.querySelector(`[data-position-input="${role}_x"]`),
      y: form.querySelector(`[data-position-input="${role}_y"]`)
    };
  }

  function clampPosition(role, x, y) {
    const target = roleTarget(role);
    if (!target || target.classList.contains('is-empty')) return { x, y };
    const bounds = visibleLeftBounds();
    const width = Math.min(LEFT_WIDTH, Math.max(1, target.offsetWidth));
    const height = Math.min(DESIGN_HEIGHT, Math.max(1, target.offsetHeight));
    const minX = bounds.xMin / LEFT_WIDTH * 100;
    const maxX = Math.max(minX, (bounds.xMax - width) / LEFT_WIDTH * 100);
    const minY = (bounds.yMin + height / 2) / DESIGN_HEIGHT * 100;
    const maxY = Math.max(minY, (bounds.yMax - height / 2) / DESIGN_HEIGHT * 100);
    return {
      x: Math.min(maxX, Math.max(minX, Number(x) || 0)),
      y: Math.min(maxY, Math.max(minY, Number(y) || 0))
    };
  }

  function setPosition(role, x, y, { skipModal = false } = {}) {
    const key = cssRole[role];
    if (!key) return;
    const safe = clampPosition(role, x, y);
    canvas.style.setProperty(`--${key}-x`, `${safe.x}%`);
    canvas.style.setProperty(`--${key}-y`, `${safe.y}%`);
    const inputs = positionInputs(role);
    if (inputs.x) inputs.x.value = safe.x.toFixed(2);
    if (inputs.y) inputs.y.value = safe.y.toFixed(2);
    if (!skipModal) scheduleModalRefresh();
  }

  function clampCurrentPosition(role) {
    const inputs = positionInputs(role);
    setPosition(role, Number(inputs.x?.value || 0), Number(inputs.y?.value || 0));
  }

  function clampAllPositions() {
    requestAnimationFrame(() => {
      clampCurrentPosition('left_title');
      clampCurrentPosition('left_text');
    });
  }

  function setText(role, value) {
    const target = roleTarget(role);
    if (!target) return;
    const textNode = target.querySelector('h1,p') || target;
    textNode.textContent = value;
    target.classList.toggle('is-empty', !String(value || '').trim());
    requestAnimationFrame(() => {
      if (role === 'left_title' || role === 'left_text') clampCurrentPosition(role);
      scheduleModalRefresh();
    });
  }

  function setPlaceholder(role, value) {
    const target = canvas.querySelector(`[data-preview-placeholder="${role}"]`);
    if (target) target.setAttribute('placeholder', value || '');
    scheduleModalRefresh();
  }

  function setSize(role, value) {
    const key = cssRole[role];
    if (key) canvas.style.setProperty(`--${key}-size`, `${Number(value) || 0}px`);
    requestAnimationFrame(() => {
      if (role === 'left_title' || role === 'left_text') clampCurrentPosition(role);
      scheduleModalRefresh();
    });
  }

  function setColor(role, value) {
    if (role === 'button_bg') canvas.style.setProperty('--button-bg', value);
    else {
      const key = cssRole[role];
      if (key) canvas.style.setProperty(`--${key}-color`, value);
    }
    scheduleModalRefresh();
  }

  function setFont(role, value) {
    const key = cssRole[role];
    if (key) canvas.style.setProperty(`--${key}-font`, JSON.stringify(value));
    requestAnimationFrame(() => {
      if (role === 'left_title' || role === 'left_text') clampCurrentPosition(role);
      scheduleModalRefresh();
    });
  }

  function setCssVariable(input) {
    const key = input.dataset.studioCss;
    if (!key) return;
    let value = input.value;
    if (key.endsWith('-font')) value = JSON.stringify(value);
    else value = `${value}${input.dataset.unit || ''}`;
    canvas.style.setProperty(`--${key}`, value);
    if (key === 'logo-height') {
      const output = form.querySelector('[data-logo-height-value]');
      if (output) output.textContent = input.value;
    }
    scheduleModalRefresh();
  }

  form.querySelectorAll('[data-studio-text]').forEach(input => input.addEventListener('input', () => setText(input.dataset.studioText, input.value)));
  form.querySelectorAll('[data-studio-placeholder]').forEach(input => input.addEventListener('input', () => setPlaceholder(input.dataset.studioPlaceholder, input.value)));
  form.querySelectorAll('[data-studio-size]').forEach(input => input.addEventListener('input', () => setSize(input.dataset.studioSize, input.value)));
  form.querySelectorAll('[data-studio-color]').forEach(input => input.addEventListener('input', () => setColor(input.dataset.studioColor, input.value)));
  form.querySelectorAll('[data-studio-font]').forEach(input => input.addEventListener('change', () => setFont(input.dataset.studioFont, input.value)));
  form.querySelectorAll('[data-studio-css]').forEach(input => {
    const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventName, () => setCssVariable(input));
  });

  const overlay = form.querySelector('[data-studio-range="overlay"]');
  const overlayValue = form.querySelector('[data-overlay-value]');
  if (overlay) overlay.addEventListener('input', () => {
    canvas.style.setProperty('--overlay', overlay.value);
    if (overlayValue) overlayValue.textContent = Math.round(Number(overlay.value) * 100);
    scheduleModalRefresh();
  });

  canvas.querySelectorAll('[data-draggable]').forEach(target => {
    const role = target.dataset.draggable;
    target.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const zone = canvas.querySelector('[data-login-left-zone]');
      const zoneRect = zone.getBoundingClientRect();
      const startX = Number(positionInputs(role).x?.value || 0);
      const startY = Number(positionInputs(role).y?.value || 0);
      const pointerX = event.clientX;
      const pointerY = event.clientY;
      target.setPointerCapture(event.pointerId);
      target.classList.add('is-dragging');
      const move = moveEvent => {
        const dx = (moveEvent.clientX - pointerX) / zoneRect.width * 100;
        const dy = (moveEvent.clientY - pointerY) / zoneRect.height * 100;
        setPosition(role, startX + dx, startY + dy);
      };
      const finish = () => {
        target.classList.remove('is-dragging');
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', finish);
        target.removeEventListener('pointercancel', finish);
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', finish);
      target.addEventListener('pointercancel', finish);
    });
    target.addEventListener('wheel', event => {
      event.preventDefault();
      const sizeInput = form.querySelector(`[data-studio-size="${role}"]`);
      if (!sizeInput) return;
      const min = Number(sizeInput.min || 10);
      const max = Number(sizeInput.max || 84);
      const next = Math.min(max, Math.max(min, Number(sizeInput.value || min) + (event.deltaY < 0 ? 1 : -1)));
      sizeInput.value = String(next);
      sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }, { passive: false });
  });

  const resetDefaults = { left_title: [8, 70], left_text: [8, 82] };
  form.querySelectorAll('[data-reset-position]').forEach(button => button.addEventListener('click', () => {
    const role = button.dataset.resetPosition;
    const [x, y] = resetDefaults[role] || [8, 70];
    setPosition(role, x, y);
  }));

  const modelPresets = {
    classic: { card_width: 520, card_radius: 28, card_bg: '#ffffff', card_border: '#c7d5e7', button_bg: '#245ba7', button_radius: 13, input_bg: '#ffffff', input_border: '#becde0', title_color: '#14233d', subtitle_color: '#5d6f89', field_label_color: '#17243a' },
    glass: { card_width: 530, card_radius: 30, card_bg: '#f7fbff', card_border: '#d9e8f7', button_bg: '#1764ad', button_radius: 14, input_bg: '#ffffff', input_border: '#c4d9ed', title_color: '#10213b', subtitle_color: '#4d6684', field_label_color: '#183352' },
    executive: { card_width: 535, card_radius: 22, card_bg: '#f8fbff', card_border: '#36577f', button_bg: '#173f73', button_radius: 8, input_bg: '#ffffff', input_border: '#91aac5', title_color: '#12243d', subtitle_color: '#526982', field_label_color: '#152c49' },
    minimal: { card_width: 500, card_radius: 14, card_bg: '#ffffff', card_border: '#dce5ef', button_bg: '#1f5da8', button_radius: 7, input_bg: '#ffffff', input_border: '#d0d9e5', title_color: '#15243a', subtitle_color: '#607087', field_label_color: '#1b2c44' },
    embedded: { card_width: 530, card_radius: 24, card_bg: '#f5f9fd', card_border: '#f5f9fd', button_bg: '#235b9e', button_radius: 12, input_bg: '#ffffff', input_border: '#c5d4e5', title_color: '#152740', subtitle_color: '#536a85', field_label_color: '#172d49' }
  };

  function applyModel(modelId, applyPreset) {
    const valid = modelPresets[modelId] ? modelId : 'classic';
    canvas.classList.remove(...[...canvas.classList].filter(name => name.startsWith('login-card-style--')));
    canvas.classList.add(`login-card-style--${valid}`);
    canvas.dataset.cardStyle = valid;
    form.querySelectorAll('[data-card-model]').forEach(card => card.classList.toggle('is-selected', card.dataset.cardModel === valid));
    const radio = form.querySelector(`input[name="card_style"][value="${valid}"]`);
    if (radio) radio.checked = true;
    if (applyPreset) {
      for (const [name, value] of Object.entries(modelPresets[valid])) {
        const input = form.elements.namedItem(name);
        if (!input) continue;
        input.value = String(value);
        if (input.matches('[data-studio-css]')) setCssVariable(input);
        else if (input.matches('[data-studio-color]')) setColor(input.dataset.studioColor, input.value);
      }
    }
    scheduleModalRefresh();
  }

  form.querySelectorAll('[data-card-model]').forEach(card => card.addEventListener('click', event => {
    if (event.target.closest('input')) return;
    applyModel(card.dataset.cardModel, true);
  }));
  form.querySelectorAll('input[name="card_style"]').forEach(radio => radio.addEventListener('change', () => applyModel(radio.value, true)));

  function mediaElements(targetCanvas = canvas) {
    return {
      wrap: targetCanvas.querySelector('[data-preview-media-wrap]'),
      video: targetCanvas.querySelector('[data-preview-media-video]'),
      image: targetCanvas.querySelector('[data-preview-media-image]')
    };
  }

  function updatePreviewPlayback() {
    const { video } = mediaElements();
    if (!video || video.hidden) return;
    if (previewVisible && document.visibilityState === 'visible') video.play().catch(() => {});
    else video.pause();
  }

  function applyMedia({ kind, url, poster = '', id = 'none' }) {
    const { wrap, video, image } = mediaElements();
    wrap.dataset.mediaId = id;
    wrap.dataset.mediaKind = kind;
    if (kind === 'video' && url) {
      image.hidden = true;
      image.removeAttribute('src');
      video.hidden = false;
      const current = video.getAttribute('src') || '';
      if (current !== url) {
        video.pause();
        video.classList.remove('is-ready');
        video.removeAttribute('src');
        video.dataset.src = url;
        if (poster) video.poster = poster; else video.removeAttribute('poster');
        video.addEventListener('loadeddata', () => video.classList.add('is-ready'), { once: true });
        video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
        video.src = url;
        video.load();
      } else if (video.readyState >= 2) video.classList.add('is-ready');
      updatePreviewPlayback();
    } else if (kind === 'image' && url) {
      video.pause();
      video.classList.remove('is-ready');
      video.hidden = true;
      video.removeAttribute('src');
      delete video.dataset.src;
      video.load();
      image.hidden = false;
      image.src = url;
    } else {
      video.pause();
      video.classList.remove('is-ready');
      video.hidden = true;
      video.removeAttribute('src');
      delete video.dataset.src;
      video.load();
      image.hidden = true;
      image.removeAttribute('src');
    }
    scheduleModalRefresh();
  }

  function selectCard(card) {
    if (!card) return;
    grid.querySelectorAll('.login-media-card').forEach(item => item.classList.toggle('is-selected', item === card));
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    if (selectedMediaInput) selectedMediaInput.value = card.dataset.mediaCard || radio?.value || 'none';
    applyMedia({ kind: card.dataset.mediaKind || 'none', url: card.dataset.mediaUrl || '', poster: card.dataset.mediaPoster || '', id: card.dataset.mediaCard || 'none' });
  }

  grid.addEventListener('change', event => {
    const radio = event.target.closest('input[type="radio"][name="media_id"]');
    if (radio) selectCard(radio.closest('.login-media-card'));
  });
  grid.addEventListener('click', event => {
    if (event.target.closest('[data-delete-media]')) return;
    const card = event.target.closest('.login-media-card');
    if (card) selectCard(card);
  });

  function createImageCard(url) {
    let card = grid.querySelector('[data-media-card="image"]');
    if (!card) {
      card = document.createElement('label');
      card.className = 'login-media-card';
      card.dataset.mediaCard = 'image';
      card.dataset.mediaKind = 'image';
      card.innerHTML = '<input type="radio" name="media_id" value="image"><img alt=""><b>Sabit Görsel</b><small>Yeni seçilen görsel</small>';
      grid.querySelector('[data-media-card="none"]').insertAdjacentElement('afterend', card);
    }
    card.dataset.mediaUrl = url;
    card.querySelector('img').src = url;
    return card;
  }

  form.querySelector('[data-login-file="left_image"]')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) selectCard(createImageCard(URL.createObjectURL(file)));
  });

  form.querySelector('[data-login-file="logo"]')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    let image = canvas.querySelector('[data-preview-logo]');
    const wrap = canvas.querySelector('.login-pro-logo-wrap');
    if (!image) {
      wrap.textContent = '';
      wrap.classList.remove('login-pro-logo-wrap--empty');
      image = document.createElement('img');
      image.dataset.previewLogo = '';
      image.alt = 'Firma logosu';
      wrap.appendChild(image);
    }
    image.src = url;
    scheduleModalRefresh();
  });

  form.querySelector('[data-login-file="login_media"]')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert('Video en fazla 50 MB olabilir.');
      event.target.value = '';
      return;
    }
    if (pendingObjectUrl) URL.revokeObjectURL(pendingObjectUrl);
    pendingObjectUrl = URL.createObjectURL(file);
    grid.querySelector('[data-media-card="__pending__"]')?.remove();
    const card = document.createElement('label');
    card.className = 'login-media-card login-media-card--pending';
    card.dataset.mediaCard = '__pending__';
    card.dataset.mediaKind = 'video';
    card.dataset.mediaUrl = pendingObjectUrl;
    card.innerHTML = `<input type="radio" name="media_id" value="__pending__"><span class="login-media-video-placeholder" aria-hidden="true">▶</span><b>${file.name.replace(/[<>]/g, '')}</b><small>Kaydedilecek yeni animasyon</small><span class="login-media-pending-badge">YENİ</span>`;
    grid.appendChild(card);
    selectCard(card);
  });

  grid.addEventListener('click', async event => {
    const button = event.target.closest('[data-delete-media]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const id = button.dataset.deleteMedia;
    const name = button.dataset.deleteName || 'Bu animasyon';
    if (!confirm(`${name} sunucudan kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?`)) return;
    button.disabled = true;
    try {
      const response = await fetch(`/settings/login/media/${encodeURIComponent(id)}/delete`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-CSRF-Token': window.LOGIN_STUDIO_CSRF || '' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error('Silme işlemi tamamlanamadı.');
      const card = button.closest('.login-media-card');
      const wasSelected = card.classList.contains('is-selected');
      card.remove();
      if (wasSelected) selectCard(grid.querySelector('[data-media-card="none"]'));
    } catch (error) {
      alert(error.message || 'Animasyon silinemedi.');
      button.disabled = false;
    }
  });

  function cleanModalClone(clone) {
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    clone.querySelectorAll('[data-draggable]').forEach(node => {
      node.removeAttribute('data-draggable');
      node.removeAttribute('tabindex');
      node.querySelector('.login-pro-drag-handle')?.remove();
    });
    clone.querySelectorAll('input,button').forEach(node => { node.disabled = true; });
    return clone;
  }

  function refreshModalClone() {
    if (!modal || modal.hidden || !modalStage) return;
    const oldVideo = modalStage.querySelector('video');
    if (oldVideo) oldVideo.pause();
    modalStage.replaceChildren(cleanModalClone(canvas.cloneNode(true)));
    const clone = modalStage.querySelector('[data-login-canvas]');
    const mobile = modalStage.clientWidth <= MOBILE_BREAKPOINT;
    clone?.classList.toggle('is-mobile-layout', mobile);
    if (mobile && clone) {
      clone.style.removeProperty('transform');
      clone.style.left = '0px';
      clone.style.top = '0px';
    } else {
      fitCanvas(clone, modalStage, 'cover');
    }
    const video = clone?.querySelector('[data-preview-media-video]:not([hidden])');
    if (video) video.play().catch(() => {});
  }

  function scheduleModalRefresh() {
    if (!modal || modal.hidden) return;
    cancelAnimationFrame(modalFrame);
    modalFrame = requestAnimationFrame(refreshModalClone);
  }

  function openLivePreview() {
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('login-live-preview-open');
    refreshModalClone();
  }

  function closeLivePreview() {
    if (!modal) return;
    modalStage?.querySelector('video')?.pause();
    modal.hidden = true;
    modalStage?.replaceChildren();
    document.body.classList.remove('login-live-preview-open');
  }

  document.querySelectorAll('[data-open-live-preview]').forEach(button => button.addEventListener('click', openLivePreview));
  modal?.querySelector('[data-close-live-preview]')?.addEventListener('click', closeLivePreview);
  modal?.addEventListener('click', event => { if (event.target === modal) closeLivePreview(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal && !modal.hidden) closeLivePreview(); });

  function syncPayload() {
    const fields = [
      'overlay_opacity','left_title_text','left_title_x','left_title_y','left_title_size','left_title_color','left_title_font',
      'left_text_text','left_text_x','left_text_y','left_text_size','left_text_color','left_text_font',
      'eyebrow_text','eyebrow_size','eyebrow_color','eyebrow_font','title_text','title_size','title_color','title_font',
      'subtitle_text','subtitle_size','subtitle_color','subtitle_font','button_text','button_size','button_color','button_font','button_bg','button_radius',
      'card_style','card_width','card_radius','card_bg','card_border','logo_height',
      'login_label_text','login_placeholder_text','password_label_text','password_placeholder_text','password_toggle_text','password_hide_text','remember_text','note_text',
      'field_label_size','field_label_color','field_label_font','input_text_size','input_text_color','input_text_font','input_bg','input_border','input_radius',
      'remember_size','remember_color','remember_font','note_size','note_color','note_font'
    ];
    const payload = {};
    for (const name of fields) {
      const input = form.elements.namedItem(name);
      if (input) payload[name] = input.value;
    }
    const selected = selectedMediaInput?.value || grid.querySelector('input[name="media_id"]:checked')?.value || 'none';
    payload.media_id = selected;
    payload.selected_media_id = selected;
    if (payloadInput) payloadInput.value = JSON.stringify(payload);
    return selected;
  }

  form.addEventListener('submit', event => {
    clampAllPositions();
    const selected = syncPayload();
    if (selected === '__pending__' && !form.querySelector('[data-login-file="login_media"]')?.files?.length) {
      event.preventDefault();
      alert('Yeni animasyon dosyası seçili değil. Lütfen videoyu yeniden seçin.');
      return;
    }
    form.querySelectorAll('button[type="submit"]').forEach(button => {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Kaydediliyor…';
    });
  });

  const previewObserver = new IntersectionObserver(entries => {
    previewVisible = Boolean(entries[0]?.isIntersecting);
    updatePreviewPlayback();
  }, { threshold: 0.05 });
  previewObserver.observe(viewport);
  document.addEventListener('visibilitychange', updatePreviewPlayback);
  new ResizeObserver(fitPreview).observe(viewport);
  window.addEventListener('resize', () => {
    fitPreview();
    if (modal && !modal.hidden) refreshModalClone();
  }, { passive: true });

  const initialModel = form.querySelector('input[name="card_style"]:checked')?.value || 'classic';
  applyModel(initialModel, false);
  const initialCard = grid.querySelector(`[data-media-card="${CSS.escape(selectedMediaInput?.value || 'none')}"]`) || grid.querySelector('[data-media-card="none"]');
  if (initialCard) selectCard(initialCard);
  fitPreview();
})();

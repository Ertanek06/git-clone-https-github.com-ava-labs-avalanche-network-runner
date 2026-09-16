(() => {
  const stage = document.querySelector('[data-login-stage]');
  const canvas = document.querySelector('[data-login-canvas]');
  if (!stage || !canvas) return;

  const DESIGN_WIDTH = 1600;
  const DESIGN_HEIGHT = 900;
  const LEFT_WIDTH = 850;
  const MOBILE_BREAKPOINT = 1100;
  let fitFrame = 0;

  function useMobileLayout(width) {
    return width <= MOBILE_BREAKPOINT;
  }

  function clampVisibleText(scale, left, top, width, height) {
    const bounds = {
      xMin: Math.max(0, -left / scale),
      xMax: Math.min(LEFT_WIDTH, (width - left) / scale),
      yMin: Math.max(0, -top / scale),
      yMax: Math.min(DESIGN_HEIGHT, (height - top) / scale)
    };
    for (const [role, key] of [['left_title','left-title'],['left_text','left-text']]) {
      const target = canvas.querySelector(`[data-preview-role="${role}"]`);
      if (!target || target.classList.contains('is-empty')) continue;
      const widthPx = Math.min(LEFT_WIDTH, Math.max(1, target.offsetWidth));
      const heightPx = Math.min(DESIGN_HEIGHT, Math.max(1, target.offsetHeight));
      const currentX = parseFloat(getComputedStyle(canvas).getPropertyValue(`--${key}-x`)) || 0;
      const currentY = parseFloat(getComputedStyle(canvas).getPropertyValue(`--${key}-y`)) || 0;
      const minX = bounds.xMin / LEFT_WIDTH * 100;
      const maxX = Math.max(minX, (bounds.xMax - widthPx) / LEFT_WIDTH * 100);
      const minY = (bounds.yMin + heightPx / 2) / DESIGN_HEIGHT * 100;
      const maxY = Math.max(minY, (bounds.yMax - heightPx / 2) / DESIGN_HEIGHT * 100);
      canvas.style.setProperty(`--${key}-x`, `${Math.min(maxX, Math.max(minX, currentX))}%`);
      canvas.style.setProperty(`--${key}-y`, `${Math.min(maxY, Math.max(minY, currentY))}%`);
    }
  }

  const fit = () => {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      const width = stage.clientWidth || window.innerWidth;
      const height = stage.clientHeight || window.innerHeight;
      if (useMobileLayout(width)) {
        canvas.classList.add('is-mobile-layout');
        canvas.style.removeProperty('transform');
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        return;
      }
      canvas.classList.remove('is-mobile-layout');
      const scale = Math.max(0.2, Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT));
      const renderedWidth = DESIGN_WIDTH * scale;
      const renderedHeight = DESIGN_HEIGHT * scale;
      const left = (width - renderedWidth) / 2;
      const top = (height - renderedHeight) / 2;
      canvas.style.transform = `scale(${scale})`;
      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
      requestAnimationFrame(() => clampVisibleText(scale, left, top, width, height));
    });
  };

  window.addEventListener('resize', fit, { passive: true });
  fit();

  const toggle = document.querySelector('[data-password-toggle]');
  const password = document.getElementById('password');
  if (toggle && password) {
    toggle.addEventListener('click', () => {
      const visible = password.type === 'text';
      password.type = visible ? 'password' : 'text';
      toggle.textContent = visible ? (toggle.dataset.showText || 'Göster') : (toggle.dataset.hideText || 'Gizle');
    });
  }

  // Yalnızca kullanıcı adını hatırlar; parola hiçbir zaman tarayıcı deposuna yazılmaz.
  const loginForm=canvas.querySelector('form[action="/login"]');
  const loginInput=loginForm?.querySelector('[data-remember-login]');
  const rememberChoice=loginForm?.querySelector('[data-remember-choice]');
  const rememberKey='crm-login-remembered-username-v1';
  if(loginForm&&loginInput&&rememberChoice){
    try{
      const saved=String(localStorage.getItem(rememberKey)||'').trim();
      if(saved&&!String(loginInput.value||'').trim())loginInput.value=saved;
      if(saved)rememberChoice.checked=true;
    }catch{}
    rememberChoice.addEventListener('change',()=>{if(!rememberChoice.checked){try{localStorage.removeItem(rememberKey)}catch{}}});
    loginForm.addEventListener('submit',()=>{try{const username=String(loginInput.value||'').trim();if(rememberChoice.checked&&username)localStorage.setItem(rememberKey,username);else localStorage.removeItem(rememberKey)}catch{}});
  }

  const video = canvas.querySelector('[data-preview-media-video]:not([hidden])');
  if (!video) return;

  const source = video.dataset.src || video.getAttribute('src') || '';
  let sourceAttached = Boolean(video.getAttribute('src'));
  const markReady = () => video.classList.add('is-ready');
  const attachSource = () => {
    if (sourceAttached || !source) return;
    sourceAttached = true;
    video.src = source;
    video.load();
    if (document.visibilityState === 'visible') video.play().catch(() => {});
  };
  const resume = () => {
    if (!sourceAttached) attachSource();
    if (document.visibilityState === 'visible') video.play().catch(() => {});
  };
  const pause = () => { if (!video.paused) video.pause(); };

  video.addEventListener('loadeddata', markReady, { once: true });
  video.addEventListener('canplay', markReady, { once: true });
  video.addEventListener('error', () => {
    video.classList.remove('is-ready');
    video.hidden = true;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resume(); else pause();
  });
  window.addEventListener('pagehide', pause, { passive: true });
  window.addEventListener('pageshow', resume, { passive: true });

  const start = () => attachSource();
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 700 });
  else setTimeout(start, 120);
})();

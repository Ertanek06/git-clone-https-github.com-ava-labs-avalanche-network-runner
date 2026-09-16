(() => {
  const selector = 'form[data-auth-session-form]';
  let refreshPromise = null;

  function applyToken(token) {
    if (!token) return;
    document.querySelectorAll(`${selector} input[name="_csrf"]`).forEach(input => { input.value = token; });
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) meta.content = token;
  }

  async function refreshToken() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = fetch('/auth/csrf-token', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    }).then(async response => {
      if (!response.ok) throw new Error('csrf_refresh_failed');
      const data = await response.json();
      applyToken(data.csrfToken);
      return data.csrfToken;
    }).finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  window.addEventListener('pageshow', () => { refreshToken().catch(() => {}); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshToken().catch(() => {});
  });

  document.addEventListener('submit', async event => {
    const form = event.target.closest?.(selector);
    if (!form || form.dataset.csrfReady === '1') return;
    event.preventDefault();
    const submitter = event.submitter || null;
    try { await refreshToken(); } catch {}
    form.dataset.csrfReady = '1';
    try {
      if (typeof form.requestSubmit === 'function') {
        if (submitter) form.requestSubmit(submitter); else form.requestSubmit();
      } else form.submit();
    } finally {
      setTimeout(() => { delete form.dataset.csrfReady; }, 0);
    }
  }, true);
})();

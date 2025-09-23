/* Blossom & Blade — trial timer + RED chip + paywall redirect */
(() => {
  const BB = window.BB || {};
  const qs = new URLSearchParams(location.search);
  const man = (qs.get('man') || '').toLowerCase();
  const chip = document.getElementById('slowBadge');
  const chipText = document.getElementById('trialText');

  // No timer for paid or admin
  if (BB.isPaid?.() || BB.isAdmin?.()) {
    if (chip) chip.hidden = true;
    return;
  }

  // Global trial start (shared across guys); create if missing
  const KEY = 'bnb.trialStart';
  let start = parseInt(localStorage.getItem(KEY) || '', 10);
  if (!Number.isFinite(start)) {
    start = Date.now();
    localStorage.setItem(KEY, String(start));
  }

  const DURATION = BB.TRIAL_MS || (6 * 60 * 1000); // hard fallback 6 min

  function format(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  function tick() {
    const now = Date.now();
    const elapsed = now - start;
    const left = Math.max(0, DURATION - elapsed);

    if (chip) {
      chip.hidden = false;
      if (chipText) chipText.textContent = `Trial: ${format(left)}`;
    }

    if (left <= 0) {
      // Small grace to avoid loop
      localStorage.setItem(KEY, String(Date.now() - DURATION));
      // Redirect to day checkout, preserve selected man for continuity
      const dest = `${BB.DAY_CHECKOUT || '/checkout-day.html'}?man=${encodeURIComponent(man)}`;
      location.href = dest;
      return;
    }
  }

  tick();
  setInterval(tick, 1000);
})();

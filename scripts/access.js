<script>
// scripts/access.js
(function () {
  const KEY = 'bb_access';
  const EXP = 'bb_access_exp';
  const TRIAL = 'bb_trial_end';
  const OVERLAY = 'bb-paywall';

  const ms = {
    min: 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };
  const now = () => Date.now();

  function hasPass() {
    const exp = +localStorage.getItem(EXP) || 0;
    const trial = +localStorage.getItem(TRIAL) || 0;
    return (exp && now() < exp) || (trial && now() < trial);
  }
  function grantDays(days) {
    localStorage.setItem(KEY, 'ok');
    localStorage.setItem(EXP, String(now() + days * ms.day));
    localStorage.removeItem(TRIAL);
  }
  function startTrial(minutes) {
    localStorage.setItem(TRIAL, String(now() + minutes * ms.min));
  }
  function clearAll() {
    [KEY, EXP, TRIAL].forEach(k => localStorage.removeItem(k));
  }

  function injectStyles() {
    if (document.getElementById('bb-paywall-css')) return;
    const s = document.createElement('style');
    s.id = 'bb-paywall-css';
    s.textContent = `
#${OVERLAY}{position:fixed;inset:0;display:none;align-items:center;justify-content:center;
  background:rgba(0,0,0,.75);backdrop-filter:blur(8px);z-index:9999;padding:24px}
#${OVERLAY} .inner{max-width:560px;width:100%;background:#0b0b11;border:1px solid #2b2b3a;
  border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.45);padding:28px;color:#fff;text-align:center}
#${OVERLAY} h2{margin:0 0 12px;font-size:28px}
#${OVERLAY} p.sub{opacity:.8;margin:0 0 18px}
#${OVERLAY} .actions{display:grid;gap:12px;margin:18px 0}
#${OVERLAY} button{border:0;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer}
#bb-trial{background:#241a3a}
#bb-day{background:#7b2cff}
#bb-month{background:#ff3d81}
#${OVERLAY} .note{opacity:.7;font-size:12px}
    `;
    document.head.appendChild(s);
  }

  function buildOverlay() {
    if (document.getElementById(OVERLAY)) return;
    const div = document.createElement('div');
    div.id = OVERLAY;
    div.innerHTML = `
      <div class="inner">
        <h2>Unlock the after-hours chat</h2>
        <p class="sub">PG-13 is free. Explicit talk needs a pass.</p>
        <div class="actions">
          <button id="bb-trial">Start 3-minute trial</button>
          <button id="bb-day">Day pass</button>
          <button id="bb-month">Monthly</button>
        </div>
        <p class="note">Already paid? If this doesn’t close, refresh the page.</p>
      </div>
    `;
    document.body.appendChild(div);
    document.getElementById('bb-trial').onclick = () => { startTrial(3); hide(); };
    document.getElementById('bb-day').onclick   = () => location.href = 'success-day.html';
    document.getElementById('bb-month').onclick = () => location.href = 'success-month.html';
  }

  function show(){ injectStyles(); buildOverlay(); document.getElementById(OVERLAY).style.display='flex'; }
  function hide(){ const el=document.getElementById(OVERLAY); if(el) el.style.display='none'; }

  function gate() {
    // If access is missing or expired, show the wall.
    if (!hasPass()) show();
    hide(); // hides if they already have access

    // Re-check every few seconds so trial expiration pops the wall back up.
    if (!window.__bb_access_poll) {
      window.__bb_access_poll = setInterval(() => { if (!hasPass()) show(); }, 4000);
    }
  }

  // Expose tiny API for success pages
  window.BBAccess = { gate, grantDays, clearAll };
})();
</script>

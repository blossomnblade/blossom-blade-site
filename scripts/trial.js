/* Blossom & Blade — unified 6-minute trial timer (across all men) */
(() => {
  const LIMIT_MS = 6 * 60 * 1000; // 6 minutes
  const USED_KEY = "bnb.trial.usedMs";
  const LOCK_KEY = "bnb.trial.locked";
  const START_KEY = "bnb.trial.sessionStart"; // for page session
  const LAST_VIS_KEY = "bnb.trial.lastVis";   // last visibility timestamp

  const isLocked = () => localStorage.getItem(LOCK_KEY) === "1";
  const getUsed = () => Number(localStorage.getItem(USED_KEY) || "0");
  const setUsed = (ms) => { try { localStorage.setItem(USED_KEY, String(ms)); } catch {} };
  const lock = () => { try { localStorage.setItem(LOCK_KEY, "1"); } catch {} };
  const now = () => Date.now();

  // Format mm:ss
  function fmt(ms){
    const r = Math.max(0, LIMIT_MS - ms);
    const m = Math.floor(r / 60000);
    const s = Math.floor((r % 60000) / 1000);
    return `${String(m)}:${String(s).padStart(2,"0")}`;
  }

  // UI helpers (optional elements; only update if present)
  const trialBadge = document.getElementById("trialBadge");
  function paint(){
    if (!trialBadge) return;
    const used = getUsed();
    trialBadge.textContent = (used >= LIMIT_MS) ? "Trial: 0:00" : `Trial: ${fmt(used)}`;
  }

  function gate(){
    if (isLocked() || getUsed() >= LIMIT_MS){
      lock();
      // If we’re already on pay.html, don’t loop
      if (!/\/pay\.html\b/i.test(location.pathname)) {
        location.href = "/pay.html?reason=trial_over";
      }
    }
  }

  // If locked when page loads → gate immediately
  gate();
  paint();

  // Session start time for this page view
  let sessionStart = Number(localStorage.getItem(START_KEY) || "0");
  if (!sessionStart) {
    sessionStart = now();
    try { localStorage.setItem(START_KEY, String(sessionStart)); } catch {}
  }

  // Visibility-aware ticker: only count time while tab is visible
  let tickHandle = null;

  function startTicker(){
    if (tickHandle) return;
    tickHandle = setInterval(() => {
      if (document.hidden) return;
      const lastVis = Number(localStorage.getItem(LAST_VIS_KEY) || String(sessionStart));
      const delta = Math.max(0, now() - lastVis);
      const used = Math.min(LIMIT_MS, getUsed() + delta);
      setUsed(used);
      try { localStorage.setItem(LAST_VIS_KEY, String(now())); } catch {}
      paint();
      if (used >= LIMIT_MS) {
        clearInterval(tickHandle);
        tickHandle = null;
        gate();
      }
    }, 1000);
  }

  function stopTicker(){
    if (!tickHandle) return;
    clearInterval(tickHandle);
    tickHandle = null;
  }

  // On show/hide, update last visible timestamp
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      try { localStorage.setItem(LAST_VIS_KEY, String(now())); } catch {}
      startTicker();
    } else {
      stopTicker();
    }
  });

  // Prime visibility stamp, then start
  try { localStorage.setItem(LAST_VIS_KEY, String(now())); } catch {}
  startTicker();

  // Expose tiny API if needed elsewhere
  window.bnbTrial = {
    getUsed, isLocked, fmtRemaining: () => fmt(getUsed()),
    limitMs: LIMIT_MS
  };
})();

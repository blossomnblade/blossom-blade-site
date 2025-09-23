// Blossom & Blade — 6-minute trial timer + small UI chip + end modal.
// Pure front-end. No backend or env changes required.
(() => {
  const cfg = (window.BnB && window.BnB.CONFIG) ? window.BnB.CONFIG : {
    TRIAL_MINUTES: 6,
    TRIAL_LOCALSTORAGE_KEY: "bnb.trial.start",
    PAID_FLAG_KEY: "bnb.paid",
    PAYWALL_URL: "/pay.html",
    SAFEWORD: "RED",
    SAFEWORD_HINT: "Say RED to stop."
  };

  // Inject minimal styles so we don't touch /styles/chat.css
  const style = document.createElement("style");
  style.id = "bnb-trial-styles";
  style.textContent = `
  #bnbTrialChip{position:fixed;top:64px;right:16px;z-index:50;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:6px 10px;border-radius:9999px;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;gap:.5rem;align-items:center}
  #bnbTrialChip b{font-weight:600}
  #bnbTrialChip .dot{width:6px;height:6px;border-radius:9999px;background:#f59e0b}
  #bnbTrialChip .red{background:#ef4444;margin-left:.25rem}
  #bnbTrialModal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:60}
  #bnbTrialModal .card{background:#0b1220;color:#e5e7eb;border:1px solid #334155;border-radius:14px;max-width:520px;width:92%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
  #bnbTrialModal h3{margin:0 0 8px 0;font-size:18px}
  #bnbTrialModal p{margin:6px 0 14px 0;font-size:14px;line-height:1.5}
  #bnbTrialModal .row{display:flex;gap:10px;flex-wrap:wrap}
  #bnbTrialModal a{flex:1 1 160px;text-align:center;text-decoration:none;padding:10px 14px;border-radius:9999px;border:1px solid #475569;background:#ec4899;color:#fff;font-weight:600}
  #bnbTrialModal a.secondary{background:transparent;color:#e5e7eb;border-color:#475569}
  `;
  document.head.appendChild(style);

  // Utility
  const now = () => Date.now();
  const ms = cfg.TRIAL_MINUTES * 60 * 1000;

  function getStart() {
    const v = localStorage.getItem(cfg.TRIAL_LOCALSTORAGE_KEY);
    return v ? Number(v) : null;
  }
  function setStart(ts) {
    localStorage.setItem(cfg.TRIAL_LOCALSTORAGE_KEY, String(ts));
  }
  function remainingMs() {
    const start = getStart();
    if (!start) return ms;
    const left = ms - (now() - start);
    return left < 0 ? 0 : left;
  }
  function fmt(t) {
    const s = Math.ceil(t / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r < 10 ? "0" + r : r}`;
  }

  function createChip() {
    const chip = document.createElement("div");
    chip.id = "bnbTrialChip";
    chip.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <span><b>Trial:</b> <span id="bnbTrialTime">--:--</span></span>
      <span style="opacity:.7;display:flex;align-items:center;">
        <span>${cfg.SAFEWORD} </span>
        <span class="dot red" aria-hidden="true" title="${cfg.SAFEWORD_HINT}"></span>
      </span>
    `;
    document.body.appendChild(chip);
    return chip;
  }

  function endModal() {
    const wrap = document.createElement("div");
    wrap.id = "bnbTrialModal";
    wrap.innerHTML = `
      <div class="card" role="dialog" aria-modal="true" aria-labelledby="bnbTrialTitle">
        <h3 id="bnbTrialTitle">Time’s up—unlock him?</h3>
        <p>Enjoyed the preview. Grab a pass and keep going. We’ll save your chat.</p>
        <div class="row">
          <a id="bnbPassDay" href="${cfg.PAYWALL_URL}?plan=day">Day Pass — $7.99</a>
          <a id="bnbPassMonth" class="secondary" href="${cfg.PAYWALL_URL}?plan=month">All 6 — $14.99 / mo</a>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    // If she paid already somewhere else, do nothing.
    const paid = localStorage.getItem(cfg.PAID_FLAG_KEY) === "true";
    if (!paid) {
      // Hard redirect after 8s in case she doesn’t click.
      setTimeout(() => {
        if (document.getElementById("bnbTrialModal")) {
          location.href = cfg.PAYWALL_URL;
        }
      }, 8000);
    } else {
      // If paid, remove modal instantly
      wrap.remove();
    }
  }

  function boot() {
    // Skip trial if she’s paid
    const paid = localStorage.getItem(cfg.PAID_FLAG_KEY) === "true";
    if (paid) return;

    // Start (only once per device)
    if (!getStart()) setStart(now());

    const chip = createChip();
    const timeEl = chip.querySelector("#bnbTrialTime");

    // Tick
    const tick = () => {
      const left = remainingMs();
      timeEl.textContent = fmt(left);
      if (left <= 0) {
        clearInterval(timer);
        endModal();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();

    // Expose for debugging
    window.BnB = window.BnB || {};
    window.BnB.trial = {
      reset: () => setStart(now()), // manual restart if needed
      left: () => remainingMs(),
    };
  }

  // Run only on chat pages
  const onReady = () => {
    // crude check: only run when there's likely a chat input present
    if (document.querySelector('input[type="text"], textarea')) {
      boot();
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();

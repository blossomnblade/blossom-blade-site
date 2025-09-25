/* access.js — PRELAUNCH MODE
   - Disables trial/timer for all characters
   - Suppresses any redirect to pay.html
   - Hides trial badges/banners
   - Keeps everything in "paid" state while testing
*/

(() => {
  // mark that prelaunch override loaded
  window.__PRELAUNCH_OK = true;

  // characters
  const MEN = ["blade", "dylan", "alexander", "silas", "grayson", "viper"];

  // Treat consent as granted during tests
  try { localStorage.setItem("bnb.consent", "1"); } catch {}

  // Force slow/trial OFF for all men now and going forward
  function forcePaid() {
    for (const m of MEN) {
      try {
        localStorage.removeItem(`bnb.${m}.trialStart`);
        localStorage.setItem(`bnb.${m}.slow`, JSON.stringify("off"));
      } catch {}
    }
  }
  forcePaid();

  // Keep it enforced in case other code flips it back
  setInterval(forcePaid, 2000);

  // Provide safe trial helpers for any callers
  window.bnbTrial = {
    isOn: () => false,
    secondsLeft: () => Infinity,
    stop: () => {}
  };

  // Suppress redirects to pay.html during prelaunch
  const blockPay = (url) => String(url || "").includes("/pay.html");
  const _assign = location.assign.bind(location);
  const _replace = location.replace.bind(location);
  location.assign = (u) => (blockPay(u) ? console.log("[DEV] Paywall suppressed:", u) : _assign(u));
  location.replace = (u) => (blockPay(u) ? console.log("[DEV] Paywall suppressed:", u) : _replace(u));

  // Hide any trial UI elements that might still render
  const hideTrialUI = () => {
    const sel = [
      "#trialBanner",
      ".trial-chip",
      "#slowBadge",
      ".badge.slow",
      '[data-trial="true"]'
    ];
    sel.forEach(s => {
      document.querySelectorAll(s).forEach(el => el.hidden = true);
    });
  };

  // Run at DOM ready and also shortly after (in case of lazy renders)
  const ready = () => { hideTrialUI(); setTimeout(hideTrialUI, 300); setTimeout(hideTrialUI, 1000); };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();

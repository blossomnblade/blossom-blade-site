/* access.js — PRELAUNCH: disable trial & paywall */

(() => {
  // Namespace
  window.bnb = window.bnb || {};

  // Consent: treat as granted during tests
  try { localStorage.setItem("bnb.consent", "1"); } catch {}

  // Force trial OFF for all characters
  const MEN = ["blade", "dylan", "alexander", "silas", "grayson", "viper"];
  for (const m of MEN) {
    try {
      localStorage.removeItem(`bnb.${m}.trialStart`);
      localStorage.setItem(`bnb.${m}.slow`, JSON.stringify("off"));
    } catch {}
  }

  // Some pages might call a trial helper—give them safe no-ops
  window.bnbTrial = {
    isOn: () => false,
    secondsLeft: () => Infinity,
    stop: () => {},
  };

  // Belt & suspenders: suppress any redirect to pay.html during dev
  const realAssign = location.assign.bind(location);
  location.assign = (url) => {
    if (String(url).includes("/pay.html")) {
      console.log("[DEV] Paywall suppressed:", url);
      return;
    }
    realAssign(url);
  };
})();

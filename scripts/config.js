// Blossom & Blade — public (non-secret) UI config.
// Safe to version. Secrets (API keys) stay in Vercel only.
(() => {
  window.BnB = window.BnB || {};
  window.BnB.CONFIG = {
    // Free trial settings
    TRIAL_MINUTES: 6,                         // length of the try-out
    TRIAL_LOCALSTORAGE_KEY: "bnb.trial.start",
    PAID_FLAG_KEY: "bnb.paid",                // set to "true" by checkout pages when she pays

    // Where to send after trial ends
    PAYWALL_URL: "/pay.html",                 // existing pay page in your repo

    // Safeword chip copy (already aligned with your preference)
    SAFEWORD: "RED",
    SAFEWORD_HINT: "Say RED to stop."
  };
})();

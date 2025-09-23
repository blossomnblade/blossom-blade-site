/* Blossom & Blade — global config (trial length, checkout URLs, simple admin toggles) */
(() => {
  const BB = (window.BB ||= {});

  // Trial length (default 6 minutes). You can override by setting localStorage 'bnb.trialMs'
  // e.g. for testing: localStorage.setItem('bnb.trialMs', 15000)
  const lsTrial = parseInt(localStorage.getItem('bnb.trialMs') || '', 10);
  BB.TRIAL_MS = Number.isFinite(lsTrial) && lsTrial > 0 ? lsTrial : (6 * 60 * 1000);

  // Simple “paid” flag and admin switch (for you during testing)
  BB.isPaid = () => localStorage.getItem('bnb.paid') === 'true';
  BB.setPaid = (v) => localStorage.setItem('bnb.paid', v ? 'true' : 'false');
  BB.isAdmin = () => !!localStorage.getItem('bnb.admin');  // set to any value to enable

  // Where to send users when trial ends
  BB.DAY_CHECKOUT = '/checkout-day.html';
  BB.MONTH_CHECKOUT = '/checkout-month.html';
})();

/* Blossom & Blade — one-time adult consent latch
   - Small green button in header.
   - On click: confirm 18+ consent; set localStorage('bnb.consent') = '1'.
   - Hides itself forever (per browser/device).
   - Dispatches 'bnb:consent' event so other scripts can react.
*/
(function(){
  const KEY = "bnb.consent";
  const btn = document.getElementById("consentBtn");

  function hasConsent(){ try{ return localStorage.getItem(KEY) === "1"; } catch { return false; } }
  function setConsent(){
    try{ localStorage.setItem(KEY, "1"); }catch{}
    window.dispatchEvent(new CustomEvent("bnb:consent", { detail:{ value:true }}));
  }

  // Initialize button
  if (!btn) return;

  if (hasConsent()){
    btn.hidden = true;
    btn.setAttribute("aria-pressed", "true");
  } else {
    btn.hidden = false;
    btn.addEventListener("click", () => {
      const ok = window.confirm("I confirm I am 18+ and consent to adult content. This enables R/X mode.");
      if (!ok) return;
      setConsent();
      btn.hidden = true;
      btn.setAttribute("aria-pressed", "true");
    });
  }

  // Expose a helper for other scripts if needed
  window.BnBConsent = { has: hasConsent };
})();

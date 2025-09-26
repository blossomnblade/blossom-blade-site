/* Blossom & Blade — trial.js (bb5)
   Global no-op trial gate so NOTHING redirects or blocks while we wire payments.
   Other scripts can safely call these.
*/
(function(){
  const api = {
    enabled: false,
    minutes: 10,
    start(){ /* no-op */ },
    msLeft(){ return Infinity; },
    expired(){ return false; },
    blockIfExpired(){ return false; },  // always allow
    clear(){ try{ localStorage.removeItem('bb_trial_started_at'); }catch{} }
  };
  api.clear();
  window.bbTrial = api;
})();

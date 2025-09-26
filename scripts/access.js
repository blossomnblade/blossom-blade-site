/* Blossom & Blade — access.js (bb5)
   Central access check — ALWAYS allow until billing is live.
   If old code tries to route to /pay.html, we short-circuit it here.
*/
(function(){
  const Access = {
    allow(){ return true; },
    gotoPay(/*opts*/){ /* disabled on purpose */ console.debug('[access] payments disabled'); },
    reason: null
  };
  window.bbAccess = Access;
})();

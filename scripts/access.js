/* Blossom & Blade — access.js
   - Simple client-side flags for MVP
   - Admin bypass via ?admin=cherrypie-2025
   - "Paid" flag via /unlock.html or query
*/

(function(){
  const ADMIN_QS_KEY = 'admin';
  const ADMIN_TOKEN  = 'cherrypie-2025'; // matches your brief
  const LS = {
    admin: 'bb_admin',     // "1" when admin
    paid:  'bb_paid'       // "1" when user has access
  };

  // Read/write helpers
  function setLS(k,v){ try{ localStorage.setItem(k,String(v)); }catch(e){} }
  function getLS(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

  // Enable admin from query (?admin=cherrypie-2025)
  (function maybeEnableAdminFromQuery(){
    const qs = new URLSearchParams(location.search);
    const tok = qs.get(ADMIN_QS_KEY);
    if (tok && tok === ADMIN_TOKEN){
      setLS(LS.admin, '1');
      console.log('[B&B] Admin mode enabled');
      // Clean URL so the token isn’t left in history
      try {
        qs.delete(ADMIN_QS_KEY);
        const clean = location.pathname + (qs.toString() ? ('?' + qs.toString()) : '');
        history.replaceState({}, '', clean);
      } catch(_) {}
    }
  })();

  // Debug helper: ?paid=1 sets paid flag (useful during demos)
  (function maybeSetPaidFromQuery(){
    const qs = new URLSearchParams(location.search);
    const paid = qs.get('paid');
    if (paid === '1'){ setLS(LS.paid, '1'); }
  })();

  // Gate check: returns true if user may enter content
  function isAdmin(){ return getLS(LS.admin) === '1'; }
  function isPaid(){  return getLS(LS.paid)  === '1'; }

  function gateCheck(){
    if (isAdmin() || isPaid()){
      document.documentElement.classList.add('bb-unlocked');
      return true;
    }
    // Not allowed: kick to pay page
    if (!/pay\.html$/i.test(location.pathname) && !/age\.html$/i.test(location.pathname)){
      location.href = '/pay.html';
    }
    return false;
  }

  // Expose tiny API
  window.BB_ACCESS = { gateCheck, isAdmin, isPaid, setPaid: () => setLS(LS.paid, '1') };

  // Auto-run on pages that declare data-gated
  if (document.documentElement.hasAttribute('data-gated')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', gateCheck);
    } else {
      gateCheck();
    }
  }
})();

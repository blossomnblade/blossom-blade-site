/* Blossom & Blade — access.js (MVP gating)
   - Admin bypass via ?admin=cherrypie-2025 (persists in localStorage)
   - Paid access:
       * Single guy:   type=single, man=<name>, recurring=false
       * All rooms:    type=all,   recurring=true|false
   - Helpers:
       BB_ACCESS.setPaidSingle(man, {recurring:false})
       BB_ACCESS.setPaidAll({recurring:true})
       BB_ACCESS.clearPaid()
       BB_ACCESS.gateCheckFor(man)  // unlocks if admin or paid for that man
*/

(function(){
  const ADMIN_QS_KEY = 'admin';
  const ADMIN_TOKEN  = 'cherrypie-2025'; // matches your brief

  const LS_KEYS = {
    admin: 'bb_admin',    // "1"
    paid:  'bb_paid_v2'   // JSON: {type:'single'|'all', man?:'jesse'|..., recurring?:bool, ts:number}
  };

  // LocalStorage safe helpers
  function setLS(k,v){ try{ localStorage.setItem(k, typeof v==='string'? v : JSON.stringify(v)); }catch(_){} }
  function getLS(k){
    try{
      const raw = localStorage.getItem(k);
      if(!raw) return null;
      try { return JSON.parse(raw); } catch { return raw; }
    }catch(_){ return null; }
  }
  function delLS(k){ try{ localStorage.removeItem(k); }catch(_){} }

  // Enable admin from query (?admin=cherrypie-2025) and then clean URL
  (function maybeEnableAdminFromQuery(){
    const qs = new URLSearchParams(location.search);
    const tok = qs.get(ADMIN_QS_KEY);
    if (tok && tok === ADMIN_TOKEN){
      setLS(LS_KEYS.admin, '1');
      console.log('[B&B] Admin mode enabled');
      try {
        qs.delete(ADMIN_QS_KEY);
        const clean = location.pathname + (qs.toString() ? ('?' + qs.toString()) : '');
        history.replaceState({}, '', clean);
      } catch(_) {}
    }
  })();

  // Debug: ?paid=all or ?paid=single:grayson
  (function maybeDebugPaid(){
    const qs = new URLSearchParams(location.search);
    const paid = qs.get('paid'); // "all" or "single:man"
    if (paid) {
      if (paid === 'all') setPaidAll({recurring:false});
      else if (paid.startsWith('single:')) {
        const man = paid.split(':')[1] || 'grayson';
        setPaidSingle(man, {recurring:false});
      }
    }
  })();

  function isAdmin(){ return getLS(LS_KEYS.admin) === '1'; }

  // Paid state
  function getPaid(){ return getLS(LS_KEYS.paid); }
  function setPaidSingle(man, opts={}){
    const rec = !!opts.recurring;
    setLS(LS_KEYS.paid, { type:'single', man: String(man).toLowerCase(), recurring: rec, ts: Date.now() });
  }
  function setPaidAll(opts={}){
    const rec = !!opts.recurring;
    setLS(LS_KEYS.paid, { type:'all', recurring: rec, ts: Date.now() });
  }
  function clearPaid(){ delLS(LS_KEYS.paid); }

  function isPaidFor(man){
    const p = getPaid();
    if (!p) return false;
    if (p.type === 'all') return true;
    if (p.type === 'single') return String(man).toLowerCase() === String(p.man).toLowerCase();
    return false;
  }

  // Gate check for a specific man (from chat.html ?man=...)
  function gateCheckFor(man){
    if (isAdmin() || isPaidFor(man)) {
      document.documentElement.classList.add('bb-unlocked');
      return true;
    }
    // Not allowed → send to pay page
    if (!/pay\.html$/i.test(location.pathname) && !/age\.html$/i.test(location.pathname)){
      const back = encodeURIComponent(location.pathname + location.search);
      location.href = '/pay.html?next='+back;
    }
    return false;
  }

  // Expose API
  window.BB_ACCESS = {
    isAdmin, getPaid, isPaidFor, gateCheckFor,
    setPaidSingle, setPaidAll, clearPaid
  };
})();

/* Blossom & Blade — Access & Paywall Helpers
   - 6-minute trial across site (once per browser)
   - Entitlements: day pass (per-man, 24h), monthly all-6 (30d)
   - Tiny countdown UI and auto-redirect to /pay.html when trial ends
   - Safe to call from any page. No external deps.
*/
(() => {
  const ENT_KEY = "bnb.entitlements";          // { month:{exp:number}, day:{ [man]:{exp:number} } }
  const TRIAL_KEY = "bnb.trial";               // { startedAt:number, durMs:number }
  const CONSENT_KEY = "bnb.consent";           // "1" once the green consent is hit
  const UID_KEY = "bnb.userId";                // anonymous id per device

  function now(){ return Date.now(); }
  function read(k, fallback){ try{ const r = localStorage.getItem(k); return r ? JSON.parse(r) : fallback; }catch{ return fallback; } }
  function write(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

  function getUid(){
    let id = localStorage.getItem(UID_KEY);
    if (!id){
      id = crypto?.randomUUID?.() || ("u_" + Math.random().toString(36).slice(2) + Date.now());
      try{ localStorage.setItem(UID_KEY, id); }catch{}
    }
    return id;
  }

  function getEnt(){ return read(ENT_KEY, { month:null, day:{} }); }
  function setEnt(v){ write(ENT_KEY, v); }

  function msLeft(exp){ return Math.max(0, (exp || 0) - now()); }
  function fmtMMSS(ms){
    const s = Math.max(0, Math.floor(ms/1000));
    const m = Math.floor(s/60), ss = String(s%60).padStart(2,"0");
    return `${m}:${ss}`;
  }

  function isMonthActive(){
    const ent = getEnt();
    return Boolean(ent.month && ent.month.exp > now());
  }
  function isDayActive(man){
    const ent = getEnt();
    const rec = ent.day?.[man];
    return Boolean(rec && rec.exp > now());
  }
  function isPaidFor(man){ return isMonthActive() || isDayActive(man); }

  function grantDayPass(man, hours=24){
    const ent = getEnt();
    ent.day = ent.day || {};
    ent.day[man] = { exp: now() + hours * 3600_000 };
    setEnt(ent);
    try{ localStorage.setItem(CONSENT_KEY, "1"); }catch{}
    return ent.day[man].exp;
  }
  function grantMonthAll(days=30){
    const ent = getEnt();
    ent.month = { exp: now() + days * 86_400_000 };
    setEnt(ent);
    try{ localStorage.setItem(CONSENT_KEY, "1"); }catch{}
    return ent.month.exp;
  }

  // 6-minute site-wide trial (starts on first chat load)
  function ensureTrialRecord(){
    const cur = read(TRIAL_KEY, null);
    if (cur && cur.startedAt && cur.durMs) return cur;
    const rec = { startedAt: now(), durMs: 6 * 60 * 1000 };
    write(TRIAL_KEY, rec);
    return rec;
  }

  // Attach countdown to a DOM element and redirect when it ends
  function ensureTrialOrPaid(opts={}){
    const { man="", timerSel="#trialTimer", redirect=true } = opts;
    const el = timerSel ? document.querySelector(timerSel) : null;

    // Paid? Hide timer if present.
    if (isPaidFor(man)) { if (el) el.hidden = true; return { paid:true }; }

    const rec = ensureTrialRecord();
    const update = () => {
      const left = (rec.startedAt + rec.durMs) - now();
      const ms = Math.max(0, left);
      if (el){
        el.hidden = false;
        el.textContent = `Trial ${fmtMMSS(ms)} left`;
      }
      if (ms <= 0){
        clearInterval(tid);
        if (redirect) {
          const qp = new URLSearchParams();
          if (man) qp.set("man", man);
          location.href = `/pay.html?${qp.toString()}`;
        }
      }
    };
    update();
    const tid = setInterval(update, 1000);
    return { paid:false, cancel: ()=>clearInterval(tid) };
  }

  function remainingCopy(man){
    if (isMonthActive()){
      const ms = msLeft(getEnt().month.exp);
      return `Monthly access active — ${fmtMMSS(ms)} remaining today`;
    }
    if (isDayActive(man)){
      const ms = msLeft(getEnt().day[man].exp);
      return `Day pass for ${titleCase(man)} — ${fmtMMSS(ms)} left`;
    }
    const t = read(TRIAL_KEY, null);
    if (!t) return "Trial not started";
    const ms = (t.startedAt + t.durMs) - now();
    return ms > 0 ? `Trial ${fmtMMSS(ms)} left` : "Trial ended";
  }

  function titleCase(s){ return (s||"").charAt(0).toUpperCase() + (s||"").slice(1); }

  // Expose
  window.BnBAccess = {
    getUid, isPaidFor, isMonthActive, isDayActive,
    grantDayPass, grantMonthAll,
    ensureTrialOrPaid, remainingCopy
  };
})();

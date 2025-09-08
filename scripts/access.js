// scripts/access.js  — Blossom & Blade lightweight paywall
(function(){
  const LS=localStorage, qs=new URLSearchParams(location.search);
  const MAN=(qs.get('man')||'all').toLowerCase();
  const K_TRIAL=`bb_trial_${MAN}`, K_PRO='bb_pro_until';
  const cfg={freeMsgs:12, monthHref:'checkout-month.html', dayHref:'checkout-day.html', badge:true};

  function isPro(){ const u=LS.getItem(K_PRO); if(!u) return false; return u==='forever'||new Date(u)>new Date(); }
  function left(){ const used=+(LS.getItem(K_TRIAL)||0); return cfg.freeMsgs-used; }
  function bump(){ LS.setItem(K_TRIAL, String(+(LS.getItem(K_TRIAL)||0)+1)); updateBadge(); }

  function ensureUI(){
    if(document.getElementById('bb-paywall')) return;
    const css=`#bb-paywall{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:9999}
      #bb-paywall>div{width:min(540px,92vw);background:#111827;color:#fff;border-radius:18px;padding:24px;border:1px solid rgba(255,255,255,.08)}
      #bb-pill{position:fixed;right:12px;bottom:12px;background:rgba(17,24,39,.85);color:#fff;border:1px solid rgba(255,255,255,.08);padding:8px 10px;border-radius:999px;font:600 12px/1 system-ui;z-index:9998}`;
    const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);
    const modal=document.createElement('div'); modal.id='bb-paywall';
    modal.innerHTML=`<div>
      <div style="font-weight:700;font-size:20px;margin-bottom:8px">Unlock the next moves</div>
      <div style="opacity:.9;margin-bottom:16px">You hit the free chat limit for this character.</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a href="${cfg.dayHref}" style="padding:10px 14px;border-radius:999px;background:#8b5cf6;color:#0b0b10;font-weight:700;text-decoration:none">Day Pass</a>
        <a href="${cfg.monthHref}" style="padding:10px 14px;border-radius:999px;background:#f472b6;color:#0b0b10;font-weight:700;text-decoration:none">Go Monthly</a>
        <button id="bb-close" style="padding:10px 14px;border-radius:999px;background:transparent;border:1px solid #fff;color:#fff;font-weight:700">Not now</button>
      </div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#bb-close').onclick=()=>modal.style.display='none';
    const pill=document.createElement('div'); pill.id='bb-pill'; pill.style.display='none'; document.body.appendChild(pill);
  }

  function show(){ ensureUI(); document.getElementById('bb-paywall').style.display='flex'; }
  function updateBadge(){ if(!cfg.badge) return; ensureUI(); const pill=document.getElementById('bb-pill'); if(isPro()) {pill.style.display='none';return;} pill.textContent=Math.max(0,left())+' free left'; pill.style.display='block'; }
  function canSend(){ return isPro() || left()>0; }

  function hook(){
    ensureUI(); updateBadge();
    const form=document.querySelector('form'); if(!form) return;
    const input=form.querySelector('textarea, input[type="text"], input');
    form.addEventListener('submit',function(e){ if(!canSend()){ e.preventDefault(); show(); return;} setTimeout(bump,0);}, true);
    input && input.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey&&!canSend()){ e.preventDefault(); show(); }}, true);
  }

  window.BBAccess={
    gate:(opts={})=>{Object.assign(cfg,opts); hook();},
    grantPro:(days)=>{ if(!days) LS.setItem(K_PRO,'forever'); else {const d=new Date(); d.setDate(d.getDate()+(+days)); LS.setItem(K_PRO,d.toISOString());}},
    resetTrial:()=>LS.removeItem(K_TRIAL)
  };
})();

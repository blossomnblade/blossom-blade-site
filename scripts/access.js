<script>
/* scripts/access.js  — Blossom & Blade lightweight paywall
   - Count free messages per device+character (URL ?man=...)
   - When limit reached: show modal with links to day/month checkout
   - Test bypass: add ?pro=1 to URL, or call BBAccess.grantPro()
*/
(() => {
  const LS = window.localStorage;
  const qs = new URLSearchParams(location.search);
  const MAN = (qs.get('man') || 'all').toLowerCase();
  const KEY_TRIAL = (m) => `bb_trial_${m}`;
  const KEY_PRO   = `bb_pro_until`; // ISO timestamp (or "forever")
  const NOW = () => new Date();

  const h = (tag, attrs={}, kids=[]) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if (k==='style') Object.assign(el.style, v);
      else if (k==='class') el.className = v;
      else el.setAttribute(k,v);
    });
    (Array.isArray(kids)?kids:[kids]).filter(Boolean).forEach(k=>{
      el.appendChild(typeof k==='string'?document.createTextNode(k):k);
    });
    return el;
  };

  const fmtLeft = (left) => left <= 0 ? '0' : String(left);

  const BBAccess = {
    // CONFIG — tweak here only if you want different defaults
    cfg: {
      freeMsgs: 12,          // free messages per character/device
      banner:  true,         // show “X free left” pill
      monthHref: 'checkout-month.html',
      dayHref:   'checkout-day.html',
    },

    // True if user has pro/daypass active
    isPro() {
      // URL pro=1 for dev
      if (new URLSearchParams(location.search).has('pro')) return true;
      const until = LS.getItem(KEY_PRO);
      if (!until) return false;
      if (until === 'forever') return true;
      try { return new Date(until) > NOW(); } catch { return false; }
    },

    // Grant “forever” or N days (e.g., BBAccess.grantPro(30))
    grantPro(days) {
      if (!days) LS.setItem(KEY_PRO, 'forever');
      else {
        const dt = new Date();
        dt.setDate(dt.getDate() + Number(days));
        LS.setItem(KEY_PRO, dt.toISOString());
      }
    },

    // Reset trial (per character)
    resetTrial(man = MAN) { LS.removeItem(KEY_TRIAL(man)); },

    // Count + get left
    countFor(man = MAN) {
      const n = Number(LS.getItem(KEY_TRIAL(man)) || 0);
      return { used: n, left: Math.max(0, this.cfg.freeMsgs - n) };
    },

    // Increment after a successful send
    bump(man = MAN) {
      const n = Number(LS.getItem(KEY_TRIAL(man)) || 0) + 1;
      LS.setItem(KEY_TRIAL(man), String(n));
      this.updateBadge();
    },

    // UI: modal + badge
    ensureUI() {
      if (document.getElementById('bb-paywall')) return;

      // Modal
      const modal = h('div', { id:'bb-paywall', style:{
        position:'fixed', inset:'0', background:'rgba(0,0,0,.6)',
        display:'none', alignItems:'center', justifyContent:'center',
        zIndex:'9999', backdropFilter:'blur(2px)'
      }}, h('div', { style:{
        width:'min(540px,92vw)', background:'#111827', color:'#fff',
        borderRadius:'18px', padding:'24px', boxShadow:'0 10px 40px rgba(0,0,0,.5)',
        border:'1px solid rgba(255,255,255,.08)'
      }}, [
        h('div', { style:{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}},
          'Unlock the next moves'),
        h('div', { style:{opacity:.9, marginBottom:'18px', lineHeight:'1.5'}},
          'You hit the free chat limit for this character. Get a Day Pass or go Monthly to keep the scene going.'),
        h('div', { style:{display:'flex', gap:'12px', flexWrap:'wrap'}}, [
          h('a', { href: BBAccess.cfg.dayHref, style: btn('#8b5cf6') }, 'Day Pass'),
          h('a', { href: BBAccess.cfg.monthHref, style: btn('#f472b6') }, 'Go Monthly'),
          h('button', { id:'bb-close', style: btn('transparent', '#fff', true) }, 'Not now')
        ])
      ]));

      // Badge pill
      const badge = h('div', { id:'bb-left-pill', style:{
        position:'fixed', bottom:'12px', right:'12px', zIndex:'9998',
        background:'rgba(17,24,39,.85)', color:'#fff', fontSize:'12px',
        padding:'8px 10px', borderRadius:'999px',
        border:'1px solid rgba(255,255,255,.08)', display:'none'
      }}, ' ');
      document.body.append(modal, badge);
      modal.querySelector('#bb-close').addEventListener('click', ()=>modal.style.display='none');

      function btn(bg, color='#121212', outline=false){
        return {
          background: outline ? 'transparent' : bg,
          color: outline ? color : '#0b0b10',
          border: outline ? `1px solid ${color}` : 'none',
          borderRadius:'999px', padding:'10px 14px', fontWeight:'700',
          cursor:'pointer', textDecoration:'none'
        };
      }
    },

    showModal() {
      this.ensureUI();
      document.getElementById('bb-paywall').style.display='flex';
    },

    updateBadge() {
      if (!this.cfg.banner) return;
      this.ensureUI();
      const pill = document.getElementById('bb-left-pill');
      const { left } = this.countFor();
      pill.textContent = `${fmtLeft(left)} free left`;
      pill.style.display = this.isPro() ? 'none' : 'block';
    },

    // Hook form submit + Enter
    gate(opts={}) {
      Object.assign(this.cfg, opts||{});
      // If already pro, only show nothing and exit
      if (this.isPro()) { this.updateBadge(); return; }

      this.ensureUI();
      this.updateBadge();

      // Grab form + input
      const form  = document.querySelector('form');
      const input = form ? (form.querySelector('textarea, input[type="text"], input')) : null;

      // Defensive: if no form, do nothing
      if (!form) return;

      // Allow sending while under limit; block when >= limit
      const canSend = () => this.isPro() || (this.countFor().used < this.cfg.freeMsgs);

      // Capture submit before page handler
      form.addEventListener('submit', (e) => {
        if (!canSend()) { e.preventDefault(); this.showModal(); return; }
        // Let the page handle sending; then bump the count slightly later
        setTimeout(() => this.bump(), 0);
      }, true);

      // Intercept Enter (in case the page triggers submit on Enter)
      input && input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !canSend()) {
          e.preventDefault();
          this.showModal();
        }
      }, true);
    }
  };

  // expose
  window.BBAccess = BBAccess;
})();
</script>

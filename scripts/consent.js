<script>
// Blossom & Blade — age gate + footer + phrase filter
(() => {
  // ------- CONFIG -------
  window.BB_CONFIG = {
    bannedWords: [
    bannedWords: [
  // Case-insensitive; substring match
  // 1) Rape + variants
  "rape","raped","raping","noncon","non-consensual",
  // 2) Incest
  "incest","incestuous",
  // 3) Scat
  "scat","coprophagia",
  // 4) Trafficking
  "traffick","sex trafficking","human trafficking",
  // 5) Bestiality
  "bestiality","beastiality",
  // 6) Necrophilia
  "necrophilia","necrophile"
],
 
    ],
    strikeLimit: 3,        // block after 3 uses of the same word (per session)
    footerLinks: [
      { href: "/terms.html",   label: "Terms" },
      { href: "/privacy.html", label: "Privacy" },
      { href: "/billing.html", label: "Billing/Refunds" }
    ]
  };

  const AGE_KEY = "bb_age_ok_v1";
  const STRIKE_PREFIX = "bb_strike_";

  // ------- AGE GATE -------
  function showAgeGate() {
    const wrap = document.createElement("div");
    wrap.id = "bb-age-overlay";
    wrap.innerHTML = `
      <div class="bb-age-backdrop"></div>
      <div class="bb-age-modal">
        <h2>Adults 18+ only</h2>
        <p>By entering, you confirm you are at least 18 years old and agree to our Terms & Privacy.</p>
        <div class="bb-age-actions">
          <a class="bb-btn bb-primary" href="#" id="bb-enter">I’m 18+ — Enter</a>
          <a class="bb-btn" href="https://google.com" id="bb-leave">Leave</a>
        </div>
        <p class="bb-legal-note">
          See <a href="/terms.html">Terms</a> and <a href="/privacy.html">Privacy</a>.
        </p>
      </div>
      <style>
        #bb-age-overlay{position:fixed;inset:0;z-index:9999}
        .bb-age-backdrop{position:absolute;inset:0;background:#000a;backdrop-filter:blur(2px)}
        .bb-age-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
          width:min(520px,92%);background:#0f0f12;border:1px solid #2a2a35;border-radius:16px;
          padding:24px;color:#e7e7ef;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif;box-shadow:0 10px 40px #0009}
        .bb-age-modal h2{margin:0 0 10px;font-size:24px}
        .bb-age-modal p{margin:8px 0 0;line-height:1.5}
        .bb-age-actions{display:flex;gap:12px;margin-top:18px}
        .bb-btn{display:inline-block;padding:10px 14px;border:1px solid #3a3a48;border-radius:10px;color:#e7e7ef;text-decoration:none}
        .bb-primary{background:#ff2a6d;border-color:#ff2a6d;color:#fff}
        .bb-legal-note{opacity:.75;margin-top:10px}
      </style>
    `;
    document.body.appendChild(wrap);
    wrap.querySelector("#bb-enter").onclick = (e) => {
      e.preventDefault();
      localStorage.setItem(AGE_KEY, "1");
      wrap.remove();
    };
  }
  function ensureAge() {
    if (localStorage.getItem(AGE_KEY) !== "1") showAgeGate();
  }

  // ------- FOOTER -------
  function injectFooter() {
    if (document.getElementById("bb-footer")) return;
    const f = document.createElement("footer");
    f.id = "bb-footer";
    f.innerHTML = `
      <div class="bb-foot-wrap">
        <span class="bb-foot-brand">© ${new Date().getFullYear()} Blossom & Blade</span>
        <nav class="bb-foot-links">
          ${ (window.BB_CONFIG.footerLinks||[])
              .map(l => `<a href="${l.href}">${l.label}</a>`).join(" · ") }
        </nav>
      </div>
      <style>
        #bb-footer{margin:48px 0 24px;color:#a9a9b8}
        .bb-foot-wrap{max-width:1100px;margin:0 auto;padding:0 16px;display:flex;gap:12px;
          align-items:center;justify-content:center;flex-wrap:wrap;opacity:.9}
        .bb-foot-links a{color:#a9a9b8;text-decoration:none}
        .bb-foot-links a:hover{color:#fff}
      </style>
    `;
    document.body.appendChild(f);
  }

  // ------- PHRASE FILTER -------
  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;left:50%;top:22px;transform:translateX(-50%);
      background:#14141b;border:1px solid #323246;color:#fff;padding:10px 14px;border-radius:10px;
      z-index:9999;box-shadow:0 6px 30px #000a;font:600 14px/1.2 system-ui,Segoe UI,Roboto,Inter,sans-serif
    `;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 2400);
  }

  function bumpStrike(word) {
    const key = STRIKE_PREFIX + word;
    const n = (+sessionStorage.getItem(key) || 0) + 1;
    sessionStorage.setItem(key, n);
    return n;
  }

  function bannedHit(text) {
    const banned = (window.BB_CONFIG.bannedWords||[]).map(s=>s.trim().toLowerCase()).filter(Boolean);
    if (!banned.length) return null;
    const low = (text||"").toLowerCase();
    return banned.find(w => low.includes(w)) || null;
  }

  function blockChat() {
    const o = document.createElement("div");
    o.innerHTML = `
      <div class="bb-age-backdrop" style="position:fixed;inset:0;z-index:9998;background:#0008"></div>
      <div class="bb-age-modal" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
        width:min(520px,92%);background:#0f0f12;border:1px solid #2a2a35;border-radius:16px;padding:22px;
        color:#e7e7ef;z-index:9999;box-shadow:0 10px 40px #0009">
        <h3 style="margin:0 0 6px">Chat paused</h3>
        <p>This message can’t be sent right now. Please avoid restricted terms.</p>
        <div style="margin-top:14px"><button id="bb-unpause" style="background:#2d2d39;border:1px solid #3a3a48;color:#fff;padding:8px 12px;border-radius:8px">OK</button></div>
      </div>
    `;
    document.body.appendChild(o);
    o.querySelector("#bb-unpause").onclick = ()=> o.remove();
  }

  function hookForms() {
    document.addEventListener("submit", (e) => {
      // Find the longest text field in the submitted form
      const fields = [...e.target.querySelectorAll('textarea, input[type="text"], input[type="search"], input[name="message"]')];
      if (!fields.length) return;
      const field = fields.sort((a,b)=> (b.value?.length||0) - (a.value?.length||0))[0];
      const hit = bannedHit(field?.value || "");
      if (!hit) return;
      const strikes = bumpStrike(hit);
      if (strikes >= (window.BB_CONFIG.strikeLimit||3)) {
        e.preventDefault();
        blockChat();
      } else {
        e.preventDefault();
        toast(`⚠️ That term isn’t allowed here (${strikes}/${window.BB_CONFIG.strikeLimit}).`);
      }
    }, true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureAge();
    injectFooter();
    hookForms();
  });
})();
</script>

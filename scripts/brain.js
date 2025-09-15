/* Blossom & Blade — brain.js (v6b)
   - Uses stored name for opener ONLY if user is paid (or ?paid=1)
   - Learns name from chat (“im kasey” / “i’m …” / “my name is …”)
   - Fix personas: Blade ≠ helmet, Dylan = helmet choices
*/
(function(){
  const LS_KEYS = { name: 'bb_user_name' };

  // ---------- paid/name gates ----------
  function isPaid(){
    try {
      const q = new URLSearchParams(location.search);
      if ((q.get('paid') || '').toString() === '1') return true; // test override
      return !!(window.BB_ACCESS && window.BB_ACCESS.isPaid && window.BB_ACCESS.isPaid());
    } catch(_) { return false; }
  }

  // ---------- name memory ----------
  function cleanName(n){
    if(!n) return null;
    const t = String(n).trim().replace(/[^a-zA-Z .'-]/g,'');
    if(!t) return null;
    return t.replace(/\b([a-z])/g,(m,c)=>c.toUpperCase());
  }
  function setName(n){
    const v = cleanName(n);
    if(!v) return;
    try{ localStorage.setItem(LS_KEYS.name, v); }catch(_){}
  }
  function getStoredName(){
    try{ const raw = localStorage.getItem(LS_KEYS.name); return raw?cleanName(raw):null; }catch(_){ return null; }
  }
  // Learn name from URL (optional)
  (function seedFromQuery(){
    try{
      const qs = new URLSearchParams(location.search);
      const qn = qs.get('name') || qs.get('user') || qs.get('n');
      if(qn) setName(qn);
    }catch(_){}
  })();

  // ---------- backgrounds ----------
  const BG_BY_MAN = {
    alexander: '/images/bg_alexander_boardroom.jpg',
    dylan:     '/images/dylan-garage.jpg',
    grayson:   '/images/grayson-bg.jpg',
    silas:     '/images/bg_silas_stage.jpg',
    blade:     '/images/blade-woods.jpg',
    jesse:     '/images/jesse-bull-night.jpg',
  };

  // ---------- openers ----------
  const PETS = ['love','darlin’','pretty thing','trouble','star','beautiful','gorgeous'];
  const pet  = () => PETS[Math.floor(Math.random()*PETS.length)];

  const OPENERS = {
    alexander: [
      "Evening, {who}. Miss me?",
      "There you are, {who}.",
      "You clean up trouble like a pro, {who2}."
    ],
    dylan: [
      "Hey {who2}.",
      "Helmet on or off, {who}?",
      "Slide in, {who} — I wiped the seat."
    ],
    grayson: [
      "You found me, {who}.",
      "Stay close, {who2}.",
      "What kind of mischief tonight, {who}?"
    ],
    silas: [
      "Backstage again, {who}?",
      "There you are, {who2}.",
      "Turn me up or tune me up, {who}?"
    ],
    // Blade: no helmet talk
    blade: [
      "Into the dark with me, {who}.",
      "I like how you run, {who2} — and how you get caught.",
      "Careful steps, {who}. I’m right behind you."
    ],
    jesse: [
      "Knew you’d come back, {who}.",
      "C’mon, let’s make some noise, {who2}.",
      "You and me against the slow day, {who}."
    ]
  };

  // 10% chance to use “{Name} — is that you?”
  function maybeIsThatYou(nm){
    if(!nm) return null;
    return Math.random()<0.10 ? `${nm} — is that you?` : null;
  }

  function pickOpener(man){
    const nm = isPaid() ? getStoredName() : null; // name only if paid
    const who  = nm || pet();
    const who2 = nm || pet();
    const special = maybeIsThatYou(nm);
    if(special) return special;

    const list = OPENERS[man] || ["There you are, {who2}."];
    const raw  = list[Math.floor(Math.random()*list.length)];
    return raw.replaceAll('{who}', who).replaceAll('{who2}', who2);
  }

  // ---------- apply on chat pages ----------
  function applyChatUI(){
    const isChat = /chat\.html$/i.test(location.pathname) || document.querySelector('[data-chat-root]');
    if(!isChat) return;
    const params = new URLSearchParams(location.search);
    const man = (params.get('man') || 'alexander').toLowerCase();

    const bg = BG_BY_MAN[man] || BG_BY_MAN.alexander;
    document.documentElement.style.setProperty('--room-bg', `url(${bg})`);

    const openerEl = document.querySelector('[data-chat-opener]');
    if(openerEl) openerEl.textContent = pickOpener(man);
  }

  // expose for chat.html to call when user tells name
  window.BB = {
    setName,
    learnNameFromMessage(text){
      const t = String(text||'').trim();
      const patterns = [
        /\bmy\s+name\s+is\s+([a-z][a-z .'-]{0,30})$/i,
        /\bi\s*am\s+([a-z][a-z .'-]{0,30})$/i,
        /\bi['’]m\s+([a-z][a-z .'-]{0,30})$/i,
        /\bim\s+([a-z][a-z .'-]{0,30})$/i,
      ];
      for(const rx of patterns){
        const m = t.match(rx);
        if(m){ setName(m[1]); return cleanName(m[1]); }
      }
      return null;
    },
    applyChatUI,
    isPaid
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyChatUI);
  } else {
    applyChatUI();
  }
})();

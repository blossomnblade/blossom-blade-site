/* Blossom & Blade — brain.js (v4a)
   - Backgrounds per man; Jesse = bull (night)
   - Remembers user's name (many phrasings, incl. "im kasey")
   - Personalized, human openers
*/
(function(){
  // ---- LIGHT MEMORY ----
  const LS_KEYS = { name: 'bb_user_name' };

  function getName() {
    try {
      const qs = new URLSearchParams(location.search);
      const qsName = qs.get('name') || qs.get('user') || qs.get('n');
      if (qsName) { setName(qsName); return cleanName(qsName); }
      const raw = localStorage.getItem(LS_KEYS.name);
      return raw ? cleanName(raw) : null;
    } catch (_) { return null; }
  }
  function setName(n) {
    const v = cleanName(n);
    if (!v) return;
    try { localStorage.setItem(LS_KEYS.name, v); } catch (_) {}
  }
  function cleanName(n) {
    if (!n) return null;
    const t = String(n).trim().replace(/[^a-zA-Z .'-]/g, '');
    if (!t) return null;
    return t.replace(/\b([a-z])/g, (m,c)=>c.toUpperCase());
  }

  const PETS = ['love','darlin’','pretty thing','trouble','star','beautiful','gorgeous'];
  const pet = () => PETS[Math.floor(Math.random()*PETS.length)];

  // ---- BACKGROUNDS ----
  const BG_BY_MAN = {
    alexander: '/images/bg_alexander_boardroom.jpg',
    dylan:     '/images/dylan-garage.jpg',
    grayson:   '/images/grayson-bg.jpg',
    silas:     '/images/bg_silas_stage.jpg',
    blade:     '/images/blade-woods.jpg',
    jesse:     '/images/jesse-bull-night.jpg', // rodeo shot for Jesse’s room
  };

  // ---- OPENERS ----
  const OPENERS = {
    alexander: ["Evening, {nameOrPet}. Miss me?","There you are, {name}.","You clean up trouble like a pro, {nameOrPet}."],
    dylan:     ["Hey {nameOrPet}.","Slide in, {name} — I wiped the seat.","Grease or gossip first, {nameOrPet}?"],
    grayson:   ["You found me, {name}.","Stay close, {nameOrPet}.","What kind of mischief tonight, {name}?"],
    silas:     ["Backstage again, {name}?","There you are, {nameOrPet}.","Turn me up or tune me up, {name}?"],
    blade:     ["Hey trouble… {name}.","I like how you show up, {nameOrPet}.","Helmet off or on, {name}?"],
    jesse:     ["Knew you’d come back, {name}.","C’mon, let’s make some noise, {nameOrPet}.","You and me against the slow day, {name}."]
  };

  function personalize(line, nm) {
    const nameOrPet = nm || pet();
    return line.replaceAll('{name}', nm || nameOrPet).replaceAll('{nameOrPet}', nameOrPet);
  }

  function pickOpener(man){
    const nm = getName();
    const list = OPENERS[man] || ["There you are, {nameOrPet}."];
    const raw = list[Math.floor(Math.random() * list.length)];
    return personalize(raw, nm);
  }

  // ---- APPLY TO CHAT ----
  function applyChatUI(){
    const isChat = /chat\.html$/i.test(location.pathname) || document.querySelector('[data-chat-root]');
    if(!isChat) return;
    const params = new URLSearchParams(window.location.search);
    const man = (params.get('man') || 'alexander').toLowerCase();
    const bg = BG_BY_MAN[man] || BG_BY_MAN.alexander;
    document.documentElement.style.setProperty('--room-bg', `url(${bg})`);
    const openerEl = document.querySelector('[data-chat-opener]');
    if(openerEl){ openerEl.textContent = pickOpener(man); }
  }

  window.BB = { getName, setName, pickOpener, applyChatUI };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyChatUI);
  } else {
    applyChatUI();
  }
})();

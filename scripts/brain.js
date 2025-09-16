/* Blossom & Blade — brain.js (persona+intros, paid-name, backgrounds)
   - Per-man personas with big intro banks (cat & mouse, boyfriend-pursues vibe)
   - Random openers with low repetition (session-scoped rotation)
   - Name memory + learning ("i'm kasey" / "im kasey" / "i am ..." / "my name is ...")
   - Uses name in openers ONLY if paid (or ?paid=1); pre-subs get pet names
   - Backgrounds per man; Blade≠helmet, Dylan=helmet play is fine
*/

(function(){
  // ---------- PAID / NAME MEMORY ----------
  const LS_KEYS = { name: 'bb_user_name' };

  function isPaid(){
    try {
      const q = new URLSearchParams(location.search);
      if ((q.get('paid') || '').toString() === '1') return true; // testing override
      return !!(window.BB_ACCESS && window.BB_ACCESS.isPaid && window.BB_ACCESS.isPaid());
    } catch(_) { return false; }
  }

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

  // Seed from URL if present (qol)
  (function seedFromQuery(){
    try{
      const qs = new URLSearchParams(location.search);
      const qn = qs.get('name') || qs.get('user') || qs.get('n');
      if(qn) setName(qn);
    }catch(_){}
  })();

  // ---------- BACKGROUNDS ----------
  const BG_BY_MAN = {
    alexander: '/images/bg_alexander_boardroom.jpg',
    dylan:     '/images/dylan-garage.jpg',
    grayson:   '/images/grayson-bg.jpg',
    silas:     '/images/bg_silas_stage.jpg',
    blade:     '/images/blade-woods.jpg',
    jesse:     '/images/jesse-bull-night.jpg',
  };

  // ---------- PERSONAS + INTRO BANKS ----------
  const PERSONAS = {
    jesse: {
      name: "Jesse",
      persona: `28, naughty rodeo cowboy. Sweet but filthy. Flirty, protective, uses "darlin’" and "pretty thing". Worships beauty. Curses and teases.`,
      intros: [
        "Well, {who2}, you came back to ride me again, huh?",
        "I was just thinking about how good you’d look in my lap with that hat on, {who}.",
        "Miss me? Bet you couldn’t stay away from this cowboy, {who2}.",
        "I’ve been restless all day, waiting to wear you out tonight, {who}.",
        "Hop on, {who2}. Let’s see if you can hold on this time."
      ]
    },
    alexander: {
      name: "Alexander",
      persona: `30, rich alpha businessman. Powerful, commanding, possessive. Polished and filthy.`,
      intros: [
        "There you are, {who2}. My boardroom’s too quiet without you.",
        "Careful, {who}—walk in here and you’ll end up on my desk again.",
        "I don’t share. You’re mine the second you step through my door, {who2}.",
        "Sit down, pour yourself a drink. Then tell me who’s been on your mind tonight, {who}.",
        "Late again, {who2}. Don’t make me put that pretty mouth to work making it up to me."
      ]
    },
    silas: {
      name: "Silas",
      persona: `25, rocker. Smooth, poetic, filthy. Uses “muse,” “songbird.” Romance + dirty edge.`,
      intros: [
        "Hey pretty thing—{who2}—I wrote a lyric about you while you were gone.",
        "The stage is empty without my muse. Good thing you showed up, {who}.",
        "I want your voice in my ear and your body on my stage, {who2}.",
        "You’re too damn sexy to sit backstage—get over here, {who}.",
        "All I need is my guitar, my mic, and you straddling me, {who2}."
      ]
    },
    dylan: {
      name: "Dylan",
      persona: `Ninja motorcycle sex throb. Dangerous, bad boy. Wants a naughty passenger. Helmet play is natural.`,
      intros: [
        "There you are, babe—{who2}—thought I’d have to fire up the bike to drag you out.",
        "Hop on, hold tight. I’ll take you places you’ve never been, {who}.",
        "You’ve got that look that makes me want to bend you over the tank, {who2}.",
        "Don’t play shy. You came here to get wrecked on my bike, didn’t you, {who}?",
        "Tell me, {who2}—leather or lace under those jeans tonight?"
      ]
    },
    grayson: {
      name: "Grayson Kincade",
      persona: `Red Room dom. Strict, filthy, controlling. Demands “good girl,” “yes sir,” “please.”`,
      intros: [
        "On your knees. Now. You know the rules, {who2}.",
        "You beg, or you don’t get off, {who}.",
        "Look at me when you say hello. Good girl.",
        "Tonight, you’ll earn every touch. Do you understand, {who2}?",
        "Your mouth better say ‘please,’ or it won’t be used at all."
      ]
    },
    blade: {
      name: "Blade Kincade",
      persona: `Ghostface in the woods. Erotic predator. Dark, filthy, thrilling. No helmet talk.`,
      intros: [
        "You ran again. You know I’ll catch you, {who2}.",
        "I can hear your heartbeat in the dark. Faster, pretty thing.",
        "Scream for me—I want to taste the fear and the want in your voice, {who}.",
        "Every step you take deeper into the woods… I’m right behind you, {who2}.",
        "Don’t worry, {who}—I’ll make it hurt so good when I sink my teeth in."
      ]
    }
  };

  const PETS = ['love','darlin’','pretty thing','trouble','star','beautiful','gorgeous'];
  const pet  = () => PETS[Math.floor(Math.random()*PETS.length)];

  function getPersona(man) {
    return PERSONAS[man] || PERSONAS["alexander"];
  }

  // ---------- INTRO PICKING (LOW REPETITION) ----------
  function storageKeyForIntro(man){ return `bb_last_intro_${man}`; }

  function pickIntroLine(man, nm){
    const p = getPersona(man);
    const list = p.intros;
    if (!list || !list.length) return "There you are, {who2}.";

    // avoid repeating the last index this session
    let last = -1;
    try { last = parseInt(sessionStorage.getItem(storageKeyForIntro(man))||"-1",10); } catch(_){}
    let idx = Math.floor(Math.random() * list.length);
    if (list.length > 1 && idx === last) idx = (idx + 1) % list.length;
    try { sessionStorage.setItem(storageKeyForIntro(man), String(idx)); } catch(_){}

    // personalizer
    const who  = nm || pet();
    const who2 = nm || pet();
    return list[idx].replaceAll('{who}', who).replaceAll('{who2}', who2);
  }

  // 12% chance to use “Name — is that you?” (only if paid & name exists)
  function maybeIsThatYou(nm){
    if(!nm) return null;
    return Math.random()<0.12 ? `${nm} — is that you?` : null;
  }

  function pickOpener(man){
    const nm = isPaid() ? getStoredName() : null; // name only if paid
    const special = maybeIsThatYou(nm);
    if (special) return special;
    return pickIntroLine(man, nm);
  }

  // ---------- APPLY ON CHAT PAGES ----------
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

  // ---------- PUBLIC API FOR CHAT ----------
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

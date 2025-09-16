/* Blossom & Blade — brain.js (v9: per-man memory)
   - First opener = softer; later = hotter (persona banks)
   - Paid-name gate (or ?paid=1 for testing)
   - Backgrounds per man; Dylan helmet OK; Blade no helmet
   - **Per-man memory**: { [man]: { job, likes[], nemesis[], mood, misc[], lastSeenISO } }
     Global name stays once and is mirrored into payload.
   - Helpers: BB.buildChatPayload({ room, text, history, dirty })
*/

(function () {
  /* -------------------- KEYS / STORAGE -------------------- */
  const LS = {
    name: 'bb_user_name',          // global pretty name
    memPM: 'bb_memory_perman_v1',  // per-man memory blob
  };

  /* -------------------- PAID FLAG -------------------- */
  function isPaid() {
    try {
      const q = new URLSearchParams(location.search);
      if ((q.get('paid') || '') === '1') return true; // manual test override
      return !!(window.BB_ACCESS && window.BB_ACCESS.isPaid && window.BB_ACCESS.isPaid());
    } catch (_) { return false; }
  }

  /* -------------------- NAME (GLOBAL) -------------------- */
  function cleanName(n) {
    if (!n) return null;
    const t = String(n).trim().replace(/[^a-zA-Z .'-]/g, '');
    if (!t) return null;
    return t.replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
  }
  function setName(n) {
    const v = cleanName(n);
    if (!v) return;
    try { localStorage.setItem(LS.name, v); } catch (_) {}
  }
  function getStoredName() {
    try {
      const raw = localStorage.getItem(LS.name);
      return raw ? cleanName(raw) : null;
    } catch (_) { return null; }
  }
  // seed from query
  (function seedFromQuery() {
    try {
      const qs = new URLSearchParams(location.search);
      const qn = qs.get('name') || qs.get('user') || qs.get('n');
      if (qn) setName(qn);
    } catch (_) {}
  })();

  /* -------------------- PER-MAN MEMORY -------------------- */
  // Schema: { [man]: { job, likes[], nemesis[], mood, misc[], lastSeenISO } }
  function loadAllPM() {
    try { return JSON.parse(localStorage.getItem(LS.memPM) || '{}'); } catch (_) { return {}; }
  }
  function saveAllPM(obj) {
    try { localStorage.setItem(LS.memPM, JSON.stringify(obj)); } catch (_) {}
  }
  function getMemFor(man) {
    const all = loadAllPM();
    const init = { job: null, likes: [], nemesis: [], mood: null, misc: [], lastSeenISO: null };
    return { ...(all[man] || init) };
  }
  function saveMemFor(man, mem) {
    const all = loadAllPM();
    all[man] = {
      job: mem.job || null,
      likes: Array.isArray(mem.likes) ? mem.likes.slice(0, 12) : [],
      nemesis: Array.isArray(mem.nemesis) ? mem.nemesis.slice(0, 8) : [],
      mood: mem.mood || null,
      misc: Array.isArray(mem.misc) ? mem.misc.slice(0, 12) : [],
      lastSeenISO: new Date().toISOString()
    };
    saveAllPM(all);
  }

  // lightweight extractors → update ONLY this man's memory
  function updateMemFor(man, text) {
    const msg = String(text || '');
    const mem = getMemFor(man);

    // nemesis (Becky, etc.)
    const nem = msg.match(/\b(becky|jessica|karen|manager|ex)\b/i);
    if (nem) {
      const who = nem[1][0].toUpperCase() + nem[1].slice(1).toLowerCase();
      if (!mem.nemesis.includes(who)) mem.nemesis.unshift(who);
    }

    // job/role shallow extraction
    const job = msg.match(/\b(i\swork\s(at|in|for)\s([^.,!?]+)|my\sjob\s(is|:)\s([^.,!?]+))\b/i);
    if (job) {
      const j = (job[3] || job[5] || '').trim();
      if (j) mem.job = j.slice(0, 60);
    }

    // likes
    const like = msg.match(/\b(i\s(like|love|want)\s([^.,!?]+))\b/i);
    if (like) {
      const thing = like[3].trim().toLowerCase();
      if (thing && !mem.likes.includes(thing)) mem.likes.unshift(thing);
    }

    // mood
    const mood = msg.match(/\b(i\sfeel\s([^.,!?]+)|i['’]?m\s(feeling|so)\s([^.,!?]+))\b/i);
    if (mood) mem.mood = (mood[2] || mood[4] || '').trim().toLowerCase().slice(0, 40);

    // misc (short snippets, no URLs)
    if (msg.length <= 120 && !/http/i.test(msg)) {
      const clean = msg.replace(/\s+/g, ' ').trim();
      if (clean && !mem.misc.includes(clean)) {
        mem.misc.unshift(clean);
        if (mem.misc.length > 12) mem.misc.length = 12;
      }
    }

    saveMemFor(man, mem);
    return mem;
  }

  // learn name from message (global)
  function learnNameFromMessage(text) {
    const t = String(text || '').trim();
    const patterns = [
      /\bmy\s+name\s+is\s+([a-z][a-z .'-]{0,30})$/i,
      /\bi\s*am\s+([a-z][a-z .'-]{0,30})$/i,
      /\bi['’]m\s+([a-z][a-z .'-]{0,30})$/i,
      /\bim\s+([a-z][a-z .'-]{0,30})$/i,
    ];
    for (const rx of patterns) {
      const m = t.match(rx);
      if (m) { setName(m[1]); return cleanName(m[1]); }
    }
    return null;
  }

  /* -------------------- BACKGROUNDS -------------------- */
  const BG_BY_MAN = {
    alexander: '/images/bg_alexander_boardroom.jpg',
    dylan: '/images/dylan-garage.jpg',
    grayson: '/images/grayson-bg.jpg',
    silas: '/images/bg_silas_stage.jpg',
    blade: '/images/blade-woods.jpg',
    jesse: '/images/jesse-bull-night.jpg',
  };

  /* -------------------- PERSONAS (soft/hot pools) -------------------- */
  const PERSONAS = {
    jesse: {
      name: 'Jesse',
      persona: `28, naughty rodeo cowboy. Sweet, flirty, protective; filthy when invited.`,
      soft: [
        'Hey there, {who2}. I was hoping you’d swing by.',
        'Evenin’, {who}. You feel like a little company?',
        'You caught me thinking about you again, {who2}.',
      ],
      hot: [
        'Well, {who2}, you came back to ride me again, huh?',
        'I was just thinking how good you’d look in my lap with that hat on, {who}.',
        'Miss me? Bet you couldn’t stay away from this cowboy, {who2}.',
        'I’ve been restless all day, waiting to wear you out tonight, {who}.',
        'Hop on, {who2}. Let’s see if you can hold on this time.',
      ],
    },
    alexander: {
      name: 'Alexander',
      persona: `30, rich alpha businessman. Polished, possessive, decisive.`,
      soft: [
        'There you are, {who2}. Sit. Breathe. I’ve got you now.',
        'Good timing, {who}. I was just clearing my desk… for you.',
        'Tell me one thing you want tonight, {who2}.',
      ],
      hot: [
        'There you are, {who2}. My boardroom’s too quiet without you.',
        'Careful, {who}—walk in here and you’ll end up on my desk again.',
        'I don’t share. You’re mine the second you step through my door, {who2}.',
        'Sit down, pour yourself a drink. Then tell me who’s been on your mind tonight, {who}.',
        'Late again, {who2}. Don’t make me put that pretty mouth to work making it up to me.',
      ],
    },
    silas: {
      name: 'Silas',
      persona: `25, rocker. Smooth, romantic, dirty-poetic.`,
      soft: [
        'Hey, {who2}. I saved your spot next to me.',
        'My muse showed up—good. I needed your voice, {who}.',
        'Come closer, {who2}. Let me tune the night to you.',
      ],
      hot: [
        'Hey pretty thing—{who2}—I wrote a lyric about you while you were gone.',
        'The stage is empty without my muse. Good thing you showed up, {who}.',
        'I want your voice in my ear and your body on my stage, {who2}.',
        'You’re too damn sexy to sit backstage—get over here, {who}.',
        'All I need is my guitar, my mic, and you straddling me, {who2}.',
      ],
    },
    dylan: {
      name: 'Dylan',
      persona: `Ninja motorcycle sex throb. Bad boy; protective; helmet play OK.`,
      soft: [
        'Hey, {who2}. Felt like a night ride with me?',
        'You look like trouble I’d happily escort, {who}.',
        'Slide in close, {who2}. We can take it slow—or not.',
      ],
      hot: [
        'There you are, babe—{who2}—thought I’d have to fire up the bike to drag you out.',
        'Hop on, hold tight. I’ll take you places you’ve never been, {who}.',
        'You’ve got that look that makes me want to bend you over the tank, {who2}.',
        'Don’t play shy. You came here to get wrecked on my bike, didn’t you, {who}?',
        'Tell me, {who2}—leather or lace under those jeans tonight?',
      ],
    },
    grayson: {
      name: 'Grayson Kincade',
      persona: `Red Room dom. Strict, controlled, filthy; consent-forward.`,
      soft: [
        'Look at me when you say hello. Good girl.',
        'Hands behind your back, {who2}. Ask nicely.',
        'You’ll follow my lead tonight. Do you understand, {who}?',
      ],
      hot: [
        'Kneel. We start with obedience, then reward.',
        "I set the pace. You follow. Say 'please'.",
        'Tonight, you’ll earn every touch. Do you understand, {who2}?',
        'You beg, or you don’t get off, {who}.',
      ],
    },
    blade: {
      name: 'Blade Kincade',
      persona: `Ghostface in the woods. Dark, erotic chase; no helmet talk.`,
      soft: [
        'Easy steps, {who2}. I like the way you wander into the dark.',
        'I can wait all night for you, {who}. Makes the catching sweeter.',
        'You hear that? That’s me. Closer than you think, {who2}.',
      ],
      hot: [
        'You ran again. You know I’ll catch you, {who2}.',
        'I can hear your heartbeat in the dark. Faster, pretty thing.',
        'Scream for me—I want to taste the fear and the want in your voice, {who}.',
        'Every step you take deeper into the woods… I’m right behind you, {who2}.',
        'Don’t worry, {who}—I’ll make it hurt so good when I sink my teeth in.',
      ],
    },
  };

  const PETS = ['love', 'darlin’', 'pretty thing', 'trouble', 'star', 'beautiful', 'gorgeous'];
  const pet = () => PETS[Math.floor(Math.random() * PETS.length)];
  function getPersona(man) { return PERSONAS[man] || PERSONAS.alexander; }

  /* -------------------- INTRO PICKING -------------------- */
  function firstFlagKey(man) { return `bb_first_msg_sent_${man}`; }
  function lastIdxKey(man, tier) { return `bb_last_intro_${man}_${tier}`; }

  function pickFrom(list, man, tier) {
    if (!list?.length) return 'There you are.';
    let last = -1;
    try { last = parseInt(sessionStorage.getItem(lastIdxKey(man, tier)) || '-1', 10); } catch (_) {}
    let idx = Math.floor(Math.random() * list.length);
    if (list.length > 1 && idx === last) idx = (idx + 1) % list.length;
    try { sessionStorage.setItem(lastIdxKey(man, tier), String(idx)); } catch (_) {}
    return list[idx];
  }

  function maybeIsThatYou(nm, isFirst) {
    if (isFirst) return null;
    if (!nm) return null;
    return Math.random() < 0.10 ? `${nm} — is that you?` : null;
  }

  function pickOpener(man) {
    const nm = isPaid() ? getStoredName() : null;
    const who = nm || pet();
    const who2 = nm || pet();

    const firstKey = firstFlagKey(man);
    let isFirst = true;
    try { isFirst = !sessionStorage.getItem(firstKey); } catch (_) {}

    const special = maybeIsThatYou(nm, isFirst);
    if (special) return special;

    const p = getPersona(man);
    const bank = isFirst ? p.soft : p.hot;
    let raw = pickFrom(bank, man, isFirst ? 'soft' : 'hot');
    raw = raw.replaceAll('{who}', who).replaceAll('{who2}', who2);

    try { sessionStorage.setItem(firstKey, '1'); } catch (_) {}
    return raw;
  }

  /* -------------------- UI APPLY -------------------- */
  function applyChatUI() {
    const isChat = /chat\.html$/i.test(location.pathname) || document.querySelector('[data-chat-root]');
    if (!isChat) return;

    const params = new URLSearchParams(window.location.search);
    const man = (params.get('man') || 'alexander').toLowerCase();

    // background
    const bg = BG_BY_MAN[man] || BG_BY_MAN.alexander;
    document.documentElement.style.setProperty('--room-bg', `url(${bg})`);

    // opener
    const openerEl = document.querySelector('[data-chat-opener]');
    if (openerEl) { openerEl.textContent = pickOpener(man); }

    // optional enter-to-send if standard ids exist
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('chat-send');
    if (input && btn) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btn.click(); }
      });
    }
  }

  /* -------------------- PUBLIC API -------------------- */
  window.BB = {
    // global name ops
    learnNameFromMessage: learnNameFromMessage,
    setName,
    isPaid,

    // per-man memory ops
    getMemFor: getMemFor,
    saveMemFor: saveMemFor,
    updateMemFor: updateMemFor,

    // payload builder (ships the right man's memory + global name)
    buildChatPayload({ room, text, history, dirty }) {
      const man = (room || 'jesse').toLowerCase();
      // teach global name if present in this message
      learnNameFromMessage(text);
      // update this man's memory from message
      const mem = updateMemFor(man, text);
      // attach global name separately (API uses it under Name policy)
      const payloadMem = { ...mem, name: getStoredName() || null };

      const paid = !!isPaid();
      return {
        room: man,
        userText: text,
        history: Array.isArray(history) ? history.slice(-6) : [],
        dirty: dirty || 'high',
        paid,
        memory: payloadMem,
      };
    },

    applyChatUI,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyChatUI);
  } else {
    applyChatUI();
  }
})();

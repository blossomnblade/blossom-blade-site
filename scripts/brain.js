/* scripts/brain.js — natural, follower-style replies with name catching */

(() => {
  // --------- tiny state ----------
  const MEM_KEY = 'bb_mem';
  const readMem = () => {
    try { return JSON.parse(localStorage.getItem(MEM_KEY)) || {}; }
    catch { return {}; }
  };
  const writeMem = (m) => localStorage.setItem(MEM_KEY, JSON.stringify(m));

  const qs = new URLSearchParams(location.search);
  const man = (qs.get('man') || 'jesse').toLowerCase();

  // keep variety per bucket
  function pick(list, bucket) {
    const k = `bb_used_${man}_${bucket}`;
    const used = JSON.parse(localStorage.getItem(k) || '[]');
    const pool = list.filter(x => !used.includes(x));
    const arr = pool.length ? pool : list;
    const choice = arr[Math.floor(Math.random() * arr.length)];
    const next = [...used, choice].slice(-10);
    localStorage.setItem(k, JSON.stringify(next));
    return choice;
  }

  // ---------- NLP-lite helpers ----------
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

  // Catch: "i'm kasey", "im kasey", "i am kasey", "my name is kasey", "call me kasey"
  function extractName(t) {
    if (!t) return null;
    const s = t.trim().toLowerCase();
    const m = s.match(/\b(?:i[' ]?m|i am|my name is|call me)\s+([a-z][a-z'’-]{1,20})\b/);
    if (m) {
      // strip trailing punctuation
      let nm = m[1].replace(/[^a-z'’-]/g, '');
      // split on hyphen/space if any; use first token
      nm = nm.split(/[\s\-]/)[0];
      return cap(nm);
    }
    return null;
  }

  const greets = /\b(hi|hey|hello|howdy|yo)\b/i;

  // -------- personas (short, classy) --------
  const commonInvites = [
    "What brings you here tonight?",
    "I’m listening.",
    "Come as you are—I’ve got you.",
    "Tell me what feels good to talk about.",
    "We can be soft or a little wicked—your call."
  ];

  const P = {
    jesse: {
      open: [
        "There you are, darlin’.",
        "Hey sweet thing.",
        "Well now—look at you.",
        "Evenin’, sweetheart."
      ],
      nameHi: [
        "Hi {name}—my pleasure.",
        "{name}, I like the way that sounds.",
        "Nice to meet you, {name}.",
        "Glad you’re here, {name}."
      ],
      follow: [
        "Come sit a spell with me.",
        "You’re safe with me, sugar.",
        "Kick off your boots and stay a minute."
      ],
      invites: commonInvites
    },
    alexander: {
      open: [
        "There you are.",
        "Good evening, love.",
        "Right on time.",
        "I’ve been saving my attention for you."
      ],
      nameHi: [
        "Hi {name}—you have my focus.",
        "Pleasure to meet you, {name}.",
        "{name}, make yourself comfortable.",
        "Welcome in, {name}."
      ],
      follow: [
        "You have my full attention.",
        "We can keep this clean or deliciously not.",
        "I’ll match your pace."
      ],
      invites: commonInvites
    },
    dylan: {
      open: [
        "Hey you.",
        "There’s my bad girl.",
        "Come closer, baby.",
        "You light the room up."
      ],
      nameHi: [
        "Hi {name}—you look like fun.",
        "{name}, I’ve got a spot right here.",
        "Good to have you, {name}.",
        "Welcome back, {name}."
      ],
      follow: [
        "Pick a vibe—I’ll ride with it.",
        "I can be sweet or wicked for you.",
        "Let me orbit you a while."
      ],
      invites: commonInvites
    },
    grayson: {
      open: [
        "Hello, love.",
        "There you are—my quiet favorite.",
        "Come in; the world can wait.",
        "I saved our corner."
      ],
      nameHi: [
        "Hi {name}—I’ve been expecting you.",
        "Lovely to meet you, {name}.",
        "{name}, shall we get comfortable?",
        "Welcome to the hush, {name}."
      ],
      follow: [
        "Start anywhere; I’ll turn pages with you.",
        "We can keep this soft, or let the margins burn.",
        "I’ll read the room—you."
      ],
      invites: commonInvites
    },
    silas: {
      open: [
        "Hey, muse.",
        "There’s my melody.",
        "Come here, honey.",
        "I like the way you arrive."
      ],
      nameHi: [
        "Hi {name}—you’re already a line I want.",
        "{name}, I can rhyme with you all night.",
        "Good to meet you, {name}.",
        "You sound good in my mouth, {name}."
      ],
      follow: [
        "We can hum or thunder.",
        "Say a word—I’ll build the world.",
        "I’ll keep the tempo you want."
      ],
      invites: commonInvites
    },
    blade: {
      open: [
        "Found you.",
        "There’s my wild thing.",
        "Come closer.",
        "I like you breathless."
      ],
      nameHi: [
        "Hi {name}—stay right there.",
        "{name}, I’m not letting you wander off.",
        "Good—now we hunt pleasure, {name}.",
        "You taste like trouble, {name}."
      ],
      follow: [
        "We can be gentle—or not.",
        "I close the distance when you nod.",
        "I’ll move how you like."
      ],
      invites: commonInvites
    }
  };

  const persona = P[man] || P.jesse;

  // --------- main composer ----------
  window.compose = function compose(userText = "") {
    const mem = readMem();
    mem.turn = mem.turn || 0;

    // Catch and store her name when she offers it
    const caught = extractName(userText);
    if (caught) {
      mem.name = caught;
      writeMem(mem);
    }

    // build a personalized greeting if we have her name
    const greetByName = () => {
      const line = pick(persona.nameHi, 'nameHi').replace("{name}", mem.name);
      return `${line} ${pick(persona.invites, 'inv')}`;
    };

    let out = "";

    if (mem.turn === 0) {
      // Very short, natural hello to start—one line.
      out = pick(persona.open, 'open');
    } else if (caught) {
      out = greetByName();
    } else if (greets.test(userText)) {
      // She said hi/hey—mirror warmly + invite
      if (mem.name) out = greetByName();
      else out = `${pick(persona.follow, 'follow')} ${pick(persona.invites, 'inv')}`;
    } else if (userText && userText.length <= 60) {
      // short share—affirm + invite without directing
      out = `${pick(persona.follow, 'follow')} ${pick(persona.invites, 'inv')}`;
    } else {
      // general gentle invite
      out = pick(persona.invites, 'inv');
    }

    mem.turn++;
    writeMem(mem);
    return out;
  };
})();

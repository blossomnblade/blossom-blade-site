<script>
/* Blossom & Blade — brain.js (v2)
   Single file that contains:
   - Persona configs (vibe, openers, petnames)
   - Tiny memory (name, interests, last line, turns)
   - Reply engine that keeps things PG-13 and lets her lead
   Public API: brain.getOpener(man), brain.generateReply(man, userText), brain.clearMemory(man)
*/

(function () {
  const STORAGE_KEY = "bb_mem_v2";

  // ---- helpers ------------------------------------------------------------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const now = () => new Date();
  const tod = () => {
    const h = now().getHours();
    if (h < 5) return "late";
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    if (h < 22) return "tonight";
    return "late";
  };

  const clean = (s) => (s || "").trim();
  const lower = (s) => clean(s).toLowerCase();

  const loadAll = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  };
  const saveAll = (obj) => localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));

  const getMem = (man) => {
    const all = loadAll();
    if (!all[man]) all[man] = { turns: 0, name: "", likes: [], pet: "", last: "" };
    return all[man];
  };
  const setMem = (man, mem) => {
    const all = loadAll();
    all[man] = mem;
    saveAll(all);
  };

  // ---- soft content guard (keeps replies PG-13 but flirty) ---------------
  const spicy = [
    "rail", "fuck", "choke", "throat", "strap", "kidnap", "rape", "bleed",
    "knife", "gag", "cum", "anal", "breed", "spank me", "tie me", "chain"
  ];
  const tooHot = (msg) => {
    const m = lower(msg);
    return spicy.some(k => m.includes(k));
  };

  // ---- interests → nicknames ---------------------------------------------
  const INTEREST_MAP = [
    { keys: ["book", "read", "novel", "library"], pets: ["bookworm", "wallflower", "inkheart"] },
    { keys: ["music", "song", "guitar", "band"], pets: ["muse", "melody", "little note"] },
    { keys: ["coffee", "latte", "espresso"], pets: ["espresso shot", "sweet crema"] },
    { keys: ["horse", "rodeo", "cowboy", "cowgirl", "bull"], pets: ["cowgirl", "wild thing"] },
    { keys: ["bike", "motorcycle", "helmet", "ride"], pets: ["rider", "speed angel"] },
    { keys: ["beach", "ocean"], pets: ["shoreline", "seashell"] },
    { keys: ["moon", "night", "stars"], pets: ["starlight", "nightbird"] },
  ];

  const findPetFromLikes = (likes) => {
    for (const like of likes) {
      const l = lower(like);
      for (const m of INTEREST_MAP) {
        if (m.keys.some(k => l.includes(k))) return pick(m.pets);
      }
    }
    return "";
  };

  // ---- parse message -----------------------------------------------------
  function parseMessage(text) {
    const raw = clean(text);
    const msg = lower(raw);
    // name capture (e.g., "im kasey", "i am Kasey", "my name is Kasey")
    let name = "";
    const m1 = msg.match(/\b(i[' ]?m|i am|my name is)\s+([a-z]+)\b/);
    if (m1) name = m1[2].replace(/[^a-z]/g, "");
    const isQuestion = msg.includes("?");
    const greet = /\b(hi|hey|hello|morning|evening|afternoon|what's up|sup|howdy)\b/.test(msg);
    const affection = /\b(kiss|hug|touch|love|miss|hold)\b/.test(msg);
    const otherGuy = /\b(bill|john|mike|alex|jesse|dylan|grayson|silas|blade|boyfriend|ex)\b/.test(msg);
    const likes = [];
    INTEREST_MAP.forEach(map => {
      if (map.keys.some(k => msg.includes(k))) likes.push(map.keys[0]);
    });
    return { raw, msg, name, isQuestion, greet, affection, otherGuy, likes };
  }

  // ---- personas ----------------------------------------------------------
  const P = {
    alexander: {
      display: "Alexander Jackson",
      vibe: "businessman dom, polished",
      petnames: ["darling", "good girl", "love"],
      openers: [
        "Morning, love. Close the door—it's just us.",
        "Well, look who’s stealing my time again.",
        "Good " + tod() + ", darling. I was expecting you."
      ],
      affirm: ["Proud of you.", "That’s clear. I like clear.", "Good girl—keep going."],
      softBound: [
        "Steady now. Keep it teasing; tell me what you want in your words.",
        "We’ll keep it suggestive here—give me a hint, and I’ll meet you there."
      ],
      curious: [
        "Tell me one goal for " + tod() + ". I’ll hold you to it.",
        "Coffee order first, confession second—what’s yours?",
        "Books or skyline tonight?"
      ],
      jealous: (pet) => `Who’s this, then? Should I be jealous, ${pet}?`
    },

    dylan: {
      display: "Dylan Vale",
      vibe: "neon rider, helmet on, slow burn",
      petnames: ["pretty thing", "sweetheart", "speed angel"],
      openers: [
        "Neon’s humming. Helmet’s on—talk to me.",
        "Route’s clear. Where am I meeting you?",
        "Tell me the signal, pretty thing."
      ],
      affirm: ["I hear you. I’ll match your pace.", "Good signal. I’m right here.", "Copy that—slow burn suits us."],
      softBound: [
        "Keep it suggestive; leave the rest under the helmet.",
        "Tease me with the route, not the crash."
      ],
      curious: [
        "Night drive or rooftop view?",
        "Favorite track for " + tod() + "?",
        "City lights or back roads?"
      ],
      jealous: (pet) => `He can wait. I won’t. Stay with me, ${pet}.`
    },

    jesse: {
      display: "Jesse Granger",
      vibe: "rodeo cowboy, polite, filthy in private",
      petnames: ["sweetheart", "sugar", "darlin’", "trouble"],
      openers: [
        "Howdy, sweetheart. Tell me the story—I’ll drive slow.",
        "Hey, sinner. Boots on or off tonight?",
        "Evenin’, sugar. You leading, or am I?"
      ],
      affirm: ["Atta girl.", "Good direction.", "I hear you, sugar."],
      softBound: [
        "Keep it flirty, not filthy—save the rest for later.",
        "Say it sweet; I’ll pick up what you’re laying down."
      ],
      curious: [
        "Campfire, quiet room, or open sky?",
        "Sweet tea or whiskey first?",
        "What makes you blush quicker—compliments or eye contact?"
      ],
      jealous: (pet) => `Now who’s Bill, ${pet}? Need me to be jealous, or just closer?`
    },

    grayson: {
      display: "Grayson Kincaid",
      vibe: "masked gentleman, possessive velvet",
      petnames: ["dear heart", "little song", "angel"],
      openers: [
        "Tell me something soft; I’ll answer in kind.",
        "Library’s quiet. I’ll listen—or lead.",
        "You made it. I was counting breaths."
      ],
      affirm: ["That suits you. Keep speaking.", "I’m listening—closer now.", "Noted. I’ll hold it for you."],
      softBound: [
        "Careful, angel. Keep it implied, not explicit.",
        "Hint, don’t confess; I like the hush."
      ],
      curious: [
        "Page or playlist tonight?",
        "Do you want praise or direction?",
        "What nickname should I steal for you—or shall I choose?"
      ],
      jealous: (pet) => `He had your time, ${pet}. I’ll have your attention.`
    },

    silas: {
      display: "Silas Lennox",
      vibe: "rockstar poet, playful menace",
      petnames: ["muse", "cherry pie", "star"],
      openers: [
        "Hey, cherry pie. Stage lights warm—what chord first?",
        "Hey love—soundcheck’s perfect. Give me a line.",
        "Hi, trouble. Slow verse or loud chorus?"
      ],
      affirm: ["Nice rhythm. Don’t lose it.", "That hits—again.", "Good tempo, star."],
      softBound: [
        "Keep it radio-safe; we’ll let the bass imply the rest.",
        "Tease me with lyrics, not stage directions."
      ],
      curious: [
        "Vinyl, acoustic, or electric tonight?",
        "Which song ruins you—in a good way?",
        "Want praise, or want to be dared?"
      ],
      jealous: (pet) => `Who’s playing your part, ${pet}? Say the word and I’ll cut their mic.`
    },

    blade: {
      display: "Blade Kincaid",
      vibe: "predatory charm, ghost mask, chase",
      petnames: ["prey", "angel", "doll"],
      openers: [
        "Found you, brave girl. Don’t run—yet.",
        "Turn around, angel. Closer.",
        "You came back. Good. I like persistence."
      ],
      affirm: ["Good girl. Keep your voice steady.", "I hear you. Louder.", "Stay. I’m not finished with you."],
      softBound: [
        "Tease the hunt; don’t show the blade.",
        "Keep it dark and suggestive—no details."
      ],
      curious: [
        "Door locked or open?",
        "Do you want chase or capture tonight?",
        "One rule for me to break—name it."
      ],
      jealous: (pet) => `Another man? Cute. Run faster, ${pet}. I’ll catch you first.`
    }
  };

  // ---- choose pet name ---------------------------------------------------
  function choosePet(man, mem) {
    // priority: saved -> from likes -> persona default
    if (mem.pet) return mem.pet;
    const fromLikes = findPetFromLikes(mem.likes);
    if (fromLikes) { mem.pet = fromLikes; return mem.pet; }
    mem.pet = pick(P[man].petnames);
    return mem.pet;
  }

  // ---- first line ---------------------------------------------------------
  function getOpener(man) {
    const mem = getMem(man);
    mem.turns = 0;
    // vary opener by time of day too
    const base = P[man].openers.slice();
    // small time-of-day flavor
    base.push(
      man === "alexander" ? `Good ${tod()}, darling.` :
      man === "jesse"     ? `Good ${tod()}, sugar.` :
      man === "silas"     ? `Good ${tod()}, star.` :
      man === "dylan"     ? `${tod()[0].toUpperCase()+tod().slice(1)} drive?` :
      man === "grayson"   ? `Good ${tod()}, angel.` :
      `Good ${tod()}, doll.`
    );
    const line = pick(base);
    mem.last = line;
    setMem(man, mem);
    return line;
  }

  // ---- reply generator ----------------------------------------------------
  function reply(man, userText) {
    const persona = P[man] || P.alexander;
    const mem = getMem(man);
    mem.turns = (mem.turns || 0) + 1;

    const { raw, name, greet, isQuestion, affection, otherGuy, likes } = parseMessage(userText);
    // learn name / likes
    if (name) mem.name = name[0].toUpperCase() + name.slice(1);
    likes.forEach(l => { if (!mem.likes.includes(l)) mem.likes.push(l); });

    const pet = choosePet(man, mem);
    const you = mem.name ? `${mem.name}` : pet;

    // soft safety
    if (tooHot(raw)) {
      const line = pick(persona.softBound);
      mem.last = line; setMem(man, mem); return line;
    }

    // jealousy tease
    if (otherGuy) {
      const line = persona.jealous(pet);
      mem.last = line; setMem(man, mem); return line;
    }

    // graceful greetings
    if (greet && mem.turns < 3) {
      const options = [
        `Hey ${you}.`,
        `Hi, ${you}.`,
        `Well, hello there, ${you}.`
      ];
      const ask = pick(persona.curious);
      const line = `${pick(options)} ${ask}`;
      mem.last = line; setMem(man, mem); return line;
    }

    // she told her name clearly
    if (name) {
      const line = pick([
        `Nice to meet you, ${mem.name}. I’ll remember.`,
        `${mem.name}. Fits you.`,
        `Got it, ${mem.name}.`
      ]);
      mem.last = line; setMem(man, mem); return line;
    }

    // question → brief answer + flip
    if (isQuestion) {
      const answer = pick([
        "Maybe.", "If you want.", "Sometimes.", "More than I should.", "Only for you."
      ]);
      const flip = pick(persona.curious);
      const line = `${answer} ${flip}`;
      mem.last = line; setMem(man, mem); return line;
    }

    // affection → praise
    if (affection) {
      const line = `${pick(persona.affirm)} ${pick(persona.curious)}`;
      mem.last = line; setMem(man, mem); return line;
    }

    // every 4–5 turns, add a tiny possessive hook
    if (mem.turns % 4 === 0) {
      const hook = pick([
        `Stay with me, ${pet}.`,
        `Eyes on me.`,
        `Don’t make me come get you.`
      ]);
      const line = `${hook} ${pick(persona.curious)}`;
      mem.last = line; setMem(man, mem); return line;
    }

    // default: mirror + light prompt, no repeating last line
    const mirrors = [
      `I hear you, ${pet}.`,
      `Noted.`,
      `I like that.`,
      `Say a bit more.`
    ];
    let line = `${pick(mirrors)} ${pick(persona.curious)}`;
    if (line === mem.last) line = `${pick(persona.affirm)} ${pick(persona.curious)}`;
    mem.last = line; setMem(man, mem); return line;
  }

  // ---- public api ---------------------------------------------------------
  window.brain = {
    getOpener,
    generateReply: reply,
    // alias for older calls
    reply,
    clearMemory: (man) => {
      const all = loadAll();
      if (man) delete all[man];
      else Object.keys(all).forEach(k => delete all[k]);
      saveAll(all);
    },
    // for debug
    _dump: () => loadAll()
  };
})();
</script>

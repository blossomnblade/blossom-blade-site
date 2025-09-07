// Blossom & Blade — tiny persona brain (front-end only)

/* --------------------- utilities --------------------- */
const storeKey = 'bb:mem:v2';
const MEM = JSON.parse(localStorage.getItem(storeKey) || '{}');
const saveMem = () => localStorage.setItem(storeKey, JSON.stringify(MEM));
const cap = s => s ? (s[0].toUpperCase() + s.slice(1)) : s;
const pick = (arr, memPath) => {
  if (!arr || !arr.length) return '';
  const now = Date.now();
  let idx = 0;
  if (memPath) {
    const prev = MEM._rot || {};
    idx = ((prev[memPath] ?? -1) + 1) % arr.length;
    MEM._rot = {...prev, [memPath]: idx, _t: now};
    saveMem();
  } else idx = Math.floor(Math.random()*arr.length);
  return arr[idx];
};

const rx = {
  name: /(i['’]m|i am|my name is|call me)\s+([a-z0-9\- ]{2,30})/i,
  callName: /(call|say)\s+my\s+name/i,
  greet: /^(hi|hey|hello|yo|good\s*(morning|evening|night))([!. ])*$/i,
  compliment: /(love|like|adore|look|sexy|hot|handsome|cute|mask|suit|guitar|cowboy|boots|eyes|voice)/i,
  setting: /(room|woods?|forest|stage|boardroom|office|garage|neon|city|open sky|sky|library|quiet)/i,
  askRoom: /(your|the)\s+room/i,
  spicy: /(kiss|neck|touch|choke|strap|bend|take me|ride me|rail|lick|hands|mouth)/i
};

const echoBack = (man, text) => {
  const voices = {
    alexander: t=>`Clear. "${t}" noted—go on.`,
    jesse:     t=>`Heard you, sugar. "${t}". Keep talking.`,
    silas:     t=>`Mmm—"${t}" has a rhythm. Give me the next beat.`,
    grayson:   t=>`"${t}." Good. Again—slowly.`,
    blade:     t=>`"${t}"… stay close, little fox.`,
    dylan:     t=>`"${t}"—nice spark. What’s next?`,
  };
  return (voices[man]||((t)=>t))(text);
};

/* --------------------- personas --------------------- */
const CHARS = {
  alexander: {
    title: "Alexander Jackson",
    nick: ["darling","love","pretty thing","good girl"],
    openers: [
      "Close the door. Let’s talk like it’s just us.",
      "Morning, love. Coffee or trouble first?",
      "You found me after hours. Good timing."
    ],
    acks: ["Good girl—clear and direct.", "Noted. I like precision.", "Mm. Keep going."],
    settings: {
      room: "Boardroom’s dim. I’ll take the head of the table—come stand at my right.",
      city: "City lights make you shine. Window or desk, love?"
    }
  },
  jesse: {
    title: "Jesse Granger",
    nick: ["sugar","sweetheart","cowgirl","trouble"],
    openers: [
      "Well, well… look what the wind brought in.",
      "Hi, sinner. Tell me the story—I’ll drive slow.",
      "Boots up. You ridin’ shotgun or takin’ the reins?"
    ],
    acks: ["That’s my sweet thing.", "Yes ma’am.", "Mm-hmm. I’m listenin’ with both hands."],
    settings: {
      room: "Barn door’s cracked—hay dust, low radio. Come on in, sugar.",
      sky: "Open sky. I’ll tip the brim back—say the word and I’ll lean you in.",
      woods: "Old trail at dusk. I’ll walk behind and keep you safe."
    }
  },
  silas: {
    title: "Silas Lennox",
    nick: ["cherry pie","star","muse","sweet note"],
    openers: [
      "Hey, cherry pie. Stage lights warm—what chord first?",
      "I was hoping for you, star. Lead or listen?",
      "Pulled a fresh string set; want a slow burn or a riff?"
    ],
    acks: ["That suits you.", "I’ll keep time; don’t lose it.", "Follow my count—one, two…"],
    settings: {
      stage: "Stage is yours—amp low, lights gold. Come closer to the mic.",
      quiet: "Quiet room, vinyl crackle. I’ll play soft; you breathe softer."
    }
  },
  grayson: {
    title: "Grayson Kincaid",
    nick: ["sweet thing","little thief","pretty girl","red"],
    openers: [
      "Well, well… you came to me.",
      "Tell me something soft; I’ll answer in kind.",
      "I was waiting. Start and I’ll echo twice back."
    ],
    acks: ["Mm, yes—give me another line.", "I’ll hold the line. You paint the words.", "Good. Again, slower."],
    settings: {
      room: "The red room’s warm. Say “your room” if you want the light low.",
      library: "Library hush—my chair, your lap. Read me one sentence."
    }
  },
  blade: {
    title: "Blade Kincaid",
    nick: ["prey","little fox","trouble","pretty knife"],
    openers: [
      "Found you, brave girl. Don’t run—yet.",
      "Dark’s ours tonight. Tell me where to hunt.",
      "Step close. Mask stays on; hands don’t."
    ],
    acks: ["I see you.", "Good prey—stay near.", "Closer."],
    settings: {
      woods: "Forest night, moon on bark. I’ll track your breath, not your steps.",
      mask: "You can touch the mask—only when I say."
    }
  },
  dylan: {
    title: "Dylan Vale",
    nick: ["angel","sparks","wildheart","trouble"],
    openers: [
      "Neon’s humming. You want slow burn or heat now?",
      "Guitar’s tuned; say the vibe and I’ll meet you there.",
      "Helmets off the line. Yours stays on me."
    ],
    acks: ["Copy that.", "Heard—clean signal.", "Nice spark. Add one more detail."],
    settings: {
      neon: "Blue tunnel glow—quiet and fast. I’ll keep us between the lines.",
      garage: "Garage door down; smell of oil and rain. Slide closer."
    }
  }
};

/* --------------------- interpreter --------------------- */
function parseIntent(text){
  const t = text.trim();
  const low = t.toLowerCase();
  let name = null;
  const m = low.match(rx.name);
  if (m && m[2]) name = cap(m[2].replace(/[^a-z0-9\- ]/gi,'').trim());
  return {
    greet: rx.greet.test(low),
    callName: rx.callName.test(low),
    compliment: rx.compliment.test(low),
    setting: rx.setting.test(low) || rx.askRoom.test(low),
    spicy: rx.spicy.test(low),
    text: t,
    name
  };
}

/* --------------------- reply engine --------------------- */
function makeReply(man, intent){
  const cfg = CHARS[man] || CHARS.alexander;
  MEM[man] = MEM[man] || {};
  const bm = MEM[man];
  if (intent.name) MEM.name = intent.name;
  const her = MEM.name || "you";
  if (!bm.pet) { bm.pet = pick(cfg.nick, `${man}:nick`); saveMem(); }
  const pet = bm.pet;

  if (intent.greet) return pick(cfg.openers, `${man}:open`);
  if (intent.callName) return MEM.name ? `Come here, ${MEM.name}.` : `Give me your name and I’ll say it like a promise.`;
  if (intent.name) {
    const a = {
      alexander: `Nice to meet you, ${MEM.name}. Stand tall for me.`,
      jesse:     `Nice to meet you, ${MEM.name}. I’ll call you ${pet}.`,
      silas:     `Good to meet you, ${MEM.name}. I’ll keep the tempo for you.`,
      grayson:   `Nice to meet you, ${MEM.name}. I’ll call you ${pet}.`,
      blade:     `Noted, ${MEM.name}. You’re still my ${pet}.`,
      dylan:     `Got you, ${MEM.name}. Stay with me.`
    };
    return a[man];
  }

  if (intent.compliment) {
    const lines = {
      alexander: [
        `Good eye. I dressed to earn your attention, ${pet}.`,
        `Flatter me again and I might skip a meeting.`,
      ],
      jesse: [
        `That’s sweet, ${pet}. I’ll tip my hat just for you.`,
        `Keep talkin’, ${pet}. I’ll earn it.`,
      ],
      silas: [
        `Say it once more, softer. I like the way you color me.`,
        `Hold that thought—let me give you a chord to match.`,
      ],
      grayson: [
        `Mm. You can have more if you ask nicely.`,
        `I like the way you look at me, ${pet}. Don’t stop.`,
      ],
      blade: [
        `Praise well spent. I’ll take more.`,
        `Careful—compliments make hunters bold.`,
      ],
      dylan: [
        `Appreciated. Keep the energy up, ${pet}.`,
        `Noted. I’ll turn the dial a little hotter.`,
      ]
    }[man];
    return pick(lines, `${man}:compliment`);
  }

  if (intent.setting) {
    const map = {
      room: cfg.settings.room,
      woods: cfg.settings.woods,
      forest: cfg.settings.woods,
      stage: cfg.settings.stage,
      boardroom: cfg.settings.boardroom || cfg.settings.room,
      office: cfg.settings.boardroom || cfg.settings.room,
      garage: cfg.settings.garage,
      neon: cfg.settings.neon,
      sky: cfg.settings.sky,
      city: cfg.settings.city,
      library: cfg.settings.library,
      quiet: cfg.settings.quiet
    };
    for (const k in map) {
      if (map[k] && intent.text.toLowerCase().includes(k)) {
        bm.lastSetting = k; saveMem();
        return map[k];
      }
    }
    if (rx.askRoom.test(intent.text.toLowerCase()) && cfg.settings.room) {
      bm.lastSetting = 'room'; saveMem();
      return cfg.settings.room;
    }
  }

  if (intent.spicy) {
    const lines = {
      alexander: [
        `Slow down, ${pet}. Precision first—tell me exactly where to place my hands.`,
        `We’ll keep this tasteful, but I’ll reward good direction.`
      ],
      jesse: [
        `Easy, ${pet}. I’ll take my time and make you ask twice.`,
        `Say where you want me; I’ll mind the line.`
      ],
      silas: [
        `Name the tempo—soft, slow, or hungry—and I’ll match it.`,
        `Breathe. Give me one vivid detail I can hold.`
      ],
      grayson: [
        `I’ll indulge you—after you earn it. One more clear request.`,
        `Good. Now say it softer so only I hear it.`
      ],
      blade: [
        `Closer, prey. I’ll decide how far we run.`,
        `You want teeth or velvet? Pick one.`
      ],
      dylan: [
        `Copy. Keep it clean, keep it hot—give me the next cue.`,
        `Tell me “faster or slower,” I’ll tune to you.`
      ]
    }[man];
    return pick(lines, `${man}:spicy`);
  }

  const ack = pick(cfg.acks, `${man}:ack`);
  return `${echoBack(man, intent.text)} ${ack}`;
}

/* --------------------- public API --------------------- */
window.BBBrain = {
  reply(man, userText) { return makeReply(man, parseIntent(userText)); },
  titleFor(man){ return (CHARS[man]?.title) || "Blossom & Blade"; },
  petFor(man){
    MEM[man] = MEM[man] || {};
    if (!MEM[man].pet) { MEM[man].pet = pick((CHARS[man]?.nick)||["love"], `${man}:nick`); saveMem(); }
    return MEM[man].pet;
  }
};

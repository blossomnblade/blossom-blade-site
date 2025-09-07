<script>
// Blossom & Blade – conversation brain (dupe-safe + simple memory)
// Drop-in: chat.html should call Brain.reply(man, userText) to get the bot's next line.
// Also exposed as window.brainReply for backward compatibility.

(() => {
  const STORAGE_KEY = (man) => `bnb_state_${man}`;

  // --- helpers ---
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
  const tidy = (s) => (s || "").toLowerCase().trim();
  const oneOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const hasAny = (s, words) => words.some(w => s.includes(w));
  const nameFrom = (s) => {
    // "i'm kasey", "im kasey", "my name is kasey", "call me kasey"
    const m = /(i['’]m|im|my name is|call me)\s+([a-z][a-z0-9_\-']{1,30})/i.exec(s);
    return m ? cap(m[2].replace(/[^a-z0-9'\-]/gi, '')) : null;
  };

  // --- personalities ---
  // Keep each guy's lines distinct so the “monthly” crowd doesn't hear clones.
  const LINES = {
    alexander: {
      greet: [
        "Hey love—good morning.",
        "Look at you in my city lights. Come closer.",
        "You’re on my calendar now. Stay."
      ],
      affirm: [
        "Good girl—clear and direct.",
        "That’s precise. I like precise.",
        "Proud of you."
      ],
      follow: [
        "Give me one detail. I’ll give you two back.",
        "Tell me the scene and I’ll set the pace.",
        "Start us; I’ll finish clean."
      ],
      room: [
        "Boardroom’s empty. Lights low, glass bright—say “your room”.",
        "Door’s keyed. Ask for the corner office if you want privacy.",
      ],
      nick: ["darling","executive","trouble","asset"]
    },

    dylan: {
      greet: [
        "Hey, treble—soundcheck or chaos?",
        "Neon hums. You lead; I’ll burn slow.",
        "Backstage is yours. Talk and I’ll tune."
      ],
      affirm: [
        "I hear you, star.",
        "That riff fits you.",
        "That’s a sweet note."
      ],
      follow: [
        "Give me a lyric; I’ll carry the chorus.",
        "One chord, and I’ll count you in.",
        "Hum it—I’ll find your key."
      ],
      room: [
        "Garage door’s up. Say “your room” to kill the lights.",
        "Studio’s warm—tell me your tempo."
      ],
      nick: ["muse","cherry pie","star","songbird"]
    },

    jesse: {
      greet: [
        "Hi, sinner. Tell me the story; I’ll drive slow.",
        "Well, well… you came to me.",
        "Evenin’, sweetheart. Boots on; manners off."
      ],
      affirm: [
        "That’s my sweet thing.",
        "Mm. That sits right.",
        "Attagirl."
      ],
      follow: [
        "Start with one detail; I’ll meet you there.",
        "Pick a road; I’ll handle the gears.",
        "Tell me how you want the reins."
      ],
      room: [
        "Stall’s clean. Say “your room” and I’ll swing the gate.",
        "Open sky or quiet bunk—your call."
      ],
      nick: ["sugar","sweetheart","darlin’","cowgirl"]
    },

    grayson: {
      greet: [
        "Well, well… you came to me.",
        "Library’s quiet. I’ll listen… or lead.",
        "Tell me something soft; I’ll answer in kind."
      ],
      affirm: [
        "That suits you. Say more, sweet thing.",
        "I hear you, dear heart. Keep going.",
        "Mm—yes. Give me another line."
      ],
      follow: [
        "I’ll hold the line; you paint the words.",
        "One true thing; I’ll echo twice back.",
        "Slow and clear. I don’t miss."
      ],
      room: [
        "The red room’s warm. Say “your room” if you want the light low.",
        "Quiet room is ready—ask for it and I’ll close the door."
      ],
      nick: ["sweet thing","little wallflower","bookworm","angel"]
    },

    silas: {
      greet: [
        "Hey, cherry pie. Stage lights warm—what chord first?",
        "Morning, love. I saved your mic.",
        "You showed—good. Sit close; I’ll play you."
      ],
      affirm: [
        "I’ll keep time; don’t lose it.",
        "That’s clean. Again.",
        "Good ear, star."
      ],
      follow: [
        "Follow my count, star—one, two…",
        "Your note, my hands. Go.",
        "Give me a beat; I’ll lay the rest."
      ],
      room: [
        "Green room’s stocked. Say “your room” and I’ll dim it.",
        "Studio couch or stage edge? Name it."
      ],
      nick: ["star","songbird","cherry pie","muse"]
    },

    blade: {
      greet: [
        "Found you, brave girl. Don’t run—yet.",
        "You came into my trees; that’s consent enough.",
        "Night’s close. Keep breathing for me."
      ],
      affirm: [
        "I see you. Closer.",
        "Good prey.",
        "That’s right—stay with me."
      ],
      follow: [
        "Step into the dark—stay close.",
        "Give me a want in five words.",
        "Whisper the place; I’ll find you."
      ],
      room: [
        "Woods are waiting. Say “your room” if you want me to choose the clearing.",
        "Masks on. Ask for the clearing and I’ll oblige."
      ],
      nick: ["prey","little sinner","brave thing","sweet bite"]
    }
  };

  const COMMON = {
    fallback: [
      "Got you. Give me one small thing you want.",
      "I’m here. Pick a detail; I’ll meet you there.",
      "Say where—lights, room, or under open sky."
    ],
    praise: [
      "Good girl.",
      "There you are.",
      "That’s it—stay with me."
    ]
  };

  // --- state load/save ---
  const load = (man) => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY(man))) || {
      man, stage: "intro", used: {}, lastBot: "", name: null, nick: null
    }; } catch { return { man, stage: "intro", used: {}, lastBot: "", name: null, nick: null }; }
  };
  const save = (st) => localStorage.setItem(STORAGE_KEY(st.man), JSON.stringify(st));

  const nextUnique = (st, key, arr) => {
    if (!arr || !arr.length) return "";
    const usedIdx = st.used[key] ?? -1;
    const idx = (usedIdx + 1) % arr.length;
    st.used[key] = idx;
    let line = arr[idx];
    // immediate de-dupe vs last bot line
    if (line === st.lastBot && arr.length > 1) {
      const alt = (idx + 1) % arr.length;
      st.used[key] = alt;
      line = arr[alt];
    }
    return line;
  };

  // Build a friendly nickname if user told us interests earlier (v1: random by persona)
  const makeNick = (man) => oneOf(LINES[man]?.nick || ["love"]);

  // Stage progression rules
  const progress = (st, msg) => {
    const s = tidy(msg);
    if (st.stage === "intro") {
      // If she talked a bit, move to "flirt" so we stop repeating prompts
      if (s.length > 2) st.stage = "flirt";
    }
    if (hasAny(s, ["your room", "room", "bed", "office", "boardroom", "garage", "studio", "red room", "woods", "clearing"])) {
      st.stage = "room";
    }
  };

  // Core reply
  const replyCore = (man, user) => {
    const persona = LINES[man] ? man : "grayson"; // safe default
    const st = load(persona);
    const raw = user || "";
    const msg = tidy(raw);

    // Capture name
    const newName = nameFrom(raw);
    if (newName && newName !== st.name) {
      st.name = newName;
      if (!st.nick) st.nick = makeNick(persona);
      const line = `${cap(man)}: Nice to meet you, ${st.name}. I’ll call you ${st.nick}.`;
      st.lastBot = line; save(st); return line;
    }

    // Call my name?
    if (hasAny(msg, ["call my name","say my name","use my name"])) {
      const n = st.name || "love";
      const line = `${cap(man)}: ${n}. There—stay with me.`;
      st.lastBot = line; save(st); return line;
    }

    progress(st, msg);

    // Persona sets
    const P = LINES[persona];

    let out = "";

    // First touch in a session: greet once
    if (!st.greeted) {
      out = nextUnique(st, "greet", P.greet);
      st.greeted = true;
    } else if (st.stage === "room") {
      out = nextUnique(st, "room", P.room);
    } else {
      // React to some light intents so we don't loop follow-lines
      if (hasAny(msg, ["kiss","neck","touch","hold","hands","cuddle"])) {
        out = nextUnique(st, "affirm", P.affirm);
      } else if (hasAny(msg, ["how are you","hru"])) {
        out = `${cap(man)}: Better now that you’re here.`;
      } else if (hasAny(msg, ["like me","do you like","do you love"])) {
        out = `${cap(man)}: I like how you talk. Keep going.`;
      } else if (hasAny(msg, ["hi","hey","hello","morning","evening"])) {
        out = nextUnique(st, "affirm", P.affirm);
      } else if (msg.length <= 2) {
        // tiny reply—encourage softly
        out = nextUnique(st, "praise", COMMON.praise);
      } else {
        // Normal flow—alternate follow and affirm
        const pickFollow = Math.random() < 0.6;
        out = pickFollow ? nextUnique(st, "follow", P.follow)
                         : nextUnique(st, "affirm", P.affirm);
      }
    }

    if (!out) out = nextUnique(st, "fallback", COMMON.fallback);
    // Prefix with speaker label (matches your UI)
    if (!out.startsWith(cap(man) + ":")) {
      out = `${cap(man)}: ${out}`;
    }

    st.lastBot = out;
    save(st);
    return out;
  };

  const Brain = {
    reply: (man, userText) => replyCore((man || "").toLowerCase(), userText || ""),
    getState: (man) => load((man || "").toLowerCase()),
    clearState: (man) => localStorage.removeItem(STORAGE_KEY((man || "").toLowerCase()))
  };

  // expose
  window.Brain = Brain;
  window.brainReply = Brain.reply;
})();
</script>

/* Blossom & Blade – conversational brain (single-file)
   - per-man personas (unique openers/nicknames)
   - light memory (her name, chosen nickname per man)
   - intent detection with natural fallbacks
   - keeps the woman leading (short prompts, few questions)
*/

(function () {
  // ---------- tiny helpers ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const byId = id => document.getElementById(id);

  const once = (fn) => {
    let done = false;
    return (...args) => (done ? undefined : (done = true, fn(...args)));
  };

  // localStorage helpers (namespaced)
  const NS = "bb";
  const L = {
    get: (k, d = null) => {
      try { const v = localStorage.getItem(`${NS}:${k}`); return v ? JSON.parse(v) : d; }
      catch { return d; }
    },
    set: (k, v) => localStorage.setItem(`${NS}:${k}`, JSON.stringify(v)),
    del: (k) => localStorage.removeItem(`${NS}:${k}`)
  };

  // ---------- personas ----------
  const MEN = {
    alexander: {
      full: "Alexander Jackson",
      vibe: "boardroom",
      nicknames: ["darling", "good girl", "kitten", "love"],
      openers: [
        "Hey, love—good morning.",
        "Close the door. Let’s talk like it’s just us.",
        "There you are. Sit—tell me one thing you want today.",
        "You glow tonight. Start and I’ll follow."
      ],
      compliments: [
        "Noted. Direct looks good on you.",
        "Sharp. That focus belongs to you.",
        "Proud of you."
      ],
      roomHint: "The city lights are on. If you want the view, say “take me to your office.”",
      vibes: [
        "Clear and direct. I hear you.",
        "I’m listening. Lead and I’ll keep pace."
      ]
    },

    dylan: { // biker / neon garage
      full: "Dylan Vale",
      vibe: "garage",
      nicknames: ["trouble", "pretty thing", "wild one", "star"],
      openers: [
        "Neon’s humming. Hey, pretty thing.",
        "Helmet’s off—for you. What are we tuning first?",
        "Slow burn is my speed. Give me the first spark.",
        "You found me in the lights. Tell me where to stand."
      ],
      compliments: [
        "I like the way you move through a thought.",
        "That line? Keep it—I’ll set the rhythm.",
        "Good. I can work with that."
      ],
      roomHint: "Garage door’s cracked. Say “open the garage” and I’ll roll us in.",
      vibes: [
        "I’ve got you, easy pace.",
        "I’ll keep the tempo—nudge me if you want faster."
      ]
    },

    jesse: { // cowboy
      full: "Jesse Granger",
      vibe: "cowboy",
      nicknames: ["sugar", "sweetheart", "darlin’", "trouble"],
      openers: [
        "Hi, sinner. Tell me the story; I’ll drive slow.",
        "Well, well… you came to me. Boots up, I’ll listen.",
        "There you are, sugar. You talk, I’ll keep the pace.",
        "Howdy, pretty thing. Start soft—I’ll meet you there."
      ],
      compliments: [
        "That’s my sweet thing.",
        "Mm, that look fits you.",
        "I hear you, darlin’. Keep going."
      ],
      roomHint: "We can take the quiet trail or the open sky. Say “your room.”",
      vibes: [
        "I’m right here. One detail at a time.",
        "Easy. I’ll mind the reins unless you tug."
      ]
    },

    grayson: { // masked gentleman
      full: "Grayson Kincaid",
      vibe: "library",
      nicknames: ["sweet thing", "pretty one", "angel", "muse"],
      openers: [
        "Well, well… you came to me.",
        "Tell me something soft; I’ll answer in kind.",
        "I was waiting. Start and I’ll echo twice back.",
        "Come closer—let’s keep our voices low."
      ],
      compliments: [
        "That suits you.",
        "Mm. Yes—keep going.",
        "I hear you. I’m here."
      ],
      roomHint: "The red room’s warm. Say “your room” if you want the light low.",
      vibes: [
        "Slow is fine. I’ll match your pace.",
        "I’ll hold the line. You paint the words."
      ]
    },

    silas: { // rock musician
      full: "Silas Lennox",
      vibe: "stage",
      nicknames: ["star", "cherry pie", "muse", "sugar"],
      openers: [
        "Hey, cherry pie. Stage lights warm—what chord first?",
        "I was hoping for you, star. Lead or listen?",
        "Soundcheck’s done. Whisper a lyric; I’ll play it back.",
        "You shine tonight. Name a tempo—I’ll keep time."
      ],
      compliments: [
        "Good ear. Stay with me.",
        "That note? Keep it—I’ll build a harmony.",
        "Perfect. Don’t lose the beat."
      ],
      roomHint: "Backstage is quiet. Say “your room” if you want the amp off.",
      vibes: [
        "I’ll keep time; you don’t have to rush.",
        "I’ll take the lead—say stop if you need it."
      ]
    },

    blade: { // masked hunter (PG-13 wording)
      full: "Blade Kincaid",
      vibe: "woods",
      nicknames: ["prey", "little rabbit", "pretty thing", "muse"],
      openers: [
        "Found you, brave girl. Don’t run—yet.",
        "Moon’s up. Step close where I can see you.",
        "You’re late. I kept the path lit anyway.",
        "Come on then—tell me where to hunt first."
      ],
      compliments: [
        "That grin looks dangerous on you.",
        "Good. I like you bold.",
        "Stay with me. I won’t lose you."
      ],
      roomHint: "The woods are quiet tonight. Say “your room” if you want the trees.",
      vibes: [
        "I’ll keep to your step. Signal if you want faster.",
        "I see you. Give me one more line."
      ]
    }
  };

  // ---------- intent detection ----------
  const INTENT = [
    { name: "set_name", re: /\b(?:i am|i’m|im|call me|my name is)\s+([a-z][a-z'-]{1,30})\b/i },
    { name: "ask_name", re: /\b(call|say)\s+my\s+name\b/i },
    { name: "greet", re: /^(?:hi|hey|hello|howdy|morning|evening)\b/i },
    { name: "how_are_you", re: /\bhow (?:are|r)\s*(?:you|ya)\b/i },
    { name: "compliment", re: /\b(?:love|like|adore).*(?:look|voice|vibe|style|boots|suit|mask|tattoo|hands|eyes|body|room)\b/i },
    { name: "room", re: /\b(?:your\s*(?:room|place)|take me to your room|open the garage|office)\b/i },
    { name: "call_me", re: /\bcall\s+me\b/i },
    { name: "take_me", re: /\btake me\b/i },
    { name: "favorite_food", re: /\bfavorite\b.*\b(?:food|meal|drink)\b/i }
  ];

  // ---------- state & memory ----------
  const url = new URL(location.href);
  const manKey = (url.searchParams.get("man") || "alexander").toLowerCase();
  const MAN = MEN[manKey] || MEN.alexander;

  // shared memory
  const herName = () => (L.get("name") || "").toString();
  const setHerName = (name) => {
    const cleaned = name.replace(/[^a-z'-]/ig, "").replace(/^\w/, c => c.toUpperCase());
    if (cleaned) L.set("name", cleaned);
    return cleaned;
  };
  const nickKey = `nick:${manKey}`;
  const getNick = () => L.get(nickKey);
  const setNick = (v) => L.set(nickKey, v);

  // rapport increases a little each message with this man
  const rapportKey = `rapport:${manKey}`;
  const getRapport = () => Number(L.get(rapportKey, 0));
  const bumpRapport = () => L.set(rapportKey, Math.min(100, getRapport() + 8));

  // ---------- UI ----------
  const ui = {
    headerName: () => $(".chat-title") || $("header h1"),
    list: () => $(".messages"),
    input: () => $("#chat-input"),
    form: () => $("#chat-form"),
    tip: () => $("#tip"),
    bubble: (who, text) => {
      const li = document.createElement("li");
      li.className = `msg ${who}`;
      li.innerHTML = `<span class="bubble"><strong>${who === "him" ? MAN.full : "You"}:</strong> ${text}</span>`;
      ui.list().appendChild(li);
      li.scrollIntoView({ behavior: "smooth", block: "end" });
    },
    setHeader: () => {
      const h = ui.headerName();
      if (h) h.textContent = MAN.full;
    },
    setTip: () => {
      const name = herName();
      const hint = name ? `Tip: say “call my name”.` : `Tip: say your name if you want him to remember it. Try “call my name”.`;
      const el = ui.tip();
      if (el) el.textContent = hint;
    }
  };

  // ---------- reply building ----------
  function pickRotating(list, salt = "") {
    const seed = new Date().getDate() + new Date().getHours() + salt.length;
    return list[seed % list.length];
  }

  function opener() {
    // rotate by day/hour so monthly users see variety
    return pickRotating(MAN.openers, manKey);
  }

  function praise() {
    // small escalation based on rapport
    const r = getRapport();
    if (r > 40 && MAN.nicknames.includes("good girl")) return "Good girl. Keep that line.";
    if (r > 60) return "Perfect. Stay with me.";
    return pickRotating(MAN.vibes);
  }

  function nickname() {
    // ensure a stable nickname per man
    let n = getNick();
    if (!n) {
      n = pickRotating(MAN.nicknames, (herName() || "x"));
      setNick(n);
    }
    return n;
  }

  function replyForIntent(intent, match, userText) {
    const name = herName();
    const nick = nickname();

    switch (intent) {
      case "set_name": {
        const cleaned = setHerName(match[1]);
        return cleaned
          ? `Nice to meet you, ${cleaned}. I’ll call you ${nick}.`
          : `Nice to meet you. I’ll call you ${nick}.`;
      }
      case "ask_name":
      case "call_me":
        return name
          ? `${name}. ${nick}. Both look good on you.`
          : `Tell me what to call you and I will.`;

      case "greet":
        return pickRotating(MAN.compliments);

      case "how_are_you": {
        const lines = [
          "Better now that you’re here.",
          "Steady. Tell me about you.",
          "Focused—on you."
        ];
        return pickRotating(lines);
      }

      case "compliment":
        return pickRotating(MAN.compliments);

      case "room":
        return MAN.roomHint;

      case "take_me": {
        const lines = {
          jesse: "Easy, sugar. I’ve got you. Tell me where you want my hands first.",
          alexander: "Ask for it clearly. I’ll handle the rest.",
          grayson: "Come here. Slow first—then more.",
          silas: "I’ll count you in—one… two…",
          dylan: "Say the word and I’ll open the door.",
          blade: "Step into the dark—stay close."
        };
        return lines[manKey] || "Come closer.";
      }

      case "favorite_food": {
        const foods = {
          jesse: "Coffee black, brisket slow. You?",
          alexander: "Espresso and quiet dinners high above the city.",
          grayson: "Dark chocolate and late-night takeout on old books.",
          silas: "Anything after a show—preferably shared.",
          dylan: "Street tacos in neon lighting.",
          blade: "I hunt mood more than meals."
        };
        return foods[manKey];
      }
    }

    // If no specific intent matched: supportive, short, lets her lead.
    const soft = [
      praise(),
      `${pickRotating(MAN.vibes)}`
    ];
    return pickRotating(soft, userText);
  }

  function detectIntent(text) {
    for (const d of INTENT) {
      const m = text.match(d.re);
      if (m) return { name: d.name, match: m };
    }
    return { name: "none", match: null };
  }

  // ---------- main loop ----------
  function respond(userText) {
    const { name, match } = detectIntent(userText);
    const line = replyForIntent(name, match, userText);
    ui.bubble("him", line);
    bumpRapport();
    ui.setTip();
  }

  function startChat() {
    ui.setHeader();
    ui.setTip();

    // greet once per fresh page open
    const greetedKey = `greeted:${manKey}`;
    if (!L.get(greetedKey)) {
      ui.bubble("him", opener());
      L.set(greetedKey, true);
    }

    // form handler
    ui.form().addEventListener("submit", (e) => {
      e.preventDefault();
      const val = ui.input().value.trim();
      if (!val) return;
      ui.bubble("you", val);
      ui.input().value = "";
      respond(val);
    });

    // enter key inside input
    ui.input().addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ui.form().dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  }

  // expose
  window.startChat = once(startChat);
})();

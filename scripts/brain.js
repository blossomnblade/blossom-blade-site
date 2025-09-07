/* Blossom & Blade – conversation brain (no echo, no tips)
   - remembers her name + a per-man nickname
   - varied, persona-specific openers + acknowledgements
   - never repeats her words back verbatim
*/

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // ---- routing / state ----
  const params = new URLSearchParams(location.search);
  const man = (params.get("man") || "alexander").toLowerCase();

  const STORE_KEY = "bb_mem_v2";
  const mem = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  mem[man] = mem[man] || {};
  localStorage.setItem(STORE_KEY, JSON.stringify(mem));

  // ---- personas ----
  const P = {
    alexander: {
      name: "Alexander Jackson",
      nickDefault: "darling",
      greet: [
        "Hey love—good morning.",
        "Close the door. Let’s talk like it’s just us.",
        "Good timing. I was thinking about you."
      ],
      ack: [
        "Clear and direct. I like that.",
        "I hear you. Keep going.",
        "Mm. I can work with that—tell me more."
      ],
      praise: ["Good girl.", "Smart girl.", "That’s my pace."]
    },
    dylan: {
      name: "Dylan Vale",
      nickDefault: "star",
      greet: [
        "Neon’s humming. You want slow burn or heat now?",
        "Hey trouble—hands in mine, eyes on me.",
        "Slide closer. I’ve got time for you."
      ],
      ack: [
        "Got it—stay with me.",
        "I hear you. Give me the next cue.",
        "Mm, noted. I’ll match your tempo."
      ],
      praise: ["That spark suits you.", "Good. Keep it hot."]
    },
    jesse: {
      name: "Jesse Granger",
      nickDefault: "sugar",
      greet: [
        "Hi, sinner. Tell me the story; I’ll drive slow.",
        "Evenin’, sweetheart. Boots on, manners off?",
        "There you are, sugar. Ride with me."
      ],
      ack: [
        "That’s my sweet thing.",
        "Mm-hmm. I’m listening with both hands.",
        "Say it plain. I won’t miss a word."
      ],
      praise: ["Attagirl.", "Good girl.", "That’s it, sugar."]
    },
    grayson: {
      name: "Grayson Kincaid",
      nickDefault: "sweet thing",
      greet: [
        "Well, well… you came to me.",
        "Library’s quiet. I’ll listen—or lead.",
        "Tell me something soft; I’ll answer in kind."
      ],
      ack: [
        "That suits you. Say more.",
        "I hear you. Keep going.",
        "Mm, yes—don’t stop there."
      ],
      praise: ["Good girl.", "Pretty mouth on you."]
    },
    silas: {
      name: "Silas Lennox",
      nickDefault: "star",
      greet: [
        "Hey, cherry pie. Stage lights warm—what chord first?",
        "Backstage is ours. Whisper it in my ear.",
        "Hey love. I’ve got a melody for you."
      ],
      ack: [
        "I’ll keep time—don’t lose it.",
        "Follow my count—one, two…",
        "Nice hook. Give me the next bar."
      ],
      praise: ["Beautiful.", "That’s my muse."]
    },
    blade: {
      name: "Blade Kincaid",
      nickDefault: "prey",
      greet: [
        "Found you, brave girl. Don’t run—yet.",
        "Step into the dark—stay close.",
        "There you are. I see the tremble."
      ],
      ack: [
        "I see you. Give me one more line.",
        "Good. Closer.",
        "Mm. I like the shape of that. Continue."
      ],
      praise: ["Good girl.", "That’s my prey."]
    }
  };

  const persona = P[man] || P.alexander;

  // ---- helpers ----
  function loadName() {
    return mem.name || mem[man].herName || null;
  }
  function setName(n) {
    const clean = n.trim().replace(/[^\w\s'-]/g, "");
    if (!clean) return;
    mem.name = clean;
    mem[man].herName = clean;
    localStorage.setItem(STORE_KEY, JSON.stringify(mem));
  }
  function setNick(n) {
    mem[man].nick = n;
    localStorage.setItem(STORE_KEY, JSON.stringify(mem));
  }
  function herNick() {
    return mem[man].nick || persona.nickDefault;
  }

  function firstGreet() {
    const n = loadName();
    const base = rnd(persona.greet);
    return n ? base.replaceAll("{name}", n) : base;
  }

  // very small intent read (safe + local only)
  function detect(input) {
    const t = input.toLowerCase().trim();

    // name patterns
    const nameMatch =
      t.match(/\bi'?m\s+([a-z][a-z '-]{1,20})$/i) ||
      t.match(/\bmy\s+name\s+is\s+([a-z][a-z '-]{1,20})$/i);
    if (nameMatch) return { type: "setName", value: cap(nameMatch[1]) };

    if (/call\s+my\s+name/.test(t)) return { type: "callName" };

    if (/\b(slow|gentle|soft)\b/.test(t)) return { type: "pace", value: "slow" };
    if (/\b(hot|hard|fast|heat)\b/.test(t)) return { type: "pace", value: "fast" };

    if (/\b(room|your room)\b/.test(t)) return { type: "room" };

    return { type: "free", text: input.trim() };
  }

  function cap(s) {
    return s.replace(/\b([a-z])([a-z']*)/g, (_, a, b) => a.toUpperCase() + b);
  }

  // ---- reply engine (no echo) ----
  function reply(input) {
    const n = loadName();
    const d = detect(input);

    if (!mem[man].greeted) {
      mem[man].greeted = true;
      localStorage.setItem(STORE_KEY, JSON.stringify(mem));
      return firstGreet();
    }

    switch (d.type) {
      case "setName":
        setName(d.value);
        return `${persona.name.split(" ")[0]}: Nice to meet you, ${d.value}. I’ll call you ${herNick()}.`;

      case "callName":
        return n
          ? `${persona.name.split(" ")[0]}: ${n}. There—I like how it sounds on my tongue.`
          : `${persona.name.split(" ")[0]}: Tell me your name and I’ll use it.`;

      case "pace":
        if (man === "dylan") {
          return d.value === "slow"
            ? "Dylan Vale: Slow it is—hands steady, voice low. Keep talking."
            : "Dylan Vale: Heat now—close the gap for me.";
        }
        return rnd(persona.ack);

      case "room":
        if (man === "grayson") {
          return "Grayson Kincaid: The red room’s warm. Tell me when to dim the lights.";
        }
        if (man === "blade") {
          return "Blade Kincaid: Woods are quiet. I’ll lead—stay with me.";
        }
        return rnd(persona.ack);

      default:
        // free talk: acknowledge, encourage, maybe praise
        const lines = []
          .concat(persona.ack)
          .concat(Math.random() < 0.35 ? persona.praise : []);
        let out = rnd(lines);
        // personalize lightly
        if (Math.random() < 0.25 && loadName()) {
          out = out.replace(/(\.|!|$)/, `, ${loadName()}$1`);
        }
        return `${out}`;
    }
  }

  // ---- DOM wiring ----
  const log = $("#chatLog");
  const input = $("#chatInput");
  const btn = $("#sendBtn");
  const headerName = $("#manName");
  const body = document.body;

  // title/banner
  headerName.textContent = persona.name;

  function appendBubble(text, who = "man") {
    const li = document.createElement("div");
    li.className = who === "me" ? "bubble me" : "bubble him";
    li.innerText = text;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight + 999;
  }

  function sendNow() {
    const val = input.value.trim();
    if (!val) return;
    appendBubble(val, "me");
    input.value = "";
    const r = reply(val);
    setTimeout(() => appendBubble(r, "man"), clamp(250 + Math.random() * 400, 300, 850));
  }

  btn.addEventListener("click", sendNow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendNow();
    }
  });

  // auto-greet (first line) when log is empty
  if (!mem[man].welcomedOnce) {
    mem[man].welcomedOnce = true;
    localStorage.setItem(STORE_KEY, JSON.stringify(mem));
    setTimeout(() => appendBubble(firstGreet(), "man"), 250);
  }
})();

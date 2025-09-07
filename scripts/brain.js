/* Blossom & Blade – conversational brain (v2)
   - per-man personas with unique openers
   - light memory (name, nick, interests) in localStorage
   - gentle NLP for name & interest pickup
   - no repeated lines; rotates through sets
*/
(() => {
  const STORAGE_KEY = "bb_mem_v2";

  const cap = s => s ? s.replace(/^\s+|\s+$/g, "")
                        .toLowerCase()
                        .replace(/^[a-z]/, c => c.toUpperCase()) : s;

  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  };
  const save = (mem) => localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));

  const interestMatchers = [
    {key:"books",  re:/\b(book|books|read|reader|novel|poem|poetry|library|librar(y|ies)|author|page|write|writing)\b/i},
    {key:"music",  re:/\b(music|song|songs|guitar|band|melody|chord|stage|lyric|sing|setlist|amp)\b/i},
    {key:"cowboy", re:/\b(cowboy|cowgirl|boots?|rodeo|lasso|saddle|ranch|barn|spurs?)\b/i},
    {key:"city",   re:/\b(city|boardroom|office|deal|contract|suit|tie|power|elevator)\b/i},
    {key:"mask",   re:/\b(mask|chase|ghost|hunt|knife|killer|prey|run)\b/i},
    {key:"biker",  re:/\b(bike|biker|helmet|ride|motor|motorcycle|throttle|street|asphalt)\b/i}
  ];

  const baseNicks = {
    books : ["bookworm","wallflower","inkheart"],
    music : ["muse","melody","songbird","treble"],
    cowboy: ["sugar","darlin’","wildflower"],
    city  : ["darling","good girl","sweetheart"],
    mask  : ["little rabbit","trouble","prey"],
    biker : ["wild thing","speedster","trouble"]
  };

  const personas = {
    alexander: {
      display: "Alexander Jackson",
      style:  "city",
      greet: [
        "Hey love—good morning.",
        "Well well… there you are.",
        "Close the door. Let’s talk like it’s just us."
      ],
      acknowledge: ["Good girl—clear and direct.","I’m listening.","Proud of you."],
      follow: [
        "Tell me one thing about your day; I’ll answer in kind.",
        "What do you want from me today—comfort, focus, or a little heat?"
      ],
      stamps: ["darling","love","good girl"]
    },
    jesse: {
      display: "Jesse Granger",
      style:  "cowboy",
      greet: [
        "Hi, sinner. Tell me the story; I’ll drive slow.",
        "Evenin’, sugar. You talk, I’ll steer.",
        "Well, well… you came to me."
      ],
      acknowledge: ["That’s my sweet thing.","I hear you, darlin’.","I’m right here."],
      follow: [
        "Pick a setting: city lights, quiet room, or open sky.",
        "Start me with one detail and I’ll meet you there."
      ],
      stamps: ["sugar","darlin’","sweet thing"]
    },
    dylan: {
      display: "Dylan Vale",
      style:  "biker",
      greet: [
        "Neon’s on. Hop on, trouble.",
        "Hey you—helmet stays on, secrets stay ours.",
        "Found you. What pace tonight: idle, cruise, or redline?"
      ],
      acknowledge: ["Got it—stay with me.","I’m here; keep talking.","I hear the engine in your voice."],
      follow: [
        "Give me one small detail to build on—place, song, or mood.",
        "Tell me what you crave more of: speed, tease, or control."
      ],
      stamps: ["trouble","wild thing","love"]
    },
    grayson: {
      display: "Grayson Kincaid",
      style:  "city",
      greet: [
        "Well, well… you came to me.",
        "Tell me something soft; I’ll answer in kind.",
        "Door’s closed. Use your inside voice—just for me."
      ],
      acknowledge: ["Mm, yes—give me another line.","I hear you; keep going.","I was waiting."],
      follow: [
        "One truth for me; I’ll give you two back.",
        "Choose: gentle questions or firm direction?"
      ],
      stamps: ["sweets","love","little sinner"]
    },
    silas: {
      display: "Silas Lennox",
      style:  "music",
      greet: [
        "Hey, cherry pie. Stage lights warm—what chord first?",
        "Hey love—good morning.",
        "Backstage is open. Want lead or listen?"
      ],
      acknowledge: ["I’ll keep time; don’t lose it.","Understood—I’ll take the lead; say stop if you need it.","I hear the melody—more."],
      follow: [
        "Give me a mood and a place; I’ll write the first line.",
        "What’s the chorus you want tonight—slow burn or fast hook?"
      ],
      stamps: ["muse","star","cherry pie"]
    },
    blade: {
      display: "Blade Kincaid",
      style:  "mask",
      greet: [
        "Found you, brave girl. Don’t run—yet.",
        "Stay with me. What would make tonight easier?",
        "Look at me, little rabbit."
      ],
      acknowledge: ["I hear you, prey. More.","Good girl. Keep talking.","I’m here. Don’t look away."],
      follow: [
        "Tell me one rule you want… and one you want to break.",
        "Say where the chase starts—room, stairwell, or woods."
      ],
      stamps: ["prey","little rabbit","trouble"]
    }
  };

  // cycle helper that never repeats twice in a row
  function cycle(memNode, key, list) {
    if (!memNode._idx) memNode._idx = {};
    const last = memNode._idx[key] ?? -1;
    const next = (last + 1) % list.length;
    memNode._idx[key] = next;
    const line = list[next];
    return (line === memNode._last) ? list[(next + 1) % list.length] : line;
  }

  function detectName(text) {
    const m = /\b(i am|i'm|im|my name is)\s+([a-z][a-z' -]{1,20})\b/i.exec(text);
    return m ? cap(m[2].replace(/[^a-z' -]/gi,"")) : null;
  }

  function detectInterests(text) {
    const hits = [];
    for (const itm of interestMatchers) if (itm.re.test(text)) hits.push(itm.key);
    return hits;
  }

  function chooseNick(p, memNode, interests) {
    // persona-preferred set first, else any matched, else generic
    const all = [];
    if (baseNicks[p.style]) all.push(...baseNicks[p.style]);
    interests.forEach(k => baseNicks[k] && all.push(...baseNicks[k]));
    if (all.length === 0) all.push("love","sweetheart","angel","star");
    // deterministic but varied
    return cycle(memNode, "nick", all);
  }

  function answerSmallTalk(p, memNode, nameOrNick) {
    const lines = [
      `${cap(nameOrNick)}, I’m here. Tell me one small thing about you.`,
      `I’m listening, ${nameOrNick}. Start with the setting—city lights, quiet room, or open sky?`,
      `Got you, ${nameOrNick}. What do you want more of: comfort, tease, or control?`
    ];
    return cycle(memNode, "small", lines);
  }

  function sayName(memNode, name, stamps=[]) {
    // rotate affectionate stampers + name
    const tag = cycle(memNode, "stamp", stamps.length ? stamps : ["love","sweetheart","angel","star"]);
    return `${cap(name)}, ${tag}.`;
  }

  function craftReply(man, text, mem) {
    text = String(text || "");
    const m = personas[man] || personas.alexander; // safe default
    mem.all = mem.all || {};
    mem.per = mem.per || {};
    const node = (mem.per[man] = mem.per[man] || { stage:"intro" });

    // learn name
    const gotName = detectName(text);
    if (!mem.all.userName && gotName) {
      mem.all.userName = gotName;
      save(mem);
      return { reply: `Nice to meet you, ${gotName}.`, mem };
    }

    // pick interests / nickname
    const hits = detectInterests(text);
    if (hits.length && !node.nick) {
      node.nick = chooseNick(m, node, hits);
      node.stage = "warm";
      save(mem);
      return { reply: `Noted. I’ll call you ${node.nick}.`, mem };
    }

    // direct asks the bot to say her name/nick
    if (/\b(say|call)\s+my\s+name\b/i.test(text)) {
      const who = node.nick || mem.all.userName || "love";
      save(mem);
      return { reply: sayName(node, who, m.stamps), mem };
    }

    // “how are you” small talk
    if (/\b(how are you|how's it going|hru|how are u)\b/i.test(text)) {
      const who = node.nick || mem.all.userName || cycle(node, "stampAsk", m.stamps);
      save(mem);
      return { reply: answerSmallTalk(m, node, who), mem };
    }

    // steering words like "take me", "lead", "you tell me"
    if (/\b(take me|lead|you choose|you tell me|control)\b/i.test(text)) {
      node.stage = "warm";
      save(mem);
      return { reply: cycle(node, "follow", m.follow), mem };
    }

    // default stage handling
    if (node.stage === "intro") {
      node.stage = "warm";
      const who = node.nick || mem.all.userName || cycle(node, "stampIntro", m.stamps);
      save(mem);
      return { reply: cycle(node, "greet", m.greet).replace(/(^|\s)love\b/i, cap(who)), mem };
    }

    // conversation follow-ups
    if (/\?$/.test(text.trim())) {
      const who = node.nick || mem.all.userName || cycle(node,"stQ",m.stamps);
      save(mem);
      return { reply: `${cap(who)}, I’ll answer—and then you give me one back.`, mem };
    }

    // gentle acknowledgement + invite
    const ack = cycle(node, "ack", m.acknowledge);
    const invite = cycle(node, "follow2", m.follow);
    save(mem);
    return { reply: `${ack} ${invite}`, mem };
  }

  function reply(man, userText) {
    const mem = load();
    const { reply, mem: updated } = craftReply(man, userText, mem);
    save(updated);
    return reply;
  }

  // public API
  window.BB_BRAIN = {
    reply,
    readMemory: () => load(),
    resetMemory: () => localStorage.removeItem(STORAGE_KEY)
  };
})();

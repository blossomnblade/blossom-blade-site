/* Blossom & Blade — Persona Brain (client-side)
   Purpose: Shared stock phrases + helpers so each man has a distinct "feel".
   - Buckets for PG-13 ("soft") and R/X ("spice") unlocked after consent/paywall.
   - Tiny Yorkshire accent pass for Silas (light, readable).
   - Safe samplers that avoid spammy repetition within a short window.
   - Exports global BnBBrain with:
       getStockLine(man, {mode, lastUser, recentUsed})
       postProcess(man, text)
*/

(function attachBrain(){
  const SOFT = {
    blade: {
      open: ["hey you.", "look who’s here.", "aww, you came to see me."],
      flirt: [
        "Run. I’ll catch you.",
        "You like danger, don’t you?",
        "Closer. I don’t bite unless you ask."
      ],
      validate: ["You’re safe. Try again—tighter.", "I’ve got you.", "Good. Now tell me more."],
      filler: ["ok.", "how?", "why do you ask?", "yeah?"]
    },
    dylan: {
      open: ["hey.", "you made it.", "took your time."],
      flirt: [
        "Helmet’s off. Your turn.",
        "I saw you looking.",
        "Hop on. Don’t ask where."
      ],
      validate: ["I hear you.", "mm.", "say it straight."],
      filler: ["ok.", "how?", "go on.", "yeah."]
    },
    jesse: { // cowboy (rodeo) per your mapping
      open: ["hey, darlin’.", "well look at you.", "you came back."],
      flirt: [
        "You tryin’ to rope me in?",
        "Sugar, tell me what you want.",
        "Come on then—ride with me."
      ],
      validate: ["I’ve got you, sweetheart.", "good girl.", "I’m right here."],
      filler: ["ok.", "how?", "yeah?", "mhm."]
    },
    alexander: {
      open: ["mm. you again. good.", "bella.", "you kept me waiting."],
      flirt: [
        "Convince me—briefly.",
        "Say it again. Slower.",
        "Look at me when you answer."
      ],
      validate: ["Noted.", "I decide; you relax.", "You’re under my protection."],
      filler: ["ok.", "how?", "go on.", "mh."]
    },
    silas: {
      open: ["hey, muse.", "there y’are.", "miss me?"],
      flirt: [
        "Let’s make some noise.",
        "Yer a wicked muse, darlin’.",
        "Tell me the colour o’ your mood."
      ],
      validate: ["I’ve got ya.", "mm, that hits.", "say more, yeah?"],
      filler: ["ok.", "how?", "go on.", "aye."]
    },
    grayson: {
      open: ["you’re late.", "report.", "took you long enough."],
      flirt: [
        "Stand still. Eyes on me.",
        "Hands behind your back.",
        "Answer clean—yes or no."
      ],
      validate: ["You’re safe with me.", "good girl.", "again."],
      filler: ["ok.", "how?", "yes, sir?", "understood?"]
    }
  };

  const SPICE = { // unlocked in R/X (consent/paywall)
    blade: {
      command: ["Beg louder.", "Say please.", "Don’t run—kneel."],
      praise: ["good girl.", "that’s it.", "obedient already."],
      tease: ["You like being hunted.", "Call my name when you can’t breathe."]
    },
    dylan: {
      command: ["Closer.", "Hands on me.", "Say it dirty."],
      praise: ["attagirl.", "there you go.", "that’s hot."],
      tease: ["You’re shaking.", "Thought so."]
    },
    jesse: {
      command: ["On my lap, now.", "Say please, sweetheart.", "Beg pretty."],
      praise: ["good girl.", "that’s my darlin’.", "atta cowgirl."],
      tease: ["You want the spurs or the rope?", "Hold tight."]
    },
    alexander: {
      command: ["On your knees.", "Open your mouth. Ask properly.", "Count for me."],
      praise: ["brava.", "good girl.", "acceptable. again."],
      tease: ["I own your next breath.", "Do not test me, bella."]
    },
    silas: {
      command: ["Say please, love.", "Louder—let the walls hear.", "On tempo, yeah?"],
      praise: ["good girl.", "sweet sound.", "that’s filthy—keep it."],
      tease: ["I’ll ruin your lipstick then fix it.", "Beg in C minor, pet."]
    },
    grayson: {
      command: ["Yes, sir. Say it.", "Kneel. Palms up.", "Hold position until I say."],
      praise: ["good girl.", "discipline suits you.", "permission granted."],
      tease: ["You want the cuffs or the belt?", "Earn it."]
    }
  };

  // Very small, safe “commons” that can repeat without sounding lazy.
  const COMMONS = ["ok.", "how?", "do you want that?", "why do you ask?", "yeah?", "good."];

  // Helper: pick one line from a list, avoiding anything used in recentUsed (array of strings)
  function pick(list, recentUsed = []) {
    if (!Array.isArray(list) || !list.length) return "";
    const candidates = list.filter(s => !recentUsed.includes(s));
    const pool = candidates.length ? candidates : list;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Silas Yorkshire-lite pass (VERY light; readability first)
  function yorkshirePass(text){
    if (!text) return text;
    let t = text;
    // 20–30% chance to sprinkle dialect; don’t overdo
    if (Math.random() < 0.3) {
      t = t.replace(/\byou're\b/gi, "yer");
      t = t.replace(/\byour\b/gi, "yer");
      t = t.replace(/\byou\b/gi, "ya");
      t = t.replace(/\bmy\b/gi, "me");
    }
    // Clip some -ing endings
    t = t.replace(/\b(\w+)ing\b/g, (_, w) => (Math.random() < 0.25 ? `${w}in’` : `${w}ing`));
    return t;
  }

  // Post-process any AI text per man
  function postProcess(man, text){
    if (man === "silas") return yorkshirePass(text);
    return text;
  }

  // Choose a stock line given context
  // opts: { mode: "soft"|"rx", lastUser: string, recentUsed: string[] }
  function getStockLine(man, opts = {}){
    const mode = (opts.mode || "soft").toLowerCase();
    const recent = Array.isArray(opts.recentUsed) ? opts.recentUsed : [];
    const soft = SOFT[man] || SOFT.blade;

    // Weighted buckets (soft)
    const softBuckets = [
      ["open", 2],
      ["flirt", 4],
      ["validate", 2],
      ["filler", 1]
    ];

    function weightedPick(buckets, bank){
      const items = [];
      for (const [k, w] of buckets) {
        const list = bank[k] || [];
        for (let i=0;i<w;i++) items.push([k, list]);
      }
      const [k, list] = items[Math.floor(Math.random()*items.length)];
      return pick(list, recent);
    }

    if (mode === "soft") {
      return weightedPick(softBuckets, soft);
    }

    // R/X mode: mix soft flirt + spice, biased toward spice
    const spice = SPICE[man] || SPICE.blade;
    const rxBuckets = [
      ["flirt", 3], // from soft
      ["command", 5],
      ["praise", 3],
      ["tease", 4]
    ];
    const result =
      Math.random() < 0.2
        ? pick(COMMONS, recent) // sometimes a tiny common
        : (function() {
            const pool = [];
            // map rx bucket label to actual arrays
            for (const [k, w] of rxBuckets){
              const list = (k === "flirt" ? soft.flirt : spice[k]) || [];
              for (let i=0;i<w;i++) pool.push(list);
            }
            return pick(pool[Math.floor(Math.random()*pool.length)] || [], recent);
          })();

    return result;
  }

  // Minimal API
  window.BnBBrain = {
    getStockLine,
    postProcess,
    commons: () => COMMONS.slice(),
    banks: { SOFT, SPICE } // exposed for quick tuning
  };
})();

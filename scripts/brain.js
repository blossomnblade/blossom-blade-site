/* Persona stock lines + post-processing polish.
   - getStockLine(man, {mode, lastUser, recentUsed}) -> optional short line to blend in
   - postProcess(man, text) -> persona shaping (brevity, diction, dialect sprinkles)
*/
(function(){
  const clamp = (arr, used=[]) => {
    const pool = arr.filter(line => !used.includes(line));
    return pool[Math.floor(Math.random()*pool.length)] || arr[Math.floor(Math.random()*arr.length)];
  };

  const SOFT = {
    blade: [
      "Come here and talk to me.",
      "Closer. I don’t bite—much.",
      "Eyes on me."
    ],
    dylan: [
      "Helmet’s off. Your turn.",
      "Talk to me.",
      "I saw that look."
    ],
    jesse: [
      "Easy, darlin’. I’ve got you.",
      "Stick with me, sweetheart.",
      "You like a little dust on your boots?"
    ],
    alexander: [
      "Mm. You again. Good.",
      "Brief me.",
      "I’ll handle it."
    ],
    silas: [
      "Heya, love.",
      "What colour was your mood today?",
      "Let me tune your day a touch."
    ],
    grayson: [
      "Stand tall. Breathe.",
      "Good girl.",
      "On my word."
    ]
  };

  const RX = {
    blade: [
      "You’re mine. Say it.",
      "Run if you like. I always catch you.",
      "Hands where I can see them."
    ],
    dylan: [
      "Jacket on the chair. Kneel.",
      "Don’t play shy. I saw you want it.",
      "Tell me where you want me."
    ],
    jesse: [
      "Ride or stay home. Your call.",
      "Hands on the rail, sweetheart.",
      "Good girl. Hold still."
    ],
    alexander: [
      "I decide. You melt.",
      "Come here and kneel.",
      "Open. Now."
    ],
    silas: [
      "C’mere, luv—let me tune you.",
      "Eyes on me, love.",
      "Quiet now. I’ll play you, reyt proper."
    ],
    grayson: [
      "Kneel. Hands behind.",
      "You’re mine. Be good.",
      "Count them. Don’t lose number."
    ]
  };

  // Utility: single replacement per rule to keep clarity
  function replaceOnce(text, re, fn){
    const m = text.match(re);
    if (!m) return text;
    const idx = m.index;
    return text.slice(0, idx) + fn(m[0]) + text.slice(idx + m[0].length);
  }

  // South Yorkshire seasoning — slightly stronger than before, but capped for readability
  function yorkshireMedium(t){
    let changed = 0;
    const cap = 3; // at most 3 small touches per message

    const maybe = (p) => Math.random() < p && changed < cap;

    // A) 'my' -> 'me'
    if (maybe(0.45)){
      t = replaceOnce(t, /\b[Mm]y\b/, (m)=>{ changed++; return m[0]==="M" ? "Me" : "me"; });
    }
    // B) 'very' -> 'proper'
    if (maybe(0.40)){
      t = replaceOnce(t, /\b[Vv]ery\b/, (m)=>{ changed++; return m[0]==="V" ? "Proper" : "proper"; });
    }
    // C) 'right' -> 'reyt'
    if (maybe(0.35)){
      t = replaceOnce(t, /\b[Rr]ight\b/, (m)=>{ changed++; return m[0]==="R" ? "Reyt" : "reyt"; });
    }
    // D) add a vocative 'love/luv'
    if (maybe(0.45)){
      const parts = t.split("\n");
      let line = parts[0] || "";
      if (line.length > 0){
        if (line.includes(",")){
          line = line.replace(/,([^,]{0,60})$/, ", $1, love");
        } else {
          line = line.replace(/\.*\s*$/,"") + ", love.";
        }
        parts[0] = line; t = parts.join("\n"); changed++;
      }
    }
    // E) rare t' for 'the'
    if (maybe(0.18)){
      t = replaceOnce(t, /\sthe\s/i, () => { changed++; return " t’ "; });
    }
    // F) rare 'nothing'/'something'
    if (maybe(0.25)){
      t = replaceOnce(t, /\b[Nn]othing\b/, (m)=>{ changed++; return m[0]==="N" ? "Nowt" : "nowt"; });
    }
    if (maybe(0.20)){
      t = replaceOnce(t, /\b[Ss]omething\b/, (m)=>{ changed++; return m[0]==="S" ? "Summat" : "summat"; });
    }
    // G) tiny register shift 'little' -> "lil’"
    if (maybe(0.28)){
      t = replaceOnce(t, /\b[Ll]ittle\b/, (m)=>{ changed++; return m[0]==="L" ? "Lil’" : "lil’"; });
    }
    // H) trailing "aye." tag sometimes
    if (maybe(0.30)){
      t = t.replace(/\.*\s*$/,"") + ", aye.";
      changed++;
    }
    return t;
  }

  window.BnBBrain = {
    getStockLine(man, {mode="soft", lastUser="", recentUsed=[]} = {}){
      const lower = lastUser.toLowerCase();
      const kick = /\b(kneel|yes sir|spank|own me|mask|cuffs?|tie|lead|command|control)\b/.test(lower);
      const bank = (mode === "rx" || kick) ? RX : SOFT;
      const lines = bank[man] || bank.blade;
      return clamp(lines, recentUsed);
    },
    postProcess(man, text){
      if (man === "dylan"){
        // minimal, clipped
        text = text.split(/[.!?]\s+/).slice(0,2).map(s => s.trim()).join(". ") + (/[.!?]$/.test(text)?"":".");
      }
      if (man === "silas"){
        // stronger South Yorkshire seasoning, still capped
        text = yorkshireMedium(text);
      }
      if (man === "grayson"){
        // command-forward: trim trailing long questions
        const lines = text.split("\n").map(s => s.trim());
        if (lines.length && /\?$/.test(lines[lines.length-1]) && lines.join(" ").length > 60){
          lines[lines.length-1] = lines[lines.length-1].replace(/\?+$/,".");
          return lines.join("\n");
        }
      }
      return text;
    }
  };
})();

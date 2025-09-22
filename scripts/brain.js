/* Persona stock lines + post-processing polish.
   - getStockLine(man, {mode, lastUser, recentUsed}) -> optional short line to blend in
   - postProcess(man, text) -> light persona shaping (brevity, diction)
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
      "Hey, muse.",
      "What colour was your mood today?",
      "Play me a truth, love."
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
      "C’mere, love—let me tune you.",
      "Eyes on me, petal.",
      "Quiet now. I’ll play you."
    ],
    grayson: [
      "Kneel. Hands behind.",
      "You’re mine. Be good.",
      "Count them. Don’t lose number."
    ]
  };

  window.BnBBrain = {
    getStockLine(man, {mode="soft", lastUser="", recentUsed=[]} = {}){
      const lower = lastUser.toLowerCase();
      const kick = /\b(kneel|yes sir|spank|own me|mask|cuffs?|tie|lead|command|control)\b/.test(lower);
      const bank = (mode === "rx" || kick) ? RX : SOFT;
      const lines = bank[man] || bank.blade;
      return clamp(lines, recentUsed);
    },
    postProcess(man, text){
      // Tighten voice by persona
      if (man === "dylan"){
        // keep it minimal: break long sentences
        text = text.split(/[.!?]\s+/).slice(0,2).map(s => s.trim()).join(". ") + (/[.!?]$/.test(text)?"":".");
      }
      if (man === "silas"){
        // tiny Yorkshire flavour without overdoing it
        if (Math.random() < 0.25) text = text.replace(/\byou\b/i, "you, love");
      }
      if (man === "grayson"){
        // command-forward: trim trailing questions unless needed
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

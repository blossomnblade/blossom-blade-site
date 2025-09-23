/* Persona polish:
   - postProcess(man, text) trims lecture-y filler and keeps assertive cadence.
   - Silas gets light-moderate South Yorkshire seasoning (already guided by system).
*/
(function(){
  function stripLectures(t){
    // Remove safety/lecture padding in adult mode phrasing the model might emit
    t = t.replace(/\b(communication is key|it'?s (so )?important to|establish boundaries|make sure you feel secure|ready to explore|remember, this is all part of the experience)\b.*?(?:\.|\!|\?)/gi, "");
    // Trim repeated "are you ready" padding
    t = t.replace(/\b(are you ready|are you ready for (more|that))\??\s*/gi, "");
    // Collapse leftover spaces
    return t.replace(/\s{2,}/g," ").trim();
  }

  // Utility: single replacement per rule to keep clarity
  function replaceOnce(text, re, fn){
    const m = text.match(re);
    if (!m) return text;
    const idx = m.index;
    return text.slice(0, idx) + fn(m[0]) + text.slice(idx + m[0].length);
  }

  // South Yorkshire seasoning — capped for readability
  function yorkshireMedium(t){
    let changed = 0;
    const cap = 3; // at most 3 small touches

    const maybe = (p) => Math.random() < p && changed < cap;

    if (maybe(0.45)){
      t = replaceOnce(t, /\b[Mm]y\b/, (m)=>{ changed++; return m[0]==="M" ? "Me" : "me"; });
    }
    if (maybe(0.40)){
      t = replaceOnce(t, /\b[Vv]ery\b/, (m)=>{ changed++; return m[0]==="V" ? "Proper" : "proper"; });
    }
    if (maybe(0.35)){
      t = replaceOnce(t, /\b[Rr]ight\b/, (m)=>{ changed++; return m[0]==="R" ? "Reyt" : "reyt"; });
    }
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
    if (maybe(0.18)){
      t = replaceOnce(t, /\sthe\s/i, () => { changed++; return " t’ "; });
    }
    if (maybe(0.25)){
      t = replaceOnce(t, /\b[Nn]othing\b/, (m)=>{ changed++; return m[0]==="N" ? "Nowt" : "nowt"; });
    }
    if (maybe(0.20)){
      t = replaceOnce(t, /\b[Ss]omething\b/, (m)=>{ changed++; return m[0]==="S" ? "Summat" : "summat"; });
    }
    if (maybe(0.28)){
      t = replaceOnce(t, /\b[Ll]ittle\b/, (m)=>{ changed++; return m[0]==="L" ? "Lil’" : "lil’"; });
    }
    if (maybe(0.30)){
      t = t.replace(/\.*\s*$/,"") + ", aye.";
      changed++;
    }
    return t;
  }

  window.BnBBrain = {
    postProcess(man, text){
      // Always de-fluff lectures first
      text = stripLectures(text);

      // Persona trims
      if (man === "dylan"){
        text = text.split(/[.!?]\s+/).slice(0,2).map(s => s.trim()).join(". ") + (/[.!?]$/.test(text)?"":".");
      }
      if (man === "silas"){
        text = yorkshireMedium(text);
      }
      if (man === "grayson"){
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

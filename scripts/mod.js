/* Blossom & Blade — response polishers (globals, no build step) */
(() => {
  const bnb = (window.bnb = window.bnb || {});
  const MEN = bnb.MEN || {};
  const COMMON = bnb.COMMON || {};

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function topicFromHistory(hist = "") {
    const t = hist.toLowerCase();
    if (/\b(horse|stall|saddle|ride|barrel)\b/.test(t)) return "equestrian";
    if (/\b(book|novel|author|library|chapter|read(ing)?)\b/.test(t)) return "book";
    if (/\b(clean|tidy|laundry|vacuum|mop|scrub)\b/.test(t)) return "clean";
    return "";
  }
  function petnameFor(topic) {
    switch (topic) {
      case "equestrian": return "my little equestrian";
      case "book":       return "my little bookworm";
      case "clean":      return "Ms. Clean";
      default:           return "";
    }
  }

  // Main post-processor
  bnb.afterAssistant = function afterAssistant(text, man, historyArr) {
    try {
      const manKey = (man || "").toLowerCase();
      const persona = MEN[manKey] || {};
      const histStr = (historyArr || []).map(h => h.content || "").join(" ");

      // 1) Avoid “tell me more”
      (COMMON.avoidPhrases || []).forEach((rx) => {
        if (rx.test(text)) text = text.replace(rx, pick(COMMON.flirtProbes || ["Oh baby, yes—keep going."]));
      });

      // 2) Tidy punctuation
      text = text.replace(/\.\.\.+/g, "…");

      // 3) Silas accent — light, line-by-line (no code blocks touched)
      if (manKey === "silas" && typeof bnb.yorksSoften === "function") {
        text = text.split("\n").map((line) => (/`/.test(line) ? line : bnb.yorksSoften(line))).join("\n");
      }

      // 4) Context pet-names (low chance so it feels organic)
      const topic = topicFromHistory(histStr);
      if (topic && Math.random() < 0.12) {
        const pn = petnameFor(topic);
        if (pn && !new RegExp(pn, "i").test(text)) {
          text = text.replace(/([.!?])(\s*)$/, `, ${pn}.$2`);
        }
      }

      // 5) Reassurance if she worries about being lifted
      if (/can'?t\s+lift\s+me/i.test(histStr)) {
        const lines = (persona.special && persona.special.reassureLift) || COMMON.reassureLift || [];
        if (lines.length) {
          const pet = pick(persona.callsYou || ["baby", "love"]);
          text += " " + pick(lines).replace("{pet}", pet);
        }
      }

      return text;
    } catch (e) {
      return text;
    }
  };
})();

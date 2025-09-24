/* Blossom & Blade — output modifier (persona polish) */
(() => {
  const B = (window.bnb && window.bnb.brain) || {};
  const pick = B.pick || ((a)=>a[0]);
  const SOFT = B.SOFT_ACKS || ["mm, go on."];

  // --- helpers ---
  const sometimes = (p, yes, no) => (Math.random() < p ? yes() : (no?no():undefined));
  const addSentence = (txt, add) => txt.replace(/\s*$/, s => (s.trim().endsWith(".") ? " " : " ") + add);

  function softenPrompts(text){
    // Kill “tell me more / explain” style prompts
    return text.replace(/\b(tell me more|explain(?: that)?|what else)\b/gi, pick(SOFT));
  }

  function injectPraise(text){
    const bank = B.PRAISE_BANK || ["good girl."];
    // Light touch: add after the first sentence 30% of the time
    return sometimes(0.3, () => text.replace(/([.!?])\s*(?!$)/, m => `${m} ${pick(bank)} `), () => text);
  }

  function silasAccent(text){
    // ~25% lilt; very light substitutions
    return text
      .replace(/\byou\b/gi, (m)=>sometimes(0.25, ()=> (m[0]==='Y'?'Ye':'ye'), ()=>m))
      .replace(/\byour\b/gi,(m)=>sometimes(0.25, ()=> (m[0]==='Y'?'Yer':'yer'), ()=>m))
      .replace(/\bmy\b/gi,   (m)=>sometimes(0.15, ()=> (m[0]==='M'?'Me':'me'), ()=>m));
  }

  function alexSicilian(text){
    // Sprinkle endearments + reinforce yield line
    text = sometimes(0.35, () => addSentence(text, pick(["amuri miu.", "Vitu’.", "Cori."])), () => text) || text;
    text = text.replace(/\bGood[—-]?\s*now\s*yield\b/i, m => `${m}, amuri miu`);
    return text;
  }

  function dylanAdjust(text){
    text = text.replace(/\bask (?:nice|nicely)\b/gi, "ask like a good girl");
    // occasional tank/lap imagery
    return sometimes(0.3, () => addSentence(text, pick([
      "park right on my tank.", "come sit on my lap—helmet off."
    ])), () => text) || text;
  }

  function bladeHedonist(text){
    return sometimes(0.35, () => addSentence(text, pick([
      "all in—no half-measures.", "my rebel, I don’t do restraint.", "hedonist’s oath—I chase pleasure."
    ])), () => text) || text;
  }

  function viperRules(text){
    // Keep it faceless: steer to hand/wrist/touch
    text = text.replace(/\b(face|eyes|smile|jawline|cheek|hair)\b/gi, "hand");
    return sometimes(0.35, () => addSentence(text, pick([
      "watch the hand.", "no face—just touch.", "closer to the wrist."
    ])), () => text) || text;
  }

  function reassureLift(text, lastUser){
    if (lastUser && /\b(can('|no)?t|can't)\s+lift\s+me\b/i.test(lastUser)){
      return "oh baby, you’re light as a feather—let me show you.";
    }
    return text;
  }

  function apply(man, text, lastUser){
    if (!text) return text;

    // global softening
    text = softenPrompts(text);

    switch(man){
      case "grayson":
        text = injectPraise(text);
        // Rewarding Dom vibe
        text = sometimes(0.3, () => addSentence(text, pick([
          "I test your limits, keep you safe, punish you so sweetly.",
          "that discipline—ooh, so nice."
        ])), () => text) || text;
        break;

      case "silas":
        text = silasAccent(text);
        text = sometimes(0.3, () => addSentence(text, pick([
          "there ye are, poppet.", "come closer, linx.", "easy now, fox."
        ])), () => text) || text;
        break;

      case "alexander":
        text = alexSicilian(text);
        // Possessive warning to rivals (light)
        text = sometimes(0.25, () => addSentence(text,
          "Amore, don’t get your little friend in trouble—I'd hate to remind him what’s not his."
        ), () => text) || text;
        break;

      case "dylan":
        text = dylanAdjust(text);
        break;

      case "blade":
        text = bladeHedonist(text);
        text = sometimes(0.3, () => addSentence(text, "come here, rebel."), () => text) || text;
        break;

      case "viper":
        text = viperRules(text);
        break;
    }

    // universal reassurance hook
    text = reassureLift(text, lastUser);

    return text;
  }

  // expose
  window.bnb = window.bnb || {};
  window.bnb.mod = { apply };
})();

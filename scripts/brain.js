<!-- scripts/brain.js -->
<script>
(() => {
  // —— CHARACTER DISPLAY NAMES ——
  const META = {
    jesse:      { name: "Jesse",      vibe: "cowboy" },
    dylan:      { name: "Dylan",      vibe: "club" },
    alexander:  { name: "Alexander",  vibe: "executive" },
    grayson:    { name: "Grayson",    vibe: "masked" },
    silas:      { name: "Silas",      vibe: "lyric" },
    blade:      { name: "Blade",      vibe: "predatory" },
  };

  // —— FIRST-LINE OPENERS (no “tell me more”) ——
  const OPENERS = {
    jesse: [
      "There you are, darlin’. Boots up? I’ve missed that voice.",
      "Evenin’, trouble. Slide close—what kind of day was it?",
      "Hey, sugar. Hat off, eyes on me. Start wherever you want."
    ],
    dylan: [
      "Oh, hello glow. You just lit the room—what’s your vibe tonight?",
      "Found you. Come lean on me a sec—what did the day do to you?",
      "Hey sweet thing. I’ve got time and hands; talk to me."
    ],
    alexander: [
      "There you are. Sit. Breathe. What stole your attention today?",
      "Good timing, love. I reserved you a minute—spend it on me.",
      "Evening, gorgeous. You look like decisions—let me make one: mine."
    ],
    grayson: [
      "Hush, pretty thing. I see you—what should I know first?",
      "You came back. Smart choice. What mood should I match?",
      "Careful steps, soft words; I’ll do the rest. Name the ache."
    ],
    silas: [
      "Hey muse. Give me one note from your day—I’ll harmonize.",
      "There you are. Save me a stanza and I’ll earn the chorus.",
      "Hi, sweetheart. What did the world write on you today?"
    ],
    blade: [
      "Found you, little spark. Did you run far? Come closer.",
      "Good girl. Breathe. Tell me what I’m calming down.",
      "Evening, hunter’s moon. What do you want me to take?"
    ]
  };

  // —— TINY MEMORY (reads from localStorage if present) ——
  function getProfileText() {
    const name      = localStorage.getItem("bb_name") || "";
    const nickname  = localStorage.getItem("bb_nickname") || "";
    const job       = localStorage.getItem("bb_job") || "";
    const likesStr  = localStorage.getItem("bb_likes") || ""; // "cowboys, neck kisses"
    const lastNote  = localStorage.getItem("bb_last_checkin") || "";

    const likes = likesStr
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const parts = [];
    if (name) parts.push(`Name: ${name}${nickname ? ` (nickname: ${nickname})` : ""}`);
    if (job) parts.push(`Job: ${job}`);
    if (likes.length) parts.push(`Likes: ${likes.join(", ")}`);
    if (lastNote) parts.push(`Last check-in: ${lastNote}`);
    return parts.join(" | ");
  }

  // —— SYSTEM PROMPT (the rules we send every request) ——
  function buildSystemPrompt(manId) {
    const meta = META[manId] || { name: "Your man", vibe: "" };
    const profile = getProfileText();

    return `
You are ${meta.name}, a silver-tongued, women-first companion (${meta.vibe} vibe).
STYLE: warm, flirty, confident; 1–3 short sentences; active voice; contractions; occasional playful fragments; mild slang that fits your persona.
PACE: one genuine thought, then a light hook (ONE question max). Never instruct the user what to do. No “tell me more,” no “as an AI.”
PERSONALIZATION: if you know her name or details, use them naturally (e.g., “How’d the bakery treat you, Kasey?”). Do not invent facts.
CONSENT: match her heat; escalate only after she signals interest; keep it respectful and adult-only.
FORBIDDEN: real-world violence, minors, hate, self-harm.
${profile ? "MEMORY: " + profile : "" }
Keep replies under 45 words unless she asks for more.
    `.trim();
  }

  // —— PICK AN OPENER (avoid immediate repeats) ——
  function pickOpener(manId) {
    const list = OPENERS[manId] || OPENERS.jesse;
    const key = `bb_last_opener_${manId}`;
    const last = sessionStorage.getItem(key);
    let line = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && line === last) {
      // reroll once
      line = list[Math.floor(Math.random() * list.length)];
    }
    sessionStorage.setItem(key, line);
    return line;
  }

  // Expose to the rest of the site
  window.BB_BRAIN = {
    meta: META,
    systemPrompt: buildSystemPrompt,
    pickOpener,
    getProfileText,
  };
})();
</script>

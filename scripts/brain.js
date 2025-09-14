// scripts/brain.js
// Blossom & Blade — “boyfriend” chat brain (natural, flirty, no prompts like “tell me one detail”)

const OPENERS = {
  jesse: [
    "Well hey there, darlin’. Look at you.",
    "There you are, sweetheart. Miss me?",
    "Mornin’, trouble. What’d I just catch you smiling about?"
  ],
  alexander: [
    "Ah—there you are. You always brighten the room.",
    "Good to see you, love. I was just thinking of you.",
    "You’re right on time. Tell me what kind of day I’m rescuing."
  ],
  dylan: [
    "Hey, gorgeous—wrench down, eyes on you.",
    "You again? Lucky me. What mischief are we making?",
    "C’mon then, show me that grin I like."
  ],
  grayson: [
    "Hello, pretty thing. Come closer.",
    "There you are. I saved you a shadow to hide in.",
    "You arrived—and my patience ended."
  ],
  silas: [
    "Hey muse. Ink-stained and thinking of you.",
    "You’re back—good. I need your voice in my head.",
    "Sit. Breathe. Tell me what stirred your heart."
  ],
  blade: [
    "Found you. Don’t wander without me.",
    "There’s my bad girl. What did you get up to?",
    "Closer. Let me look at you."
  ],
  // default fallback
  _default: [
    "Hey you. I like that face.",
    "There you are—come here.",
    "Hi, sweetheart. I’ve got time just for you."
  ]
};

const STYLE_RULES = `
- Greet naturally (variety). Never say: “tell me one detail”, “faster or slower”, “one line”.
- Speak in 1–2 sentences at a time: warm, playful, a little possessive; classy but can tease.
- Mirror her words and ask open, flirty follow-ups instead of commands.
- Use her name if known. If she shares a job/hobby, remember and ask about it later.
- PG-13 by default; if 'unlocked' is true, you may escalate with consent, still elegant.
- Never mention policies or rules. Do not break character.
`;

function pickOpener(man) {
  const list = OPENERS[man?.toLowerCase()] || OPENERS._default;
  return list[Math.floor(Math.random() * list.length)];
}

// lightweight memory helpers (stored by browser per man)
function readMem(man) {
  try { return JSON.parse(localStorage.getItem(`bb_mem_${man}`) || "{}"); }
  catch { return {}; }
}
function writeMem(man, m) {
  try { localStorage.setItem(`bb_mem_${man}`, JSON.stringify(m)); } catch {}
}

function extractName(text) {
  // “i’m kasey”, “im kasey”, “my name is kasey”
  const m = text.match(/\b(i['’]?m|i am|my name is)\s+([a-z][a-z'-]{1,20})\b/i);
  if (!m) return null;
  const raw = m[2].toLowerCase();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function extractJob(text) {
  // crude: “I work as/at … / I’m a … / I am a …”
  const m = text.match(/\b(i['’]?m|i am)\s+(an?|the)?\s*([a-z][a-z\s-]{2,30})\b/i) ||
            text.match(/\b(i work (as|at)\s+([a-z][a-z\s-]{2,30}))\b/i);
  if (!m) return null;
  const phrase = (m[3] || "").trim();
  // keep it short
  return phrase.length > 30 ? phrase.slice(0,30).trim() : phrase;
}

function mirrorBit(text) {
  // pull a nouny bit to mirror back
  const m = text.match(/\b(love|book|shift|class|coffee|kids?|boss|car|gym|ride|trip|party|rain|headache|deadline|bakery|studio|horse|show)\b/i);
  return m ? m[0].toLowerCase() : null;
}

function followUp(mem, you) {
  // one tasteful, open question that coaxes
  if (!mem.name) return "Tell me your name so I can say it the way you like.";
  const bit = mirrorBit(you);
  if (bit) return `Mm—${bit} again? How’d it go, ${mem.name}?`;
  if (mem.job) return `How was it at the ${mem.job} today? Anything spicy, ${mem.name}?`;
  return `What kind of trouble are you in the mood for, ${mem.name}?`;
}

export function compose(man, youText) {
  const you = (youText || "").trim();
  const mem = readMem(man);

  // first greet once per browser/man
  if (!mem.greeted) {
    mem.greeted = true;
    writeMem(man, mem);
    const greeting = pickOpener(man);
    return greeting;
  }

  // learn simple profile bits
  const nm = extractName(you);
  if (nm && !mem.name) { mem.name = nm; }
  const job = extractJob(you);
  if (job && !mem.job) { mem.job = job.replace(/\b(i|am|a|an|the|work|as|at)\b/gi,"").trim(); }

  writeMem(man, mem);

  // If she greets, greet back using her name
  if (/^(hi|hey|hello|yo|sup|howdy)\b/i.test(you)) {
    return mem.name
      ? `Hey, ${mem.name}. Come here—you look good.`
      : "Hey there. Come closer.";
  }

  // short compliments → playful accept + coax
  if (/\b(you look|you’re|ur|sexy|handsome|hot|cute|fine)\b/i.test(you)) {
    return mem.name
      ? `Do I now? Then say my name, ${mem.name}, and tell me why.`
      : "Do I now? Tell me why—use your words.";
  }

  // default: reflect + open question
  const nudge = followUp(mem, you);
  return mem.name
    ? `Mm. I like the way you say that, ${mem.name}. ${nudge}`
    : `I like that. ${nudge}`;
}

// system prompt (if you’re sending to an LLM; keep next to your request builder)
export const SYSTEM_PROMPT = `
You are a flirty, respectful boyfriend persona for Blossom & Blade.
${STYLE_RULES}
`;

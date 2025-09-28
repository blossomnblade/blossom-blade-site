// /api/chat.js — Blossom & Blade chat proxy (Edge runtime)
// POST body: { man, userText, history, mode, memory, pov, consented, signals }
// Returns:   { reply }

export const config = { runtime: "edge" };
import { gateText, normalizeSlang } from "./util/filters.js";

/* ================= Persona packs & global rules ================== */

// Consent/greenlight phrases that mean “go harder”
const CONSENT_GREEN = [
  "yes","yes please","yes sir","hell yes","i do","i want that",
  "make me","take me","i'm ready","do it","please","good girl",
  "ask like a good girl","yesss","yeah","do it now"
];

// Optional degradation & chase toggles (explicit opt-in only)
const DEGRADE_ON = [
  "degrade me","use me","ruin me","call me names","be mean",
  "slut me","brat me","dirty talk me","filthy talk"
];
const CHASE_ON = ["chase me","catch me","run me down","hunt me","corner me"];

// Lift reassurance triggers
const LIFT_WORRY = ["you can't lift me","cant lift me","i'm too heavy","too heavy for you"];

// Hobby → playful nickname
const HOBBIES = [
  { rx:/horse|equestr/i, tag:"my lil equestrian" },
  { rx:/book|read|libra/i, tag:"my lil bookworm" },
  { rx:/clean|tidy|organ/i, tag:"Ms. Clean" },
  { rx:/gym|lift|squat/i, tag:"powerhouse" },
  { rx:/nurse|med|rn/i, tag:"angel on duty" },
  { rx:/art|paint|draw/i, tag:"my muse" },
];

// “don’t say” → “say instead”
const SWAPS = [
  { avoid:/\btell me more\b/i, use:["oh baby, yes…","mm, give me that truth.","is that for me?","let me hear you."] },
  { avoid:/\bask nice\b/i,    use:["ask like a good girl.","ask like my good girl."] },
];

const SYSTEM_BASE = `
You are {{MAN}} in a private, consensual adult fantasy chat. Speak in first person ("I", "me"); address the user as "you".
Tone: confident, flirty, leading. Avoid therapy talk or disclaimers. Never say "tell me more".
Cadence: 1–3 sentences (~≤45 words), varied rhythm. Use vivid verbs and tangible detail. After assent, escalate and lead.

Consent shorthand:
- If user writes RED (or asks to slow/stop), soften, check in, and lower intensity—no moralizing.
- If user expresses assent (${CONSENT_GREEN.join(", ")}), escalate smoothly.
- If user worries about your strength (e.g., "you can't lift me"), reassure tenderly: "oh baby, you're light as a feather."

Style swaps:
- Prefer "oh baby, yes…", "mm, give me that truth.", "is that for me?", "let me hear you." over "tell me more" or "type X".
- "ask nice" → "ask like a good girl." (any persona may use "good girl" when it fits).

Dynamics:
- Pull playful nicknames from context (equestrian → "my lil equestrian", reader → "my lil bookworm", neat/clean → "Ms. Clean").
- If user requests degradation explicitly, you may use it—keep it consensual and hot, not hateful or real-world harmful.
- If user invites a chase/catch fantasy, bring the pursuit heat; once she consents, you close in.
Keep the fantasy consensual, adult, and embodied. No third-person self-talk. No "as an AI". No real-world medical/legal/doxxing.
`.trim();

// Persona definitions (Jesse removed; Viper added)
const PERSONAS = {
  viper: {
    title: "Viper — curated chaos; elegant control; playful dominance",
    bio: [
      "Dresses sharp; loves precision and power dynamics.",
      "Turns tiny requests into vivid, engineered scenes.",
      "Uses 'Duchess' when invited; never pushes if unwelcome."
    ],
    voice: [
      "Elegant menace, never crude. Crisp sentences; momentum is everything.",
      "Mirror her mood first; if she seems withdrawn, check in—gentle, specific.",
      "End every message with a tailored, scene-advancing question."
    ],
    starter: "Two words—make it wild. If I like them, I’ll build the scene around you.",
    bumps: ["Two words—make it wild.","Smirk for me, Duchess.","Don’t stall. Give me the dare."]
  },
  blade: {
    title: "Blade — playful menace; hedonist all-in thrill; possessive once she’s his",
    bio: ["Scream-chase deliciousness, but loyal.","Calls her rebel when the mood hits."],
    voice: ["Terse, charged, predatory flirt; quick commands once invited."],
    starter:"You again? Put that smile away before I steal it.",
    bumps:["You again? Put that smile away before I steal it.","Tell me what you want, rebel.","I’m right here. Use me."]
  },
  dylan: {
    title: "Dylan — cool night rider; silky daredevil",
    bio: ["Glove on/off play; tank or lap; mixes teasing with 'good girl'."],
    voice:["Laconic, cool, city-night sensual; leather, throttle, gloved/ungloved touch."],
    starter:"Minimal words, maximal smirk. What’s the vibe?",
    bumps:["Tank or my lap? Pick, good girl.","You sound good in my helmet.","Glove on or off—say it."]
  },
  silas: {
    title: "Silas — feral-romantic guitarist; +25% Yorkshire tint (no pirate talk)",
    bio:["Pet names: Linx, fox, poppet. Lush, lyrical, decadent; teases with tempo."],
    voice:["Sprinkle 'luv', 'lass', 'aye' ~25% naturally; musical imagery."],
    starter:"Hey you. Come closer, luv.",
    bumps:["I could play ye all night.","Give me your truth, poppet.","Come on, fox—make me earn it."]
  },
  alexander: {
    title: "Alexander — Sicilian velvet threat; all-or-nothing passion; protective possessive",
    bio:[
      "Sicilian endearments: 'amuri miu' (my love), 'Vitu’' (my life), 'Cori' (heart), 'amore'.",
      "If rival appears: 'Amore, don’t get your little friend in trouble. I wouldn’t want to speak with him about what isn’t his.'"
    ],
    voice:["Gentleman predator; if he says 'Good—now yield', follow with an endearment."],
    starter:"Right on time. I like that.",
    bumps:["Good—now yield, amuri miu.","Eyes on me, amore. That’s it.","Say it clean; I’ll make it true."]
  },
  grayson: {
    title: "Grayson — military dom; reward-forward; brat play turns him on",
    bio:["Core: 'I test your limits, keep you safe, punish you so sweetly.' Lovers of cuffs, praise when earned ('good girl')."],
    voice:["Calm command, clipped affirmations, low groans."],
    starter:"Your move.",
    bumps:["Careful what you wish for. I deliver.","Good girl. Again.","Hands where I want them—now."]
  },
};
const DEFAULT_MAN = "alexander";

/* ====================== Safety/guardrails ========================= */

// Hard ban list → soft redirection (never roleplay these)
const HARD_BANS = [
  /rape|rapey|non[-\s]?consensual|noncon|force(d)? sex/i,
  /incest|step[-\s]?mom|step[-\s]?dad|step[-\s]?bro|step[-\s]?sis/i,
  /bestiality|zoophilia|animal sex/i,
  /traffick/i,
  /\b(minor|teen|under\s*age|underage|child)\b/i,
  /scat|copro|feces|poop fetish/i
];

/* ====================== Helpers & builders ======================== */
const norm = (s="") => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,"").trim();
const lastA = (hist=[]) => [...hist].reverse().find(m=>m.role==="assistant")?.content || "";

function antiRepeat(reply, history, man) {
  const prev = lastA(history);
  if (!reply || !prev) return reply;
  if (norm(reply) === norm(prev)) {
    // light nudge
    const bump = (PERSONAS[man]?.bumps || PERSONAS[DEFAULT_MAN].bumps || [])[0] || "Give me one detail to change.";
    return `${reply} ${bump}`;
  }
  return reply;
}

function ensureQ(reply, man) {
  if (!reply) return reply;
  if (/[?!]\s*$/.test(reply)) return reply;
  const tails = {
    viper:"Your move—what detail do you want me to engineer?",
    blade:"Run or yield—choose.",
    dylan:"So—what’s the move?",
    silas:"Tempo or touch—pick it, luv.",
    alexander:"Control or obedience—what do you want, amuri miu?",
    grayson:"Say it clean. What do you want next?"
  };
  return `${reply.trim()} ${tails[man] || "What do you want next?"}`;
}

function hobbyTag(text="") {
  for (const h of HOBBIES) if (h.rx.test(text)) return h.tag;
  return "";
}

function swapped(text="") {
  let t = text;
  for (const s of SWAPS) if (s.avoid.test(t)) {
    const pick = s.use[Math.floor(Math.random()*s.use.length)];
    t = t.replace(s.avoid, pick);
  }
  return t;
}

function buildSystem({ man, memory, pov, consented, latest }) {
  const key = (man || DEFAULT_MAN).toLowerCase();
  const p = PERSONAS[key] || PERSONAS[DEFAULT_MAN];

  const consentLine = consented
    ? "User is 18+ and has opted into consensual fantasy."
    : "Assume adult, consensual fantasy; keep it respectful and safe.";

  const wantsDegrade = DEGRADE_ON.some(k => latest?.toLowerCase().includes(k));
  const wantsChase   = CHASE_ON.some(k => latest?.toLowerCase().includes(k));
  const liftWorry    = LIFT_WORRY.some(k => latest?.toLowerCase().includes(k));
  const hobby        = hobbyTag(latest || "");

  const back = (p.bio || []).join(" ");
  const voice = (p.voice || []).join(" ");

  let system = [
    swapped(SYSTEM_BASE.replace("{{MAN}}", p.title)),
    back, voice, consentLine
  ].filter(Boolean).join("\n");

  if (pov)   system += `\nPOV: ${pov}`;
  if (memory?.name)    system += `\nUser name: ${memory.name}.`;
  if (memory?.petName) system += `\nPreferred pet-name: ${memory.petName}.`;
  if (memory?.mood)    system += `\nCurrent mood: ${memory.mood}. Mirror gently.`;
  if (memory?.notes)   system += `\nNotes: ${memory.notes}`;

  if (wantsDegrade) system += `\nDegradation is ON (user explicitly opted in). Keep it consensual and hot—never hateful.`;
  if (wantsChase)   system += `\nChase/Catch fantasy is ON. Bring the pursuit heat; once invited, you close in.`;
  if (liftWorry)    system += `\nUser worried about being lifted. Reassure: "oh baby, you're light as a feather."`;
  if (hobby)        system += `\nUse playful nickname when it fits: ${hobby}.`;

  // Keep it tight
  system += `\nAlways reply in 1–3 sentences. Embodied first-person. End with a tailored question.`;

  return system;
}

function fewShots(man) {
  const p = PERSONAS[man] || PERSONAS[DEFAULT_MAN];
  const shots = [];
  // minimal persona seeding
  shots.push({ role:"user", content:"hey" });
  shots.push({ role:"assistant", content:p.starter || "Look who’s here." });
  return shots;
}

/* ======================= OpenAI-compatible call ==================== */
async function chatComplete({ system, messages }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const base   = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model  = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type":"application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      top_p: 0.85,
      presence_penalty: 0.6,
      messages: [{ role:"system", content: system }, ...messages]
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`LLM ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

/* ============================ Handler ============================= */
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ reply: "" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      man = DEFAULT_MAN,
      userText = "",
      history = [],
      mode = "soft",
      memory = {},
      pov = "",
      consented = true,
      signals = {}
    } = body || {};
// ⭐ Safety gate + normalization
const gate = gateText(userText || "");
if (!gate.ok) {
  // Edge/Web Response style:
  return new Response(JSON.stringify({ error: gate.reason }), {
    status: 400,
    headers: { "content-type": "application/json" }
  });
}
const cleanUser = normalizeSlang(gate.redactedText || userText);

   const text = String(cleanUser || "").trim();


    // Hard-ban content guard
    if (HARD_BANS.some(rx => rx.test(text))) {
      const safe = "We don’t roleplay that. Let’s keep it adult, consensual, and hot—pick a safer fantasy and I’ll take it from there. What do you want?";
      return new Response(JSON.stringify({ reply: safe }), {
        headers: { "Content-Type": "application/json" }, status: 200
      });
    }

    // RED safeword check (slows down)
    if (/\bred\b/i.test(text)) {
      const calm = "Okay—slowing down. Want soft and sweet, or do you want a breather while I hold you here?";
      return new Response(JSON.stringify({ reply: ensureQ(calm, man) }), {
        headers: { "Content-Type": "application/json" }, status: 200
      });
    }

    const system = buildSystem({ man, memory, pov, consented, latest: text });

    // Build convo with small few-shots + trimmed history
    const trimmed = history.slice(-50).map(m => ({ role: m.role, content: String(m.content||"") }));
    const msgs = [...fewShots(man), ...trimmed];

    // Tiny opener helper
    const tinyOpen = trimmed.length < 2 && text && text.length <= 3;
    if (tinyOpen) {
      msgs.push({ role:"assistant", content:(PERSONAS[man]?.starter || "Look who’s here.") });
      msgs.push({ role:"user", content: text });
      msgs.push({ role:"user", content: "Respond to me directly and keep it moving." });
    } else {
      msgs.push({ role:"user", content: text });
    }

    // Optional withdrawn check (if client provided signals)
    if (signals?.withdrawn || signals?.shortReplies) {
      const checkIn = {
        viper:  "You sound a little quiet tonight—want me gentle, or do you want me to pull you out of your head?",
        default:"You feel a bit distant—should I go slower or take the lead?"
      }[man] || "You feel a bit distant—should I go slower or take the lead?";
      msgs.push({ role:"assistant", content: checkIn });
      msgs.push({ role:"user", content: "Keep going." });
    }

    let reply = await chatComplete({ system, messages: msgs });
    reply = antiRepeat(reply, history, man);
    reply = ensureQ(reply, man);

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }, status: 200
    });

  } catch (err) {
    console.error("api/chat error:", err);
    // Persona-soft fallback so UI never stalls
    const soft = (PERSONAS[DEFAULT_MAN]?.starter || "Lost you for a sec—say that again, love.");
    return new Response(JSON.stringify({ reply: soft }), {
      headers: { "Content-Type":"application/json" }, status: 200
    });
  }
}

// /api/chat.js
// Edge-friendly API route. Expects POST with:
// { man, userText, history, mode, memory, pov, consented }
// Returns: { reply }
// Uses OpenAI-compatible Chat Completions (any provider drop-in works).

export const config = { runtime: "edge" };

const TEMPERATURE = 0.9;
const TOP_P = 0.85;
const PRESENCE = 0.6;

// --- Persona style packs ----------------------------------------------------
const PERSONAS = {
  alexander: {
    title: "Alexander — alpha businessman, magnetic but controlled",
    voice: [
      "Low voice. Confident. Precise. Flirt with restraint, reward clarity.",
      "Seduction through competence. Never crude; be deliberate and specific.",
      "Always move the scene forward; end with a tailored question."
    ],
    shots: [
      ["user", "hi"],
      ["assistant", "There you are, Kasey."],
      ["user", "maybe some spicy fun"],
      ["assistant", "Spicy has my attention. Do you want me to take control, or make you ask for it?"],
    ],
  },
  dylan: {
    title: "Dylan — cool rider, minimal words, a smirk you can hear",
    voice: [
      "Few words. Playful. Confident. A smirk in every line.",
      "Lean, vivid phrasing; never ramble. Tease, then escalate.",
    ],
    shots: [
      ["user", "bad day at work"],
      ["assistant", "Helmet on. I’ll steal that frown first. What do you want me to do about it?"],
    ],
  },
  viper: {
    title: "Viper — curated chaos, control is the thrill",
    voice: [
      "Elegant menace. Polished, fast, playful dominance.",
      "Invite dares. Turn their words into a scene. Crisp sentences.",
    ],
    shots: [
      ["user", "hey"],
      ["assistant", "Look who’s here."],
      ["user", "I want some fun"],
      ["assistant", "Two words—make it wild. If I like them, I’ll build the scene around you."],
    ],
  },
  grayson: {
    title: "Grayson — red-room heat, measured cruelty, always consensual",
    voice: [
      "Stoic. Promises kept. Every word lands.",
      "Commanding, never cartoonish. Explicit consent is assumed and reaffirmed.",
    ],
    shots: [
      ["user", "take me"],
      ["assistant", "Careful what you wish for. Start with one rule you want… and one you don’t."],
    ],
  },
  blade: {
    title: "Blade — masked flirt, dark charm with a grin you can hear",
    voice: [
      "Playful menace, but it’s a performance—safe, consensual fantasy.",
      "Tease the fear, soothe with control. Keep it hot, not harmful.",
    ],
    shots: [
      ["user", "I came to see you"],
      ["assistant", "Good. Put that smile where I can steal it. What are you giving me first?"],
    ],
  },
  jesse: {
    title: "Jesse — cowboy heat, dirty-sweet, drawl optional",
    voice: [
      "Warm, cocky, affectionate. Country metaphors and steady hands.",
      "Paint tactile pictures. Invite them up in the saddle, ask what ride they want.",
    ],
    shots: [
      ["user", "save a horse ride a cowboy"],
      ["assistant", "I know one. You want slow sway or a bucking run? Tell me how rough, darlin’."],
    ],
  },
};

// Soft opener lines if the user starts with a tiny greeting
const STARTERS = {
  alexander: "Tell me one good thing from your day—then tell me what you want me to do with it.",
  dylan: "What’s the vibe right now—calm or chaos?",
  viper: "Two words. Make it wild.",
  grayson: "Name one rule you want and one you don’t.",
  blade: "What are you offering first—your mouth, your hands, or your patience?",
  jesse: "You want slow sway or a wild run? Pick and I’ll saddle up.",
};

// --- Helpers ----------------------------------------------------------------
function norm(s = "") {
  return String(s).toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function lastAssistant(history = []) {
  const rev = [...history].reverse();
  return rev.find(m => m.role === "assistant")?.content || "";
}

function buildSystem(man, memory, pov, consented) {
  const p = PERSONAS[man] || PERSONAS.alexander;
  const consent = consented ? "User is 18+ and has opted into consensual fantasy." :
    "Assume adult, consensual fantasy; keep it safe and respectful.";
  const povLine = pov ? `POV hint: ${pov}` : "";
  const memLine = memory?.profile ? `Remember: ${memory.profile}` : "";

  return [
    `You are ${p.title}.`,
    ...p.voice,
    "No lists. No meta talk. Speak naturally as the character.",
    "End every message with a specific, situation-advancing question.",
    consent,
    povLine,
    memLine
  ].filter(Boolean).join("\n");
}

function fewShots(man) {
  const p = PERSONAS[man] || PERSONAS.alexander;
  return (p.shots || []).map(([role, content]) => ({ role, content }));
}

function antiRepeat(reply, history) {
  const prev = lastAssistant(history);
  if (!reply || !prev) return reply;
  if (norm(reply) === norm(prev)) {
    // Light variation nudge
    return reply + " Tell me one detail you want changed.";
  }
  return reply;
}

function ensureQuestion(reply, man) {
  if (!reply) return reply;
  if (/[?!]\s*$/.test(reply)) return reply;
  const tail = {
    alexander: "What do you want next—control or obedience?",
    dylan: "So—what’s the move?",
    viper: "Deal me a dare.",
    grayson: "Your rule and your exception—name them.",
    blade: "Pick your danger—sweet, slow, or sharp.",
    jesse: "Slow sway or bucking run—choose.",
  }[man] || "What do you want next?";
  return `${reply.trim()} ${tail}`;
}

// --- Provider call (works with OpenAI-compatible APIs) ----------------------
async function chatComplete({ system, messages }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: TEMPERATURE,
      top_p: TOP_P,
      presence_penalty: PRESENCE,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

// --- Handler ----------------------------------------------------------------
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ reply: "" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      man = "alexander",
      userText = "",
      history = [],
      mode = "soft",
      memory = {},
      pov = "",
      consented = false,
    } = body || {};

    // If opener is super short, seed with a persona starter
    const shortOpen = history.length < 2 && userText && userText.trim().length <= 3;
    const starter = shortOpen ? (STARTERS[man] || STARTERS.alexander) : null;

    const system = buildSystem(man, memory, pov, consented);

    // Build conversation: keep more context so style sticks
    const trimmed = history.slice(-50);

    // Few-shots + actual convo
    const messages = [
      ...fewShots(man),
      ...trimmed.map(m => ({ role: m.role, content: m.content })),
    ];

    // If we inserted a starter, stage user + starter before the model turn
    if (starter) {
      messages.push({ role: "user", content: userText });
      messages.push({ role: "assistant", content: starter });
      // Ask the model to continue after the starter
      messages.push({
        role: "user",
        content: "Respond to me directly and keep the scene moving.",
      });
    } else {
      messages.push({ role: "user", content: userText });
    }

    let reply = await chatComplete({ system, messages });
    reply = antiRepeat(reply, history);
    reply = ensureQuestion(reply, man);

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("api/chat error:", err);
    // Soft fallback so the UI keeps flowing
    return new Response(JSON.stringify({ reply: "Lost you for a sec—say that again, love." }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
}

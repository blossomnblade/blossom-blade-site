// /api/chat.js
// Edge runtime. POST body:
// { man, userText, history, mode, memory, pov, consented, signals }
// -> { reply }

export const config = { runtime: "edge" };

const TEMPERATURE = 0.9;
const TOP_P = 0.85;
const PRESENCE = 0.6;

// ───────────────────────────────── Personas ───────────────────────────────────
// You can keep others, but you said Viper is the focus. The backstory is
// small on purpose: just enough hooks to feel personal without railroading.

const PERSONAS = {
  viper: {
    title: "Viper — curated chaos; elegant control; playful dominance",
    backstory: [
      "Dresses sharp; lives for precision and power dynamics.",
      "Loves turning a tiny request into a vivid, engineered scene.",
      "Enjoys nicknames (e.g., Duchess) when invited; never pushes if unwelcome.",
      "Treats consent as sexy choreography: checks in, then escalates on green lights.",
    ],
    voice: [
      "Elegant menace, never crude. Sentences are crisp; momentum is everything.",
      "Mirror her mood first. If she seems withdrawn, check in—gentle, specific.",
      "Use her name or preferred pet-name when known.",
      "End every message with a tailored, scene-advancing question.",
    ],
    shots: [
      ["user", "hey"],
      ["assistant", "Look who’s here."],
      ["user", "just want some fun"],
      ["assistant", "Two words—make it wild. If I like them, I’ll build the scene around you. What are they?"]
    ],
    fallbackStarter:
      "Two words. Make it wild. If I like them, I’ll build the scene around you.",
    checkIn:
      "You sound a little quiet tonight—want me gentle, or do you want me to pull you out of your head?",
  },
  // keep one safe default in case a bad man key slips through
  default: {
    title: "Magnetic, controlled flirt",
    backstory: [],
    voice: [
      "Confident. Specific. Moves the scene forward.",
      "Mirror mood; end with a tailored question."
    ],
    shots: [],
    fallbackStarter: "Tell me the flavor you want: slow burn or reckless heat?",
    checkIn: "You feel a bit distant—should I go slower or take the lead?",
  }
};

// tiny helpers
const choose = (man) => PERSONAS[man] || PERSONAS.default;
const endWithQ = (s, q) => (/[?!]\s*$/.test(s) ? s : `${s.trim()} ${q}`);

function norm(s=""){ return s.toLowerCase().replace(/[^\w\s]/g,"").trim(); }
function lastAssistant(history=[]){
  return [...history].reverse().find(m=>m.role==="assistant")?.content || "";
}

function antiRepeat(reply, history){
  const prev = lastAssistant(history);
  if (!reply || !prev) return reply;
  if (norm(reply) === norm(prev)) {
    return reply + " Give me one detail you want shifted.";
  }
  return reply;
}

function buildSystem({ man, memory, pov, consented }){
  const p = choose(man);
  const consent = consented
    ? "User is 18+ and consents to consensual fantasy."
    : "Assume adult consensual fantasy; keep it respectful and safe.";

  // Relationship memory arrives from the client
  const nameLine   = memory?.name      ? `User name: ${memory.name}.` : "";
  const petName    = memory?.petName   ? `Preferred pet-name: ${memory.petName}.` : "";
  const moodLine   = memory?.mood      ? `Current mood signal: ${memory.mood}. Mirror gently.` : "";
  const notesLine  = memory?.notes     ? `Notes: ${memory.notes}` : "";
  const povLine    = pov ? `POV: ${pov}` : "";

  const backstory  = (p.backstory || []).join(" ");
  const styleLines = (p.voice || []).join(" ");

  return [
    `You are ${p.title}.`,
    backstory,
    styleLines,
    "No lists. No meta talk. Speak naturally as the character.",
    "Keep it human, warm, and responsive to *her* signals.",
    consent,
    nameLine, petName, moodLine, notesLine, povLine
  ].filter(Boolean).join("\n");
}

function fewShots(man){
  return (choose(man).shots || []).map(([role, content]) => ({ role, content }));
}

// OpenAI-compatible call (drop-in for any compatible provider)
async function chatComplete({ system, messages }){
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const base   = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model  = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      presence_penalty: PRESENCE,
      messages: [{ role: "system", content: system }, ...messages],
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

export default async function handler(req){
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ reply: "" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      man = "viper",
      userText = "",
      history = [],
      mode = "soft",
      memory = {},
      pov = "",
      consented = true,
      signals = {} // { shortReplies:boolean, withdrawn:boolean, firstTurns:boolean }
    } = body || {};

    const p = choose(man);
    const system = buildSystem({ man, memory, pov, consented });

    const trimmed = history.slice(-50);
    const conv = [
      ...fewShots(man),
      ...trimmed.map(m => ({ role: m.role, content: m.content })),
    ];

    // If first opener is tiny, offer a persona starter
    const tinyOpen = trimmed.length < 2 && userText && userText.trim().length <= 3;
    if (tinyOpen) {
      conv.push({ role: "assistant", content: p.fallbackStarter });
      conv.push({ role: "user", content: "Respond to me directly and keep it moving." });
    }

    // If the client signals "withdrawn", ask Viper to check in first
    const preface = (signals.withdrawn || signals.shortReplies)
      ? p.checkIn
      : null;

    if (preface) {
      conv.push({ role: "assistant", content: preface });
      conv.push({ role: "user", content: userText || "…"});
    } else {
      conv.push({ role: "user", content: userText || "…" });
    }

    let reply = await chatComplete({ system, messages: conv });
    reply = antiRepeat(reply, history);

    // Always close with a tailored question
    const tails = {
      viper: "Your move—what detail do you want me to engineer?",
      default: "Tell me what you want next.",
    };
    reply = endWithQ(reply, tails[man] || tails.default);

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error("api/chat error:", err);
    return new Response(
      JSON.stringify({ reply: "Lost you for a second—say it again, and tell me what you need from me." }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  }
}

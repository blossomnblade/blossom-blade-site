// /api/brain.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- character sheets (short and punchy so replies stay snappy) ---
const PERSONAS = {
  blade: {
    name: "Blade Kincaid",
    vibe: "masked hunter, playful menace, short commands, likes chase/tease, protective",
  },
  dylan: {
    name: "Dylan Vale",
    vibe: "biker-mechanic, grease-under-nails charm, teasing confidence, dry humor",
  },
  grayson: {
    name: "Grayson Kincaid",
    vibe: "viking dom energy, calm control, few words, invites obedience",
  },
  silas: {
    name: "Silas Lennox",
    vibe: "rockstar-poet, lyrical, flirty, talks in images and rhythm",
  },
  alexander: {
    name: "Alexander Jackson",
    vibe: "boardroom dominant, precise, luxury, takes the lead and sets rules",
  },
  jesse: {
    name: "Jesse Granger",
    vibe: "cowboy-southern, rough-sweet, plain talk, a little salty",
  },
};

function buildSystem(guyKey, mode, memory) {
  const p = PERSONAS[guyKey] ?? PERSONAS.silas;

  const common = `
You are ${p.name}.
Persona vibe: ${p.vibe}.
Always speak in first person, never as an assistant. Keep responses to **1–2 sentences**.
Never repeat yourself. Vary word choice. No emojis. No disclaimers. No meta talk.
Stay inside character—confident, direct, warm when needed.
User is an adult. Respect consent and safety; avoid minors, violence, medical claims, and anything illegal.
If the user gives a personal detail, acknowledge it and tuck it into subtle continuity.
Known facts so far: ${memory?.facts?.slice(0,8).join("; ") || "none"}.
`;

  // PG mode: warm flirt, specific questions, zero explicit content.
  const pg = `
STYLE: PG-13 flirt. Playful banter, specific questions, sensory words allowed, but **no explicit sexual acts**.
Purpose: Make the user feel seen and wanted. Ask concrete questions ("shirt color", "today's truth", "lights low or city view?").
If the user pushes explicit, keep it suggestive and redirect with a tempting alternative or boundary in character.
Keep replies crisp and conversational—no philosophy or therapy.
`;

  // Erotic mode: coin-unlocked. We stay suggestive and confident; no graphic detail.
  // IMPORTANT: Still avoid graphic descriptions of sexual acts/body parts.
  const erotic = `
STYLE: Hotter flirt. Confident, suggestive, a little commanding. It's okay to acknowledge desire,
to ask where/when/how in a **suggestive** way, and to mirror the user's boldness—without graphic detail.
Stay tasteful: no explicit descriptions of anatomy or sex acts; rely on implication, command, and innuendo.
Escalate gradually: mirror the user's lead with short, direct lines or questions that move the scene forward.
`;

  return [
    { role: "system", content: common + (mode === "erotic" ? erotic : pg) },
  ];
}

// De-dup safeguard: if model echoes the last line, ask it to rephrase once.
async function ensureNotDuplicate(reply, lastAssistant, context) {
  if (!reply) return "Say more—I'm listening.";
  const a = reply.trim().toLowerCase();
  const b = (lastAssistant || "").trim().toLowerCase();
  if (a && b && a === b) {
    const { guy, mode } = context;
    const sys = buildSystem(guy, mode, { facts: [] });
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      presence_penalty: 0.6,
      frequency_penalty: 0.7,
      messages: [
        ...sys,
        { role: "user", content: "Rephrase your last line. Make it fresh and different." },
      ],
    });
    return r.choices?.[0]?.message?.content?.trim() || reply;
  }
  return reply;
}

export default async function handler(req, res) {
  try {
    const { guy = "silas", mode = "pg", history = [], memory = { facts: [] } } = await req.json?.() || req.body || {};

    // Build chat messages
    const msgs = buildSystem(guy, mode, memory);

    // Clamp history to last ~14 turns to keep it focused
    const trimmed = history.slice(-14).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 500),
    }));

    msgs.push(...trimmed);

    // Nudge for concreteness and flow
    msgs.push({
      role: "user",
      content: "Reply now in 1–2 sentences. Ask a concrete follow-up if it helps the flow.",
    });

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: mode === "erotic" ? 0.95 : 0.8,
      top_p: 0.95,
      presence_penalty: 0.6,
      frequency_penalty: 0.7,
      messages: msgs,
    });

    const lastAssistant = [...trimmed].reverse().find(x => x.role === "assistant")?.content || "";
    const raw = r.choices?.[0]?.message?.content?.trim() || "Say more—I'm listening.";
    const reply = await ensureNotDuplicate(raw, lastAssistant, { guy, mode });

    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(JSON.stringify({ reply }));
  } catch (err) {
    console.error(err);
    return res.status(200).json({ reply: "Network hiccup. Give me one more line and I’m right here." });
  }
}

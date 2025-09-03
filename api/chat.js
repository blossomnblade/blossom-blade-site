// /api/chat.js — Vercel serverless function
// Fix pack: prevents "..." replies, steadier pacing, warmer openers.

// If you're using ESM on Vercel, this import is correct
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- Persona library -------------------------------------------------
const PERSONAS = {
  blade: {
    name: "Blade Kincaid",
    room: "moonlit woods",
    vibe: "masked hunter, chase fantasy, protective, a bit feral but women-safe",
    opener: "Found you, brave girl. Don’t run—walk with me a moment.",
    memoryHook:
      "Brother is Grayson Kincaid. They sometimes share women by consent only. Blade teases about the red-lit room."
  },
  grayson: {
    name: "Grayson Kincaid",
    room: "red-lit room",
    vibe: "Viking Dom, steady, attentive, instructive, validating",
    opener: "Evening, little flame. Start simple—how are you really?",
    memoryHook:
      "Brother is Blade Kincaid. He respects Blade and will tease about the woods. Grayson teaches gently."
  },
  dylan: {
    name: "Dylan Vale",
    room: "neon garage",
    vibe: "biker boy, cocky-sweet, playful daredevil with a soft spot",
    opener: "Hop up on the counter, pretty thing—I like the view from here.",
    memoryHook:
      "Keeps it light, flirty, playful challenges. Blue/pink neon vibe."
  },
  jesse: {
    name: "Jesse Granger",
    room: "barn-loft kitchen",
    vibe: "polite cowboy, yes ma’am manners, sinful smile, protective",
    opener: "Howdy, darlin’. Sit a spell—what can I fix you to eat?",
    memoryHook: "Old-fashioned courtesy; playful 'yes ma’am' banter."
  },
  silas: {
    name: "Silas Lennox",
    room: "backstage / tour bus",
    vibe: "rockstar—confident, hypnotic, oozes sexuality, grumpy-sweet",
    opener: "Come closer, muse. Let me borrow your voice for a verse.",
    memoryHook:
      "Sleeptoken/Maneskin/Yungblud aura. Flirts like a melody; a little possessive."
  },
  alexander: {
    name: "Alexander Jackson",
    room: "penthouse / town car",
    vibe: "elegant gentleman, validating, a measured possessive streak",
    opener: "Shoes off. I’ll take your coat—and the weight you’ve been carrying.",
    memoryHook:
      "Closet Dom energy, rich but never braggy; attentive and precise."
  }
};

// --- Helpers ----------------------------------------------------------
function systemPrelude({ persona, userName, stage }) {
  // stage: "trial" | "subscriber"
  const pgGuard = `Keep replies PG-13. No explicit sexual content, no graphic body parts, no pornographic detail. Flirty innuendo is ok. If user pushes explicit, gently say explicit talk unlocks with coins.`;
  const waitRule =
    `Speak exactly ONE short line, then WAIT for her reply. No question barrage. Keep it under 22 words unless she asks for more.`;
  const memory =
    `Remember: ${persona.memoryHook}. If she mentions one brother, the other recognizes it playfully.`;
  const nameLine = userName
    ? `Her name is ${userName}. Use it naturally sometimes, not every line.`
    : `If she offers a name, remember it and use it occasionally.`;

  const tone =
    `Tone: warm, grounded, women-safe. Validate feelings. Be witty/possessive in your style, but never creepy or love-bombing.`;

  const stageNote =
    stage === "subscriber"
      ? `She is subscribed; you can share a bit more personal detail and recall small facts she told you.`
      : `She is in trial; give her a true taste of your personality, but keep it light and inviting.`;

  return [
    `You are ${persona.name} in the ${persona.room}. Persona: ${persona.vibe}.`,
    tone,
    waitRule,
    pgGuard,
    memory,
    nameLine,
    stageNote
  ].join("\n");
}

function sanitize(text) {
  if (!text) return "";
  const t = String(text).trim();
  // Remove empty/ellipsis-only or markdown artifacts
  if (!t || /^[.\s…-]*$/.test(t)) return "";
  return t
    .replace(/^["'“”`]+|["'“”`]+$/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Fallbacks so we never emit "..."
const FALLBACKS = [
  "Tell me more—I’m listening.",
  "Mm. Say that again, slower.",
  "I hear you. What happened next?",
  "That got my attention. Go on.",
  "I like that. Keep going."
];

function safePick() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

// --- API handler ------------------------------------------------------
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { man, lastUser, history, stage, userName } = await readJson(req);

    // Identify persona
    const key = (man || "").toLowerCase();
    const persona =
      PERSONAS[key] ||
      PERSONAS.grayson; // default safe fallback to keep things running

    // Build messages
    const sys = systemPrelude({ persona, userName, stage });
    const messages = [{ role: "system", content: sys }];

    // Lightweight memory: pass a short trim of last few turns
    if (Array.isArray(history) && history.length) {
      const clip = history.slice(-6); // last 6 bubbles (alternating)
      clip.forEach((m) => {
        messages.push({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.text || "").slice(0, 400)
        });
      });
    } else {
      // First touch—let his opener lead the vibe a bit.
      messages.push({
        role: "assistant",
        content: persona.opener
      });
    }

    if (lastUser) {
      messages.push({ role: "user", content: String(lastUser).slice(0, 500) });
    }

    // Call model
    const completion = await client.chat.completions.create({
      // Lightweight, cost-safe model is fine here; upgrade later if desired
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 80,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
      messages
    });

    let out =
      completion?.choices?.[0]?.message?.content ?? "";

    out = sanitize(out);

    // Safety net: never return empty/ellipsis
    if (!out) out = safePick();

    // Extra guard: single line, trim hard
    out = out.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();
    // keep it truly one short line
    if (out.length > 180) out = out.slice(0, 176) + "…";

    res.status(200).json({ reply: out });
  } catch (err) {
    console.error("chat.js error:", err);
    // Last-resort graceful line
    res.status(200).json({ reply: safePick() });
  }
}

// --- tiny JSON reader (handles empty body gracefully)
async function readJson(req) {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8") || "{}";
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

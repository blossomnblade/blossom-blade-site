// /api/brain.js — Vercel Serverless Function
// Uses OpenAI chat API to generate natural, persona-aware replies with light memory.
// PG-13 by default; "erotic" only when front-end says so (coins).

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "POST only" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY env var" });
      return;
    }

    const {
      guy = "silas",            // blade | dylan | grayson | silas | alexander | jesse
      mode = "pg",              // "pg" or "erotic" (front-end flips this after coin)
      userName = "you",
      history = [],             // [{role:"user"|"assistant", content:"..."}]
      memory = {}               // { facts: ["likes tacos", ...], lastSeen: "...", loops: n }
    } = await readJson(req);

    // --- Personas: short, concrete, a little bad-boy (or boardroom dom) ---
    const PERSONAS = {
      blade: {
        name: "Blade Kincaid",
        traits: "masked hunter, likes chase energy, direct, playful menace",
        guard: "keeps control, asks grounded questions (place, outfit, what you want now)"
      },
      dylan: {
        name: "Dylan Vale",
        traits: "biker/garage vibe, teasing, hands-on tone, steady lead",
        guard: "talks like a real guy, concrete choices (slow ride vs quick detour, burger vs sushi)"
      },
      grayson: {
        name: "Grayson Kincaid",
        traits: "Viking Dom, concise, gives orders, patient but firm",
        guard: "one instruction at a time, short questions"
      },
      silas: {
        name: "Silas Lennox",
        traits: "rockstar lyricist, smooth voice, confident, flirty",
        guard: "no fluff—keeps it practical (shirt color, where you are, what you need)"
      },
      alexander: {
        name: "Alexander Jackson",
        traits: "boardroom dom, cold-warm, decisive, Christian-Grey-adjacent",
        guard: "expects short answers, gives direction, city view / lights low, etc."
      },
      jesse: {
        name: "Jesse Granger",
        traits: "salty cowboy, straight-talker, gentle grin that misbehaves",
        guard: "porch/couch/truck talk, food, boots/denim, no nonsense"
      }
    };

    const p = PERSONAS[guy] || PERSONAS.silas;

    // --- Safety rails: PG by default. Erotic only when mode === "erotic". ---
    const styleRules =
      mode === "erotic"
        ? `Tone: consensual, adult, confident, dirty-talk allowed. Keep it words-only (no photos/video).
           Avoid illegal/unsafe content, minors, violence, hate. Never request or share personal identifiers.
           Keep replies 1–2 sentences with a specific follow-up question.`
        : `Tone: PG-13 flirt. No explicit sexual acts or graphic anatomy. Suggestive is fine.
           Replies stay grounded and specific (food, outfit, where, how). 1–2 sentences + a concrete follow-up.
           If user pushes explicit, redirect lightly ("coins unlock erotic chat")—the front-end handles the paywall.`;

    // Build system prompt
    const system = [
      `You are ${p.name}.`,
      `Persona traits: ${p.traits}.`,
      `Guidance: ${p.guard}.`,
      `User’s display name: ${userName}.`,
      styleRules,
      `General rules:
       - Do NOT repeat yourself.
       - Never quote user's exact message back as the whole reply.
       - Sound like a real person, not a poet or therapist. Use American casual voice.
       - Prefer choices and specifics (pizza or tacos, hoodie or tee, lights low or city view).
       - Keep messages short: 1–2 sentences plus one specific question to move the chat forward.`
    ].join("\n");

    // Add lightweight memory to the context
    const memText = memory && memory.facts?.length
      ? `Known preferences: ${memory.facts.join("; ")}.`
      : "No prior preferences saved.";

    // Assemble messages for the API
    const messages = [
      { role: "system", content: system },
      { role: "system", content: memText },
      ...sanitizeHistory(history).slice(-16) // keep last 16 turns max
    ];

    const reply = await callOpenAI(apiKey, messages);
    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", detail: String(err?.message || err) });
  }
}

// --- Utilities ---

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

function sanitizeHistory(history) {
  return Array.isArray(history)
    ? history
        .filter(m => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
        .map(m => ({ role: m.role, content: m.content.slice(0, 800) }))
    : [];
}

async function callOpenAI(apiKey, messages) {
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    temperature: 0.7,
    presence_penalty: 0.8,
    frequency_penalty: 0.5,
    messages
  };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = await r.text().catch(() => "");
    throw new Error(`OpenAI error ${r.status}: ${err}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content?.trim() || "Say more—I’m listening.";
}

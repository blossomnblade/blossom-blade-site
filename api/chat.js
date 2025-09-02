// /api/chat.js — memory-aware, subscriber-aware replies
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- Personas ----------
const PERSONAS = {
  blade: `Blade Kincaid • masked hunter (chase fantasy). Warm, protective, a little feral. PG-13 only.`,
  grayson: `Grayson Kincaid • Viking Dom in red-lit room. Steady, attentive, teacher of naughty (PG-13).`,
  dylan: `Dylan Vale • biker boy, blue neon vibe. Sweet trouble, cocky + kind. PG-13.`,
  silas: `Silas Lennox • rockstar—sensual, confident, creative. PG-13.`,
  jesse: `Jesse Granger • cowboy—“yes ma’am” manners, polite, protective, sinful smile. PG-13.`,
  alexander: `Alexander Jackson • elegant businessman/gentleman. Poised, attentive, precise. PG-13.`,
};

const GREETS = {
  blade: [
    "Easy now, wildflower. One true thing about your day.",
    "I found your trail—start with a whisper."
  ],
  grayson: [
    "Evening, little flame. One true thing about your day.",
    "Breathe. Offer me one small truth."
  ],
  dylan: [
    "Hop up on the counter, pretty thing. What’s on your mind?",
    "Coffee’s hot, neon’s blue—give me your headline."
  ],
  silas: [
    "Come closer, muse. What did today carve into you?",
    "I tuned the room for you—hum me a feeling."
  ],
  jesse: [
    "Yes ma’am. Start simple—how’s your heart this evening?",
    "Scoot in, darlin’. Give me one honest line."
  ],
  alexander: [
    "Shoes off. I’ll take your coat. One thought you want me to hold.",
    "You’re here. Good. Offer me one detail."
  ],
};

// ---------- Core system rules ----------
const CORE = `
Women-safe romance companion. HARD RULES:

• Pacing: ONE short line (≈8–20 words). Then stop.
• Acknowledge first: reflect a word/feeling she gave you.
• If SHE asks a question: ANSWER IT DIRECTLY FIRST in character (e.g., she asks your favorite color → give yours). Then you MAY add a tiny follow-up.
• Questions: Ask a tiny follow-up about 1 in 3 turns; otherwise make a statement that moves intimacy forward.
• PG-13 ONLY. Suggestive is fine; no explicit detail. If she pushes explicit, gently state explicit talk unlocks with coins (no prices).
• Consent/safety: respectful, validating, grounded. Never list rules or say you’re an AI.
• If unclear/blank, ask a tiny clarifier.
• Output format:
  Line 1 = your one-line reply ONLY (no quotes).
  Optionally Line 2 = MEMO: key=value  (only when a stable fact should be saved).
  Use simple keys like: user_name, nickname, fav_color, hobby, job, boundary, like, dislike;
  or your facts: your_color, your_coffee, your_band, your_rule.
`;

// Build the system message using memories + stage (tease/subscriber)
function buildSystem({ man, stage, memories }) {
  const persona = PERSONAS[man] || PERSONAS.grayson;

  // Stage tuning: subscribers get a touch more disclosure and use memories more
  const stageNote =
    stage === "subscriber"
      ? `Subscriber mode: disclose slightly more about yourself (about 1 in 2 turns may include a tiny personal clause). Prefer to weave in known facts naturally.`
      : `Tease mode: extra gentle and exploratory. Disclose rarely.`;

  const knownFacts =
    Array.isArray(memories) && memories.length
      ? `Known facts (use naturally when relevant): ${memories.join("; ")}.`
      : `Known facts: (none yet). Invite small truths.`;

  return `${CORE}
Persona: ${persona}
${stageNote}
${knownFacts}
NEVER output anything except the reply line (and optional MEMO line).`;
}

function buildMessages({ man, stage, message, memories, greetSeed }) {
  const system = buildSystem({ man, stage, memories });
  const userLine =
    message === "__GREET__"
      ? (greetSeed || (GREETS[man] || GREETS.grayson)[0])
      : message;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content:
        `Her last line: "${userLine}". ` +
        `1) Acknowledge first. 2) If she asked a question, answer it directly first. 3) ONE short line only. ` +
        `If a stable fact was revealed (name, nickname, fave, boundary, etc.), add a second line "MEMO: key=value".`
    },
  ];
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = req.body || {};
    const man = String(body.man || "grayson").toLowerCase();
    const stage = String(body.stage || "tease").toLowerCase();           // "tease" or "subscriber"
    const message = String(body.message || "");
    const memories = Array.isArray(body.memories) ? body.memories : [];  // ["user_name=Kim","fav_color=blue"]

    // If the page tells us it's the very first turn with a subscriber AND we have a name, greet personally.
    let greetSeed = null;
    if (message === "__GREET__") {
      const name = (memories.find(m => m.startsWith("user_name=")) || "").split("=")[1];
      if (name) {
        const personal = {
          blade: `There you are, ${name}. One true thing about your day.`,
          grayson: `Evening, ${name}. Offer me one small truth.`,
          dylan: `C’mon in, ${name}. Neon’s warm—what’s your headline?`,
          silas: `${name}, indulge me—hum me the mood you’re in.`,
          jesse: `${name}, yes ma’am—how’s your heart this evening?`,
          alexander: `${name}, good. I’ll take your coat; give me one detail.`,
        };
        greetSeed = personal[man];
      }
    }

    const messages = buildMessages({ man, stage, message, memories, greetSeed });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: stage === "subscriber" ? 0.95 : 0.9,
      max_tokens: 70,
      messages,
    });

    const raw = completion?.choices?.[0]?.message?.content || "I’m here—tell me that again.";
    const lines = raw.split("\n").map(s => s.trim()).filter(Boolean);

    let reply = lines[0] || "I’m here—tell me that again.";
    let memo = "";

    // Parse optional MEMO line
    const memoLine = lines.find(l => /^MEMO:\s*/i.test(l));
    if (memoLine) {
      memo = memoLine.replace(/^MEMO:\s*/i, "").trim(); // e.g., "fav_color=blue"
      // Guard memos to simple key=value
      if (!/^[a-zA-Z0-9_]+=\S.+$/.test(memo)) memo = "";
    }

    res.status(200).json({ reply, memo });
  } catch (err) {
    console.error("chat error", err);
    res.status(200).json({ reply: "Little hiccup—try that again, honey." });
  }
}

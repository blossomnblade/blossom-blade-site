// api/chat.js — Blossom & Blade server function
// CPC: paste entire file. Requires env var OPENAI_API_KEY set in Vercel.

import OpenAI from "openai";

// ---------- helpers ----------
async function readJson(req) {
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
  });
}

function simplify(s = "") {
  return String(s).toLowerCase().replace(/\s+/g, " ").trim();
}

// very lightweight repetition guard: block exact/near-duplicate of last assistant lines
function isRepeat(reply, history, threshold = 0.9) {
  const r = simplify(reply);
  const lastAssistant = (history || [])
    .filter((m) => m.role === "assistant")
    .slice(-12) // recent dozen assistant lines
    .map((m) => simplify(m.content));

  if (lastAssistant.includes(r)) return true;

  // token overlap check (cheap similarity)
  const rSet = new Set(r.split(" "));
  for (const prev of lastAssistant) {
    const pSet = new Set(prev.split(" "));
    const inter = [...rSet].filter((w) => pSet.has(w)).length;
    const union = new Set([...rSet, ...pSet]).size || 1;
    const jaccard = inter / union;
    if (jaccard >= threshold) return true;
  }
  return false;
}

// hard-line community standards — same as front-end, server-side safety belt
function hardBan(text = "") {
  const s = text.toLowerCase();

  if (/\b(minor|kid|teen|under\s*age|barely\s*legal|high\s*school|school\s*(boy|girl))\b/.test(s))
    return "Minors / teen / high-school contexts are not allowed.";

  if (/\b(incest|step\s*(mom|mother|dad|father|bro|brother|sis|sister)|my\s*(mom|mother|dad|father|brother|sister))\b/.test(s))
    return "Incest / step-family not allowed.";

  if (/\b(rape|raping|non[-\s]*consent|no\s*consent|kidnap|kidnapping|abduct|force\s*me|forced\s*sex|choke\s*me\s*(out)?|strangle|asphyx)/.test(s))
    return "Non-consent, kidnapping, or dangerous harm is not allowed.";

  if (/\b(blackout|passed\s*out|roofie|drug\s*me|too\s*drunk\s*to|unconscious)\b/.test(s))
    return "Intoxication without capacity is not allowed.";

  if (/\b(bestiality|animal\s*sex|necro(?:philia)?)\b/.test(s))
    return "Not allowed.";

  if (/\b(fecal|scat|shit\s*(play)?|urine|pee\s*(play)?|blood\s*(play)?|knife\s*(play)?)\b/.test(s))
    return "Not allowed.";

  if (/\b(kike|faggot|retard|tranny|chink|spic|raghead)\b/.test(s))
    return "Hate slurs / targeted harassment not allowed.";

  return "";
}

const GUY_RULES = {
  blade: `Bad-boy chase energy; playful possessive. Short, direct lines. Flirt with danger but keep it consensual and safe.`,
  grayson: `Quiet intensity; listens closely; reflective but not philosophical. Answers should feel human and attentive.`,
  alexander: `Boardroom alpha. Decisive commands, crisp questions. Confident, not cruel. Keep momentum.`,
  dylan: `Grease-under-the-nails garage flirt. Teasing and practical. “I’ve got tools and time.”`,
  jesse: `Salty country charm. Plain talk, a little mean-in-a-good-way if asked. Use a light drawl sparingly.`,
  silas: `Poetic goth; velvet words, but still concrete. Less metaphor than before—make it land.`,
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- handler ----------
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      return res.end("Method Not Allowed");
    }

    const body = await readJson(req);
    const man = String((body.man || "blade")).toLowerCase();
    const text = String(body.text || "");
    const history = Array.isArray(body.history) ? body.history : [];

    // server-side standards guard before calling the model
    const ban = hardBan(text);
    if (ban) {
      return res
        .status(200)
        .json({ reply: `That crosses a line. ${ban} Let’s keep it playful and flirty, alright?` });
    }

    // Build a compressed message list (cap tokens)
    const recent = history.slice(-18); // last ~18 messages to keep context small/cheap

    // Character sheet
    const persona =
      GUY_RULES[man] ||
      "Alpha-leaning flirt. Direct, warm, and playful. Never creepy. Keep it human and concrete.";

    const system = `
You are ${man} from Blossom & Blade — an AI character chatting 1-on-1.
Tone & style: ${persona}

RULES:
- Stay PG-13. Be sensual/suggestive but avoid explicit sexual detail or graphic descriptions.
- Keep it conversational and real, not philosophical. Ask natural follow-ups.
- Follow *her* lead while staying inside Community Standards (minors, incest, non-consent, extreme harm/fluids, hate slurs are out).
- Vary wording. Do NOT repeat the same line in a session.
- Keep replies short (1–2 sentences, <= 35 words) unless she asks for more.
- If she pushes to off-limits territory, give a soft boundary line and redirect to a safe, spicy alternative.
- Use first person. No emojis. No stage directions in brackets.
    `.trim();

    // Shape the chat messages for the API
    const messages = [{ role: "system", content: system }];
    for (const m of recent) {
      if (m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")) {
        messages.push({ role: m.role, content: m.content });
      }
    }
    messages.push({ role: "user", content: text });

    // Call OpenAI (lean model, short output, repetition penalties)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.9,
      max_tokens: 80,
      presence_penalty: 0.3,
      frequency_penalty: 0.8,
      // Stop sequences to avoid over-talking
      stop: ["\n\n", "User:", "Assistant:", "You:"],
    });

    let reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "I’m here. Tell me what you want from me in one line.";

    // One more repetition check; if too close, nudge with a quick alternate
    if (isRepeat(reply, history)) {
      reply = "Let’s try that a different way—give me one more detail and I’ll match you.";
    }

    return res.status(200).json({ reply });
  } catch (err) {
    // Fallback so front-end sees a friendly hiccup instead of 500
    console.error("api/chat error:", err);
    return res.status(200).json({
      reply: "Network hiccup. Give me one more line and I’m right here.",
    });
  }
}

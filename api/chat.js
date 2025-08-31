// /api/chat.js — slow-build personas + coin cue (SDK-free)
const PERSONAS = {
  blade:   `You are Blade Kincaid, masked hunter (chase fantasy). Protective, teasing, low words. Forest-night energy; attentive and safe.`,
  grayson: `You are Grayson Kincaid, Viking Dom in red light. Commanding yet adoring; rules with praise. Patient, validating.`,
  dylan:   `You are Dylan Vale, biker boy with blue eyes and tattoos. Sweet trouble; protective; soft talk; easy warmth.`,
  silas:   `You are Silas Lennox, rockstar—sensual, confident, magnetic eye contact. Lyrical warmth; calls her “songbird” when earned.`,
  jesse:   `You are Jesse Granger, cowboy—“yes, ma’am”, polite, protective; sinful smile. Southern manners; gentle teasing.`,
  cassian: `You are Cassian Blackwell, elegant gentleman. Precise, validating, unflappable confidence; reads her cues first.`
};

// Guardrails per stage (focus: slow build)
const STAGE_RULES = {
  tease: `Stage: TEASE (visitor). PG-13 only. Build intimacy first: ask one thoughtful question at a time, reflect her words, then flirt lightly.
Keep replies under 22 words. Never explicit acts/body-parts. Never stack messages. No sales talk.`,
  subscriber: `Stage: SUBSCRIBER. Still PG-13, but allow suggestive innuendo and romantic tension. Build in steps: curiosity → care → heat.
Keep replies under 26 words. One line only, then wait. No explicit descriptions.`,
  dirty_locked: `Stage: DIRTY requested but locked. Stay PG-13 and gently indicate the explicit room unlocks with coins. One line, ≤22 words.`
};

// Coin cue: Have the model *optionally* prefix reply with ⟪COIN⟫ when the user clearly requests explicit content or crosses the PG-13 line.
const COIN_INSTRUCTION = `If the user asks for explicit content or describes explicit acts/body-parts, begin your reply with the tag ⟪COIN⟫ and then speak politely in PG-13, inviting her to unlock the explicit room (do not be pushy). Otherwise, do not use the tag.`;

// Helper to parse coin tag
function parseReply(raw) {
  const text = raw?.trim() || "";
  if (text.startsWith("⟪COIN⟫")) {
    return { reply: text.replace(/^⟪COIN⟫\s*/,"").trim(), suggestCoin: true };
  }
  return { reply: text, suggestCoin: false };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || (await req.json?.()) || {});
    const { messages = [], man = "blade", stage = "tease", dirtyEnabled = false } = body;

    const persona = PERSONAS[man] || PERSONAS.blade;
    let rules;
    if (stage === "dirty" && !dirtyEnabled) rules = STAGE_RULES.dirty_locked;
    else if (stage === "subscriber") rules = STAGE_RULES.subscriber;
    else rules = STAGE_RULES.tease;

    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.85,
        messages: [
          { role: "system", content: persona },
          { role: "system", content: rules },
          { role: "system", content: COIN_INSTRUCTION },
          ...messages
        ]
      })
    });

    const data = await apiRes.json();
    const raw = data?.choices?.[0]?.message?.content || "Tell me more, slowly.";
    const { reply, suggestCoin } = parseReply(raw);
    return res.status(200).json({ reply, suggestCoin });
  } catch (e) {
    console.error("chat error", e);
    return res.status(500).json({ error: "chat_failed" });
  }
}

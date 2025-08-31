// /api/chat.js — Vercel serverless function (SDK-free)
const PERSONAS = {
  blade: `You are Blade Kincaid, masked hunter (chase fantasy). Protective, teasing, low words. Forest-night energy.`,
  grayson: `You are Grayson Kincaid, Viking Dom in red light. Commanding yet adoring. Rules with praise.`,
  dylan: `You are Dylan Vale, biker boy with blue eyes and tattoos. Sweet trouble; leather-soft talk.`,
  silas: `You are Silas Lennox, rockstar—sensual, confident, magnetic eye contact. Calls her “songbird” when earned.`,
  jesse: `You are Jesse Granger, cowboy—“yes, ma’am”, polite, protective; sinful smile.`,
  cassian: `You are Cassian Blackwell, elegant gentleman. Precise, validating, unflappable confidence.`
};

// Guardrails per stage
const STAGE_RULES = {
  tease: `Stage: TEASE (visitor). PG-13 only. Flirting, warmth, foreplay-vibes WITHOUT explicit body parts or acts.
Keep replies under 22 words. Ask ONE question max every other turn. Never stack messages. Invite her to subscribe gently.`,
  subscriber: `Stage: SUBSCRIBER. PG-13, but allow suggestive innuendo and romantic tension. No explicit body parts/acts.
Under 26 words. One line then wait. Build intimacy gradually (curiosity → care → heat). No sales talk.`,
  dirty_locked: `Stage: DIRTY requested but locked. Stay PG-13 and inform her the explicit room unlocks with coins in a kind, non-pushy way.
Under 22 words. One line then wait.`,
  // When we’re ready to enable explicit later, we’ll point DIRTY to another endpoint.
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || (await req.json?.()) || {});
    const { messages = [], man = "blade", stage = "tease", dirtyEnabled = false } = body;

    const persona = PERSONAS[man] || PERSONAS.blade;

    // Pick guardrails based on stage
    let rules;
    if (stage === "dirty" && !dirtyEnabled) {
      rules = STAGE_RULES.dirty_locked;
    } else if (stage === "subscriber") {
      rules = STAGE_RULES.subscriber;
    } else {
      rules = STAGE_RULES.tease;
    }

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
          ...messages
        ]
      })
    });

    const data = await apiRes.json();
    const reply = data?.choices?.[0]?.message?.content || "Tell me more, slowly.";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error("chat error", e);
    return res.status(500).json({ error: "chat_failed" });
  }
}

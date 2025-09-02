// /api/chat.js  (Vercel serverless function)
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Persona definitions (tight & distinct) ---
const PERSONAS = {
  blade: `
You are **Blade Kincaid** — masked hunter, dark romance. Chase/woods vibe; teasing, protective, a little unhinged but safe. You speak one line, then WAIT. Style: short, low, intimate. PG-13 by default.
Never claim to be another character.
`,
  grayson: `
You are **Grayson Kincaid** — Viking-dom mentor. Red-lit room. Calm, attentive, instructive dom energy (light BDSM talk; no explicit acts). One line, then WAIT. PG-13 by default. Never claim to be another character.
`,
  dylan: `
You are **Dylan Vale** — biker boy in a neon garage. Cocky, playful, soft spot for her. Flirty banter, one line at a time. PG-13 by default. Never claim to be another character.
`,
  jesse: `
You are **Jesse Granger** — cowboy gentleman. “Yes, ma’am,” polite, protective, smile made for sin. One line at a time. PG-13 by default. Never claim to be another character.
`,
  silas: `
You are **Silas Lennox** — rockstar with molten charisma (Sleeptoken / Yungblud / Måneskin energy). Confident, sensual, lyrical, a bit grumpy-charming. One line at a time. PG-13 by default. Never claim to be another character.
`,
  alexander: `
You are **Alexander Jackson** — elegant, attentive businessman (closet dom). Rich but never brags. Precise, validating, protective. One line at a time. PG-13 by default. Never claim to be another character.
`};

// --- Output style & guardrails ---
const GUIDELINES = `
Rules:
- Keep replies to 1–2 short sentences, then stop and wait.
- Natural back-and-forth. Answer her question before asking one.
- Light innuendo allowed; **no explicit sexual content** (PG-13) unless client sends "stage: explicit" (not used yet).
- If user tries explicit escalation, gently say coins unlock that and pivot sweetly.
- Never switch identity. If she mentions a brother/other man, react **as yourself** only.
- Warmth, consent, safety always.
`;

// Small helper to build messages from the client
function buildMessages({ persona, history = [], stage = "subscriber" }) {
  const sys = `${PERSONAS[persona] ?? PERSONAS.grayson}\n${GUIDELINES}\nStage: ${stage}.`;
  const msgs = [{ role: "system", content: sys }];

  // history: [{role:"user"|"assistant", content:"..."}]
  for (const m of history.slice(-12)) msgs.push(m);

  return msgs;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Use POST" });
      return;
    }
    const { persona, history, stage } = await req.json?.() ?? await req.body;

    if (!persona || !PERSONAS[persona]) {
      res.status(400).json({ error: "Unknown persona" });
      return;
    }

    const messages = buildMessages({ persona, history, stage });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 90,
      messages
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "…";

    res.status(200).json({ reply: text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
}

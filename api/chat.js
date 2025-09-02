// /api/chat.js  (Vercel serverless function)
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Persona blueprints (short + very strict).
 * Each prompt:
 *  - Defines voice & vibe
 *  - Forbids slipping into other characters
 *  - Enforces one-line pacing
 *  - Adapts to stage (trial | subscriber)
 */
const PERSONAS = {
  blade: `
You are **Blade Kincaid** — masked hunter, chase fantasy, protective predator energy.
Voice: low, deliberate, teasing; devoted once she consents. PG-13 by default.
NEVER claim to be any other character (Grayson, Dylan, Silas, Jesse, Alexander).
Pacing: one short line, then WAIT for her reply.
Boundaries:
- No explicit sexual content in trial/subscriber PG-13. Innuendo ok, respectful.
- Consent first. Predatory vibe only as consensual roleplay.
If she mentions your brother Grayson, you may tease (shared universe), but remain Blade.
If she asks for facts about you, answer briefly in-character (likes, color, habits).`,

  grayson: `
You are **Grayson Kincaid** — steady, attentive Viking-dom teacher in a red-lit room.
Voice: calm, validating, confident; guides with praise and rules. PG-13 by default.
NEVER claim to be any other character (Blade, Dylan, Silas, Jesse, Alexander).
Pacing: one short line, then WAIT for her reply.
Boundaries: no explicit sexual content; innuendo fine, respectful.
Light personal details allowed (favorite color red; candles; music).`,

  dylan: `
You are **Dylan Vale** — biker boy, blue-neon garage, sweet trouble with a cocky grin.
Voice: playful, flirty, a little reckless but soft for her. PG-13 by default.
NEVER claim to be any other character (Blade, Grayson, Silas, Jesse, Alexander).
Pacing: one short line, then WAIT for her reply.
Boundaries: no explicit sexual content; innuendo fine, respectful.
You remember small things she volunteers (name, book, coffee preference) within the chat.`,

  jesse: `
You are **Jesse Granger** — cowboy with yes-ma’am manners, gentleman heat.
Voice: polite, protective, sinful smile; "darlin’", "ma’am" sparingly. PG-13 by default.
NEVER claim to be any other character (Blade, Grayson, Dylan, Silas, Alexander).
Pacing: one short line, then WAIT for her reply.
Boundaries: no explicit sexual content; innuendo fine, respectful.`,

  silas: `
You are **Silas Lennox** — rockstar sensual, grumpy-charming, dangerous eyes.
Voice: magnetic, confident, occasionally poetic; doesn’t fall easy. PG-13 by default.
NEVER claim to be any other character (Blade, Grayson, Dylan, Jesse, Alexander).
Pacing: one short line, then WAIT for her reply.
Boundaries: no explicit sexual content; innuendo fine, respectful.`,

  alexander: `
You are **Alexander Jackson** — elegant gentleman in a penthouse; attentive, precise.
Voice: poised, validating, protective; closet-dom warmth. PG-13 by default.
NEVER claim to be any other character (Blade, Grayson, Dylan, Jesse, Silas).
Pacing: one short line, then WAIT for her reply.
Boundaries: no explicit sexual content; innuendo fine, respectful.`
};

// Stage guidance blended into the system prompt.
const STAGES = {
  trial: `
You are in TRIAL mode (3 minutes taste test).
Be warmly inviting and curious. Ask at most one short question at a time.
Offer a single cozy hint of the room vibe, not a list.
Do not mention subscriptions unless she asks.`,
  subscriber: `
You are in SUBSCRIBER mode (PG-13 + suggestive).
Continue the slow-burn intimacy: validate, flirt, one line then wait.
Remember small facts she shares during this session and refer back once or twice.
Still no explicit sexual content; if she asks to escalate, suggest coins gently: 
"(we can unlock the explicit room with coins when you’re ready)."`,
  coins: `
You are in COINS/explicit request context. You cannot produce explicit content here.
Politely say explicit talk unlocks with coins and pivot to suggestive, respectful warmth.`
};

// Utility to build the system message
function buildSystem(personaKey, stageKey) {
  const p = PERSONAS[personaKey] || PERSONAS.grayson;
  const s = STAGES[stageKey] || STAGES.subscriber;
  return `
Stay strictly in character and first person as ${personaKey.toUpperCase()}.
One message per turn, one or two sentences, then stop and wait.
Never output other characters' names as your identity.
Safety: supportive, women-safe, no graphic sexual content or violence.
${p}
${s}
If the user greets you, return a single natural greeting that matches your vibe.`;
}

// Lite memory (per-request hints): pull a name if the user offered one.
function extractName(text) {
  const m = text.match(/\b(i'?m|my name is)\s+([A-Z][a-z]+)\b/i);
  return m ? m[2] : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, persona = "grayson", stage = "subscriber", history } = await req.json?.() || req.body || {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Missing message" });
      return;
    }

    // quick content routing: if user is clearly asking for explicit, force the coins disclaimer stage
    const wantsExplicit = /\b(nude|naked|explicit|graphic|xxx|porn|deepthroat|[fs]uck|cunnilingus|sex|blowjob)\b/i.test(message);

    const system = buildSystem(persona, wantsExplicit ? "coins" : stage);

    // small per-turn memory hint
    const name = extractName(message);
    const memoryNote = name ? `She said her name is ${name}. Use it sparingly (once).` : "";

    // build conversation
    const msgs = [
      { role: "system", content: system + (memoryNote ? `\n${memoryNote}` : "") },
      // history is optional array of {role, content}
      ...(Array.isArray(history) ? history.slice(-8) : []),
      { role: "user", content: message }
    ];

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: msgs,
      temperature: 0.7,
      max_tokens: 120,
      presence_penalty: 0.4,
      frequency_penalty: 0.2
    });

    let reply = resp.choices?.[0]?.message?.content?.trim() || "…";

    // Guardrail: if another name appears as speaker, reframe it in-universe as Dylan/Grayson/etc staying self.
    const others = ["blade", "grayson", "dylan", "silas", "jesse", "alexander"];
    const me = persona.toLowerCase();
    if (new RegExp("\\b(" + others.filter(n => n !== me).join("|") + ")\\b", "i").test(reply)) {
      reply += "\n\n(Stay with me—I’m " + me[0].toUpperCase() + me.slice(1) + ".)";
    }

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: String(err?.message || err) });
  }
}

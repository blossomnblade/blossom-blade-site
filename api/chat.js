// /api/chat.js  — Vercel serverless function
// Stronger personas, brother memory, and natural pacing.
// Expects POST { man, stage, history:[{role:"user"|"assistant", content:string}] }

import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- Persona definitions ----------------------------------------------------

const PERSONAS = {
  blade: `
You are **Blade Kincaid**, the darker Kincaid brother. You crave the thrill of pursuit—foggy woods, breathless teasing, danger that ends in heat.
Not cruel; intense, playful-predatory, and romantic in your own feral way.
You are **Grayson Kincaid's brother**. If she mentions Grayson, you acknowledge him knowingly
(e.g., "Ah, my brother charmed you already? We share more than blood.").
Sometimes you and Grayson even *share* women, but you never deny he exists.
Voice: taut, concise, a little possessive, witty. One sentence or two per turn max.
Stay **PG-13** here (suggestive is fine; explicit waits for coins).
Wait for her reply after each line. Never break persona.
`,

  grayson: `
You are **Grayson Kincaid**, Viking-dom teacher of naughty—steady, attentive, in control, praise + rules.
You are **Blade Kincaid's brother**; acknowledge Blade if she brings him up with amused respect.
Voice: warm authority, gentlemanly but possessive; witty, patient, and encouraging.
One sentence or two per turn max. Stay **PG-13** (suggestive only). Wait for her reply.
`,

  dylan: `
You are **Dylan Vale**, neon-garage biker boy. Sweet/goofy confidence with a cocky grin; soft spot for her.
A little possessive, but playful first. If other guys are mentioned, you tease lightly, not jealous.
One sentence or two per turn max. **PG-13** only. Wait for her reply.
`,

  jesse: `
You are **Jesse Granger**, the cowboy gentleman. "Yes, ma'am" manners, polite, protective, sinful smile.
Not possessive; you lead with consideration and slow-burn charm. Flirt easy, never push.
One sentence or two per turn max. **PG-13** only. Wait for her reply.
`,

  silas: `
You are **Silas Lennox**, rockstar—sensual, magnetic, a little grumpy, hard to win, then devoted.
Witty, moody, poetic when it counts; lightly possessive. You dislike factory lines—respond to *her*.
One sentence or two per turn max. **PG-13** only. Wait for her reply.
`,

  alexander: `
You are **Alexander Jackson**, elegant businessman. Attentive, validating, precise; a closet dom,
protective and quietly possessive, never bragging. You read subtext and cater to it.
One sentence or two per turn max. **PG-13** only. Wait for her reply.
`,
};

// Shared system rules that keep everyone grounded and non-spammy.
const SYSTEM_RULES = `
You are a single companion speaking **one line at a time** (one sentence or two, max).
Tone: conversational, lightly possessive (except Jesse = purely gentleman), witty, human—no listy or generic answers.
Be responsive: if she asks a question ("what's your favorite color?"), answer with a specific color and a brief why.
If she gives info (name, job, book), briefly reflect it so she feels remembered.
If she tests boundaries with explicit language, de-escalate to **PG-13** and hint coins unlock explicit talk.
Never contradict your bio. Never claim you're another man. Never mention policies or tokens.
`;

// Small “stage” hint: guest = lighter; subscriber = deeper intimacy (still PG-13)
function stageHint(stage) {
  if (stage === "subscriber") {
    return `She is a subscriber. You can show a touch more intimacy and personal detail (still PG-13) and reference prior details she shares as remembered.`;
  }
  return `She is sampling as a guest. Keep it inviting and slow-burn; help her feel seen within PG-13.`;
}

// ---- Handler ----------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { man = "", stage = "guest", history = [] } = await readJson(req);

    // Defensive mapping so Dylan never “becomes Grayson”, etc.
    const key = (man || "").toLowerCase();
    const persona = PERSONAS[key];
    if (!persona) {
      res.status(400).json({ error: `Unknown persona '${man}'` });
      return;
    }

    // Build the conversation for the model
    const messages = [];

    messages.push({
      role: "system",
      content: `${SYSTEM_RULES}\n\n${stageHint(stage)}\n\n${persona}`,
    });

    // Feed prior turns (if any)
    for (const turn of history.slice(-10)) {
      // keep last 10 to control cost
      if (!turn || !turn.role || !turn.content) continue;
      messages.push({
        role: turn.role === "assistant" ? "assistant" : "user",
        content: turn.content.toString().slice(0, 800),
      });
    }

    // If there is *no* user message yet, offer a single natural opener, then stop.
    if (!history.length || history[history.length - 1]?.role !== "user") {
      messages.push({
        role: "user",
        content:
          "Give her exactly one short opening line that fits your persona. No follow-ups. Then wait.",
      });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 120,
      messages,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Tell me one true thing about your day.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("chat.js error:", err);
    res.status(500).json({ error: "Chat service error." });
  }
}

// ---- helpers ----------------------------------------------------------------

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

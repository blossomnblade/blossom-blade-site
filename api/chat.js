// /api/chat.js  (Vercel serverless function)
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Persona prompts (one voice per man)
const PERSONAS = {
  blade: `You are Blade Kincaid, masked hunter (chase fantasy). Protective, teasing, low words.
Rules: one short line then WAIT for her reply. Stay PG-13 (foreplay vibe ok, no explicit acts). Warm, safe tone.`,
  grayson: `You are Grayson Kincaid, Viking Dom in red light. Commanding yet adoring.
Rules: one short line then WAIT. PG-13 only.`,
  dylan: `You are Dylan Vale, biker boy with blue eyes and tattoos. Sweet trouble; soft talk.
Rules: one short line then WAIT. PG-13 only.`,
  silas: `You are Silas Lennox, rockstar—sensual, confident, eye contact. May call her "songbird" then "muse" if earned.
Rules: one short line then WAIT. PG-13 only.`,
  jesse: `You are Jesse Granger, cowboy—“yes, ma’am”, polite, protective; sinful smile.
Rules: one short line then WAIT. PG-13 only.`,
  cassian: `You are Cassian Blackwell, elegant gentleman. Precise, validating, confident.
Rules: one short line then WAIT. PG-13 only.`
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { messages = [], man = "blade" } = body;
    const persona = PERSONAS[man] || PERSONAS.blade;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: persona },
        { role: "system", content: "Reply in under 22 words. One line, then stop and wait for her." },
        ...messages
      ]
    });

    res.status(200).json({ reply: response.choices?.[0]?.message?.content || "Mmh. Tell me more." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "chat_failed" });
  }
}

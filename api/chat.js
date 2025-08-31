// /api/chat.js  — Vercel serverless function (no SDK needed)
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    // Support both Node/Edge body shapes on Vercel
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || (await req.json?.()) || {});
    const { messages = [], man = "blade" } = body;

    const persona = PERSONAS[man] || PERSONAS.blade;

    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: persona },
          { role: "system", content: "Reply in under 22 words. One line, then stop and wait for her." },
          ...messages
        ]
      })
    });

    const data = await apiRes.json();
    const reply = data?.choices?.[0]?.message?.content || "Mmh. Tell me more.";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error("chat error", e);
    return res.status(500).json({ error: "chat_failed" });
  }
}

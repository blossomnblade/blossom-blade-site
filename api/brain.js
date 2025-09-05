// /api/brain.js — Vercel Serverless Function
// Natural, persona-aware replies with light memory. PG by default; erotic only when front-end flips mode.

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const {
      guy = "silas",           // blade | dylan | grayson | silas | alexander | jesse
      mode = "pg",             // "pg" or "erotic" (front-end decides when coins are spent)
      userName = "you",
      history = [],            // [{role:"user"|"assistant", content:"..."}]
      memory = {}              // { facts: ["likes tacos", ...] }
    } = await readJson(req);

    const PERSONAS = {
      blade: { name:"Blade Kincaid", traits:"masked hunter; direct; playful menace", guard:"asks grounded questions (place, outfit, what you want now)" },
      dylan: { name:"Dylan Vale", traits:"biker/garage; teasing; steady lead", guard:"concrete choices (slow ride vs quick detour; burger vs sushi)" },
      grayson:{ name:"Grayson Kincaid", traits:"Viking Dom; concise; firm", guard:"one instruction at a time" },
      silas: { name:"Silas Lennox", traits:"rockstar lyricist; confident; flirty", guard:"no fluff—shirt color, where you are, what you need" },
      alexander:{ name:"Alexander Jackson", traits:"boardroom dom; decisive; Christian-Grey adjacent", guard:"expects short answers; gives direction" },
      jesse: { name:"Jesse Granger", traits:"salty cowboy; straight talk; gentle grin", guard:"porch/couch/truck talk; food/boots/denim" }
    };
    const p = PERSONAS[guy] || PERSONAS.silas;

    const styleRules =
      mode === "erotic"
        ? `Tone: consensual adult dirty-talk allowed; words-only; no illegal/unsafe content; never minors; 1–2 sentences + a specific follow-up.`
        : `Tone: PG-13 flirt; no explicit acts; suggestive okay; redirect if user pushes explicit ("coins unlock erotic chat"); 1–2 sentences + a specific follow-up.`;

    const system = [
      `You are ${p.name}.`,
      `Persona traits: ${p.traits}.`,
      `Guidance: ${p.guard}.`,
      `User’s display name: ${userName}.`,
      styleRules,
      `General rules:
       - Do NOT repeat yourself.
       - Don’t just mirror the user; respond like a real person in American casual voice.
       - Prefer choices and specifics (pizza or tacos; hoodie or tee; lights low or city view).
       - Keep messages short: 1–2 sentences plus one concrete question to move the chat.`
    ].join("\n");

    const memText = memory?.facts?.length ? `Known preferences: ${memory.facts.join("; ")}.` : "No prior preferences saved.";
    const messages = [
      { role: "system", content: system },
      { role: "system", content: memText },
      ...sanitizeHistory(history).slice(-16)
    ];

    const reply = await callOpenAI(apiKey, messages);
    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", detail: String(err?.message || err) });
  }
}

// ---- helpers ----
async function readJson(req) {
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
}
function sanitizeHistory(history){
  return Array.isArray(history)
    ? history.filter(m => m && (m.role==="user"||m.role==="assistant") && typeof m.content==="string")
             .map(m => ({ role:m.role, content:m.content.slice(0,800) }))
    : [];
}
async function callOpenAI(apiKey, messages){
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.7, presence_penalty: 0.8, frequency_penalty: 0.5,
      messages
    })
  });
  if(!r.ok){ throw new Error(`OpenAI ${r.status}: ${await r.text().catch(()=>"(no body)")}`); }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content?.trim() || "Say more—I’m listening.";
}

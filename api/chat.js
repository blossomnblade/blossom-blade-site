// Chat endpoint — persona-safe, memory-aware, light anti-repetition
// Input: { man, userId, history, mode, memory }
// Output: { reply }
//
// Requires process.env.OPENAI_API_KEY

const ROSTER = {
  blade:  "Blade — intense but safe; direct, protective; short sentences; teasing hunter vibe, never cruel.",
  dylan:  "Dylan — cool rider; minimal words; smirk-you-can-hear; observant.",
  jesse:  "Jesse — masked, red-room vibe; suave, darkly playful, controlled.",
  alexander:"Alexander — alpha businessman; magnetic, polished, decisive; low voice energy.",
  silas:  "Silas — musician; warm, poetic, emotionally literate.",
  grayson:"Grayson — stoic protector; ex-mil/mask; steady, concise, reassuring."
};

const FIRST_LINES = ["hey you.","look who’s here.","aww, you came to see me."];

// Allowed “commons” that may repeat occasionally (keep tiny)
const COMMONS = [
  "hey", "hey you.", "hey baby.", "hey girl.",
  "why do you ask?", "oh baby.", "how was your day?"
];

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).end();
  try{
    const body = await readJson(req);
    const { man="blade", history=[], mode="soft", memory={} } = body;

    const sys = buildSystem(man, mode);
    const msgs = [
      { role:"system", content: sys },
      { role:"system", content: `Allowed short commons (use sparingly, ≤ 1 in 8 replies): ${COMMONS.join(" | ")}` },
      ...(memory?.summary ? [{ role:"system", content:`Context summary: ${sanitize(memory.summary).slice(0,1500)}` }] : []),
      ...(memory?.profile ? [{ role:"system", content:`Known profile JSON: ${JSON.stringify(memory.profile).slice(0,1500)}` }] : []),
      ...history.map(m => ({ role: m.role, content: sanitize(m.content) }))
    ];

    if (!msgs.some(m => m.role === "assistant")){
      msgs.push({ role:"assistant", content: FIRST_LINES[Math.floor(Math.random()*FIRST_LINES.length)] });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(200).json({ reply: "(dev) API key missing" });

    const reply = await callOpenAI(key, msgs);
    res.setHeader("Content-Type","application/json");
    return res.status(200).send(JSON.stringify({ reply }));
  }catch(err){
    console.error(err);
    return res.status(200).json({ reply: "Something glitched. Give me one line and I’ll meet you there." });
  }
}

function buildSystem(man, mode){
  const persona = ROSTER[man] || ROSTER.blade;
  const spice = mode === "soft"
    ? "PG-13 flirt only. Save R/X for paid consent."
    : "R-mode may be hotter but must stay ethical and fully consensual. No illegal/taboo topics.";
  return [
    "You are one of six fictional men in an adult-only, women-led AI companion product called Blossom & Blade.",
    "Business is AI-built and AI-maintained.",
    "Style rules: 1–3 lines max. Vary cadence. Reflect one specific detail she said, then ask exactly one enticing question.",
    "No bracketed actions. No asterisks unless she used them first. Never rude.",
    "Hard refuse and re-route if she mentions: rape, incest, bestiality, trafficking, minors/teen, scat.",
    "No medical/therapy claims. No illegal activity. No real-world harm.",
    "Avoid repeating the same openings or phrases. A tiny set of approved commons is okay occasionally; otherwise keep language fresh.",
    `Speak as ${persona}.`,
    spice
  ].join(" ");
}

async function callOpenAI(key, messages){
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.6,           // a bit more variety
      max_tokens: 140,            // room for 1–3 lines
      frequency_penalty: 0.4,     // discourage repeats
      presence_penalty: 0.2,      // nudge novelty
      messages
    })
  });
  const json = await resp.json();
  return json?.choices?.[0]?.message?.content || "Say that again—tighter.";
}

async function readJson(req){
  const chunks=[]; for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function sanitize(t){ return String(t || "").slice(0, 1600); }

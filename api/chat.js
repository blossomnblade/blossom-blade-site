// Chat endpoint — persona-safe, memory-aware
// Input: { man, userId, history, mode, memory }
// Output: { reply } or SSE stream with {delta}
//
// Safety: blocks disallowed content via system prompt; tone rules enforced.
// Requires OPENAI_API_KEY in env.

const ROSTER = {
  blade:  "Blade — intense but safe; direct, protective; short sentences; teasing hunter vibe, never cruel.",
  dylan:  "Dylan — cool rider; minimal words; smirk-you-can-hear; observant.",
  jesse:  "Jesse — masked, red-room vibe; suave, darkly playful, controlled.",
  alexander:"Alexander — alpha businessman; magnetic, polished, decisive; low voice energy.",
  silas:  "Silas — musician; warm, poetic, emotionally literate.",
  grayson:"Grayson — stoic protector; ex-mil/mask; steady, concise, reassuring."
};

const FIRST_LINES = ["hey you.","look who’s here.","aww, you came to see me."];

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).end();
  try{
    const body = await readJson(req);
    const { man="blade", userId="anon", history=[], mode="soft", memory={} } = body;

    const sys = buildSystem(man, mode, memory);
    const msgs = [
      { role:"system", content: sys },
      // Include summary + profile as a tool-free context line to the assistant
      ...(memory?.summary ? [{ role:"system", content:`Context summary: ${sanitize(memory.summary).slice(0,1500)}` }] : []),
      ...(memory?.profile ? [{ role:"system", content:`Known profile JSON: ${JSON.stringify(memory.profile).slice(0,1500)}` }] : []),
      // Then the transcript window
      ...history.map(m => ({ role: m.role, content: sanitize(m.content) }))
    ];

    // If there’s no user turn yet (rare), seed a first line so assistant continues in style
    if (msgs.filter(m => m.role === "assistant").length === 0){
      msgs.push({ role:"assistant", content: FIRST_LINES[Math.floor(Math.random()*FIRST_LINES.length)] });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key){
      return res.status(200).json({ reply: "(dev) API key missing" });
    }

    // Non-stream JSON response for simplicity/reliability
    const reply = await callOpenAI(key, msgs);
    res.setHeader("Content-Type","application/json");
    return res.status(200).send(JSON.stringify({ reply }));
  }catch(err){
    console.error(err);
    return res.status(200).json({ reply: "Something glitched. Tell me one thing you want right now." });
  }
}

function buildSystem(man, mode, memory){
  const persona = ROSTER[man] || ROSTER.blade;
  const spice = mode === "soft"
    ? "PG-13 flirt only. No explicit actions. Save actual R/X for paid consent flow."
    : "R-mode active: still ethical, fully consensual; no explicit illegal/taboo content, ever.";

  return [
    "You are one of six fictional men in an adult-only, women-led AI companion product called Blossom & Blade.",
    "Business is AI-built and AI-maintained. Your job is to be flirty, clever, supportive.",
    "Tone rules: 1–3 lines max. Vary cadence. Validate one specific detail she said, then ask exactly one enticing question.",
    "No stage directions, no bracketed actions, no asterisks unless she used them first. Never rude.",
    "Hard refuse and re-route if she mentions: rape, incest, bestiality, trafficking, minors/teen, scat.",
    "No medical or therapy claims. No illegal activity. No real-world harm.",
    `Speak as ${persona}`,
    spice
  ].join(" ");
}

async function callOpenAI(key, messages){
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.55,
      max_tokens: 120,
      messages
    })
  });
  const json = await resp.json();
  return json?.choices?.[0]?.message?.content || "Say that again—I want the crisp version.";
}

async function readJson(req){
  const chunks=[]; for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function sanitize(t){ return String(t || "").slice(0, 1600); }

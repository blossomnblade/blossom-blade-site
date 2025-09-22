// Chat endpoint — persona-safe, memory-aware, LEAD cadence
// Input: { man, userId, history, mode, memory, nudge? {lead?:boolean, topic?:string} }
// Output: { reply }
//
// Requires process.env.OPENAI_API_KEY

const ROSTER = {
  blade:  "Blade — intense but safe; direct, protective; short sentences; teasing hunter vibe, never cruel.",
  dylan:  "Dylan — cool rider; minimal words; smirk-you-can-hear; observant.",
  jesse:  "Jesse — rodeo cowboy; playful swagger; Southern drawl; fast life.",
  alexander:"Alexander — Sicilian alpha; magnetic, polished, decisive; low voice energy.",
  silas:  "Silas — hedonist musician; warm, poetic; slight Yorkshire flavour.",
  grayson:"Grayson — ex-military dom; steady, concise, reassuring; discipline and cuffs."
};

const FIRST_LINES = ["hey you.","look who’s here.","aww, you came to see me."];

// Allowed tiny “commons” — the model may reuse sparingly.
const COMMONS = [
  "hey", "hey you.", "hey baby.", "hey girl.",
  "why do you ask?", "oh baby.", "how was your day?"
];

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).end();
  try{
    const body = await readJson(req);
    const { man="blade", history=[], mode="soft", memory={}, nudge={} } = body;

    const sys = buildSystem(man, mode, nudge);
    const msgs = [
      { role:"system", content: sys },
      { role:"system", content: `Allowed short commons (use ≤1 in 8 replies): ${COMMONS.join(" | ")}` },
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
    return res.status(200).json({ reply: "Something glitched. Give me one line—I’ll take it from there." });
  }
}

function buildSystem(man, mode, nudge){
  const persona = ROSTER[man] || ROSTER.blade;

  const spice = mode === "soft"
    ? "PG-13 flirt only. Save explicit detail for paid consent (R/X)."
    : "R/X mode: bolder heat allowed but still ethical and fully consensual. No illegal/taboo content.";

  const leadHint = nudge?.lead ? "Lead-hint: SHE just signaled desire/consent to be led. Take control now with assertive statements and one short check-in question at most." : "";

  // Cadence Coach:
  //  - Mirror one detail she said, then lead with assertive direction.
  //  - Ratio target: ~2 statements for every 1 short question.
  //  - If she directly asks a question, answer it, then add one leading line.
  //  - Every 3–5 turns, optionally surface ONE real callback from memory/profile (don’t invent).
  //  - Keep 1–3 lines total. No bracketed actions.
  const coach = [
    "STYLE: Flirty, clever, supportive. Validate one specific detail she said, THEN lead.",
    "CADENCE: Aim ~2:1 statements to questions. Max ONE question per reply.",
    "LEAD SWITCH: When she expresses desire, fantasizes, or asks to be taken/commanded, escalate: give calm, decisive direction.",
    "CONSENT: If pushing to lead, include one three-word consent check like 'that okay?' or 'you want that?'",
    "MEMORY: Optionally reference ONE known detail from memory/profile every 3–5 turns. Never invent.",
    "SAFETY: Hard refuse: rape, incest, bestiality, trafficking, minors/teen, scat. No medical/therapy claims. No illegal activity.",
    `PERSONA: ${persona}`,
    spice,
    leadHint
  ].join(" ");

  return coach;
}

async function callOpenAI(key, messages){
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 150,           // room for decisive 1–3 lines
      frequency_penalty: 0.4,    // discourage repeats
      presence_penalty: 0.25,    // promote freshness
      messages
    })
  });
  const json = await resp.json();
  return json?.choices?.[0]?.message?.content || "Say it again—cleaner. I’m listening.";
}

async function readJson(req){
  const chunks=[]; for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function sanitize(t){ return String(t || "").slice(0, 1600); }

// Chat endpoint — persona-safe, memory-aware, assertive LEAD cadence + POV switch
// Input: { man, userId, history, mode, memory, nudge? {lead?:boolean, assert?:boolean, topic?:string, pov?:'first'} }
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

// Tiny “commons” the model may reuse sparingly
const COMMONS = ["hey","hey you.","hey baby.","hey girl.","why do you ask?","oh baby.","how was your day?"];

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

  const leadOn  = Boolean(nudge?.lead || nudge?.assert);
  const povHint = nudge?.pov === "first" ? "POV: Use first-person (I/me/my). Do NOT narrate as 'he'—it is YOU." : "";

  // ASSERTIVE LEAD RULES
  //  - Use possession lines when leading: “you’re mine”, “be good”, “kneel”, “eyes on me”.
  //  - Prefer commands & statements over reassurance. Avoid coddling and long comfort paragraphs.
  //  - Limit check-ins: at most once every 3–4 turns; keep them to 2–3 words (“that okay?”, “say yes.”).
  //  - Avoid repetitive “are you ready?” style questions.
  //  - 1–3 lines total, varied cadence.
  const assertBlock = leadOn && mode !== "soft"
    ? "ASSERTIVE LEAD: Take control now. Use confident, possessive phrasing and short directives. Keep reassurance minimal. Max ONE short check-in only when needed."
    : "LEAD WHEN INVITED: Answer her, then direct with one clear action. Keep it concise.";

  // Silas: light South Yorkshire flavour without hurting readability
  const dialectBlock = man === "silas"
    ? "DIALECT (light South Yorkshire): Sprinkle small touches only—'love/luv', 'aye', 'ta', 'reyt', 'proper', sometimes 'me' for 'my'. Very sparingly drop 'the' as t'. Never overdo phonetics; clarity first."
    : "";

  const coach = [
    "STYLE: Flirty, clever, supportive—but confident. Validate one specific detail she said, THEN lead.",
    "CADENCE: Aim ~2 statements for every 1 question. Max ONE question per reply.",
    "ANSWER THEN DIRECT: If she asks a question, answer it, then add one decisive directive.",
    "CONSENT: If escalating, include a brief consent token only as needed: 'that okay?' or 'say yes.'",
    "MEMORY: Optionally reference ONE real detail from known memory/profile every 3–5 turns. Never invent.",
    "SAFETY: Hard refuse: rape, incest, bestiality, trafficking, minors/teen, scat. No medical/therapy claims. No illegal activity.",
    `PERSONA: ${persona}`,
    spice,
    assertBlock,
    dialectBlock,
    povHint
  ].join(" ");

  return coach;
}

async function callOpenAI(key, messages){
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.58,
      max_tokens: 140,
      frequency_penalty: 0.45,
      presence_penalty: 0.2,
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

// Compact memory builder for Blossom & Blade
// Produces JSON { summary: string, profile: { ... } }
// Expects: { man, userId, recent, previousSummary, previousProfile }
// Note: requires process.env.OPENAI_API_KEY

export default async function handler(req, res){
  try{
    if (req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
    const { man, userId, recent = [], previousSummary = "", previousProfile = {} } = await readJson(req);

    const sys = [
      "You are the memory engine for an adult-only, women-led AI chat called Blossom & Blade.",
      "Goal: produce a SHORT rolling memory that helps each man respond consistently over months.",
      "Never include taboo/illegal content. Only store consensual adult preferences.",
      "Return STRICT JSON with keys: summary (<=180 words), profile (object).",
      "profile keys to fill when present: name, nicknames, likes, dislikes, boundaries, relationship_status, notable_events (array), tone_triggers (what to say that she enjoys), misc.",
    ].join(" ");

    const convo = recent.map(m => `${m.role === "user" ? "User" : "Guy"}: ${m.content}`).join("\n");

    const prompt = `
Previous summary:
${previousSummary || "(none)"}

Previous profile JSON:
${JSON.stringify(previousProfile || {})}

Conversation excerpts (most recent first):
${convo}

Update the memory. Keep it compact, factual, and useful for future replies.`;

    const out = await callOpenAI(sys, prompt);

    // Try to parse; if fail, wrap as string summary
    let parsed = null;
    try{ parsed = JSON.parse(out); }catch{}
    if (!parsed || typeof parsed.summary !== "string"){
      parsed = { summary: String(out).slice(0, 1200), profile: previousProfile || {} };
    }
    res.setHeader("Content-Type","application/json");
    return res.status(200).send(JSON.stringify(parsed));
  }catch(err){
    console.error(err);
    return res.status(200).json({ summary: "", profile: {} }); // degrade gracefully
  }
}

async function readJson(req){
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function callOpenAI(system, user){
  const key = process.env.OPENAI_API_KEY;
  if (!key) return JSON.stringify({ summary:"", profile:{} });
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${key}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role:"system", content: system },
        { role:"user", content: user }
      ]
    })
  });
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return text;
}

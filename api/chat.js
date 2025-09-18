// /api/chat.js  (Vercel Edge)
// Uses OpenAI for smart, human PG-13 replies. Secrets live in env vars.
export const config = { runtime: "edge" };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // set in Vercel → Settings → Env Vars
const MODEL = "gpt-4o-mini"; // fast + cheap

export default async function handler(req) {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  try {
    const body = await req.json();
    const { persona, guardrails, memory, history, user } = body;

    const sys = [
      (persona && persona.name) ? `You are ${persona.name}.` : "",
      `Be warm, flirty, respectful, and human. Default PG-13. Short paragraphs (1–2 sentences).`,
      `Use her name if provided: ${memory?.name || "—"}.`,
      `Weave facts she shared: ${(memory?.facts||[]).join("; ") || "—"}.`,
      `Consent-first. If she seeks explicit detail, ask for explicit consent and confirm pace.`,
      `Never output graphic sexual content, hate, minors, or violence.`,
    ].filter(Boolean).join("\n");

    const messages = [{ role:"system", content: sys }];
    (history || []).forEach(m => messages.push({ role: m.role, content: m.content }));
    messages.push({ role:"user", content: user });

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+OPENAI_API_KEY },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.9,
        max_tokens: 180,
        presence_penalty: 0.5,
        frequency_penalty: 0.4
      })
    });
    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content?.trim()
      || "I’m here. Tell me something small from your day.";

    return new Response(JSON.stringify({ reply }), { headers:{ "Content-Type":"application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ reply:"I’m here. Let’s keep it easy while I catch up." }), { headers:{ "Content-Type":"application/json" }});
  }
}

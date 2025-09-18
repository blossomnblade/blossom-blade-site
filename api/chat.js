// /api/chat.js  (Vercel Edge Function)
export const config = { runtime: "edge" };

const OPENAI_API_KEY  = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL || process.env.MODEL_NAME || "gpt-4o-mini";
const TEMP  = Number(process.env.BB_TEMPERATURE || 0.9);
const FREQ  = Number(process.env.BB_FREQUENCY_PENALTY || 0.4);
const PRES  = Number(process.env.BB_PRESENCE_PENALTY  || 0.5);
const MAX_TOKENS = parseInt(process.env.BB_MAX_TOKENS || "220", 10);
const REPLY_MAX_LINES = parseInt(process.env.BB_REPLY_MAX_LINES || "3", 10);

export default async function handler(req) {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  try {
    const { persona, memory, history, user } = await req.json();

    const sys = [
      persona?.name ? `You are ${persona.name}.` : "",
      "Be warm, flirty, respectful, and human. Default PG-13. Short paragraphs (1–2 sentences).",
      `Use her name if provided: ${memory?.name || "—"}.`,
      memory?.facts?.length ? `Remember: ${memory.facts.slice(-5).join("; ")}.` : "",
      "Consent-first. If she asks for explicit detail, ask for explicit consent and confirm pace.",
      "Never output graphic sexual content, minors, hate, or violence."
    ].filter(Boolean).join("\n");

    const messages = [{ role:"system", content: sys }];
    (history || []).forEach(m => messages.push({ role: m.role, content: m.content }));
    messages.push({ role:"user", content: user });

    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+OPENAI_API_KEY },
      body: JSON.stringify({ model: MODEL, messages, temperature: TEMP, max_tokens: MAX_TOKENS, presence_penalty: PRES, frequency_penalty: FREQ })
    });
    const data = await resp.json();
    let reply = data?.choices?.[0]?.message?.content?.trim() || "I’m here. Tell me one small good thing from your day.";

    // keep it punchy
    const lines = reply.split(/\n+/).slice(0, REPLY_MAX_LINES);
    reply = lines.join("\n").trim();

    return new Response(JSON.stringify({ reply }), { headers:{ "Content-Type":"application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ reply:"I’m listening. Your comfort first." }), { headers:{ "Content-Type":"application/json" }});
  }
}

// api/chat.js
export const config = { runtime: "edge" }; // Vercel Edge Function (fast)

const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/,"");
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX   = Number(process.env.BB_MAX_TOKENS || 400);
const TEMP  = Number(process.env.BB_TEMPERATURE || 0.7);

/**
 * Expected POST body:
 * { messages: [{role:"system"|"user"|"assistant", content:string}], man?:string, maxTokens?:number, temperature?:number }
 * Returns: { reply: string }
 */
export default async function handler(req) {
  if (req.method && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "content-type": "application/json" }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const max_tokens = Math.min(Number(body?.maxTokens || MAX) || MAX, 2000);
  const temperature = Number(body?.temperature ?? TEMP);

  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "Missing messages" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  try {
    // Chat Completions call
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return new Response(JSON.stringify({ error: "Upstream error", detail: errText }), {
        status: 502, headers: { "content-type": "application/json" }
      });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "…";
    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}

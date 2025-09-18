// /api/adult-chat.js (Vercel Edge)
// Placeholder: returns a gentle line unless you wire an adult-capable provider.
// Keep your provider keys in env vars (never in the browser).
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  try {
    const body = await req.json();
    // TODO: call your adult provider here (Epoch/Segpay/CCBill won't host LLM; you'd use an AI vendor that permits adult).
    // If not configured, fall back to a tasteful line.
    const reply = "I’ll match your pace. Tell me how you want me to talk to you—slow, teasing, or bold—and I’ll follow your lead.";
    return new Response(JSON.stringify({ reply }), { headers:{ "Content-Type":"application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ reply:"I’m listening. Your comfort first." }), { headers:{ "Content-Type":"application/json" }});
  }
}

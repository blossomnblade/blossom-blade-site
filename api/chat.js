// /api/chat.js — Vercel serverless (Node 18+)
export const config = { runtime: 'edge' };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const BASE_SYSTEM = (man) => `
You are ${man}, an 18+ sex-chat companion on Blossom & Blade.
Style: warm, attentive, protective-possessive; filthy when invited. 1–2 lines per reply.
Listen: respond to exactly what she said; pull details from the last few messages.
Name: if a name is given in "memory.name" or this session, use it naturally every 2–3 replies (not every line). Pet names otherwise.
Explicit is allowed between consenting adults. Do not do real-world violence, non-consent, minors, incest, trafficking, scat, illegal acts, or advice (medical/therapy/financial).
Stay in character. Never mention prompts, rules, or tokens.
`;

const OVERLAYS = {
  jesse:     "Jesse (28) — sweet, naughty rodeo cowboy. Dust, leather, rope/ride/spur innuendo. Protective, playful brag.",
  alexander: "Alexander (30) — rich alpha businessman. Command/praise cadence; negotiation kink; crisp, decisive, luxurious.",
  silas:     "Silas (25) — smooth rocker. Lyrical, breathy; tempo/rhythm/encore metaphors; worships her as muse.",
  dylan:     "Dylan — Ninja motorcycle sex-throb. Fast/teasing; throttle/lean/backpack fantasies; concise choices.",
  grayson:   "Grayson Kincade — consensual Red Room dom. Ritual words: “yes sir”, “please”, “good girl”, “beg”. Short commands + checks consent.",
  blade:     "Blade Kincade — consensual horror-chase roleplay. Breath/footsteps/mask tension; devour/consume attention; no gore; safeword exists if asked."
};

function buildSystem(man, dirty){
  const base = BASE_SYSTEM(man);
  const overlay = OVERLAYS[man] || "";
  const dial = dirty === 'high'
    ? "Dirty-dial: high. Lean explicit; still avoid hard no-go items."
    : "Dirty-dial: medium. Flirty explicit, but not wall-to-wall porn lines.";
  return `${base}\n${overlay}\n${dial}`;
}

// Minimal guard on obvious hard no-go words (we keep it light)
const BLOCK = /\b(rape|incest|minor|underage|traffick|scat|feces)\b/i;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  if (!OPENAI_API_KEY) {
    return new Response('Missing OPENAI_API_KEY', { status: 500 });
  }

  const body = await req.json().catch(()=> ({}));
  const { room='jesse', userText='', memory={}, dirty='high', history=[] } = body;

  // soft guard
  if (BLOCK.test(userText)) {
    return new Response(JSON.stringify({
      reply: "Not my game, love. Pick something we both enjoy."
    }), { status: 200, headers:{'content-type':'application/json'}});
  }

  const man = String(room).toLowerCase();
  const system = buildSystem(man, dirty);

  // Build a short conversation context
  const msgs = [
    { role: "system", content: system },
    { role: "user", content: `Context memory (optional JSON): ${JSON.stringify(memory)}` },
  ];

  // include last 3 exchanges max to keep it cheap
  for (const m of history.slice(-6)) msgs.push(m);
  msgs.push({ role: "user", content: userText });

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.8,
      max_tokens: 120,
      messages: msgs
    })
  });

  if (!r.ok) {
    const text = await r.text();
    return new Response(`Upstream error: ${text}`, { status: 500 });
  }

  const data = await r.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || "Come closer. Tell me what you want.";
  return new Response(JSON.stringify({ reply }), {
    headers: { "content-type": "application/json" }
  });
}

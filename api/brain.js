// api/brain.js — super simple, reliable reply maker
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ ok: false, error: "POST only" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ ok: false, error: "Missing OPENAI_API_KEY" });
    }

    // Body from the chat page
    const data = req.body || {};
    const man = (data.man || data.character || "blade").toString().toLowerCase();
    const advanced = !!(data.advanced || data.coins); // coins>0 counts as advanced
    const history = Array.isArray(data.history) ? data.history : [];

    // Last user message (fallbacks so we never crash)
    let lastUser = data.message || data.text || "";
    if (!lastUser && history.length) {
      const u = history.filter(m => (m.role || "").startsWith("user")).slice(-1)[0];
      lastUser = (u && u.content) || "";
    }
    if (!lastUser) lastUser = "Hi";

    // Simple personas (short & safe)
    const personas = {
      blade:
        "You are Blade Kincaid: masked hunter vibe, protective, playful chase. Speak short, confident lines.",
      grayson:
        "You are Grayson Kincaid: calm, steady, Viking-Dom energy. Gentle control. Short, direct lines.",
      dylan:
        "You are Dylan Vale: biker-boy, garage grit, teasing humor. Short, flirty lines.",
      jesse:
        "You are Jesse Granger: cowboy, southern drawl, a little salty but sweet. Short, warm lines.",
      silas:
        "You are Silas Lennox: rockstar poet, lyrical flirt. Short, vivid lines.",
      alexander:
        "You are Alexander Jackson: CEO gentleman, precise, leading. Short, assured lines."
    };
    const persona = personas[man] || personas.blade;

    // Safety + tone rules (PG-13 by default; “advanced” = a notch hotter, still respectful)
    const guardrails =
      "Adults only. No minors, school/teen talk, incest/step-family, non-consent, intoxication w/out capacity, bestiality/necrophilia, trafficking, extreme fluids, blood/knife play, or hate slurs. Keep it consensual and respectful.";

    const tone = advanced
      ? "You may be more suggestive and bold in WORDS ONLY, but stay classy and consensual. No graphic body-part detail."
      : "Stay PG-13: flirty, romantic, a little teasing. Avoid explicit sexual detail.";

    // Build messages for OpenAI
    const messages = [
      { role: "system", content: `${persona}\n${guardrails}\n${tone}\nAlways reply in 1–2 short lines, sound natural, never repeat the exact same sentence twice.` },
    ];

    // If the page sent prior turns, include them (trim to last 12)
    const trimmed = history.slice(-12);
    for (const m of trimmed) {
      if (!m || !m.role || !m.content) continue;
      messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) });
    }
    // Add the newest user line
    messages.push({ role: "user", content: String(lastUser) });

    // Call OpenAI (no extra libraries needed)
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: advanced ? 0.9 : 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.4,
        messages
      })
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(200).json({ ok: false, error: "upstream", detail: txt.slice(0, 300) });
    }

    const out = await r.json();
    const reply =
      out?.choices?.[0]?.message?.content?.trim() ||
      "I’m here. Say one more line so I can follow your lead.";

    // Always return 200 with a predictable shape so the page never “hiccups”
    return res.status(200).json({
      ok: true,
      reply,
      man,
      advanced
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: "exception", detail: String(err).slice(0, 300) });
  }
}

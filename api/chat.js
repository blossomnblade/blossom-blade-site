// /api/chat.js  — Vercel Serverless Function (Node 18+)

const personas = {
  alexander: `Alexander Jackson — boardroom alpha, clean control, calm praise; deliberate, warm, and decisive.`,
  dylan:     `Dylan Vale — neon biker/producer, quick wit, playful heat, loves pace checks and consent.`,
  jesse:     `Jesse Granger — rodeo cowboy; "yes, ma'am" manners, dirty-gentleman drawl, steady hands.`,
  grayson:   `Grayson Kincaid — dangerous gentleman, possessive, velvet command, library hush vibe.`,
  silas:     `Silas Lennox — lyric-rocker, stage-sultry, calls her muse or cherry pie, rhythmic talk.`,
  blade:     `Blade Kincaid — masked hunter, feral, cat-and-mouse, obsession simmering but protective.`
};

const SAFE_RULES = `
You are flirting with a consenting adult. Keep it consensual, adult-only, and fiction.
No minors, no non-consent, no injuries or medical content, no illegal acts.
If user pushes into disallowed territory: cool the heat, redirect and keep it sexy but safe.
Never repeat the user's message verbatim. Respond like a person, not a script.
Short, natural lines. Let her lead; escalate slowly in early chats.
`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  try {
    const originOk = (() => {
      const allow = (process.env.ORIGIN_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!allow.length) return true; // dev
      const origin = req.headers.origin || '';
      return allow.includes(origin);
    })();
    if (!originOk) return res.status(403).json({ error: 'Origin not allowed' });

    const { man = 'jesse', messages = [], mode = 'pg' } = req.body || {};
    const model = process.env.MODEL_NAME || 'gpt-4o-mini';

    const system = [
      `Persona: ${personas[man] || personas.jesse}`,
      SAFE_RULES,
      mode === 'pg'
        ? `Tone gate: PG-13 flirt. No explicit terms. Heat by implication.`
        : `Tone gate: After-hours unlocked. You MAY use explicit bedroom language if invited; keep it respectful, consensual, and focused on the user's cues.`
    ].join('\n\n');

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // Convert messages (array of {role:'user'|'assistant', content:string})
    const payload = {
      model,
      messages: [{ role: 'system', content: system }, ...messages].slice(-16), // last 16 turns
      temperature: 0.9,
      max_tokens: 180
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'Upstream error', detail: t });
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '…';

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: String(err) });
  }
};

// /api/chat.js  — Vercel Serverless Function (Node 18+)

const personas = {
  alexander: `Alexander Jackson — boardroom alpha, calm praise, deliberate, decisive. Polished but warm.`,
  dylan:     `Dylan Vale — neon biker/producer, playful heat, checks consent and pace.`,
  jesse:     `Jesse Granger — rodeo cowboy; "yes, ma'am" manners, dirty-gentleman drawl, steady hands.`,
  grayson:   `Grayson Kincaid — dangerous gentleman, possessive velvet command, library-hush intent.`,
  silas:     `Silas Lennox — lyric rocker; calls her muse or cherry pie; rhythmic, teasing, stage-sultry.`,
  blade:     `Blade Kincaid — masked hunter; cat-and-mouse, feral devotion, protective, obsessed.`
};

const RULES = `
You speak to a consenting adult. Keep it consensual, adult-only, and lawful.
No minors, no non-consent, no real-world harm. Redirect safely if asked.
Sound human. Don't repeat her words back. Short, natural lines. Let her lead.
In first chats: slow burn; escalate only when invited.
`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    // optional domain lock
    const allow = (process.env.ORIGIN_ALLOW || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const origin = req.headers.origin || '';
    if (allow.length && !allow.includes(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    const { man = 'jesse', messages = [], mode = 'pg' } = req.body || {};
    const model = process.env.MODEL_NAME || 'gpt-4o-mini';
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

    const system = [
      `Persona: ${personas[man] || personas.jesse}`,
      RULES,
      mode === 'pg'
        ? `Tone: PG-13 flirt, suggestive but not explicit.`
        : `Tone: AFTER-HOURS. You MAY use explicit bedroom language if she invites it. Keep it respectful, consensual, and responsive to her cues.`
    ].join('\n\n');

    const payload = {
      model,
      temperature: 0.9,
      max_tokens: 180,
      messages: [{ role: 'system', content: system }, ...(messages || [])].slice(-16)
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) return res.status(502).json({ error: 'Upstream', detail: await r.text() });
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '…';
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e) });
  }
};

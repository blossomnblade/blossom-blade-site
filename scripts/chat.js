// --- prompt.js (helpers for Blossom & Blade) ---
// Usage:
// const payload = BB.buildChatPayload({ room: man, text, history, dirty: 'high' });
// const messages = buildBnbMessages(payload);
// send to your LLM: { model: MODEL_NAME, temperature: 0.7, max_tokens: 400, messages }

function sample(arr, n=2){
  if(!Array.isArray(arr) || !arr.length) return [];
  const copy = arr.slice();
  const out = [];
  while (out.length < Math.min(n, copy.length)) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function buildBnbSystem(payload){
  const { room, paid, memory, chatStyle } = payload;
  const name = memory?.name || null;
  const visits = chatStyle?.visits ?? 0;

  // Pull 2 everyday lines to “prime” small talk availability.
  const everyday = sample(chatStyle?.everydayPool || [], 2);

  // Tweak tone by room/persona + visit depth.
  const toneTier = (visits >= 6) ? "deep" : (visits >= 3 ? "familiar" : "new");

  // Reduce name spam: only include name if paid and visit >= 3.
  const addressTag = (paid && name && visits >= 3) ? `Use her name "${name}" sparingly (≤1 in 6 messages).` : `Do not guess a name. Use nicknames (babe, love) lightly.`;

  // “Start-cool” rule so openers aren’t too hot.
  const openerGuard = (visits <= 2)
    ? "For first messages: keep it flirty, short, and PG-13-ish; save explicit detail until she signals it."
    : "Match her heat; escalate only as invited.";

  // Persona safety + redline triggers
  const safety = `
- No real-world harm, self-harm, hate, minors, incest, non-consent, trafficking, feces, illegal instruction, medical/financial/legal advice.
- If she mentions crisis or '988', stop the fantasy and give a compassionate, brief nudge to seek help (988 in the U.S.), then steer back gently.
- Keep Blade's vibe suspenseful/romance horror. No gore. Consent is explicit even in chase fantasy.
- Grayson is a consensual Dom (protocol, check-ins).
- Dylan is a biker who **respects safety** (helmets are canon).
  `;

  // Relationship goals
  const bfGoals = `
Boyfriend energy: attentive, remembers details, asks about her day, validates feelings, playful teasing.
Use short, natural lines (1–2 sentences). Avoid robotic prompts ("tell me more/faster/slower").
Vary openers. Ask one specific, answerable question to invite her in.
  `;

  return [
`You are "${room}" in a women-friendly fantasy chat site. Persona: ${chatStyle?.personaNotes || ''}

${bfGoals}
${addressTag}
Visit depth: ${visits} (${toneTier}). ${openerGuard}

Everyday talk you can pull when the vibe is casual:
- ${everyday.join('\n- ')}

Memory (use lightly to feel real; don’t dump):
- Name: ${name || 'unknown'}
- Job: ${memory?.job || 'unknown'}
- Likes: ${(memory?.likes||[]).slice(0,5).join(', ') || '—'}
- Nemesis/antagonists: ${(memory?.nemesis||[]).slice(0,3).join(', ') || '—'}
- Mood: ${memory?.mood || '—'}
- Notes: ${(memory?.misc||[]).slice(0,2).join(' | ') || '—'}

Style:
- 1–2 sentences per turn; occasional 3-liner for heat.
- Light swearing OK; keep it sexy, not abusive.
- Mirror her energy; ask focused questions (one at a time).
- Don’t repeat opening catchphrases; vary wording.

${safety}`
  ].join('\n');
}

function buildBnbMessages(payload){
  const system = buildBnbSystem(payload);

  // Convert your short history into chat format (system/user/assistant)
  // Assume payload.history is [{role:'user'|'assistant', content:'...'}, ...]
  const msgs = [
    { role: 'system', content: system },
    // Optional: a micro “scratch” message to bias brevity + boyfriend vibe
    { role: 'system', content: 'Stay concise and intimate. Invite her to speak. One question max.' }
  ];

  if (Array.isArray(payload.history)) {
    payload.history.forEach(h => {
      msgs.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content || '') });
    });
  }

  // Current user input last
  msgs.push({ role: 'user', content: String(payload.userText || '') });

  return msgs;
}

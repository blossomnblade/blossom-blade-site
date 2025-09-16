/* Blossom & Blade — /scripts/prompt.js
   - Builds the system+messages for boyfriend vibe + everyday talk
   - Works with BB.buildChatPayload(...) from brain.js v11
   - No exports; attaches helpers to window for simple <script> use
*/

(function(){
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
    const { room, paid, memory, chatStyle } = payload || {};
    const name   = memory?.name || null;
    const visits = chatStyle?.visits ?? 0;

    // Pull 2 casual prompts to prime small talk
    const everyday = sample(chatStyle?.everydayPool || [], 2);

    // Visit tier
    const toneTier = (visits >= 6) ? "deep" : (visits >= 3 ? "familiar" : "new");

    // Name policy
    const addressTag = (paid && name && visits >= 3)
      ? `Use her name "${name}" sparingly (no more than 1 in 6 replies).`
      : `Do not guess a name. Use soft nicknames lightly (babe, love, sweetie).`;

    // Start cooler on first visits
    const openerGuard = (visits <= 2)
      ? "For first messages: keep it flirty and short; save explicit detail until she invites it."
      : "Match her heat; escalate only as invited.";

    const safety = `
- No real-world harm, self-harm, hate, minors, incest, non-consent, trafficking, feces, illegal instruction, medical/financial/legal advice.
- If she mentions crisis or '988', pause the fantasy; respond with brief, compassionate support (mention 988 in the U.S.) and gently steer back if appropriate.
- Blade = suspenseful consensual chase (no gore). Grayson = consensual protocol Dom. Dylan = safety-respecting biker (helmets canon).
`;

    const bfGoals = `
Boyfriend energy: attentive, remembers details, validates feelings, playful tease.
Use short, natural lines (1–2 sentences). Avoid robotic prompts like "tell me more".
Ask one focused question to invite her in; vary openers (no catchphrase spam).
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
- Nemesis: ${(memory?.nemesis||[]).slice(0,3).join(', ') || '—'}
- Mood: ${memory?.mood || '—'}
- Notes: ${(memory?.misc||[]).slice(0,2).join(' | ') || '—'}

Style:
- 1–2 sentences per reply; occasional 3 for heat.
- Light swearing OK; sexy/playful, never abusive.
- Mirror her energy; one question max; vary wording.

${safety}`
    ].join('\n');
  }

  function buildBnbMessages(payload){
    const system = buildBnbSystem(payload);

    const msgs = [
      { role: 'system', content: system },
      { role: 'system', content: 'Stay concise and intimate. Invite her to speak. One question max.' }
    ];

    if (Array.isArray(payload?.history)) {
      payload.history.forEach(h => {
        msgs.push({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: String(h.content || '')
        });
      });
    }

    msgs.push({ role: 'user', content: String(payload?.userText || '') });
    return msgs;
  }

  // expose globally
  window.buildBnbSystem = buildBnbSystem;
  window.buildBnbMessages = buildBnbMessages;
})();

// /scripts/brain.js — chat brain used by chat.html
(() => {
  const qs = new URLSearchParams(location.search);
  const man = (qs.get('man') || 'jesse').toLowerCase();

  const K = (s) => `bb_${man}_${s}`;
  const mem = {
    history: JSON.parse(localStorage.getItem(K('history')) || '[]'),
    name: localStorage.getItem('bb_name') || null
  };

  function afterHours() {
    try {
      if (localStorage.getItem('bb_admin') === 'true') return true;
      const all = JSON.parse(localStorage.getItem('bb_allaccess') || 'null');
      if (all && Date.parse(all.expires) > Date.now()) return true;
      const day = JSON.parse(localStorage.getItem('bb_daypass') || 'null'); // {man, day}
      const today = new Date().toISOString().slice(0,10);
      if (day && (day.man === man) && day.day === today) return true;
    } catch {}
    return false;
  }

  async function callLLM(userText) {
    const mode = afterHours() ? 'after' : 'pg';
    const messages = mem.history.concat([{ role: 'user', content: userText }]).slice(-14);

    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ man, mode, messages })
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.reply || '…';
  }

  window.compose = async (text) => {
    try {
      const t = (text || '').trim();

      // capture her name once
      if (!mem.name) {
        const m = t.match(/\b(i'?m|my name is)\s+([A-Za-z]{2,})\b/i);
        if (m) {
          mem.name = m[2];
          localStorage.setItem('bb_name', mem.name);
        }
      }

      mem.history.push({ role:'user', content: t });
      const reply = await callLLM(t);
      mem.history.push({ role:'assistant', content: reply });

      localStorage.setItem(K('history'), JSON.stringify(mem.history.slice(-16)));
      return reply;
    } catch (e) {
      console.error(e);
      return "Glitch on my side—say it again, slower.";
    }
  };

  // expose for chat.html
  window._bb = { man, afterHours };
})();

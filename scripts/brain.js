// /scripts/brain.js
(() => {
  const qs = new URLSearchParams(location.search);
  const man = (qs.get('man') || '').toLowerCase() || 'jesse';

  const storeKey = (k) => `bb_${man}_${k}`;
  const mem = {
    history: JSON.parse(localStorage.getItem(storeKey('history')) || '[]'),
    name: localStorage.getItem('bb_name') || null
  };

  function hasAfterHours() {
    try {
      if (localStorage.getItem('bb_admin') === 'true') return true;
      const all = JSON.parse(localStorage.getItem('bb_allaccess') || 'null');
      const day = JSON.parse(localStorage.getItem('bb_daypass') || 'null'); // {man, day:"YYYY-MM-DD"}
      const today = new Date().toISOString().slice(0,10);
      if (all && Date.parse(all.expires) > Date.now()) return true;
      if (day && day.man === man && day.day === today) return true;
    } catch {}
    return false;
  }

  async function callLLM(userText) {
    const mode = hasAfterHours() ? 'after' : 'pg';
    const messages = mem.history.concat([{ role:'user', content: userText }]).slice(-14);

    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ man, mode, messages })
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.reply || '…';
  }

  // Public compose(text) the chat.html expects
  window.compose = async (text) => {
    try {
      // remember name if they share it
      const m = (text || '').trim();
      if (!mem.name) {
        const n = m.match(/\b(i'?m|my name is)\s+([A-Za-z]{2,})\b/i);
        if (n) {
          mem.name = n[2];
          localStorage.setItem('bb_name', mem.name);
        }
      }
      mem.history.push({ role:'user', content: m });
      const reply = await callLLM(m);
      mem.history.push({ role:'assistant', content: reply });
      localStorage.setItem(storeKey('history'), JSON.stringify(mem.history.slice(-16)));
      return reply;
    } catch (e) {
      console.error(e);
      return "I'm here—say it again, slower. (Temporary glitch)";
    }
  };

  // Optional greeting control for first message
  window.getGreeting = () => {
    if (hasAfterHours()) return null; // let her start
    return null; // or return a soft one-liner if you want an opener
  };
})();

<script>
// ------------------------------
// Chat page controller
// ------------------------------
(() => {
  // helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const qs = new URLSearchParams(location.search);
  const man = (qs.get('man') || 'alexander').toLowerCase();
  const sub = (qs.get('sub') || 'night').toLowerCase();

  // DOM
  const logEl   = $('#log');          // chat transcript container
  const inputEl = $('#msg');          // <input>/<textarea> for user text
  const sendBtn = $('#sendBtn');      // send button

  // guard if markup IDs differ
  if (!logEl || !inputEl || !sendBtn) {
    console.warn('[chat.js] Required elements not found (#log, #msg, #sendBtn). Aborting init to avoid errors.');
    return;
  }

  // memory keys
  const INTRO_FLAG = `bb:introFired:${man}`;
  const MEM_KEY    = `bb:mem:${man}`;

  // simple store
  const mem = {
    get() {
      try { return JSON.parse(localStorage.getItem(MEM_KEY) || '{}'); }
      catch { return {}; }
    },
    put(obj) {
      localStorage.setItem(MEM_KEY, JSON.stringify({ ...(mem.get()), ...obj }));
    }
  };

  // UI helpers
  const scrollToBottom = () => { logEl.scrollTop = logEl.scrollHeight; };

  const addBubble = (text, who = 'ai') => {
    const wrap = document.createElement('div');
    wrap.className = `row ${who}`;
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    wrap.appendChild(b);
    logEl.appendChild(wrap);
    scrollToBottom();
  };

  // --- transport to model ---
  // Uses window.BB.ask if present (your existing client), else falls back to a harmless local echo (for safety).
  async function askModel(prompt, opts = {}) {
    if (window.BB && typeof window.BB.ask === 'function') {
      return await window.BB.ask({ man, sub, prompt, memory: mem.get(), ...opts });
    }
    // Fallback: don't break dev if BB is off
    return { text: '…', memoryUpdates: {} };
  }

  // --- openers (one-time) ---
  async function runIntroOnce() {
    if (sessionStorage.getItem(INTRO_FLAG)) return;               // ✅ prevents double intro
    sessionStorage.setItem(INTRO_FLAG, '1');

    // let the existing persona prompts do the heavy lifting;
    // we just kick the conversation off with a single request
    const res = await askModel('__INTRO__');                      // your backend treats __INTRO__ as "give opener"
    if (res?.text) addBubble(res.text, 'ai');
    if (res?.memoryUpdates) mem.put(res.memoryUpdates);
  }

  // --- send flow ---
  let sending = false;

  async function handleSend() {
    const raw = inputEl.value.trim();
    if (!raw || sending) return;

    sending = true;
    // user bubble
    addBubble(raw, 'me');

    // light name-capture memory (first time they say "i'm NAME" / "im NAME" / "my name is")
    const nameMatch = raw.match(/\b(?:i['’]m|i am|my name is)\s+([A-Za-z][A-Za-z\-']{1,30})\b/i);
    if (nameMatch) mem.put({ user_name: nameMatch[1] });

    try {
      const res = await askModel(raw);
      if (res?.text) addBubble(res.text, 'ai');
      if (res?.memoryUpdates) mem.put(res.memoryUpdates);
    } catch (e) {
      console.error(e);
      addBubble('Sorry—lost the thread for a second. Say that again?', 'ai');
    } finally {
      inputEl.value = '';
      sending = false;
      inputEl.focus();
    }
  }

  // events
  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } // ✅ Enter-to-send
  });

  // kick off
  runIntroOnce();                                                  // ✅ only once per tab/session per man
})();
</script>

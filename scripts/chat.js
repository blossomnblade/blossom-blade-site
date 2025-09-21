(() => {
  // ---------- small helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Elements
  let form, input, sendBtn, messages, portraitImg, chatNameEl;

  // Params
  const params = new URLSearchParams(location.search);
  const man  = (params.get('man')  || 'alexander').toLowerCase();
  const mode = (params.get('sub')  || 'night').toLowerCase(); // 'day' | 'night'
  const memKey = (k) => `bnb.${man}.${k}`;

  // ---------- UI boot ----------
  document.addEventListener('DOMContentLoaded', () => {
    form        = $('#chat-form');
    input       = $('#chat-input');
    sendBtn     = $('#send-btn');
    messages    = $('#messages');
    portraitImg = $('#portraitImg');
    chatNameEl  = $('#chatName');

    chatNameEl.textContent = cap(man);

    bindForm();
    setPortrait();
    restoreHistoryOrGreet();
  });

  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- Portrait (uses -chat.webp, falls back to -card-on.webp) ----------
  function setPortrait() {
    const base = `images/characters/${man}/${man}`;
    const primary = `${base}-chat.webp`;
    const fallback = `${base}-card-on.webp`;

    portraitImg.src = primary;
    portraitImg.alt = `${cap(man)} portrait`;

    portraitImg.addEventListener('error', () => {
      // fall back to card-on if chat.webp missing
      if (!portraitImg.dataset.fellback) {
        portraitImg.dataset.fellback = '1';
        portraitImg.src = fallback;
      }
    });
  }

  // ---------- History ----------
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(memKey('history')) || '[]'); }
    catch { return []; }
  }
  function saveHistory(list) {
    localStorage.setItem(memKey('history'), JSON.stringify(list.slice(-40)));
  }
  function renderHistory(list) {
    messages.innerHTML = '';
    list.forEach(r => addBubble(r.role, r.content));
    scrollToBottom();
  }

  // ---------- Greeting (only if no history) ----------
  function restoreHistoryOrGreet() {
    const hist = loadHistory();
    if (hist.length) {
      renderHistory(hist);
      return;
    }

    const greetings = [
      "hey there, look who wandered in.",
      "well, if it isn’t my favorite distraction.",
      "you came to see me? i won’t pretend i’m not pleased.",
      "mm. you again. good."
    ];
    const line = pick(greetings);
    push('assistant', line);
  }

  // ---------- Chat mechanics ----------
  function bindForm() {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSend();
    });
  }

  function handleSend() {
    const text = (input.value || '').trim();
    if (!text) return;

    input.value = '';
    push('user', text);
    setSending(true);

    talkToServer(text)
      .then(reply => {
        push('assistant', reply || safeFallback(text));
      })
      .catch(() => {
        push('assistant', safeFallback(text));
      })
      .finally(() => setSending(false));
  }

  function setSending(b) {
    input.disabled = b;
    sendBtn.disabled = b;
    sendBtn.textContent = b ? '…' : 'Send';
  }

  async function talkToServer(text) {
    // Call your API (keep it simple and resilient)
    try {
      const res = await fetch(`/api/chat?man=${encodeURIComponent(man)}&mode=${encodeURIComponent(mode)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: text, memoryKey: memKey('history') })
      });
      if (!res.ok) throw new Error('network');
      const data = await res.json();
      // Expect { reply: "..." }
      return (data && data.reply) || '';
    } catch {
      throw new Error('offline');
    }
  }

  // Friendly fallback if API is offline / rate-limited
  function safeFallback(userText) {
    const openers = [
      "tell me one small good thing from your day.",
      "start with this—what’s the vibe right now?",
      "i’m listening. want me closer, or should i behave?",
      "hm. i have thoughts about you already—share first."
    ];

    // Add a touch of character per guy
    const persona = {
      alexander: "low voice, alpha businessman, magnetic but controlled.",
      blade:     "dark teasing edge, protective, a little dangerous.",
      silas:     "rocker energy, candid, playful charm.",
      grayson:   "stoic operator, attentive, steady heat.",
      dylan:     "cool rider, minimal words, a smirk you can hear."
    }[man] || "confident, flirty, on her side.";

    return `${pick(openers)} (${persona})`;
  }

  // ---------- bubbles + memory ----------
  function push(role, content) {
    const hist = loadHistory();
    hist.push({ role, content });
    saveHistory(hist);
    addBubble(role, content);
    scrollToBottom();
  }

  function addBubble(role, content) {
    const li = document.createElement('li');
    li.className = `msg ${role}`;
    const div = document.createElement('div');
    div.className = 'bubble';
    div.textContent = content;
    li.appendChild(div);
    messages.appendChild(li);
  }

  function scrollToBottom() {
    messages.parentElement.scrollTop = messages.parentElement.scrollHeight;
  }

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
})();

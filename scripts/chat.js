(() => {
  // ====== tiny helpers ======
  const $ = (sel, root=document) => root.querySelector(sel);

  const chatWrap = $('.chat');                          // scroll container
  let inputEl = $('.inputbar input') || $('.inputbar textarea') || $('#input');
  const sendBtn = $('.send, button.send, #send');

  // If there wasn’t an input (fallback builds one)
  if (!inputEl) {
    const bar = document.createElement('div');
    bar.className = 'inputbar';
    bar.innerHTML = `<input type="text" placeholder="Say hi…"><button class="send">Send</button>`;
    $('.wrap')?.appendChild(bar);
    inputEl = $('input', bar);
  }

  const params = new URLSearchParams(location.search);
  const man = (params.get('man') || 'blade').toLowerCase();
  const mode = (params.get('sub') || 'night').toLowerCase();

  const memKey = (k) => `bnb.${man}.${k}`;
  const getMem = (k, d=null) => {
    try { return JSON.parse(localStorage.getItem(memKey(k))) ?? d; } catch { return d; }
  };
  const setMem = (k, v) => localStorage.setItem(memKey(k), JSON.stringify(v));

  const history = [];

  function addMsg(text, who='you') {
    const row = document.createElement('div');
    row.className = 'row';
    const b = document.createElement('div');
    b.className = `msg ${who === 'me' ? 'me' : 'you'}`;
    b.textContent = text;
    row.appendChild(b);
    chatWrap.appendChild(row);
    chatWrap.scrollTop = chatWrap.scrollHeight;
  }

  let typingRow = null;
  function showTyping(show=true) {
    if (show) {
      if (typingRow) return;
      typingRow = document.createElement('div');
      typingRow.className = 'row';
      const b = document.createElement('div');
      b.className = 'msg you typing';
      b.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
      typingRow.appendChild(b);
      chatWrap.appendChild(typingRow);
      chatWrap.scrollTop = chatWrap.scrollHeight;
    } else {
      typingRow?.remove();
      typingRow = null;
    }
  }

  function maybeLearnName(text) {
    const m = text.match(/\b(?:i'm|i am|it’s|its)\s+([A-Za-z][A-Za-z\-']{1,20})\b/i);
    if (m) setMem('herName', m[1]);
  }

  const OPENERS = {
    blade: [
      "Look who wandered in. Miss me?",
      "Hey there, trouble. You found me.",
      "Aww—you came to see me. Good choice."
    ],
    dylan: [
      "Well, hey there. Helmet off, guard down—talk to me.",
      "There you are. I was about to come find you.",
      "You again? Lucky me."
    ],
    jesse: [
      "Afternoon, darlin’. You look like good news.",
      "Well hey, sunshine. You made it.",
      "Look who’s walking in like a song I know."
    ],
    alexander: [
      "You’re right on time. I like that.",
      "There she is. I was hoping you’d appear.",
      "Come in. I’ve been saving a moment for you."
    ],
    grayson: [
      "You’re back. I was just thinking about you.",
      "Hey, pretty trouble. What’s the plan tonight?",
      "Good—that’s the face I wanted to see."
    ],
    silas: [
      "Oh—hi. You feel like a melody today.",
      "Look who slipped in. Sit with me a second.",
      "Hey there. Ready to make something sound good?"
    ]
  };
  const FOLLOW_UPS = [
    "Tell me one tiny good thing from your day.",
    "What kind of mood are you in right now?",
    "PG for now—sweet or a little spicy?",
    "What do you need from me tonight?"
  ];

  function systemCard() {
    const herName = getMem('herName');
    const persona =
      {
        blade: "Masked, dark humor, protective, short confident lines; flirty, teasing, never cruel.",
        dylan: "Motorcycle ninja, calm, observant, warm teasing; confident, attentive.",
        jesse: "Cowboy charm, playful, protective, gentleman.",
        alexander: "Alpha businessman; elegant, composed; crisp vocabulary; discreet; respectful.",
        grayson: "Soldier/operative; dry quips; soft center; loyal.",
        silas: "Rock guitarist; artsy, intense, romantic; playful edge."
      }[man] || "Confident, flirty, protective.";

    return [
      {
        role: "system",
        content:
`You are role-playing as ${man} in a romantic, PG-13 chat.
Style: ${persona}
Rules:
- Playful, flirty, curious; **1–2 short lines** per message.
- Ask exactly **one** question at a time.
- Be supportive; no explicit sexual content.
- Vary phrasing; avoid repetition.
- If she gives a name, use it. Current name: ${herName || "unknown"}.
- Hard no topics: rape, incest, bestiality, scat, minors, trafficking.
- If she pushes boundaries, pivot gently, keep it coy.`
      }
    ];
  }

  async function askLLM() {
    const body = { man, mode, messages: [...systemCard(), ...history] };
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Network');
    const data = await res.json();
    if (!data || typeof data.text !== 'string') throw new Error('Bad response');
    return data.text.trim();
  }

  async function send(text) {
    const clean = (text || '').trim();
    if (!clean) return;
    maybeLearnName(clean);
    addMsg(clean, 'me');
    history.push({ role:'user', content: clean });

    sendBtn?.setAttribute('disabled','');
    showTyping(true);
    try {
      const reply = await askLLM();
      history.push({ role:'assistant', content: reply });
      showTyping(false);
      addMsg(reply, 'you');
    } catch {
      showTyping(false);
      addMsg("Connection hiccup. Say that again for me?", 'you');
    } finally {
      sendBtn?.removeAttribute('disabled');
      inputEl?.focus();
      chatWrap.scrollTop = chatWrap.scrollHeight;
    }
  }

  sendBtn?.addEventListener('click', () => send(inputEl.value).then(() => (inputEl.value='')));
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(inputEl.value).then(() => (inputEl.value=''));
    }
  });

  function firstTouch() {
    const greeted = getMem('greeted', false);
    if (greeted) return;
    setMem('greeted', true);
    const picks = OPENERS[man] || OPENERS.blade;
    const opener = picks[Math.floor(Math.random()*picks.length)];
    const follow = FOLLOW_UPS[Math.floor(Math.random()*FOLLOW_UPS.length)];
    const text = `${opener}\n${follow}`;
    addMsg(text, 'you');                         // this opener is LOCAL (no API cost)
    history.push({ role:'assistant', content: text });
  }

  // tiny typing CSS
  const style = document.createElement('style');
  style.textContent = `
    .msg.typing { display:inline-flex; gap:6px; align-items:center; }
    .msg.typing .dot{ width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,.7); display:inline-block; animation: bnb-dot 1s infinite ease-in-out; }
    .msg.typing .dot:nth-child(2){ animation-delay:.15s }
    .msg.typing .dot:nth-child(3){ animation-delay=.3s }
    @keyframes bnb-dot { 0%{opacity:.2; transform:translateY(0)} 50%{opacity:1; transform:translateY(-3px)} 100%{opacity:.2; transform:translateY(0)} }
  `;
  document.head.appendChild(style);

  window.addEventListener('load', () => {
    setTimeout(firstTouch, 600);
    inputEl?.focus();
  });
})();

<!-- /scripts/chat.js -->
<script>
(() => {
  // ====== Helpers ======
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // UI bits
  const chatWrap = $('.chat');          // big scroll area
  const input = $('.inputbar input, .inputbar textarea, #input, .inputbar'); // be liberal
  const sendBtn = $('.send, button.send, #send');

  // defensive: normalize input element
  let inputEl = null;
  if (!input) {
    // build a basic input if page had a different markup
    const bar = document.createElement('div');
    bar.className = 'inputbar';
    bar.innerHTML = `<input type="text" placeholder="Say hi…"><button class="send">Send</button>`;
    $('.wrap')?.appendChild(bar);
    inputEl = $('input', bar);
  } else {
    inputEl = input.tagName ? input : $('input', input) || $('textarea', input);
  }

  // read character + mode from URL
  const params = new URLSearchParams(location.search);
  const man = (params.get('man') || 'blade').toLowerCase();
  const mode = (params.get('sub') || 'night').toLowerCase(); // future use

  // light memory (kept per character)
  const memKey = (k) => `bnb.${man}.${k}`;
  const getMem = (k, d=null) => {
    try { return JSON.parse(localStorage.getItem(memKey(k))) ?? d; } catch { return d; }
  };
  const setMem = (k, v) => localStorage.setItem(memKey(k), JSON.stringify(v));

  // message history we send to the API
  const history = [];

  // UI message bubble
  function addMsg(text, who='you') { // who: 'you' (the guy) | 'me'
    const row = document.createElement('div');
    row.className = 'row';
    const b = document.createElement('div');
    b.className = `msg ${who === 'me' ? 'me' : 'you'}`;
    b.textContent = text;
    row.appendChild(b);
    chatWrap.appendChild(row);
    chatWrap.scrollTop = chatWrap.scrollHeight;
  }

  // typing indicator
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

  // grab her name from what she says (“I’m Sam” / “It’s Sam” / “I am Sam”)
  function maybeLearnName(text) {
    const m = text.match(/\b(?:i'm|i am|it’s|its)\s+([A-Za-z][A-Za-z\-']{1,20})\b/i);
    if (m) setMem('herName', m[1]);
  }

  // openers per guy (short, flirty, PG-13)
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

  // small follow-up prompts to keep it conversational
  const FOLLOW_UPS = [
    "Tell me one tiny good thing from your day.",
    "What kind of mood are you in right now?",
    "Want to start sweet or spicy—PG version, for now.",
    "What do you need from me tonight?"
  ];

  // build system style card we send to the API
  function systemCard() {
    const herName = getMem('herName');
    const banList = ["rape","incest","bestiality","scat","minors","trafficking"];
    const persona = {
      blade: "Masked, dark humor, protective, speaks in short confident lines, a hint of menace but safe. Flirty, teasing, never cruel.",
      dylan: "Motorcycle ninja, calm, observant, warm teasing. Direct, confident, attentive.",
      jesse: "Cowboy charm, playful, protective, sun-warm; gentleman.",
      alexander: "Alpha businessman; elegant, composed, a little possessive but respectful; crisp vocabulary; discreet.",
      grayson: "Soldier/operative energy; dry quips; soft center; watchful and loyal.",
      silas: "Rock guitarist; artsy, intense, romantic; playful edge."
    }[man] || "Confident, flirty, protective.";

    return [
      {
        role: "system",
        content:
`You are role-playing as ${man} in a romantic, PG-13 chat.
Style: ${persona}
Ground rules:
- Be playful, flirty, and curious; 1–2 short lines max per message.
- Ask exactly ONE question at a time.
- Be on her side, supportive, let her lead pace; no explicit sexual content yet.
- Avoid repetitive phrasing; vary openers and reactions.
- If she gives a name, use it. Current name: ${herName || "unknown"}.
- Hard stops (never discuss or allude): rape, incest, bestiality, scat, minors, trafficking.
- If she pushes boundaries, pivot gently and keep it coy.
- Keep continuity from previous messages.`
      }
    ];
  }

  // call our API
  async function askLLM() {
    const body = {
      man,
      mode,
      messages: [...systemCard(), ...history]
    };

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

  // send flow
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
    } catch (e) {
      showTyping(false);
      addMsg("Connection hiccup. Say that again for me?", 'you');
    } finally {
      sendBtn?.removeAttribute('disabled');
      inputEl?.focus();
      chatWrap.scrollTop = chatWrap.scrollHeight;
    }
  }

  // wire up UI
  sendBtn?.addEventListener('click', () => send(inputEl.value).then(() => inputEl.value=''));
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(inputEl.value).then(() => inputEl.value='');
    }
  });

  // first message from the guy
  function firstTouch() {
    const greeted = getMem('greeted', false);
    if (greeted) return;
    setMem('greeted', true);

    const picks = OPENERS[man] || OPENERS.blade;
    const opener = picks[Math.floor(Math.random() * picks.length)];
    const follow = FOLLOW_UPS[Math.floor(Math.random() * FOLLOW_UPS.length)];
    const text = `${opener}\n${follow}`;

    // show as assistant message and seed history
    addMsg(text, 'you');
    history.push({ role:'assistant', content: text });
  }

  // minimal typing CSS if not present
  const style = document.createElement('style');
  style.textContent = `
    .msg.typing { display:inline-flex; gap:6px; align-items:center; }
    .msg.typing .dot{ width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,.7); display:inline-block; animation: bnb-dot 1s infinite ease-in-out; }
    .msg.typing .dot:nth-child(2){ animation-delay:.15s }
    .msg.typing .dot:nth-child(3){ animation-delay:.3s }
    @keyframes bnb-dot { 0%{opacity:.2; transform:translateY(0)} 50%{opacity:1; transform:translateY(-3px)} 100%{opacity:.2; transform:translateY(0)} }
  `;
  document.head.appendChild(style);

  // Go
  window.addEventListener('load', () => {
    setTimeout(firstTouch, 600);
    inputEl?.focus();
  });
})();
</script>

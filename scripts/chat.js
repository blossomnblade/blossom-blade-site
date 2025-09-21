(() => {
  /* ---------- tiny helpers ---------- */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const once = (fn) => { let done=false; return (...a)=>done?null:(done=true,fn(...a)); };

  /* ---------- elements ---------- */
  const chatWrap = $('.chat');             // scroll container
  const inputEl  = $('#chat-input') || $('.inputbar input') || $('input[name="message"]') || $('textarea');
  const sendBtn  = $('#send-btn')  || $('.send, button.send, #send');

  // Fallback input bar if missing (keeps page usable)
  if (!inputEl) {
    const bar = document.createElement('div');
    bar.className = 'inputbar';
    bar.innerHTML = `
      <input id="chat-input" type="text" placeholder="Say hi…">
      <button id="send-btn" class="send">Send</button>`;
    ($('.wrap') || document.body).appendChild(bar);
  }

  /* ---------- url params & memory ---------- */
  const params = new URLSearchParams(location.search);
  const man    = (params.get('man') || 'blade').toLowerCase();
  const mode   = (params.get('sub') || 'night').toLowerCase();

  const memKey = (k) => `bnb.${man}.${k}`;
  const mem = {
    get: (k, d=null) => {
      try { const v = localStorage.getItem(memKey(k)); return v ? JSON.parse(v) : d; }
      catch { return d; }
    },
    set: (k, v) => localStorage.setItem(memKey(k), JSON.stringify(v)),
    push: (k, v) => { const arr = mem.get(k, []); arr.push(v); mem.set(k, arr); },
    last: (k) => (mem.get(k, []).slice(-1)[0])
  };

  /* ---------- DOM glue ---------- */
  const nameSpan = $('#chatName');
  if (nameSpan) nameSpan.textContent = man.charAt(0).toUpperCase() + man.slice(1);

  const list = $('#messages') || (()=>{
    const ul = document.createElement('ul');
    ul.id = 'messages';
    ul.className = 'messages';
    ($('.messages-scroll') || $('.chat-left') || chatWrap || document.body).appendChild(ul);
    return ul;
  })();

  const portraitImg = $('#portraitImg');
  if (portraitImg) {
    const srcMap = {
      blade:      'images/characters/blade/blade-chat.webp',
      dylan:      'images/characters/dylan/dylan-chat.webp',
      alexander:  'images/characters/alexander/alexander-chat.webp',
      grayson:    'images/characters/grayson/grayson-chat.webp',
      silas:      'images/characters/silas/silas-chat.webp',
      jesse:      'images/characters/jesse/jesse-chat.webp'
    };
    if (srcMap[man]) portraitImg.src = srcMap[man];
    portraitImg.alt = `${man} — chat portrait`;
  }

  const scrollToBottom = () => {
    // prefer the scrollable message column, else the whole page
    const scroller = $('.messages-scroll') || chatWrap || document.scrollingElement || document.documentElement;
    scroller.scrollTo({ top: scroller.scrollHeight + 9999, behavior: 'smooth' });
  };

  const bubble = (side, text) => {
    // de-dup exact same assistant line to avoid repeats
    if (side === 'assistant') {
      const last = mem.last('log');
      if (last && last.role === 'assistant' && last.text.trim().toLowerCase() === text.trim().toLowerCase()) {
        return;
      }
    }

    const li = document.createElement('li');
    li.className = `msg ${side}`;
    li.innerHTML = `<div class="bubble">${escapeHTML(text)}</div>`;
    list.appendChild(li);
    mem.push('log', { role: side, text, t: Date.now() });
    scrollToBottom();
  };

  const escapeHTML = (s) =>
    s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  /* ---------- tone & replies ---------- */

  const STARTERS = {
    blade: [
      "You came to see me? I won’t pretend I’m not pleased.",
      "Look who wandered into the dark. Brave."
    ],
    dylan: [
      "Helmet’s off. Your turn—what happened today?",
      "Hey trouble. Miss me?"
    ],
    alexander: [
      "Mm. You again. Good.",
      "I’m listening—brief me."
    ],
    grayson: [
      "Red room’s warm. Tell me what you need.",
      "You’re safe here. Start talking."
    ],
    silas: [
      "Hey, muse. What’s the riff of your day?",
      "Play me a note—just one good thing."
    ],
    jesse: [
      "Sun’s hot, boots dusty—what’s on your mind, darlin’?",
      "You showed up. I like that."
    ]
  };

  const PERSONALITY = {
    blade: {
      flirt:  ["Careful. I bite…and I think you like that.", "Keep talking. Your voice looks good on me."],
      warm:   ["Proud of you.", "You did fine. Better than fine."],
      tease:  ["Should I make them regret it?", "Tell me where to aim."]
    },
    dylan: {
      flirt:  ["I could listen to you all night, visor up.", "You’re a good distraction."],
      warm:   ["That’s a win. Take it.", "You did right."],
      tease:  ["Want me to take you for a lap to cool off?", "I ride better when you watch."]
    },
    alexander: {
      flirt:  ["You’re dangerously distracting.", "I like you here. Close."],
      warm:   ["I’m proud of you.", "You handled it well."],
      tease:  ["Want me to fix it, or just say the word and I’ll make a scene?"]
    },
    grayson: {
      flirt:  ["You look good in red light.", "Tell me where to stand, I’ll handle the rest."],
      warm:   ["You’re safe with me.", "I’ve got you."],
      tease:  ["Want me to spook them a little?", "I can be very persuasive."]
    },
    silas: {
      flirt:  ["You’re the melody stuck in my head.", "Sing it to me, pretty."],
      warm:   ["That’s a sweet win.", "Good. Let it sit with you."],
      tease:  ["Want me to write a song that makes them jealous?"]
    },
    jesse: {
      flirt:  ["You lean in like you mean it.", "I like your kind of trouble."],
      warm:   ["Proud of you, sweetheart.", "That’ll do."],
      tease:  ["Want me to tip my hat and make ’em sweat?"]
    }
  };

  // Quick intent helpers (very light-weight, no brackets/stage directions)
  const isGreeting = (t) => /\b(hi|hey|hello|sup|yo)\b/i.test(t);
  const isHowAreYou = (t) => /\b(how (are|r) (you|u)|hru)\b/i.test(t);
  const isWorkDrama = (t) => /\b(boss|work|coworker|office|meeting)\b/i.test(t);
  const mentionsCredit = (t) => /\b(credit|stole|took.*(work|idea))\b/i.test(t);
  const isFlirt      = (t) => /\b(miss you|kiss|cuddle|touch|want you|hot|sexy)\b/i.test(t);
  const askedQuestion = (t) => /[?!]\s*$/.test(t) || /\b(why|when|where|who|what|how)\b/i.test(t);

  const rand = (arr) => arr[Math.floor(Math.random()*arr.length)];
  const guy  = PERSONALITY[man] || PERSONALITY.blade;

  const replyFor = (userTextRaw, history) => {
    const userText = (userTextRaw || '').trim();

    // keep opener only once per session
    if (!mem.get('greeted', false)) {
      mem.set('greeted', true);
      return rand(STARTERS[man] || STARTERS.blade);
    }

    // direct reactions
    if (isGreeting(userText)) {
      return rand([
        "Took you long enough.",
        "Come here and talk to me.",
        "Hey. What kind of mood are you in?"
      ]);
    }

    if (isHowAreYou(userText)) {
      return rand([
        "Better now that you’re here.",
        "Still thinking about you. Not planning to stop."
      ]);
    }

    if (isFlirt(userText)) {
      return rand(guy.flirt);
    }

    if (isWorkDrama(userText) && mentionsCredit(userText)) {
      // e.g., “Becky took credit for my work…”
      return rand([
        "She always wanted your job. You rattled her.",
        "Want me to make her jealous? I can. Or I can help you write an email she won’t forget."
      ]);
    }

    if (isWorkDrama(userText)) {
      return rand([
        "Office politics are boring—you aren’t. Want strategy, or want me to help you vent?",
        "Tell me what they said. I’ll tell you what you should’ve said back."
      ]);
    }

    if (askedQuestion(userText)) {
      return rand([
        "Short answer? Yes. Long answer—I’ll show you.",
        "If you’re asking, you already know the answer."
      ]);
    }

    // default: reflect + nudge
    const lastWin = /good|win|saved|finished|done|proud/i.test(userText);
    if (lastWin) return rand(guy.warm);

    return rand([
      "Tell me the part you didn’t say out loud.",
      "Okay. What do you want from me—comfort, chaos, or a plan?",
      "So what do I need to do about it?"
    ]);
  };

  /* ---------- send / receive ---------- */
  const doSend = once(() => {}); // keeps once helper imported; no-op here

  const handleSubmit = (e) => {
    e && e.preventDefault();
    const field = $('#chat-input') || $('input') || $('textarea');
    const txt = (field?.value || '').trim();
    if (!txt) return;

    bubble('user', txt);
    field.value = '';
    setTimeout(() => field.focus(), 0);

    // produce assistant reply
    const history = mem.get('log', []);
    const reply = replyFor(txt, history);

    // small protection: if reply accidentally matches last assistant line, vary it
    const lastA = history.slice().reverse().find(m => m.role === 'assistant');
    if (lastA && lastA.text.trim().toLowerCase() === reply.trim().toLowerCase()) {
      bubble('assistant', "Tell me more than that.");
    } else {
      bubble('assistant', reply);
    }
  };

  (sendBtn || $('#send-btn')).addEventListener('click', handleSubmit);
  (inputEl || $('#chat-input')).addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
  });

  /* ---------- initial greet (only once) ---------- */
  window.addEventListener('load', () => {
    // restore prior chat
    const prior = mem.get('log', []);
    if (prior.length) {
      // rebuild UI quickly
      prior.forEach(m => bubble(m.role, m.text));
    } else {
      // first time: greet (persist greeted flag inside replyFor)
      const opener = replyFor('', []);
      bubble('assistant', opener);
    }
    scrollToBottom();
  });

})();

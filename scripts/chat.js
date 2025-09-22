<!-- scripts/chat.js -->
<script>
(() => {
  // ========= tiny helpers =========
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const scrollToBottom = () => chatWrap?.scrollTo({ top: chatWrap.scrollHeight, behavior: 'smooth' });

  // ========= wire up DOM =========
  const chatWrap = $('.chat');                   // scroll container (the left big card)
  const messagesUL = $('#messages') || (() => {  // create <ul id="messages"> if not there
    const d = el('div', 'messages-scroll');
    const u = el('ul', 'messages');
    u.id = 'messages';
    d.appendChild(u);
    $('.chat-left .messages-scroll, .chat-left')?.appendChild(d);
    return u;
  })();

  let inputEl = $('#chat-input') || $('.inputbar input') || $('.inputbar textarea');
  let sendBtn = $('#send-btn') || $('.send, button.send, #send');

  // if page didn't ship an input, build a simple one
  if (!inputEl) {
    const bar = el('div', 'inputbar');
    bar.innerHTML = `
      <input id="chat-input" type="text" placeholder="Say hi…" />
      <button id="send-btn" class="send">Send</button>
    `;
    $('.wrap')?.appendChild(bar);
    inputEl = $('#chat-input');
    sendBtn = $('#send-btn');
  }

  // ========= URL params & robust fallbacks =========
  const params  = new URLSearchParams(location.search);
  const rawMan  = (params.get('man') || '').toLowerCase();
  const rawMode = (params.get('sub') || '').toLowerCase();

  const VALID_MEN = ['blade','dylan','jesse','alexander','silas','grayson'];
  const man  = VALID_MEN.includes(rawMan) ? rawMan : 'blade';
  const mode = rawMode === 'day' || rawMode === 'night' ? rawMode : 'night';

  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '...';
  $('#chatName') && ($('#chatName').textContent = cap(man));

  // Portrait: always show the fixed chat portrait (same for day/night)
  const portraitImg = $('#portraitImg');
  if (portraitImg) {
    portraitImg.src = `images/characters/${man}/${man}-chat.webp`;
    portraitImg.alt = `${cap(man)} portrait`;
  }

  // ========= local memory =========
  const memKey = k => `bnb.${man}.${k}`;
  const readJSON = (k, d) => {
    try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; }
  };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let history = readJSON(memKey('history'), []);   // [{role:'user'|'assistant', content:''}]
  const MAX_HISTORY = 20;

  // ========= persona & tone =========
  const PERSONA = {
    blade: {
      name: 'Blade',
      vibe: 'dark, playful hunter-protector; confident, a little dangerous; never rude to her',
      openers: [
        "Come here and talk to me.",
        "Look who showed up.",
        "You came to see me? Good.",
        "Better now that you’re here."
      ]
    },
    dylan: {
      name: 'Dylan',
      vibe: 'cool rider; laid-back, teasing, observant; flirts lightly and protects vibes',
      openers: [
        "Helmet’s off. Your turn—what happened today?",
        "Took you long enough.",
        "You made it. Talk to me.",
        "Missed that face."
      ]
    },
    alexander: {
      name: 'Alexander',
      vibe: 'low voice, alpha businessman; magnetic but controlled; arranges, reassures',
      openers: [
        "Walk me through your day—headlines only.",
        "I’m listening—brief me.",
        "You again. Good.",
        "What needs my attention?"
      ]
    },
    silas: {
      name: 'Silas',
      vibe: 'artsy, charming guitarist; warm, curious, a little mischievous',
      openers: [
        "Hey, melody—what’s stuck in your head?",
        "Tell me one small good thing from your day.",
        "You found me. What’s the vibe?",
        "Let me hear you."
      ]
    },
    grayson: {
      name: 'Grayson',
      vibe: 'quiet, intense; protective; few words with weight',
      openers: [
        "Talk. I’m here.",
        "Short version—how’s your head?",
        "I’ve got time. Use it.",
        "Where do you want me—comfort, chaos, or a plan?"
      ]
    },
    jesse: {
      name: 'Jesse',
      vibe: 'calm, dry humor; steady; a little mysterious',
      openers: [
        "You made it. Good.",
        "Go on. I’m listening.",
        "Give me the short of it.",
        "Tell me the part you didn’t say out loud."
      ]
    }
  }[man];

  // ========= safety / spice guard =========
  const BANNED = [
    /rape/i, /incest/i, /scat/i, /traffick/i, /bestial/i, /minor(s)?/i
  ];
  const isBanned = txt => BANNED.some(rx => rx.test(txt));

  const SPICE_ON = !!window.bnbRated; // you can set window.bnbRated = true after pay/consent

  // ========= UI bubbles =========
  const addBubble = (who, text) => {
    const li = el('li', `bubble ${who === 'user' ? 'user' : 'assistant'}`);
    li.textContent = text;
    messagesUL.appendChild(li);
    scrollToBottom();
  };

  const saveAndTrim = (role, content) => {
    history.push({ role, content });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    writeJSON(memKey('history'), history);
  };

  // ========= greeting (first message) =========
  const greetedKey = memKey('greeted');
  if (!localStorage.getItem(greetedKey)) {
    const introVariants = [
      "hey there.",
      "look who’s here.",
      "aww—you came to see me."
    ];
    const flirtyQ = [
      "what’s one small good thing from your day?",
      "what’s the vibe right now?",
      "tell me where to meet you—comfort, chaos, or a plan?"
    ];
    const line = `${introVariants[Math.floor(Math.random()*introVariants.length)]} ${flirtyQ[Math.floor(Math.random()*flirtyQ.length)]}`;
    addBubble('assistant', line);
    saveAndTrim('assistant', line);
    localStorage.setItem(greetedKey, '1');
  } else {
    // restore previous chat on reload
    if (history.length) {
      history.forEach(m => addBubble(m.role, m.content));
    }
  }

  // ========= brain: build prompt & talk to API =========
  const systemPrompt = () => {
    return [
      `You are ${PERSONA.name} from "Blossom & Blade".`,
      `Style: ${PERSONA.vibe}.`,
      `Be flirty, warm, and *on her side*. Never rude. No stage directions or brackets.`,
      `Keep messages short (1–3 lines). Always reply to what she *actually* said, ask one engaging follow-up, and keep it natural.`,
      `If she vents (e.g., “Becky took credit for my work”), validate, defend her, and offer a witty ally line (e.g., “Want me to make her jealous?”).`,
      `If safety or consent edges appear, steer safe and respectful.`,
      `Banned topics: rape, incest, bestiality, minors, scat, trafficking. If asked, refuse gently and redirect.`,
      SPICE_ON
        ? `R-rating allowed per user consent; still no illegal/non-consensual content. Be classy, confident and playful.`
        : `Keep it PG-13 for now. Tease lightly; save explicit details for later.`,
      `Do not include “(tone)”, “(beat)”, or bracketed asides.`
    ].join(' ');
  };

  const buildMessages = (userText) => {
    const msgs = [
      { role: 'system', content: systemPrompt() }
    ];
    // short memory keeps chat snappy
    const recent = history.slice(-10);
    msgs.push(...recent);
    msgs.push({ role: 'user', content: userText });
    return msgs;
  };

  const fetchAI = async (userText) => {
    const body = {
      man,
      mode,
      spice: SPICE_ON,
      messages: buildMessages(userText),
    };
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    // expected shape: { reply: "..." }
    if (!data || !data.reply) throw new Error('no reply');
    return String(data.reply).trim();
  };

  // Simple offline lines in case API hiccups
  const OFFLINE = [
    "Tell me one small good thing from your day.",
    "I’m here—what do you want from me tonight?",
    "Mm. Say that again, but closer.",
    "I like that. What happens next?",
  ];
  const fallbackReply = (userText) => {
    if (/kitten|cat/i.test(userText)) return "Hero moves. I noticed. What else went right?";
    if (/book|read|reading/i.test(userText)) return "What’s the twist you didn’t see coming?";
    if (/tired|rough|bad/i.test(userText)) return "Come here. One thing I can fix for you right now?";
    return OFFLINE[Math.floor(Math.random()*OFFLINE.length)];
  };

  // ========= submit handling =========
  const busy = { value:false };
  const sendNow = async () => {
    const text = (inputEl.value || '').trim();
    if (!text || busy.value) return;

    // banned guard
    if (isBanned(text)) {
      const soft = "Let’s keep it safe and legal. Tell me something else you want, and I’ll make it feel good.";
      addBubble('assistant', soft);
      saveAndTrim('assistant', soft);
      inputEl.value = '';
      return;
    }

    busy.value = true;
    sendBtn?.setAttribute('disabled', 'true');

    // user bubble
    addBubble('user', text);
    saveAndTrim('user', text);
    inputEl.value = '';
    scrollToBottom();

    try {
      const reply = await fetchAI(text);
      addBubble('assistant', reply);
      saveAndTrim('assistant', reply);
    } catch (e) {
      const r = fallbackReply(text);
      addBubble('assistant', r);
      saveAndTrim('assistant', r);
    } finally {
      busy.value = false;
      sendBtn?.removeAttribute('disabled');
      inputEl?.focus();
    }
  };

  // ========= events =========
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendNow();
    }
  });
  sendBtn?.addEventListener('click', sendNow);

  // ========= tiny cleanup to hide any accidental filename text under portrait =========
  document.addEventListener('DOMContentLoaded', () => {
    const p = $('#portrait');
    if (!p) return;
    [...p.childNodes].forEach(n => {
      if (n.nodeType === 3 && /\.(webp|jpe?g|png|gif)$/i.test((n.textContent||'').trim())) n.remove();
    });
    p.querySelectorAll('small, figcaption, a, span, div').forEach(elm => {
      if (/\.(webp|jpe?g|png|gif)$/i.test((elm.textContent||'').trim())) elm.remove();
    });
  });
})();
</script>

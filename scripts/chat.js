(() => {
  /* ====== tiny helpers ====== */
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const on = (el, ev, fn) => el.addEventListener(ev, fn, {passive:true});
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  /* ====== DOM wires ====== */
  const chatWrap = $('.chat');                 // scroll container (chat-left section)
  let inputEl = $('#chat-input') || $('.inputbar input') || $('.inputbar textarea') || $('#input');
  let sendBtn  = $('#send-btn')  || $('.send, button.send, #send');

  /* If there wasn’t an input (fallback builds one) */
  if (!inputEl) {
    const bar = document.createElement('div');
    bar.className = 'inputbar';
    bar.innerHTML = `<input type="text" id="chat-input" placeholder="Say hi…"><button id="send-btn" class="send">Send</button>`;
    $('.wrap')?.appendChild(bar);
    inputEl = $('#chat-input', bar);
    sendBtn = $('#send-btn', bar);
  }

  /* ====== URL params ====== */
  const params = new URLSearchParams(location.search);
  const man   = (params.get('man') || 'blade').toLowerCase();
  const mode  = (params.get('sub') || 'night').toLowerCase();

  /* ====== storage key & simple store ====== */
  const memKey = (k) => `bnb.${man}.${k}`;
  const store = {
    get(k, dflt) { try { return JSON.parse(localStorage.getItem(memKey(k))) ?? dflt; } catch { return dflt; } },
    set(k, v)   { localStorage.setItem(memKey(k), JSON.stringify(v)); },
    del(k)      { localStorage.removeItem(memKey(k)); }
  };

  /* ====== portraits per guy ====== */
  const PORTRAITS = {
    blade:   { chat: 'images/characters/blade/blade-chat.webp',
               card: 'images/characters/blade/blade-card-on.webp',
               name: 'Blade' },
    dylan:   { chat: 'images/characters/dylan/dylan-chat.webp',
               card: 'images/characters/dylan/dylan-card-on.webp',
               name: 'Dylan' },
    alexander:{ chat:'images/characters/alexander/alexander-chat.webp',
               card:'images/characters/alexander/alexander-card-on.webp',
               name:'Alexander' },
    grayson: { chat: 'images/characters/grayson/grayson-chat.webp',
               card: 'images/characters/grayson/grayson-card-on.webp',
               name: 'Grayson' },
    silas:   { chat: 'images/characters/silas/silas-chat.webp',
               card: 'images/characters/silas/silas-card-on.webp',
               name: 'Silas' },
  };
  const guy = PORTRAITS[man] || PORTRAITS.blade;
  $('#portraitImg')?.setAttribute('src', guy.chat);
  $('#chatName')?.textContent = guy.name || '…';

  /* ====== “Never rude” — global tone & rules ====== */
  const CORE_RULES = `
You are a flirty, confident man talking 1-on-1 with an adult woman who chose you.
- Never rude, never insulting, never demeaning. Be protective, warm, a little smug.
- Assume she is a good girl here for attention and fun. Make her feel safe, wanted, admired.
- Be concise: 1–2 short lines. No brackets like [laughs] or (smirks). No stage directions.
- Flirty is welcome; explicit content is off for now. Suggestive is okay; keep it tasteful.
- Mirror her wording, answer what she actually said, then ask one playful follow-up.
- If she vents, validate first, take her side, then tease/lighten the mood.
- Consent & respect always; never shame her interests; steer away from illegal/abusive topics.
`;

  const PERSONA = {
    blade: {
      style: `Low voice, dangerous but sweet. Protective, playful hunter energy.`,
      openers: [
        "Come here and talk to me.",
        "Look who wandered in. Miss me?",
        "You again. Good. Tell me what you want."
      ]
    },
    dylan: {
      style: `Cool rider. Minimal words, audible smirk, gentleman under leather.`,
      openers: [
        "You made it. Talk to me.",
        "Helmet’s off. Your turn—what happened today?",
        "Took you long enough. Come closer."
      ]
    },
    alexander: {
      style: `Alpha businessman. Magnetic, controlled, indulgent when she earns it.`,
      openers: [
        "I’m listening—brief me.",
        "Walk me through your day—headlines only.",
        "Good. Now tell me what you want from me."
      ]
    },
    grayson: {
      style: `Dark bedroom glow, calm and confident. Dry humor, protective heat.`,
      openers: [
        "Door’s locked. Use your words.",
        "You’re late. I was thinking about you.",
        "Sit. Tell me one good thing from your day."
      ]
    },
    silas: {
      style: `Edgy rock-romantic. Soft eyes, sharp jaw. Gentle tease, tender streak.`,
      openers: [
        "Hey trouble. What did I miss?",
        "C’mon, gorgeous—what’s the vibe right now?",
        "You found me. Tell me something sweet or wicked."
      ]
    }
  };

  /* Phrase softener if anything ever lands too sharp (belt-and-suspenders) */
  const SOFTEN_MAP = new Map([
    [/shut up/gi, "hush, come here"],
    [/calm down/gi, "breathe with me"],
    [/stop whining/gi, "tell me what you need"],
    [/you’re overreacting/gi, "you’re allowed to feel that"]
  ]);
  const softenTone = (txt) => {
    let out = txt;
    for (const [rx, rep] of SOFTEN_MAP) out = out.replace(rx, rep);
    return out;
  };

  /* Remove bracketed stage directions */
  const stripBrackets = (txt) => txt.replace(/[\(\[][^)\]]*[\)\]]/g, '').replace(/\s{2,}/g, ' ').trim();

  /* Minimal “banned” auto-strike we added earlier */
  const BANNED = [
    "rape","incest","bestiality","scat","trafficking","snuff"
  ];
  const strikeBad = (txt) => {
    const lower = txt.toLowerCase();
    if (BANNED.some(w => lower.includes(w))) {
      return "Let’s keep it safe and fun. Tell me something you *do* want, pretty girl.";
    }
    return txt;
  };

  /* Build the system prompt we send to the model */
  const systemPrompt = () => {
    const p = PERSONA[man] || PERSONA.blade;
    return `${CORE_RULES}\nPersona style: ${p.style}\nSpeak as ${guy.name}.`;
  };

  /* ====== message pipe ====== */
  const messages = store.get('log', []);
  const addMsg = (role, content) => {
    messages.push({ role, content });
    store.set('log', messages);
    paint();
  };

  const opener = () => {
    const p = PERSONA[man] || PERSONA.blade;
    const list = p.openers;
    return list[Math.floor(Math.random()*list.length)];
  };

  /* Render all bubbles */
  const paint = () => {
    const ul = $('#messages');
    if (!ul) return;
    ul.innerHTML = '';
    messages.forEach(m => {
      const li = document.createElement('li');
      li.className = 'msg ' + (m.role === 'user' ? 'user' : 'assistant');
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = m.content;
      li.appendChild(bubble);
      ul.appendChild(li);
    });
    // scroll to bottom
    chatWrap?.scrollTo({ top: chatWrap.scrollHeight, behavior: 'smooth' });
  };

  /* ====== reply engine ======
     Uses your backend if present (/api/reply). If it fails, we fall back locally. */
  const replyFromModel = async (history) => {
    try {
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt(),
          man, mode,
          messages: history
        })
      });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      return data.reply;
    } catch (err) {
      // Local lightweight fallback
      const last = history.slice().reverse().find(m => m.role === 'user')?.content || '';
      const p = PERSONA[man] || PERSONA.blade;
      const quick = [
        `Mm. ${last ? "I hear you." : "Come closer."} ${man==='alexander' ? "Be precise." : "Tell me more."}`,
        `Noted. ${man==='dylan' ? "Smirk." : ""} What do you want from me—comfort, chaos, or a plan?`.trim(),
        `Good girl. I’m on your side. Now give me one detail I can use.`
      ];
      return quick[Math.floor(Math.random()*quick.length)];
    }
  };

  const clean = (txt) => strikeBad(softenTone(stripBrackets(txt)));

  /* ====== send flow ====== */
  const send = async () => {
    const raw = (inputEl.value || '').trim();
    if (!raw) return;
    addMsg('user', raw);
    inputEl.value = '';
    paint();

    // Build trimmed history for the model (keep it short)
    const history = messages.slice(-12); // recent context

    // Get reply and clean it (never rude / no brackets / banned)
    let reply = await replyFromModel(history);
    reply = clean(reply);

    // Enforce brevity + a friendly follow-up if model forgot
    if (reply.length > 220) reply = reply.slice(0, 220).trim();
    if (!/[?.!]$/.test(reply)) reply += '.';
    // If no question present, add a light question to keep chat going
    if (!/[?]/.test(reply)) {
      const nudges = [
        " What do you want from me—comfort, chaos, or a plan?",
        " What should I do about it—tease you, spoil you, or both?",
        " Tell me one more detail so I can make it better."
      ];
      reply += nudges[Math.floor(Math.random()*nudges.length)];
    }

    addMsg('assistant', reply);
  };

  /* ====== bootstrap ====== */
  // First-time opener: keep it short/flirty/cute
  if (!store.get('booted', false)) {
    addMsg('assistant', (PERSONA[man] || PERSONA.blade).openers[0]);
    store.set('booted', true);
  } else {
    paint();
  }

  on(sendBtn, 'click', send);
  on(inputEl, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  /* ====== tiny cleanup for any stray filename text under the portrait ====== */
  document.addEventListener('DOMContentLoaded', () => {
    const p = document.querySelector('#portrait');
    if (!p) return;
    [...p.childNodes].forEach(n => {
      if (n.nodeType === 3 && /\.(webp|jpe?g|png|gif)$/i.test((n.textContent||'').trim())) n.remove();
    });
    p.querySelectorAll('small, figcaption, a, span, div').forEach(el=>{
      if (/\.(webp|jpe?g|png|gif)$/i.test((el.textContent||'').trim())) el.remove();
    });
  });
})();

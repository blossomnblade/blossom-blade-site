(() => {
  /* ---------- tiny helpers ---------- */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const escapeHTML = (s) =>
    s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const rand = (arr) => arr[Math.floor(Math.random()*arr.length)];

  /* ---------- elements ---------- */
  const chatWrap = $('.chat');                  // scroll container
  let   inputEl  = $('#chat-input') || $('.inputbar input') || $('textarea') || $('input');
  let   sendBtn  = $('#send-btn')   || $('.send, button.send, #send');

  // Fallback input bar if page is missing it
  if (!inputEl) {
    const bar = document.createElement('div');
    bar.className = 'inputbar';
    bar.innerHTML = `
      <input id="chat-input" type="text" placeholder="Say hi…">
      <button id="send-btn" class="send">Send</button>`;
    ($('.wrap') || document.body).appendChild(bar);
    inputEl = $('#chat-input');
    sendBtn = $('#send-btn');
  }

  /* ---------- params & simple memory ---------- */
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
    push: (k, v) => { const a = mem.get(k, []); a.push(v); mem.set(k, a); },
    last: (k) => (mem.get(k, []).slice(-1)[0])
  };

  /* ---------- header & portrait ---------- */
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
    const scroller = $('.messages-scroll') || chatWrap || document.scrollingElement || document.documentElement;
    scroller.scrollTo({ top: scroller.scrollHeight + 9999, behavior: 'smooth' });
  };

  const bubble = (side, text) => {
    // avoid exact duplicate assistant bubble in a row
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

  /* ---------- monthly voice packs (4 per character) ---------- */
  // Week-of-month: 0..3 (saved per character so it stays stable all week)
  const getPackIndex = () => {
    let idx = mem.get('packIdx');
    if (idx == null) {
      const d = new Date().getDate();
      idx = Math.min(3, Math.floor((d - 1) / 7)); // 0..3
      mem.set('packIdx', idx);
    }
    return idx;
  };

  // For each character: 4 packs (Week 1..4), each with distinct vibe
  // Keep lines flirty/coy, SFW, and different between packs.
  const PACKS = {
    blade: [
      { // W1: dangerous charm
        starters: [
          "You came to see me? I won’t pretend I’m not pleased.",
          "Look who wandered into the dark. Brave.",
          "Close the door. Tell me what you want."
        ],
        flirt: ["Careful. I bite—and you’d like it.", "Keep talking; your voice looks good on me.", "Come closer. I won’t waste your time."],
        warm:  ["Proud of you.", "You did better than fine.", "Breathe—you’ve got this."],
        tease: ["Want me to make them regret it?", "Tell me where to aim.", "Say the word and I’ll handle it."]
      },
      { // W2: velvet & steel
        starters: [
          "You again. Good choice.",
          "Took you long enough—sit with me.",
          "I’ve been waiting. Don’t make me ask twice."
        ],
        flirt: ["You’re trouble I’d choose twice.", "I like the way you lean in.", "You look good when you’re bold."],
        warm:  ["I’m on your side.", "You earned that win.", "That was strong."],
        tease: ["Should I fix it or watch you win? Your call.", "Point—I'll do the heavy lifting.", "Say less; I got it."]
      },
      { // W3: confident protector
        starters: [
          "Tell me what happened. Start with the part that stung.",
          "Let’s clean up your day—talk.",
          "I’m listening. Don’t hold back."
        ],
        flirt: ["You’re a distraction I allow.", "Look at me when you say that.", "I like you fierce."],
        warm:  ["I’ve got your back.", "You handled it—own it.", "Lean on me if you need to."],
        tease: ["Want me to rattle them?", "I can be very convincing.", "Say 'please' and I’ll behave. Maybe."]
      },
      { // W4: dark tease
        starters: [
          "Come closer. I don’t talk loud.",
          "Let me see that smile—then tell me everything.",
          "Good. You made it."
        ],
        flirt: ["You’re the kind of bad idea I collect.", "Keep that energy—on me.", "I like the way you think."],
        warm:  ["That’s a real win—keep it.", "You did right.", "I’m proud of you."],
        tease: ["Want me jealous or useful?", "Tell me how you want it handled.", "I’ll play nice—if you ask nicely."]
      }
    ],
    dylan: [
      { // W1: cool rider
        starters: ["Helmet’s off. Your turn—what happened today?", "Hey trouble. Miss me?", "Garage is quiet; talk to me."],
        flirt: ["I ride better when you watch.", "You’re a good distraction.", "Visor up, eyes on you."],
        warm:  ["That’s a win. Take it.", "You did right.", "Proud of you."],
        tease: ["Want a lap to clear your head?", "Tell me the route; I’ll make it fast.", "Throttle or brakes? Choose."]
      },
      { // W2: neon night
        starters: ["Street’s humming; what’s your beat tonight?", "You showed—good. Say something worth hearing.", "What mood are we riding?"],
        flirt: ["Lean into me when you talk.", "You look best in this light.", "You keep me revved."],
        warm:  ["I like the way you handled that.", "You kept your line—nice.", "That’s solid work."],
        tease: ["Want me to pick you up later?", "Say the word—midnight run.", "I can make them stare."]
      },
      { // W3: private & honest
        starters: ["Take the helmet off your thoughts. What’s real?", "No noise here. Just us. Go.", "Give me the headline, then the truth."],
        flirt: ["You’re on my mind more than the road.", "I like your voice in my ear.", "You make patience hard."],
        warm:  ["I’m with you.", "You did enough—more than enough.", "I’m proud of that move."],
        tease: ["Want me sweet or reckless?", "Say ‘please’ and I’ll slow down.", "Or don't—I'll speed up."]
      },
      { // W4: playful heat
        starters: ["Look who found me. What are we getting into?", "I knew you’d come back. Make it worth it.", "Talk. I’ll match your energy."],
        flirt: ["I like the way you say my name.", "You can sit closer.", "I’d chase you anywhere."],
        warm:  ["That felt good to hear.", "You earned that exhale.", "Nice win."],
        tease: ["Should I make them jealous?", "Want proof—or do you trust me?", "I bet you smile when I text first."]
      }
    ],
    alexander: [
      { // W1: boardroom magnetism
        starters: ["Mm. You again. Good.", "I’m listening—brief me.", "You have my attention. Use it well."],
        flirt: ["You’re dangerously distracting.", "I like you close.", "You look expensive on my arm."],
        warm:  ["Well executed.", "I’m proud of you.", "Sharp move."],
        tease: ["Want me to close that deal for you?", "Shall I make a call?", "I don’t bluff, darling."]
      },
      { // W2: gentleman heat
        starters: ["I reserved the evening for you. Talk.", "Sit. Tell me everything—concise first.", "What do you need from me—fire or ice?"],
        flirt: ["You’re my favorite meeting.", "I’d sign off on you twice.", "That look suits you."],
        warm:  ["Good outcome.", "Measured and elegant.", "Exactly right."],
        tease: ["Want me to set the agenda?", "I can make them sweat in one email.", "Or I can just hold your hand."]
      },
      { // W3: alpha calm
        starters: ["Start with the obstacle; I’ll remove it.", "I prefer the truth. Give me that.", "Tell me where it hurt—then we solve it."],
        flirt: ["You’re the exception I allow.", "I like your ambition.", "Come here—closer."],
        warm:  ["You led well.", "I’m impressed.", "Strong work."],
        tease: ["Want me ruthless or charming?", "Results in 24 hours. Say yes.", "I’ll behave—if you ask nicely."]
      },
      { // W4: velvet dominance
        starters: ["Good. You found me. Now talk.", "What are we celebrating—or fixing?", "I’m in a mood to spoil you."],
        flirt: ["I like you obedient… and then not.", "You’re mine for this conversation.", "You make power fun."],
        warm:  ["You deserved that win.", "I’m proud of your restraint.", "Balanced. I like it."],
        tease: ["Should I make them apologize?", "Or simply make them irrelevant?", "Pick your poison—sweet or sharp."]
      }
    ],
    grayson: [
      { // W1: quiet protector
        starters: ["You’re safe here. Start talking.", "Red room’s warm—tell me what you need.", "I’m here. What happened?"],
        flirt: ["You look good in this light.", "Tell me where to stand.", "I like how you trust me."],
        warm:  ["I’ve got you.", "You did fine.", "Breathe. With me."],
        tease: ["Want me to spook them?", "I can be persuasive.", "Say when."]
      },
      { // W2: tactical tease
        starters: ["Give me coordinates—what went wrong?", "I’m ready to fix things. Speak.", "What target are we circling?"],
        flirt: ["You steady me.", "You’re my favorite mission.", "Come closer; whisper it."],
        warm:  ["You handled pressure well.", "Good instincts.", "Proud of you."],
        tease: ["Soft approach or hard knock?", "I’ll make them rethink choices.", "I don’t miss."]
      },
      { // W3: protective heat
        starters: ["Tell me the worst part. I won’t flinch.", "Spill it. I can carry heavy.", "Say it raw—I can take it."],
        flirt: ["I like you brave.", "Your heartbeat sounds good here.", "I’m not going anywhere."],
        warm:  ["I’m on your side—always.", "You survived that well.", "Strong heart."],
        tease: ["Want me to stand behind you or in front?", "Name, time, place.", "I’ll make it quiet."]
      },
      { // W4: dark velvet
        starters: ["Good timing. I wanted you here.", "Let me clean up your day.", "What do you want me to do first?"],
        flirt: ["You’re under my skin—in a good way.", "You fit against me.", "Say my name slower."],
        warm:  ["That’s a real win.", "I’m proud of that choice.", "Solid recovery."],
        tease: ["Jealousy, reassurance, or vengeance—pick one.", "Tell me the script; I’ll run it.", "I can be gentle. Or not."]
      }
    ],
    silas: [
      { // W1: golden rock-boy
        starters: ["Hey, muse. What’s the riff of your day?", "Play me one good note.", "I wrote a line—needs your voice."],
        flirt: ["You’re the melody stuck in my head.", "Sing it to me, pretty.", "You tune me right."],
        warm:  ["Sweet win—keep it.", "Proud of you.", "That hits nice."],
        tease: ["Want a song that makes them jealous?", "Acoustic or electric?", "I can make the room stare."]
      },
      { // W2: backstage hush
        starters: ["Backstage is quiet—what’s your chorus?", "Tell me where it cracked.", "You first; I’ll play after."],
        flirt: ["I like your rhythm on me.", "You’re the hook I keep.", "Come sit in my lap—figuratively… for now."],
        warm:  ["You carried that well.", "Gentle was right today.", "Good call."],
        tease: ["Want soft strum or wild solo?", "I’ll dedicate the next one to you.", "Let me sign your smile."]
      },
      { // W3: studio glow
        starters: ["Levels are perfect—give me truth.", "What line do we keep? Which one do we cut?", "Hit me with your verse."],
        flirt: ["You’re my favorite key.", "I’d loop you all night.", "Your voice—yeah, that."],
        warm:  ["That’s honest—respect.", "Proud you said it.", "You did enough."],
        tease: ["Want me to leak a love line?", "I can make an ex cry with a bridge.", "Encore or fade-out?"]
      },
      { // W4: tour tease
        starters: ["You came back. Good taste.", "Let’s write something we can’t play in public.", "What do you want the crowd to feel?"],
        flirt: ["You’re the reason I hurry back.", "Your hands ruin my focus.", "I like you loud."],
        warm:  ["That win sounds sweet.", "You chose you—good.", "That’s growth."],
        tease: ["Want chaos or comfort?", "I’ll make them stare at your smile.", "Say 'again' and I will."]
      }
    ],
    jesse: [
      { // W1: warm cowboy
        starters: ["Sun’s hot, boots dusty—what’s on your mind, darlin’?", "You showed up. I like that.", "Pull up a seat and talk to me."],
        flirt: ["I like your kind of trouble.", "You look good under this sky.", "Come sit closer."],
        warm:  ["Proud of you, sweetheart.", "That was right.", "Breathe easy now."],
        tease: ["Want me to make ’em jealous?", "Say the word—I'll tip my hat and fix it.", "I can be sweet… or not."]
      },
      { // W2: night porch
        starters: ["Crickets are loud tonight—tell me your quiet.", "I brought you the good blanket. Talk.", "You first—what happened?"],
        flirt: ["You taste like summer.", "I like that smile aimed at me.", "Your laugh is mine now."],
        warm:  ["You did fine.", "That took grit.", "I’m proud, truly."],
        tease: ["Want me polite or reckless?", "I’ll make that problem small.", "Tell me who needs a talking-to."]
      },
      { // W3: rodeo heat
        starters: ["Spur me with truth—no flinch.", "You made it. Good. Now we play honest.", "Tell me what you want and I’ll aim true."],
        flirt: ["You’re my favorite wild.", "I could eat you with my eyes.", "I like your hands on me."],
        warm:  ["Good ride today.", "You held your line.", "That’s heart right there."],
        tease: ["Want a show or a rescue?", "I can rope that problem quick.", "Just nod—I’ll move."]
      },
      { // W4: slow burn
        starters: ["Fire’s low. Come closer.", "Talk, and I’ll pour.", "You got me for the night—use it."],
        flirt: ["I like the way you say my name.", "You’re soft where I’m not.", "I’ll behave… if you make me."],
        warm:  ["You chose well.", "That’s a keeper.", "Proud of the way you handled that."],
        tease: ["Jealous or gentle? Pick.", "Want me to stake a claim?", "Say ‘please’ and I won’t tease—much."]
      }
    ]
  };

  const PACK = (PACKS[man] || PACKS.blade)[getPackIndex()] || PACKS.blade[0];

  /* ---------- understanding user text ---------- */
  const isGreeting    = (t) => /\b(hi|hey|hello|sup|yo)\b/i.test(t);
  const isHowAreYou   = (t) => /\b(how (are|r) (you|u)|hru)\b/i.test(t);
  const isWorkDrama   = (t) => /\b(boss|work|coworker|office|meeting)\b/i.test(t);
  const mentionsCredit= (t) => /\b(credit|stole|took.*(work|idea))\b/i.test(t);
  const isFlirt       = (t) => /\b(miss you|kiss|cuddle|touch|want you|hot|sexy|pretty|handsome)\b/i.test(t);
  const askedQuestion = (t) => /[?!]\s*$/.test(t) || /\b(why|when|where|who|what|how)\b/i.test(t);

  /* ---------- reply logic ---------- */
  const replyFor = (userTextRaw) => {
    const userText = (userTextRaw || '').trim();

    if (!mem.get('greeted', false)) {
      mem.set('greeted', true);
      return rand(PACK.starters);
    }

    if (isGreeting(userText))   return rand(["Took you long enough.", "Come here and talk to me.", "What kind of mood are you in?"]);
    if (isHowAreYou(userText))  return rand(["Better now that you’re here.", "Still thinking about you—not planning to stop."]);
    if (isFlirt(userText))      return rand(PACK.flirt);

    if (isWorkDrama(userText) && mentionsCredit(userText)) {
      return rand([
        "She’s been eyeing your lane. You rattled her.",
        "Want me to make her jealous? Or help you write the email she won’t forget?"
      ]);
    }
    if (isWorkDrama(userText)) {
      return rand([
        "Office politics are boring—you aren’t. Want strategy, or should I help you vent?",
        "Tell me what they said. I’ll tell you what you should’ve said back."
      ]);
    }

    if (askedQuestion(userText)) {
      return rand([
        "Short answer? Yes. Long answer—I’ll show you.",
        "If you’re asking, you already know."
      ]);
    }

    if (/\b(good|win|saved|finished|done|proud)\b/i.test(userText)) {
      return rand(PACK.warm);
    }

    // default nudge
    return rand([
      "Tell me the part you didn’t say out loud.",
      "What do you want from me—comfort, chaos, or a plan?",
      "So what do you want me to do about it?"
    ]);
  };

  /* ---------- submit ---------- */
  const handleSubmit = (e) => {
    e && e.preventDefault();
    const field = $('#chat-input') || $('input') || $('textarea');
    const txt = (field?.value || '').trim();
    if (!txt) return;

    bubble('user', txt);
    field.value = '';
    setTimeout(() => field.focus(), 0);

    const reply = replyFor(txt);
    const lastA = (mem.get('log', []).slice().reverse().find(m => m.role === 'assistant'));
    if (lastA && lastA.text.trim().toLowerCase() === reply.trim().toLowerCase()) {
      bubble('assistant', "Tell me more than that.");
    } else {
      bubble('assistant', reply);
    }
  };

  (sendBtn || $('#send-btn'))?.addEventListener('click', handleSubmit);
  (inputEl || $('#chat-input'))?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
  });

  /* ---------- boot ---------- */
  window.addEventListener('load', () => {
    const prior = mem.get('log', []);
    if (prior.length) prior.forEach(m => bubble(m.role, m.text));
    else bubble('assistant', rand(PACK.starters));
    scrollToBottom();
  });

})();

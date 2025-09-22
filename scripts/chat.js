(() => {
  /* ================= helpers ================= */
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // Scroll container + pieces
  const wrap   = $('.chat-wrap') || document.body;
  const scroll = $('.messages-scroll') || wrap;
  const list   = $('#messages') || (() => {
    const ul = document.createElement('ul');
    ul.id = 'messages';
    ul.className = 'messages';
    (scroll || wrap).appendChild(ul);
    return ul;
  })();

  // Input + button (fallback builds if not present)
  let input = $('#chat-input');
  let sendBtn = $('#send-btn');
  if (!input || !sendBtn){
    const form = document.createElement('form');
    form.id = 'chat-form';
    form.className = 'chat-form';
    form.innerHTML = `
      <input id="chat-input" type="text" placeholder="Say hi…" />
      <button id="send-btn" type="submit" class="send">Send</button>
    `;
    wrap.appendChild(form);
    input   = $('#chat-input');
    sendBtn = $('#send-btn');
  }

  const params = new URLSearchParams(location.search);
  const man  = (params.get('man') || 'blade').toLowerCase();
  const mode = (params.get('sub') || 'night').toLowerCase();

  // Key for localStorage
  const memKey = (k) => `bnb.${man}.${mode}.${k||'history'}`;

  // Mild cache-buster for images so CDN refreshes when we swap files
  const cacheV = '3';

  /* ================= portrait loader (with fallbacks) ================= */
  function injectPortraitCSS(){
    // Do this here so you don't have to touch chat.css at all
    const css = `
      #portrait{ line-height:0; }
      #portraitImg{ width:100%; aspect-ratio:3/4; height:auto; object-fit:cover; display:block; border-radius:12px; }
    `;
    const tag = document.createElement('style');
    tag.textContent = css;
    document.head.appendChild(tag);
  }
  injectPortraitCSS();

  function setPortrait(name, _mode){
    const n = (name || '').toLowerCase().trim();
    const img = $('#portraitImg');
    if (!img) return;

    const order = ['chat', 'card-on', 'card-off'];
    let i = 0;
    const next = () => {
      if (i >= order.length){
        img.onerror = null;
        // ultimate fallback (exists)
        img.src = 'images/characters/blade/blade-card-on.webp';
        return;
      }
      const src = `images/characters/${n}/${n}-${order[i]}.webp?v=${cacheV}`;
      i += 1;
      img.onerror = next;
      img.src = src;
    };
    next();
  }
  setPortrait(man, mode);

  /* ================= personas ================= */
  const personas = {
    blade:{
      name:'Blade',
      openers:[
        'Come here and talk to me.',
        'Better now that you’re here.',
        'You took your time. Worth the wait?'
      ],
      style:'direct, teasing, protective'
    },
    dylan:{
      name:'Dylan',
      openers:[
        'You made it. Talk to me.',
        'Helmet’s off. Your turn—what happened today?',
        'Took you long enough.'
      ],
      style:'cool rider, minimal words, dry humor'
    },
    alexander:{
      name:'Alexander',
      openers:[
        'I’m listening—brief me.',
        'You again. Good.',
        'Walk me through your day—headlines only.'
      ],
      style:'low voice, alpha businessman, magnetic but controlled'
    },
    silas:{
      name:'Silas',
      openers:[
        'Look who showed up. Missed me?',
        'Come sit. What kind of trouble are we starting?',
        'Tell me the thing you almost didn’t say.'
      ],
      style:'runway rocker, playful, flirty'
    },
    grayson:{
      name:'Grayson',
      openers:[
        'You’re safe here. Talk.',
        'What’s on your mind? Keep it real.',
        'I’ve got time. Start anywhere.'
      ],
      style:'stoic protector, warm underneath'
    }
  };

  const P = personas[man] || personas.blade;

  /* ================= content boundaries ================= */
  const bannedWords = [
    'rape','incest','scat','trafficking','bestiality','minor','underage'
  ];
  const badRx = new RegExp(`\\b(${bannedWords.join('|')})\\b`, 'i');

  function boundaryText(){
    return "Not that. I’m here for you, but we keep this safe and consensual. Give me something else.";
  }

  /* ================= storage ================= */
  function loadHistory(){
    try{
      const raw = localStorage.getItem(memKey());
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveHistory(listArr){
    try{ localStorage.setItem(memKey(), JSON.stringify(listArr)); }catch(e){}
  }

  /* ================= render ================= */
  function addMsg(role, text){
    const li = document.createElement('li');
    li.className = `msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    li.appendChild(bubble);
    list.appendChild(li);
    scrollToEnd();
  }

  function scrollToEnd(){
    const c = scroll || document.scrollingElement || document.documentElement;
    (c === document.documentElement)
      ? window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'})
      : (c.scrollTop = c.scrollHeight);
  }

  /* ================= tiny reply engine ================= */
  // Lightweight, flirty, and responsive without brackets or stage directions.
  function craftReply(userText){
    const t = (userText || '').trim();
    if (!t) return 'Say it. I’m listening.';

    if (badRx.test(t)) return boundaryText();

    const low = t.toLowerCase();

    // quick-hooks
    if (/how (are|r) (you|u)/i.test(low)){
      if (man==='alexander') return "Focused. Now tell me something real from your day.";
      if (man==='dylan')     return "Better with you here.";
      if (man==='silas')     return "I’m good—curious about you.";
      if (man==='grayson')   return "Solid. What do you need from me?";
      return "Good. What do you need from me?";
    }

    if (/kitten|puppy|dog|cat/i.test(low)){
      return "Look at you being the hero. Want me to brag about you for a minute or make it a reward situation?";
    }

    if (/book|reading|chapter|novel/i.test(low)){
      return "Nice. What’s the line that stuck to you? Quote it and I’ll tell you what it does to me.";
    }

    if (/work|boss|office|meeting|coworker|credit/i.test(low)){
      if (man==='alexander') return "Office politics. Predictable. You want advice, alibi, or a little targeted praise you can replay later?";
      if (man==='dylan')     return "Mm. Want comfort, chaos, or a plan?";
      if (man==='silas')     return "She’s been eyeing your spotlight anyway. Want me to make her jealous for you?";
      return "Tell me what you want: comfort, chaos, or a plan.";
    }

    if (/tired|long day|exhausted|burned/i.test(low)){
      if (man==='grayson') return "Lie back. Breathe with me. Give me one good thing and I’ll carry the rest.";
      return "Come closer. Tell me one small good thing from your day—just one.";
    }

    if (/miss(ed)? you|miss u/i.test(low)){
      if (man==='silas') return "Prove it—what part of me did you miss first?";
      return "I noticed. What did you miss most?";
    }

    // fallback personality flavors
    const generic = [
      "Tell me the part you didn’t say out loud.",
      "Alright. Do you want sweet, wicked, or honest?",
      "Pick a lane—comfort, chaos, or a plan?",
      "I’m here. Aim me."
    ];
    const bladeLines = [
      "Good. Now tell me what you want from me.",
      "Say it plain. I don’t scare easy.",
      "You’re safe. Try again—tighter."
    ];
    const dylanLines = [
      "Minimal words. Maximum meaning. Try me.",
      "Alright. What’s the vibe right now?",
      "You’re here. That helps."
    ];
    const alexLines = [
      "Headlines. Then we choose the strategy.",
      "Be precise. I’ll be generous.",
      "You talk. I’ll make sense of it."
    ];
    const silasLines = [
      "Give me the dangerous version.",
      "Tease me with the detail I’m not supposed to hear.",
      "I like you bold. Go on."
    ];
    const grayLines = [
      "I got you. What do you need—backup or heat?",
      "Talk to me. I’m not going anywhere.",
      "You’re not a lot to handle. You’re worth handling."
    ];

    const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)];
    if (man==='blade')      return pick(bladeLines);
    if (man==='dylan')      return pick(dylanLines);
    if (man==='alexander')  return pick(alexLines);
    if (man==='silas')      return pick(silasLines);
    if (man==='grayson')    return pick(grayLines);
    return pick(generic);
  }

  /* ================= boot / history ================= */
  let history = loadHistory();
  function renderHistory(){
    list.innerHTML = '';
    history.forEach(m => addMsg(m.role, m.text));
  }
  function push(role, text){
    history.push({role, text, ts: Date.now()});
    addMsg(role, text);
    saveHistory(history);
  }

  renderHistory();
  if (history.length === 0){
    // seed one flirty opener
    const opener = (P.openers[Math.floor(Math.random()*P.openers.length)]);
    push('assistant', opener);
  }

  // Reflect the name up top if #chatName exists
  const chatNameEl = $('#chatName');
  if (chatNameEl) chatNameEl.textContent = P.name || man;

  /* ================= input handling ================= */
  function handleSend(ev){
    ev && ev.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    push('user', text);

    // boundaries
    if (badRx.test(text)){
      push('assistant', boundaryText());
      return;
    }

    // craft + respond
    const reply = craftReply(text);
    // slight natural pause
    setTimeout(() => push('assistant', reply), 320);
  }

  on(sendBtn, 'click', handleSend);
  on(input.closest('form') || input, 'submit', handleSend);
  on(input, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      handleSend(e);
    }
  });

  // Keep the scroll pinned to bottom on resize
  on(window, 'resize', scrollToEnd);

})();

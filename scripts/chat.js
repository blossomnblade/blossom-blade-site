/* Blossom & Blade — chat.js (v4)
   - Locked viewport + messages autoscroll (CSS + JS)
   - Portrait loader for chat-specific faces (no label/alt flicker)
   - Correct room backgrounds (Alexander included)
   - Persona greets first; send wiring robust
   - Trial/paywall disabled
*/

(function(){
  const TRIAL_ENABLED = false;           // OFF until billing
  const TRIAL_MINUTES = 10;
  const PAY_URL = '/pay.html';
  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

  // Night room backgrounds
  const bgMapNight = {
    blade: '/images/blade-woods.jpg',
    viper: '/images/viper-bg.jpg',
    dylan: '/images/dylan-garage.jpg',
    alexander: '/images/bg_alexander_boardroom.jpg',  // per repo
    grayson: '/images/grayson-bg.jpg',
    silas: '/images/bg_silas_stage.jpg'
  };

  // Chat portraits (faces) — one per man
  function chatPortraitFor(man){
    // canonical path you cleaned up last thread
    return `/images/characters/${man}/${man}-chat.webp`;
  }

  const phraseBank = {
    openers: {
      blade: ["Run, rebel. I like the chase.","Door’s unlocked—make a choice.","Look at me, not the moon.","Mine now. Don’t look back.","Good girl—closer.","Fast or faster—pick.","You came here to be caught."],
      viper: ["You’re late. I prefer you early.","I know your Wednesday routes, angel.","Neck bare at 11:14—don’t tease me.","City’s loud. I’m louder.","You’re safest when you’re mine.","I count your breaths when you sleep.","Say you belong to me tonight."],
      dylan: ["Hop on—left glove stays on.","Helmet? Or do you like windburn, pretty thing?","Lap’s warm, tank’s full.","Good girl—swing that leg over.","Keys jingle when you make me smile.","We take corners or take chances?","I’ll idle till you say please."],
      alexander: ["Amuri miu, look at me.","Velvet or teeth—choose, Cori.","Good—now yield, amore.","Vitu’, you tremble sweetly.","I don’t share what’s mine.","Come kiss the ring, amore.","We dance where knives are polite."],
      grayson: ["Square your shoulders. Breathe for me.","Good girl—eyes up.","Earn it; I’ll reward you.","Test your limits, I keep you safe.","Brat again—see what happens.","Hands behind. Count my breaths.","Kneel. Praise pays interest."],
      silas: ["Come here, Linx—listen to the hum.","Mmm, fox—bring me that grin.","Poppet, I’ll tune you by feel.","Strings bite sweeter than teeth.","Closer—let the rhyme take you.","I’ll ruin your lipstick like a chorus.","Hush—feel that low note in your bones."]
    },
    global: [
      "oh baby, yes…",
      "mm—give me your surrender.",
      "is that for me?",
      "light as a feather, darling.",
      "come here—let me hold you.",
      "I’ve got you. breathe.",
      "good girl.",
      "use your words, pretty thing.",
      "I like it when you’re daring.",
      "I like you all worked up."
    ],
    tags: {
      blade: ["run","mine now","don’t look back","good girl—faster"],
      viper: ["mine","obsessed","stay where I can see you"],
      dylan: ["good girl","ride","tank","lap","backpack"],
      alexander: ["amuri miu","amore","yield","gentleman predator"],
      grayson: ["reward","discipline","cuffs","brat"],
      silas: ["Linx","fox","poppet","rhyme"]
    }
  };

  // DOM
  const qs = (s, p=document) => p.querySelector(s);
  const messagesEl = qs('.messages');
  const inputEl = qs('#composer-input');
  const sendBtn = qs('#send-btn');
  const portraitEl = qs('#portrait');

  const url = new URL(location.href);
  const man = (url.searchParams.get('man') || 'blade').toLowerCase();
  const sub = (url.searchParams.get('sub') || 'night').toLowerCase();

  const trialKey = 'bb_trial_started_at';
  const history = [];
  const logbuf = [];
  const log = (...a)=> { if (!DEBUG) return; logbuf.push(a.join(' ')); if (logbuf.length>50) logbuf.shift(); console.debug('[bb]',...a); };

  // Background & portrait
  function applyBackground(){
    const img = (sub === 'night' ? bgMapNight[man] : bgMapNight[man]) || bgMapNight.blade;
    document.body.style.backgroundImage = `url("${img}")`;
  }
  function loadPortrait(){
    if (!portraitEl) return;
    const srcs = [
      chatPortraitFor(man),
      `/images/characters/${man}/${man}.webp`,
      `/images/${man}.jpg`,
    ];
    let i = 0;
    const tryLoad = () => {
      if (i >= srcs.length) return;
      const src = srcs[i++];
      portraitEl.src = src;
    };
    portraitEl.alt = ''; // never render label
    portraitEl.addEventListener('load', ()=> portraitEl.classList.add('ready'));
    portraitEl.addEventListener('error', tryLoad);
    tryLoad();
  }

  // Trial: disabled
  function ensureTrialStart(){
    try { localStorage.removeItem(trialKey); } catch {}
  }
  const blockIfTrialExpired = () => false;

  // Helpers
  const atBottom = (el) => (el.scrollHeight - el.scrollTop - el.clientHeight) < 32;
  function addMessage(role, content){
    const row = document.createElement('div'); row.className = `row ${role}`;
    const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = content;
    row.appendChild(bubble);
    const stick = atBottom(messagesEl);
    messagesEl.appendChild(row);
    if (stick) row.scrollIntoView({behavior:'smooth', block:'end'});
    history.push({role, content});
  }
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const semSame = (a,b)=> norm(a)===norm(b);
  function lastAssistant(n=3){ const out=[]; for(let i=history.length-1;i>=0 && out.length<n;i--) if(history[i].role==='assistant') out.push(history[i].content); return out; }
  function avoidRepeat(text){ for(const prev of lastAssistant()) if(semSame(prev,text)) return text+" (mm—come closer.)"; return text; }

  // Safety
  function redCheckIn(){
    const lines = [
      "I hear you—slow with me. You good, pretty thing?",
      "I’ve got you. Breathe. Want water, a pause, or softer?",
      "We stop or go gentler—your call."
    ];
    addMessage('assistant', lines[Math.floor(Math.random()*lines.length)]);
  }

  // Build system prompt (unchanged from last)
  function buildSystemPrompt(){
    const globalRules = `
You are a flirty→dirty, cinematic partner who can ALSO do normal supportive conversation.
POV first person; address the user as "you". 1–3 sentences (<45 words). Vivid verbs, light sensory cues.
Never say "tell me more". Prefer: "oh baby, yes…", "mm—give me your surrender.", "is that for me?"
If she’s sad/angry/worried: acknowledge → validate → steady → optional soft comfort or playful distraction; no therapy language.
One assent ("yes", "please", "yes sir/ma’am", "make me", "good girl", "I want that") → escalate confidently (no triple checks).
If she doubts physical ability: reassure ("oh baby, you’re light as a feather").
If user types "RED": pause and check in gently; prioritize safety and consent.
Keep responses varied; avoid repeating recent wording.`;
    const personas = {
      blade: `Blade — Scream chase, playful menace, quick commands.`,
      viper: `Viper — obsessive, possessive city-at-night; territorial subtext.`,
      dylan: `Dylan — biker; glove on/off; tank/lap invites; "backpack" as a playful prop.`,
      alexander: `Alexander — Sicilian danger; velvet threat; gentleman predator.`,
      grayson: `Grayson — military dom; reward-forward; bratting fires him up.`,
      silas: `Silas — feral guitarist; 25% South-Yorkshire seasoning; pet names: Linx, fox, poppet; prefers "rhyme".`
    };
    const ops = phraseBank.openers[man] || phraseBank.openers.blade;
    const starter = ops[Math.floor(Math.random()*ops.length)];
    return { system: `${globalRules}\n\nPersona:\n${personas[man]}\n\nStart strong. If first reply of session, consider: "${starter}"` };
  }

  async function callModel(userText){
    const { system } = buildSystemPrompt();
    const payload = { system, history: history.slice(-12), user: userText, persona: man };
    const jitter = 600 + Math.random()*900; await new Promise(r=>setTimeout(r, jitter));
    try{
      const res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('bad status '+res.status);
      const data = await res.json();
      return (data && data.reply) ? data.reply : fallbackLine();
    }catch(e){ return fallbackLine(true); }
  }
  function fallbackLine(err){
    if (err) return "Connection snag—come closer and say that again, pretty thing.";
    const g=phraseBank.global, t=phraseBank.tags[man]||[], pick=a=>a[Math.floor(Math.random()*a.length)];
    return `${pick(g)} ${pick(t)||""}`.trim();
  }

  // Wire up
  function greet(){
    const ops = phraseBank.openers[man];
    if (ops && ops.length) addMessage('assistant', ops[Math.floor(Math.random()*ops.length)]);
  }
  async function onSend(){
    if (blockIfTrialExpired()) return;
    const text = (inputEl?.value || '').trim(); if (!text) return;
    addMessage('user', text); if (inputEl) inputEl.value='';
    if (text.toLowerCase()==='red'){ redCheckIn(); return; }
    const reply = await callModel(text);
    addMessage('assistant', avoidRepeat(reply));
  }

  sendBtn?.addEventListener('click', (e)=>{ e.preventDefault(); onSend(); });
  inputEl?.addEventListener('keydown', (e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend(); } });

  // Init
  applyBackground();
  loadPortrait();
  ensureTrialStart();
  greet();
})();

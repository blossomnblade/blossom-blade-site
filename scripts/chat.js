/* Blossom & Blade — chat.js (v3)
   Fixes:
   - Send button works (robust wiring for any markup)
   - Persona opens first (no session flag required)
   - Backgrounds brighter
   - Captions/“— portrait” text removed via JS
   - Trial OFF (no paywall redirect), easy flip to 10m later
*/

(() => {
  // -------- Flags & Config --------
  const TRIAL_ENABLED = false;          // OFF now. Flip true to enable.
  const TRIAL_MINUTES = 10;             // when enabled
  const PAY_URL = '/pay.html';
  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

  // Backgrounds (night)
  const bgMapNight = {
    blade: '/images/blade-woods.jpg',
    viper: '/images/viper-bg.jpg',
    dylan: '/images/dylan-garage.jpg',
    alexander: '/images/gothic-bg.jpg',
    grayson: '/images/grayson-bg.jpg',
    silas: '/images/bg_silas_stage.jpg',
  };

  // ---------- Phrases (updated) ----------
  const phraseBank = {
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
      blade: ["run", "mine now", "don’t look back", "good girl—faster"],
      viper: ["mine", "obsessed", "stay where I can see you"],
      dylan: ["good girl", "ride", "tank", "lap", "backpack"],
      alexander: ["amuri miu", "amore", "yield", "gentleman predator"],
      grayson: ["reward", "discipline", "cuffs", "brat"],
      silas: ["Linx", "fox", "poppet", "rhyme"]
    },
    openers: {
      blade: [
        "Run, rebel. I like the chase.",
        "Door’s unlocked—make a choice.",
        "Look at me, not the moon.",
        "Mine now. Don’t look back.",
        "Good girl—closer.",
        "Fast or faster—pick.",
        "You came here to be caught."
      ],
      viper: [
        "You’re late. I prefer you early.",
        "I know your Wednesday routes, angel.",
        "Neck bare at 11:14—don’t tease me.",
        "City’s loud. I’m louder.",
        "You’re safest when you’re mine.",
        "I count your breaths when you sleep.",
        "Say you belong to me tonight."
      ],
      dylan: [
        "Hop on—left glove stays on.",
        "Helmet? Or do you like windburn, pretty thing?",
        "Lap’s warm, tank’s full.",
        "Good girl—swing that leg over.",
        "Keys jingle when you make me smile.",
        "We take corners or take chances?",
        "I’ll idle till you say please."
      ],
      alexander: [
        "Amuri miu, look at me.",
        "Velvet or teeth—choose, Cori.",
        "Good—now yield, amore.",
        "Vitu’, you tremble sweetly.",
        "I don’t share what’s mine.",
        "Come kiss the ring, amore.",
        "We dance where knives are polite."
      ],
      grayson: [
        "Square your shoulders. Breathe for me.",
        "Good girl—eyes up.",
        "Earn it; I’ll reward you.",
        "Test your limits, I keep you safe.",
        "Brat again—see what happens.",
        "Hands behind. Count my breaths.",
        "Kneel. Praise pays interest."
      ],
      silas: [
        "Come here, Linx—listen to the hum.",
        "Mmm, fox—bring me that grin.",
        "Poppet, I’ll tune you by feel.",
        "Strings bite sweeter than teeth.",
        "Closer—let the rhyme take you.",
        "I’ll ruin your lipstick like a chorus.",
        "Hush—feel that low note in your bones."
      ]
    }
  };

  // ---------- DOM (robust selectors so send always wires) ----------
  const qs = (s, p=document) => p.querySelector(s);
  const messagesEl = qs('.messages') || (() => {
    const div = document.createElement('div'); div.className = 'messages'; (qs('.chat')||document.body).prepend(div); return div;
  })();

  // Composer: try multiple patterns
  const composer = qs('.composer') || qs('form.composer') || qs('[data-role="composer"]') || qs('footer .composer') || qs('form');
  const inputEl =
    qs('#composer-input', composer) ||
    qs('textarea', composer) ||
    qs('input[type="text"]', composer) ||
    qs('input', composer);
  const sendBtn =
    qs('#send-btn', composer) ||
    qs('.send', composer) ||
    qs('[data-action="send"]', composer) ||
    qs('button[type="submit"]', composer) ||
    qs('button', composer);

  const url = new URL(location.href);
  const man = (url.searchParams.get('man') || 'blade').toLowerCase();
  const sub = (url.searchParams.get('sub') || 'night').toLowerCase();

  const trialKey = 'bb_trial_started_at';
  const antiRepeatWindow = 3;
  const history = [];
  const logbuf = [];
  function log(...a){ if (!DEBUG) return; logbuf.push(a.join(' ')); if (logbuf.length>50) logbuf.shift(); console.debug('[bb]', ...a); }

  // ---------- Background ----------
  function applyBackground() {
    const img = (sub === 'night' ? bgMapNight[man] : bgMapNight[man]) || bgMapNight['blade'];
    document.body.style.backgroundImage = `url("${img}")`;
    log('bg set', man, sub, img);
  }

  // ---------- Caption/label killer ----------
  function hidePortraitLabels() {
    document.querySelectorAll('.card *').forEach(el => {
      const t = (el.innerText || '').trim().toLowerCase();
      if (el.tagName === 'FIGCAPTION' || /—\s*portrait/i.test(el.textContent || '')) {
        el.style.display = 'none';
        el.style.height = '0px';
        el.setAttribute('aria-hidden','true');
      }
    });
  }

  // ---------- Trial ----------
  function ensureTrialStart() {
    if (!TRIAL_ENABLED){
      try { localStorage.removeItem(trialKey); } catch {}
      return;
    }
    if (!localStorage.getItem(trialKey)) {
      localStorage.setItem(trialKey, String(Date.now()));
      log('trial started (enabled)');
    }
  }
  function msLeftInTrial() {
    if (!TRIAL_ENABLED) return Infinity;
    const started = localStorage.getItem(trialKey);
    if (!started) return TRIAL_MINUTES*60*1000;
    const elapsed = Date.now() - Number(started);
    return Math.max(0, TRIAL_MINUTES*60*1000 - elapsed);
  }
  function blockIfTrialExpired() {
    if (!TRIAL_ENABLED) return false;
    if (msLeftInTrial() <= 0) {
      if (sendBtn) sendBtn.disabled = true;
      if (inputEl) inputEl.disabled = true;
      addMessage('assistant', "Trial ended—unlock when you’re ready, pretty thing.");
      setTimeout(()=> location.href = `${PAY_URL}?reason=trial_over`, 900);
      return true;
    }
    return false;
  }

  // ---------- UI helpers ----------
  function atBottom(el){ const threshold=32; return el.scrollHeight - el.scrollTop - el.clientHeight < threshold; }
  function addMessage(role, content){
    const row = document.createElement('div');
    row.className = `row ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = content;
    row.appendChild(bubble);
    const stick = atBottom(messagesEl);
    messagesEl.appendChild(row);
    if (stick) row.scrollIntoView({behavior:'smooth', block:'end'});
    history.push({role, content});
    log(role+':', content);
  }
  function lastNAIAssistant(n=antiRepeatWindow){
    const out=[]; for (let i=history.length-1;i>=0 && out.length<n;i--) if (history[i].role==='assistant') out.push(history[i].content); return out;
  }
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const semSame = (a,b)=> norm(a)===norm(b);

  // RED handling
  const isRED = t => t.trim().toLowerCase()==='red';
  function redCheckIn(){
    const lines=[
      "I hear you—slow with me. You good, pretty thing?",
      "I’ve got you. Breathe. Want water, a pause, or softer?",
      "We stop or go gentler—your call."
    ];
    addMessage('assistant', lines[Math.floor(Math.random()*lines.length)]);
  }

  // ---------- System prompt ----------
  function buildSystemPrompt(persona){
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
      blade: `Blade — Scream chase, playful menace, quick commands. Nickname: rebel. Phrases: "run", "mine now", "don’t look back", "good girl—faster".`,
      viper: `Viper — obsessive, possessive city-at-night; territorial subtext; acts like he studies her patterns.`,
      dylan: `Dylan — biker; glove on/off; tank/lap invites; "backpack" as a playful prop; praises "good girl".`,
      alexander: `Alexander — Sicilian danger; velvet threat, gentleman predator. Endearments: amuri miu, Vitu’, Cori, amore. If he says "Good—now yield," follow with an endearment. Jealous line: "Amore, don’t get your little friend in trouble…".`,
      grayson: `Grayson — military dom; reward-forward: "I test your limits, keep you safe, punish you so sweetly." Likes praise/discipline, cuffs, low groans; bratting fires him up.`,
      silas: `Silas — feral guitarist; 25% South-Yorkshire seasoning; pet names: Linx, fox, poppet; lush, decadent; prefers "rhyme" over "rhythm".`,
    };

    const ops = phraseBank.openers[persona] || phraseBank.openers.blade;
    const starter = ops[Math.floor(Math.random()*ops.length)];
    return { system:
`${globalRules}

Persona:
${personas[persona]}

Start strong. If first reply of session, consider: "${starter}"` };
  }

  // ---------- API ----------
  async function callModel(userText){
    const { system } = buildSystemPrompt(man);
    const payload = { system, history: history.slice(-12), user: userText, persona: man };
    const jitter = 600 + Math.random()*900; // 0.6–1.5s
    await new Promise(r => setTimeout(r, jitter));
    try{
      const res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('bad status '+res.status);
      const data = await res.json();
      return (data && data.reply) ? data.reply : fallbackLine();
    }catch(e){
      log('api err', e?.message||e);
      return fallbackLine(true);
    }
  }
  function fallbackLine(isErr=false){
    if (isErr) return "Connection snag—come closer and say that again, pretty thing.";
    const tag = phraseBank.tags[man] || [];
    const gl = phraseBank.global;
    const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)];
    return `${pick(gl)} ${pick(tag)||""}`.trim();
  }
  function avoidRepeat(text){
    for (const prev of lastNAIAssistant()){
      if (semSame(prev, text)) return text + " (mm—come closer.)";
    }
    return text;
  }

  // ---------- Wire up ----------
  function greetIfQuiet(){
    // Always greet if there are no assistant lines yet
    if (!messagesEl.querySelector('.assistant')) {
      const ops = phraseBank.openers[man];
      if (ops && ops.length) addMessage('assistant', ops[Math.floor(Math.random()*ops.length)]);
    }
  }

  function init(){
    applyBackground();
    ensureTrialStart();
    hidePortraitLabels();
    greetIfQuiet();
  }

  async function onSend(){
    if (blockIfTrialExpired()) return;
    const text = (inputEl?.value || '').trim();
    if (!text) return;
    addMessage('user', text);
    if (inputEl) inputEl.value = '';

    if (isRED(text)){ redCheckIn(); return; }

    const reply = await callModel(text);
    addMessage('assistant', avoidRepeat(reply));
  }

  // Attach safely: both click and form submit
  if (sendBtn) sendBtn.addEventListener('click', (e)=>{ e.preventDefault?.(); onSend(); });
  if (composer) composer.addEventListener('submit', (e)=>{ e.preventDefault(); onSend(); });
  if (inputEl) inputEl.addEventListener('keydown', (e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend(); } });

  // Debug helper
  if (DEBUG){ window.bbDump = () => ({man, sub, history, TRIAL_ENABLED, trialMsLeft: msLeftInTrial(), logbuf}); }

  init();
})();

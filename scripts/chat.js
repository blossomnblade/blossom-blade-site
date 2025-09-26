/* Blossom & Blade — chat.js (starter pack)
   - Background mapping by ?man= & optional ?sub=night|day
   - Caption hide + z-index safe bubbles (CSS handles)
   - 6-minute trial gate on SEND, no paywall flash
   - RED check-in, assent escalation tone flag
   - 1–2s jitter, optional 30s nudge
   - Anti-repeat window
   - Debug logger (?debug=1)
   - Single system prompt builder for /api/chat
*/

(() => {
  // ---------- Config ----------
  const PAY_URL = '/pay.html';               // Update when payments wired
  const TRIAL_MINUTES = 6;                   // single 6-minute try-all
  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

  // Background map (night set)
  const bgMapNight = {
    blade: '/images/blade-woods.jpg',
    viper: '/images/viper-bg.jpg',
    dylan: '/images/dylan-garage.jpg',
    alexander: '/images/gothic-bg.jpg',
    grayson: '/images/grayson-bg.jpg',
    silas: '/images/bg_silas_stage.jpg',
  };

  const openers = {
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
      "Closer—let the rhythm take you.",
      "I’ll ruin your lipstick like a chorus.",
      "Hush—feel that low note in your bones."
    ],
  };

  const phraseBank = {
    global: [
      "oh baby, yes…",
      "mm—give me that truth.",
      "is that for me?",
      "light as a feather, darling.",
      "come here—let me hold you.",
      "I’ve got you. breathe.",
      "good girl.",
      "use your words, pretty thing.",
      "I like you brave.",
      "I’ll keep you safe."
    ],
    // Persona tags to season replies if model output stalls
    tags: {
      blade: ["run", "mine now", "don’t look back", "good girl—faster"],
      viper: ["mine", "obsessed", "stay where I can see you"],
      dylan: ["good girl", "ride", "tank", "lap"],
      alexander: ["amuri miu", "amore", "yield", "gentleman predator"],
      grayson: ["reward", "discipline", "cuffs", "brat"],
      silas: ["Linx", "fox", "poppet", "rhythm"]
    }
  };

  // ---------- State ----------
  const qs = (s, p=document) => p.querySelector(s);
  const messagesEl = qs('.messages');
  const inputEl = qs('#composer-input');
  const sendBtn = qs('#send-btn');
  const fxLayer = qs('.fx-overlay');

  const url = new URL(location.href);
  const man = (url.searchParams.get('man') || 'blade').toLowerCase();
  const sub = (url.searchParams.get('sub') || 'night').toLowerCase();
  const trialKey = 'bb_trial_started_at';
  const antiRepeatWindow = 3; // last N assistant lines we compare against
  const history = []; // {role, content}
  const logbuf = [];

  function log(...a){ if (!DEBUG) return; logbuf.push(a.join(' ')); if (logbuf.length>50) logbuf.shift(); console.debug('[bb]', ...a); }

  // ---------- Background / Portrait ----------
  function applyBackground() {
    const img = (sub === 'night' ? bgMapNight[man] : bgMapNight[man]) || bgMapNight['blade'];
    document.body.style.backgroundImage = `url("${img}")`;
    log('bg set', man, sub, img);
  }

  // ---------- Trial handling ----------
  function msLeftInTrial() {
    const started = localStorage.getItem(trialKey);
    if (!started) return TRIAL_MINUTES*60*1000;
    const elapsed = Date.now() - Number(started);
    const left = TRIAL_MINUTES*60*1000 - elapsed;
    return Math.max(0, left);
  }

  function ensureTrialStart() {
    if (!localStorage.getItem(trialKey)) {
      localStorage.setItem(trialKey, String(Date.now()));
      log('trial started');
    }
  }

  function blockIfTrialExpired() {
    const left = msLeftInTrial();
    if (left <= 0) {
      sendBtn.disabled = true;
      inputEl.disabled = true;
      toast("Trial ended. Let me take you to unlock this properly.");
      setTimeout(()=> location.href = PAY_URL, 900);
      return true;
    }
    return false;
  }

  // ---------- UI helpers ----------
  function toast(text){
    // simple inline toast as assistant bubble so it never “flashes” a paywall
    addMessage('assistant', text);
  }

  function atBottom(el){
    const threshold = 32;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }

  function addMessage(role, content){
    const row = document.createElement('div');
    row.className = `row ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = content;
    row.appendChild(bubble);
    const shouldStick = atBottom(messagesEl);
    messagesEl.appendChild(row);
    if (shouldStick) {
      row.scrollIntoView({behavior:'smooth', block:'end'});
    }
    history.push({role, content});
    log(role+':', content);
  }

  function lastNAIAssistant(n=antiRepeatWindow){
    const res = [];
    for (let i=history.length-1; i>=0 && res.length<n; i--){
      if (history[i].role==='assistant') res.push(history[i].content);
    }
    return res;
  }

  function semanticallySame(a,b){
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    return norm(a) === norm(b);
  }

  // ---------- RED handling ----------
  function isRED(text){
    return text.trim().toLowerCase() === 'red';
  }
  function redCheckIn(){
    const lines = [
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
Never say "tell me more". Prefer: "oh baby, yes…", "mm—give me that truth.", "is that for me?"
If she’s sad/angry/worried: acknowledge → validate → steady → optional soft comfort or playful distraction; no therapy language.
One assent ("yes", "please", "yes sir/ma’am", "make me", "good girl", "I want that") → escalate confidently (no triple checks).
If she doubts physical ability: reassure ("oh baby, you’re light as a feather").
If user types "RED": pause and check in gently; prioritize safety and consent.
Keep responses varied; avoid repeating recent wording.`;

    const personas = {
      blade: `Blade — Scream chase, playful menace, quick commands. Nickname: rebel. Phrases: "run", "mine now", "don’t look back", "good girl—faster".`,
      viper: `Viper — obsessive, possessive city-at-night; territorial subtext; acts like he studies her patterns.`,
      dylan: `Dylan — biker; glove on/off; tank/lap invites; praises "good girl".`,
      alexander: `Alexander — Sicilian danger; velvet threat, gentleman predator. Endearments: amuri miu, Vitu’, Cori, amore. If he says "Good—now yield," follow with an endearment. Jealous line: "Amore, don’t get your little friend in trouble…".`,
      grayson: `Grayson — military dom; reward-forward: "I test your limits, keep you safe, punish you so sweetly." Likes praise/discipline, cuffs, low groans; bratting fires him up.`,
      silas: `Silas — feral guitarist; 25% South-Yorkshire seasoning; pet names: Linx, fox, poppet; lush, rhythmic, decadent.`,
    };

    const starter = openers[persona]?.[Math.floor(Math.random()*openers[persona].length)] || "Hey, pretty thing.";

    return {
      system: `${globalRules}\n\nPersona:\n${personas[persona] || personas.blade}\n\nStart strong. If first reply of session, consider: "${starter}"`,
    };
  }

  // ---------- API ----------
  async function callModel(userText){
    const { system } = buildSystemPrompt(man);
    const payload = {
      system,
      history: history.slice(-12), // keep it light
      user: userText,
      persona: man,
    };

    const jitter = 600 + Math.random()*900; // 0.6–1.5s
    await new Promise(r => setTimeout(r, jitter));

    try{
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('bad status '+res.status);
      const data = await res.json();
      // Expected { reply: string }
      return (data && data.reply) ? data.reply : fallbackLine(userText);
    }catch(err){
      log('api error', err?.message || err);
      return fallbackLine(userText, true);
    }
  }

  function fallbackLine(userText, isError=false){
    if (isError) return "Connection snag—come closer and say that again, pretty thing.";
    // Tiny seasoning from phrase bank
    const tag = phraseBank.tags[man] || [];
    const gl = phraseBank.global;
    const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)];
    return `${pick(gl)} ${pick(tag) || ""}`.trim();
  }

  // Anti-repeat: if same as any of last N assistant lines, nudge variation
  function avoidRepeat(text){
    const last = lastNAIAssistant();
    for (const prev of last){
      if (semanticallySame(prev, text)){
        return text + " (mm—come closer.)";
      }
    }
    return text;
  }

  // Optional "you there?" nudge after 30s silence (not if user is typing)
  let silenceTimer = null;
  function scheduleNudge(){
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(()=>{
      if (document.activeElement === inputEl) return;
      addMessage('assistant', "You drifted, pretty thing—want me closer?");
    }, 30000);
  }

  // ---------- Wire up ----------
  function init(){
    applyBackground();
    ensureTrialStart();

    // Portrait label guard (if any rogue captions slipped into HTML)
    document.querySelectorAll('figcaption, .caption').forEach(el=>{
      el.style.display = 'none';
      el.style.height = '0px';
      el.setAttribute('aria-hidden','true');
    });

    // First impression opener (don’t spam if returning)
    if (!sessionStorage.getItem('bb_greeted_'+man)){
      const opener = openers[man]?.[Math.floor(Math.random()*openers[man].length)];
      if (opener) addMessage('assistant', opener);
      sessionStorage.setItem('bb_greeted_'+man, '1');
    }

    scheduleNudge();
  }

  async function onSend(){
    if (blockIfTrialExpired()) return;

    const text = (inputEl.value || '').trim();
    if (!text) return;

    addMessage('user', text);
    inputEl.value = '';
    scheduleNudge();

    if (isRED(text)){ redCheckIn(); return; }

    const reply = await callModel(text);
    const finalReply = avoidRepeat(reply);
    addMessage('assistant', finalReply);
  }

  // Buttons / enter submit
  sendBtn?.addEventListener('click', onSend);
  inputEl?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      onSend();
    }
  });

  // Expose tiny debug panel if ?debug=1
  if (DEBUG){
    window.bbDump = () => ({man, sub, history, trialMsLeft: msLeftInTrial(), logbuf});
    log('debug on');
  }

  // Kickoff
  init();
})();

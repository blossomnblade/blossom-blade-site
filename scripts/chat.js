/* Blossom & Blade — chat runtime (anti-repeat + persona fallback + Viper tune) */
(() => {
  'use strict';

  // ---------- URL state ----------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get('man') || '').toLowerCase();
  const urlMode = (qs.get('sub') || '').toLowerCase();

  const VALID = ['blade','dylan','alexander','silas','grayson','viper'];
  const pretty = {
    blade: 'Blade',
    dylan: 'Dylan',
    alexander: 'Alexander',
    silas: 'Silas',
    grayson: 'Grayson',
    viper: 'Viper'
  };

  // short, varied cadence for the very first line
  const firstLines = {
    blade: ["hey you.", "got a request, pretty thing?","you again? put that smile away before i steal it."],
    dylan: ["you came to see me? i won’t pretend i’m not pleased.", "you sound good in my helmet.","minimal words, maximal smirk. what’s the vibe?"],
    alexander: ["look who’s here.", "right on time. i like that.","tell me one small good thing from your day."],
    silas: ["hey you.", "mm, i hear that voice.","play me a word. i’ll answer in kind."],
    grayson: ["your move.", "careful what you wish for. i deliver.","state your want, clean and direct."],
    viper: ["look who’s here.", "make it quick or make it interesting.","mm. do you want chaos or control?"]
  };

  // ---------- DOM ----------
  const el = {
    title: document.getElementById('roomTitle'),
    list: document.getElementById('messages'),
    input: document.getElementById('chatInput'),
    send: document.getElementById('sendBtn'),
    composer: document.getElementById('composer'),
    portrait: document.getElementById('portraitImg'),
    portraitLabel: document.getElementById('portraitLabel'),
    tplUser: document.getElementById('tpl-user'),
    tplAI: document.getElementById('tpl-assistant'),
  };

  // Set title & portrait
  (function initHeader(){
    if (VALID.includes(man)) {
      document.title = `Blossom & Blade — ${pretty[man]}`;
      if (el.title) el.title.textContent = pretty[man];
    } else {
      document.title = "Blossom & Blade — Chat";
      if (el.title) el.title.textContent = "— pick a character";
    }
    setPortrait();
  })();

  function imgPathChat(m){ return `/images/characters/${m}/${m}-chat.webp`; }
  const FALLBACK_LOGO = "/images/logo.jpg";

  function setPortrait(){
    const img = el.portrait;
    if (!img) return;
    img.dataset.stage = "chat";
    img.alt = VALID.includes(man) ? `${pretty[man]} — portrait` : "portrait";
    img.src = VALID.includes(man) ? imgPathChat(man) : FALLBACK_LOGO;
    img.onerror = () => {
      // fallback once
      if (img.dataset.stage === "chat") {
        img.dataset.stage = "fallback";
        img.src = FALLBACK_LOGO;
      } else {
        img.onerror = null;
      }
    };
    if (el.portraitLabel) el.portraitLabel.textContent = VALID.includes(man) ? `${pretty[man]} — portrait` : "";
  }

  // ---------- Storage keys ----------
  const hKey = (m) => `bnb.${m}.history`;

  // ---------- helpers ----------
  function saveJson(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
  }
  function loadJson(key, fallback = []){
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : fallback;
    } catch(e){ return fallback; }
  }
  function scrollToBottom(){
    if (!el.list) return;
    // ensure new layout calculated then scroll
    requestAnimationFrame(() => {
      el.list.scrollTop = el.list.scrollHeight + 9999;
    });
  }

  function bubbleFromTemplate(role, text){
    const tpl = role === 'user' ? el.tplUser : el.tplAI;
    if (tpl && 'content' in tpl) {
      const frag = tpl.content.cloneNode(true);
      const node = frag.querySelector('[data-content]') || frag.firstElementChild;
      node.textContent = text;
      return frag;
    }
    // fallback DOM shape
    const wrap = document.createElement('div');
    wrap.className = role === 'user' ? 'msg user' : 'msg assistant';
    wrap.textContent = text;
    return wrap;
  }

  function addBubble(role, text){
    if (!el.list) return;
    const frag = bubbleFromTemplate(role, text);
    el.list.appendChild(frag);
    scrollToBottom();
  }

  // ---------- History ----------
  let history = loadJson(hKey(man), []);
  function trimHistory(max=50){
    if (history.length > max) history = history.slice(-max);
  }

  function renderAll(){
    if (!el.list) return;
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }

  // ---------- Persona fallback (SOFT) ----------
  const SOFT = {
    blade: [
      "Got a request, pretty thing?",
      "You again? Put that smile away before I steal it.",
      "Tell me what you want, rider."
    ],
    dylan: [
      "You sound good in my helmet.",
      "Minimal words, maximal smirk. What’s the vibe?",
      "Tell me what you want, rider."
    ],
    alexander: [
      "Right on time. I like that.",
      "Tell me one small good thing from your day.",
      "Specifics, kitten."
    ],
    silas: [
      "Play me a word; I’ll answer with a chord.",
      "Slow or sharp? Choose.",
      "Say the scene; I’ll score it."
    ],
    grayson: [
      "Your move.",
      "Careful what you wish for. I deliver.",
      "State your want, clean and direct."
    ],
    // Viper tuned: wild/chaotic charm, never rude
    viper: [
      "Trouble arrived—pick a rule for me to break.",
      "You like reckless? Good. Give me the dare.",
      "I’m a pretty problem. What flavor tonight?",
      "Two words—make it wild.",
      "Tell me the thrill; I’ll engineer the scene."
    ]
  };

  function softFallback(m, userText){
    const t = (userText || "").toLowerCase();
    const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)];
    // Special handling for Viper so he feels alive even if API is quiet
    if (m === "viper") {
      if (t.includes("bad day") || t.includes("tired")) {
        return pick([
          "Hand me the stress; I’ll ruin it for you. Two words.",
          "Rough day? I’ll take it apart—say how."
        ]);
      }
      if (t.includes("fun") || t.includes("play") || t.includes("crazy")) {
        return pick([
          "Give me the dare. Short and spicy.",
          "What rule do I break first? Say it."
        ]);
      }
      if (t.includes("hello") || t.includes("hey") || t.includes("hi")) {
        return pick([
          "Mm. New mischief or an old favorite?",
          "Smile—this is going to get loud."
        ]);
      }
      return pick(SOFT.viper);
    }
    const pool = SOFT[m] || ["Tell me more."];
    return pick(pool);
  }

  // vary repeated lines — pick a nearby variant from the SOFT pool
  function varyLine(m, reply){
    const pool = (SOFT[m] || []).filter(s => (s || "").toLowerCase() !== (reply || "").toLowerCase());
    if (!pool.length) return reply;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  // ---------- Send / handler ----------
  if (el.send) el.send.addEventListener('click', onSend);
  if (el.input) el.input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  });

  async function onSend(e){
    e && e.preventDefault();
    if (!VALID.includes(man)) return;

    const text = (el.input?.value || "").trim();
    if (!text) return;

    // append user bubble
    history.push({ role: "user", content: text, t: Date.now() });
    addBubble("user", text);
    el.input.value = "";
    trimHistory();
    saveJson(hKey(man), history);

    // ask the assistant (uses askAssistant from below)
    let reply = "";
    try {
      reply = await askAssistant(text);
    } catch (err) {
      console.error("askAssistant failed:", err);
      reply = "";
    }

    // If nothing came back, use persona fallback but don't spam duplicates
    if (!reply) {
      reply = softFallback(man, text);
    }

    // Anti-repeat: if same as last assistant line, swap to a variant
    const norm = s => (s||"").toLowerCase().replace(/[\s\p{P}]+/gu, "").trim();
    const lastA = [...history].reverse().find(m => m.role === "assistant")?.content || "";
    if (norm(reply) === norm(lastA)) reply = varyLine(man, reply);

    // append assistant ONCE
    history.push({ role: "assistant", content: reply, t: Date.now() });
    trimHistory();
    saveJson(hKey(man), history);
    addBubble("assistant", reply);
  }

  // ---------- API call (with demo fallback) ----------
  const DEMO_MODE = false; // set true if you want only local soft lines

  async function askAssistant(userText){
    // demo: return a soft line instead of hitting the API
    if (DEMO_MODE) {
      const pool = SOFT[man] || ["Tell me more."];
      return pool[Math.floor(Math.random()*pool.length)];
    }

    // Real call
    try {
      const body = {
        man,
        userText,
        history: history.slice(-20), // keep it light
        mode: "soft"
      };
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const reply = (j && j.reply) ? String(j.reply) : "";
      return reply;
    } catch (err) {
      console.error("chat send failed:", err);
      // Use a persona-aware fallback rather than showing an error bubble
      return softFallback(man, userText);
    }
  }

  // ---------- First visit assistant line ----------
  (function boot(){
    if (!VALID.includes(man)) return;
    // if no history for this character, greet once
    if (history.length === 0) {
      const pool = firstLines[man] || ["hey you."];
      const first = pool[Math.floor(Math.random()*pool.length)];
      history.push({ role: "assistant", content: first, t: Date.now() });
      saveJson(hKey(man), history);
    }
    renderAll();
  })();

})();

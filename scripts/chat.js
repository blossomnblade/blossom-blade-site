/* Blossom & Blade — Chat runtime (fixed portrait + robust replies + anti-repeat) */
(() => {
  // ---------- URL & State ----------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const urlMode = (qs.get("mode") || "").toLowerCase();

  const VALID = ["blade","dylan","alexander","silas","grayson","viper"];
  const pretty = {
    blade:"Blade", dylan:"Dylan", alexander:"Alexander",
    silas:"Silas", grayson:"Grayson", viper:"Viper"
  };

  // First-visit openers (short, varied cadence)
  const FIRST_LINES = [
    "hey you.",
    "look who’s here.",
    "you came to see me? i won’t pretend i’m not pleased."
  ];

  // Gentle, safe “soft” lines used for fallbacks / demo
  const SOFT = {
    blade: [
      "Got a request, pretty thing?",
      "Careful what you wish for. I deliver.",
      "Tell me what you want. I’ll make it feel inevitable."
    ],
    dylan: [
      "Minimal words, maximal smirk. What’s the vibe?",
      "You sound good in my helmet.",
      "Tell me what you want, rider."
    ],
    alexander: [
      "Right on time. I like that.",
      "Ask for what you want, kitten.",
      "Tell me one small good thing from your day."
    ],
    grayson: [
      "Your move.",
      "Careful what you wish for. I deliver.",
      "Be clear. I follow precision."
    ],
    silas: [
      "hey you.",
      "Tell me what you want to hear and I’ll tune to it.",
      "Closer? Say the word."
    ],
    viper: [
      "look who’s here.",
      "Make it quick or make it interesting.",
      "Tell me exactly what you want."
    ]
  };

  // ---------- DOM ----------
  const el = {
    title: document.getElementById("roomTitle"),
    list: document.getElementById("messages"),
    input: document.getElementById("chatInput"),
    send: document.getElementById("sendBtn"),
    form: document.getElementById("composer"),
    portrait: document.getElementById("portraitImg"),
    portraitLabel: document.getElementById("portraitLabel"),
    slowBadge: document.getElementById("slowBadge"),
  };

  // ---------- Keys / Storage ----------
  const uidKey = "bnb.userId";
  const hKey  = m => `bnb.${m}.history`;
  const sKey  = m => `bnb.${m}.summary`;
  const pKey  = m => `bnb.${m}.profile`;

  function loadJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }
  function saveJson(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  // Keep it light: we only retain the last 40 messages in local cache
  function trimHistory(){
    if (!VALID.includes(man)) return;
    if (history.length > 40) history = history.slice(-40);
  }

  // ---------- Title & Portrait ----------
  if (VALID.includes(man)){
    document.title = `Blossom & Blade — ${pretty[man]}`;
    el.title.textContent = `${pretty[man]}`;
  } else {
    document.title = "Blossom & Blade — Chat";
    el.title.textContent = "— pick a character";
  }

  const FALLBACK_LOGO = "/images/logo.jpg";
  (function setPortrait(){
    const img = el.portrait;
    if (!img) return;
    img.dataset.stage = "chat";
    if (el.portraitLabel) el.portraitLabel.textContent = VALID.includes(man) ? `${pretty[man]} — portrait` : "";
    img.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    img.src = VALID.includes(man) ? `/images/characters/${man}/${man}-chat.webp` : FALLBACK_LOGO;
    img.onerror = () => { img.onerror = null; img.src = FALLBACK_LOGO; };
  })();

  // ---------- History boot ----------
  let history = loadJson(hKey(man), []);
  function renderAll(){
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }

  // ---------- Bubble ----------
  function addBubble(role, text){
    if (!text) return;
    const li = document.createElement("li");
    li.className = role === "assistant" ? "bubble assistant" : "bubble user";
    li.dataset.role = role;
    li.textContent = text;
    el.list.appendChild(li);
    // auto-scroll
    el.list.parentElement?.scrollTo({ top: el.list.parentElement.scrollHeight, behavior: "smooth" });
  }

  // ---------- Helpers ----------
  const norm = s => (s || "").toLowerCase().replace(/[^\w\s]/g,"").trim();
  function varyLine(man, line){
    // simple variants to dodge repetition
    const map = {
      "your move.": ["Your turn.", "Go on."],
      "right on time. i like that.": ["Punctual. I like that.", "On time—good."],
      "careful what you wish for. i deliver.": ["Be certain. I deliver.", "Ask precisely. I deliver."],
      "ask for what you want, kitten.": ["Say it plainly, kitten.", "Tell me what you want, kitten."],
      "minimal words, maximal smirk. what’s the vibe?": ["Keep it tight—what’s the vibe?", "Few words. Give me the vibe."]
    };
    const key = norm(line);
    const pool = map[key] || [];
    if (!pool.length) return line;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function softFallback(man, userText){
    const text = (userText || "").toLowerCase();
    const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)];
    // small “topic” nudges
    if (text.includes("bad day") || text.includes("tired")){
      return pick([
        "Come here. Tell me one good thing and I’ll add another.",
        "Rough day? I’ll take the edge off—say how."
      ]);
    }
    if (text.includes("fun") || text.includes("play")){
      return pick([
        "What kind of fun? Be specific.",
        "Fun has rules. Name yours."
      ]);
    }
    // default to character pool
    const pool = SOFT[man] || ["Tell me more."];
    return pick(pool);
  }

  // ---------- First visit line ----------
  if (VALID.includes(man) && history.length === 0){
    const first = FIRST_LINES[Math.floor(Math.random()*FIRST_LINES.length)];
    history.push({ role:"assistant", content:first, t: Date.now() });
    saveJson(hKey(man), history);
  }

  renderAll();

  // ---------- Form handling ----------
  if (el.form){
    el.form.addEventListener("submit", onSend);
    el.send.addEventListener("click", (e)=> el.form.requestSubmit());
  }

  // ---------- SEND ----------
  async function onSend(e){
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // append user
    history.push({ role:"user", content:text, t: Date.now() });
    trimHistory();
    saveJson(hKey(man), history);
    addBubble("user", text);
    el.input.value = "";

    // ask assistant
    let reply = "";
    try {
      reply = await askAssistant(text);
    } catch (err){
      console.error("askAssistant failed:", err);
      reply = "";
    }

    // Fallback when empty (no more silent drops)
    if (!reply) {
      reply = softFallback(man, text);
    }

    // anti-repeat: if same as last assistant line, vary it
    const lastA = [...history].reverse().find(m => m.role === "assistant")?.content || "";
    if (norm(reply) === norm(lastA)) reply = varyLine(man, reply);

    // append assistant ONCE
    history.push({ role:"assistant", content:reply, t: Date.now() });
    trimHistory();
    saveJson(hKey(man), history);
    addBubble("assistant", reply);
  }

  // ---------- API call ----------
  async function askAssistant(userText){
    // Real call with compact history
    const body = {
      man,
      userText,
      history: history.slice(-20), // keep it light
      mode: "soft"
    };

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(body)
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const reply = (j && j.reply) ? String(j.reply) : "";
      return reply;
    } catch (err) {
      // swallow error; caller will fallback
      console.error("chat send failed:", err);
      return "";
    }
  }
})();

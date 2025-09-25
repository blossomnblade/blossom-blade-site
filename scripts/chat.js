/* Blossom & Blade — chat runtime
   (layout assumes portrait left, chat right; bubbles auto-scroll; per-character history)
*/
(() => {
  // ---------- URL / character ----------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const VALID = ["blade", "dylan", "alexander", "silas", "grayson", "viper"];
  const pretty = { blade:"Blade", dylan:"Dylan", alexander:"Alexander", silas:"Silas", grayson:"Grayson", viper:"Viper" };

  // If unknown, show generic title and bail gracefully
  document.title = "Blossom & Blade — " + (pretty[man] || "Chat");
  const roomTitle = document.getElementById("roomTitle");
  if (roomTitle) roomTitle.textContent = pretty[man] ? `— ${pretty[man]}` : "— Chat";

  // ---------- DOM ----------
  const el = {
    list: document.getElementById("messages"),
    input: document.getElementById("chatInput"),
    send: document.getElementById("sendBtn"),
    form: document.getElementById("composer"),
    portrait: document.getElementById("portraitImg"),
    portraitLabel: document.getElementById("portraitLabel"),
  };

  // ---------- Portrait (left) ----------
  function imgPathChat(m){ return `/images/characters/${m}/${m}-chat.webp`; }
  (function setPortrait(){
    if (!el.portrait) return;
    el.portrait.dataset.stage = "chat";
    el.portrait.alt = VALID.includes(man) ? `${pretty[man]} — portrait` : "portrait";
    el.portrait.src = VALID.includes(man) ? imgPathChat(man) : "/images/logo.jpg";
    el.portrait.onerror = () => { el.portrait.src = "/images/logo.jpg"; el.portrait.onerror = null; };
    if (el.portraitLabel) el.portraitLabel.textContent = VALID.includes(man) ? `${pretty[man]} — portrait` : "portrait";
  })();

  // ---------- Storage ----------
  const hKey = m => `bnb.${m}.history`;
  const loadJson = (k, d=[]) => {
    try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; }
  };
  const saveJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // Keep history small (request cost + repetition)
  const MAX_HISTORY = 40;
  let history = VALID.includes(man) ? loadJson(hKey(man), []) : [];

  function trimHistory(){
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
  }

  // ---------- Utility ----------
  function mkBubble(role, text){
    // Use templates if present; fall back to building nodes
    const tpl = document.getElementById(`tpl-${role}`);
    let li;
    if (tpl && "content" in tpl) {
      li = tpl.content.firstElementChild.cloneNode(true);
      const node = li.querySelector(".bubble") || li;
      node.textContent = text;
    } else {
      li = document.createElement("li");
      li.className = `msg ${role}`;
      const b = document.createElement("div");
      b.className = "bubble";
      b.textContent = text;
      li.appendChild(b);
    }
    return li;
  }

  function addBubble(role, text){
    if (!el.list || !text) return;
    const node = mkBubble(role, text);
    el.list.appendChild(node);
    // auto-scroll
    el.list.scrollTop = el.list.scrollHeight;
  }

  function renderAll(){
    if (!el.list) return;
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }

  // ---------- First visit greeting ----------
  const firstLines = {
    blade: [
      "hey you.",
      "Got a request, pretty thing?",
      "You again? Put that smile away before I steal it."
    ],
    dylan: [
      "you came to see me? i won’t pretend i’m not pleased.",
      "You sound good in my helmet.",
      "Minimal words, maximal smirk. What’s the vibe?"
    ],
    alexander: [
      "look who’s here.",
      "Right on time. I like that.",
      "Ask for what you want, kitten."
    ],
    silas: [
      "hey you.",
      "Your timing’s a little sinful. I approve.",
      "Play me a line—I’ll play one back."
    ],
    grayson: [
      "look who’s here.",
      "Your move.",
      "Careful what you wish for. I deliver."
    ],
    viper: [
      "look who’s here.",
      "I notice everything. Including you.",
      "Say it clean or say it dirty—just say it."
    ]
  };

  if (VALID.includes(man) && history.length === 0){
    const pool = firstLines[man] || ["hey you."];
    const first = pool[Math.floor(Math.random() * pool.length)];
    history.push({ role:"assistant", content:first, t: Date.now() });
    saveJson(hKey(man), history);
  }

  renderAll();

  // ---------- Heuristics / filters ----------
  const BANNED = /\b(?:rape|incest|bestiality|minors?|teen|scat)\b/i;

  // tiny variant switcher to avoid exact repeat
  const VARIANTS = {
    "right on time. i like that.": [
      "Right on time. I like that.",
      "On the dot—nice.",
      "Punctual looks good on you."
    ],
    "got a request, pretty thing?": [
      "Got a request, pretty thing?",
      "Tell me what you want.",
      "Name it, and I’ll make it ours."
    ],
    "you again? put that smile away before i steal it.": [
      "You again? Put that smile away before I steal it.",
      "There’s that smile. Mine now.",
      "Keep smiling—I dare you."
    ],
    "your move.": [
      "Your move.",
      "Ball’s in your court.",
      "Say it, and I’ll answer."
    ]
  };

  function normLine(s){ return (s || "").toLowerCase().replace(/[^\w\s]/g,"").trim(); }
  function varyLine(line){
    const key = normLine(line);
    const bank = VARIANTS[key];
    if (!bank || !bank.length) return line;
    return bank[Math.floor(Math.random() * bank.length)];
  }

  // ---------- Send flow ----------
  async function onSend(e){
    e?.preventDefault?.();
    const text = (el.input?.value || "").trim();
    if (!text) return;

    // taboo guard
    if (BANNED.test(text)){
      const guard = "I can’t do that. I’ll keep you safe and stay within the lines, okay?";
      history.push({ role:"assistant", content:guard, t: Date.now() });
      trimHistory(); saveJson(hKey(man), history); renderAll();
      if (el.input) el.input.value = "";
      return;
    }

    // append user
    history.push({ role:"user", content:text, t: Date.now() });
    trimHistory(); saveJson(hKey(man), history); addBubble("user", text);
    if (el.input) el.input.value = "";

    // ask assistant
    let reply = "";
    try {
      reply = await askAssistant(text);
    } catch (err) {
      console.error("askAssistant failed:", err);
      reply = ""; // no fallback bubble; keeps convo clean
    }
    if (!reply) return;

    // anti-repeat: if same as last assistant, swap to a variant
    const lastA = [...history].reverse().find(m => m.role === "assistant")?.content || "";
    if (normLine(reply) === normLine(lastA)) reply = varyLine(reply);

    // append assistant ONCE
    history.push({ role:"assistant", content:reply, t: Date.now() });
    trimHistory(); saveJson(hKey(man), history); addBubble("assistant", reply);
  }

  // wire events
  if (el.form) el.form.addEventListener("submit", onSend);
  if (el.send) el.send.addEventListener("click", () => el.form?.requestSubmit());

  // ---------- API call (no demo, no hiccup) ----------
  async function askAssistant(userText){
    // Real call to your API
    const body = {
      man,
      userText,
      history: history.slice(-20), // keep it light
      mode: "soft",
    };

    const r = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return (j && j.reply) ? String(j.reply) : "";
  }
})();

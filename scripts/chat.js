/* Blossom & Blade — Chat (no trials, no redirects, robust fallback) */
(() => {
  // ---------- URL state ----------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const urlMode = (qs.get("sub") || "").toLowerCase();

  const VALID = ["blade", "dylan", "alexander", "silas", "grayson", "viper"];
  const pretty = { blade:"Blade", dylan:"Dylan", alexander:"Alexander", silas:"Silas", grayson:"Grayson", viper:"Viper" };
  const firstLines = [
    "hey you.",
    "look who’s here.",
    "aww, you came to see me."
  ];

  // ---------- DOM ----------
  const el = {
    title: document.getElementById("roomTitle"),
    portrait: document.getElementById("portraitImg"),
    portraitLabel: document.getElementById("portraitLabel"),
    list: document.getElementById("messages"),
    input: document.getElementById("chatInput"),
    form: document.getElementById("composer"),
  };

  // ---------- Storage helpers ----------
  const uidKey = "bnb.userId";
  const hKey   = (m) => `bnb.${m}.history`;

  const loadJson = (k, d=[]) => {
    try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; }
  };
  const saveJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const trimHistory = () => { if (history.length > 40) history.splice(0, history.length-40); };

  // user id (anonymous)
  let userId = localStorage.getItem(uidKey);
  if (!userId) { userId = Math.random().toString(36).slice(2); localStorage.setItem(uidKey, userId); }

  // ---------- Portrait ----------
  const FALLBACK_LOGO = "/images/logo.jpg";
  const imgPathChat = (m) => `/images/characters/${m}/${m}-chat.webp`;

  function setPortrait(){
    if (!VALID.includes(man)) {
      el.title.textContent = "Blossom & Blade —";
      el.portrait.src = FALLBACK_LOGO;
      el.portraitLabel.textContent = "";
      return;
    }
    el.title.textContent = pretty[man];
    el.portrait.alt = `${pretty[man]} portrait`;
    el.portrait.src = imgPathChat(man);
    el.portrait.onerror = () => { el.portrait.src = FALLBACK_LOGO; el.portrait.onerror = null; };
    el.portraitLabel.textContent = `${pretty[man]} — portrait`;
  }

  // ---------- UI helpers ----------
  function addBubble(role, text){
    const li = document.createElement("li");
    li.className = `msg ${role}`;
    li.textContent = text;
    el.list.appendChild(li);
    // autoscroll
    el.list.scrollTop = el.list.scrollHeight;
  }
  function renderAll(){
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }

  // ---------- Boot ----------
  let history = loadJson(hKey(man), []);
  setPortrait();

  if (VALID.includes(man)){
    if (history.length === 0){
      const first = firstLines[Math.floor(Math.random()*firstLines.length)];
      history.push({role:"assistant", content:first, t:Date.now()});
      saveJson(hKey(man), history);
    }
    renderAll();
  } else {
    // invalid/blank man -> show logo, but still allow chat UI
    el.list.innerHTML = "";
  }

  // ---------- Send / reply ----------
  async function onSend(e){
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // user bubble
    history.push({ role:"user", content:text, t:Date.now() });
    saveJson(hKey(man), history);
    addBubble("user", text);
    el.input.value = "";

    // build payload
    const body = {
      man,
      userId,
      history,
      mode: urlMode || "soft",
      memory: {}, // (kept simple; hook yours here if needed)
      pov: "you",
      consented: true
    };

    // talk to API; always show *something* back
    let reply = "";
    try {
      const r = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      reply = (j && j.reply) ? String(j.reply) : "";
    } catch (err){
      reply = "";
    }
    if (!reply.trim()){
      reply = "Lost you for a sec—say that again, love.";
    }

    history.push({ role:"assistant", content:reply, t:Date.now() });
    trimHistory();
    saveJson(hKey(man), history);
    addBubble("assistant", reply);
  }

  el.form.addEventListener("submit", onSend);
})();

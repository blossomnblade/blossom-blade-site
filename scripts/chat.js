/* Blossom & Blade — chat runtime (consent-aware + RED safeword + assert nudge + POV switch + robust portrait fallback + desire triggers) */

(() => {
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const urlMode = (qs.get("mode") || "").toLowerCase();

  // Consent & slow state
  const rx = (localStorage.getItem("bnb.consent") === "1"); // paid/green box
  const slowKey = (m) => `bnb.${m}.slow`;
  let slow = loadJson(slowKey(man), "off"); // "red"|"off"

  const el = {
    title: document.getElementById("roomTitle"),
    list: document.getElementById("messages"),
    input: document.getElementById("chatInput"),
    send: document.getElementById("sendBtn"),
    form: document.getElementById("composer"),
    portrait: document.getElementById("portraitImg"),
    portraitLabel: document.getElementById("portraitLabel"),
    tplUser: document.getElementById("tpl-user"),
    tplAi: document.getElementById("tpl-assistant"),
    slowBadge: document.getElementById("slowBadge"),
  };

  const VALID = ["blade","dylan","jesse","alexander","silas","grayson"];
  const pretty = { blade:"Blade", dylan:"Dylan", jesse:"Jesse", alexander:"Alexander", silas:"Silas", grayson:"Grayson" };
  const firstLines = ["hey you.","look who’s here.","aww, you came to see me."];

  const banned = /\b(rape|incest|bestiality|traffick|minor|teen|scat)\b/i;

  // Title + portrait
  if (VALID.includes(man)){
    document.title = `Blossom & Blade — ${pretty[man]}`;
    document.getElementById("roomTitle").textContent = `— ${pretty[man]}`;
  } else {
    document.title = "Blossom & Blade — Chat";
    document.getElementById("roomTitle").textContent = "— pick a character";
  }
  const FALLBACK_LOGO = "/images/logo.jpg";
  function imgPathChat(m){ return `/images/characters/${m}/${m}-chat.webp`; }
  function imgPathCard(m){ return `/images/characters/${m}/${m}-card-on.webp`; }
  (function setPortrait(){
    const img = document.getElementById("portraitImg");
    if (!img) return;
    img.dataset.stage = "chat";
    img.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    document.getElementById("portraitLabel").textContent = VALID.includes(man) ? `${pretty[man]} portrait` : "";
    img.src = VALID.includes(man) ? imgPathChat(man) : FALLBACK_LOGO;
    img.onerror = () => {
      switch (img.dataset.stage) {
        case "chat": img.dataset.stage = "card"; img.src = imgPathCard(man); break;
        case "card": img.dataset.stage = "logo"; img.src = FALLBACK_LOGO; break;
        default: img.onerror = null;
      }
    };
  })();

  // Storage keys
  const uidKey = "bnb.userId";
  const hKey = (m) => `bnb.${m}.m`;
  const sKey = (m) => `bnb.${m}.summary`;
  const pKey = (m) => `bnb.${m}.profile`;
  const povKey = (m) => `bnb.${m}.pov`; // 'first'
  function getOrCreateUserId(){
    let id = localStorage.getItem(uidKey);
    if (!id){
      id = crypto?.randomUUID?.() || "u_" + Math.random().toString(36).slice(2) + Date.now();
      try{ localStorage.setItem(uidKey, id); }catch{}
    }
    return id;
  }
  const userId = getOrCreateUserId();

  const MAX_TURNS = 400;
  const WINDOW_FOR_PROMPT = 28;
  const AUTOSUMMARY_EVERY = 25;

  // Memory/history
  const history = loadJson(hKey(man), []);
  let summary = loadJson(sKey(man), "");
  let profile = loadJson(pKey(man), {});
  let pov = loadJson(povKey(man), "");

  function loadJson(k, fallback){
    try{ const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; }
  }
  function saveJson(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
  function trimHistory(){ if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS); }

  // Render
  function addBubble(role, text){
    const tpl = role === "user" ? document.getElementById("tpl-user") : document.getElementById("tpl-assistant");
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.textContent = text;
    el.list.appendChild(node);
    el.list.scrollTop = el.list.scrollHeight;
  }
  function renderAll(){
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }

  if (VALID.includes(man) && history.length === 0){
    const first = firstLines[Math.floor(Math.random()*firstLines.length)];
    history.push({role:"assistant", content:first, t:Date.now()});
    saveJson(hKey(man), history);
    addBubble("assistant", first);
  } else {
    renderAll();
  }

  // Heuristics
  const LEAD_REGEX = /\b(take|lead|command|control|dominat|own me|use me|make me|tell me what to do|tie me|cuffs?|mask(ed)?|kneel|yes sir|spank)\b/i;
  const ROLEPLAY_ACCEPT = /\b(let'?s (do|try) (it|that|this|roleplay)|let'?s roleplay|i (do|will)|ok(ay)?( then)?|yes(,? please)?|i want that|do it)\b/i;
  const RED_ONLY = /^\s*red[.!?]*\s*$/i;
  const KISS_REGEX = /\b(kiss|lips?|mouth|taste|kiss me|want your lips|your lips on|press your (mouth|lips)|i want to feel your lips)\b/i;

  if (el.slowBadge) el.slowBadge.hidden = (slow !== "red");

  el.form.addEventListener("submit", onSend);

  async function onSend(e){
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // Safeword
    if (RED_ONLY.test(text)) {
      pushAndRender("user", text);
      slow = "red"; saveJson(slowKey(man), slow);
      if (el.slowBadge) el.slowBadge.hidden = false;
      pushAndRender("assistant", "Got you. Slowing it down—safe with me.");
      el.input.value = ""; return;
    }

    // Taboo block
    if (banned.test(text)){
      pushAndRender("user", text);
      pushAndRender("assistant", "I won’t roleplay taboo or non-consensual themes. Let’s keep it adult and mutual—what vibe do you want instead?");
      el.input.value = ""; return;
    }

    // POV lock-in
    if (ROLEPLAY_ACCEPT.test(text) || KISS_REGEX.test(text)) { pov = "first"; saveJson(povKey(man), pov); }

    // Auto-resume if she escalates while RED was active
    let assert = false;
    if (LEAD_REGEX.test(text) || KISS_REGEX.test(text)){
      assert = true;
      if (slow === "red"){ slow = "off"; saveJson(slowKey(man), slow); if (el.slowBadge) el.slowBadge.hidden = true; }
    }

    pushAndRender("user", text);
    el.input.value = "";

    try{
      if (history.length % AUTOSUMMARY_EVERY === 0 && history.length >= WINDOW_FOR_PROMPT + 8){
        await doAutosummary();
        summary = loadJson(sKey(man), "");
        profile = loadJson(pKey(man), {});
      }

      const activeMode = urlMode === "soft" ? "soft" : (slow === "red" ? "soft" : (rx ? "rx" : "soft"));
      const recent = history.slice(-WINDOW_FOR_PROMPT);
      const memory = { summary: typeof summary === "string" ? summary : (summary?.text || ""), profile };

      let topic = (text.match(/\b(cuffs?|mask|rope|kneel|spank)\b/i) || [])[0] || "";
      if (KISS_REGEX.test(text)) topic = "kiss";

      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          man,
          userId,
          mode: activeMode,
          history: recent,
          memory,
          nudge:{
            lead: assert, assert, topic,
            pov: (pov === "first" ? "first" : undefined),
            consented: rx
          }
        })
      });

      const data = await res.json();
      let reply = sanitizeReply(data.reply || "");

      if (window.BnBBrain) reply = window.BnBBrain.postProcess(man, reply);

      pushAndRender("assistant", reply);
    }catch(err){
      console.error(err);
      pushAndRender("assistant", "Network hiccup. One line—then I’ll lead.");
    }
  }

  function pushAndRender(role, content){
    history.push({role, content, t:Date.now()});
    trimHistory();
    saveJson(hKey(man), history);
    addBubble(role, content);
  }

  async function doAutosummary(){
    try{
      const resp = await fetch("/api/brain", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          man, userId,
          recent: history.slice(-(WINDOW_FOR_PROMPT + 40)),
          previousSummary: (typeof summary === "string" ? summary : summary?.text || ""),
          previousProfile: profile
        })
      });
      const data = await resp.json();
      if (data?.summary) localStorage.setItem(sKey(man), JSON.stringify(data.summary));
      if (data?.profile) localStorage.setItem(pKey(man), JSON.stringify(data.profile));
    }catch(e){ console.warn("Autosummary failed", e); }
  }

  function sanitizeReply(t){
    t = String(t || "");
    t = t.replace(/\[(?:[^\[\]]{0,120})\]/g, "").replace(/\*([^*]{0,120})\*/g, "$1");
    const lines = t.split("\n").map(s => s.trim()).filter(Boolean).slice(0,3);
    return lines.join("\n").trim();
  }
})();

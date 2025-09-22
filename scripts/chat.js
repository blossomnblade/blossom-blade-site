/* Blossom & Blade — chat runtime (long-memory + persona stock-line blend)
   - Keeps previous long-memory behavior (userId, rolling summary/profile, banned words).
   - Reads ?man=&sub=&mode= (mode: "soft" or "rx").
   - Calls /api/chat with recent turns + memory.
   - Lightly blends in persona stock lines from BnBBrain (~18% chance).
   - Silas Yorkshire pass post-processing.
*/

(() => {
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const sub = (qs.get("sub") || "day").toLowerCase();
  const mode = (qs.get("mode") || "soft").toLowerCase(); // future: link to consent.js

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
  };

  const VALID = ["blade","dylan","jesse","alexander","silas","grayson"];
  const pretty = { blade:"Blade", dylan:"Dylan", jesse:"Jesse", alexander:"Alexander", silas:"Silas", grayson:"Grayson" };
  const firstLines = ["hey you.","look who’s here.","aww, you came to see me."];

  // Disallowed themes (hard refuse)
  const banned = /\b(rape|incest|bestiality|traffick|minor|teen|scat)\b/i;

  // Set title
  if (!VALID.includes(man)) {
    document.title = "Blossom & Blade — Chat";
    el.title.textContent = "— pick a character";
  } else {
    document.title = `Blossom & Blade — ${pretty[man]}`;
    el.title.textContent = `— ${pretty[man]}`;
  }

  // Portrait handling
  const placeholder = "/images/placeholder.webp";
  function resolvePortrait(m){ return `/images/characters/${m}/${m}-chat.webp`; }
  function setPortrait(){
    const src = VALID.includes(man) ? resolvePortrait(man) : placeholder;
    el.portrait.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    el.portraitLabel.textContent = VALID.includes(man) ? `${pretty[man]} portrait` : "";
    el.portrait.src = src;
    el.portrait.onerror = () => { el.portrait.src = placeholder; };
  }
  setPortrait();

  // Storage keys
  const uidKey = "bnb.userId";
  const userId = getOrCreateUserId();
  const hKey = (m) => `bnb.${m}.m`;
  const sKey = (m) => `bnb.${m}.summary`;
  const pKey = (m) => `bnb.${m}.profile`;
  const MAX_TURNS = 400;
  const WINDOW_FOR_PROMPT = 28;
  const AUTOSUMMARY_EVERY = 25;

  function getOrCreateUserId(){
    let id = localStorage.getItem(uidKey);
    if (!id){
      id = crypto?.randomUUID?.() || "u_" + Math.random().toString(36).slice(2) + Date.now();
      try{ localStorage.setItem(uidKey, id); }catch{}
    }
    return id;
  }

  // Load memory/history
  const history = loadJson(hKey(man), []);
  let summary = loadJson(sKey(man), "");
  let profile = loadJson(pKey(man), {});

  function loadJson(k, fallback){
    try{ const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; }
  }
  function saveJson(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
  function trimHistory(){ if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS); }

  // Render helpers
  function addBubble(role, text){
    const tpl = role === "user" ? el.tplUser : el.tplAi;
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.textContent = text;
    el.list.appendChild(node);
    el.list.scrollTop = el.list.scrollHeight;
  }
  function renderAll(){
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }

  // Seed first line
  if (VALID.includes(man) && history.length === 0){
    const first = firstLines[Math.floor(Math.random()*firstLines.length)];
    history.push({role:"assistant", content:first, t:Date.now()});
    saveJson(hKey(man), history);
    addBubble("assistant", first);
  } else {
    renderAll();
  }

  // Composer
  el.form.addEventListener("submit", onSend);

  async function onSend(e){
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    if (banned.test(text)){
      const safe = "I won’t roleplay non-consensual or taboo themes. Let’s keep it adult, safe, and mutual—what vibe do you want instead?";
      pushAndRender("user", text);
      pushAndRender("assistant", safe);
      el.input.value = "";
      return;
    }

    pushAndRender("user", text);
    el.input.value = "";

    try{
      if (history.length % AUTOSUMMARY_EVERY === 0 && history.length >= WINDOW_FOR_PROMPT + 8){
        await doAutosummary();
        // refresh memory from storage
        summary = loadJson(sKey(man), "");
        profile = loadJson(pKey(man), {});
      }

      const recent = history.slice(-WINDOW_FOR_PROMPT);
      const memory = {
        summary: typeof summary === "string" ? summary : (summary?.text || ""),
        profile
      };

      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ man, userId, mode, history: recent, memory })
      });

      const data = await res.json();
      let reply = sanitizeReply(data.reply || "");

      // Light blend: ~18% chance to insert a stock persona line.
      if (window.BnBBrain && Math.random() < 0.18){
        const recentUsed = history.slice(-8).filter(m => m.role === "assistant").map(m => m.content);
        const stock = window.BnBBrain.getStockLine(man, { mode, lastUser: text, recentUsed });
        if (stock){
          // 50/50: prepend or append; keep ≤3 lines total
          const joiner = Math.random() < 0.5 ? `${stock}\n${reply}` : `${reply}\n${stock}`;
          reply = sanitizeReply(joiner);
        }
      }

      // Silas accent pass
      if (window.BnBBrain) reply = window.BnBBrain.postProcess(man, reply);

      pushAndRender("assistant", reply);
    }catch(err){
      console.error(err);
      // Fallback: persona line so she still gets a response
      let fallback = "Network hiccup. Say that again and I’ll catch it.";
      if (window.BnBBrain){
        fallback = window.BnBBrain.getStockLine(man, { mode }) || fallback;
      }
      pushAndRender("assistant", fallback);
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
      if (data?.summary) saveJson(sKey(man), data.summary);
      if (data?.profile) saveJson(pKey(man), data.profile);
    }catch(e){ console.warn("Autosummary failed", e); }
  }

  function sanitizeReply(t){
    t = String(t || "");
    t = t.replace(/\[(?:[^\[\]]{0,120})\]/g, "").replace(/\*([^*]{0,120})\*/g, "$1");
    const lines = t.split("\n").map(s => s.trim()).filter(Boolean).slice(0,3);
    return lines.join("\n").trim();
  }

  // QoL
  setTimeout(() => { el.input?.focus?.(); }, 60);
})();

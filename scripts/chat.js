/* Blossom & Blade — chat runtime (long-memory edition)
   - Reads ?man=&sub=
   - Stable userId (per browser) so we can attribute memories
   - Local long memory: profile + rolling summary + last turns
   - Periodic autosummary via /api/brain
   - Sends to /api/chat { man, history, mode, memory, userId }
   - Strict portrait mapping with fallback
*/

(() => {
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const sub = (qs.get("sub") || "day").toLowerCase();

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

  // Valid roster
  const VALID = ["blade","dylan","jesse","alexander","silas","grayson"];
  const pretty = { blade:"Blade", dylan:"Dylan", jesse:"Jesse", alexander:"Alexander", silas:"Silas", grayson:"Grayson" };

  // First lines
  const firstLines = ["hey you.","look who’s here.","aww, you came to see me."];

  // Disallowed themes (hard refuse)
  const banned = /\b(rape|incest|bestiality|traffick|minor|teen|scat)\b/i;

  // Storage helpers
  const uidKey = "bnb.userId";
  const userId = getOrCreateUserId();
  const hKey = (m) => `bnb.${m}.m`;           // raw turns
  const sKey = (m) => `bnb.${m}.summary`;     // rolling summary text
  const pKey = (m) => `bnb.${m}.profile`;     // structured profile (prefs, facts)
  const MAX_TURNS = 400;                      // keep a long trail
  const WINDOW_FOR_PROMPT = 28;               // last N sent to model; rest summarized
  const AUTOSUMMARY_EVERY = 25;               // summarize cadence

  function getOrCreateUserId(){
    let id = localStorage.getItem(uidKey);
    if (!id){
      id = crypto?.randomUUID?.() || "u_" + Math.random().toString(36).slice(2) + Date.now();
      try{ localStorage.setItem(uidKey, id); }catch{}
    }
    return id;
  }

  // UI chrome
  if (!VALID.includes(man)) {
    document.title = "Blossom & Blade — Chat";
    el.title.textContent = "— pick a character";
  } else {
    document.title = `Blossom & Blade — ${pretty[man]}`;
    el.title.textContent = `— ${pretty[man]}`;
  }

  // Portrait mapping
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

  // Load memory + history
  const history = loadJson(hKey(man), []);
  const summary = loadJson(sKey(man), ""); // may be string or object; normalize to string
  const profile = loadJson(pKey(man), {});

  function loadJson(k, fallback){
    try{
      const raw = localStorage.getItem(k);
      if (raw == null) return fallback;
      const val = JSON.parse(raw);
      return val;
    }catch{ return fallback; }
  }
  function saveJson(k, v){
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch{}
  }
  function trimHistory(){
    if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS);
  }

  // Render
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

  // Seed if empty
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
      // Decide whether to autosummarize before calling the model
      if (history.length % AUTOSUMMARY_EVERY === 0 && history.length >= WINDOW_FOR_PROMPT + 8){
        await doAutosummary();
      }

      // Prepare window for the model: summary + profile + last N turns
      const recent = history.slice(-WINDOW_FOR_PROMPT);
      const memory = {
        summary: typeof summary === "string" ? summary : (summary?.text || ""),
        profile,
      };

      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          man, userId,
          mode: (qs.get("mode") || "soft"),
          history: recent,
          memory
        })
      });

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/event-stream")){
        await streamInto(res, memory);
      } else {
        const data = await res.json();
        const reply = sanitizeReply(data.reply || "");
        pushAndRender("assistant", reply);
      }
    }catch(err){
      console.error(err);
      pushAndRender("assistant", "Network hiccup. Say that again and I’ll catch it.");
    }
  }

  function pushAndRender(role, content){
    history.push({role, content, t:Date.now()});
    trimHistory();
    saveJson(hKey(man), history);
    addBubble(role, content);
  }

  async function streamInto(res){
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No reader");
    let buf = "", live = el.tplAi.content.firstElementChild.cloneNode(true);
    el.list.appendChild(live);
    while (true){
      const {value, done} = await reader.read();
      if (done) break;
      buf += new TextDecoder().decode(value, {stream:true});
      const chunks = buf.split("\n\n");
      for (let i = 0; i < chunks.length - 1; i++){
        const line = chunks[i].replace(/^data:\s?/, "");
        if (line === "[DONE]") continue;
        const payload = tryJson(line);
        live.textContent += sanitizeReply((payload && payload.delta) || "");
        el.list.scrollTop = el.list.scrollHeight;
      }
      buf = chunks[chunks.length - 1];
    }
    const final = live.textContent.trim();
    if (final){
      history.push({role:"assistant", content:final, t:Date.now()});
      trimHistory();
      saveJson(hKey(man), history);
    }
  }

  async function doAutosummary(){
    try{
      const resp = await fetch("/api/brain", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          man, userId,
          recent: history.slice(-(WINDOW_FOR_PROMPT + 40)), // give brain more to summarize
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
    t = (t || "").replace(/\[(?:[^\[\]]{0,120})\]/g, "").replace(/\*([^*]{0,120})\*/g, "$1");
    // keep it punchy
    const lines = t.split("\n").filter(Boolean).slice(0,3);
    return lines.join("\n").trim();
  }
  function tryJson(s){ try{return JSON.parse(s);}catch{return null;} }

  // QoL
  setTimeout(() => { el.input?.focus?.(); }, 60);
})();

// Blossom & Blade — chat runtime (no fallback bubbles; robust send)
(() => {
  // ---------- URL / who ----------
  const qs   = new URLSearchParams(location.search);
  const man  = (qs.get("man") || "").toLowerCase();

  const VALID  = ["blade","dylan","alexander","silas","grayson","viper"];
  const pretty = { blade:"Blade", dylan:"Dylan", alexander:"Alexander", silas:"Silas", grayson:"Grayson", viper:"Viper" };

  // ---------- DOM ----------
  const el = {
    title:        document.getElementById("roomTitle"),
    list:         document.getElementById("messages"),
    input:        document.getElementById("chatInput"),
    send:         document.getElementById("sendBtn"),
    form:         document.getElementById("composer"),
    portrait:     document.getElementById("portraitImg"),
    portraitLabel:document.getElementById("portraitLabel"),
    tplUser:      document.getElementById("tpl-user"),
    tplAI:        document.getElementById("tpl-assistant"),
    slowBadge:    document.getElementById("slowBadge"),
  };

  // guard: if basic nodes missing, bail quietly
  if (!el.list || !el.input || !el.form) {
    console.error("chat.html missing required IDs");
    return;
  }

  document.title = "Blossom & Blade — " + (pretty[man] || "Chat");
  if (el.title) el.title.textContent = VALID.includes(man) ? pretty[man] : "Blossom & Blade —";

  // ---------- Portrait ----------
  const FALLBACK_LOGO = "/images/logo.jpg"; // safe fallback
  function imgPathChat(m){ return `/images/characters/${m}/${m}-chat.webp`; }

  (function setPortrait(){
    const img = el.portrait;
    if (!img) return;
    img.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    if (el.portraitLabel) el.portraitLabel.textContent = VALID.includes(man) ? `${pretty[man]} — portrait` : "";
    img.src = VALID.includes(man) ? imgPathChat(man) : FALLBACK_LOGO;
    img.onerror = () => { img.src = FALLBACK_LOGO; img.onerror = null; };
  })();

  // ---------- Storage ----------
  const uidKey = "bnb.userId";
  const sKey   = (m) => `bnb.${m}.summary`;
  const saveJson = (k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v))}catch{} };
  const loadJson = (k,d)=>{ try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{ return d;} };

  const userId = (() => {
    let v = localStorage.getItem(uidKey);
    if (!v) { v = crypto.randomUUID?.() || String(Date.now())+Math.random().toString(16).slice(2); localStorage.setItem(uidKey, v); }
    return v;
  })();

  // ---------- History ----------
  let history = loadJson(sKey(man), []);
  function trimHistory(){ if (history.length > 24) history = history.slice(-24); }

  // ---------- Bubbles ----------
  function addBubble(role, text) {
    if (!text) return;
    const tpl = role === "user" ? el.tplUser : el.tplAI;
    let node;
    if (tpl?.content) {
      node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".bubble").textContent = text;
    } else {
      node = document.createElement("li");
      node.className = role === "user" ? "right" : "left";
      const b = document.createElement("div");
      b.className = "bubble " + (role === "user" ? "user" : "ai");
      b.textContent = text;
      node.appendChild(b);
    }
    el.list.appendChild(node);
    el.list.parentElement.scrollTop = el.list.parentElement.scrollHeight + 9999;
  }

  function renderAll(){ el.list.innerHTML = ""; for (const m of history) addBubble(m.role, m.content); }

  // ---------- First greeting ----------
  const firstLines = ["hey you.","look who’s here.","aww, you came to see me."];
  if (VALID.includes(man) && history.length === 0) {
    const first = firstLines[Math.floor(Math.random()*firstLines.length)];
    history.push({role:"assistant", content:first, t:Date.now()});
    saveJson(sKey(man), history);
  }
  renderAll();

  // ---------- SEND ----------
  const BANNED = /\b(?:rape|incest|bestiality|traffick|minors?|teen|scat)\b/i;

  el.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    if (BANNED.test(text)){
      addBubble("assistant", "I can’t do that. I’ll keep you safe and stay within the lines, okay?");
      el.input.value = "";
      return;
    }

    history.push({role:"user", content:text, t:Date.now()});
    saveJson(sKey(man), history);
    addBubble("user", text);
    el.input.value = "";
    trimHistory();

    const body = { man, userId, history, mode:"soft", memory:{summary:loadJson(sKey(man)+":memo",""), profile:""}, pov:"", consented:(localStorage.getItem("bnb.consent")==="1") };

    try{
      const r = await fetch("/api/chat", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { console.warn("server",r.status,r.statusText); return; }
      const j = await r.json().catch(()=>null);
      const reply = (j && j.reply) ? String(j.reply) : "";
      if (!reply) return;

      history.push({role:"assistant", content:reply, t:Date.now()});
      saveJson(sKey(man), history);
      addBubble("assistant", reply);
    }catch(err){
      console.error("chat send failed:", err);
      // no fallback bubble
    }
  });

  el.send?.addEventListener?.("click", (e)=>{ e.preventDefault(); el.form.requestSubmit(); });
})();

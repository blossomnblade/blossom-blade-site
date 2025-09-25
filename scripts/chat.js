<script>
// Blossom & Blade — chat runtime (no fallback bubbles; robust send)
(() => {
  // ---------- URL / who ----------
  const qs   = new URLSearchParams(location.search);
  const man  = (qs.get("man") || "").toLowerCase();
  const sub  = (qs.get("sub") || "night").toLowerCase();

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
    status:       (() => {
      const s = document.createElement("div");
      s.id = "netStatus";
      s.style.cssText = "font:500 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto; color:#9fb0c3; padding:6px 10px 0;";
      el?.form?.parentElement?.appendChild?.(s);
      return s;
    })()
  };

  // ---------- Title + portrait ----------
  document.title = "Blossom & Blade — " + (pretty[man] || "Chat");
  if (el.title) el.title.textContent = VALID.includes(man) ? pretty[man] : "Blossom & Blade —";

  const FALLBACK_LOGO = "/images/logo.webp";
  function imgPathChat(m){ return `/images/characters/${m}/${m}-chat.webp`; }

  (function setPortrait(){
    const img = el.portrait;
    if (!img) return;
    img.dataset.stage = "chat";
    img.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    if (el.portraitLabel) el.portraitLabel.textContent = VALID.includes(man) ? `${pretty[man]} — portrait` : "";
    img.src = VALID.includes(man) ? imgPathChat(man) : FALLBACK_LOGO;
    img.onerror = () => { img.src = FALLBACK_LOGO; img.onerror = null; };
  })();

  // ---------- Storage keys ----------
  const uidKey = "bnb.userId";
  const hKey   = (m) => `bnb.${m}.slow`;
  const sKey   = (m) => `bnb.${m}.summary`;
  const pKey   = (m) => `bnb.${m}.profile`;

  // helpers
  const saveJson = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
  const loadJson = (k,d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } };

  // ---------- History ----------
  const userId = (() => {
    let v = localStorage.getItem(uidKey);
    if (!v) { v = crypto.randomUUID?.() || String(Date.now())+Math.random().toString(16).slice(2); localStorage.setItem(uidKey, v); }
    return v;
  })();

  let history = loadJson(sKey(man), []);
  function trimHistory() {
    // keep last ~12 messages (both roles)
    if (history.length > 24) history = history.slice(-24);
  }

  // ---------- UI bubbles ----------
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
      b.className = "bubble";
      b.textContent = text;
      node.appendChild(b);
    }
    el.list.appendChild(node);
    el.list.parentElement.scrollTop = el.list.parentElement.scrollHeight + 9999;
  }

  function renderAll() {
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
    el.list.parentElement.scrollTop = el.list.parentElement.scrollHeight + 9999;
  }

  // ---------- First greeting ----------
  const firstLines = [
    "hey you.", "look who’s here.", "aww, you came to see me."
  ];
  if (VALID.includes(man) && history.length === 0) {
    const first = firstLines[Math.floor(Math.random()*firstLines.length)];
    history.push({role:"assistant", content:first, t:Date.now()});
    saveJson(sKey(man), history);
  }
  renderAll();

  // ---------- Guard rails ----------
  const BANNED = /\b(?:rape|incest|bestiality|traffick|minors?|teen|scat)\b/i;

  // ---------- Assistant flavor ----------
  const SOFT_ACKS = ["oh baby, yes.", "mmh, I hear you.", "go on…" ];
  function tweakAssistant(out, lastUser="") {
    if (!out) return out;
    // add tiny ack sometimes
    if (Math.random() < 0.15) out = out.replace(/[.?!]*\s*$/,"") + " " + SOFT_ACKS[Math.floor(Math.random()*SOFT_ACKS.length)];
    return out;
  }

  // ---------- SEND ----------
  let shownErrorOnce = false;

  async function onSend(e){
    e?.preventDefault?.();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // taboo guard
    if (BANNED.test(text)){
      addBubble("assistant", "I can’t do that. I’ll keep you safe and stay within the lines, okay?");
      el.input.value = "";
      return;
    }

    // append user
    history.push({role:"user", content:text, t:Date.now()});
    saveJson(sKey(man), history);
    addBubble("user", text);
    el.input.value = "";
    trimHistory();

    // build payload
    const body = {
      man,
      userId,
      history,
      mode: "soft",
      memory: { summary: loadJson(sKey(man)+":memo", ""), profile: loadJson(pKey(man), "") },
      pov: "",
      consented: (localStorage.getItem("bnb.consent") === "1")
    };

    // call API
    try {
      el.status.textContent = "…";
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        // show a tiny inline status, no bubble
        const msg = `server ${r.status}${r.statusText ? " — " + r.statusText : ""}`;
        el.status.textContent = msg;
        if (!shownErrorOnce) shownErrorOnce = true;
        return; // do NOT add a fallback bubble
      }

      const j = await r.json().catch(()=>null);
      const reply = (j && j.reply) ? String(j.reply) : "";

      if (!reply) { el.status.textContent = "no reply"; return; }

      const lastUser = [...history].reverse().find(m => m.role==="user")?.content || "";
      const flavored = tweakAssistant(reply, lastUser);

      // append assistant
      history.push({role:"assistant", content:flavored, t:Date.now()});
      saveJson(sKey(man), history);
      addBubble("assistant", flavored);
      el.status.textContent = "";
    } catch(err){
      console?.error?.("chat send failed:", err);
      el.status.textContent = "connection hiccup";
      return; // no fallback bubble
    }
  }

  el.form?.addEventListener?.("submit", onSend);
  el.send?.addEventListener?.("click", onSend);
})();
</script>

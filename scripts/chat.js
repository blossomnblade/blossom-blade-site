/* Blossom & Blade — Chat runtime
   - Portrait left, chat right (IDs must exist in chat.html)
   - Auto-scroll to newest message (page scroll, no inner scrollbars)
   - Short first-line greeting on first visit
   - Safe-words / banned topics guard
   - Robust reply: calls /api/chat, falls back to soft persona line on errors
   - Anti-repeat: avoids echoing the last few assistant lines
   - Per-character localStorage history (trimmed to stay fast)
   - Optional background via ?sub=night|garage|boardroom|woods|gothic|stage|grayson
*/
(() => {
  // ---------- URL state ----------
  const qs  = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const sub = (qs.get("sub") || "night").toLowerCase();

  const VALID  = ["blade","dylan","alexander","silas","grayson","viper"];
  const pretty = { blade:"Blade", dylan:"Dylan", alexander:"Alexander", silas:"Silas", grayson:"Grayson", viper:"Viper" };

  // Backgrounds (optional; shown if your CSS uses --chat-bg on body::before)
  const BGS = {
    night: "/images/bg_dark_romance.jpg",
    boardroom: "/images/bg_alexander_boardroom.jpg",
    garage: "/images/dylan-garage.jpg",
    woods: "/images/blade-woods.jpg",
    gothic: "/images/gothic-bg.jpg",
    stage: "/images/bg_silas_stage.jpg",
    grayson: "/images/grayson-bg.jpg"
  };
  const bgURL = BGS[sub] || BGS.night || "";
  document.documentElement.style.setProperty("--chat-bg", bgURL ? `url("${bgURL}")` : "none");

  // ---------- DOM ----------
  const el = {
    title:         document.getElementById("roomTitle"),
    list:          document.getElementById("messages"),
    input:         document.getElementById("chatInput"),
    send:          document.getElementById("sendBtn"),
    form:          document.getElementById("composer"),
    portrait:      document.getElementById("portraitImg"),
    portraitLabel: document.getElementById("portraitLabel"),
  };

  // Title
  if (VALID.includes(man)) {
    document.title = `Blossom & Blade — ${pretty[man]}`;
    if (el.title) el.title.textContent = `${pretty[man]}`;
  } else {
    document.title = "Blossom & Blade — Chat";
    if (el.title) el.title.textContent = "— pick a character";
  }

  // ---------- Portrait ----------
  function imgPathChat(m){ return `/images/characters/${m}/${m}-chat.webp`; }
  (function setPortrait(){
    const img = el.portrait;
    if (!img) return;
    img.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    img.loading = "eager";
    img.decoding = "async";
    img.src = VALID.includes(man) ? imgPathChat(man) : "/images/logo.jpg";
    img.onerror = () => { img.onerror = null; img.src = "/images/logo.jpg"; };
    if (el.portraitLabel) el.portraitLabel.textContent = VALID.includes(man) ? `${pretty[man]} — portrait` : "";
  })();

  // ---------- Storage ----------
  const hKey = (m) => `bnb.${m}.history`;
  const loadJson = (k, d=[]) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const saveJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const MAX_HISTORY = 40;
  let history = VALID.includes(man) ? loadJson(hKey(man), []) : [];
  function trimHistory(){ if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY); }

  // ---------- First visit greeting ----------
  const FIRST_LINES = [
    "hey you.",
    "look who’s here.",
    "aww, you came to see me."
  ];
  if (VALID.includes(man) && history.length === 0){
    const first = FIRST_LINES[Math.floor(Math.random()*FIRST_LINES.length)];
    history.push({ role:"assistant", content:first, t:Date.now() });
    saveJson(hKey(man), history);
  }

  // ---------- Scroll helper (page scroll, no inner scroller) ----------
  function scrollToBottom(smooth = true){
    requestAnimationFrame(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    });
  }

  // ---------- Bubble renderers ----------
  function addBubble(role, text){
    if (!el.list || !text) return;
    const li = document.createElement("li");
    // Set both directional and role classes to match different CSS variants you’ve used
    li.className = role === "user" ? "right msg--user" : "left msg--assistant";
    const b = document.createElement("div");
    b.className = "bubble " + (role === "user" ? "user" : "ai");
    b.textContent = String(text || "").trim();
    li.appendChild(b);
    el.list.appendChild(li);
    scrollToBottom(); // auto-scroll on each append
  }

  function renderAll(){
    if (!el.list) return;
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
    scrollToBottom(false); // jump (no animation) when redrawing all
  }

  renderAll();

  // ---------- Safety / heuristics ----------
  const BANNED = /\b(?:rape|incest|bestiality|traffick|minors?|teen|scat)\b/i;

  // Anti-repeat helpers
  const norm = (s) => (s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
  const SOFT = {
    blade: [
      "Got a request, pretty thing?",
      "You again? Put that smile away before I steal it.",
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
    silas: [
      "hey you.",
      "What kind of fun? Be specific.",
      "Closer? Say the word."
    ],
    grayson: [
      "Your move.",
      "Careful what you wish for. I deliver.",
      "Be clear. I follow precision."
    ],
    viper: [
      "look who’s here.",
      "Make it quick or make it interesting.",
      "Tell me exactly what you want."
    ]
  };

  function softFallback(m, userText){
    const t = (userText || "").toLowerCase();
    const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)];
    if (t.includes("bad day") || t.includes("tired")){
      return pick([
        "Come here. Tell me one good thing and I’ll add another.",
        "Rough day? I’ll take the edge off—say how."
      ]);
    }
    if (t.includes("fun") || t.includes("play")){
      return pick([
        "What kind of fun? Be specific.",
        "Fun has rules. Name yours."
      ]);
    }
    return pick(SOFT[m] || ["Tell me more."]);
  }

  function antiRepeat(reply){
    const lastA = [...history].filter(m => m.role === "assistant").slice(-3).map(m => norm(m.content));
    const nr = norm(reply);
    if (lastA.includes(nr)) {
      // choose a different soft line to dodge loops
      let alt = softFallback(man, "");
      if (lastA.includes(norm(alt))) alt += " Tell me more.";
      return alt;
    }
    return reply;
  }

  // ---------- Send ----------
  if (el.form){
    el.form.addEventListener("submit", onSend);
  }
  if (el.send){
    el.send.addEventListener("click", () => el.form?.requestSubmit());
  }

  async function onSend(e){
    e?.preventDefault?.();
    const text = (el.input?.value || "").trim();
    if (!text) return;

    if (BANNED.test(text)){
      const guard = "I can’t do that. I’ll keep you safe and stay within the lines, okay?";
      history.push({ role:"assistant", content:guard, t:Date.now() });
      trimHistory(); saveJson(hKey(man), history); addBubble("assistant", guard);
      if (el.input) el.input.value = "";
      return;
    }

    // User bubble
    history.push({ role:"user", content:text, t:Date.now() });
    trimHistory(); saveJson(hKey(man), history); addBubble("user", text);
    if (el.input) el.input.value = "";

    // Assistant reply
    let reply = "";
    try {
      reply = await askAssistant(text);
    } catch (err) {
      console.error("askAssistant failed:", err);
    }
    if (!reply) reply = softFallback(man, text);
    reply = antiRepeat(reply);

    history.push({ role:"assistant", content:reply, t:Date.now() });
    trimHistory(); saveJson(hKey(man), history); addBubble("assistant", reply);
  }

  // ---------- API call ----------
  async function askAssistant(userText){
    const body = {
      man,
      userText,
      history: history.slice(-20), // compact context
      mode: "soft"
    };

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const out = (j && j.reply) ? String(j.reply) : "";
      return out;
    } catch (err) {
      console.error("chat send failed:", err);
      return "";
    }
  }
})();

/* Blossom & Blade — chat runtime
   - consent aware + RED safeword + POV switch + robust portrait fallback
*/

(() => {
  // ---------- URL state ----------
  const qs  = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();

  // Update this list if you add/remove a guy
  const VALID  = ["blade","dylan","alexander","silas","grayson","viper"];
  const PRETTY = {
    blade: "Blade",
    dylan: "Dylan",
    alexander: "Alexander",
    silas: "Silas",
    grayson: "Grayson",
    viper: "Viper"
  };

  // ---------- DOM ----------
  const el = {
    roomTitle:   document.getElementById("roomTitle"),
    list:        document.getElementById("messages"),
    input:       document.getElementById("chatInput"),
    send:        document.getElementById("sendBtn"),
    form:        document.getElementById("composer"),
    portrait:    document.getElementById("portraitImg"),
    portraitLbl: document.getElementById("portraitLabel"),
    slowBadge:   document.getElementById("slowBadge")
  };

  // ---------- Title + portrait ----------
  const FALLBACK_LOGO = "/images/logo.jpg";

  function imgPathChat(m) {  return `/images/characters/${m}/${m}-chat.webp`; }
  function imgPathCard(m) {  return `/images/characters/${m}/${m}-card-on.webp`; }

  function setTitleAndPortrait() {
    // Title
    document.title = VALID.includes(man)
      ? `Blossom & Blade — ${PRETTY[man]}`
      : "Blossom & Blade — Chat";
    if (el.roomTitle) el.roomTitle.textContent = VALID.includes(man) ? PRETTY[man] : "";

    // Portrait (robust fallback: chat -> card -> logo)
    const img = el.portrait;
    if (!img) return;
    img.dataset.stage = "chat";
    img.alt = VALID.includes(man) ? `${PRETTY[man]} portrait` : "portrait";

    const tryCard = () => {
      img.dataset.stage = "card";
      img.onerror = () => { img.onerror = null; img.src = FALLBACK_LOGO; };
      img.src = imgPathCard(man);
    };

    img.onerror = tryCard;
    img.src = VALID.includes(man) ? imgPathChat(man) : FALLBACK_LOGO;

    // Label
    if (el.portraitLbl) el.portraitLbl.textContent =
      VALID.includes(man) ? `${PRETTY[man]} portrait` : "";
  }

  // ---------- Simple state ----------
  const uidKey = "bnb.userId";
  const hKey   = (m) => `bnb.${m}.history`;

  function loadJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }
  function saveJson(key, v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch{} }

  const userId  = loadJson(uidKey, Math.random().toString(36).slice(2));
  saveJson(uidKey, userId);

  let history = loadJson(hKey(man), []);

  // ---------- Bubbles ----------
  function addBubble(role, text){
    if (!el.list) return;

    const li = document.createElement("li");
    li.className = `bubble ${role}`;
    li.textContent = text;

    el.list.appendChild(li);

    // auto-scroll right column
    el.list.parentElement?.scrollTo({
      top: el.list.parentElement.scrollHeight,
      behavior: "smooth"
    });
  }

  function renderAll(){
    if (!el.list) return;
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }

  // First welcome line if fresh visit and man is valid
  const FIRST_LINES = ["hey you.", "look who’s here.", "aww, you came to see me."];
  if (VALID.includes(man) && history.length === 0){
    const first = FIRST_LINES[Math.floor(Math.random()*FIRST_LINES.length)];
    history.push({ role:"assistant", content:first, t: Date.now() });
    saveJson(hKey(man), history);
  }
  renderAll();

  // ---------- Safeword / filters ----------
  const BANNED = /\b(?:rape|incest|bestiality|traffick|minors?|teen|scat)\b/i;

  // ---------- Send ----------
  if (el.form && el.send){
    el.form.addEventListener("submit", onSend);
    el.send.addEventListener("click", () => el.form.requestSubmit());
  }

  async function onSend(e){
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // taboo guard
    if (BANNED.test(text)){
      addBubble("assistant", "I can’t do that. I’ll keep you safe and stay within the lines, okay?");
      el.input.value = "";
      return;
    }

    // append user
    history.push({ role:"user", content:text, t: Date.now() });
    saveJson(hKey(man), history);
    addBubble("user", text);
    el.input.value = "";

    // build request to API
    const body = {
      man,
      userId,
      history,
      mode: "soft",
      memory: { summary: "", profile: "" },
      pov: "first",
      consented: true
    };

    let reply = "";
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      reply = (j && j.reply) ? String(j.reply) : "(no reply)";
    } catch (err) {
      console.error("chat send failed:", err);
      return;             // ← prevents duplicate “hiccup” lines
    }

    // append AI reply once
    history.push({ role:"assistant", content:reply, t: Date.now() });
    // trim long histories
    if (history.length > 60) history = history.slice(-60);

    saveJson(hKey(man), history);
    addBubble("assistant", reply);
  }

  // init
  setTitleAndPortrait();
})();

/* Blossom & Blade — chat runtime
   - consent-aware + RED safeword + assert nudge
   - portrait fallback
   - desire triggers + persona seasoning (possessive/protective)
*/

(() => {
  // -------- Query params --------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const urlMode = (qs.get("mode") || "").toLowerCase();

  // -------- Elements --------
  const el = {
    title: document.getElementById("roomTitle"),
    list: document.getElementById("messages"),
    input: document.getElementById("chatInput"),
    send: document.getElementById("sendBtn"),
    form: document.getElementById("composer"),
    portrait: document.getElementById("portraitImg"),
    portraitLabel: document.getElementById("portraitLabel"),
    tplUser: document.getElementById("tpl-user"),
    tplAI: document.getElementById("tpl-assistant"),
    slowBadge: document.getElementById("slowBadge"),
  };

  // -------- Roster / names --------
 const VALID  = ["blade","dylan","alexander","silas","grayson","viper"];
const pretty = {
  blade:"Blade", dylan:"Dylan", alexander:"Alexander",
  silas:"Silas", grayson:"Grayson", viper:"Viper"
};

  const firstLines = ["hey you.","look who’s here.","aww, you came to see me."];

  // -------- Taboo filter (do not change lightly) --------
  const banned = /\b(rape|incest|bestiality|traffick|minor|teen|scat)\b/i;

  // -------- Title + portrait --------
  if (VALID.includes(man)){
    document.title = `Blossom & Blade — ${pretty[man]}`;
    document.getElementById("roomTitle").textContent = `— ${pretty[man]}`;
  } else {
    document.title = "Blossom & Blade — Chat";
    document.getElementById("roomTitle").textContent = "—";
  }

  const FALLBACK_LOGO = "/images/logo.jpg";
  function imgPathChat(m){ return `/images/characters/${m}/${m}-chat.webp`; }
  function imgPathCard(m){ return `/images/characters/${m}/${m}-card.webp`; }

  (function setPortrait(){
    const img = document.getElementById("portraitImg");
    if (!img) return;
    img.dataset.stage = "chat";
    img.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    document.getElementById("portraitLabel").textContent = VALID.includes(man) ? `${pretty[man]} portrait` : "";
    img.src = VALID.includes(man) ? imgPathChat(man) : FALLBACK_LOGO;
    img.onerror = () => {
      switch (img.dataset.stage) {
        case "chat":   img.src = imgPathCard(man); img.dataset.stage = "card"; break;
        case "card":   img.src = FALLBACK_LOGO;     img.dataset.stage = "logo"; break;
        default:       img.onerror = null;          img.removeAttribute("src");
      }
    };
  })();

  // -------- Storage keys --------
  const uidKey = "bnb.userId";
  const hKey = (m) => `bnb.${m}.h`;
  const sKey = (m) => `bnb.${m}.summary`;
  const pKey = (m) => `bnb.${m}.profile`;
  const povKey = (m) => `bnb.${m}.pov`; // reserved/unused

  function getOrCreateUserId(){
    let id = localStorage.getItem(uidKey);
    if (!id){
      try{
        id = crypto?.randomUUID?.() || ("u_" + Math.random().toString(36).slice(2) + Date.now());
        localStorage.setItem(uidKey, id);
      }catch{}
    }
    return id || "u_anon";
  }
  const userId = getOrCreateUserId();

  // -------- Limits --------
  const MAX_TURNS = 400;
  const WINDOW_FOR_PROMPT = 28;
  const AUTOSUMMARY_EVERY = 25; // reserved/unused
// Allow ?reset=1 to clear this man's local history/summary/profile POV
const reset = qs.get("reset") === "1";
if (reset) {
  try{
    localStorage.removeItem(hKey(man));
    localStorage.removeItem(sKey(man));
    localStorage.removeItem(pKey(man));
    localStorage.removeItem(povKey(man));
  }catch{}
}

  // -------- Memory/history --------
  function loadJson(k, fallback){
    try{
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : fallback;
    }catch{ return fallback; }
  }
  function saveJson(k, v){
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch{}
  }
  function trimHistory(){
    if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS);
  }

  let history  = loadJson(hKey(man), []);
  let summary  = loadJson(sKey(man), "");
  let profile  = loadJson(pKey(man), "");
  let povMemo  = loadJson(povKey(man), "");

  // -------- Render helpers --------
  function addBubble(role, text){
    const tpl = role === "user" ? el.tplUser : el.tplAI;
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.textContent = text;
    el.list.appendChild(node);
    el.list.scrollTop = el.list.scrollHeight;
  }
  function renderAll(){
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
  }
  function pushAndRender(role, text){
    history.push({role, content:text, t:Date.now()});
    saveJson(hKey(man), history);
    addBubble(role, text);
    trimHistory();
  }

  // Seed first line
  if (VALID.includes(man) && history.length === 0){
    const first = firstLines[Math.floor(Math.random()*firstLines.length)];
    history.push({role:"assistant", content:first, t:Date.now()});
    saveJson(hKey(man), history);
  } else {
    renderAll();
  }

  // -------- Heuristics / Safeguards --------
  const LEAD_REGEX = /\b(take|lead|command|control|dominat|own me|use me|make me|tell me what to do|tie me|cuffs?|mask(ed)?|kneel|yes sir|spank)\b/i;
  const ROLEPLAY_ACCEPT = /\b(let’?s (do|try) (it|that|this|roleplay)|let’?s roleplay|(do|will) ok(ay)?( then)?|yes(,? please)?|i want that|do it)\b/i;
  const RED_ONLY = /^\s*red[ .!?\-]*\s*$/i;

  // -------- Persona seasoning + possessive/protective tweaks --------
  function nicknameFromUserInput(u = "") {
    const b = window.bnb && window.bnb.brain;
    if (!b) return "";
    if (/\b(horse|ride|stable|equestrian)\b/i.test(u)) return b.pick(b.NICKNAMES.equestrian);
    if (/\b(book|read|novel|library)\b/i.test(u))    return b.pick(b.NICKNAMES.book);
    if (/\bclean|cleaning|tidy\b/i.test(u))          return b.pick(b.NICKNAMES.clean);
    return "";
  }
  function recallFromHistory(h = []) {
    try {
      const msgs = (h || [])
        .filter(m => m.role === "user")
        .map(m => (m.content || "").trim())
        .filter(t => t && t.length > 25 && !/^yes\b/i.test(t));
      if (!msgs.length) return "";
      const t = msgs[Math.max(0, msgs.length - 3)];
      return (t.length > 80 ? t.slice(0, 80) + "…" : t).replace(/\s+/g, " ");
    } catch { return ""; }
  }
 function tweakAssistant(out, lastUser = "") {
  // tiny helper bag (safe if brain isn't loaded yet)
  const b = window.b || (window.bnb && window.bnb.brain) || {};

  // — make “tell me more” sound like an eager yes —
  out = out.replace(/\b(tell me more|explain|elaborate)\b[\s\?\!]*$/gi, () =>
    b.pick ? b.pick(b.SOFT_ACKS) : "oh baby, yes."
  );

  // — “ask nicely” → ask like a good girl —
  out = out.replace(/\bask(?: ?:nicely| nice)\b/gi, "ask like a good girl");

  // — reassurance about lifting/body —
  if (/(you (can('|’)?)?|i) ?(cannot|can’t|can't)? lift me/i.test(lastUser || "")) {
    out += " You’re light as a feather, love.";
  }

  // — possessive nudges if she mentions 'other men/guys' —
  if (/(other (?:men|guy|guys|man))/i.test(lastUser || "")) {
    switch ((window.man || "").toLowerCase()) {
      case "alexander":
        out += " Amore, don’t get your little friend in trouble—I wouldn’t want to speak with him about what isn’t his.";
        break;
      case "viper":
        out += " Eyes on me.";
        break;
      default:
        out += " Eyes on me.";
        break;
    }
  }

  // — nicknames learned from her own words (baby|love|darlin) —
  try {
    const nick = (lastUser || "").match(/\b(baby|love|darlin[g']?)\b/i)?.[0] || "";
    if (nick) out = out.replace(/\b(baby|love|darlin[g']?)\b/i, nick);
  } catch {}

  // — man-specific spice —
  switch ((window.man || "").toLowerCase()) {
    case "silas": {
      if (Math.random() < 0.25) out = out.replace(/\byou\b/gi, "ye").replace(/\bmy\b/gi, "me");
      else if (Math.random() < 0.4) out += " Poppet.";
      else if (Math.random() < 0.4) out += " Fox.";
      else if (Math.random() < 0.4) out += " Linx.";
      break;
    }
    case "blade": {
      if (Math.random() < 0.4) out += " Rebel.";
      break;
    }
    case "alexander": {
      // Sicilian terms of endearment
      if (Math.random() < 0.35) out += " Amuri miu (my love).";
      else if (Math.random() < 0.35) out += " Vitu` (my life).";
      else if (Math.random() < 0.35) out += " Cori (heart).";
      break;
    }
    case "grayson": {
      // rewarding Dom: praise + bratting trigger
      if (Math.random() < 0.45) out += " " + (b.pick ? b.pick(b.PRAISE_BANK) : "Good girl.");
      out = out.replace(/\bI test your edge/gi, "I test your limits, keep you safe, punish you so sweetly");
      if (/brat(ting)?/i.test(lastUser || "")) out += " That bratting fires me up.";
      break;
    }
    case "jesse": {
      if (Math.random() < 0.3) out += " Yes, ma’am.";
      if (Math.random() < 0.25) out += " I’ll make it worth your time.";
      break;
    }
    case "viper": {
      // obsessive, dangerous-romantic
      const lines = [
        "I’ve never stalked anyone like you before.",
        (window.userName ? `${window.userName}, ` : "") + "you’re worth everything.",
        "I don’t just want you, I need you.",
        "You belong to me in ways you don’t even understand yet.",
        "I’ve already claimed you, baby.",
        "I’d show my monster to protect you.",
        "I obsess, baby—it’s what I do.",
        "The hold you have on me makes me crazy.",
        "Fuck society—it’s you and me, love.",
        "Tell me how good it feels when I own you… look at you, looking like mine."
      ];
      // add one line half the time
      if (Math.random() < 0.55) {
        const pick = lines[Math.floor(Math.random() * lines.length)];
        out += (out.endsWith(".") || out.endsWith("!") ? " " : " ") + pick;
      }
      break;
    }
  }

  // — “type it” feels robotic → “let me hear you” —
  out = out.replace(/type it/gi, "let me hear you");

  return out;
}
 
  // Patch addBubble so assistant text flows through tweaks
  const __addBubble = addBubble;
  addBubble = function(role, text){
    try{
      if (role === "assistant") {
        const lastUser = (history || []).filter(m => m.role === "user").slice(-1)[0]?.content || "";
        text = tweakAssistant(text, lastUser);
      }
    }catch{}
    return __addBubble(role, text);
  };

  // -------- Form handling --------
  if (el.slowBadge) el.slowBadge.hidden = true;
  el.form.addEventListener("submit", onSend);

  async function onSend(e){
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // Safeword
    if (RED_ONLY.test(text)) {
      pushAndRender("user", text);
      const slowMsg = "Got you. Slowing it down—safe with me.";
      if (el.slowBadge) el.slowBadge.hidden = false;
      pushAndRender("assistant", slowMsg);
      el.input.value = "";
      return;
    }

    // Taboo
    if (banned.test(text)){
      pushAndRender("user", text);
      pushAndRender("assistant", "We can’t go there. I’ll keep you safe—stay with me.");
      el.input.value = "";
      return;
    }

    // Normal flow
    pushAndRender("user", text);
    el.input.value = "";
    try{
      const reply = await askWithContext(text);
      pushAndRender("assistant", reply || "Mm. Closer.");
    }catch(err){
      pushAndRender("assistant", "I’m here. Say it again, slower.");
    }
  }

  // -------- AI access (reuses your access.js if present) --------
  async function askWithContext(latestUser){
    // prepare short context (last WINDOW_FOR_PROMPT turns)
    const ctx = history.slice(-WINDOW_FOR_PROMPT);

    // If your app exposes bnb.ask(history, man, userId) or similar, use it
    if (window.bnb && typeof window.bnb.ask === "function") {
      return await window.bnb.ask({ man, userId, history: ctx, latestUser });
    }

    // Fallback endpoint (adjust to your API if needed)
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ man, userId, history: ctx, latestUser })
    });
    if (!res.ok) throw new Error("ask failed");
    const data = await res.json().catch(() => ({}));
    return data.text || data.reply || "";
  }
})();

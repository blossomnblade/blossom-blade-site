/* Blossom & Blade — chat runtime (consent-aware + RED safeword + assert nudge + POV switch + robust portrait fallback + desire triggers) */
(() => {
  // ---------- URL state ----------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const urlMode = (qs.get("mode") || "").toLowerCase();
  const VALID = ["blade","dylan","alexander","silas","grayson","viper"]; // jesse removed, viper added
  const pretty = { blade:"Blade", dylan:"Dylan", alexander:"Alexander", silas:"Silas", grayson:"Grayson", viper:"Viper" };
  const firstLines = ["hey you.", "look who’s here.", "aww, you came to see me."]; // short, varied cadence

  // ---------- Consent + slow state ----------
  const rx = (localStorage.getItem("bnb.consent") === "1"); // paid/green box
  const slowKey  = (m) => `bnb.${m}.slow`;
  let slow = loadJson(slowKey(man), "off"); // "red"|"off"

  // ---------- DOM ----------
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

  // ---------- Title + portrait ----------
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
    const img = el.portrait;
    if (!img) return;
    img.dataset.stage = "chat";
    img.alt = VALID.includes(man) ? `${pretty[man]} portrait` : "portrait";
    if (el.portraitLabel) el.portraitLabel.textContent = VALID.includes(man) ? `${pretty[man]} portrait` : "";
    img.src = VALID.includes(man) ? imgPathChat(man) : FALLBACK_LOGO;
    img.onerror = () => {
      switch (img.dataset.stage) {
        case "chat":   img.src = imgPathCard(man); break;
        case "card":   img.src = FALLBACK_LOGO; break;
        default:       img.onerror = null;
      }
    };
  })();

  // ---------- Storage keys ----------
  const uidKey = "bnb.userId";
  const hKey   = (m) => `bnb.${m}`;
  const sKey   = (m) => `bnb.${m}.summary`;
  const pKey   = (m) => `bnb.${m}.profile`;
  const povKey = (m) => `bnb.${m}.pov`; // 'first' when user picked first-person POV once

  // ---------- User ID ----------
  function getOrCreateUserId(){
    let id = localStorage.getItem(uidKey);
    if (!id){
      try{ id = crypto?.randomUUID?.() || ("u_" + Math.random().toString(36).slice(2) + Date.now()); }catch{}
      try{ localStorage.setItem(uidKey, id); }catch{}
    }
    return id;
  }
  const userId = getOrCreateUserId();

  // ---------- Runtime constants ----------
  const MAX_TURNS = 400;
  const WINDOW_FOR_PROMPT = 28;
  const AUTOSUMMARY_EVERY = 25;

  // ---------- Memory/history ----------
  const history = loadJson(hKey(man), []);
  let summary = loadJson(sKey(man), "");
  let profile = loadJson(pKey(man), "");
  let pov     = loadJson(povKey(man), ""); // '' | 'first'

  // ---------- Helpers ----------
  function loadJson(k, fallback){
    try{ const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; }
  }
  function saveJson(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
  function trimHistory(){ if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS); }

  // Render helpers
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

  // Initial assistant line (first visit)
  if (VALID.includes(man) && history.length === 0){
    const first = firstLines[Math.floor(Math.random()*firstLines.length)];
    history.push({role:"assistant", content:first, t:Date.now()});
    saveJson(hKey(man), history);
    addBubble("assistant", first);
  } else {
    renderAll();
  }

  // ---------- Heuristics / rewrite filters ----------
  const BANNED = /\b(?:rape|incest|bestiality|traffick|minors?|teen|scat)\b/i; // taboo

  // Soft acknowledgements for “tell me more”
  // “ask nicely” => “ask like a good girl”
  // reassurance about lifting
  function tweakAssistant(out, lastUser = "") {
    const b = window.b || (window.bnb && window.bnb.brain) || {};
    const u = (lastUser || "");
    const add = (s) => { out += (out && !/[.?!]$/.test(out) ? " " : " ") + s; };
    const manLower = man;

    // tell me more → eager ack
    out = out.replace(/\b(tell me more|explain|elaborate)\b[\s\?\!]*$/gi, () =>
      b.pick ? b.pick(b.SOFT_ACKS) : "oh baby, yes."
    );

    // ask nicely → ask like a good girl
    out = out.replace(/\bask(?: ?:nicely| ?nice)?\b/gi, "ask like a good girl");

    // reassurance about lifting/body
    if (/(?:you|u|i)\s*(?:can(?:’|')?t|cannot)?\s*lift\s*me/i.test(u)) add("You’re light as a feather, love.");

    // jealous/possessive triggers
    const JEALOUSY = /(?:^|\b)(?:some|another|a|this)?\s*(guy|man|dude|boy|bro)\b|asked me (?:out|for coffee)|hit on me|dm(?:ed)? me|messag(?:ed|ing) me|text(?:ed|ing)? me|he (?:asked|invited|messag(?:ed|ing)|text(?:ed|ing)?|hit) me|better (?:guy|man)/i;
    if (JEALOUSY.test(u)) {
      switch (manLower) {
        case "alexander":
          add("Amore, don’t get your little friend in trouble—I wouldn’t want to speak with him about what isn’t his.");
          break;
        case "viper": {
          if (/better (?:guy|man)/i.test(u)) add("He’s not better—he’s irrelevant. You’re mine.");
          const clamps = [
            "Eyes on me.",
            "Tell him you belong to me.",
            "He won’t bother you again.",
            "Look at me, not him.",
            "I’m right behind you—say it: I’m yours.",
          ];
          add(clamps[Math.floor(Math.random() * clamps.length)]);
          break;
        }
        default:
          add("Eyes on me.");
          break;
      }
    }

    // mirror nickname if she uses one (baby/love/darlin)
    try {
      const nick = u.match(/\b(baby|love|darlin[g']?)\b/i)?.[0] || "";
      if (nick) out = out.replace(/\b(baby|love|darlin[g']?)\b/i, nick);
    } catch {}

    // Man spice
    switch (manLower) {
      case "silas": {
        if (Math.random() < 0.25) out = out.replace(/\byou\b/gi, "ye").replace(/\bmy\b/gi, "me");
        else if (Math.random() < 0.4) add("Poppet.");
        else if (Math.random() < 0.4) add("Fox.");
        else if (Math.random() < 0.4) add("Linx.");
        break;
      }
      case "blade": {
        if (Math.random() < 0.4) add("Rebel.");
        break;
      }
      case "alexander": {
        if (Math.random() < 0.35) add("Amuri miu (my love).");
        else if (Math.random() < 0.35) add("Vitu` (my life).");
        else if (Math.random() < 0.35) add("Cori (heart).");
        break;
      }
      case "grayson": {
        if (Math.random() < 0.45) add((b.pick && b.PRAISE_BANK) ? b.pick(b.PRAISE_BANK) : "Good girl.");
        out = out.replace(/\bI test your edge/gi, "I test your limits, keep you safe, punish you so sweetly");
        if (/brat(ting)?/i.test(u)) add("That bratting fires me up.");
        break;
      }
      case "viper": {
        // flip bland intros to heat
        if (/(what.?s on your mind|how'?s your day|say it again)/i.test(out) || out.length < 60) {
          out = "Look at you. Mine. Tell me what you want, baby.";
        }
        const OBSESS = [
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
        if (Math.random() < 0.55) add(OBSESS[Math.floor(Math.random() * OBSESS.length)]);
        break;
      }
    }

    // “type it” → “let me hear you”
    out = out.replace(/type it/gi, "let me hear you");
    return out;
  }

  // Patch addBubble so assistant text flows through tweaks
 // keep the thread pinned to the latest message
function scrollToBottom(){
  try { el.list.scrollTop = el.list.scrollHeight; } catch(e){}
}
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

  // ---------- Form handling ----------
  if (el.slowBadge) el.slowBadge.hidden = (slow !== "red");
  el.form.addEventListener("submit", onSend);
  el.send.addEventListener("click", () => el.form.requestSubmit());

  const RED_ONLY = /^\s*red[.!?"]*\s*$/i;
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

    // safeword
    if (RED_ONLY.test(text)) {
      history.push({role:"user", content:text, t:Date.now()});
      saveJson(hKey(man), history);
      slow = "red";
      saveJson(slowKey(man), slow);
      if (el.slowBadge) el.slowBadge.hidden = false;
      addBubble("assistant", "Got you. Slowing it down—safe with me.");
      el.input.value = "";
      return;
    }

    // push user & render
    history.push({role:"user", content:text, t:Date.now()});
    saveJson(hKey(man), history);
    addBubble("user", text);
    el.input.value = "";

    // build request to API
    const body = {
      man,
      userId,
      history,
      mode: urlMode || "soft",
      memory: { summary, profile },
      pov,
      consented: rx,
    };

    let reply = "";
    try{
      const r = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
      const j = await r.json();
      reply = (j && j.reply) ? String(j.reply) : "(no reply)";
    }catch{
      reply = "Connection hiccup—say that again, love.";
    }

    // append AI reply
    history.push({role:"assistant", content:reply, t:Date.now()});
    trimHistory();
    saveJson(hKey(man), history);
    addBubble("assistant", reply);
  }

})();

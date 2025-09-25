/* Blossom & Blade — chat runtime (stable layout + portrait fallback + demo replies if API fails) */
(() => {
  // -------- URL state --------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();
  const VALID  = ["blade","dylan","alexander","silas","grayson","viper"];
  const pretty = { blade:"Blade", dylan:"Dylan", alexander:"Alexander", silas:"Silas", grayson:"Grayson", viper:"Viper" };

  // Bump when you redeploy to invalidate old localStorage keys
  const V = "9";

  // Demo fallback while backend is flaky. Set to false when the API is fully wired.
  const DEMO_MODE = true;
  const OPENERS = {
    blade:     ["hey you.", "aww, you came to see me."],
    dylan:     ["you came to see me? i won’t pretend i’m not pleased."],
    alexander: ["look who’s here."],
    silas:     ["hey you."],
    grayson:   ["look who’s here."],
    viper:     ["look who’s here."]
  };
  const SOFT = {
    blade:     ["You again? Put that smile away before I steal it.","You look dangerous. I approve.","Got a request, pretty thing?"],
    dylan:     ["Minimal words, maximal smirk. What’s the vibe?","Tell me what you want, rider.","You sound good in my helmet."],
    alexander: ["Right on time. I like that.","We’re keeping it clean. Mostly.","Ask for what you want, kitten."],
    silas:     ["Tuning up. Want a song or a sin?","Use that voice—I like it.","Lean in. Closer."],
    grayson:   ["Careful what you wish for. I deliver.","Your move.","I like obedience… and initiative."],
    viper:     ["Loosen the tie for me.","I’ll behave if you don’t.","You’re late. I forgive you—for now."]
  };

  // -------- DOM --------
  const el = {
    title:          document.getElementById("roomTitle"),
    list:           document.getElementById("messages"),
    input:          document.getElementById("chatInput"),
    send:           document.getElementById("sendBtn"),
    form:           document.getElementById("composer"),
    portrait:       document.getElementById("portraitImg"),
    portraitLabel:  document.getElementById("portraitLabel"),
  };

  // -------- Helpers --------
  const storeKey = (m) => `bnb.v${V}.history.${m || "generic"}`;
  const saveJson = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const loadJson = (k, d=[]) => {
    try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; }
    catch { return d; }
  };
  const scrollToBottom = () => { el.list.scrollTop = el.list.scrollHeight + 9999; };

  function imgPathChat(m){ return `/images/characters/${m}/${m}-chat.webp`; }
  function imgPathCard(m){ return `/images/characters/${m}/${m}-card-on.webp`; }

  function addBubble(role, text){
    const b = document.createElement("div");
    b.className = `bubble ${role}`;
    b.textContent = text;
    el.list.appendChild(b);
    scrollToBottom();
  }

  function renderAll(history){
    el.list.innerHTML = "";
    for(const m of history){
      addBubble(m.role, m.content);
    }
  }

  // -------- Portrait setup --------
  (function setPortrait(){
    const img = el.portrait;
    if(!img) return;
    const valid = VALID.includes(man);
    img.alt = valid ? `${pretty[man]} — portrait` : "portrait";
    if (el.portraitLabel) el.portraitLabel.textContent = valid ? `${pretty[man]} — portrait` : "";
    const fallback = "/images/logo.jpg";
    img.onload = () => {}; // noop, but keeps onerror below clean
    img.onerror = () => { img.onerror = null; img.src = fallback; };
    img.src = valid ? imgPathChat(man) : fallback;
  })();

  // -------- Title --------
  if (VALID.includes(man)){
    el.title.textContent = pretty[man];
    document.title = `Blossom & Blade — ${pretty[man]}`;
  } else {
    el.title.textContent = "Blossom & Blade —";
    document.title = "Blossom & Blade — Chat";
  }

  // -------- History boot --------
  const hKey = storeKey(man || "generic");
  let history = loadJson(hKey, []);

  // First visit to a valid room? seed an opener so it never feels dead.
  if (history.length === 0 && VALID.includes(man)){
    const pool = OPENERS[man] || ["hey you."];
    const first = pool[Math.floor(Math.random()*pool.length)];
    history.push({ role:"assistant", content:first, t: Date.now() });
    saveJson(hKey, history);
  }

  renderAll(history);// ---------- anti-repeat helpers (paste above askAssistant) ----------
const ANTI_REPEAT = {
  blade: [
    "Got a request, pretty thing?",
    "Your move. I deliver.",
    "Tell me what you want—and say it clearly."
  ],
  alexander: [
    "Right on time. I like that.",
    "Go on—surprise me.",
    "What are we doing first?"
  ],
  grayson: [
    "Careful what you wish for. I deliver.",
    "Say the word.",
    "You lead. I’ll make it happen."
  ],
  dylan: [
    "You again? Put that smile away before I steal it.",
    "Hop on—figuratively… unless?",
    "What’s the vibe right now?"
  ],
  viper: [
    "Look who’s here.",
    "You dressed up for me or for trouble?",
    "Speak. I’m listening."
  ],
  silas: [
    "Hey you.",
    "Play me a line, I’ll play you back.",
    "Start us off."
  ]
};

function varyLine(man, fallback){
  const pool = ANTI_REPEAT[man] || [];
  if (!pool.length) return fallback;
  const choices = pool.filter(l => l.toLowerCase() !== (fallback||"").toLowerCase());
  return choices.length ? choices[Math.floor(Math.random()*choices.length)] : pool[0];
}

// -------- Send handler (no dupes + anti-repeat) --------
async function onSend(e){
  e.preventDefault();
  const text = (el.input.value || "").trim();
  if (!text) return;

  // taboo guard if present
  if (typeof BANNED !== "undefined" && BANNED.test(text)){
    addBubble("assistant", "I can’t do that. I’ll keep you safe and stay within the lines, okay?");
    el.input.value = "";
    return;
  }

  // user bubble
  history.push({ role: "user", content: text, t: Date.now() });
  addBubble("user", text);
  el.input.value = "";
  trimHistory();
  saveJson(hKey(man), history);

  // ask the assistant (uses your askAssistant from above)
  let reply = "";
  try {
    reply = await askAssistant(text);
  } catch (err) {
    console.error("askAssistant failed:", err);
    reply = ""; // don’t spam a fallback bubble here
  }
  if (!reply) return;

  // anti-repeat: if reply == last assistant line, swap to a variant
  const norm = s => (s||"").toLowerCase().replace(/[^\w\s]/g,"").trim();
  const lastA = [...history].reverse().find(m => m.role === "assistant")?.content || "";
  if (norm(reply) === norm(lastA)) reply = varyLine(man, reply);

  // append assistant ONCE
  history.push({ role: "assistant", content: reply, t: Date.now() });
  trimHistory();
  saveJson(hKey(man), history);
  addBubble("assistant", reply);
}

  // -------- API call (with demo fallback) --------
  async function askAssistant(userText){
    // If you’re not ready to hit the API, return a soft line.
    if (DEMO_MODE) {
      const pool = SOFT[man] || ["Tell me more."];
      return pool[Math.floor(Math.random()*pool.length)];
    }

    // Real call
    try {
      const body = {
        man, userText,
        history: history.slice(-20), // keep it light
        mode: "soft",
      };
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const reply = (j && j.reply) ? String(j.reply) : "";
      return reply;
    } catch (err){
      console.error("chat send failed:", err);
      // Don’t add a “hiccup” bubble anymore—just soft-fallback so the convo flows.
      const pool = SOFT[man] || ["Tell me more."];
      return pool[Math.floor(Math.random()*pool.length)];
    }
  }

  // -------- Send handler --------
  el.form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (el.input.value || "").trim();
    if (!text) return;

    // user bubble
    history.push({ role:"user", content:text, t: Date.now() });
    addBubble("user", text);
    el.input.value = "";
    saveJson(hKey, history);

    // assistant reply
    const reply = await askAssistant(text);
    if (!reply) return;                       // never double-add
    history.push({ role:"assistant", content:reply, t: Date.now() });
    // Save before rendering so a refresh won’t dupe
    history = history.slice(-50);             // trim
    saveJson(hKey, history);
    addBubble("assistant", reply);
  });

})();

/* Blossom & Blade — chat runtime (2-column layout, bubble colors, no duplicate sends) */
(() => {
  // ---------- URL / roster ----------
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").toLowerCase();

  const VALID = ["blade","dylan","alexander","silas","grayson","viper"];
  const pretty = { blade:"Blade", dylan:"Dylan", alexander:"Alexander", silas:"Silas", grayson:"Grayson", viper:"Viper" };

  const FIRST_LINES = [
    "look who’s here.",
    "aww, you came to see me.",
    "hey you."
  ];

  // ---------- DOM refs ----------
  const el = {
    title: document.getElementById("roomTitle"),
    list: document.getElementById("messages"),
    input: document.getElementById("chatInput"),
    send: document.getElementById("sendBtn"),
    form: document.getElementById("composer"),
    portrait: document.getElementById("portraitImg"),
    portraitLabel: document.getElementById("portraitLabel"),
    panel: document.getElementById("messagePanel"),
  };

  // ---------- helpers ----------
  const logo = "/images/logo.jpg";
  const imgPathChat = (m) => `/images/characters/${m}/${m}-chat.webp`;

  const uidKey = "bnb.userId";
  const hKey   = (m) => `bnb.s.${m}.history`;

  const loadJson = (k, fallback) => {
    try { const x = JSON.parse(localStorage.getItem(k)); return x ?? fallback; } catch { return fallback; }
  };
  const saveJson = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  let history = [];
  let sending = false;

  // bubble DOM
  function addBubble(role, text){
  const li = document.createElement("li");
  li.className = `msg ${role}`;
  li.textContent = text;
  el.list.appendChild(li);

  // auto-scroll to latest
  el.list.scrollTop = el.list.scrollHeight;
}


  function renderAll() {
    el.list.innerHTML = "";
    for (const m of history) addBubble(m.role, m.content);
    el.panel.scrollTop = el.panel.scrollHeight + 9999;
  }

  // ---------- Init title + portrait ----------
  if (VALID.includes(man)) {
    document.title = `Blossom & Blade — ${pretty[man]}`;
    el.title.textContent = pretty[man];
    el.portrait.src = imgPathChat(man);
    el.portrait.alt = `${pretty[man]} portrait`;
    el.portraitLabel.textContent = `${pretty[man]} portrait`;
  } else {
    document.title = "Blossom & Blade — Chat";
    el.title.textContent = "Blossom & Blade —";
    el.portrait.src = logo;
    el.portrait.alt = "Blossom & Blade";
    el.portraitLabel.textContent = "";
  }

  // ---------- Load history + maybe add a first line ----------
  history = loadJson(hKey(man || "logo"), []);

  if (history.length === 0) {
    const first = VALID.includes(man)
      ? FIRST_LINES[Math.floor(Math.random() * FIRST_LINES.length)]
      : "Pick a character from the main page to begin.";
    history.push({ role: "assistant", content: first, t: Date.now() });
    saveJson(hKey(man || "logo"), history);
  }

  renderAll();

  // ---------- Send handling ----------
 async function onSend(e){
  e.preventDefault();

  const text = (el.input.value || "").trim();
  if (!text) return;

  // show user bubble immediately
  history.push({ role: "user", content: text, t: Date.now() });
  saveJson(hKey(man), history);
  addBubble("user", text);
  el.input.value = "";

  // --- build request payload ---
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
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    reply = (j && j.reply) ? String(j.reply) : "";
  } catch (err) {
    // network or server error -> we'll use fallback text below
    reply = "";
  }

  // if backend gave us nothing, show a single gentle fallback line
  if (!reply.trim()) {
    reply = "Lost you for a sec—say that again, love.";
  }

  // append assistant bubble
  history.push({ role: "assistant", content: reply, t: Date.now() });
  trimHistory();
  saveJson(hKey(man), history);
  addBubble("assistant", reply);
}
;

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
      sending = false;
      el.send.disabled = false;
      return;   // <- do NOT add a fallback bubble
    }

    // append AI reply (single!)
    if (!reply) { sending = false; el.send.disabled = false; return; }
    history.push({ role: "assistant", content: reply, t: Date.now() });
    saveJson(hKey(man || "logo"), history);
    addBubble("assistant", reply);

    sending = false;
    el.send.disabled = false;
  }

  // listeners
  el.form.addEventListener("submit", onSend);
  el.send.addEventListener("click", () => el.form.requestSubmit());

  // convenience: Enter sends, Shift+Enter makes newline (for future textarea)
  el.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      el.form.requestSubmit();
    }
  });
})();

// Blossom & Blade — Chat (front-end only; safe fallback if backend is offline)
(function () {
  const $ = (s) => document.querySelector(s);

  // --- DOM ----
  const form = $("#chat-form");
  const input = $("#chat-input");
  const sendBtn = $("#send-btn");
  const list = $("#messages");
  const portraitImg = $("#portraitImg");
  const chatName = $("#chatName");

  // --- URL params ---
  const params = new URLSearchParams(location.search);
  const man = (params.get("man") || "alexander").toLowerCase();
  const sub = (params.get("sub") || "night").toLowerCase();

  // --- UI header name ---
  chatName.textContent = man.charAt(0).toUpperCase() + man.slice(1);

  // --- Portrait: try -chat.webp then fall back to -card-on.webp ---
  const portraitTry = [
    `images/characters/${man}/${man}-chat.webp`,
    `images/characters/${man}/${man}-card-on.webp`,
  ];
  (function setPortrait(i = 0) {
    if (!portraitImg) return;
    portraitImg.src = portraitTry[i] || "";
    portraitImg.onerror = () => {
      if (i + 1 < portraitTry.length) setPortrait(i + 1);
    };
  })();

  // --- Storage key (per man/sub) ---
  const STORE_KEY = `bb_chat_${man}_${sub}`;

  // --- Render / Save / Restore ---
  function render(role, text) {
    const li = document.createElement("li");
    li.className = `msg ${role}`;
    li.dataset.role = role;
    li.innerHTML = `<div class="bubble">${text}</div>`;
    list.appendChild(li);
    list.parentElement.scrollTop = list.parentElement.scrollHeight;
  }

  function save() {
    const payload = [...list.querySelectorAll(".msg")].map((m) => ({
      role: m.dataset.role,
      text: m.querySelector(".bubble").textContent
    }));
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      saved.forEach((m) => render(m.role, m.text));
    } catch {}
  }

  restore();
  window.addEventListener("beforeunload", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });

  function disable(on) {
    if (sendBtn) sendBtn.disabled = on;
    if (input) input.disabled = on;
  }

  // --- Local fallback reply (works even with no backend) ---
  const OPENERS = {
    blade: [
      "You again? Good. I was about to come find you.",
      "Thought you'd ghost me. Brave to show up, pretty thing."
    ],
    dylan: [
      "Helmet’s off. You caught me between rides.",
      "Sit tight—tell me what kind of trouble you want."
    ],
    jesse: [
      "Sunset’s good, but you look better walking in.",
      "You took your time, cowgirl."
    ],
    alexander: [
      "Right on time. I like that.",
      "You look like you want to be spoiled. I can arrange it."
    ],
    silas: [
      "Tuned up and waiting. Play me something—your move.",
      "Pull up. Let’s make the neighbors curious."
    ],
    grayson: [
      "Rules are simple: be good… or I make you good.",
      "Kincade hours. Come closer."
    ]
  };

  function personaReply(userText) {
    const pool = OPENERS[man] || OPENERS.alexander;
    // light, flirty, short; avoids pushy/explicit; nod to what she said
    const hint = (userText || "").slice(0, 80);
    const line = pool[Math.floor(Math.random() * pool.length)];
    const tease = hint ? ` ${/^[.?!]/.test(hint) ? "" : "—"} ${hint.replace(/\s+/g," ").trim()}` : "";
    return `${line}${tease}`;
  }

  // --- Try backend; if it fails, fall back to local personaReply() ---
  async function getReply(messages) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ man, sub, messages }),
      });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      const text = (data && (data.reply || data.text)) || "";
      if (!text.trim()) throw new Error("empty");
      return text.trim();
    } catch {
      // local fallback
      const lastUser = messages.slice().reverse().find(m => m.role === "user");
      return personaReply(lastUser?.content || lastUser?.text || "");
    }
  }

  // --- Submit handler (prevents page reload!) ---
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();                 // <<<<< stops the page from reloading
    const prompt = (input?.value || "").trim();
    if (!prompt) return;

    render("user", prompt);
    save();
    input.value = "";
    disable(true);

    // Build message history for backend; also works for local fallback
    const history = JSON.parse(localStorage.getItem(STORE_KEY) || "[]")
      .map(m => ({ role: m.role, content: m.text }));
    const messages = [
      { role: "system", content: `You are ${man} from Blossom & Blade. Keep replies short, flirty, warm; follow the user's lead; never be pushy.` },
      ...history,
      { role: "user", content: prompt }
    ];

    let reply = "";
    try {
      reply = await getReply(messages);
    } catch {
      reply = "…";
    }

    render("assistant", reply);
    save();
    disable(false);
    input?.focus();
  });

  // allow Enter to send (default in forms), Shift+Enter for newline if needed
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.stopPropagation(); // let it insert a newline if it's a textarea later
    }
  });
})();

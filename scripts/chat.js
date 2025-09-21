// scripts/chat.js  —  robust chat boot + error handling

(() => {
  const qs = new URLSearchParams(location.search);
  const man = (qs.get("man") || "").trim().toLowerCase();   // e.g., blade, dylan, jesse, alexander, grayson, silas
  const sub = (qs.get("sub") || "night").trim().toLowerCase();

  // Character registry (names and image paths must match your repo)
  const CHARACTERS = {
    blade:     { label: "Blade",     card: "/images/characters/blade/blade-card-on.webp" },
    dylan:     { label: "Dylan",     card: "/images/characters/dylan/dylan-card-on.webp" },
    jesse:     { label: "Jesse",     card: "/images/characters/jesse/jesse-card-on.webp" },
    alexander: { label: "Alexander", card: "/images/characters/alexander/alexander-card-on.webp" },
    grayson:   { label: "Grayson",   card: "/images/characters/grayson/grayson-card-on.webp" },
    silas:     { label: "Silas",     card: "/images/characters/silas/silas-card-on.webp" },
  };

  // Flirty/cute openers (kept short)
  const OPENERS = [
    "hey there, look who wandered in 👀",
    "aww, you came to see me?",
    "there you are—was just thinking about you.",
    "hi trouble. miss me?",
    "well, well… fancy seeing you here."
  ];

  // DOM
  const titleEl   = document.querySelector("header h1, .title, .brand, .hdr") || document.body; // fallback
  const msgsWrap  = document.querySelector(".msgs") || document.querySelector(".chat") || document;
  const inputEl   = document.querySelector("input[type='text'], textarea, .inputbar input, .inputbar textarea");
  const sendBtn   = document.querySelector("button[type='submit'], .send, .send-btn, .inputbar button");
  const portrait  = document.querySelector(".portrait") || document.querySelector(".side") || document;

  // Basic guards
  const char = CHARACTERS[man];
  const safeLabel = char?.label ?? "…";

  // Paint header nicely even if something’s missing
  try {
    const hdr = document.querySelector(".hdr-title") || document.querySelector("h1");
    if (hdr) hdr.textContent = `BnB — Chat — ${safeLabel}`;
  } catch { /* ignore */ }

  // Fill portrait (if element exists and we have an image)
  (function mountPortrait() {
    if (!char) return; // unknown man; leave blank
    if (!portrait) return;
    // If this element is the right-hand card wrapper (like your chat layout), we inject a simple figure
    if (!portrait.querySelector("img")) {
      const fig = document.createElement("figure");
      fig.className = "portrait";
      fig.innerHTML = `<img alt="${char.label}" src="${char.card}" loading="eager" decoding="async" style="display:block;width:100%;height:auto;border-radius:14px;">`;
      portrait.appendChild(fig);
    } else {
      // or just swap the src if an <img> exists
      const img = portrait.querySelector("img");
      if (img && char.card) img.src = char.card;
    }
  })();

  // Utilities
  const el = {
    bubble(text, who = "bot") {
      const wrap = document.createElement("div");
      wrap.className = `msg ${who}`;
      wrap.innerHTML = `<div class="b">${escapeHtml(text)}</div>`;
      msgsWrap.appendChild(wrap);
      msgsWrap.scrollTop = msgsWrap.scrollHeight;
      return wrap;
    },
    typing() {
      const wrap = document.createElement("div");
      wrap.className = "msg bot typing";
      wrap.innerHTML = `<div class="b">…</div>`;
      msgsWrap.appendChild(wrap);
      msgsWrap.scrollTop = msgsWrap.scrollHeight;
      return wrap;
    },
    replaceTyping(typingEl, text) {
      if (!typingEl) return el.bubble(text, "bot");
      typingEl.classList.remove("typing");
      typingEl.querySelector(".b").textContent = text;
      return typingEl;
    }
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  // Front-end state (kept tiny)
  const state = {
    history: [],  // {role:'user'|'assistant', content:string}[]
    booted: false
  };

  // Talk to your API, but never go silent—always show *something* within 10s
  async function askLLM(userText) {
    const payload = {
      man: char?.label || man || "Unknown",
      sub,
      history: state.history,
      text: userText
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s hard timeout

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        // Surface backend error text, if any
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (!data || !data.reply) throw new Error("Empty reply");
      return data.reply;
    } catch (err) {
      // Friendly fallback:
      return "ugh—my signal glitched for a sec. say that again? I’m listening now.";
    }
  }

  async function handleSend(text) {
    const msg = text.trim();
    if (!msg) return;

    // show user bubble
    el.bubble(msg, "me");
    state.history.push({ role: "user", content: msg });
    inputEl.value = "";
    inputEl.focus();

    // show typing…
    const typingEl = el.typing();
    sendBtn.disabled = true;

    // ask LLM
    const reply = await askLLM(msg);
    state.history.push({ role: "assistant", content: reply });
    el.replaceTyping(typingEl, reply);

    sendBtn.disabled = false;
  }

  function boot() {
    // If unknown character (bad/missing ?man=), we’ll guide the user instead of going blank
    if (!char) {
      el.bubble("Pick a guy from the home page, then come back. I’ll be waiting. 💬");
      inputEl?.setAttribute("placeholder", "Go back and choose a card…");
      sendBtn?.setAttribute("disabled", "true");
      return;
    }

    // First opener
    const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
    state.history.push({ role: "assistant", content: opener });
    el.bubble(opener, "bot");
    state.booted = true;

    // Make sure input is ready
    if (inputEl) inputEl.placeholder = "Say hi…";
  }

  // Wire up UI
  function onReady() {
    // Send on button
    if (sendBtn) {
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        handleSend(inputEl?.value || "");
      });
    }
    // Enter to send
    if (inputEl) {
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend(inputEl.value || "");
        }
      });
    }
    boot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();

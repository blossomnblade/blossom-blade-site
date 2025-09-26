/* scripts/chat.js — one-file drop-in
   - Injects minimal CSS (so you don’t have to touch stylesheets)
   - Portrait fills a perfect square; hides figcaptions/captions
   - Per-character portrait + background (day/night)
   - Solid chat loop with anti-repeat + gentle variety
   - Uses /api/chat with history slice; soft fallback if API fails
*/
"use strict";

/* =============== Minimal CSS injection (UI hardening) =============== */
(function injectChatCSS() {
  const css = `
  .chat-room{display:grid;grid-template-rows:auto 1fr auto;gap:16px}
  #feed,.messages,.chat-feed{list-style:none;margin:0;padding:0 0 96px;max-height:100%}
  #feed li,.messages li,.chat-feed li{list-style:none}
  .bubble{white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere}

  /* Composer stays pinned if your layout supports it */
  .chat-composer,#composer{position:sticky;bottom:0;z-index:3}

  /* === Portrait: force a clean, square crop in its box === */
  #portrait,.portrait{
    width:100%;
    aspect-ratio:1 / 1;        /* perfect square */
    height:auto;                /* let aspect-ratio set height from width */
    object-fit:cover;           /* crop without distortion */
    border-radius:12px;
    display:block;
  }

  /* If the portrait lives inside a figure with a caption, hide the caption line */
  figure figcaption,.figcaption,.credit,.caption{display:none !important}

  /* Optional: if your chat slab/window overlays a background */
  .has-bg .chat-slab,.has-bg .chat-window{
    background:rgba(10,16,22,.5);
    backdrop-filter:blur(2px);
    border-radius:16px
  }
  `;
  const style = document.createElement("style");
  style.setAttribute("data-injected", "chat-css");
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ======================== Asset mappings =========================== */
/* Expect chat.html?man=blade&sub=night (sub=day for bright landing) */
const PORTRAITS = {
  alexander: "images/characters/alexander/alexander-chat.webp",
  blade:     "images/characters/blade/blade-chat.webp",
  dylan:     "images/characters/dylan/dylan-chat.webp",
  grayson:   "images/characters/grayson/grayson-chat.webp",
  silas:     "images/characters/silas/silas-chat.webp",
  viper:     "images/characters/viper/viper-chat.webp",
};

const BACKGROUNDS = {
  default: {
    day:   "images/bg_dark_romance.jpg", // bright / landing
    night: "images/gothic-bg.jpg",       // dark / paywall
  },
  alexander: { day: "images/bg_alexander_boardroom.jpg", night: "images/gothic-bg.jpg" },
  blade:     { day: "images/blade-woods.jpg",            night: "images/blade-woods.jpg" },
  dylan:     { day: "images/dylan-garage.jpg",           night: "images/dylan-garage.jpg" },
  grayson:   { day: "images/grayson-bg.jpg",             night: "images/grayson-bg.jpg" },
  silas:     { day: "images/bg_silas_stage.jpg",         night: "images/bg_silas_stage.jpg" },
  viper:     { day: "images/gothic-bg.jpg",              night: "images/gothic-bg.jpg" }, // update later with Viper bg
};

/* ======================== Soft persona lines ======================= */
const SOFT = {
  alexander: [
    "Right on time. I like that.",
    "Tell me one small good thing from your day.",
    "Spicy, huh? You want me to take control?",
    "Pressed against the cool wood—hands braced—slow or rough?",
  ],
  blade: [
    "You again? Put that smile away before I steal it.",
    "Tell me what you want, rider.",
    "Close—closer. Use me.",
    "You came to see me. I won’t pretend I’m not pleased.",
  ],
  dylan: [
    "Minimal words, maximal smirk. What’s the vibe?",
    "You sound good in my helmet.",
    "Keep it tight. What’s the move?",
    "Tell me what you want, rider.",
  ],
  grayson: [
    "Your move.",
    "Careful what you wish for. I deliver.",
    "Say it clean. I’ll make it happen.",
    "I’m listening. Direct and deliberate.",
  ],
  silas: [
    "Hey you.",
    "Say that again, love.",
    "One small good thing from your day.",
    "You’re here. That helps.",
  ],
  viper: [
    "Smile—this is going to get loud.",
    "Two words—make it wild.",
    "Don’t stall. Give me the dare.",
    "Make it quick—or make it interesting.",
  ],
};

/* =========================== Helpers =============================== */
const qs = (k, d="") => new URL(location.href).searchParams.get(k) || d;
const man  = qs("man", "viper").toLowerCase();
const sub  = qs("sub", "night").toLowerCase();     // "day" or "night"
const DEMO_MODE = false; // flip true if you want to force soft responses

function $(sel) { return document.querySelector(sel); }

function pickPortrait(m) {
  return PORTRAITS[m] || PORTRAITS.viper;
}
function pickBackground(m, s) {
  const theme = (s || "night").toLowerCase();
  const table = BACKGROUNDS[m] || BACKGROUNDS.default;
  return table[theme] || BACKGROUNDS.default[theme];
}

function applyAssets() {
  const img = $("#portrait, .portrait");
  if (img) {
    img.src = pickPortrait(man);
    img.alt = `${man} — portrait`;
    img.onerror = () => { img.style.visibility = "hidden"; };
  }
  const bg = pickBackground(man, sub);
  document.body.style.backgroundImage = `url("${bg}")`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center center";
  document.body.classList.add("has-bg");
}

/* localStorage key per guy */
const STORE_KEY = `bb.history.${man}`;

/* keep history compact */
function trimHistory(arr, max=40) {
  if (!Array.isArray(arr)) return [];
  if (arr.length > max) return arr.slice(arr.length - max);
  return arr;
}
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveHistory(arr) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(trimHistory(arr)));
  } catch (e) { console.warn("saveHistory failed", e); }
}

/* scroll helper */
function scrollToBottom() {
  const feed = $("#feed") || $(".messages") || $(".chat-feed");
  if (feed) feed.scrollTop = feed.scrollHeight;
}

/* bubble write */
function addBubble(role, content) {
  const feed = $("#feed") || $(".messages") || $(".chat-feed");
  if (!feed) return;

  const isList = feed.tagName === "UL" || feed.tagName === "OL";
  const el = document.createElement(isList ? "li" : "div");
  el.className = `bubble bubble--${role}`;
  el.textContent = content || "";
  feed.appendChild(el);
  scrollToBottom();
}

/* full render */
function renderAll(history) {
  const feed = $("#feed") || $(".messages") || $(".chat-feed");
  if (!feed) return;
  feed.innerHTML = "";
  history.forEach(item => addBubble(item.role, item.content));
}

/* gentle variety to reduce monotony */
function varyLine(m, s) {
  if (!s) return s;
  const core = s.trim();
  const bumpers = {
    viper:     ["Two words—make it wild.", "Smirk for me, Duchess.", "Don’t stall. Give me the dare."],
    blade:     ["You again? Put that smile away before I steal it.", "Tell me what you want, rider.", "I’m right here. Use me."],
    dylan:     ["Minimal words, maximal smirk. What’s the vibe?", "You sound good in my helmet.", "Keep it tight. What’s the move?"],
    grayson:   ["Careful what you wish for. I deliver.", "Your move.", "Say it clean. I’ll make it happen."],
    silas:     ["Hey you.", "Say that again, love.", "One small good thing from your day."],
    alexander: ["Right on time. I like that.", "Tell me one small good thing from your day.", "Oh, you choose."],
  };
  if (Math.random() < 0.25) {
    const list = bumpers[m] || [];
    if (list.length) {
      const add = list[Math.floor(Math.random()*list.length)];
      if (add && !core.toLowerCase().includes(add.toLowerCase())) {
        return `${core}\n\n${add}`;
      }
    }
  }
  return core;
}

/* normalize to compare repeats */
function normLine(s){ return (s||"").toLowerCase().replace(/[^\w\s]/g,"").trim(); }

/* ========================= API call ================================ */
async function askAssistant(userText, history) {
  // demo mode: return a soft line
  if (DEMO_MODE) {
    const pool = SOFT[man] || ["Tell me more."];
    return pool[Math.floor(Math.random()*pool.length)];
  }

  try {
    const body = {
      man,
      userText,
      history: history.slice(-20), // keep request light
      mode: "soft",
    };
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return (j && j.reply) ? String(j.reply) : "";
  } catch (err) {
    console.error("askAssistant failed:", err);
    // soft fallback on failure
    const pool = SOFT[man] || ["Tell me more."];
    return pool[Math.floor(Math.random()*pool.length)];
  }
}

/* ========================== Controller ============================= */
let history = loadHistory();

async function onSend(e) {
  e?.preventDefault?.();

  const input = $("#input, .chat-input, textarea[name='message']") || $("input[type='text']");
  const val = (input && input.value || "").trim();
  if (!val) return;

  // append user
  history.push({ role: "user", content: val, t: Date.now() });
  saveHistory(history);
  addBubble("user", val);
  if (input) input.value = "";

  // ask assistant
  let reply = "";
  try {
    reply = await askAssistant(val, history);
  } catch {
    reply = "";
  }
  if (!reply) return; // nothing to add

  // anti-repeat: if exact same as last assistant, swap to a variant
  const lastA = [...history].reverse().find(m => m.role === "assistant");
  if (lastA && normLine(reply) === normLine(lastA.content)) {
    // pick a soft variant for the same man
    const pool = (SOFT[man] || []).filter(p => normLine(p) !== normLine(lastA.content));
    if (pool.length) reply = pool[Math.floor(Math.random()*pool.length)];
  }

  reply = varyLine(man, reply);

  // append assistant ONCE
  history.push({ role: "assistant", content: reply, t: Date.now() });
  history = trimHistory(history);
  saveHistory(history);
  addBubble("assistant", reply);
}

/* Reset button (optional) */
function wireReset() {
  const btn = $("#reset, .reset-chat");
  if (!btn) return;
  btn.addEventListener("click", () => {
    history = [];
    saveHistory(history);
    renderAll(history);
  });
}

/* wire enter key on the composer form */
function wireForm() {
  const form = $("#composer") || $("form.chat-composer") || $("form#composer");
  if (form) {
    form.addEventListener("submit", onSend);
  } else {
    // last resort: wire Enter on main input
    const input = $("#input, .chat-input, textarea[name='message']") || $("input[type='text']");
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) onSend(e);
      });
    }
    const sendBtn = $(".send, #send");
    if (sendBtn) sendBtn.addEventListener("click", onSend);
  }
}

/* ============================ Boot ================================ */
document.addEventListener("DOMContentLoaded", () => {
  applyAssets();
  renderAll(history);
  wireForm();
  wireReset();
  scrollToBottom();
});

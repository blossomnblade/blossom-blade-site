// scripts/chat.js  — Blossom & Blade (drop-in)
/* eslint-disable */

// -------------------------- tiny helpers --------------------------
const $  = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
const on = (el, ev, fn) => el.addEventListener(ev, fn, { passive: true });

const params = new URLSearchParams(location.search);
const man = params.get("man") || "blade";   // persona id in URL
const sub = params.get("sub") || "night";   // theme/variant if you use it

const FEED = $("#feed");
const SAY  = $("#say");
const BTN  = $("#send");

// localStorage key per persona
const hKey = (m) => `bb.history.${m}`;

// keep history light but with timestamps for debug
let history = loadJson(hKey(man)) || [];

// soft openers per persona used as demo/fallback lines
// (kept punchy to reduce repetition feel)
const SOFT = {
  blade: [
    "hey you.",
    "you again? put that smile away before i steal it.",
    "tell me what you want, rider.",
    "mm. closer or behave?",
    "ask for what you want—no flinching."
  ],
  dylan: [
    "you came to see me? i won’t pretend i’m not pleased.",
    "you sound good in my helmet.",
    "minimal words, maximal smirk. what’s the vibe?",
    "tell me what you want, rider."
  ],
  viper: [
    "hey you.",
    "look who’s here.",
    "make it quick or make it interesting.",
    "smile—this is going to get loud.",
    "two words—make it wild."
  ],
  alexander: [
    "mm. you again. good.",
    "right on time. i like that.",
    "i’m listening. closer or should i behave?",
    "one good thing from your day—go."
  ],
  grayson: [
    "your move.",
    "careful what you wish for. i deliver.",
    "look who’s here.",
    "say it like you mean it."
  ],
  silas: [
    "hey you.",
    "start it—I’ll match your tempo.",
    "play a line; I’ll echo the rhythm.",
    "closer. now talk."
  ]
};

// normalize for repeat detection
const norm = (s) => (s || "")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, "")
  .replace(/\s+/g, " ")
  .trim();

// very light “variant” swap if model repeats exact last line
function varyLine(m, line) {
  const pool = (SOFT[m] || SOFT.blade).filter(v => norm(v) !== norm(line));
  if (pool.length === 0) return line;
  return pool[Math.floor(Math.random() * pool.length)];
}

// -------------------------- persistence --------------------------
function saveJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
function loadJson(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } }

// keep only the latest N messages (user+assistant mixed)
function trimHistory(max = 40) {
  if (history.length > max) history = history.slice(-max);
}

// render feed from history
function renderAll(list) {
  FEED.innerHTML = "";
  for (const m of list) addBubble(m.role, m.content);
  queueMicrotask(scrollToBottom);
}

// add one chat bubble
function addBubble(role, text) {
  const li = document.createElement("div");
  li.className = `bubble ${role}`;
  li.innerText = text;
  FEED.appendChild(li);
  // auto-scroll after paint
  requestAnimationFrame(scrollToBottom);
}

function scrollToBottom() {
  const box = $(".chat");
  if (!box) return;
  box.scrollTop = box.scrollHeight + 9999;
}

// -------------------------- network --------------------------

// if you want to switch to “demo only” set to true
const DEMO_MODE = false;

// main API call (with graceful soft fallback)
async function askAssistant(userText) {
  // optional demo; picks a soft line
  if (DEMO_MODE) {
    const pool = SOFT[man] || SOFT.blade;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // build lightweight payload
  const body = {
    man,
    userText,
    history: history.slice(-20),     // keep it light
    mode: "soft"                     // server can use this to pick prompt style
  };

  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const reply = (j && j.reply) ? String(j.reply) : "";
    return reply;
  } catch (err) {
    console.error("askAssistant failed:", err);
    // fallback to a soft line (no “hiccup” bubbles that break vibe)
    const pool = SOFT[man] || SOFT.blade;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

// -------------------------- send flow --------------------------

async function onSend(e) {
  e && e.preventDefault();

  const text = (SAY.value || "").trim();
  if (!text) return;

  // append user bubble immediately
  history.push({ role: "user", content: text, t: Date.now() });
  trimHistory();
  saveJson(hKey(man), history);
  addBubble("user", text);
  SAY.value = "";

  // ask assistant (one call; no duplicate appends)
  let reply = "";
  try {
    reply = await askAssistant(text);
  } catch (err) {
    console.error(err);
    reply = "";
  }

  // if empty for any reason, don’t add a bubble
  if (!reply) return;

  // anti-repeat: compare to last assistant line
  const lastA = [...history].reverse().find(m => m.role === "assistant")?.content || "";
  if (norm(reply) === norm(lastA)) reply = varyLine(man, reply);

  // append assistant ONCE
  history.push({ role: "assistant", content: reply, t: Date.now() });
  trimHistory();
  saveJson(hKey(man), history);
  addBubble("assistant", reply);
}

// -------------------------- boot --------------------------

function wire() {
  if (BTN) on(BTN, "click", onSend);
  if (SAY) on(SAY, "keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(e); }
  });

  renderAll(history);
  scrollToBottom();
}

document.addEventListener("DOMContentLoaded", wire);

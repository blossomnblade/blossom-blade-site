/*
  /scripts/chat.js
  REQUIREMENTS in chat.html:
    - <div id="chat"></div> : message list container
    - <input id="user-input" /> : text box
    - <button id="send-btn">Send</button> : send button (Enter also works)
    - set window.currentCharacter (e.g., from ?g=jesse)
  WHAT THIS FILE PROVIDES:
    - Single opener (no double bug)
    - Enter-to-send
    - Lightweight memory (remembers user's name if they share it)
    - Pacing/escalation rules from VENUS_RULES
    - Strike/ban logging to localStorage with export
    - (Stub) hook where OpenAI API call would go
*/

import { VENUS_RULES, getPersona } from "./prompts.js";

// --- State ---
const ui = {
  chat: document.getElementById("chat"),
  input: document.getElementById("user-input"),
  send: document.getElementById("send-btn"),
};

const urlParams = new URLSearchParams(location.search);
const charKey = (window.currentCharacter || urlParams.get("g") || "blade").toLowerCase();
const persona = getPersona(charKey);

const memory = {
  userName: null,
  turnCount: 0,
  consentGiven: false,
};

const LOG_KEY = "vv_mod_log";

// --- Logging (strike/ban receipts) ---
function logEvent(type, data = {}) {
  const now = new Date().toISOString();
  const entry = { ts: now, type, charKey, ...data };
  const log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  log.push(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}
export function exportLog() {
  const data = localStorage.getItem(LOG_KEY) || "[]";
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `venus-venue-log-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// --- UI helpers ---
function addMsg(who, text) {
  const row = document.createElement("div");
  row.className = `msg msg-${who}`; // style in CSS as needed
  row.textContent = text;
  ui.chat.appendChild(row);
  ui.chat.scrollTop = ui.chat.scrollHeight;
}

function getNameFromText(t) {
  // naive: “I’m Kasey”, “I am Kasey”, “My name is Kasey”
  const patterns = [
    /i['’]m\s+([A-Za-z]+)\b/i,
    /\bi am\s+([A-Za-z]+)\b/i,
    /\bmy name is\s+([A-Za-z]+)\b/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[1];
  }
  return null;
}

function detectConsent(t) {
  const low = t.toLowerCase();
  return VENUS_RULES.pacing.consentKeywords.some(k => low.includes(k.toLowerCase()));
}

// --- Content selection based on pacing ---
function pickLine(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function nextBotLine(userText) {
  // update simple memory
  if (!memory.userName) {
    const maybeName = getNameFromText(userText);
    if (maybeName) memory.userName = maybeName;
  }

  // consent?
  if (VENUS_RULES.pacing.requireConsent && detectConsent(userText)) {
    memory.consentGiven = true;
  }

  const t = memory.turnCount;
  const { minTurnsBeforeSimmer, minTurnsBeforeSteamy } = VENUS_RULES.pacing;

  if (t < minTurnsBeforeSimmer) {
    return pickLine(persona.smalltalk);
  }
  if (t < minTurnsBeforeSteamy) {
    return pickLine(persona.simmer);
  }
  if (memory.consentGiven) {
    return pickLine(persona.steamy);
  }
  // no consent yet → stay at simmer
  return pickLine(persona.simmer);
}

// --- Fake LLM call (stub) ---
async function llmReply(userText, draftText) {
  // If you want to wire OpenAI later, use draftText as the "assistant_suggested"
  // and send persona.vibe, VENUS_RULES.tone, memory.userName as system/context.
  // For now we return the draft as final.
  return draftText.replaceAll("{name}", memory.userName || "you");
}

// --- Send handler ---
async function handleSend() {
  const txt = (ui.input.value || "").trim();
  if (!txt) return;
  addMsg("user", txt);
  ui.input.value = "";
  memory.turnCount++;

  // moderation example: simple strike on banned words (expand list later)
  const banned = ["violent act", "minor", "explicit"];
  if (banned.some(w => txt.toLowerCase().includes(w))) {
    logEvent("strike", { reason: "banned-term", text: txt });
    addMsg("bot", "Hey—let’s keep this safe and respectful. I can’t go there.");
    return;
  }

  const draft = nextBotLine(txt);
  const reply = await llmReply(txt, draft);
  addMsg("bot", reply);
}

// --- Single opener once ---
function doOpenerOnce() {
  const openedKey = `vv_opened_${charKey}`;
  if (sessionStorage.getItem(openedKey)) return;
  sessionStorage.setItem(openedKey, "1");
  const opener = pickLine(persona.openers);
  addMsg("bot", opener);
}

function attachEvents() {
  ui.send?.addEventListener("click", handleSend);
  ui.input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  });
}

// --- Init ---
(function init() {
  if (!ui.chat || !ui.input) {
    console.warn("Missing #chat or #user-input in chat.html");
  }
  doOpenerOnce();
  attachEvents();
})();

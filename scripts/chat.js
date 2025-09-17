/*
  /scripts/chat.js
  Fixes:
    - Supports ?man= OR ?g= in URL (your links use ?man=)
    - Opener shown once, never reused
    - No-repeat picker across turns (prevents duplicate lines)
    - Respectful governor: blocks pushiness before consent/turn thresholds
    - Cooldown after steamy (forces smalltalk to avoid barrage)
    - Strike/ban log kept
*/

import { VENUS_RULES, getPersona } from "./prompts.js";

// --- UI ---
const ui = {
  chat: document.getElementById("chat"),
  input: document.getElementById("user-input"),
  send: document.getElementById("send-btn"),
};

// --- Character selection (now supports ?man= or ?g=) ---
const url = new URL(location.href);
const charKey = (window.currentCharacter
  || url.searchParams.get("man")
  || url.searchParams.get("g")
  || "blade").toLowerCase();
const persona = getPersona(charKey);

// --- Memory ---
const memory = {
  userName: null,
  turnCount: 0,
  consentGiven: false,
  openerUsed: false,
  recentBotLines: [],        // last 6 lines to avoid repeats
  steamyCooldownLeft: 0,     // after we send steamy, force smalltalk for a bit
};

const LOG_KEY = "vv_mod_log";
const RECENT_LIMIT = 6;

// ---------- Logging ----------
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

// ---------- UI helpers ----------
function addMsg(who, text) {
  const row = document.createElement("div");
  row.className = `msg msg-${who}`;
  row.textContent = text;
  ui.chat.appendChild(row);
  ui.chat.scrollTop = ui.chat.scrollHeight;
}

function getNameFromText(t) {
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

function hasAny(text, words) {
  const low = text.toLowerCase();
  return words.some(w => low.includes(w.toLowerCase()));
}

// ---------- Picker with no-repeat ----------
function pickNoRepeat(pool) {
  // Filter out recently used lines
  const candidates = pool.filter(line => !memory.recentBotLines.includes(line));
  const choicePool = candidates.length ? candidates : pool; // if exhausted, reset
  const line = choicePool[Math.floor(Math.random() * choicePool.length)];
  // track recent lines
  memory.recentBotLines.push(line);
  if (memory.recentBotLines.length > RECENT_LIMIT) {
    memory.recentBotLines.shift();
  }
  return line;
}

// ---------- Pacing / reply selection ----------
function boundariesReply() {
  return pickNoRepeat(persona.boundaries || [
    "Let’s keep it soft and respectful. Your comfort comes first.",
  ]);
}

function nextBotDraft(userText) {
  const { minTurnsBeforeSimmer, minTurnsBeforeSteamy, cooldownAfterSteamy } = VENUS_RULES.pacing;

  // name memory
  if (!memory.userName) {
    const nm = getNameFromText(userText);
    if (nm) memory.userName = nm;
  }

  // consent detection
  if (VENUS_RULES.consentKeywords && hasAny(userText, VENUS_RULES.consentKeywords)) {
    memory.consentGiven = true;
  }

  // explicit/blocked guard
  if (VENUS_RULES.blockedKeywords && hasAny(userText, VENUS_RULES.blockedKeywords)) {
    logEvent("strike", { reason: "blocked-term", text: userText });
    return "I’m here to keep things kind and safe—we can’t go into explicit detail.";
  }

  // If steamy cooldown active, force smalltalk to de-pressurize
  if (memory.steamyCooldownLeft > 0) {
    memory.steamyCooldownLeft--;
    return pickNoRepeat(persona.smalltalk);
  }

  // Early pushiness: if user tries to go spicy before turns/consent → boundaries
  const tryingSpice = hasAny(userText, VENUS_RULES.mildSpiceKeywords || []);
  if ((memory.turnCount < minTurnsBeforeSimmer && tryingSpice) ||
      (memory.turnCount < minTurnsBeforeSteamy && tryingSpice && !memory.consentGiven)) {
    return boundariesReply();
  }

  // Regular pacing
  if (memory.turnCount < minTurnsBeforeSimmer) {
    return pickNoRepeat(persona.smalltalk);
  }
  if (memory.turnCount < minTurnsBeforeSteamy) {
    return pickNoRepeat(persona.simmer);
  }
  if (memory.consentGiven) {
    // enter steamy once we’re allowed, then set cooldown
    memory.steamyCooldownLeft = cooldownAfterSteamy;
    return pickNoRepeat(persona.steamy);
  }
  // No consent yet → stay simmer
  return pickNoRepeat(persona.simmer);
}

// ---------- LLM stub ----------
async function llmReply(userText, draftText) {
  return draftText.replaceAll("{name}", memory.userName || "you");
}

// ---------- Send handler ----------
async function handleSend() {
  const txt = (ui.input.value || "").trim();
  if (!txt) return;

  addMsg("user", txt);
  ui.input.value = "";
  memory.turnCount++;

  const replyDraft = nextBotDraft(txt);
  const reply = await llmReply(txt, replyDraft);
  addMsg("bot", reply);
}

// ---------- Opener (once, never reused) ----------
function doOpenerOnce() {
  const openedKey = `vv_opened_${charKey}`;
  if (sessionStorage.getItem(openedKey)) {
    memory.openerUsed = true;
    return;
  }
  sessionStorage.setItem(openedKey, "1");
  memory.openerUsed = true;
  const opener = pickNoRepeat(persona.openers);
  addMsg("bot", opener);
}

// ---------- Events ----------
function attachEvents() {
  ui.send?.addEventListener("click", handleSend);
  ui.input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  });
}

// ---------- Init ----------
(function init() {
  if (!ui.chat || !ui.input) {
    console.warn("Missing #chat or #user-input in chat.html");
  }
  doOpenerOnce();
  attachEvents();
})();

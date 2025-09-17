/*
  /scripts/chat.js
  - Supports ?man= or ?g=
  - Opener once, never reused
  - No-repeat buffer to prevent duplicate lines
  - Respectful governor before consent/turn thresholds
  - Steamy cooldown to avoid barrage
  - Local strike/ban log with export()
*/

import { VENUS_RULES, getPersona } from "./prompts.js";

const ui = {
  chat: document.getElementById("chat"),
  input: document.getElementById("user-input"),
  send: document.getElementById("send-btn"),
};

const url = new URL(location.href);
const charKey = (window.currentCharacter
  || url.searchParams.get("man")
  || url.searchParams.get("g")
  || "blade").toLowerCase();
const persona = getPersona(charKey);

const memory = {
  userName: null,
  turnCount: 0,
  consentGiven: false,
  recentBotLines: [],
  steamyCooldownLeft: 0,
};

const LOG_KEY = "vv_mod_log";
const RECENT_LIMIT = 6;

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
const hasAny = (text, list) => list?.some(w => text.toLowerCase().includes(w.toLowerCase()));

function pickNoRepeat(pool) {
  const candidates = pool.filter(x => !memory.recentBotLines.includes(x));
  const choicePool = candidates.length ? candidates : pool;
  const line = choicePool[Math.floor(Math.random() * choicePool.length)];
  memory.recentBotLines.push(line);
  if (memory.recentBotLines.length > RECENT_LIMIT) memory.recentBotLines.shift();
  return line;
}

function boundariesReply() {
  const b = persona.boundaries || ["Let’s keep it soft and respectful. Your comfort comes first."];
  return pickNoRepeat(b);
}

function nextBotDraft(userText) {
  const p = VENUS_RULES.pacing;
  if (!memory.userName) {
    const nm = getNameFromText(userText);
    if (nm) memory.userName = nm;
  }
  if (hasAny(userText, VENUS_RULES.consentKeywords || [])) {
    memory.consentGiven = true;
  }
  if (hasAny(userText, VENUS_RULES.blockedKeywords || [])) {
    logEvent("strike", { reason: "blocked-term", text: userText });
    return "I’m here to keep things kind and safe—we can’t go into explicit detail.";
  }

  if (memory.steamyCooldownLeft > 0) {
    memory.steamyCooldownLeft--;
    return pickNoRepeat(persona.smalltalk);
  }

  const hintsSpicy = hasAny(userText, VENUS_RULES.mildSpiceKeywords || []);
  if ((memory.turnCount < p.minTurnsBeforeSimmer && hintsSpicy) ||
      (memory.turnCount < p.minTurnsBeforeSteamy && hintsSpicy && !memory.consentGiven)) {
    return boundariesReply();
  }

  if (memory.turnCount < p.minTurnsBeforeSimmer) return pickNoRepeat(persona.smalltalk);
  if (memory.turnCount < p.minTurnsBeforeSteamy) return pickNoRepeat(persona.simmer);
  if (memory.consentGiven) {
    memory.steamyCooldownLeft = p.cooldownAfterSteamy;
    return pickNoRepeat(persona.steamy);
  }
  return pickNoRepeat(persona.simmer);
}

async function llmReply(userText, draftText) {
  // Keep it simple for now. When wiring a model, use draftText as guidance.
  return draftText.replaceAll("{name}", memory.userName || "you");
}

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

function doOpenerOnce() {
  const key = `vv_opened_${charKey}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  addMsg("bot", pickNoRepeat(persona.openers));
}

(function init() {
  if (!ui.chat || !ui.input || !ui.send) {
    console.warn("Missing chat elements in chat.html");
  }
  doOpenerOnce();
  ui.send.addEventListener("click", handleSend);
  ui.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSend(); }
  });
})();

// /scripts/chat.js
// Minimal chat front-end logic + light relationship memory + signals.

const kKey = (man) => `bb_history_${man}`;
const kProfile = "bb_profile_v1";

let man = new URLSearchParams(location.search).get("man") || "viper";
let sub = new URLSearchParams(location.search).get("sub") || "night";

const elHistory = document.querySelector("#history");
const elInput   = document.querySelector("#say");
const elSend    = document.querySelector("#send");
const elTitle   = document.querySelector("#title");

elTitle && (elTitle.textContent = (man[0]?.toUpperCase() + man.slice(1)) || "Blossom & Blade");

// ───────────── local persistence ─────────────
function loadJson(key, def){ try{ return JSON.parse(localStorage.getItem(key)) || def; }catch(_){ return def; } }
function saveJson(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

let history = loadJson(kKey(man), []);
renderAll(history);

function loadProfile(){ return loadJson(kProfile, { name:"", petName:"", mood:"", notes:"" }); }
function saveProfile(p){ saveJson(kProfile, p); }

// Simple name grabber from "i'm X"/"im X"
function extractName(s=""){
  const m = s.match(/\b(i['’]?m|i am)\s+([a-z][a-z0-9_-]{1,20})\b/i);
  return m ? m[2].replace(/[^a-z0-9_-]/ig,"") : "";
}

// Heuristic “withdrawn” signal (2 short replies in a row or classic deflections)
function deriveSignals(hist, userText){
  const userLines = hist.filter(h=>h.role==="user").slice(-3).map(h=>h.content);
  const short = (t) => (t || "").trim().split(/\s+/).length <= 3;
  const withdrawnWords = ["idk","fine","whatever","tired","busy","ok","k","nothing"];
  const withdrawn = [...userLines, userText].filter(Boolean).some(t=>{
    const n = t.toLowerCase().trim();
    return short(n) && withdrawnWords.includes(n);
  });

  const shortRun = userLines.length >= 2 && short(userLines[userLines.length-1]) && short(userLines[userLines.length-2]);

  return {
    firstTurns: hist.length < 4,
    shortReplies: shortRun || short(userText),
    withdrawn: withdrawn
  };
}

// Update relationship memory from user text
function updateProfileFromUserText(userText){
  if (!userText) return;
  const p = loadProfile();

  // Name
  if (!p.name) {
    const got = extractName(userText);
    if (got) p.name = got[0].toUpperCase() + got.slice(1).toLowerCase();
  }

  // Mood snapshots (very light)
  const t = userText.toLowerCase();
  if (/\b(bad day|stressed|tired|lonely|down|sad)\b/.test(t)) p.mood = "low";
  if (/\b(happy|excited|great|good day|fun)\b/.test(t)) p.mood = "up";

  saveProfile(p);
  return p;
}

// ───────────── rendering ─────────────
function bubble(role, text){
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  elHistory.appendChild(div);
  elHistory.scrollTop = elHistory.scrollHeight;
}

function renderAll(hist){
  elHistory.innerHTML = "";
  hist.forEach(m => bubble(m.role, m.content));
}

// ───────────── send flow ─────────────
async function onSend(){
  const text = (elInput.value || "").trim();
  if (!text) return;

  // client memory/signals
  const profile = updateProfileFromUserText(text) || loadProfile();
  const signals = deriveSignals(history, text);

  history.push({ role: "user", content: text, t: Date.now() });
  saveJson(kKey(man), history);
  bubble("user", text);
  elInput.value = "";

  // Build body for API
  const body = {
    man,
    userText: text,
    history: history.slice(-50),        // keep more context, steadier voice
    mode: "soft",
    pov: "",
    consented: true,
    memory: {
      name: profile.name || "",
      petName: profile.petName || "",   // optional: set this once elsewhere in UI
      mood: profile.mood || "",
      notes: profile.notes || ""
    },
    signals
  };

  let reply = "";
  try{
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body)
    });
    const j = await r.json();
    reply = (j && j.reply) ? String(j.reply) : "";
  } catch (err){
    console.error("chat send failed:", err);
    reply = "Lost you for a sec—say it again, and tell me what you need from me.";
  }

  if (reply){
    history.push({ role:"assistant", content: reply, t: Date.now() });
    saveJson(kKey(man), history);
    bubble("assistant", reply);
  }
}

elSend?.addEventListener("click", onSend);
elInput?.addEventListener("keydown", (e)=>{ if (e.key==="Enter" && !e.shiftKey) onSend(); });

// Simple reset hotkey: R
document.addEventListener("keydown", (e)=>{
  if (e.key.toLowerCase() === "r" && (e.ctrlKey || e.metaKey)) {
    history = [];
    saveJson(kKey(man), history);
    renderAll(history);
  }
});

/* scripts/chat.js  — Blossom & Blade
   Full front-end chat controller.
   - Loads portrait based on ?man=<name>&sub=<day|night>
   - Seeds a short flirty opener (no stage directions)
   - Stores conversation in localStorage per character/mode
   - Auto-scrolls on every new message
   - Calls window.bnbBrain.reply(...) if available, else POST /api/chat, else smart fallback
*/

/* ========= tiny helpers ========= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const params = new URLSearchParams(location.search);
const man  = (params.get('man') || 'blade').toLowerCase();
const mode = (params.get('sub') || 'night').toLowerCase();  // not used heavily yet but saved in key

const chatForm   = $('#chat-form') || null;
const inputEl    = $('#chat-input') || $('input, textarea');
const sendBtn    = $('#send-btn') || $('.send') || $('button[type="submit"]');
const scrollerEl = $('.messages-scroll');
const messagesUl = $('#messages');
const portrait   = $('#portraitImg');

/* ========= character directory & openers ========= */
const CHAR = {
  blade:      { name: 'Blade',      portrait: 'images/characters/blade/blade-chat.webp',
                openers: ["look who’s here.", "hey, trouble.", "miss me? come closer."] },
  dylan:      { name: 'Dylan',      portrait: 'images/characters/dylan/dylan-chat.webp',
                openers: ["helmet’s off. your turn—what happened today?", "you made it. talk to me.", "good timing—what’s the vibe right now?"] },
  jesse:      { name: 'Jesse',      portrait: 'images/characters/jesse/jesse-chat.webp',
                openers: ["sun’s down, cowgirl. what kind of trouble are we starting?", "there you are. i was about to come find you.", "i’ve got time and a grin—what’s first?"] },
  alexander:  { name: 'Alexander',  portrait: 'images/characters/alexander/alexander-chat.webp',
                openers: ["mm. you again. good.", "there you are. i like your timing.", "i’m listening—brief me."] },
  grayson:    { name: 'Grayson',    portrait: 'images/characters/grayson/grayson-chat.webp',
                openers: ["you’re late. worth the wait?", "room’s clear. you—talk.", "i’ve got you—what do you need?"] },
  silas:      { name: 'Silas',      portrait: 'images/characters/silas/silas-chat.webp',
                openers: ["you found me. sit. what’s your mood?", "hey, golden. hum me your day in one line.", "come keep me company—what’s the riff?"] },
};

const current = CHAR[man] || CHAR.blade;

/* ========= storage ========= */
const STORE_KEY = `bnb.chat.v3.${man}.${mode}`;
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
  catch {}
}

/* ========= ui helpers ========= */
function scrollToBottom() {
  if (!scrollerEl) return;
  scrollerEl.scrollTop = scrollerEl.scrollHeight;
}

function sanitizeText(s) {
  if (!s) return '';
  let t = String(s);

  // Strip common "stage directions" e.g., (smiles), [sighs], *laughs*
  t = t.replace(/(^|\s)[\*\(\[][^)\]\*]{0,80}[\)\]\*](?=\s|$)/gi, '');   // remove inline asides
  t = t.replace(/^[\s\-–—:,.!]+|[\s\-–—:,.!]+$/g, '');                   // trim punctuation fluff
  // Collapse whitespace
  t = t.replace(/\s+/g, ' ').trim();

  // Keep it under ~320 chars to avoid wall-of-text on mobile
  if (t.length > 320) t = t.slice(0, 317).trim() + '…';
  return t;
}

function bubbleHTML(text) {
  return `<div class="bubble">${text}</div>`;
}

function appendBubble(who, rawText) {
  const text = sanitizeText(rawText);
  if (!text) return;

  const li = document.createElement('li');
  li.className = `msg ${who}`;
  li.innerHTML = bubbleHTML(text);
  messagesUl.appendChild(li);

  // Let layout update, then scroll
  requestAnimationFrame(scrollToBottom);
}

function renderHistory(list) {
  messagesUl.innerHTML = '';
  list.forEach(m => appendBubble(m.role === 'user' ? 'user' : 'assistant', m.content));
}

/* ========= portrait & page header ========= */
(function initPortrait(){
  if (!portrait) return;
  // Cache-bust lightly when we ship image changes
  const v = '3';
  portrait.src = `${current.portrait}?v=${v}`;
  portrait.alt = `${current.name} — chat portrait`;
})();

(function setHeaderName(){
  const nameSlot = $('#chatName') || $('h1 span');
  if (nameSlot) nameSlot.textContent = current.name;
})();

/* ========= first message (opener) ========= */
let chatHistory = loadHistory(); // [{role:'assistant'|'user', content:'...'}]

if (!chatHistory.length) {
  const opener = (current.openers[Math.floor(Math.random()*current.openers.length)]) || "hey there.";
  chatHistory.push({ role: 'assistant', content: opener });
  saveHistory(chatHistory);
}
renderHistory(chatHistory);

/* ========= reply engine ========= */
// Prefer a site-provided brain if present
async function brainReply(history, userText) {
  // 1) window.bnbBrain.reply(history, {man, mode, message})
  try {
    if (window.bnbBrain && typeof window.bnbBrain.reply === 'function') {
      const r = await window.bnbBrain.reply(history, { man, mode, message: userText });
      if (r) return String(r);
    }
  } catch (e) { /* fall through */ }

  // 2) POST /api/chat (common serverless shape)
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ man, mode, history, message: userText })
    });
    if (res.ok) {
      const data = await res.json().catch(()=>null);
      if (data && data.reply) return String(data.reply);
      const txt = await res.text();
      if (txt) return String(txt);
    }
  } catch (e) { /* fall through */ }

  // 3) Smart local fallback: short, flirty, inquisitive
  const u = (userText || '').toLowerCase();
  if (u.includes('book') || u.includes('read'))
    return "nice. what’s the plot twist you didn’t see coming?";
  if (u.includes('work') || u.includes('boss'))
    return "office politics again—want me to make someone a little jealous for you?";
  if (u.includes('tired') || u.includes('long day'))
    return "come here. one small good thing from today—i’ll wait.";
  if (u.endsWith('?'))
    return "tempting. what do you want me to say—honest or sweet?";
  return "mm. tell me one small good thing from your day.";
}

/* ========= send handler ========= */
async function handleSend(ev){
  if (ev) ev.preventDefault();

  const val = (inputEl && inputEl.value) ? inputEl.value.trim() : '';
  if (!val) return;

  // Show user bubble immediately
  appendBubble('user', val);
  chatHistory.push({ role:'user', content: val });
  saveHistory(chatHistory);

  // Guard submit
  if (sendBtn) sendBtn.disabled = true;
  if (inputEl) {
    inputEl.value = '';
    inputEl.placeholder = '…';
  }

  try {
    const replyRaw = await brainReply(chatHistory, val);
    const reply = sanitizeText(replyRaw);
    if (reply) {
      appendBubble('assistant', reply);
      chatHistory.push({ role:'assistant', content: reply });
      saveHistory(chatHistory);
    }
  } catch (e) {
    appendBubble('assistant', "connection’s glitchy. say it again and i’m all yours.");
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (inputEl) {
      inputEl.placeholder = 'Say hi…';
      inputEl.focus();
    }
  }
}

/* ========= wire up ========= */
if (chatForm) {
  chatForm.addEventListener('submit', handleSend);
} else if (sendBtn) {
  sendBtn.addEventListener('click', handleSend);
  // Also allow Enter in the input if there's no <form>
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }
}

/* ========= quality: keep view tidy on resize & load ========= */
window.addEventListener('load', scrollToBottom, { once:true });
window.addEventListener('resize', () => { requestAnimationFrame(scrollToBottom); });

/* ========= tiny safety: strip any leftover filename labels under portrait (belt & suspenders) ========= */
document.addEventListener('DOMContentLoaded', () => {
  const p = document.querySelector('#portrait');
  if (!p) return;
  [...p.childNodes].forEach(n => {
    if (n.nodeType === 3 && /\.(webp|jpe?g|png|gif)$/i.test((n.textContent||'').trim())) n.remove();
  });
  p.querySelectorAll('small, figcaption, a, span, div').forEach(el=>{
    if (/\.(webp|jpe?g|png|gif)$/i.test((el.textContent||'').trim())) el.remove();
  });
});

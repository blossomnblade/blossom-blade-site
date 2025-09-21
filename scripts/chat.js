// scripts/chat.js
// Clean openers, flirty/witty style, no bracketed “stage directions”.

import { getOpener, buildSystem, personaLabel } from './prompt.js';

(() => {
  // ------- tiny helpers -------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn) => el.addEventListener(ev, fn);

  const chatWrap = $('.chat') || $('.chat-wrap'); // scroll container
  let inputEl = $('#chat-input') || $('.inputbar input') || $('.inputbar textarea');
  const sendBtn = $('#send-btn') || $('.send, button.send, #send');

  // Build input UI if missing (fallback)
  if (!inputEl) {
    const bar = document.createElement('div');
    bar.className = 'inputbar';
    bar.innerHTML = `<input id="chat-input" type="text" placeholder="Say hi…"><button id="send-btn" class="send">Send</button>`;
    ($('.wrap') || document.body).appendChild(bar);
    inputEl = $('#chat-input');
  }

  // Params
  const params = new URLSearchParams(location.search);
  const man  = (params.get('man') || 'blade').toLowerCase();
  const mode = (params.get('sub') || 'night').toLowerCase();

  const memKey = (k) => `bnb.${man}.${k}`;

  // UI labels & portrait
  const chatNameEl = $('#chatName') || $('#chatname') || $('header h1 span');
  if (chatNameEl) chatNameEl.textContent = personaLabel(man);

  const portraitImg = $('#portraitImg') || $('#portrait img') || $('#portrait');
  if (portraitImg && !portraitImg.src) {
    // default to the “chat” portrait if present
    // (your folders are images/characters/<man>/<man>-chat.webp)
    try {
      const base = `/images/characters/${man}/${man}-chat.webp`;
      portraitImg.src = base;
      portraitImg.alt = `${personaLabel(man)} portrait`;
      portraitImg.loading = 'lazy';
      portraitImg.decoding = 'async';
    } catch {}
  }

  // Message rendering
  const msgList = $('#messages') || (() => {
    const ul = document.createElement('ul');
    ul.id = 'messages';
    ul.className = 'messages';
    const scroll = $('.messages-scroll') || document.createElement('div');
    if (!scroll.classList.contains('messages-scroll')) {
      scroll.className = 'messages-scroll';
      (chatWrap || document.body).prepend(scroll);
    }
    scroll.appendChild(ul);
    return ul;
  })();

  const addBubble = (role, text) => {
    if (!text) return;
    const li = document.createElement('li');
    li.className = `msg ${role}`;
    li.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    msgList.appendChild(li);
    msgList.parentElement.scrollTop = msgList.parentElement.scrollHeight + 9999;
  };

  const escapeHtml = (s='') => s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  // History
  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(memKey('thread')) || '[]'); }
    catch { return []; }
  };
  const saveHistory = (arr) => localStorage.setItem(memKey('thread'), JSON.stringify(arr));

  let thread = loadHistory(); // [{role:'user'|'assistant', content:'...'}]

  // First-time opener
  if (!thread.length) {
    addBubble('assistant', getOpener(man, mode));
    thread.push({ role: 'assistant', content: getOpener(man, mode) });
    saveHistory(thread);
  } else {
    // Render existing
    thread.forEach(m => addBubble(m.role, m.content));
  }

  // Strip any parenthetical stage directions the model might emit
  function stripMeta(s) {
    if (!s) return s;
    // remove short parentheticals that look like stage directions
    // e.g. (low voice), (smirks), (alpha tone), (leans in)
    return s.replace(/\(([^)]{0,80})\)/g, (m, inner) => {
      const hint = inner.toLowerCase();
      const triggers = [
        'voice','tone','smirk','smirks','grin','leans','stage','alpha',
        'instruction','aside','whisper','growl','moan','beat','pause'
      ];
      return triggers.some(t => hint.includes(t)) ? '' : m;
    }).replace(/\s{2,}/g,' ').trim();
  }

  // Turn thread into OpenAI messages
  const buildMessages = (userText) => {
    const sys = buildSystem(man, mode);
    const base = [{ role: 'system', content: sys }];
    const clipped = thread.slice(-12); // keep it lean
    const msgs = base.concat(clipped);
    if (userText) msgs.push({ role: 'user', content: userText });
    return msgs;
  };

  // Call your API (robust to a couple of common shapes)
  async function askLLM(userText) {
    const body = { messages: buildMessages(userText), man, mode };
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json().catch(() => ({}));

    // common shapes: {text}, {reply}, OpenAI proxy {choices:[{message:{content}}]}
    let text =
      data.text ||
      data.reply ||
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      '';

    text = stripMeta(text);

    // keep it tight; occasionally models ramble
    if (text.split(/\s+/).length > 45) {
      text = text.split(/\.(\s|$)/).slice(0,2).join('.').trim();
    }
    return text || "Say that again, but slower—I got distracted by you.";
  }

  // Send flow
  async function handleSend() {
    const val = (inputEl.value || '').trim();
    if (!val) return;

    addBubble('user', val);
    thread.push({ role: 'user', content: val });
    saveHistory(thread);
    inputEl.value = '';

    try {
      const reply = await askLLM(val);
      addBubble('assistant', reply);
      thread.push({ role: 'assistant', content: reply });
      saveHistory(thread);
    } catch (e) {
      addBubble('assistant', "My signal glitched. Say that again for me?");
    }
  }

  if (sendBtn) on(sendBtn, 'click', handleSend);
  if (inputEl) on(inputEl, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Small polish for mobile keyboard safe-area
  const inputbar = $('.inputbar') || $('form.chat-form') || document.body;
  if (window.CSS && CSS.supports('padding:max(0px)')) {
    inputbar.style.paddingBottom = 'max(10px, env(safe-area-inset-bottom))';
  }
})();

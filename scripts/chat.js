/* Blossom & Blade — /scripts/chat.js (with mod CSV button) */

(function(){
  const chatEl  = document.getElementById('chat');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  const params = new URLSearchParams(location.search);
  const man   = (params.get('man') || 'alexander').toLowerCase();
  const admin = params.get('admin') === '1';

  const HISTORY_MAX = 8;
  const history = [];

  let bannerEl = null;
  function mountAdminBanner(){
    if(!admin) return;
    bannerEl = document.createElement('div');
    bannerEl.style.cssText = `
      position:fixed;left:16px;bottom:16px;z-index:9999;
      background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.2);
      color:#fff;padding:8px 10px;border-radius:10px;font-size:12px;backdrop-filter:blur(6px)
    `;
    bannerEl.innerHTML = `
      <div style="font-weight:800;margin-bottom:6px">Auto-Moderation</div>
      <div id="bb_strike_count">Strikes: 0</div>
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
        <button id="bb_dl_log"   style="cursor:pointer;border:0;border-radius:8px;padding:6px 8px;background:#ff4da6;color:#000;font-weight:800">Download JSON</button>
        <button id="bb_dl_csv"   style="cursor:pointer;border:0;border-radius:8px;padding:6px 8px;background:#7cf;color:#000;font-weight:800">Download CSV</button>
        <button id="bb_clear_log"style="cursor:pointer;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:6px 8px;background:transparent;color:#fff">Clear</button>
      </div>
    `;
    document.body.appendChild(bannerEl);
    document.getElementById('bb_dl_log').onclick   = ()=> Mod && Mod.downloadJSON();
    document.getElementById('bb_dl_csv').onclick   = ()=> Mod && Mod.downloadCSV();
    document.getElementById('bb_clear_log').onclick = ()=>{
      Mod && Mod.clearLog(); updateStrikeCount();
    };
    updateStrikeCount();
  }
  function updateStrikeCount(){
    if(!admin || !bannerEl || !window.Mod) return;
    const log = Mod.getLog().filter(x => x.room === man);
    const el  = document.getElementById('bb_strike_count');
    if(el) el.textContent = `Strikes: ${log.length}`;
  }

  function bubble(text, me=false, style=''){
    const div = document.createElement('div');
    div.className = 'msg' + (me ? ' me' : '');
    if(style) div.style = style;
    div.textContent = text;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  async function send(){
    const userText = (inputEl.value || '').trim();
    if(!userText) return;

    bubble(userText, true);
    inputEl.value = '';

    // moderation strike detect/log
    try{
      if(window.Mod){
        const hits = Mod.hitList(userText);
        if(hits.length){
          Mod.logStrike({ room: man, role: 'user', text: userText, hits });
          updateStrikeCount();
          if(admin){
            bubble(`AUTO-MOD: strike → [${hits.join(', ')}]`, false, 'opacity:.85;background:rgba(255,255,255,.18);border:1px dashed rgba(255,255,255,.35)');
          }
        }
      }
    }catch(e){ console.warn('mod check failed', e); }

    try { BB.learnNameFromMessage(userText); } catch(e){}
    const payload = BB.buildChatPayload({ room: man, text: userText, history, dirty: 'high' });

    const messages = (typeof buildBnbMessages === 'function')
      ? buildBnbMessages(payload)
      : [{ role:'user', content: userText }];

    history.push({ role:'user', content:userText });
    while(history.length > HISTORY_MAX) history.shift();

    try{
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          room: payload.room,
          userText: payload.userText,
          memory: payload.memory,
          dirty: payload.dirty,
          paid: payload.paid,
          history
        })
      });

      const data = await r.json().catch(()=> ({}));
      const reply = (data && data.reply) ? String(data.reply).trim() : '';
      bubble(reply || 'Come closer. Tell me what you want.');

      history.push({ role:'assistant', content: reply || '' });
      while(history.length > HISTORY_MAX) history.shift();

    }catch(err){
      console.error(err);
      bubble('Connection hiccup—say that again for me?');
    }
  }

  if (document.getElementById('chat-send')) document.getElementById('chat-send').addEventListener('click', send);
  if (document.getElementById('chat-input')) {
    document.getElementById('chat-input').addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); }
    });
  }

  try { BB.applyChatUI(); } catch(e){ console.warn(e); }
  mountAdminBanner();
})();

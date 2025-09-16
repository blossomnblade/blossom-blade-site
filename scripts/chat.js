/* Blossom & Blade — /scripts/chat.js
   - Wires the chat UI to /api/chat using brain.js (memory) + prompt.js (messages)
   - Rolling history, enter-to-send, auto-scroll
*/

(function(){
  const chatEl  = document.getElementById('chat');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  // derive which man from URL
  const params = new URLSearchParams(location.search);
  const man = (params.get('man') || 'alexander').toLowerCase();

  // optional: subtheme (day/night), ignored by API but you might use it for backgrounds later
  const sub  = (params.get('sub') || '').toLowerCase();

  // minimal rolling history (trim to last N turns)
  const HISTORY_MAX = 8;
  const history = [];

  function bubble(text, me=false){
    const div = document.createElement('div');
    div.className = 'msg' + (me ? ' me' : '');
    div.textContent = text;
    chatEl.appendChild(div);
    // keep scroll pinned to bottom
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  async function send(){
    const userText = (inputEl.value || '').trim();
    if(!userText) return;

    // show my bubble immediately
    bubble(userText, true);

    // learn + update memory in browser (per-man)
    try { BB.learnNameFromMessage(userText); } catch(e){}
    // build payload with per-man memory + chatStyle
    const payload = BB.buildChatPayload({
      room: man,
      text: userText,
      history,          // we maintain this local rolling array
      dirty: 'high'
    });

    // Build messages for the model from prompt.js
    const messages = (typeof buildBnbMessages === 'function')
      ? buildBnbMessages(payload)
      : [{ role:'user', content: userText }];

    // push my turn into local history
    history.push({ role:'user', content:userText });
    while(history.length > HISTORY_MAX) history.shift();

    // clear the box
    inputEl.value = '';

    try{
      // Call your Edge function (server) which wraps the model with safety/persona
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          // The API expects a simpler body, so pass what it needs:
          room: payload.room,
          userText: payload.userText,
          memory: payload.memory,
          dirty: payload.dirty,
          paid: payload.paid,
          // If your /api/chat builds its own prompt, it can ignore `messages`.
          // If you later want to post `messages` directly, change server accordingly.
          history: history   // give server a peek at recent turns
        })
      });

      const data = await r.json().catch(()=> ({}));
      const reply = (data && data.reply) ? String(data.reply).trim() : '';

      bubble(reply || 'Come closer. Tell me what you want.');

      // store assistant reply into history
      history.push({ role:'assistant', content: reply || '' });
      while(history.length > HISTORY_MAX) history.shift();

    }catch(err){
      console.error(err);
      bubble('Connection hiccup—say that again for me?');
    }
  }

  // wire UI
  if (sendBtn) sendBtn.addEventListener('click', send);
  if (inputEl) {
    inputEl.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        send();
      }
    });
  }

  // apply background + opener + visit bump
  try { BB.applyChatUI(); } catch(e){ console.warn(e); }

})();

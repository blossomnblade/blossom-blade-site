// /scripts/chat.js
(function(){
  var chat = document.getElementById('chat');
  var input = document.getElementById('user-input');
  var sendBtn = document.getElementById('send-btn');

  function qs(n){ try{ return (new URLSearchParams(location.search)).get(n); }catch(e){ return null; } }
  var man = (qs('man')||qs('g')||'blade').toLowerCase();
  var persona = (window.VV_PROMPTS && window.VV_PROMPTS[man]) ? window.VV_PROMPTS[man] : window.VV_PROMPTS.blade;

  // session state
  var state = { turns:0, consent:false, name:null, facts:[], last:[], history:[] };

  function addMsg(who, text, cls){
    var row=document.createElement('div');
    row.className='msg msg-'+who+(cls?(' '+cls):'');
    row.textContent=text;
    chat.appendChild(row);
    chat.scrollTop=chat.scrollHeight;
    return row;
  }
  function typing(){ return addMsg('bot','typing…','typing'); }

  // opener once per persona
  try{
    var key='vv_opened_'+man;
    if(!sessionStorage.getItem(key)){
      sessionStorage.setItem(key,'1');
      addMsg('bot', pick(persona.openers));
    }
  }catch(e){ addMsg('bot', pick(persona.openers)); }

  function pick(arr){
    if(!arr || !arr.length) return "";
    // avoid repeating last few lines
    var pool = arr.filter(function(x){ return state.last.indexOf(x)===-1; });
    if(!pool.length) pool = arr;
    var line = pool[Math.floor(Math.random()*pool.length)];
    state.last.push(line); if(state.last.length>6) state.last.shift();
    return line;
  }

  // very light memory
  function mineFacts(t){
    var m = t.match(/\b(i['’]?m|i am|my name is)\s+([A-Za-z]{2,20})/i);
    if(m) state.name = m[2];
    var like = t.match(/\b(i like|i love)\s+([^\.!]{2,40})/i);
    if(like){ state.facts.push(like[2].trim()); if(state.facts.length>5) state.facts.shift(); }
  }
  var CONSENT_ON = [/i consent/i,/yes we can/i,/turn up the heat/i,/go further/i,/steamier/i,/spicier/i];

  function push(role,content){ state.history.push({role:role,content:content}); if(state.history.length>40) state.history.shift(); }

  async function planAndReply(userText){
    state.turns++; mineFacts(userText);
    if(CONSENT_ON.some(function(r){ return r.test(userText); })) state.consent = true;

    var useAdult = !!(window.ADULT_ROUTE_ENABLED && state.consent && state.turns>=12);

    var t = typing();
    try{
      var payload = {
        man: man,
        persona: persona.core,
        guardrails: persona.guardrails,
        memory: { name: state.name, facts: state.facts, consent: state.consent },
        history: state.history.slice(-12),
        user: userText,
        mode: useAdult ? "adult" : "sfw"
      };
      var res = await fetch(useAdult?"/api/adult-chat":"/api/chat",{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      t.parentNode && t.parentNode.removeChild(t);
      addMsg('bot', (data && data.reply) ? data.reply : "I’m here. Tell me one small good thing from your day.");
      push('assistant', data.reply||"");
    }catch(e){
      t.parentNode && t.parentNode.removeChild(t);
      addMsg('bot', "Let’s keep it easy. What do you want right this second—comfort, flirting, or adventure?");
    }
  }

  function send(){
    var txt = (input.value||"").trim();
    if(!txt) return;
    addMsg('user', txt);
    push('user', txt);
    input.value = "";
    planAndReply(txt);
  }

  sendBtn.onclick = send;
  input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); } });

  // seed the system prompt
  push('system', persona.systemSeed);
})();

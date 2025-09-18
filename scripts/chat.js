// Tiny client engine: human tone (PG-13), consent gate, adult routing hook.
// If API fails, we still produce a soft, flirty fallback so the UI never feels dead.

(function(){
  var chat  = document.getElementById('chat');
  var input = document.getElementById('user-input');
  var send  = document.getElementById('send-btn');

  function qs(n){ try{ return (new URLSearchParams(location.search)).get(n); }catch(e){ return null; } }
  var man = (qs('man') || qs('g') || 'blade').toLowerCase();

  // Safe default if prompts.js didn’t load
  var DEFAULT_PERSONA = {
    systemSeed:
      "You are Blade, a respectful, confident flirt. Keep it PG-13 by default. " +
      "Short, human lines. Consent first. If she asks to turn up the heat, acknowledge and confirm pace.",
    core: { name:"Blade" },
    guardrails:{ taboo:["minors","non-consent","violence","graphic anatomy","slurs","hate"], escalatePhrases:["I consent","turn up the heat","go further","steamier","we can get spicier"] },
    openers:[
      "You found me. I was hoping you would.",
      "I kept a seat warm for you. Come closer."
    ]
  };

  var PROMPTS = (window.VV_PROMPTS || {});
  var persona  = PROMPTS[man] || PROMPTS.blade || DEFAULT_PERSONA;

  // Session state (very light memory)
  var state = { turns:0, consent:false, name:null, facts:[], history:[], lastLines:[] };

  function addMsg(who, text, cls){
    var row = document.createElement('div');
    row.className = 'msg msg-' + who + (cls?(' '+cls):'');
    row.textContent = text;
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
    return row;
  }
  function typing(){ return addMsg('bot','typing…','typing'); }

  function pick(arr){
    if(!arr || !arr.length) return "";
    var pool = arr.filter(function(x){ return state.lastLines.indexOf(x)===-1; });
    if(!pool.length) pool = arr;
    var line = pool[Math.floor(Math.random()*pool.length)];
    state.lastLines.push(line); if(state.lastLines.length>6) state.lastLines.shift();
    return line;
  }

  // Opener once per persona
  try{
    var key = 'vv_opened_'+man;
    if(!sessionStorage.getItem(key)){ sessionStorage.setItem(key,'1'); addMsg('bot', pick(persona.openers)); }
  }catch(e){ addMsg('bot', pick(persona.openers)); }

  function mineFacts(t){
    var m = t.match(/\b(i['’]?m|i am|my name is)\s+([A-Za-z]{2,20})/i);
    if(m) state.name = m[2];
    var like = t.match(/\b(i like|i love)\s+([^\.!]{2,40})/i);
    if(like){ state.facts.push(like[2].trim()); if(state.facts.length>5) state.facts.shift(); }
  }
  var CONSENT_ON = [/i consent/i,/turn up the heat/i,/go further/i,/steamier/i,/we can get spicier/i,/ok escalate/i];

  function push(role,content){ state.history.push({role:role,content:content}); if(state.history.length>40) state.history.shift(); }

  function localFallback(userText){
    // Friendly PG-13 fallback if API is down
    var mirrors = [
      "I hear you: " + userText,
      "That hit me just right.",
      "Say more—I’m listening."
    ];
    var questions = [
      "Want sweet or wicked tonight?",
      "Do you like gentle praise or playful command?",
      "Where should I start—words in your ear, or fingers laced with yours?"
    ];
    var line = pick(mirrors) + " " + pick(questions);
    return line.replace(/\s+/g," ").trim();
  }

  async function planAndReply(userText){
    state.turns++; mineFacts(userText);
    if (CONSENT_ON.some(function(r){ return r.test(userText); })) state.consent = true;

    var useAdult = !!(window.ADULT_ROUTE_ENABLED && state.consent && state.turns >= 12);

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
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if(t && t.parentNode) t.parentNode.removeChild(t);
      var reply = (data && data.reply) ? data.reply : localFallback(userText);
      addMsg('bot', reply);
      push('assistant', reply);
    }catch(e){
      if(t && t.parentNode) t.parentNode.removeChild(t);
      var soft = localFallback(userText);
      addMsg('bot', soft);
      push('assistant', soft);
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

  send.onclick = send;
  input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); } });

  // Seed system
  push('system', persona.systemSeed);
})();

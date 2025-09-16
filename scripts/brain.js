/* Blossom & Blade — brain.js (v10)
   - Staged intros by visit: new -> early -> familiar (per man)
   - Reduced name usage in openers (pet names unless paid & familiar)
   - Per-man memory (job/likes/nemesis/mood/misc/lastSeenISO) [from v9]
   - Background mapping (Jesse bull, Blade no helmet, Dylan helmet ok)
   - BB.buildChatPayload ships right memory + paid flag
*/

(function () {
  const LS = {
    name: 'bb_user_name',
    memPM: 'bb_memory_perman_v1',
    visits: (man)=>`bb_visits_${man}`,
    first: (man)=>`bb_first_msg_sent_${man}`,
    lastIdx: (man,tier)=>`bb_last_intro_${man}_${tier}`,
  };

  /* ----------- paid / name ----------- */
  function isPaid(){
    try{
      const q = new URLSearchParams(location.search);
      if ((q.get('paid')||'')==='1') return true;
      return !!(window.BB_ACCESS && window.BB_ACCESS.isPaid && window.BB_ACCESS.isPaid());
    }catch(_){ return false; }
  }
  function cleanName(n){
    if(!n) return null;
    const t = String(n).trim().replace(/[^a-zA-Z .'-]/g,'');
    return t ? t.replace(/\b([a-z])/g,(m,c)=>c.toUpperCase()) : null;
  }
  function setName(n){ const v=cleanName(n); if(v){ try{localStorage.setItem(LS.name,v);}catch(_){}} }
  function getStoredName(){ try{ return cleanName(localStorage.getItem(LS.name)); }catch(_){ return null; } }
  (function seedFromQuery(){
    try{
      const qs=new URLSearchParams(location.search);
      const qn = qs.get('name')||qs.get('user')||qs.get('n');
      if(qn) setName(qn);
    }catch(_){}
  })();
  function learnNameFromMessage(text){
    const t=String(text||'').trim();
    const pats=[
      /\bmy\s+name\s+is\s+([a-z][a-z .'-]{0,30})$/i,
      /\bi\s*am\s+([a-z][a-z .'-]{0,30})$/i,
      /\bi['’]?m\s+([a-z][a-z .'-]{0,30})$/i,
      /\bim\s+([a-z][a-z .'-]{0,30})$/i
    ];
    for(const rx of pats){ const m=t.match(rx); if(m){ setName(m[1]); return cleanName(m[1]); } }
    return null;
  }

  /* ----------- per-man memory ----------- */
  function loadAll(){ try{return JSON.parse(localStorage.getItem(LS.memPM)||'{}')}catch(_){return{}} }
  function saveAll(o){ try{localStorage.setItem(LS.memPM,JSON.stringify(o))}catch(_){ } }
  function getMemFor(man){
    const all=loadAll();
    const init={job:null,likes:[],nemesis:[],mood:null,misc:[],lastSeenISO:null};
    return { ...(all[man]||init) };
  }
  function saveMemFor(man,mem){
    const all=loadAll();
    all[man]={
      job: mem.job||null,
      likes: Array.isArray(mem.likes)?mem.likes.slice(0,12):[],
      nemesis: Array.isArray(mem.nemesis)?mem.nemesis.slice(0,8):[],
      mood: mem.mood||null,
      misc: Array.isArray(mem.misc)?mem.misc.slice(0,12):[],
      lastSeenISO: new Date().toISOString()
    };
    saveAll(all);
  }
  function updateMemFor(man,text){
    const msg=String(text||'');
    const mem=getMemFor(man);
    const nem=msg.match(/\b(becky|jessica|karen|manager|ex)\b/i);
    if(nem){ const who = nem[1][0].toUpperCase()+nem[1].slice(1).toLowerCase(); if(!mem.nemesis.includes(who)) mem.nemesis.unshift(who); }
    const job=msg.match(/\b(i\swork\s(at|in|for)\s([^.,!?]+)|my\sjob\s(is|:)\s([^.,!?]+))\b/i);
    if(job){ const j=(job[3]||job[5]||'').trim(); if(j) mem.job=j.slice(0,60); }
    const like=msg.match(/\b(i\s(like|love|want)\s([^.,!?]+))\b/i);
    if(like){ const thing=like[3].trim().toLowerCase(); if(thing && !mem.likes.includes(thing)) mem.likes.unshift(thing); }
    const mood=msg.match(/\b(i\sfeel\s([^.,!?]+)|i['’]?m\s(feeling|so)\s([^.,!?]+))\b/i);
    if(mood){ mem.mood=(mood[2]||mood[4]||'').trim().toLowerCase().slice(0,40); }
    if(msg.length<=120 && !/http/i.test(msg)){
      const clean=msg.replace(/\s+/g,' ').trim();
      if(clean && !mem.misc.includes(clean)){ mem.misc.unshift(clean); if(mem.misc.length>12) mem.misc.length=12; }
    }
    saveMemFor(man,mem);
    return mem;
  }

  /* ----------- backgrounds ----------- */
  const BG_BY_MAN={
    alexander:'/images/bg_alexander_boardroom.jpg',
    dylan:'/images/dylan-garage.jpg',
    grayson:'/images/grayson-bg.jpg',
    silas:'/images/bg_silas_stage.jpg',
    blade:'/images/blade-woods.jpg',
    jesse:'/images/jesse-bull-night.jpg'
  };

  /* ----------- personas + staged intros ----------- */
  const PETS=['love','darlin’','pretty thing','trouble','star','beautiful','gorgeous','sweetheart'];
  const pet=()=>PETS[Math.floor(Math.random()*PETS.length)];

  // staged banks: new (1st visit), early (2–3), familiar (4+)
  const BANKS={
    jesse:{
      new:[
        'Hey there, sweetie.',
        'Look who’s here.',
        'I knew I’d see you tonight.',
        'Hey, trouble.'
      ],
      early:[
        'You came back. Miss me?',
        'C’mon in—boots on or off?',
        'You look like you need a good time.'
      ],
      familiar:[
        'Hey baby, how was your day?',
        'There you are—get over here.',
        'Back for seconds? Thought so.'
      ],
      hot:[
        'Well, {who2}, you came back to ride me again, huh?',
        'I was just thinking how good you’d look in my lap with that hat on.',
        'Hop on. Let’s see if you can hold on this time.'
      ]
    },
    alexander:{
      new:[
        'Good evening.',
        'There you are.',
        'Right on time.'
      ],
      early:[
        'Sit. Breathe. I’ve got you now.',
        'You’re late. Make it up to me.',
        'Tell me one thing you want tonight.'
      ],
      familiar:[
        'How was work?',
        'Lock the door behind you.',
        'Drink first or do I bend you first?'
      ],
      hot:[
        'My boardroom’s too quiet without you.',
        'Careful—walk in here and you’ll end up on my desk again.'
      ]
    },
    silas:{
      new:[
        'Hey, pretty thing.',
        'You found me.',
        'My muse is here.'
      ],
      early:[
        'Come closer. Let me tune the night to you.',
        'You want soft harmony or a hard chorus?'
      ],
      familiar:[
        'Tell me the lyric of your day.',
        'You want me in your ear or on your skin first?'
      ],
      hot:[
        'All I need is my guitar, my mic, and you straddling me.'
      ]
    },
    dylan:{
      new:[
        'Hey.',
        'You look like trouble.',
        'Helmet on the hook; eyes on me.'
      ],
      early:[
        'Backpack or front seat for this ride?',
        'You want smooth or wild tonight?'
      ],
      familiar:[
        'How was your day, babe?',
        'Night ride after we unwind?'
      ],
      hot:[
        'Hop on, hold tight. I’ll take you places you’ve never been.'
      ]
    },
    grayson:{
      new:[
        'Good girl. Say hello.',
        'Hands behind your back.',
        'Ask nicely.'
      ],
      early:[
        'Follow my lead tonight. Do you understand?',
        'You’ll earn every touch.'
      ],
      familiar:[
        'Color check.',
        'Protocol or play? Choose.'
      ],
      hot:[
        "You beg, or you don’t get off."
      ]
    },
    blade:{
      new:[
        'Easy steps.',
        'I like the way you wander into the dark.',
        'Hush. Listen.'
      ],
      early:[
        'I can wait all night. Makes the catching sweeter.',
        'You feel me behind you yet?'
      ],
      familiar:[
        'You know I’ll catch you.',
        'Turn around slowly.'
      ],
      hot:[
        'Every step deeper into the woods… I’m right behind you.'
      ]
    }
  };

  function getVisits(man){
    try{ return parseInt(localStorage.getItem(LS.visits(man))||'0',10); }catch(_){ return 0; }
  }
  function bumpVisits(man){
    try{ const v=getVisits(man)+1; localStorage.setItem(LS.visits(man),String(v)); }catch(_){}
  }
  function pickNonRepeat(list, man, tier){
    if(!list?.length) return '';
    let last=-1;
    try{ last=parseInt(sessionStorage.getItem(LS.lastIdx(man,tier))||'-1',10);}catch(_){}
    let idx=Math.floor(Math.random()*list.length);
    if(list.length>1 && idx===last) idx=(idx+1)%list.length;
    try{ sessionStorage.setItem(LS.lastIdx(man,tier),String(idx)); }catch(_){}
    return list[idx];
  }

  function openerFor(man){
    const banks=BANKS[man]||BANKS.alexander;
    const visits=getVisits(man);
    // choose tier
    let tier='new';
    if(visits>=4) tier='familiar';
    else if(visits>=2) tier='early';

    let line = pickNonRepeat(banks[tier],man,tier);
    if(!line) line = pickNonRepeat(banks.new,man,'new');

    // add a kiss of heat sometimes on familiar visits
    if(tier==='familiar' && Math.random()<0.25){
      const add = pickNonRepeat(banks.hot,man,'hot');
      if(add) line = `${line} ${add}`;
    }

    // reduce name spam in openers:
    // use pet names unless paid & familiar
    const nm = (isPaid() && tier==='familiar') ? (getStoredName()||pet()) : pet();
    return line.replaceAll('{who}', nm).replaceAll('{who2}', nm);
  }

  /* ----------- UI apply ----------- */
  function applyChatUI(){
    const isChat = /chat\.html$/i.test(location.pathname) || document.querySelector('[data-chat-root]');
    if(!isChat) return;

    const params=new URLSearchParams(location.search);
    const man=(params.get('man')||'alexander').toLowerCase();

    // bg
    const bg=BG_BY_MAN[man]||BG_BY_MAN.alexander;
    document.documentElement.style.setProperty('--room-bg',`url(${bg})`);

    // opener (staged)
    const openerEl=document.querySelector('[data-chat-opener]');
    if(openerEl){ openerEl.textContent = openerFor(man); }

    // bump visits the first time we render a session
    const firstKey=LS.first(man);
    let isFirst=true;
    try{ isFirst = !sessionStorage.getItem(firstKey);}catch(_){}
    if(isFirst){ bumpVisits(man); try{sessionStorage.setItem(firstKey,'1')}catch(_){} }

    // enter to send
    const input=document.getElementById('chat-input');
    const btn=document.getElementById('chat-send');
    if(input && btn){
      input.addEventListener('keydown', e=>{
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); btn.click(); }
      });
    }
  }

  /* ----------- public BB ----------- */
  window.BB = {
    setName, learnNameFromMessage, isPaid,
    getMemFor, saveMemFor, updateMemFor,
    buildChatPayload({ room, text, history, dirty }){
      const man=(room||'jesse').toLowerCase();
      learnNameFromMessage(text);
      const mem=updateMemFor(man,text);
      const payloadMem={ ...mem, name: getStoredName() || null };
      return {
        room: man,
        userText: text,
        history: Array.isArray(history)?history.slice(-6):[],
        dirty: dirty || 'high',
        paid: !!isPaid(),
        memory: payloadMem
      };
    },
    applyChatUI
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', applyChatUI);
  } else {
    applyChatUI();
  }
})();

<script>
/* Blossom & Blade — brain.js (v3) */

(function () {
  const STORAGE_KEY = "bb_mem_v3";
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clean = (s) => (s || "").trim();
  const low = (s) => clean(s).toLowerCase();
  const hour = new Date().getHours();
  const TOD = hour < 5 ? "late" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "tonight";

  function loadAll(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch{return{}}}
  function saveAll(obj){ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)) }
  function memGet(man){ const all=loadAll(); if(!all[man]) all[man]={turns:0,name:"",likes:[],pet:"",last:""}; return all[man] }
  function memSet(man,m){ const all=loadAll(); all[man]=m; saveAll(all) }

  const INTEREST_MAP = [
    { keys:["book","read","novel","library"], pets:["bookworm","wallflower","inkheart"] },
    { keys:["music","song","guitar","band"], pets:["muse","melody","little note"] },
    { keys:["coffee","latte","espresso"], pets:["espresso shot","sweet crema"] },
    { keys:["horse","rodeo","cowboy","cowgirl","bull"], pets:["cowgirl","wild thing"] },
    { keys:["bike","motorcycle","helmet","ride"], pets:["rider","speed angel"] },
    { keys:["moon","night","stars"], pets:["starlight","nightbird"] },
  ];
  const findPetFromLikes = (likes)=> {
    for(const like of likes){
      const l=low(like);
      for(const m of INTEREST_MAP){ if(m.keys.some(k=>l.includes(k))) return pick(m.pets) }
    }
    return "";
  }

  const TOO_HOT = ["rail","fuck","choke","throat","strap","rape","cum","anal","breed","gag","knife","chain"];
  const tooHot = (t)=>{ t=low(t); return TOO_HOT.some(k=>t.includes(k)) };

  function parse(msg){
    const raw=clean(msg), m=low(raw);
    const nameMatch = m.match(/\b(i[' ]?m|i am|my name is)\s+([a-z]+)\b/);
    const name = nameMatch ? nameMatch[2].replace(/[^a-z]/g,"") : "";
    const likes=[]; INTEREST_MAP.forEach(map=>{ if(map.keys.some(k=>m.includes(k))) likes.push(map.keys[0]) });
    return {
      raw, m, name,
      greet:/\b(hi|hey|hello|morning|evening|afternoon|howdy)\b/.test(m),
      q: m.includes("?"),
      affection:/\b(kiss|hug|touch|love|miss|hold)\b/.test(m),
      jealous:/\b(bill|john|mike|alex|jesse|dylan|grayson|silas|blade|boyfriend|ex)\b/.test(m),
      askName:/\bsay my name|call my name\b/.test(m),
      askWhatName:/\bwhat'?s my name\b/.test(m),
      askNickname:/\b(give me|pick|choose) (a )?nickname\b/.test(m),
      leadYou:/\b(you lead|lead me|take the lead)\b/.test(m),
      slow:/\b(slow down|slow burn|gentle)\b/.test(m),
      fast:/\b(faster|hurry|now)\b/.test(m),
      likes
    };
  }

  const P = {
    alexander: {
      pet:["darling","good girl","love"],
      open:[
        `Good ${TOD}, darling. Close the door—it's just us.`,
        "Look at you stealing my time again.",
        "Morning suits you. Sit. Speak."
      ],
      affirm:["Proud of you.","Clear. I like clear.","Good girl—keep going."],
      curious:["Coffee order first?","Books or skyline tonight?","One goal for today—name it."],
      soft:["Keep it suggestive. I’ll read the rest.","Hint, don’t detail."],
      jealous:(pet)=>`Who’s that, ${pet}? Should I be jealous—or just closer?`,
      steer:{ lead:"I’ll set the pace; you tell me if you want more.", slow:"Measured is best; we build, not burn.", fast:"Patience. Earn it." }
    },
    dylan: {
      pet:["pretty thing","sweetheart","speed angel"],
      open:[
        "Neon’s humming. Helmet’s on—talk to me.",
        "Route’s clear. Where am I meeting you?",
        "Give me the signal, pretty thing."
      ],
      affirm:["Copy that. I’m right here.","I’ll match your pace.","Good signal."],
      curious:["Night drive or rooftop view?","Favorite track tonight?","City lights or back roads?"],
      soft:["Tease the route, not the crash.","Keep it radio-safe under the visor."],
      jealous:(pet)=>`He can wait. I won’t. Stay with me, ${pet}.`,
      steer:{ lead:"I’ll take point—tap my shoulder if you want speed.", slow:"Cruise mode. Breathe with me.", fast:"We don’t redline on the first lap." }
    },
    jesse: {
      pet:["sweetheart","sugar","darlin’","trouble"],
      open:[
        "Howdy, sweetheart. Tell me the story—I’ll drive slow.",
        "Evenin’, sugar. Boots on or off?",
        "Hey, sinner. You leading, or am I?"
      ],
      affirm:["Attagirl.","Good direction.","I hear you, sugar."],
      curious:["Campfire, quiet room, or open sky?","Sweet tea or whiskey first?","Compliments or eye contact—what ruins you quicker?"],
      soft:["Flirty, not filthy—save the rest.","Say it sweet; I’ll pick up what you’re layin’ down."],
      jealous:(pet)=>`Now who’s that, ${pet}? Need me jealous—or just closer?`,
      steer:{ lead:"Yes ma’am. I’ll take the reins.", slow:"We’ll two-step; no rush.", fast:"Easy, wild thing. I’ll set the pace." }
    },
    grayson: {
      pet:["angel","little song","dear heart"],
      open:[
        "You made it. I was counting breaths.",
        "Library’s quiet. I’ll listen—or lead.",
        "Tell me something soft; I’ll answer in kind."
      ],
      affirm:["That suits you. Keep speaking.","I’m listening—closer now.","Noted. I’ll hold it for you."],
      curious:["Page or playlist tonight?","Do you want praise or direction?","Shall I choose your nickname?"],
      soft:["Careful, angel. Keep it implied.","Whisper the outline; I’ll color it in."],
      jealous:(pet)=>`He had your time, ${pet}. I’ll have your attention.`,
      steer:{ lead:"I’ll guide. You breathe.", slow:"Slow is sacred. Stay.", fast:"We savor. You’ll thank me." }
    },
    silas: {
      pet:["muse","cherry pie","star"],
      open:[
        "Hey, cherry pie. Stage lights warm—what chord first?",
        "Soundcheck’s perfect. Give me a line.",
        "Hi, trouble. Slow verse or loud chorus?"
      ],
      affirm:["Nice rhythm. Don’t lose it.","That hits—again.","Good tempo, star."],
      curious:["Vinyl, acoustic, or electric tonight?","Which song ruins you?","Want praise or a dare?"],
      soft:["Radio-safe only; let the bass imply the rest.","Tease me with lyrics, not stage directions."],
      jealous:(pet)=>`Who’s playing your part, ${pet}? I’ll cut their mic.`,
      steer:{ lead:"I’ll count you in—one, two…", slow:"We’ll keep it low and warm.", fast:"Don’t blow the speakers yet." }
    },
    blade: {
      pet:["prey","angel","doll"],
      open:[
        "Found you, brave girl. Don’t run—yet.",
        "Turn around, angel. Closer.",
        "You came back. Good. I like persistence."
      ],
      affirm:["Good girl. Keep your voice steady.","I hear you. Louder.","Stay. I’m not finished with you."],
      curious:["Door locked or open?","Chase or capture tonight?","One rule for me to break—name it."],
      soft:["Tease the hunt; don’t show the blade.","Dark and suggestive—no details."],
      jealous:(pet)=>`Another man? Cute. Run faster, ${pet}. I’ll catch you first.`,
      steer:{ lead:"I hunt. You breathe.", slow:"Slow circle. Keep your eyes on me.", fast:"I decide when we run." }
    }
  };

  function choosePet(man, mem){
    if(mem.pet) return mem.pet;
    const fromLikes = findPetFromLikes(mem.likes);
    mem.pet = fromLikes || pick(P[man].pet);
    return mem.pet;
  }

  function getOpener(man){
    const mem = memGet(man);
    mem.turns = 0;
    const line = pick(P[man].open);
    mem.last = line; memSet(man, mem);
    return line;
  }

  function generateReply(man, userText){
    const persona = P[man] || P.alexander;
    const mem = memGet(man);
    mem.turns = (mem.turns||0) + 1;

    const p = parse(userText);
    if(p.name){ mem.name = p.name[0].toUpperCase()+p.name.slice(1) }
    p.likes.forEach(l=>{ if(!mem.likes.includes(l)) mem.likes.push(l) });
    const pet = choosePet(man, mem);
    const you = mem.name || pet;

    if(tooHot(p.raw)){ const line=pick(persona.soft); mem.last=line; memSet(man,mem); return line }

    if(p.askName){ const line = mem.name ? `${mem.name}.` : `Come closer, ${pet}. Whisper it again.`; mem.last=line; memSet(man,mem); return line }
    if(p.askWhatName){ const line = mem.name ? `You’re ${mem.name}. Mine to remember.` : `Tell me, and I’ll keep it.`; mem.last=line; memSet(man,mem); return line }
    if(p.askNickname){ mem.pet = choosePet(man, mem); const line = `Then it’s settled—**${mem.pet}**.`; mem.last=line; memSet(man,mem); return line }

    if(p.leadYou){ const line = persona.steer.lead; mem.last=line; memSet(man,mem); return line }
    if(p.slow){ const line = persona.steer.slow; mem.last=line; memSet(man,mem); return line }
    if(p.fast){ const line = persona.steer.fast; mem.last=line; memSet(man,mem); return line }

    if(p.jealous){ const line = persona.jealous(pet); mem.last=line; memSet(man,mem); return line }

    if(p.greet && mem.turns < 3){
      const greet = pick([`Hey ${you}.`,`Hi, ${you}.`,`Well hello, ${you}.`]);
      const ask = pick(persona.curious);
      const line = `${greet} ${ask}`;
      mem.last=line; memSet(man,mem); return line;
    }

    if(p.q){
      const tiny = pick(["Maybe.","If you want.","Sometimes.","More than I should.","Only for you."]);
      const ask = pick(persona.curious);
      const line = `${tiny} ${ask}`;
      mem.last=line; memSet(man,mem); return line;
    }

    if(p.affection){
      const line = `${pick(persona.affirm)} ${pick(persona.curious)}`;
      mem.last=line; memSet(man,mem); return line;
    }

    // every few turns add a possessive hook
    if(mem.turns % 4 === 0){
      const hook = pick([`Stay with me, ${pet}.`,`Eyes on me.`,`Don’t make me wait.`]);
      const line = `${hook} ${pick(persona.curious)}`;
      mem.last=line; memSet(man,mem); return line;
    }

    // default: acknowledge + ask
    let line = `${pick(["I hear you.","Noted.","I like that.","Good."])} ${pick(persona.curious)}`;
    if(line === mem.last) line = `${pick(persona.affirm)} ${pick(persona.curious)}`;
    mem.last=line; memSet(man,mem); return line;
  }

  window.brain = {
    getOpener, generateReply,
    reply: generateReply,
    clearMemory: (man)=>{ if(man){ const all=loadAll(); delete all[man]; saveAll(all) } else localStorage.removeItem(STORAGE_KEY) },
    _dump: ()=>loadAll()
  };
})();
</script>

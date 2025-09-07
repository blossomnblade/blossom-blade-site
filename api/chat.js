/* Blossom & Blade · lightweight local “brain” */
window.BnB = (function(){
  const images = {
    alexander: "images/bg_alexander_boardroom.jpg",
    dylan:     "images/dylan-garage.jpg",
    jesse:     "images/jesse_bg.jpg",
    grayson:   "images/grayson-bg.jpg",
    silas:     "images/bg_silas_stage.jpg",
    blade:     "images/blade-woods.jpg"
  };

  const guys = {
    alexander: {
      id:"alexander", name:"Alexander Jackson", bg: images.alexander,
      greetings:[
        "Lights low or city view while we talk?",
        "I’ve cleared the evening—tell me what you want on the agenda.",
        "Come in. Close the door. Now… what’s first, sweetheart?"
      ],
      nicknames:{ books:"my little strategist", music:"my smooth operator", coffee:"my caffeine queen", city:"my skyline girl", default:"darling" },
      jealous:(nick)=> `Should I be jealous, ${nick||'sweetheart'}—or should I simply win you back tonight?`
    },
    dylan: {
      id:"dylan", name:"Dylan Vale", bg: images.dylan,
      greetings:[
        "Hands flat on the counter, pretty thing.",
        "Neon’s humming. Tell me the vibe—slow burn or straight to heat?",
        "Come closer. I’ll tune you up, one string at a time."
      ],
      nicknames:{ music:"my muse", coffee:"my midnight shot", city:"my streetlight angel", default:"trouble" },
      jealous:(nick)=> `He can wait. I’m not letting go of you tonight, ${nick||'trouble'}.`
    },
    jesse: {
      id:"jesse", name:"Jesse Granger", bg: images.jesse,
      greetings:[
        "Boots up. You riding shotgun or taking the reins?",
        "Dust is gold out here—talk to me, honey.",
        "Lean in, little wildfire. Where we headed?"
      ],
      nicknames:{ rodeo:"my wildfire", woods:"my trailblazer", dog:"my good-hearted girl", default:"sweetheart" },
      jealous:(nick)=> `Now who’s this fella, ${nick||'sweetheart'}? Should I be jealous—or just steal you back?`
    },
    grayson: {
      id:"grayson", name:"Grayson Kincaid", bg: images.grayson,
      greetings:[
        "Pick: gentle questions or firm direction?",
        "Library’s quiet. I’ll listen… or lead.",
        "Tea’s warm, voice warmer. Where do you want to start?"
      ],
      nicknames:{ books:"my little bookworm", cat:"my soft paw", coffee:"my honeyed sip", default:"dear heart" },
      jealous:(nick)=> `Mmm. I hear his name, ${nick||'dear heart'}, but I’m the one turning your pages.`
    },
    silas: {
      id:"silas", name:"Silas Lennox", bg: images.silas,
      greetings:[
        "Stage lights warm—what chord should I play first?",
        "I wrote a line for you. Want to hear it or make a new one together?",
        "Backstage is quiet. Tell me your tempo."
      ],
      nicknames:{ music:"my melody", books:"my verse", coffee:"my velvet sip", default:"star" },
      jealous:(nick)=> `Tell him the song’s over. You’re my encore, ${nick||'star'}.`
    },
    blade: {
      id:"blade", name:"Blade Kincaid", bg: images.blade,
      greetings:[
        "Found you, brave girl. Don’t run—yet.",
        "Stay with me. What would make tonight easier?",
        "Footsteps behind you… I keep pace."
      ],
      nicknames:{ woods:"my little fox", books:"my curious thing", music:"my rhythm", default:"prey" },
      jealous:(nick)=> `Is he hunting you, ${nick||'prey'}? Mm. I hunt better.`
    }
  };

  function reply(guy, text, nick){
    const t = text.toLowerCase();
    const call = nick || (guy.nicknames && guy.nicknames.default) || 'love';
    if(/hi|hey|hello|morning|evening/.test(t)) return `Hi, ${call}. Tell me what mood you’re in.`;
    if(/how are|hru|you ok/.test(t)) return `Better now. You?`;
    if(/joke|funny/.test(t)) return `Only if you laugh. I like that sound on you.`;
    if(/city|lights|view|window/.test(t)) return `City lights it is. Pull the night closer with me, ${call}.`;
    if(/library|book|read/.test(t)) return `Library hush suits us. Sit with me—tell me what you’re reading, ${call}.`;
    if(/music|song|guitar|chord|melody/.test(t)) return `I’ll keep the rhythm. You choose the chorus, ${call}.`;
    if(/forest|woods|trail|moon/.test(t)) return `Stay near. I’ll keep you safe under the trees, ${call}.`;
    if(/coffee|latte|espresso/.test(t)) return `I’ll make it how you like it. Then we talk—and maybe more.`;
    if(/kiss|hold|touch|cuddle|hug/.test(t)) return `Come here. I’ll make it slow, ${call}.`;
    if(/miss you|think of you|need you/.test(t)) return `Say it again. I like when you need me, ${call}.`;
    if(/what|how|why|\?$/.test(t)) return `Give me one more detail, ${call}. I’m listening.`;
    return `Mm. I hear you, ${call}. Tell me a little more so I can meet you there.`;
  }

  return { guys, reply };
})();

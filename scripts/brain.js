/* Blossom & Blade — persona brain (greetings + style helpers)
   - No build step; global attach.
   - Safe to include before chat.js
*/
(() => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Really common openers (short; varied cadence)
  const COMMON_OPENERS = [
    "hey you.","look who’s here.","aww, you came to see me.",
    "Hi.","Hello.","Good morning.","Good night.","Good.",
    "What’s up?","Hey there.","Glad to see you.","There you are.",
    "It’s been a while.","It’s good to see you.","Hey, love.",
    "Look who it is!","I was just thinking of you.","Was wondering if I’d see you again.",
    "Where have you been?","The pleasure’s mine.","You’re welcome.",
    "Thank you.","Allow me to introduce myself.","Nice to meet you.",
    "You’re perfect.","How have you been?","Oh my— you look like a snack."
  ];

  // Tiny, persona-flavored openers to mix in (still 1 short line each)
  const MAN_OPENERS = {
    blade: [
      "come here.","run—I’ll catch you.","don’t look away.","hunt’s over. you’re mine."
    ],
    dylan: [
      "helmet’s off.","you made it. talk to me.","ride or rest?","smirk’s for you."
    ],
    viper: [
      "call me Viper.","eyes on me.","closer.","hands first—don’t worry about the face."
    ],
    alexander: [
      "mm. you again. good.","brief me.","look at me.","I’ll take it from here."
    ],
    silas: [
      "linx.","fox.","poppet.","play me something of you."
    ],
    grayson: [
      "report in.","knees or words, your call.","good girl—speak up.","you’re safe with me."
    ]
  };

  // expose
  window.bnbBrain = { pick, COMMON_OPENERS, MAN_OPENERS };
})();

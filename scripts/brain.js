/* Blossom & Blade — persona brain (greetings + style helpers)
   - No build step; global attach.
   - Safe to include before chat.js
*/
(() => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Very common openers (short; varied cadence)
  const COMMON_OPENERS = [
    "hey you.", "look who’s here.", "aww, you came to see me.",
    "Hi.", "Hello.", "Good morning.", "Good night.", "Good.",
    "What’s up?", "Hey there.", "Glad to see you.", "There you are.",
    "It’s been a while.", "It’s good to see you.", "Hey, love.",
    "Look who it is!", "I was just thinking of you.", "Was wondering if I’d see you again.",
    "Where have you been?", "The pleasure’s mine.", "You’re welcome.",
    "Thank you.", "Allow me to introduce myself.", "Nice to meet you.",
    "You’re perfect.", "How have you been?", "Oh my— you look like a snack."
  ];

  // Micro openers per man (1 short line each, flavor-first)
  const MAN_OPENERS = {
    blade: [
      "come here.", "run—I’ll catch you.", "don’t look away.",
      "hunt’s over. you’re mine.", "rebel, you’re with me.", "all in tonight."
    ],
    dylan: [
      "helmet’s off.", "you made it. talk to me.", "ride or rest?",
      "smirk’s for you.", "on my tank or on my lap?"
    ],
    jesse: [
      "yes ma’am.", "is that what you want?", "I’ll make it worth your time.",
      "Oh sugar, that please undoes me.", "Let me put my fingerprints on your hips."
    ],
    alexander: [
      "mm. you again. good.", "brief me.", "look at me.",
      "I’ll take it from here.", "Good—now yield, amuri miu.",
      "Vitu`, stay close. Cori—my heart—watch me."
    ],
    silas: [
      "evenin’, poppet.", "easy now, fox.", "c’mere, linx.",
      "I could play ye all night.", "let me hear ye."
    ],
    grayson: [
      "good girl.", "show me your best bratt—then behave.",
      "I’ll test your limits and keep you safe.", "praise or punishment—earn it."
    ],
    viper: [
      "eyes on the hand, not the face.", "closer.", "let me feel your pulse.",
      "truth—slowly.", "mine, now."
    ]
  };

  // Small banks used by heuristics
  const YES_BANK    = ["Yes.", "Yes, please.", "Yes, Sir.", "Hell yes.", "Oh—yes."];
  const PRAISE_BANK = ["Good girl.", "That’s it.", "Perfect.", "There you go."];
  const SOFT_ACKS   = ["oh baby, yes.", "mm—keep going.", "that’s for me, isn’t it?"];

  // Interest → nickname seeds (used when we detect context)
  const NICKNAMES = {
    equestrian: ["my lil equestrian"],
    book:       ["my lil bookworm"],
    clean:      ["Ms Clean"]
  };

  // expose
  window.bnb = window.bnb || {};
  window.bnb.brain = { pick, COMMON_OPENERS, MAN_OPENERS, YES_BANK, PRAISE_BANK, SOFT_ACKS, NICKNAMES };
})();
